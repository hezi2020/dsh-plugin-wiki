/** Node-safe Monaco mock: the real bundle only runs in the browser editor. */
export const languages = {
  typescript: {
    ScriptTarget: { ES2022: 8 },
    ModuleResolutionKind: { NodeJs: 2 },
    javascriptDefaults: {
      setCompilerOptions: () => {},
      addExtraLib: () => ({ dispose: () => {} }),
      removeExtraLib: () => {},
    },
  },
}

export const editor = {
  create: () => ({
    getValue: () => '',
    setValue: () => {},
    onDidChangeModelContent: () => ({ dispose: () => {} }),
    dispose: () => {},
  }),
  setTheme: () => {},
}

export default { languages, editor }
