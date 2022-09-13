import { createProject, prefix } from './project'
import ts from 'typescript/lib/tsserverlibrary'

describe('diagnostic information', () => {
  it('warns about default export without identifiers', () => {
    const files = new Map<string, string>([
      [
        prefix('/src/components/a.ts'),
        `const hello = 'world'; export default function() {}`,
      ],
    ])

    const { project } = createProject(files)

    const diagnostics = project
      .getLanguageService()
      .getSemanticDiagnostics(prefix('/src/components/a.ts'))

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        category: ts.DiagnosticCategory.Warning,
        length: 28,
        messageText:
          'Missing identifier for export. This member will not be included in the barrel.',
        reportsDeprecated: undefined,
        reportsUnnecessary: undefined,
        start: 23,
      })
    )
  })
})
