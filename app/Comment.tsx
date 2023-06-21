'use client'
import { Avatar, Panel, T, Icon, Textarea, Btn } from 'roku-ui'
import { usePathname } from 'next/navigation'
import { useCommentQuery, useSendCommentMutation, useSponsorQuery } from '@/data'
import { FriendlyLink } from './FriendlyLink'
import Image from 'next/image'
import { toSvg } from 'jdenticon'
import { TablerNotebook, TablerSend } from '@roku-ui/icons-tabler'
import { useCallback, useEffect, useState } from 'react'
import { useSettings } from './Provider'
import Link from 'next/link'

function CommentTextarea () {
  const [inputValue, setInputValue] = useState('')
  const sendCommentMutation = useSendCommentMutation()
  const pathname = usePathname()
  const onSendCallback = useCallback(() => {
    sendCommentMutation.mutate({
      content: inputValue,
      path: pathname,
    })
    setInputValue('')
  }, [inputValue, pathname, sendCommentMutation])
  return (
    <div className="flex gap-1">
      <Textarea
        className="flex-grow"
        placeholder="写下你的观测记录..."
        maxHeight={16 + 20 * 3}
        value={inputValue}
        setValue={setInputValue}
        onKeyDown={(e) => {
          // ctl + enter
          if (e.ctrlKey && e.key === 'Enter') {
            onSendCallback()
          }
        }}
      />
      <Btn
        icon
        onClick={onSendCallback}
      >
        <TablerSend />
      </Btn>
    </div>
  )
}

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    const listener = () => {
      setMatches(media.matches)
    }
    media.addEventListener('change', listener)
    return () => { media.removeEventListener('change', listener) }
  }, [matches, query])
  return matches
}

export function LeftPanels () {
  const isXL = useMediaQuery('(min-width: 1280px)')
  const { threeDimensionalTransform } = useSettings()
  const { data: sponsors } = useSponsorQuery()
  const moneyFormater = Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  })
  return (
    <div
      className="w-full xl:w-96 xl:max-h-screen overflow-hidden h-full top-4 xl:fixed xl:translate-x-[-384px] flex flex-col gap-4"
      style={threeDimensionalTransform && isXL
        ? {
          transition: '',
          transform: 'perspective(600px) translateX(-384px) rotateY(1deg)',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        }
        : {}}
    >
      <T.H2 className="flex gap-1 items-center">
        <Icon size={30}>
          <TablerNotebook />
        </Icon>
        赞助者
      </T.H2>
      <div className="text-[hsl(var(--r-frontground-3))] text-sm">
        他们无私地给予了支持，没有要求任何回报。
        <Link
          passHref
          className="text-[hsl(var(--r-frontground-3))] underline"
          href="https://azz.ee/jannchie"
        >
          加入他们
        </Link>
        。
      </div>
      {
        sponsors?.map((sponsor) => {
          return (
            <div
              key={sponsor.order_id}
              className="flex items-center gap-2 opacity-50"
            >
              <Avatar
                src={sponsor.user_avatar}
                size={24}
                className="flex-shrink-0"
              />
              <div className="flex flex-col flex-grow">
                <div className="flex items-center gap-1">
                  <T.H4 className="!font-normal">{ sponsor.user_name }</T.H4>
                </div>
                <div className="text-[hsl(var(--r-frontground-3))] text-xs">
                  { sponsor.create_date }
                </div>
              </div>
              <T.P className="text-[hsl(var(--r-frontground-3))]">
                { moneyFormater.format(sponsor.order_price / 100) }
              </T.P>
            </div>
          )
        })
      }
    </div>
  )
}

export function RightPanels () {
  const pathname = usePathname()
  const { data: comments, isFetched } = useCommentQuery({
    page: 1,
    pageSize: 10,
    path: pathname,
  })
  const [now, setNow] = useState(new Date().getTime())
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date().getTime())
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [])
  const isXL = useMediaQuery('(min-width: 1280px)')
  const { threeDimensionalTransform } = useSettings()
  if (pathname === '/login' || pathname === '/settings') return null
  const isBilibili = pathname.startsWith('/bilibili')
  const avatarConfig = {
    padding: 0.1,
    hues: [200],
    lightness: {
      color: [0.2, 0.9],
      grayscale: [0.3, 0.9],
    },
  }
  return (
    <div
      className="w-full xl:w-96 xl:max-h-screen overflow-auto h-full top-4 xl:fixed flex flex-col gap-4"
      style={threeDimensionalTransform && isXL
        ? {
          transform: 'perspective(600px) rotateY(-3deg)',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        }
        : {}}
    >
      <T.H2 className="flex gap-1 items-center">
        <Icon size={30}>
          <TablerNotebook />
        </Icon>
        观测记录
      </T.H2>
      <Panel
        border
        padding
        className="border"
      >
        {
          <CommentTextarea />
        }
        {
          !isFetched && (
            <div className="text-gray-500 text-xs">
              加载中...
            </div>
          )
        }
        {
          (!comments || comments?.length === 0) && isFetched && (
            <div className="text-gray-500 text-xs">
              暂无观测记录
            </div>
          )
        }
        {
          comments?.filter(c => !c.parent_id).map((c) => {
            const svgStr = toSvg(c.user.mail, 24, avatarConfig)
            return (
              <Panel
                key={c.id}
                border={false}
                className="p-1 flex gap-2"
              >
                <div>
                  <Avatar
                    square
                    size={24}
                  >
                    <Image
                      alt={c.user.mail}
                      src={`data:image/svg+xml;base64,${btoa(svgStr)}`}
                      width={24}
                      height={24}
                    />
                  </Avatar>
                </div>
                <div
                  className="flex-grow"
                >
                  <div className="text-sm mb-1 flex justify-between">
                    <div>
                      <span>
                        { c.user.name }
                      </span>
                      <span className="text-gray-500 px-2">
                        (#
                        { c.user.id }
                        )
                      </span>
                    </div>
                    <span className="text-gray-500 px-2">
                      { getDurationFormated(new Date(c.created_at).getTime() - now) }
                    </span>
                  </div>
                  <div className="text-base">
                    { c.content }
                  </div>
                  { comments.filter((subc) => subc.parent_id === c.id).map((subc) => {
                    return (
                      <div
                        key={subc.id}
                        className="text-xs flex gap-2 py-2"
                      >
                        <div className="flex gap-2">
                          <Image
                            alt={subc.user.mail}
                            width={16}
                            height={16}
                            src={`data:image/svg+xml;base64,${btoa(toSvg(subc.user.mail, 16, avatarConfig))}`}
                          />
                          <div>
                            { subc.user.name }
                          </div>
                        </div>
                        <div>
                          { subc.content }
                        </div>
                      </div>
                    )
                  }) }
                </div>
              </Panel>
            )
          })
        }
      </Panel>
      { isBilibili && <FriendlyLink /> }
    </div>
  )
}
function getDurationFormated (milliseconds = 0) {
  milliseconds = Math.abs(milliseconds)
  let seconds = Math.floor(milliseconds / 1000)
  let minutes = Math.floor(seconds / 60)
  seconds %= 60
  let hours = Math.floor(minutes / 60)
  minutes %= 60
  const days = Math.floor(hours / 24)
  hours %= 24
  let result = ''
  if (days) result += `${days}天`
  else if (hours) result += `${hours}小时`
  else if (minutes) result += `${minutes}分`
  else if (seconds) result += `${seconds}秒`
  else return '刚刚'
  return result + '前'
}
