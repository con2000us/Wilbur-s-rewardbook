-- achievement_events / achievement_event_reward_rules 若啟用 RLS 但未建立 SELECT policy，
-- 使用 anon 金鑰的 API 會讀不到資料，前端「優良成就事件」選單會變空白。
-- 與其他 public 資料表一致：允許讀取（寫入仍可依需求另行限制）。

DROP POLICY IF EXISTS "Allow public read access achievement events" ON achievement_events;
CREATE POLICY "Allow public read access achievement events"
  ON achievement_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access achievement event reward rules" ON achievement_event_reward_rules;
CREATE POLICY "Allow public read access achievement event reward rules"
  ON achievement_event_reward_rules FOR SELECT USING (true);
