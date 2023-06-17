import { createProject, prefix } from './project'

describe('find references', () => {
  it('does not include the barrel file as a reference to the symbol', () => {
    const files = new Map<string, string>([
      [prefix('/src/index.ts'), `import { value } from './components';`],
      [prefix('/src/components/a.ts'), 'export const value = 1'],
    ])

    const { project } = createProject(files)

    const references =
      project
        .getLanguageService()
        // What is the difference between findReferences and getReferencesAtPosition?
        .findReferences(prefix('/src/components/a.ts'), 16) ?? []

    // 2 entries: definition and reference
    expect(references).toHaveLength(2)

    expect(references[0]).toEqual(
      expect.objectContaining({
        definition: expect.objectContaining({
          fileName: expect.stringContaining('/src/components/a.ts'),
          name: 'const value: 1',
        }),
        references: [
          expect.objectContaining({
            fileName: expect.stringContaining('/src/components/a.ts'),
            isDefinition: true,
          }),
        ],
      })
    )

    expect(references[1]).toEqual(
      expect.objectContaining({
        definition: expect.objectContaining({
          fileName: expect.stringContaining('/src/index.ts'),
          kind: 'alias',
          name: '(alias) const value: 1\nimport value',
        }),
        references: [
          expect.objectContaining({
            fileName: expect.stringContaining('/src/index.ts'),
            isDefinition: false,
            textSpan: { length: 5, start: 9 },
          }),
        ],
      })
    )
  })
})
