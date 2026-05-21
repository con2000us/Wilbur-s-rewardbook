-- AI 評量匯入：provider key 設定表 + assessment_import_jobs 狀態 enum
-- AI Assessment Import: provider key configs table + job status enum

-- 建立 job 狀態 enum
DO $$ BEGIN
    CREATE TYPE public.assessment_import_job_status AS ENUM (
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AI Provider 設定表（加密儲存 API key）
CREATE TABLE IF NOT EXISTS public.ai_provider_configs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    provider text NOT NULL DEFAULT 'openrouter',
    label text,
    encrypted_api_key text NOT NULL,
    key_version text NOT NULL DEFAULT '1',
    purpose text NOT NULL DEFAULT 'both'
        CHECK (purpose IN ('vision', 'text', 'both')),
    endpoint_url text,  -- 自訂 API 端點（可空，使用 provider 預設）
    is_active boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 創建更新觸發器
DROP TRIGGER IF EXISTS update_ai_provider_configs_updated_at ON public.ai_provider_configs;
CREATE TRIGGER update_ai_provider_configs_updated_at
    BEFORE UPDATE ON public.ai_provider_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 啟用 RLS
ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;

-- RLS 政策
CREATE POLICY "Allow public read on ai_provider_configs"
    ON public.ai_provider_configs FOR SELECT USING (true);

CREATE POLICY "Allow insert on ai_provider_configs"
    ON public.ai_provider_configs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update on ai_provider_configs"
    ON public.ai_provider_configs FOR UPDATE USING (true);

CREATE POLICY "Allow delete on ai_provider_configs"
    ON public.ai_provider_configs FOR DELETE USING (true);

-- 插入 AI 評量匯入預設站台設定
INSERT INTO public.site_settings (key, value)
VALUES
    ('ai_assessment_import_enabled', 'false'),
    ('ai_assessment_provider', 'openrouter'),
    ('ai_assessment_model_primary', 'openrouter/free'),
    ('ai_assessment_model_vision', ''),   -- vision 專用 model，空白則使用 model_primary
    ('ai_assessment_model_text', ''),     -- text 分析專用 model，空白則使用 model_primary
    ('ai_assessment_model_fallback', ''),
    ('ai_assessment_processing_mode', 'multimodal'),
    ('ai_assessment_daily_limit', '10'),
    ('ai_assessment_monthly_limit', '100'),
    ('ai_assessment_student_daily_limit', '30'),
    ('ai_assessment_max_file_size_mb', '4'),
    ('ai_assessment_max_retries', '2'),
    ('ai_assessment_keep_source_file', 'false'),
    ('ai_assessment_source_retention_days', '7'),
    ('ai_assessment_detect_mistakes_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
