/**
 * REAL-composition test: boots the actual cordis runtime with the real
 * settings provider base, system prompt, and tools services plus this plugin
 * and minimal fakes for the agent/approval services the location feature
 * reaches through, then asserts the model-visible and durable outcomes.
 */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context, Service } from '@deepseek-ai/cordis'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import Tools from '@deepseek-ai/dsh-tools'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply, Config, inject, name } from '../src/index.ts'

/** In-memory provider: the smallest real subclass of the settings Service Definition. */
class MemorySettings extends SettingsProvider {
  doc: Record<string, unknown> = {}

  get writable(): boolean {
    return true
  }

  protected load(): Promise<Record<string, unknown>> {
    return Promise.resolve(structuredClone(this.doc))
  }

  protected async persist(ns: SettingsNamespace, section: Record<string, unknown>): Promise<void> {
    this.doc[ns] = structuredClone(section)
  }
}

/** Fake agent registry: one fixed initiator agent in a temp workspace. */
class FakeAgents extends Service {
  scopedRegistrations: Array<{ name: string }> = []

  constructor(ctx: Context, public workspace: string) {
    super(ctx, 'agents')
  }

  currentInitiator(): { session: { header: { cwd: string } } } {
    return { session: { header: { cwd: this.workspace } } }
  }

  list(): Array<{ session: { header: { cwd: string } }; ctx: { tools: { register: (definition: { name: string }) => () => void } } }> {
    return [
      {
        session: { header: { cwd: this.workspace } },
        ctx: {
          tools: {
            register: (definition: { name: string }) => {
              this.scopedRegistrations.push(definition)
              return () => {}
            },
          },
        },
      },
    ]
  }
}

/** Fake approval service with a settable outcome. */
class FakeApproval extends Service {
  outcome: 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable' = 'allowed-once'

  constructor(ctx: Context) {
    super(ctx, 'approval')
  }

  async request(): Promise<'allowed-once' | 'rejected' | 'cancelled' | 'unavailable'> {
    return this.outcome
  }
}

const tool = {
  id: 't1',
  name: 'hello_tool',
  description: 'greets a name',
  parameters: { type: 'object', properties: { who: { type: 'string' } }, required: ['who'] },
  code: 'return "hello " + args.who',
  scope: 'global',
  location: 'global',
  enabled: true,
  source: 'user',
  createdAt: '',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

interface BootResult { ctx: Context; settings: MemorySettings; agents: FakeAgents; approval: FakeApproval; dispose(): Promise<void> }

async function boot(): Promise<BootResult> {
  const workspace = mkdtempSync(join(tmpdir(), 'dct-ws-'))
  const dshHome = mkdtempSync(join(tmpdir(), 'dct-home-'))
  const ctx = new Context()
  const fibers = [
    ctx.plugin(MemorySettings),
    ctx.plugin(SystemPrompt, {}),
    ctx.plugin(Tools, {}),
    ctx.plugin(FakeAgents, workspace),
    ctx.plugin(FakeApproval),
    ctx.plugin({ name, inject, Config, apply }, { ...FULL_CONFIG, dshHome }),
  ]
  await Promise.all(fibers)
  return {
    ctx,
    settings: ctx.get('settings') as MemorySettings,
    agents: ctx.get('agents') as unknown as FakeAgents,
    approval: ctx.get('approval') as unknown as FakeApproval,
    dispose: async () => {
      await Promise.all(fibers.map(fiber => fiber.dispose()))
    },
  }
}

const FULL_CONFIG = {
  timeoutMs: 5000,
  memoryLimitMb: 128,
  maxResultChars: 16000,
  maxCodeBytes: 65536,
  maxTools: 100,
  allowNetwork: true,
  dshHome: '',
}

afterEach(() => { vi.restoreAllMocks() })

describe('real composition', () => {
  it('registers custom tools live and removes them on disable', async () => {
    const { ctx, settings, dispose } = await boot()
    try {
      expect(ctx.tools.schemas().map(schema => schema.name)).toContain('custom_tool_create')

      await settings.update('custom-tools' as SettingsNamespace, { tools: [tool] })
      await vi.waitFor(() => { expect(ctx.tools.get('hello_tool')).toBeDefined() })

      const schema = ctx.tools.schemas().find(entry => entry.name === 'hello_tool')
      expect(schema?.description).toBe('greets a name')

      await settings.update('custom-tools' as SettingsNamespace, { tools: [{ ...tool, enabled: false }] })
      await vi.waitFor(() => { expect(ctx.tools.get('hello_tool')).toBeUndefined() })
    } finally {
      await dispose()
    }
  })

  it('creates a global-location tool when approval allows, then removes it', async () => {
    const { ctx, dispose } = await boot()
    try {
      const create = ctx.tools.get('custom_tool_create')
      expect(create).toBeDefined()
      const createParameters = create!.parameters as { properties?: Record<string, unknown> }
      expect(Object.keys(createParameters.properties ?? {})).toContain('location')

      const result = await create!.execute({
        name: 'double_tool',
        description: 'doubles a number',
        parameters: { type: 'object', properties: { n: { type: 'number' } }, required: ['n'] },
        code: 'return args.n * 2',
        location: 'global',
      }, { signal: undefined } as never)
      expect(result).toMatchObject({ name: 'double_tool', replaced: false, enabled: true, location: 'global' })

      await vi.waitFor(() => { expect(ctx.tools.get('double_tool')).toBeDefined() })

      const list = ctx.tools.get('custom_tools_list')
      const listed = await list!.execute({}, { signal: undefined } as never) as { tools: Array<{ name: string; source: string; location: string }> }
      expect(listed.tools.find(entry => entry.name === 'double_tool')).toMatchObject({ source: 'model', location: 'global' })

      const remove = ctx.tools.get('custom_tool_remove')
      await remove!.execute({ name: 'double_tool' }, { signal: undefined } as never)
      await vi.waitFor(() => { expect(ctx.tools.get('double_tool')).toBeUndefined() })
    } finally {
      await dispose()
    }
  })

  it('refuses a global-location creation when approval is declined', async () => {
    const { ctx, approval, dispose } = await boot()
    try {
      approval.outcome = 'rejected'
      const create = ctx.tools.get('custom_tool_create')
      const error = await create!.execute({
        name: 'sneaky_tool',
        description: 'should not persist',
        parameters: { type: 'object', properties: {} },
        code: 'return 1',
        location: 'global',
      }, { signal: undefined } as never).catch((e: unknown) => e) as Error
      expect(error.message).toMatch(/did not authorize/)
      expect(ctx.tools.get('sneaky_tool')).toBeUndefined()
    } finally {
      await dispose()
    }
  })

  it('creates workspace-location tools autonomously into the per-workspace store', async () => {
    const { ctx, agents, dispose } = await boot()
    try {
      const create = ctx.tools.get('custom_tool_create')
      const result = await create!.execute({
        name: 'ws_tool',
        description: 'workspace-only tool',
        parameters: { type: 'object', properties: {} },
        code: 'return 42',
      }, { signal: undefined } as never)
      expect(result).toMatchObject({ name: 'ws_tool', location: 'workspace' })
      expect(agents.scopedRegistrations.some(entry => entry.name === 'ws_tool')).toBe(true)

      const list = ctx.tools.get('custom_tools_list')
      const listed = await list!.execute({}, { signal: undefined } as never) as { tools: Array<{ name: string; location: string }> }
      expect(listed.tools.find(entry => entry.name === 'ws_tool')?.location).toBe('workspace')
    } finally {
      await dispose()
    }
  })

  it('refuses to remove a user-created tool', async () => {
    const { ctx, settings, dispose } = await boot()
    try {
      await settings.update('custom-tools' as SettingsNamespace, { tools: [tool] })
      await vi.waitFor(() => { expect(ctx.tools.get('hello_tool')).toBeDefined() })

      const remove = ctx.tools.get('custom_tool_remove')
      const error = await remove!.execute({ name: 'hello_tool' }, { signal: undefined } as never).catch((e: unknown) => e) as Error
      expect(error.message).toMatch(/cannot be removed by the model/)
      expect(ctx.tools.get('hello_tool')).toBeDefined()
      expect(settings.doc['custom-tools']).toMatchObject({ tools: [expect.objectContaining({ name: 'hello_tool' })] })
    } finally {
      await dispose()
    }
  })
})
