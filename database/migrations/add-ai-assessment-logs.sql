-- AI 評量匯入：LLM 呼叫紀錄表（保留最後 30 筆）
-- AI Assessment Import: LLM call log table (keeps last 30 entries)

CREATE TABLE IF NOT EXISTS public.ai_assessment_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    job_id uuid REFERENCES public.assessment_import_jobs(id) ON DELETE CASCADE,
    purpose text NOT NULL CHECK (purpose IN ('vision', 'text', 'multimodal')),
    provider text,
    model text,
    system_prompt text,
    user_prompt text,
    raw_response text,
    success boolean NOT NULL DEFAULT false,
    error_message text,
    duration_ms integer,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.ai_assessment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on ai_assessment_logs"
    ON public.ai_assessment_logs FOR SELECT USING (true);

CREATE POLICY "Allow public insert on ai_assessment_logs"
    ON public.ai_assessment_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public delete on ai_assessment_logs"
    ON public.ai_assessment_logs FOR DELETE USING (true);
