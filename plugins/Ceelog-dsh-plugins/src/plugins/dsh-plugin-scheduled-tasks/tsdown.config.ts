import { defineConfig } from "tsdown";

/**
 * Client bundle build. tsdown emits a plain CJS file; `scripts/wrap-client.mjs`
 * then wraps it in the DSH browser module-loader handoff
 * (`window.__ModuleLoader__.load({ id, factory })`) so the client-modules
 * shell can register the plugin bundle. The output is forced to `.js` because
 * the package's `./client` export (and the `/plugins/<id>/client.js` route)
 * resolves that filename; real type declarations come from the `tsc` build
 * (`lib/types/client/index.d.ts`).
 */
export default defineConfig({
	entry: {
		client: "src/client/index.ts",
	},
	format: ["cjs"],
	platform: "browser",
	target: "es2022",
	outDir: "lib",
	clean: false,
	sourcemap: false,
	minify: false,
	dts: false,
	outExtensions: () => ({ js: ".js" }),
	deps: {
		// react / react-dom / @deepseek-ai/* are platform seed modules resolved by
		// the browser module loader; zod is bundled inline (as the official
		// client bundles do).
		neverBundle: [/^react(\/.*)?$/, /^react-dom(\/.*)?$/, /^@deepseek-ai\//],
		alwaysBundle: [/^zod$/],
	},
});
