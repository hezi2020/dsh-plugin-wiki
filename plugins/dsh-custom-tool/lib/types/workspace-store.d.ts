import type { CustomTool } from './types.ts';
/**
 * Resolve the harness home the store directories live under.
 * @param configHome - the configured home; empty falls back to $DSH_HOME then ~/.dsh.
 * @returns the resolved home path.
 */
export declare function resolveDshHome(configHome: string): string;
/**
 * Store file for one workspace, under <dsh home>/workspace-tools/.
 * @param dshHome - the resolved harness home.
 * @param workspaceRoot - the canonical workspace root.
 * @returns the store file path.
 */
export declare function workspaceStorePath(dshHome: string, workspaceRoot: string): string;
/**
 * Read one workspace's tools; a missing store reads as empty.
 * @param dshHome - the resolved harness home.
 * @param workspaceRoot - the canonical workspace root.
 * @returns the stored tools.
 * @throws when the file exists but is not a valid store envelope.
 */
export declare function readWorkspaceTools(dshHome: string, workspaceRoot: string): CustomTool[];
/**
 * Atomically write one workspace's tools (temp file + rename).
 * @param dshHome - the resolved harness home.
 * @param workspaceRoot - the canonical workspace root.
 * @param tools - the complete next tool list.
 */
export declare function writeWorkspaceTools(dshHome: string, workspaceRoot: string, tools: CustomTool[]): void;
