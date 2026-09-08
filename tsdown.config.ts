import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    outDir: 'lib',
    clean: true,
  },
  {
    entry: ['src/client/index.tsx'],
    format: ['cjs'],
    outDir: 'lib',
    outExtensions: () => ({ dts: '.d.ts', js: '.js' }),
    external: ['react', 'react/jsx-runtime'],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: 'window.__ModuleLoader__.load({ id: "dsh-web-search", factory: (require) => {',
      footer: 'return module.exports; } });',
      intro: 'var module={exports:{}}; var exports=module.exports;',
    },
  },
])