'use client'
import { useBiliAuthorHistoryQuery, useBiliAuthorInfoQuery, useBiliAuthorLiveGiftQuery } from '@/data'
import { getBiliImageSrc } from '../../getBiliImageSrc'
import { Avatar, DynamicValue, Icon, Panel, T, Tag } from 'roku-ui'
import { TablerGift, TablerHeartFilled, TablerSquareRoundedNumber1Filled, TablerSquareRoundedNumber7Filled, TablerUser } from '@roku-ui/icons-tabler'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
export default function Page ({ params: { mid } }: {
  params: {
    mid: string
  }
}) {
  const { data: authorInfo } = useBiliAuthorInfoQuery(mid)

  if (!authorInfo) return null

  return (
    <div className="flex flex-col items-stretch gap-2 md:4">
      <AuthorInfoPanel mid={mid} />
      <FansStatisticPanels mid={mid} />
      <LiveStatisticPanels mid={mid} />
      <GiftBarChartPanel mid={mid} />
      <FansAmountLineChart mid={mid} />
    </div>
  )
}

function GiftBarChartPanel ({ mid }: { mid: string }) {
  const svgRef = useRef<SVGSVGElement>(null)

  const { data: giftData } = useBiliAuthorLiveGiftQuery(mid)
  const [start] = useState(0)

  const margin = 18
  const marginX = 0
  const timeFormater = useMemo(() => d3.timeFormat('%Y-%m-%d'), [])
  const end = start + 7
  const offset = 0
  const [currentData, setCurrentData] = useState(giftData?.[giftData.length - 1])
  useEffect(() => {
    const svg = svgRef.current
    if (!giftData || !svg) return
    const width = svg.clientWidth ?? 400
    const height = svg.clientHeight ?? 300
    const x = d3.scaleBand().domain(giftData.slice(start, end).map((d) => d.date).reverse()).range([marginX, width - marginX * 2]).paddingOuter(0).paddingInner(0.2)
    const y = d3.scaleLinear().domain([0, Math.max(...giftData.slice(start, end).map((d) => d.currency))]).range([margin + offset, height - margin * 2])

    d3
      .select(svg)
      .selectAll('rect')
      .data(giftData.slice(start, end))
      .join(
        enter => enter.append('rect')
          .attr('rx', '4px')
          .attr('fill', 'hsl(var(--r-primary-2))')
          .attr('x', (d) => x(d.date) ?? 0)
          .attr('y', (d) => height - y(d.currency) - margin + offset)
          .attr('width', x.bandwidth())
          .attr('height', (d) => y(d.currency) - offset).attr('class', 'cursor-pointer'),
      )

    // append the x Axis
    // if not exist, append axis
    if (d3.select(svg).selectAll('g.x-axis').empty()) {
      d3.select(svg)
        .append('g')
        .attr('class', 'x-axis')
        .append('g')
        .attr('transform', `translate(0,${height - margin})`)
        .call(d3.axisBottom(x).tickFormat(d => timeFormater(new Date(d))))
    }

    // append the y Axis
    // d3.select(svgRef.current).append('g').attr('transform', `translate(${margin},0)`).call(d3.axisLeft(y))

    // add axis hover event
    d3.select(svg).on('mousemove', function (event) {
      event.preventDefault()
      const [px] = d3.pointer(event)
      const index = Math.floor((px - margin) / (x.step()))
      if (index < 0 || index >= giftData.slice(start, end).length) return
      const filtedData = giftData.slice(start, end)
      const data = filtedData[filtedData.length - index - 1]
      setCurrentData(data)
    })
    setCurrentData(giftData[start])
    return () => {
      d3.select(svg).on('mousemove', null)
    }
  }, [end, giftData, start, timeFormater])
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
        className="w-full h-48"
      />
    </Panel>
  )
}

function FansAmountLineChart ({ mid }: { mid: string }) {
  const svgRef = useRef<SVGSVGElement>(null)

  const { data: historyData } = useBiliAuthorHistoryQuery(mid)
  const [start] = useState(0)

  const margin = 18
  const timeFormater = useMemo(() => d3.timeFormat('%Y-%m-%d'), [])
  const end = start + 7
  const offset = 0
  const [currentData, setCurrentData] = useState(historyData?.[historyData.length - 1])
  const currentSlice = useMemo(() => historyData?.reverse().slice(start, end) ?? [], [end, historyData, start])
  useEffect(() => {
    const svg = svgRef.current
    if (!historyData || !svg) return
    const width = svg.clientWidth ?? 400
    const height = svg.clientHeight ?? 300
    const x = d3.scaleBand().domain(currentSlice.map((d) => d.created_at).reverse()).range([margin, width - margin * 2]).paddingOuter(0).paddingInner(0.2)
    const y = d3.scaleLinear()
      .domain([Math.min(...currentSlice.map((d) => d.fans)), Math.max(...currentSlice.map((d) => d.fans))])
      .range([margin + offset, height - margin * 2])

    d3
      .select(svg)
      .selectAll('rect')
      .data(currentSlice)
      .join(
        enter => enter.append('rect')
          .attr('rx', 4)
          .attr('fill', 'hsl(var(--r-primary-2))')
          .attr('x', (d) => x(d.created_at) ?? 0)
          .attr('y', (d) => height - y(d.fans) - margin + offset)
          .attr('width', x.bandwidth())
          .attr('height', (d) => y(d.fans) - offset).attr('class', 'cursor-pointer'),
      )

    // append the x Axis
    // if not exist, append axis
    if (d3.select(svg).selectAll('g.x-axis').empty()) {
      d3.select(svg)
        .append('g')
        .attr('class', 'x-axis')
        .append('g')
        .attr('transform', `translate(0,${height - margin})`)
        .call(d3.axisBottom(x).tickFormat(d => timeFormater(new Date(d))))
    }

    // append the y Axis
    // d3.select(svgRef.current).append('g').attr('transform', `translate(${margin},0)`).call(d3.axisLeft(y))

    // add axis hover event
    d3.select(svg).on('mousemove', function (event) {
      event.preventDefault()
      const [px] = d3.pointer(event)
      const index = Math.floor((px - margin) / (x.step()))
      if (index < 0 || index >= currentSlice.length) return
      const data = currentSlice[currentSlice.length - index - 1]
      setCurrentData(data)
    })
    setCurrentData(currentSlice[0])
    return () => {
      d3.select(svg).on('mousemove', null)
    }
  }, [end, historyData, start, timeFormater, currentSlice])
  if (!historyData) return null
  const numberFormater = new Intl.NumberFormat('zh-CN', {
    compactDisplay: 'short',
  })
  return (
    <Panel padding>
      <div className="flex justify-between">
        <span className="text-base flex text-[hsl(var(--r-primary-2))]">
          <TablerUser width="1em"/>
          <span>
            粉丝总数
          </span>
        </span>
        <span className="ml-2 text-base text-[hsl(var(--r-frontground-3))]">
          { timeFormater(new Date(currentData?.created_at ?? 0)) }
        </span>
      </div>
      <div className="text-xl md:text-2xl lg:text-3xl">
        { numberFormater.format(currentData?.fans ?? 0) }
      </div>
      <svg
        ref={svgRef}
        className="w-full h-48"
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
      value: giftData.slice(0, 30).reduce((acc, cur) => acc + cur.currency / 1000, 0),
    }, {
      label: '最高礼物',
      icon: <TablerSquareRoundedNumber1Filled />,
      value: Math.max(...giftData.map((d) => d.currency)) / 1000,
    }, {
      label: '七日礼物',
      icon: <TablerSquareRoundedNumber7Filled />,
      value: giftData.slice(0, 7).reduce((acc, cur) => acc + cur.currency / 1000, 0),
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
    <StatisticPanels
      stats={baseStats}
      formater={numberFormater}
    />
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
