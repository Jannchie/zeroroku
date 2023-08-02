'use client'
import { AuthorHistoryData, useBiliAuthorHistoryQuery, useBiliAuthorInfoQuery, useBiliAuthorLiveGiftQuery } from '@/data'
import { getBiliImageSrc } from '../../getBiliImageSrc'
import { Avatar, Btn, DynamicValue, Icon, Panel, T, Tag, ToggleGroup } from 'roku-ui'
import { TablerGift, TablerHeartFilled, TablerSquareRoundedNumber1Filled, TablerSquareRoundedNumber7Filled, TablerUser } from '@roku-ui/icons-tabler'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { RokuBar } from 'roku-charts'
import Link from 'next/link'
export default function Page ({ params: { mid } }: {
  params: {
    mid: string
  }
}) {
  const { data: authorInfo } = useBiliAuthorInfoQuery(mid)
  const [range, setRange] = useState<7 | 30 | 365>(7)

  if (!authorInfo) return null

  return (
    <div className="flex flex-col items-stretch gap-2 md:4">
      <AuthorInfoPanel mid={mid} />
      <Panel
        padding
        className="flex gap-2"
      >
        <Btn
          target="_blank"
          as={Link}
          href={`https://space.bilibili.com/${mid}`}
        >
          去主页
        </Btn>
        {
          authorInfo.live_room && authorInfo.live_room.roomid &&
          <Btn
            target="_blank"
            as={Link}
            href={`https://live.bilibili.com/${authorInfo.live_room.roomid}`}
          >
            去直播间
          </Btn>
        }
        <Btn
          target="_blank"
          as={Link}
          href={`https://space.bilibili.com/${mid}/dynamic`}
        >
          去动态页
        </Btn>
      </Panel>
      <LiveStatisticPanels mid={mid} />
      <FansStatisticPanels mid={mid} />
      <RangeSelector
        range={range}
        setRange={setRange}
      />
      <GiftBarChartPanel
        mid={mid}
        range={range}
      />
      <FansAmountLineChart
        mid={mid}
        range={range}
        field="fans"
      />
      <FansAmountLineChart
        mid={mid}
        range={range}
        field="rate1"
      />
    </div >
  )
}

function RangeSelector ({
  range,
  setRange,
}: {
  range: 7 | 30 | 365
  setRange: (range: 7 | 30 | 365) => void
}) {
  return (
    <ToggleGroup
      value={range}
      setValue={setRange}
      data={[7, 30, 365]}
      body={(value) => '近' + value + '天'}
    />
  )
}

function GiftBarChartPanel ({ mid, range }: { mid: string, range: number }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const { data: giftData } = useBiliAuthorLiveGiftQuery(mid)
  const timeFormater = useMemo(() => d3.timeFormat('%Y-%m-%d'), [])
  const bar = useRef<RokuBar>()
  const [currentData, setCurrentData] = useState(giftData?.[giftData.length - 1])
  useEffect(() => {
    if (!giftData) return
    // get copy giftData
    const giftDataCopy = giftData.slice()
    bar.current = RokuBar
      .new('#gift-chart')
      .setTheme({
        fillColor: 'hsl(var(--r-primary-2))',
        textColor: 'hsl(var(--r-frontground-2))',
        valueFormat: d3.format('~s'),
      })
      .setData(giftDataCopy.reverse())
      .setConfig({
        idKey: (d) => d3.timeParse('%Y-%m-%dT00:00:00Z')(d.date)!,
        valueKey: (d) => d.currency / 1000,
        itemCount: 30,
        onHover: (d) => {
          setCurrentData(d as never)
        },
      }).draw()
  }, [giftData])
  useEffect(() => {
    if (!giftData) return
    bar.current?.setConfig({
      itemCount: range,
    }).draw()
  }, [giftData, range])
  if (!giftData) return null
  const currencyFormater = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    compactDisplay: 'short',
  })
  return (
    <Panel padding>
      <div className="flex justify-between">
        <span className="text-base flex text-[hsl(var(--r-primary-2))]">
          <TablerGift width="1em" />
          <span>
            直播营收
          </span>
        </span>
        <span className="ml-2 text-base text-[hsl(var(--r-frontground-3))]">
          { timeFormater(new Date(currentData?.date ?? 0)) }
        </span>
      </div>
      <div className="text-xl md:text-2xl lg:text-3xl">
        { currencyFormater.format((currentData?.currency ?? 0) / 1000) }
      </div>
      <svg
        ref={svgRef}
        id="gift-chart"
        className="w-full h-48 fill-transparent"
      />
    </Panel>
  )
}

function FansAmountLineChart ({ mid, range, field }: { mid: string, range: number, field: keyof AuthorHistoryData }) {
  const svgRef = useRef<SVGSVGElement>(null)

  const { data: historyData } = useBiliAuthorHistoryQuery(mid)
  const historyDataReversed = historyData?.sort((a, b) => a.date > b.date ? 1 : -1)
  const timeFormater = useMemo(() => d3.timeFormat('%Y-%m-%d'), [])
  const [currentData, setCurrentData] = useState(historyDataReversed?.[historyDataReversed.length - 1])
  useEffect(() => {
    if (!historyData) return
    bar.current?.setConfig({
      itemCount: range,
    }).draw()
  }, [historyData, range])
  const bar = useRef<RokuBar>()
  const title = useMemo(() => {
    switch (field) {
      case 'fans':
        return '粉丝总数'
      default:
        return '粉丝变化'
    }
  }, [field])
  useEffect(() => {
    if (!historyDataReversed) return
    bar.current = RokuBar
      .new(`#fans-amount-chart-${field}`)
      .setTheme({
        fillColor: 'hsl(var(--r-primary-2))',
        textColor: 'hsl(var(--r-frontground-2))',
        valueFormat: d3.format('~s'),
      })
      .setData(historyDataReversed)
      .setConfig({
        idKey: (d) => d3.timeParse('%Y-%m-%d')(d.date)!,
        valueKey: (d) => d[field],
        itemCount: 7,
        onHover: (d) => {
          setCurrentData(d as never)
        },
      }).draw()
    setCurrentData(historyDataReversed[historyDataReversed.length - 1])
  }, [field, historyDataReversed])
  if (!historyDataReversed) return null
  const numberFormater = new Intl.NumberFormat('zh-CN', {
    compactDisplay: 'short',
  })
  return (
    <Panel padding>
      <div className="flex justify-between">
        <span className="text-base flex text-[hsl(var(--r-primary-2))]">
          <TablerUser width="1em" />
          <span>
            { title }
          </span>
        </span>
        <span className="ml-2 text-base text-[hsl(var(--r-frontground-3))]">
          { timeFormater(new Date(currentData?.date ?? 0)) }
        </span>
      </div>
      {
        <div className="text-xl md:text-2xl lg:text-3xl">
          { numberFormater.format(Number(currentData?.[field]) ?? 0) }
        </div>
      }
      <svg
        ref={svgRef}
        id={`fans-amount-chart-${field}`}
        className="w-full h-48 relative"
      />
    </Panel>
  )
}

function LiveStatisticPanels ({ mid }: { mid: string }) {
  const { data: giftData } = useBiliAuthorLiveGiftQuery(mid)
  if (!giftData) return null
  const baseStats = [
    {
      label: '30日礼物',
      icon: <TablerHeartFilled />,
      value: giftData.filter(
        (d) => new Date(d.date).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).reduce((acc, cur) => acc + cur.currency / 1000, 0),
    }, {
      label: '最高礼物',
      icon: <TablerSquareRoundedNumber1Filled />,
      value: Math.max(...giftData.map((d) => d.currency)) / 1000,
    }, {
      label: '七日礼物',
      icon: <TablerSquareRoundedNumber7Filled />,
      value: giftData.filter(
        (d) => new Date(d.date).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).reduce((acc, cur) => acc + cur.currency / 1000, 0),
    },
  ]
  const currencyFormater = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    notation: 'compact',
    compactDisplay: 'short',
  })
  return (
    <StatisticPanels
      stats={baseStats}
      formater={currencyFormater}
    />
  )
}

function FansStatisticPanels ({ mid }: { mid: string }) {
  const { data: authorInfo } = useBiliAuthorInfoQuery(mid)
  const numberFormater = new Intl.NumberFormat('zh-CN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  })

  if (!authorInfo) return null
  const baseStats = [
    {
      label: '粉丝数',
      icon: <TablerHeartFilled />,
      value: authorInfo.stats.fans,
    }, {
      label: '一日粉丝',
      icon: <TablerSquareRoundedNumber1Filled />,
      value: authorInfo.stats.rate1,
    }, {
      label: '七日粉丝',
      icon: <TablerSquareRoundedNumber7Filled />,
      value: authorInfo.stats.rate7,
    },
  ]
  return (
    <>
      <StatisticPanels
        stats={baseStats}
        formater={numberFormater}
      />
      <div className="text-sm text-[hsl(var(--r-frontground-3))]">
        { `更新时间 ${new Date(authorInfo.stats.updated_at).toLocaleString()}` }
      </div>
    </>
  )
}

function StatisticPanels ({ stats, formater }: {
  stats: Array<{
    label: string
    icon: JSX.Element
    value: number
  }>
  formater: Intl.NumberFormat
}) {
  return (
    <div className="flex gap-2 justify-between">
      { stats.map((item) => {
        return (
          <Panel
            key={item.label}
            padding
            className="flex-1"
          >
            <T.P
              color="primary"
              className="flex items-center text-sm text-[hsl(var(--r-primary-2))]"
            >
              <Icon
                color="primary"
              >
                { item.icon }
              </Icon>
              { item.label }
            </T.P>
            <DynamicValue
              className="text-xl md:text-2xl lg:text-3xl"
              value={item.value}
              format={formater.format}
            />
          </Panel>
        )
      }) }
    </div>
  )
}

function AuthorInfoPanel ({ mid }: { mid: string }) {
  const { data: authorInfo } = useBiliAuthorInfoQuery(mid)
  if (!authorInfo) return null
  return (
    <Panel
      padding
      className="flex flex-col shadow-lg"
    >
      <div className="flex gap-2">
        <Avatar
          className="flex-shrink-0"
          size="lg"
          src={getBiliImageSrc(authorInfo.face)}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          alt={authorInfo.name}
        />
        <div>
          <h1 className="text-lg flex items-center gap-2">
            <span>
              { authorInfo.name }
            </span>
            <Tag color="danger">
              Lv.
              { authorInfo.level }
            </Tag>
          </h1>
          <div className="text-sm">
            { authorInfo.official?.title }
          </div>
        </div>
      </div>
      <p className="text-sm mt-2">{ authorInfo.sign }</p>
    </Panel>
  )
}
