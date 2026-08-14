import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateImages } from '../lib/image-core.mjs';

test('gpt-image-2 base64 response is persisted inside workspace', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'xiapan-image-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    const request = JSON.parse(init.body);
    assert.equal(request.model, 'gpt-image-2');
    return new Response(JSON.stringify({ data: [{ b64_json: Buffer.from('fake-png').toString('base64') }] }), { status: 200 });
  });
  const ctx = { get: () => ({ resolve: async () => 'sk-test-key' }) };
  const config = { baseURL: 'https://api.u-claw.org.cn/v1', credentialRef: 'TEST', model: 'gpt-image-2', workspaceRoot: root, artifactDir: '.dsh-media', timeoutMs: 1000 };
  const paths = await generateImages(ctx, config, { prompt: '一只虾', size: '1024x1024', count: 1, quality: 'high', reference_paths: [] });
  assert.equal(paths.length, 1);
  assert.equal((await readFile(paths[0])).toString(), 'fake-png');
});
