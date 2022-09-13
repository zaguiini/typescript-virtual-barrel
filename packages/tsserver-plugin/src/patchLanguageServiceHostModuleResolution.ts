import { patchMethod } from '@typescript-virtual-barrel/core'
import tslibrary from 'typescript/lib/tsserverlibrary'

type PatchLanguageServiceHostModuleResolution = {
  languageServiceHost: tslibrary.LanguageServiceHost
  getAdditionalFileNames: () => string[]
  resolveModuleName: (
    moduleName: string,
    containingFile: string
  ) => tslibrary.ResolvedModuleWithFailedLookupLocations
}

export const patchLanguageServiceHostModuleResolution = ({
  languageServiceHost,
  getAdditionalFileNames,
  resolveModuleName,
}: PatchLanguageServiceHostModuleResolution) => {
  patchMethod(
    languageServiceHost,
    'resolveModuleNames',
    (original, moduleNames, containingFile, ...args) => {
      const result = original?.(moduleNames, containingFile, ...args)

      if (!result) {
        return result
      }

      return moduleNames.map((moduleName, index) => {
        const resolution = result[index]

        if (resolution) {
          return resolution
        }

        // This is necessary so it uses the patched serverHost that includes barrel files
        const { resolvedModule } = resolveModuleName(moduleName, containingFile)

        if (resolvedModule) {
          return {
            resolvedFileName: resolvedModule.resolvedFileName,
            isExternalLibraryImport: false,
          }
        }

        return resolution
      })
    }
  )

  patchMethod(languageServiceHost, 'getScriptFileNames', (original) => {
    return [...new Set([...original(), ...getAdditionalFileNames()])]
  })
}
