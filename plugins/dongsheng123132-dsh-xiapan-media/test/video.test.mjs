import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateVideo } from '../lib/video-core.mjs';

test('Seedance task is polled, downloaded, and persisted', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'xiapan-video-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls++;
    if (String(url).endsWith('/video/generations')) return new Response(JSON.stringify({ id: 'task-1', status: 'queued' }), { status: 200 });
    if (String(url).includes('/video/generations/task-1')) return new Response(JSON.stringify({ status: 'succeeded', video_url: 'https://cdn.example/video.mp4' }), { status: 200 });
    return new Response(Buffer.from('fake-video'), { status: 200, headers: { 'content-type': 'video/mp4' } });
  });
  const ctx = { get: () => ({ resolve: async () => 'sk-test-key' }) };
  const config = { baseURL: 'https://api.u-claw.org.cn/v1', credentialRef: 'TEST', workspaceRoot: root, artifactDir: '.dsh-media', submitTimeoutMs: 1000, downloadTimeoutMs: 1000, pollIntervalMs: 0, maxWaitMs: 1000 };
  const result = await generateVideo(ctx, config, { prompt: '海浪', model: 'doubao-seedance-2-0-mini-260615', duration: 5, resolution: '480p', retries: 0 });
  assert.equal(calls, 3);
  assert.equal(result.taskId, 'task-1');
  assert.equal(result.attempts, 1);
  assert.equal((await readFile(result.path)).toString(), 'fake-video');
});
