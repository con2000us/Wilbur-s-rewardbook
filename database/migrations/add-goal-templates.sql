-- Add Goal Templates (Big Goals) support
-- 1) goal_templates: 全域大型目標模板
-- 2) goal_template_event_links: 模板 ↔ 成就事件關聯

CREATE TABLE IF NOT EXISTS goal_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 基本資訊
  name TEXT NOT NULL,
  description TEXT,

  -- 追蹤模式
  tracking_mode TEXT NOT NULL CHECK (tracking_mode IN ('cumulative_amount', 'completion_count')),
  target_amount NUMERIC,        -- 累積金額型：目標金額
  target_count INTEGER,         -- 完成次數型：目標次數

  -- 獎勵設定
  reward_type_id UUID NOT NULL REFERENCES custom_reward_types(id) ON DELETE CASCADE,
  reward_on_complete NUMERIC NOT NULL DEFAULT 0,

  -- 外觀
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#6a99e0',

  -- 狀態
  is_active BOOLEAN DEFAULT true,

  -- 排序與時間
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 模板 ↔ 成就事件關聯（N:M）
CREATE TABLE IF NOT EXISTS goal_template_event_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES goal_templates(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES achievement_events(id) ON DELETE CASCADE,
  UNIQUE(template_id, event_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_goal_templates_display_order ON goal_templates(display_order);
CREATE INDEX IF NOT EXISTS idx_goal_templates_is_active ON goal_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_goal_template_event_links_template ON goal_template_event_links(template_id);
CREATE INDEX IF NOT EXISTS idx_goal_template_event_links_event ON goal_template_event_links(event_id);
