import React from 'react'

export type AdMaxSize = '320x50' | '320x100' | '300x250'

const dimensions: Record<AdMaxSize, { width: number; height: number }> = {
  '320x50': { width: 320, height: 50 },
  '320x100': { width: 320, height: 100 },
  '300x250': { width: 300, height: 250 },
}

export default function AdMaxSlot({ size }: { size: AdMaxSize }) {
  const { width, height } = dimensions[size]
  return <div style={{
    width: '100%', height, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,.94)', borderTop: '1px solid rgba(212,175,55,.18)', overflow: 'hidden',
  }}>
    <iframe
      key={size}
      src={`/ads/ad-${size}.html`}
      title={`広告 ${size}`}
      width={width}
      height={height}
      scrolling="no"
      loading="eager"
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
      style={{ width, height, border: 0, display: 'block', background: 'transparent' }}
    />
  </div>
}
