'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase, PBItem, Status, STATUS_LABELS, STATUS_COLORS } from '@/lib/supabase'

const SO: Status[] = ['pending','waiting','approved','posted','feedback','edited']

function monthLabel(mo: number) {
  const d = new Date(2026, 5 + mo, 1)
  return `Tháng ${d.getMonth() + 1} / ${d.getFullYear()}`
}

export default function PosterBannerPage() {
  const [mo, setMo]     = useState(0)
  const [items, setItems] = useState<PBItem[]>([])
  const [lb, setLb]     = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    const { data } = await supabase.from('pb_items').select('*').eq('month_offset', mo).order('type').order('position')
    if (data) setItems(data)
  }, [mo])

  useEffect(() => { fetchItems() }, [fetchItems])

  // realtime
  useEffect(() => {
    const ch = supabase.channel(`pb-${mo}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pb_items', filter: `month_offset=eq.${mo}` },
        () => fetchItems())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [mo, fetchItems])

  async function upsert(type: 'poster' | 'banner', position: number, patch: Partial<PBItem>) {
    const existing = items.find(i => i.type === type && i.position === position)
    const base = existing || { month_offset: mo, type, position, name: '', status: 'pending' as Status, deadline: null, note: '', img_url: null }
    await supabase.from('pb_items').upsert({ ...base, ...patch, month_offset: mo, type, position }, { onConflict: 'month_offset,type,position' })
  }

  async function uploadImg(type: 'poster' | 'banner', position: number, file: File) {
    const path = `pb/${mo}/${type}_${position}_${Date.now()}.${file.name.split('.').pop()}`
    await supabase.storage.from('pb-files').upload(path, file)
    const { data: { publicUrl } } = supabase.storage.from('pb-files').getPublicUrl(path)
    await upsert(type, position, { img_url: publicUrl })
  }

  function getItems(type: 'poster' | 'banner', max: number) {
    const existing = items.filter(i => i.type === type).sort((a,b) => a.position - b.position)
    const count = Math.max(existing.length, max)
    return Array.from({ length: count }, (_, i) => existing.find(e => e.position === i) || null)
  }

  const posters = getItems('poster', 8)
  const banners = getItems('banner', 3)

  const done = items.filter(i => i.status === 'posted').length
  const wip  = items.filter(i => i.status !== 'pending' && i.status !== 'posted').length
  const none = (posters.length + banners.length) - done - wip

  return (
    <div style={{ padding: '36px 40px 60px' }}>
      {/* lightbox */}
      {lb && (
        <div onClick={() => setLb(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <span onClick={() => setLb(null)} style={{ position: 'fixed', top: 20, right: 28, fontSize: 28, color: '#fff', cursor: 'pointer', fontWeight: 300, lineHeight: 1, opacity: .7 }}>✕</span>
          <img src={lb} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', display: 'block' }} />
        </div>
      )}

      <div style={{ marginBottom: 24, borderBottom: '1px solid var(--cream-b)', paddingBottom: 20 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy)', letterSpacing: -1 }}>Poster / Banner</div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 6 }}>{monthLabel(mo)} · Theo dõi tiến độ thiết kế</div>
      </div>

      {/* month nav */}
      <div style={{ display: 'flex', border: '1px solid var(--cream-b)', marginBottom: 24 }}>
        <button onClick={() => setMo(m => m - 1)} style={navBtn}>← Tháng trước</button>
        <div style={{ flex: 1, padding: '9px 20px', fontSize: 11, fontWeight: 700, color: 'var(--navy)', background: 'var(--cream)', textAlign: 'center' }}>{monthLabel(mo)}</div>
        <button onClick={() => setMo(m => m + 1)} style={{ ...navBtn, borderLeft: '1px solid var(--cream-b)', borderRight: 'none' }}>Tháng sau →</button>
      </div>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--cream-b)', border: '1px solid var(--cream-b)', marginBottom: 28 }}>
        {[['Đã hoàn thành', done, '#2D6A2D'], ['Đang làm', wip, '#0c3468'], ['Chưa bắt đầu', none, '#888']].map(([l,n,c]) => (
          <div key={String(l)} style={{ background: 'var(--white)', padding: '14px 18px' }}>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -1, color: String(c), marginBottom: 3 }}>{n}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)' }}>{l}</div>
          </div>
        ))}
      </div>

      {/* POSTER section */}
      <Section title="Poster Website" count={posters.length} max={8} type="poster" items={posters}
        onUpsert={upsert} onUpload={uploadImg} onLightbox={setLb} onAdd={() => upsert('poster', posters.length, {})} />

      {/* BANNER section */}
      <Section title="Banner Shopee" count={banners.length} max={3} type="banner" items={banners}
        onUpsert={upsert} onUpload={uploadImg} onLightbox={setLb} onAdd={() => upsert('banner', banners.length, {})} />
    </div>
  )
}

function Section({ title, count, max, type, items, onUpsert, onUpload, onLightbox, onAdd }: {
  title: string; count: number; max: number; type: 'poster'|'banner'
  items: (PBItem|null)[]; onUpsert: any; onUpload: any; onLightbox: any; onAdd: any
}) {
  const isPoster = type === 'poster'
  const SO: Status[] = ['pending','waiting','approved','posted','feedback','edited']
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--navy)', padding: '12px 0', borderBottom: '1px solid var(--cream-b)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{title}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)' }}>{count} items</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isPoster ? 'repeat(auto-fill, minmax(200px,1fr))' : 'repeat(auto-fill, minmax(300px,1fr))', gap: 12 }}>
        {items.map((item, i) => {
          const st: Status = item?.status ?? 'pending'
          const sc = STATUS_COLORS[st]
          return (
            <div key={i} style={{ background: 'var(--white)', border: '1px solid var(--cream-b)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* status bar */}
              <div style={{ height: 3, background: sc.c }} />
              {/* image area */}
              <div style={{ width: '100%', background: 'var(--cream-d)', position: 'relative', overflow: 'hidden', aspectRatio: isPoster ? '3/4' : '16/5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item?.img_url
                  ? <img src={item.img_url} alt="" onClick={() => onLightbox(item.img_url)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', cursor: 'zoom-in', display: 'block' }} />
                  : <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: '100%', cursor: 'pointer', color: 'var(--faint)', fontSize: 10, fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', padding: 16 }}>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(type, i, f) }} />
                      <span style={{ fontSize: 28, opacity: .4 }}>＋</span>
                      <span>Tải ảnh lên</span>
                    </label>
                }
              </div>
              {/* info */}
              <div style={{ padding: '12px 14px', borderTop: '1px solid var(--cream-b)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--navy)', minWidth: 28 }}>{String(i+1).padStart(2,'0')}</span>
                  <input defaultValue={item?.name || ''} onBlur={e => onUpsert(type, i, { name: e.target.value })} placeholder="Tên poster / banner..."
                    style={{ flex: 1, border: 'none', fontSize: 11, fontFamily: 'Montserrat', fontWeight: 600, color: 'var(--text)', background: 'transparent', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select value={st} onChange={e => onUpsert(type, i, { status: e.target.value })}
                    style={{ flex: 1, padding: '5px 8px', border: '1px solid var(--cream-b)', fontSize: 9, fontFamily: 'Montserrat', fontWeight: 700, letterSpacing: '.8px', background: 'var(--cream)', color: 'var(--navy)', cursor: 'pointer', outline: 'none', textTransform: 'uppercase' }}>
                    {SO.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                  <input type="date" defaultValue={item?.deadline || ''} onBlur={e => onUpsert(type, i, { deadline: e.target.value })}
                    style={{ flex: 1, padding: '5px 8px', border: '1px solid var(--cream-b)', fontSize: 10, fontFamily: 'Montserrat', background: 'var(--cream)', color: 'var(--navy)', outline: 'none' }} />
                </div>
                <textarea defaultValue={item?.note || ''} onBlur={e => onUpsert(type, i, { note: e.target.value })} placeholder="Ghi chú..."
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--cream-b)', fontSize: 10, fontFamily: 'Montserrat', background: 'var(--cream)', color: 'var(--text)', outline: 'none', resize: 'none', height: 36 }} />
              </div>
            </div>
          )
        })}
        {/* add card */}
        <div onClick={onAdd} style={{ background: 'var(--cream-d)', border: '1px dashed var(--cream-b)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 120, aspectRatio: isPoster ? '3/4' : '16/5' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
            <span style={{ fontSize: 24, opacity: .5 }}>＋</span>
            <span>Thêm {isPoster ? 'Poster' : 'Banner'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const navBtn: React.CSSProperties = {
  padding: '9px 20px', background: 'var(--white)', cursor: 'pointer', fontSize: 9,
  fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--navy)',
  fontFamily: 'Montserrat, sans-serif', border: 'none', borderRight: '1px solid var(--cream-b)',
}
