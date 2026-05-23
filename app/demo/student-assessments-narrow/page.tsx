'use client'

import { useState } from 'react'

type NavItem = {
  label: string
  icon: string
  href: string
  active?: boolean
}

type RecordItem = {
  id: string
  subject: string
  color: string
  icon: string
  title: string
  type: string
  score: string
  unit?: string
  date: string
  note: string
  images: number
  mistakes?: string[]
}

const navItems: NavItem[] = [
  { label: '\u7e3d\u89bd', icon: 'dashboard', href: '#overview' },
  { label: '\u8a55\u91cf', icon: 'assignment', href: '#assessments', active: true },
  { label: '\u734e\u52f5', icon: 'stars', href: '#rewards' },
  { label: '\u5b58\u647a', icon: 'account_balance_wallet', href: '#wallet' },
  { label: '\u79d1\u76ee', icon: 'menu_book', href: '#subjects' },
]

const studentLinks = [
  { name: '\u674e\u627f\u65b0', subtitle: '\u76ee\u524d\u700f\u89bd', initial: '\u674e', active: true },
  { name: '\u6797\u5b89\u6674', subtitle: '\u4e09\u5e74\u7d1a', initial: '\u6797' },
  { name: '\u9673\u5b87\u5ead', subtitle: '\u4e8c\u5e74\u7d1a', initial: '\u9673' },
]

const subjectFilters = [
  { label: '\u570b\u8a9e', color: '#3B82F6', icon: 'menu_book', active: true },
  { label: '\u6578\u5b78', color: '#F43F5E', icon: 'calculate' },
  { label: '\u82f1\u6587', color: '#10B981', icon: 'translate' },
  { label: '\u793e\u6703', color: '#F59E0B', icon: 'public' },
  { label: '\u751f\u6d3b', color: '#06B6D4', icon: 'school' },
]

const typeFilters = [
  { label: '\u8003\u8a66', icon: 'assignment', color: '#F43F5E' },
  { label: '\u5c0f\u8003', icon: 'fact_check', color: '#6a99e0', active: true },
  { label: '\u4f5c\u696d', icon: 'edit_note', color: '#06B6D4' },
  { label: '\u5c08\u984c', icon: 'palette', color: '#A855F7' },
]

const records: RecordItem[] = [
  {
    id: 'social',
    subject: '\u793e\u6703',
    color: '#F59E0B',
    icon: 'public',
    title: '\u7b2c\u4e09\u4e3b\u984c \u548c\u66f8\u505a\u670b\u53cb',
    type: '\u5c0f\u8003',
    score: '94',
    unit: '\u5206',
    date: '2026/05/21',
    note: '\u80fd\u6574\u7406\u6587\u672c\u91cd\u9ede\uff0c\u65e5\u671f\u8207\u5206\u6578\u5df2\u78ba\u8a8d\u3002',
    images: 2,
  },
  {
    id: 'math',
    subject: '\u6578\u5b78',
    color: '#F43F5E',
    icon: 'calculate',
    title: '\u5206\u6578\u7684\u52a0\u6e1b\u61c9\u7528',
    type: '\u8003\u8a66',
    score: '82',
    unit: '\u5206',
    date: '2026/05/18',
    note: '\u5df2\u9644\u4e0a\u96d9\u9762\u8003\u5377\uff0c\u7b49\u5f85\u5bb6\u9577\u78ba\u8a8d\u932f\u984c\u3002',
    images: 2,
    mistakes: ['\u7b2c 4 \u984c / \u901a\u5206\u5f8c\u518d\u76f8\u6e1b', '\u7b2c 9 \u984c / \u6587\u5b57\u984c\u5217\u5f0f'],
  },
  {
    id: 'english',
    subject: '\u82f1\u6587',
    color: '#10B981',
    icon: 'translate',
    title: 'Unit 4 Daily Routines',
    type: '\u5c0f\u8003',
    score: 'A',
    date: '2026/05/15',
    note: '\u767c\u97f3\u984c\u8868\u73fe\u7a69\u5b9a\uff0c\u62fc\u5b57\u4ecd\u53ef\u8ffd\u8e64\u3002',
    images: 1,
  },
  {
    id: 'chinese',
    subject: '\u570b\u8a9e',
    color: '#3B82F6',
    icon: 'menu_book',
    title: '\u95b1\u8b80\u7406\u89e3\u7df4\u7fd2\u55ae',
    type: '\u4f5c\u696d',
    score: '88',
    unit: '\u5206',
    date: '2026/05/12',
    note: '\u4e3b\u65e8\u984c\u5df2\u9032\u6b65\uff0c\u958b\u653e\u984c\u7b54\u6848\u53ef\u518d\u88dc\u7d30\u7bc0\u3002',
    images: 3,
    mistakes: ['\u7b2c 6 \u984c / \u63a8\u8ad6\u539f\u56e0'],
  },
]

function tint(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const softScroll =
  '[scrollbar-color:rgba(106,153,224,0.18)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/20 [&::-webkit-scrollbar-track]:bg-transparent'

function StudentAvatar() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-100 via-white to-amber-100 text-lg font-black text-primary">
      {'\u674e'}
    </div>
  )
}

function FloatingStudentNav({
  isMenuOpen,
  setIsMenuOpen,
}: {
  isMenuOpen: boolean
  setIsMenuOpen: (value: boolean) => void
}) {
  const [isStudentSwitcherOpen, setIsStudentSwitcherOpen] = useState(false)

  return (
    <header className="fixed left-1/2 top-3 z-50 w-full max-w-md -translate-x-1/2 px-4">
      <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-lg shadow-sky-900/10 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <a id="switch-student" href="#switch-student" className="flex min-w-0 items-center gap-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-white/70">
              <StudentAvatar />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-slate-800">{'\u674e\u627f\u65b0'}</h1>
              <p className="text-xs font-semibold text-primary">{'\u5b78\u751f\u8a55\u91cf\u7d00\u9304'}</p>
            </div>
          </a>
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-primary shadow-sm transition-transform active:scale-95"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? '\u6536\u5408\u5feb\u901f\u5c0e\u89bd' : '\u958b\u555f\u5feb\u901f\u5c0e\u89bd'}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="material-icons-outlined text-xl">{isMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>

        {isMenuOpen && (
          <>
            <nav
              className={`flex gap-2 overflow-x-auto border-t border-white/55 px-4 pb-3 pt-1 ${softScroll}`}
              aria-label="student quick navigation"
            >
              <button
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold shadow-sm transition-colors ${
                  isStudentSwitcherOpen ? 'bg-primary/10 text-primary' : 'bg-white/65 text-slate-600 hover:bg-white'
                }`}
                aria-expanded={isStudentSwitcherOpen}
                onClick={() => setIsStudentSwitcherOpen((value) => !value)}
              >
                <span className="material-icons-outlined text-base">switch_account</span>
                {'\u5207\u63db\u5b78\u751f'}
                <span className="material-icons-outlined text-base">
                  {isStudentSwitcherOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold shadow-sm transition-colors ${
                    item.active ? 'bg-primary/10 text-primary' : 'bg-white/65 text-slate-600 hover:bg-white'
                  }`}
                >
                  <span className="material-icons-outlined text-base">{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </nav>

            {isStudentSwitcherOpen && (
              <div className="grid gap-2 border-t border-white/55 px-4 pb-4 pt-3">
                {studentLinks.map((student) => (
                  <a
                    key={student.name}
                    href="#switch-student"
                    className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 shadow-sm transition-colors ${
                      student.active ? 'bg-primary/10 text-primary' : 'bg-white/65 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                        student.active ? 'bg-white text-primary' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {student.initial}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black">{student.name}</span>
                      <span className="block truncate text-xs font-semibold text-slate-500">{student.subtitle}</span>
                    </span>
                    {student.active && <span className="material-icons-outlined text-base">check_circle</span>}
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </header>
  )
}

function FilterPanel() {
  return (
    <section className="space-y-2">
      <div className={`flex gap-2 overflow-x-auto pb-2 pr-4 ${softScroll}`}>
        {subjectFilters.map((filter) => (
          <button
            key={filter.label}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold shadow-sm ${
              filter.active ? 'border-primary/20 bg-primary/10 text-primary' : 'border-white/60 bg-white/65 text-slate-600'
            }`}
          >
            <span className="material-icons-outlined text-lg" style={{ color: filter.color }}>
              {filter.icon}
            </span>
            {filter.label}
          </button>
        ))}
      </div>

      <div className={`flex items-center gap-3 overflow-x-auto py-2 pr-4 ${softScroll}`}>
        {typeFilters.map((filter) => (
          <button
            key={filter.label}
            className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-bold ${
              filter.active ? 'border border-primary/20 bg-primary/10 text-primary' : 'bg-white/55 text-slate-600'
            }`}
            style={!filter.active ? { color: filter.color } : undefined}
          >
            <span className="material-icons-outlined text-base">{filter.icon}</span>
            {filter.label}
          </button>
        ))}
        <div className="flex-grow" />
        <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500">
          <span className="material-icons-outlined text-xl">calendar_month</span>
        </button>
        <div className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-white/70 bg-white/80 px-3 shadow-sm">
          <button className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500">
            <span className="material-icons-outlined text-base">chevron_left</span>
          </button>
          <span className="mx-2 whitespace-nowrap text-xs font-bold text-slate-700">{'\u672c\u6708'}</span>
          <button className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500">
            <span className="material-icons-outlined text-base">chevron_right</span>
          </button>
        </div>
      </div>
    </section>
  )
}

function PaperThumb({ color, index }: { color: string; index: number }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-white p-1.5">
      <div className="mb-1 h-1.5 w-6 rounded-full" style={{ backgroundColor: tint(color, 0.28) }} />
      <div className="space-y-1">
        <div className="h-1 rounded-full bg-slate-200" />
        <div className="h-1 w-4/5 rounded-full bg-slate-200" />
        <div className="h-1 w-3/5 rounded-full bg-slate-200" />
      </div>
      <div className="absolute bottom-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ backgroundColor: color }}>
        {index + 1}
      </div>
    </div>
  )
}

function AssessmentCard({ record, wide = false }: { record: RecordItem; wide?: boolean }) {
  return (
    <article
      className={`border border-white/70 border-l-4 bg-white/90 shadow-sm ${wide ? 'rounded-2xl p-5' : 'rounded-3xl p-5'}`}
      style={{ borderLeftColor: record.color }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: tint(record.color, 0.12), color: record.color }}>
            <span className="material-icons-outlined text-3xl">{record.icon}</span>
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-bold leading-7" style={{ color: record.color }}>
              {record.subject}
            </h3>
            <p className="line-clamp-2 text-sm font-semibold text-slate-800">{record.title}</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold" style={{ backgroundColor: tint(record.color, 0.12), color: record.color }}>
              <span className="material-icons-outlined text-sm">fact_check</span>
              {record.type}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-5xl font-black leading-none text-slate-700">{record.score}</span>
          {record.unit && <span className="ml-1 text-xs font-semibold text-slate-500">{record.unit}</span>}
        </div>
      </div>

      <p className="mt-4 rounded-2xl bg-slate-50/80 px-3 py-2 text-sm leading-6 text-slate-600">{record.note}</p>

      {record.mistakes && (
        <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/80 px-3 py-2.5">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-rose-600">
            <span className="material-icons-outlined text-base">error_outline</span>
            {'\u932f\u984c'} {record.mistakes.length} {'\u984c'}
          </div>
          <div className="space-y-1.5">
            {record.mistakes.slice(0, wide ? 1 : 2).map((mistake) => (
              <p key={mistake} className="text-xs font-semibold leading-5 text-rose-700">{mistake}</p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="flex gap-2">
          {Array.from({ length: record.images }).map((_, index) => (
            <div key={`${record.id}-${index}`} className="h-10 w-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
              <PaperThumb color={record.color} index={index} />
            </div>
          ))}
        </div>
        <p className="text-xs font-semibold text-slate-500">{record.date}</p>
      </div>
    </article>
  )
}

function NarrowLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  return (
    <div className="min-h-screen overflow-x-hidden bg-app-shell text-slate-800 lg:hidden">
      <div className="mx-auto min-h-screen w-full max-w-md bg-white/10 pt-28 shadow-[0_0_80px_rgba(15,23,42,0.12)]">
        <FloatingStudentNav isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

        <main id="assessments" className="space-y-4 px-5 pb-24">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="material-icons-outlined rounded-xl bg-white/70 p-1.5 text-primary shadow-sm">analytics</span>
              <h2 className="text-2xl font-black text-slate-800">{'\u8a55\u91cf\u7d00\u9304'}</h2>
            </div>
            <div className="ml-auto flex gap-2">
              <button className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-3 text-sm font-bold text-primary shadow-sm">
                <span className="material-icons-outlined text-base">print</span>
                {'\u5217\u5370'}
              </button>
              <button className="student-toolbar-primary inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold">
                <span className="material-icons-outlined text-base">add_circle</span>
                {'\u65b0\u589e'}
              </button>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-6 text-slate-600">{'\u8a18\u9304\u674e\u627f\u65b0\u7684\u8003\u8a66\u3001\u5c0f\u8003\u3001\u4f5c\u696d\u8207\u6b78\u6a94\u5716\u7247\u3002'}</p>
            <button
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-4 text-sm font-bold text-primary shadow-sm hover:bg-primary/10"
              aria-expanded={isFilterOpen}
              onClick={() => setIsFilterOpen((value) => !value)}
            >
              <span className="material-icons-outlined text-lg">{isFilterOpen ? 'filter_alt_off' : 'filter_list'}</span>
              {'\u7be9\u9078'}
            </button>
          </div>

          {isFilterOpen && <FilterPanel />}

          <section id="overview" className="grid grid-cols-3 gap-2">
            {[
              ['\u672c\u6708\u5e73\u5747', '91'],
              ['\u8a55\u91cf\u6578', '12'],
              ['\u5716\u7247', '8'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/75 px-3 py-3 shadow-sm">
                <p className="text-xs font-bold text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-black text-slate-700">{value}</p>
              </div>
            ))}
          </section>

          <section className="space-y-3" aria-label="student assessment records">
            {records.map((record) => (
              <AssessmentCard key={record.id} record={record} />
            ))}
          </section>
        </main>
      </div>
    </div>
  )
}

function WideLayout() {
  return (
    <div className="hidden min-h-screen bg-app-shell p-8 text-slate-800 lg:flex lg:items-start lg:justify-center">
      <div className="glass-panel flex min-h-[90vh] w-full max-w-7xl gap-8 rounded-3xl p-8">
        <aside className="w-80 shrink-0">
          <div className="sticky top-8 rounded-3xl border border-white/70 bg-white/65 p-5 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full bg-white shadow-sm ring-4 ring-white/70">
                <StudentAvatar />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800">{'\u674e\u627f\u65b0'}</h1>
                <p className="text-sm font-semibold text-primary">{'\u5b78\u751f\u5de5\u4f5c\u5340'}</p>
              </div>
            </div>

            <nav className="mt-6 space-y-2">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-bold transition-colors ${
                    item.active ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:bg-white/65'
                  }`}
                >
                  <span className="material-icons-outlined text-xl">{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="material-icons-outlined rounded-2xl bg-white/60 p-2 text-3xl text-primary shadow-sm">analytics</span>
              <div>
                <h2 className="text-3xl font-black text-slate-800">{'\u8a55\u91cf\u7d00\u9304'}</h2>
                <p className="mt-1 text-sm text-slate-600">{'\u5bec\u7248\u7dad\u6301 sidebar + main \u7684\u5b78\u751f\u5de5\u4f5c\u5340\u7248\u578b\u3002'}</p>
              </div>
            </div>
          </div>

          <section className="grid grid-cols-2 gap-4" aria-label="wide student assessment records">
            {records.map((record) => (
              <AssessmentCard key={record.id} record={record} wide />
            ))}
          </section>
        </main>
      </div>
    </div>
  )
}

export default function StudentAssessmentsResponsiveDemoPage() {
  return (
    <>
      <NarrowLayout />
      <WideLayout />
    </>
  )
}
