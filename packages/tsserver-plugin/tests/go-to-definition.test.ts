import { createProject, prefix } from './project'

describe('go to definition', () => {
  it('jumps over the barrel reexport and locates the original symbol definition', () => {
    const files = new Map<string, string>([
      [
        prefix('/src/index.ts'),
        `import { value } from './components'; const result = 1 + value`,
      ],
      [prefix('/src/components/a.ts'), 'export const value = 1'],
    ])

    const { project } = createProject(files)

    const definitions = project
      .getLanguageService()
      .getDefinitionAtPosition(prefix('/src/index.ts'), 61)

    expect(definitions).toHaveLength(1)
    expect(definitions).toContainEqual(
      expect.objectContaining({
        containerName: expect.stringContaining('src/components/a'),
        contextSpan: { length: 22, start: 0 },
        failedAliasResolution: undefined,
        fileName: expect.stringContaining('src/components/a'),
        isAmbient: false,
        isLocal: false,
        kind: 'const',
        name: 'value',
        textSpan: { length: 5, start: 13 },
        unverified: false,
      })
    )
  })
})
