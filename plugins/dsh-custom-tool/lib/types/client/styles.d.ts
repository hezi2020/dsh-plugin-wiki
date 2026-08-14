/**
 * Plugin-owned stylesheet, injected once per materialization. Every color
 * comes from the harness --dsw-alias-* token families (defined by the shell's
 * theme); geometry mirrors the settings shell rhythm (14/22 text, r12 cards,
 * capsule buttons).
 */
/** Inject the plugin stylesheet; idempotent within one page load. */
export declare function injectStyles(): void;
