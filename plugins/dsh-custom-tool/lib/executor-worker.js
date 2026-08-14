// src/executor-worker.ts
import { parentPort, workerData } from "node:worker_threads";
import vm from "node:vm";
import { inspect } from "node:util";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
function confinePath(root, input) {
  const candidate = resolve(root, input);
  const rel = relative(root, candidate);
  if (rel === "") return root;
  if (rel.startsWith("..") || isAbsolute(rel)) return null;
  return candidate;
}
function createWorkspaceFs(root) {
  const confined = (input) => {
    if (typeof input !== "string" || input === "") throw new Error("fs: path must be a non-empty string");
    const path = confinePath(root, input);
    if (path === null) throw new Error("fs: path escapes the workspace root: " + input);
    return path;
  };
  return {
    async readFile(input) {
      return readFile(confined(input), "utf8");
    },
    async writeFile(input, content) {
      const path = confined(input);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, typeof content === "string" ? content : String(content), "utf8");
    },
    async list(input) {
      const dir = confined(typeof input === "string" && input !== "" ? input : ".");
      const entries = await readdir(dir, { withFileTypes: true });
      return entries.map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other"
      }));
    }
  };
}
function reportOk(value) {
  parentPort.postMessage({ ok: true, value });
}
function reportFailure(error) {
  const e = error instanceof Error ? error : new Error(String(error));
  parentPort.postMessage({ ok: false, error: { name: e.name, message: e.message, stack: e.stack } });
}
function format(values) {
  return values.map((value) => typeof value === "string" ? value : inspect(value, { depth: 4, breakLength: 120 })).join(" ");
}
function createSandbox(allowNetwork, scope, workspaceRoot) {
  const logLine = (values) => "[custom-tool] " + format(values) + "\n";
  const consoleLike = {
    log: (...values) => {
      process.stdout.write(logLine(values));
    },
    info: (...values) => {
      process.stdout.write(logLine(values));
    },
    warn: (...values) => {
      process.stderr.write(logLine(values));
    },
    error: (...values) => {
      process.stderr.write(logLine(values));
    }
  };
  const blockedFetch = () => Promise.reject(new Error("network access is disabled for custom tools (allowNetwork=false)"));
  const sandbox = {
    console: consoleLike,
    fetch: allowNetwork ? (input, init) => fetch(input, init) : blockedFetch,
    TextEncoder,
    TextDecoder,
    URL,
    URLSearchParams,
    atob,
    btoa,
    structuredClone,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    AbortController,
    AbortSignal
  };
  if (scope === "workspace") {
    if (workspaceRoot === null) {
      throw new Error("workspace tool executed outside a session: no workspace root available");
    }
    sandbox.fs = createWorkspaceFs(workspaceRoot);
  }
  return vm.createContext(sandbox, { name: "dsh-custom-tool-sandbox", codeGeneration: { strings: true, wasm: false } });
}
function main() {
  const input = workerData;
  try {
    const sandbox = createSandbox(input.allowNetwork, input.scope, input.workspaceRoot);
    const run = vm.runInContext(
      "(async (args, env) => {\n" + input.code + "\n})",
      sandbox,
      { filename: "custom-tool.js", timeout: input.syncTimeoutMs }
    );
    void (async () => {
      const value = await run(input.args, input.env);
      if (value === void 0) {
        throw new Error("tool returned undefined; return a JSON value (string, number, boolean, null, array, or object)");
      }
      JSON.stringify(value);
      reportOk(value);
    })().catch(reportFailure);
  } catch (error) {
    reportFailure(error);
  }
}
main();
