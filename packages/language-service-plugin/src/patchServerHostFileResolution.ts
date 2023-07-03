import { patchMethod } from '@typescript-virtual-barrel/core'
import path from 'path'
import tslibrary from 'typescript/lib/tsserverlibrary'
import { getOriginalCasedFileName } from './getOriginalCasedFileName'

type PatchServerHostFileResolutionParameters = {
  serverHost: tslibrary.server.ServerHost
  rootDir: string
  projectDirs: string[]
  isVirtualFile: (fileName: string) => boolean
  deleteBarrel: (fileName: string) => void
  createBarrel: (fileName: string) => void
}

export const patchServerHostFileResolution = ({
  serverHost,
  rootDir,
  projectDirs,
  isVirtualFile,
  deleteBarrel,
  createBarrel,
}: PatchServerHostFileResolutionParameters) => {
  patchMethod(serverHost, 'directoryExists', (original, dirName) => {
    const directoryExists = original(dirName)

    if (directoryExists) {
      return true
    }

    const barrelCandidate = path.join(dirName, 'index.ts')

    /**
     * If the directory doesn't exist, but there is a leftover barrel
     * in the registry, let's remove it.
     */
    if (isVirtualFile(barrelCandidate)) {
      deleteBarrel(barrelCandidate)
    }

    return false
  })

  patchMethod(serverHost, 'fileExists', (original, fileName) => {
    const result = original(fileName)

    /**
     * If the file exists on the disk, let's remove the barrel and update the project
     */
    if (result) {
      const barrelFile = getOriginalCasedFileName(fileName, rootDir)

      if (isVirtualFile(barrelFile)) {
        deleteBarrel(barrelFile)
      }

      return true
    }

    const barrelCandidate = getOriginalCasedFileName(fileName, rootDir)

    /**
     * If a directory was just created, let's create a barrel for it
     */
    const isDirectory = path.extname(barrelCandidate) === ''
    const directoryExists = serverHost.directoryExists(barrelCandidate)
    const isProjectDir = projectDirs.find((dir) =>
      barrelCandidate.toLowerCase().includes(dir.toLowerCase())
    )

    if (isDirectory && directoryExists && isProjectDir) {
      const barrelFile = path.join(barrelCandidate, 'index.ts')
      createBarrel(barrelFile)

      return true
    }

    /**
     * If the server is checking whether an index file exist,
     * and we know that it doesn't exist on the disk,
     * let's create a barrel
     */
    const isIndexFile = barrelCandidate.endsWith('index.ts')
    const barrelDirExists = serverHost.directoryExists(
      path.dirname(barrelCandidate)
    )

    if (isIndexFile && isProjectDir && barrelDirExists) {
      createBarrel(barrelCandidate)

      return true
    }

    return false
  })

  patchMethod(serverHost, 'readFile', (original, fileName) => {
    const result = original(fileName)

    /**
     * Let's bail if the file exists on the disk
     */
    if (result !== undefined) {
      return result
    }

    const barrelFile = getOriginalCasedFileName(fileName, rootDir)

    /**
     * If there is a barrel, let's return a valid module
     */
    if (isVirtualFile(barrelFile)) {
      return 'export {};'
    }
  })
}
