'use client'

import { usePostActiveQuery } from '@/data'
import { SvgSpinners90RingWithBg } from '@roku-ui/icons-svg-spinners'
import { TablerCircleCheckFilled, TablerCircleXFilled } from '@roku-ui/icons-tabler'
import { useSearchParams } from 'next/navigation'
import { Flex, Panel, T } from 'roku-ui'
export default function Page () {
  const params = useSearchParams()
  const { data, isLoading } = usePostActiveQuery(params.get('code') ?? undefined)
  return (
    <Flex
      col
      gap="1rem"
      align="center"
    >
      <T.H1 >邮箱激活</T.H1>
      <Panel
        padding
        className="flex flex-col align-center"
      >
        { isLoading && (
          <>
            <SvgSpinners90RingWithBg
              width="3em"
              className="m-auto mb-2"
            />
            <div>
              <div className="text-2xl">激活中</div>
            </div>
          </>
        ) }
        { !isLoading && data && (
          <>
            <TablerCircleCheckFilled
              width="3em"
              className="m-auto mb-2"
            />
            <div className="text-2xl">激活成功</div>
          </>
        ) }
        {
          !isLoading && !data && (
            <>
              <TablerCircleXFilled
                width="3em"
                className="m-auto mb-2"
              />
              <div className="text-2xl">激活失败</div>
            </>
          )
        }
      </Panel>
    </Flex>
  )
}
