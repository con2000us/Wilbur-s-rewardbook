import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()
    
    // 检查 type_key 是否已存在
    if (body.type_key) {
      const { data: existing } = await supabase
        .from('custom_reward_types')
        .select('id, type_key, display_name')
        .eq('type_key', body.type_key)
        .single()
      
      if (existing) {
        return NextResponse.json({ 
          success: false,
          error: `奖励类型标识符 "${body.type_key}" 已存在。请使用不同的标识符。`
        }, { status: 400 })
      }
    }
    
    const typeData: any = {}
    
    // 處理額外輸入欄位
    if (body.has_extra_input === 'true') {
      if (body.extra_field_name) {
        typeData[body.extra_field_name] = {
          type: body.extra_field_type,
          label: body.extra_field_label,
          required: body.extra_field_required === 'true'
        }
      }
    }
    
    // 处理 extra_input_schema
    let finalExtraInputSchema = typeData
    if (body.extra_input_schema) {
      finalExtraInputSchema = {
        ...typeData,
        ...body.extra_input_schema
      }
    }

    // 构建插入数据，兼容新旧字段结构
    const insertData: any = {
      type_key: body.type_key,
      icon: body.icon || '🎁',
      color: body.color || '#3b82f6',
      default_unit: body.default_unit || null,
      is_accumulable: body.is_accumulable !== false,
      has_extra_input: body.has_extra_input === true,
      extra_input_schema: finalExtraInputSchema
    }
    
    // 使用 display_name（单一字段，支持任何语言）
    insertData.display_name = body.display_name || 'Unnamed Reward Type'

    const { data, error } = await supabase
      .from('custom_reward_types')
      .insert(insertData)
      .select()
      .single()
    
    if (error) {
      console.error('Failed to create custom reward type:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      // 检查是否是字段不存在的错误（Supabase 的错误代码和消息）
      const errorMessage = error.message || ''
      const errorCode = error.code || ''
      const errorDetails = error.details || ''
      
      // 检查是否是唯一约束违反错误
      if (
        errorMessage.includes('duplicate key') ||
        errorMessage.includes('unique constraint') ||
        errorMessage.includes('type_key') ||
        errorCode === '23505'
      ) {
        return NextResponse.json({ 
          success: false,
          error: `奖励类型标识符 "${body.type_key}" 已存在。请使用不同的标识符。`
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
        error: errorMessage || 'Failed to create custom reward type'
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      data
    })
  } catch (err) {
    console.error('Error creating custom reward type:', err)
    return NextResponse.json({ 
      success: false,
      error: 'Error creating custom reward type: ' + (err as Error).message
    }, { status: 500 })
  }
}
