import { readFile, realpath, stat, mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

const XIAPAN_HOSTS = new Set(['api.u-claw.org.cn', 'api.u-claw.org']);
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_JSON_BYTES = 4 * 1024 * 1024;
const MAX_DOWNLOAD_BYTES = 200 * 1024 * 1024;

export function normalizeBaseURL(value = 'https://api.u-claw.org.cn/v1') {
  const fixed = String(value).replace('https://api.u-claw.org/', 'https://api.u-claw.org.cn/').replace(/\/+$/, '');
  const url = new URL(fixed);
  if (url.protocol !== 'https:') throw new Error('虾盘云地址必须使用 HTTPS');
  if (!XIAPAN_HOSTS.has(url.hostname)) throw new Error(`拒绝把虾盘云凭据发送到未授权主机：${url.hostname}`);
  return url.toString().replace(/\/$/, '');
}

export function redact(value) {
  return String(value ?? '').replace(/\b(?:sk|xp|uk)[-_][A-Za-z0-9_-]{8,}\b/gi, '[REDACTED]');
}

export async function resolveApiKey(ctx, credentialRef = 'UKING_DSH_API_KEY') {
  const credentials = ctx?.get?.('credentials') ?? ctx?.credentials;
  if (credentials?.resolve) {
    const resolved = await credentials.resolve(credentialRef);
    if (typeof resolved === 'string' && resolved.trim()) return resolved.trim();
    if (resolved && typeof resolved.value === 'string' && resolved.value.trim()) return resolved.value.trim();
  }
  for (const name of [credentialRef, 'XIAPAN_API_KEY']) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  try {
    const device = JSON.parse(await readFile(join(homedir(), '.uking', 'device.json'), 'utf8'));
    for (const field of ['apiKey', 'api_key', 'token', 'key']) {
      if (typeof device?.[field] === 'string' && device[field].trim()) return device[field].trim();
    }
  } catch {}
  throw new Error('没有找到虾盘云 API Key。请在 U-King 登录/充值，或设置 DSH 凭据 UKING_DSH_API_KEY。');
}

function inside(root, target) {
  const rel = relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

export async function resolveWorkspaceFile(workspaceRoot, input, options = {}) {
  if (typeof input !== 'string' || input.trim() === '') throw new Error('文件路径不能为空');
  const root = await realpath(resolve(workspaceRoot || '.'));
  const candidate = resolve(root, input);
  if (!inside(root, candidate)) throw new Error('拒绝访问工作区之外的文件');
  const actual = await realpath(candidate);
  if (!inside(root, actual)) throw new Error('拒绝通过符号链接访问工作区之外的文件');
  const info = await stat(actual);
  if (!info.isFile()) throw new Error('目标不是普通文件');
  if (info.size > (options.maxBytes ?? MAX_INPUT_BYTES)) throw new Error(`文件过大：最大 ${options.maxBytes ?? MAX_INPUT_BYTES} 字节`);
  return { root, path: actual, size: info.size };
}

export async function readWorkspaceFile(workspaceRoot, input, options) {
  const file = await resolveWorkspaceFile(workspaceRoot, input, options);
  return { ...file, data: await readFile(file.path) };
}

export function mediaTypeFor(path) {
  const ext = extname(path).toLowerCase();
  return ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' })[ext];
}

export async function saveArtifact(workspaceRoot, artifactDir, category, data, extension) {
  const root = await realpath(resolve(workspaceRoot || '.'));
  const targetDir = resolve(root, artifactDir || '.dsh-media', category);
  if (!inside(root, targetDir)) throw new Error('产物目录必须位于工作区内');
  await mkdir(targetDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const finalPath = join(targetDir, `${stamp}-${randomUUID().slice(0, 8)}.${extension.replace(/^\./, '')}`);
  const tempPath = join(targetDir, `.${basename(finalPath)}.tmp`);
  try {
    await writeFile(tempPath, data, { flag: 'wx' });
    await rename(tempPath, finalPath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
  return finalPath;
}

function combinedSignal(signal, timeoutMs) {
  return AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])]);
}

export async function requestJson(url, init = {}, options = {}) {
  const response = await fetch(url, { ...init, signal: combinedSignal(options.signal, options.timeoutMs ?? 120_000) });
  const length = Number(response.headers.get('content-length') ?? 0);
  if (length > (options.maxBytes ?? MAX_JSON_BYTES)) throw new Error('服务端响应过大');
  const body = await response.text();
  if (Buffer.byteLength(body) > (options.maxBytes ?? MAX_JSON_BYTES)) throw new Error('服务端响应过大');
  if (!response.ok) throw new Error(`虾盘云请求失败（HTTP ${response.status}）：${redact(body.slice(0, 500))}`);
  try { return JSON.parse(body); } catch { throw new Error(`虾盘云返回了非 JSON 响应：${redact(body.slice(0, 200))}`); }
}

export async function xiapanJson(ctx, config, pathname, body, options = {}) {
  const baseURL = normalizeBaseURL(config.baseURL);
  const key = await resolveApiKey(ctx, config.credentialRef);
  return requestJson(`${baseURL}${pathname}`, {
    method: options.method ?? 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  }, { signal: options.signal, timeoutMs: options.timeoutMs ?? config.timeoutMs });
}

export async function xiapanMultipart(ctx, config, pathname, form, options = {}) {
  const baseURL = normalizeBaseURL(config.baseURL);
  const key = await resolveApiKey(ctx, config.credentialRef);
  return requestJson(`${baseURL}${pathname}`, {
    method: 'POST', headers: { authorization: `Bearer ${key}` }, body: form,
  }, { signal: options.signal, timeoutMs: options.timeoutMs ?? config.timeoutMs });
}

export async function download(url, options = {}) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('拒绝下载非 HTTPS 产物');
  const headers = options.authorization && XIAPAN_HOSTS.has(parsed.hostname)
    ? { authorization: `Bearer ${options.authorization}` }
    : undefined;
  const response = await fetch(parsed, { headers, redirect: 'follow', signal: combinedSignal(options.signal, options.timeoutMs ?? 300_000) });
  if (!response.ok) throw new Error(`产物下载失败（HTTP ${response.status}）`);
  const length = Number(response.headers.get('content-length') ?? 0);
  if (length > (options.maxBytes ?? MAX_DOWNLOAD_BYTES)) throw new Error('产物超过下载大小上限');
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length > (options.maxBytes ?? MAX_DOWNLOAD_BYTES)) throw new Error('产物超过下载大小上限');
  return { data, contentType: response.headers.get('content-type') ?? '' };
}

export function imageFromPayload(item) {
  const b64 = item?.b64_json ?? item?.b64 ?? item?.data;
  if (typeof b64 === 'string' && b64.length > 0) return { kind: 'data', data: Buffer.from(b64, 'base64') };
  if (typeof item?.url === 'string' && item.url) return { kind: 'url', url: item.url };
  throw new Error('虾盘云返回的图片中没有 b64_json 或 url');
}

export function videoUrlFromPayload(payload) {
  const value = payload?.result_url ?? payload?.video_url ?? payload?.url ?? payload?.data?.result_url ?? payload?.data?.video_url ?? payload?.data?.url ?? payload?.output?.result_url ?? payload?.output?.video_url;
  return typeof value === 'string' && value ? value : undefined;
}

export function abortableSleep(ms, signal) {
  return new Promise((resolvePromise, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new Error('操作已取消'));
    const timer = setTimeout(resolvePromise, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason ?? new Error('操作已取消')); }, { once: true });
  });
}

export const limits = { MAX_INPUT_BYTES, MAX_JSON_BYTES, MAX_DOWNLOAD_BYTES };
