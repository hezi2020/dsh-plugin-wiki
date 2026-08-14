/**
 * Monaco TypeScript language-service worker entry (JavaScript + TypeScript
 * intellisense), bundled to IIFE by scripts/build-workers.mjs and inlined into
 * the client bundle as a blob-worker source (single-file plugin rule). The
 * worker module installs its own message handler on import; this entry only
 * pulls it into a standalone bundle.
 */
import 'monaco-editor/esm/vs/language/typescript/ts.worker.js';
