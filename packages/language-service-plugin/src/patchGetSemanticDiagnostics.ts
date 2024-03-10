import {
  getExportsOfSourceFile,
  patchMethod,
} from '@typescript-virtual-barrel/core'
import tslibrary from 'typescript/lib/tsserverlibrary'
import typescript from 'typescript'

export const patchGetSemanticDiagnostics = (
  info: tslibrary.server.PluginCreateInfo
) => {
  patchMethod(
    info.languageService,
    'getSemanticDiagnostics',
    (original, fileName) => {
      const originalDiagnostics = original(fileName)

      const program = info.languageService.getProgram()

      if (!program) {
        return originalDiagnostics
      }

      const sourceFile = program.getSourceFile(fileName)

      if (!sourceFile) {
        return originalDiagnostics
      }

      const result = getExportsOfSourceFile({
        sourceFile: sourceFile as typescript.SourceFile,
        checker: program.getTypeChecker() as unknown as typescript.TypeChecker,
      })

      const additionalDiagnostics = result?.diagnostics ?? []

      if (additionalDiagnostics.length > 0) {
        originalDiagnostics.push(
          ...(additionalDiagnostics as tslibrary.Diagnostic[])
        )
      }

      return originalDiagnostics
    }
  )
}
