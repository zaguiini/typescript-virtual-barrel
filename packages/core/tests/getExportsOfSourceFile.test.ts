/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  createProgram,
  combinePaths,
  createCompilerHost,
  createSourceFile,
  ScriptTarget,
  DiagnosticCategory,
} from 'typescript'
import { getExportsOfSourceFile } from '../src/getExportsOfSourceFile'

const getExports = (
  fileName: string,
  content: string,
  additionalFiles: Map<string, string> = new Map<string, string>()
) => {
  const program = createProgram({
    rootNames: [fileName, ...additionalFiles.keys()],
    options: {},
    host: {
      ...createCompilerHost({}),
      fileExists: (path: string) =>
        additionalFiles.has(path) || path === fileName,
      readFile: (path: string) => additionalFiles.get(path) ?? content,
      getSourceFile: (path: string) => {
        if (path === fileName || additionalFiles.has(path)) {
          return createSourceFile(
            path,
            additionalFiles.get(path) ?? content,
            ScriptTarget.ESNext
          )
        }
      },
    },
  })

  return getExportsOfSourceFile({
    sourceFile: program.getSourceFile(fileName)!,
    checker: program.getTypeChecker(),
  })
}

describe('getExportsOfSourceFile', () => {
  describe('ECMAScript exports', () => {
    it('parses a default export', () => {
      const actual = getExports(
        combinePaths(__dirname, 'default-export.ts'),
        `export default function MyFunction() {}`
      )

      const expected: typeof actual = {
        diagnostics: [],
        entities: [
          {
            fileName: 'default-export',
            identifier: 'MyFunction',
            isDefaultExport: true,
            isTypeExport: false,
          },
        ],
      }

      expect(actual).toEqual(expected)
    })

    it('parses a default export reference', () => {
      const actual = getExports(
        combinePaths(__dirname, 'default-export-reference.ts'),
        `function ReferenceToMyFunction() {};
         export default ReferenceToMyFunction`
      )

      const expected: typeof actual = {
        diagnostics: [],
        entities: [
          {
            fileName: 'default-export-reference',
            identifier: 'ReferenceToMyFunction',
            isDefaultExport: true,
            isTypeExport: false,
          },
        ],
      }

      expect(actual).toEqual(expected)
    })

    it('parses a member export', () => {
      const actual = getExports(
        combinePaths(__dirname, 'member-export.ts'),
        `export const variable = () => {}`
      )

      const expected: typeof actual = {
        diagnostics: [],
        entities: [
          {
            fileName: 'member-export',
            identifier: 'variable',
            isDefaultExport: false,
            isTypeExport: false,
          },
        ],
      }

      expect(actual).toEqual(expected)
    })

    it('parses named export', () => {
      const actual = getExports(
        combinePaths(__dirname, 'named-export.ts'),
        `const namedVariable = () => {};
         export { namedVariable }
        `
      )

      const expected: typeof actual = {
        diagnostics: [],
        entities: [
          {
            fileName: 'named-export',
            identifier: 'namedVariable',
            isDefaultExport: false,
            isTypeExport: false,
          },
        ],
      }

      expect(actual).toEqual(expected)
    })

    it('parses an aliased named export', () => {
      const actual = getExports(
        combinePaths(__dirname, 'aliased-named-export.ts'),
        `const namedVariable = () => {};
         export { namedVariable as anotherIdentifier }
        `
      )

      const expected: typeof actual = {
        diagnostics: [],
        entities: [
          {
            fileName: 'aliased-named-export',
            identifier: 'anotherIdentifier',
            isDefaultExport: false,
            isTypeExport: false,
          },
        ],
      }

      expect(actual).toEqual(expected)
    })

    it('parses multiple named exports', () => {
      const actual = getExports(
        combinePaths(__dirname, 'multiple-named-exports.ts'),
        `const namedVariable = () => {};
         export { namedVariable, namedVariable as anotherIdentifier }
        `
      )

      const expected: typeof actual = {
        diagnostics: [],
        entities: [
          {
            fileName: 'multiple-named-exports',
            identifier: 'namedVariable',
            isDefaultExport: false,
            isTypeExport: false,
          },
          {
            fileName: 'multiple-named-exports',
            identifier: 'anotherIdentifier',
            isDefaultExport: false,
            isTypeExport: false,
          },
        ],
      }

      expect(actual).toEqual(expected)
    })

    it('parses a default exported enum', () => {
      const actual = getExports(
        combinePaths(__dirname, 'export-default-enum.ts'),
        `enum MyEnum {};
         export default MyEnum
        `
      )

      const expected: typeof actual = {
        diagnostics: [],
        entities: [
          {
            fileName: 'export-default-enum',
            identifier: 'MyEnum',
            isDefaultExport: true,
            isTypeExport: false,
          },
        ],
      }

      expect(actual).toEqual(expected)
    })
  })

  describe('type exports', () => {
    it('parses an exported interface', () => {
      const actual = getExports(
        combinePaths(__dirname, 'exported-interface.ts'),
        `export interface MyInterface {}`
      )

      const expected: typeof actual = {
        diagnostics: [],
        entities: [
          {
            fileName: 'exported-interface',
            identifier: 'MyInterface',
            isDefaultExport: false,
            isTypeExport: true,
          },
        ],
      }

      expect(actual).toEqual(expected)
    })
  })

  describe('diagnostic reporting', () => {
    it('warns if a default export has no identifier', () => {
      const actual = getExports(
        combinePaths(__dirname, 'default-export-without-identifier.ts'),
        `export default function() {}`
      )

      const expected: typeof actual = {
        diagnostics: [
          {
            category: DiagnosticCategory.Warning,
            code: 9999,
            file: expect.anything(),
            start: 0,
            length: 28,
            messageText:
              'Missing identifier for export. This member will not be included in the barrel.',
          },
        ],
        entities: [],
      }

      expect(actual).toEqual(expected)
    })

    it('warns if a namespace export has no identifier', () => {
      const actual = getExports(
        combinePaths(__dirname, 'namespace-export-without-identifier.ts'),
        `export * from './file'`,
        new Map([
          [combinePaths(__dirname, './file.ts'), `export const var1 = true`],
        ])
      )

      const expected: typeof actual = {
        diagnostics: [
          {
            category: DiagnosticCategory.Warning,
            code: 9999,
            file: expect.anything(),
            start: 0,
            length: 22,
            messageText:
              'Missing identifier for export. This member will not be included in the barrel.',
          },
        ],
        entities: [],
      }

      expect(actual).toEqual(expected)
    })
  })
})
