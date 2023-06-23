'use client'
import { useSelfQuery } from '@/data'
import { type User } from '@/data/model/User'
import md5 from 'js-md5'
import { useState } from 'react'
import { Flex, Panel, T, Tabs, Tag } from 'roku-ui'
import { Libre_Barcode_39 } from 'next/font/google'

const libreBarcode39 = Libre_Barcode_39({
  weight: '400',
  subsets: ['latin'],
})

export default function Page () {
  const [tabIdx, setTabIdx] = useState(0)
  const { data: self } = useSelfQuery()
  // if (!userInfo || userInfo === 'loading') {
  // return null
  // }
  // const createdAt = userInfo.created_at
  return (
    <Flex
      col
      gap="1rem"
    >
      <T.H1>个人</T.H1>
      <Panel
        padding
        border
        className="border"
      >
        <Tabs
          selectedIndex={tabIdx}
          onChange={((index: number) => {
            setTabIdx(index)
          }) as any}
        >
          {
            <Tabs.Item label="研究员" >
              { self && <UserInfoTab userInfo={self} /> }
            </Tabs.Item>
          }
          <Tabs.Item label="积分记录">
            { /* <RecordListTab /> */ }
          </Tabs.Item>
          { /* <Tabs.Item label="修改密码">
            <ChangePassword />
          </Tabs.Item> */ }
        </Tabs>
      </Panel>
    </Flex>
  )
}

function UserInfoTab ({ userInfo }: { userInfo: User }) {
  return (
    <div className="text-center mb-6">
      <div className="text-4xl mb-2">{ userInfo.name }</div>
      <div
        className="text-2xl md:text-3xl"
        style={libreBarcode39.style}
      >
        { md5.base64(userInfo.name).replace(/=/g, '') }
      </div>
      { UserInfoDetail(userInfo) }
    </div>
  )
}
function UserInfoDetail (userInfo: User) {
  // time delta format
  const timeFormater = Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })
  const numberFormater = Intl.NumberFormat('zh-CN')
  const dayDiff = Math.ceil((new Date().getTime() - new Date(userInfo.created_at).getTime()) / 1000 / 60 / 60 / 24)
  return (
    <div className="text-sm flex flex-col gap-1 p-2">
      { !userInfo.active && (
        <p className="flex items-center justify-center flex-wrap">
          你的状态为
          <Tag
            size="sm"
            color="warning"
            className="mx-1 inline-flex"
          >
            未激活
          </Tag>
          因此你无法获得积分。你可以在注册时录入的电子邮箱中找到激活链接。
        </p>
      ) }
      <p className="flex items-center justify-center">
        你是
        <Tag
          color="primary"
          size="sm"
          className="mx-1"
        >
          { `第 ${numberFormater.format(userInfo.id)} 名研究员` }
        </Tag>
      </p>
      <p className="flex items-center justify-center">
        你注册于
        <Tag
          size="sm"
          color="primary"
          className="mx-1"
        >
          { timeFormater.format(new Date(userInfo.created_at)) }
        </Tag>
      </p>
      <p className="flex items-center justify-center">
        这是你存在于此的
        <Tag
          color="primary"
          size="sm"
          className="mx-1"
        >
          { `第 ${dayDiff} 天` }
        </Tag>
      </p>
      <p className="flex items-center justify-center">
        你目前存下了
        <Tag
          color="primary"
          size="sm"
          className="mx-1"
        >
          { `${numberFormater.format(userInfo.credit)} pt.` }
        </Tag>
      </p>
      <p className="flex items-center justify-center">

        你目前积累的经验值有
        <Tag
          color="primary"
          size="sm"
          className="mx-1"
        >

          { `${numberFormater.format(userInfo.exp)} exp.` }

        </Tag>
      </p>
    </div>
  )
}
