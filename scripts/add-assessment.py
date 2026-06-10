#!/usr/bin/env python3
"""
add-assessment — 新增評量成績，自動計算獎勵並建立交易記錄

用法:
  python3 add-assessment.py --student 小寶 --subject 國語 --score 95 --title "期中考"
  python3 add-assessment.py --student 小寶 --subject 數學 --score 88 --max 100 --type 小考
  python3 add-assessment.py --student 小寶 --subject 英文 --grade A --title "單字測驗" --image /path/to/photo.jpg

附圖: 用 --image 指定圖片路徑，腳本會上傳到 Supabase Storage (assessment-imports bucket)
      並將 public URL 寫入 assessments.image_urls
"""

import argparse, json, os, re, subprocess, sys, uuid
from datetime import datetime, timezone

import requests

BASE = "http://127.0.0.1:8043"
PUBLIC_BASE = "https://mayacraft.net/supabase"  # 公開可存取的 Supabase URL
KEY_FILE = "/opt/supabase-docker/.supabase_keys.json"
BUCKET = "assessment-imports"
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))

def load_key(role="service"):
    with open(KEY_FILE) as f:
        keys = json.load(f)
    return keys.get("SERVICE_ROLE_KEY" if role == "service" else "ANON_KEY")

def headers(role="service"):
    k = load_key(role)
    return {
        "apikey": k,
        "Authorization": f"Bearer {k}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

def supabase_get(path, params=None):
    r = requests.get(f"{BASE}{path}", headers=headers(), params=params)
    r.raise_for_status()
    return r.json()

def supabase_post(path, body):
    r = requests.post(f"{BASE}{path}", headers=headers(), json=body)
    r.raise_for_status()
    return r.json()

def supabase_patch(path, body):
    r = requests.patch(f"{BASE}{path}", headers=headers(), json=body)
    r.raise_for_status()
    return r.json()

def find_student(name):
    data = supabase_get("/rest/v1/students", {"name": f"eq.{name}", "select": "id,name"})
    return data[0] if data else None

def find_student_subject(student_id, subject_name):
    data = supabase_get("/rest/v1/subjects", {
        "student_id": f"eq.{student_id}",
        "name": f"ilike.{subject_name}",
        "select": "id,name,student_id"
    })
    return data[0] if data else None

def find_reward_rules(subject_id=None, student_id=None):
    filters = ["is_active.eq.true"]
    if subject_id:
        filters.append(f"subject_id.eq.{subject_id}")
    if student_id:
        params = {"select": "*"}
        if subject_id:
            params["subject_id"] = f"eq.{subject_id}"
        # Query both subject-scoped and global
    # Fetch all active rules, filter in Python for precision
    data = supabase_get("/rest/v1/reward_rules", {
        "select": "*",
        "is_active": "eq.true",
        "order": "display_order.asc"
    })
    return data

def find_reward_type(type_key):
    data = supabase_get("/rest/v1/custom_reward_types", {
        "type_key": f"eq.{type_key}",
        "select": "id,type_key,display_name,icon,color,default_unit"
    })
    return data[0] if data else None

def match_reward_rule(rules, subject_id, student_id, percentage, assessment_type=None):
    """依照優先級匹配獎勵規則 (複製 Wilbur 邏輯)"""
    def sort_rules(rules):
        return sorted(rules, key=lambda r: (r.get("display_order", 0) or r.get("priority", 0) or 0))

    # 先過濾 assessment_type（Wilbur 原始邏輯）
    if assessment_type:
        rules = [r for r in rules if not r.get("assessment_type") or r.get("assessment_type") == assessment_type]

    subject_student = [r for r in rules if r.get("subject_id") == subject_id and r.get("student_id") == student_id]
    subject_global  = [r for r in rules if r.get("subject_id") == subject_id and not r.get("student_id")]
    student_global  = [r for r in rules if not r.get("subject_id") and r.get("student_id") == student_id]
    global_rules    = [r for r in rules if not r.get("subject_id") and not r.get("student_id")]

    ordered = sort_rules(subject_student) + sort_rules(subject_global) + sort_rules(student_global) + sort_rules(global_rules)

    for rule in ordered:
        cond = rule.get("condition", "score_range")
        rmin = rule.get("min_score")
        rmax = rule.get("max_score")
        if cond == "perfect_score" and percentage == 100:
            return rule
        if cond == "score_equals" and percentage == rmin:
            return rule
        if cond == "score_range" or cond is None:
            lo = float(rmin) if rmin is not None else 0
            hi = float(rmax) if rmax is not None else 100
            if lo <= percentage <= hi:
                return rule
    return None

def fallback_reward(percentage, has_rules):
    if has_rules:
        return 0
    if percentage >= 100: return 30
    if percentage >= 90:  return 10
    if percentage >= 80:  return 5
    return 0


# ── 模糊比對歷史標題（避免 OCR 格式誤差） ──
def fuzzy_match_title(title: str, subject_id: str, threshold: float = 0.8):
    """
    查詢同科目過去的評量標題，找出與輸入相近的已有格式。
    回傳: (best_match_title, similarity_score) 或 (None, 0)

    OCR 微誤差處理:
      "L 1" → 歷史有 "L1" → 建議用 "L1"
      "L.3" → 歷史有 "L3" → 建議用 "L3"
    """
    if not title or not subject_id:
        return None, 0

    try:
        r = requests.get(
            f"{BASE}/rest/v1/assessments",
            headers=headers(),
            params={
                "subject_id": f"eq.{subject_id}",
                "select": "title",
                "order": "created_at.desc",
                "limit": 50,
            }
        )
        seen = set()
        past_titles = []
        for a in (r.json() or []):
            t = a.get("title", "")
            if t and t not in seen:
                seen.add(t)
                past_titles.append(t)

        def normalize(s):
            return re.sub(r'[\s.\-]+', '', s).lower()

        norm_title = normalize(title)
        best_match = None
        best_score = 0

        for past in past_titles:
            norm_past = normalize(past)
            if norm_title == norm_past:
                return past, 1.0
            if len(norm_title) > 0 and len(norm_past) > 0:
                import difflib
                score = difflib.SequenceMatcher(None, norm_title, norm_past).ratio()
                if score > best_score and score >= threshold:
                    best_score = score
                    best_match = past

        return best_match, best_score
    except Exception:
        return None, 0

def upload_image(filepath):
    """上傳圖片到 Supabase Storage"""
    fname = os.path.basename(filepath)
    unique_name = f"{uuid.uuid4().hex[:8]}_{fname}"
    content_type = "image/jpeg"
    if fname.lower().endswith(".png"):
        content_type = "image/png"
    elif fname.lower().endswith(".webp"):
        content_type = "image/webp"

    with open(filepath, "rb") as f:
        r = requests.post(
            f"{BASE}/storage/v1/object/{BUCKET}/{unique_name}",
            headers={
                "apikey": load_key("service"),
                "Authorization": f"Bearer {load_key('service')}",
                "Content-Type": content_type,
            },
            data=f.read(),
        )
    r.raise_for_status()

    # 取得 public URL（用公開域名，瀏覽器才能存取）
    public_url = f"{PUBLIC_BASE}/storage/v1/object/public/{BUCKET}/{unique_name}"
    return {"url": public_url}  # 前端期望 {url: "..."} 格式


def main():
    parser = argparse.ArgumentParser(description="新增評量成績")
    parser.add_argument("--student", required=True, help="學生名稱")
    parser.add_argument("--subject", required=True, help="科目名稱")
    parser.add_argument("--title", required=True, help="評量標題 (如: 期中考)")
    parser.add_argument("--score", type=float, help="分數 (數字模式)")
    parser.add_argument("--grade", help="等第 (如 A, B+，等第模式)")
    parser.add_argument("--max", type=float, default=100, help="滿分 (預設 100)")
    parser.add_argument("--type", default="exam", choices=["exam", "quiz", "homework", "project"],
                        help="評量類型 (exam=考試, quiz=小考, homework=作業, project=專案)")
    parser.add_argument("--status", default="completed", help="狀態 (completed/upcoming)")
    parser.add_argument("--notes", help="備註")
    parser.add_argument("--image", nargs="+", help="附圖路徑 (jpg/png/webp)，可多張")
    parser.add_argument("--no-reward", action="store_true", help="不自動計算獎勵")
    parser.add_argument("--manual-reward", type=float, help="手動指定獎勵數量（覆蓋自動計算）")
    parser.add_argument("--reward-type", help="手動指定獎勵類型 (points/money/hearts/stars/diamonds)")
    parser.add_argument("--scoring-mode", default="scored", choices=["scored", "record_only"],
                        help="評分模式: scored=計分, record_only=不計分（專題/不打分考試，可附資料圖片）")
    args = parser.parse_args()

    # 1. 找學生
    student = find_student(args.student)
    if not student:
        print(f"❌ 找不到學生: {args.student}")
        sys.exit(1)

    # 2. 找科目
    subj = find_student_subject(student["id"], args.subject)
    if not subj:
        print(f"❌ 找不到 {args.student} 的科目: {args.subject}")
        sys.exit(1)

    # 3. 模糊比對歷史標題（避免 OCR 格式誤差如 L 1 vs L1）
    if subj:
        matched, score = fuzzy_match_title(args.title, subj["id"])
        if matched and matched != args.title:
            print(f"🔍 標題模糊比對: 「{args.title}」→ 歷史紀錄使用「{matched}」，已自動修正")
            args.title = matched

    # 4. 處理圖片（支援多張）
    image_urls = []
    if args.image:
        for img_path in args.image:
            if os.path.exists(img_path):
                try:
                    url = upload_image(img_path)
                    image_urls.append(url)
                    print(f"📷 圖片已上傳: {os.path.basename(img_path)}")
                except Exception as e:
                    print(f"⚠️ 圖片上傳失敗 ({os.path.basename(img_path)}): {e}")
            else:
                print(f"⚠️ 圖片不存在: {img_path}")

    # 4. 計算分數（record_only 模式跳過）
    score = None
    percentage = None
    score_type = "numeric"

    if args.scoring_mode == "record_only":
        # 不計分模式：沒有分數，純記錄
        pass
    elif args.score is not None:
        score = args.score
        percentage = (score / args.max) * 100
        score_type = "numeric"
    elif args.grade:
        score_type = "letter"
        grade_map = {"A+": 97, "A": 95, "A-": 92, "B+": 87, "B": 85, "B-": 82,
                     "C+": 77, "C": 75, "C-": 72, "D": 65, "F": 50}
        score = grade_map.get(args.grade.upper(), 0)
        percentage = (score / args.max) * 100
    else:
        # 沒有分數也沒有等第 → 自動切換為不計分
        args.scoring_mode = "record_only"
        print("⚠️ 未提供分數，自動設為「不計分」(record_only)")

    # 5. 建立評量
    assessment_body = {
        "subject_id": subj["id"],
        "title": args.title,
        "assessment_type": args.type,
        "max_score": args.max if args.scoring_mode == "scored" else None,
        "score": score,
        "percentage": round(percentage, 2) if percentage else None,
        "grade": args.grade if args.grade else None,
        "score_type": score_type if args.scoring_mode == "scored" else None,
        "status": args.status,
        "scoring_mode": args.scoring_mode,
        "counts_toward_reward": args.scoring_mode == "scored",
        "due_date": datetime.now().strftime("%Y-%m-%d"),  # 前端顯示用
        "completed_date": datetime.now(timezone.utc).isoformat() if args.status == "completed" else None,
        "notes": args.notes,
        "image_urls": image_urls,
        "reward_amount": 0,
    }

    # 6. 計算獎勵（支援手動覆蓋 --manual-reward）
    reward_amount = 0
    reward_items = []
    matched_rule = None

    if args.scoring_mode == "record_only":
        # 不計分模式：跳過獎勵計算
        pass
    elif args.manual_reward is not None:
        # 使用者手動指定獎勵
        reward_amount = max(0, args.manual_reward)
        # 建立簡單 reward item
        reward_items = [{"type_key": args.reward_type or "points", "amount": reward_amount}]
        assessment_body["reward_amount"] = reward_amount
    elif not args.no_reward and score is not None:
        rules = find_reward_rules(subj["id"], student["id"])
        matched_rule = match_reward_rule(rules, subj["id"], student["id"], percentage, args.type)

        if matched_rule:
            calc_input = {
                "score": score,
                "maxScore": args.max,
                "percentage": round(percentage, 2) if percentage else 0,
                "rule": {
                    "reward_amount": matched_rule.get("reward_amount"),
                    "reward_formula": matched_rule.get("reward_formula"),
                    "reward_config": matched_rule.get("reward_config"),
                }
            }
            try:
                calc_result = subprocess.run(
                    ["npx", "tsx", os.path.join(SCRIPTS_DIR, "calculate-reward.ts")],
                    input=json.dumps(calc_input),
                    capture_output=True, text=True,
                    cwd=os.path.dirname(SCRIPTS_DIR),
                    timeout=15,
                )
                if calc_result.returncode == 0:
                    output = json.loads(calc_result.stdout.strip().split('\n')[-1])
                    reward_amount = output.get("rewardAmount", 0)
                    reward_items = output.get("rewards", [])
                    print(calc_result.stderr.strip())
            except Exception as e:
                print(f"⚠️ 共享模組調用失敗，使用簡易計算: {e}")
                reward_amount = float(matched_rule.get("reward_amount", 0))
        else:
            reward_amount = fallback_reward(percentage, len(rules) > 0)

        assessment_body["reward_amount"] = reward_amount

    # 7. 寫入 assessments
    data = supabase_post("/rest/v1/assessments", assessment_body)
    assessment_id = data[0]["id"] if isinstance(data, list) else data["id"]
    if args.scoring_mode == "record_only":
        print(f"✅ 評量已建立: {args.subject} {args.title} — 不計分（純記錄）")
    else:
        print(f"✅ 評量已建立: {args.subject} {args.title} — {score}/{args.max} ({percentage:.0f}%)")

    # 8. 建立獎勵交易（支援多幣別 reward_config）
    tx_created = 0
    if reward_items:
        for item in reward_items:
            rt_id = None
            # 從 reward_config 的 type_key 查找 reward_type_id
            if item.get("type_key"):
                rt = find_reward_type(item["type_key"])
                if rt:
                    rt_id = rt["id"]
            if not rt_id:
                # fallback: 用 matched_rule 裡的 reward_type_id
                rt_id = matched_rule.get("reward_type_id") if matched_rule else None
            if not rt_id:
                rt = find_reward_type("points")
                rt_id = rt["id"] if rt else None

            tx_body = {
                "student_id": student["id"],
                "assessment_id": assessment_id,
                "reward_type_id": rt_id,
                "transaction_type": "earn",
                "amount": item["amount"],
                "description": f"{args.subject} {args.title} ({score}/{args.max})",
                "transaction_date": datetime.now().strftime("%Y-%m-%d"),
            }
            if rt_id:
                supabase_post("/rest/v1/transactions", tx_body)
                tx_created += 1

    elif reward_amount > 0:
        # 簡單模式（無 reward_config）
        rt_id = matched_rule.get("reward_type_id") if matched_rule else None
        if not rt_id:
            rt = find_reward_type("points")
            rt_id = rt["id"] if rt else None
        tx_body = {
            "student_id": student["id"],
            "assessment_id": assessment_id,
            "reward_type_id": rt_id,
            "transaction_type": "earn",
            "amount": reward_amount,
            "description": f"{args.subject} {args.title} ({score}/{args.max})",
            "transaction_date": datetime.now().strftime("%Y-%m-%d"),
        }
        if rt_id:
            supabase_post("/rest/v1/transactions", tx_body)
            tx_created += 1

    if tx_created > 0:
        icons = []
        for item in (reward_items or [{"type_key": "points", "amount": reward_amount}]):
            if item.get("amount", 0) > 0:
                rt = find_reward_type(item.get("type_key", "points")) or {}
                icons.append(f"{rt.get('icon','')} +{item['amount']}")
        print(f"🎁 獎勵: {', '.join(icons)}")

    # 輸出 JSON 供程式調用
    result = {
        "student": student["name"],
        "subject": subj["name"],
        "title": args.title,
        "score": score,
        "max": args.max,
        "percentage": round(percentage, 2) if percentage else None,
        "reward": reward_amount,
        "assessment_id": assessment_id,
    }
    if matched_rule:
        result["rule"] = matched_rule.get("rule_name", "")
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
