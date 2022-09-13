import typescript from 'typescript'
import path from 'path'

export const getFoldersWithoutIndexFile = (includedFileNames: string[]) => {
  const foldersWithoutIndexFile = new Set<string>()

  for (const fileName of includedFileNames) {
    const folderName = path.dirname(fileName)
    const indexFileName = typescript.combinePaths(folderName, 'index.ts')

    if (!includedFileNames.includes(indexFileName)) {
      foldersWithoutIndexFile.add(folderName)
    }
  }

  return Array.from(foldersWithoutIndexFile)
}
