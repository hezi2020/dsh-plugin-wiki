// src/registry.ts
import { realpathSync } from "node:fs";

// src/tool-definition.ts
import { assertSupportedJsonSchema } from "@deepseek-ai/dsh-tools";

// src/executor.ts
import { Worker } from "node:worker_threads";
var WORKER_URL = new URL("../lib/executor-worker.js", import.meta.url);
var ToolCodeError = class extends Error {
  /** The worker-side stack of the original error, when available. */
  causeStack;
  /**
   * @param message - the failure message.
   * @param causeStack - worker-side stack, if the failure carried one.
   */
  constructor(message, causeStack) {
    super(message);
    this.name = "ToolCodeError";
    this.causeStack = causeStack;
  }
};
var ToolTimeoutError = class extends Error {
  /**
   * @param timeoutMs - the budget that was exceeded.
   */
  constructor(timeoutMs) {
    super("custom tool exceeded " + timeoutMs + " ms");
    this.name = "ToolTimeoutError";
  }
};
function runToolCode(code, args, options) {
  return new Promise((resolve3, reject) => {
    let settled = false;
    const worker = new Worker(WORKER_URL, {
      workerData: {
        code,
        args,
        env: options.env,
        allowNetwork: options.allowNetwork,
        scope: options.scope,
        workspaceRoot: options.workspaceRoot ?? null,
        syncTimeoutMs: options.timeoutMs
      },
      resourceLimits: { maxOldGenerationSizeMb: options.memoryLimitMb }
    });
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      callback();
    };
    const timer = setTimeout(() => {
      finish(() => {
        void worker.terminate();
        reject(new ToolTimeoutError(options.timeoutMs));
      });
    }, options.timeoutMs);
    const onAbort = () => {
      finish(() => {
        void worker.terminate();
        reject(new ToolCodeError("custom tool execution aborted"));
      });
    };
    if (options.signal !== void 0) {
      if (options.signal.aborted) onAbort();
      else options.signal.addEventListener("abort", onAbort, { once: true });
    }
    worker.on("message", (message) => {
      finish(() => {
        void worker.terminate();
        if (typeof message !== "object" || message === null || !("ok" in message)) {
          reject(new ToolCodeError("custom tool worker sent a malformed message"));
          return;
        }
        const result = message;
        if (result.ok) resolve3(result.value);
        else reject(new ToolCodeError(result.error?.message ?? "custom tool failed", result.error?.stack));
      });
    });
    worker.on("error", (error) => {
      finish(() => {
        reject(new ToolCodeError("custom tool worker crashed: " + error.message, error.stack));
      });
    });
    worker.on("exit", (code2) => {
      if (settled) return;
      finish(() => {
        reject(new ToolCodeError("custom tool worker exited with code " + String(code2) + " without a result"));
      });
    });
  });
}

// src/tool-definition.ts
function formatToolResult(value, maxChars) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2) ?? String(value);
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\u2026(result truncated at " + maxChars + " chars)";
}
function buildCustomToolDefinition(tool, config, workspaceRootProvider) {
  assertSupportedJsonSchema(tool.parameters);
  const parameters = tool.parameters;
  return {
    name: tool.name,
    description: tool.description,
    parameters,
    output: {
      schema: {},
      render: (_args, value) => [{ type: "text", text: formatToolResult(value, config.maxResultChars) }]
    },
    timeoutMs: config.timeoutMs,
    execute(args, exec) {
      return runToolCode(tool.code, args, {
        timeoutMs: config.timeoutMs,
        memoryLimitMb: config.memoryLimitMb,
        allowNetwork: config.allowNetwork,
        scope: tool.scope,
        workspaceRoot: tool.scope === "workspace" ? workspaceRootProvider() : void 0,
        env: { tool: tool.name, scope: tool.scope },
        signal: exec.signal
      });
    }
  };
}

// src/workspace-store.ts
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
var STORE_VERSION = 1;
function resolveDshHome(configHome) {
  if (configHome !== "") return resolve(configHome);
  if (process.env.DSH_HOME !== void 0 && process.env.DSH_HOME !== "") return resolve(process.env.DSH_HOME);
  return join(homedir(), ".dsh");
}
function workspaceStorePath(dshHome, workspaceRoot) {
  const digest = createHash("sha256").update(resolve(workspaceRoot)).digest("hex").slice(0, 16);
  return join(dshHome, "workspace-tools", digest + ".json");
}
function readWorkspaceTools(dshHome, workspaceRoot) {
  const path = workspaceStorePath(dshHome, workspaceRoot);
  if (!existsSync(path)) return [];
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error("corrupt workspace tool store " + path + ": " + message);
  }
  const envelope = parsed;
  if (envelope.version !== STORE_VERSION || !Array.isArray(envelope.tools)) {
    throw new Error("corrupt workspace tool store " + path + ": not a version-" + STORE_VERSION + " envelope");
  }
  return envelope.tools;
}
function writeWorkspaceTools(dshHome, workspaceRoot, tools) {
  const path = workspaceStorePath(dshHome, workspaceRoot);
  mkdirSync(dirname(path), { recursive: true });
  const envelope = { version: STORE_VERSION, tools };
  const temp = path + ".tmp-" + process.pid;
  writeFileSync(temp, JSON.stringify(envelope, null, 2) + "\n", "utf8");
  renameSync(temp, path);
}

// src/registry.ts
function canonicalRoot(root) {
  try {
    return realpathSync(root);
  } catch {
    return root;
  }
}
var CustomToolRegistry = class {
  /**
   * @param ctx - the plugin context; global registrations bind to its fiber scope.
   * @param config - resolved plugin configuration.
   */
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.dshHome = resolveDshHome(config.dshHome);
  }
  active = /* @__PURE__ */ new Map();
  /** workspace root -> tool id -> per-agent registration disposers. */
  workspaceActive = /* @__PURE__ */ new Map();
  failures = /* @__PURE__ */ new Map();
  dshHome;
  /** The initiator's session cwd, resolved inside the dispatch's async context. */
  workspaceRoot = () => {
    const agents = this.ctx.get("agents");
    return agents?.currentInitiator()?.session.header.cwd;
  };
  /** Per-tool registration failures by tool id, for diagnostics and `custom_tools_list`. */
  errors() {
    return this.failures;
  }
  /** The per-workspace store path for the current initiator's workspace. */
  currentWorkspaceStorePath() {
    const root = this.workspaceRoot();
    return root === void 0 ? void 0 : workspaceStorePath(this.dshHome, canonicalRoot(root));
  }
  /** Read the current workspace's stored tools, or [] outside a session. */
  currentWorkspaceTools() {
    const root = this.workspaceRoot();
    if (root === void 0) return [];
    return readWorkspaceTools(this.dshHome, canonicalRoot(root));
  }
  /**
   * Write the current workspace's complete tool list to its store.
   * @param tools - the complete next tool list.
   * @returns the canonical workspace root the store was written for.
   * @throws when no session workspace is active.
   */
  writeCurrentWorkspaceTools(tools) {
    const root = this.workspaceRoot();
    if (root === void 0) throw new Error("no active workspace");
    const canonical = canonicalRoot(root);
    writeWorkspaceTools(this.dshHome, canonical, tools);
    return canonical;
  }
  /**
   * Mirror the global settings section into the tools registry.
   * @param tools - the complete stored global section.
   */
  reconcile(tools) {
    const wanted = /* @__PURE__ */ new Map();
    for (const tool of tools) {
      if (tool.enabled) wanted.set(tool.id, tool);
    }
    for (const [id, entry] of this.active) {
      const next = wanted.get(id);
      if (next === void 0 || next.updatedAt !== entry.tool.updatedAt) {
        entry.dispose();
        this.active.delete(id);
        this.failures.delete(id);
      }
    }
    for (const [id, tool] of wanted) {
      const existing = this.active.get(id);
      if (existing !== void 0 && existing.tool.updatedAt === tool.updatedAt) continue;
      try {
        const dispose = this.ctx.tools.register(buildCustomToolDefinition(tool, this.config, this.workspaceRoot));
        this.active.set(id, { tool, dispose });
        this.failures.delete(id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.failures.set(id, message);
        this.ctx.logger("dsh-custom-tool").warn('failed to register custom tool "%s": %s', tool.name, message);
      }
    }
  }
  /**
   * Register every enabled workspace-location tool of one workspace into the
   * scopes of its live agents: a full sweep (dispose all, then re-register
   * fresh) keeps the per-agent view exactly equal to the store.
   * @param workspaceRoot - the workspace root (canonicalized here).
   */
  reconcileWorkspace(workspaceRoot) {
    const root = canonicalRoot(workspaceRoot);
    const agents = this.ctx.get("agents");
    const live = (agents?.list() ?? []).filter((agent) => canonicalRoot(agent.session.header.cwd) === root);
    const tools = readWorkspaceTools(this.dshHome, root).filter((tool) => tool.enabled);
    const previous = this.workspaceActive.get(root);
    if (previous !== void 0) {
      for (const entries of previous.values()) {
        for (const entry of entries) entry.dispose();
      }
    }
    const active = /* @__PURE__ */ new Map();
    for (const tool of tools) {
      const entries = [];
      for (const agent of live) {
        try {
          const dispose = agent.ctx.tools.register(buildCustomToolDefinition(tool, this.config, () => agent.session.header.cwd));
          entries.push({ agent, dispose });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.failures.set(tool.id, message);
          this.ctx.logger("dsh-custom-tool").warn('failed to register workspace tool "%s" for an agent: %s', tool.name, message);
        }
      }
      active.set(tool.id, entries);
    }
    this.workspaceActive.set(root, active);
  }
  /**
   * Register one newly created agent's workspace tools.
   * @param agent - the live agent.
   */
  registerAgent(agent) {
    this.reconcileWorkspace(agent.session.header.cwd);
  }
  /** Dispose every live registration; called on plugin teardown. */
  clear() {
    for (const entry of this.active.values()) entry.dispose();
    this.active.clear();
    for (const inner of this.workspaceActive.values()) {
      for (const entries of inner.values()) {
        for (const entry of entries) entry.dispose();
      }
    }
    this.workspaceActive.clear();
    this.failures.clear();
  }
};

// src/model-tools.ts
import { randomUUID } from "node:crypto";
import { defineTool } from "@deepseek-ai/dsh-tools";

// src/settings.ts
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import vm from "node:vm";

// ../dsh/vendor/cosmokit/src/misc.ts
function isNullable(value) {
  return value === null || value === void 0;
}
function isPlainObject(data) {
  return data && typeof data === "object" && !Array.isArray(data);
}
function filterKeys(object, filter) {
  return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
}
function mapValues(object, transform) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
}
function pick(source, keys, forced) {
  if (!keys) return { ...source };
  const result = {};
  for (const key of keys) {
    if (forced || source[key] !== void 0) result[key] = source[key];
  }
  return result;
}

// ../dsh/vendor/cosmokit/src/types.ts
function is(type, value) {
  if (arguments.length === 1) return (value2) => is(type, value2);
  return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
}
function isArrayBufferLike(value) {
  return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
}
function isArrayBufferSource(value) {
  return isArrayBufferLike(value) || ArrayBuffer.isView(value);
}
var Binary;
((Binary2) => {
  Binary2.is = isArrayBufferLike;
  Binary2.isSource = isArrayBufferSource;
  function fromSource(source) {
    if (ArrayBuffer.isView(source)) {
      return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
    } else {
      return source;
    }
  }
  Binary2.fromSource = fromSource;
  function toBase64(source) {
    source = fromSource(source);
    if (typeof Buffer !== "undefined") {
      return Buffer.from(source).toString("base64");
    }
    let binary = "";
    const bytes = new Uint8Array(source);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  Binary2.toBase64 = toBase64;
  function fromBase64(source) {
    if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
    return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
  }
  Binary2.fromBase64 = fromBase64;
  function toHex(source) {
    source = fromSource(source);
    if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
    return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  Binary2.toHex = toHex;
  function fromHex(source) {
    if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
    const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
    const buffer = [];
    for (let i = 0; i < hex.length; i += 2) {
      buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
    }
    return Uint8Array.from(buffer).buffer;
  }
  Binary2.fromHex = fromHex;
})(Binary || (Binary = {}));
var base64ToArrayBuffer = Binary.fromBase64;
var arrayBufferToBase64 = Binary.toBase64;
var hexToArrayBuffer = Binary.fromHex;
var arrayBufferToHex = Binary.toHex;
function clone(source, refs = /* @__PURE__ */ new Map()) {
  if (!source || typeof source !== "object") return source;
  if (is("Date", source)) return new Date(source.valueOf());
  if (is("RegExp", source)) return new RegExp(source.source, source.flags);
  if (isArrayBufferLike(source)) return source.slice(0);
  if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  const cached = refs.get(source);
  if (cached) return cached;
  if (Array.isArray(source)) {
    const result2 = [];
    refs.set(source, result2);
    source.forEach((value, index) => {
      result2[index] = Reflect.apply(clone, null, [value, refs]);
    });
    return result2;
  }
  const result = Object.create(Object.getPrototypeOf(source));
  refs.set(source, result);
  for (const key of Reflect.ownKeys(source)) {
    const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
    if ("value" in descriptor) {
      descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
    }
    Reflect.defineProperty(result, key, descriptor);
  }
  return result;
}
function deepEqual(a, b, strict) {
  if (a === b) return true;
  if (!strict && isNullable(a) && isNullable(b)) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (!a || !b) return false;
  function check(test, then) {
    return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
  }
  return check(Array.isArray, (a2, b2) => a2.length === b2.length && a2.every((item, index) => deepEqual(item, b2[index]))) ?? check(is("Date"), (a2, b2) => a2.valueOf() === b2.valueOf()) ?? check(is("RegExp"), (a2, b2) => a2.source === b2.source && a2.flags === b2.flags) ?? check(isArrayBufferLike, (a2, b2) => {
    if (a2.byteLength !== b2.byteLength) return false;
    const viewA = new Uint8Array(a2);
    const viewB = new Uint8Array(b2);
    for (let i = 0; i < viewA.length; i++) {
      if (viewA[i] !== viewB[i]) return false;
    }
    return true;
  }) ?? Object.keys({ ...a, ...b }).every((key) => deepEqual(a[key], b[key], strict));
}

// ../dsh/vendor/cosmokit/src/time.ts
var Time;
((Time2) => {
  Time2.millisecond = 1;
  Time2.second = 1e3;
  Time2.minute = Time2.second * 60;
  Time2.hour = Time2.minute * 60;
  Time2.day = Time2.hour * 24;
  Time2.week = Time2.day * 7;
  let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
  function setTimezoneOffset(offset) {
    timezoneOffset = offset;
  }
  Time2.setTimezoneOffset = setTimezoneOffset;
  function getTimezoneOffset() {
    return timezoneOffset;
  }
  Time2.getTimezoneOffset = getTimezoneOffset;
  function getDateNumber(date2 = /* @__PURE__ */ new Date(), offset) {
    if (typeof date2 === "number") date2 = new Date(date2);
    if (offset === void 0) offset = timezoneOffset;
    return Math.floor((date2.valueOf() / Time2.minute - offset) / 1440);
  }
  Time2.getDateNumber = getDateNumber;
  function fromDateNumber(value, offset) {
    const date2 = new Date(value * Time2.day);
    if (offset === void 0) offset = timezoneOffset;
    return new Date(+date2 + offset * Time2.minute);
  }
  Time2.fromDateNumber = fromDateNumber;
  const numeric = /\d+(?:\.\d+)?/.source;
  const timeRegExp = new RegExp(`^${[
    "w(?:eek(?:s)?)?",
    "d(?:ay(?:s)?)?",
    "h(?:our(?:s)?)?",
    "m(?:in(?:ute)?(?:s)?)?",
    "s(?:ec(?:ond)?(?:s)?)?"
  ].map((unit) => `(${numeric}${unit})?`).join("")}$`);
  function parseTime(source) {
    const capture = timeRegExp.exec(source);
    if (!capture) return 0;
    return (parseFloat(capture[1]) * Time2.week || 0) + (parseFloat(capture[2]) * Time2.day || 0) + (parseFloat(capture[3]) * Time2.hour || 0) + (parseFloat(capture[4]) * Time2.minute || 0) + (parseFloat(capture[5]) * Time2.second || 0);
  }
  Time2.parseTime = parseTime;
  function parseDate(date2) {
    const parsed = parseTime(date2);
    if (parsed) {
      date2 = Date.now() + parsed;
    } else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date2)) {
      date2 = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date2}`;
    } else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date2)) {
      date2 = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date2}`;
    }
    return date2 ? new Date(date2) : /* @__PURE__ */ new Date();
  }
  Time2.parseDate = parseDate;
  function format(ms) {
    const abs = Math.abs(ms);
    if (abs >= Time2.day - Time2.hour / 2) {
      return Math.round(ms / Time2.day) + "d";
    } else if (abs >= Time2.hour - Time2.minute / 2) {
      return Math.round(ms / Time2.hour) + "h";
    } else if (abs >= Time2.minute - Time2.second / 2) {
      return Math.round(ms / Time2.minute) + "m";
    } else if (abs >= Time2.second) {
      return Math.round(ms / Time2.second) + "s";
    }
    return ms + "ms";
  }
  Time2.format = format;
  function toDigits(source, length = 2) {
    return source.toString().padStart(length, "0");
  }
  Time2.toDigits = toDigits;
  function template(template2, time = /* @__PURE__ */ new Date()) {
    return template2.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
  }
  Time2.template = template;
})(Time || (Time = {}));

// ../dsh/vendor/schemastery/lib/index.mjs
var kSchema = Symbol.for("schemastery");
var kValidationError = Symbol.for("ValidationError");
globalThis.__schemastery_index__ ??= 0;
globalThis.__schemastery_refs__ = void 0;
var ValidationError = class extends TypeError {
  options;
  name = "ValidationError";
  constructor(message, options) {
    let prefix = "$";
    for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
    else if (typeof segment === "number") prefix += "[" + segment + "]";
    else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
    if (prefix.startsWith(".")) prefix = prefix.slice(1);
    super((prefix === "$" ? "" : `${prefix} `) + message);
    this.options = options;
  }
  static is(error) {
    return !!error?.[kValidationError];
  }
};
Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
var Schema = function(options) {
  const schema = function(data, options2 = {}) {
    return Schema.resolve(data, schema, options2)[0];
  };
  if (options.refs) {
    const refs = mapValues(options.refs, (options2) => new Schema(options2));
    const getRef = (uid) => refs[uid];
    for (const key in refs) {
      const options2 = refs[key];
      options2.sKey = getRef(options2.sKey);
      options2.inner = getRef(options2.inner);
      options2.list = options2.list && options2.list.map(getRef);
      options2.dict = options2.dict && mapValues(options2.dict, getRef);
    }
    return refs[options.uid];
  }
  Object.assign(schema, options);
  if (typeof schema.callback === "string") try {
    schema.callback = new Function("return " + schema.callback)();
  } catch {
  }
  Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
  Object.setPrototypeOf(schema, Schema.prototype);
  schema.meta ||= {};
  schema.toString = schema.toString.bind(schema);
  return schema;
};
Schema.prototype = Object.create(Function.prototype);
Schema.prototype[kSchema] = true;
Object.defineProperty(Schema.prototype, "~standard", { get() {
  return {
    version: 1,
    vendor: "schemastery",
    validate: (value) => {
      try {
        return { value: Schema.resolve(value, this, {})[0] };
      } catch (error) {
        if (ValidationError.is(error)) return { issues: [{
          message: error.message,
          path: error.options.path
        }] };
        throw error;
      }
    }
  };
} });
Schema.ValidationError = ValidationError;
Schema.prototype.toJSON = function toJSON() {
  if (globalThis.__schemastery_refs__) {
    globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
    return this.uid;
  }
  globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
  globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
  const result = {
    uid: this.uid,
    refs: globalThis.__schemastery_refs__
  };
  globalThis.__schemastery_refs__ = void 0;
  return result;
};
Schema.prototype.set = function set(key, value) {
  this.dict[key] = value;
  return this;
};
Schema.prototype.push = function push(value) {
  this.list.push(value);
  return this;
};
function mergeDesc(original, messages) {
  const result = typeof original === "string" ? { "": original } : { ...original };
  for (const locale in messages) {
    const value = messages[locale];
    if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
    else if (typeof value === "string") result[locale] = value;
  }
  return result;
}
function getInner(value) {
  return value?.$value ?? value?.$inner;
}
function extractKeys(data) {
  return filterKeys(data ?? {}, (key) => !key.startsWith("$"));
}
Schema.prototype.i18n = function i18n(messages) {
  const schema = Schema(this);
  const desc = mergeDesc(schema.meta.description, messages);
  if (Object.keys(desc).length) schema.meta.description = desc;
  if (schema.dict) schema.dict = mapValues(schema.dict, (inner, key) => {
    return inner.i18n(mapValues(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
  });
  if (schema.list) schema.list = schema.list.map((inner, index) => {
    return inner.i18n(mapValues(messages, (data = {}) => {
      if (Array.isArray(getInner(data))) return getInner(data)[index];
      if (Array.isArray(data)) return data[index];
      return extractKeys(data);
    }));
  });
  if (schema.inner) schema.inner = schema.inner.i18n(mapValues(messages, (data) => {
    if (getInner(data)) return getInner(data);
    return extractKeys(data);
  }));
  if (schema.sKey) schema.sKey = schema.sKey.i18n(mapValues(messages, (data) => data?.$key));
  return schema;
};
Schema.prototype.extra = function extra(key, value) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key]: value
  };
  return schema;
};
for (const key of [
  "required",
  "disabled",
  "collapse",
  "hidden",
  "loose"
]) Object.assign(Schema.prototype, { [key](value = true) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key]: value
  };
  return schema;
} });
Schema.prototype.deprecated = function deprecated() {
  const schema = Schema(this);
  schema.meta.badges ||= [];
  schema.meta.badges.push({
    text: "deprecated",
    type: "danger"
  });
  return schema;
};
Schema.prototype.experimental = function experimental() {
  const schema = Schema(this);
  schema.meta.badges ||= [];
  schema.meta.badges.push({
    text: "experimental",
    type: "warning"
  });
  return schema;
};
Schema.prototype.pattern = function pattern(regexp) {
  const schema = Schema(this);
  const pattern2 = pick(regexp, ["source", "flags"]);
  schema.meta = {
    ...schema.meta,
    pattern: pattern2
  };
  return schema;
};
Schema.prototype.simplify = function simplify(value) {
  if (deepEqual(value, this.meta.default, this.type === "dict")) return null;
  if (isNullable(value)) return value;
  if (this.type === "object" || this.type === "dict") {
    const result = {};
    for (const key in value) {
      const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
      if (this.type === "dict" || !isNullable(item)) result[key] = item;
    }
    if (deepEqual(result, this.meta.default, this.type === "dict")) return null;
    return result;
  } else if (this.type === "array" || this.type === "tuple") {
    const result = [];
    value.forEach((value2, index) => {
      const schema = this.type === "array" ? this.inner : this.list[index];
      const item = schema ? schema.simplify(value2) : value2;
      result.push(item);
    });
    return result;
  } else if (this.type === "intersect") {
    const result = {};
    for (const item of this.list) Object.assign(result, item.simplify(value));
    return result;
  } else if (this.type === "union") for (const schema of this.list) try {
    Schema.resolve(value, schema, {});
    return schema.simplify(value);
  } catch {
  }
  return value;
};
Schema.prototype.toString = function toString(inline) {
  return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
};
Schema.prototype.role = function role(role, extra2) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    role,
    extra: extra2
  };
  return schema;
};
for (const key of [
  "default",
  "link",
  "comment",
  "description",
  "max",
  "min",
  "step"
]) Object.assign(Schema.prototype, { [key](value) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key]: value
  };
  return schema;
} });
var resolvers = {};
Schema.extend = function extend(type, resolve3) {
  resolvers[type] = resolve3;
};
Schema.resolve = function resolve2(data, schema, options = {}, strict = false) {
  if (!schema) return [data];
  if (options.ignore?.(data, schema)) return [data];
  if (isNullable(data) && schema.type !== "lazy") {
    if (schema.meta.required) throw new ValidationError(`missing required value`, options);
    let current = schema;
    let fallback = schema.meta.default;
    while (current?.type === "intersect" && isNullable(fallback)) {
      current = current.list[0];
      fallback = current?.meta.default;
    }
    if (isNullable(fallback)) return [data];
    data = clone(fallback);
  }
  const callback = resolvers[schema.type];
  if (!callback) throw new ValidationError(`unsupported type "${schema.type}"`, options);
  try {
    return callback(data, schema, options, strict);
  } catch (error) {
    if (!schema.meta.loose) throw error;
    return [schema.meta.default];
  }
};
Schema.from = function from(source) {
  if (isNullable(source)) return Schema.any();
  else if ([
    "string",
    "number",
    "boolean"
  ].includes(typeof source)) return Schema.const(source).required();
  else if (source[kSchema]) return source;
  else if (typeof source === "function") switch (source) {
    case String:
      return Schema.string().required();
    case Number:
      return Schema.number().required();
    case Boolean:
      return Schema.boolean().required();
    case Function:
      return Schema.function().required();
    default:
      return Schema.is(source).required();
  }
  else throw new TypeError(`cannot infer schema from ${source}`);
};
Schema.lazy = function lazy(builder) {
  const toJSON2 = () => {
    if (!schema.inner[kSchema]) {
      schema.inner = schema.builder();
      schema.inner.meta = {
        ...schema.meta,
        ...schema.inner.meta
      };
    }
    return schema.inner.toJSON();
  };
  const schema = new Schema({
    type: "lazy",
    builder,
    inner: { toJSON: toJSON2 }
  });
  return schema;
};
Schema.natural = function natural() {
  return Schema.number().step(1).min(0);
};
Schema.percent = function percent() {
  return Schema.number().step(0.01).min(0).max(1).role("slider");
};
Schema.date = function date() {
  return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
    const date2 = new Date(value);
    if (isNaN(+date2)) throw new ValidationError(`invalid date "${value}"`, options);
    return date2;
  }, true)]);
};
Schema.regExp = function regExp(flag = "") {
  return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
    try {
      return new RegExp(value, flag);
    } catch (e) {
      throw new ValidationError(e.message, options);
    }
  }, true)]);
};
Schema.arrayBuffer = function arrayBuffer(encoding) {
  return Schema.union([
    Schema.is(ArrayBuffer),
    Schema.is(SharedArrayBuffer),
    Schema.transform(Schema.any(), (value, options) => {
      if (Binary.isSource(value)) return Binary.fromSource(value);
      throw new ValidationError(`expected ArrayBufferSource but got ${value}`, options);
    }, true),
    ...encoding ? [Schema.transform(Schema.string(), (value, options) => {
      try {
        return encoding === "base64" ? Binary.fromBase64(value) : Binary.fromHex(value);
      } catch (e) {
        throw new ValidationError(e.message, options);
      }
    }, true)] : []
  ]);
};
Schema.extend("lazy", (data, schema, options, strict) => {
  if (!schema.inner[kSchema]) {
    schema.inner = schema.builder();
    schema.inner.meta = {
      ...schema.meta,
      ...schema.inner.meta
    };
  }
  return Schema.resolve(data, schema.inner, options, strict);
});
Schema.extend("any", (data) => {
  return [data];
});
Schema.extend("never", (data, _, options) => {
  throw new ValidationError(`expected nullable but got ${data}`, options);
});
Schema.extend("const", (data, { value }, options) => {
  if (deepEqual(data, value)) return [value];
  throw new ValidationError(`expected ${value} but got ${data}`, options);
});
function checkWithinRange(data, meta, description, options, skipMin = false) {
  const { max = Infinity, min = -Infinity } = meta;
  if (data > max) throw new ValidationError(`expected ${description} <= ${max} but got ${data}`, options);
  if (data < min && !skipMin) throw new ValidationError(`expected ${description} >= ${min} but got ${data}`, options);
}
Schema.extend("string", (data, { meta }, options) => {
  if (typeof data !== "string") throw new ValidationError(`expected string but got ${data}`, options);
  if (meta.pattern) {
    const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
    if (!regexp.test(data)) throw new ValidationError(`expect string to match regexp ${regexp}`, options);
  }
  checkWithinRange(data.length, meta, "string length", options);
  return [data];
});
function decimalShift(data, digits) {
  const str = data.toString();
  if (str.includes("e")) return data * Math.pow(10, digits);
  const index = str.indexOf(".");
  if (index === -1) return data * Math.pow(10, digits);
  const frac = str.slice(index + 1);
  const integer = str.slice(0, index);
  if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
  return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
}
function isMultipleOf(data, min, step) {
  step = Math.abs(step);
  if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
  const index = step.toString().indexOf(".");
  const digits = step.toString().slice(index + 1).length;
  return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
}
Schema.extend("number", (data, { meta }, options) => {
  if (typeof data !== "number") throw new ValidationError(`expected number but got ${data}`, options);
  checkWithinRange(data, meta, "number", options);
  const { step } = meta;
  if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError(`expected number multiple of ${step} but got ${data}`, options);
  return [data];
});
Schema.extend("boolean", (data, _, options) => {
  if (typeof data === "boolean") return [data];
  throw new ValidationError(`expected boolean but got ${data}`, options);
});
Schema.extend("bitset", (data, { bits, meta }, options) => {
  let value = 0, keys = [];
  if (typeof data === "number") {
    value = data;
    for (const key in bits) if (data & bits[key]) keys.push(key);
  } else if (Array.isArray(data)) {
    keys = data;
    for (const key of keys) {
      if (typeof key !== "string") throw new ValidationError(`expected string but got ${key}`, options);
      if (key in bits) value |= bits[key];
    }
  } else throw new ValidationError(`expected number or array but got ${data}`, options);
  if (value === meta.default) return [value];
  return [value, keys];
});
Schema.extend("function", (data, _, options) => {
  if (typeof data === "function") return [data];
  throw new ValidationError(`expected function but got ${data}`, options);
});
Schema.extend("is", (data, { constructor }, options) => {
  if (typeof constructor === "function") {
    if (data instanceof constructor) return [data];
    throw new ValidationError(`expected ${constructor.name} but got ${data}`, options);
  } else {
    if (isNullable(data)) throw new ValidationError(`expected ${constructor} but got ${data}`, options);
    let prototype = Object.getPrototypeOf(data);
    while (prototype) {
      if (prototype.constructor?.name === constructor) return [data];
      prototype = Object.getPrototypeOf(prototype);
    }
    throw new ValidationError(`expected ${constructor} but got ${data}`, options);
  }
});
function property(data, key, schema, options) {
  try {
    const [value, adapted] = Schema.resolve(data[key], schema, {
      ...options,
      path: [...options.path || [], key]
    });
    if (adapted !== void 0) data[key] = adapted;
    return value;
  } catch (e) {
    if (!options?.autofix) throw e;
    delete data[key];
    return schema.meta.default;
  }
}
Schema.extend("array", (data, { inner, meta }, options) => {
  if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
  checkWithinRange(data.length, meta, "array length", options, !isNullable(inner.meta.default));
  return [data.map((_, index) => property(data, index, inner, options))];
});
Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
  if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
  const result = {};
  for (const key in data) {
    let rKey;
    try {
      rKey = Schema.resolve(key, sKey, options)[0];
    } catch (error) {
      if (strict) continue;
      throw error;
    }
    result[rKey] = property(data, key, inner, options);
    data[rKey] = data[key];
    if (key !== rKey) delete data[key];
  }
  return [result];
});
Schema.extend("tuple", (data, { list }, options, strict) => {
  if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
  const result = list.map((inner, index) => property(data, index, inner, options));
  if (strict) return [result];
  result.push(...data.slice(list.length));
  return [result];
});
function merge(result, data) {
  for (const key in data) {
    if (key in result) continue;
    result[key] = data[key];
  }
}
Schema.extend("object", (data, { dict }, options, strict) => {
  if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
  const result = {};
  for (const key in dict) {
    const value = property(data, key, dict[key], options);
    if (!isNullable(value) || key in data) result[key] = value;
  }
  if (!strict) merge(result, data);
  return [result];
});
Schema.extend("union", (data, { list, toString: toString2 }, options, strict) => {
  const messages = [];
  for (const inner of list) try {
    return Schema.resolve(data, inner, options, strict);
  } catch (error) {
    messages.push(error);
  }
  throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
});
Schema.extend("intersect", (data, { list, toString: toString2 }, options, strict) => {
  if (!list.length) return [data];
  let result;
  for (const inner of list) {
    const value = Schema.resolve(data, inner, options, true)[0];
    if (isNullable(value)) continue;
    if (isNullable(result)) result = value;
    else if (typeof result !== typeof value) throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
    else if (typeof value === "object") merge(result ??= {}, value);
    else if (result !== value) throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
  }
  if (!strict && isPlainObject(data)) merge(result, data);
  return [result];
});
Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
  const [result, adapted = data] = Schema.resolve(data, inner, options, true);
  if (preserve) return [callback(result)];
  else return [callback(result), callback(adapted)];
});
var formatters = {};
function defineMethod(name2, keys, format) {
  formatters[name2] = format;
  Object.assign(Schema, { [name2](...args) {
    const schema = new Schema({ type: name2 });
    keys.forEach((key, index) => {
      switch (key) {
        case "sKey":
          schema.sKey = args[index] ?? Schema.string();
          break;
        case "inner":
          schema.inner = Schema.from(args[index]);
          break;
        case "list":
          schema.list = args[index].map(Schema.from);
          break;
        case "dict":
          schema.dict = mapValues(args[index], Schema.from);
          break;
        case "bits":
          schema.bits = {};
          for (const key2 in args[index]) {
            if (typeof args[index][key2] !== "number") continue;
            schema.bits[key2] = args[index][key2];
          }
          break;
        case "callback": {
          const callback = schema.callback = args[index];
          callback["toJSON"] ||= () => callback.toString();
          break;
        }
        case "constructor": {
          const constructor = schema.constructor = args[index];
          if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
          break;
        }
        default:
          schema[key] = args[index];
      }
    });
    if (name2 === "object" || name2 === "dict") schema.meta.default = {};
    else if (name2 === "array" || name2 === "tuple") schema.meta.default = [];
    else if (name2 === "bitset") schema.meta.default = 0;
    return schema;
  } });
}
defineMethod("is", ["constructor"], ({ constructor }) => {
  if (typeof constructor === "function") return constructor.name;
  else return constructor;
});
defineMethod("any", [], () => "any");
defineMethod("never", [], () => "never");
defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
defineMethod("string", [], () => "string");
defineMethod("number", [], () => "number");
defineMethod("boolean", [], () => "boolean");
defineMethod("bitset", ["bits"], () => "bitset");
defineMethod("function", [], () => "function");
defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
defineMethod("object", ["dict"], ({ dict }) => {
  if (Object.keys(dict).length === 0) return "{}";
  return `{ ${Object.entries(dict).map(([key, inner]) => {
    return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
  }).join(", ")} }`;
});
defineMethod("union", ["list"], ({ list }, inline) => {
  const result = list.map(({ toString: format }) => format()).join(" | ");
  return inline ? `(${result})` : result;
});
defineMethod("intersect", ["list"], ({ list }) => {
  return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
});
defineMethod("transform", [
  "inner",
  "callback",
  "preserve"
], ({ inner }, isInner) => inner.toString(isInner));

// src/shared/schema-check.ts
var TYPES = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "array", "object", "null"]);
var KEYWORDS = /* @__PURE__ */ new Set([
  "type",
  "properties",
  "required",
  "items",
  "enum",
  "const",
  "description",
  "title",
  "default",
  "examples",
  "oneOf",
  "additionalProperties"
]);
function isJsonSafe(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((entry) => isJsonSafe(entry));
  if (typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (!isJsonSafe(value[key])) return false;
    }
    return true;
  }
  return false;
}
function fail(path, message) {
  return { ok: false, path, message };
}
function jsonPath(path, segment) {
  return path + "." + segment;
}
function checkSchemaNode(schema, path = "$") {
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    return fail(path, "must be an object with allowed keywords");
  }
  const node = schema;
  for (const key of Object.keys(node)) {
    if (!KEYWORDS.has(key)) return fail(jsonPath(path, key), 'keyword "' + key + '" is not supported; use only ' + [...KEYWORDS].sort().join(", "));
  }
  if (node.type !== void 0) {
    if (typeof node.type !== "string" || !TYPES.has(node.type)) {
      return fail(jsonPath(path, "type"), "must be one of " + [...TYPES].sort().join(", "));
    }
  }
  if (node.description !== void 0 && typeof node.description !== "string") return fail(jsonPath(path, "description"), "must be a string");
  if (node.title !== void 0 && typeof node.title !== "string") return fail(jsonPath(path, "title"), "must be a string");
  if (node.default !== void 0 && !isJsonSafe(node.default)) return fail(jsonPath(path, "default"), "must be lossless JSON data");
  if (node.examples !== void 0 && !isJsonSafe(node.examples)) return fail(jsonPath(path, "examples"), "must be lossless JSON data");
  if (node.enum !== void 0) {
    if (!Array.isArray(node.enum) || node.enum.length === 0 || !node.enum.every((value) => isJsonSafe(value) && typeof value !== "object")) {
      return fail(jsonPath(path, "enum"), "must be a non-empty array of scalar JSON values");
    }
  }
  if (node.const !== void 0 && (typeof node.const === "object" || !isJsonSafe(node.const))) {
    return fail(jsonPath(path, "const"), "must be a scalar JSON value");
  }
  if (node.oneOf !== void 0) {
    if (!Array.isArray(node.oneOf) || node.oneOf.length < 2) return fail(jsonPath(path, "oneOf"), "needs at least two branches");
    for (let index = 0; index < node.oneOf.length; index++) {
      const branch = checkSchemaNode(node.oneOf[index], jsonPath(path, "oneOf[" + index + "]"));
      if (!branch.ok) return branch;
    }
  }
  if (node.type === "object") {
    if (node.additionalProperties !== void 0 && typeof node.additionalProperties !== "boolean") {
      return fail(jsonPath(path, "additionalProperties"), "must be a boolean");
    }
    if (node.properties !== void 0) {
      if (typeof node.properties !== "object" || node.properties === null || Array.isArray(node.properties)) {
        return fail(jsonPath(path, "properties"), "must be an object of property schemas");
      }
      for (const [key, value] of Object.entries(node.properties)) {
        const branch = checkSchemaNode(value, jsonPath(path, "properties." + key));
        if (!branch.ok) return branch;
      }
    }
    if (node.required !== void 0) {
      if (!Array.isArray(node.required) || node.required.some((name2) => typeof name2 !== "string")) {
        return fail(jsonPath(path, "required"), "must be an array of property names");
      }
      const declared = node.properties === void 0 ? [] : Object.keys(node.properties);
      for (const name2 of node.required) {
        if (!declared.includes(name2)) return fail(jsonPath(path, "required"), '"' + name2 + '" is not declared in properties');
      }
    }
  } else if (node.properties !== void 0 || node.required !== void 0 || node.additionalProperties !== void 0) {
    return fail(path, 'properties/required/additionalProperties need type: "object"');
  }
  if (node.items !== void 0) {
    if (node.type !== "array") return fail(jsonPath(path, "items"), 'needs type: "array"');
    const branch = checkSchemaNode(node.items, jsonPath(path, "items"));
    if (!branch.ok) return branch;
  }
  return { ok: true };
}
function checkParametersSchema(schema) {
  const root = checkSchemaNode(schema);
  if (!root.ok) return root;
  if (schema.type !== "object") {
    return fail("$", 'the parameters root must be type: "object"');
  }
  return { ok: true };
}

// src/shared/names.ts
var TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
var RESERVED_TOOL_NAMES = ["custom_tool_create", "custom_tool_remove", "custom_tools_list"];
function isValidToolName(name2) {
  return TOOL_NAME_PATTERN.test(name2);
}
function toolNameError(name2) {
  if (!isValidToolName(name2)) return 'tool name "' + name2 + '" must match /^[a-z][a-z0-9_]{0,63}$/';
  if (RESERVED_TOOL_NAMES.includes(name2)) return 'tool name "' + name2 + '" is reserved for dsh-custom-tool management tools';
  return null;
}

// src/settings.ts
var CUSTOM_TOOLS_NAMESPACE = settingsNamespace("custom-tools");
var Config = Schema.object({
  timeoutMs: Schema.number().default(3e4),
  memoryLimitMb: Schema.number().default(128),
  maxResultChars: Schema.number().default(16e3),
  maxCodeBytes: Schema.number().default(65536),
  maxTools: Schema.number().default(100),
  allowNetwork: Schema.boolean().default(true),
  dshHome: Schema.string().default("")
});
var CustomToolsSchema = Schema.object({
  tools: Schema.array(Schema.object({
    id: Schema.string(),
    name: Schema.string(),
    description: Schema.string().default(""),
    parameters: Schema.any(),
    code: Schema.string(),
    scope: Schema.union(["global", "workspace"]).default("global"),
    location: Schema.union(["global", "workspace"]).default("global"),
    enabled: Schema.boolean().default(true),
    source: Schema.union(["user", "model"]).default("user"),
    createdAt: Schema.string().default(""),
    updatedAt: Schema.string().default("")
  })).default([])
});
function validateTool(tool, config) {
  const nameError = toolNameError(tool.name);
  if (nameError !== null) throw new Error(nameError);
  if (tool.description.trim() === "") throw new Error('tool "' + tool.name + '" needs a non-empty description \u2014 the model reads it to decide when to call');
  const check = checkParametersSchema(tool.parameters);
  if (!check.ok) throw new Error('tool "' + tool.name + '" parameters: ' + check.message + " (at " + check.path + ")");
  if (Buffer.byteLength(tool.code, "utf8") > config.maxCodeBytes) {
    throw new Error('tool "' + tool.name + '" code exceeds ' + config.maxCodeBytes + " bytes");
  }
  try {
    new vm.Script("(async (args, env) => {\n" + tool.code + "\n})", { filename: "custom-tool:" + tool.name });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error('tool "' + tool.name + '" code syntax: ' + message);
  }
}
function validateCustomTools(value, config) {
  if (value.tools.length > config.maxTools) throw new Error("at most " + config.maxTools + " custom tools; got " + value.tools.length);
  const ids = /* @__PURE__ */ new Set();
  const names = /* @__PURE__ */ new Set();
  for (const tool of value.tools) {
    if (ids.has(tool.id)) throw new Error('duplicate tool id "' + tool.id + '"');
    if (names.has(tool.name)) throw new Error('duplicate tool name "' + tool.name + '"');
    ids.add(tool.id);
    names.add(tool.name);
    validateTool(tool, config);
  }
}
function registerCustomToolsSettings(ctx, config) {
  return ctx.settings.register(CUSTOM_TOOLS_NAMESPACE, CustomToolsSchema, {
    applies: "live",
    validate: (value) => {
      validateCustomTools(value, config);
    }
  });
}

// src/model-tools.ts
async function authorizeGlobalCreation(ctx, tool, callId, signal) {
  const agents = ctx.get("agents");
  const approval = ctx.get("approval");
  const agent = agents?.currentInitiator();
  if (agent === void 0 || approval === void 0) {
    throw new Error("creating a global custom tool requires an active session with approval support; the request fails closed");
  }
  const outcome = await approval.request({
    agent,
    toolName: "custom_tool_create",
    callId,
    reason: 'The model requests creating the GLOBAL custom tool "' + tool.name + '" (scope ' + tool.scope + ", location global). It becomes available in every workspace and persists until removed.",
    signal
  });
  if (outcome !== "allowed-once") {
    throw new Error('the user did not authorize creating the global custom tool "' + tool.name + '" (approval outcome: ' + outcome + "); tell the user it was declined");
  }
}
function registerModelTools(ctx, scope, config, registry) {
  const now = () => (/* @__PURE__ */ new Date()).toISOString();
  ctx.tools.register(defineTool({
    name: "custom_tool_create",
    description: `Grow yourself a new custom tool: persist a JavaScript function under a snake_case name and hot-register it, so it is callable on your NEXT step. Calling custom_tool_create again with the same name in the SAME location REPLACES that tool (its id, createdAt, and enabled flag are preserved). Two locations exist: location "global" stores the tool in the shared settings so EVERY workspace sees it \u2014 creating one requires the user's explicit approval (this call asks and fails when declined); location "workspace" (the default) stores the tool in the CURRENT workspace only and is fully autonomous. Scope selects execution: "global" is the network-only sandbox, "workspace" additionally grants fs (readFile/writeFile/list) confined to the active workspace root \u2014 a global-location tool with workspace scope (e.g. a pdf reader) runs on whichever workspace it is called from. Validation is strict and shared with the settings UI; invalid input rejects the write and nothing persists. The code is the async function BODY over (args, env); see the Custom tools system-prompt section for the sandbox contract.`,
    parameters: {
      name: {
        type: "string",
        required: true,
        description: "snake_case tool name matching /^[a-z][a-z0-9_]{0,63}$/; must not be one of custom_tool_create, custom_tool_remove, custom_tools_list."
      },
      description: {
        type: "string",
        required: true,
        description: "What the tool does and when to call it \u2014 this text is what the model reads on future steps."
      },
      parameters: {
        type: "json",
        required: true,
        description: "JSON Schema for the call arguments, object root, in the harness subset: type/properties/required/items/enum/description only."
      },
      code: {
        type: "string",
        required: true,
        description: "The async function body over (args, env). Return a JSON value; undefined is an error."
      },
      scope: {
        type: "string",
        enum: ["global", "workspace"],
        description: "Execution scope (default 'global'): 'global' runs in the network-only sandbox; 'workspace' additionally grants an fs capability (readFile/writeFile/list) confined to the session workspace root."
      },
      location: {
        type: "string",
        enum: ["global", "workspace"],
        description: "Storage location (default 'workspace' for model-created tools): 'global' persists in the shared settings for every workspace and REQUIRES the user's explicit approval; 'workspace' belongs to the current workspace only and is autonomous."
      },
      enabled: {
        type: "boolean",
        description: "Register the tool immediately (default true). Disabled tools are stored but not callable."
      }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", required: true },
          replaced: { type: "boolean", required: true },
          location: { type: "string", required: true },
          total: { type: "integer", required: true },
          enabled: { type: "boolean", required: true }
        }
      },
      render: (_args, value) => [
        {
          type: "text",
          text: 'Custom tool "' + value.name + '" ' + (value.replaced ? "replaced" : "created") + " in " + value.location + " (now " + value.total + " tools there, " + (value.enabled ? "enabled" : "disabled") + "). Callable from your next step."
        }
      ]
    },
    async execute(args, exec) {
      const location = args.location ?? "workspace";
      const agents = ctx.get("agents");
      const agent = agents?.currentInitiator();
      const globalTools = scope.get().tools;
      void agent;
      const existing = location === "global" ? globalTools.find((tool2) => tool2.name === args.name) : registry.currentWorkspaceTools().find((tool2) => tool2.name === args.name);
      const crossStore = location === "global" ? registry.currentWorkspaceTools().find((tool2) => tool2.name === args.name) : globalTools.find((tool2) => tool2.name === args.name);
      if (existing === void 0 && crossStore !== void 0) {
        throw new Error('custom tool "' + args.name + '" already exists in the ' + (location === "global" ? "workspace" : "global") + " store; remove it there first");
      }
      const tool = {
        id: existing?.id ?? randomUUID(),
        name: args.name,
        description: args.description,
        parameters: args.parameters,
        code: args.code,
        scope: args.scope ?? "global",
        location,
        enabled: args.enabled ?? true,
        source: "model",
        createdAt: existing?.createdAt ?? now(),
        updatedAt: now()
      };
      validateTool(tool, config);
      if (location === "global") {
        await authorizeGlobalCreation(ctx, tool, exec.rootCallId, exec.signal);
        const next2 = existing === void 0 ? [...globalTools, tool] : globalTools.map((entry) => entry.name === tool.name ? tool : entry);
        await scope.update({ tools: next2 });
        return { name: tool.name, replaced: existing !== void 0, location, total: next2.length, enabled: tool.enabled };
      }
      const store = registry.currentWorkspaceTools();
      const next = existing === void 0 ? [...store, tool] : store.map((entry) => entry.name === tool.name ? tool : entry);
      const root = registry.writeCurrentWorkspaceTools(next);
      registry.reconcileWorkspace(root);
      return { name: tool.name, replaced: existing !== void 0, location, total: next.length, enabled: tool.enabled };
    }
  }));
  ctx.tools.register(defineTool({
    name: "custom_tool_remove",
    description: "Prune a custom tool the MODEL created: unregister it immediately and remove it from durable storage. User-created tools (source user) are protected \u2014 you cannot remove them; ask the user to delete them in the settings UI instead.",
    parameters: {
      name: {
        type: "string",
        required: true,
        description: "The tool name as shown by custom_tools_list."
      }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", required: true },
          location: { type: "string", required: true },
          total: { type: "integer", required: true }
        }
      },
      render: (_args, value) => [{ type: "text", text: 'Custom tool "' + value.name + '" removed from ' + value.location + " (now " + value.total + " tools there)." }]
    },
    async execute(args) {
      const globalTools = scope.get().tools;
      const workspaceTools = registry.currentWorkspaceTools();
      const globalTarget = globalTools.find((tool) => tool.name === args.name);
      const workspaceTarget = workspaceTools.find((tool) => tool.name === args.name);
      const target = workspaceTarget ?? globalTarget;
      if (target === void 0) throw new Error('no custom tool named "' + args.name + '"');
      if (target.source !== "model") {
        throw new Error('custom tool "' + args.name + '" was created by the user and cannot be removed by the model; ask the user to delete it in the settings UI');
      }
      if (workspaceTarget !== void 0) {
        const next2 = workspaceTools.filter((tool) => tool.name !== args.name);
        const root = registry.writeCurrentWorkspaceTools(next2);
        registry.reconcileWorkspace(root);
        return { name: args.name, location: "workspace", total: next2.length };
      }
      const next = globalTools.filter((tool) => tool.name !== args.name);
      await scope.update({ tools: next });
      return { name: args.name, location: "global", total: next.length };
    }
  }));
  ctx.tools.register(defineTool({
    name: "custom_tools_list",
    description: "List the current custom tools: name, description, source (user or model), scope, location, enabled state, last edit time, and any registration failure. Global-location tools plus this workspace's tools are shown.",
    parameters: {},
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          tools: {
            type: "array",
            required: true,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string", required: true },
                description: { type: "string", required: true },
                source: { type: "string", required: true },
                scope: { type: "string", required: true },
                location: { type: "string", required: true },
                enabled: { type: "boolean", required: true },
                updatedAt: { type: "string", required: true },
                error: { type: "string" }
              }
            }
          }
        }
      },
      render: (_args, value) => {
        const lines = value.tools.map((tool) => {
          const status = tool.error !== void 0 && tool.error !== "" ? " (registration failed: " + tool.error + ")" : tool.enabled ? "" : " (disabled)";
          return "- " + tool.name + " [" + tool.source + " / scope " + tool.scope + " / " + tool.location + "]" + status + ": " + tool.description;
        });
        return [{ type: "text", text: lines.length === 0 ? "No custom tools yet." : lines.join("\n") }];
      }
    },
    async execute() {
      const failures = registry.errors();
      const globalTools = scope.get().tools;
      const workspaceTools = registry.currentWorkspaceTools();
      const view = (tool) => ({
        name: tool.name,
        description: tool.description,
        source: tool.source,
        scope: tool.scope,
        location: tool.location,
        enabled: tool.enabled,
        updatedAt: tool.updatedAt,
        error: failures.get(tool.id) ?? ""
      });
      return { tools: [...globalTools.map(view), ...workspaceTools.map(view)] };
    }
  }));
}

// src/prompt.ts
var PROMPT_SECTION_TEXT = [
  "## Custom tools (custom_tool_create / custom_tool_remove / custom_tools_list)",
  "",
  "You can extend your own toolset while this conversation runs. Call custom_tool_create when a recurring need appears that a small function serves better than inline reasoning: live external data (weather, rates), precise computation (dates, units), the user's private specifics kept restated, or a workflow shortcut. Call custom_tools_list to review the current set. You may prune ONLY tools you created (source model) with custom_tool_remove; tools the user authored (source user) are protected \u2014 if one of those is wrong or obsolete, tell the user and let them delete it in the settings UI. Tools persist across sessions until removed, so keep the set a garden: grow what earns its place, prune what does not. A tool earns its place only when it does something you cannot do inline \u2014 do not create one for a one-off. Announce what you grew or pruned and why.",
  "",
  "The tool code is the BODY of an async JavaScript function with two parameters: `args` (an object matching the JSON Schema you declared in `parameters`) and `env` (currently `{ tool, scope, location }`). Return a JSON value (string, number, boolean, null, array, or plain object); returning undefined is an error. The body runs in an isolated sandbox with NO access to `require`, `import`, or `process`. Available globals: `fetch` (network; disabled when the deployment sets allowNetwork to false), `console`, `TextEncoder`/`TextDecoder`, `URL`/`URLSearchParams`, `atob`/`btoa`, `structuredClone`, `AbortController`, `setTimeout`/`setInterval` and their clear functions. A tool that exceeds its time budget fails, so keep tools fast and total. `parameters` is a JSON Schema with an object root, in the same subset the harness tools use: `type`, `properties`, `required`, `items`, `enum`, `description` only.",
  "",
  "Two pitfalls almost every tool trips on once:",
  "- `fs` is a DIRECT global in the `workspace` scope, like `fetch` \u2014 call `fs.readFile(...)`, never `env.fs`. There is no `env.fs`; reading it yields undefined.",
  '- `env` is a host-provided reference object, NOT plain JSON data. Never return `env` (or `env.scope` / `env.location`, or the whole `args` object you received) as your value \u2014 the result must be freshly built lossless JSON. Returning a host reference fails with "value is not lossless JSON". Build a new plain object with only the fields you mean: `return { city: place.name, temperature: 21 }`.',
  "",
  "Execution scope, chosen via the `scope` parameter of custom_tool_create (default `global`):",
  "- `global`: the network-only sandbox above \u2014 NO filesystem. For one-off file tasks use the built-in read/write/bash tools; for a recurring file task inside the workspace, use the `workspace` scope instead.",
  "- `workspace`: the sandbox above PLUS a DIRECT `fs` GLOBAL (not `env.fs`) confined to the session workspace root: `await fs.readFile(path)`, `await fs.writeFile(path, content)`, `await fs.list(dir?)`. Relative paths resolve from the workspace root; absolute paths must stay inside it; paths that escape the root are rejected.",
  "",
  "Storage location, chosen via the `location` parameter of custom_tool_create (default `workspace` for model-created tools):",
  "- `workspace`: the tool belongs to the CURRENT workspace only \u2014 visible and callable only there. You may create and remove these AUTONOMOUSLY.",
  "- `global`: the tool persists in the shared settings and is available in EVERY workspace until removed. Creating or replacing a global tool requires the user's explicit approval \u2014 call custom_tool_create with location global and the user is asked; if they decline, the call fails and you must tell the user it was declined. Ask for approval only when the tool truly earns a permanent, cross-workspace place (e.g. the user names it a keeper like a pdf reader they want everywhere).",
  "",
  "Combining the two: a tool with location global AND scope workspace (a durable file task the user keeps everywhere, like pdf_read) runs with fs access on whichever workspace it is called from; the approval happens once, at creation."
].join("\n");

// src/index.ts
var name = "dsh-custom-tool";
var inject = ["settings", "tools", "systemPrompt"];
function apply(ctx, config) {
  const scope = registerCustomToolsSettings(ctx, config);
  const registry = new CustomToolRegistry(ctx, config);
  registerModelTools(ctx, scope, config, registry);
  ctx.systemPrompt.section({ name: "custom-tools:guidance", order: 400, text: PROMPT_SECTION_TEXT });
  ctx.effect(() => {
    const stop = scope.watch((next) => {
      registry.reconcile(next.tools);
    });
    registry.reconcile(scope.get().tools);
    const onCreated = ctx.on("agent/created", (payload) => {
      registry.registerAgent(payload.agent);
    });
    const onDisposed = ctx.on("agent/disposed", (payload) => {
      registry.registerAgent(payload.agent);
    });
    return () => {
      onCreated();
      onDisposed();
      stop();
      registry.clear();
    };
  }, "dsh-custom-tool: live tool registry");
}
export {
  CUSTOM_TOOLS_NAMESPACE,
  Config,
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map
