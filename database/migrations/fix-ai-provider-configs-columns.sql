-- 補齊 ai_provider_configs 缺少的欄位（如果 migration 用 CREATE IF NOT EXISTS 但表已存在舊版 schema）
-- Add missing columns to ai_provider_configs (for schemas created before endpoint_url / purpose were added)

DO $$ 
BEGIN
    -- 檢查並新增 endpoint_url 欄位
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'ai_provider_configs' 
          AND column_name = 'endpoint_url'
    ) THEN
        ALTER TABLE public.ai_provider_configs ADD COLUMN endpoint_url text;
    END IF;

    -- 檢查並新增 purpose 欄位
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'ai_provider_configs' 
          AND column_name = 'purpose'
    ) THEN
        ALTER TABLE public.ai_provider_configs ADD COLUMN purpose text NOT NULL DEFAULT 'both';
        ALTER TABLE public.ai_provider_configs ADD CONSTRAINT ai_provider_configs_purpose_check 
            CHECK (purpose IN ('vision', 'text', 'both'));
    END IF;
END $$;
