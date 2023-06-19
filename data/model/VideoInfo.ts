
export interface VideoInfo {
  updated_at: Date
  created_at: Date
  aid: number
  videos: number
  tid: number
  tname: string
  copyright: number
  pic: string
  title: string
  attribute: number
  pubdate: number
  ctime: number
  desc: string
  state: number
  duration: number
  stat: {
    aid: number
    coin: number
    like: number
    view: number
    reply: number
    share: number
    danmaku: number
    dislike: number
    favorite: number
    his_rank: number
    now_rank: number
  }

  dynamic: string
  cid: number
  dimension: {
    width: number
    height: number
    rotate: number
  }

  short_link: string
  short_link_v2: string
  bvid: string
  score: number
  tag_list: number[]
}
