<script setup lang="ts">
useSeoMeta({
  title: '公开信',
})
</script>

<template>
  <section class="flex flex-col items-center">
    <AuxlinePageHeader
      title="公开信"
      subtitle="06数据观测站"
    />
    <div class="w-full max-w-3xl border-[var(--auxline-line)] sm:border-x">
      <div class="flex items-center justify-between border-b border-[var(--auxline-line)]">
        <p class="px-2 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
          致观测者
        </p>
        <AuxlineBtn to="/" size="sm">
          返回主页面
        </AuxlineBtn>
      </div>
      <article class="flex flex-col gap-4 px-4 py-6 text-sm leading-7">
        <p>
          你好，这里是Jannchie见齐，B站ID:1850091。zeroroku是一个数据观测站。
        </p>
        <p>
          它的前身是www.biliob.com——一个用来观测B站粉丝数变化的网站。
        </p>
        <p>
          OB这个词是观测者的简称，它的灵感来源其实是星际争霸的一个单位的昵称。小写的ob很像是06，
          而zeroroku是06的日语罗马字，这就是这个站名的由来。
        </p>
        <p>
          很惭愧，当初的代码水平并不是很好，无论是biliob还是zeroroku，它们都是充满漏洞难以维护的代码库。
          它非常难以使用，感谢大家一直坚持到现在。啊，我说这话不是将要关停这个网站，而是如你所见，在编写下第一行代码的8年后，
          我打算用我目前掌握的最擅长的技术，重写整个网站。我不知道，也许现在的我能做得更好一些。至少有AI的加持，现在的我做得快了很多。
        </p>
        <p>
          回顾当初，有很多设定其实并不酷，比如看全部数据需要登录，数据也不能下载。在这个新的版本，我觉得可以做得更加open一些。
          不过目前一些功能还有缺失——其实从biliob到zeroroku已经缺失了很多，而现在缺得更多了。目前没有注册和评论，我会加上。
          由于我现在是个身不由己得社会人，进展可能很慢。
        </p>
      </article>
    </div>
  </section>
</template>
