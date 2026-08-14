/**
 * Live registry: mirrors the enabled global-location subset of the
 * `custom-tools` settings section into `ctx.tools`, and registers
 * workspace-location tools into each matching agent's own scope.
 * Registration failures are contained per tool and surfaced through
 * {@link CustomToolRegistry.errors}.
 */
import { realpathSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
import type { CustomToolConfig } from './settings.ts'
import { buildCustomToolDefinition, type InitiatorLookup } from './tool-definition.ts'
import type { CustomTool } from './types.ts'
import { readWorkspaceTools, resolveDshHome, workspaceStorePath, writeWorkspaceTools } from './workspace-store.ts'

interface ActiveEntry { tool: CustomTool; dispose: () => void }

/** Minimal structural faces of the agent registry and agent instances this plugin consumes. */
interface AgentLike {
  session: { header: { cwd: string } }
  ctx: { tools: { register(definition: unknown): () => void } }
}

interface AgentsLike {
  currentInitiator(): AgentLike | undefined
  list(): AgentLike[]
}

/**
 * Canonicalize a workspace root; failures surface as the raw path.
 * @param root - the session cwd.
 * @returns the realpath, or the raw path when it does not exist yet.
 */
function canonicalRoot(root: string): string {
  try {
    return realpathSync(root)
  } catch {
    return root
  }
}

export class CustomToolRegistry {
  private readonly active = new Map<string, ActiveEntry>()
  /** workspace root -> tool id -> per-agent registration disposers. */
  private readonly workspaceActive = new Map<string, Map<string, Array<{ agent: AgentLike; dispose: () => void }>>>()
  private readonly failures = new Map<string, string>()
  private readonly dshHome: string

  /**
   * @param ctx - the plugin context; global registrations bind to its fiber scope.
   * @param config - resolved plugin configuration.
   */
  constructor(private readonly ctx: Context, private readonly config: CustomToolConfig) {
    this.dshHome = resolveDshHome(config.dshHome)
  }

  /** The initiator's session cwd, resolved inside the dispatch's async context. */
  private readonly workspaceRoot = (): string | undefined => {
    const agents = this.ctx.get('agents') as InitiatorLookup | undefined
    return agents?.currentInitiator()?.session.header.cwd
  }

  /** Per-tool registration failures by tool id, for diagnostics and `custom_tools_list`. */
  errors(): ReadonlyMap<string, string> {
    return this.failures
  }

  /** The per-workspace store path for the current initiator's workspace. */
  currentWorkspaceStorePath(): string | undefined {
    const root = this.workspaceRoot()
    return root === undefined ? undefined : workspaceStorePath(this.dshHome, canonicalRoot(root))
  }

  /** Read the current workspace's stored tools, or [] outside a session. */
  currentWorkspaceTools(): CustomTool[] {
    const root = this.workspaceRoot()
    if (root === undefined) return []
    return readWorkspaceTools(this.dshHome, canonicalRoot(root))
  }

  /**
   * Write the current workspace's complete tool list to its store.
   * @param tools - the complete next tool list.
   * @returns the canonical workspace root the store was written for.
   * @throws when no session workspace is active.
   */
  writeCurrentWorkspaceTools(tools: CustomTool[]): string {
    const root = this.workspaceRoot()
    if (root === undefined) throw new Error('no active workspace')
    const canonical = canonicalRoot(root)
    writeWorkspaceTools(this.dshHome, canonical, tools)
    return canonical
  }

  /**
   * Mirror the global settings section into the tools registry.
   * @param tools - the complete stored global section.
   */
  reconcile(tools: readonly CustomTool[]): void {
    const wanted = new Map<string, CustomTool>()
    for (const tool of tools) {
      if (tool.enabled) wanted.set(tool.id, tool)
    }
    for (const [id, entry] of this.active) {
      const next = wanted.get(id)
      if (next === undefined || next.updatedAt !== entry.tool.updatedAt) {
        entry.dispose()
        this.active.delete(id)
        this.failures.delete(id)
      }
    }
    for (const [id, tool] of wanted) {
      const existing = this.active.get(id)
      if (existing !== undefined && existing.tool.updatedAt === tool.updatedAt) continue
      try {
        const dispose = this.ctx.tools.register(buildCustomToolDefinition(tool, this.config, this.workspaceRoot))
        this.active.set(id, { tool, dispose })
        this.failures.delete(id)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.failures.set(id, message)
        this.ctx.logger('dsh-custom-tool').warn('failed to register custom tool "%s": %s', tool.name, message)
      }
    }
  }

  /**
   * Register every enabled workspace-location tool of one workspace into the
   * scopes of its live agents: a full sweep (dispose all, then re-register
   * fresh) keeps the per-agent view exactly equal to the store.
   * @param workspaceRoot - the workspace root (canonicalized here).
   */
  reconcileWorkspace(workspaceRoot: string): void {
    const root = canonicalRoot(workspaceRoot)
    const agents = this.ctx.get('agents') as AgentsLike | undefined
    const live = (agents?.list() ?? []).filter(agent => canonicalRoot(agent.session.header.cwd) === root)
    const tools = readWorkspaceTools(this.dshHome, root).filter(tool => tool.enabled)

    const previous = this.workspaceActive.get(root)
    if (previous !== undefined) {
      for (const entries of previous.values()) {
        for (const entry of entries) entry.dispose()
      }
    }
    const active = new Map<string, Array<{ agent: AgentLike; dispose: () => void }>>()
    for (const tool of tools) {
      const entries: Array<{ agent: AgentLike; dispose: () => void }> = []
      for (const agent of live) {
        try {
          const dispose = agent.ctx.tools.register(buildCustomToolDefinition(tool, this.config, () => agent.session.header.cwd))
          entries.push({ agent, dispose })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          this.failures.set(tool.id, message)
          this.ctx.logger('dsh-custom-tool').warn('failed to register workspace tool "%s" for an agent: %s', tool.name, message)
        }
      }
      active.set(tool.id, entries)
    }
    this.workspaceActive.set(root, active)
  }

  /**
   * Register one newly created agent's workspace tools.
   * @param agent - the live agent.
   */
  registerAgent(agent: AgentLike): void {
    this.reconcileWorkspace(agent.session.header.cwd)
  }

  /** Dispose every live registration; called on plugin teardown. */
  clear(): void {
    for (const entry of this.active.values()) entry.dispose()
    this.active.clear()
    for (const inner of this.workspaceActive.values()) {
      for (const entries of inner.values()) {
        for (const entry of entries) entry.dispose()
      }
    }
    this.workspaceActive.clear()
    this.failures.clear()
  }
}
