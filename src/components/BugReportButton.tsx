import React, { FormEvent, useState } from 'react'
import { compensateChallengeAttempt } from './ChallengeModeScreen'

interface Props {
  playerName: string
  portalLinked: boolean
  challengeActive: boolean
  challengeSessionId: string | null
  turnStallDetected: {
    sessionId: string
    playerIndex: number
    timeLimitSeconds: number
    detectedAt: string
  } | null
}

export default function BugReportButton({
  playerName,
  portalLinked,
  challengeActive,
  challengeSessionId,
  turnStallDetected,
}: Props) {
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const compensationEligible = Boolean(
    challengeActive
    && challengeSessionId
    && turnStallDetected?.sessionId === challengeSessionId
  )

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!portalLinked) {
      setNotice('INMU PORTALからログイン連携してご利用ください')
      return
    }
    setSending(true)
    setNotice('')
    try {
      const response = await fetch('/api/portal/bug-report', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          message,
          pageUrl: window.location.href,
          challengeActive,
          challengeSessionId,
          turnStallDetected: compensationEligible,
          turnStallDetails: compensationEligible ? turnStallDetected : null,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
      if (data.challengeCompensated) {
        const compensated = compensateChallengeAttempt(playerName, challengeSessionId!)
        setNotice(compensated
          ? '報告を送信し、チャレンジ回数を1回補填しました'
          : '報告を送信しました（この挑戦の回数は補填済みです）')
      } else {
        setNotice('報告を送信しました')
      }
      setSubject('')
      setMessage('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '報告を送信できませんでした')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="バグを報告"
        title="バグを報告"
        onClick={() => { setNotice(''); setOpen(true) }}
        style={{
          position: 'absolute',
          right: 8,
          bottom: 10,
          zIndex: 90,
          width: 78,
          height: 78,
          padding: 0,
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
          filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.55))',
        }}
      >
        <img
          src="/bug-report-daifugo.png"
          alt=""
          draggable={false}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bug-report-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            display: 'grid',
            placeItems: 'center',
            padding: 18,
            background: 'rgba(0,0,0,.78)',
            backdropFilter: 'blur(5px)',
          }}
          onMouseDown={event => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <form
            onSubmit={submit}
            style={{
              width: 'min(100%, 420px)',
              maxHeight: '90dvh',
              overflowY: 'auto',
              boxSizing: 'border-box',
              padding: 18,
              border: '1px solid rgba(212,175,55,.55)',
              borderRadius: 14,
              background: '#100d17',
              color: '#f7f0dc',
              boxShadow: '0 18px 60px rgba(0,0,0,.65)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 id="bug-report-title" style={{ margin: 0, fontSize: 19, color: '#f6cf57' }}>バグ報告</h2>
                <p style={{ margin: '4px 0 0', fontSize: 11, opacity: .68 }}>管理者からの回答はINMU PORTALの通知へ届きます</p>
              </div>
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => setOpen(false)}
                style={{ border: 0, background: 'transparent', color: '#fff', fontSize: 26, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {compensationEligible && (
              <p style={{ margin: '14px 0 0', padding: 9, borderRadius: 8, background: 'rgba(69,190,130,.12)', color: '#8ee1b5', fontSize: 12 }}>
                手番タイムリミット超過後の停止を検出しました。この報告で挑戦回数を1回補填します。
              </p>
            )}
            {challengeActive && !compensationEligible && (
              <p style={{ margin: '14px 0 0', padding: 9, borderRadius: 8, background: 'rgba(255,190,70,.1)', color: '#f2ce78', fontSize: 12 }}>
                挑戦回数の補填は、タイムリミット後も手番が進まない状態を検出した場合のみ行われます。
              </p>
            )}

            <label style={{ display: 'block', marginTop: 14, fontSize: 12, fontWeight: 800 }}>
              件名
              <input
                required
                maxLength={100}
                value={subject}
                onChange={event => setSubject(event.target.value)}
                placeholder="例：カードを出せない"
                style={{
                  display: 'block',
                  width: '100%',
                  boxSizing: 'border-box',
                  marginTop: 6,
                  padding: 11,
                  border: '1px solid #52445f',
                  borderRadius: 9,
                  background: '#09070e',
                  color: '#fff',
                  fontSize: 16,
                }}
              />
            </label>
            <label style={{ display: 'block', marginTop: 13, fontSize: 12, fontWeight: 800 }}>
              内容
              <textarea
                required
                minLength={5}
                maxLength={2000}
                rows={6}
                value={message}
                onChange={event => setMessage(event.target.value)}
                placeholder="発生した操作や画面の状態を入力してください"
                style={{
                  display: 'block',
                  width: '100%',
                  boxSizing: 'border-box',
                  marginTop: 6,
                  padding: 11,
                  resize: 'vertical',
                  border: '1px solid #52445f',
                  borderRadius: 9,
                  background: '#09070e',
                  color: '#fff',
                  fontSize: 16,
                  lineHeight: 1.5,
                }}
              />
            </label>
            {notice && <p role="status" style={{ margin: '12px 0 0', color: notice.includes('送信') ? '#8ee1b5' : '#ff8d8d', fontSize: 12 }}>{notice}</p>}
            <button
              type="submit"
              disabled={sending}
              style={{
                width: '100%',
                marginTop: 14,
                padding: 12,
                border: 0,
                borderRadius: 9,
                background: sending ? '#655d48' : 'linear-gradient(135deg,#ffd85c,#c99720)',
                color: '#171007',
                fontWeight: 900,
                cursor: sending ? 'wait' : 'pointer',
              }}
            >
              {sending ? '送信中…' : '送信する'}
            </button>
          </form>
        </div>
      )}
    </>
  )
}
