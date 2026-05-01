-- Seed default achievement events and default reward mappings
-- Use this for existing DBs where achievement_events tables are empty.

INSERT INTO achievement_events (name_zh, name_en, description_zh, description_en, is_active, display_order)
SELECT * FROM (
  VALUES
    ('作業準時完成', 'Homework On Time', '作業按時繳交', 'Submit homework on time', TRUE, 1),
    ('主動複習', 'Self Review', '自主安排複習', 'Take initiative to review', TRUE, 2),
    ('小考表現優良', 'Great Quiz Performance', '小考達到目標成績', 'Reach target score in quiz', TRUE, 3),
    ('課堂參與積極', 'Active Participation', '課堂參與與回應積極', 'Actively participate in class', TRUE, 4),
    ('主動幫助同學', 'Help Classmates', '主動協助同儕學習', 'Help classmates proactively', TRUE, 5)
) AS v(name_zh, name_en, description_zh, description_en, is_active, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM achievement_events e WHERE e.name_zh = v.name_zh
);

INSERT INTO achievement_event_reward_rules (event_id, reward_type_id, default_amount, is_default)
SELECT
  e.id,
  rt.id,
  x.default_amount,
  TRUE
FROM (
  VALUES
    ('作業準時完成', 'points', 5::numeric),
    ('主動複習', 'stars', 1::numeric),
    ('小考表現優良', 'money', 10::numeric),
    ('課堂參與積極', 'hearts', 1::numeric),
    ('主動幫助同學', 'diamonds', 1::numeric)
) AS x(event_name_zh, reward_type_key, default_amount)
JOIN achievement_events e ON e.name_zh = x.event_name_zh
JOIN custom_reward_types rt ON rt.type_key = x.reward_type_key
ON CONFLICT (event_id, reward_type_id) DO UPDATE SET
  default_amount = EXCLUDED.default_amount,
  is_default = EXCLUDED.is_default;
