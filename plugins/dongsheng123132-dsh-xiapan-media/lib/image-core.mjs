import { Blob } from 'node:buffer';
import { download, imageFromPayload, mediaTypeFor, readWorkspaceFile, saveArtifact, xiapanJson, xiapanMultipart } from './shared.mjs';

function extensionFromType(type, fallback = 'png') {
  if (/jpeg/i.test(type)) return 'jpg';
  if (/webp/i.test(type)) return 'webp';
  return fallback;
}

export async function generateImages(ctx, config, args, signal) {
  let payload;
  if (args.reference_paths?.length) {
    const form = new FormData();
    form.set('model', config.model);
    form.set('prompt', args.prompt);
    form.set('size', args.size);
    form.set('n', String(args.count));
    form.set('quality', args.quality);
    for (const path of args.reference_paths) {
      const file = await readWorkspaceFile(config.workspaceRoot, path);
      const type = mediaTypeFor(file.path);
      if (!type) throw new Error(`参考图格式不支持：${path}`);
      form.append('image', new Blob([file.data], { type }), path.split(/[\\/]/).pop());
    }
    payload = await xiapanMultipart(ctx, config, '/images/edits', form, { signal, timeoutMs: config.timeoutMs });
  } else {
    payload = await xiapanJson(ctx, config, '/images/generations', {
      model: config.model, prompt: args.prompt, size: args.size, n: args.count, quality: args.quality, response_format: 'b64_json',
    }, { signal, timeoutMs: config.timeoutMs });
  }
  const items = Array.isArray(payload?.data) ? payload.data : [];
  if (!items.length) throw new Error('虾盘云没有返回图片');
  const paths = [];
  for (const item of items) {
    const image = imageFromPayload(item);
    const loaded = image.kind === 'data' ? { data: image.data, contentType: 'image/png' } : await download(image.url, { signal });
    paths.push(await saveArtifact(config.workspaceRoot, config.artifactDir, 'images', loaded.data, extensionFromType(loaded.contentType)));
  }
  return paths;
}
