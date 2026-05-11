import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FXMed | Functional Medicine Clinic – We Come to You',
  description: 'FXMed provides personalized functional medicine services that come to you. Expert care for optimal health and wellness.',
  icons: {
    icon: '/FXMed_Favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
