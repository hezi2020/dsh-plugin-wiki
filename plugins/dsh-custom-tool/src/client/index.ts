/**
 * dsh-custom-tool browser half: the 自定义工具 settings section with the Monaco
 * editor, bound to the durable `custom-tools` settings namespace through the
 * harness settings scope.
 */
import type { ClientContext, SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls ctx.locale (the locale registry service) into this program.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the 'theme/change' event key into this program's Events face.
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { CustomTool, CustomToolsSettings } from '../types.ts'
import { en, fmt, LOCALE_NS, zh } from './locales.ts'
import { CustomToolSection } from './section.tsx'
import { createCustomToolViewStore } from './store.ts'
import { injectStyles } from './styles.ts'
import type { CustomToolDraft, CustomToolSectionInjected, ObservableSource } from './types.ts'
import { validateDraft } from './validate.ts'

export const inject = ['settingsScope', 'slots', 'locale']

/** The Monaco theme follows the harness theme service, with the system preference as the 'system' resolver. */
function createThemeSource(ctx: ClientContext): ObservableSource<string> {
  const theme = ctx.get('theme') as undefined | { getTheme(): { preference: string } }
  const media = typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: dark)')
  const listeners = new Set<() => void>()
  const notify = (): void => {
    for (const listener of listeners) listener()
  }
  const compute = (): string => {
    const preference = theme?.getTheme().preference ?? 'system'
    if (preference === 'dark') return 'dark'
    if (preference === 'light') return 'light'
    return media?.matches === true ? 'dark' : 'light'
  }
  media?.addEventListener('change', notify)
  ctx.on('theme/change', notify)
  return {
    getSnapshot: compute,
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

/** Build and persist one tool record through the settings scope. */
export async function saveTool(scope: SettingsScope<CustomToolsSettings>, t: TranslateNS<typeof LOCALE_NS>, draft: CustomToolDraft): Promise<void> {
  const validation = validateDraft(t, draft)
  if (validation.error !== null) throw new Error(validation.error)
  const tools = scope.getSnapshot().value?.tools ?? []
  const existing = draft.id === null ? undefined : tools.find(tool => tool.id === draft.id)
  if (existing === undefined && tools.some(tool => tool.name === draft.name.trim())) {
    throw new Error(fmt(t('err.dupName'), { name: draft.name.trim() }))
  }
  const record: CustomTool = {
    id: draft.id ?? crypto.randomUUID(),
    name: draft.name.trim(),
    description: draft.description.trim(),
    parameters: validation.parameters,
    code: draft.code,
    scope: draft.scope,
    location: draft.location,
    enabled: existing?.enabled ?? true,
    source: existing?.source ?? 'user',
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const next = existing === undefined
    ? [...tools, record]
    : tools.map(tool => tool.id === record.id ? record : tool)
  await scope.set('tools', next)
}

/**
 * Mount the settings section.
 * @param ctx - the client root context.
 */
export function apply(ctx: ClientContext): void {
  injectStyles()
  ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }), 'dsh-custom-tool: dictionaries')
  const t = ctx.locale.bind(LOCALE_NS)
  const scope = ctx.settingsScope.bind<CustomToolsSettings>({ namespace: 'custom-tools' })
  const themeSource = createThemeSource(ctx)
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'custom-tools',
    order: 50,
    label: () => t('nav'),
    locale: LOCALE_NS,
    store: createCustomToolViewStore,
    inject: actions => {
      const injected: CustomToolSectionInjected = {
        hooks: { scope, theme: themeSource },
        save: async (draft) => {
          actions.setSaveStatus('saving')
          try {
            await saveTool(scope, t, draft)
            actions.setSaveStatus('idle')
            actions.closeEditor()
          } catch (error) {
            actions.setSaveStatus('error', fmt(t('err.saveFailed'), { message: error instanceof Error ? error.message : String(error) }))
          }
        },
        toggleEnabled: async (id) => {
          const tools = scope.getSnapshot().value?.tools ?? []
          await scope.set('tools', tools.map(tool => tool.id === id ? { ...tool, enabled: !tool.enabled } : tool))
        },
        remove: async (id) => {
          const tools = scope.getSnapshot().value?.tools ?? []
          await scope.set('tools', tools.filter(tool => tool.id !== id))
        },
      }
      return injected
    },
  }, CustomToolSection))
}
