import { resolve } from 'path';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ command }) => ({
  publicDir: command === 'build' ? false : 'public',
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'build/index',
      formats: ['es', 'cjs']
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [{
        src: ['LICENSE', 'package.json', 'README.md'],
        dest: './'
      }]
    })
  ]
}));
