import React, { useEffect, useState, useRef } from 'react'
import { SpecialEffect as SpecialEffectType } from '../types/game'
import { useAudio } from '../contexts/AudioContext'

interface Props {
  effect: SpecialEffectType
  onDone: () => void
}

const DURATIONS: Partial<Record<NonNullable<SpecialEffectType>, number>> = {
  IKISUGI: 2200,
  YARIMAS: 1800,
  IIYO: 3600,
  KAKUMEI: 1800,
  ELEVEN_BACK: 1500,
  EIGHT_CUT: 1200,
  YATSU: 1000,
  JUTEN: 1000,
  SHIBARI: 1200,
  '2431': 1500,
}

// Confetti particle
interface Particle {
  id: number
  x: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
  shape: 'rect' | 'circle'
}

const CONFETTI_COLORS = ['#ff0080', '#ff6600', '#ffcc00', '#00ff88', '#00ccff', '#8800ff', '#ff44cc', '#ffffff']

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animRef = useRef<number>(0)
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Burst from multiple points
    const burst = (cx: number, cy: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
        const speed = 4 + Math.random() * 10
        particlesRef.current.push({
          id: Date.now() + i + Math.random(),
          x: cx,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: 5 + Math.random() * 8,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 15,
          shape: Math.random() > 0.4 ? 'rect' : 'circle',
        })
      }
    }

    const w = canvas.width
    const h = canvas.height

    burst(w * 0.5, h * 0.3, 40)
    setTimeout(() => burst(w * 0.2, h * 0.25, 25), 200)
    setTimeout(() => burst(w * 0.8, h * 0.25, 25), 350)
    setTimeout(() => burst(w * 0.5, h * 0.5, 30), 600)
    setTimeout(() => burst(w * 0.15, h * 0.5, 20), 800)
    setTimeout(() => burst(w * 0.85, h * 0.5, 20), 900)

    const animate = () => {
      ctx.clearRect(0, 0, w, h)
      frameRef.current++
      particlesRef.current = particlesRef.current.filter(p => p.x > -50 && p.x < w + 50 && p.x > -50)

      for (const p of particlesRef.current) {
        p.x += p.vx
        p.vy += 0.3
        p.vx *= 0.99
        const y = p.vy
        p.rotation += p.rotationSpeed

        ctx.save()
        ctx.globalAlpha = Math.min(1, Math.max(0, 1 - frameRef.current / 120))
        ctx.translate(p.x, (p as any)._y = ((p as any)._y ?? (canvas.height * 0.3)) + y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }

      animRef.current = requestAnimationFrame(animate)
    }

    // Use absolute Y tracking per particle
    for (const p of particlesRef.current) {
      (p as any)._y = canvas.height * 0.3
    }

    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    />
  )
}

// Cracker burst SVG lines
function CrackerBurst({ x, y, delay = 0 }: { x: string; y: string; delay?: number }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  if (!show) return null
  const lines = Array.from({ length: 12 }, (_, i) => {
    const angle = (360 / 12) * i
    const len = 20 + Math.random() * 20
    const rad = (angle * Math.PI) / 180
    return { x2: Math.cos(rad) * len, y2: Math.sin(rad) * len, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }
  })
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', zIndex: 18 }}>
      <svg width="80" height="80" viewBox="-40 -40 80 80" style={{ animation: 'fadeInScale 0.3s ease-out, fadeOut 0.5s ease-in 0.6s both' }}>
        {lines.map((l, i) => (
          <line key={i} x1={0} y1={0} x2={l.x2} y2={l.y2}
            stroke={l.color} strokeWidth={2.5} strokeLinecap="round"
            style={{ animation: `crackerLine 0.4s ease-out ${i * 0.02}s both` }}
          />
        ))}
        <circle cx={0} cy={0} r={4} fill="#fff" />
      </svg>
    </div>
  )
}

export default function SpecialEffect({ effect, onDone }: Props) {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const { playEffectVoice } = useAudio()

  useEffect(() => {
    if (!effect) return
    setVisible(true)
    setFadeOut(false)
    playEffectVoice(effect)
    const dur = (effect && DURATIONS[effect]) ?? 1200
    const fadeStart = dur - 500
    const ft = setTimeout(() => setFadeOut(true), Math.max(fadeStart, 0))
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 300)
    }, dur)
    return () => { clearTimeout(t); clearTimeout(ft) }
  }, [effect])

  if (!effect || !visible) return null

  const overlayStyle: React.CSSProperties = {
    transition: 'opacity 0.5s ease',
    opacity: fadeOut ? 0 : 1,
  }

  if (effect === 'IKISUGI') return (
    <div className="special-overlay" style={{
      background: 'radial-gradient(ellipse at center, rgba(255,80,0,0.5) 0%, rgba(0,0,0,0.85) 70%)',
      animation: 'ikisugiFlash 0.3s infinite',
      ...overlayStyle,
    }}>
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        border: '4px solid rgba(255,150,0,0.5)',
        animation: 'spinGlow 2s linear forwards',
      }} />
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(48px, 14vw, 96px)', fontWeight: 900,
        color: '#ff4400',
        textShadow: '0 0 20px #ff8800, 0 0 60px #ff4400, 0 0 100px #ff0000, 4px 4px 0 #000',
        animation: 'fadeInScale 0.4s ease-out, glitch 0.8s ease-in-out 0.5s',
        textAlign: 'center', zIndex: 10,
      }}>イキスギィ!!</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 6vw, 40px)',
        color: '#ffcc00', marginTop: 12,
        textShadow: '0 0 10px #ffcc00',
        animation: 'fadeInScale 0.5s ease-out 0.3s both', zIndex: 10,
      }}>⚡ 1919発動 ⚡</div>
      <div style={{
        position: 'absolute', bottom: '15%',
        fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 4vw, 22px)',
        color: 'rgba(255,200,100,0.9)', animation: 'pulse 0.5s infinite', zIndex: 10,
      }}>スピードアップ中！！</div>
    </div>
  )

  if (effect === 'YARIMAS') return (
    <div className="special-overlay" style={{
      background: 'radial-gradient(ellipse at center, rgba(0,80,200,0.5) 0%, rgba(0,0,0,0.85) 70%)',
      ...overlayStyle,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(36px, 10vw, 72px)', fontWeight: 900,
        color: '#00ccff',
        textShadow: '0 0 20px #0088ff, 0 0 60px #00aaff, 4px 4px 0 #000',
        animation: 'fadeInScale 0.4s ease-out', textAlign: 'center', zIndex: 10,
      }}>やりますねぇ〜</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(18px, 5vw, 32px)',
        color: '#88ddff', marginTop: 12, textShadow: '0 0 10px #00aaff',
        animation: 'fadeInScale 0.5s ease-out 0.3s both', zIndex: 10,
      }}>🎯 810切り発動 🎯</div>
    </div>
  )

  if (effect === 'IIYO') return (
    <div className="special-overlay" style={{
      background: 'radial-gradient(ellipse at center, rgba(180,0,255,0.5) 0%, rgba(0,0,0,0.9) 70%)',
      ...overlayStyle,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(270deg, #ff0080, #8000ff, #0040ff, #00ff80, #ff0080)',
        backgroundSize: '400% 400%',
        animation: 'rainbowBg 1s ease infinite', opacity: 0.25,
        zIndex: 1,
      }} />

      {/* Cracker bursts */}
      <CrackerBurst x="50%" y="30%" delay={0} />
      <CrackerBurst x="15%" y="20%" delay={250} />
      <CrackerBurst x="85%" y="20%" delay={400} />
      <CrackerBurst x="25%" y="60%" delay={700} />
      <CrackerBurst x="75%" y="55%" delay={850} />

      {/* Confetti canvas */}
      <Confetti />

      {/* Main text */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(40px, 11vw, 86px)', fontWeight: 900,
        color: '#ffffff',
        textShadow: '0 0 20px #ff00ff, 0 0 60px #8800ff, 4px 4px 0 #000',
        animation: 'fadeInScale 0.4s ease-out, pulseGold 1s ease infinite 0.4s',
        textAlign: 'center', zIndex: 15, lineHeight: 1.15,
      }}>いいよ！<br />来いよ</div>

      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(18px, 5vw, 36px)',
        color: '#ffaaff', marginTop: 16,
        textShadow: '0 0 10px #ff00ff',
        animation: 'fadeInScale 0.5s ease-out 0.3s both',
        zIndex: 15,
      }}>🔥 114514 即時勝利！ 🔥</div>

      {/* Victory banner */}
      <div style={{
        position: 'absolute', bottom: '18%',
        fontFamily: 'var(--font-display)', fontSize: 'clamp(13px, 3.5vw, 20px)',
        color: '#ffdd00',
        textShadow: '0 0 12px #ffaa00',
        animation: 'fadeInScale 0.4s ease-out 0.8s both, pulse 1s ease 1.2s infinite',
        zIndex: 15, letterSpacing: 3,
      }}>✨ 勝利演出 ✨</div>
    </div>
  )

  if (effect === 'KAKUMEI') return (
    <div className="special-overlay" style={{
      background: 'radial-gradient(ellipse at center, rgba(255,0,128,0.4) 0%, rgba(0,0,0,0.85) 70%)',
      ...overlayStyle,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(48px, 13vw, 90px)', fontWeight: 900,
        color: '#ff0088',
        textShadow: '0 0 20px #ff0088, 0 0 60px #ff0044, 4px 4px 0 #000',
        animation: 'fadeInScale 0.4s ease-out, glitch 0.6s ease-in-out 0.5s',
        textAlign: 'center', zIndex: 10,
      }}>💥 革命 💥</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(16px, 4.5vw, 30px)',
        color: '#ffaacc', marginTop: 12, textShadow: '0 0 10px #ff0088',
        animation: 'fadeInScale 0.5s ease-out 0.3s both', zIndex: 10,
      }}>強弱反転！</div>
    </div>
  )

  if (effect === 'ELEVEN_BACK') return (
    <div className="special-overlay" style={{
      background: 'radial-gradient(ellipse at center, rgba(0,200,255,0.35) 0%, rgba(0,0,0,0.85) 70%)',
      ...overlayStyle,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(36px, 10vw, 72px)', fontWeight: 900,
        color: '#00eeff',
        textShadow: '0 0 20px #00ccff, 0 0 60px #0088ff, 4px 4px 0 #000',
        animation: 'fadeInScale 0.4s ease-out',
        textAlign: 'center', zIndex: 10,
      }}>🔄 イレブン<br />バック</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 4vw, 24px)',
        color: '#88eeff', marginTop: 12,
        animation: 'fadeInScale 0.5s ease-out 0.3s both', zIndex: 10,
      }}>一時的に強弱逆転！</div>
    </div>
  )

  if (effect === 'EIGHT_CUT') return (
    <div className="special-overlay" style={{
      background: 'radial-gradient(ellipse at center, rgba(200,50,50,0.4) 0%, rgba(0,0,0,0.85) 70%)',
      ...overlayStyle,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(48px, 13vw, 90px)', fontWeight: 900,
        color: '#ff4444',
        textShadow: '0 0 20px #ff2222, 0 0 40px #cc0000, 4px 4px 0 #000',
        animation: 'fadeInScale 0.3s ease-out',
        textAlign: 'center', zIndex: 10,
      }}>✂️ 8切り</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 4vw, 24px)',
        color: '#ffaaaa', marginTop: 12,
        animation: 'fadeInScale 0.4s ease-out 0.2s both', zIndex: 10,
      }}>場を流した！</div>
    </div>
  )

  if (effect === 'SHIBARI') return (
    <div className="special-overlay" style={{
      background: 'radial-gradient(ellipse at center, rgba(150,100,0,0.4) 0%, rgba(0,0,0,0.85) 70%)',
      ...overlayStyle,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(40px, 11vw, 80px)', fontWeight: 900,
        color: '#ddaa00',
        textShadow: '0 0 20px #ddaa00, 0 0 40px #aa8800, 4px 4px 0 #000',
        animation: 'fadeInScale 0.3s ease-out',
        textAlign: 'center', zIndex: 10,
      }}>🔒 縛り！</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 4vw, 24px)',
        color: '#ffdd88', marginTop: 12,
        animation: 'fadeInScale 0.4s ease-out 0.2s both', zIndex: 10,
      }}>スート縛り発動！</div>
    </div>
  )

  if (effect === '2431') return (
    <div className="special-overlay" style={{
      background: 'radial-gradient(ellipse at center, rgba(100,50,200,0.4) 0%, rgba(0,0,0,0.85) 70%)',
      ...overlayStyle,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(40px, 11vw, 80px)', fontWeight: 900,
        color: '#aa88ff',
        textShadow: '0 0 20px #aa88ff, 0 0 40px #8866cc, 4px 4px 0 #000',
        animation: 'fadeInScale 0.3s ease-out',
        textAlign: 'center', zIndex: 10,
      }}>⚠️ 2431</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 4vw, 24px)',
        color: '#ccaaff', marginTop: 12,
        animation: 'fadeInScale 0.4s ease-out 0.2s both', zIndex: 10, textAlign: 'center',
      }}>えっと、24歳です</div>
    </div>
  )

  return null
}
