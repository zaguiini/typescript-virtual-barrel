import path from 'path'
import typescript from 'typescript'

const isInsideBarrelFolder = (dirName: string) => (fileName: string) =>
  path.dirname(fileName) === dirName

export const getDirectoryFiles = (
  dirName: string,
  program: typescript.Program,
  readDirectory: typeof typescript.sys.readDirectory
) => {
  const extensions = typescript
    .getSupportedExtensionsWithJsonIfResolveJsonModule(
      program?.getCompilerOptions(),
      typescript.getSupportedExtensions(program?.getCompilerOptions())
    )
    .flat()

  return readDirectory(dirName, extensions).filter(
    isInsideBarrelFolder(dirName)
  )
}
