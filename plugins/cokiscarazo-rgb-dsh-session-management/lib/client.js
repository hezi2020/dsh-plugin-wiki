/**
 * dsh-session-management client plugin (persistent install)
 * 浏览器端：设置面板「会话管理」页面（归档管理 / 删除 / 导出，中英双语）。
 * 数据走 /api/dsh-session-management/*（host 端 webServer 路由），导出复用官方 /api/session.export。
 */
window.__ModuleLoader__.load({
  id: 'dsh-session-management',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    let react = require('react')

    const NS = 'dsh-session-management'

    // ---- 字典（中英双语，跟随 设置-通用-语言）----
    const zh = {
      'settings.label': '会话管理',
      'panel.archived': '已归档的聊天',
      'panel.manage': '管理',
      'panel.archiveAll': '归档所有聊天',
      'panel.archiveAllAction': '全部归档',
      'panel.deleteAll': '删除所有聊天',
      'panel.deleteAllAction': '全部删除',
      'panel.export': '导出数据',
      'panel.exportAction': '导出',
      'panel.dangerNote': '删除为永久操作，聊天记录将无法恢复。',
      'dialog.title': '已归档的聊天 - 管理',
      'dialog.close': '关闭',
      'dialog.groupByWorkspace': '按工作区',
      'dialog.groupByTime': '按月份',
      'dialog.sortCreated': '创建日期',
      'dialog.sortUpdated': '更新日期',
      'dialog.asc': '升序',
      'dialog.desc': '降序',
      'dialog.expandAll': '全部展开',
      'dialog.collapseAll': '全部折叠',
      'dialog.workspaceNone': '未分组',
      'word.workspace': '工作区',
      'word.month': '月份',
      'dialog.unarchiveGroup': '取消归档该{what}',
      'dialog.deleteGroup': '删除该{what}已归档的聊天',
      'manage.col.name': '名称',
      'manage.col.workspace': '工作区',
      'manage.col.createdAt': '创建日期',
      'manage.col.updatedAt': '更新日期',
      'manage.col.actions': '管理',
      'manage.unarchive': '取消归档聊天',
      'manage.delete': '删除聊天',
      'manage.empty': '暂无已归档的聊天',
      'confirm.archiveAll': '确定要归档所有聊天吗？归档后它们将从会话列表中隐藏，但记录仍会保留。',
      'confirm.deleteAll': '确定要删除所有聊天吗？此操作将永久删除全部聊天记录且无法恢复！',
      'confirm.deleteOne': '确定要删除聊天“{name}”吗？此操作将永久删除其聊天记录且无法恢复！',
      'confirm.deleteGroup': '确定要删除{what}“{name}”的全部 {count} 个已归档聊天吗？此操作永久删除且无法恢复！',
      'result.archived': '已归档 {count} 个聊天。',
      'result.deleted': '已删除 {deleted} 个聊天，跳过 {skipped} 个，失败 {failed} 个。',
      'result.deletedOne': '已删除聊天。',
      'result.unarchived': '已取消归档。',
      'result.unarchivedGroup': '已取消归档 {count} 个聊天。',
      'result.exported': '已导出 {count} 个会话。',
      'result.error': '操作失败：{message}',
      'export.none': '没有可导出的会话。',
    }
    const en = {
      'settings.label': 'Session Manager',
      'panel.archived': 'Archived chats',
      'panel.manage': 'Manage',
      'panel.archiveAll': 'Archive all chats',
      'panel.archiveAllAction': 'Archive all',
      'panel.deleteAll': 'Delete all chats',
      'panel.deleteAllAction': 'Delete all',
      'panel.export': 'Export data',
      'panel.exportAction': 'Export',
      'panel.dangerNote': 'Deletion is permanent and cannot be undone.',
      'dialog.title': 'Archived chats - Manage',
      'dialog.close': 'Close',
      'dialog.groupByWorkspace': 'By workspace',
      'dialog.groupByTime': 'By month',
      'dialog.sortCreated': 'Created',
      'dialog.sortUpdated': 'Updated',
      'dialog.asc': 'Asc',
      'dialog.desc': 'Desc',
      'dialog.expandAll': 'Expand all',
      'dialog.collapseAll': 'Collapse all',
      'dialog.workspaceNone': 'No workspace',
      'word.workspace': 'workspace',
      'word.month': 'month',
      'dialog.unarchiveGroup': 'Unarchive this {what}',
      'dialog.deleteGroup': 'Delete archived chats in this {what}',
      'manage.col.name': 'Name',
      'manage.col.workspace': 'Workspace',
      'manage.col.createdAt': 'Created',
      'manage.col.updatedAt': 'Updated',
      'manage.col.actions': 'Actions',
      'manage.unarchive': 'Unarchive chat',
      'manage.delete': 'Delete chat',
      'manage.empty': 'No archived chats',
      'confirm.archiveAll': 'Archive all chats? They will be hidden from the session list, but records are kept.',
      'confirm.deleteAll': 'Delete ALL chats? This permanently removes every chat record and cannot be undone!',
      'confirm.deleteOne': 'Delete chat "{name}"? This permanently removes its record and cannot be undone!',
      'confirm.deleteGroup': 'Delete all {count} archived chats in {what} "{name}"? This permanently removes them and cannot be undone!',
      'result.archived': 'Archived {count} chats.',
      'result.deleted': 'Deleted {deleted}, skipped {skipped}, failed {failed}.',
      'result.deletedOne': 'Chat deleted.',
      'result.unarchived': 'Unarchived.',
      'result.unarchivedGroup': 'Unarchived {count} chats.',
      'result.exported': 'Exported {count} sessions.',
      'result.error': 'Operation failed: {message}',
      'export.none': 'Nothing to export.',
    }

    // ---- CSS（持久化插件无 styles builtin，手动注入）----
    const CSS_TAG = 'dsh-session-management/css'
    function ensureCss() {
      if (typeof document === 'undefined') return
      if (document.querySelector('style[data-plugin-css="' + CSS_TAG + '"]')) return
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-session-management'
      tag.dataset.pluginCss = CSS_TAG
      tag.textContent =
        // ===== Apple / Pinguo tokens (macOS-style buttons) =====
        '.sm-dialog,.sm-section{--sm-bg:#ffffff;--sm-fg:#1d1d1f;--sm-muted:#6e6e73;--sm-secondary:#f2f2f7;--sm-secondary-hover:#e8e8ed;--sm-border:#e5e5ea;--sm-divider:#ececf0;--sm-btn-bg:#f2f2f7;--sm-btn-border:#d6d6dc;--sm-btn-hover:#e5e5ea;--sm-btn-active:#dbdbe1;--sm-btn-highlight:rgba(255,255,255,.7);--sm-primary:#007aff;--sm-primary-top:#3b9bff;--sm-primary-hover:#0069d9;--sm-primary-hover-top:#2e8fff;--sm-primary-active:#0055bb;--sm-danger:#d70015;--sm-danger-bg:#ffecea;--sm-danger-border:#ffc9c6;--sm-danger-hover:#ffdcd9;--sm-danger-active:#ffc9c6;--sm-selected:#ffffff;--sm-shadow-btn:0 1px 2px rgba(0,0,0,.06);--sm-shadow-btn-hover:0 2px 8px rgba(0,0,0,.12);--sm-font:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--sm-fg)}' +
        '@media (prefers-color-scheme:dark){.sm-dialog,.sm-section{--sm-bg:#1c1c1e;--sm-fg:#f5f5f7;--sm-muted:#98989d;--sm-secondary:#2c2c2e;--sm-secondary-hover:#3a3a3c;--sm-border:#38383a;--sm-divider:#26262a;--sm-btn-bg:#3a3a3c;--sm-btn-border:#4a4a4d;--sm-btn-hover:#48484b;--sm-btn-active:#545457;--sm-btn-highlight:rgba(255,255,255,.08);--sm-primary:#0a84ff;--sm-primary-top:#4ab0ff;--sm-primary-hover:#409cff;--sm-primary-hover-top:#3395ff;--sm-primary-active:#0a70e0;--sm-danger:#ff453a;--sm-danger-bg:#3d2427;--sm-danger-border:#5a3438;--sm-danger-hover:#4a2b30;--sm-danger-active:#5a3438;--sm-selected:#3a3a3c;--sm-shadow-btn:0 1px 2px rgba(0,0,0,.2);--sm-shadow-btn-hover:0 2px 8px rgba(0,0,0,.35)}}' +
        // ===== buttons (macOS: soft surface, hairline border, clear hover/press) =====
        '.sm-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 14px;border-radius:14px;border:1px solid var(--sm-btn-border);background:var(--sm-btn-bg);color:var(--sm-fg);font:500 13px/1 var(--sm-font);white-space:nowrap;cursor:pointer;box-shadow:var(--sm-shadow-btn),inset 0 1px 0 var(--sm-btn-highlight);transition:background-color .15s ease,box-shadow .15s ease}' +
        '.sm-btn:hover:not(:disabled){background:var(--sm-btn-hover);box-shadow:var(--sm-shadow-btn-hover),inset 0 1px 0 var(--sm-btn-highlight)}' +
        '.sm-btn:active:not(:disabled){background:var(--sm-btn-active);box-shadow:inset 0 1px 3px rgba(0,0,0,.08)}' +
        '.sm-btn:focus-visible{outline:2px solid var(--sm-primary);outline-offset:2px}' +
        '.sm-btn:disabled{opacity:.42;cursor:not-allowed}' +
        '.sm-btn-primary{background:linear-gradient(180deg,var(--sm-primary-top),var(--sm-primary));border-color:transparent;color:#ffffff;box-shadow:var(--sm-shadow-btn),inset 0 1px 0 rgba(255,255,255,.25)}' +
        '.sm-btn-primary:hover:not(:disabled){background:linear-gradient(180deg,var(--sm-primary-hover-top),var(--sm-primary-hover));box-shadow:var(--sm-shadow-btn-hover),inset 0 1px 0 rgba(255,255,255,.25)}' +
        '.sm-btn-primary:active:not(:disabled){background:var(--sm-primary-active);box-shadow:inset 0 1px 3px rgba(0,0,0,.15)}' +
        '.sm-btn-danger{background:var(--sm-danger-bg);border-color:var(--sm-danger-border);color:var(--sm-danger)}' +
        '.sm-btn-danger:hover:not(:disabled){background:var(--sm-danger-hover);box-shadow:var(--sm-shadow-btn-hover)}' +
        '.sm-btn-danger:active:not(:disabled){background:var(--sm-danger-active);box-shadow:inset 0 1px 3px rgba(0,0,0,.08)}' +
        '.sm-btn-link{background:transparent;border-color:transparent;box-shadow:none;color:var(--sm-primary)}' +
        '.sm-btn-link:hover:not(:disabled){background:transparent;color:var(--sm-primary-hover)}' +
        // ===== segmented control (Apple) =====
        '.sm-segmented{display:inline-flex;align-items:center;gap:2px;padding:3px;border-radius:14px;background:var(--sm-btn-bg);border:1px solid var(--sm-btn-border)}' +
        '.sm-segmented .sm-btn{height:26px;padding:0 10px;font-size:12px;background:transparent;border-color:transparent;box-shadow:none;color:var(--sm-fg)}' +
        '.sm-segmented .sm-btn:hover:not(:disabled){background:rgba(0,0,0,.05);box-shadow:none}' +
        '.sm-segmented .sm-btn-active{background:var(--sm-selected);color:var(--sm-primary);box-shadow:0 1px 2px rgba(0,0,0,.12)}' +
        '.sm-segmented .sm-sep{width:1px;height:16px;background:var(--sm-border);margin:0 2px}' +
        // ===== settings nav icon swap (dsh-session-management row: gear -> box) =====
        '[class*="navList"] > button:nth-child(5) > svg{display:none}' +
        '[class*="navList"] > button:nth-child(5)::before{content:"";width:16px;height:16px;flex:none;background:currentColor;-webkit-mask:url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27black%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27><path d=%27M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z%27/><path d=%27m3.3 7 8.7 5 8.7-5%27/><path d=%27M12 22V12%27/></svg>") center/contain no-repeat;mask:url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27black%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27><path d=%27M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z%27/><path d=%27m3.3 7 8.7 5 8.7-5%27/><path d=%27M12 22V12%27/></svg>") center/contain no-repeat}' +
        // ===== layout =====
        '.sm-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}' +
        '.sm-label{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--sm-fg);min-width:0;font-family:var(--sm-font)}' +
        '.sm-section{display:flex;flex-direction:column;gap:16px;padding:8px 4px;max-width:960px;font-family:var(--sm-font)}' +
        '.sm-note{font-size:12px;color:var(--sm-muted);line-height:18px;font-family:var(--sm-font)}' +
        '.sm-result{font-size:12px;color:var(--sm-muted);min-height:16px;font-family:var(--sm-font)}' +
        '.sm-result.error{color:var(--sm-danger)}' +
        // ===== dialog (quiet Apple modal) =====
        '.sm-overlay{position:fixed;inset:0;z-index:2147483000}' +
        '.sm-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.3)}' +
        '.sm-dialog{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(920px,calc(100vw - 48px));max-height:min(680px,calc(100vh - 96px));overflow:auto;background:var(--sm-bg);border:1px solid var(--sm-border);border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.18);padding:24px;display:flex;flex-direction:column;gap:16px;font-family:var(--sm-font)}' +
        '.sm-dialog h3{margin:0;font-size:20px;font-weight:600;letter-spacing:-0.01em;color:var(--sm-fg)}' +
        // ===== toolbar =====
        '.sm-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
        // ===== group cards (inset grouped style) =====
        '.sm-group{border:1px solid var(--sm-border);border-radius:16px;margin-bottom:10px;overflow:hidden;background:var(--sm-bg)}' +
        '.sm-group-head{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;user-select:none;transition:background-color .15s ease}' +
        '.sm-group-head:hover{background:var(--sm-secondary)}' +
        '.sm-group-head .sm-chevron{transition:transform .2s ease;color:var(--sm-muted);font-size:11px}' +
        '.sm-group-head.sm-collapsed .sm-chevron{transform:rotate(-90deg)}' +
        '.sm-group-title{font-weight:600;font-size:14px;color:var(--sm-fg);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.sm-group-count{font-size:12px;color:var(--sm-muted);flex:none}' +
        '.sm-group-actions{display:flex;gap:4px;margin-left:auto;flex:none}' +
        '.sm-group-actions .sm-btn{height:28px;padding:0 10px;font-size:12px;background:var(--sm-bg);border-color:var(--sm-btn-border)}' +
        '.sm-group-actions .sm-btn:hover:not(:disabled){background:var(--sm-btn-hover)}' +
        '.sm-group-actions .sm-btn:active:not(:disabled){background:var(--sm-btn-active)}' +
        '.sm-group-actions .sm-btn-danger,.sm-manage-table .sm-actions .sm-btn-danger{border-color:var(--sm-danger-border)}' +
        '.sm-group-actions .sm-btn-danger:hover:not(:disabled),.sm-manage-table .sm-actions .sm-btn-danger:hover:not(:disabled){background:var(--sm-danger-hover)}' +
        '.sm-group-actions .sm-btn-danger:active:not(:disabled),.sm-manage-table .sm-actions .sm-btn-danger:active:not(:disabled){background:var(--sm-danger-active)}' +
        // ===== table (quiet, hairline dividers) =====
        '.sm-manage-table{width:100%;border-collapse:collapse;font-size:13px;font-family:var(--sm-font)}' +
        '.sm-manage-table th,.sm-manage-table td{text-align:left;padding:10px 16px;border-bottom:1px solid var(--sm-divider);vertical-align:middle}' +
        '.sm-manage-table th{color:var(--sm-muted);font-weight:500;font-size:12px;white-space:nowrap;background:transparent}' +
        '.sm-manage-table tbody tr:last-child td{border-bottom:none}' +
        '.sm-manage-table tbody tr{transition:background-color .12s ease}' +
        '.sm-manage-table tbody tr:hover{background:var(--sm-secondary)}' +
        '.sm-manage-table td.name{max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;color:var(--sm-fg)}' +
        '.sm-manage-table td.date{font-variant-numeric:tabular-nums;color:var(--sm-muted);font-size:12px}' +
        '.sm-manage-table .sm-actions{display:flex;gap:4px;flex-wrap:wrap}' +
        '.sm-manage-table .sm-actions .sm-btn{height:26px;padding:0 10px;font-size:12px;background:var(--sm-bg);border-color:var(--sm-btn-border)}' +
        '.sm-manage-table .sm-actions .sm-btn:hover:not(:disabled){background:var(--sm-btn-hover)}' +
        '.sm-manage-table .sm-actions .sm-btn:active:not(:disabled){background:var(--sm-btn-active)}' +
        '.sm-h2{font-size:15px;font-weight:600;margin:0;color:var(--sm-fg)}'
      document.head.appendChild(tag)
    }

    // ---- API 封装（host webServer 路由）----
    const api = (method, body) =>
      fetch('/api/dsh-session-management/' + method, {
        method: body === undefined ? 'GET' : 'POST',
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      }).then((r) => r.json().then((d) => {
        if (!r.ok || (d && d.error)) throw new Error(d && d.error ? d.error : 'HTTP ' + r.status)
        return d
      }))
    const refreshWorkspaces = () => {
      try { ctx.get('workspaces')?.refresh() } catch (e) { console.error('[dsh-session-management] refresh failed', e) }
    }

    // ---- 导出（与官方一致的 ZIP）----
    function downloadSessionZip(sessionId) {
      const base = (typeof location !== 'undefined' && location.origin && location.origin !== 'null') ? location.origin : 'http://dsh.internal'
      const url = new URL('/api/session.export', base)
      url.searchParams.set('sessionId', sessionId)
      url.searchParams.set('includeDescendants', 'true')
      const filename = 'dsh-session-' + String(sessionId).replace(/[^A-Za-z0-9_-]/g, '_') + '.zip'
      return fetch(url, { method: 'GET' })
        .then((r) => {
          if (!r.ok) throw new Error('HTTP ' + r.status)
          return r.blob()
        })
        .then((blob) => {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = filename
          a.click()
          setTimeout(() => URL.revokeObjectURL(a.href), 10000)
        })
    }

    async function exportAll() {
      const data = await api('list')
      const roots = data.sessions.filter((s) => !s.parentId)
      if (roots.length === 0) return { count: 0 }
      for (const s of roots) await downloadSessionZip(s.id)
      return { count: roots.length }
    }

    function fmtTime(ts) {
      if (!ts) return '—'
      try { return new Date(ts).toLocaleString() } catch { return String(ts) }
    }

    // ---- Apple (Lucide) 线性图标：stroke currentColor，随主题变色 ----
    const appleIcon = (paths, size) =>
      react.createElement('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, style: { flex: 'none' },
      }, ...paths.map((d) => react.createElement('path', { d })))
    const IconBox = (s) => appleIcon(['M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z', 'm3.3 7 8.7 5 8.7-5', 'M12 22V12'], s)
    const IconTrash = (s) => appleIcon(['M10 11v6', 'M14 11v6', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'], s)
    const IconDownload = (s) => appleIcon(['M12 5v14', 'm19 12-7 7-7-7'], s)
    const IconChevronDown = (s) => appleIcon(['m6 9 6 6 6-6'], s)
    const IconAlert = (s) => appleIcon(['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'], s)
    const IconFolderOpen = (s) => appleIcon(['m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2'], s)

    // ---- 管理弹窗：已归档的聊天 ----
    function ManageDialog(props) {
      const { t, rows, sessionsById, busy, onAction, onClose } = props
      const [mode, setMode] = react.useState('group') // 'group' | 'time'
      const [timeField, setTimeField] = react.useState('createdAt')
      const [direction, setDirection] = react.useState('desc')
      const [collapsed, setCollapsed] = react.useState(new Set())

      const timeOf = (row) => {
        if (timeField === 'updatedAt') return (sessionsById[row.id] ? sessionsById[row.id].updatedAt : 0) || row.createdAt
        return row.createdAt
      }
      const cmp = (a, b) => {
        const r = timeOf(a) - timeOf(b)
        return direction === 'asc' ? r : -r
      }

      // 按工作区分组（组间按名称排序，未分组兜底）
      const groups = []
      const byName = new Map()
      // 分组：按工作区（mode='group'）或按月份（mode='time'）
      const isMonth = mode === 'time'
      const monthKeyOf = (ts) => {
        const d = new Date(ts || 0)
        return String(d.getFullYear()) + '-' + String(d.getMonth() + 1).padStart(2, '0')
      }
      const monthNameOf = (k) => {
        const parts = k.split('-').map(Number)
        // 跟随 DSH 语言：en → "August 2026"，zh → "2026年8月"
        let localeId = ''
        try {
          const snap = ctx.get('locale')?.getLocale?.()
          localeId = (snap && (snap.id || snap.active)) || ''
        } catch {}
        if (localeId === 'en') {
          try { return new Date(parts[0], parts[1] - 1, 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) } catch { return k }
        }
        return parts[0] + '年' + parts[1] + '月'
      }
      const keyOf = isMonth ? (r) => monthKeyOf(r.createdAt) : (r) => r.workspace || '\u0000'
      const nameOf = isMonth ? monthNameOf : (k) => (k === '\u0000' ? t('dialog.workspaceNone') : k)
      for (const row of rows) {
        const key = keyOf(row)
        if (!byName.has(key)) {
          const g = { key, name: nameOf(key), rows: [] }
          byName.set(key, g)
          groups.push(g)
        }
        byName.get(key).rows.push(row)
      }
      groups.sort((a, b) => {
        if (isMonth) return b.key.localeCompare(a.key) // 月份倒序：最近在前
        if (a.key === '\u0000') return 1
        if (b.key === '\u0000') return -1
        return String(a.name).localeCompare(String(b.name))
      })
      for (const g of groups) g.rows.sort(cmp)

      const sortedFlat = [...rows].sort(cmp)
      const toggleCollapse = (key) => {
        setCollapsed((prev) => {
          const next = new Set(prev)
          if (next.has(key)) next.delete(key)
          else next.add(key)
          return next
        })
      }

      const unarchiveGroup = (g) => {
        let done = 0
        const step = () => {
          if (done >= g.rows.length) return
          const row = g.rows[done]
          done += 1
          onAction(() => api('unarchive', { id: row.id }), t('result.unarchivedGroup', { count: g.rows.length }), null).then(step)
        }
        step()
      }
      const deleteGroup = (g) => {
        if (typeof confirm !== 'function' || !confirm(t('confirm.deleteGroup', { name: g.name, count: g.rows.length, what: isMonth ? t('word.month') : t('word.workspace') }))) return
        let done = 0
        let deleted = 0
        let skipped = 0
        const step = () => {
          if (done >= g.rows.length) {
            onAction(() => Promise.resolve(), t('result.deleted', { deleted, skipped, failed: 0 }), null)
            return
          }
          const row = g.rows[done]
          done += 1
          onAction(() => api('delete', { id: row.id }), null, null)
            .then((r) => {
              if (r && r.ok) deleted += 1
              else skipped += 1
              step()
            })
            .catch(() => { skipped += 1; step() })
        }
        step()
      }

      const header = react.createElement('tr', null,
        react.createElement('th', null, t('manage.col.name')),
        mode === 'time' ? react.createElement('th', null, t('manage.col.workspace')) : null,
        react.createElement('th', null, t('manage.col.createdAt')),
        react.createElement('th', null, t('manage.col.updatedAt')),
        react.createElement('th', null, t('manage.col.actions'))
      )
      const rowCells = (row) => [
        react.createElement('td', { className: 'name', title: row.title || row.id, key: 'n' }, row.title || row.id),
        mode === 'time' ? react.createElement('td', { key: 'w' }, row.workspace || t('dialog.workspaceNone')) : null,
        react.createElement('td', { key: 'c', className: 'date' }, fmtTime(row.createdAt)),
        react.createElement('td', { key: 'u', className: 'date' }, fmtTime(timeOf(row))),
        react.createElement('td', { key: 'a' },
          react.createElement('div', { className: 'sm-actions' },
            react.createElement('button', { type: 'button', className: 'sm-btn', disabled: busy, onClick: () => onAction(() => api('unarchive', { id: row.id }), t('result.unarchived'), null) }, t('manage.unarchive')),
            react.createElement('button', { type: 'button', className: 'sm-btn sm-btn-danger', disabled: busy, onClick: () => onAction(() => api('delete', { id: row.id }), t('result.deletedOne'), t('confirm.deleteOne', { name: row.title || row.id })) }, t('manage.delete'))
          )
        ),
      ]

      const toolbar = react.createElement('div', { className: 'sm-toolbar' },
        react.createElement('div', { className: 'sm-segmented' },
          react.createElement('button', { type: 'button', className: 'sm-btn' + (mode === 'group' ? ' sm-btn-active' : ''), onClick: () => setMode('group') }, t('dialog.groupByWorkspace')),
          react.createElement('button', { type: 'button', className: 'sm-btn' + (mode === 'time' ? ' sm-btn-active' : ''), onClick: () => setMode('time') }, t('dialog.groupByTime'))
        ),
        react.createElement('div', { className: 'sm-segmented' },
          react.createElement('button', { type: 'button', className: 'sm-btn' + (timeField === 'createdAt' ? ' sm-btn-active' : ''), onClick: () => setTimeField('createdAt') }, t('dialog.sortCreated')),
          react.createElement('button', { type: 'button', className: 'sm-btn' + (timeField === 'updatedAt' ? ' sm-btn-active' : ''), onClick: () => setTimeField('updatedAt') }, t('dialog.sortUpdated')),
          react.createElement('span', { className: 'sm-sep' }),
          react.createElement('button', { type: 'button', className: 'sm-btn' + (direction === 'asc' ? ' sm-btn-active' : ''), onClick: () => setDirection('asc') }, t('dialog.asc')),
          react.createElement('button', { type: 'button', className: 'sm-btn' + (direction === 'desc' ? ' sm-btn-active' : ''), onClick: () => setDirection('desc') }, t('dialog.desc'))
        ),
        react.createElement('span', { style: { flex: 1 } }),
        react.createElement('button', { type: 'button', className: 'sm-btn', onClick: () => setCollapsed(new Set()) }, t('dialog.expandAll')),
        react.createElement('button', { type: 'button', className: 'sm-btn', onClick: () => setCollapsed(new Set(groups.map((g) => g.key))) }, t('dialog.collapseAll'))
      )

      let body
      if (rows.length === 0) {
        body = react.createElement('div', { style: { color: 'var(--sm-muted)', textAlign: 'center', padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 } },
          react.createElement('span', { style: { opacity: .5 } }, IconFolderOpen(40)),
          react.createElement('div', { style: { fontSize: 13 } }, t('manage.empty'))
        )
      } else {
        body = react.createElement('div', null, groups.map((g) =>
          react.createElement('div', { className: 'sm-group' + (collapsed.has(g.key) ? ' sm-collapsed' : ''), key: g.key },
            react.createElement('div', { className: 'sm-group-head', onClick: () => toggleCollapse(g.key) },
              react.createElement('span', { className: 'sm-chevron' }, IconChevronDown(14)),
              react.createElement('span', { className: 'sm-group-title' }, g.name),
              react.createElement('span', { className: 'sm-group-count' }, '(' + g.rows.length + ')'),
              react.createElement('span', { className: 'sm-group-actions', onClick: (e) => e.stopPropagation() },
                react.createElement('button', { type: 'button', className: 'sm-btn', disabled: busy, onClick: () => unarchiveGroup(g) }, t('dialog.unarchiveGroup', { what: isMonth ? t('word.month') : t('word.workspace') })),
                react.createElement('button', { type: 'button', className: 'sm-btn sm-btn-danger', disabled: busy, onClick: () => deleteGroup(g) }, t('dialog.deleteGroup', { what: isMonth ? t('word.month') : t('word.workspace') }))
              )
            ),
            collapsed.has(g.key) ? null :
              react.createElement('table', { className: 'sm-manage-table' },
                react.createElement('thead', null, header),
                react.createElement('tbody', null, g.rows.map((row) => react.createElement('tr', { key: row.id }, rowCells(row))))
              )
          )
        ))
      }
      // 分组渲染（按工作区或按月份），组内按所选时间字段与方向排序

      return react.createElement('div', { className: 'sm-overlay' },
        react.createElement('div', { className: 'sm-backdrop', onClick: onClose }),
        react.createElement('div', { className: 'sm-dialog', role: 'dialog', 'aria-label': t('dialog.title') },
          react.createElement('div', { className: 'sm-row' },
            react.createElement('h3', null, t('dialog.title')),
            react.createElement('button', { type: 'button', className: 'sm-btn', onClick: onClose }, t('dialog.close'))
          ),
          toolbar,
          body
        )
      )
    }

    // ---- 设置页：会话管理 ----
    function SessionManagerSettingsPage(props) {
      const { t } = props
      const [rows, setRows] = react.useState(null)
      const [busy, setBusy] = react.useState(false)
      const [msg, setMsg] = react.useState(null)
      const [manageOpen, setManageOpen] = react.useState(false)
      const archivedCount = props.useWorkspaces((s) => s.archivedSessionIds.length)
      const sessionsById = props.useSessions((s) => s.byId)

      const load = () => {
        setBusy(true)
        api('list')
          .then((data) => setRows(data.sessions.filter((s) => s.archived)))
          .catch((e) => setMsg({ error: true, text: t('result.error', { message: String(e?.message ?? e) }) }))
          .finally(() => setBusy(false))
      }
      react.useEffect(load, [])

      // 执行单个操作；返回结果供链式批量使用
      const run = (fn, okText, needConfirm) => {
        if (needConfirm && (typeof confirm !== 'function' || !confirm(needConfirm))) return Promise.resolve(null)
        setBusy(true); setMsg(null)
        return fn()
          .then((r) => {
            if (okText) setMsg({ error: false, text: typeof okText === 'function' ? okText(r) : okText })
            load(); refreshWorkspaces()
            return r
          })
          .catch((e) => {
            setMsg({ error: true, text: t('result.error', { message: String(e?.message ?? e) }) })
            throw e
          })
          .finally(() => setBusy(false))
      }

      const archiveAll = () => run(() => api('archive-all'), (r) => t('result.archived', { count: r.archived }), t('confirm.archiveAll'))
      const deleteAll = () => run(() => api('delete-all'), (r) => t('result.deleted', r), t('confirm.deleteAll'))
      const exportData = () => run(
        () => exportAll(),
        (r) => (r.count === 0 ? t('export.none') : t('result.exported', { count: r.count })),
        null
      )

      return react.createElement('div', { className: 'sm-section' },
        react.createElement('div', { className: 'sm-row' },
          react.createElement('span', { className: 'sm-label' }, IconBox(16), react.createElement('span', null, t('panel.archived') + ' (' + archivedCount + ')')),
          react.createElement('button', { type: 'button', className: 'sm-btn sm-btn-primary', disabled: busy, onClick: () => { load(); setManageOpen(true) } }, t('panel.manage'))
        ),
        react.createElement('div', { className: 'sm-row' },
          react.createElement('span', { className: 'sm-label' }, IconBox(16), react.createElement('span', null, t('panel.archiveAll'))),
          react.createElement('button', { type: 'button', className: 'sm-btn', disabled: busy, onClick: archiveAll }, t('panel.archiveAllAction'))
        ),
        react.createElement('div', { className: 'sm-row' },
          react.createElement('span', { className: 'sm-label' }, IconTrash(16), react.createElement('span', null, t('panel.deleteAll'))),
          react.createElement('button', { type: 'button', className: 'sm-btn sm-btn-danger', disabled: busy, onClick: deleteAll }, t('panel.deleteAllAction'))
        ),
        react.createElement('div', { className: 'sm-row' },
          react.createElement('span', { className: 'sm-label' }, IconDownload(16), react.createElement('span', null, t('panel.export'))),
          react.createElement('button', { type: 'button', className: 'sm-btn', disabled: busy, onClick: exportData }, t('panel.exportAction'))
        ),
        react.createElement('div', { className: 'sm-note' },
          react.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--sm-danger)' } }, IconAlert(14), t('panel.dangerNote'))
        ),
        msg ? react.createElement('div', { className: 'sm-result' + (msg.error ? ' error' : '') }, msg.text) : null,
        manageOpen ? react.createElement(ManageDialog, {
          t,
          rows: rows || [],
          sessionsById,
          busy,
          onAction: run,
          onClose: () => setManageOpen(false),
        }) : null
      )
    }

    // ---- 插件入口 ----
    function apply(ctx) {
      ensureCss()
      const locale = ctx.get('locale')
      const slots = ctx.get('slots')
      if (!slots) return
      ctx.effect(() => (locale ? locale.register(NS, { zh, en }) : () => {}), 'dsh-session-management: locale')
      slots.inject('settings.section', () => slots.register(
        {
          name: 'settings.section',
          id: 'dsh-session-management',
          order: 50,
          label: () => {
            const l = ctx.get('locale')
            return l ? l.bind(NS)('settings.label') : NS
          },
          locale: NS,
        },
        SessionManagerSettingsPage
      ))
    }

    exports.apply = apply
    return module.exports
  },
})
