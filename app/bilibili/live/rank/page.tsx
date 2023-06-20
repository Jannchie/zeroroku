'use client'
import { useBiliLiveRankQuery } from '@/data'
import { useState } from 'react'
import { Avatar, Btn, Flex, Panel, T } from 'roku-ui'
import { getBiliImageSrc } from '../../getBiliImageSrc'
import Link from 'next/link'
// {
//     "mid": 694300780,
//     "room_id": 22556461,
//     "currency": 114024800,
//     "count": 5245,
//     "face": "https://i1.hdslb.com/bfs/face/d18247882384c9d195f0a8ddc465f567c117b8d7.jpg",
//     "name": "奶一口小金",
//     "live_status": 2,
//     "guard_num": 38
// }

function formatMinutes (minutes: number) {
  if (minutes < 60) {
    return `${minutes}分钟`
  } else if (minutes < 24 * 60) {
    return `${Math.floor(minutes / 60)}小时`
  } else if (minutes < 30 * 24 * 60) {
    return `${Math.floor(minutes / (24 * 60))}天`
  }
  return `${Math.floor(minutes / (30 * 24 * 60))}月`
}
export default function Page () {
  const [minutes, setMinutes] = useState(60)
  const { data: liveRankData } = useBiliLiveRankQuery(minutes)
  const moneyFormater = Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', notation: 'compact', minimumFractionDigits: 2 })
  const navItems = [60, 24 * 60, 24 * 60 * 3, 24 * 60 * 7]

  return (
    <Flex
      col
      gap="1rem"
    >
      <T.H1 className="text-center">哔哩哔哩直播榜</T.H1>
      <Panel
        padding
        border
        className="flex gap-2"
      >
        { navItems.map(d => {
          return (
            <Btn
              key={d}
              color={minutes === d ? 'primary' : 'default'}
              className="flex-grow"
              onClick={() => { setMinutes(d) }}
            >
              { formatMinutes(d) }
            </Btn>
          )
        }) }
      </Panel>
      <Panel
        padding
        border
        className="text-center flex-col flex gap-1"
      >
        <T.H2>{ `${formatMinutes(minutes)}排行榜` }</T.H2>
        <div className="flex flex-col">
          {
            !liveRankData
              ? null
              : liveRankData.map((d) => {
                return (
                  <Link
                    key={d.mid}
                    className="p-2 flex gap-2 items-center hover:bg-[hsl(var(--r-frontground-2),0.1)]  rounded-r-3xl rounded-l-full"
                    href={`/bilibili/author/${d.mid}`}
                  >
                    <Avatar
                      src={getBiliImageSrc(d.face)}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      size={42}
                      alt={d.name}
                    />
                    <div className="text-left flex-grow">
                      <div className="text-base">
                        { d.name }
                      </div>
                      <div className="text-sm text-[hsl(var(--r-frontground-3))]">
                        { `UID: ${d.mid}` }
                      </div>
                    </div>
                    <div>
                      { moneyFormater.format(d.currency / 1000) }
                    </div>
                  </Link>
                )
              })
          }
        </div>
      </Panel>
    </Flex>
  )
}
