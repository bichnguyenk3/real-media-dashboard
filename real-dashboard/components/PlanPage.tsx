'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase, Post, PILLARS, SLOTS, DAYS, DEFAULT_PLAN, DEFAULT_FORMAT,
         FIXED_CELLS, getWeekDates, fmtDate, weekLabel, Pillar, Format, Status, STATUS_LABELS } from '@/lib/supabase'

const S: React.CSSProperties = { padding: '36px 40px 60px' }

export default function PlanPage() {
  const [wo, setWo] = useState(0)
  const [posts, setPosts] = useState<Record<string, Post>>({})

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase.from('posts').select('*').eq('week_offset', wo)
    if (data) {
      const map: Record<string, Post> = {}
      data.forEach(p => { map[`${p.day_index}_${p.slot}`] = p })
      setPosts(map)
    }
  }, [wo])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  // realtime subscription
  useEffect(() => {
    const ch = supabase.channel('posts-plan')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `week_offset=eq.${wo}` },
        () => fetchPosts())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [wo, fetchPosts])

  async function upsertPost(dayIndex: number, slot: string, patch: Partial<Post>) {
    const existing = posts[`${dayIndex}_${slot}`]
    const base = existing || {
      week_offset: wo, day_index: dayIndex, slot,
      pillar: DEFAULT_PLAN[slot]?.[dayIndex] ?? 'rs',
      format: DEFAULT_FORMAT[slot] as Format,
      content: '', status: 'pending' as Status,
    }
    const merged = { ...base, ...patch, week_offset: wo, day_index: dayIndex, slot }
    await supabase.from('posts').upsert(merged, { onConflict: 'week_offset,day_index,slot' })
  }

  const ds = getWeekDates(wo)

  // pillar count
  const pillarCount: Record<string, number> = {}
  Object.values(PILLARS).forEach((_, k) => { pillarCount[Object.keys(PILLARS)[k]] = 0 })
  Object.keys(PILLARS).forEach(k => { pillarCount[k] = 0 })
  SLOTS.forEach(s => DAYS.forEach((_, d) => {
    const p = posts[`${d}_${s}`]
    const key = p?.pillar ?? (DEFAULT_PLAN[s]?.[d] ?? 'rs')
    pillarCount[key] = (pillarCount[key] || 0) + 1
  }))

  return (
    <div style={S}>
      {/* header */}
      <div style={{ marginBottom: 24, borderBottom: '1px solid var(--cream-b)', paddingBottom: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy)', letterSpacing: -1 }}>Content Plan</div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 6 }}>{weekLabel(wo)} · 35 posts</div>
        </div>
        <button onClick={() => window.print()} style={{ padding: '8px 18px', border: '1px solid var(--navy)', background: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--navy)', fontFamily: 'Montserrat, sans-serif' }}>In / PDF</button>
      </div>

      {/* week nav */}
      <div style={{ display: 'flex', border: '1px solid var(--cream-b)', marginBottom: 20 }}>
        <button onClick={() => setWo(w => w - 1)} style={navBtnStyle}>← Tuần trước</button>
        <div style={{ flex: 1, padding: '9px 20px', fontSize: 11, fontWeight: 700, color: 'var(--navy)', background: 'var(--cream)', textAlign: 'center' }}>{weekLabel(wo)}</div>
        <button onClick={() => setWo(w => w + 1)} style={{ ...navBtnStyle, borderLeft: '1px solid var(--cream-b)', borderRight: 'none' }}>Tuần sau →</button>
      </div>

      {/* grid */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '54px repeat(7,1fr)', border: '1px solid var(--cream-b)', background: 'var(--cream-b)', gap: 1, minWidth: 840 }}>
          {/* corner */}
          <div style={{ background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,.25)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>GIỜ</span>
          </div>
          {/* day headers */}
          {DAYS.map((d, i) => (
            <div key={d} style={{ background: 'var(--navy)', padding: '11px 5px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '1.5px', textTransform: 'uppercase' }}>{d}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', marginTop: 3, fontWeight: 500 }}>{fmtDate(ds[i])}</div>
            </div>
          ))}

          {/* rows */}
          {SLOTS.map(slot => (
            <>
              {/* time cell */}
              <div key={slot} style={{ background: 'var(--cream)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--cream-b)', padding: '8px 4px 0' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--navy)', letterSpacing: '.5px', paddingBottom: 6 }}>{slot}</span>
                <div style={{ height: 1, background: 'var(--cream-b)', width: '100%' }} />
              </div>
              {/* day cells */}
              {DAYS.map((_, dayIndex) => {
                const isFixed = FIXED_CELLS[slot]?.[dayIndex]
                const post = posts[`${dayIndex}_${slot}`]
                const pillar = (post?.pillar ?? DEFAULT_PLAN[slot]?.[dayIndex] ?? 'rs') as Pillar
                const fmt = (post?.format ?? DEFAULT_FORMAT[slot]) as Format
                const pInfo = PILLARS[pillar]
                return (
                  <div key={dayIndex} style={{ background: isFixed ? '#FAF7F2' : 'var(--white)', borderLeft: isFixed ? '3px solid var(--navy)' : undefined }}>
                    <div style={{ padding: '7px 6px', display: 'flex', flexDirection: 'column', gap: 5, minHeight: 68 }}>
                      {/* pillar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        {isFixed
                          ? <><span style={{ fontSize: 11 }}>🔒</span><span style={{ flex: 1, fontSize: 9, fontWeight: 700, padding: '4px 6px', letterSpacing: '.6px', textTransform: 'uppercase', textAlign: 'center', background: pInfo.bg, color: pInfo.c }}>{pInfo.label}</span></>
                          : <select value={pillar} onChange={e => upsertPost(dayIndex, slot, { pillar: e.target.value as Pillar })}
                              style={{ flex: 1, padding: '4px 5px', border: '1px solid var(--cream-b)', fontSize: 9, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', cursor: 'pointer', outline: 'none', background: pInfo.bg, color: pInfo.c, appearance: 'none' }}>
                              {Object.entries(PILLARS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        }
                      </div>
                      {/* format toggle */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--cream-b)' }}>
                        {(['img', 'vid'] as Format[]).map(f => (
                          <button key={f} onClick={() => upsertPost(dayIndex, slot, { format: f })}
                            style={{ padding: '5px 2px', fontSize: 8, fontWeight: 700, letterSpacing: '.6px', cursor: 'pointer', textTransform: 'uppercase', textAlign: 'center', border: 'none', fontFamily: 'Montserrat, sans-serif', borderRight: f === 'img' ? '1px solid var(--cream-b)' : 'none', background: fmt === f ? 'var(--navy)' : 'var(--white)', color: fmt === f ? '#fff' : 'var(--muted)', transition: 'all .15s' }}>
                            {f === 'img' ? 'Ảnh' : 'Video'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          ))}
        </div>
      </div>

      {/* totals */}
      <div style={{ display: 'grid', gridTemplateColumns: '54px repeat(7,1fr)', gap: 1, marginTop: 10, background: 'var(--cream-b)', border: '1px solid var(--cream-b)' }}>
        <div />
        {DAYS.map(d => (
          <div key={d} style={{ background: 'var(--white)', padding: 9, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', letterSpacing: -1 }}>5</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', marginTop: 2 }}>{d}</div>
          </div>
        ))}
      </div>

      {/* pillar summary */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12, marginTop: 28, paddingBottom: 9, borderBottom: '1px solid var(--cream-b)' }}>Phân bổ pillar tuần này</div>
      <div style={{ display: 'flex', gap: 1, background: 'var(--cream-b)', border: '1px solid var(--cream-b)' }}>
        {Object.entries(PILLARS).map(([k, v]) => (
          <div key={k} style={{ background: 'var(--white)', padding: '13px 16px', flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -1, marginBottom: 2, color: v.c }}>{pillarCount[k] || 0}</div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--muted)' }}>{v.label}</div>
          </div>
        ))}
        <div style={{ background: 'var(--navy)', padding: '13px 16px', flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -1, marginBottom: 2, color: '#fff' }}>35</div>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)' }}>Tổng</div>
        </div>
      </div>
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  padding: '9px 20px', background: 'var(--white)', cursor: 'pointer', fontSize: 9,
  fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--navy)',
  fontFamily: 'Montserrat, sans-serif', border: 'none', borderRight: '1px solid var(--cream-b)',
}
