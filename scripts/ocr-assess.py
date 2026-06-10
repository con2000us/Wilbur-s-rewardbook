#!/usr/bin/env python3
"""
ocr-assess.py — 從考卷圖片自動辨識並登錄評量（含學習型紙本記憶）

流程:
  1. 如果有不確定的欄位 → status="need_clarification"，問使用者
  2. 全部欄位確定 → 直接寫入 DB，顯示儲存摘要

  使用者回答不確定欄位:
    python3 ocr-assess.py ... --confirm-subject 國語 --confirm-type quiz

紙本特徵記憶: /opt/wilbur-rewardbook/scripts/paper_templates.json
"""

import argparse, hashlib, json, os, re, subprocess, sys
from datetime import datetime

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_FILE = os.path.join(SCRIPTS_DIR, "paper_templates.json")
# 實際存在於資料庫的科目（會自動查詢更新）
# 注意：不要在這裡寫死科目對應！
# 遇到不在資料庫的科目 → 問使用者 → 記入 skill 自訂經驗
SUBJECTS = [
    "國語", "數學", "英文", "社會", "自然",
    "音樂", "體育", "美術", "作文",
]

SCORE_KEYWORDS = re.compile(r'分數|分\b|score|成績|得分|總分|配分|满分|滿分', re.IGNORECASE)
TEMPLATE_FEATURES = re.compile(
    r'學校|國中|國小|高中|國民|學年度|學期|年級|班級|座號|姓名|'
    r'命題|教師|老師|選擇題|填充題|是非題|問答題|應用題|計算題|'
    r'作答|答案|得分|扣分|注意事項|考試時間|分鐘',
    re.IGNORECASE
)


def load_templates():
    if os.path.exists(TEMPLATE_FILE):
        with open(TEMPLATE_FILE) as f:
            return json.load(f)
    return []


def save_templates(templates):
    with open(TEMPLATE_FILE, 'w') as f:
        json.dump(templates, f, ensure_ascii=False, indent=2)


def extract_fingerprint(text):
    lines = text.split('\n')
    features = []
    for line in lines:
        cleaned = re.sub(r'\d+', '', line).strip()
        if not cleaned:
            continue
        if SCORE_KEYWORDS.search(cleaned) and len(cleaned) < 10:
            continue
        if TEMPLATE_FEATURES.search(cleaned):
            features.append(cleaned)
    if not features:
        cleaned = re.sub(r'\d+', '', text)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        features.append(cleaned[:200])
    return hashlib.md5((' | '.join(features[:5])).encode()).hexdigest()[:12]


# ── 標題正規化 ──
def normalize_title(title: str) -> str:
    """
    統一評量標題格式，避免不同輸入格式（L5, 第5課, Lesson5）混雜
    回傳正規化後的標題，如無法辨識則回傳原文
    """
    if not title:
        return title

    t = title.strip()

    # L1, L2, L.3, L-4 → 第N課
    m = re.match(r'^[Ll]\.?\s*-?\s*(\d+)\s*$', t)
    if m:
        return f"第{m.group(1)}課"

    # Lesson 1, Lesson.2 → 第N課
    m = re.match(r'^[Ll]esson\.?\s*(\d+)\s*$', t)
    if m:
        return f"第{m.group(1)}課"

    # Ch1, Ch.2, Chapter 3 → 第N章
    m = re.match(r'^[Cc]h(?:apter)?\.?\s*(\d+)\s*$', t)
    if m:
        return f"第{m.group(1)}章"

    # U1, U.2, Unit 3 → 第N單元
    m = re.match(r'^[Uu](?:nit)?\.?\s*(\d+)\s*$', t)
    if m:
        return f"第{m.group(1)}單元"

    # 第一課, 第二課 → 第N課
    chinese_nums = {"一": "1", "二": "2", "三": "3", "四": "4", "五": "5",
                    "六": "6", "七": "7", "八": "8", "九": "9", "十": "10"}
    m = re.match(r'^第([一二三四五六七八九十])([課章回單元])', t)
    if m:
        num = chinese_nums.get(m.group(1), m.group(1))
        unit = m.group(2)
        # 補全「單元」
        if unit == "單" and t[m.end(2):m.end(2)+1] == "元":
            unit = "單元"
        return f"第{num}{unit}"

    # 第N課(空格)文字 → keep "第N課" prefix, drop extra text
    # e.g. "第5課 動物的世界" → "第5課"
    m = re.match(r'^(第\d+[課章回單元])', t)
    if m:
        return m.group(1)

    return t


def parse_vision_result(text):
    r = {
        "subject": None, "score": None, "grade": None,
        "title": None, "max_score": 100, "type": None,
        "confidence": {"subject": "none", "score": "none", "type": "none", "title": "none"},
        "uncertainties": [],
    }
    # 科目
    for s in SUBJECTS:
        if s in text:
            r["subject"] = s; r["confidence"]["subject"] = "high"; break
    if not r["subject"]:
        m = re.search(r'([^\s，。,.\d]{1,4})科(?:\s|$|[，。,.\d])', text)
        if not m:
            m = re.search(r'(自然與生活科技|生活與科技|健康與體育)', text)
        if m and len(m.group(1)) >= 1:
            candidate = m.group(1)
            r["subject"] = candidate
            r["confidence"]["subject"] = "low"
            r["uncertainties"].append({"field": "subject", "value": candidate,
                "question": f"科目「{candidate}」不在資料庫中，要歸到哪個科目？或要新增科目？"})
    gm = re.search(r'\b([A-C][+-]?|[DF])\b', text, re.IGNORECASE)
    if gm: r["grade"] = gm.group(1).upper()

    # 移除「不計分」等關鍵字，避免干扰分數解析
    text_cleaned = re.sub(r'不計分|不打分|免計分', '', text)

    # 分數 — 排除括號內的小計（如「是非題(20分)」），只匹配評量總分
    for pat, has_max in [
        (r'(?<!\()(?:(?:總分|得分|成績|配分)[：:\s]*)?(\d{2,3})\s*分', False),
        (r'成績[：:\s]*(\d{2,3})', False),
        (r'(\d{2,3})\s*/\s*(\d{2,3})', True),
    ]:
        m = re.search(pat, text)
        if m and 0 <= int(m.group(1)) <= 999:
            r["score"] = int(m.group(1)); r["confidence"]["score"] = "high"
            r["scoring_mode"] = "scored"
            if has_max and len(m.groups()) > 1 and m.group(2):
                r["max_score"] = int(m.group(2))
            break
    if r["score"] is None:
        # 沒有數字分數 → 先看有沒有等第
        if r.get("grade"):
            r["scoring_mode"] = "scored"
            r["confidence"]["score"] = "letter"
        else:
            for ns in re.findall(r'\b(\d{2,3})\b', text_cleaned):
                n = int(ns)
                if 40 <= n <= 200:
                    r["score"] = n; r["confidence"]["score"] = "medium"
                    r["scoring_mode"] = "scored"
                    r["uncertainties"].append({"field": "score", "value": n, "question": f"分數是 {n} 分嗎？"})
                    break
            if r["score"] is None:
                # 無分數也無等第 → 自動不計分
                r["scoring_mode"] = "record_only"

    # 標題
    for pat in [r'(第[一二三四五六七八九十\d]+[次回][^\s，。,.]*)', r'(期[初中末]考)', r'(月考)',
                r'([^\s，。,.]*小考[^\s，。,.]*)', r'([^\s，。,.]*測驗[^\s，。,.]*)', r'([^\s，。,.]*作業[^\s，。,.]*)']:
        m = re.search(pat, text)
        if m: r["title"] = m.group(1); r["confidence"]["title"] = "high"; break
    # 如果 pattern 沒抓到，嘗試用 normalize_title 處理每個詞
    if not r["title"]:
        for word in re.split(r'[，。,.\s]+', text):
            norm = normalize_title(word)
            if norm != word:
                r["title"] = norm; r["confidence"]["title"] = "medium"; break

    # 類型
    if any(w in text for w in ["小考","quiz"]): r["type"]="quiz"; r["confidence"]["type"]="high"
    elif any(w in text for w in ["作業","homework"]): r["type"]="homework"; r["confidence"]["type"]="high"
    elif any(w in text for w in ["專案","報告","project"]): r["type"]="project"; r["confidence"]["type"]="high"
    elif any(w in text for w in ["期中","期末","月考","段考","會考","模擬考"]): r["type"]="exam"; r["confidence"]["type"]="high"
    else:
        r["type"]="exam"; r["confidence"]["type"]="low"
        r["uncertainties"].append({"field":"type","value":"exam","question":"評量類型是？(exam=考試/quiz=小考/homework=作業/project=專案)"})

    # ── 手動獎勵覆蓋（override 關鍵字） ──
    manual_reward = None
    reward_type_override = None
    no_reward = False

    override_patterns = [
        (r'獎勵\s*(\d+)\s*(分|元|顆|點)?', 'amount'),
        (r'給\s*(\d+)\s*(分|元|顆|點)', 'amount'),
        (r'加\s*(\d+)\s*(分|元|顆|點)', 'amount'),
    ]
    for pat, _ in override_patterns:
        m = re.search(pat, text)
        if m:
            manual_reward = int(m.group(1))
            unit = m.group(2) if m.lastindex >= 2 else None
            if unit in ('分', '點'): reward_type_override = 'points'
            elif unit == '元': reward_type_override = 'money'
            elif unit == '顆': reward_type_override = 'stars'
            r["manual_reward"] = manual_reward
            r["reward_type_override"] = reward_type_override
            break

    if any(w in text for w in ["不獎勵", "沒獎勵", "不給", "免獎"]):
        r["no_reward"] = True

    return r


# ── 模糊比對歷史標題（避免 OCR 格式誤差） ──
def fuzzy_match_title(title: str, subject_id: str, threshold: float = 0.8):
    """
    查詢同科目過去的評量標題，找出與 OCR 結果相近的已有格式。
    回傳: (best_match_title, similarity_score) 或 (None, 0)

    用於處理 OCR 微誤差，如:
      OCR 讀到 "L 1" 但歷史紀錄都是 "L1" → 建議用 "L1"
      OCR 讀到 "L.3" 但歷史紀錄都是 "L3" → 建議用 "L3"
    """
    if not title or not subject_id:
        return None, 0

    import requests as req
    try:
        with open("/opt/supabase-docker/.supabase_keys.json") as f:
            k = json.load(f)["SERVICE_ROLE_KEY"]
        hdrs = {"apikey": k, "Authorization": f"Bearer {k}"}

        # 取得同科目的歷史標題
        r = req.get(
            "http://127.0.0.1:8043/rest/v1/assessments",
            headers=hdrs,
            params={
                "subject_id": f"eq.{subject_id}",
                "select": "title",
                "order": "created_at.desc",
                "limit": 50,
            }
        )
        # 去重
        seen = set()
        past_titles = []
        for a in (r.json() or []):
            t = a.get("title", "")
            if t and t not in seen:
                seen.add(t)
                past_titles.append(t)

        # 正規化函數：去掉空白、點、橫線，轉小寫
        def normalize(s):
            return re.sub(r'[\s.\-]+', '', s).lower()

        norm_title = normalize(title)

        best_match = None
        best_score = 0

        for past in past_titles:
            norm_past = normalize(past)

            # 完全一致（忽略空白/符號）
            if norm_title == norm_past:
                return past, 1.0

            # 計算相似度（簡單的 Levenshtein ratio）
            if len(norm_title) > 0 and len(norm_past) > 0:
                # 用 SequenceMatcher
                import difflib
                score = difflib.SequenceMatcher(None, norm_title, norm_past).ratio()
                if score > best_score and score >= threshold:
                    best_score = score
                    best_match = past

        return best_match, best_score

    except Exception:
        return None, 0


def match_template(fp, templates):
    for t in templates:
        if t.get("fingerprint") == fp:
            return t
    return None


def build_template(fp, text, parsed, confirmations):
    return {
        "fingerprint": fp,
        "subject": confirmations.get("subject") or parsed.get("subject"),
        "default_type": confirmations.get("type") or parsed.get("type"),
        "created_at": datetime.now().isoformat(),
        "sample_text": text[:200],
        "hits": 1,
    }


def output_json(data):
    print(json.dumps(data, ensure_ascii=False))


def main():
    p = argparse.ArgumentParser(description="OCR 考卷辨識 + 登錄")
    p.add_argument("--student", required=True)
    p.add_argument("--image", required=True, nargs="+", help="考卷圖片路徑（可多張）")
    p.add_argument("--vision-result", required=True)
    p.add_argument("--confirm-subject")
    p.add_argument("--confirm-type", choices=["exam","quiz","homework","project"])
    p.add_argument("--confirm-score", type=float)
    p.add_argument("--confirm-title")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--skip-template", action="store_true")
    p.add_argument("--confirm", action="store_true",
                   help="配合 --ask-before-save，確認寫入")
    p.add_argument("--ask-before-save", action="store_true",
                   help="即使全部辨識成功，也先顯示摘要請使用者確認再寫入")
    args = p.parse_args()

    if not args.dry_run:
        for img in args.image:
            if not os.path.exists(img):
                print(f"❌ 圖片不存在: {img}"); sys.exit(1)

    vision_text = args.vision_result
    templates = [] if args.skip_template else load_templates()
    fingerprint = extract_fingerprint(vision_text)
    parsed = parse_vision_result(vision_text)

    # 套用使用者確認
    if args.confirm_subject:
        parsed["subject"] = args.confirm_subject; parsed["confidence"]["subject"] = "confirmed"
    if args.confirm_type:
        parsed["type"] = args.confirm_type; parsed["confidence"]["type"] = "confirmed"
    if args.confirm_score:
        parsed["score"] = args.confirm_score; parsed["confidence"]["score"] = "confirmed"
    if args.confirm_title:
        parsed["title"] = args.confirm_title; parsed["confidence"]["title"] = "confirmed"

    # 比對 template
    template = match_template(fingerprint, templates)
    template_info = ""
    if template:
        if not args.confirm_subject and not parsed["subject"] and template.get("subject"):
            parsed["subject"] = template["subject"]; parsed["confidence"]["subject"] = "template"
        if parsed["confidence"]["type"] == "low" and template.get("default_type"):
            parsed["type"] = template["default_type"]; parsed["confidence"]["type"] = "template"
        template["hits"] = template.get("hits", 0) + 1
        template_info = f"已記憶的考卷格式（第 {template['hits']} 次使用）"

    # ── 檢查不確定欄位 ──
    has_uncertainties = False
    for u in parsed.get("uncertainties", []):
        if parsed["confidence"].get(u["field"]) in ("none", "low"):
            has_uncertainties = True
    if not parsed["subject"] or parsed["confidence"]["subject"] in ("none", "low"):
        has_uncertainties = True

    if has_uncertainties and not any([args.confirm_subject, args.confirm_type,
                                       args.confirm_score, args.confirm_title]):
        # 有疑問 → 回傳問題
        questions = [u for u in parsed.get("uncertainties", [])
                     if parsed["confidence"].get(u["field"]) != "high"]
        if not parsed["subject"]:
            questions.append({"field": "subject", "value": None, "question": "這是哪一科的考卷？"})
        if parsed["confidence"]["type"] == "low" and not any(q["field"]=="type" for q in questions):
            questions.append({"field":"type","value":"exam","question":"評量類型是？(exam/quiz/homework/project)"})

        result = {"status":"need_clarification","fingerprint":fingerprint,
                  "parsed":{k:v for k,v in parsed.items() if k!="confidence"},
                  "questions":questions,"template_matched":template is not None}
        output_json(result)
        print(f"\n🤔 有 {len(questions)} 個不確定的項目：")
        for i, q in enumerate(questions):
            print(f"  {i+1}. {q['question']}")
        sys.exit(2)

    # ── 全部確定 → 儲存 template（若有新資訊） ──
    if not args.skip_template and (args.confirm_subject or args.confirm_type):
        if not template:
            template = build_template(fingerprint, vision_text, parsed,
                                       {"subject": args.confirm_subject, "type": args.confirm_type})
            templates.append(template)
        else:
            if args.confirm_subject: template["subject"] = args.confirm_subject
            if args.confirm_type: template["default_type"] = args.confirm_type
        save_templates(templates)

    if args.dry_run:
        output_json({"status":"dry_run","parsed":{k:v for k,v in parsed.items() if k!="confidence"}})
        return

    # ── ask-before-save 模式：先顯示摘要，等使用者 --confirm ──
    if args.ask_before_save and not args.confirm:
        summary = (f"📋 評量資料預覽\n"
                   f"  學生：{args.student}\n"
                   f"  科目：{parsed['subject']}  |  分數：{parsed['score']}/{parsed.get('max_score',100)}\n"
                   f"  類型：{parsed.get('type','exam')}")
        if parsed.get("title"): summary += f"\n  標題：{parsed['title']}"
        if parsed.get("grade"): summary += f"\n  等第：{parsed['grade']}"
        if template_info: summary += f"\n  📋 {template_info}"

        result = {"status":"pending_confirmation","fingerprint":fingerprint,
                  "parsed":{k:v for k,v in parsed.items() if k!="confidence"},
                  "summary":summary,"template_matched":template is not None}
        output_json(result)
        print(f"\n{summary}")
        print(f"\n  確認無誤？執行: ... --confirm")
        sys.exit(0)

    cmd = [sys.executable, os.path.join(SCRIPTS_DIR, "add-assessment.py"),
           "--student", args.student,
           "--subject", parsed["subject"],
           "--type", parsed.get("type", "exam")] + \
          [item for img in args.image for item in ("--image", img)]
    if parsed["score"] is not None:
        cmd += ["--score", str(parsed["score"]), "--max", str(parsed.get("max_score", 100))]
    if parsed["grade"]:
        cmd += ["--grade", parsed["grade"]]
    cmd += ["--title", parsed["title"] or f"{parsed['subject']}測驗"]
    if parsed.get("no_reward"):
        cmd += ["--no-reward"]
    if parsed.get("scoring_mode") == "record_only":
        cmd += ["--scoring-mode", "record_only"]
    if parsed.get("manual_reward") is not None:
        cmd += ["--manual-reward", str(parsed["manual_reward"])]
        if parsed.get("reward_type_override"):
            cmd += ["--reward-type", parsed["reward_type_override"]]

    sub_result = subprocess.run(cmd, capture_output=True, text=True)
    assessment_id = None
    reward_info = ""
    for line in sub_result.stdout.strip().split('\n'):
        line = line.strip()
        if line.startswith('{'):
            try:
                d = json.loads(line)
                assessment_id = d.get("assessment_id")
                if d.get("reward"):
                    reward_info = f"\n  🎁 獎勵: +{d['reward']}"
            except json.JSONDecodeError:
                pass

    # ── 顯示儲存摘要 ──
    print(f"\n✅ 已存入資料庫")
    print(f"  學生：{args.student}")
    print(f"  科目：{parsed['subject']}  |  分數：{parsed['score']}/{parsed.get('max_score',100)}  |  類型：{parsed.get('type','exam')}")
    if parsed.get("title"):
        print(f"  標題：{parsed['title']}")
    if parsed.get("grade"):
        print(f"  等第：{parsed['grade']}")
    if template_info:
        print(f"  📋 {template_info}")
    if reward_info:
        print(reward_info)

    # 顯示修改/刪除指引
    print(f"\n  📝 有誤？")
    print(f"     修改: python3 {SCRIPTS_DIR}/query-student.py --student {args.student} --recent 3")
    print(f"     然後: python3 {SCRIPTS_DIR}/add-assessment.py --help  # update/delete")

    result = {"status":"ok","student":args.student,"subject":parsed["subject"],
              "score":parsed["score"],"type":parsed.get("type","exam"),
              "assessment_id":assessment_id,"fingerprint":fingerprint}
    if reward_info:
        result["reward"] = sub_result.stdout.strip().split('\n')[-1]
    output_json(result)
    sys.exit(sub_result.returncode)


if __name__ == "__main__":
    main()
