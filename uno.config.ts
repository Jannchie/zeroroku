import * as fs from 'node:fs'
import { rokuPreset } from '@roku-ui/preset'
import { defineConfig } from 'unocss'

const file = fs.readFileSync('node_modules/@roku-ui/vue/dist/index.js', 'utf8')
const stripeMaskSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4" shape-rendering="crispEdges"><path d="M0 4L4 0" stroke="white" stroke-width="1"/></svg>'
const stripeMask = `url("data:image/svg+xml,${encodeURIComponent(stripeMaskSvg)}")`
const stripeMaskSize = '4px 4px'
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
  preflights: [
    {
      getCSS: () => `
.auxline-stripe-mask {
  position: relative;
  --auxline-stripe-color: var(--auxline-line);
}
.auxline-stripe-mask::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: var(--auxline-stripe-color);
  pointer-events: none;
  mask-image: ${stripeMask};
  mask-size: ${stripeMaskSize};
  mask-repeat: repeat;
  -webkit-mask-image: ${stripeMask};
  -webkit-mask-size: ${stripeMaskSize};
  -webkit-mask-repeat: repeat;
}
`,
    },
  ],
})
