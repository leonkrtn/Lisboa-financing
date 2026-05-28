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
      {/* Mobile hamburger button */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-white border border-[#E5E5E5] rounded"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Toggle navigation"
      >
        <span className="block w-5 h-0.5 bg-[#1A1A1A] mb-1" />
        <span className="block w-5 h-0.5 bg-[#1A1A1A] mb-1" />
        <span className="block w-5 h-0.5 bg-[#1A1A1A]" />
      </button>

      {/* Backdrop for mobile */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static top-0 left-0 z-50 h-full md:h-screen
          w-56 bg-white border-r border-[#E5E5E5]
          flex flex-col
          transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="px-5 py-6 border-b border-[#E5E5E5]">
          <div className="text-lg font-bold text-[#1A1A1A] leading-tight">Lisboa</div>
          <div className="text-sm font-semibold text-[#C9A84C]">Financing</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          {navItems.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center px-5 py-2.5 text-sm transition-colors
                  border-l-2
                  ${isActive
                    ? 'border-[#C9A84C] text-[#C9A84C] font-medium bg-[#FFFDF5]'
                    : 'border-transparent text-[#1A1A1A] hover:bg-[#F8F8F8] hover:text-[#C9A84C]'
                  }
                `}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-5 py-4 text-xs text-gray-400 border-t border-[#E5E5E5]">
          Personal Finance
        </div>
      </aside>
    </>
  )
}
