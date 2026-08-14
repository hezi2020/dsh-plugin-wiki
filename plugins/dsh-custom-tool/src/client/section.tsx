/**
 * The settings page: header, stored-tool list, and the create/edit editor.
 */
import type { ReactNode } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import { LOCALE_NS } from './locales.ts'
import { EditorPanel } from './EditorPanel.tsx'
import { ToolList } from './ToolList.tsx'
import { createCustomToolViewStore } from './store.ts'
import type { CustomToolSectionInjected } from './types.ts'

type CustomToolSectionProps = PropsRuntime<'settings.section'>
  & PropsStore<ReturnType<typeof createCustomToolViewStore>>
  & InjectFace<CustomToolSectionInjected>
  & PropsLocale<typeof LOCALE_NS>

/** The Custom Tool settings page. */
export function CustomToolSection(props: CustomToolSectionProps): ReactNode {
  const snapshot = props.useScope(value => value)
  const theme = props.useTheme(value => value)
  const state = props.useStore(value => value)
  const { t } = props
  const tools = snapshot.value?.tools ?? []
  const sorted = [...tools].sort((a, b) => a.name.localeCompare(b.name))
  const draft = state.draft

  return (
    <section className="dct-section" aria-labelledby="dsh-custom-tool-title">
      <header className="dct-header">
        <div>
          <p className="dct-kicker">{t('kicker')}</p>
          <h2 id="dsh-custom-tool-title" className="dct-title">{t('title')}</h2>
          <p className="dct-subtitle">{t('subtitle')}</p>
        </div>
        {draft === null
          ? <button type="button" className="dct-add" title={t('newTool')} aria-label={t('newTool')} onClick={props.actions.openCreate}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              </svg>
            </button>
          : null}
      </header>

      {draft === null
        ? <ToolList
            t={t}
            tools={sorted}
            onEdit={tool => { props.actions.openEdit(tool) }}
            onToggle={id => { void props.toggleEnabled(id) }}
            onRemove={id => { void props.remove(id) }}
          />
        : <EditorPanel
            t={t}
            draft={draft}
            saveStatus={state.saveStatus}
            saveError={state.saveError}
            theme={theme === 'dark' ? 'dark' : 'light'}
            onUpdate={patch => { props.actions.updateDraft(patch) }}
            onSave={() => { void props.save(draft) }}
            onCancel={props.actions.closeEditor}
          />}
    </section>
  )
}

