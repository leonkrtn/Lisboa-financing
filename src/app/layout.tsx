import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import TopNav from '@/components/TopNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Lisboa · Finance',
  description: 'Personal finance planner',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full flex flex-col`}>
        <TopNav />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </body>
    </html>
  )
}
