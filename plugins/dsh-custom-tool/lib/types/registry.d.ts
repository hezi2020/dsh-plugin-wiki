import type { Context } from '@deepseek-ai/cordis';
import type { CustomToolConfig } from './settings.ts';
import type { CustomTool } from './types.ts';
/** Minimal structural faces of the agent registry and agent instances this plugin consumes. */
interface AgentLike {
    session: {
        header: {
            cwd: string;
        };
    };
    ctx: {
        tools: {
            register(definition: unknown): () => void;
        };
    };
}
export declare class CustomToolRegistry {
    private readonly ctx;
    private readonly config;
    private readonly active;
    /** workspace root -> tool id -> per-agent registration disposers. */
    private readonly workspaceActive;
    private readonly failures;
    private readonly dshHome;
    /**
     * @param ctx - the plugin context; global registrations bind to its fiber scope.
     * @param config - resolved plugin configuration.
     */
    constructor(ctx: Context, config: CustomToolConfig);
    /** The initiator's session cwd, resolved inside the dispatch's async context. */
    private readonly workspaceRoot;
    /** Per-tool registration failures by tool id, for diagnostics and `custom_tools_list`. */
    errors(): ReadonlyMap<string, string>;
    /** The per-workspace store path for the current initiator's workspace. */
    currentWorkspaceStorePath(): string | undefined;
    /** Read the current workspace's stored tools, or [] outside a session. */
    currentWorkspaceTools(): CustomTool[];
    /**
     * Write the current workspace's complete tool list to its store.
     * @param tools - the complete next tool list.
     * @returns the canonical workspace root the store was written for.
     * @throws when no session workspace is active.
     */
    writeCurrentWorkspaceTools(tools: CustomTool[]): string;
    /**
     * Mirror the global settings section into the tools registry.
     * @param tools - the complete stored global section.
     */
    reconcile(tools: readonly CustomTool[]): void;
    /**
     * Register every enabled workspace-location tool of one workspace into the
     * scopes of its live agents: a full sweep (dispose all, then re-register
     * fresh) keeps the per-agent view exactly equal to the store.
     * @param workspaceRoot - the workspace root (canonicalized here).
     */
    reconcileWorkspace(workspaceRoot: string): void;
    /**
     * Register one newly created agent's workspace tools.
     * @param agent - the live agent.
     */
    registerAgent(agent: AgentLike): void;
    /** Dispose every live registration; called on plugin teardown. */
    clear(): void;
}
export {};
