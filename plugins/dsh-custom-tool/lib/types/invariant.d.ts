/** Invariant companion: the plugin owns no event stream, so no runtime check is registered. */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-custom-tool-invariant";
export declare const inject: string[];
/**
 * Register the companion without claiming a check.
 * No runtime invariant: dsh-custom-tool owns no event stream or durable log;
 * its settings-to-registry relationship is asserted by unit and composition tests.
 * @param ctx - the plugin context.
 */
export declare function apply(ctx: Context): Promise<() => void>;
