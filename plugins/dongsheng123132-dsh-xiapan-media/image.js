import z from 'schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { generateImages } from './lib/image-core.mjs';

export const name = 'dsh-xiapan-image';
export const inject = ['tools'];

export const Config = z.object({
  baseURL: z.string().default('https://api.u-claw.org.cn/v1'),
  credentialRef: z.string().default('UKING_DSH_API_KEY'),
  model: z.string().default('gpt-image-2'),
  workspaceRoot: z.string().default('.'),
  artifactDir: z.string().default('.dsh-media'),
  timeoutMs: z.number().min(1000).max(900000).default(300000),
  requireApproval: z.boolean().default(true).description('每次调用付费作图前要求 DSH 用户批准'),
});

function normalize(args) {
  const count = args.count ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > 4) throw new Error('count 必须是 1 到 4 的整数');
  return {
    prompt: args.prompt,
    size: args.size ?? '1024x1024',
    count,
    quality: args.quality ?? 'high',
    reference_paths: args.reference_paths ?? [],
  };
}

export function createDefinition(ctx, config) {
  return defineTool({
    name: 'xiapan_image_generate',
    description: '调用虾盘云 gpt-image-2 生成或编辑图片。返回工作区内的真实图片文件路径；会消耗虾盘云额度。',
    parameters: {
      prompt: { type: 'string', required: true, description: '清晰、具体的作图或改图要求。' },
      size: { type: 'string', description: '图片尺寸，例如 1024x1024、1536x1024。默认 1024x1024。' },
      count: { type: 'integer', description: '生成数量，1-4，默认 1。' },
      quality: { type: 'string', description: '质量档位，默认 high。' },
      reference_paths: { type: 'array', items: { type: 'string' }, description: '可选：工作区内参考图路径；提供后自动走图片编辑接口。' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: `已生成 ${value.paths.length} 张图片：\n${value.paths.join('\n')}` }],
    },
    timeoutMs: config.timeoutMs + 5000,
    isConcurrencySafe: () => false,
    async execute(args, exec) {
      const normalized = normalize(args);
      const paths = await generateImages(ctx, config, normalized, exec.signal);
      return { ok: true, model: config.model, paths };
    },
  });
}

export function apply(ctx, supplied = {}) {
  const config = {
    baseURL: supplied.baseURL ?? 'https://api.u-claw.org.cn/v1',
    credentialRef: supplied.credentialRef ?? 'UKING_DSH_API_KEY',
    model: supplied.model ?? 'gpt-image-2',
    workspaceRoot: supplied.workspaceRoot ?? process.cwd(),
    artifactDir: supplied.artifactDir ?? '.dsh-media',
    timeoutMs: supplied.timeoutMs ?? 300000,
    requireApproval: supplied.requireApproval ?? true,
  };
  ctx.tools.register(createDefinition(ctx, config));
  if (config.requireApproval) ctx.on('tools/pre-execute', async (exec, next) => {
    if (exec.name !== 'xiapan_image_generate') return next();
    const count = exec.arguments?.count ?? 1;
    return { kind: 'ask', reason: `将调用虾盘云付费作图（${config.model}，${count} 张）。确认后才会消耗余额。` };
  });
}
