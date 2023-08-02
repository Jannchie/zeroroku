'use client'
import { Avatar, Panel, T, Icon } from 'roku-ui'
import { useSponsorQuery } from '@/data'
import { TablerPigMoney } from '@roku-ui/icons-tabler'
import { useSettings } from './Provider'
import Link from 'next/link'
import { useMediaQuery } from './useMediaQuery'
import { MyScrollArea } from './MyScrollArea'

export function LeftPanels () {
  const isXL = useMediaQuery('(min-width: 1280px)')
  const { threeDimensionalTransform } = useSettings()
  const { data: sponsors } = useSponsorQuery()
  const moneyFormater = Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  })
  const currentMonthSponsors = sponsors?.filter((sponsor) => {
    const createDate = new Date(sponsor.create_date)
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    // Extract the year and month from the sponsor's create_date
    const sponsorYear = createDate.getFullYear()
    const sponsorMonth = createDate.getMonth() + 1

    // Check if the sponsor's create_date is in the current month and year
    return sponsorYear === currentYear && sponsorMonth === currentMonth
  })

  const cost = 576.99 / 0.94
  const previousMonthData = sponsors?.filter((entry) => {
    // Extract the month and year from the entry's date
    const entryDate = new Date(entry.create_date)
    const entryYear = entryDate.getFullYear()
    const entryMonth = entryDate.getMonth() + 1
    const previousYear = new Date().getFullYear()
    const previousMonth = new Date().getMonth()
    // Check if the entry's month and year match the previous month and year
    return entryYear === previousYear && entryMonth === previousMonth
  })

  const currentMonthSponsorsTotal = currentMonthSponsors?.reduce((acc, sponsor) => {
    return acc + Number(sponsor.order_price) / 100
  }, 0)

  const previousMonthSponsorsTotal = previousMonthData?.reduce((acc, sponsor) => {
    return acc + Number(sponsor.order_price) / 100
  }, 0)
  return (
    <div
      className="antialiased w-full xl:w-96 xl:max-h-screen overflow-hidden h-full top-4 xl:fixed xl:translate-x-[-384px] flex flex-col gap-4 transition-transform"
      style={threeDimensionalTransform && isXL
        ? {
          fontSmooth: 'subpixel',
          WebkitFontSmoothing: 'subpixel-antialiased',
          transform: 'perspective(600px) translateZ(0) translateX(-384px) rotateY(3deg)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          willChange: 'transform',
        }
        : {}}
    >
      <MyScrollArea>
        <div className="flex flex-col gap-4">
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
          { typeof previousMonthSponsorsTotal === 'number' &&  <div>
            <div className="text-sm flex justify-between">
              <div>
                { '上月收支：' }
                { moneyFormater.format(previousMonthSponsorsTotal - cost) }
              </div>
              <div>
                { `${Math.round(previousMonthSponsorsTotal / cost * 100)}%` }
              </div>
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-background-1">
              <div
                className="h-full bg-[hsl(var(--r-primary-2))]"
                style={{
                  width: `${previousMonthSponsorsTotal / cost * 100}%`,
                }}
              />
            </div>
          </div>
          }
          { typeof currentMonthSponsorsTotal === 'number' && <div>
            <div className="text-sm flex justify-between">
              <div>
                { '本月收支：' }
                { moneyFormater.format(currentMonthSponsorsTotal - cost) }
              </div>
              <div>
                { `${Math.round(currentMonthSponsorsTotal / cost * 100)}%` }
              </div>
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-background-1">
              <div
                className="h-full bg-[hsl(var(--r-primary-2))]"
                style={{
                  width: `${currentMonthSponsorsTotal / cost * 100}%`,
                }}
              />
            </div>
          </div>
          }
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
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
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
          { sponsors && <div className="pb-56 text-xs text-frontground-3 pt-2">
            真的没有了！
          </div> }
        </div>
      </MyScrollArea>
    </div>
  )
}
