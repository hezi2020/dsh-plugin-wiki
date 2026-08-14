/**
 * dsh-wiki-entry — permanent Wiki 入口 for the DSH Web UI.
 *
 * Host half: registers the `wiki-entry` settings namespace (the persistent
 * on/off switch, default enabled), webServer routes that probe and start the
 * local wiki static server (`<wikiRoot>/serve.mjs`, port 8099, /wiki prefix),
 * and auto-starts the server on activation while enabled. The wiki server is
 * spawned through the host-scoped subprocess service, so it keeps serving
 * after this plugin is stopped or reloaded — the entry is "always available"
 * while the harness runs.
 *
 * Install (bundle): `dsh plugin --profile web add <this package>` (local path
 * or npm name). The bundle patch mounts this row into the host composition;
 * the package's `dsh.client` declaration makes the browser half part of the
 * Web boot graph on every page load.
 *
 * @module dsh-wiki-entry
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "wiki-entry";
/** Plugin configuration. */
export interface Config {
    /** Root of the wiki checkout; the static site lives at <root>/site. */
    wikiRoot?: string;
    /** Port the wiki server listens on (default 8099). */
    port?: number;
    /** URL prefix the site is served under (default /wiki). */
    prefix?: string;
}
export declare const Config: z<Config>;
/** Host plugin body: settings namespace, web routes, and server lifecycle. */
export declare function apply(ctx: Context, config: Config): void;
