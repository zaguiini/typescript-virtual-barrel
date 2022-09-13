import { patchMethod } from '@typescript-virtual-barrel/core'
import typescript from 'typescript'

type PatchCompilerHostFileResolutionParameters = {
  compilerHost: typescript.CompilerHost
  barrelCache: Map<string, { sourceFile: typescript.SourceFile }>
}

export const patchCompilerHostFileResolution = ({
  compilerHost,
  barrelCache,
}: PatchCompilerHostFileResolutionParameters) => {
  patchMethod(compilerHost, 'fileExists', (original, fileName) => {
    if (barrelCache.has(fileName)) {
      return true
    }

    return original(fileName)
  })

  patchMethod(compilerHost, 'getSourceFile', (original, fileName, ...args) => {
    const cacheEntry = barrelCache.get(fileName)

    if (cacheEntry) {
      return cacheEntry.sourceFile
    }

    return original(fileName, ...args)
  })
}
