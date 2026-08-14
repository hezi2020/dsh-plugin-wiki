import { createHash } from 'node:crypto';
import { mediaTypeFor, readWorkspaceFile, xiapanJson } from './shared.mjs';

export const TRANSCRIBE_PROMPT = `你是图片到文本的精确转译器。接收者是看不到原图的文本模型。请输出：
1. 图片里所有可见文字，保持原语言并尽量逐字 OCR；
2. 布局、层级、表格、图表及数据；
3. 人物、物体、颜色、图标、界面控件、错误信息等重要视觉细节；
4. 对后续回答用户问题有帮助的上下文。
只输出转译结果，不要写开场白，不确定处明确标注。`;

function textContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) return content.map((part) => part?.text ?? '').filter(Boolean).join('\n').trim();
  return '';
}

export async function analyzeBytes(ctx, config, data, mediaType, prompt, signal) {
  const payload = await xiapanJson(ctx, config, '/chat/completions', {
    model: config.model,
    max_tokens: config.maxTokens,
    messages: [{ role: 'user', content: [
      { type: 'image_url', image_url: { url: `data:${mediaType};base64,${Buffer.from(data).toString('base64')}` } },
      { type: 'text', text: prompt || TRANSCRIBE_PROMPT },
    ] }],
  }, { signal, timeoutMs: config.timeoutMs });
  const text = textContent(payload);
  if (!text) throw new Error('视觉模型没有返回文本');
  return text;
}

export async function analyzeWorkspaceImage(ctx, config, path, prompt, signal) {
  const file = await readWorkspaceFile(config.workspaceRoot, path);
  const mediaType = mediaTypeFor(file.path);
  if (!mediaType) throw new Error('只支持 PNG、JPEG、WebP、GIF 图片');
  return analyzeBytes(ctx, config, file.data, mediaType, prompt, signal);
}

export function hasImage(content) {
  return Array.isArray(content) && content.some((block) => block?.type === 'image' || (block?.type === 'tool-result' && hasImage(block.content)));
}

export async function transcribeBlocks(ctx, config, blocks, signal, cache) {
  const output = [];
  for (const block of blocks) {
    if (block?.type === 'image') {
      const stored = await (ctx.get?.('attachments') ?? ctx.attachments).readImage(block.attachment, signal);
      const hash = createHash('sha256').update(stored.data).digest('hex');
      let text = cache.get(hash);
      if (!text) {
        text = await analyzeBytes(ctx, config, stored.data, stored.ref.mediaType, TRANSCRIBE_PROMPT, signal);
        if (cache.size >= (config.cacheSize ?? 200)) cache.delete(cache.keys().next().value);
        cache.set(hash, text);
      }
      output.push({ type: 'text', text: `${config.marker}\n${text}` });
    } else if (block?.type === 'tool-result' && hasImage(block.content)) {
      output.push({ ...block, content: await transcribeBlocks(ctx, config, block.content, signal, cache) });
    } else output.push(block);
  }
  return output;
}

export async function transcribeMessages(ctx, config, messages, signal, cache) {
  const output = [];
  for (const message of messages) {
    output.push(hasImage(message.content) ? { ...message, content: await transcribeBlocks(ctx, config, message.content, signal, cache) } : message);
  }
  return output;
}
