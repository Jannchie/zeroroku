import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type User } from './model/User'
import { useRouter } from 'next/navigation'
import { type Comment } from './model/Comment'
import { type AuthorInfo } from './model/AuthorInfo'
import { type VideoInfo } from './model/VideoInfo'

// const baseURL = 'https://api.zeroroku.com'
const baseURL = 'http://localhost:8080'

export type UserRank = User[]

export interface AuthorHistoryData {
  id: number
  mid: number
  fans: number
  created_at: string
}
interface LoginRequest {
  account: string
  password: string
  hcaptcha: string
}

export interface SimpleAuthorData {
  mid: number
  name: string
  face: string
}
interface AuthorFamousFans {
  mid: number
  name: string
  face: string
  fans: number
}

export interface AuthorLiveGiftHistory {
  date: string
  count: number
  currency: number
}

export function useBiliAuthorSearchQuery (inputText: string, n: number = 10) {
  return useQuery<SimpleAuthorData[]>({
    queryKey: ['bili', 'author', 'search', inputText],
    queryFn: async () => {
      const resp = await apiFetch(`/bilibili/author/search?txt=${inputText}&n=${n}`)
      return await resp.json()
    },
    enabled: inputText.length > 0,
  })
}

export function useBiliAuthorHistoryQuery (mid: string) {
  return useQuery<AuthorHistoryData[]>({
    queryKey: ['bili', 'author', 'history', mid],
    queryFn: async () => {
      const resp = await apiFetch(`/bilibili/author/fans?mid=${mid}`)
      return await resp.json()
    },
  })
}

export function useBiliAuthorLiveGiftQuery (mid: string) {
  return useQuery<AuthorLiveGiftHistory[]>({
    queryKey: ['bili', 'author', 'live', mid],
    queryFn: async () => {
      const resp = await apiFetch(`/bilibili/author/live?mid=${mid}`)
      if (resp.status !== 200) {
        return null
      }
      return await resp.json()
    },
  })
}

export function useBiliAuthorLatestVideoQuery (mid: string) {
  return useQuery<VideoInfo[]>({
    queryKey: ['bili', 'author', 'latest-video', mid],
    queryFn: async () => {
      const resp = await apiFetch(`/bilibili/author/latest-video?mid=${mid}`)
      return await resp.json()
    },
  })
}

export function useBiliAuthorFamousFansQuery (mid: string) {
  return useQuery<AuthorFamousFans[]>({
    queryKey: ['bili', 'author', 'famous-fans', mid],
    queryFn: async () => {
      const resp = await apiFetch(`/bilibili/author/famous-fans?mid=${mid}`)
      return await resp.json()
    },
  })
}

export function useBiliAuthorInfoQuery (mid: string) {
  return useQuery<AuthorInfo>({
    queryKey: ['bili', 'author', mid],
    queryFn: async () => {
      const resp = await apiFetch(`/bilibili/author?mid=${mid}`)
      return await resp.json()
    },
  })
}

export function useCommentQuery ({ path, page, pageSize }: {
  path: string
  page: number
  pageSize: number
}) {
  return useQuery<Comment[]>({
    queryKey: ['comment', path, page, pageSize],
    queryFn: async () => {
      const resp = await apiFetch(`/comment?path=${path}&p=${page}&s=${pageSize}`)
      return await resp.json()
    },
  })
}

export function useBiliFansRankQuery ({ field = 'fans', order = 'desc', size = 20 }: {
  field?: 'fans' | 'rate1' | 'rate7'
  order?: 'asc' | 'desc'
  size?: number
}) {
  return useQuery<AuthorInfo[]>({
    queryKey: ['bili', 'rank', 'fans', field, order, size],
    queryFn: async () => {
      const url = `/bilibili/rank?f=${field}&o=${order === 'asc' ? 1 : 0}&s=${size}`
      const resp = await apiFetch(url)
      return await resp.json()
    },
  })
}

export function useBiliPopQuery () {
  return useQuery<SimpleAuthorData[]>({
    queryKey: ['bili', 'pop'],
    queryFn: async () => {
      const resp = await apiFetch('/bilibili/author/pop')
      return await resp.json()
    },
  })
}

export function useLoginMutation () {
  const router = useRouter()
  const client = useQueryClient()
  return useMutation<User, unknown, LoginRequest>(
    async (data: LoginRequest) => {
      const path = '/login'
      const resp = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return await resp.json()
    }, {
      onSuccess: (data) => {
        client.setQueryData(['self'], data)
        router.push('/')
      },
    },
  )
}

export function useSelfQuery () {
  return useQuery<User>({
    queryKey: ['self'],
    queryFn: async () => {
      const path = '/user/?self=1'
      const resp = await apiFetch(path, {
        method: 'GET',
      })
      if (resp.status !== 200) {
        return null
      }
      return await resp.json()
    },
    staleTime: Infinity,
  })
}

export function useUserRankQuery () {
  return useQuery<UserRank>({
    queryKey: ['userRank'],
    queryFn: async () => {
      const path = '/user/rank'
      const resp = await apiFetch(path, {
        method: 'GET',
      })
      return await resp.json()
    },
    staleTime: Infinity,
  })
}

async function apiFetch (path: string, option: RequestInit = {}) {
  option.credentials = 'include'
  option.headers = {
    ...option.headers,
    'Content-Type': 'application/json',
  }
  return await fetch(`${baseURL}${path}`, option)
}
