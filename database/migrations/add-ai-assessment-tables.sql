-- AI 評量匯入：核心資料表（jobs / drafts / 正式錯題歸檔）
-- AI Assessment Import: Core tables (jobs / drafts / formal mistake archive)

-- ============================================================
-- 1. assessment_import_jobs — 匯入任務主表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assessment_import_jobs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    student_id uuid NOT NULL,
    source_file_path text,
    source_file_mime text,
    source_file_size integer,  -- bytes
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    raw_ocr_text text,
    ai_json jsonb,
    validated_json jsonb,
    provider text,
    model text,
    error_code text,
    error_message text,
    retry_count integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);

DROP TRIGGER IF EXISTS update_assessment_import_jobs_updated_at ON public.assessment_import_jobs;
CREATE TRIGGER update_assessment_import_jobs_updated_at
    BEFORE UPDATE ON public.assessment_import_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.assessment_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on assessment_import_jobs"
    ON public.assessment_import_jobs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on assessment_import_jobs"
    ON public.assessment_import_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on assessment_import_jobs"
    ON public.assessment_import_jobs FOR UPDATE USING (true);

-- ============================================================
-- 2. assessment_import_drafts — AI 產生的評量草稿
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assessment_import_drafts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES public.assessment_import_jobs(id) ON DELETE CASCADE,
    student_id uuid NOT NULL,
    subject_id uuid,  -- nullable until parent confirms
    detected_subject_name text,
    subject_candidates jsonb,  -- [{subject_id, name, confidence}] for AI suggestions
    title text,
    assessment_type text
        CHECK (assessment_type IS NULL OR assessment_type IN ('exam', 'homework', 'quiz', 'project')),
    score numeric(5,2),
    max_score numeric(5,2) DEFAULT 100,
    percentage numeric(5,2),
    assessment_date date,
    notes text,
    confidence numeric(3,2),  -- overall AI confidence 0.00-1.00
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'confirmed', 'rejected')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

DROP TRIGGER IF EXISTS update_assessment_import_drafts_updated_at ON public.assessment_import_drafts;
CREATE TRIGGER update_assessment_import_drafts_updated_at
    BEFORE UPDATE ON public.assessment_import_drafts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.assessment_import_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on assessment_import_drafts"
    ON public.assessment_import_drafts FOR SELECT USING (true);
CREATE POLICY "Allow public insert on assessment_import_drafts"
    ON public.assessment_import_drafts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on assessment_import_drafts"
    ON public.assessment_import_drafts FOR UPDATE USING (true);

-- ============================================================
-- 3. assessment_import_mistake_drafts — AI 產生的錯題草稿
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assessment_import_mistake_drafts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    draft_id uuid NOT NULL REFERENCES public.assessment_import_drafts(id) ON DELETE CASCADE,
    question_number text,
    student_answer text,
    correct_answer text,
    mistake_type text,
    knowledge_point text,
    ai_reason text,
    confidence numeric(3,2),
    raw_text text,  -- raw OCR excerpt for this question
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.assessment_import_mistake_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on assessment_import_mistake_drafts"
    ON public.assessment_import_mistake_drafts FOR SELECT USING (true);
CREATE POLICY "Allow public insert on assessment_import_mistake_drafts"
    ON public.assessment_import_mistake_drafts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on assessment_import_mistake_drafts"
    ON public.assessment_import_mistake_drafts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on assessment_import_mistake_drafts"
    ON public.assessment_import_mistake_drafts FOR DELETE USING (true);

-- ============================================================
-- 4. assessment_mistakes — 正式錯題歸檔（確認後建立）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assessment_mistakes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    question_number text,
    student_answer text,
    correct_answer text,
    mistake_type text,
    knowledge_point text,
    ai_reason text,
    confidence numeric(3,2),
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.assessment_mistakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on assessment_mistakes"
    ON public.assessment_mistakes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on assessment_mistakes"
    ON public.assessment_mistakes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on assessment_mistakes"
    ON public.assessment_mistakes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on assessment_mistakes"
    ON public.assessment_mistakes FOR DELETE USING (true);
