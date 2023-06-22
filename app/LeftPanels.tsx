'use client'
import { Avatar, Panel, T, Icon } from 'roku-ui'
import { useSponsorQuery } from '@/data'
import { TablerPigMoney } from '@roku-ui/icons-tabler'
import { useSettings } from './Provider'
import Link from 'next/link'
import { useMediaQuery } from './useMediaQuery'

export function LeftPanels () {
  const isXL = useMediaQuery('(min-width: 1280px)')
  const { threeDimensionalTransform } = useSettings()
  const { data: sponsors } = useSponsorQuery()
  const moneyFormater = Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  })
  return (
    <div
      className="w-full xl:w-96 xl:max-h-screen overflow-hidden h-full top-4 xl:fixed xl:translate-x-[-384px] flex flex-col gap-4 transition-transform"
      style={threeDimensionalTransform && isXL
        ? {
          fontSmooth: 'subpixel',
          WebkitFontSmoothing: 'subpixel-antialiased',
          transform: 'perspective(600px) translateZ(0) translateX(-384px) rotateY(3deg)',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          willChange: 'transform',
          WebkitTransformStyle: 'preserve-3d',
        }
        : {}}
    >
      <T.H2 className="flex gap-1 items-center">
        <Icon size={30}>
          <TablerPigMoney />
        </Icon>
        赞助者
      </T.H2>
      <div className="text-[hsl(var(--r-frontground-3))] text-sm">
        他们无私地给予了支持，没有要求任何回报。
        <Link
          passHref
          className="text-[hsl(var(--r-frontground-3))] underline"
          href="https://azz.ee/jannchie"
        >
          加入他们
        </Link>
        。
      </div>
      <Panel
        padding
      >
        { sponsors?.map((sponsor) => {
          return (
            <div
              key={sponsor.order_id}
              className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-[opacity,scale]"
            >
              <Avatar
                src={sponsor.user_avatar}
                size={24}
                className="flex-shrink-0"
              />
              <div className="flex flex-col flex-grow">
                <div className="flex items-center gap-1">
                  <T.H4 className="!font-normal">{ sponsor.user_name }</T.H4>
                </div>
                <div className="text-[hsl(var(--r-frontground-3))] text-xs">
                  { sponsor.create_date }
                </div>
              </div>
              <T.P className="text-[hsl(var(--r-frontground-3))]">
                { moneyFormater.format(sponsor.order_price / 100) }
              </T.P>
            </div>
          )
        }) }
      </Panel>
    </div>
  )
}
