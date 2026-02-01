-- ========================================
-- 獎勵項目編輯管理系統
-- 支援用戶自訂義各種獎勵類型
-- ========================================

-- 1. 刪除舊的固定範例獎勵規則
-- ========================================

DELETE FROM reward_rules 
WHERE rule_name IN (
  '連續早起3天',
  '整理房間',
  '完成作業10塊',
  '讀書30分鐘',
  '考試滿分',
  '玩益智遊戲30分鐘',
  '運動1小時'
);

-- ========================================
-- 2. 擴展 students 表 - 新增獎勵類型配置欄位
-- ========================================

-- 新增 JSONB 欄位用於儲存學生的自訂義獎勵類型
ALTER TABLE students ADD COLUMN IF NOT EXISTS reward_config JSONB DEFAULT '{}'::jsonb;

-- ========================================
-- 3. 創建自訂義獎勵類型配置表
-- ========================================

CREATE TABLE custom_reward_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_key TEXT NOT NULL UNIQUE, -- 類型唯一識別碼（如：reading_rewards, exercise_rewards）
  display_name_zh TEXT NOT NULL, -- 中文名稱
  display_name_en TEXT NOT NULL, -- 英文名稱
  icon TEXT NOT NULL DEFAULT '🎁', -- 圖標
  color TEXT DEFAULT '#4a9eff', -- 主色
  default_unit TEXT, -- 預設單位
  is_accumulable BOOLEAN DEFAULT TRUE, -- 是否可累加
  has_extra_input BOOLEAN DEFAULT FALSE, -- 是否需要輸入額外資料（如讀書時間、難度等）
  extra_input_schema JSONB, -- 額外資料結構定義（用於前端動態渲染輸入欄位）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入範例自訂義獎勵類型
INSERT INTO custom_reward_types (type_key, display_name_zh, display_name_en, icon,
  color, default_unit, is_accumulable, has_extra_input, extra_input_schema)
VALUES
  -- 讀書獎勵
  ('reading_rewards', '讀書獎勵', 'Reading Rewards', '📚', '#4a9eff', '代幣', TRUE, FALSE, NULL),
  -- 運動獎勵
  ('exercise_rewards', '運動獎勵', 'Exercise Rewards', '🏃', '#8b5cf6', '次', TRUE, FALSE, NULL),
  -- 整理房間獎勵
  ('cleaning_rewards', '整理房間獎勵', 'Cleaning Rewards', '🧹', '#a855f7', '次', FALSE, TRUE, '{"description": "難度", "daily": true, "frequency": "once"}'::jsonb),
  -- 積分獎勵
  ('points_rewards', '積分獎勵', 'Points Rewards', '⭐', '#fbbf24', '分', FALSE, TRUE, '{"exchange_rate": "100:1"}'::jsonb);

-- ========================================
-- 4. 更新視圖 - 添加獎勵類型配置
-- ========================================

-- 刪除舊視圖
DROP VIEW IF EXISTS student_summary;

-- 創建包含 reward_config 的新視圖
CREATE VIEW student_summary AS
SELECT
  s.id as student_id,
  s.name,
  s.reward_config,

  -- 科目數
  (SELECT COUNT(DISTINCT id) FROM subjects WHERE student_id = s.id) as total_subjects,

  -- 評量數
  (SELECT COUNT(a.id)
   FROM assessments a
   WHERE a.subject_id IN (SELECT id FROM subjects WHERE student_id = s.id)
  ) as total_assessments,

  -- 已完成評量數
  (SELECT COUNT(a.id)
   FROM assessments a
   WHERE a.subject_id IN (SELECT id FROM subjects WHERE student_id = s.id)
     AND a.status = 'completed'
  ) as completed_assessments,

  -- 總賺得金額
  COALESCE((SELECT SUM(amount) FROM transactions WHERE student_id = s.id AND amount > 0), 0) as total_earned,

  -- 總花費
  COALESCE((SELECT SUM(ABS(amount)) FROM transactions WHERE student_id = s.id AND amount < 0), 0) as total_spent,

  -- 餘額（金額）
  COALESCE((SELECT SUM(amount) FROM transactions WHERE student_id = s.id), 0) as balance
FROM students s;

-- ========================================
-- 5. 創建獎勵類型使用配置範例
-- ========================================

-- 插入範例配置到 students 表（這只是演示，實際使用時用戶會動態配置）
UPDATE students 
SET 
  reward_config = '{
    "default_type": "reading_rewards",
    "types": {
      "reading_rewards": {
        "enabled": true,
        "unit": "代幣"
      },
      "exercise_rewards": {
        "enabled": true,
        "unit": "次"
      },
      "cleaning_rewards": {
        "enabled": false,
        "unit": "次"
      },
      "points_rewards": {
        "enabled": false,
        "unit": "分"
      }
    }
  }'::jsonb
WHERE name = '小明';

-- ========================================
-- 6. 索引優化
-- ========================================

-- 為自訂義獎勵類型表建立索引
CREATE INDEX idx_custom_reward_types_type_key ON custom_reward_types(type_key);

-- ========================================
-- 7. Row Level Security 政策
-- ========================================

-- 啟用 RLS
ALTER TABLE custom_reward_types ENABLE ROW LEVEL SECURITY;

-- 允許讀取自訂義獎勵類型
CREATE POLICY "Allow read access to custom reward types" ON custom_reward_types FOR SELECT USING (true);

-- 允許插入自訂義獎勵類型
CREATE POLICY "Allow insert custom reward types" ON custom_reward_types FOR INSERT WITH CHECK (true);

-- 允許更新自訂義獎勵類型
CREATE POLICY "Allow update custom reward types" ON custom_reward_types FOR UPDATE USING (true);

-- 允許刪除自訂義獎勵類型
CREATE POLICY "Allow delete custom reward types" ON custom_reward_types FOR DELETE USING (true);
