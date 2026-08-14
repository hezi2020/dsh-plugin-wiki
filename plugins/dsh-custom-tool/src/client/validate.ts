/**
 * Client-side draft validation mirroring the host's write-time gate, so the
 * form reports the same rejections the settings validator produces. Pure and
 * unit-tested; the host re-checks everything on the durable write.
 * @module dsh-custom-tool/client/validate
 */

import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { checkParametersSchema } from '../shared/schema-check.ts'
import { toolNameError } from '../shared/names.ts'
import { fmt, LOCALE_NS } from './locales.ts'
import type { CustomToolDraft, DraftValidation } from './types.ts'

/**
 * Validate one draft before it persists, reporting in the active locale.
 * @param t - the locale translator.
 * @param draft - the form draft.
 * @returns the first user-facing error (with no parameters), or the parsed
 * parameter schema when the draft is acceptable.
 */
export function validateDraft(t: TranslateNS<typeof LOCALE_NS>, draft: CustomToolDraft): DraftValidation {
  const nameError = toolNameError(draft.name.trim())
  if (nameError !== null) return { error: nameError, parameters: null }
  if (draft.description.trim() === '') return { error: t('err.descEmpty'), parameters: null }
  let parameters: unknown
  try {
    parameters = JSON.parse(draft.parametersText)
  } catch (error) {
    return { error: fmt(t('err.schemaParse'), { message: error instanceof Error ? error.message : String(error) }), parameters: null }
  }
  const check = checkParametersSchema(parameters)
  if (!check.ok) return { error: fmt(t('err.schemaInvalid'), { message: check.message, path: check.path }), parameters: null }
  try {
    // Syntax-only check; the real execution happens in the host sandbox.
    new Function(`"use strict"; return (async (args, env) => {\n${draft.code}\n})`)
  } catch (error) {
    return { error: fmt(t('err.codeSyntax'), { message: error instanceof Error ? error.message : String(error) }), parameters: null }
  }
  return { error: null, parameters }
}
