import { createProject, prefix } from './project'

describe.only('type safety', () => {
  it('symbols imported from barrels are type rich', () => {
    const files = new Map<string, string>([
      [prefix('/src/components/x.ts'), 'export const x = 1'],
      [prefix('/src/components/y.ts'), 'export const y = true'],
      [
        prefix('/src/index.ts'),
        `import { x, y } from './components';\nconst result = x + y`,
      ],
    ])

    const { project } = createProject(files)

    const completions = project
      .getLanguageService()
      .getSemanticDiagnostics(prefix('/src/index.ts'))

    expect(completions).toContainEqual(
      expect.objectContaining({
        messageText:
          "Operator '+' cannot be applied to types 'number' and 'boolean'.",
        start: 52,
        length: 5,
      })
    )
  })
})
