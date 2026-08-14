import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { CustomToolRegistry } from '../src/registry.ts'
import type { CustomToolConfig } from '../src/settings.ts'
import type { CustomTool } from '../src/types.ts'

const config: CustomToolConfig = {
  timeoutMs: 1000,
  memoryLimitMb: 128,
  maxResultChars: 16000,
  maxCodeBytes: 65536,
  maxTools: 100,
  allowNetwork: true,
  dshHome: '',
}

interface Recorded { name: string; dispose: ReturnType<typeof vi.fn> }

function makeCtx(): { ctx: Context; recorded: Recorded[]; register: ReturnType<typeof vi.fn> } {
  const recorded: Recorded[] = []
  const register = vi.fn((definition: { name: string }) => {
    const dispose = vi.fn()
    recorded.push({ name: definition.name, dispose })
    return dispose
  })
  const ctx = {
    tools: { register },
    logger: () => ({ warn: vi.fn() }),
  } as unknown as Context
  return { ctx, recorded, register }
}

const tool = (overrides: Partial<CustomTool> = {}): CustomTool => ({
  id: 't1',
  name: 'hello_tool',
  description: 'greets',
  parameters: { type: 'object', properties: {} },
  code: 'return 1',
  scope: 'global',
  location: 'global',
  enabled: true,
  source: 'user',
  createdAt: '',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('CustomToolRegistry', () => {
  let recorded: Recorded[]
  let registry: CustomToolRegistry

  beforeEach(() => {
    const made = makeCtx()
    recorded = made.recorded
    registry = new CustomToolRegistry(made.ctx, config)
  })

  it('registers enabled tools and skips disabled ones', () => {
    registry.reconcile([tool(), tool({ id: 't2', name: 'other', enabled: false })])
    expect(recorded.map(entry => entry.name)).toEqual(['hello_tool'])
  })

  it('does not re-register unchanged tools', () => {
    registry.reconcile([tool()])
    registry.reconcile([tool()])
    expect(recorded).toHaveLength(1)
  })

  it('re-registers edited tools by updatedAt change', () => {
    registry.reconcile([tool()])
    registry.reconcile([tool({ updatedAt: '2026-01-02T00:00:00.000Z' })])
    expect(recorded).toHaveLength(2)
    expect(recorded[0].dispose).toHaveBeenCalledOnce()
  })

  it('disposes removed and disabled tools', () => {
    registry.reconcile([tool()])
    registry.reconcile([tool({ enabled: false })])
    expect(recorded[0].dispose).toHaveBeenCalledOnce()
  })

  it('contains registration failures per tool and recovers on retry', () => {
    const made = makeCtx()
    made.register.mockImplementationOnce(() => { throw new Error('already registered') })
    const failing = new CustomToolRegistry(made.ctx, config)
    failing.reconcile([tool()])
    expect(failing.errors().get('t1')).toMatch(/already registered/)
    failing.reconcile([tool({ updatedAt: '2026-01-02T00:00:00.000Z' })])
    expect(failing.errors().get('t1')).toBeUndefined()
  })

  it('clear() disposes everything', () => {
    registry.reconcile([tool()])
    registry.clear()
    expect(recorded[0].dispose).toHaveBeenCalledOnce()
  })
})
