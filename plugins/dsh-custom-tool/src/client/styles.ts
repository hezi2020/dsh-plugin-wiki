/**
 * Plugin-owned stylesheet, injected once per materialization. Every color
 * comes from the harness --dsw-alias-* token families (defined by the shell's
 * theme); geometry mirrors the settings shell rhythm (14/22 text, r12 cards,
 * capsule buttons).
 */

/** Inject the plugin stylesheet; idempotent within one page load. */
export function injectStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById('dsh-custom-tool-styles') !== null) return
  const style = document.createElement('style')
  style.id = 'dsh-custom-tool-styles'
  style.textContent = STYLES
  document.head.appendChild(style)
}

const STYLES = [
  '.dct-button { display: inline-flex; align-items: center; justify-content: center; gap: 4px; border: none; border-radius: 18px; cursor: pointer; font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-primary); background: transparent; padding: 0 14px; font-family: inherit; }' +
  '.dct-button:disabled { cursor: not-allowed; opacity: 0.4; }' +
  '.dct-button.dct-md { height: 36px; }' +
  '.dct-button.dct-sm { height: 28px; font-size: 12px; line-height: 18px; padding: 0 10px; border-radius: 14px; }' +
  '.dct-button.dct-primary { background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); }' +
  '.dct-button.dct-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }' +
  '.dct-button.dct-ghost:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }' +
  '.dct-button.dct-ghost:active:not(:disabled) { background: var(--dsw-alias-interactive-bg-active); }' +
  '.dct-button.dct-outline { border: 1px solid var(--dsw-alias-border-l2); background: transparent; }' +
  '.dct-button.dct-outline:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }' +
  '.dct-button.dct-danger { color: var(--dsw-alias-state-error-primary); }' +
  '.dct-pill { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 10px; font-size: 11px; line-height: 18px; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l2); }' +
  '.dct-pill-button { cursor: pointer; }' +
  '.dct-pill-active { color: var(--dsw-alias-label-primary-foreground); background: var(--dsw-alias-button-primary-fill); border-color: transparent; }' +
  '.dct-pill-model { color: var(--dsw-alias-brand-primary); border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 32%, transparent); background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent); }' +
  '.dct-pill-off { color: var(--dsw-alias-state-error-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 32%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent); }' +
  '.dct-input-wrap { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); }' +
  '.dct-input-wrap:focus-within { border-color: var(--dsw-alias-brand-primary); }' +
  '.dct-input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-primary); font-family: inherit; }' +
  '.dct-input::placeholder { color: var(--dsw-alias-label-dimmed); }' +
  '.dct-textarea { width: 100%; box-sizing: border-box; min-height: 64px; padding: 6px 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-size: 14px; line-height: 22px; font-family: inherit; resize: vertical; }' +
  '.dct-textarea:focus { outline: none; border-color: var(--dsw-alias-brand-primary); }' +
  '.dct-textarea::placeholder { color: var(--dsw-alias-label-dimmed); }' +
  '.dct-textarea-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; }' +
  '.dct-section { display: flex; flex-direction: column; gap: 16px; min-width: 0; }' +
  '.dct-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }' +
  '.dct-add { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: none; border-radius: 50%; background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); cursor: pointer; }' +
  '.dct-add:hover { background: var(--dsw-alias-button-primary-hover); }' +
  '.dct-add:disabled { cursor: not-allowed; opacity: 0.4; }' +
  '.dct-kicker { margin: 0 0 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--dsw-alias-label-tertiary); }' +
  '.dct-title { margin: 0; font-size: 18px; line-height: 26px; font-weight: 600; color: var(--dsw-alias-label-primary); }' +
  '.dct-subtitle { margin: 2px 0 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }' +
  '.dct-list { display: flex; flex-direction: column; gap: 8px; min-width: 0; }' +
  '.dct-card { border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; background: var(--dsw-alias-bg-layer-1); padding: 14px; }' +
  '.dct-row-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }' +
  '.dct-row-name { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 20px; font-weight: 600; color: var(--dsw-alias-label-primary); }' +
  '.dct-row-desc { margin: 6px 0 10px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }' +
  '.dct-row-actions { display: flex; gap: 4px; align-items: center; }' +
  '.dct-empty { padding: 28px 14px; text-align: center; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); border: 1px dashed var(--dsw-alias-border-l2); border-radius: 12px; }' +
  '.dct-editor { display: flex; flex-direction: column; gap: 14px; min-width: 0; border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; background: var(--dsw-alias-bg-layer-1); padding: 16px; }' +
  '.dct-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }' +
  '.dct-label { font-size: 12px; line-height: 18px; font-weight: 600; color: var(--dsw-alias-label-primary); }' +
  '.dct-scope-row { display: flex; gap: 8px; }' +
  '.dct-hint { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }' +
  '.dct-error { font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-error-primary); }' +
  '.dct-select { height: 32px; box-sizing: border-box; padding: 0 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-size: 14px; line-height: 22px; font-family: inherit; outline: none; cursor: pointer; }' +
  '.dct-select:focus { border-color: var(--dsw-alias-brand-primary); }' +
  '.dct-params { display: flex; flex-direction: column; gap: 8px; min-width: 0; }' +
  '.dct-params-empty { padding: 12px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); border: 1px dashed var(--dsw-alias-border-l2); border-radius: 8px; }' +
  '.dct-param-row { display: flex; flex-direction: column; gap: 8px; min-width: 0; padding: 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); }' +
  '.dct-param-main { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; min-width: 0; }' +
  '.dct-param-name { flex: 1 1 160px; min-width: 0; }' +
  '.dct-param-type { flex: 0 0 96px; }' +
  '.dct-param-delete { margin-left: auto; }' +
  '.dct-param-desc { flex: 1 1 100%; min-width: 0; }' +
  '.dct-param-extra { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; min-width: 0; }' +
  '.dct-param-extra-label { flex: 0 0 auto; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }' +
  '.dct-param-enum { flex: 1 1 220px; min-width: 0; }' +
  '.dct-param-items { flex: 0 0 110px; }' +
  '.dct-param-row .dct-input-wrap { width: 100%; box-sizing: border-box; }' +
  '.dct-param-row .dct-select { width: 100%; }' +
  '.dct-advanced-toggle { align-self: flex-start; padding: 2px 0; border: none; background: none; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); cursor: pointer; font-family: inherit; }' +
  '.dct-advanced-toggle:hover { color: var(--dsw-alias-label-primary); }' +
  '.dct-editor-host { display: block; width: 100%; min-height: 300px; height: 300px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; overflow: hidden; }' +
  '.dct-actions { display: flex; gap: 8px; justify-content: flex-end; }' +
  ''
].join('\n')
