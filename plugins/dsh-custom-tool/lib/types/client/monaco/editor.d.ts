import type { ReactNode } from 'react';
export interface MonacoToolEditorProps {
    /** Current tool body text; external updates replace the model content. */
    value: string;
    /** The tool's parameters JSON Schema (object root), or null while invalid. */
    parametersSchema: unknown | null;
    onChange: (code: string) => void;
    theme: 'light' | 'dark';
}
/** One Monaco instance bound to one tool body. */
export declare function MonacoToolEditor(props: MonacoToolEditorProps): ReactNode;
