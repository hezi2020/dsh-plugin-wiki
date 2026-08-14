/**
 * Monaco (VS Code) editor for one tool body: JavaScript with TypeScript
 * language-service intellisense. `args` is typed from the tool's parameters
 * JSON Schema; `env` and the sandbox contract come from a fixed extra lib.
 */
import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import * as monaco from 'monaco-editor'
import { customToolExtraLib } from '../../shared/interface.ts'
import { getWorkerUrl } from './workers.ts'


/** Language defaults install once per page; shared across editor instances. */
let languageDefaultsInstalled = false
function installLanguageDefaults(): void {
  if (languageDefaultsInstalled) return
  languageDefaultsInstalled = true
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: true,
    strict: false,
  })
}

export interface MonacoToolEditorProps {
  /** Current tool body text; external updates replace the model content. */
  value: string
  /** The tool's parameters JSON Schema (object root), or null while invalid. */
  parametersSchema: unknown | null
  onChange: (code: string) => void
  theme: 'light' | 'dark'
}

/** One Monaco instance bound to one tool body. */
export function MonacoToolEditor(props: MonacoToolEditorProps): ReactNode {
  const hostRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const onChangeRef = useRef(props.onChange)
  onChangeRef.current = props.onChange

  // Mount once: worker environment, language defaults, and the editor instance.
  useEffect(() => {
    const host = hostRef.current
    if (host === null) return
    ;(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
      getWorker: (_moduleId: string, label: string) => new Worker(getWorkerUrl(label)),
    }
    installLanguageDefaults()
    const editor = monaco.editor.create(host, {
      value: props.value,
      language: 'javascript',
      automaticLayout: true,
      minimap: { enabled: false },
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 13,
      tabSize: 2,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
    })
    editorRef.current = editor
    const subscription = editor.onDidChangeModelContent(() => { onChangeRef.current(editor.getValue()) })
    // The settings panel animates in; automaticLayout can measure a collapsed
    // host before the layout settles, so force one layout on the next frame.
    requestAnimationFrame(() => { editor.layout() })
    return () => {
      subscription.dispose()
      editor.dispose()
      editorRef.current = null
    }
    // The editor instance outlives prop changes; those sync through the effects below.
  }, [])

  // The args/env extra lib follows the parameters schema the user is editing.
  const extraLib = useMemo(() => {
    if (props.parametersSchema === null) return 'declare const args: Record<string, unknown>\ndeclare const env: { readonly tool: string }\n'
    return customToolExtraLib(props.parametersSchema)
  }, [props.parametersSchema])

  useEffect(() => {
    // Re-adding under the same path replaces the previous declaration.
    monaco.languages.typescript.javascriptDefaults.addExtraLib(extraLib, 'ts:dsh-custom-tool.d.ts')
  }, [extraLib])

  useEffect(() => {
    const editor = editorRef.current
    if (editor === null) return
    if (editor.getValue() !== props.value) editor.setValue(props.value)
  }, [props.value])

  useEffect(() => {
    monaco.editor.setTheme(props.theme === 'light' ? 'vs' : 'vs-dark')
  }, [props.theme])

  return <div ref={hostRef} className="dct-editor-host" />
}
