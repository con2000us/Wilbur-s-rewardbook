-- 為 custom_reward_types 新增 description 註解欄位
ALTER TABLE public.custom_reward_types
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

COMMENT ON COLUMN public.custom_reward_types.description IS '獎勵類型註解說明，供管理員備註';

-- 同步更新 bootstrap 01_schema.sql 中的定義
