'use client'
import { useEffect, type ReactNode, useState } from 'react'
import { ZerorokuGirl } from './ZerorokuGirl';
export default function Home ({ children }: { children: ReactNode } & any) {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const int = setInterval(() => {
      if ((window as any).Live2DCubismCore) {
        setLoaded(true)
        clearInterval(int)
      }
    }, 100)
  }, [])


  return (
    <>
      { loaded && <ZerorokuGirl /> }
      { children }
    </>
  )
}
