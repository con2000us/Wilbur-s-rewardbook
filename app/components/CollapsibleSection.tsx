'use client'

import { useState } from 'react'

interface Props {
  icon: string
  title: string
  description?: string
  badge?: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function CollapsibleSection({
  icon,
  title,
  description,
  badge,
  defaultOpen = false,
  children,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-5 sm:p-6 text-left hover:bg-slate-50/50 transition-colors"
      >
        <span className="material-icons-outlined text-xl text-slate-500">{icon}</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          {description && (
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
        {badge && (
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
            {badge}
          </span>
        )}
        <span
          className={`material-icons-outlined text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          expand_more
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pb-5 sm:px-6 sm:pb-6 space-y-4 border-t border-slate-100 pt-5">
          {children}
        </div>
      </div>
    </section>
  )
}
