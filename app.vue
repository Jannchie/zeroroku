<script setup lang="ts">
import { RokuProvider } from '@roku-ui/vue'
import '@unocss/reset/tailwind.css'
</script>

<template>
  <RokuProvider>
    <NuxtPage />
  </RokuProvider>
</template>
