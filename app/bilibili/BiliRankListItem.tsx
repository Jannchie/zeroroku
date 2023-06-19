'use client'
import { type AuthorInfo } from '@/data/model/AuthorInfo'
import Link from 'next/link'
import { Avatar } from 'roku-ui'
import { getBiliImageSrc } from './getBiliImageSrc'
import { TablerTrendingDown, TablerTrendingUp } from '@roku-ui/icons-tabler'
import classNames from 'classnames'

export function BiliRankListItem ({ data, field }: { data: AuthorInfo, field: 'rate1' | 'rate7' | 'fans' }) {
  const numberFormater = new Intl.NumberFormat('zh-CN', {
    notation: 'compact',
    compactDisplay: 'long',
  })
  const numberFullFormater = new Intl.NumberFormat('zh-CN', {

  })
  return (
    <Link
      className="flex gap-2 items-center p-1 cursor-pointer rounded rounded-l-2xl hover:bg-[hsl(var(--r-frontground-2),0.1)]"
      href={`/bilibili/author/${data.mid}`}
    >
      <Avatar
        square
        className="ml-1"
        src={getBiliImageSrc(data.face, 38, 38)}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        size={38}
      />
      <div className="flex-grow flex">
        <div className="flex-grow">
          <div className="flex gap-1 text-sm">
            <span>
              { data.name }
            </span>
            <span className="font-mono text-gray-500 px-2 hidden">
              { `UID: ${data.mid}` }
            </span>
          </div>
          <div className="font-base font-mono flex">
            { `粉丝数: ${numberFormater.format(data.stats.fans)}` }
          </div>
        </div>
        <div className={classNames('flex text-lg items-center px-2 gap-1', {
          'text-[hsl(var(--r-danger-2))]': data.stats[field] > 0 && field !== 'fans',
          'text-[hsl(var(--r-success-2))]': data.stats[field] < 0 && field !== 'fans',
        })}
        >
          { field !== 'fans' && (data.stats[field] < 0 ? <TablerTrendingDown height="1em" /> : <TablerTrendingUp height="1em" />) }
          { field === 'fans' ? numberFullFormater.format(Math.abs(data.stats[field])) : numberFormater.format(Math.abs(data.stats[field])) }
        </div>
      </div>
    </Link>
  )
}
