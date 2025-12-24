# 📚 按科目設置獎金規則指南

## 🎯 重要更新

現在系統支援**為不同科目設置不同的獎金規則**！

例如：
- 數學滿分 → $50 💎
- 國語滿分 → $30 📖
- 英文滿分 → $20 🌍

---

## 🚀 快速開始

### 步驟 1：執行數據庫遷移

在 **Supabase SQL Editor** 執行：

```sql
-- 為 reward_rules 表添加 subject_id 字段
ALTER TABLE reward_rules 
ADD COLUMN subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE;

-- 添加索引
CREATE INDEX idx_reward_rules_subject_id ON reward_rules(subject_id);
```

或直接執行腳本：
```
📄 database/migrations/add-subject-to-reward-rules.sql
```

### 步驟 2：訪問設置頁面

```
http://localhost:3000/settings
```

### 步驟 3：添加科目規則

1. 點擊「➕ 添加新規則」
2. **適用科目**：選擇特定科目（例如：📖 國語）
3. **適用學生**：選擇「全局」（該科目所有學生適用）
4. 填寫獎金規則
5. 點擊創建

---

## 📊 規則優先級

系統會按以下順序查找匹配的規則：

```
1️⃣ 科目 + 學生特定規則（最高優先）
   例如：小明的數學滿分 → $100
   
2️⃣ 科目全局規則
   例如：數學滿分（所有學生）→ $50
   
3️⃣ 學生全局規則
   例如：小明（所有科目）滿分 → $40
   
4️⃣ 全局規則（最低優先）
   例如：所有科目、所有學生滿分 → $30
```

---

## 💻 使用方法

### 方法 1：網頁界面（推薦）

#### 場景 1：為數學科目設置獎金

1. 訪問 `http://localhost:3000/settings`
2. 點擊「➕ 添加新規則」
3. 填寫：
   - **適用科目**：🔢 數學
   - **適用學生**：🌍 全局（所有學生）
   - **規則名稱**：數學滿分獎
   - **圖標**：💎
   - **最低分數**：100
   - **最高分數**：100
   - **獎金金額**：50
   - **優先級**：20
4. 點擊「✅ 創建規則」

#### 場景 2：為小明的數學設置特殊獎金

1. 填寫：
   - **適用科目**：🔢 數學
   - **適用學生**：小明
   - **獎金金額**：100（更高！）
   - **優先級**：30（比科目全局規則高）

現在小明的數學滿分會得到 $100，而其他學生只得 $50！

---

### 方法 2：使用 SQL（批量設置）

#### 快速為所有科目設置預設規則

```sql
-- 查看所有科目 ID
SELECT id, name, icon FROM subjects;

-- 自動為每個科目創建規則
DO $$
DECLARE
  subject_record RECORD;
BEGIN
  FOR subject_record IN 
    SELECT id, name FROM subjects
  LOOP
    INSERT INTO reward_rules (
      subject_id,
      student_id,
      rule_name,
      icon,
      min_score,
      max_score,
      reward_amount,
      priority,
      is_active
    ) VALUES
      (subject_record.id, NULL, subject_record.name || ' 滿分', '💎', 100, 100, 30, 20, true),
      (subject_record.id, NULL, subject_record.name || ' 優秀', '🥇', 90, 99.99, 10, 19, true),
      (subject_record.id, NULL, subject_record.name || ' 良好', '⚙️', 80, 89.99, 5, 18, true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
```

或執行：
```
📄 database/examples/subject-specific-reward-rules.sql
```

---

## 🎓 實際範例

### 場景：不同科目不同重要性

**需求**：
- 數學最重要 → 獎金最高
- 國語次之 → 獎金中等
- 英文最輕 → 獎金較低

**設置**（使用 SQL）：

```sql
-- 先查看科目 ID
SELECT s.id, s.name, s.icon, st.name as student
FROM subjects s
JOIN students st ON s.student_id = st.id;

-- 數學（高獎金）
INSERT INTO reward_rules (subject_id, rule_name, icon, min_score, max_score, reward_amount, priority) VALUES
  ('數學UUID', '💎 數學滿分', '💎', 100, 100, 50, 20),
  ('數學UUID', '🥇 數學優秀', '🥇', 90, 99.99, 20, 19),
  ('數學UUID', '⚙️ 數學良好', '⚙️', 80, 89.99, 10, 18);

-- 國語（中獎金）
INSERT INTO reward_rules (subject_id, rule_name, icon, min_score, max_score, reward_amount, priority) VALUES
  ('國語UUID', '📖 國語滿分', '📖', 100, 100, 30, 20),
  ('國語UUID', '✏️ 國語優秀', '✏️', 90, 99.99, 10, 19),
  ('國語UUID', '📝 國語良好', '📝', 80, 89.99, 5, 18);

-- 英文（低獎金）
INSERT INTO reward_rules (subject_id, rule_name, icon, min_score, max_score, reward_amount, priority) VALUES
  ('英文UUID', '🌍 英文滿分', '🌍', 100, 100, 20, 20),
  ('英文UUID', '📚 英文優秀', '📚', 90, 99.99, 8, 19),
  ('英文UUID', '✍️ 英文良好', '✍️', 80, 89.99, 4, 18);
```

---

## 🔍 查看和管理規則

### 查看所有規則

```sql
SELECT 
  r.rule_name,
  r.icon,
  s.name as subject,
  s.icon as subject_icon,
  st.name as student,
  r.min_score || '-' || r.max_score || '%' as range,
  '$' || r.reward_amount as reward,
  r.priority
FROM reward_rules r
LEFT JOIN subjects s ON r.subject_id = s.id
LEFT JOIN students st ON r.student_id = st.id
ORDER BY s.name, r.priority DESC;
```

### 查看特定科目的規則

```sql
SELECT *
FROM reward_rules
WHERE subject_id = '科目UUID'
ORDER BY priority DESC;
```

---

## ❓ 常見問題

### Q1: 如果某個科目沒有設置規則會怎樣？

**答**：系統會自動使用全局規則（如果有）或預設的硬編碼規則。

### Q2: 優先級數字應該怎麼設置？

**答**：建議：
- **30+**：特定學生 + 特定科目
- **20-29**：特定科目全局
- **10-19**：特定學生全局
- **0-9**：全局規則

### Q3: 可以為同一科目設置多個分數段嗎？

**答**：可以！例如：
- 100 分 → $50
- 95-99 分 → $30
- 90-94 分 → $20
- 85-89 分 → $10

### Q4: 如何修改現有規則？

**答**：
1. **網頁界面**：先刪除，再重新創建
2. **SQL**：直接更新
   ```sql
   UPDATE reward_rules
   SET reward_amount = 60
   WHERE id = '規則UUID';
   ```

---

## 📈 測試流程

1. ✅ 執行數據庫遷移（添加 subject_id 欄位）
2. ✅ 為不同科目添加獎金規則
3. ✅ 添加一個評量記錄（選擇特定科目）
4. ✅ 查看獎金是否按該科目的規則計算

---

## 🎉 總結

現在您的系統支援：

| 功能 | 狀態 |
|-----|------|
| 全局獎金規則 | ✅ |
| 學生特定規則 | ✅ |
| **科目特定規則** | ✅ **新！** |
| **科目+學生規則** | ✅ **新！** |
| 優先級匹配 | ✅ |
| 網頁管理界面 | ✅ |

每個科目現在可以有自己的獎金標準了！🎯

需要幫助？隨時詢問！💪

