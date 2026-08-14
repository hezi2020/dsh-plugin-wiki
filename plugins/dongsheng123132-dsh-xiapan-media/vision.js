import z from 'schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { analyzeWorkspaceImage, transcribeMessages } from './lib/vision-core.mjs';

export const name = 'dsh-xiapan-vision';
export const inject = ['llm', 'attachments', 'tools'];

export const Config = z.object({
  providerId: z.string().default('xiapan-vision').description('在 DSH 模型选择器中显示的视觉代理路由'),
  innerProvider: z.string().default('uking-managed').description('真正负责思考和回答的文本模型路由'),
  baseURL: z.string().default('https://api.u-claw.org.cn/v1'),
  credentialRef: z.string().default('UKING_DSH_API_KEY').description('DSH 凭据引用；密钥不会写入插件配置'),
  model: z.string().default('qwen3.7-flash').description('负责 OCR/看图的虾盘云模型'),
  maxTokens: z.number().min(256).max(32768).default(4096),
  timeoutMs: z.number().min(1000).max(300000).default(120000),
  workspaceRoot: z.string().default('.'),
  marker: z.string().default('[虾盘云图片转译]'),
  cacheSize: z.number().min(1).max(1000).default(200),
});

const output = {
  schema: { type: 'json' },
  render: (_args, value) => [{ type: 'text', text: value.text }],
};

export function createDefinitions(ctx, config) {
  const run = (prompt) => defineTool({
    name: prompt.name,
    description: prompt.description,
    parameters: {
      path: { type: 'string', required: true, description: '工作区内的图片路径，支持 PNG/JPEG/WebP/GIF。' },
      question: { type: 'string', description: '希望模型重点回答的问题；省略则完整描述/OCR。' },
    },
    output,
    timeoutMs: config.timeoutMs + 5000,
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const text = await analyzeWorkspaceImage(ctx, config, args.path, args.question || prompt.defaultPrompt, exec.signal);
      return { text, model: config.model };
    },
  });
  return [
    run({ name: 'xiapan_vision_analyze', description: '用虾盘云视觉模型理解工作区图片，可描述画面、读图表、分析截图。', defaultPrompt: '请准确、完整地描述这张图片，并回答其中最重要的信息。' }),
    run({ name: 'xiapan_vision_ocr', description: '用虾盘云视觉模型提取工作区图片里的全部文字，并尽量保留版面结构。', defaultPrompt: '请逐字提取所有可见文字，保留原语言、段落、表格和层级；不确定处明确标注。' }),
    run({ name: 'xiapan_vision_locate', description: '定位工作区截图中的控件、文字或视觉元素，返回相对位置与辨识依据。', defaultPrompt: '请列出主要控件/元素、可见文字和它们在图片中的相对位置；不要编造像素坐标。' }),
  ];
}

export function apply(ctx, supplied = {}) {
  const config = {
    providerId: supplied.providerId ?? 'xiapan-vision',
    innerProvider: supplied.innerProvider ?? 'uking-managed',
    baseURL: supplied.baseURL ?? 'https://api.u-claw.org.cn/v1',
    credentialRef: supplied.credentialRef ?? 'UKING_DSH_API_KEY',
    model: supplied.model ?? 'qwen3.7-flash',
    maxTokens: supplied.maxTokens ?? 4096,
    timeoutMs: supplied.timeoutMs ?? 120000,
    workspaceRoot: supplied.workspaceRoot ?? process.cwd(),
    marker: supplied.marker ?? '[虾盘云图片转译]',
    cacheSize: supplied.cacheSize ?? 200,
  };
  for (const definition of createDefinitions(ctx, config)) ctx.tools.register(definition);

  let inner;
  try {
    inner = ctx.llm.registration(config.innerProvider)?.adapter;
  } catch {
    // DSH throws NO_ADAPTER for an unknown route. Keep the standalone vision
    // tools available instead of making the whole bundle fail to boot.
    inner = undefined;
  }
  if (!inner) {
    ctx.logger?.error?.(`dsh-xiapan-vision: 找不到文本路由 "${config.innerProvider}"；三个看图工具仍可用，但自动粘贴识图路由未启用。`);
    return;
  }
  const cache = new Map();
  const proxy = {
    providerInfo: (provider) => ({ id: provider, name: 'U-King DeepSeek + 虾盘云识图' }),
    providerRetryPolicy: () => inner.providerRetryPolicy?.(config.innerProvider),
    listModels: async () => (await inner.listModels(config.innerProvider)).map((model) => ({ ...model, provider: config.providerId, inputModalities: ['text', 'image'] })),
    resolveModel: async (_provider, model, signal) => ({
      ...(await inner.resolveModel(config.innerProvider, model, signal)),
      provider: config.providerId,
      inputModalities: ['text', 'image'],
    }),
    stream: async function* (options) {
      const messages = await transcribeMessages(ctx, config, options.messages, options.signal, cache);
      yield* inner.stream({ ...options, provider: config.innerProvider, messages });
    },
  };
  ctx.llm.registerAdapter([config.providerId], proxy);
  ctx.logger?.info?.(`dsh-xiapan-vision: 已注册 "${config.providerId}"，视觉模型 ${config.model}，文本脑 ${config.innerProvider}；密钥只按凭据引用解析。`);
}
