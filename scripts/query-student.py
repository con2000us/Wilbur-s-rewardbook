#!/usr/bin/env python3
"""
query-student — 查詢學生總覽（各科表現、獎勵餘額、最近紀錄）
用法:
  python3 query-student.py --student 小寶
  python3 query-student.py --student 小寶 --recent 5
  python3 query-student.py --list
"""

import argparse, json, os, sys
from collections import defaultdict

import requests

BASE = "http://127.0.0.1:8043"
KEY_FILE = "/opt/supabase-docker/.supabase_keys.json"

def load_key(role="service"):
    with open(KEY_FILE) as f:
        return json.load(f).get("SERVICE_ROLE_KEY" if role == "service" else "ANON_KEY")

def headers():
    k = load_key()
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

def find_student(name):
    data = supabase_get("/rest/v1/students", {"name": f"ilike.{name}", "select": "id,name"})
    return data[0] if data else None

def list_students():
    return supabase_get("/rest/v1/students", {"select": "id,name", "order": "display_order.asc"})

def get_subjects(student_id):
    return supabase_get("/rest/v1/subjects", {
        "student_id": f"eq.{student_id}",
        "select": "id,name,color,icon",
        "order": "order_index.asc"
    })

def get_assessments(subject_id, limit=30):
    return supabase_get("/rest/v1/assessments", {
        "subject_id": f"eq.{subject_id}",
        "select": "id,title,score,max_score,percentage,completed_date,assessment_type",
        "order": "completed_date.desc",
        "limit": limit,
    })

def get_transactions(student_id, limit=20):
    return supabase_get("/rest/v1/transactions", {
        "student_id": f"eq.{student_id}",
        "select": "id,transaction_type,amount,description,transaction_date,reward_type_id",
        "order": "created_at.desc",
        "limit": limit,
    })

def get_reward_types():
    data = supabase_get("/rest/v1/custom_reward_types", {
        "select": "id,type_key,display_name,icon,color,default_unit",
        "order": "display_order.asc"
    })
    return {t["id"]: t for t in data}

def compute_balances(transactions, reward_types):
    """計算各類型獎勵的累積/花費/餘額"""
    by_type = defaultdict(lambda: {"earned": 0, "spent": 0})
    for tx in transactions:
        rt_id = tx.get("reward_type_id")
        rt = reward_types.get(rt_id, {})
        key = rt.get("type_key", "unknown")
        amt = float(tx["amount"] or 0)
        if tx.get("transaction_type") == "earn":
            by_type[key]["earned"] += amt
        else:
            by_type[key]["spent"] += abs(amt)
    return by_type


def main():
    parser = argparse.ArgumentParser(description="查詢學生狀態")
    parser.add_argument("--student", help="學生名稱")
    parser.add_argument("--recent", type=int, default=5, help="最近紀錄筆數")
    parser.add_argument("--list", action="store_true", help="列出所有學生")
    parser.add_argument("--json", action="store_true", help="輸出 JSON")
    args = parser.parse_args()

    if args.list:
        students = list_students()
        if args.json:
            print(json.dumps(students, ensure_ascii=False))
        else:
            for s in students:
                print(f"  👤 {s['name']}")
        return

    if not args.student:
        parser.error("請指定 --student 或 --list")

    student = find_student(args.student)
    if not student:
        print(f"❌ 找不到學生: {args.student}")
        sys.exit(1)

    subjects = get_subjects(student["id"])
    txns = get_transactions(student["id"], limit=100)
    reward_types = get_reward_types()
    balances = compute_balances(txns, reward_types)

    if args.json:
        result = {
            "student": student,
            "subjects": [],
            "balances": {},
            "recent_transactions": [],
        }
        for subj in subjects:
            asmts = get_assessments(subj["id"], limit=10)
            scores = [a["percentage"] for a in asmts if a.get("percentage")]
            avg = round(sum(scores)/len(scores), 1) if scores else None
            result["subjects"].append({
                "name": subj["name"],
                "count": len(asmts),
                "average": avg,
                "recent": [{"title": a["title"], "score": a["score"],
                           "percentage": a.get("percentage")} for a in asmts[:3]]
            })
        for key, bal in balances.items():
            rt = next((t for t in reward_types.values() if t["type_key"] == key), {})
            result["balances"][key] = {
                "earned": bal["earned"],
                "spent": bal["spent"],
                "balance": bal["earned"] - bal["spent"],
                "icon": rt.get("icon", ""),
                "unit": rt.get("default_unit", ""),
            }
        result["recent_transactions"] = [
            {"type": t["transaction_type"], "amount": t["amount"],
             "desc": t.get("description",""), "date": t.get("transaction_date","")}
            for t in txns[:args.recent]
        ]
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    # --- 人類可讀輸出 ---
    print(f"\n📊 {student['name']} 的學習狀態")
    print("=" * 45)

    # 各科表現
    print("\n📚 科目表現")
    if not subjects:
        print("  (尚無科目)")
    for subj in subjects:
        asmts = get_assessments(subj["id"], limit=30)
        completed = [a for a in asmts if a.get("percentage")]
        if completed:
            avg = round(sum(a["percentage"] for a in completed) / len(completed), 1)
            recent_scores = " → ".join(f"{a['percentage']:.0f}%" for a in completed[:5])
        else:
            avg = None
            recent_scores = "(尚無評量)"
        icon = subj.get("icon", "📖")
        print(f"  {icon} {subj['name']:6s}  {len(completed):2d} 次評量" +
              (f", 平均 {avg}%" if avg is not None else "") +
              (f"  [{recent_scores}]" if completed else ""))

    # 獎勵餘額
    print("\n💰 獎勵餘額")
    rt_map = {t["type_key"]: t for t in reward_types.values()}
    total_lines = 0
    for key in ["points", "money", "hearts", "stars", "diamonds"]:
        if key in balances:
            b = balances[key]
            rt = rt_map.get(key, {})
            icon = rt.get("icon", "?")
            unit = rt.get("default_unit", "")
            bal = b["earned"] - b["spent"]
            print(f"  {icon} {rt.get('display_name', key):6s}  累積 {b['earned']:.0f}{unit}  "
                  f"| 已用 {b['spent']:.0f}{unit}  | 目前 {bal:.0f}{unit}")
            total_lines += 1
    if total_lines == 0:
        print("  (尚無紀錄)")

    # 最近交易
    print(f"\n🕐 最近 {args.recent} 筆紀錄")
    if not txns:
        print("  (尚無紀錄)")
    for tx in txns[:args.recent]:
        rt_id = tx.get("reward_type_id")
        rt = reward_types.get(rt_id, {})
        icon = rt.get("icon", "")
        sign = "+" if tx["transaction_type"] == "earn" else "-"
        amt = abs(float(tx["amount"] or 0))
        desc = tx.get("description", "")[:30]
        date = (tx.get("transaction_date") or "")[:10]
        print(f"  {sign}{amt:.0f} {icon}  {desc:30s}  {date}")


if __name__ == "__main__":
    main()
