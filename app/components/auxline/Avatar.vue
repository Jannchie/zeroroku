<script setup lang="ts">
// 圆形头像：有图显示图，没图显示名字首字；尺寸一个数字（px）同时决定宽高和首字字号
const props = withDefaults(defineProps<{
  src?: string | null
  name?: string | null
  size?: number
}>(), {
  src: null,
  name: '',
  size: 40,
})
</script>

<template>
  <span
    class="zr-avatar"
    :style="{ width: `${props.size}px`, height: `${props.size}px`, fontSize: `${Math.max(11, Math.round(props.size * 0.36))}px` }"
    aria-hidden="true"
  >
    <NuxtImg
      v-if="props.src"
      :src="props.src"
      alt=""
      class="h-full w-full object-cover"
      :width="props.size"
      :height="props.size"
    />
    <span v-else-if="props.name">{{ props.name.slice(0, 1) }}</span>
  </span>
</template>
