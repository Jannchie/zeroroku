'use client'
import { useSelfQuery } from '@/data'
import { TablerLogin } from '@roku-ui/icons-tabler'
import Link from 'next/link'
import { Btn } from 'roku-ui'

export function LoginBtn () {
  const { data: self, isLoading } = useSelfQuery()
  if (self ?? isLoading) return
  return (
    <div className="text-center p-2">
      <Btn
        as={Link}
        href={'/login'}
        leadingIcon={<TablerLogin />}
      >
        登录
      </Btn>
    </div>
  )
}
