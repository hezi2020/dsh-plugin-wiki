/**
 * dsh-wiki-entry — browser half.
 *
 * Registers the Wiki 入口 into the session-header utilities slot (top-right)
 * and a "Wiki 入口" card into 设置 → 插件 → 可配置. Both read the persistent
 * enable switch through the same-origin webServer routes `/wiki-api/status`
 * and `/wiki-api/set-enabled`; the host stores the switch in the `wiki-entry`
 * settings namespace (settings.yaml), so it survives restarts and page
 * refreshes, and the header entry disappears while disabled.
 *
 * The card deliberately does NOT use the client settings scope: the host
 * API-proxy exposure allowlist gates which namespaces configuration clients
 * may read or write, and plugin-owned namespaces are not on it. The host
 * routes bypass that gate.
 */

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the SlotMap merges.
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'

/** The wiki server URL (same value the host configures). */
const WIKI_URL = 'http://127.0.0.1:8099/wiki/'

/** Browser event the card dispatches after a toggle; the header re-reads on it. */
const WIKI_CHANGED_EVENT = 'dsh-wiki-entry-changed'

/** Shared status payload from the host `/wiki-api/status` route. */
interface WikiStatus {
  enabled: boolean
  running: boolean
  url: string
}

/** Read the current status; resolves undefined on any transport failure. */
async function readStatus(): Promise<WikiStatus | undefined> {
  try {
    const response = await fetch('/wiki-api/status')
    if (!response.ok) return undefined
    const data: unknown = await response.json()
    if (typeof data !== 'object' || data === null) return undefined
    const status = data as Partial<WikiStatus>
    if (typeof status.enabled !== 'boolean' || typeof status.running !== 'boolean') return undefined
    return { enabled: status.enabled, running: status.running, url: typeof status.url === 'string' ? status.url : WIKI_URL }
  } catch {
    return undefined
  }
}

/** Shared pill styling, driven by the theme's semantic tokens. */
const entryStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 32,
  padding: '6px 12px',
  gap: 4,
  border: '1px solid var(--dsw-alias-border-l2)',
  borderRadius: 18,
  color: 'var(--dsw-alias-label-primary)',
  background: 'transparent',
  fontFamily: 'var(--dsw-font-family)',
  fontSize: 13,
  fontWeight: 400,
  lineHeight: '20px',
  cursor: 'pointer',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}

/** Book glyph for the entry (inline SVG, no icon dependency). */
function BookIcon(): ReactNode {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

/**
 * The top-right Wiki entry. Renders nothing while the plugin is disabled;
 * clicking ensures the wiki server is up (host side) and opens it in a new
 * tab — a plain anchor navigation once the server is known to be running.
 */
function WikiEntry(): ReactNode {
  const [status, setStatus] = useState<WikiStatus | undefined>(undefined)
  const [phase, setPhase] = useState<'idle' | 'starting' | 'error'>('idle')

  const refresh = (): void => {
    void readStatus().then(next => { if (next !== undefined) setStatus(next) })
  }
  useEffect(() => {
    refresh()
    const onChanged = (): void => { refresh() }
    window.addEventListener(WIKI_CHANGED_EVENT, onChanged)
    return () => { window.removeEventListener(WIKI_CHANGED_EVENT, onChanged) }
  }, [])

  const enabled = status?.enabled !== false
  const running = status?.running === true
  if (!enabled) return null

  const onClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
    if (phase === 'starting') {
      event.preventDefault()
      return
    }
    if (running) return // native anchor navigation opens the tab
    event.preventDefault()
    setPhase('starting')
    fetch('/wiki-api/open', { method: 'POST' }).then((response) => {
      if (!response.ok) {
        setPhase('error')
        return null
      }
      return response.json().then((data: unknown) => {
        setPhase('idle')
        setStatus(previous => previous === undefined ? previous : { ...previous, running: true })
        if (typeof data === 'object' && data !== null
          && typeof (data as { url?: unknown }).url === 'string') {
          try {
            window.open((data as { url: string }).url, '_blank', 'noopener')
          } catch {
            // Popup blocked: the anchor is natively navigable on the next click.
          }
        }
      })
    }).catch(() => setPhase('error'))
  }

  const label = phase === 'starting' ? '启动中…' : 'Wiki'
  const title = phase === 'starting'
    ? '正在启动 Wiki…'
    : phase === 'error'
      ? 'Wiki 启动失败，点击重试'
      : '打开 Wiki（未运行将自动启动）'
  return (
    <a
      href={WIKI_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={entryStyle}
      title={title}
      aria-label="打开 Wiki"
      data-busy={phase === 'starting' ? 'true' : undefined}
      onClick={onClick}
    >
      <BookIcon />
      <span>{label}</span>
    </a>
  )
}

/** Card row chrome shared with the card body. */
const cardRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '10px 14px',
  border: '1px solid var(--dsw-alias-border-l1)',
  borderRadius: 10,
  background: 'var(--dsw-alias-bg-layer-1)',
}

/**
 * The 设置 → 插件 → 可配置 card: a persistent enable switch for the Wiki 入口.
 * The write goes to the host `/wiki-api/set-enabled` route, which stores the
 * value in the `wiki-entry` settings namespace (settings.yaml) — the plugin
 * stays off across restarts and page refreshes until switched back on.
 */
function WikiEntryCard(): ReactNode {
  const [status, setStatus] = useState<WikiStatus | undefined>(undefined)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    void readStatus().then(next => { if (alive && next !== undefined) setStatus(next) })
    return () => { alive = false }
  }, [])

  if (status === undefined) return null
  const enabled = status.enabled

  const toggle = (next: boolean): void => {
    if (saving) return
    setSaving(true)
    fetch('/wiki-api/set-enabled', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: next }),
    }).then((response) => {
      if (!response.ok) return null
      return response.json().then((data: unknown) => {
        if (typeof data === 'object' && data !== null && typeof (data as { ok?: unknown }).ok === 'boolean') {
          const ok = (data as { ok: boolean }).ok
          if (ok) {
            setStatus(previous => previous === undefined ? previous : { ...previous, enabled: next })
            window.dispatchEvent(new Event(WIKI_CHANGED_EVENT))
          }
        }
      })
    }).finally(() => setSaving(false))
  }

  return (
    <li style={cardRowStyle}>
      <div>
        <strong style={{ color: 'var(--dsw-alias-label-primary)', fontSize: 13 }}>Wiki 入口</strong>
        <p style={{ color: 'var(--dsw-alias-label-secondary)', fontSize: 12, margin: '2px 0 0' }}>
          右上角 Wiki 入口：未运行时点击自动启动本地 Wiki 服务器并打开
        </p>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--dsw-alias-label-primary)', fontSize: 13 }}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={saving}
          onChange={(event) => { toggle(event.target.checked) }}
        />
        启用
      </label>
    </li>
  )
}

/** Required services: only slots — the enable switch travels through host routes. */
export const inject = ['slots']

/**
 * Mount the Wiki entry and its settings card.
 * @param ctx - browser context carrying the slot registry.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities',
    id: 'wiki-entry',
    order: 100,
    label: 'Wiki',
  }, WikiEntry))

  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    id: 'wiki-entry',
    order: 30,
  }, WikiEntryCard))
}
