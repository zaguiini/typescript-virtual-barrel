import fs from 'fs'
import path from 'path'
import { diff } from 'jest-diff'
import { compile, getDirFiles } from './compile'

const loadFixtureOptions = (fixtureDir: string) => {
  const filePath = path.resolve(fixtureDir, 'options.json')

  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath).toString())
  }

  return {}
}

const getFixtures = () => {
  const directories = fs
    .readdirSync(path.resolve(__dirname, '__fixtures__'), {
      withFileTypes: true,
    })
    .filter((entry) => entry.isDirectory())

  return directories.map(({ name }) => [
    name.replace(/-/g, ' '),
    name,
    loadFixtureOptions(path.join(__dirname, '__fixtures__', name)),
  ])
}

describe('TypeScript Compiler plugin', () => {
  const fixtures = getFixtures()

  it.concurrent.each(fixtures)('%s', async (_, fixture, options) => {
    const compiled = await compile(fixture, options)

    expect(compiled).toMatchOutput()
    expect(compiled).toMatchDiagnostics()
  })
})

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toMatchOutput(): Promise<R>
      toMatchDiagnostics(): Promise<R>
    }
  }
}

const loadExpectedDiagnostics = (fixtureDir: string) => {
  const filePath = path.resolve(fixtureDir, 'expected.diagnostics')

  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath).toString()
  }

  return ''
}

expect.extend({
  toMatchOutput(received: Awaited<ReturnType<typeof compile>>) {
    const outFiles = getDirFiles(received.outDir)
    const expectedFiles = outFiles.sort().join('\n')
    const receivedFiles = [...received.fileMap.keys()].sort().join('\n')

    if (expectedFiles !== receivedFiles) {
      return {
        pass: false,
        message: () =>
          `Distribution files are not equal.\n${diff(
            expectedFiles,
            receivedFiles
          )}`,
      }
    }

    for (const fileName of outFiles) {
      const expectedFileContent = fs.readFileSync(fileName).toString()
      const actualFileContent = received.fileMap.get(fileName)

      if (!actualFileContent) {
        throw new Error('file does not exist on filemap')
      }

      if (expectedFileContent !== actualFileContent) {
        const relativeFileName = fileName.replace(
          path.join(received.fixtureDir, path.sep, 'expected', path.sep),
          ''
        )

        const difference = diff(expectedFileContent, actualFileContent)

        return {
          pass: false,
          message: () =>
            `Outputs are different: ${relativeFileName}\n${difference}`,
        }
      }
    }

    return {
      pass: true,
      message: () => '',
    }
  },
  toMatchDiagnostics(received: Awaited<ReturnType<typeof compile>>) {
    const expected = loadExpectedDiagnostics(received.fixtureDir)

    return {
      pass: expected === received.diagnostics,
      message: () =>
        `Diagnostics are not equal.\n${diff(expected, received.diagnostics)}`,
    }
  },
})
