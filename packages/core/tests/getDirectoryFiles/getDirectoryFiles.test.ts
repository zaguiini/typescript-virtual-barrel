import { getDirectoryFiles } from '../../src/getDirectoryFiles'
import { createProgram, combinePaths, sys } from 'typescript'

const PROGRAM_DIR = combinePaths(__dirname, 'program')

describe('getDirectoryFiles', () => {
  it('returns all files in the specified folder', () => {
    expect(
      getDirectoryFiles(
        combinePaths(PROGRAM_DIR, 'folder'),
        createProgram([], {}),
        sys.readDirectory
      )
    ).toEqual([
      combinePaths(PROGRAM_DIR, 'folder', 'a.ts'),
      combinePaths(PROGRAM_DIR, 'folder', 'b.ts'),
      combinePaths(PROGRAM_DIR, 'folder', 'c.ts'),
    ])
  })

  it('does not return files from other folders', () => {
    const directoryFiles = getDirectoryFiles(
      combinePaths(PROGRAM_DIR, 'folder'),
      createProgram([], {}),
      sys.readDirectory
    )

    expect(directoryFiles).toEqual([
      combinePaths(PROGRAM_DIR, 'folder', 'a.ts'),
      combinePaths(PROGRAM_DIR, 'folder', 'b.ts'),
      combinePaths(PROGRAM_DIR, 'folder', 'c.ts'),
    ])

    expect(directoryFiles).not.toContain(
      combinePaths(PROGRAM_DIR, 'another-folder', 'a.ts')
    )
  })

  it('returns non-ts extensions if specified in the program', () => {
    expect(
      getDirectoryFiles(
        combinePaths(PROGRAM_DIR, 'folder'),
        createProgram([], { resolveJsonModule: true }),
        sys.readDirectory
      )
    ).toEqual([
      combinePaths(PROGRAM_DIR, 'folder', 'a.ts'),
      combinePaths(PROGRAM_DIR, 'folder', 'b.ts'),
      combinePaths(PROGRAM_DIR, 'folder', 'c.ts'),
      combinePaths(PROGRAM_DIR, 'folder', 'file.json'),
    ])
  })
})
