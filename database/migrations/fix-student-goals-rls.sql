-- Fix RLS for student_goals: allow anon and authenticated (matching goal_templates pattern)
-- The original policy only allowed 'authenticated', but the API client uses the anon key.

DROP POLICY IF EXISTS "Allow authenticated full access to student_goals" ON student_goals;

CREATE POLICY "Allow anon and authenticated full access"
  ON student_goals
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
