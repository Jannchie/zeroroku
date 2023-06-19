'use client'
import { useBiliFansRankQuery } from '@/data'
import { useSearchParams } from 'next/navigation'
import { Panel, T } from 'roku-ui'
import { BiliRankListItem } from '../BiliRankListItem'
import { type AuthorInfo } from '@/data/model/AuthorInfo'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { SvgSpinners90RingWithBg } from '@roku-ui/icons-svg-spinners'
import classNames from 'classnames'

function isField (field: string | null): field is 'rate1' | 'rate7' | 'fans' {
  return ['rate1', 'rate7', 'fans'].includes(field as 'rate1' | 'rate7' | 'fans')
}

function isOrder (order: string | null): order is 'asc' | 'desc' {
  return ['asc', 'desc'].includes(order as 'asc' | 'desc')
}

function RankPanel (props: { rankData?: AuthorInfo[], title: string }) {
  const [currentTime, setCurrentTime] = useState('')
  useEffect(() => {
    setCurrentTime(new Date().toLocaleString('zh-CN', {}))
  }, [])
  const params = useSearchParams()
  const originField = params.get('field')
  const field = isField(originField) ? originField : 'rate1'
  return (
    <Panel
      padding
      border
    >
      <div className="text-center">
        <T.H2 >
          { props.title }
        </T.H2>
        <div className="text-base text-[hsl(var(--r-frontground-3))]">
          { currentTime }
        </div>
      </div>
      { props.rankData
        ? props.rankData.map(item => {
          return (
            <BiliRankListItem
              key={item.mid}
              data={item}
              field={field}
            />
          )
        })
        : (
          <div className="text-center">
            <T.H2
              color="primary"
              className="flex justify-center my-10"
            >
              <SvgSpinners90RingWithBg
                height="1em"
                className="animate-spin"
              />
            </T.H2>
          </div>
        ) }
    </Panel>
  )
}

function AutoRankPanel () {
  const { field, order } = useRankPageSearchParams()
  const { data: rankData } = useBiliFansRankQuery({
    field, order, size: 20,
  })
  function getRankTitle () {
    switch (field) {
      case 'rate1':
        return order === 'desc' ? '日增粉丝' : '日减粉丝'
      case 'rate7':
        return order === 'desc' ? '周增粉丝' : '周减粉丝'
      case 'fans':
        return '粉丝数'
    }
    return '粉丝数'
  }
  return (
    <RankPanel
      title={getRankTitle()}
      rankData={rankData}
    />
  )
}

function useRankPageSearchParams () {
  const params = useSearchParams()
  const originField = params.get('field')
  const originOrder = params.get('order')
  const field: 'rate1' | 'rate7' | 'fans' = isField(originField) ? originField : 'rate1'
  const order: 'asc' | 'desc' = isOrder(originOrder) ? originOrder : 'desc'
  return { field, order }
}

function RankNav () {
  const links = [
    {
      name: '日增粉丝',
      field: 'rate1',
      order: 'desc',
    },
    {
      name: '周增粉丝',
      field: 'rate7',
      order: 'desc',
    },
    {
      name: '粉丝数',
      field: 'fans',
      order: 'desc',
    },
    {
      name: '日减粉丝',
      field: 'rate1',
      order: 'asc',
    },
    {
      name: '周减粉丝',
      field: 'rate7',
      order: 'asc',
    },
  ]
  const { field, order } = useRankPageSearchParams()
  return (
    <Panel
      padding
      border
      className="flex justify-between"
    >
      { links.map(link => {
        return (
          <Link
            key={link.name}
            className={classNames(
              {
                'text-[hsl(var(--r-primary-2))]': link.field === field && link.order === order,
              },
              'text-center flex-grow cursor-pointer hover:text-[hsl(var(--r-primary-2))]',
            )}
            href={`/bilibili/rank?field=${link.field}&order=${link.order}`}
          >
            { link.name }
          </Link>
        )
      }) }
    </Panel>
  )
}

export default function Page () {
  return (
    <div className="flex flex-col gap-4">
      <T.H1>Bilibili UP 主排行榜</T.H1>
      <RankNav />
      <AutoRankPanel />
    </div>
  )
}
