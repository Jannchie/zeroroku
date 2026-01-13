<script setup lang="ts">
useSeoMeta({
  title: '粉丝总数排行榜 · Bilibili',
  description: '按 Bilibili UP 主粉丝总数排序的榜单，快速查看头部账号排名。',
  ogTitle: '粉丝总数排行榜 · Bilibili',
  ogDescription: '按 Bilibili UP 主粉丝总数排序的榜单，快速查看头部账号排名。',
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
