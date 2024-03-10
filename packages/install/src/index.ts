#!/usr/bin/env node
import { PackageJson, TsConfigJson, JsonObject } from 'type-fest'
import { fileExists, modifyJSON, run } from './utils.js'
import fs from 'fs/promises'
import path from 'path'
import ora from 'ora'

console.log(`\t
\tTypeScript Virtual Barrel 🛢️
`)

const spinner = ora()

spinner.start('Installing @typescript-virtual-barrel')

const cwd = process.cwd()

const isYarn = await fileExists('yarn.lock')
const isNPMProject = await fileExists('package.json')
const isTypeScriptProject = await fileExists('tsconfig.json')

if (!isNPMProject) {
  spinner.fail('No package.json file found')
  process.exit(1)
}

spinner.info('package.json file found')

if (!isTypeScriptProject) {
  spinner.fail('No tsconfig.json file found')
  process.exit(1)
}

spinner.info('tsconfig.json file found')

spinner.start('Modifying package.json')

await modifyJSON<PackageJson>(['package.json'], (packageJson) => {
  if (!packageJson.scripts) {
    packageJson.scripts = {}
  }

  if (!packageJson.scripts.prepare) {
    packageJson.scripts.prepare = 'ts-patch install'
  } else if (!packageJson.scripts.prepare.includes('ts-patch')) {
    packageJson.scripts.prepare = '; ts-patch install'
  }
})

spinner.succeed('prepare script added to package.json')

spinner.start('Adding VSCode settings')

await fs.mkdir(path.join(process.cwd(), '.vscode'), {
  recursive: true,
})

await modifyJSON<JsonObject>(['.vscode', 'settings.json'], (content) => {
  content['typescript.tsdk'] = 'node_modules/typescript/lib'
})

spinner.succeed('.vscode/settings.json file modified')

spinner.start('Adding plugins to tsconfig.json')

await modifyJSON<TsConfigJson>(['tsconfig.json'], (tsConfig) => {
  if (!tsConfig.compilerOptions) {
    tsConfig.compilerOptions = {}
  }

  tsConfig.compilerOptions.plugins = [
    {
      transform: '@typescript-virtual-barrel/compiler-plugin',
      transformProgram: true,
    },
    {
      name: '@typescript-virtual-barrel/language-service-plugin',
    },
    ...(tsConfig.compilerOptions.plugins ?? []),
  ]
})

spinner.succeed('Plugins added to tsconfig.json')

spinner.start('Installing dependencies\n')

const packages = [
  'ts-patch@^3',
  '@typescript-virtual-barrel/compiler-plugin@latest',
  '@typescript-virtual-barrel/language-service-plugin@latest',
]

const installCommand = isYarn ? 'add' : 'install'
const packageManager = isYarn ? 'yarn' : 'npm'

try {
  await run(packageManager, [installCommand, ...packages, '-D'], {
    cwd,
  })

  spinner.succeed('Dependencies installed')
} catch {
  spinner.fail('Failed to install dependencies')
  process.exit(1)
}

spinner.start('Patching TypeScript')

try {
  await run(packageManager, isYarn ? ['prepare'] : ['run', 'prepare'], {
    cwd,
  })

  spinner.succeed('TypeScript patched')
} catch {
  spinner.fail('Failed to patch TypeScript')
}

spinner.succeed('TypeScript Virtual Barrel has been successfully configured 🎉')
