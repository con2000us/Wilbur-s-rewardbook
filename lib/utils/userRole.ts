/**
 * 用戶角色判斷工具
 * 暫時使用環境變數和 localStorage，未來可擴展為完整的認證系統
 */

export type UserRole = 'student' | 'parent'

/**
 * 獲取當前用戶角色
 * 暫時從環境變數或 localStorage 讀取，預設為 'parent'（家長）
 * 未來可以從 session/cookie 讀取
 */
export function getUserRole(): UserRole {
  // 在客戶端組件中使用
  if (typeof window !== 'undefined') {
    // 可以從 localStorage 或 cookie 讀取
    const role = localStorage.getItem('user_role') as UserRole | null
    return role || 'parent'
  }
  
  // 在服務端組件中使用
  return (process.env.NEXT_PUBLIC_USER_ROLE as UserRole) || 'parent'
}

/**
 * 判斷是否為家長
 */
export function isParent(): boolean {
  return getUserRole() === 'parent'
}

/**
 * 判斷是否為學生
 */
export function isStudent(): boolean {
  return getUserRole() === 'student'
}
