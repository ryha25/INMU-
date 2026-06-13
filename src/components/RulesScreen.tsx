import React, { useState } from 'react'
import { RulesConfig, DEFAULT_RULES } from '../types/game'

interface Props {
  onStart: (rules: RulesConfig) => void
  onBack: () => void
}

interface RuleItem {
  key: keyof RulesConfig
  label: string
  desc: string
  emoji: string
}

const RULE_ITEMS: RuleItem[] = [
  { key: 'kakumei',     label: '革命',         desc: '4枚同ランク出しで強弱反転',         emoji: '💥' },
  { key: 'kaidan',      label: '階段',         desc: '連番3枚以上で出せる',               emoji: '📶' },
  { key: 'elevenBack',  label: 'イレブンバック', desc: 'Jを出すと一時的に強弱反転',         emoji: '🔄' },
  { key: 'eightCut',    label: '8切り',        desc: '8を出すと場を流す',                 emoji: '✂️' },
  { key: 'shibari',     label: '縛り',         desc: '2枚以上の同スート出しで次も同スート縛り', emoji: '🔒' },
  { key: 'suitshibari', label: '柄縛り',        desc: '1枚出しでもスートが縛られる（縛りと併用不可）', emoji: '🎴' },
  { key: 'supe3gaeshi', label: 'スペ3返し',    desc: '♠3で単体の2・ジョーカーに勝ち場を流す', emoji: '♠' },
  { key: 'kinshiAgari', label: '禁止上がり',   desc: '2と8での上がりを禁止',              emoji: '🚫' },
  { key: 'nanaWatashi', label: '7渡し',        desc: '7を出したら他プレイヤーにカードを渡す', emoji: '🎁' },
  { key: 'junTen',      label: '10捨て',       desc: '10を出したら手札を捨てられる',       emoji: '🗑️' },
  { key: 'miyakochi',   label: '都落ち',        desc: '革命が起きると上がり済み全員の順位が反転', emoji: '🏙️' },
]

export default function RulesScreen({ onStart, onBack }: Props) {
  const [rules, setRules] = useState<RulesConfig>({ ...DEFAULT_RULES })

  function toggle(key: keyof RulesConfig) {
    setRules(prev => ({ ...prev, [key]: !prev[key] }))
  }

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
        padding: '14px 16px 10px',
        borderBottom: '1px solid rgba(212,175,55,0.25)',
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
        >
          ← 戻る
        </button>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 900,
          color: '#d4af37',
        }}>
          ルール設定
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>

        {/* Standard rules */}
        <div style={{
          fontSize: 11,
          color: 'rgba(212,175,55,0.7)',
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          通常ルール（オンオフ可能）
        </div>

        {RULE_ITEMS.map(item => (
          <div
            key={item.key}
            onClick={() => toggle(item.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 14px',
              marginBottom: 8,
              background: rules[item.key]
                ? 'rgba(212,175,55,0.12)'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${rules[item.key] ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 22, lineHeight: 1, width: 28, textAlign: 'center' }}>
              {item.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: rules[item.key] ? '#f0e8d0' : '#666',
              }}>
                {item.label}
              </div>
              <div style={{ fontSize: 11, color: rules[item.key] ? 'rgba(240,232,208,0.5)' : '#444', marginTop: 2 }}>
                {item.desc}
              </div>
            </div>
            {/* Toggle */}
            <div style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              background: rules[item.key]
                ? 'linear-gradient(135deg, #d4af37, #a07c20)'
                : 'rgba(255,255,255,0.1)',
              border: `1px solid ${rules[item.key] ? '#d4af37' : 'rgba(255,255,255,0.2)'}`,
              position: 'relative',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute',
                top: 3,
                left: rules[item.key] ? 22 : 3,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: rules[item.key] ? '#000' : '#555',
                transition: 'left 0.2s',
              }} />
            </div>
          </div>
        ))}

        {/* INMU Fixed rules */}
        <div style={{
          fontSize: 11,
          color: 'rgba(255,100,50,0.8)',
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginTop: 16,
          marginBottom: 10,
        }}>
          INMUルール（常時ON・変更不可）
        </div>

        {[
          { label: '810切り「やりますねぇ〜」', desc: '8+10の2枚出しで場を流す', emoji: '🎯' },
          { label: '1919「イキスギィ!!」',      desc: 'A,A,9,9の4枚出しで場を流す+スピードアップ', emoji: '⚡' },
          { label: '114514「いいよ！来いよ」',  desc: 'A×3,4×2,5の6枚で即時勝利（2周目以降）', emoji: '🔥' },
          { label: '2431「えっと、24歳」',       desc: 'スタート手札に2,4,3,Aがあれば初手で必ず出す（手札に戻る）', emoji: '⚠️' },
        ].map(item => (
          <div key={item.label} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 14px',
            marginBottom: 8,
            background: 'rgba(255,80,0,0.08)',
            border: '1px solid rgba(255,80,0,0.3)',
            borderRadius: 10,
            opacity: 0.85,
          }}>
            <div style={{ fontSize: 22, lineHeight: 1, width: 28, textAlign: 'center' }}>{item.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#ff8855' }}>{item.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,136,85,0.6)', marginTop: 2 }}>{item.desc}</div>
            </div>
            <div style={{
              fontSize: 10,
              color: '#ff6633',
              border: '1px solid rgba(255,100,50,0.4)',
              borderRadius: 4,
              padding: '2px 6px',
            }}>
              固定
            </div>
          </div>
        ))}

        <div style={{ height: 16 }} />
      </div>

      {/* Start button */}
      <div style={{ padding: '12px 16px 20px', flexShrink: 0, borderTop: '1px solid rgba(212,175,55,0.15)' }}>
        <button
          onClick={() => onStart(rules)}
          style={{
            width: '100%',
            padding: '15px',
            background: 'linear-gradient(135deg, #d4af37 0%, #a07c20 100%)',
            color: '#000',
            border: 'none',
            borderRadius: 12,
            fontSize: 18,
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(212,175,55,0.4)',
            letterSpacing: 2,
          }}
        >
          このルールでスタート
        </button>
      </div>
    </div>
  )
}
