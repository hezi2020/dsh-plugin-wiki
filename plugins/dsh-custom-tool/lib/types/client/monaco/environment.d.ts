/**
 * Monaco worker bootstrap. The plugin ships one single client bundle, so the
 * editor and TypeScript workers cannot be separate files: they are bundled to
 * IIFE, inlined as strings at build time (see scripts/build-workers.mjs and
 * scripts/gen-worker-sources.mjs), and materialized here as blob-URL classic
 * workers — supported everywhere the GUI runs, with no extra requests.
 * @module dsh-custom-tool/client/monaco/environment
 */
/**
 * Install the Monaco worker factory before the first editor is created. The
 * blob worker is created on demand per label; Monaco asks once per label.
 */
export declare function installMonacoEnvironment(): void;
