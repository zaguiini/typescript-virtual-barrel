# TypeScript Virtual Barrel

Stop manually creating and managing [barrel files](https://basarat.gitbook.io/typescript/main-1/barrel)! This solution creates barrel files at compile time ("virtual", because they don't exist on disk), so that you won't ever need to write one by hand again.

![usage](./usage.gif)

## What?

Imagine that you have this folder structure:

```
- components/
-- Button.tsx
-- Image.tsx
-- Text.tsx
```

And you want to import all of it, or a subset, in a TypeScript file:

```ts
import { Button } from './components/Button'
import { Image } from './components/Image'
import { Text } from './components/Text'

...
```

As you can imagine, this can turn into a hot mess in no time providing that real applications have dozens, if not hundreds, of exported symbols per folder.

Because of that, it makes sense to try and lower the amount of import declarations, from a maintenance perspective, and of course, developer ergonomics too.

So you create a barrel file, an `index.ts` file inside that components folder:

```ts
export { Button } from './Button'
export { Image } from './Image'
export { Text } from './Text'
```

Then you can start writing imports like this:

```ts
import { Button, Image, Text } from './components'
```

Much better, isn't it? The problem is that you'll need to maintain that `components/index.ts` file you just created. Every new component you'd like to expose through the barrel will need to be added to it.

But wouldn't it be nice if you _did not need_ to create or manage this file?

That's where TypeScript Virtual Barrel kicks in. The tool works with the compiler to rewrite the import declarations that refer to folders without an `index.ts` file, looking for the actual exported symbols.

One great advantage is that this plugin works out of the box with bundlers, so you won't need to modify your build process.

Not yet convinced? [Try the sample project](https://github.com/zaguiini/typescript-virtual-barrel-sample).

## Installation

You'll need to install three packages using your favorite package manager. Mine is Yarn:

```
yarn add -D ts-patch @typescript-virtual-barrel/compiler-plugin @typescript-virtual-barrel/language-service-plugin
```

## Configuration

With `ts-patch` installed, modify your `package.json` to include a `postinstall` script:

```json
{
  "scripts": {
    "postinstall": "ts-patch install"
  }
}
```

This is necessary because the TypeScript compiler does not accept pre-emit transformers. TypeScript Virtual Barrel needs to calculate the barrel files first, and that operation does not work natively, that's why a patch to the local TypeScript installation is necessary.

Run `yarn install` so that your installation gets patched. As this is a lifecycle script, future package installations will patch TypeScript by default. You can find more information about `ts-patch` [here](https://github.com/nonara/ts-patch).

Open the `tsconfig.json` file and add the following entries to the `compilerOptions.plugin` section:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "transform": "@typescript-virtual-barrel/compiler-plugin",
        "transformProgram": true
      },
      {
        "name": "@typescript-virtual-barrel/language-service-plugin"
      }
    ]
  }
}
```

The reason that two plugins are added to your config file is that most IDEs are using a Language Server in the background to provide rich information (such as type assertions, import suggestions, go to definition, etc) for you, the developer. As the TypeScript compiler and Language Service are two different things, we need two different plugins to make it work as intended.

If you're using VSCode, make sure that the Language Server is using the local TypeScript installation. You can do that by creating a file called `.vscode/settings.json` in the root dir of your project with the following contents:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Options

The `@typescript-virtual-barrel/compiler-plugin` has an option called `shouldTransformImports`, which is enabled by default. That means that the barrel import declaration is rewritten into multiple declarations at build time. But, for some reason, you might want to preserve the generated barrel in the distribution (emitted) version of your project. That's possible adding `shouldTransformImports: false` to the plugin entry:

```json
{
  "transform": "@typescript-virtual-barrel/compiler-plugin",
  "transformProgram": true,
  "shouldTransformImports": false
}
```

As an example, this virtual barrel file import declaration:

```typescript
import { Button, Card } from './components'
```

Outputs...

```typescript
import { Button } from './components/Button.tsx'
import { Image } from './components/Image.tsx'
```

With this option, the virtual `./components/index.ts` file is **not emitted**.

## Usage

Every time that you have a folder within your project that does not have an `index.ts` file, TypeScript Virtual Barrel will generate one on-the-fly, allowing you to save on those import declarations and not include a useless `index.ts` file to your codebase.

All you need to do is configure the plugin and start writing import declarations. Or, better yet, just accept import suggestions 😎

![usage](./usage.gif)

Notice how, in the GIF, I'm getting symbols ready to be imported. That's right: full IDE support! It also regenerate barrels in real time if you change the files in the barrel folder, giving you the best possible developer experience. ✨

And of course, you can compile your project, just like you normally would: `tsc`. It will create the distribution version, either transforming the imports or [keeping the generated barrel file if you wish](#options).

## Known issues

- Not compatible with TypeScript 5.0
- No `./barrel/index.js` completions when `moduleResolution` is set to `NodeNext`

## License

MIT
