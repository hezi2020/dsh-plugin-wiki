/**
 * Local token-styled atoms mirroring the harness ui-primitives visual
 * language (same geometry and --dsw-alias-* token families), kept in-package
 * because the web profile does not compose ui-primitives as a runtime row.
 */
import type { InputHTMLAttributes, ReactNode } from 'react'
import { clsx } from './clsx.ts'

export type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'toolbar'

/** Capsule button: same geometry as the harness Button atom (h36/h28, r18/r14). */
export function Button(props: {
  variant?: ButtonVariant
  size?: 'md' | 'sm'
  className?: string | undefined
  children?: ReactNode
  onClick?: () => void
  disabled?: boolean
  title?: string
}): ReactNode {
  const variant = props.variant ?? 'ghost'
  const size = props.size ?? 'md'
  return (
    <button
      type="button"
      className={clsx('dct-button', 'dct-' + variant, 'dct-' + size, props.className)}
      onClick={props.onClick}
      disabled={props.disabled === true}
      title={props.title}
    >
      {props.children}
    </button>
  )
}

/** Small rounded label chip; non-interactive by default, button when onClick is set. */
export function Pill(props: { active?: boolean; className?: string; children?: ReactNode; onClick?: () => void }): ReactNode {
  if (props.onClick === undefined) {
    return <span className={clsx('dct-pill', props.active === true && 'dct-pill-active', props.className)}>{props.children}</span>
  }
  return (
    <button type="button" className={clsx('dct-pill', 'dct-pill-button', props.active === true && 'dct-pill-active', props.className)} onClick={props.onClick}>
      {props.children}
    </button>
  )
}

/** Single-line input atom: same tokens as the harness Input (32px, l2 border, layer-1 fill). */
export function Input(props: { className?: string } & InputHTMLAttributes<HTMLInputElement>): ReactNode {
  const { className, ...rest } = props
  return (
    <span className={clsx('dct-input-wrap', className)}>
      <input className="dct-input" {...rest} />
    </span>
  )
}

/** Native select styled with the Input token family. */
export function Select(props: { value: string; options: ReadonlyArray<{ value: string; label: string }>; onChange: (value: string) => void; className?: string }): ReactNode {
  return (
    <select
      className={clsx('dct-select', props.className)}
      value={props.value}
      onChange={event => { props.onChange(event.target.value) }}
    >
      {props.options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  )
}

/** Multi-line field styled with the same token family as the Input atom. */
export function TextArea(props: { value: string; onChange: (value: string) => void; rows?: number; placeholder?: string; monospace?: boolean }): ReactNode {
  return (
    <textarea
      className={clsx('dct-textarea', props.monospace === true && 'dct-textarea-mono')}
      rows={props.rows ?? 3}
      value={props.value}
      placeholder={props.placeholder}
      onChange={event => { props.onChange(event.target.value) }}
    />
  )
}

