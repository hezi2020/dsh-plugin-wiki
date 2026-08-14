/** Durable record of one custom tool authored in the settings UI or by the model. */
export interface CustomTool {
    /** Stable opaque id minted at creation and unchanged across edits. */
    id: string;
    /** Tool name as registered in `ctx.tools`; must match the shared snake_case pattern. */
    name: string;
    /** Model-facing description: the model reads it to decide when to call the tool. */
    description: string;
    /** Raw JSON Schema for call arguments (object root), in the enforced dsh-tools subset. */
    parameters: unknown;
    /** The tool function body: statements over `args` and `env`, run in a sandbox. */
    code: string;
    /**
     * Execution scope: 'global' tools run in the network-only sandbox;
     * 'workspace' tools additionally receive an `fs` capability (readFile /
     * writeFile / list) confined to the session workspace root.
     */
    scope: 'global' | 'workspace';
    /**
     * Where the tool exists: 'global' lives in the settings namespace and is
     * available in every workspace; 'workspace' lives in the per-workspace
     * store and is active only for sessions of the workspace that created it.
     */
    location: 'global' | 'workspace';
    /** Whether the tool is registered; disabled tools stay stored but unregistered. */
    enabled: boolean;
    /** Who authored the tool: the settings UI or the model. */
    source: 'user' | 'model';
    /** ISO timestamp of first save. */
    createdAt: string;
    /** ISO timestamp bumped on every content edit; the registry's change key. */
    updatedAt: string;
}
/** The `custom-tools` settings namespace section. */
export interface CustomToolsSettings {
    tools: CustomTool[];
}
