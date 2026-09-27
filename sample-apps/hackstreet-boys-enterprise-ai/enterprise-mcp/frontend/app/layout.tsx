import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Enterprise Knowledge MCP',
  description: 'AI-powered company knowledge platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
