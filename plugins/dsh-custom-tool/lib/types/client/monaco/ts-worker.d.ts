/**
 * Bundled entry for the Monaco TypeScript worker (JavaScript + TypeScript
 * language service — the intellisense provider). The worker module
 * self-bootstraps its message handler on import; this file only pulls it into
 * a standalone IIFE bundle.
 */
import 'monaco-editor/esm/vs/language/typescript/ts.worker.js';
