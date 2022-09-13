import path from 'path'
import typescript from 'typescript'

type FileName = string

const getNoIdentifierDiagnostic = (
  sourceFile: typescript.SourceFile,
  declaration: typescript.Declaration
) => {
  return typescript.createFileDiagnostic(
    sourceFile,
    declaration.getStart(),
    declaration.getWidth(),
    {
      key: declaration.getText(),
      category: typescript.DiagnosticCategory.Warning,
      code: 9999,
      message:
        'Missing identifier for export. This member will not be included in the barrel.',
    }
  )
}

export interface ExportedEntity {
  fileName: FileName
  isDefaultExport: boolean
  isTypeExport: boolean
}

export type EntityWithIdentifier = ExportedEntity & { identifier: string }

type GetExportsOfSourceFileResult = {
  entities: EntityWithIdentifier[]
  diagnostics: typescript.DiagnosticWithLocation[]
}

type Options = {
  sourceFile: typescript.SourceFile
  checker: typescript.TypeChecker
}

export const getExportsOfSourceFile = ({ sourceFile, checker }: Options) => {
  const result: GetExportsOfSourceFileResult = {
    entities: [],
    diagnostics: [],
  }

  const sourceFileSymbol = checker.getSymbolAtLocation(sourceFile)

  /**
   * Not a valid module.
   */
  if (!sourceFileSymbol) {
    return null
  }

  /**
   * No exports in this file.
   */
  if (!sourceFileSymbol?.exports?.size) {
    return result
  }

  sourceFileSymbol.exports.forEach((symbol) => {
    /**
     * The symbol doesn't have a declaration.
     */
    if (!symbol.declarations || symbol.declarations.length === 0) {
      return
    }

    const [declaration] = symbol.declarations

    const identifier = typescript.getNameOfDeclaration(declaration)?.getText()

    /**
     * If no identifier was found, let's make the developer aware of it.
     */
    if (!identifier) {
      result.diagnostics.push(
        getNoIdentifierDiagnostic(sourceFile, declaration)
      )

      return
    }

    const isTypeExport =
      typescript.isInterfaceDeclaration(declaration) ||
      typescript.isTypeAliasDeclaration(declaration)

    const fileNameWithoutExt = path.basename(
      sourceFile.fileName,
      path.extname(sourceFile.fileName)
    )

    result.entities.push({
      fileName: fileNameWithoutExt,
      isDefaultExport: symbol.escapedName === 'default',
      isTypeExport,
      identifier,
    })
  })

  return result
}
