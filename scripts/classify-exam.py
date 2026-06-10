#!/usr/bin/env python3
"""
classify-exam.py — 拼圖式考卷分類器

從 Wilbur API 拉取各科目×類型的範本考卷，與新考卷拼成直排圖，
輸出給 vision_analyze 做 few-shot 科目分類。

用法:
  wilbur classify --student <name> --image <new_paper.jpg>

流程:
  1. GET /api/agent/context → 拿 subjects, assessment_types, recent_assessments
  2. 從 recent_assessments 挑有圖的，每 (科目, 類型) 取最新一筆當範本
  3. 下載所有範本圖片 + 新考卷圖片
  4. 拼成直排圖，每張頂部標【第N張】科目/類型
  5. 輸出 stitched 圖片路徑 + vision prompt
"""

import argparse
import json
import os
import sys
import tempfile
import urllib.request
from pathlib import Path

import requests
from PIL import Image, ImageDraw

# ── Config ──
API_BASE = "http://192.168.100.188:3000/api"
AUTH_TOKEN = os.environ.get("WILBUR_AUTH_TOKEN", "")
SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = Path("/tmp/hermes_classify")

# ── API helpers ──
def api_get(path: str, params: dict = None) -> dict:
    r = requests.get(
        f"{API_BASE}{path}",
        params=params,
        cookies={"site-auth": AUTH_TOKEN},
        timeout=15,
    )
    r.raise_for_status()
    return r.json()

def download_image(url: str, dest: Path) -> bool:
    """下載圖片到 dest，回傳是否成功"""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Wilbur/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            dest.write_bytes(resp.read())
        return True
    except Exception as e:
        print(f"⚠️ 下載失敗 {url[:60]}...: {e}", file=sys.stderr)
        return False

# ── Core logic ──
def build_reference_set(assessments: list, max_per_subject: int = 2) -> list:
    """
    從評量列表中挑選範本考卷。
    每個 (subject_name, assessment_type) 組合取最新一筆有圖的。
    """
    groups: dict[tuple, dict] = {}
    for a in assessments:
        imgs = a.get("image_urls") or []
        if not imgs:
            continue
        key = (a["subject_name"], a.get("assessment_type") or "exam")
        if key not in groups:
            groups[key] = a
    # 排序：每個 subject 最多 max_per_subject 張
    result = []
    seen_subjects = {}
    for (subj, atype), a in sorted(groups.items()):
        if seen_subjects.get(subj, 0) >= max_per_subject:
            continue
        seen_subjects[subj] = seen_subjects.get(subj, 0) + 1
        result.append(a)
    return result

def stitch_papers(
    papers: list[dict],
    new_image_path: Path,
    output_path: Path,
) -> Path:
    """
    拼圖：範本在前（標科目+類型），新考卷在最末（標？？？）。
    """
    images = []
    labels = []

    # 範本
    for i, p in enumerate(papers):
        img_path = p.get("_local_path")
        if not img_path or not os.path.exists(img_path):
            continue
        img = Image.open(img_path)
        w, h = img.size
        ratio = 500 / max(w, h)  # 統一最大邊 500px
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

        d = ImageDraw.Draw(img)
        label = f"【第{i+1}張】{p['subject_name']}·{p.get('assessment_type','exam')}"
        d.rectangle([(0, 0), (img.width, 36)], fill="#1a6e1a")
        d.text((8, 6), label, fill="white")

        images.append(img)
        labels.append(label)

    # 新考卷
    new_img = Image.open(new_image_path)
    w, h = new_img.size
    ratio = 500 / max(w, h)
    new_img = new_img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

    new_idx = len(images) + 1
    d = ImageDraw.Draw(new_img)
    label = f"【第{new_idx}張】？？？  ← 待分類"
    d.rectangle([(0, 0), (new_img.width, 36)], fill="#cc0000")
    d.text((8, 6), label, fill="white")

    images.append(new_img)
    labels.append(label)

    # 直排拼接
    gap = 4
    total_h = sum(img.height for img in images) + gap * (len(images) - 1)
    canvas = Image.new("RGB", (500, total_h), "#f5f5f5")
    y = 0
    for img in images:
        canvas.paste(img, (0, y))
        y += img.height + gap

    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path, quality=88)

    return output_path

def build_vision_prompt(papers: list[dict], new_idx: int) -> str:
    """生成給 vision_analyze 的 prompt"""
    lines = [f"這張圖有{new_idx}張考卷，每張頂部有標籤【第N張】。"]
    lines.append("")
    for i, p in enumerate(papers):
        lines.append(f"第{i+1}張是已知的 {p['subject_name']}·{p.get('assessment_type','exam')} 考卷。")
    lines.append(f"第{new_idx}張是新的考卷（標示「？？？」），請根據它的題型內容、排版格式、文字關鍵字來判斷科目。")
    lines.append("")
    lines.append("規則：")
    lines.append("- 不要用「已知科目有X種所以新的一定是第X+1種」的排除法")
    lines.append("- 仔細看第{}張的題目文字來判斷".format(new_idx))
    lines.append("- 只回答科目名稱，不要其他說明")
    return "\n".join(lines)

# ── Main ──
def main():
    parser = argparse.ArgumentParser(description="拼圖式考卷分類器")
    parser.add_argument("--student", required=True, help="學生名稱")
    parser.add_argument("--image", required=True, help="新考卷圖片路徑")
    parser.add_argument("--max-per-subject", type=int, default=2, help="每科目最多幾張範本")
    parser.add_argument("--json", action="store_true", help="輸出 JSON")
    args = parser.parse_args()

    if not AUTH_TOKEN:
        print("❌ 請設定 WILBUR_AUTH_TOKEN 環境變數", file=sys.stderr)
        sys.exit(1)

    # 1. 取得 context
    if not args.json:
        print("📡 從 API 取得前置資料...", file=sys.stderr)

    # 先查 student id
    students = api_get("/students/list")
    student_id = None
    for s in students.get("students", []):
        if s["name"] == args.student:
            student_id = s["id"]
            break
    if not student_id:
        print(f"❌ 找不到學生: {args.student}", file=sys.stderr)
        sys.exit(1)

    ctx = api_get("/agent/context", {"student_id": student_id})
    assessments = ctx.get("recent_assessments", [])
    subjects = ctx.get("subjects", [])

    # 2. 挑選範本
    refs = build_reference_set(assessments, args.max_per_subject)
    if not refs:
        print("⚠️ 沒有找到任何附圖的評量可當範本", file=sys.stderr)
        print("⚠️ 將只使用新考卷進行分析", file=sys.stderr)

    if not args.json:
        subj_names = {s["name"] for s in subjects}
        print(f"📋 科目: {', '.join(sorted(subj_names))}", file=sys.stderr)
        print(f"📷 範本: {len(refs)} 張", file=sys.stderr)
        for r in refs:
            print(f"   {r['subject_name']}·{r.get('assessment_type','exam')}: {r['title']}", file=sys.stderr)

    # 3. 下載圖片
    tmpdir = Path(tempfile.mkdtemp(prefix="classify_"))
    for i, ref in enumerate(refs):
        imgs = ref.get("image_urls") or []
        if imgs:
            url = imgs[0].get("url") if isinstance(imgs[0], dict) else imgs[0]
            dest = tmpdir / f"ref_{i}.jpg"
            if download_image(url, dest):
                ref["_local_path"] = str(dest)

    # 4. 拼圖
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ts = __import__("time").strftime("%Y%m%d_%H%M%S")
    stitched_path = OUTPUT_DIR / f"classify_{ts}.png"
    stitch_papers(refs, Path(args.image), stitched_path)

    # 5. 輸出
    prompt = build_vision_prompt(refs, len(refs) + 1)

    result = {
        "status": "ok",
        "stitched_image": str(stitched_path),
        "vision_prompt": prompt,
        "reference_papers": [
            {
                "subject": r["subject_name"],
                "type": r.get("assessment_type", "exam"),
                "title": r["title"],
            }
            for r in refs
        ],
        "new_paper_index": len(refs) + 1,
    }

    if args.json:
        print(json.dumps(result, ensure_ascii=False))
    else:
        print(f"\n✅ 拼圖完成: {stitched_path}", file=sys.stderr)
        print(f"📝 Vision Prompt:", file=sys.stderr)
        print(prompt, file=sys.stderr)
        print(f"\n--- JSON ---", file=sys.stderr)
        print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
