import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { fmt, LOCALE_NS } from './locales.ts'
import { Button, Input, Pill, Select } from './primitives.tsx'
import {
  ARRAY_ITEM_TYPES, modelFromParameters, newParameterRow, PARAMETER_TYPES, parametersFromModel, validateRows,
  type ParameterRow,
} from './parameters-model.ts'

export interface ParametersEditorProps {
  t: TranslateNS<typeof LOCALE_NS>
  /** The parsed, subset-valid parameters schema; the GUI falls back to raw editing when null. */
  parameters: unknown | null
  /** The raw JSON text, bound for the advanced mode. */
  parametersText: string
  onUpdate: (parametersText: string) => void
  /** Reports whether the current rows pass row-level validation (blocks save). */
  onRowsValid?: (valid: boolean) => void
}

/**
 * One row per parameter: name, type, required, description, enum (string) or
 * item type (array). Rows live in local state so an UNNAMED row (which cannot
 * be represented in the schema) survives until the user names it; external
 * text edits (advanced mode) re-adopt the model when the serialized text
 * differs from the local rows.
 */
export function ParametersEditor(props: ParametersEditorProps): ReactNode {
  const { t } = props
  const model = useMemo(() => modelFromParameters(props.parameters), [props.parameters])
  const [advanced, setAdvanced] = useState(false)
  const [rows, setRows] = useState<ParameterRow[]>(() => model.rows)
  const extrasCount = Object.keys(model.extras).length
  const rowError = useMemo(() => validateRows(t as (key: string) => string, rows), [rows, t])

  // Adopt externally edited text (advanced mode); keep locally edited rows.
  useEffect(() => {
    setRows(previous => {
      const selfText = JSON.stringify(parametersFromModel({ rows: previous, extras: model.extras, extrasRequired: model.extrasRequired, requiredOrder: model.requiredOrder }), null, 2)
      return selfText === props.parametersText ? previous : model.rows
    })
  }, [props.parametersText, model])

  useEffect(() => {
    props.onRowsValid?.(rowError === null)
  }, [rowError, props.onRowsValid])

  const update = (nextRows: ParameterRow[]): void => {
    setRows(nextRows)
    const schema = parametersFromModel({ rows: nextRows, extras: model.extras, extrasRequired: model.extrasRequired, requiredOrder: model.requiredOrder })
    props.onUpdate(JSON.stringify(schema, null, 2))
  }
  const patchRow = (index: number, patch: Partial<ParameterRow>): void => {
    update(rows.map((row, i) => i === index ? { ...row, ...patch } : row))
  }

  return (
    <div className="dct-params">
      {rows.length === 0 && extrasCount === 0
        ? <div className="dct-params-empty">{t('params.empty')}</div>
        : null}
      {rows.map((row, index) => (
        <div key={index} className="dct-param-row">
          <div className="dct-param-main">
            <Input className="dct-param-name" value={row.name} placeholder={t('param.name.placeholder')} onChange={event => { patchRow(index, { name: event.target.value }) }} />
            <Select className="dct-param-type" value={row.type} options={PARAMETER_TYPES.map(type => ({ value: type, label: type }))} onChange={value => { patchRow(index, { type: value as ParameterRow['type'] }) }} />
            <Pill active={row.required} onClick={() => { patchRow(index, { required: !row.required }) }}>{t('param.required')}</Pill>
            <Button size="sm" variant="ghost" className="dct-danger dct-param-delete" onClick={() => { update(rows.filter((_row, i) => i !== index)) }}>{t('delete')}</Button>
          </div>
          <Input className="dct-param-desc" value={row.description} placeholder={t('param.desc.placeholder')} onChange={event => { patchRow(index, { description: event.target.value }) }} />
          {row.type === 'string' || row.type === 'array'
            ? <div className="dct-param-extra">
                {row.type === 'string'
                  ? <>
                      <span className="dct-param-extra-label">{t('param.enum.label')}</span>
                      <Input className="dct-param-enum" value={row.enumText} placeholder={t('param.enum.placeholder')} onChange={event => { patchRow(index, { enumText: event.target.value }) }} />
                    </>
                  : <>
                      <span className="dct-param-extra-label">{t('param.items.label')}</span>
                      <Select className="dct-param-items" value={row.itemsType} options={ARRAY_ITEM_TYPES.map(type => ({ value: type, label: type }))} onChange={value => { patchRow(index, { itemsType: value as ParameterRow['itemsType'] }) }} />
                    </>}
              </div>
            : null}
        </div>
      ))}
      {rowError === null ? null : <span className="dct-error">{rowError}</span>}
      {extrasCount > 0
        ? <span className="dct-hint">{fmt(t('params.extras'), { count: extrasCount })}</span>
        : null}
      <Button size="sm" variant="outline" onClick={() => { update([...rows, newParameterRow()]) }}>{t('addParam')}</Button>
      <button type="button" className="dct-advanced-toggle" onClick={() => { setAdvanced(!advanced) }}>
        {advanced ? t('advanced.close') : t('advanced.open')}
      </button>
      {advanced
        ? <textarea
            className="dct-textarea dct-textarea-mono"
            rows={8}
            value={props.parametersText}
            onChange={event => { props.onUpdate(event.target.value) }}
          />
        : null}
    </div>
  )
}

