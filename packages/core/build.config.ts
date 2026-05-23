import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  rollup: {
    dts: {
      compilerOptions: {
        declaration: true,
        declarationMap: false,
        emitDeclarationOnly: false,
      },
    },
  },
})
