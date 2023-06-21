'use client'
import { TablerMessageCircleCheck, TablerMessageCircleX } from '@roku-ui/icons-tabler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useContext, useEffect } from 'react'
import { RokuProvider, useTrueTheme, defaults, Notice, Icon, push } from 'roku-ui'
import { useLocalStorage } from './useLocalStorage'

defaults.border = true

const ThemeSettings = () => {
  const trueTheme = useTrueTheme()
  useEffect(() => {
    document.cookie = `roku.theme=${trueTheme}; path=/`
  }, [trueTheme])
  return <></>
}

const SettingsContext = createContext({
  threeDimensionalTransform: false,
  setThreeDimensionalTransform: (_value: boolean) => {},
})

export const useSettings = () => {
  const { threeDimensionalTransform, setThreeDimensionalTransform } = useContext(SettingsContext)
  return {
    threeDimensionalTransform,
    setThreeDimensionalTransform,
  }
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
  const [threeDimensionalTransform = false, setThreeDimensionalTransform] = useLocalStorage<boolean>({
    key: 'zeroroku.threeDimensionalTransform',
    defaultValue: false,
  })
  useEffect(() => {
  }, [threeDimensionalTransform])
  return (
    <SettingsContext.Provider
      value={{
        threeDimensionalTransform,
        setThreeDimensionalTransform,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <RokuProvider>
          <ThemeSettings />
          <div className="pt-8 max-w-[600px] m-auto">
            { children }
          </div>
        </RokuProvider>
      </QueryClientProvider>
    </SettingsContext.Provider>
  )
}
