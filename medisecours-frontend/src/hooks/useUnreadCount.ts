import useSWR from 'swr'
import { fetcher } from '../lib/fetcher'
import { useAuth } from './useAuth'

export function useUnreadCount() {
  const { user } = useAuth()

  const { data, mutate } = useSWR(user ? '/api/messages/unread-count' : null, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 15000,
  })

  const decrement = () => {
    mutate((prev: any) => {
      if (!prev || prev.unreadCount <= 0) return { unreadCount: 0 }
      return { unreadCount: prev.unreadCount - 1 }
    }, false)
  }

  return {
    unreadCount: data?.unreadCount || 0,
    mutate,
    decrement
  }
}
