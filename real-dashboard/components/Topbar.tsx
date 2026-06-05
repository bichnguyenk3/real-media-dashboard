'use client'
import { Tab } from '@/app/page'

const TABS: { key: Tab; label: string }[] = [
  { key: 'plan',      label: 'Content Plan' },
  { key: 'dashboard', label: 'Theo dõi tiến độ' },
  { key: 'poster',    label: 'Poster / Banner' },
]

export default function Topbar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <nav style={{
      background: 'var(--cream)', borderBottom: '1px solid var(--cream-b)',
      padding: '0 40px', display: 'flex', alignItems: 'center',
      position: 'sticky', top: 0, zIndex: 200,
    }}>
      <div style={{ padding: '10px 0', marginRight: 36, borderRight: '1px solid var(--cream-b)', paddingRight: 32 }}>
        <img src="/logo.jpg" alt="REAL Clothes" style={{ height: 32, width: 'auto', display: 'block' }} />
      </div>
      <div style={{ display: 'flex', height: '100%' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '19px 18px', fontFamily: 'Montserrat, sans-serif',
            fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
            background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            color: tab === t.key ? 'var(--navy)' : 'var(--muted)',
            borderBottom: tab === t.key ? '2px solid var(--navy)' : '2px solid transparent',
            transition: 'all .2s',
          }}>{t.label}</button>
        ))}
      </div>
    </nav>
  )
}
