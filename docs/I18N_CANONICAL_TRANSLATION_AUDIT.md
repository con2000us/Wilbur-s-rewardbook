# Canonical + Translation Audit (Frozen Spec)

## Scope
- Target: DB + API + frontend data fields that currently use bilingual columns.
- Canonical model:
  - Base table keeps stable key (`*_key`) and non-language fields.
  - Translation table keeps `locale`, `name`, `description`.
  - API returns normalized resolved fields (`name`, `description`) for UI read.
- Rollout strategy: dual-read + dual-write first, then remove legacy dependency.

## Inventory

### Already standardized (partially)
- `achievement_events`
  - Canonical: `event_key`
  - Translations: `achievement_event_translations(event_id, locale, name, description)`
  - Legacy columns still present: `name_zh`, `name_en`, `description_zh`, `description_en`

### Still mixed / pending standardization
- `exchange_rules`
  - Legacy columns: `name_zh`, `name_en`, `description_zh`, `description_en`
  - Missing canonical key and translation table in current schema
  - Affected API: `app/api/exchange-rules/*`
  - Affected UI: `app/student/[id]/rewards/*`, especially `RewardsPageClient.tsx`

- `custom_reward_types`
  - Current main field: `display_name`
  - Legacy columns still referenced in several API/front-end paths:
    - `display_name_zh`, `display_name_en`
  - Not migrated in this phase; keep compatibility fallback and move UI reads to normalized `display_name`

## Frozen naming rules
- Canonical key column naming:
  - event: `event_key`
  - exchange rule: `rule_key`
- Translation table naming:
  - `achievement_event_translations`
  - `exchange_rule_translations`
- Translation table shape:
  - `{id, <entity>_id, locale, name, description, created_at, updated_at}`
  - unique key: `(<entity>_id, locale)`
  - locale check: `('zh-TW', 'en')`

## API contract (normalized read)
- List/read APIs must include:
  - `name`: locale-resolved value
  - `description`: locale-resolved value
- Compatibility payload (temporary):
  - keep returning legacy fields when available (`*_zh/*_en`) for old consumers
  - write APIs accept both:
    - normalized (`name`, `description`, `locale`)
    - legacy (`name_zh`, `name_en`, `description_zh`, `description_en`)

## Fallback termination criteria
- Stop using legacy fields only when all are true:
  1. UI no longer branches on bilingual data fields for target modules.
  2. API logs show no fallback read path triggered for a full release cycle.
  3. Build/type checks pass with legacy optional paths disabled in staged branch.

## Phase mapping
- Phase 2:
  - Add `exchange_rules.rule_key`
  - Add `exchange_rule_translations`
  - Backfill from existing `name_zh/name_en/description_*`
- Phase 3:
  - Bootstrap/demo SQL and server bootstrap helper write canonical + translations
- Phase 4:
  - Exchange rule API dual-read/dual-write using shared i18n helper
  - Achievement event API refactored to shared helper
- Phase 5:
  - Frontend components read normalized fields (`name`, `description`)
- Phase 6:
  - Update Supabase types for new columns/table
  - Keep legacy fields optional for compatibility
- Phase 7:
  - Run build and regression checklist
