<script setup lang="ts">
import { authClient } from '~~/lib/client'

const session = authClient.useSession()
</script>

<template>
  <div>
    <button
      v-if="!session?.data" @click="() => authClient.signIn.social({
        provider: 'github',
      })"
    >
      Continue with GitHub
    </button>
    <div>
      <pre>{{ session.data }}</pre>
      <button v-if="session.data" @click="authClient.signOut()">
        Sign out
      </button>
    </div>
  </div>
</template>
