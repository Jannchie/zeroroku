'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { RokuProvider, useTrueTheme, defaults } from 'roku-ui'
defaults.border = true

const ThemeSettings = () => {
  const trueTheme = useTrueTheme()
  useEffect(() => {
    document.cookie = `roku.theme=${trueTheme}; path=/`
  }, [trueTheme])
  return <></>
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
