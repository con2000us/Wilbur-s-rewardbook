-- Normalize event semantics and reward type accounting
-- 1) Add achievement event templates
-- 2) Add event-to-reward mapping rules
-- 3) Add reward_type_id / achievement_event_id to transactions

CREATE TABLE IF NOT EXISTS achievement_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievement_event_reward_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES achievement_events(id) ON DELETE CASCADE,
  reward_type_id UUID NOT NULL REFERENCES custom_reward_types(id) ON DELETE CASCADE,
  default_amount NUMERIC(10, 2),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, reward_type_id)
);

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS reward_type_id UUID REFERENCES custom_reward_types(id) ON DELETE SET NULL;

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS achievement_event_id UUID REFERENCES achievement_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_reward_type_id ON transactions(reward_type_id);
CREATE INDEX IF NOT EXISTS idx_transactions_achievement_event_id ON transactions(achievement_event_id);
CREATE INDEX IF NOT EXISTS idx_achievement_events_display_order ON achievement_events(display_order);
CREATE INDEX IF NOT EXISTS idx_event_reward_rules_event_id ON achievement_event_reward_rules(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reward_rules_reward_type_id ON achievement_event_reward_rules(reward_type_id);
