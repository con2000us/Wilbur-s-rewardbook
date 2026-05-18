# SOP: Unified Name/Description Field Standard

## Principle

All entity tables use a **single** `name` and `description` column. No locale suffixes (`_zh`, `_en`), no translation tables. The admin sets whatever text they want, and that text is displayed to all users regardless of their chosen UI language.

## Rationale

- Dual-column (`name_zh` / `name_en`) and translation-table patterns add complexity for no benefit when the site has a single administrator who sets content in one language.
- A single field eliminates confusion: no "which field should I fill in?" questions, no inconsistent data between locales.
- Simpler SQL, simpler API, simpler frontend.

## Standard Column Naming

| Purpose | Column | Type | Nullable |
|---------|--------|------|----------|
| Display name | `name` | `TEXT` | NOT NULL |
| Description | `description` | `TEXT` | nullable |
| Display name (reward types) | `display_name` | `TEXT` | NOT NULL |

## Migration Procedure (for existing dual-column tables)

When a table currently has `name_zh` / `name_en`:

1. **Rename the English column to the unified name**: `ALTER TABLE t RENAME COLUMN name_en TO name;`
2. **Drop the Chinese column**: `ALTER TABLE t DROP COLUMN name_zh;`
3. **Same for description**: `RENAME description_en TO description; DROP description_zh;`
4. **If there is a translations table**: drop it entirely.
5. **Update the original CREATE migration SQL** to match the new schema for future fresh installs.

The English column is chosen as the canonical source because:
- It is typically shorter (no Chinese characters)
- It serves as the most universal fallback
- The admin can still enter Chinese text into the single `name` field if they prefer

## API Pattern

```typescript
// CREATE / UPDATE — receive single fields
const { name, description, ... } = body
if (!name) return error('name is required')

// INSERT
await supabase.from('table').insert({ name, description: description || null, ... })

// LIST — return single fields
return { name: row.name, description: row.description, ... }
```

No `buildDualLocalePayload()`, no `resolveLocalizedText()`, no fallback chains.

## Frontend Pattern

```typescript
// Form — single input per field
<input value={name} onChange={...} placeholder="Enter name" />

// Display — direct render
<h3>{item.name}</h3>
<p>{item.description}</p>
```

No `item.name_zh || item.name_en` coalescing.

## Rollout Order

When fixing existing tables, apply in this order to minimize disruption:

1. **Goal Templates** (`goal_templates`) — newest table, least dependent code
2. **Custom Reward Types** (`custom_reward_types`) — partially migrated already
3. **Achievement Events** (`achievement_events`) — has translation table, many API consumers
4. **Exchange Rules** (`exchange_rules`) — has translation table, student-facing

Each phase must be fully verified before starting the next.
