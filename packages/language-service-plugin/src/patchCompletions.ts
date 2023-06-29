import typescript from 'typescript'
import tslibrary from 'typescript/lib/tsserverlibrary'

import { patchMethod } from '@typescript-virtual-barrel/core'

export const patchCompletions = (info: tslibrary.server.PluginCreateInfo) => {
  // Related: https://github.com/microsoft/TypeScript/issues/49012

  patchMethod(
    info.languageService,
    'getCompletionsAtPosition',
    (original, ...args) => {
      const result = original(...args)

      if (!result) {
        return result
      }

      result.entries.unshift({
        name: 'BoxDefault',
        kind: tslibrary.ScriptElementKind.alias,
        kindModifiers: 'export',
        sortText: '11',
        source: './components/index.js',
        hasAction: true,
        isRecommended: undefined,
        insertText: undefined,
        replacementSpan: undefined,
        sourceDisplay: [{ text: './components/index.js', kind: 'text' }],
        labelDetails: undefined,
        isSnippet: undefined,
        isPackageJsonImport: undefined,
        isImportStatementCompletion: undefined,
        data: {
          exportName: 'BoxDefault',
          moduleSpecifier: './components/index.js',
          ambientModuleName: undefined,
          fileName:
            '/Users/zaguini/Development/typescript-virtual-barrel-sample/src/components/index.ts',
          isPackageJsonImport: undefined,
        },
      })

      return result
    }
  )

  patchMethod(
    info.languageService,
    'getCompletionEntryDetails',
    (
      original,
      fileName,
      position,
      entryName,
      formatOptions,
      source,
      preferences,
      data
    ) => {
      if (entryName === 'BoxDefault') {
        const program = info.languageService.getProgram()!
        const checker = program.getTypeChecker()
        const sourceFile = program.getSourceFile(data!.fileName!)
        const sourceFileSymbol = checker.getSymbolAtLocation(sourceFile!)

        const symbol = sourceFileSymbol!.exports!.get(
          'BoxDefault' as tslibrary.__String
        )!

        const codeFix = typescript.codefix.getImportCompletionAction(
          symbol,
          sourceFileSymbol,
          sourceFile,
          'BoxDefault',
          false,
          info.languageServiceHost,
          program,
          formatOptions,
          0,
          preferences
        )

        const result = typescript.Completions.createCompletionDetailsForSymbol(
          symbol as typescript.Symbol,
          checker as typescript.TypeChecker,
          sourceFile as typescript.SourceFile,
          symbol.declarations![0] as typescript.Node,
          info.languageServiceHost.getCancellationToken!(),
          [codeFix]
        )

        console.log({ result })

        return result
      }
      // if (entryName === 'BoxDefault') {
      //   return {
      //     name: 'default',
      //     kindModifiers: 'export',
      //     kind: 'alias',
      //     displayParts: [
      //       { text: '(', kind: 'punctuation' },
      //       { text: 'alias', kind: 'text' },
      //       { text: ')', kind: 'punctuation' },
      //       { text: ' ', kind: 'space' },
      //       { text: 'BoxDefaultFromOther', kind: 'aliasName' },
      //       { text: '(', kind: 'punctuation' },
      //       { text: ')', kind: 'punctuation' },
      //       { text: ':', kind: 'punctuation' },
      //       { text: ' ', kind: 'space' },
      //       { text: 'string', kind: 'keyword' },
      //       { text: '\n', kind: 'lineBreak' },
      //       { text: 'export', kind: 'keyword' },
      //       { text: ' ', kind: 'space' },
      //       { text: 'default', kind: 'keyword' },
      //       { text: ' ', kind: 'space' },
      //       { text: 'BoxDefaultFromOther', kind: 'aliasName' },
      //     ],
      //     documentation: [],
      //     tags: undefined,
      //     codeActions: [
      //       {
      //         description: 'Add import from "./other/box.js"',
      //         changes: [
      //           {
      //             fileName:
      //               '/Users/zaguini/Development/typescript-virtual-barrel-sample/src/index.ts',
      //             textChanges: [
      //               {
      //                 span: { start: 0, length: 0 },
      //                 newText:
      //                   "import BoxDefaultFromOther from './other/box.js';\n\n",
      //               },
      //             ],
      //           },
      //         ],
      //         commands: undefined,
      //       },
      //     ],
      //     source: [{ text: './other/box.js', kind: 'text' }],
      //     sourceDisplay: [{ text: './other/box.js', kind: 'text' }],
      //   }
      // }

      const result = original(
        fileName,
        position,
        entryName,
        formatOptions,
        source,
        preferences,
        data
      )

      console.log({
        result,
        args: { fileName, position, entryName, source, data },
      })

      return result
    }
  )
}
