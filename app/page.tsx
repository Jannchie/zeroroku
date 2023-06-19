'use client'
import { type ReactNode } from 'react'
import { T } from 'roku-ui'

export default function Home ({ children }: { children: ReactNode } & any) {
  return (
    <>
      <T.H1
        className="text-center text-7xl from-cyan-600 to-blue-800 gradient-text font-extrabold text-transparent bg-clip-text bg-gradient-to-r "
      >
        zeroroku.com
      </T.H1>
      { children }
    </>
  )
}
