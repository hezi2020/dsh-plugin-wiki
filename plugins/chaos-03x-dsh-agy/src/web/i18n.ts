/**
 * Bilingual UI dictionary for the dsh-agy web dashboard and OAuth callbacks.
 */

export interface I18nStrings {
  title: string
  subtitle: string
  refresh: string
  loginWithGoogle: string
  switchLang: string
  accountsList: string
  noAccounts: string
  noAccountsHint: string
  activeBadge: string
  stateActive: string
  stateCooling: string
  stateRateLimited: string
  stateVerificationRequired: string
  stateDisabled: string
  project: string
  defaultProject: string
  activate: string
  verify: string
  verifyCta: string
  testAll: string
  exportBlob: string
  fingerprint: string
  deleteAccount: string
  confirmDelete: string
  confirmTestAll: string
  confirmRegenerateFp: string
  quotaTitle: string
  quotaUnavailable: string
  noQuotaReported: string
  testModel: string
  testing: string
  copied: string
  importTitle: string
  importDesc: string
  importPlaceholder: string
  importJson: string
  importBlobBtn: string
  importSuccess: string
  exportAll: string
  importBatchResult: string
  copyAllMsg: string
  fingerprintTitle: string
  fingerprintDevice: string
  fingerprintUserAgent: string
  fingerprintCreated: string
  fingerprintHistory: string
  regenerateFp: string
  copyBlobMsg: string
  copyFpMsg: string
  allModelsOk: string
  modelsTestedSummary: string
  loginSuccessTitle: string
  loginSuccessDesc: string
  loginFailedTitle: string
  loginFailedDesc: string
  windowClosing: string
  closeWindow: string
  retryLogin: string
  resetIn: string
  resetAt: string
}

export const I18N_DICT: { en: I18nStrings; zh: I18nStrings } = {
  en: {
    title: 'Antigravity Account Pool',
    subtitle: 'Manage multi-account rotation, quota monitoring, and credentials.',
    refresh: 'Refresh',
    loginWithGoogle: 'Login with Google',
    switchLang: '中文',
    accountsList: 'Accounts',
    noAccounts: 'No accounts configured',
    noAccountsHint: 'Click "Login with Google" or import credentials below to get started.',
    activeBadge: 'Active',
    stateActive: 'Healthy',
    stateCooling: 'Cooling Down',
    stateRateLimited: 'Rate Limited',
    stateVerificationRequired: 'Verification Required',
    stateDisabled: 'Disabled',
    project: 'Project',
    defaultProject: 'default',
    activate: 'Set Active',
    verify: 'Verify',
    verifyCta: 'Verify Now',
    testAll: 'Test All Models',
    exportBlob: 'Export Blob',
    fingerprint: 'Fingerprint',
    deleteAccount: 'Delete Account',
    confirmDelete: 'Are you sure you want to delete this account? This action cannot be undone.',
    confirmTestAll: 'Test All will execute real API calls on all models, consuming actual quota. Continue?',
    confirmRegenerateFp: 'Generate a fresh device fingerprint and user agent for this account?',
    quotaTitle: 'Model Quotas',
    quotaUnavailable: 'Quota information unavailable for this account',
    noQuotaReported: 'No quota reported by upstream',
    testModel: 'Test',
    testing: 'Testing...',
    copied: 'Copied to clipboard!',
    importTitle: 'Import Credentials',
    importDesc: 'Paste an agy auth.json token document, or a credential blob (from dsh-agy login --blob). Paste multiple blobs, one per line, for a batch import:',
    importPlaceholder: '{"token":{"access_token":"...","refresh_token":"..."}} or dsh-agy-cred-v1.... (one blob per line for batch)',
    importJson: 'Import JSON',
    importBlobBtn: 'Import Blob',
    importSuccess: 'Successfully imported account: ',
    exportAll: 'Export All',
    importBatchResult: 'Imported {imported}, replaced {replaced}',
    copyAllMsg: 'All credential blobs exported. Copied to clipboard!',
    fingerprintTitle: 'Device Fingerprint',
    fingerprintDevice: 'Device ID',
    fingerprintUserAgent: 'User Agent',
    fingerprintCreated: 'Generated At',
    fingerprintHistory: 'Fingerprint Versions',
    regenerateFp: 'Regenerate Fingerprint',
    copyBlobMsg: 'Credential blob exported. Copied to clipboard!',
    copyFpMsg: 'Device fingerprint details loaded.',
    allModelsOk: 'All model tests passed!',
    modelsTestedSummary: 'Completed testing {total} models: {ok} passed, {failed} failed.',
    loginSuccessTitle: 'Sign-in Successful',
    loginSuccessDesc: 'Your Antigravity account has been authorized and saved.',
    loginFailedTitle: 'Sign-in Failed',
    loginFailedDesc: 'Unable to complete authorization. Error details:',
    windowClosing: 'This window will close automatically in a moment...',
    closeWindow: 'Close Window',
    retryLogin: 'Return to Dashboard',
    resetIn: 'Resets in ',
    resetAt: 'Resets at ',
  },
  zh: {
    title: 'Antigravity 账号池管理',
    subtitle: '多账号智能轮换、配额实时监控与凭据指纹管理。',
    refresh: '刷新',
    loginWithGoogle: 'Google 账号登录',
    switchLang: 'EN',
    accountsList: '账号列表',
    noAccounts: '暂无配置账号',
    noAccountsHint: '点击上方“Google 账号登录”或在下方粘贴凭据以添加账号。',
    activeBadge: '当前使用',
    stateActive: '正常',
    stateCooling: '冷却中',
    stateRateLimited: '已限流',
    stateVerificationRequired: '需要验证',
    stateDisabled: '已禁用',
    project: '项目 ID',
    defaultProject: '默认项目',
    activate: '设为默认',
    verify: '验证账号',
    verifyCta: '立即验证',
    testAll: '测试全部模型',
    exportBlob: '导出凭据 Blob',
    fingerprint: '设备指纹',
    deleteAccount: '删除账号',
    confirmDelete: '确定要删除此账号吗？该操作不可撤销。',
    confirmTestAll: '批量测试将对所有模型发起真实调用并消耗 API 配额，确认继续？',
    confirmRegenerateFp: '确定要为该账号重新生成全新的设备指纹与 User-Agent 吗？',
    quotaTitle: '模型配额池',
    quotaUnavailable: '无法获取该账号的模型配额信息',
    noQuotaReported: '上游未返回配额信息',
    testModel: '测试',
    testing: '测试中...',
    copied: '已复制到剪贴板！',
    importTitle: '导入凭据',
    importDesc: '粘贴 agy auth.json 文件内容，或输入凭据 blob（来自 dsh-agy login --blob）。多个 blob 每行一个即可批量导入：',
    importPlaceholder: '{"token":{"access_token":"...","refresh_token":"..."}} 或 dsh-agy-cred-v1....（批量：每行一个 blob）',
    importJson: '导入 JSON',
    importBlobBtn: '导入 Blob',
    importSuccess: '成功导入账号：',
    exportAll: '导出全部',
    importBatchResult: '导入 {imported} 个，替换 {replaced} 个',
    copyAllMsg: '全部凭据 Blob 已导出并复制到剪贴板！',
    fingerprintTitle: '设备指纹信息',
    fingerprintDevice: '设备 ID (DeviceId)',
    fingerprintUserAgent: '用户代理 (User-Agent)',
    fingerprintCreated: '生成时间',
    fingerprintHistory: '历史版本数',
    regenerateFp: '重新生成指纹',
    copyBlobMsg: '凭据 Blob 已成功导出并复制到剪贴板！',
    copyFpMsg: '设备指纹信息已加载。',
    allModelsOk: '所有模型可用性测试通过！',
    modelsTestedSummary: '完成 {total} 个模型测试：{ok} 个可用，{failed} 个失败。',
    loginSuccessTitle: '授权登录成功',
    loginSuccessDesc: 'Antigravity 账号已成功接入并保存。',
    loginFailedTitle: '授权登录失败',
    loginFailedDesc: '无法完成 OAuth 授权，错误详情：',
    windowClosing: '此窗口即将在 2 秒内自动关闭...',
    closeWindow: '立即关闭窗口',
    retryLogin: '返回控制面板',
    resetIn: '将在 ',
    resetAt: '重置时间：',
  },
}
