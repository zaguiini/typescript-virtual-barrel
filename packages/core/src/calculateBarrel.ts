import typescript, { factory } from 'typescript'
import path from 'path'
import {
  EntityWithIdentifier,
  ExportedEntity,
  getExportsOfSourceFile,
} from './getExportsOfSourceFile'
import { camelCase } from 'camel-case'
import { getDirectoryFiles } from './getDirectoryFiles'

type Identifier = string

export type ExportedEntities = Record<Identifier, ExportedEntity>

const getEntityForExternalFile = (fileName: string) => {
  const fileNameWithExt = path.basename(fileName)
  const firstChar = fileNameWithExt.charAt(0)
  const camelCasedIdentifier = camelCase(fileNameWithExt)

  return {
    fileName: fileNameWithExt,
    identifier:
      firstChar === firstChar.toUpperCase()
        ? `${firstChar}${camelCasedIdentifier.substring(1)}`
        : camelCasedIdentifier,
    isDefaultExport: true,
    isTypeExport: false,
  }
}

const transformToExportDeclaration = (
  { identifier, ...entity }: EntityWithIdentifier,
  compilerOptions: typescript.CompilerOptions
) => {
  const extension = typescript.extensionFromPath(entity.fileName)
  const fileNameWithoutExtension = path.basename(entity.fileName, extension)

  const isExtraneousExtension = !typescript.extensionIsTS(extension)
  const isESNextModule = compilerOptions.module === typescript.ModuleKind.ESNext
  const isESModuleResolution =
    compilerOptions.moduleResolution ===
      typescript.ModuleResolutionKind.Node16 ||
    compilerOptions.moduleResolution ===
      typescript.ModuleResolutionKind.NodeNext
  const shouldAddAssertClause = isExtraneousExtension && isESNextModule

  const moduleSpecifier = isExtraneousExtension
    ? `./${entity.fileName}`
    : isESModuleResolution
    ? `./${fileNameWithoutExtension}${typescript.getOutputExtension(
        entity.fileName,
        compilerOptions
      )}`
    : `./${fileNameWithoutExtension}`

  return factory.createExportDeclaration(
    undefined,
    undefined,
    false,
    factory.createNamedExports([
      factory.createExportSpecifier(
        false,
        entity.isDefaultExport ? 'default' : undefined,
        identifier
      ),
    ]),
    factory.createStringLiteral(moduleSpecifier),
    shouldAddAssertClause
      ? factory.createAssertClause(
          factory.createNodeArray([
            factory.createAssertEntry(
              factory.createIdentifier('type'),
              factory.createStringLiteral(extension.substring(1))
            ),
          ]),
          false
        )
      : undefined
  )
}

const transformEntitiesIntoExportDeclarations = (
  entities: EntityWithIdentifier[],
  compilerOptions: typescript.CompilerOptions
) => {
  return typescript.OrganizeImports.coalesceExports(
    entities.map((entity) =>
      transformToExportDeclaration(entity, compilerOptions)
    )
  )
}

export const calculateBarrel = (
  program: typescript.Program,
  dirName: string,
  readDirectory: typeof typescript.sys.readDirectory
) => {
  const checker = program.getTypeChecker()
  const compilerOptions = program.getCompilerOptions()

  const includedFiles: string[] = []
  const diagnostics = new Map<string, typescript.DiagnosticWithLocation[]>()

  const generateAdHocSourceFile = (fileName: string) => {
    const filePath = typescript.toPath(
      fileName,
      dirName,
      typescript.createGetCanonicalFileName(program.useCaseSensitiveFileNames())
    )

    const sourceFile = typescript.createSourceFile(
      fileName,
      program.readFile?.(filePath) ?? 'export {};',
      compilerOptions.target ?? typescript.ScriptTarget.ES3,
      true
    )

    typescript.bindSourceFile(sourceFile, compilerOptions)

    return sourceFile
  }

  const findEntitiesOfFile = (fileName: string) => {
    const sourceFile =
      program.getSourceFile(fileName) ?? generateAdHocSourceFile(fileName)

    const result = getExportsOfSourceFile({
      sourceFile,
      checker,
    })

    if (result === null) {
      includedFiles.push(fileName)

      // For the time being, "external file" = JSON file.
      return [getEntityForExternalFile(fileName)]
    }

    if (result.entities.length > 0) {
      includedFiles.push(sourceFile.fileName)
    }

    if (result.diagnostics.length > 0) {
      diagnostics.set(sourceFile.fileName, result.diagnostics)
    }

    return result.entities
  }

  const barrelEntitiesGroupedByOrigin: EntityWithIdentifier[][] =
    getDirectoryFiles(dirName, program, readDirectory).map(findEntitiesOfFile)

  const statements = barrelEntitiesGroupedByOrigin
    .map((barrelEntities) =>
      transformEntitiesIntoExportDeclarations(barrelEntities, compilerOptions)
    )
    .flat()

  const sourceFile = factory.createSourceFile(
    statements,
    factory.createToken(typescript.SyntaxKind.EndOfFileToken),
    typescript.NodeFlags.None
  )

  return {
    sourceFile,
    includedFiles,
    diagnostics,
    barrelEntities: barrelEntitiesGroupedByOrigin
      .flat()
      .reduce<ExportedEntities>((statements, curr) => {
        statements[curr.identifier] = curr

        return statements
      }, {}),
  }
}
