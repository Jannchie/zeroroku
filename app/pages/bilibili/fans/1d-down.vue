<template>
  <BilibiliFansRankingTable
    title="1日掉粉榜"
    subtitle="1-day follower loss"
    value-label="1日掉粉"
    value-key="delta"
    api-url="/api/bilibili/fans-trend?period=1&direction=down"
    show-trend-meta
  />
</template>
