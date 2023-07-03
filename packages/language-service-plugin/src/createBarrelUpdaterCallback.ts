import {
  calculateBarrel,
  getDirectoryFiles,
} from '@typescript-virtual-barrel/core'
import typescript from 'typescript'
import tslibrary from 'typescript/lib/tsserverlibrary'
import path from 'path'
import { BarrelCache, UpsertBarrel } from './createBarrelRegistry'

type RegisterProjectUpdateListenerParameters = {
  project: tslibrary.server.Project
  createdBarrels: BarrelCache
  getProgram: () => tslibrary.Program | undefined
  readDirectory: tslibrary.server.ServerHost['readDirectory']
  directoryExists: tslibrary.server.ServerHost['directoryExists']
  getModuleVersion: (fileName: string) => string
  deleteBarrel: (fileName: string) => void
  upsertBarrel: UpsertBarrel
}

export const createBarrelUpdaterCallback = ({
  project,
  createdBarrels,
  getProgram,
  readDirectory,
  directoryExists,
  getModuleVersion,
  deleteBarrel,
  upsertBarrel,
}: RegisterProjectUpdateListenerParameters) => {
  const shouldHydrateBarrel = (barrelPath: string) => {
    const folderName = path.dirname(barrelPath)
    const existingBarrel = createdBarrels.get(barrelPath)
    const program = getProgram()

    if (!existingBarrel || !program) {
      return
    }

    const existingBarrelFiles = Object.keys(existingBarrel)

    if (existingBarrelFiles.length === 0) {
      return true
    }

    const directoryFiles = getDirectoryFiles(
      folderName,
      program as typescript.Program,
      readDirectory
    )

    if (
      directoryFiles.sort().toString() !== existingBarrelFiles.sort().toString()
    ) {
      return true
    }

    for (const [fileName, version] of Object.entries(existingBarrel)) {
      if (getModuleVersion(fileName) !== version) {
        return true
      }
    }

    return false
  }

  const updateExistingBarrels = () => {
    createdBarrels.forEach((_, barrelFileName) => {
      const scriptInfo = project.getScriptInfo(barrelFileName)
      const barrelDir = path.dirname(barrelFileName)

      if (!scriptInfo) {
        deleteBarrel(barrelFileName)

        return
      }

      if (!directoryExists(barrelDir)) {
        deleteBarrel(barrelFileName)
        project.removeFile(scriptInfo, false, true)

        return
      }

      if (!shouldHydrateBarrel(barrelFileName)) {
        return
      }

      const newBarrel = calculateBarrel(
        getProgram() as typescript.Program,
        path.dirname(barrelFileName),
        readDirectory
      )

      upsertBarrel({
        barrelName: barrelFileName,
        includedFiles: newBarrel.includedFiles,
      })

      scriptInfo.editContent(
        0,
        scriptInfo.getSnapshot().getLength(),
        typescript.createPrinter().printFile(newBarrel.sourceFile) ||
          'export {};'
      )
    })
  }

  return updateExistingBarrels
}
