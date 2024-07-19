import { resolve } from 'path'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'bvh_js',
      fileName: 'index',
      formats: ['es', 'umd'],
    },
  },
  plugins: [
    dts(),
    viteStaticCopy({
      targets: [{
        src: ['LICENSE', 'package.json', 'README.md'],
        dest: './'
      }]
    })
  ]
})
