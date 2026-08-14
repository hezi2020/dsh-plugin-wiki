import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { checkParametersSchema } from '../shared/schema-check.ts'
import { toolNameError } from '../shared/names.ts'
import { fmt, LOCALE_NS } from './locales.ts'
import { MonacoToolEditor } from './monaco/editor.tsx'
import { ParametersEditor } from './ParametersEditor.tsx'
import { Button, Input, Pill, TextArea } from './primitives.tsx'
import type { CustomToolDraft } from './types.ts'

export interface EditorPanelProps {
  t: TranslateNS<typeof LOCALE_NS>
  draft: CustomToolDraft
  saveStatus: 'idle' | 'saving' | 'error'
  saveError: string | null
  theme: 'light' | 'dark'
  onUpdate: (patch: Partial<CustomToolDraft>) => void
  onSave: () => void
  onCancel: () => void
}

/** The create/edit form: identity fields, parameters schema, and the Monaco editor. */
export function EditorPanel(props: EditorPanelProps): ReactNode {
  const { draft, t } = props

  const nameError = useMemo(() => toolNameError(draft.name.trim()), [draft.name])
  const parameters = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(draft.parametersText)
      const check = checkParametersSchema(parsed)
      return check.ok ? { schema: parsed, error: null } : { schema: null, error: fmt(t('err.schemaInvalid'), { message: check.message, path: check.path }) }
    } catch (error) {
      return { schema: null, error: fmt(t('err.schemaParse'), { message: error instanceof Error ? error.message : String(error) }) }
    }
  }, [draft.parametersText, t])

  const [rowsValid, setRowsValid] = useState(true)

  const canSave = nameError === null && parameters.error === null && rowsValid && draft.code.trim() !== '' && props.saveStatus !== 'saving'

  return (
    <div className="dct-editor">
      <div className="dct-field">
        <span className="dct-label">{t('toolName.label')}</span>
        <span className="dct-hint">{t('toolName.hint')}</span>
        <Input value={draft.name} placeholder={t('toolName.placeholder')} onChange={event => { props.onUpdate({ name: event.target.value }) }} />
        {nameError === null ? null : <span className="dct-error">{nameError}</span>}
      </div>

      <div className="dct-field">
        <span className="dct-label">{t('scope.label')}</span>
        <span className="dct-hint">{t('scope.hint')}</span>
        <div className="dct-scope-row">
          <Pill active={draft.scope === 'global'} onClick={() => { props.onUpdate({ scope: 'global' }) }}>{t('scope.global')}</Pill>
          <Pill active={draft.scope === 'workspace'} onClick={() => { props.onUpdate({ scope: 'workspace' }) }}>{t('scope.workspace')}</Pill>
        </div>
      </div>

      <div className="dct-field">
        <span className="dct-label">{t('location.label')}</span>
        <span className="dct-hint">{t('location.hint')}</span>
        <div className="dct-scope-row">
          <Pill active={draft.location === 'global'} onClick={() => { props.onUpdate({ location: 'global' }) }}>{t('location.global')}</Pill>
          <Pill active={draft.location === 'workspace'} onClick={() => { props.onUpdate({ location: 'workspace' }) }}>{t('location.workspace')}</Pill>
        </div>
      </div>

      <div className="dct-field">
        <span className="dct-label">{t('description.label')}</span>
        <span className="dct-hint">{t('description.hint')}</span>
        <TextArea value={draft.description} onChange={description => { props.onUpdate({ description }) }} />
      </div>

      <div className="dct-field">
        <span className="dct-label">{t('params.label')}</span>
        <span className="dct-hint">{t('params.hint')}</span>
        {parameters.schema === null
          ? <TextArea monospace rows={8} value={draft.parametersText} onChange={parametersText => { props.onUpdate({ parametersText }) }} />
          : <ParametersEditor t={t} parameters={parameters.schema} parametersText={draft.parametersText} onUpdate={parametersText => { props.onUpdate({ parametersText }) }} onRowsValid={setRowsValid} />}
        {parameters.error === null ? null : <span className="dct-error">{parameters.error}</span>}
      </div>

      <div className="dct-field">
        <span className="dct-label">{t('code.label')}</span>
        <span className="dct-hint">{t('code.hint')}</span>
        <MonacoToolEditor
          value={draft.code}
          parametersSchema={parameters.schema}
          onChange={code => { props.onUpdate({ code }) }}
          theme={props.theme}
        />
      </div>

      {props.saveError === null ? null : <div className="dct-error">{props.saveError}</div>}
      <div className="dct-actions">
        <Button variant="outline" onClick={props.onCancel}>{t('cancel')}</Button>
        <Button variant="primary" disabled={!canSave} onClick={props.onSave}>{props.saveStatus === 'saving' ? t('saving') : t('save')}</Button>
      </div>
    </div>
  )
}

