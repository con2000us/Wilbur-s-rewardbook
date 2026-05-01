-- Backfill transactions.reward_type_id from existing category text.
-- Safe to run multiple times.

WITH reward_type_aliases AS (
  SELECT
    id,
    LOWER(COALESCE(display_name, '')) AS display_name_lc,
    LOWER(COALESCE(display_name_zh, '')) AS display_name_zh_lc,
    LOWER(COALESCE(display_name_en, '')) AS display_name_en_lc,
    LOWER(COALESCE(type_key, '')) AS type_key_lc
  FROM custom_reward_types
),
matched AS (
  SELECT
    t.id AS transaction_id,
    rta.id AS reward_type_id,
    ROW_NUMBER() OVER (
      PARTITION BY t.id
      ORDER BY
        CASE
          WHEN LOWER(COALESCE(t.category, '')) = rta.display_name_lc THEN 1
          WHEN LOWER(COALESCE(t.category, '')) = rta.display_name_zh_lc THEN 2
          WHEN LOWER(COALESCE(t.category, '')) = rta.display_name_en_lc THEN 3
          WHEN LOWER(COALESCE(t.category, '')) = rta.type_key_lc THEN 4
          ELSE 5
        END
    ) AS rank_order
  FROM transactions t
  JOIN reward_type_aliases rta
    ON LOWER(COALESCE(t.category, '')) IN (
      rta.display_name_lc,
      rta.display_name_zh_lc,
      rta.display_name_en_lc,
      rta.type_key_lc
    )
  WHERE t.reward_type_id IS NULL
)
UPDATE transactions t
SET reward_type_id = m.reward_type_id
FROM matched m
WHERE t.id = m.transaction_id
  AND m.rank_order = 1;

-- Optional compatibility rule:
-- If category is a legacy assessment-money label and still not matched,
-- map to money reward type by type_key.
UPDATE transactions t
SET reward_type_id = crt.id
FROM custom_reward_types crt
WHERE t.reward_type_id IS NULL
  AND LOWER(COALESCE(crt.type_key, '')) = 'money'
  AND LOWER(COALESCE(t.category, '')) IN ('測驗獎金', 'assessment reward', '獎金', 'money');
