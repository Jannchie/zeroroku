<script setup lang="ts">
import { computed, ref } from 'vue'
import { authClient } from '~~/lib/client'

const session = authClient.useSession()
const signInError = ref<string | null>(null)
const isSigningIn = ref(false)
const displayName = computed(() => session.value?.data?.user?.name ?? session.value?.data?.user?.email ?? 'User')
const avatarUrl = computed(() => session.value?.data?.user?.image || null)
const avatarInitial = computed(() => displayName.value.slice(0, 1).toUpperCase())

async function signInWithGithub() {
  signInError.value = null
  isSigningIn.value = true

  try {
    const callbackURL = globalThis.window === undefined ? '/' : globalThis.location.origin
    const { data, error } = await authClient.signIn.social({
      provider: 'github',
      callbackURL,
    })

    if (error) {
      signInError.value = error.message ?? 'Sign in failed.'
      return
    }

    if (data?.url && globalThis.window !== undefined) {
      globalThis.location.href = data.url
    }
  }
  finally {
    isSigningIn.value = false
  }
}
</script>

<template>
  <div>
    <AuxlineRoot>
      <template #headerActions>
        <div class="flex items-center gap-3">
          <template v-if="session?.data">
            <AuxlineMenu align="right">
              <template #trigger>
                <button
                  type="button"
                  class="flex h-9 items-center gap-2 px-1 text-left hover:bg-[var(--auxline-bg-hover)] cursor-pointer
                    focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--auxline-line)]"
                >
                  <div
                    class="flex h-9 w-9 items-center justify-center overflow-hidden border border-[var(--auxline-line)]
                      bg-[var(--auxline-bg-emphasis)] text-[0.6rem] font-mono uppercase tracking-[0.12em]"
                    aria-hidden="true"
                  >
                    <img
                      v-if="avatarUrl"
                      :src="avatarUrl"
                      alt=""
                      class="h-full w-full object-cover"
                    >
                    <span v-else>
                      {{ avatarInitial }}
                    </span>
                  </div>
                  <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)] pl-1 pr-2">
                    {{ displayName }}
                  </span>
                </button>
              </template>
              <div class="flex flex-col py-1">
                <button
                  type="button"
                  class="h-9 w-full px-3 text-left text-xs font-mono uppercase tracking-[0.12em] hover:bg-[var(--auxline-bg-hover)]"
                  @click="authClient.signOut()"
                >
                  Sign out
                </button>
              </div>
            </AuxlineMenu>
          </template>
          <template v-else>
            <AuxlineBtn
              :loading="isSigningIn"
              @click="signInWithGithub"
            >
              Continue with GitHub
            </AuxlineBtn>
            <span v-if="signInError" class="text-xs text-red-600">
              {{ signInError }}
            </span>
          </template>
        </div>
      </template>
      <template #main>
        <section class="flex flex-col items-center gap-6 pt-12 pb-12">
          <h1 class="text-3xl font-bold text-center">
            ZeroRoku
          </h1>
        </section>
        <div class="flex flex-wrap justify-center children:border-r first:children:border-l">
          <AuxlineBtn size="sm" to="/">
            首页
          </AuxlineBtn>
          <AuxlineBtn size="sm" to="/rank">
            排行榜
          </AuxlineBtn>
          <AuxlineBtn size="sm" to="/profile">
            个人
          </AuxlineBtn>
          <AuxlineBtn size="sm" to="/bilibili">
            B站
          </AuxlineBtn>
          <AuxlineBtn size="sm" to="/settings">
            设置
          </AuxlineBtn>
        </div>
        <div v-if="session?.data">
          <button @click="authClient.signOut()">
            Sign out
          </button>
          <pre>{{ session.data }}</pre>
        </div>
      </template>
      <template #footer>
        <p class="text-sm py-2 text-center">
          © {{ new Date().getFullYear() }} Jannchie Studio. All rights reserved.
        </p>
      </template>
    </AuxlineRoot>
  </div>
</template>
