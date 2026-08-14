/**
 * Translate a DSH GenerateOptions into the Antigravity wrapped request.
 *
 * Envelope shape follows the actively-maintained OmniRoute wire format
 * (the archived opencode reference predates it): top-level `project`,
 * `requestId`, `model`, `userAgent`, `requestType`, with the Gemini-style
 * body under `request` (contents/systemInstruction/tools/generationConfig/
 * sessionId). `toolConfig` VALIDATED is attached when tools are present, and
 * Claude-path requests strip trailing model turns (Vertex rejects "assistant
 * message prefill").
 *
 * Thinking blocks are carried as-is (Gemini `thought` parts); nothing is
 * stripped or re-signed — that signature dance was an artifact of the
 * reference plugin's interception architecture (see docs/ARCHITECTURE.md).
 */

import type { ContentBlock, GenerateOptions, Message, ToolSchema } from '@deepseek-ai/dsh-llm'
import { generateAntigravityRequestId } from '../runtime/identity.ts'
import { getThoughtSignature, THOUGHT_SIGNATURE_SENTINEL } from '../runtime/signature-cache.ts'

export type AgyPart =
  | { text: string }
  | { thought: true; text: string }
  | { thoughtSignature: string; functionCall: { id: string; name: string; args: unknown } }
  | { functionResponse: { name: string; response: unknown } }

export interface AgyContent {
  role: 'user' | 'model'
  parts: AgyPart[]
}

export interface AgyRequestBody {
  project?: string
  requestId?: string
  model: string
  userAgent?: string
  requestType?: 'agent'
  request: {
    contents: AgyContent[]
    systemInstruction?: { parts: Array<{ text: string }> }
    tools?: Array<{ functionDeclarations: Array<{ name: string; description: string; parameters: unknown }> }>
    toolConfig?: { functionCallingConfig: { mode: 'VALIDATED' } }
    generationConfig?: {
      temperature?: number
      maxOutputTokens?: number
      stopSequences?: string[]
    }
    sessionId?: string
  }
}

/** Whether a model id belongs to a Claude-branded model (Vertex-hosted). */
export function isClaudeModel(model: string): boolean {
  return model.startsWith('claude-') || model.includes('/claude')
}

/**
 * Vertex (the Antigravity Claude backend) rejects conversations ending on an
 * assistant/model turn ("assistant message prefill"); never strip to empty.
 */
export function stripTrailingModelTurn(contents: AgyContent[]): AgyContent[] {
  while (contents.length > 1 && contents[contents.length - 1]?.role === 'model') {
    contents.pop()
  }
  return contents
}

/** Recursively remove `enumDescriptions` from tool schemas (upstream rejects with 400). */
function stripEnumDescriptions(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') return schema
  if (Array.isArray(schema)) return schema.map((entry) => stripEnumDescriptions(entry))
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (key !== 'enumDescriptions') result[key] = stripEnumDescriptions(value)
  }
  return result
}

/** Collect tool-call names by id so tool-result blocks can name their function. */
function buildToolNameIndex(messages: readonly Message[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const message of messages) {
    for (const block of message.content) {
      if (block.type === 'tool-call') {
        index.set(block.id, block.name)
      }
    }
  }
  return index
}

function blockToParts(block: ContentBlock, toolNames: Map<string, string>): AgyPart[] {
  switch (block.type) {
    case 'text':
      return [{ text: block.text }]
    case 'reasoning':
      return [{ thought: true, text: block.text }]
    case 'tool-call': {
      let args: unknown = block.arguments
      try {
        args = JSON.parse(block.arguments) as unknown
      } catch {
        // raw string args fall through (backend tolerates both)
      }
      // Antigravity rejects functionCall parts without a thoughtSignature
      // (400). Replay the signature captured for this tool call id on the
      // previous turn; the sentinel is the established bypass when nothing is
      // cached (both reference implementations default to it).
      const signature = getThoughtSignature(block.id) ?? THOUGHT_SIGNATURE_SENTINEL
      return [{
        thoughtSignature: signature,
        functionCall: { id: block.id, name: block.name, args },
      }]
    }
    case 'tool-result': {
      const name = toolNames.get(block.toolCallId) ?? block.toolCallId
      const text = block.content
        .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
      return [{
        functionResponse: {
          name,
          response: { result: text, is_error: block.isError === true },
        },
      }]
    }
    default:
      return [] // unknown block types (merge-extensible) are skipped
  }
}

function messageToContent(message: Message, toolNames: Map<string, string>): AgyContent | null {
  const parts = message.content.flatMap((block) => blockToParts(block, toolNames))
  if (parts.length === 0) return null
  const role = message.role === 'assistant' ? 'model' : 'user'
  return { role, parts }
}

function toolsToDeclarations(tools: ToolSchema[] | undefined): AgyRequestBody['request']['tools'] {
  if (!tools || tools.length === 0) return undefined
  return [{
    functionDeclarations: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: stripEnumDescriptions(tool.parameters),
    })),
  }]
}

/** Build the wrapped Antigravity request body for one call. */
export function toAgyRequestBody(
  options: GenerateOptions,
  context: { projectId?: string; sessionId?: string },
): AgyRequestBody {
  const toolNames = buildToolNameIndex(options.messages)
  let contents = options.messages
    .map((message) => messageToContent(message, toolNames))
    .filter((c): c is AgyContent => c !== null)
  if (isClaudeModel(options.model)) {
    contents = stripTrailingModelTurn(contents)
  }

  const tools = toolsToDeclarations(options.tools)
  const generationConfig: NonNullable<AgyRequestBody['request']['generationConfig']> = {}
  if (options.temperature !== undefined) generationConfig.temperature = options.temperature
  if (options.maxTokens !== undefined) generationConfig.maxOutputTokens = options.maxTokens
  if (options.stop !== undefined && options.stop.length > 0) generationConfig.stopSequences = options.stop

  return {
    project: context.projectId || undefined,
    requestId: generateAntigravityRequestId(),
    model: options.model,
    userAgent: 'antigravity',
    requestType: 'agent',
    request: {
      contents,
      ...(options.system ? { systemInstruction: { parts: [{ text: options.system }] } } : {}),
      ...(tools ? { tools } : {}),
      ...(tools ? { toolConfig: { functionCallingConfig: { mode: 'VALIDATED' } } } : {}),
      ...(Object.keys(generationConfig).length > 0 ? { generationConfig } : {}),
      ...(context.sessionId ? { sessionId: context.sessionId } : {}),
    },
  }
}
