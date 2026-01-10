import * as fs from 'node:fs'
import { rokuPreset } from '@roku-ui/preset'
import { defineConfig } from 'unocss'

const file = fs.readFileSync('node_modules/@roku-ui/vue/dist/index.js', 'utf8')
export default defineConfig({
  presets: [
    rokuPreset(),
  ],
  content: {
    inline: [file],
  },
  theme: {
    fontFamily: {
      sans: '"Berkeley Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      mono: '"Berkeley Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  },
})
