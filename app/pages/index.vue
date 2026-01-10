<script setup lang="ts">
import { authClient } from '~~/lib/client'

const session = authClient.useSession()
</script>

<template>
  <div v-if="session?.data" class="flex flex-col items-center gap-4 pb-12">
    <button @click="authClient.signOut()">
      退出登录
    </button>
    <pre>{{ session.data }}</pre>
  </div>
</template>
