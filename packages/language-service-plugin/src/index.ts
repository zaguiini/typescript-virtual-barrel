import util from 'util'
import typescript from 'typescript'
import tslibrary from 'typescript/lib/tsserverlibrary'
import {
  getFoldersWithoutIndexFile,
  patchMethod,
} from '@typescript-virtual-barrel/core'
import { getProjectInfo } from './getProjectInfo'
import { createBarrelRegistry } from './createBarrelRegistry'
import { patchLanguageServiceHostModuleResolution } from './patchLanguageServiceHostModuleResolution'
import { patchServerHostFileResolution } from './patchServerHostFileResolution'
import { createBarrelUpdaterCallback } from './createBarrelUpdaterCallback'
import { patchGetSemanticDiagnostics } from './patchGetSemanticDiagnostics'
import { patchFindReferences } from './patchFindReferences'
import { patchFindRenameLocations } from './patchFindRenameLocations'

function init() {
  function create(info: tslibrary.server.PluginCreateInfo) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const logger = <T>(data: T) =>
      info.project.projectService.logger.info(util.inspect(data, true, 10))

    const { rootFileNames, rootDir, projectDirs } = getProjectInfo(info)

    const getModuleVersion = (fileName: string) =>
      info.languageServiceHost.getScriptVersion(fileName)

    const { createdBarrels, isVirtualFile, upsertBarrel, deleteBarrel } =
      createBarrelRegistry({
        projectFolders: getFoldersWithoutIndexFile(rootFileNames),
        getModuleVersion,
      })

    /**
     * The language service host takes care of module resolution,
     * so if we are adding barrels, we must let it know about
     * our intentions.
     */
    patchLanguageServiceHostModuleResolution({
      languageServiceHost: info.languageServiceHost,
      getAdditionalFileNames: () => [...createdBarrels.keys()],
      resolveModuleName: (moduleName, containingFile) =>
        typescript.resolveModuleName(
          moduleName,
          containingFile,
          info.project.getCompilerOptions() as typescript.CompilerOptions,
          info.serverHost
        ),
    })

    const createBarrelAndUpdateProject = (fileName: string) => {
      upsertBarrel({
        barrelName: fileName,
        includedFiles: [],
      })
      setTimeout(() => info.project.updateGraph(), 0)
    }

    const deleteBarrelAndUpdateProject = (fileName: string) => {
      const scriptInfo = info.project.getScriptInfo(fileName)

      if (scriptInfo) {
        info.project.removeFile(scriptInfo, false, true)
      }

      deleteBarrel(fileName)
      setTimeout(() => info.project.updateGraph(), 0)
    }

    /**
     * The server host resolves the files. It is responsible for
     * looking through the files and folders of the project
     * and creating the barrel.
     */
    patchServerHostFileResolution({
      serverHost: info.serverHost,
      rootDir,
      projectDirs,
      isVirtualFile,
      createBarrel: createBarrelAndUpdateProject,
      deleteBarrel: deleteBarrelAndUpdateProject,
    })

    /**
     * Once the project is updated, we need to go through
     * all the created barrels and update them. We also
     * delete a barrel if its folder doesn't exist anymore.
     */
    const updateExistingBarrels = createBarrelUpdaterCallback({
      project: info.project,
      getProgram: info.languageService.getProgram,
      createdBarrels,
      upsertBarrel,
      deleteBarrel,
      getModuleVersion,
      directoryExists: info.serverHost.directoryExists,
      readDirectory: info.serverHost.readDirectory,
    })

    patchMethod(info.project, 'updateGraph', (updateGraph) => {
      const updatedGraph = updateGraph()

      updateExistingBarrels()

      return updatedGraph
    })

    /**
     * Since we're not using the patched program provided by
     * the compiler plugin, we need to inject the additional
     * diagnostics separately.
     */
    patchGetSemanticDiagnostics(info)

    /**
     * The generated barrel file is included by the language service
     * when looking for references and rename locations. Those patches
     * filter barrel files so the editing experience stays the same.
     */
    patchFindReferences(info, isVirtualFile)
    patchFindRenameLocations(info, isVirtualFile)

    return info.languageService
  }

  return {
    create,
  }
}

export = init
