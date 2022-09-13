export const patchMethod = <O extends Record<string, any>, M extends keyof O>(
  object: O,
  method: M,
  callback: (original: O[M], ...args: Parameters<O[M]>) => ReturnType<O[M]>
) => {
  const original = object[method].bind(object) as O[M]

  const patched = (...args: Parameters<O[M]>) => {
    return callback(original, ...args)
  }

  object[method] = patched as O[M]
}
