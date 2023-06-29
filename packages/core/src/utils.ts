import typescript from 'typescript'

export const isESModule = (compilerOptions: typescript.CompilerOptions) =>
  compilerOptions.module &&
  compilerOptions.module >= typescript.ModuleKind.ES2015

export const isNodeModernModuleResolution = (
  compilerOptions: typescript.CompilerOptions
) =>
  compilerOptions.moduleResolution &&
  compilerOptions.moduleResolution >= typescript.ModuleResolutionKind.Node16
