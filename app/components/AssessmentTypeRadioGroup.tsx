'use client'

import {
  normalizeAssessmentTypes,
  type AssessmentType,
} from '@/lib/assessmentTypes'

interface AssessmentTypeRadioGroupProps {
  assessmentTypes: AssessmentType[]
  selectedType: string
  onChange: (typeKey: string) => void
  currentType?: string | null
  compact?: boolean
  inactiveLabel?: string
}

export default function AssessmentTypeRadioGroup({
  assessmentTypes,
  selectedType,
  onChange,
  currentType,
  compact = false,
  inactiveLabel = 'Inactive',
}: AssessmentTypeRadioGroupProps) {
  const options = normalizeAssessmentTypes(assessmentTypes, currentType || selectedType)

  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-5' : 'grid-cols-2'}`}>
      {options.map((type) => {
        const disabled = type.is_active === false && type.type_key !== currentType
        return (
          <label
            key={type.type_key}
            className={`relative flex cursor-pointer border-2 border-gray-300 transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:shadow-md hover:border-blue-400 hover:bg-blue-50 ${
              compact
                ? 'flex-col items-center gap-1 rounded-lg p-2'
                : 'items-center gap-3 rounded-lg p-3'
            } ${disabled ? 'opacity-50' : ''}`}
          >
            <input
              type="radio"
              name="assessment_type"
              value={type.type_key}
              checked={selectedType === type.type_key}
              onChange={(event) => onChange(event.target.value)}
              required
              disabled={disabled}
              className={compact
                ? 'absolute right-1 top-1 h-4 w-4 accent-blue-600'
                : 'h-5 w-5 accent-blue-600'
              }
            />
            <span
              className={`material-icons-outlined ${compact ? 'text-2xl' : 'text-lg'}`}
              style={{ color: type.color || '#64748b' }}
              aria-hidden="true"
            >
              {type.icon || 'assignment'}
            </span>
            <span className={`${compact ? 'text-center text-sm' : 'text-lg'} font-medium text-gray-800`}>
              {type.display_name || type.type_key}
            </span>
            {type.is_active === false && type.type_key === currentType && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                {inactiveLabel}
              </span>
            )}
          </label>
        )
      })}
    </div>
  )
}
