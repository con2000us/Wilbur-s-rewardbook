-- 新增分頁設定到 site_settings 表
-- 預設每頁顯示 25 筆記錄

INSERT INTO site_settings (key, value, created_at, updated_at)
VALUES ('items_per_page', '25', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

