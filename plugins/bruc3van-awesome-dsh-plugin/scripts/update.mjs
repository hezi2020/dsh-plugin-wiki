#!/usr/bin/env node

import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assignableCategories, categoryFallback, categoryRules } from './categories.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const query = 'topic:dsh-plugin';
const fromSnapshot = process.argv.includes('--from-snapshot');

const curated = JSON.parse(await readFile(resolve(root, 'data/curated.json'), 'utf8'));
const categoryOverrides = new Map(
  Object.entries(curated.category_overrides || {}).map(([fullName, category]) => [fullName.toLowerCase(), category]),
);
// Repositories that carry the dsh-plugin topic but are not themselves a DSH plugin
// (e.g. a competing catalog/directory site) — keyed by full_name, value is the reason.
const excludedRepos = new Map(
  Object.entries(curated.excluded_repos || {}).map(([fullName, reason]) => [fullName.toLowerCase(), reason]),
);

const apiHeaders = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'awesome-dsh-plugin',
  'X-GitHub-Api-Version': '2022-11-28',
};
if (process.env.GITHUB_TOKEN) apiHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

// The Search API allows 30 requests/minute even when authenticated, well below the
// 5000/hour core limit — serialize every call through a shared, paced queue so
// bisected/parallel fetches below never burst past it.
const SEARCH_REQUEST_INTERVAL_MS = 2100;
let requestQueue = Promise.resolve();
function throttled(task) {
  const run = requestQueue.then(async () => {
    const result = await task();
    await new Promise((resolve) => setTimeout(resolve, SEARCH_REQUEST_INTERVAL_MS));
    return result;
  });
  requestQueue = run.catch(() => {});
  return run;
}

async function fetchPage(q, page) {
  return throttled(async () => {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=100&page=${page}`,
      { headers: apiHeaders },
    );
    if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
    return response.json();
  });
}

const toGithubDate = (date) => date.toISOString().replace(/\.\d{3}Z$/, 'Z');
const partitionWarnings = [];

// The overall dsh-plugin topic can hold more than 1000 repositories, which a single
// search query cannot return. Recursively bisect the created-date range — using the
// documented `created:A..B` range qualifier, since two separate `created:` clauses in
// one query do not combine reliably — until each partition's total_count fits under
// the cap, then merge the partial result sets. Only page 1 is fetched to check a
// partition's total_count; the remaining pages are fetched only for partitions that
// turn out to be small enough to keep, so branches that get bisected further don't
// waste requests pulling pages that will just be discarded.
async function fetchRange(baseQuery, minDate, maxDate) {
  if (minDate.getTime() > maxDate.getTime()) return [];
  const rangeQuery = `${baseQuery} created:${toGithubDate(minDate)}..${toGithubDate(maxDate)}`;
  const first = await fetchPage(rangeQuery, 1);
  const total = first.total_count;
  if (total <= 1000) {
    const pageCount = Math.min(Math.ceil(total / 100), 10);
    const remaining = await Promise.all(
      Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => fetchPage(rangeQuery, index + 2)),
    );
    return [first, ...remaining].flatMap((page) => page.items);
  }
  const spanMs = maxDate.getTime() - minDate.getTime();
  const mid = new Date(minDate.getTime() + Math.floor(spanMs / 2));
  const rightMin = new Date(mid.getTime() + 1000);
  if (spanMs < 2000 || rightMin.getTime() > maxDate.getTime()) {
    partitionWarnings.push(
      `${total} repositories were created within ${toGithubDate(minDate)}..${toGithubDate(maxDate)}, a window too narrow (1-second search resolution) to split further; only the first 1000 were fetched for this window.`,
    );
    return first.items;
  }
  const [left, right] = await Promise.all([
    fetchRange(baseQuery, minDate, mid),
    fetchRange(baseQuery, rightMin, maxDate),
  ]);
  return [...left, ...right];
}

const unknownOverrides = new Set();

function categoryFor(repo) {
  const override = categoryOverrides.get(repo.full_name.toLowerCase());
  if (override) {
    const match = assignableCategories.find(([key]) => key === override);
    if (match) return match;
    unknownOverrides.add(`${repo.full_name} -> ${override}`);
  }
  const haystack = [repo.name, repo.description, ...(repo.topics || [])].filter(Boolean).join(' ');
  return categoryRules.find((rule) => rule[3].test(haystack)) || categoryFallback;
}

function normalizeRepository(repo) {
  const category = categoryFor(repo);
  return {
    id: repo.id,
    full_name: repo.full_name,
    html_url: repo.html_url,
    description: repo.description,
    homepage: repo.homepage || null,
    category: category[0],
    category_zh: category[1],
    category_en: category[2],
    language: repo.language,
    stargazers_count: repo.stargazers_count,
    forks_count: repo.forks_count,
    open_issues_count: repo.open_issues_count,
    license: repo.license?.spdx_id || null,
    archived: repo.archived,
    disabled: repo.disabled,
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    pushed_at: repo.pushed_at,
    default_branch: repo.default_branch,
    size_kb: repo.size,
    topics: repo.topics || [],
  };
}

async function refreshSnapshot() {
  const fetchedAt = new Date();
  const items = await fetchRange(query, new Date('2008-01-01T00:00:00Z'), fetchedAt);
  const byId = new Map(items.map((item) => [item.id, item]));
  const repositories = [...byId.values()]
    .map(normalizeRepository)
    .sort((a, b) => b.stargazers_count - a.stargazers_count || a.full_name.localeCompare(b.full_name));
  return {
    source: 'https://github.com/topics/dsh-plugin',
    query,
    fetched_at: fetchedAt.toISOString(),
    total_count: repositories.length,
    repositories,
  };
}

const snapshot = fromSnapshot
  ? JSON.parse(await readFile(resolve(root, 'data/repositories.json'), 'utf8'))
  : await refreshSnapshot();
const excludedCount = snapshot.repositories.filter((repo) =>
  excludedRepos.has(repo.full_name.toLowerCase()),
).length;
const repositories = snapshot.repositories
  .filter((repo) => repo.description && repo.description.trim())
  .filter((repo) => !excludedRepos.has(repo.full_name.toLowerCase()))
  .map((repo) => {
    const category = categoryFor({ ...repo, name: repo.name || repo.full_name.split('/')[1] });
    return {
      ...repo,
      category: category[0],
      category_zh: category[1],
      category_en: category[2],
    };
  })
  .sort((a, b) => b.stargazers_count - a.stargazers_count || a.full_name.localeCompare(b.full_name));
snapshot.repositories = repositories;
snapshot.total_count = repositories.length;
const repoMap = new Map(repositories.map((repo) => [repo.full_name.toLowerCase(), repo]));
const date = snapshot.fetched_at.slice(0, 10);
const totals = {
  languages: new Set(repositories.map((repo) => repo.language).filter(Boolean)).size,
  licenses: repositories.filter((repo) => repo.license).length,
  active: repositories.filter((repo) => !repo.archived && !repo.disabled).length,
};
const topCount = Math.min(100, repositories.length);

const esc = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const repoName = (fullName) => fullName.split('/')[1];
// A curated entry can drop out of the topic snapshot when its repository is deleted,
// made private, or loses the dsh-plugin topic — and a freshly submitted repository is
// simply newer than the stored snapshot. Neither case should fail the whole refresh:
// skip the entry, keep the catalog building, and report the gap at the end.
const missingCurated = new Set();
const repoFor = (fullName) => {
  const repo = repoMap.get(fullName.toLowerCase());
  if (!repo) {
    missingCurated.add(fullName);
    return null;
  }
  return repo;
};
const repoLink = (fullName) => {
  const repo = repoFor(fullName);
  return repo ? `[${repoName(repo.full_name)}](${repo.html_url})` : null;
};
const updated = (repo) => repo.updated_at.slice(0, 10);

function scenarioTable(language) {
  const header = language === 'zh'
    ? '| 我想要…… | 推荐从这里开始 | 为什么 |\n| --- | --- | --- |'
    : '| I want to… | Start here | Why |\n| --- | --- | --- |';
  const rows = curated.scenarios
    .map((item) => ({ item, links: item.repos.map(repoLink).filter(Boolean) }))
    .filter((entry) => entry.links.length)
    .map(({ item, links }) => `| ${item[`goal_${language}`]} | ${links.join(' · ')} | ${item[`why_${language}`]} |`);
  return `${header}\n${rows.join('\n')}`;
}

function starterKits(language) {
  return curated.starter_kits
    .map((kit) => ({ kit, links: kit.repos.map(repoLink).filter(Boolean) }))
    .filter((entry) => entry.links.length)
    .map(({ kit, links }) => `### ${kit[`title_${language}`]}\n\n${kit[`summary_${language}`]}\n\n${links.join(' · ')}`)
    .join('\n\n');
}

function editorPicks(language) {
  return curated.editor_picks
    .map((pick) => ({ pick, repo: repoFor(pick.repo) }))
    .filter((entry) => entry.repo)
    .map(({ pick, repo }) => {
      const labels = pick[`labels_${language}`].map((label) => `\`${label}\``).join(' ');
      return `### [${pick[`title_${language}`]}](${repo.html_url})\n\n${pick[`summary_${language}`]}\n\n${labels}`;
    })
    .join('\n\n');
}

function recentProjects(language) {
  const recent = [...repositories]
    .filter((repo) => !repo.archived && repo.full_name !== 'bruc3van/awesome-dsh-plugin')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8);
  const header = language === 'zh'
    ? '| 项目 | 简介 | 创建日期 |\n| --- | --- | --- |'
    : '| Project | Description | Created |\n| --- | --- | --- |';
  const rows = recent.map((repo) => `| [${repo.full_name}](${repo.html_url}) | ${esc(repo.description || (language === 'zh' ? '仓库暂未提供简介。' : 'No description provided yet.'))} | ${repo.created_at.slice(0, 10)} |`);
  return `${header}\n${rows.join('\n')}`;
}

function topByStars(n) {
  const top = repositories.slice(0, n);
  const rows = top.map((repo, index) => `| ${index + 1} | [${repo.full_name}](${repo.html_url}) | ${esc(repo.description || '—')} | ${repo.language || '—'} | ${repo.stargazers_count} | ${repo.license || '—'} | ${updated(repo)} |`);
  return `| # | Project | Description | Language | Stars | License | Updated |\n| ---: | --- | --- | --- | ---: | --- | --- |\n${rows.join('\n')}`;
}

function starBoard(language) {
  const top = repositories.slice(0, 12);
  const header = language === 'zh'
    ? '| # | 项目 | ⭐ Stars | License | 更新 |\n| ---: | --- | ---: | --- | --- |'
    : '| # | Project | ⭐ Stars | License | Updated |\n| ---: | --- | ---: | --- | --- |';
  const rows = top.map((repo, index) => `| ${index + 1} | [${repo.full_name}](${repo.html_url}) | ${repo.stargazers_count} | ${repo.license || '—'} | ${updated(repo)} |`);
  return `${header}\n${rows.join('\n')}`;
}

function catalogSections() {
  return categoryRules
    .map(([key, zh, en]) => [key, zh, en])
    .concat([categoryFallback])
    .map(([key, zh, en]) => {
      const group = repositories.filter((repo) => repo.category === key);
      if (!group.length) return '';
      const rows = group.map((repo) => `| [${repo.full_name}](${repo.html_url}) | ${esc(repo.description || '—')} | ${repo.language || '—'} | ${repo.stargazers_count} | ${repo.license || '—'} | ${updated(repo)} |`);
      return `## ${zh} / ${en} (${group.length})\n\n| Project | Description | Language | Stars | License | Updated |\n| --- | --- | --- | ---: | --- | --- |\n${rows.join('\n')}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

const badgeDate = date.replaceAll('-', '--');
const badges = `[![Awesome](https://awesome.re/badge-flat2.svg)](https://awesome.re)\n![Plugins](https://img.shields.io/badge/plugins-${repositories.length}-2563eb)\n![Updated](https://img.shields.io/badge/updated-${badgeDate}-16a34a)\n[![Catalog refresh](https://github.com/bruc3van/awesome-dsh-plugin/actions/workflows/update-catalog.yml/badge.svg)](https://github.com/bruc3van/awesome-dsh-plugin/actions/workflows/update-catalog.yml)\n![License](https://img.shields.io/badge/license-MIT-f59e0b)`;

const readmeZh = `# Awesome DSH Plugins\n\n> 用 30 秒找到适合你的 DeepSeek Harness 插件。\n> 不只是仓库列表：这里告诉你插件解决什么问题、适合谁，以及从哪里开始。\n\n${badges}\n\n[English](./README_EN.md) · [浏览全部 ${repositories.length} 个插件](./CATALOG.md) · [Star Top ${topCount}](./TOP100.md) · [推荐一个插件](./CONTRIBUTING.md) · [机器可读数据](./data/repositories.json)\n\n**如果这个列表帮你找到一个有用的插件，欢迎点一个 Star ⭐。它能帮助更多 DSH 用户发现这个生态。**\n\n## 你想让 DSH 做什么？\n\n${scenarioTable('zh')}\n\n## 第一次使用 DSH 插件？\n\n不需要一次装很多。先选一个与你当前问题最接近的组合：\n\n${starterKits('zh')}\n\n## 编辑推荐\n\n这里不是按 Stars 自动排名。我们优先选择解决明确问题、说明完整、仍在维护且具有代表性的项目。收录不等于安全或兼容性背书。\n\n${editorPicks('zh')}\n\n## 社区热度榜（Star 排序）\n\n按 Star 自动排序、每天随目录刷新，已剔除 ${excludedCount} 个蹭 \`dsh-plugin\` Topic 的非插件仓库。完整 Top ${topCount} 见 [TOP100.md](./TOP100.md)。\n\n${starBoard('zh')}\n\n## 最近加入生态\n\n${recentProjects('zh')}\n\n## 为什么维护这个列表？\n\n- **面向使用者，而不是爬虫：** 从“我想完成什么”出发，而不是让你阅读几百行仓库名称。\n- **人工推荐 + 全量索引：** 首页提供选择建议，[CATALOG.md](./CATALOG.md) 保留完整 Topic 快照。\n- **剔除蹭热度条目：** 带 \`dsh-plugin\` Topic 但并非 DSH 插件的仓库（平台本体、其他 Agent 工具、同名目录站等）不计入目录与榜单，理由记录在 [data/curated.json](./data/curated.json)。\n- **中文默认，中英双语：** 普通用户可以直接理解，英文读者也有独立入口。\n- **结构化且可复现：** 推荐配置在 [data/curated.json](./data/curated.json)，原始元数据在 [data/repositories.json](./data/repositories.json)。\n- **持续更新：** 目录每天从 GitHub \`dsh-plugin\` Topic 自动刷新；当前数据时间为 **${date} UTC**。\n\n当前索引包含 **${repositories.length}** 个仓库、**${totals.languages}** 种主要语言；其中 **${totals.licenses}** 个声明了许可证，**${totals.active}** 个未归档且未禁用。\n\n## 使用与安全\n\n第三方插件可能读取会话、文件、网络或系统资源。安装前请检查源码、权限、许可证、安装方式和最近更新情况，并优先在隔离环境中试用。本列表仅做发现与整理，不代表 DSH 官方认可。\n\n## 推荐或修正插件\n\n发现遗漏、分类不准确或说明过时？欢迎提交 Issue 或 Pull Request。公开仓库只要带有 \`dsh-plugin\` Topic 且确实是 DSH 插件，就会进入全量目录（蹭 Topic 的条目会被剔除）；编辑推荐需要补充清晰的使用场景和中英文理由。详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。\n\n## License\n\n本列表采用 [MIT License](./LICENSE) 发布；各收录项目遵循其各自许可证。\n`;

const readmeEn = `# Awesome DSH Plugins\n\n> Find the right DeepSeek Harness plugin in 30 seconds.\n> More than a repository dump: learn what each plugin solves, who it is for, and where to start.\n\n${badges}\n\n[中文](./README.md) · [Browse all ${repositories.length} plugins](./CATALOG.md) · [Star Top ${topCount}](./TOP100.md) · [Recommend a plugin](./CONTRIBUTING.md) · [Machine-readable data](./data/repositories.json)\n\n**If this list helps you discover something useful, consider leaving a Star ⭐ so more DSH users can find the ecosystem.**\n\n## What do you want DSH to do?\n\n${scenarioTable('en')}\n\n## New to DSH plugins?\n\nYou do not need to install everything. Start with the kit closest to the problem you have today:\n\n${starterKits('en')}\n\n## Editor's picks\n\nThese are not ranked automatically by stars. We favor projects that solve a clear problem, explain themselves well, remain active, and represent a distinctive capability. Inclusion is not a security or compatibility endorsement.\n\n${editorPicks('en')}\n\n## Popular by stars\n\nRanked by stars and refreshed daily with the catalog; the ${excludedCount} repositories that ride the \`dsh-plugin\` topic without being DSH plugins are excluded. Full Top ${topCount}: [TOP100.md](./TOP100.md).\n\n${starBoard('en')}\n\n## Recently added\n\n${recentProjects('en')}\n\n## Why this list?\n\n- **Built for users, not crawlers:** start from the job you want to accomplish instead of scanning hundreds of repository names.\n- **Human guidance plus complete coverage:** the home page helps you choose; [CATALOG.md](./CATALOG.md) preserves the full topic snapshot.\n- **Topic riders excluded:** repositories that tag \`dsh-plugin\` without being DSH plugins (the platform itself, other agent tools, competing catalogs) are left out of the catalog and rankings, with reasons recorded in [data/curated.json](./data/curated.json).\n- **Bilingual by design:** Chinese is the default, with an independent English entry point.\n- **Structured and reproducible:** curation lives in [data/curated.json](./data/curated.json), while source metadata lives in [data/repositories.json](./data/repositories.json).\n- **Continuously refreshed:** the catalog updates daily from GitHub's \`dsh-plugin\` topic. Current data timestamp: **${date} UTC**.\n\nThe index currently covers **${repositories.length}** repositories across **${totals.languages}** primary languages. **${totals.licenses}** declare a license, and **${totals.active}** are neither archived nor disabled.\n\n## Usage and safety\n\nThird-party plugins may access conversations, files, networks, or system resources. Review source code, permissions, installation steps, licenses, and recent activity before installing, and test in an isolated environment when possible. Inclusion does not imply official DSH endorsement.\n\n## Recommend or correct a plugin\n\nFound a missing project, stale description, or incorrect category? Issues and pull requests are welcome. Public repositories carrying the \`dsh-plugin\` topic enter the full catalog automatically if they actually are DSH plugins (topic riders are excluded); editor's picks require a clear use case and bilingual rationale. See [CONTRIBUTING.md](./CONTRIBUTING.md).\n\n## License\n\nThis list is released under the [MIT License](./LICENSE). Included projects retain their respective licenses.\n`;

const top100 = `# DSH 插件 Star 排行榜 Top ${topCount} / Top ${topCount} DSH Plugins by Stars\n\n[返回中文首页](./README.md) · [Back to English home](./README_EN.md) · [完整目录 / Full catalog](./CATALOG.md) · [JSON data](./data/repositories.json)\n\n按 Star 数排序的前 ${topCount} 个 DSH 插件仓库。榜单已剔除 ${excludedCount} 个带有 \`dsh-plugin\` Topic 但并非 DSH 插件的仓库（平台本体、其他 Agent 工具、同名目录站等），完整清单与理由见 [data/curated.json](./data/curated.json)。排名反映受欢迎程度，不代表安全性、兼容性或质量背书。\n\nThe top ${topCount} DSH plugin repositories ranked by GitHub stars. ${excludedCount} repositories that carry the \`dsh-plugin\` topic without being DSH plugins (the platform itself, other agent tools, competing catalogs) are excluded — see [data/curated.json](./data/curated.json) for the full list and reasons. Ranking reflects popularity only — it is not a claim of security, compatibility, or quality.\n\n- Refreshed: **${date} UTC**\n\n${topByStars(topCount)}\n\n## Data source\n\nGenerated by \`node scripts/update.mjs\`. Complete metadata is available in [data/repositories.json](./data/repositories.json).\n`;

const catalog = `# DSH 插件全量目录 / Complete DSH Plugin Catalog\n\n[返回中文首页](./README.md) · [Back to English home](./README_EN.md) · [Star Top ${topCount}](./TOP100.md) · [JSON data](./data/repositories.json)\n\n本页自动收录 GitHub [\`dsh-plugin\` Topic](https://github.com/topics/dsh-plugin) 下已提供项目简介、且确实是 DSH 插件或 DSH 生态资源的公开仓库。${excludedCount} 个蹭 Topic 的非插件仓库（平台本体、其他 Agent 工具、同名目录站等）已剔除，清单与理由见 [data/curated.json](./data/curated.json)。本页是索引，不代表人工推荐、兼容性验证或安全背书。未填写简介的仓库暂不收录，补充简介后会在下次刷新时自动加入。\n\nThis page automatically lists public repositories under GitHub's [\`dsh-plugin\` topic](https://github.com/topics/dsh-plugin) that have a description set and are actually DSH plugins or DSH ecosystem resources. ${excludedCount} repositories that ride the topic without being DSH plugins (the platform itself, other agent tools, competing catalogs) are excluded — see [data/curated.json](./data/curated.json) for the full list and reasons. It is an index, not a claim of editorial recommendation, compatibility, or security review. Repositories without a description are excluded until one is added; they will appear automatically on the next refresh.\n\n- Repositories: **${repositories.length}**\n- Primary languages: **${totals.languages}**\n- Declared licenses: **${totals.licenses}**\n- Refreshed: **${date} UTC**\n\n${catalogSections()}\n\n## Data source\n\nGenerated by \`node scripts/update.mjs\`. Complete metadata is available in [data/repositories.json](./data/repositories.json).\n`;

await mkdir(resolve(root, 'data'), { recursive: true });
if (!fromSnapshot) {
  await writeFile(resolve(root, 'data/repositories.json'), `${JSON.stringify(snapshot, null, 2)}\n`);
}
await writeFile(resolve(root, 'README.md'), readmeZh);
await writeFile(resolve(root, 'README_EN.md'), readmeEn);
await writeFile(resolve(root, 'CATALOG.md'), catalog);
await writeFile(resolve(root, 'TOP100.md'), top100);

console.log(`${fromSnapshot ? 'Generated from snapshot' : 'Updated'} ${repositories.length} repositories at ${snapshot.fetched_at}`);

const warnings = [];
if (missingCurated.size) {
  warnings.push(
    `Curated entries missing from the topic snapshot (skipped in the generated pages): ${[...missingCurated].join(', ')}`,
    fromSnapshot
      ? 'Snapshot mode only sees stored data — run `node scripts/update.mjs` to check against live GitHub results.'
      : 'These repositories no longer appear under the dsh-plugin topic. Remove or replace them in data/curated.json.',
  );
}
if (unknownOverrides.size) {
  warnings.push(`Unknown category_overrides values (ignored, repository fell back to pattern matching): ${[...unknownOverrides].join(', ')}`);
}
if (partitionWarnings.length) {
  warnings.push(...partitionWarnings);
}

if (warnings.length) {
  for (const warning of warnings) console.warn(`Warning: ${warning}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `### Curated data warnings\n\n${warnings.map((warning) => `- ${warning}`).join('\n')}\n`,
    );
  }
}
