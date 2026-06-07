-- Explicit Supabase Data API grants for the 2026 public schema behavior change.
--
-- Supabase will no longer expose newly-created public tables to PostgREST,
-- GraphQL, or supabase-js automatically. RLS policies still apply, but the
-- Data API roles also need PostgreSQL GRANTs.
--
-- This migration is intentionally idempotent and grants only objects that
-- exist in the current database, so it can be run on partially-upgraded
-- environments.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

DO $$
DECLARE
  table_name text;
  app_tables text[] := ARRAY[
    'achievement_event_reward_rules',
    'achievement_events',
    'ai_assessment_logs',
    'ai_provider_configs',
    'assessment_import_drafts',
    'assessment_import_jobs',
    'assessment_import_mistake_drafts',
    'assessment_mistakes',
    'assessments',
    'backups',
    'custom_reward_types',
    'exchange_rules',
    'goal_template_event_links',
    'goal_templates',
    'reward_rules',
    'site_settings',
    'student_goals',
    'students',
    'subjects',
    'transactions'
  ];
BEGIN
  FOREACH table_name IN ARRAY app_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO anon, authenticated',
        table_name
      );
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  view_name text;
  app_views text[] := ARRAY[
    'student_summary'
  ];
BEGIN
  FOREACH view_name IN ARRAY app_views LOOP
    IF to_regclass(format('public.%I', view_name)) IS NOT NULL THEN
      EXECUTE format(
        'GRANT SELECT ON TABLE public.%I TO anon, authenticated',
        view_name
      );
    END IF;
  END LOOP;
END $$;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- NOTE:
-- ai_provider_configs contains encrypted API keys. It is granted here to
-- preserve the current app behavior because the existing server routes use
-- the anon Supabase client and the current RLS policies are open. For stronger
-- security, move those routes to a service-role client and tighten RLS.
