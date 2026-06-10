# Wilbur Reward Book — Discord Agent 腳本參考

> 給 Discord DM agent 用的 script 呼叫指南。
> 所有腳本位於 `/opt/wilbur-rewardbook/scripts/`，用 `python3` 執行。
> 最後一行固定輸出 JSON，方便解析結果。

---

## 腳本總覽

| 腳本 | 用途 | 觸發關鍵字 |
|------|------|-----------|
| `ocr-assess.py` | **🆕 拍照自動辨識** — 從考卷照片自動擷取分數/科目/標題 | 照片、圖片 |
| `add-assessment.py` | 新增考試/評量成績 | 分數、成績、考了、考卷 |
| `add-reward.py` | 手動給獎勵 | 獎勵、加分、很棒、幫忙 |
| `add-penalty.py` | 手動懲罰扣點 | 扣分、處罰、沒寫、忘記 |
| `query-student.py` | 查學生狀態 | 狀態、查詢、表現、最近 |

---

## 🆕 拍照自動登錄 (OCR)

> **最簡單的使用方式！** 直接拍考卷照片傳給 bot，自動辨識後登錄。

### Agent 工作流程（含學習型辨識）
```
1. 收到 DM 附圖（考卷照片）
2. 下載圖片到 /tmp/wilbur_ocr_xxx.jpg
3. 呼叫 vision_analyze 分析圖片
4. 呼叫 ocr-assess.py 解析結果
5. 如果回傳 status=need_confirmation → 問使用者不確定的項目
6. 使用者回答後 → 再次呼叫 ocr-assess.py 帶入確認值
7. 腳本自動存入 paper_templates.json（紙本特徵記憶）
8. 下次相同學校/格式的考卷 → 自動比對，無需再問
```

### 互動範例
```
家長: [傳送考卷照片]
Bot:  🤔 辨識結果：分數 88，但不確定：
      1. 這是哪一科的考卷？
      2. 評量類型是？(exam=考試/quiz=小考/homework=作業/project=專案)

家長: 自然，小考
Bot:  ✅ 已記憶此考卷格式（台南市立XX國中）
      自然科 小考 88分 已登錄！🎁 +10 積分

─── 一週後 ───

家長: [傳送同一學校的另一張考卷照片]
Bot:  ✅（自動比對到台南市立XX國中格式）
      自然科 期中考 95分 已登錄！🎁 +10 積分
```

### CLI 用法
```
python3 /opt/wilbur-rewardbook/scripts/ocr-assess.py \
  --student <學生名> \
  --image <圖片路徑> \
  --vision-result "<vision_analyze 回傳的文字>"
```

### Agent 實作範例 (Python pseudocode)
```python
# Step 1: 下載 Discord 附件
attachment_url = message.attachments[0].url
img_path = f"/tmp/wilbur_ocr_{uuid4().hex[:8]}.jpg"
subprocess.run(["curl", "-o", img_path, attachment_url])

# Step 2: Vision 分析
vision_text = vision_analyze(image_url=img_path,
    question="請讀取這張考卷上的科目、分數、評量名稱。只需回覆純文字，格式如: 國語 95分 期中考")

# Step 3: 自動登錄
result = subprocess.run([
    "python3", "/opt/wilbur-rewardbook/scripts/ocr-assess.py",
    "--student", default_student,
    "--image", img_path,
    "--vision-result", vision_text,
], capture_output=True, text=True)
```

### 辨識能力
支援格式:
- `國語 95 分` → subject=國語, score=95
- `數學 88分 小考` → subject=數學, score=88, type=quiz
- `英文 A- 單字測驗` → subject=英文, grade=A-
- `自然 92/100 期中考` → subject=自然, score=92, max=100
- `社會 B+` → subject=社會, grade=B+

若辨識不出科目或分數，腳本會報錯，agent 再向使用者確認。

---

## 1. add-assessment — 新增評量

```
python3 /opt/wilbur-rewardbook/scripts/add-assessment.py \
  --student <學生名> \
  --subject <科目名> \
  --type <exam|quiz|homework|project> \
  --score <分數> \
  --title "<評量名稱>" \
  [--max <滿分=100>] \
  [--notes "<備註>"] \
  [--grade <等第>] \
  [--image <圖片路徑>]
```

### 參數說明
| 參數 | 必填 | 說明 |
|------|------|------|
| `--student` | ✅ | 學生名稱（模糊比對，如「小寶」） |
| `--subject` | ✅ | 科目名稱（如「國語」「數學」） |
| `--title` | ✅ | 評量名稱（如「期中考第1回」） |
| `--score` | 擇一 | 數字分數（如 95） |
| `--grade` | 擇一 | 等第（如 A, B+, C-） |
| `--type` | ✅ | exam=考試, quiz=小考, homework=作業, project=專案 |
| `--max` | | 滿分，預設 100 |
| `--notes` | | 備註 |
| `--image` | | 考卷照片路徑（jpg/png/webp，會上傳到 Supabase） |

### 輸出範例
```json
{"student":"李承新","subject":"國語","title":"期末考","score":95,"max":100,"percentage":95,"reward":10,"assessment_id":"..."}
```

### DM 解析規則
```
"國語 95 分" + 照片 → --student <預設學生> --subject 國語 --score 95 --type exam --title "國語評量"
"數學小考 88"       → --subject 數學 --score 88 --type quiz --title "數學小考"
"英文 A-"           → --subject 英文 --grade A- --type exam --title "英文測驗"
```

---

## 2. add-reward — 手動獎勵

```
python3 /opt/wilbur-rewardbook/scripts/add-reward.py \
  --student <學生名> \
  --type <points|money|hearts|stars|diamonds> \
  --amount <數量> \
  --reason "<原因>"
```

### 參數說明
| 參數 | 說明 |
|------|------|
| `--type` | 獎勵類型：points=積分⭐, money=獎金💰, hearts=愛心❤️, stars=星星🌟, diamonds=鑽石💎 |
| `--amount` | 數量（正數） |
| `--reason` | 原因說明 |

### 輸出範例
```json
{"student":"李承新","reward_type":"hearts","amount":3,"transaction_id":"..."}
```

### DM 解析規則
```
"+3 愛心 幫忙做家事"      → --type hearts --amount 3 --reason "幫忙做家事"
"獎勵 5 積分 主動看書"     → --type points --amount 5 --reason "主動看書"
"給 100 獎金 月考第一名"   → --type money --amount 100 --reason "月考第一名"
```

---

## 3. add-penalty — 手動懲罰

```
python3 /opt/wilbur-rewardbook/scripts/add-penalty.py \
  --student <學生名> \
  --type <points|money|hearts|stars|diamonds> \
  --amount <數量> \
  --reason "<原因>"
```

### 說明
參數同 add-reward，但 `--amount` 會自動轉為負值（扣分）。

### DM 解析規則
```
"-2 星星 沒寫作業"      → --type stars --amount 2 --reason "沒寫作業"
"扣 5 積分 上課講話"     → --type points --amount 5 --reason "上課講話"
```

---

## 4. query-student — 查詢狀態

```
python3 /opt/wilbur-rewardbook/scripts/query-student.py \
  --student <學生名> \
  [--recent <筆數=5>] \
  [--json]
```

```
python3 /opt/wilbur-rewardbook/scripts/query-student.py --list
```

### 輸出範例（人類可讀）
```
📊 李承新 的學習狀態
=============================================
📚 科目表現
  translate 國語       3 次評量, 平均 93.5%  [92% → 95% → ...]
  calculate 數學       2 次評量, 平均 88.0%
💰 獎勵餘額
  ⭐ 積分   累積 150分  | 已用 20分  | 目前 130分
  💰 獎金   累積 500元  | 已用 100元 | 目前 400元
🕐 最近 5 筆紀錄
  +10 ⭐  國語 期末考 (95/100)          2026-06-07
  -2  🌟  沒寫作業                       2026-06-06
```

### DM 解析規則
```
"小寶 狀態"       → --student 小寶
"小寶 最近"       → --student 小寶 --recent 10
"查詢 李承新"     → --student 李承新
"列出學生"        → --list
```

---

## 重要規則

### 學生對照
如果 DM 中沒有明確指定學生（單一小孩的家庭），Agent 應：
1. 先用 `query-student.py --list` 取得學生列表
2. 只有一個學生 → 自動選用
3. 多個學生 → 從訊息中解析名稱，解析不出來就問使用者

### 錯誤處理
- 腳本 exit code ≠ 0 → 失敗，讀取 stderr
- 找不到學生/科目 → 回覆提示使用者先建立
- 圖片上傳失敗 → 仍然建立評量（只跳過圖片）

### JSON 輸出
每個腳本最後一行固定輸出 JSON，格式為：
```json
{"student":"...", ...}
```
Agent 應讀取最後一行解析結果，前面的文字是給人類看的摘要。

---

## 環境需求

- Python 3 + `requests` 套件
- Supabase API key 快取在 `~/.supabase_keys.json`
- Supabase REST API 在 `http://127.0.0.1:8043`
- 圖片上傳到 storage bucket `assessment-imports`
