/**
 * Blob-URL worker factories: the Monaco workers ship as inline sources inside
 * the single client bundle, so no extra files need serving.
 */
import { editorWorkerSource, tsWorkerSource } from './workers.generated.ts'

let editorUrl: string | null = null
let tsUrl: string | null = null

function blobUrl(source: string): string {
  return URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
}

/**
 * Worker URL for one Monaco worker label.
 * @param label - the Monaco worker label ('typescript' | 'javascript' | others).
 * @returns a blob URL for the matching inline worker source.
 */
export function getWorkerUrl(label: string): string {
  if (label === 'typescript' || label === 'javascript') {
    tsUrl ??= blobUrl(tsWorkerSource)
    return tsUrl
  }
  editorUrl ??= blobUrl(editorWorkerSource)
  return editorUrl
}
