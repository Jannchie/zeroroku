'use client'
import { Avatar, Panel, T, Icon } from 'roku-ui'
import { usePathname } from 'next/navigation'
import { useCommentQuery } from '@/data'
import { FriendlyLink } from './FriendlyLink'
import Image from 'next/image'
import { toSvg } from 'jdenticon'
import { TablerNotebook } from '@roku-ui/icons-tabler'
export function RightPanels () {
  const pathname = usePathname()
  const { data: comments, isFetched } = useCommentQuery({
    page: 1,
    pageSize: 10,
    path: pathname,
  })
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
      className="w-full xl:w-96 max-h-screen overflow-auto h-full top-4 xl:fixed flex flex-col gap-4"
      // style={{
      //   transform: 'perspective(600px) rotateY(-3deg)',
      //   transformStyle: 'preserve-3d',
      //   backfaceVisibility: 'hidden',
      // }}
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
          !isFetched && (
            <div className="text-gray-500 text-xs">
              加载中...
            </div>
          )
        }
        {
          (!comments || comments?.length === 0) && isFetched && (
            <div className="text-gray-500 text-xs">
              暂无评论
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
                      { getDurationFormated(new Date(c.created_at).getTime() - new Date().getTime()) }
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
  else result = '刚刚'
  return result + '前'
}
