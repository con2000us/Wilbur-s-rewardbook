#!/usr/bin/env python3
"""
parse-assessment.py — Stage 2: 從 LLM 填好的優先級表套用規則，產出最終欄位
用法:
  python3 parse-assessment.py --table <llm_output.txt>
"""

import argparse, json, os, re, sys
from datetime import datetime

import requests

BASE = "http://127.0.0.1:8043"
KEY_FILE = "/opt/supabase-docker/.supabase_keys.json"

def db_get(path, params=None):
    with open(KEY_FILE) as f:
        k = json.load(f)["SERVICE_ROLE_KEY"]
    r = requests.get(f"{BASE}{path}",
        headers={"apikey":k,"Authorization":f"Bearer {k}"},
        params=params)
    return r.json() if r.status_code == 200 else []

def load_db_subjects(student_id=None):
    params = {"select": "name"}
    if student_id:
        params["student_id"] = f"eq.{student_id}"
    return [s["name"] for s in (db_get("/rest/v1/subjects", params) or [])]

# ── 解析 LLM 填好的表 ──
def parse_table(llm_output):
    """將 LLM 的 key: value 輸出解析為 dict"""
    fields = {}
    for line in llm_output.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        m = re.match(r'^([^：:]+)[：:]\s*(.*)', line)
        if m:
            key = m.group(1).strip()
            value = m.group(2).strip()
            if value and value not in ('無', '', '?', '？', '-'):
                fields[key] = value
    return fields

# ── 套用優先級規則 ──
KNOWN = set()

def resolve(fields, student_id=None):
    global KNOWN
    if not KNOWN:
        KNOWN = set(load_db_subjects(student_id))

    q = []  # questions
    result = {}

    # ── 科目 ──
    subj = (fields.get('科目_使用者指定') or
            fields.get('科目_標題區') or
            fields.get('科目_mapping') or
            fields.get('科目_內文判斷'))
    result['subject'] = subj
    if not subj:
        q.append({"field":"subject","question":"無法辨識科目，這是哪一科？"})
    elif subj not in KNOWN:
        q.append({"field":"subject","candidate":subj,
                  "question":f"科目「{subj}」不在資料庫中，要歸到哪個科目？🚫禁止新增"})

    # ── 總分（數字 or 等第）──
    score_user = fields.get('總分_使用者指定')
    score_title = fields.get('總分_標題區')
    grade_user = fields.get('等第_使用者指定')
    grade_title = fields.get('等第_標題區')
    subs = fields.get('總分_小計', '')

    score_val = score_user or score_title
    grade_val = grade_user or grade_title

    # 嘗試數字總分
    if score_val and re.match(r'^\d+$', str(score_val).strip()):
        result['score'] = int(str(score_val).strip())
        result['score_type'] = 'numeric'
        result['scoring_mode'] = 'scored'
    # 嘗試等第（A~F，可含 +-）
    elif grade_val and re.match(r'^[A-F][+-]?$', str(grade_val).strip().upper()):
        result['grade'] = str(grade_val).strip().upper()
        result['score_type'] = 'letter'
        result['scoring_mode'] = 'scored'
    elif score_val and re.match(r'^[A-F][+-]?$', str(score_val).strip().upper()):
        # 總分欄位裡其實是等第（如 vision 把 A 填到總分欄位）
        result['grade'] = str(score_val).strip().upper()
        result['score_type'] = 'letter'
        result['scoring_mode'] = 'scored'
    else:
        result['score'] = None
        result['scoring_mode'] = None  # 下面評分模式段落會設為 record_only
    result['sub_scores_raw'] = subs if subs else None

    # ── 標題 ──
    title = fields.get('標題_使用者指定') or fields.get('標題_標題區')
    result['title'] = title if title else f"{subj or '評量'}測驗"

    # ── 評量類型 ──
    type_user = fields.get('類型_使用者指定')
    type_key = fields.get('類型_關鍵字', '')
    t = type_user or ''
    if not t:
        t = type_key
    if 'quiz' in t.lower() or '小考' in t: result['type'] = 'quiz'
    elif 'homework' in t.lower() or '作業' in t: result['type'] = 'homework'
    elif 'project' in t.lower() or '專案' in t or '報告' in t: result['type'] = 'project'
    else: result['type'] = 'exam'

    # ── 評分模式 ──
    mode_user = fields.get('評分模式_使用者指定')
    mode_detect = fields.get('評分模式_有無總分')
    has_score = result.get('score') is not None
    has_grade = result.get('grade') is not None

    if mode_user:
        result['scoring_mode'] = 'scored' if 'scored' in mode_user else 'record_only'
    elif has_score or has_grade:
        result['scoring_mode'] = 'scored'
    elif mode_detect and 'record_only' in mode_detect:
        result['scoring_mode'] = 'record_only'
    else:
        # 無數字分數、無等第、也無使用者指定 → 自動不計分
        result['scoring_mode'] = 'record_only'

    # ── 滿分 ──
    mx_user = fields.get('滿分_使用者指定')
    mx_paper = fields.get('滿分_考卷標示')
    mx = mx_user or mx_paper
    if mx and mx.isdigit():
        mx = int(mx)
        result['max_score'] = mx
        if mx != 100:
            q.append({"field":"max_score","question":f"滿分是 {mx}，不是 100，要調整嗎？"})
    else:
        result['max_score'] = 100

    # ── 日期 ──
    date_user = fields.get('日期_使用者指定')
    date_paper = fields.get('日期_考卷標示')
    result['date'] = date_user or date_paper or datetime.now().strftime('%Y-%m-%d')

    result['questions'] = q
    return result


def output(parsed):
    has_q = len(parsed.get('questions', [])) > 0
    out = {
        "status": "need_clarification" if has_q else "ok",
        "fields": {
            "subject": parsed.get('subject'),
            "score": parsed.get('score'),
            "grade": parsed.get('grade'),
            "score_type": parsed.get('score_type', 'numeric'),
            "title": parsed.get('title'),
            "max_score": parsed.get('max_score', 100),
            "type": parsed.get('type', 'exam'),
            "scoring_mode": parsed.get('scoring_mode'),
            "date": parsed.get('date'),
        },
        "sub_scores": parsed.get('sub_scores_raw'),
        "questions": parsed.get('questions', []),
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))

    print(f"\n📋 最終結果:", file=sys.stderr)
    print(f"  科目: {parsed.get('subject') or '❓'}", file=sys.stderr)
    if parsed.get('score') is not None:
        print(f"  總分: {parsed['score']} / {parsed.get('max_score',100)}", file=sys.stderr)
    elif parsed.get('grade'):
        print(f"  等第: {parsed['grade']}", file=sys.stderr)
    else:
        print(f"  分數: 無（不計分）", file=sys.stderr)
    print(f"  模式: {parsed.get('scoring_mode') or '❓'}", file=sys.stderr)
    print(f"  標題: {parsed.get('title')}", file=sys.stderr)
    print(f"  類型: {parsed.get('type')}", file=sys.stderr)
    print(f"  日期: {parsed.get('date')}", file=sys.stderr)
    if parsed.get('sub_scores_raw'):
        print(f"  小計: {parsed['sub_scores_raw']} (僅備註)", file=sys.stderr)
    if has_q:
        print(f"\n🤔 需確認:", file=sys.stderr)
        for q in parsed['questions']:
            print(f"  - {q['question']}", file=sys.stderr)

    return 2 if has_q else 0


def main():
    p = argparse.ArgumentParser(description="Stage 2: 從 LLM 優先級表套規則")
    p.add_argument("--table", required=True, help="LLM 填好的優先級表文字")
    p.add_argument("--student-id", help="學生 UUID")
    args = p.parse_args()

    fields = parse_table(args.table)
    parsed = resolve(fields, args.student_id)
    sys.exit(output(parsed))


if __name__ == "__main__":
    main()