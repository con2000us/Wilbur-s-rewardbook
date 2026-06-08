'use client'

import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { parseStudentAvatar } from '@/lib/utils/studentTheme'
import StudentModal from './StudentModal'
import AppActionCluster from './AppActionCluster'

interface Student {
  id: string
  name: string
  email: string | null
  avatar_url: string | null
  display_order: number
}

interface StudentSummary {
  student_id: string
  total_subjects: number | null
  total_assessments: number | null
  completed_assessments: number | null
  total_earned: number | string | null
  total_spent: number | string | null
  balance: number | string | null
}

interface RewardType {
  id: string
  type_key: string
  display_name: string
  icon: string
  default_unit: string | null
  display_order: number | null
}

interface Props {
  students: Student[]
  siteName: string
  studentSummaries?: StudentSummary[]
  studentAverageScores?: Record<string, number>
  rewardTypes?: RewardType[]
}

const REWARD_STAT_VARIANTS = ['records', 'subjects', 'passbook', 'rewards'] as const

const ASSESSMENT_TYPE_ICONS: Record<string, string> = {
  exam: 'assignment',
  quiz: 'checklist_rtl',
  homework: 'edit_note',
  project: 'palette',
}

const rewardCenterChildren = [
  {
    href: '/settings/rewards?tab=rewardTypes',
    icon: 'category',
    labelKey: 'rewardTypes.title' as const,
    descKey: 'rewardTypes.desc' as const,
  },
  {
    href: '/settings/rewards?tab=achievementEvents',
    icon: 'emoji_events',
    labelKey: 'achievementEvents.title' as const,
    descKey: 'achievementEvents.desc' as const,
  },
  {
    href: '/settings/rewards?tab=goalTemplates',
    icon: 'flag',
    labelKey: 'majorGoals.title' as const,
    descKey: 'majorGoals.desc' as const,
  },
  {
    href: '/settings/rewards?tab=exchangeRules',
    icon: 'rule',
    labelKey: 'exchangeRules.title' as const,
    descKey: 'exchangeRules.desc' as const,
  },
]

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(toNumber(value))
}

function formatAverageScore(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return '—'
  }
  return value.toFixed(1)
}

function isRewardIconEmoji(icon: string) {
  return (
    /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(icon) ||
    icon.length <= 2 ||
    !/^[a-z_]+$/i.test(icon)
  )
}

function RewardTypeIcon({ icon }: { icon: string }) {
  if (isRewardIconEmoji(icon)) {
    return <span className="text-lg leading-none">{icon}</span>
  }
  return <span className="material-symbols-outlined text-[21px]">{icon}</span>
}

type SubjectAverage = {
  id: string
  name: string
  icon: string
  color: string
  average: number | null
  recentAssessments?: Array<{
    title: string
    date: string | null
    percentage: number
    assessment_type: string | null
  }>
}

function getAssessmentTypeIcon(type: string | null | undefined) {
  if (!type) return 'assignment'
  return ASSESSMENT_TYPE_ICONS[type] || 'assignment'
}

function StudentCard({
  student,
  summary,
  averageScore,
  selected,
  onSelect,
  labels,
}: {
  student: Student
  summary?: StudentSummary
  averageScore?: number
  selected: boolean
  onSelect: () => void
  labels: {
    selectedLabel: string
    workspaceLabel: string
    statSubjects: string
    statAssessments: string
    statAverageScore: string
    actions: Array<{
      icon: string
      shortLabel: string
      label: string
      href: string
      variant: 'records' | 'subjects' | 'passbook' | 'rewards'
      filled?: boolean
    }>
  }
}) {
  const avatar = parseStudentAvatar(student.avatar_url, student.name)
  const subjectCount = toNumber(summary?.total_subjects)
  const assessmentCount = toNumber(summary?.total_assessments)
  const tintStyle = { '--student-tint': avatar.hex } as CSSProperties

  return (
    <article
      className={`home-student-card ${selected ? 'is-selected' : ''}`}
      style={tintStyle}
      aria-label={`${student.name} 學生卡片`}
    >
      <div
        className="home-student-card-body home-student-card-body-selectable"
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect()
          }
        }}
      >
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex min-w-0 items-center gap-3 text-left">
            <span
              className="home-student-avatar"
              style={{ background: avatar.gradientStyle }}
              aria-hidden="true"
            >
              {avatar.emoji}
            </span>
            <div className="min-w-0">
              <h3 className="mt-[3px] truncate text-lg font-bold text-slate-800">{student.name}</h3>
            </div>
          </div>
          <div
            className="home-stat-strip mb-0 mx-auto grid grid-cols-3 p-3"
            style={{ background: 'transparent', border: 0, boxShadow: 'none' }}
          >
            <div className="flex min-w-[61px] flex-col items-center">
              <span className="home-stat-value text-primary">{formatAverageScore(averageScore)}</span>
              <span className="home-stat-label">{labels.statAverageScore}</span>
            </div>
            <div className="home-stat-cell-divider flex flex-col items-center">
              <span className="home-stat-value">{assessmentCount}</span>
              <span className="home-stat-label">{labels.statAssessments}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="home-stat-value">{subjectCount}</span>
              <span className="home-stat-label">{labels.statSubjects}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="student-action-dock grid grid-cols-4 gap-1">
        {labels.actions.map((action) => (
          <Link
            key={action.icon}
            href={action.href}
            className={`student-action-btn ${action.variant}`}
            title={action.label}
            aria-label={action.label}
          >
            <span
              className="material-symbols-outlined"
              style={action.filled ? { fontVariationSettings: '"FILL" 1' } : undefined}
            >
              {action.icon}
            </span>
            <span>{action.shortLabel}</span>
          </Link>
        ))}
      </div>
    </article>
  )
}

function SelectedStudentBar({
  student,
  rewardTypes,
  labels,
  isOpen,
  onClose,
}: {
  student: Student
  rewardTypes: RewardType[]
  labels: {
    selectedLabel: string
    openStudentPage: string
    noSubjectAverage: string
    loadingSubjectAverages: string
    recentScoresLabel: string
    recentScoreDateLabel: string
  }
  isOpen: boolean
  onClose: () => void
}) {
  const avatar = parseStudentAvatar(student.avatar_url, student.name)
  const tintStyle = { '--student-tint': avatar.hex } as CSSProperties
  const [rewardStats, setRewardStats] = useState<Record<string, { currentBalance: number }>>({})
  const [statsLoading, setStatsLoading] = useState(false)
  const [subjectAverages, setSubjectAverages] = useState<SubjectAverage[]>([])
  const [subjectAveragesLoading, setSubjectAveragesLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  useEffect(() => {
    let cancelled = false
    setStatsLoading(true)

    fetch(`/api/students/${student.id}/reward-stats`)
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !data.success || !data.stats) {
          return
        }
        setRewardStats(data.stats)
      })
      .catch(() => {
        if (!cancelled) {
          setRewardStats({})
        }
      })
      .finally(() => {
        if (!cancelled) {
          setStatsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [student.id])

  useEffect(() => {
    let cancelled = false
    setSubjectAveragesLoading(true)

    fetch(`/api/students/${student.id}/subject-averages`)
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !data.success || !Array.isArray(data.subjects)) {
          return
        }
        setSubjectAverages(data.subjects)
      })
      .catch(() => {
        if (!cancelled) {
          setSubjectAverages([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSubjectAveragesLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [student.id])

  if (!isOpen || !mounted) {
    return null
  }

  const popupContent = (
    <div
      className="home-selected-student-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="home-selected-student-popup-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${student.name} ${labels.selectedLabel}`}
      >
        <div className="home-selected-student home-selected-student-popup" style={tintStyle}>
          <button
            type="button"
            className="home-selected-student-close"
            onClick={onClose}
            aria-label="關閉"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>

          <div className="home-selected-overview home-selected-overview-stacked">
            <div className="home-selected-identity flex min-w-0 items-center gap-4">
              <span
                className="home-selected-avatar"
                style={{ background: avatar.gradientStyle }}
                aria-hidden="true"
              >
                {avatar.emoji}
              </span>
              <div className="min-w-0 text-left">
                <p className="home-current-student-label">{labels.selectedLabel}</p>
                <h3 className="truncate text-lg font-bold text-slate-800 sm:text-xl">{student.name}</h3>
              </div>
            </div>

            <div className="home-stat-strip home-subject-stat-strip home-subject-stat-strip-popup grid p-3">
              {subjectAveragesLoading ? (
                <div className="home-subject-stat-cell flex flex-col items-center justify-center">
                  <span className="home-stat-label home-subject-stat-placeholder">{labels.loadingSubjectAverages}</span>
                </div>
              ) : subjectAverages.length === 0 ? (
                <div className="home-subject-stat-cell flex flex-col items-center justify-center">
                  <span className="home-stat-label home-subject-stat-placeholder">{labels.noSubjectAverage}</span>
                </div>
              ) : (
                subjectAverages.map((subject) => {
                  const subjectColor = subject.color || '#4a9eff'
                  const cellStyle = {
                    '--subject-color': subjectColor,
                  } as CSSProperties

                  return (
                    <div key={subject.id} className="home-subject-stat-group" style={cellStyle}>
                      <div
                        className="home-subject-stat-cell flex flex-col items-center"
                        title={`${subject.name} ${subject.average != null ? subject.average.toFixed(1) : '—'}`}
                      >
                        <span className="home-stat-value">
                          {subject.average != null ? subject.average.toFixed(1) : '—'}
                        </span>
                        <span className="home-stat-label">{subject.name}</span>
                      </div>
                      {subject.recentAssessments && subject.recentAssessments.length > 0 ? (
                        <>
                          <div className="home-subject-recent-label">
                            <span>{labels.recentScoresLabel}</span>
                            <span>{labels.recentScoreDateLabel}</span>
                          </div>
                          <div className="home-subject-recent-scores">
                            {subject.recentAssessments.map((assessment, scoreIndex) => (
                              <div
                                key={`${subject.id}-${scoreIndex}`}
                                className="home-subject-recent-score-row"
                                title={assessment.title}
                              >
                                <span className="home-subject-recent-score-primary">
                                  <span
                                    className="material-symbols-outlined home-subject-recent-score-icon"
                                    aria-hidden="true"
                                  >
                                    {getAssessmentTypeIcon(assessment.assessment_type)}
                                  </span>
                                  <span className="home-subject-recent-score-value">
                                    {assessment.percentage.toFixed(1)}
                                  </span>
                                </span>
                                <span className="home-subject-recent-score-title">{assessment.title}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>

            <div className="home-selected-actions home-selected-actions-stacked">
              {rewardTypes.map((type, index) => {
                const variant = REWARD_STAT_VARIANTS[index % REWARD_STAT_VARIANTS.length]
                const balance = rewardStats[type.id]?.currentBalance ?? 0
                const unit = type.default_unit ? ` ${type.default_unit}` : ''
                const title = `${type.display_name}: ${formatNumber(balance)}${unit}`

                return (
                  <div
                    key={type.id}
                    className={`home-selected-reward-stat ${variant}`}
                    title={title}
                    aria-label={title}
                  >
                    <RewardTypeIcon icon={type.icon || '🎁'} />
                    <span className="home-selected-reward-stat-label">{type.display_name}</span>
                    <span className="text-[10px] font-extrabold text-slate-700">
                      {statsLoading ? '…' : formatNumber(balance)}
                    </span>
                  </div>
                )
              })}
            </div>

            <Link href={`/student/${student.id}`} className="home-selected-enter-link home-selected-enter-link-stacked">
              {labels.openStudentPage}
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(popupContent, document.body)
}

export default function HomePageClient({
  students,
  siteName,
  studentSummaries = [],
  studentAverageScores = {},
  rewardTypes = [],
}: Props) {
  const t = useTranslations('home')
  const tCommon = useTranslations('common')
  const tNav = useTranslations('student.mobileBottomNav')
  const tGm = useTranslations('home.globalManagement')

  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false)
  const [isSelectedStudentPopupOpen, setIsSelectedStudentPopupOpen] = useState(false)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(students[0]?.id || null)
  const orderedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const orderA = a.display_order ?? 0
      const orderB = b.display_order ?? 0
      return sortDirection === 'asc' ? orderA - orderB : orderB - orderA
    })
  }, [students, sortDirection])

  const summariesByStudent = useMemo(() => {
    return new Map(studentSummaries.map((summary) => [summary.student_id, summary]))
  }, [studentSummaries])

  const selectedStudentIdResolved =
    orderedStudents.find((s) => s.id === selectedStudentId)?.id || orderedStudents[0]?.id

  const cardLabels = useMemo(
    () => ({
      selectedLabel: t('selected'),
      workspaceLabel: t('workspaceLabel'),
      statSubjects: t('statSubjects'),
      statAssessments: t('statAssessments'),
      statAverageScore: t('statAverageScore'),
      openStudentPage: t('openStudentPage'),
      noSubjectAverage: t('noSubjectAverage'),
      loadingSubjectAverages: t('loadingSubjectAverages'),
      recentScoresLabel: t('recentScoresLabel'),
      recentScoreDateLabel: t('recentScoreDateLabel'),
      actions: [
        {
          icon: 'assignment',
          shortLabel: t('statAssessments'),
          label: '',
          href: '',
          variant: 'records' as const,
        },
        {
          icon: 'menu_book',
          shortLabel: tNav('subjects'),
          label: '',
          href: '',
          variant: 'subjects' as const,
        },
        {
          icon: 'account_balance_wallet',
          shortLabel: tNav('passbook'),
          label: '',
          href: '',
          variant: 'passbook' as const,
        },
        {
          icon: 'stars',
          shortLabel: tNav('rewards'),
          label: '',
          href: '',
          variant: 'rewards' as const,
          filled: true,
        },
      ],
    }),
    [t, tNav]
  )

  const buildStudentActions = (student: Student) =>
    cardLabels.actions.map((action, index) => {
      const paths = [
        `/student/${student.id}`,
        `/student/${student.id}/subjects`,
        `/student/${student.id}/transactions`,
        `/student/${student.id}/rewards`,
      ]
      const labelsFull = [
        `${student.name} · ${tNav('records')}`,
        `${student.name} · ${tNav('subjects')}`,
        `${student.name} · ${tNav('passbook')}`,
        `${student.name} · ${tNav('rewards')}`,
      ]
      return {
        ...action,
        href: paths[index],
        label: labelsFull[index],
      }
    })

  const selectedStudent = orderedStudents.find((s) => s.id === selectedStudentIdResolved)

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId)
    setIsSelectedStudentPopupOpen(true)
  }

  const rewardManagementItems = [
    {
      href: '/settings/rewards',
      icon: 'storefront',
      title: tGm('rewardsCenter.title'),
      desc: tGm('rewardsCenter.desc'),
      tone: 'primary',
    },
    ...rewardCenterChildren.map((item, index) => ({
      href: item.href,
      icon: item.icon,
      title: tGm(item.labelKey),
      desc: tGm(item.descKey),
      tone: ['cyan', 'gold', 'rose', 'slate'][index],
    })),
  ]

  return (
    <div className="min-h-screen bg-app-shell p-4 text-slate-800 antialiased sm:p-6 md:p-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="home-dashboard-header">
          <div className="flex min-w-0 items-center gap-4">
            <div className="home-brand-icon">
              <span
                className="material-symbols-outlined text-3xl"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                auto_stories
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-slate-800 md:text-3xl">{siteName}</h1>
              <p className="mt-1 text-sm text-slate-500">{t('dashboardSubtitle')}</p>
            </div>
          </div>

          <AppActionCluster ariaLabel={tCommon('home')} />
        </header>

        <main className="space-y-6">
          <section className="home-section-panel p-5 sm:p-6">
            <div className="home-section-header mb-5">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-800 sm:text-xl">{t('workspaceTitle')}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    {t('studentCount', { count: orderedStudents.length })}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{t('workspaceSubtitle')}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
                  className="home-secondary-button"
                >
                  <span className="material-symbols-outlined text-lg">sort</span>
                  {t('reorderStudents')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddStudentModalOpen(true)}
                  className="home-primary-button"
                >
                  <span className="material-symbols-outlined text-lg">person_add</span>
                  {t('addStudent')}
                </button>
              </div>
            </div>

            {orderedStudents.length === 0 ? (
              <div className="home-empty-state-block">
                <span className="material-symbols-outlined text-4xl text-primary">person_add</span>
                <div>
                  <p className="text-lg font-semibold text-slate-700">{t('noStudents')}</p>
                  <p className="mt-1 text-sm text-slate-500">{t('noStudentsDesc')}</p>
                </div>
                <button type="button" onClick={() => setIsAddStudentModalOpen(true)} className="home-primary-button">
                  {t('addFirstStudent')}
                </button>
              </div>
            ) : (
              <div className="home-student-grid">
                {orderedStudents.map((student) => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    summary={summariesByStudent.get(student.id)}
                    averageScore={studentAverageScores[student.id]}
                    selected={student.id === selectedStudentIdResolved}
                    onSelect={() => handleStudentSelect(student.id)}
                    labels={{ ...cardLabels, actions: buildStudentActions(student) }}
                  />
                ))}
                <button
                  type="button"
                  className="home-add-student-card"
                  onClick={() => setIsAddStudentModalOpen(true)}
                >
                  <span className="home-add-student-icon">
                    <span className="material-symbols-outlined text-3xl">person_add</span>
                  </span>
                  <span className="text-lg font-bold text-slate-700">{t('addStudent')}</span>
                  <span className="max-w-[220px] text-center text-sm leading-5 text-slate-500">
                    {t('addStudentDesc')}
                  </span>
                </button>
              </div>
            )}
          </section>

          <section className="home-section-panel p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-800 sm:text-xl">{t('rewardsManagementTitle')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('rewardsManagementSubtitle')}</p>
            </div>

            <div className="home-management-command-grid">
              {rewardManagementItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`home-management-command-card ${item.tone}`}
                  aria-label={item.title}
                >
                  <span className="home-management-command-icon">
                    <span className="material-symbols-outlined text-3xl">{item.icon}</span>
                  </span>
                  <span className="text-center text-base font-bold text-slate-700">{item.title}</span>
                  <span className="line-clamp-2 text-center text-xs leading-5 text-slate-500">{item.desc}</span>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>

      {selectedStudent ? (
        <SelectedStudentBar
          student={selectedStudent}
          rewardTypes={rewardTypes}
          labels={cardLabels}
          isOpen={isSelectedStudentPopupOpen}
          onClose={() => setIsSelectedStudentPopupOpen(false)}
        />
      ) : null}

      <StudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onSuccess={() => {
          window.location.reload()
        }}
      />
    </div>
  )
}
