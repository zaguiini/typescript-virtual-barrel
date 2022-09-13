import { CompilerHost, Program } from 'typescript'
import { PluginConfig, ProgramTransformerExtras } from 'ts-patch'
import { getFoldersWithoutIndexFile } from '@typescript-virtual-barrel/core'
import { generateBarrelsForFolders } from './generateBarrels'
import { patchCompilerHostFileResolution } from './patchCompilerHostFileResolution'
import { patchCompilerHostFileWriter } from './patchCompilerHostFileWriter'
import { patchGetSemanticDiagnostics } from './patchGetSemanticDiagnostics'

export default function transformProgram(
  program: Program,
  host: CompilerHost | undefined,
  { shouldTransformImports = true }: PluginConfig,
  { ts: tsInstance }: ProgramTransformerExtras
): Program {
  const compilerOptions = program.getCompilerOptions()

  /**
   * We scan the project looking for folders that do not have an index file.
   */
  const rootFileNames = program.getRootFileNames().map(tsInstance.normalizePath)
  const projectFoldersWithoutIndexFile =
    getFoldersWithoutIndexFile(rootFileNames)

  /**
   * Then we generate the barrels for those folders.
   */
  const { barrelCache, diagnosticCache } = generateBarrelsForFolders({
    folders: projectFoldersWithoutIndexFile,
    program,
    readDirectory: host?.readDirectory,
    tsInstance,
  })

  const compilerHost =
    host ?? tsInstance.createCompilerHost(compilerOptions, true)

  /**
   * Then we modify the compiler host in order to find the generated barrels
   * when building the TypeScript program.
   */
  patchCompilerHostFileResolution({ compilerHost, barrelCache })

  /**
   * We also need to patch the writeFile function so that we either
   * write transformed files, or write the barrel files when emitting.
   */
  patchCompilerHostFileWriter({
    compilerHost,
    barrelCache,
    compilerOptions,
    shouldTransformImports,
    tsInstance,
  })

  /**
   * Then, we need to recreate the program with our additional files
   * so TypeScript knows about their existence.
   */
  const newProgram = tsInstance.createProgram(
    [...rootFileNames, ...barrelCache.keys()],
    compilerOptions,
    compilerHost
  )

  /**
   * Finally, we want to include the issues we found when
   * scanning the folders so that we can help the user
   * troubleshoot potential odd behaviors.
   */
  patchGetSemanticDiagnostics({
    program: newProgram,
    diagnosticCache,
  })

  return newProgram
}
