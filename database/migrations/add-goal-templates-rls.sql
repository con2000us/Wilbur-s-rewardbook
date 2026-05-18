-- goal_templates / goal_template_event_links RLS
-- 新環境 bootstrap 同步副本：database/bootstrap/05_goal_templates_rls.sql（修改時請兩處一併更新）
-- 專案 API（lib/supabase/server.ts）使用 anon key、未帶使用者 JWT，
-- 寫入時資料庫角色為 anon；政策必須包含 anon，否則 INSERT 會報 RLS 錯誤。
-- 在 Supabase：SQL Editor 執行本檔，或在 Dashboard 建立政策時 Target roles 請同時包含 anon + authenticated。

ALTER TABLE public.goal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_template_event_links ENABLE ROW LEVEL SECURITY;

-- 避免與先前在 Dashboard 手動建立的名稱衝突，先刪除同名政策
DROP POLICY IF EXISTS "Allow read goal templates" ON public.goal_templates;
DROP POLICY IF EXISTS "Allow insert goal templates" ON public.goal_templates;
DROP POLICY IF EXISTS "Allow update goal templates" ON public.goal_templates;
DROP POLICY IF EXISTS "Allow delete goal templates" ON public.goal_templates;

DROP POLICY IF EXISTS "Allow read goal template event links" ON public.goal_template_event_links;
DROP POLICY IF EXISTS "Allow insert goal template event links" ON public.goal_template_event_links;
DROP POLICY IF EXISTS "Allow update goal template event links" ON public.goal_template_event_links;
DROP POLICY IF EXISTS "Allow delete goal template event links" ON public.goal_template_event_links;

CREATE POLICY "Allow read goal templates"
  ON public.goal_templates FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert goal templates"
  ON public.goal_templates FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update goal templates"
  ON public.goal_templates FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete goal templates"
  ON public.goal_templates FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow read goal template event links"
  ON public.goal_template_event_links FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert goal template event links"
  ON public.goal_template_event_links FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update goal template event links"
  ON public.goal_template_event_links FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete goal template event links"
  ON public.goal_template_event_links FOR DELETE
  TO anon, authenticated
  USING (true);
