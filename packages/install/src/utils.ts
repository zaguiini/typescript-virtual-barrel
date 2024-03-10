import fs from 'fs/promises'
import path from 'path'
import { PackageJson } from 'type-fest'
import { parse, stringify } from 'comment-json'
import { spawn, SpawnOptions } from 'node:child_process'

export const run = (
  command: string,
  arguments_: string[],
  options: SpawnOptions = {}
) => {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, arguments_, {
      ...options,
      stdio: 'inherit',
    })

    child.on('error', (e) => {
      console.log(e)
      reject(e)
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject({
          command: `${command} ${arguments_.join(' ')}`,
          code,
        })
        return
      }
      resolve()
    })
  })
}

export const fileExists = (fileName: string) =>
  fs
    .stat(path.resolve(process.cwd(), fileName))
    .then(() => true)
    .catch(() => false)

export const writeFile = (fileName: string, content: string) =>
  fs.writeFile(path.resolve(process.cwd(), fileName), content)

export const modifyJSON = async <T>(
  fileName: string[],
  callback: (content: T) => void
) => {
  const filePath = path.join(process.cwd(), ...fileName)

  const content = await fs
    .readFile(filePath, 'utf-8')
    .then((value) => value)
    .catch(() => '{}')

  const parsedContent = parse(content)
  callback(parsedContent as T)

  await fs.writeFile(filePath, stringify(parsedContent, null, 2))
}

export const determineTSVersion = async () => {
  const tsPackageJson = path.join(
    process.cwd(),
    'node_modules',
    'typescript',
    'package.json'
  )

  if (!(await fileExists(tsPackageJson))) {
    return
  }

  const { default: packageJson } = await import(tsPackageJson, {
    assert: { type: 'json' },
  })

  return (packageJson as PackageJson).version
}
