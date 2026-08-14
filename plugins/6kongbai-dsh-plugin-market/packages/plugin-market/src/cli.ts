#!/usr/bin/env node
/**
 * `dsh-plugin-market <command>` — the marketplace CLI. It reuses the Host
 * package's engine (GitHub indexing + install landing), so the CLI and the Web
 * panel install through the identical code path. This is a plain Node bin, not
 * a Cordis plugin: it runs before any profile boots.
 * @module dsh-plugin-market/cli
 */

import { createInterface } from 'node:readline'
import {
  fetchRepository,
  install,
  installedBundleNames,
  isRepoSlug,
  readRepositoryManifest,
  searchRepositories,
  toDetail,
  toHit,
  uninstall,
} from 'dsh-plugin-market-host'

const DEFAULT_PROFILE = 'web'

interface Parsed {
  readonly command: string
  readonly rest: readonly string[]
  readonly profile: string
  readonly yes: boolean
}

/** Parse `argv` into a command, positional args, and the shared flags. */
function parse(argv: readonly string[]): Parsed {
  const rest: string[] = []
  let profile = DEFAULT_PROFILE
  let yes = false
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index] ?? ''
    if (argument === '--yes' || argument === '-y') {
      yes = true
    } else if (argument === '--profile' || argument === '-p') {
      profile = argv[++index] ?? DEFAULT_PROFILE
    } else {
      rest.push(argument)
    }
  }
  const [command = '', ...positional] = rest
  return { command, rest: positional, profile, yes }
}

/** Prompt the user for a y/N confirmation on stdin. */
async function confirm(prompt: string, yes: boolean): Promise<boolean> {
  if (yes) return true
  process.stderr.write(`${prompt} [y/N] `)
  const answer = await new Promise<string>((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr })
    rl.question('', (value: string) => {
      rl.close()
      resolve(value)
    })
  })
  return answer.trim().toLowerCase() === 'y'
}

function usage(): string {
  return [
    'Usage: dsh-plugin-market <command> [options]',
    '',
    'Commands:',
    '  search <query>          search the dsh-plugin GitHub topic',
    '  info <owner/repo>       show detail and the pinned install spec',
    '  list                    list bundles installed in the profile',
    '  install <owner/repo>    confirm, pin, pnpm add, reconcile, audit',
    '  uninstall <package>     pnpm remove, reconcile, audit',
    '',
    'Options:',
    '  --profile, -p <name>    target profile (default: web)',
    '  --yes, -y               skip the install/uninstall confirmation',
  ].join('\n')
}

async function runSearch(query: string): Promise<void> {
  const response = await searchRepositories(query, process.env.GITHUB_TOKEN)
  for (const item of response.items) {
    const hit = toHit(item)
    process.stdout.write(`${hit.repo}  ★${hit.stars}  ${hit.license ?? 'no-license'}\n  ${hit.description}\n`)
  }
  if (response.items.length === 0) process.stdout.write('(no results)\n')
  process.stdout.write(`\n${response.total_count} results — run \`dsh-plugin-market info <owner/repo>\` for installability\n`)
}

async function runInfo(repo: string): Promise<void> {
  if (!isRepoSlug(repo)) throw new Error(`invalid repository ${JSON.stringify(repo)}`)
  const [summary, manifest] = await Promise.all([
    fetchRepository(repo, process.env.GITHUB_TOKEN),
    readRepositoryManifest(repo, process.env.GITHUB_TOKEN),
  ])
  const detail = await toDetail(repo, summary, manifest, false, process.env.GITHUB_TOKEN)
  process.stdout.write(
    [
      `${detail.displayName}  (${detail.repo})`,
      `  version: ${detail.version ?? '-'}  license: ${detail.license ?? '-'}  stars: ${detail.stars}`,
      `  updated: ${detail.updatedAt}`,
      `  installable: ${detail.installable ? 'yes' : 'no'}`,
      detail.installable ? `  pin: ${detail.pinSpec}` : '  (no dsh.bundle declared)',
      `  ${detail.description}`,
    ].join('\n') + '\n',
  )
}

async function runList(profile: string): Promise<void> {
  const bundles = installedBundleNames(profile)
  if (bundles.length === 0) {
    process.stdout.write(`(no bundles in profile ${profile})\n`)
    return
  }
  for (const name of bundles) process.stdout.write(`${name}\n`)
}

async function runInstall(repo: string, profile: string, yes: boolean): Promise<void> {
  if (!isRepoSlug(repo)) throw new Error(`invalid repository ${JSON.stringify(repo)}`)
  const [summary, manifest] = await Promise.all([
    fetchRepository(repo, process.env.GITHUB_TOKEN),
    readRepositoryManifest(repo, process.env.GITHUB_TOKEN),
  ])
  const detail = await toDetail(repo, summary, manifest, false, process.env.GITHUB_TOKEN)
  if (!detail.installable) throw new Error(`${repo} declares no dsh.bundle — not installable`)
  process.stderr.write(
    `Installing ${detail.displayName} (${detail.repo})\n`
    + `  license: ${detail.license ?? 'unknown'}  stars: ${detail.stars}  updated: ${detail.updatedAt}\n`
    + '  THIRD-PARTY community code: it runs with your current user privileges.\n',
  )
  if (!await confirm('Proceed?', yes)) {
    process.stderr.write('cancelled\n')
    return
  }
  const result = await install(repo, profile)
  process.stdout.write(`installed ${result.package} → ${result.pinSpec} in profile ${profile}\n`)
  process.stdout.write('restart dsh to activate the new bundle\n')
}

async function runUninstall(packageName: string, profile: string, yes: boolean): Promise<void> {
  if (!await confirm(`Remove ${packageName} from profile ${profile}?`, yes)) {
    process.stderr.write('cancelled\n')
    return
  }
  uninstall(packageName, profile)
  process.stdout.write(`removed ${packageName} from profile ${profile}\nrestart dsh to apply\n`)
}

async function main(): Promise<void> {
  const parsed = parse(process.argv.slice(2))
  try {
    switch (parsed.command) {
      case 'search': await runSearch(parsed.rest[0] ?? ''); break
      case 'info': await runInfo(parsed.rest[0] ?? ''); break
      case 'list': await runList(parsed.profile); break
      case 'install': await runInstall(parsed.rest[0] ?? '', parsed.profile, parsed.yes); break
      case 'uninstall': await runUninstall(parsed.rest[0] ?? '', parsed.profile, parsed.yes); break
      default: process.stderr.write(`${usage()}\n`); process.exitCode = 2
    }
  } catch (error) {
    process.stderr.write(`dsh-plugin-market: ${(error as Error).message}\n`)
    process.exitCode = 1
  }
}

await main()
