import React, { useRef, useState } from 'react'
import { Profile } from '../hooks/useProfile'

interface Props {
  profile: Profile
  onSave: (updates: Partial<Profile>) => void
  onClose: () => void
}

export default function ProfileModal({ profile, onSave, onClose }: Props) {
  const [username, setUsername] = useState(profile.username)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatarDataUrl)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      setAvatarPreview(result)
    }
    reader.readAsDataURL(file)
  }

  function handleSave() {
    const trimmed = username.trim() || 'プレイヤー'
    onSave({ username: trimmed, avatarDataUrl: avatarPreview })
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(160deg, #1a1a2e 0%, #12000e 100%)',
          border: '1px solid rgba(212,175,55,0.4)',
          borderRadius: 20,
          padding: '28px 24px',
          width: 'min(340px, 90vw)',
          boxShadow: '0 0 40px rgba(212,175,55,0.2)',
        }}
      >
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18, fontWeight: 900,
          color: '#d4af37', textAlign: 'center',
          marginBottom: 24, letterSpacing: 2,
        }}>プロフィール設定</div>

        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 88, height: 88, borderRadius: '50%',
                border: '2px solid rgba(212,175,55,0.6)',
                overflow: 'hidden',
                background: 'rgba(212,175,55,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(212,175,55,0.25)',
              }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 36 }}>👤</span>
              )}
            </div>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 26, height: 26, borderRadius: '50%',
                background: 'linear-gradient(135deg, #d4af37, #a07c20)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 13,
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >✏️</div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
          </div>
        </div>

        {avatarPreview && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <button
              onClick={() => setAvatarPreview(null)}
              style={{
                background: 'none', border: 'none',
                color: 'rgba(255,100,100,0.7)', fontSize: 11,
                cursor: 'pointer', textDecoration: 'underline',
              }}
            >画像を削除</button>
          </div>
        )}

        {/* Username */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 11, color: 'rgba(212,175,55,0.6)',
            letterSpacing: 2, marginBottom: 8,
          }}>ユーザー名</div>
          <input
            type="text"
            value={username}
            maxLength={16}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(212,175,55,0.35)',
              borderRadius: 10,
              padding: '11px 14px',
              color: '#f0e8d0',
              fontSize: 16,
              fontFamily: 'var(--font-main)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4, textAlign: 'right' }}>
            {username.length} / 16
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10, padding: '11px',
              color: 'rgba(240,232,208,0.6)', fontSize: 14,
              cursor: 'pointer', fontFamily: 'var(--font-main)',
            }}
          >キャンセル</button>
          <button
            onClick={handleSave}
            style={{
              flex: 2,
              background: 'linear-gradient(135deg, #d4af37, #a07c20)',
              border: 'none', borderRadius: 10, padding: '11px',
              color: '#0a0a0a', fontSize: 14, fontWeight: 900,
              cursor: 'pointer', fontFamily: 'var(--font-display)',
              letterSpacing: 1,
            }}
          >保存</button>
        </div>
      </div>
    </div>
  )
}
