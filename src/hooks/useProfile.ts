import { useState, useEffect } from 'react'

export interface Profile {
  username: string
  avatarDataUrl: string | null
  portalUserId?: string
  portalLinked?: boolean
}

const STORAGE_KEY = 'inmu-profile'

const DEFAULT_PROFILE: Profile = {
  username: 'プレイヤー',
  avatarDataUrl: null,
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) }
    } catch {}
    return DEFAULT_PROFILE
  })

  useEffect(() => {
    fetch('/api/portal/session', { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!data?.linked || !data.user) return
        setProfile(prev => ({
          ...prev,
          username: data.user.username || prev.username,
          portalUserId: data.user.portalUserId,
          portalLinked: true,
        }))
        const url = new URL(window.location.href)
        if (url.searchParams.has('portal')) {
          url.searchParams.delete('portal')
          url.searchParams.delete('reason')
          window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
        }
      }).catch(() => {})
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    } catch {}
  }, [profile])

  function saveProfile(updates: Partial<Profile>) {
    setProfile(prev => ({ ...prev, ...updates }))
  }

  return { profile, saveProfile }
}
