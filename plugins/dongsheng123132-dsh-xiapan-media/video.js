import z from 'schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { generateVideo, VIDEO_MODELS } from './lib/video-core.mjs';

export const name = 'dsh-xiapan-video';
export const inject = ['tools'];

export const Config = z.object({
  baseURL: z.string().default('https://api.u-claw.org.cn/v1'),
  credentialRef: z.string().default('UKING_DSH_API_KEY'),
  model: z.string().default('doubao-seedance-2-0-mini-260615'),
  workspaceRoot: z.string().default('.'),
  artifactDir: z.string().default('.dsh-media'),
  submitTimeoutMs: z.number().min(1000).max(300000).default(120000),
  downloadTimeoutMs: z.number().min(1000).max(900000).default(300000),
  pollIntervalMs: z.number().min(1000).max(60000).default(5000),
  maxWaitMs: z.number().min(60000).max(3600000).default(1200000),
  requireApproval: z.boolean().default(true).description('每次调用付费视频生成前要求 DSH 用户批准'),
});

function normalize(args, config) {
  const duration = args.duration ?? 5;
  if (!Number.isInteger(duration) || duration < 5 || duration > 15) throw new Error('duration 必须是 5 到 15 秒的整数');
  const resolution = args.resolution ?? '480p';
  if (!['480p', '720p', '1080p'].includes(resolution)) throw new Error('resolution 只支持 480p、720p、1080p');
  const model = args.model ?? config.model;
  if (!VIDEO_MODELS[model]) throw new Error(`不支持的视频模型：${model}`);
  const retries = args.retries ?? 2;
  if (!Number.isInteger(retries) || retries < 0 || retries > 5) throw new Error('retries 必须是 0 到 5 的整数');
  return { prompt: args.prompt, model, duration, resolution, image_path: args.image_path, retries };
}

export function createDefinition(ctx, config) {
  return defineTool({
    name: 'xiapan_video_generate',
    description: '调用虾盘云 Seedance 文生视频或图生视频，轮询到完成并保存为工作区文件；会消耗虾盘云额度。',
    parameters: {
      prompt: { type: 'string', required: true, description: '场景、镜头、动作、风格和节奏要求。' },
      model: { type: 'string', description: 'Seedance 模型；默认 mini，可选 fast/full 的完整模型 ID。' },
      duration: { type: 'integer', description: '时长 5-15 秒，默认 5。' },
      resolution: { type: 'string', description: '480p、720p 或 1080p，默认 480p。' },
      image_path: { type: 'string', description: '可选：工作区内首帧/参考图路径；提供后走图生视频。' },
      retries: { type: 'integer', description: '上游临时失败时重试次数，0-5，默认 2；鉴权、余额、参数错误不重试。' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: `视频已生成：${value.path}${value.taskId ? `\n任务 ID：${value.taskId}` : ''}` }],
    },
    timeoutMs: config.maxWaitMs + config.downloadTimeoutMs + 10000,
    isConcurrencySafe: () => false,
    async execute(args, exec) {
      const normalized = normalize(args, config);
      const result = await generateVideo(ctx, config, normalized, exec.signal);
      return { ok: true, model: normalized.model, ...result };
    },
  });
}

export function apply(ctx, supplied = {}) {
  const config = {
    baseURL: supplied.baseURL ?? 'https://api.u-claw.org.cn/v1',
    credentialRef: supplied.credentialRef ?? 'UKING_DSH_API_KEY',
    model: supplied.model ?? 'doubao-seedance-2-0-mini-260615',
    workspaceRoot: supplied.workspaceRoot ?? process.cwd(),
    artifactDir: supplied.artifactDir ?? '.dsh-media',
    submitTimeoutMs: supplied.submitTimeoutMs ?? 120000,
    downloadTimeoutMs: supplied.downloadTimeoutMs ?? 300000,
    pollIntervalMs: supplied.pollIntervalMs ?? 5000,
    maxWaitMs: supplied.maxWaitMs ?? 1200000,
    requireApproval: supplied.requireApproval ?? true,
  };
  ctx.tools.register(createDefinition(ctx, config));
  if (config.requireApproval) ctx.on('tools/pre-execute', async (exec, next) => {
    if (exec.name !== 'xiapan_video_generate') return next();
    const model = exec.arguments?.model ?? config.model;
    const duration = exec.arguments?.duration ?? 5;
    const resolution = exec.arguments?.resolution ?? '480p';
    const retries = exec.arguments?.retries ?? 2;
    const estimate = VIDEO_MODELS[model]?.estimate ?? '按虾盘云实时价格计费';
    return { kind: 'ask', reason: `将调用虾盘云付费视频生成（${model}，${duration} 秒，${resolution}；${estimate}；临时失败最多重试 ${retries} 次）。确认后才会消耗余额。` };
  });
}
