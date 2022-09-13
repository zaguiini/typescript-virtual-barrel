import typescript from 'typescript'
import { DiagnosticCache } from './generateBarrels'
import { patchMethod } from '@typescript-virtual-barrel/core'

type PatchGetSemanticDiagnosticsParameters = {
  program: typescript.Program
  diagnosticCache: DiagnosticCache
}

export const patchGetSemanticDiagnostics = ({
  program,
  diagnosticCache,
}: PatchGetSemanticDiagnosticsParameters) => {
  patchMethod(
    program,
    'getSemanticDiagnostics',
    (original, sourceFile, ...args) => {
      const originalDiagnostics = original(sourceFile, ...args)

      if (sourceFile) {
        const additionalDiagnostics = diagnosticCache.get(sourceFile.fileName)

        if (additionalDiagnostics) {
          return [...originalDiagnostics, ...additionalDiagnostics]
        }

        return originalDiagnostics
      }

      const additionalDiagnostics = [...diagnosticCache.values()].flat()

      return [...originalDiagnostics, ...additionalDiagnostics]
    }
  )
}
