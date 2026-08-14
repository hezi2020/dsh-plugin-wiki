import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runToolCode, ToolCodeError, ToolTimeoutError } from '../src/executor.ts'

const opts = { timeoutMs: 5000, memoryLimitMb: 128, allowNetwork: false, scope: 'global' as const, env: { tool: 'test_tool' } }

describe('runToolCode', () => {
  it('returns synchronous values', async () => {
    await expect(runToolCode('return 42', {}, opts)).resolves.toBe(42)
  })

  it('supports top-level await and args/env', async () => {
    const value = await runToolCode(
      'const doubled = await Promise.resolve(args.a * 2); return { doubled, tool: env.tool }',
      { a: 21 },
      opts,
    )
    expect(value).toEqual({ doubled: 42, tool: 'test_tool' })
  })

  it('reports thrown errors with their message', async () => {
    const error = await runToolCode('throw new Error("boom")', {}, opts).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ToolCodeError)
    expect((error as Error).message).toContain('boom')
  })

  it('rejects undefined returns', async () => {
    const error = await runToolCode('return undefined', {}, opts).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ToolCodeError)
    expect((error as Error).message).toContain('undefined')
  })

  it('rejects non-JSON returns', async () => {
    const error = await runToolCode('return () => 1', {}, opts).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ToolCodeError)
  })

  it('times out async hangs', async () => {
    const error = await runToolCode('await new Promise(resolve => setTimeout(resolve, 60000)); return 1', {}, { ...opts, timeoutMs: 300 }).catch(e => e)
    expect(error).toBeInstanceOf(ToolTimeoutError)
  }, 10000)

  it('interrupts synchronous infinite loops', async () => {
    const error = await runToolCode('while (true) {}', {}, { ...opts, timeoutMs: 500 }).catch(e => e)
    expect(error).toBeInstanceOf(Error)
  }, 10000)

  it('denies process, require, and constructor escapes', async () => {
    await expect(runToolCode('return typeof process', {}, opts)).resolves.toBe('undefined')
    await expect(runToolCode('return typeof require', {}, opts)).resolves.toBe('undefined')
    await expect(runToolCode('return ({}).constructor.constructor("return typeof process")()', {}, opts)).resolves.toBe('undefined')
  })

  it('blocks network access when allowNetwork is false', async () => {
    const value = await runToolCode(
      'return fetch("data:text/plain,hi").then(() => "ok").catch(error => "ERR:" + error.message)',
      {},
      opts,
    )
    expect(value).toMatch(/ERR:.*network access is disabled/)
  })

  it('allows fetch when allowNetwork is true', async () => {
    const value = await runToolCode(
      'return fetch("data:text/plain,hi").then(response => response.text())',
      {},
      { ...opts, allowNetwork: true },
    )
    expect(value).toBe('hi')
  })

  describe('workspace scope fs', () => {
    let dir: string

    beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'dct-fs-')) })
    afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

    const workspaceOpts = (): Parameters<typeof runToolCode>[2] => ({ ...opts, scope: 'workspace', workspaceRoot: dir })

    it('writes, lists, and reads inside the root', async () => {
      const value = await runToolCode(
        "await fs.writeFile('demo/a.txt', 'hello ' + args.who); const files = await fs.list('demo'); const text = await fs.readFile('demo/a.txt'); return { files: files.map(entry => entry.name), text }",
        { who: 'world' },
        workspaceOpts(),
      )
      expect(value).toEqual({ files: ['a.txt'], text: 'hello world' })
      expect(readFileSync(join(dir, 'demo', 'a.txt'), 'utf8')).toBe('hello world')
    })

    it('rejects relative and absolute paths escaping the root', async () => {
      const relative = await runToolCode("return fs.readFile('../outside.txt')", {}, workspaceOpts()).catch((e: unknown) => e) as Error
      expect(relative.message).toMatch(/escapes the workspace root/)
      const absolute = await runToolCode("return fs.writeFile('/etc/passwd', 'x')", {}, workspaceOpts()).catch((e: unknown) => e) as Error
      expect(absolute.message).toMatch(/escapes the workspace root/)
    })

    it('fails clearly when no workspace root is available', async () => {
      const error = await runToolCode('return fs.list(".")', {}, { ...opts, scope: 'workspace' }).catch((e: unknown) => e) as Error
      expect(error.message).toMatch(/no workspace root/)
    })

    it('global scope exposes no fs', async () => {
      await expect(runToolCode('return typeof fs', {}, opts)).resolves.toBe('undefined')
    })
  })

  it('aborts on the caller signal', async () => {
    const controller = new AbortController()
    const pending = runToolCode('await new Promise(resolve => setTimeout(resolve, 60000)); return 1', {}, { ...opts, signal: controller.signal })
    controller.abort()
    const error = await pending.catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ToolCodeError)
    expect((error as Error).message).toContain('aborted')
  }, 10000)
})
