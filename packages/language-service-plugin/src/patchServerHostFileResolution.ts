import { patchMethod } from '@typescript-virtual-barrel/core'
import path from 'path'
import tslibrary from 'typescript/lib/tsserverlibrary'

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
  const getOriginalCasedFileName = (_fileName: string) => {
    let fileName = _fileName.replace(rootDir, '')

    /**
     * If the result is the same after replacing the rootDir for nothing,
     * then this means the casing is different
     */
    if (fileName === _fileName) {
      fileName = _fileName.replace(rootDir.toLowerCase(), '')
    }

    return path.join(rootDir, fileName)
  }

  patchMethod(serverHost, 'fileExists', (original, fileName) => {
    const result = original(fileName)

    /**
     * If the file exists on the disk, let's remove the barrel and update the project
     */
    if (result) {
      const barrelFile = getOriginalCasedFileName(fileName)

      if (isVirtualFile(barrelFile)) {
        deleteBarrel(barrelFile)
      }

      return true
    }

    const barrelCandidate = getOriginalCasedFileName(fileName)

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

    const barrelFile = getOriginalCasedFileName(fileName)

    /**
     * If there is a barrel, let's return a valid module
     */
    if (isVirtualFile(barrelFile)) {
      return 'export {};'
    }
  })
}
