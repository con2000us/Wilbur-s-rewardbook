import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  // 優先使用內網直連（Server-side 跳過 Apache，避免 body size 限制）
  const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('SUPABASE_INTERNAL_URL or NEXT_PUBLIC_SUPABASE_URL is not set')
  }

  const apiKey = serviceRoleKey || anonKey
  if (!apiKey) {
    throw new Error('No Supabase API key found for admin client')
  }

  return createSupabaseClient(supabaseUrl, apiKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

