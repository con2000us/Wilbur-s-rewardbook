-- Add grade and score_type support to assessments table
-- 新增等級制和評分方式支援到評量表

ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS grade TEXT CHECK (grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F')),
ADD COLUMN IF NOT EXISTS score_type TEXT CHECK (score_type IN ('numeric', 'letter')) DEFAULT 'numeric';

-- Update existing records to have numeric score_type
-- 更新現有記錄為數字評分方式
UPDATE assessments 
SET score_type = 'numeric' 
WHERE score_type IS NULL;
