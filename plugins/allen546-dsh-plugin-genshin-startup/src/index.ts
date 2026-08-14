import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

export interface Context {
  server?: any;
  router?: any;
  web?: any;
  logger?: (name: string) => {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };
  on?: (event: string, callback: (...args: any[]) => void) => void;
}

export interface GenshinStartupConfig {
  /** Video file path or custom URL */
  videoUrl?: string;
  /** Background fill color for letterbox / pillarbox areas (default: #ffffff) */
  fillColor?: string;
  /** Automatically request fullscreen on start / first click (default: true) */
  autoFullscreen?: boolean;
  /** Allow user to skip video via Escape, Space or Skip button (default: true) */
  skippable?: boolean;
  /** Play only once per browser session (default: false) */
  playOncePerSession?: boolean;
}

export const name = 'dsh-plugin-genshin-startup';

export const defaultConfig: GenshinStartupConfig = {
  videoUrl: '/dsh-genshin-assets/genshin-launch.mp4',
  fillColor: '#ffffff',
  autoFullscreen: true,
  skippable: true,
  playOncePerSession: false,
};

function getAssetsDir(): string {
  try {
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFilePath);
    return path.resolve(currentDir, '../assets');
  } catch {
    return path.resolve(process.cwd(), 'assets');
  }
}

/**
 * Cordis plugin entry point for DeepSeek Harness (dsh)
 */
export function apply(ctx: Context, config: GenshinStartupConfig = {}) {
  const cfg: GenshinStartupConfig = { ...defaultConfig, ...config };
  const assetsDir = getAssetsDir();

  // Detect server / router service on context
  const server = ctx.server || ctx.router || ctx.web;

  if (server) {
    // Register static asset endpoints for the Genshin launch assets
    registerStaticAssets(server, assetsDir, cfg);

    // Inject startup script & stylesheet into the Web UI HTML template if middleware is supported
    injectWebUI(server, cfg);
  }

  if (typeof ctx.on === 'function') {
    ctx.on('ready', () => {
      ctx.logger?.('genshin-startup')?.info('DeepSeek Harness Genshin Startup Plugin initialized successfully.');
    });
  }
}

function registerStaticAssets(server: any, assetsDir: string, _config: GenshinStartupConfig) {
  // Koa / Express / Hono / Polka / Node HTTP compatibility
  if (typeof server.get === 'function') {
    // Express / Koa-Router style
    server.get('/dsh-genshin-assets/:file', (req: any, res: any) => {
      const fileName = path.basename(req.params?.file || req.url);
      serveFile(res, path.join(assetsDir, fileName));
    });
  } else if (typeof server.use === 'function') {
    // Middleware style
    server.use(async (ctxOrReq: any, nextOrRes: any) => {
      const url = ctxOrReq.url || ctxOrReq.path || '';
      if (url.startsWith('/dsh-genshin-assets/')) {
        const fileName = path.basename(url);
        const filePath = path.join(assetsDir, fileName);
        if (ctxOrReq.response && typeof ctxOrReq.type === 'string') {
          // Koa style
          return serveKoa(ctxOrReq, filePath);
        } else {
          // Express / Connect style
          return serveFile(nextOrRes, filePath);
        }
      }
      if (typeof nextOrRes === 'function') {
        return nextOrRes();
      }
    });
  }
}

function injectWebUI(server: any, config: GenshinStartupConfig) {
  const configScript = `<script>window.__DSH_GENSHIN_CONFIG__ = ${JSON.stringify(config)};</script>`;
  const styleLink = `<link rel="stylesheet" href="/dsh-genshin-assets/genshin-launch.css">`;
  const scriptTag = `<script defer src="/dsh-genshin-assets/genshin-launch.js"></script>`;
  const injectionSnippet = `\n<!-- DeepSeek Harness Genshin Startup Plugin -->\n${configScript}\n${styleLink}\n${scriptTag}\n`;

  if (typeof server.use === 'function') {
    server.use(async (reqOrCtx: any, resOrNext: any) => {
      if (typeof resOrNext === 'function') {
        await resOrNext();
        if (reqOrCtx.body && typeof reqOrCtx.body === 'string' && reqOrCtx.response?.type?.includes('html')) {
          reqOrCtx.body = reqOrCtx.body.replace('</body>', `${injectionSnippet}</body>`);
        }
      }
    });
  }
}

function serveFile(res: any, filePath: string) {
  if (!fs.existsSync(filePath)) {
    if (res.status) res.status(404).end('File Not Found');
    else if (res.writeHead) {
      res.writeHead(404);
      res.end('File Not Found');
    }
    return;
  }

  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.css': 'text/css',
    '.js': 'application/javascript',
  };

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  const stat = fs.statSync(filePath);

  if (res.setHeader) {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=86400');
  } else if (res.writeHead) {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=86400',
    });
  }

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}

function serveKoa(ctx: any, filePath: string) {
  if (!fs.existsSync(filePath)) {
    ctx.status = 404;
    ctx.body = 'File Not Found';
    return;
  }
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.css': 'text/css',
    '.js': 'application/javascript',
  };
  const ext = path.extname(filePath).toLowerCase();
  ctx.type = mimeTypes[ext] || 'application/octet-stream';
  ctx.body = fs.createReadStream(filePath);
}
