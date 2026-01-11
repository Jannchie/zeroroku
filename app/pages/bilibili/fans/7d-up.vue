<template>
  <BilibiliFansRankingTable
    title="7日涨粉榜"
    subtitle="7-day follower gain"
    value-label="7日涨粉"
    value-key="delta"
    api-url="/api/bilibili/fans-trend?period=7&direction=up"
    show-sign
    show-trend-meta
  />
</template>
