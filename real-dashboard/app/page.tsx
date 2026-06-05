'use client'
import { useState } from 'react'
import Topbar from '@/components/Topbar'
import Marquee from '@/components/Marquee'
import PlanPage from '@/components/PlanPage'
import DashboardPage from '@/components/DashboardPage'
import PosterBannerPage from '@/components/PosterBannerPage'

export type Tab = 'plan' | 'dashboard' | 'poster'

export default function Home() {
  const [tab, setTab] = useState<Tab>('plan')
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <Topbar tab={tab} setTab={setTab} />
      <Marquee />
      <div style={{ display: tab === 'plan'      ? 'block' : 'none' }}><PlanPage /></div>
      <div style={{ display: tab === 'dashboard' ? 'block' : 'none' }}><DashboardPage /></div>
      <div style={{ display: tab === 'poster'    ? 'block' : 'none' }}><PosterBannerPage /></div>
    </div>
  )
}
