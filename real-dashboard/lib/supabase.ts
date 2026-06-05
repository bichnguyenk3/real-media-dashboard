import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// ── Types ──
export type Status = 'pending' | 'waiting' | 'approved' | 'posted' | 'feedback' | 'edited'
export type Format = 'img' | 'vid'
export type Pillar = 'rs' | 'gr' | 'rc' | 'ct' | 'dp' | 'sb'

export interface Post {
  id: string
  week_offset: number
  day_index: number
  slot: string
  pillar: Pillar
  format: Format
  content: string
  status: Status
  updated_at: string
}

export interface Feedback {
  id: string
  post_id: string
  role: 'lead' | 'member'
  message: string
  created_at: string
}

export interface PBItem {
  id: string
  month_offset: number
  type: 'poster' | 'banner'
  position: number
  name: string
  status: Status
  deadline: string | null
  note: string
  img_url: string | null
}

// ── Constants ──
export const PILLARS: Record<Pillar, { label: string; c: string; bg: string }> = {
  rs: { label: 'Real Style',       c: '#0c3468', bg: '#E8F0FB' },
  gr: { label: 'Real Life / GRWM', c: '#2D6A2D', bg: '#EAF4EA' },
  rc: { label: 'Real Care',        c: '#5C3A8A', bg: '#F0EAFA' },
  ct: { label: 'CTKM / SP sale',   c: '#A03010', bg: '#FAF0EA' },
  dp: { label: 'Đồng phục',        c: '#0A5C48', bg: '#E0F4EE' },
  sb: { label: 'SP bán chạy',      c: '#7A4800', bg: '#FBF2E0' },
}

export const STATUS_LABELS: Record<Status, string> = {
  pending:  'Chưa làm',
  waiting:  'Chờ duyệt',
  approved: 'Đã duyệt',
  posted:   'Đã đăng',
  feedback: 'Feedback',
  edited:   'Đã edit lại',
}

export const STATUS_COLORS: Record<Status, { c: string; bg: string }> = {
  pending:  { c: '#888',    bg: '#F4F4F2' },
  waiting:  { c: '#0c3468', bg: '#E8F0FB' },
  approved: { c: '#2D6A2D', bg: '#EAF4EA' },
  posted:   { c: '#0A5C48', bg: '#E0F4EE' },
  feedback: { c: '#A03010', bg: '#FAF0EA' },
  edited:   { c: '#7A4800', bg: '#FBF2E0' },
}

export const SLOTS = ['09:00', '11:30', '14:00', '19:30', '21:00']
export const DAYS  = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export const DEFAULT_PLAN: Record<string, Pillar[]> = {
  '09:00': ['rs','ct','rs','ct','rs','ct','rs'],
  '11:30': ['gr','gr','gr','gr','gr','gr','gr'],
  '14:00': ['ct','dp','ct','sb','sb','ct','ct'],
  '19:30': ['ct','rs','rc','rc','ct','rs','rc'],
  '21:00': ['rc','rs','ct','ct','rc','rs','rs'],
}

export const DEFAULT_FORMAT: Record<string, Format> = {
  '09:00': 'img', '11:30': 'vid', '14:00': 'img', '19:30': 'vid', '21:00': 'img',
}

export const FIXED_CELLS: Record<string, Record<number, boolean>> = {
  '14:00': { 1: true, 3: true, 4: true, 5: true },
}

export const BASE_MONDAY = new Date(2026, 4, 25) // Mon 25 May 2026

export function getWeekDates(offset: number): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(BASE_MONDAY)
    d.setDate(BASE_MONDAY.getDate() + offset * 7 + i)
    return d
  })
}

export function fmtDate(d: Date) {
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export function weekLabel(offset: number) {
  const ds = getWeekDates(offset)
  return `Week ${offset + 1} · ${fmtDate(ds[0])} – ${fmtDate(ds[6])} / ${ds[0].getFullYear()}`
}
