import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()
    
    const { id, ...restBody } = body
    // 明确排除 type_key，编辑时不应该修改它
    const { type_key, ...updateData } = restBody
    
    if (!id) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing type id'
      }, { status: 400 })
    }

    // 检查是否为系统预设类型（系统预设类型不能修改某些字段）
    const { data: existingType } = await supabase
      .from('custom_reward_types')
      .select('is_system, type_key')
      .eq('id', id)
      .single()

    if (!existingType) {
      return NextResponse.json({ 
        success: false,
        error: '找不到该奖励类型'
      }, { status: 404 })
    }

    if (existingType.is_system && updateData.is_system === false) {
      return NextResponse.json({ 
        success: false,
        error: '系统预设类型不能修改 is_system 字段'
      }, { status: 403 })
    }

    // 如果 type_key 被传入且值不同（编辑时不应该发生，但为了安全起见检查）
    // 只有当 type_key 是有效字符串且与现有值不同时才检查
    if (type_key && typeof type_key === 'string' && type_key.trim() !== '' && type_key !== existingType.type_key) {
      const { data: conflicting } = await supabase
        .from('custom_reward_types')
        .select('id, type_key, display_name')
        .eq('type_key', type_key)
        .neq('id', id) // 排除当前记录
        .maybeSingle() // 使用 maybeSingle 避免找不到记录时的错误
      
      if (conflicting) {
        return NextResponse.json({ 
          success: false,
          error: `奖励类型标识符 "${type_key}" 已存在。请使用不同的标识符。`
        }, { status: 400 })
      }
    }

    // 处理 extra_input_schema
    const updateFields: any = {}
    
    // 编辑时不应该更新 type_key，但如果确实传入了有效值且值不同，则更新
    if (type_key && typeof type_key === 'string' && type_key.trim() !== '' && type_key !== existingType.type_key) {
      updateFields.type_key = type_key
    }
    
    // 处理 display_name（单一字段，支持任何语言）
    if (updateData.display_name !== undefined) {
      updateFields.display_name = updateData.display_name
    }
    
    if (updateData.icon !== undefined) updateFields.icon = updateData.icon
    if (updateData.color !== undefined) updateFields.color = updateData.color
    if (updateData.default_unit !== undefined) updateFields.default_unit = updateData.default_unit || null
    if (updateData.is_accumulable !== undefined) updateFields.is_accumulable = updateData.is_accumulable
    if (updateData.has_extra_input !== undefined) updateFields.has_extra_input = updateData.has_extra_input
    if (updateData.extra_input_schema !== undefined) updateFields.extra_input_schema = updateData.extra_input_schema
    if (updateData.is_system !== undefined && !existingType.is_system) updateFields.is_system = updateData.is_system

    updateFields.updated_at = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('custom_reward_types')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Failed to update custom reward type:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      // 检查是否是唯一约束违反错误
      const errorMessage = error.message || ''
      const errorCode = error.code || ''
      const errorDetails = error.details || ''
      
      if (
        errorMessage.includes('duplicate key') ||
        errorMessage.includes('unique constraint') ||
        errorMessage.includes('type_key') ||
        errorCode === '23505'
      ) {
        // 如果是唯一约束错误，但 type_key 没有被修改，这可能是数据库层面的问题
        // 记录详细信息以便调试
        console.error('Unique constraint error but type_key not changed:', {
          existingTypeKey: existingType.type_key,
          providedTypeKey: type_key,
          updateDataKeys: Object.keys(updateData)
        })
        return NextResponse.json({ 
          success: false,
          error: `奖励类型标识符 "${type_key || existingType.type_key}" 已存在。请使用不同的标识符。如果这是编辑操作且未修改标识符，请联系技术支持。`
        }, { status: 400 })
      }
      
      // 检查是否是字段不存在的错误
      if (
        errorMessage.includes('display_name') || 
        errorMessage.includes('column') && errorMessage.includes('does not exist') ||
        errorCode === '42703' ||
        errorDetails?.includes('display_name')
      ) {
        return NextResponse.json({ 
          success: false,
          error: `数据库字段缺失。请运行诊断查询：database/migrations/check-display-name-column.sql 或重新运行迁移文件：database/migrations/merge-reward-type-display-names.sql。错误详情：${errorMessage}`
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: false,
        error: errorMessage || 'Failed to update custom reward type'
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      data
    })
  } catch (err) {
    console.error('Error updating custom reward type:', err)
    return NextResponse.json({ 
      success: false,
      error: 'Error updating custom reward type: ' + (err as Error).message
    }, { status: 500 })
  }
}
