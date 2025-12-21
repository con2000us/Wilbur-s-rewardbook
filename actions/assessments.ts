'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calculateReward, calculatePercentage } from '@/lib/utils'

// 獲取所有評量
export async function getAssessments(subjectId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('subject_id', subjectId)
    .order('due_date', { ascending: false })
  
  if (error) {
    console.error('Error fetching assessments:', error)
    return []
  }
  
  return data
}

// 創建新評量
export async function createAssessment(formData: {
  subject_id: string
  student_id: string
  title: string
  assessment_type: 'exam' | 'homework' | 'quiz' | 'project'
  score?: number
  max_score?: number
  due_date?: string
  status?: 'upcoming' | 'completed' | 'graded'
  notes?: string
}) {
  const supabase = createClient()
  
  // 準備數據
  const assessmentData: any = {
    subject_id: formData.subject_id,
    title: formData.title,
    assessment_type: formData.assessment_type,
    max_score: formData.max_score || 100,
    status: formData.status || 'upcoming',
    due_date: formData.due_date || null,
    notes: formData.notes || null,
  }
  
  // 如果有分數，計算相關數據
  if (formData.score !== undefined && formData.score !== null) {
    assessmentData.score = formData.score
    assessmentData.percentage = calculatePercentage(formData.score, assessmentData.max_score)
    assessmentData.status = 'completed'
    assessmentData.completed_date = new Date().toISOString()
    
    // 獲取獎勵規則並計算獎金
    const { data: rules } = await supabase
      .from('reward_rules')
      .select('*')
      .eq('student_id', formData.student_id)
      .eq('is_active', true)
    
    if (rules && rules.length > 0) {
      const reward = calculateReward(formData.score, rules)
      assessmentData.reward_amount = reward.amount
      
      // 如果有獎金，創建交易記錄
      if (reward.amount > 0) {
        const { data: insertedAssessment } = await supabase
          .from('assessments')
          .insert(assessmentData)
          .select()
          .single()
        
        if (insertedAssessment) {
          const assessment = insertedAssessment as { id: string }
          await supabase.from('transactions').insert({
            student_id: formData.student_id,
            assessment_id: assessment.id,
            transaction_type: 'earn',
            amount: reward.amount,
            description: `${formData.title} - ${reward.ruleName}`,
            category: '測驗獎金'
          } as any)
        }
        
        revalidatePath(`/student/${formData.student_id}`)
        return { success: true, data: insertedAssessment }
      }
    }
  }
  
  // 插入評量
  const { data, error } = await supabase
    .from('assessments')
    .insert(assessmentData)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating assessment:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath(`/student/${formData.student_id}`)
  return { success: true, data }
}

// 更新評量
export async function updateAssessment(
  id: string, 
  studentId: string,
  updates: Partial<{
    title: string
    score: number
    status: 'upcoming' | 'completed' | 'graded'
    notes: string
  }>
) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('assessments')
    .update(updates as any)
    .eq('id', id)
  
  if (error) {
    console.error('Error updating assessment:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath(`/student/${studentId}`)
  return { success: true }
}

// 刪除評量
export async function deleteAssessment(id: string, studentId: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('assessments')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting assessment:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath(`/student/${studentId}`)
  return { success: true }
}

// 標記評量為完成並添加分數
export async function gradeAssessment(
  id: string,
  studentId: string,
  score: number
) {
  const supabase = createClient()
  
  // 獲取評量和獎勵規則
  const { data: assessment } = await supabase
    .from('assessments')
    .select('*, subjects!inner(student_id)')
    .eq('id', id)
    .single()
  
  if (!assessment) {
    return { success: false, error: 'Assessment not found' }
  }
  
  const { data: rules } = await supabase
    .from('reward_rules')
    .select('*')
    .eq('student_id', studentId)
    .eq('is_active', true)
  
  const reward = calculateReward(score, rules || [])
  const percentage = calculatePercentage(score, assessment.max_score)
  
  // 更新評量
  const { error: updateError } = await supabase
    .from('assessments')
    .update({
      score,
      percentage,
      reward_amount: reward.amount,
      status: 'graded',
      completed_date: new Date().toISOString()
    })
    .eq('id', id)
  
  if (updateError) {
    return { success: false, error: updateError.message }
  }
  
  // 創建交易記錄
  if (reward.amount > 0) {
    await supabase.from('transactions').insert({
      student_id: studentId,
      assessment_id: id,
      transaction_type: 'earn',
      amount: reward.amount,
      description: `${assessment.title} - ${reward.ruleName}`,
      category: '測驗獎金'
    })
  }
  
  revalidatePath(`/student/${studentId}`)
  return { success: true, reward }
}

