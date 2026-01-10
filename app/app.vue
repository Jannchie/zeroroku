<script setup lang="ts">
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
:root {
  --font-sans: "Berkeley Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --font-mono: "Berkeley Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --default-font-family: var(--font-sans);
  --default-monoFont-family: var(--font-mono);
}

html,
body {
  font-family: var(--font-sans);
}

::selection {
  background: #000;
  color: #fff;
}

::-moz-selection {
  background: #000;
  color: #fff;
}
</style>
