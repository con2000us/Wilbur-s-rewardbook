-- 大型目標模板表 RLS（與 database/migrations/add-goal-templates-rls.sql 內容一致；修改時請兩處同步）
-- 前置：public.goal_templates、public.goal_template_event_links 已存在
--       （若 01_schema 尚未含此二表，請先執行 database/migrations/add-goal-templates.sql
--        與 add-goal-template-images.sql 等相關遷移）

ALTER TABLE public.goal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_template_event_links ENABLE ROW LEVEL SECURITY;

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
