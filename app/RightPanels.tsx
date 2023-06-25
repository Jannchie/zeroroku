'use client'
import { Avatar, Panel, T, Icon, Btn, Tag, Flex } from 'roku-ui'
import { usePathname } from 'next/navigation'
import { type SimpleAuthorData, useBiliAuthorSimpeInfoQuery, useCommentAttituteMutation, useCommentQuery, useDeleteCommentMutation, useSelfQuery } from '@/data'
import { FriendlyLink } from './FriendlyLink'
import Image from 'next/image'
import { type JdenticonConfig, toSvg } from 'jdenticon'
import { TablerHeart, TablerHeartFilled, TablerNotebook, TablerShare3, TablerTrash } from '@roku-ui/icons-tabler'
import { useEffect, useMemo, useState } from 'react'
import { useSettings } from './Provider'
import { CommentTextarea } from './CommentTextarea'
import { useMediaQuery } from './useMediaQuery'
import { getDurationFormated } from './getDurationFormated'
import { getBiliImageSrc } from './bilibili/getBiliImageSrc'
import Link from 'next/link'

function AuthorSimpleTag ({ data }: { data: SimpleAuthorData | number }) {
  if (typeof data === 'number') {
    return (
      <Tag color="primary">
        UID:
        { data }
      </Tag>
    )
  }
  return (
    <Btn
      text
      color="primary"
      as={Link}
      href={`/author/${data.mid}`}
    >
      <Avatar
        size={16}
        src={getBiliImageSrc(data.face)}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
      />
      <span className="ml-1">
        { data.name }
      </span>
    </Btn>
  )
}

function SubComment (props: {
  subc: {
    user: {
      name: string
      mail: string
    }
    content: string
  }
  avatarConfig: JdenticonConfig
}) {
  return (
    <div className="text-xs flex gap-2 py-2">
      <div className="flex gap-2">
        <Image
          alt={props.subc.user.mail}
          width={16}
          height={16}
          src={`data:image/svg+xml;base64,${btoa(toSvg(props.subc.user.mail, 16, props.avatarConfig))}`}
        />
        <div>
          { props.subc.user.name }
        </div>
      </div>
      <div>
        { props.subc.content }
      </div>
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
  const { data: self } = useSelfQuery()
  const deleteCommentMutation = useDeleteCommentMutation()
  const attituteMutation = useCommentAttituteMutation()
  const isBilibili = pathname.startsWith('/bilibili')
  const avatarConfig = {
    padding: 0.1,
    hues: [200],
    lightness: {
      color: [0.2, 0.9],
      grayscale: [0.3, 0.9],
    },
  }
  function parseContent (text: string): Array<string | number> {
    const regex = /(uid[:：])\s*(\d+)/gi
    const result: Array<string | number> = []
    let lastEnd = 0
    let match

    while ((match = regex.exec(text)) !== null) {
      // Add the text before uid:
      if (lastEnd !== match.index) {
        result.push(text.slice(lastEnd, match.index).trim())
      }

      // Add the uid number
      result.push(Number(match[2]))

      // Update the end of the last match
      lastEnd = regex.lastIndex
    }

    // Add remaining text after the last match
    if (lastEnd < text.length) {
      result.push(text.slice(lastEnd).trim())
    }

    return result
  }

  const mids = useMemo(() => {
    if (!comments) return []
    return comments.map(c => {
      return parseContent(c.content)
    }).map(c => {
      return c.filter(i => typeof i === 'number')
    }).flat() as number[]
  }, [comments])

  const { data: authorSimpleData } = useBiliAuthorSimpeInfoQuery(mids)
  const authorSimpleDataMap = useMemo(() => {
    if (!authorSimpleData) return new Map()
    return new Map(authorSimpleData.map(i => [i.mid, i]))
  }, [authorSimpleData])
  if (pathname === '/login' || pathname === '/settings') return null
  return (
    <div
      className="w-full xl:w-96 xl:max-h-screen overflow-auto h-full top-4 xl:fixed flex flex-col gap-4 transition-transform"
      style={threeDimensionalTransform && isXL
        ? {
          transform: 'perspective(600px) rotateY(-3deg)',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'subpixel-antialiased',
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
        { <CommentTextarea /> }
        { !isFetched && (
          <div className="text-gray-500 text-xs">
            加载中...
          </div>
        ) }
        { (!comments || comments?.length === 0) && isFetched && (
          <div className="text-gray-500 text-xs">
            成为第一个写下观测记录的人吧！
          </div>
        ) }
        { comments?.filter(c => !c.parent_id).map((c) => {
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
                  { (
                    <Flex
                      align="center"
                      className="flex-wrap"
                    >
                      { parseContent(c.content).map(d => {
                        return typeof d === 'string'
                          ? <span key={d}>{ d }</span>
                          : (
                            <AuthorSimpleTag data={authorSimpleDataMap.get(d) ?? d} />
                          )
                      }) }
                    </Flex>
                  )
                  }
                </div>

                <div className="flex justify-between">
                  <div>
                    <Btn.Counter
                      color="danger"
                      icon={c.liked ? <TablerHeartFilled /> : <TablerHeart />}
                      value={c.like}
                      onClick={() => {
                        attituteMutation.mutate({
                          id: c.id,
                          attitude: c.liked ? 0 : 1,
                        })
                      }}
                    />
                    <Btn.Counter
                      color="success"
                      icon={<TablerShare3 />}
                      value={comments.filter((subc) => subc.parent_id === c.id).length}
                    />
                  </div>
                  {
                    c.uid === self?.id && (
                      <Btn
                        icon
                        text
                        className="!w-6 !h-6 !p-1 !m-2 hover:text-[hsl(var(--r-danger-2))]"
                        size="xs"
                      >
                        <TablerTrash
                          width="1.3em"
                          onClick={() => {
                            deleteCommentMutation.mutate(c.id)
                          }}
                        />
                      </Btn>
                    )
                  }
                </div>

                { comments.filter((subc) => subc.parent_id === c.id).map((subc) => {
                  return (
                    <SubComment
                      key={subc.id}
                      avatarConfig={avatarConfig}
                      subc={subc}
                    />
                  )
                }) }
              </div>
            </Panel>
          )
        }) }
      </Panel>
      { isBilibili && <FriendlyLink /> }
      <div className="text-xs text-[hsl(var(--r-frontground-3))]">
        <p>
          联系邮箱：admin@zeroroku.com
        </p>
        <p>
          法务邮箱/律师函投递/咨询：legal@zeroroku.com
        </p>
        <p>
          永久免费，数据来自于互联网上公开可访问的信息。
        </p>
        <p>
          但愿这个网站能够帮助到你。
        </p>
        <p>
          { `@${new Date().getFullYear()} Zeroroku` }
        </p>
      </div>
    </div>
  )
}
