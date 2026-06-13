import React, { useState } from 'react'
import { useFriends } from '../hooks/useFriends'

const ICONS = ['🐱','🐶','🐼','🐸','🦊','🐺','🦁','🐯','🐨','🐮','🦆','🦋','🐝','🌸','⭐','🎭','🃏','🔥','💎','👾']

interface Props {
  onBack: () => void
  onFriendMatch: () => void
}

export default function FriendsScreen({ onBack, onFriendMatch }: Props) {
  const { friends, addFriend, removeFriend } = useFriends()
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('🐱')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  function toggleCheck(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleAdd() {
    if (!newName.trim()) return
    addFriend(newName, newIcon)
    setNewName('')
    setNewIcon('🐱')
    setShowAdd(false)
  }

  function handleDelete(id: string) {
    if (deleteConfirm === id) {
      removeFriend(id)
      setChecked(prev => { const n = new Set(prev); n.delete(id); return n })
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(id)
      setTimeout(() => setDeleteConfirm(null), 2000)
    }
  }

  const canStart = checked.size > 0

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #0a0005 100%)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid rgba(212,175,55,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: 8,
            color: '#d4af37',
            padding: '5px 12px',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >← 戻る</button>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 900,
          color: '#d4af37',
          flex: 1,
        }}>👥 フレンド</div>
        <div style={{
          fontSize: 12,
          color: 'rgba(212,175,55,0.5)',
        }}>{friends.length}人</div>
      </div>

      {/* フレンド対戦ボタン */}
      <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
        <button
          onClick={onFriendMatch}
          disabled={!canStart}
          style={{
            width: '100%',
            padding: '13px',
            background: canStart
              ? 'linear-gradient(135deg, #d4af37 0%, #a07c20 100%)'
              : 'rgba(255,255,255,0.06)',
            color: canStart ? '#000' : 'rgba(255,255,255,0.3)',
            border: canStart ? 'none' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            cursor: canStart ? 'pointer' : 'default',
            boxShadow: canStart ? '0 0 18px rgba(212,175,55,0.4)' : 'none',
            letterSpacing: 1,
            transition: 'all 0.2s',
          }}
        >
          {canStart ? `🎮 ${checked.size}人でフレンド対戦を始める` : 'フレンドを選んで対戦'}
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {friends.length === 0 && !showAdd && (
          <div style={{
            textAlign: 'center',
            padding: '48px 20px',
            color: 'rgba(212,175,55,0.4)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 14, marginBottom: 4 }}>まだフレンドがいません</div>
            <div style={{ fontSize: 12, color: 'rgba(212,175,55,0.3)' }}>
              下の「＋追加」から登録しよう
            </div>
          </div>
        )}

        {friends.map(friend => {
          const isChecked = checked.has(friend.id)
          const isDeleting = deleteConfirm === friend.id
          return (
            <div
              key={friend.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                marginBottom: 8,
                background: isChecked
                  ? 'rgba(212,175,55,0.14)'
                  : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${isChecked ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onClick={() => toggleCheck(friend.id)}
            >
              {/* Checkbox */}
              <div style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                border: `2px solid ${isChecked ? '#d4af37' : 'rgba(255,255,255,0.25)'}`,
                background: isChecked
                  ? 'linear-gradient(135deg, #d4af37, #a07c20)'
                  : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}>
                {isChecked && <span style={{ color: '#000', fontSize: 13, fontWeight: 900 }}>✓</span>}
              </div>

              {/* Icon */}
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(212,175,55,0.1)',
                border: `1.5px solid rgba(212,175,55,0.3)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0,
              }}>
                {friend.icon}
              </div>

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: isChecked ? '#f0e8d0' : '#bbb',
                  fontWeight: 700,
                  fontSize: 15,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>{friend.name}</div>
              </div>

              {/* Delete */}
              <button
                onClick={e => { e.stopPropagation(); handleDelete(friend.id) }}
                style={{
                  background: isDeleting ? 'rgba(220,50,50,0.3)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${isDeleting ? 'rgba(220,50,50,0.5)' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: 8,
                  color: isDeleting ? '#ff6666' : '#666',
                  fontSize: 12,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >{isDeleting ? '確認' : '削除'}</button>
            </div>
          )
        })}

        {/* Add friend form */}
        {showAdd && (
          <div style={{
            background: 'rgba(212,175,55,0.08)',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: 12,
            padding: '14px',
            marginBottom: 8,
          }}>
            <div style={{ fontSize: 13, color: '#d4af37', fontWeight: 700, marginBottom: 10 }}>
              フレンドを追加
            </div>

            {/* Icon picker */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 12,
            }}>
              {ICONS.map(icon => (
                <button
                  key={icon}
                  onClick={() => setNewIcon(icon)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: newIcon === icon
                      ? '2px solid #d4af37'
                      : '1px solid rgba(255,255,255,0.15)',
                    background: newIcon === icon
                      ? 'rgba(212,175,55,0.2)'
                      : 'rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    fontSize: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >{icon}</button>
              ))}
            </div>

            {/* Name input */}
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="ユーザー名を入力"
              maxLength={20}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(212,175,55,0.4)',
                borderRadius: 8,
                color: '#f0e8d0',
                fontSize: 15,
                outline: 'none',
                marginBottom: 10,
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleAdd}
                disabled={!newName.trim()}
                style={{
                  flex: 1,
                  padding: '9px',
                  background: newName.trim()
                    ? 'linear-gradient(135deg, #d4af37, #a07c20)'
                    : 'rgba(255,255,255,0.06)',
                  color: newName.trim() ? '#000' : '#555',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: newName.trim() ? 'pointer' : 'default',
                }}
              >追加</button>
              <button
                onClick={() => { setShowAdd(false); setNewName(''); setNewIcon('🐱') }}
                style={{
                  padding: '9px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8,
                  color: '#888',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >キャンセル</button>
            </div>
          </div>
        )}

        {/* Add button */}
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            style={{
              width: '100%',
              padding: '11px',
              background: 'transparent',
              border: '1.5px dashed rgba(212,175,55,0.35)',
              borderRadius: 12,
              color: 'rgba(212,175,55,0.7)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: 1,
            }}
          >＋ フレンドを追加</button>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}
