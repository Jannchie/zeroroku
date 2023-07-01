'use client'
import { TablerHeart } from '@roku-ui/icons-tabler'
import { Anchor, Icon, Panel, T } from 'roku-ui'

export function FriendlyLink () {
  const othorBilibiliLink = [
    {
      name: 'Danmakus',
      href: 'https://danmakus.com/',
    }, {
      name: 'ericlamm',
      href: 'https://ddstats.ericlamm.xyz/records',
    }, {
      name: 'VTBS',
      href: 'https://vtbs.moe/',
    }, {
      name: 'Vtuber Guild',
      href: 'https://v-guild.top/',
    }, {
      name: '明前奶绿 ✽ LAPLACE',
      href: 'https://laplace.live/',
    }, {
      name: 'biligank',
      href: 'https://biligank.com/',
    }, {
      name: 'NAILV.LIVE',
      href: 'https://stats.nailv.live/',
    },
  ]
  return (
    <>
      <T.H2 className="flex gap-1 items-center">
        <Icon size={30}>
          <TablerHeart />
        </Icon>
        其他数据站
      </T.H2>
      <Panel
        padding
        border
        className="border"
      >
        <T.P
          color="primary"
          className="text-sm mb-2"
        >
          你可能对这些网站感兴趣：
        </T.P>
        <div className="flex gap-2 flex-wrap">
          { othorBilibiliLink.map(({ name, href }) => (
            <Anchor
              key={name}
              href={href}
              target="_blank"
            >
              { name }
            </Anchor>
          )) }
        </div>
      </Panel>
    </>
  )
}
