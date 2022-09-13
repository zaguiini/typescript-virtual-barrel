import { patchMethod } from '@typescript-virtual-barrel/core'
import tslibrary from 'typescript/lib/tsserverlibrary'

export const patchFindReferences = (
  info: tslibrary.server.PluginCreateInfo,
  isVirtualFile: (fileName: string) => boolean
) => {
  patchMethod(
    info.languageService,
    'findReferences',
    (original, fileName, position) => {
      const references = original(fileName, position) ?? []
      const newReferences: tslibrary.ReferencedSymbol[] = []

      for (const reference of references) {
        const { definition, references } = reference

        if (!isVirtualFile(definition.fileName)) {
          newReferences.push({
            definition,
            references: references.filter(
              (ref) => !isVirtualFile(ref.fileName)
            ),
          })
          continue
        }

        if (newReferences.length === 0) {
          continue
        }

        newReferences[newReferences.length - 1].references.push(
          ...references.filter((ref) => !isVirtualFile(ref.fileName))
        )
      }

      return newReferences
    }
  )
}
