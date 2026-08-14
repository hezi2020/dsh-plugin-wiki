declare module 'path' {
  const path: any;
  export default path;
  export const resolve: (...args: any[]) => string;
  export const dirname: (p: string) => string;
  export const basename: (p: string, ext?: string) => string;
  export const extname: (p: string) => string;
  export const join: (...args: any[]) => string;
}

declare module 'fs' {
  const fs: any;
  export default fs;
  export const existsSync: (path: string) => boolean;
  export const statSync: (path: string) => any;
  export const createReadStream: (path: string) => any;
}

declare module 'url' {
  export const fileURLToPath: (url: string | URL) => string;
}

declare const process: {
  cwd: () => string;
  env: Record<string, string | undefined>;
};
