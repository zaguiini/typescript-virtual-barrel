import typescript from 'typescript'

type FileName = string
type Version = string

type BarrelGraph = Record<FileName, Version>

export type BarrelCache = Map<string, BarrelGraph>

interface UpsertBarrelParameters {
  barrelName: string
  includedFiles: string[]
}

export type UpsertBarrel = (parameters: UpsertBarrelParameters) => void

type CreateBarrelRegistryParameters = {
  projectFolders: string[]
  getModuleVersion: (fileName: string) => string | undefined
}

export const createBarrelRegistry = ({
  projectFolders,
  getModuleVersion,
}: CreateBarrelRegistryParameters) => {
  const createdBarrels: BarrelCache = new Map()

  const isVirtualFile = (fileName: string) => createdBarrels.has(fileName)

  const upsertBarrel: UpsertBarrel = ({ barrelName, includedFiles }) => {
    createdBarrels.set(
      barrelName,
      includedFiles.reduce<BarrelGraph>((acc, file) => {
        acc[file] = getModuleVersion(file) ?? 'unknown'
        return acc
      }, {})
    )
  }

  projectFolders.forEach((folderName) => {
    upsertBarrel({
      barrelName: typescript.combinePaths(folderName, 'index.ts'),
      includedFiles: [],
    })
  })

  return {
    createdBarrels,
    isVirtualFile,
    upsertBarrel,
    deleteBarrel: (fileName: string) => createdBarrels.delete(fileName),
  }
}
