import { readdirSync } from 'fs'
import path from 'path'
import typescript from 'typescript'

export const getDirFiles = (dir: string): string[] => {
  const dirents = readdirSync(dir, { withFileTypes: true })

  const files = dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name)
    return dirent.isDirectory() ? getDirFiles(res) : res
  })

  return files.flat()
}

export const compile = async (
  fixture: string,
  transformerOptions: { shouldTransformImports?: boolean } = {},
  compilerOptions: typescript.CompilerOptions = {}
) => {
  const fixtureDir = path.join(__dirname, '__fixtures__', fixture)
  const outDir = path.join(fixtureDir, 'expected')

  const options: typescript.CompilerOptions = {
    target: typescript.ScriptTarget.ESNext,
    outDir,
    module: typescript.ModuleKind.ESNext,
    moduleResolution: typescript.ModuleResolutionKind.NodeNext,
    jsx: typescript.JsxEmit.Preserve,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
    plugins: [
      {
        // @ts-expect-error This is a property from `ts-patch`.
        transform: path.resolve(__dirname, '../src/index.ts'),
        transformProgram: true,
        ...transformerOptions,
      },
    ],
    ...compilerOptions,
  }

  const fileMap = new Map<string, string>()

  const host = typescript.createCompilerHost(options)

  const program = typescript.createProgram({
    rootNames: getDirFiles(path.join(fixtureDir, 'src')),
    host: {
      ...host,
      writeFile: (fileName, content, ...args) => {
        fileMap.set(fileName, content)

        if (process.env.WRITE_TRANSFORMED_FILES) {
          return host.writeFile(fileName, content, ...args)
        }
      },
    },
    options,
  })

  program.emit()

  return {
    diagnostics: typescript.formatDiagnostics(
      program.getSemanticDiagnostics(),
      {
        getCurrentDirectory: () => fixtureDir,
        getCanonicalFileName: typescript.identity,
        getNewLine: () => '\n',
      }
    ),
    fileMap,
    fixtureDir,
    outDir,
  }
}
