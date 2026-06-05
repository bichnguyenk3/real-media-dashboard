'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase, Post, Feedback, PILLARS, SLOTS, DAYS, DEFAULT_PLAN, DEFAULT_FORMAT,
         getWeekDates, fmtDate, weekLabel, Status, STATUS_LABELS, STATUS_COLORS, Pillar, Format } from '@/lib/supabase'

const SO: Status[] = ['pending','waiting','approved','posted','feedback','edited']

export default function DashboardPage() {
  const [view, setView]   = useState<'week'|'day'>('week')
  const [wo, setWo]       = useState(0)
  const [day, setDay]     = useState(0)
  const [posts, setPosts] = useState<Record<string, Post>>({})
  const [fbs, setFbs]     = useState<Record<string, Feedback[]>>({})
  const [fbInput, setFbInput] = useState<Record<string, string>>({})

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase.from('posts').select('*').eq('week_offset', wo)
    if (data) {
      const map: Record<string, Post> = {}
      data.forEach(p => { map[`${p.day_index}_${p.slot}`] = p })
      setPosts(map)
    }
  }, [wo])

  const fetchFeedbacks = useCallback(async (postId: string) => {
    const { data } = await supabase.from('feedbacks').select('*').eq('post_id', postId).order('created_at')
    if (data) setFbs(prev => ({ ...prev, [postId]: data }))
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  // realtime posts
  useEffect(() => {
    const ch = supabase.channel(`dash-posts-${wo}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `week_offset=eq.${wo}` },
        () => fetchPosts())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [wo, fetchPosts])

  // realtime feedbacks
  useEffect(() => {
    const ch = supabase.channel('dash-fbs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedbacks' },
        payload => {
          const fb = payload.new as Feedback
          setFbs(prev => ({ ...prev, [fb.post_id]: [...(prev[fb.post_id] || []), fb] }))
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function getOrCreatePost(dayIndex: number, slot: string): Promise<Post> {
    const existing = posts[`${dayIndex}_${slot}`]
    if (existing) return existing
    const newPost = {
      week_offset: wo, day_index: dayIndex, slot,
      pillar: (DEFAULT_PLAN[slot]?.[dayIndex] ?? 'rs') as Pillar,
      format: DEFAULT_FORMAT[slot] as Format,
      content: '', status: 'pending' as Status,
    }
    const { data } = await supabase.from('posts').upsert(newPost, { onConflict: 'week_offset,day_index,slot' }).select().single()
    return data || { ...newPost, id: '', updated_at: '' }
  }

  async function cycleStatus(dayIndex: number, slot: string) {
    const p = posts[`${dayIndex}_${slot}`]
    const cur: Status = p?.status ?? 'pending'
    const next = SO[(SO.indexOf(cur) + 1) % SO.length]
    const post = await getOrCreatePost(dayIndex, slot)
    await supabase.from('posts').update({ status: next }).eq('id', post.id)
  }

  async function updateStatus(dayIndex: number, slot: string, status: Status) {
    const post = await getOrCreatePost(dayIndex, slot)
    await supabase.from('posts').update({ status }).eq('id', post.id)
    if (status === 'feedback') fetchFeedbacks(post.id)
  }

  async function saveContent(dayIndex: number, slot: string, content: string) {
    const post = await getOrCreatePost(dayIndex, slot)
    await supabase.from('posts').update({ content }).eq('id', post.id)
  }

  async function sendFeedback(dayIndex: number, slot: string) {
    const post = await getOrCreatePost(dayIndex, slot)
    const key = `${dayIndex}_${slot}`
    const msg = fbInput[key]?.trim()
    if (!msg) return
    await supabase.from('feedbacks').insert({ post_id: post.id, role: 'lead', message: msg })
    if (post.status === 'feedback') {
      await supabase.from('posts').update({ status: 'edited' }).eq('id', post.id)
    }
    setFbInput(prev => ({ ...prev, [key]: '' }))
    fetchFeedbacks(post.id)
  }

  async function uploadFile(dayIndex: number, slot: string, file: File) {
    const post = await getOrCreatePost(dayIndex, slot)
    const ext = file.name.split('.').pop()
    const path = `${post.id}/${Date.now()}.${ext}`
    await supabase.storage.from('post-files').upload(path, file)
    const { data: { publicUrl } } = supabase.storage.from('post-files').getPublicUrl(path)
    await supabase.from('post_images').insert({ post_id: post.id, url: publicUrl })
  }

  const ds = getWeekDates(wo)

  // summary counts
  const cnt: Record<Status, number> = { pending:0, waiting:0, approved:0, posted:0, feedback:0, edited:0 }
  SLOTS.forEach(s => DAYS.forEach((_, d) => { cnt[posts[`${d}_${s}`]?.status ?? 'pending']++ }))

  function getTopic(dayIndex: number, slot: string) {
    const p = posts[`${dayIndex}_${slot}`]
    const key = p?.pillar ?? DEFAULT_PLAN[slot]?.[dayIndex] ?? 'rs'
    return PILLARS[key as Pillar]?.label ?? key
  }

  return (
    <div style={{ padding: '36px 40px 60px' }}>
      <div style={{ marginBottom: 24, borderBottom: '1px solid var(--cream-b)', paddingBottom: 20 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy)', letterSpacing: -1 }}>Theo dõi tiến độ</div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 6 }}>
          Realtime · mọi thay đổi đồng bộ ngay lập tức
        </div>
      </div>

      {/* status legend */}
      <div style={{ display: 'flex', gap: 1, background: 'var(--cream-b)', border: '1px solid var(--cream-b)', marginBottom: 18 }}>
        {SO.map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'var(--muted)', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', padding: '10px 12px', background: 'var(--white)', flex: 1 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLORS[s].c, flexShrink: 0 }} />
            {STATUS_LABELS[s]}
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', border: '1px solid var(--navy)' }}>
          {(['week','day'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '9px 20px', fontFamily: 'Montserrat, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', background: view === v ? 'var(--navy)' : 'none', color: view === v ? '#fff' : 'var(--navy)', border: 'none', borderRight: v === 'week' ? '1px solid var(--navy)' : 'none', cursor: 'pointer' }}>
              {v === 'week' ? 'Theo tuần' : 'Theo ngày'}
            </button>
          ))}
        </div>
        <button onClick={() => setWo(w => w - 1)} style={navBtn}>← Trước</button>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', flex: 1 }}>{weekLabel(wo)}</span>
        <button onClick={() => setWo(w => w + 1)} style={navBtn}>Sau →</button>
      </div>

      {/* summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 1, background: 'var(--cream-b)', border: '1px solid var(--cream-b)', marginBottom: 18 }}>
        {SO.map(s => (
          <div key={s} style={{ background: 'var(--white)', padding: '13px 14px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -1, marginBottom: 2, color: STATUS_COLORS[s].c }}>{cnt[s]}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--muted)' }}>{STATUS_LABELS[s]}</div>
          </div>
        ))}
      </div>

      {/* WEEK VIEW */}
      {view === 'week' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--cream-b)', minWidth: 700, background: 'var(--white)' }}>
            <thead>
              <tr>
                <th style={{ background: 'var(--navy)', color: '#fff', fontSize: 9, padding: '11px 4px', fontFamily: 'Montserrat', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', width: 52 }}>Giờ</th>
                {DAYS.map((d, i) => (
                  <th key={d} style={{ background: 'var(--navy)', color: '#fff', fontSize: 9, padding: '11px 4px', fontFamily: 'Montserrat', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', borderRight: '1px solid rgba(255,255,255,.08)', textAlign: 'center' }}>
                    {d}<br /><span style={{ fontSize: 8, fontWeight: 400, opacity: .5 }}>{fmtDate(ds[i])}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map(slot => (
                <tr key={slot}>
                  <td style={{ background: 'var(--cream)', fontSize: 10, fontWeight: 700, color: 'var(--navy)', padding: '6px 8px', whiteSpace: 'nowrap', border: '1px solid var(--cream-b)' }}>{slot}</td>
                  {DAYS.map((_, d) => {
                    const p = posts[`${d}_${slot}`]
                    const st: Status = p?.status ?? 'pending'
                    const sc = STATUS_COLORS[st]
                    return (
                      <td key={d} style={{ padding: '7px 4px', border: '1px solid var(--cream-b)', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span style={{ display: 'block', fontSize: 9, color: 'var(--faint)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90, margin: '0 auto 4px', fontWeight: 500 }}>{getTopic(d, slot)}</span>
                        <button onClick={() => cycleStatus(d, slot)} style={{ display: 'inline-flex', fontSize: 8, padding: '3px 7px', fontWeight: 700, border: 'none', fontFamily: 'Montserrat', letterSpacing: '.8px', textTransform: 'uppercase', cursor: 'pointer', background: sc.bg, color: sc.c }}>
                          {STATUS_LABELS[st]}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DAY VIEW */}
      {view === 'day' && (
        <>
          {/* day selector */}
          <div style={{ display: 'flex', gap: 1, background: 'var(--cream-b)', border: '1px solid var(--cream-b)', marginBottom: 18 }}>
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => setDay(i)} style={{ flex: 1, padding: '10px 4px', border: 'none', background: day === i ? 'var(--navy)' : 'var(--white)', cursor: 'pointer', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: day === i ? '#fff' : 'var(--muted)', fontFamily: 'Montserrat, sans-serif', textAlign: 'center' }}>
                {d}<br /><span style={{ fontSize: 8, opacity: .65 }}>{fmtDate(ds[i])}</span>
              </button>
            ))}
          </div>

          {/* slot cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--cream-b)', border: '1px solid var(--cream-b)' }}>
            {SLOTS.map(slot => {
              const p = posts[`${day}_${slot}`]
              const st: Status = p?.status ?? 'pending'
              const sc = STATUS_COLORS[st]
              const fmt: Format = p?.format ?? DEFAULT_FORMAT[slot] as Format
              const isFb = st === 'feedback' || st === 'edited'
              const fbKey = `${day}_${slot}`
              const postFbs = p ? fbs[p.id] || [] : []

              return (
                <div key={slot} style={{ background: 'var(--white)', borderLeft: `4px solid ${sc.c}` }}>
                  {/* slot header */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '11px 20px', background: 'var(--cream)', borderBottom: '1px solid var(--cream-b)', flexWrap: 'wrap', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', minWidth: 46 }}>{slot}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', flex: 1, margin: '0 12px' }}>{getTopic(day, slot)}</span>
                    {/* format toggle */}
                    <div style={{ display: 'flex', border: '1px solid var(--cream-b)', overflow: 'hidden' }}>
                      {(['img','vid'] as Format[]).map(f => (
                        <button key={f} onClick={() => { if(p) supabase.from('posts').update({ format: f }).eq('id', p.id) }}
                          style={{ flex: 1, padding: '6px 12px', fontSize: 9, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', cursor: 'pointer', border: 'none', fontFamily: 'Montserrat', borderRight: f==='img' ? '1px solid var(--cream-b)' : 'none', background: fmt === f ? 'var(--navy)' : 'var(--white)', color: fmt === f ? '#fff' : 'var(--muted)', transition: 'all .15s' }}>
                          {f === 'img' ? 'Ảnh' : 'Video'}
                        </button>
                      ))}
                    </div>
                    <span style={{ display: 'inline-flex', fontSize: 9, padding: '4px 10px', fontWeight: 700, fontFamily: 'Montserrat', letterSpacing: '.8px', textTransform: 'uppercase', background: sc.bg, color: sc.c }}>
                      {STATUS_LABELS[st]}
                    </span>
                  </div>

                  {/* slot body */}
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* content */}
                    <div style={{ display: 'flex', gap: 16 }}>
                      <span style={labelStyle}>Nội dung</span>
                      <textarea defaultValue={p?.content || ''} onBlur={e => saveContent(day, slot, e.target.value)}
                        placeholder="Nhập nội dung bài post..."
                        style={{ flex: 1, padding: '10px 13px', border: '1px solid var(--cream-b)', fontSize: 12, fontFamily: 'Montserrat', resize: 'vertical', minHeight: 52, background: 'var(--cream)', color: 'var(--text)', outline: 'none' }} />
                    </div>
                    {/* upload */}
                    <div style={{ display: 'flex', gap: 16 }}>
                      <span style={labelStyle}>Tải lên</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px dashed var(--cream-b)', cursor: 'pointer', background: 'var(--cream)', flex: 1 }}>
                        <input type="file" accept="image/*,video/*" multiple style={{ display: 'none' }}
                          onChange={e => { Array.from(e.target.files || []).forEach(f => uploadFile(day, slot, f)) }} />
                        <span style={{ fontSize: 15 }}>📎</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)' }}>Tải ảnh / video</span>
                      </label>
                    </div>
                    {/* status */}
                    <div style={{ display: 'flex', gap: 16 }}>
                      <span style={labelStyle}>Trạng thái</span>
                      <select value={st} onChange={e => { updateStatus(day, slot, e.target.value as Status); if(p) fetchFeedbacks(p.id) }}
                        style={{ padding: '7px 11px', border: '1px solid var(--cream-b)', fontSize: 9, fontFamily: 'Montserrat', fontWeight: 700, letterSpacing: '.8px', background: 'var(--cream)', color: 'var(--navy)', cursor: 'pointer', outline: 'none', textTransform: 'uppercase' }}>
                        {SO.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </div>

                    {/* feedback block */}
                    {isFb && p && (
                      <div style={{ border: `1px solid ${st === 'edited' ? '#7A4800' : '#A03010'}`, overflow: 'hidden' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, padding: '7px 13px', borderBottom: '1px solid', background: st === 'edited' ? '#FBF2E0' : '#FAF0EA', color: st === 'edited' ? '#7A4800' : '#A03010', letterSpacing: 1, textTransform: 'uppercase' }}>
                          Feedback{st === 'edited' ? ' — Đã edit lại' : ''}
                        </div>
                        <div style={{ minHeight: 36, maxHeight: 120, overflowY: 'auto', padding: '9px 13px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {postFbs.length === 0
                            ? <span style={{ fontSize: 11, color: 'var(--faint)' }}>Chưa có feedback</span>
                            : postFbs.map(fb => (
                                <div key={fb.id} style={{ fontSize: 11, padding: '5px 10px', maxWidth: '84%', lineHeight: 1.5, background: fb.role === 'lead' ? '#F5C4B3' : 'var(--cream)', color: fb.role === 'lead' ? '#A03010' : 'var(--muted)', alignSelf: fb.role === 'lead' ? 'flex-start' : 'flex-end', border: fb.role === 'member' ? '1px solid var(--cream-b)' : 'none' }}>
                                  {fb.message}
                                </div>
                              ))
                          }
                        </div>
                        <div style={{ display: 'flex', borderTop: `1px solid ${st === 'edited' ? '#7A4800' : '#A03010'}`, background: 'var(--white)' }}>
                          <input value={fbInput[fbKey] || ''} onChange={e => setFbInput(prev => ({ ...prev, [fbKey]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') sendFeedback(day, slot) }}
                            placeholder="Nhập feedback... (Enter để gửi)"
                            style={{ flex: 1, padding: '8px 12px', border: 'none', fontSize: 11, fontFamily: 'Montserrat', background: 'var(--cream)', outline: 'none' }} />
                          <button onClick={() => sendFeedback(day, slot)}
                            style={{ padding: '8px 16px', border: 'none', borderLeft: `1px solid ${st === 'edited' ? '#7A4800' : '#A03010'}`, background: 'none', cursor: 'pointer', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: st === 'edited' ? '#7A4800' : '#A03010', fontFamily: 'Montserrat' }}>
                            Gửi
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const navBtn: React.CSSProperties = {
  padding: '9px 16px', border: '1px solid var(--cream-b)', background: 'var(--white)',
  cursor: 'pointer', fontSize: 9, fontWeight: 700, letterSpacing: '1px',
  textTransform: 'uppercase', color: 'var(--navy)', fontFamily: 'Montserrat, sans-serif',
}
const labelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
  color: 'var(--muted)', minWidth: 62, paddingTop: 6, flexShrink: 0,
}
