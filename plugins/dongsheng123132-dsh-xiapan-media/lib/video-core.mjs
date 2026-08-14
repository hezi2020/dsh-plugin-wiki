import { abortableSleep, download, resolveApiKey, saveArtifact, videoUrlFromPayload, xiapanJson } from './shared.mjs';
import { readWorkspaceFile, mediaTypeFor } from './shared.mjs';

export const VIDEO_MODELS = {
  'doubao-seedance-2-0-mini-260615': { label: 'mini', estimate: '约 ¥2.9 / 5秒 480p' },
  'doubao-seedance-2-0-fast-260128': { label: 'fast', estimate: '约 ¥4.9 / 5秒 480p' },
  'doubao-seedance-2-0-260128': { label: 'full', estimate: '约 ¥6.9 / 5秒 480p' },
};

function taskId(payload) {
  return payload?.id ?? payload?.task_id ?? payload?.data?.id ?? payload?.data?.task_id;
}

function statusOf(payload) {
  return String(payload?.status ?? payload?.data?.status ?? '').toLowerCase();
}

function permanentFailure(error) {
  return /HTTP (400|401|402|403|404)|余额|欠费|quota|insufficient|unauthorized|forbidden|model.*not.*found|参数/i.test(String(error?.message ?? error));
}

async function oneAttempt(ctx, config, args, signal) {
  const body = { model: args.model, prompt: args.prompt, duration: args.duration, resolution: args.resolution };
  if (args.image_path) {
    const file = await readWorkspaceFile(config.workspaceRoot, args.image_path);
    const type = mediaTypeFor(file.path);
    if (!type) throw new Error('视频首帧只支持 PNG、JPEG、WebP、GIF');
    body.image_url = `data:${type};base64,${file.data.toString('base64')}`;
  }
  const submitted = await xiapanJson(ctx, config, '/video/generations', body, { signal, timeoutMs: config.submitTimeoutMs });
  let url = videoUrlFromPayload(submitted);
  const id = taskId(submitted);
  if (!url && !id) throw new Error('虾盘云没有返回视频任务 ID');
  const deadline = Date.now() + config.maxWaitMs;
  let lastStatus = statusOf(submitted) || 'submitted';
  while (!url && Date.now() < deadline) {
    await abortableSleep(config.pollIntervalMs, signal);
    const status = await xiapanJson(ctx, config, `/video/generations/${encodeURIComponent(id)}`, undefined, { method: 'GET', signal, timeoutMs: config.submitTimeoutMs });
    lastStatus = statusOf(status) || lastStatus;
    url = videoUrlFromPayload(status);
    if (['failed', 'error', 'cancelled', 'canceled'].includes(lastStatus)) throw new Error(`视频生成失败，状态：${lastStatus}`);
  }
  if (!url) throw new Error(`视频生成等待超时，最后状态：${lastStatus}，任务 ID：${id}`);
  const key = await resolveApiKey(ctx, config.credentialRef);
  const loaded = await download(url, { signal, timeoutMs: config.downloadTimeoutMs, authorization: key });
  const extension = /webm/i.test(loaded.contentType) ? 'webm' : 'mp4';
  const path = await saveArtifact(config.workspaceRoot, config.artifactDir, 'videos', loaded.data, extension);
  return { path, taskId: id, status: lastStatus };
}

export async function generateVideo(ctx, config, args, signal) {
  const errors = [];
  for (let attempt = 0; attempt <= args.retries; attempt++) {
    try {
      return { ...(await oneAttempt(ctx, config, args, signal)), attempts: attempt + 1 };
    } catch (error) {
      errors.push(String(error?.message ?? error));
      if (signal?.aborted || permanentFailure(error) || attempt >= args.retries) throw new Error(`视频生成失败（尝试 ${attempt + 1} 次）：${errors.at(-1)}`);
    }
  }
  throw new Error('视频生成失败');
}
