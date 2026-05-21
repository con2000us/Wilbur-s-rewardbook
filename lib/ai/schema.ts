/**
 * Zod schema for validating AI model JSON output.
 *
 * The schema is intentionally lenient on nullable fields because
 * AI models can be inconsistent. The parent confirm step handles
 * missing / incorrect data.
 */

import { z } from 'zod'

export const mistakeItemSchema = z.object({
  question_number: z.string().nullable().optional().default(null),
  student_answer: z.string().nullable().optional().default(null),
  correct_answer: z.string().nullable().optional().default(null),
  mistake_type: z.string().nullable().optional().default(null),
  knowledge_point: z.string().nullable().optional().default(null),
  ai_reason: z.string().nullable().optional().default(null),
  confidence: z.number().min(0).max(1).nullable().optional().default(null),
})

export const uncertaintyItemSchema = z.object({
  field: z.string(),
  reason: z.string(),
})

export const assessmentJsonSchema = z
  .object({
    subject: z.string().min(1, 'Subject is required'),
    title: z.string().optional().default(''),
    assessment_type: z
      .enum(['exam', 'homework', 'quiz', 'project'])
      .nullable()
      .optional()
      .default(null),
    score: z
      .number()
      .min(0)
      .nullable()
      .optional()
      .default(null),
    max_score: z
      .number()
      .min(0)
      .nullable()
      .optional()
      .default(null),
    assessment_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
      .nullable()
      .optional()
      .default(null),
    mistakes: z.array(mistakeItemSchema).optional().default([]),
    uncertainties: z.array(uncertaintyItemSchema).optional().default([]),
    confidence: z.number().min(0).max(1).optional().default(0),
  })
  .refine(
    (data) => {
      // If score is provided but max_score isn't, that's invalid
      if (data.score !== null && data.max_score === null) {
        return false
      }
      // Score must not exceed max_score
      if (data.score !== null && data.max_score !== null && data.score > data.max_score) {
        return false
      }
      return true
    },
    {
      message: 'Score must not exceed max_score, and max_score is required when score is provided',
    }
  )

export type AssessmentJsonOutput = z.infer<typeof assessmentJsonSchema>
export type MistakeItem = z.infer<typeof mistakeItemSchema>
export type UncertaintyItem = z.infer<typeof uncertaintyItemSchema>

/**
 * Validate raw JSON from the LLM.
 * Returns { success: true, data } or { success: false, errors }.
 */
export function validateAssessmentJson(raw: unknown) {
  const result = assessmentJsonSchema.safeParse(raw)
  if (result.success) {
    return { success: true as const, data: result.data }
  }
  return {
    success: false as const,
    errors: result.error.flatten(),
  }
}
