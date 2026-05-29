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
    <nav className="h-13 bg-[#172554] flex items-center px-4 md:px-6 shrink-0 relative z-40"
         style={{ height: '52px', borderBottom: '1px solid rgb(255 255 255 / 0.08)' }}>
      <Link href="/" className="flex items-center gap-2 mr-8 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-[#1d4ed8] flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-bold text-white text-[15px] tracking-tight">Lisboa</span>
          <span className="text-[#93C5FD] font-light text-[15px]">·</span>
          <span className="text-[#93C5FD] font-medium text-[15px] tracking-tight">Finance</span>
        </div>
      </Link>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-0.5 flex-1">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isActive(link.href)
                ? 'bg-white/10 text-white font-medium'
                : 'text-white/60 hover:text-white hover:bg-white/8'
            }`}
            style={isActive(link.href) ? {} : { '--tw-bg-opacity': '0.08' } as React.CSSProperties}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden ml-auto text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        onClick={() => setMenuOpen(v => !v)}
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

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-[52px] left-0 right-0 bg-white border-b border-[#E5E7EB] shadow-lg z-50">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center px-5 py-3.5 text-sm transition-colors ${
                isActive(link.href)
                  ? 'font-semibold text-[#1E3A8A] bg-[#EFF6FF] border-l-2 border-[#1E3A8A]'
                  : 'text-[#374151] hover:bg-[#F9FAFB] border-l-2 border-transparent'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
