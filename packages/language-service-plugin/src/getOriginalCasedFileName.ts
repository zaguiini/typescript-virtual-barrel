import path from 'path'

export const getOriginalCasedFileName = (
  _fileName: string,
  rootDir: string
) => {
  let fileName = _fileName.replace(rootDir, '')

  /**
   * If the result is the same after replacing the rootDir for nothing,
   * then this means the casing is different
   */
  if (fileName === _fileName) {
    fileName = _fileName.replace(rootDir.toLowerCase(), '')
  }

  return path.join(rootDir, fileName)
}
