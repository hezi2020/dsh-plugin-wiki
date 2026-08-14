import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readWorkspaceTools, resolveDshHome, workspaceStorePath, writeWorkspaceTools } from '../src/workspace-store.ts'
import type { CustomTool } from '../src/types.ts'

const tool = (name: string): CustomTool => ({
  id: name,
  name,
  description: 'd',
  parameters: { type: 'object', properties: {} },
  code: 'return 1',
  scope: 'global',
  location: 'workspace',
  enabled: true,
  source: 'model',
  createdAt: '',
  updatedAt: '',
})

describe('workspace store', () => {
  let home: string
  const root = '/Users/example/ws-a'

  beforeEach(() => { home = mkdtempSync(join(tmpdir(), 'dct-store-')) })
  afterEach(() => { rmSync(home, { recursive: true, force: true }) })

  it('resolves the harness home from config, env, and defaults', () => {
    expect(resolveDshHome('/tmp/x')).toBe('/tmp/x')
    process.env.DSH_HOME = '/tmp/env-home'
    expect(resolveDshHome('')).toBe('/tmp/env-home')
    delete process.env.DSH_HOME
    expect(resolveDshHome('')).toContain('.dsh')
  })

  it('reads empty for a missing store and round-trips writes', () => {
    expect(readWorkspaceTools(home, root)).toEqual([])
    writeWorkspaceTools(home, root, [tool('a'), tool('b')])
    expect(readWorkspaceTools(home, root).map(entry => entry.name)).toEqual(['a', 'b'])
    expect(existsSync(workspaceStorePath(home, root))).toBe(true)
  })

  it('keys different workspaces separately', () => {
    writeWorkspaceTools(home, root, [tool('a')])
    expect(workspaceStorePath(home, root)).not.toBe(workspaceStorePath(home, '/Users/example/ws-b'))
    expect(readWorkspaceTools(home, '/Users/example/ws-b')).toEqual([])
  })

  it('refuses corrupt stores loudly', () => {
    const path = workspaceStorePath(home, root)
    mkdirSync(join(home, 'workspace-tools'), { recursive: true })
    writeFileSync(path, 'not json', 'utf8')
    expect(() => readWorkspaceTools(home, root)).toThrow(/corrupt workspace tool store/)
  })

  it('is version-stable across writes', () => {
    writeWorkspaceTools(home, root, [tool('a')])
    const raw = JSON.parse(readFileSync(workspaceStorePath(home, root), 'utf8')) as { version: number; tools: CustomTool[] }
    expect(raw.version).toBe(1)
    expect(raw.tools).toHaveLength(1)
  })
})
