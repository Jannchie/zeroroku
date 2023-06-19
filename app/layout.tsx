import './globals.css'
import { Inter, My_Soul } from 'next/font/google'
import { cookies } from 'next/headers'
import { Provider } from './Provider'
import { Nav } from './Nav'
import { RightPanels } from './Comment'
import { LoginBtn } from './LoginBtn'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Zeroroku - 数据观测站',
  description: '见齐制作',
}
const fonts = My_Soul({
  subsets: ['latin'],
  weight: '400',
  preload: true,
})

export default function RootLayout ({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const lastTheme = cookieStore.get('roku.theme')?.value ?? 'dark'
  return (
    <html
      lang="zh-CN"
      data-theme={lastTheme}
    >
      <head>
        <meta charSet="utf-8" />
        <meta
          name="description"
          content={metadata.description}
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <title>{ metadata.title }</title>
        <link
          rel="icon"
          href="/favicon.ico"
        />
      </head>
      <body className={inter.className}>
        <Provider>
          <div className="flex flex-col xl:flex-row h-full relative gap-4">
            <div className="flex-grow">
              <LoginBtn />
              <div className={`${fonts.className} text-center text-4xl`}>
                ZeroRoku
              </div>
              <Nav />
              { children }
            </div>
            <div className="relative">
              <RightPanels />
            </div>
          </div>
        </Provider>
      </body>
    </html>
  )
}
