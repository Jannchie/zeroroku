import { type User } from './User'

export interface Comment {
  id: number
  path: string
  parent_id: number
  uid: number
  content: string
  created_at: Date
  like: number
  dislike: number
  user: User
  liked: boolean
}
