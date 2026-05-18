-- Add Student Goals table for per-student large goals
-- Each student can have their own set of goals

CREATE TABLE IF NOT EXISTS student_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 關聯學生
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- 基本資訊
  name TEXT NOT NULL,
  description TEXT,

  -- 追蹤模式
  tracking_mode TEXT NOT NULL DEFAULT 'cumulative_amount'
    CHECK (tracking_mode IN ('cumulative_amount', 'completion_count')),
  target_amount NUMERIC,        -- 累積金額型：目標金額
  target_count INTEGER,         -- 完成次數型：目標次數

  -- 獎勵設定
  reward_type_id UUID NOT NULL REFERENCES custom_reward_types(id) ON DELETE CASCADE,
  reward_on_complete NUMERIC NOT NULL DEFAULT 0,

  -- 進度追蹤
  current_progress NUMERIC DEFAULT 0,

  -- 外觀
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#6a99e0',

  -- 圖片
  image_urls JSONB DEFAULT '[]'::jsonb,

  -- 狀態
  is_active BOOLEAN DEFAULT true,

  -- 排序與時間
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_student_goals_student_id ON student_goals(student_id);
CREATE INDEX IF NOT EXISTS idx_student_goals_display_order ON student_goals(display_order);
CREATE INDEX IF NOT EXISTS idx_student_goals_is_active ON student_goals(is_active);

-- RLS
ALTER TABLE student_goals ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Allow authenticated full access to student_goals"
  ON student_goals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
