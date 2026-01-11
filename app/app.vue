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
  --font-display-latin: 'Berkeley Mono', 'HarmonyOS Sans', 'HarmonyOS Sans SC', 'Noto Sans SC', 'Noto Sans', sans-serif;
  --font-display-zh: 'Berkeley Mono', 'HarmonyOS Sans', 'HarmonyOS Sans SC', 'Noto Sans SC', 'Noto Sans', sans-serif;
  --font-display-ja: 'Berkeley Mono', 'HarmonyOS Sans', 'HarmonyOS Sans SC', 'Noto Sans SC', 'Noto Sans', sans-serif;
  --font-title-latin: 'Berkeley Mono', 'HarmonyOS Sans', 'HarmonyOS Sans SC', 'Noto Sans SC', 'Noto Sans', sans-serif;
  --font-title-zh: 'Berkeley Mono', 'HarmonyOS Sans', 'HarmonyOS Sans SC', 'Noto Sans SC', 'Noto Sans', sans-serif;
  --font-title-ja: 'Berkeley Mono', 'HarmonyOS Sans', 'HarmonyOS Sans SC', 'Noto Sans SC', 'Noto Sans', sans-serif;
  --font-sans: var(--font-display-latin);
  --font-mono: 'Berkeley Mono', 'HarmonyOS Sans', 'HarmonyOS Sans SC', 'Noto Sans SC', 'Noto Sans', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
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
