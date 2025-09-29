<script setup lang="ts">
import { Btn, SchemeSwitch } from '@roku-ui/vue'
import { authClient } from '~~/lib/client'

const session = authClient.useSession()
</script>

<template>
  <div>
    <Btn
      v-if="!session?.data" @click="() => authClient.signIn.social({
        provider: 'github',
      })"
    >
      Continue with GitHub
    </Btn>
    <div>
      <Btn v-if="session.data" @click="authClient.signOut()">
        Sign out
      </Btn>
      <pre>{{ session.data }}</pre>
    </div>
  </div>
</template>
