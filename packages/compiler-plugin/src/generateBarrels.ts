import typescript from 'typescript'

import {
  ExportedEntities,
  calculateBarrel,
} from '@typescript-virtual-barrel/core'

type BarrelFile = {
  sourceFile: typescript.SourceFile
  barrelEntities: ExportedEntities
}

export type BarrelCache = Map<string, BarrelFile>

export type DiagnosticCache = Map<string, typescript.DiagnosticWithLocation[]>

type GenerateBarrelsParameters = {
  folders: string[]
  program: typescript.Program
  readDirectory: typescript.CompilerHost['readDirectory']
  tsInstance: typeof typescript
}

export const generateBarrelsForFolders = ({
  folders,
  program,
  readDirectory,
  tsInstance,
}: GenerateBarrelsParameters) => {
  const { printFile } = tsInstance.createPrinter()

  const barrelCache: BarrelCache = new Map()
  let diagnosticCache: DiagnosticCache = new Map()

  folders.forEach((folderPath) => {
    const fileName = tsInstance.normalizePath(
      tsInstance.combinePaths(folderPath, 'index.ts')
    )

    const newBarrel = calculateBarrel(
      program,
      folderPath,
      readDirectory ?? tsInstance.sys.readDirectory
    )

    const sourceFile = tsInstance.createSourceFile(
      fileName,
      printFile(newBarrel.sourceFile) || 'export {};',
      tsInstance.ScriptTarget.Latest
    )

    barrelCache.set(fileName, {
      sourceFile,
      barrelEntities: newBarrel.barrelEntities,
    })

    if (newBarrel.diagnostics.size > 0) {
      diagnosticCache = new Map([...diagnosticCache, ...newBarrel.diagnostics])
    }
  })

  return { barrelCache, diagnosticCache }
}
