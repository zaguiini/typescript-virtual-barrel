import { getDirectoryFiles } from './../../src/getDirectoryFiles'
import { calculateBarrel } from '../../src/calculateBarrel'
import typescript from 'typescript'

const MODULES_FOLDER = typescript.combinePaths(__dirname, 'program', 'folder')

const printer = typescript.createPrinter()

describe('calculateBarrel', () => {
  let barrel: ReturnType<typeof calculateBarrel>

  const printStatement = (statementIndex: number) => {
    return printer.printNode(
      typescript.EmitHint.Unspecified,
      barrel.sourceFile.statements[statementIndex],
      barrel.sourceFile
    )
  }

  describe('ES modules', () => {
    beforeAll(() => {
      const program = typescript.createProgram(
        getDirectoryFiles(
          MODULES_FOLDER,
          typescript.createProgram([], {
            resolveJsonModule: true,
          }),
          typescript.sys.readDirectory
        ),
        {
          resolveJsonModule: true,
          module: typescript.ModuleKind.ESNext,
          moduleResolution: typescript.ModuleResolutionKind.NodeNext,
        }
      )

      barrel = calculateBarrel(
        program,
        MODULES_FOLDER,
        typescript.sys.readDirectory
      )
    })

    it('adds output extension for typescript imports', () => {
      expect(printStatement(0)).toEqual(
        'export { default as NamedDefaultExport } from "./0-aliases-default-export.js";'
      )
    })

    it('adds assert block after extraneous imports', () => {
      expect(printStatement(barrel.sourceFile.statements.length - 1)).toEqual(
        'export { default as zForwardsJson } from "./z-forwards.json" assert { type: "json" };'
      )
    })
  })

  describe('symbol forwarding', () => {
    beforeAll(() => {
      const program = typescript.createProgram(
        getDirectoryFiles(
          MODULES_FOLDER,
          typescript.createProgram([], {
            resolveJsonModule: true,
          }),
          typescript.sys.readDirectory
        ),
        {
          resolveJsonModule: true,
        }
      )

      barrel = calculateBarrel(
        program,
        MODULES_FOLDER,
        typescript.sys.readDirectory
      )
    })

    it('aliases default export', () => {
      expect(printStatement(0)).toEqual(
        'export { default as NamedDefaultExport } from "./0-aliases-default-export";'
      )

      expect(barrel.includedFiles.includes('./0-aliases-default-export'))
    })

    it('forwards member export', () => {
      expect(printStatement(1)).toEqual(
        'export { VariableExport } from "./1-forwards-member-export";'
      )

      expect(barrel.includedFiles.includes('./1-forwards-member-export'))
    })

    it('forwards named export', () => {
      expect(printStatement(2)).toEqual(
        'export { NamedExport } from "./2-forwards-named-export";'
      )

      expect(barrel.includedFiles.includes('./2-forwards-named-export'))
    })

    it('forwards aliased named export', () => {
      expect(printStatement(3)).toEqual(
        'export { AliasedNamedExport } from "./3-forwards-aliased-named-export";'
      )

      expect(barrel.includedFiles.includes('./3-forwards-aliased-named-export'))
    })

    it('forwards multiple named exports per file', () => {
      expect(printStatement(4)).toEqual(
        'export { AliasedMember2, default as DefaultFunction, Member1, VariableMember } from "./4-forwards-multiple-exports";'
      )

      expect(barrel.includedFiles.includes('./4-forwards-multiple-exports'))
    })

    it('forwards namespace export', () => {
      expect(printStatement(5)).toEqual(
        'export { NamespaceExport } from "./5-forwards-namespace-export";'
      )
    })

    it('forwards type declarations', () => {
      expect(printStatement(6)).toEqual(
        'export { AliasedMyType, ExportedType, MyEnum, MyInterface, MyType } from "./6-forwards-type-declarations";'
      )

      expect(barrel.includedFiles.includes('./6-forwards-type-declarations.ts'))
    })

    it('forwards json files', () => {
      expect(printStatement(barrel.sourceFile.statements.length - 2)).toEqual(
        'export { default as YForwardsJson } from "./Y-forwards.json";'
      )

      expect(printStatement(barrel.sourceFile.statements.length - 1)).toEqual(
        'export { default as zForwardsJson } from "./z-forwards.json";'
      )

      expect(barrel.includedFiles.includes('./y-forwards.json'))
      expect(barrel.includedFiles.includes('./z-forwards.json'))
    })
  })

  describe('diagnostics', () => {
    beforeAll(() => {
      const program = typescript.createProgram(
        getDirectoryFiles(
          MODULES_FOLDER,
          typescript.createProgram([], {
            resolveJsonModule: true,
          }),
          typescript.sys.readDirectory
        ),
        {
          resolveJsonModule: true,
        }
      )

      barrel = calculateBarrel(
        program,
        MODULES_FOLDER,
        typescript.sys.readDirectory
      )
    })

    it('does not include unnamed default export', () => {
      const unnamedDefaultExportDiagnostic = barrel.diagnostics.get(
        typescript.combinePaths(MODULES_FOLDER, 'unnamed-default-export.ts')
      )

      expect(unnamedDefaultExportDiagnostic).toBeDefined()
      expect(unnamedDefaultExportDiagnostic).toEqual([
        expect.objectContaining({
          category: typescript.DiagnosticCategory.Warning,
          code: 9999,
          start: 65,
          length: 29,
          messageText:
            'Missing identifier for export. This member will not be included in the barrel.',
        }),
      ])
    })

    it('does not include unnamed namespace export', () => {
      const unnamedDefaultExportDiagnostic = barrel.diagnostics.get(
        typescript.combinePaths(MODULES_FOLDER, 'unnamed-namespace-export.ts')
      )

      expect(unnamedDefaultExportDiagnostic).toBeDefined()
      expect(unnamedDefaultExportDiagnostic).toEqual([
        expect.objectContaining({
          category: typescript.DiagnosticCategory.Warning,
          code: 9999,
          start: 0,
          length: 42,
          messageText:
            'Missing identifier for export. This member will not be included in the barrel.',
        }),
      ])
    })
  })
})
