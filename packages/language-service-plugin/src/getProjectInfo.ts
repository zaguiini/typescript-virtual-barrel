import typescript from 'typescript'
import tslibrary from 'typescript/lib/tsserverlibrary'

export const getProjectInfo = (info: tslibrary.server.PluginCreateInfo) => {
  const rootDir = info.project.getCurrentDirectory()
  const config = tslibrary.readConfigFile(
    info.project.getProjectName(),
    info.serverHost.readFile
  )

  const { fileNames: rootFileNames, wildcardDirectories = {} } =
    tslibrary.parseJsonConfigFileContent(
      config.config,
      info.serverHost,
      rootDir,
      info.project.getCompilerOptions(),
      info.project.getProjectName()
    )

  return {
    rootDir,
    rootFileNames: rootFileNames.map(typescript.normalizePath),
    projectDirs: Object.keys(wildcardDirectories),
  }
}
