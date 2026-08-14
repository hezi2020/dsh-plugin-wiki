/**
 * Client half of the plugin marketplace: mounts the Host's `pluginMarket`
 * Remote contribution and registers a sidebar foot action (beside Settings)
 * that opens the marketplace panel.
 * @module dsh-plugin-market-client/client
 */

import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: merges the `pluginMarket` namespace into TypertRemoteNamespaceMap.
import type {} from 'dsh-plugin-market-host/remote'
import pluginMarketRemote from 'dsh-plugin-market-host/remote'
import type {
  InstallResult,
  MarketEntryDetail,
  MarketSearchResult,
  UninstallResult,
} from 'dsh-plugin-market-host/types'
import { MarketplacePanel, type MarketplacePanelInjected } from './MarketplacePanel.tsx'
import { en, zh, type MarketLocaleKey } from './locales.ts'

export type { MarketplacePanelInjected } from './MarketplacePanel.tsx'
export type { MarketLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Marketplace panel copy. */
    market: MarketLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'market'

/** Services required by the panel and the generated Remote face. */
export const inject = ['slots', 'locale', 'remote']

/**
 * Mount the Host marketplace Remote and contribute the sidebar foot action.
 * @param ctx - Client Cordis root.
 * @returns disposer that unmounts the Remote and the slot registration.
 */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'market: dictionaries')

  const disposeRemote = await ctx.remote.$mount(pluginMarketRemote)

  const search: MarketplacePanelInjected['search'] = async (query) => {
    const result = await ctx.remote.pluginMarket.search(query)
    if (!result.ok) throw new Error(`pluginMarket.search failed: ${result.error.code}: ${result.error.message}`)
    return result.value
  }
  const info: MarketplacePanelInjected['info'] = async (repo) => {
    const result = await ctx.remote.pluginMarket.info(repo)
    if (!result.ok) throw new Error(`pluginMarket.info failed: ${result.error.code}: ${result.error.message}`)
    return result.value
  }
  const install: MarketplacePanelInjected['install'] = async (repo) => {
    const result = await ctx.remote.pluginMarket.install(repo)
    if (!result.ok) throw new Error(`pluginMarket.install failed: ${result.error.code}: ${result.error.message}`)
    return result.value
  }
  const uninstall: MarketplacePanelInjected['uninstall'] = async (packageName) => {
    const result = await ctx.remote.pluginMarket.uninstall(packageName)
    if (!result.ok) throw new Error(`pluginMarket.uninstall failed: ${result.error.code}: ${result.error.message}`)
    return result.value
  }

  const inject = (): MarketplacePanelInjected => ({ search, info, install, uninstall })
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'market',
    order: 100,
    label: () => 'Plugin Marketplace',
    locale: NS,
    inject,
  }, MarketplacePanel))

  return async () => {
    await disposeRemote()
  }
}

export type {
  InstallResult,
  MarketEntryDetail,
  MarketSearchResult,
  UninstallResult,
} from 'dsh-plugin-market-host/types'
