-- 網站設定表
-- Site Settings Table

-- 創建設定表
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建更新觸發器
CREATE TRIGGER update_site_settings_updated_at 
BEFORE UPDATE ON site_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 啟用 RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- RLS 政策
CREATE POLICY "Allow public read access" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON site_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON site_settings FOR UPDATE USING (true);

-- 插入預設網站名稱
INSERT INTO site_settings (key, value) VALUES 
  ('site_name', 'Wilbur''s RewardBook')
ON CONFLICT (key) DO NOTHING;

