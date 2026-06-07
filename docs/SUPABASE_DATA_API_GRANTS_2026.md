# Supabase Data API Explicit Grants 2026

> Purpose: document the Supabase Data API permission change announced for 2026 and the required actions for this project.

## Summary

Supabase is changing how tables in the `public` schema are exposed to the Data API.

- Starting May 30, 2026, new Supabase projects will not expose new `public` tables to the Data API by default.
- On October 30, 2026, the behavior applies to existing projects for newly created `public` tables.
- Existing tables keep their current grants, but any new table created after the rollout requires explicit PostgreSQL `GRANT` statements before PostgREST, GraphQL, or `supabase-js` can access it.

Official references:

- Supabase changelog: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
- Supabase Data API security docs: https://supabase.com/docs/guides/database/data-api

## Why This Matters For This Project

Wilbur's RewardBook uses Supabase Data API access through `supabase-js` and API routes. Most app data lives in the `public` schema, including:

- `students`
- `subjects`
- `assessments`
- `transactions`
- `reward_rules`
- `site_settings`
- `custom_reward_types`
- `achievement_events`
- `exchange_rules`
- `goal_templates`
- `goal_template_event_links`
- `student_goals`
- `ai_provider_configs`
- AI assessment import tables
- `student_summary` view

The current bootstrap SQL now includes baseline Data API grants, and existing databases can be patched with `database/migrations/add-explicit-data-api-grants-2026.sql`. Future migrations still need to add grants for any newly created Data API-facing tables/views/functions.

That used to work because Supabase granted `select`, `insert`, `update`, and `delete` on new `public` tables automatically. After the rollout, a newly created table can exist in Postgres and still be invisible or forbidden through `supabase-js` until grants are added.

RLS policies and grants are separate:

- `GRANT` controls whether a role can reach the table/view/function through the Data API.
- RLS policies control which rows that role can access after the table is reachable.

Both are required.

## Required Actions

### 1. Add Explicit Grants To Future Migrations

Every future migration that creates a Data API-facing table, view, or function must include explicit grants in the same migration as the RLS policies.

For a table used by the client app or app API routes:

```sql
grant select, insert, update, delete
on table public.your_table
to anon, authenticated;
```

For read-only lookup tables:

```sql
grant select
on table public.your_lookup_table
to anon, authenticated;
```

For views:

```sql
grant select
on table public.your_view
to anon, authenticated;
```

For RPC functions:

```sql
grant execute
on function public.your_function()
to anon, authenticated;
```

If the object is used only by server-side code with the Supabase service role, grant only to `service_role` or keep it out of the Data API surface.

```sql
grant select, insert, update, delete
on table public.server_only_table
to service_role;
```

### 2. Add A Baseline Grants Migration Before October 30, 2026

Run the project baseline migration on existing Supabase databases:

- `database/migrations/add-explicit-data-api-grants-2026.sql`

This protects existing databases, restored databases, and environments created before the bootstrap file included explicit grants.

Suggested project baseline:

```sql
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table
  public.students,
  public.subjects,
  public.assessments,
  public.transactions,
  public.reward_rules,
  public.site_settings,
  public.backups,
  public.custom_reward_types,
  public.exchange_rules,
  public.goal_templates,
  public.goal_template_event_links,
  public.student_goals,
  public.achievement_events,
  public.achievement_event_reward_rules,
  public.ai_provider_configs,
  public.assessment_import_jobs,
  public.assessment_import_drafts,
  public.assessment_import_mistake_drafts,
  public.assessment_mistakes,
  public.ai_assessment_logs
to anon, authenticated;

grant select
on table public.student_summary
to anon, authenticated;

grant usage, select
on all sequences in schema public
to anon, authenticated;
```

If new tables are added after this document, update the baseline migration or add a new grants migration.

Security note: `ai_provider_configs` contains encrypted provider keys. It is included because current server routes use the anon Supabase client and open RLS policies. For stronger security, move those routes to a service-role client and tighten RLS before removing `anon` access.

### 3. Update Fresh Install / Bootstrap Flow

The bootstrap flow in `database/bootstrap/` includes Data API grants for all app-facing objects in `database/bootstrap/01_schema.sql`.

Fresh projects created after May 30, 2026 may fail through `supabase-js` without these grants.

### 4. Keep RLS Policies In Place

Do not replace RLS policies with grants. Add grants alongside RLS.

Current project note: this app currently uses application-level password protection and many RLS policies are intentionally open with `USING (true)`. Explicit grants will preserve the current behavior; they do not make the database more private by themselves.

For stronger security, migrate to Supabase Auth and user-scoped RLS policies. See `docs/AUTHENTICATION_IMPLEMENTATION.md`.

### 5. Review Security Advisor Before October 30, 2026

Before October 30, 2026:

1. Open the Supabase Dashboard.
2. Run Security Advisor.
3. Review which tables are exposed to the Data API.
4. Confirm every exposed table has RLS enabled and appropriate policies.
5. Confirm sensitive/server-only tables are not granted to `anon`.

### 6. Test A New Table Flow

When adding any new table, test access using the same role the app will use.

Expected symptoms when grants are missing:

- `permission denied for table ...`
- PostgREST error code `42501`
- Table works in SQL Editor but fails through `supabase-js`

Example manual check:

```ts
const { data, error } = await supabase.from('your_table').select('*').limit(1)
console.log({ data, error })
```

## Migration Checklist

Use this checklist for every future database migration:

- [ ] Does this migration create a `public` table?
- [ ] Does the app access it through `supabase-js`, PostgREST, or GraphQL?
- [ ] If yes, add the correct `GRANT` statements.
- [ ] Enable RLS for the table.
- [ ] Add RLS policies for the intended roles.
- [ ] If this is a view, add `grant select`.
- [ ] If this is an RPC function, add `grant execute`.
- [ ] If this object should be server-only, do not grant it to `anon`.
- [ ] Test the object through the app, not only in SQL Editor.

## Table Creation Template

Use this template for new app-facing tables:

```sql
create table if not exists public.example_table (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default now()
);

alter table public.example_table enable row level security;

drop policy if exists "Allow public read access example table" on public.example_table;
create policy "Allow public read access example table"
on public.example_table
for select
using (true);

drop policy if exists "Allow insert example table" on public.example_table;
create policy "Allow insert example table"
on public.example_table
for insert
with check (true);

drop policy if exists "Allow update example table" on public.example_table;
create policy "Allow update example table"
on public.example_table
for update
using (true)
with check (true);

drop policy if exists "Allow delete example table" on public.example_table;
create policy "Allow delete example table"
on public.example_table
for delete
using (true);

grant select, insert, update, delete
on table public.example_table
to anon, authenticated;
```

Adjust policies and grants for stricter access as the auth model matures.
