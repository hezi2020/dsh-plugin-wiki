/**
 * Bundled entry for the Monaco core editor worker. The worker module
 * self-bootstraps its message handler on import; this file only pulls it into
 * a standalone IIFE bundle.
 */
import 'monaco-editor/esm/vs/editor/editor.worker.js';
