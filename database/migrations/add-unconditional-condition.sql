-- Migration: Add 'unconditional' to reward_rules.condition CHECK constraint
-- This allows rules that reward on completion regardless of score

ALTER TABLE public.reward_rules 
  DROP CONSTRAINT IF EXISTS reward_rules_condition_check;

ALTER TABLE public.reward_rules 
  ADD CONSTRAINT reward_rules_condition_check 
  CHECK (condition = ANY (ARRAY['score_equals', 'score_range', 'perfect_score', 'unconditional']));
