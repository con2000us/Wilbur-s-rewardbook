-- AI 評量匯入：新增 ai_raw_response 欄位，保存 LLM 原始回傳文字
-- AI Assessment Import: add ai_raw_response column to save raw LLM response text

ALTER TABLE public.assessment_import_jobs
ADD COLUMN IF NOT EXISTS ai_raw_response text;
