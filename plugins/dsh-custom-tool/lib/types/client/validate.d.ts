/**
 * Client-side draft validation mirroring the host's write-time gate, so the
 * form reports the same rejections the settings validator produces. Pure and
 * unit-tested; the host re-checks everything on the durable write.
 * @module dsh-custom-tool/client/validate
 */
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import { LOCALE_NS } from './locales.ts';
import type { CustomToolDraft, DraftValidation } from './types.ts';
/**
 * Validate one draft before it persists, reporting in the active locale.
 * @param t - the locale translator.
 * @param draft - the form draft.
 * @returns the first user-facing error (with no parameters), or the parsed
 * parameter schema when the draft is acceptable.
 */
export declare function validateDraft(t: TranslateNS<typeof LOCALE_NS>, draft: CustomToolDraft): DraftValidation;
