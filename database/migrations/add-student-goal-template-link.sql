-- Link per-student large goals back to their reusable global template.
-- goal_templates remains the settings-level definition; student_goals is the
-- per-student instance that owns progress and completion history.

ALTER TABLE student_goals
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES goal_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_goals_template_id
ON student_goals(template_id);

COMMENT ON COLUMN student_goals.template_id IS '來源大型目標模板；NULL 表示舊資料或學生自訂目標';
