import { patchMethod } from '@typescript-virtual-barrel/core'
import typescript from 'typescript'
import { createImportRewriter } from './createImportRewriter'
import { BarrelCache } from './generateBarrels'

type PatchCompilerHostFileWriterParameters = {
  compilerHost: typescript.CompilerHost
  tsInstance: typeof typescript
  compilerOptions: typescript.CompilerOptions
  shouldTransformImports: boolean
  barrelCache: BarrelCache
}

export const patchCompilerHostFileWriter = ({
  compilerHost,
  tsInstance,
  compilerOptions,
  shouldTransformImports,
  barrelCache,
}: PatchCompilerHostFileWriterParameters) => {
  const { printFile } = tsInstance.createPrinter({
    module: compilerOptions.module,
    target: compilerOptions.target,
  })

  patchMethod(
    compilerHost,
    'writeFile',
    (original, fileName, text, writeBOM, onError, sourceFiles, data) => {
      /* User said we should preserve the generated barrel file, so let's write it */
      if (!shouldTransformImports) {
        return original(fileName, text, writeBOM, onError, sourceFiles, data)
      }

      const [sourceFile] = sourceFiles ?? []

      /* Did not find the related source file, let's forward it to the original TS function */
      if (!sourceFile) {
        return original(fileName, text, writeBOM, onError, sourceFiles, data)
      }

      /* User said we should transform imports, so let's not write the barrel file */
      if (barrelCache.has(sourceFile.fileName)) {
        return
      }

      /* Time to rewrite some imports! */
      const transformer = createImportRewriter({
        tsInstance,
        host: compilerHost,
        compilerOptions,
        getBarrelEntities: (barrelFileName) =>
          barrelCache.get(barrelFileName)?.barrelEntities,
      })

      const [transformedFile] = tsInstance.transform(
        (sourceFile.original as typescript.SourceFile) ?? sourceFile,
        [transformer.importRewriter],
        compilerOptions
      ).transformed

      /* No barrel imports detected -- let's just write the original file */
      if (!transformer.hasRewrittenImports) {
        return original(fileName, text, writeBOM, onError, sourceFiles, data)
      }

      /* The file was transformed, so let's emit the transformed version */
      const modifiedFile = tsInstance.createSourceFile(
        transformedFile.fileName,
        printFile(transformedFile) || 'export {};',
        compilerOptions.target ?? tsInstance.ScriptTarget.ES3,
        true,
        transformedFile.scriptKind
      )

      /* Since the `writeFile` function runs in the emit phase, we need to
       * transpile the file to match the target runtime
       * specified in the compiler options.
       */
      const output = tsInstance.transpileModule(modifiedFile.text, {
        compilerOptions,
      }).outputText

      return original(fileName, output, writeBOM, onError, sourceFiles, data)
    }
  )
}
