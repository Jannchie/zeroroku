import './globals.css'
import { Inter, My_Soul } from 'next/font/google'
import { cookies } from 'next/headers'
import { Provider } from './Provider'
import { Nav } from './Nav'
import { RightPanels } from './RightPanels'
import { LeftPanels } from './LeftPanels'
import { LoginBtn } from './LoginBtn'
import Script from 'next/script'

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
        <Script
          src="/live2dcubismcore.min.js"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-BKT69PTJLE"
          strategy="afterInteractive"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
        >
          { `
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-BKT69PTJLE');
        ` }
        </Script>
      </head>
      <body className={inter.className}>
        <Provider>
          <div className="flex flex-col xl:flex-row h-full relative gap-4">
            <div className="relative order-3 xl:order-1 p-1">
              <LeftPanels />
            </div>
            <div className="flex-grow order-1 xl:order-2 p-1">
              <div className={`${fonts.className} text-center text-4xl`}>
                ZeroRoku
              </div>
              <Nav />
              <LoginBtn />
              { children }
            </div>
            <div className="relative order-2 xl:order-3 p-1">
              <RightPanels />
            </div>
          </div>
        </Provider>
      </body>
    </html>
  )
}
