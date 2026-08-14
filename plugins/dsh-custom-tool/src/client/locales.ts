/**
 * Simplified-Chinese dictionary (the key-set source of truth) and its
 * checked-complete English pair, registered into the harness locale service
 * so every string follows the harness language switch.
 */

/** The locale namespace this plugin registers under. */
export const LOCALE_NS = 'dsh-custom-tool'

/** Simplified Chinese dictionary; {name} and {message} are format placeholders. */
export const zh = {
  'nav': '自定义工具',
  'kicker': '自定义工具',
  'title': '自定义工具',
  'subtitle': '用 JavaScript 写你自己的工具；模型可以调用它们，也可以在授权范围内用 custom_tool_create 自己创建。改动即时生效并写入模型提示词。',
  'newTool': '新建工具',
  'empty': '还没有自定义工具。点击右上角的 + 号写一个，或者直接在对话里让模型用 custom_tool_create 创建。',
  'edit': '编辑',
  'enable': '启用',
  'disable': '停用',
  'delete': '删除',
  'cancel': '取消',
  'save': '保存',
  'saving': '保存中…',
  'badge.model': '模型创建',
  'badge.user': '用户创建',
  'badge.workspaceExec': '工作区执行',
  'badge.workspaceLocal': '本工作区',
  'badge.off': '已停用',
  'toolName.label': '工具名',
  'toolName.hint': 'snake_case，例如 weather_lookup；这是注册进模型工具表的名字。',
  'toolName.placeholder': 'weather_lookup',
  'description.label': '描述',
  'description.hint': '模型靠这段文字判断什么时候调用这个工具。',
  'scope.label': '作用域',
  'scope.hint': '全局：纯沙箱（计算 + 网络）。工作区：额外获得限定在本会话 workspace 根目录内的 fs（readFile / writeFile / list），路径越界会被拒绝。',
  'scope.global': '全局',
  'scope.workspace': '工作区',
  'location.label': '存在位置',
  'location.hint': '全局：存在共享设置里，所有 workspace 都可用（像 pdf_read 这类想永久保留的工具）。工作区：只属于当前 workspace。模型创建全局工具时你会在对话中收到授权确认。',
  'location.global': '全局',
  'location.workspace': '工作区',
  'params.label': '参数配置',
  'params.hint': '模型调用时的入参；支持 string / number / integer / boolean / null / object / array、必填与枚举。',
  'code.label': '代码',
  'code.hint': '异步函数体，入参 args（按上面的 schema 提供智能提示）与 env，return 一个 JSON 值。沙箱内可用 fetch / console / TextEncoder / URL / setTimeout 等。',
  'params.empty': '还没有参数。点击「添加参数」，或展开高级模式直接写 JSON Schema。',
  'addParam': '添加参数',
  'param.name.placeholder': '参数名，如 city',
  'param.required': '必填',
  'param.desc.placeholder': '描述（可选）',
  'param.enum.label': '枚举',
  'param.enum.placeholder': '逗号分隔，可选：a, b, c',
  'param.items.label': '元素类型',
  'advanced.open': '高级模式：直接编辑 JSON Schema',
  'advanced.close': '收起高级模式',
  'params.extras': '另有 {count} 个复杂属性（嵌套对象 / oneOf / 非字符串枚举等）只能通过高级模式编辑，已原样保留。',
  'err.saveFailed': '保存失败：{message}',
  'err.schemaParse': '参数 schema 不是合法 JSON：{message}',
  'err.schemaInvalid': '参数 schema：{message}（位置 {path}）',
  'err.codeSyntax': '代码语法错误：{message}',
  'err.descEmpty': '描述不能为空',
  'err.dupName': '工具名 {name} 已存在',
  'err.nameEmpty': '参数名不能为空',
  'err.namePattern': '参数名 {name} 需要以字母或下划线开头，仅含字母、数字、下划线',
  'err.nameDup': '参数名 {name} 重复',
} satisfies Record<string, string>

/** The locale key union for the component `t` seat. */
export type CustomToolKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en: Record<CustomToolKey, string> = {
  'nav': 'Custom Tool',
  'kicker': 'CUSTOM TOOL',
  'title': 'Custom Tool',
  'subtitle': 'Write your own JavaScript tools; the model can call them and create new ones within authorization. Changes apply live and enter the model prompt.',
  'newTool': 'New tool',
  'empty': 'No custom tools yet. Click the + button, or ask the model to create one with custom_tool_create.',
  'edit': 'Edit',
  'enable': 'Enable',
  'disable': 'Disable',
  'delete': 'Delete',
  'cancel': 'Cancel',
  'save': 'Save',
  'saving': 'Saving…',
  'badge.model': 'Model-created',
  'badge.user': 'User-created',
  'badge.workspaceExec': 'Workspace exec',
  'badge.workspaceLocal': 'This workspace',
  'badge.off': 'Disabled',
  'toolName.label': 'Tool name',
  'toolName.hint': 'snake_case, e.g. weather_lookup; the name registered in the model tool table.',
  'toolName.placeholder': 'weather_lookup',
  'description.label': 'Description',
  'description.hint': 'The model reads this to decide when to call the tool.',
  'scope.label': 'Scope',
  'scope.hint': 'Global: pure sandbox (compute + network). Workspace: additionally grants fs (readFile / writeFile / list) confined to the session workspace root; escaping paths are rejected.',
  'scope.global': 'Global',
  'scope.workspace': 'Workspace',
  'location.label': 'Location',
  'location.hint': 'Global: stored in shared settings, available in every workspace (for keepers like pdf_read). Workspace: belongs to the current workspace only. You are asked to authorize it when the model creates a global tool.',
  'location.global': 'Global',
  'location.workspace': 'Workspace',
  'params.label': 'Parameters',
  'params.hint': 'Call arguments; string / number / integer / boolean / null / object / array, required and enum are supported.',
  'code.label': 'Code',
  'code.hint': 'Async function body over args (typed from the schema above) and env; return a JSON value. The sandbox provides fetch / console / TextEncoder / URL / setTimeout and friends.',
  'params.empty': 'No parameters yet. Click Add parameter, or open the advanced mode to write the JSON Schema directly.',
  'addParam': 'Add parameter',
  'param.name.placeholder': 'name, e.g. city',
  'param.required': 'Required',
  'param.desc.placeholder': 'description (optional)',
  'param.enum.label': 'Enum',
  'param.enum.placeholder': 'comma separated, optional: a, b, c',
  'param.items.label': 'Item type',
  'advanced.open': 'Advanced: edit JSON Schema directly',
  'advanced.close': 'Close advanced mode',
  'params.extras': '{count} complex properties (nested objects / oneOf / non-string enums) can only be edited in advanced mode and are preserved as-is.',
  'err.saveFailed': 'Save failed: {message}',
  'err.schemaParse': 'Not valid JSON: {message}',
  'err.schemaInvalid': 'Parameter schema: {message} (at {path})',
  'err.codeSyntax': 'Code syntax error: {message}',
  'err.descEmpty': 'Description is required',
  'err.dupName': 'Tool name {name} already exists',
  'err.nameEmpty': 'Parameter name is required',
  'err.namePattern': 'Parameter name {name} must start with a letter or underscore and contain only letters, digits, and underscores',
  'err.nameDup': 'Parameter name {name} is duplicated',
}

/** Format one dictionary entry, replacing {name}/{message}/{count}/{path} placeholders. */
export function fmt(template: string, values: Record<string, string | number>): string {
  let out = template
  for (const [key, value] of Object.entries(values)) {
    out = out.replaceAll('{' + key + '}', String(value))
  }
  return out
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'dsh-custom-tool': CustomToolKey
  }
}

