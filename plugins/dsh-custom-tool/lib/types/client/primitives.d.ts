/**
 * Local token-styled atoms mirroring the harness ui-primitives visual
 * language (same geometry and --dsw-alias-* token families), kept in-package
 * because the web profile does not compose ui-primitives as a runtime row.
 */
import type { InputHTMLAttributes, ReactNode } from 'react';
export type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'toolbar';
/** Capsule button: same geometry as the harness Button atom (h36/h28, r18/r14). */
export declare function Button(props: {
    variant?: ButtonVariant;
    size?: 'md' | 'sm';
    className?: string | undefined;
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
}): ReactNode;
/** Small rounded label chip; non-interactive by default, button when onClick is set. */
export declare function Pill(props: {
    active?: boolean;
    className?: string;
    children?: ReactNode;
    onClick?: () => void;
}): ReactNode;
/** Single-line input atom: same tokens as the harness Input (32px, l2 border, layer-1 fill). */
export declare function Input(props: {
    className?: string;
} & InputHTMLAttributes<HTMLInputElement>): ReactNode;
/** Native select styled with the Input token family. */
export declare function Select(props: {
    value: string;
    options: ReadonlyArray<{
        value: string;
        label: string;
    }>;
    onChange: (value: string) => void;
    className?: string;
}): ReactNode;
/** Multi-line field styled with the same token family as the Input atom. */
export declare function TextArea(props: {
    value: string;
    onChange: (value: string) => void;
    rows?: number;
    placeholder?: string;
    monospace?: boolean;
}): ReactNode;
