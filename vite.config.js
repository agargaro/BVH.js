import { resolve } from 'path'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'cavolfiore',
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
  },
  plugins: [
    dts({ tsconfigPath: 'tsconfig.build.json' }),
    viteStaticCopy({
      targets: [{
        src: ['LICENSE', 'package.json', 'package-lock.json', 'README.md'],
        dest: './'
      }]
    })
  ]
})
