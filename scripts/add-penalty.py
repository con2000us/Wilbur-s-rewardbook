#!/usr/bin/env python3
"""
add-penalty — 手動懲罰扣點
用法:
  python3 add-penalty.py --student 小寶 --type stars --amount 2 --reason "沒寫作業"
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


def main():
    parser = argparse.ArgumentParser(description="手動懲罰扣點")
    parser.add_argument("--student", required=True, help="學生名稱")
    parser.add_argument("--type", required=True, help="獎勵類型 (points/money/hearts/stars/diamonds)")
    parser.add_argument("--amount", type=float, required=True, help="數量 (正數，會自動轉為負值)")
    parser.add_argument("--reason", required=True, help="原因")
    args = parser.parse_args()

    student = find_student(args.student)
    if not student:
        print(f"❌ 找不到學生: {args.student}")
        sys.exit(1)

    rt = find_reward_type(args.type)
    if not rt:
        print(f"❌ 找不到獎勵類型: {args.type}")
        sys.exit(1)

    penalty = -abs(args.amount)

    tx_body = {
        "student_id": student["id"],
        "reward_type_id": rt["id"],
        "transaction_type": "spend",
        "amount": penalty,
        "description": args.reason,
        "transaction_date": datetime.now().strftime("%Y-%m-%d"),
    }

    data = supabase_post("/rest/v1/transactions", tx_body)
    tx = data[0] if isinstance(data, list) else data
    print(f"⚠️ {rt['icon']} {student['name']} {penalty} {rt.get('display_name', args.type)} — {args.reason}")

    result = {
        "student": student["name"],
        "reward_type": rt["type_key"],
        "amount": penalty,
        "transaction_id": tx.get("id"),
    }
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
