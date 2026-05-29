'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/capital', label: 'Kapital' },
  { href: '/planning', label: 'Planung' },
  { href: '/setup', label: 'Einstellungen' },
]

export default function TopNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="h-12 bg-[#1E3A8A] flex items-center px-4 shrink-0 relative z-40">
      <Link href="/" className="flex items-center gap-1.5 mr-8 shrink-0">
        <span className="font-bold text-white text-base tracking-tight">Lisboa</span>
        <span className="text-[#93C5FD] font-light">·</span>
        <span className="text-[#93C5FD] font-medium text-base tracking-tight">Finance</span>
      </Link>

      <div className="hidden md:flex items-center gap-1 flex-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              isActive(link.href)
                ? 'text-white text-sm font-medium border-b-2 border-white pb-0.5 px-3 py-2'
                : 'text-white/70 hover:text-white text-sm px-3 py-2 transition-colors'
            }
          >
            {link.label}
          </Link>
        ))}
      </div>

      <button
        className="md:hidden ml-auto text-white/80 hover:text-white p-1"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        {menuOpen ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {menuOpen && (
        <div className="md:hidden absolute top-12 left-0 right-0 bg-white border-b border-[#E5E7EB] shadow-md z-50">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={
                isActive(link.href)
                  ? 'block px-4 py-3 text-sm font-semibold text-[#1E3A8A] border-l-2 border-[#1E3A8A] bg-[#EFF6FF]'
                  : 'block px-4 py-3 text-sm text-[#111827] hover:bg-[#F9FAFB] border-l-2 border-transparent'
              }
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
