'use client'
import { Flex, Panel, T, ThemeToggle } from 'roku-ui'

export default function Settings () {
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
          <div>
            主题
          </div>
          <ThemeToggle />
        </div>
      </Panel>
    </Flex>
  )
}
