'use client'

// Product images imported as static assets from /public/products/
const IMGS = Array.from({ length: 9 }, (_, i) => `const IMGS = Array.from({ length: 9 }, (_, i) => `https://const IMGS = Array.from({ length: 9 }, (_, i) => `/${i + 1}.jpg`)/bichnguyenk3/real-media-dashboard/main/${i + 1}.jpg`)`)

export default function Marquee() {
  const all = [...IMGS, ...IMGS] // duplicate for seamless loop
  return (
    <>
      <style>{`
        @keyframes mq { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .mq-track { animation: mq 40s linear infinite; }
        .mq-track:hover { animation-play-state: paused; }
        .mq-item img { transition: transform .5s; }
        .mq-item:hover img { transform: scale(1.05); }
      `}</style>
      <div style={{
        width: '100%', overflow: 'hidden', background: 'var(--cream-d)',
        borderBottom: '1px solid var(--cream-b)', height: 260,
      }}>
        <div className="mq-track" style={{ display: 'flex', gap: 3, height: '100%', width: 'max-content' }}>
          {all.map((src, i) => (
            <div key={i} className="mq-item" style={{ flexShrink: 0, width: 190, height: 260, overflow: 'hidden' }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
