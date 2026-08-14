/**
 * dsh-wiki-entry — browser half.
 *
 * Registers the Wiki 入口 into the session-header utilities slot (top-right)
 * and a "Wiki 入口" card into 设置 → 插件 → 可配置. Both read the persistent
 * enable switch through the same-origin webServer routes `/wiki-api/status`
 * and `/wiki-api/set-enabled`; the host stores the switch in the `wiki-entry`
 * settings namespace (settings.yaml), so it survives restarts and page
 * refreshes, and the header entry disappears while disabled.
 *
 * The card deliberately does NOT use the client settings scope: the host
 * API-proxy exposure allowlist gates which namespaces configuration clients
 * may read or write, and plugin-owned namespaces are not on it. The host
 * routes bypass that gate.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** Required services: only slots — the enable switch travels through host routes. */
export declare const inject: string[];
/**
 * Mount the Wiki entry and its settings card.
 * @param ctx - browser context carrying the slot registry.
 */
export declare function apply(ctx: ClientContext): void;
