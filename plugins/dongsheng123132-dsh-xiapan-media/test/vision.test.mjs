import test from 'node:test';
import assert from 'node:assert/strict';
import { transcribeMessages } from '../lib/vision-core.mjs';

test('image blocks are transcribed recursively and cached by content', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    calls++;
    assert.match(init.headers.authorization, /^Bearer /);
    return new Response(JSON.stringify({ choices: [{ message: { content: '按钮：确定，位于右下角' } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  const attachments = { readImage: async () => ({ data: Buffer.from('same-image'), ref: { mediaType: 'image/png' } }) };
  const ctx = { get: (name) => name === 'attachments' ? attachments : { resolve: async () => 'sk-test-key' } };
  const config = { baseURL: 'https://api.u-claw.org.cn/v1', credentialRef: 'TEST', model: 'qwen3.7-flash', maxTokens: 1000, timeoutMs: 1000, marker: '[图]', cacheSize: 10 };
  const messages = [{ role: 'user', content: [{ type: 'image', attachment: { id: 'a' } }, { type: 'tool-result', content: [{ type: 'image', attachment: { id: 'b' } }] }] }];
  const out = await transcribeMessages(ctx, config, messages, undefined, new Map());
  assert.equal(calls, 1);
  assert.equal(out[0].content[0].type, 'text');
  assert.match(out[0].content[0].text, /按钮：确定/);
  assert.equal(out[0].content[1].content[0].type, 'text');
});
