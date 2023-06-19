
export interface AuthorInfo {
  mid: number
  name: string
  sex: string
  face: string
  sign: string
  rank: number
  level: number
  jointime: number
  moral: number
  silence: number
  birthday: string
  coins: number
  fans_badge: boolean
  official: {
    desc: string
    role: number
    type: number
    title: string
  }

  vip: {
    role: number
    type: number
    label: {
      path: string
      text: string
      bg_color: string
      bg_style: number
      text_color: string
      label_theme: string
      border_color: string
    }

    status: number
    due_date: any
    theme_type: number
    vip_pay_type: number
    nickname_color: string
    avatar_subscript: number
    avatar_subscript_url: string
  }

  pendant: {
    pid: number
    name: string
    image: string
    expire: number
    image_enhance: string
    image_enhance_frame: string
  }

  nameplate: {
    nid: number
    name: string
    image: string
    level: string
    condition: string
    image_small: string
  }

  user_honour_info: {
    mid: number
    tags: any[]
    colour?: any
  }

  is_followed: boolean
  top_photo: string
  theme: any
  sys_notice: any
  live_room: {
    url: string
    cover: string
    title: string
    roomid: number
    liveStatus: number
    roomStatus: number
    roundStatus: number
    watched_show: {
      num: number
      icon: string
      switch: boolean
      icon_web: string
      text_large: string
      text_small: string
      icon_location: string
    }

    broadcast_type: number
  }

  updated_at: Date
  created_at: Date
  stats: {
    mid: number
    fans: number
    updated_at: Date
    rate7: number
    rate1: number
  }

  history_fans_stats?: any
}
