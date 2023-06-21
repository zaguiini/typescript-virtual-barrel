import typescript, {
  CompilerHost,
  TransformationContext,
  SourceFile,
  Node,
} from 'typescript'
import {
  ExportedEntities,
  ExportedEntity,
} from '@typescript-virtual-barrel/core'
import path from 'path'

/**
 * - import should have the extension, and it should be js, if esnext module. relevant function: typescript.getOutputExtension(entity.fileName, compilerOptions
 * - import should have the assert clause if esnext module
 */

const createImport = ({
  importSpecifier,
  exportFromBarrel,
  moduleSpecifier,
}: {
  importSpecifier: typescript.ImportSpecifier
  exportFromBarrel: ExportedEntity
  moduleSpecifier: string
}) => {
  const { factory } = typescript

  const importClause = factory.createImportClause(
    false,
    exportFromBarrel.isDefaultExport ? importSpecifier.name : undefined,
    exportFromBarrel.isDefaultExport
      ? undefined
      : factory.createNamedImports([importSpecifier])
  )

  const extension = path.extname(exportFromBarrel.fileName)
  const fileNameWithoutExtension = path.basename(
    exportFromBarrel.fileName,
    extension
  )

  return factory.createImportDeclaration(
    undefined,
    undefined,
    importClause,
    factory.createStringLiteral(
      `${moduleSpecifier}/${fileNameWithoutExtension}`
    )
  )
}

const expandNamedImports = (
  namedImports: typescript.NamedImports,
  moduleSpecifier: string,
  barrelEntities: ExportedEntities
) => {
  return namedImports.elements
    .filter(
      (element) =>
        barrelEntities[element.propertyName?.text ?? element.name.text]
    )
    .map((element) => {
      const exportFromBarrel =
        barrelEntities[element.propertyName?.text ?? element.name.text]

      return createImport({
        importSpecifier: element,
        exportFromBarrel,
        moduleSpecifier,
      })
    })
}

const expandNamespaceImport = (
  namespaceIdentifier: string,
  moduleSpecifier: string,
  barrelEntities: ExportedEntities
) => {
  const expandedImportDeclarations = Object.keys(barrelEntities).map(
    (element) => {
      const exportFromBarrel = barrelEntities[element]

      return createImport({
        importSpecifier: typescript.factory.createImportSpecifier(
          exportFromBarrel.isTypeExport,
          typescript.factory.createIdentifier(element),
          typescript.factory.createIdentifier(
            `${namespaceIdentifier}${element}`
          )
        ),
        exportFromBarrel,
        moduleSpecifier,
      })
    }
  )

  return expandedImportDeclarations
}

const injectNamespaces = (namespaces: Map<string, ExportedEntities>) => {
  const { factory } = typescript

  return [...namespaces.entries()].map(([namespace, entities]) => {
    return factory.createVariableStatement(
      undefined,
      factory.createVariableDeclarationList(
        [
          factory.createVariableDeclaration(
            factory.createIdentifier(namespace),
            undefined,
            undefined,
            factory.createObjectLiteralExpression(
              Object.entries(entities)
                .filter(([, entity]) => !entity.isTypeExport)
                .map(([symbol]) => {
                  return factory.createPropertyAssignment(
                    factory.createIdentifier(symbol),
                    factory.createIdentifier(`${namespace}${symbol}`)
                  )
                }),
              true
            )
          ),
        ],
        typescript.NodeFlags.Const
      )
    )
  })
}

const organizeImports = (imports: typescript.ImportDeclaration[]) => {
  const importGroups = imports.reduce<
    Record<string, typescript.ImportDeclaration[]>
  >((curr, next) => {
    if (!typescript.isStringLiteral(next.moduleSpecifier)) {
      throw new Error('what?')
    }

    if (curr[next.moduleSpecifier.text]) {
      curr[next.moduleSpecifier.text].push(next)
    } else {
      curr[next.moduleSpecifier.text] = [next]
    }

    return curr
  }, {})

  return Object.values(importGroups)
    .map((importGroup) =>
      typescript.OrganizeImports.coalesceImports(importGroup)
    )
    .flat() as typescript.ImportDeclaration[]
}

type CreateImportRewritterParameters = {
  tsInstance: typeof typescript
  host: CompilerHost
  compilerOptions: typescript.CompilerOptions
  getBarrelEntities: (fileName: string) => ExportedEntities | undefined
}

/**
 * Expand the barrels.
 */
export function createImportRewriter({
  tsInstance,
  host,
  compilerOptions,
  getBarrelEntities,
}: CreateImportRewritterParameters) {
  const rewriter = {
    importRewriter,
    hasRewrittenImports: false,
  }

  function importRewriter(transformationContext: TransformationContext) {
    return (sourceFile: SourceFile) => {
      const resolveBarrel = (moduleName: typescript.StringLiteral) => {
        const barrelFilePath =
          tsInstance.resolveModuleName(
            moduleName.text,
            sourceFile.fileName,
            compilerOptions,
            host
          ).resolvedModule?.resolvedFileName ?? ''

        return getBarrelEntities(barrelFilePath)
      }

      const namespacesToInject = new Map<string, ExportedEntities>()

      /* Visitor Function */
      const visitNode = (node: Node): Node | Node[] => {
        if (!tsInstance.isImportDeclaration(node)) {
          return node
        }

        if (
          tsInstance.isImportDeclaration(node) &&
          node.importClause?.namedBindings &&
          tsInstance.isStringLiteral(node.moduleSpecifier)
        ) {
          const barrelEntities = resolveBarrel(node.moduleSpecifier)

          if (
            barrelEntities &&
            tsInstance.isNamedImports(node.importClause.namedBindings)
          ) {
            rewriter.hasRewrittenImports = true

            return organizeImports(
              expandNamedImports(
                node.importClause.namedBindings,
                node.moduleSpecifier.text,
                barrelEntities
              )
            )
          }

          if (
            barrelEntities &&
            tsInstance.isNamespaceImport(node.importClause.namedBindings)
          ) {
            rewriter.hasRewrittenImports = true

            namespacesToInject.set(
              node.importClause.namedBindings.name.text,
              barrelEntities
            )

            return organizeImports(
              expandNamespaceImport(
                node.importClause.namedBindings.name.text,
                node.moduleSpecifier.text,
                barrelEntities
              )
            )
          }
        }

        return tsInstance.visitEachChild(node, visitNode, transformationContext)
      }

      const expandedImportsSouceFile = tsInstance.visitEachChild(
        sourceFile,
        visitNode,
        transformationContext
      )

      if (namespacesToInject.size === 0) {
        return expandedImportsSouceFile
      }

      const firstNonImportStatementIndex =
        tsInstance.findLastIndex(
          expandedImportsSouceFile.statements,
          tsInstance.isImportDeclaration
        ) + 1

      return tsInstance.factory.updateSourceFile(expandedImportsSouceFile, [
        ...expandedImportsSouceFile.statements.slice(
          0,
          firstNonImportStatementIndex
        ),
        ...injectNamespaces(namespacesToInject),
        ...expandedImportsSouceFile.statements.slice(
          firstNonImportStatementIndex
        ),
      ])
    }
  }

  /* Transformer Function */
  return rewriter
}
