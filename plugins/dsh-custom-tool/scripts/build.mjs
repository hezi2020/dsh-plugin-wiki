/**
 * Full build pipeline, in dependency order:
 * 1. Type declarations (tsc) — against the committed worker-sources module.
 * 2. Worker bundles (scripts/build-workers.mjs): the Node executor worker and
 *    the two Monaco workers as minified IIFE files.
 * 3. Worker inlining (scripts/gen-worker-sources.mjs): the IIFE sources become
 *    strings in src/client/monaco/workers.generated.ts, keeping the client
 *    bundle a single file the harness serves as /plugins/<id>/client.js.
 * 4. Published bundles (scripts/bundle.mjs): host index, invariant companion,
 *    and the client bundle in the module-loader factory format.
 */
import { execSync } from 'node:child_process'

const run = (command) => {
  console.log(`\n$ ${command}`)
  execSync(command, { stdio: 'inherit' })
}

run('tsc -p tsconfig.json')
run('node scripts/build-workers.mjs')
run('node scripts/gen-worker-sources.mjs')
run('node scripts/bundle.mjs')
