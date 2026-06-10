#!/usr/bin/env python3
"""
add-reward — 手動新增獎勵紀錄（非考試）
用法:
  python3 add-reward.py --student 小寶 --type points --amount 5 --reason "幫忙做家事"
  python3 add-reward.py --student 小寶 --type hearts --amount 3 --reason "主動看書"
"""

import argparse, json, os, sys
from datetime import datetime

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

def supabase_post(path, body):
    r = requests.post(f"{BASE}{path}", headers=headers(), json=body)
    r.raise_for_status()
    return r.json()

def find_student(name):
    data = supabase_get("/rest/v1/students", {"name": f"ilike.{name}", "select": "id,name"})
    return data[0] if data else None

def find_reward_type(type_key):
    data = supabase_get("/rest/v1/custom_reward_types", {
        "type_key": f"eq.{type_key}",
        "select": "id,type_key,display_name,icon,color,default_unit"
    })
    return data[0] if data else None

def list_reward_types():
    return supabase_get("/rest/v1/custom_reward_types", {
        "select": "type_key,display_name,icon,default_unit",
        "order": "display_order.asc"
    })


def main():
    parser = argparse.ArgumentParser(description="手動新增獎勵")
    parser.add_argument("--student", required=True, help="學生名稱")
    parser.add_argument("--type", required=True, help="獎勵類型 (points/money/hearts/stars/diamonds)")
    parser.add_argument("--amount", type=float, required=True, help="數量")
    parser.add_argument("--reason", required=True, help="原因")
    parser.add_argument("--list-types", action="store_true", help="列出可用獎勵類型")
    args = parser.parse_args()

    if args.list_types:
        types = list_reward_types()
        for t in types:
            print(f"  {t['icon']} {t['type_key']:12s} ({t.get('default_unit','')}) — {t.get('display_name','')}")
        return

    if args.amount <= 0:
        print("❌ 數量必須大於 0")
        sys.exit(1)

    student = find_student(args.student)
    if not student:
        print(f"❌ 找不到學生: {args.student}")
        sys.exit(1)

    rt = find_reward_type(args.type)
    if not rt:
        print(f"❌ 找不到獎勵類型: {args.type}")
        print("可用類型: points, money, hearts, stars, diamonds")
        sys.exit(1)

    tx_body = {
        "student_id": student["id"],
        "reward_type_id": rt["id"],
        "transaction_type": "earn",
        "amount": args.amount,
        "description": args.reason,
        "transaction_date": datetime.now().strftime("%Y-%m-%d"),
    }

    data = supabase_post("/rest/v1/transactions", tx_body)
    tx = data[0] if isinstance(data, list) else data
    print(f"✅ {rt['icon']} {student['name']} +{args.amount} {rt.get('display_name', args.type)} — {args.reason}")

    result = {
        "student": student["name"],
        "reward_type": rt["type_key"],
        "amount": args.amount,
        "transaction_id": tx.get("id"),
    }
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
