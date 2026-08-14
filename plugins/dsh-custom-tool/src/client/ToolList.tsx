import type { ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { CustomTool } from '../types.ts'
import { LOCALE_NS } from './locales.ts'
import { Button, Pill } from './primitives.tsx'

export interface ToolListProps {
  t: TranslateNS<typeof LOCALE_NS>
  tools: readonly CustomTool[]
  onEdit: (tool: CustomTool) => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

/** The stored-tool list: one card per tool with origin badge and row actions. */
export function ToolList(props: ToolListProps): ReactNode {
  const { t } = props
  if (props.tools.length === 0) {
    return (
      <div className="dct-empty">{t('empty')}</div>
    )
  }
  return (
    <div className="dct-list">
      {props.tools.map(tool => (
        <div key={tool.id} className="dct-card">
          <div className="dct-row-head">
            <span className="dct-row-name">{tool.name}</span>
            {tool.source === 'model' ? <Pill className="dct-pill-model">{t('badge.model')}</Pill> : <Pill>{t('badge.user')}</Pill>}
            {tool.scope === 'workspace' ? <Pill className="dct-pill-model">{t('badge.workspaceExec')}</Pill> : null}
            {tool.location === 'workspace' ? <Pill>{t('badge.workspaceLocal')}</Pill> : null}
            {tool.enabled ? null : <Pill className="dct-pill-off">{t('badge.off')}</Pill>}
          </div>
          <div className="dct-row-desc">{tool.description}</div>
          <div className="dct-row-actions">
            <Button size="sm" variant="ghost" onClick={() => { props.onEdit(tool) }}>{t('edit')}</Button>
            <Button size="sm" variant="ghost" onClick={() => { props.onToggle(tool.id) }}>{tool.enabled ? t('disable') : t('enable')}</Button>
            <Button size="sm" variant="ghost" className="dct-danger" onClick={() => { props.onRemove(tool.id) }}>{t('delete')}</Button>
          </div>
        </div>
      ))}
    </div>
  )
}

