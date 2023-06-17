import ts from 'typescript/lib/tsserverlibrary'
import path from 'path'

const noop = () => undefined

export const prefix = (file: string) => path.join(__dirname, file)

const logger: ts.server.Logger = {
  close: noop,
  hasLevel: () => false,
  loggingEnabled: () => true,
  perftrc: noop,
  info: noop,
  startGroup: noop,
  endGroup: noop,
  msg: noop,
  getLogFileName: noop,
}

const NOOP_FILE_WATCHER: ts.FileWatcher = {
  close: noop,
}

class MockFileWatcher implements ts.FileWatcher {
  constructor(
    private readonly fileName: string,
    private readonly cb: ts.FileWatcherCallback,
    readonly close: () => void
  ) {}

  changed() {
    this.cb(this.fileName, ts.FileWatcherEventKind.Changed)
  }

  deleted() {
    this.cb(this.fileName, ts.FileWatcherEventKind.Deleted)
  }
}

export class MockFileSystem
  implements
    Pick<ts.server.ServerHost, 'readFile' | 'fileExists' | 'watchFile'>
{
  private files = new Map<string, string>()
  private watchers = new Map<string, MockFileWatcher>()

  constructor(files: Map<string, string>) {
    this.files = files
  }

  readFile = (file: string, encoding?: string) => {
    const read = this.files.get(file) ?? ts.sys.readFile(file, encoding)
    return read
  }

  fileExists = (file: string) => {
    return this.files.has(file) || ts.sys.fileExists(file)
  }

  watchFile = (path: string, callback: ts.FileWatcherCallback) => {
    const watcher = new MockFileWatcher(path, callback, () => {
      this.watchers.delete(path)
    })
    this.watchers.set(path, watcher)
    return watcher
  }

  directoryExists = (directory: string) => {
    const existingFiles = [...this.files.keys()]

    return existingFiles.some((file) => path.dirname(file).includes(directory))
  }

  currentDirectory = () => __dirname

  getDirectories = () => {
    return [
      ...new Set([...this.files.keys()].map((file) => path.dirname(file))),
    ]
  }

  readDirectory = (directory: string) => {
    const existingFiles = [...this.files.keys()]

    const folderFiles = existingFiles.filter((file) =>
      path.dirname(file).includes(directory)
    )

    return folderFiles
  }

  notifyChanges = (changedFileName: string) => {
    for (const [fileName, watcher] of this.watchers) {
      if (fileName === changedFileName) {
        watcher.changed()
      }
    }
  }
}

const tsConfig = {
  include: ['src'],
  compilerOptions: {
    plugins: [
      {
        name: '@typescript-virtual-barrel/language-service-plugin',
      },
    ],
    resolveJsonModule: true,
  },
}

export const createProject = (files: Map<string, string>) => {
  const fileSystem = new MockFileSystem(files)

  const TSCONFIG = prefix('/tsconfig.json')

  files.set(TSCONFIG, JSON.stringify(tsConfig))

  const host: ts.server.ServerHost = {
    ...ts.sys,
    watchDirectory: () => NOOP_FILE_WATCHER,
    setTimeout: noop,
    clearTimeout: noop,
    setImmediate: noop,
    clearImmediate: noop,
    ...fileSystem,
  }

  const projectService = new ts.server.ProjectService({
    host,
    cancellationToken: ts.server.nullCancellationToken,
    useSingleInferredProject: false,
    useInferredProjectPerProjectRoot: true,
    typingsInstaller: ts.server.nullTypingsInstaller,
    session: undefined,
    logger,
    serverMode: ts.LanguageServiceMode.Semantic,
  })

  projectService.openClientFile(prefix('/src/index.ts'))

  const project = projectService.findProject(TSCONFIG)

  if (!project) {
    throw new Error(`Failed to create project for ${TSCONFIG}`)
  }

  return { project, fileSystem }
}
