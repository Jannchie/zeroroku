<template>
  <BilibiliFansRankingTable
    title="1日涨粉榜"
    subtitle="1-day follower gain"
    value-label="1日涨粉"
    value-key="delta"
    api-url="/api/bilibili/fans-trend?period=1&direction=up"
    show-sign
    show-trend-meta
  />
</template>
