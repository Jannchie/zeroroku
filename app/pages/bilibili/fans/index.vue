<script setup lang="ts">
useSeoMeta({
  title: '粉丝总数排行榜',
})
</script>

<template>
  <BilibiliFansRankingTable
    title="粉丝总数排行榜"
    subtitle="Bilibili Fans Ranking"
    value-label="粉丝"
    value-key="fans"
    api-url="/api/bilibili/fans-ranking"
  />
</template>
