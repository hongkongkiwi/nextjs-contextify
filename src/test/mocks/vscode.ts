// Mock VS Code API for unit testing
export const window = {
  showInformationMessage: (message: string) => {
    console.log('[INFO]', message);
    return Promise.resolve();
  },
  showWarningMessage: (message: string) => {
    console.log('[WARN]', message);
    return Promise.resolve();
  },
  showErrorMessage: (message: string) => {
    console.log('[ERROR]', message);
    return Promise.resolve();
  },
  createOutputChannel: (name: string) => ({
    append: (value: string) => console.log(`[${name}]`, value),
    appendLine: (value: string) => console.log(`[${name}]`, value),
    show: () => {},
    hide: () => {},
    dispose: () => {}
  })
};

export const workspace = {
  getConfiguration: (section?: string) => ({
    get: (key: string, defaultValue?: any) => defaultValue,
    has: (key: string) => false,
    inspect: (key: string) => undefined,
    update: (key: string, value: any) => Promise.resolve()
  }),
  workspaceFolders: [],
  onDidChangeConfiguration: () => ({ dispose: () => {} })
};

export const commands = {
  registerCommand: (command: string, callback: Function) => ({ dispose: () => {} }),
  executeCommand: (command: string, ...args: any[]) => Promise.resolve()
};

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3
};

// Mock disposable
export const Disposable = {
  from: (...disposables: any[]) => ({ dispose: () => {} })
}; 