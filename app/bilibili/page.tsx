'use client'
import { useBiliAuthorSearchQuery, useBiliFansRankQuery, useBiliPopQuery, useNewAuthorGazerMutation } from '@/data'
import { type AuthorInfo } from '@/data/model/AuthorInfo'
import Link from 'next/link'
import { useState } from 'react'
import { Avatar, Btn, Flex, Icon, Panel, T, TextField } from 'roku-ui'
import { getBiliImageSrc } from './getBiliImageSrc'
import { TablerSearch, TablerUserPlus } from '@roku-ui/icons-tabler'
import { useDebounce } from 'usehooks-ts'
import { SvgSpinners90RingWithBg } from '@roku-ui/icons-svg-spinners'
import { BiliRankListItem } from './BiliRankListItem'
export default function Page () {
  const [searchText, setSearchText] = useState('')
  const debounceSearchText = useDebounce(searchText, 500)
  const { data: searchResult, isFetching: isSearching } = useBiliAuthorSearchQuery(debounceSearchText)
  const { data: biliPop } = useBiliPopQuery()
  return (
    <Flex
      col
      gap="1rem"
    >
      <T.H1 className="text-center">哔哩哔哩数据观测</T.H1>
      <Panel
        padding
        border
      >
        <TextField
          suffixAbsolute
          className="w-full"
          value={searchText}
          setValue={setSearchText}
          suffix={(
            <Icon
              color="primary"
              className="inline-flex"
            >
              {
                isSearching
                  ? (
                    <SvgSpinners90RingWithBg />
                  )
                  : (
                    <TablerSearch />
                  )
              }
            </Icon>
          )}
          placeholder="输入你想观测的up主的名称"
        />
      </Panel>
      {
        searchResult && <Panel
          padding
          border
        >
          {
            searchResult?.map((d) => {
              return (
                <Link
                  key={d.mid}
                  href={`/bilibili/author/${d.mid}`}
                >
                  <Flex
                    className="px-2 rounded rounded-l-2xl hover:bg-[hsl(var(--r-frontground-2),0.1)]"
                    align="center"
                    gap="1rem"
                  >
                    <Avatar
                      src={getBiliImageSrc(d.face, 48, 48)}
                      alt={d.name}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                    />
                    <div>
                      <div className="text-base">
                        { d.name }
                      </div>
                      <div className="text-sm text-gray-500">
                        { `UID: ${d.mid}` }
                      </div>
                    </div>
                  </Flex>
                </Link>
              )
            })
          }
        </Panel>
      }
      <AddAuthorPanel />
      <Panel
        padding
        border
        className="flex gap-2"
      >
        <Btn
          as={Link}
          href="/bilibili/rank"
        >
          粉丝数相关排行榜
        </Btn>
        <Btn
          as={Link}
          href="/bilibili/live/rank"
        >
          直播相关排行榜
        </Btn>
      </Panel>
      <Panel
        padding
        border
      >
        <div className="mt-2">
          <div className="text-sm">
            大家都在看
          </div>
          <Flex
            gap="1rem"
            className="flex-wrap text-sm py-2"
          >
            {
              biliPop?.map((d) => (
                <Btn
                  key={d.mid}
                  text
                  as={Link}
                  href={`/bilibili/author/${d.mid}`}
                  size="xs"
                  className="hover:text-cyan-500"
                >
                  <Flex
                    gap="0.5rem"
                    align="center"
                  >
                    <Avatar
                      size="xs"
                      alt={d.name}
                      src={getBiliImageSrc(d.face, 24, 24)}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                    />
                    <span>
                      { d.name }
                    </span>
                  </Flex>
                </Btn>
              ))
            }
          </Flex>
        </div>
      </Panel>
      <BiliRankPanelList />
    </Flex>
  )
}
function BiliRankPanelList () {
  const { data: rateDesc } = useBiliFansRankQuery({
    field: 'rate1',
    order: 'desc',
    size: 5,
  })
  const { data: rateAsc } = useBiliFansRankQuery({
    field: 'rate1',
    order: 'asc',
    size: 5,
  })
  return (
    <div className="flex flex-col gap-4">
      <FansRankPanel
        name="涨粉榜"
        data={rateDesc}
        moreLink={'/bilibili/rank?field=rate1&order=desc'}
      />
      <FansRankPanel
        name="掉粉榜"
        data={rateAsc}
        moreLink={'/bilibili/rank?field=rate1&order=asc'}
      />
    </div>
  )
}

function FansRankPanel ({ name, data, moreLink }: { name: string, data?: AuthorInfo[], moreLink: string }) {
  return (
    <Panel
      padding
      border
      className="flex-1"
    >
      <T.H2>{ name }</T.H2>
      <div className="flex flex-col mt-4">
        { data?.map((d, index) => {
          return (
            <BiliRankListItem
              key={index}
              data={d}
              field="rate1"
            />
          )
        }) }
        <Btn
          className="mt-2"
          as={Link}
          href={moreLink}
        >
          查看完整列表
        </Btn>
      </div>
    </Panel>
  )
}

function AddAuthorPanel () {
  const [mid, setMid] = useState('')
  const newAuthorGazerMutation = useNewAuthorGazerMutation()
  return (
    <Panel
      padding
      border
      className="flex gap-2"
    >
      <TextField
        prefix={<span className="pl-4">UID</span>}
        className="h-[34px] flex-grow"
        value={mid}
        setValue={setMid}
      />
      <Btn onClick={() => { newAuthorGazerMutation.mutate(mid) }}>
        <TablerUserPlus
          height="1em"
          className="mr-2"
        />
        添加新的 UP 主追踪 [20 CP]
      </Btn>
    </Panel>
  )
}
