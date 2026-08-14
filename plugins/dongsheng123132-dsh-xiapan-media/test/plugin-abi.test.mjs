import test from 'node:test';
import assert from 'node:assert/strict';
import * as vision from '../vision.js';
import * as image from '../image.js';
import * as video from '../video.js';

test('all entrypoints expose Cordis metadata and register native tools', async () => {
  for (const plugin of [vision, image, video]) {
    assert.equal(typeof plugin.apply, 'function');
    assert.equal(plugin.default, undefined);
    assert.ok(Array.isArray(plugin.inject));
  }
  const registered = [];
  const listeners = [];
  const basic = { tools: { register: (tool) => registered.push(tool) }, on: (...args) => listeners.push(args) };
  image.apply(basic, { requireApproval: true });
  video.apply(basic, { requireApproval: true });
  assert.deepEqual(registered.map((tool) => tool.name), ['xiapan_image_generate', 'xiapan_video_generate']);
  assert.equal(listeners.length, 2);
  assert.equal((await listeners[0][1]({ name: 'xiapan_image_generate', arguments: {} }, async () => ({ kind: 'allow' }))).kind, 'ask');
});

test('vision provider advertises image input but delegates text to the inner route', async () => {
  const tools = [];
  let proxy;
  let delegated;
  const inner = {
    providerRetryPolicy: (provider) => ({ provider }),
    listModels: async (provider) => [{ provider, id: 'deepseek-v4-flash', name: 'DeepSeek' }],
    resolveModel: async (provider, model) => ({ provider, id: model, name: model }),
    stream: async function* (options) { delegated = options; yield { type: 'finish', reason: 'stop' }; },
  };
  const ctx = {
    tools: { register: (tool) => tools.push(tool) },
    llm: {
      registration: (provider) => provider === 'uking-managed' ? { adapter: inner } : undefined,
      registerAdapter: (_providers, adapter) => { proxy = adapter; },
    },
    logger: { info() {}, error() {} },
  };
  vision.apply(ctx, { innerProvider: 'uking-managed', providerId: 'xiapan-vision' });
  assert.equal(tools.length, 3);
  assert.deepEqual((await proxy.listModels())[0].inputModalities, ['text', 'image']);
  assert.equal((await proxy.resolveModel('xiapan-vision', 'deepseek-v4-flash')).provider, 'xiapan-vision');
  for await (const _chunk of proxy.stream({ provider: 'xiapan-vision', model: 'deepseek-v4-flash', messages: [] })) {}
  assert.equal(delegated.provider, 'uking-managed');
});
