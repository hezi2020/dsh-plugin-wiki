import type { ReactNode } from 'react';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import { LOCALE_NS } from './locales.ts';
export interface ParametersEditorProps {
    t: TranslateNS<typeof LOCALE_NS>;
    /** The parsed, subset-valid parameters schema; the GUI falls back to raw editing when null. */
    parameters: unknown | null;
    /** The raw JSON text, bound for the advanced mode. */
    parametersText: string;
    onUpdate: (parametersText: string) => void;
    /** Reports whether the current rows pass row-level validation (blocks save). */
    onRowsValid?: (valid: boolean) => void;
}
/**
 * One row per parameter: name, type, required, description, enum (string) or
 * item type (array). Rows live in local state so an UNNAMED row (which cannot
 * be represented in the schema) survives until the user names it; external
 * text edits (advanced mode) re-adopt the model when the serialized text
 * differs from the local rows.
 */
export declare function ParametersEditor(props: ParametersEditorProps): ReactNode;
