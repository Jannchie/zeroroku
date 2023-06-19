
export interface TagInfo {
  tag_id: number
  tag_name: string
  cover: string
  head_cover: string
  content: string
  short_content: string
  type: number
  state: number
  ctime: number
  count: {
    view: number
    use: number
    atten: number
  }

  likes: number
  hates: number
  attribute: number
  extra_attr: number
  updated_at: Date
}
