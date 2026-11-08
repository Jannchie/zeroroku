<script setup lang="ts">
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <AuxlineToaster />
  </ClientOnly>
</template>

<style>
@font-face { font-family: 'Berkeley Mono'; font-style: normal; font-weight: 400; font-display: swap; src: url('https://cdn.jannchie.com/fonts/variants/BerkeleyMono-Regular.woff2') format('woff2'); }
@font-face { font-family: 'Berkeley Mono'; font-style: italic; font-weight: 400; font-display: swap; src: url('https://cdn.jannchie.com/fonts/variants/BerkeleyMono-Oblique.woff2') format('woff2'); }
@font-face { font-family: 'Berkeley Mono'; font-style: normal; font-weight: 700; font-display: swap; src: url('https://cdn.jannchie.com/fonts/variants/BerkeleyMono-Bold.woff2') format('woff2'); }
@font-face { font-family: 'Berkeley Mono'; font-style: italic; font-weight: 700; font-display: swap; src: url('https://cdn.jannchie.com/fonts/variants/BerkeleyMono-Bold-Oblique.woff2') format('woff2'); }

/*
 * 设计尺度（全站只用这几档）
 * 字号：12 标注 · 13 次要 · 14 正文 · 16 版块标题 · 28 页面标题（数字大字 30）
 * 间距：4 · 8 · 12 · 16 · 24 · 32 · 40；页面左右留白 --zr-gutter：16 / 24 / 40
 * 行高：列表行 56（带头像）、表格行 44、按钮 32
 */
:root {
  --auxline-page: #f4f4f6;
  --auxline-bg: #ffffff;
  --auxline-bg-emphasis: #f6f6f8;
  /* 侧栏底色比正文略沉一档，让视线先落在中间 */
  --auxline-side: #fafafb;
  --auxline-bg-hover: #f0f0f3;
  --auxline-line: #ebebef;
  --auxline-line-strong: #d9d9df;
  --auxline-fg: #0e0e11;
  --auxline-fg-2: #45464e;
  --auxline-fg-muted: #73747d;
  --zr-success: #16a34a;
  --zr-danger: #dc2626;
  --zr-shadow-pop: 0 8px 24px -12px rgb(0 0 0 / .18), 0 2px 6px -2px rgb(0 0 0 / .06);
  --zr-gutter: 16px;
  --zr-header-h: 56px;
  --font-sans: 'Inter', system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'HarmonyOS Sans SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  --font-mono: 'Berkeley Mono', ui-monospace, 'Sarasa Mono SC', 'PingFang SC', 'Microsoft YaHei', monospace;
  color-scheme: light;
}
@media (min-width: 640px) { :root { --zr-gutter: 24px; } }
@media (min-width: 1280px) { :root { --zr-gutter: 40px; } }
:root[data-scheme='dark'] {
  --auxline-page: #050506;
  --auxline-bg: #0e0e11;
  --auxline-bg-emphasis: #141418;
  --auxline-side: #0b0b0d;
  --auxline-bg-hover: #1a1a1f;
  --auxline-line: #1e1e24;
  --auxline-line-strong: #2c2c33;
  --auxline-fg: #f2f2f4;
  --auxline-fg-2: #c0c1c8;
  --auxline-fg-muted: #888993;
  --zr-success: #4ade80;
  --zr-danger: #f87171;
  --zr-shadow-pop: 0 8px 24px -12px rgb(0 0 0 / .7), 0 2px 6px -2px rgb(0 0 0 / .4);
  color-scheme: dark;
}

html { font-size: 16px; }
html, body {
  margin: 0;
  background: var(--auxline-page);
  color: var(--auxline-fg);
}
body {
  font: 14px/1.6 var(--font-sans);
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.auxline-root { background: var(--auxline-page); }
h1, h2, h3, p { margin: 0; }

@media (min-width: 1024px) and (pointer: fine) {
  html { scrollbar-gutter: stable; }
}

/* 标注：12px，轻微字距；不用等宽、不大写 */
.auxline-label { font-size: 12px; line-height: 1.4; letter-spacing: .02em; }

* { scrollbar-width: thin; scrollbar-color: var(--auxline-line-strong) transparent; }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { border: 2px solid transparent; border-radius: 999px; background: var(--auxline-line-strong); background-clip: padding-box; }
::-webkit-scrollbar-thumb:hover { background-color: var(--auxline-fg-muted); }

::selection { background: var(--auxline-fg); color: var(--auxline-bg); }

input, textarea, select, button { font: inherit; color: inherit; }
input::placeholder, textarea::placeholder { color: var(--auxline-fg-muted); }

@supports (text-autospace: normal) {
  .text-autopsace { text-autospace: ideograph-alpha ideograph-numeric; }
}

/* ───────── 页面骨架 ───────── */

/* 页面标题区：标题 28 / 副标题 14；上 40 下 28 */
.zr-page-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 40px var(--zr-gutter) 28px; }
.zr-page-title { font-size: 28px; font-weight: 600; line-height: 1.2; letter-spacing: -.02em; }
.zr-page-sub { margin-top: 6px; font-size: 14px; color: var(--auxline-fg-muted); }
@media (max-width: 639px) {
  .zr-page-head { padding-top: 28px; padding-bottom: 20px; }
  .zr-page-title { font-size: 24px; }
}

/* 标签栏：贴在标题区下方，当前项一条 2px 下划线 */
.zr-tabs { display: flex; gap: 24px; padding: 0 var(--zr-gutter); border-bottom: 1px solid var(--auxline-line); overflow-x: auto; scrollbar-width: none; }
.zr-tabs::-webkit-scrollbar { display: none; }
.zr-tab {
  position: relative; display: inline-flex; flex: none; align-items: center; height: 44px; font-size: 14px;
  color: var(--auxline-fg-muted); transition: color .15s;
}
.zr-tab:hover { color: var(--auxline-fg); }
.zr-tab[aria-current='page'] { color: var(--auxline-fg); font-weight: 500; }
.zr-tab[aria-current='page']::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; border-radius: 2px; background: var(--auxline-fg); }

/* 版块：上下 32，左右跟页面留白 */
.zr-section { padding: 32px var(--zr-gutter); }
.zr-section + .zr-section { border-top: 1px solid var(--auxline-line); }
.zr-section-title {
  display: flex; align-items: baseline; gap: 8px; margin: 0 0 16px;
  font-size: 16px; font-weight: 600; line-height: 1.3; letter-spacing: -.01em;
}
.zr-section-title small { font-size: 13px; font-weight: 400; color: var(--auxline-fg-muted); }

/* 版块标题行：标题在左，操作在右 */
.zr-block-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 32px var(--zr-gutter) 16px; }
.zr-block-head .zr-section-title { margin: 0; }

/* ───────── 表单 ───────── */

.zr-input {
  height: 36px; padding: 0 12px; border: 1px solid var(--auxline-line-strong); border-radius: 8px;
  background: transparent; color: var(--auxline-fg); font-size: 14px; outline: none; transition: border-color .15s, box-shadow .15s;
}
.zr-input:focus { border-color: var(--auxline-fg-muted); box-shadow: 0 0 0 3px var(--auxline-bg-hover); }

/* 大搜索框：48 高，图标 + 输入 + 按钮包在一个框里 */
.zr-search {
  display: flex; align-items: center; gap: 12px; height: 48px; padding: 0 8px 0 16px; max-width: 720px;
  border: 1px solid var(--auxline-line-strong); border-radius: 10px; cursor: text; transition: border-color .15s, box-shadow .15s;
}
.zr-search:focus-within { border-color: var(--auxline-fg-muted); box-shadow: 0 0 0 3px var(--auxline-bg-hover); }
.zr-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; font-size: 15px; }
.zr-search input::-webkit-search-cancel-button { display: none; }

/* ───────── 列表 / 表格 ───────── */

.zr-row-head, .zr-table-head {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; height: 40px; padding: 0 var(--zr-gutter);
  border-bottom: 1px solid var(--auxline-line); font-size: 12px; letter-spacing: .02em; color: var(--auxline-fg-muted);
  scroll-margin-top: calc(var(--zr-header-h) + 8px);
}
.zr-row {
  display: flex; align-items: center; gap: 14px; min-height: 56px; padding: 8px var(--zr-gutter);
  border-bottom: 1px solid var(--auxline-line); color: var(--auxline-fg);
}
.zr-row-link { transition: background-color .15s; }
.zr-row-link:hover { background: var(--auxline-bg-emphasis); }
.zr-rank { width: 28px; flex: none; text-align: right; font-size: 13px; color: var(--auxline-fg-muted); }
.zr-row-name { font-size: 14px; font-weight: 500; line-height: 1.4; }
.zr-row-meta { font-size: 12px; line-height: 1.4; color: var(--auxline-fg-muted); }
.zr-row-value { font-size: 14px; font-weight: 500; }

.zr-table-head, .zr-table-row { display: grid; gap: 16px; align-items: center; }
.zr-table-row { min-height: 44px; padding: 0 var(--zr-gutter); border-bottom: 1px solid var(--auxline-line); font-size: 14px; }
.zr-table-row:hover { background: var(--auxline-bg-emphasis); }

.zr-pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px calc(var(--zr-gutter) - 10px); }

/* ───────── 小部件 ───────── */

/* 数字格：一行三格，格子之间一条竖线（窄屏改为横线） */
.zr-stat { display: flex; flex-direction: column; gap: 6px; padding: 24px var(--zr-gutter); border-bottom: 1px solid var(--auxline-line); }
.zr-stat:last-child { border-bottom: 0; }
.zr-stat-label { font-size: 13px; color: var(--auxline-fg-muted); }
.zr-stat-value { font-size: 30px; font-weight: 600; line-height: 1.1; letter-spacing: -.02em; }
.zr-stat-meta { font-size: 12px; color: var(--auxline-fg-muted); }
@media (min-width: 640px) {
  .zr-stat { border-bottom: 0; border-right: 1px solid var(--auxline-line); }
  .zr-stat:last-child { border-right: 0; }
}

.zr-avatar {
  display: inline-flex; flex: none; align-items: center; justify-content: center; overflow: hidden; border-radius: 999px;
  background: var(--auxline-bg-emphasis); box-shadow: inset 0 0 0 1px var(--auxline-line); color: var(--auxline-fg-muted); font-size: 12px;
}

.zr-chip {
  display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px 0 4px; border-radius: 999px;
  box-shadow: inset 0 0 0 1px var(--auxline-line-strong); font-size: 13px; color: var(--auxline-fg-2);
  transition: background-color .15s, color .15s;
}
.zr-chip:hover { color: var(--auxline-fg); background: var(--auxline-bg-hover); }

.zr-tag {
  display: inline-flex; flex: none; align-items: center; height: 22px; padding: 0 8px; border-radius: 999px;
  box-shadow: inset 0 0 0 1px var(--auxline-line-strong); font-size: 12px; line-height: 1; color: var(--auxline-fg-muted); white-space: nowrap;
}

.zr-empty { padding: 56px var(--zr-gutter); text-align: center; font-size: 14px; color: var(--auxline-fg-muted); }
</style>
