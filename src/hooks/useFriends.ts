import { useState, useCallback } from 'react'
import { PlayerRank } from '../types/game'

export interface Friend {
  id: string
  name: string
  avatarDataUrl: string | null
  addedAt: number
  lastRank?: PlayerRank | null
}

const STORAGE_KEY = 'inmu_friends_v1'

function load(): Friend[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return parsed.map((f: any) => ({
      ...f,
      avatarDataUrl: f.avatarDataUrl ?? null,
    }))
  } catch { return [] }
}

function save(friends: Friend[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(friends))
}

export function useFriends() {
  const [friends, setFriends] = useState<Friend[]>(load)

  const addFriend = useCallback((name: string, avatarDataUrl: string | null = null): Friend => {
    const f: Friend = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: name.trim(),
      avatarDataUrl,
      addedAt: Date.now(),
    }
    setFriends(prev => {
      const next = [...prev, f]
      save(next)
      return next
    })
    return f
  }, [])

  const removeFriend = useCallback((id: string) => {
    setFriends(prev => {
      const next = prev.filter(f => f.id !== id)
      save(next)
      return next
    })
  }, [])

  const hasFriend = useCallback((name: string) => {
    return load().some(f => f.name === name)
  }, [])

  return { friends, addFriend, removeFriend, hasFriend }
}
