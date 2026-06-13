import { useState, useEffect } from 'react'

export interface Profile {
  username: string
  avatarDataUrl: string | null
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    } catch {}
  }, [profile])

  function saveProfile(updates: Partial<Profile>) {
    setProfile(prev => ({ ...prev, ...updates }))
  }

  return { profile, saveProfile }
}
