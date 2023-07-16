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
            <div className="text-frontground-3 text-sm">如果你使用的是比较先进的浏览器，能够应用炫酷的特效。</div>
          </div>
          <div className="py-2">
            <div className="pb-1">
              3D 变换
            </div>
            <Btn
              color={threeDimensionalTransform ? 'primary' : 'default'}
              onClick={() => {
                setThreeDimensionalTransform(!threeDimensionalTransform)
              }}
            >
              <div className="flex items-center">
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
              </div>
            </Btn>
            <div className="text-frontground-3 text-sm">手机端无效。Windows 下，并没有抗锯齿机制，所以会变得模糊，慎用。</div>
          </div>
        </div>
      </Panel>
    </Flex>
  )
}
