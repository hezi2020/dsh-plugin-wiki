/** Copy dictionaries for the marketplace sidebar panel. */

/** Simplified Chinese dictionary and key source of truth. */
export const zh = {
  title: '插件市场',
  loading: '正在读取插件市场…',
  error: '暂时无法访问插件市场。',
  retry: '重试',
  search: '搜索社区插件',
  empty: '没有找到匹配的插件。',
  install: '安装',
  uninstall: '卸载',
  installed: '已安装',
  notInstallable: '不可安装',
  confirmInstall: '安装第三方社区插件将以其当前用户权限执行代码。确认安装？',
  confirmUninstall: '确认卸载该插件？',
  restart: '已安装，重启 dsh 后生效。',
  stars: '星标',
  license: '许可证',
  updated: '更新于',
} satisfies Record<string, string>

/** Plugin market locale key union. */
export type MarketLocaleKey = keyof typeof zh

/** English dictionary checked against the Chinese key set. */
export const en = {
  title: 'Plugin Marketplace',
  loading: 'Reading the marketplace…',
  error: 'The marketplace is temporarily unavailable.',
  retry: 'Retry',
  search: 'Search community plugins',
  empty: 'No matching plugins.',
  install: 'Install',
  uninstall: 'Uninstall',
  installed: 'Installed',
  notInstallable: 'Not installable',
  confirmInstall: 'Installing third-party community code runs it with your current user privileges. Continue?',
  confirmUninstall: 'Uninstall this plugin?',
  restart: 'Installed — restart dsh to activate.',
  stars: 'stars',
  license: 'License',
  updated: 'Updated',
} satisfies Record<MarketLocaleKey, string>
