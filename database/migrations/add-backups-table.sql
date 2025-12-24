-- 備份資料表
-- Backups Table

-- 創建備份表
CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- 備份名稱（例如：自動備份-2024-01-15）
  description TEXT, -- 備份描述
  backup_data JSONB NOT NULL, -- 備份的 JSON 資料
  file_size BIGINT, -- 檔案大小（位元組）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建更新觸發器
CREATE TRIGGER update_backups_updated_at 
BEFORE UPDATE ON backups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 創建索引以優化查詢
CREATE INDEX idx_backups_created_at ON backups(created_at DESC);
CREATE INDEX idx_backups_name ON backups(name);

-- 啟用 RLS
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- RLS 政策
CREATE POLICY "Allow public read access" ON backups FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON backups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON backups FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON backups FOR DELETE USING (true);

