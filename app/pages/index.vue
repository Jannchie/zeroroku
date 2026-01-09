<script setup lang="ts">
import { authClient } from '~~/lib/client'

const session = authClient.useSession()
</script>

<template>
  <div>
    <AuxlineRoot>
      <template #headerActions>
        <AuxlineBtn
          v-if="!session?.data"
          @click="() => authClient.signIn.social({
            provider: 'github',
          })"
        >
          Continue with GitHub
        </AuxlineBtn>
      </template>
      <template #main>
        <h1 class="text-3xl pt-12 pb-12 font-bold text-center">
          ZeroRoku
        </h1>
        <div v-if="session?.data">
          <button @click="authClient.signOut()">
            Sign out
          </button>
          <pre>{{ session.data }}</pre>
        </div>
      </template>
      <template #footer>
        <p class="text-sm py-2 text-center">
          © 2026 Jannchie Studio. All rights reserved.
        </p>
      </template>
    </AuxlineRoot>
  </div>
</template>
