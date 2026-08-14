/**
 * Marketplace sidebar foot action: a trigger beside Settings that opens a
 * searchable panel over the Host `pluginMarket` Remote. The panel is a pure
 * view of the injected functions; every mutation is confirmed before landing.
 * @module dsh-plugin-market-client/client/MarketplacePanel
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type {
  InstallResult,
  MarketEntry,
  MarketEntryDetail,
  MarketSearchResult,
  UninstallResult,
} from 'dsh-plugin-market-host/types'
import type { MarketLocaleKey } from './locales.ts'

/** Registration-side Remote face used by the panel. */
export interface MarketplacePanelInjected {
  /** Search the dsh-plugin topic. */
  search: (query: string) => Promise<MarketSearchResult>
  /** Read full detail for one repository. */
  info: (repo: string) => Promise<MarketEntryDetail>
  /** Install one repository into the target profile. */
  install: (repo: string) => Promise<InstallResult>
  /** Remove one package from the target profile. */
  uninstall: (packageName: string) => Promise<UninstallResult>
}

/** Full component props assembled by the sidebar foot-action renderer. */
export type MarketplacePanelProps =
  { readonly wide: boolean }
  & PropsLocale<'market'>
  & InjectFace<MarketplacePanelInjected>

type ViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly entries: readonly MarketEntry[] }

const BUTTON_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  borderRadius: 6,
  fontSize: 13,
}

const PANEL_STYLE: React.CSSProperties = {
  position: 'fixed',
  right: 16,
  bottom: 56,
  width: 360,
  maxHeight: '70vh',
  overflow: 'auto',
  background: 'var(--surface, #fff)',
  border: '1px solid var(--border, #ddd)',
  borderRadius: 10,
  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  padding: 12,
  zIndex: 1000,
}

/** Render the marketplace foot action and its panel. */
export function MarketplacePanel({ wide, t, search, install, uninstall }: MarketplacePanelProps): ReactNode {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [state, setState] = useState<ViewState>({ status: 'loading' })
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let current = true
    setState({ status: 'loading' })
    void search(query).then(
      (result) => { if (current) setState({ status: 'ready', entries: result.entries }) },
      () => { if (current) setState({ status: 'error' }) },
    )
    return () => { current = false }
  }, [open, query, search])

  const filtered = useMemo(
    () => state.status === 'ready' ? state.entries : [],
    [state],
  )

  const onInstall = async (repo: string): Promise<void> => {
    if (!window.confirm(t('confirmInstall'))) return
    setNotice(null)
    try {
      await install(repo)
      setNotice(t('restart'))
    } catch (error) {
      setNotice((error as Error).message)
    }
  }

  const onUninstall = async (packageName: string): Promise<void> => {
    if (!window.confirm(t('confirmUninstall'))) return
    setNotice(null)
    try {
      await uninstall(packageName)
      setNotice(t('restart'))
    } catch (error) {
      setNotice((error as Error).message)
    }
  }

  return (
    <div>
      <button type="button" style={BUTTON_STYLE} onClick={() => { setOpen(value => !value) }} aria-expanded={open}>
        <span aria-hidden="true">🧩</span>
        {wide ? <span>{t('title')}</span> : null}
      </button>
      {open ? (
        <div style={PANEL_STYLE} role="dialog" aria-label={t('title')}>
          <input
            type="search"
            value={query}
            placeholder={t('search')}
            aria-label={t('search')}
            onChange={(event) => { setQuery(event.currentTarget.value) }}
            style={{ width: '100%', padding: 8, marginBottom: 10, boxSizing: 'border-box' }}
          />
          {notice !== null ? <p role="status">{notice}</p> : null}
          {state.status === 'loading' ? <p>{t('loading')}</p> : null}
          {state.status === 'error' ? <p role="alert">{t('error')}</p> : null}
          {state.status === 'ready' && filtered.length === 0 ? <p>{t('empty')}</p> : null}
          {state.status === 'ready' && filtered.length > 0 ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {filtered.map((entry) => (
                <li key={entry.repo} style={{ padding: '10px 0', borderTop: '1px solid var(--border, #eee)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{entry.displayName}</strong>
                    <span>{entry.installable ? `${t('stars')} ${entry.stars}` : t('notInstallable')}</span>
                  </div>
                  <p style={{ margin: '4px 0', fontSize: 12, color: 'var(--muted, #666)' }}>{entry.description}</p>
                  <div style={{ fontSize: 12, color: 'var(--muted, #888)' }}>
                    {entry.license !== null ? `${t('license')}: ${entry.license} · ` : ''}{entry.repo}
                  </div>
                  {entry.installable ? (
                    entry.installed ? (
                      <button type="button" onClick={() => { void onUninstall(entry.displayName) }}>
                        {t('uninstall')}
                      </button>
                    ) : (
                      <button type="button" onClick={() => { void onInstall(entry.repo) }}>
                        {t('install')}
                      </button>
                    )
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
