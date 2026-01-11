<script setup lang="ts">
useSeoMeta({
  title: '7日掉粉榜',
})
</script>

<template>
  <BilibiliFansRankingTable
    title="7日掉粉榜"
    subtitle="7-day follower loss"
    value-label="7日掉粉"
    value-key="delta"
    api-url="/api/bilibili/fans-trend?period=7&direction=down"
    show-trend-meta
  />
</template>
