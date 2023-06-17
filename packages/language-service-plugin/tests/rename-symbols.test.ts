import { createProject, prefix } from './project'
import ts from 'typescript/lib/tsserverlibrary'

describe('rename symbols', () => {
  const assertLocationValue = (
    content: string,
    location: ts.RenameLocation,
    value: string
  ) => {
    expect(
      content.substring(
        location.textSpan.start,
        location.textSpan.start + location.textSpan.length
      )
    ).toEqual(value)
  }

  it('renames member exports in the origin and usages', () => {
    const indexTs = `import { value } from './components'; const result = 1 + value`
    const componentsATs = 'export const value = 1'

    const files = new Map<string, string>([
      [prefix('/src/index.ts'), indexTs],
      [prefix('/src/components/a.ts'), componentsATs],
    ])

    const { project } = createProject(files)

    const renameInfo =
      project
        .getLanguageService()
        .findRenameLocations(
          prefix('/src/components/a.ts'),
          16,
          false,
          false
        ) ?? []

    expect(renameInfo).toHaveLength(3)
    expect(renameInfo).not.toContainEqual(
      expect.objectContaining({
        fileName: expect.stringContaining('components/index.ts'),
      })
    )

    assertLocationValue(componentsATs, renameInfo[0], 'value') // rename symbol
    assertLocationValue(indexTs, renameInfo[1], 'value') // rename import
    assertLocationValue(indexTs, renameInfo[2], 'value') // reference usage
  })

  it('renames named exports in the origin and usages', () => {
    const indexTs = `import { value } from './components'; const result = 1 + value`
    const componentsATs = 'const value = 1; export { value }'

    const files = new Map<string, string>([
      [prefix('/src/index.ts'), indexTs],
      [prefix('/src/components/a.ts'), componentsATs],
    ])

    const { project } = createProject(files)

    const renameInfo =
      project
        .getLanguageService()
        .findRenameLocations(prefix('/src/components/a.ts'), 9, false, false) ??
      []

    expect(renameInfo).toHaveLength(4)
    expect(renameInfo).not.toContainEqual(
      expect.objectContaining({
        fileName: expect.stringContaining('components/index.ts'),
      })
    )

    assertLocationValue(componentsATs, renameInfo[0], 'value') // rename symbol
    assertLocationValue(componentsATs, renameInfo[1], 'value') // rename export
    assertLocationValue(indexTs, renameInfo[2], 'value') // rename import
    assertLocationValue(indexTs, renameInfo[3], 'value') // rename usage
  })

  it('renames reference to default export in the origin and usages', () => {
    const indexTs = `import { value } from './components'; const result = 1 + value`
    const componentsATs = 'const value = 1; export default value'

    const files = new Map<string, string>([
      [prefix('/src/index.ts'), indexTs],
      [prefix('/src/components/a.ts'), componentsATs],
    ])

    const { project } = createProject(files)

    const renameInfo =
      project
        .getLanguageService()
        .findRenameLocations(prefix('/src/components/a.ts'), 9, false, false) ??
      []

    expect(renameInfo).toHaveLength(4)
    expect(renameInfo).not.toContainEqual(
      expect.objectContaining({
        fileName: expect.stringContaining('components/index.ts'),
      })
    )

    assertLocationValue(componentsATs, renameInfo[0], 'value') // rename symbol
    assertLocationValue(componentsATs, renameInfo[1], 'value') // rename export
    assertLocationValue(indexTs, renameInfo[2], 'value') // rename import
    assertLocationValue(indexTs, renameInfo[3], 'value') // rename usage
  })

  it('renames inline default exports in the origin and usages', () => {
    const indexTs = `import { doSomething } from './components'; const result = doSomething()`
    const componentsATs = 'export default function doSomething() {}'

    const files = new Map<string, string>([
      [prefix('/src/index.ts'), indexTs],
      [prefix('/src/components/a.ts'), componentsATs],
    ])

    const { project } = createProject(files)

    const renameInfo =
      project
        .getLanguageService()
        .findRenameLocations(
          prefix('/src/components/a.ts'),
          30,
          false,
          false
        ) ?? []

    expect(renameInfo).toHaveLength(3)
    expect(renameInfo).not.toContainEqual(
      expect.objectContaining({
        fileName: expect.stringContaining('components/index.ts'),
      })
    )

    assertLocationValue(componentsATs, renameInfo[0], 'doSomething')
    assertLocationValue(indexTs, renameInfo[1], 'doSomething')
    assertLocationValue(indexTs, renameInfo[2], 'doSomething')
  })

  it('updates namespace imports whenever an exported symbol changes', () => {
    const indexTs = `import * as components from './components'; const result = components.doSomething()`
    const componentsATs = 'export function doSomething() {}'

    const files = new Map<string, string>([
      [prefix('/src/index.ts'), indexTs],
      [prefix('/src/components/a.ts'), componentsATs],
    ])

    const { project } = createProject(files)

    const renameInfo =
      project
        .getLanguageService()
        .findRenameLocations(
          prefix('/src/components/a.ts'),
          23,
          false,
          false
        ) ?? []

    expect(renameInfo).toHaveLength(2)
    expect(renameInfo).not.toContainEqual(
      expect.objectContaining({
        fileName: expect.stringContaining('components/index.ts'),
      })
    )

    assertLocationValue(componentsATs, renameInfo[0], 'doSomething')
    assertLocationValue(indexTs, renameInfo[1], 'doSomething')
  })

  it('updates namespace imports whenever a default exported symbol changes', () => {
    const indexTs = `import * as components from './components'; const result = components.doSomething()`
    const componentsATs = 'export default function doSomething() {}'

    const files = new Map<string, string>([
      [prefix('/src/index.ts'), indexTs],
      [prefix('/src/components/a.ts'), componentsATs],
    ])

    const { project } = createProject(files)

    const renameInfo =
      project
        .getLanguageService()
        .findRenameLocations(
          prefix('/src/components/a.ts'),
          33,
          false,
          false
        ) ?? []

    expect(renameInfo).toHaveLength(2)
    expect(renameInfo).not.toContainEqual(
      expect.objectContaining({
        fileName: expect.stringContaining('components/index.ts'),
      })
    )

    assertLocationValue(componentsATs, renameInfo[0], 'doSomething')
    assertLocationValue(indexTs, renameInfo[1], 'doSomething')
  })
})
