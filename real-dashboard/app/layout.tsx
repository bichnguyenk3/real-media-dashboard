import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Media Dashboard – REAL Clothes',
  description: 'Content planning & tracking for REAL Clothes team',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
