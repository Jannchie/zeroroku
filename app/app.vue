<script setup lang="ts">
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
@font-face {
  font-family: 'Berkeley Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('https://cdn.jannchie.com/fonts/BerkeleyMono-Regular.woff2') format('woff2');
}

@font-face {
  font-family: 'Berkeley Mono';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('https://cdn.jannchie.com/fonts/BerkeleyMono-Bold.woff2') format('woff2');
}

:root {
  --font-display-latin: 'Berkeley Mono', 'Space Grotesk', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-display-zh: 'Berkeley Mono', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'Heiti SC', sans-serif;
  --font-display-ja: 'Berkeley Mono', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;
  --font-title-latin: 'Berkeley Mono', 'Space Grotesk', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-title-zh: 'Berkeley Mono', 'Noto Serif SC', 'Songti SC', 'Noto Serif', serif;
  --font-title-ja: 'Berkeley Mono', 'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif;
  --font-sans: var(--font-display-latin);
  --font-mono: "Berkeley Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --default-font-family: var(--font-sans);
  --default-monoFont-family: var(--font-mono);
}

html,
body {
  font-family: var(--font-sans);
}

@media (min-width: 1024px) {
  html.is-windows {
    scrollbar-gutter: stable;
  }
}

::selection {
  background: #000;
  color: #fff;
}

::-moz-selection {
  background: #000;
  color: #fff;
}

:root[data-scheme='dark'] ::selection {
  background: #fff;
  color: #000;
}

:root[data-scheme='dark'] ::-moz-selection {
  background: #fff;
  color: #000;
}
</style>
