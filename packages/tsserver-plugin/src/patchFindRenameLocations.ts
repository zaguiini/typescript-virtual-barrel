import { patchMethod } from '@typescript-virtual-barrel/core'
import tslibrary from 'typescript/lib/tsserverlibrary'
import path from 'path'

export const patchFindRenameLocations = (
  info: tslibrary.server.PluginCreateInfo,
  isVirtualFile: (fileName: string) => boolean
) => {
  patchMethod(
    info.languageService,
    'findRenameLocations',
    (original, fileName, position, ...args) => {
      const originalRenameLocations = original(fileName, position, ...args)

      const folderBarrel = path.join(path.dirname(fileName), 'index.ts')

      if (!originalRenameLocations || !isVirtualFile(folderBarrel)) {
        return originalRenameLocations
      }

      return info.languageService
        .findReferences(fileName, position)
        ?.map((symbol) => symbol.references)
        .flat()
    }
  )
}
