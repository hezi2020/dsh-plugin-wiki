import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { normalizeBaseURL, resolveApiKey, resolveWorkspaceFile, saveArtifact } from '../lib/shared.mjs';

test('credential service wins and legacy host is normalized', async () => {
  const ctx = { get: () => ({ resolve: async () => 'sk-unit-secret' }) };
  assert.equal(await resolveApiKey(ctx), 'sk-unit-secret');
  assert.equal(normalizeBaseURL('https://api.u-claw.org/v1/'), 'https://api.u-claw.org.cn/v1');
  assert.throws(() => normalizeBaseURL('https://evil.example/v1'), /未授权主机/);
});

test('workspace sandbox rejects traversal and writes unique artifacts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xiapan-media-'));
  try {
    await writeFile(join(root, 'in.png'), 'x');
    await assert.rejects(resolveWorkspaceFile(root, '../outside.png'), /工作区之外/);
    const file = await resolveWorkspaceFile(root, 'in.png');
    assert.equal(file.size, 1);
    const artifact = await saveArtifact(root, '.dsh-media', 'images', Buffer.from('ok'), 'png');
    assert.match(artifact, /\.dsh-media[\\/]images/);

    const outside = await mkdtemp(join(tmpdir(), 'xiapan-out-'));
    await writeFile(join(outside, 'secret.png'), 'secret');
    try {
      await symlink(join(outside, 'secret.png'), join(root, 'link.png'));
      await assert.rejects(resolveWorkspaceFile(root, 'link.png'), /符号链接/);
    } catch (error) {
      if (!['EPERM', 'EACCES'].includes(error.code)) throw error;
    } finally { await rm(outside, { recursive: true, force: true }); }
  } finally { await rm(root, { recursive: true, force: true }); }
});
