import { createProject, prefix } from './project'

describe('import suggestions', () => {
  it('provides import suggestions for generated barrels', () => {
    const files = new Map<string, string>([
      [prefix('/src/index.ts'), `import {} from './components'`],
      [prefix('/src/components/a.ts'), 'export const value = 1'],
    ])

    const { project } = createProject(files)

    const completions = project
      .getLanguageService()
      .getCompletionsAtPosition(prefix('/src/index.ts'), 8, {})?.entries

    expect(completions).toContainEqual(
      expect.objectContaining({
        name: 'value',
      })
    )
  })

  it('updates import suggestions on barrel-related changes within the editor', () => {
    const files = new Map<string, string>([
      [prefix('/src/index.ts'), `import {} from './components'`],
      [prefix('/src/components/a.ts'), 'export const value = 1'],
    ])

    const { project } = createProject(files)

    const completions = project
      .getLanguageService()
      .getCompletionsAtPosition(prefix('/src/index.ts'), 8, {})?.entries

    expect(completions).toContainEqual(
      expect.objectContaining({
        name: 'value',
      })
    )

    const changedFile = prefix('/src/components/a.ts')

    project.projectService.openClientFile(changedFile)
    const scriptInfo = project.getScriptInfo(changedFile)

    if (!scriptInfo) {
      throw new Error('scriptInfo for open file not found')
    }

    scriptInfo.editContent(
      0,
      scriptInfo.getSnapshot().getLength(),
      'export const other = 2'
    )

    const newCompletions = project
      .getLanguageService()
      .getCompletionsAtPosition(prefix('/src/index.ts'), 8, {})?.entries

    expect(newCompletions).not.toContainEqual(
      expect.objectContaining({
        name: 'value',
      })
    )

    expect(newCompletions).toContainEqual(
      expect.objectContaining({
        name: 'other',
      })
    )
  })

  it('updates import suggestions on barrel-related external changes', () => {
    const files = new Map<string, string>([
      [prefix('/src/index.ts'), `import {} from './components'`],
      [prefix('/src/components/a.ts'), 'export const value = 1'],
    ])

    const { project, fileSystem } = createProject(files)

    const completions = project
      .getLanguageService()
      .getCompletionsAtPosition(prefix('/src/index.ts'), 8, {})?.entries

    expect(completions).toContainEqual(
      expect.objectContaining({
        name: 'value',
      })
    )

    const changedFile = prefix('/src/components/a.ts')
    files.set(changedFile, 'export const other = 2')
    fileSystem.notifyChanges(changedFile)

    const newCompletions = project
      .getLanguageService()
      .getCompletionsAtPosition(prefix('/src/index.ts'), 8, {})?.entries

    expect(newCompletions).not.toContainEqual(
      expect.objectContaining({
        name: 'value',
      })
    )

    expect(newCompletions).toContainEqual(
      expect.objectContaining({
        name: 'other',
      })
    )
  })

  it('adds barrel import as a suggestion', () => {
    const files = new Map<string, string>([
      [prefix('/src/index.ts'), `const result = 1 + value`],
      [prefix('/src/components/a.ts'), 'export const value = 1'],
    ])

    const { project } = createProject(files)

    const completions = project
      .getLanguageService()
      .getCompletionsAtPosition(prefix('/src/index.ts'), 24, {
        includeCompletionsForModuleExports: true,
        allowIncompleteCompletions: true,
      })?.entries

    expect(completions).toContainEqual(
      expect.objectContaining({
        name: 'value',
        source: './components',
      })
    )
  })
})
