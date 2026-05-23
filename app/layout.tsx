import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RoadSoS AI – Golden Hour Intelligence System',
  description: 'AI-powered emergency coordination that optimises the full golden-hour chain after a road accident.',
  manifest: '/manifest.json',
  themeColor: '#E8352A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-surface">
        {children}
      </body>
    </html>
  )
}
