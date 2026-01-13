<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'

type RankField = 'fans' | 'rate1' | 'rate7'
type RankOrder = 'asc' | 'desc'

interface RankConfig {
  title: string
  subtitle: string
  valueLabel: string
  valueKey: string
  apiUrl: string
  showSign?: boolean
  showTrendMeta?: boolean
}

const route = useRoute()
const fieldParam = computed(() => (Array.isArray(route.params.field) ? route.params.field[0] : route.params.field))
const orderParam = computed(() => (Array.isArray(route.params.order) ? route.params.order[0] : route.params.order))

const field = computed<RankField | null>(() => {
  if (fieldParam.value === 'fans' || fieldParam.value === 'rate1' || fieldParam.value === 'rate7') {
    return fieldParam.value
  }
  return null
})

const order = computed<RankOrder>(() => {
  if (orderParam.value === 'asc' || orderParam.value === 'desc') {
    return orderParam.value
  }
  return 'desc'
})

const config = computed<RankConfig | null>(() => {
  if (field.value === 'fans') {
    return {
      title: '粉丝总数排行榜',
      subtitle: 'Bilibili Fans Ranking',
      valueLabel: '粉丝',
      valueKey: 'fans',
      apiUrl: '/api/bilibili/fans-ranking',
    }
  }

  if (field.value === 'rate7') {
    const isDesc = order.value === 'desc'
    return {
      title: isDesc ? '7日涨粉榜' : '7日掉粉榜',
      subtitle: isDesc ? '7-day follower gain' : '7-day follower loss',
      valueLabel: isDesc ? '7日涨粉' : '7日掉粉',
      valueKey: 'delta',
      apiUrl: `/api/bilibili/fans-trend?period=7&direction=${isDesc ? 'up' : 'down'}`,
      showSign: isDesc,
      showTrendMeta: true,
    }
  }

  if (field.value === 'rate1') {
    const isDesc = order.value === 'desc'
    return {
      title: isDesc ? '1日涨粉榜' : '1日掉粉榜',
      subtitle: isDesc ? '1-day follower gain' : '1-day follower loss',
      valueLabel: isDesc ? '1日涨粉' : '1日掉粉',
      valueKey: 'delta',
      apiUrl: `/api/bilibili/fans-trend?period=1&direction=${isDesc ? 'up' : 'down'}`,
      showSign: isDesc,
      showTrendMeta: true,
    }
  }

  return null
})

const pageTitle = computed(() => {
  const title = config.value?.title
  if (title) {
    return `${title} · Bilibili`
  }
  return 'Bilibili 排行榜'
})

const pageDescription = computed(() => {
  const current = config.value
  if (!current) {
    return '查看 Bilibili UP 主粉丝与涨跌趋势排行榜。'
  }
  if (current.showTrendMeta) {
    return `${current.title}，按涨粉或掉粉趋势统计的 Bilibili UP 主排行，展示变化幅度与排名。`
  }
  return `${current.title}，按 Bilibili UP 主粉丝总数排序，展示头部账号排名。`
})

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
})

watch(
  config,
  async (value) => {
    if (!value) {
      await navigateTo('/bilibili/rank', { replace: true })
    }
  },
  { immediate: true },
)
</script>

<template>
  <BilibiliFansRankingTable
    v-if="config"
    :title="config.title"
    :subtitle="config.subtitle"
    :value-label="config.valueLabel"
    :value-key="config.valueKey"
    :api-url="config.apiUrl"
    :show-sign="config.showSign"
    :show-trend-meta="config.showTrendMeta"
  />
</template>
