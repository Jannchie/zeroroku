import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type User } from './model/User'
import { usePathname, useRouter } from 'next/navigation'
import { type Comment } from './model/Comment'
import { type AuthorInfo } from './model/AuthorInfo'
import { type VideoInfo } from './model/VideoInfo'
import { pushErrorNotice, pushSuccessNotice } from '@/app/Provider'

const baseURL = process.env.NODE_ENV === 'production' ? 'https://api.zeroroku.com' : 'http://localhost:8080'

export type UserRank = User[]

export interface AuthorHistoryData {
  id: number
  mid: number
  fans: number
  created_at: string
  date: string
}
interface LoginRequest {
  account: string
  password: string
  hcaptcha: string
}

interface SignInRequest {
  username: string
  mail: string
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

export interface LiverInfo {
  mid: number
  room_id: number
  currency: number
  count: number
  face: string
  name: string
  live_status: number
  guard_num: number
}

export interface PostCommentBody {
  content: string
  parent_id?: number
  path: string
}

export interface SponsorData {
  order_id: string
  user_id: string
  user_name: string
  user_avatar: string
  order_price: number
  order_fee: number
  create_date: string
}

export function useBiliAuthorSimpeInfoQuery (mids: number[]) {
  return useQuery<SimpleAuthorData[]>({
    queryKey: ['bili', 'author', 'simple-info', mids],
    queryFn: async () => {
      const resp = await apiFetch(`/bilibili/author/simple-info?mids=${mids.join(',')}`)
      if (resp.status !== 200) {
        pushErrorNotice('获取信息失败')
        throw new Error('获取信息失败')
      }
      return await resp.json()
    },
    enabled: mids.length > 0,
  })
}

export function useSponsorQuery () {
  return useQuery<SponsorData[]>({
    queryKey: ['sponsor'],
    queryFn: async () => {
      const resp = await apiFetch('/sponsor')
      if (resp.status !== 200) {
        pushErrorNotice('获取信息失败')
        throw new Error('获取信息失败')
      }
      return await resp.json()
    },
  })
}

export function useSendCommentMutation () {
  const queryClient = useQueryClient()
  return useMutation(async (body: PostCommentBody) => {
    const resp = await apiFetch('/comment', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    if (resp.status !== 200) {
      pushErrorNotice('添加观测记录失败')
      throw new Error('添加观测记录失败')
    }
    void queryClient.invalidateQueries(['comment', body.path])
    pushSuccessNotice('添加观测记录成功')
  })
}

export function useCommentAttituteMutation () {
  const queryClient = useQueryClient()
  const pathname = usePathname()
  return useMutation(async ({ id, attitude }: { id: number, attitude: number }) => {
    const resp = await apiFetch('/comment/attitude', {
      method: 'POST',
      body: JSON.stringify({ attitude, id }),
    })
    if (resp.status !== 200) {
      pushErrorNotice('操作失败')
      throw new Error('操作失败')
    }
    void queryClient.invalidateQueries(['comment', pathname])
    pushSuccessNotice('操作成功')
  })
}

export function useDeleteCommentMutation () {
  const queryClient = useQueryClient()
  const pathname = usePathname()
  return useMutation(async (id: number) => {
    const resp = await apiFetch(`/comment/${id}`, {
      method: 'DELETE',
    })
    if (resp.status !== 200) {
      pushErrorNotice('删除观测记录失败')
      throw new Error('删除观测记录失败')
    }
    void queryClient.invalidateQueries(['comment', pathname])
    pushSuccessNotice('删除观测记录成功')
  })
}

export function useBiliLiveRankQuery (minutes: number = 60) {
  return useQuery<LiverInfo[]>({
    queryKey: ['bili', 'live', 'rank', minutes],
    queryFn: async () => {
      const resp = await apiFetch(`/bilibili/live/rank?m=${minutes}`)
      if (resp.status !== 200) {
        pushErrorNotice('获取信息失败')
        throw new Error('获取信息失败')
      }
      return await resp.json()
    },
  })
}

export function useBiliAuthorSearchQuery (inputText: string, n: number = 10) {
  return useQuery<SimpleAuthorData[]>({
    queryKey: ['bili', 'author', 'search', inputText],
    queryFn: async () => {
      const resp = await apiFetch(`/bilibili/author/search?txt=${inputText}&n=${n}`)
      if (resp.status !== 200) {
        pushErrorNotice('获取信息失败')
        throw new Error('获取信息失败')
      }
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
        throw new Error('获取信息失败')
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
      if (resp.status !== 200) {
        pushErrorNotice('获取信息失败')
        throw new Error('获取信息失败')
      }
      return await resp.json()
    },
  })
}

export function useBiliAuthorFamousFansQuery (mid: string) {
  return useQuery<AuthorFamousFans[]>({
    queryKey: ['bili', 'author', 'famous-fans', mid],
    queryFn: async () => {
      const resp = await apiFetch(`/bilibili/author/famous-fans?mid=${mid}`)
      if (resp.status !== 200) {
        pushErrorNotice('获取信息失败')
        return
      }
      return await resp.json()
    },
  })
}

export function useBiliAuthorInfoQuery (mid: string) {
  return useQuery<AuthorInfo>({
    queryKey: ['bili', 'author', mid],
    queryFn: async () => {
      const resp = await apiFetch(`/bilibili/author?mid=${mid}`)
      if (resp.status !== 200) {
        pushErrorNotice('获取信息失败')
        return
      }
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

export function useSignInMutation () {
  const router = useRouter()
  const client = useQueryClient()
  return useMutation<User, unknown, SignInRequest>(
    async (data: SignInRequest) => {
      const path = '/signin'
      const resp = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      if (resp.status !== 200) {
        throw new Error('注册失败')
      }
      return await resp.json()
    }, {
      onError: (err) => {
        if (err instanceof Error) {
          pushErrorNotice(err.message)
        }
      },
      onSuccess: (data) => {
        client.setQueryData(['self'], data)
        router.push('/')
      },
    },
  )
}

interface MessageResponse {
  msg: string
}

export function useNewAuthorGazerMutation () {
  const client = useQueryClient()
  return useMutation<MessageResponse, unknown, string>(
    async (mid: string) => {
      const path = '/gazer/bilibili/author?mid=' + mid
      const resp = await apiFetch(path, {
        method: 'POST',
      })
      if (resp.status !== 200) {
        pushErrorNotice('添加失败')
        throw new Error('添加失败')
      }
      return await resp.json()
    }, {
      onSuccess: () => {
        pushSuccessNotice('添加成功')
        void client.invalidateQueries(['self'])
      },
    },
  )
}

export function usePostActiveQuery (code: string = '') {
  const client = useQueryClient()
  return useQuery<MessageResponse>({
    queryKey: ['active', code],
    queryFn: async () => {
      const path = '/user/activate'
      const resp = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify({
          code,
        }),
      })
      if (resp.status !== 200) {
        throw new Error('激活失败')
      }
      return await resp.json()
    },
    onSuccess: () => {
      void client.invalidateQueries(['self'])
    },
    enabled: code.length !== 0,
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
