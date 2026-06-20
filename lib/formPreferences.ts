'use client'

const STORAGE_KEY = 'wilbur_form_prefs'

export interface FormPreferences {
  subjectId?: string
  assessmentType?: string
  scoreType?: 'numeric' | 'letter' | 'record_only'
}

function getStorage(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setStorage(data: Record<string, string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage full or unavailable
  }
}

export function getFormPreferences(): FormPreferences {
  return getStorage() as FormPreferences
}

export function setFormPreferences(prefs: FormPreferences) {
  const current = getStorage()
  const merged = { ...current, ...prefs }
  setStorage(merged)
}
