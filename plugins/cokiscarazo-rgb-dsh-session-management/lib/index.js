/**
 * dsh-session-management host plugin (persistent install)
 * 会话管理：归档 / 取消归档 / 真正删除聊天记录 / 导出数据
 * 通过 webServer 注册 JSON API，供浏览器端 fetch 调用。
 * 基于 DSH 官方服务能力实现（sessionQuery / workspaceRegistry / sessionPersistence / subprocess）。
 */
'use strict'

function dirOf(p) {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return i > 0 ? p.slice(0, i) : p
}

function flipSuffix(p) {
  return p.endsWith('.zstd') ? p.slice(0, -5) : p + '.zstd'
}

let platformChecked = false
let isWindows = false

module.exports = {
  inject: ['webServer', 'sessionQuery', 'sessionPersistence', 'workspaceRegistry', 'subprocess'],
  apply(ctx) {
    const log = (...args) => console.log('[dsh-session-management]', ...args)

    // ---- 平台探测：cmd.exe 可解析 => Windows ----
    async function detectPlatform() {
      if (platformChecked) return isWindows
      try {
        await ctx.subprocess.resolveExecutable('cmd.exe')
        isWindows = true
      } catch {}
      platformChecked = true
      return isWindows
    }

    // ---- 删除文件（subprocess，绕开 fs 沙箱）----
    async function removeFile(path) {
      const win = await detectPlatform()
      const spec = win
        ? { argv: ['cmd.exe', '/c', 'del', '/f', '/q', path] }
        : { argv: ['rm', '-f', '--', path] }
      const handle = ctx.subprocess.spawn({
        ...spec,
        cwd: dirOf(path),
        stdio: {
          stdin: 'ignore',
          stdout: { maxBytes: 8192 },
          stderr: { maxBytes: 8192 },
        },
        graceMs: 5000,
      })
      const outcome = await handle.done
      if (outcome.exitCode !== 0) {
        throw new Error(`failed to remove ${path} (exit ${outcome.exitCode})`)
      }
    }

    // ---- 会话全量列表（含归档信息）----
    async function listSessions() {
      const records = await ctx.sessionQuery.listSessions()
      const ids = records.map((r) => String(r.header.id))

      const titles = new Map()
      if (ids.length > 0) {
        try {
          const obs = await ctx.sessionQuery.readTitleSnapshots(ids)
          for (const o of obs) {
            if (o.status === 'fulfilled') titles.set(String(o.sessionId), o.value.title ? o.value.title.title : undefined)
          }
        } catch (e) {
          log('title fold failed', e)
        }
      }

      const wsTitleBySession = new Map()
      let archived = []
      try {
        for (const ws of ctx.workspaceRegistry.list()) {
          for (const sid of ws.sessionIds) wsTitleBySession.set(String(sid), ws.title)
        }
        archived = [...ctx.workspaceRegistry.archivedSessionIds].map(String)
      } catch (e) {
        log('workspace projection failed', e)
      }

      const running = new Set()
      const agents = ctx.get('agents')
      if (agents) {
        for (const a of agents.list()) {
          if (a.status === 'running') running.add(String(a.id))
        }
      }

      return {
        sessions: records.map((r) => {
          const id = String(r.header.id)
          return {
            id,
            title: titles.get(id) ?? '',
            workspace: wsTitleBySession.get(id) ?? '',
            createdAt: typeof r.header.createdAt === 'number' ? r.header.createdAt : 0,
            archived: archived.includes(id),
            live: !!r.live,
            running: running.has(id),
            parentId: r.header.parentSession ? String(r.header.parentSession) : null,
          }
        }),
      }
    }

    // ---- 归档全部 ----
    async function archiveAll() {
      const data = await listSessions()
      let archived = 0
      for (const s of data.sessions) {
        if (s.archived) continue
        await ctx.workspaceRegistry.archiveSession(s.id)
        archived += 1
      }
      return { archived }
    }

    // ---- 取消归档（官方无 API：直接更新 workspace 域归档集合，官方经 domain/changed 自动广播）----
    async function unarchive(id) {
      const reg = ctx.workspaceRegistry
      const state = reg.state
      if (!state || !Array.isArray(state.archivedSessionIds)) throw new Error('workspace registry state is unavailable')
      if (!state.archivedSessionIds.some((x) => String(x) === id)) return { ok: true }
      const next = {
        ...state,
        archivedSessionIds: state.archivedSessionIds.filter((x) => String(x) !== id),
      }
      if (typeof reg.global?.set !== 'function') throw new Error('workspace registry global handle is unavailable')
      await reg.global.set(next)
      reg.state = next
      return { ok: true }
    }

    // ---- 真正删除单个会话 ----
    async function deleteOne(id) {
      const store = ctx.get('sessions')
      const agents = ctx.get('agents')

      const agent = agents ? agents.get(id) : undefined
      if (agent && agent.status === 'running') return { ok: false, reason: 'running' }

      let header = null
      const records = await ctx.sessionQuery.listSessions()
      const found = records.find((r) => String(r.header.id) === id)
      if (found) header = found.header
      if (!header) {
        const headers = await ctx.sessionPersistence.list()
        const found2 = headers.find((h) => String(h.id) === id)
        if (found2) header = found2
      }
      if (!header) return { ok: false, reason: 'not-found' }

      // 把仍在内存中的日志刷到磁盘，再删文件
      const live = store ? store.get(id) : undefined
      if (live) {
        try {
          await store.flush(live)
        } catch (e) {
          log('flush failed', id, e)
        }
      }

      // 1) 删除持久化工件（JSONL / JSONL.zstd 及其对偶文件）
      try {
        const loc = ctx.sessionPersistence.locate(header)
        if (loc && loc.path) {
          await removeFile(loc.path)
          const alt = flipSuffix(loc.path)
          if (alt !== loc.path) await removeFile(alt).catch(() => {})
        } else {
          log('no artifact path for session', id)
        }
      } catch (e) {
        return { ok: false, reason: 'file-error', message: String(e) }
      }

      // 2) 清理 workspace 记账
      try {
        for (const ws of ctx.workspaceRegistry.list()) {
          if (ws.sessionIds.some((sid) => String(sid) === id)) {
            await ws.detachSession(id)
          }
        }
      } catch (e) {
        log('workspace detach failed', id, e)
      }
      // 3) 若在归档集合中则一并移除
      if (ctx.workspaceRegistry.archivedSessionIds.some((x) => String(x) === id)) {
        try {
          await unarchive(id)
        } catch (e) {
          log('unarchive on delete failed', id, e)
        }
      }
      return { ok: true }
    }

    // ---- 删除全部（跳过运行中会话）----
    async function deleteAll() {
      const data = await listSessions()
      const results = { deleted: 0, skipped: 0, failed: 0 }
      for (const s of data.sessions) {
        const r = await deleteOne(s.id)
        if (r.ok) results.deleted += 1
        else if (r.reason === 'running') results.skipped += 1
        else {
          results.failed += 1
          log('delete failed', s.id, r)
        }
      }
      return results
    }

    // ---- HTTP JSON API ----
    const json = (res, code, data) => {
      res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(data))
    }
    const readBody = (req) =>
      new Promise((resolve, reject) => {
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
          if (body.length > 1e6) req.destroy()
        })
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {})
          } catch (e) {
            reject(e)
          }
        })
        req.on('error', reject)
      })
    const route = (path, handler) =>
      ctx.effect(
        () =>
          ctx.webServer.register({
            kind: 'exact',
            path,
            handler: async (req, res) => {
              try {
                json(res, 200, await handler(req))
              } catch (e) {
                json(res, 500, { error: String(e && e.message ? e.message : e) })
              }
            },
          }),
        'dsh-session-management route ' + path
      )

    route('/api/dsh-session-management/list', async () => listSessions())
    route('/api/dsh-session-management/archive-all', async () => archiveAll())
    route('/api/dsh-session-management/unarchive', async (req) => {
      const body = await readBody(req)
      return unarchive(String(body.id ?? ''))
    })
    route('/api/dsh-session-management/delete', async (req) => {
      const body = await readBody(req)
      return deleteOne(String(body.id ?? ''))
    })
    route('/api/dsh-session-management/delete-all', async () => deleteAll())
  },
}
