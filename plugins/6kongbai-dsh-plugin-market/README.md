# dsh-plugin-market

A plugin marketplace CLI for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`): browse, install, and uninstall **community bundle plugins** from the [`dsh-plugin` GitHub topic](https://github.com/topics/dsh-plugin).

The community registry is a GitHub topic, not a proprietary index. Any repository tagged `dsh-plugin` whose `package.json` declares `dsh.bundle.patch` is installable.

## Status

**v0.1.0 ships the CLI only.** A sidebar Web GUI is planned but blocked on an upstream limitation: the harness's Typert generator (`@deepseek-ai/dsh-typert-generator`) only recognizes `@Remote` services from *source* project references, not from installed npm packages, so an out-of-tree bundle cannot generate its Remote face today. The client half lives in `packages/market-client/` (kept out of the pnpm workspace) and will be wired up once Typert supports out-of-tree plugins.

## Install

```sh
# from npm (once published)
npm i -g dsh-plugin-market

# or straight from GitHub now
npm i -g github:<owner>/dsh-plugin-market
```

Then:

```sh
dsh-plugin-market search <query>          # search the dsh-plugin topic
dsh-plugin-market info <owner/repo>       # detail + pinned install spec
dsh-plugin-market list                    # bundles installed in the profile
dsh-plugin-market install <owner/repo>    # confirm, pin, pnpm add, reconcile, audit
dsh-plugin-market uninstall <package>     # pnpm remove, reconcile, audit
```

Options:

- `--profile`, `-p <name>` — target profile (default `web`); overridable via `DSH_PLUGIN_MARKET_PROFILE`.
- `--yes`, `-y` — skip the install/uninstall confirmation.
- `GITHUB_TOKEN` — raise the anonymous GitHub API rate limit.

## How install works

`install <owner/repo>`:

1. reads the repository's `package.json` and verifies it declares `dsh.bundle.patch` (repositories without it are marked not-installable in `search`);
2. resolves the default branch's current head and **pins to a commit** — `pnpm add github:owner/repo#<sha>`, never a floating branch;
3. runs `pnpm add` in the target profile directory;
4. reconciles `dsh.profile.bundles` (a dependency declaring `dsh.bundle` joins the layer list; a removed one leaves it);
5. appends an audit line to `$DSH_HOME/plugin-install.log`.

`uninstall <package>` runs `pnpm remove`, reconciles, and audits. In both cases the new bundle activates on the next `dsh` restart.

## Architecture

```
dsh-plugin-market/
├── packages/market-host      Engine (plain Node, no Cordis): GitHub indexing,
│                             install landing, reconcile, audit. Consumed by
│                             the CLI and, later, by the Web GUI host half.
├── packages/plugin-market    CLI package: the `dsh-plugin-market` bin.
└── packages/market-client    (future work, out of workspace) Web GUI sidebar panel.
```

The engine (`dsh-plugin-market-host`) exposes `searchRepositories`, `fetchRepository`, `readRepositoryManifest`, `toEntry`, `toDetail`, `resolvePinSpec`, `install`, `uninstall`, `installedBundleNames`, `profileDir`, and `auditLogPath`.

## `dsh.market` metadata contract (for plugin authors)

A plugin repository participates by tagging `dsh-plugin` and declaring, in its `package.json`:

```jsonc
{
  "name": "dsh-plugin-foo",
  "version": "1.2.0",
  "description": "short description",   // fallback presentation
  "keywords": ["dev", "git"],           // fallback categories
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },  // REQUIRED to be installable
    "market": {                                   // OPTIONAL rich metadata
      "displayName": "Foo",
      "icon": "https://…",
      "categories": ["productivity"],
      "screenshots": ["https://…"]
    }
  }
}
```

`bundle.patch` is the hard gate. `market` falls back to the top-level `name`/`description`/`keywords` plus GitHub repository fields (`stars`, `updated_at`, `license`) when absent.

## Security model

Installing a community plugin downloads and runs arbitrary code with the current user's privileges. This tool therefore:

- shows `owner`, `stars`, `updated_at`, and `license` before install, with an explicit third-party-code warning;
- **pins to a commit** (`github:owner/repo#<sha>`), never a floating branch, so a later force-push cannot move what was installed;
- appends an audit record to `$DSH_HOME/plugin-install.log`;
- requires confirmation (interactive, `--yes` to skip).

Signature verification and an allowlist are not yet implemented — `dsh.bundle` has no signing mechanism today — and are tracked as future work.

## Development

Requires Node `^22.19 || >=24`, pnpm, and the pre-release harness packages (`@deepseek-ai/dsh-app-boot@0.1.0-rc.6`, `@deepseek-ai/dsh-home-paths@0.1.0-rc.6`).

```sh
pnpm install
pnpm build        # builds the engine and CLI packages
pnpm test
```

## License

MIT
