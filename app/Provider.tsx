'use client'
import { TablerMessageCircleCheck, TablerMessageCircleX } from '@roku-ui/icons-tabler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { RokuProvider, useTrueTheme, defaults, Notice, Icon, push } from 'roku-ui'

defaults.border = true

const ThemeSettings = () => {
  const trueTheme = useTrueTheme()
  useEffect(() => {
    document.cookie = `roku.theme=${trueTheme}; path=/`
  }, [trueTheme])
  return <></>
}

export function pushSuccessNotice (content: string = '操作成功') {
  push(
    (
      <Notice
        outlined
        progress
        shadow
        blur
        desc={content}
        className="min-w-[360px]"
        icon={<Icon
          variant="dual"
          color="success"
        >
          <TablerMessageCircleCheck />
        </Icon>}
        color="success"
        title="成功"
      />
    )
    , {
      name: 'default',
    })
}

export function pushErrorNotice (content: string = '操作成功') {
  push(
    (
      <Notice
        outlined
        progress
        shadow
        blur
        desc={content}
        className="min-w-[360px]"
        icon={<Icon
          variant="dual"
          color="danger"
        >
          <TablerMessageCircleX />
        </Icon>}
        color="danger"
        title="失败"
      />
    )
    , {
      name: 'default',
    })
}

export function Provider ({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <RokuProvider>
        <ThemeSettings />
        <div className="pt-8 max-w-[600px] m-auto">
          { children }
        </div>
      </RokuProvider>
    </QueryClientProvider>
  )
}
