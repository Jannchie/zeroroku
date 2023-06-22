'use client'
import { Btn, Flex, Panel, T, ThemeToggle } from 'roku-ui'
import { useSettings } from '../Provider'
import { TablerPerspective, TablerPerspectiveOff } from '@roku-ui/icons-tabler'

export default function Settings () {
  const { threeDimensionalTransform, setThreeDimensionalTransform } = useSettings()
  return (
    <Flex
      col
      gap="1rem"
    >
      <T.H1>设置</T.H1>
      <Panel
        padding
        className="border"
      >
        <div>
          <div className="py-2">
            <div className="pb-1">
              主题
            </div>
            <ThemeToggle />
          </div>
          <div className="py-2">
            <div className="pb-1">
              3D 变换
            </div>
            <Btn
              className="w-12"
              color={threeDimensionalTransform ? 'primary' : 'default'}
              onClick={() => {
                setThreeDimensionalTransform(!threeDimensionalTransform)
              }}
            >
              {
                threeDimensionalTransform
                  ? (
                    <TablerPerspective
                      height="1em"
                      className="mr-2"
                    />
                  )
                  : (
                    <TablerPerspectiveOff
                      height="1em"
                      className="mr-2"
                    />
                  )
              }
              { threeDimensionalTransform ? '开启' : '关闭' }
            </Btn>
            <div className="text-[hsl(var(--r-frontground-3))] text-sm">Windows 下，并没有抗锯齿机制，所以会变得模糊，慎用。</div>
          </div>
        </div>
      </Panel>
    </Flex>
  )
}
