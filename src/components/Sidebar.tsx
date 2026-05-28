'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navItems = [
  { href: '/overview', label: 'Overview' },
  { href: '/months', label: 'Months' },
  { href: '/config', label: 'Config' },
  { href: '/income-types', label: 'Income Types' },
  { href: '/internships', label: 'Internships' },
  { href: '/balance', label: 'Balance' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger button — visible only on mobile */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-[#1E3A8A] text-white rounded-lg shadow-md"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Toggle navigation"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 4l12 12M16 4L4 16" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        )}
      </button>

      {/* Mobile dropdown backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile dropdown panel */}
      {open && (
        <div className="md:hidden fixed top-0 left-0 right-0 z-45 bg-white border-b border-[#E2E8F0] shadow-lg pt-14 pb-3" style={{ zIndex: 45 }}>
          {navItems.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center px-5 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-[#1E3A8A] bg-[#EFF6FF] border-l-2 border-[#60A5FA]'
                    : 'text-[#0F172A] hover:bg-[#F1F5F9] hover:text-[#1E3A8A] border-l-2 border-transparent'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      )}

      {/* Desktop sidebar — always visible on md+ */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen bg-gradient-to-b from-[#1E3A8A] to-[#172554] shrink-0">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="text-xl font-bold text-white leading-tight tracking-tight">Lisboa</div>
          <div className="text-sm font-semibold text-[#60A5FA] tracking-wide">Financing</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 flex flex-col gap-0.5 px-3">
          {navItems.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center px-4 py-2.5 text-sm rounded-lg transition-colors
                  border-l-2
                  ${isActive
                    ? 'border-[#60A5FA] text-white bg-white/10 font-medium'
                    : 'border-transparent text-white/70 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10">
          <span className="text-xs text-white/40">v1.0</span>
        </div>
      </aside>
    </>
  )
}
