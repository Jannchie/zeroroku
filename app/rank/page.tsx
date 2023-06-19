'use client'
import { useUserRankQuery } from '@/data'
import { Avatar, Flex, Panel, T } from 'roku-ui'

export default function Page () {
  const { data } = useUserRankQuery()
  const numberFormatter = new Intl.NumberFormat('zh-CN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  })
  return (
    <Flex
      col
      gap="1rem"
    >
      <T.H1>排行</T.H1>
      <Panel
        border
        padding
        className="border"
      >
        <Flex
          col
          gap=".5rem"
        >
          {
            data?.map((item, index) => {
              return (
                <Flex
                  key={index}
                  justify="space-between"
                >
                  <Flex
                    align="center"
                    gap=".25rem"
                  >
                    <Avatar>
                      #
                      { index + 1 }
                    </Avatar>
                    <div>
                      <div className="text-base">
                        { item.name }
                      </div>
                      <div className="text-sm text-gray-500">
                        { `No. ${item.id}` }
                      </div>
                    </div>
                  </Flex>
                  <div className="font-mono">
                    { numberFormatter.format(item.exp) }
                  </div>
                </Flex>
              )
            })
          }
        </Flex>
      </Panel>
    </Flex>
  )
}
