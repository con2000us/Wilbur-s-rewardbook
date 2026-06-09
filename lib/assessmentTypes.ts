export interface AssessmentType {
  id?: string
  type_key: string
  display_name: string
  icon: string
  color: string | null
  display_order: number | null
  is_active?: boolean | null
  is_system?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

export const DEFAULT_ASSESSMENT_TYPE_KEY = 'exam'

export const DEFAULT_ASSESSMENT_TYPES: AssessmentType[] = [
  {
    type_key: 'exam',
    display_name: 'Exam',
    icon: 'assignment',
    color: '#dc2626',
    display_order: 1,
    is_active: true,
    is_system: true,
  },
  {
    type_key: 'quiz',
    display_name: 'Quiz',
    icon: 'checklist_rtl',
    color: '#2563eb',
    display_order: 2,
    is_active: true,
    is_system: true,
  },
  {
    type_key: 'homework',
    display_name: 'Homework',
    icon: 'edit_note',
    color: '#16a34a',
    display_order: 3,
    is_active: true,
    is_system: true,
  },
  {
    type_key: 'project',
    display_name: 'Project',
    icon: 'palette',
    color: '#9333ea',
    display_order: 4,
    is_active: true,
    is_system: true,
  },
]

export function sortAssessmentTypes(types: AssessmentType[]) {
  return [...types].sort((a, b) => {
    const orderA = a.display_order ?? 999
    const orderB = b.display_order ?? 999
    if (orderA !== orderB) return orderA - orderB
    return a.display_name.localeCompare(b.display_name)
  })
}

export function normalizeAssessmentTypes(
  types: AssessmentType[] | null | undefined,
  currentTypeKey?: string | null
) {
  const source = types || []
  const map = new Map<string, AssessmentType>()

  source.forEach((type) => {
    if (!type.type_key) return
    map.set(type.type_key, {
      ...type,
      display_name: type.display_name || type.type_key,
      icon: type.icon || 'assignment',
      color: type.color || '#64748b',
    })
  })

  if (currentTypeKey && !map.has(currentTypeKey)) {
    map.set(currentTypeKey, {
      type_key: currentTypeKey,
      display_name: currentTypeKey,
      icon: 'assignment',
      color: '#64748b',
      display_order: 999,
      is_active: false,
      is_system: false,
    })
  }

  return sortAssessmentTypes(Array.from(map.values()))
}

export function getDefaultAssessmentTypeKey(types: AssessmentType[] | null | undefined) {
  const options = normalizeAssessmentTypes(types).filter((type) => type.is_active !== false)
  return options[0]?.type_key || DEFAULT_ASSESSMENT_TYPE_KEY
}

export function getAssessmentTypeByKey(
  types: AssessmentType[] | null | undefined,
  typeKey?: string | null
) {
  if (!typeKey) return null
  return normalizeAssessmentTypes(types, typeKey).find((type) => type.type_key === typeKey) || null
}

export function getAssessmentTypeLabel(
  types: AssessmentType[] | null | undefined,
  typeKey?: string | null,
  fallback = 'Assessment'
) {
  const type = getAssessmentTypeByKey(types, typeKey)
  return type?.display_name || typeKey || fallback
}

export function getAssessmentTypeIcon(
  types: AssessmentType[] | null | undefined,
  typeKey?: string | null
) {
  return getAssessmentTypeByKey(types, typeKey)?.icon || 'assignment'
}

export function getAssessmentTypeColor(
  types: AssessmentType[] | null | undefined,
  typeKey?: string | null
) {
  return getAssessmentTypeByKey(types, typeKey)?.color || '#64748b'
}

export function generateAssessmentTypeKey(displayName: string) {
  const cleaned = displayName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)

  if (cleaned) return cleaned

  const codes = Array.from(displayName.trim())
    .slice(0, 4)
    .map((char) => char.codePointAt(0)?.toString(36) || '')
    .join('')

  return codes ? `custom_${codes}` : `custom_${Math.random().toString(36).slice(2, 10)}`
}
