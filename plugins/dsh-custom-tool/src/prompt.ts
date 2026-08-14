/** Model-facing guidance injected as a system-prompt section: the code contract and the grow/prune discipline. */

export const PROMPT_SECTION_TEXT = [
  '## Custom tools (custom_tool_create / custom_tool_remove / custom_tools_list)',
  '',
  'You can extend your own toolset while this conversation runs. Call custom_tool_create when a recurring need appears that a small function serves better than inline reasoning: live external data (weather, rates), precise computation (dates, units), the user\'s private specifics kept restated, or a workflow shortcut. Call custom_tools_list to review the current set. You may prune ONLY tools you created (source model) with custom_tool_remove; tools the user authored (source user) are protected — if one of those is wrong or obsolete, tell the user and let them delete it in the settings UI. Tools persist across sessions until removed, so keep the set a garden: grow what earns its place, prune what does not. A tool earns its place only when it does something you cannot do inline — do not create one for a one-off. Announce what you grew or pruned and why.',
  '',
  'The tool code is the BODY of an async JavaScript function with two parameters: `args` (an object matching the JSON Schema you declared in `parameters`) and `env` (currently `{ tool, scope, location }`). Return a JSON value (string, number, boolean, null, array, or plain object); returning undefined is an error. The body runs in an isolated sandbox with NO access to `require`, `import`, or `process`. Available globals: `fetch` (network; disabled when the deployment sets allowNetwork to false), `console`, `TextEncoder`/`TextDecoder`, `URL`/`URLSearchParams`, `atob`/`btoa`, `structuredClone`, `AbortController`, `setTimeout`/`setInterval` and their clear functions. A tool that exceeds its time budget fails, so keep tools fast and total. `parameters` is a JSON Schema with an object root, in the same subset the harness tools use: `type`, `properties`, `required`, `items`, `enum`, `description` only.',
  '',
  'Two pitfalls almost every tool trips on once:',
  '- `fs` is a DIRECT global in the `workspace` scope, like `fetch` — call `fs.readFile(...)`, never `env.fs`. There is no `env.fs`; reading it yields undefined.',
  '- `env` is a host-provided reference object, NOT plain JSON data. Never return `env` (or `env.scope` / `env.location`, or the whole `args` object you received) as your value — the result must be freshly built lossless JSON. Returning a host reference fails with "value is not lossless JSON". Build a new plain object with only the fields you mean: `return { city: place.name, temperature: 21 }`.',
  '',
  'Execution scope, chosen via the `scope` parameter of custom_tool_create (default `global`):',
  '- `global`: the network-only sandbox above — NO filesystem. For one-off file tasks use the built-in read/write/bash tools; for a recurring file task inside the workspace, use the `workspace` scope instead.',
  '- `workspace`: the sandbox above PLUS a DIRECT `fs` GLOBAL (not `env.fs`) confined to the session workspace root: `await fs.readFile(path)`, `await fs.writeFile(path, content)`, `await fs.list(dir?)`. Relative paths resolve from the workspace root; absolute paths must stay inside it; paths that escape the root are rejected.',
  '',
  'Storage location, chosen via the `location` parameter of custom_tool_create (default `workspace` for model-created tools):',
  '- `workspace`: the tool belongs to the CURRENT workspace only — visible and callable only there. You may create and remove these AUTONOMOUSLY.',
  '- `global`: the tool persists in the shared settings and is available in EVERY workspace until removed. Creating or replacing a global tool requires the user\'s explicit approval — call custom_tool_create with location global and the user is asked; if they decline, the call fails and you must tell the user it was declined. Ask for approval only when the tool truly earns a permanent, cross-workspace place (e.g. the user names it a keeper like a pdf reader they want everywhere).',
  '',
  'Combining the two: a tool with location global AND scope workspace (a durable file task the user keeps everywhere, like pdf_read) runs with fs access on whichever workspace it is called from; the approval happens once, at creation.',
].join('\n')

