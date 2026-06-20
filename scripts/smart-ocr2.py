#!/usr/bin/env python3
"""
wilbur smart-ocr2 — 一鍵評量登錄（含 LLM vision call，繞過 Hermes 壓縮）

用法:
  wilbur smart-ocr2 --student 李承新 --image /tmp/exam.jpg
  wilbur smart-ocr2 --student 李承新 --image cover.jpg --image back.jpg

內部流程:
  1. base64 編碼圖片 → call MiMo API（結構化 prompt）
  2. parse-assessment.py（Stage 2 優先級規則）
  3. 科目 mapping → DB subject_id
  4. 上傳圖片（API）
  5. API 寫入 + 備註 + 摘要
"""

import argparse, base64, hashlib, json, os, re, subprocess, sys, time, urllib.request

API_BASE = "http://127.0.0.1:3000/api"
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Auth helpers ──
def get_wilbur_token():
    for env_var in ["WILBUR_SITE_PASSWORD"]:
        pw = os.environ.get(env_var, "")
        if pw:
            return hashlib.sha256(f"v1:{pw}".encode()).hexdigest()
    env_file = "/opt/wilbur-rewardbook/.env.local"
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                if "SITE_PASSWORD" in line:
                    pw = line.split("=", 1)[1].strip().strip('"').strip("'")
                    return hashlib.sha256(f"v1:{pw}".encode()).hexdigest()
    return ""


def get_mimo_key():
    for p in [os.path.expanduser("~/.hermes/profiles/mimo-agent/.env"),
              os.path.expanduser("~/.hermes/.env")]:
        if os.path.exists(p):
            for line in open(p):
                if "XIAOMI_API_KEY" in line:
                    return line.split("=", 1)[1].strip().replace('"', '').replace("'", '')
    return ""


def api_get(path, params=None):
    token = get_wilbur_token()
    qs = "&".join(f"{k}={v}" for k, v in (params or {}).items())
    url = f"{API_BASE}{path}?{qs}" if qs else f"{API_BASE}{path}"
    req = urllib.request.Request(url)
    req.add_header("Cookie", f"site-auth=v1.{token}")
    return json.loads(urllib.request.urlopen(req, timeout=30).read())


def api_post(path, body):
    token = get_wilbur_token()
    req = urllib.request.Request(
        f"{API_BASE}{path}", data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Cookie": f"site-auth=v1.{token}"},
        method="POST")
    return json.loads(urllib.request.urlopen(req, timeout=30).read())


def api_upload_image(file_path):
    import mimetypes
    token = get_wilbur_token()
    boundary = "----FormBoundary" + hashlib.md5(os.urandom(16)).hexdigest()
    fname = os.path.basename(file_path)
    content_type = mimetypes.guess_type(file_path)[0] or "image/jpeg"
    parts = [f"--{boundary}", f'Content-Disposition: form-data; name="files"; filename="{fname}"',
             f"Content-Type: {content_type}", ""]
    with open(file_path, "rb") as f:
        body_bytes = "\r\n".join(parts).encode() + b"\r\n" + f.read() + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        f"{API_BASE}/assessments/upload-image", data=body_bytes,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}", "Cookie": f"site-auth=v1.{token}"},
        method="POST")
    return json.loads(urllib.request.urlopen(req, timeout=60).read())


# ── Vision call ──
def call_mimo_vision_multi(images_and_prompt, max_retries=5):
    """Call MiMo with multiple images. images_and_prompt: (prompt, [image_data_urls])"""
    key = get_mimo_key()
    if not key:
        raise RuntimeError("XIAOMI_API_KEY not found")
    
    prompt, image_urls = images_and_prompt
    
    content_blocks = [{"type": "text", "text": prompt}]
    for url in image_urls:
        content_blocks.append({"type": "image_url", "image_url": {"url": url}})
    
    body = {
        "model": "mimo-v2.5",
        "messages": [{"role": "user", "content": content_blocks}],
        "max_tokens": 3000,
        "temperature": 0,
    }
    
    last_error = None
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(
                "https://token-plan-sgp.xiaomimimo.com/v1/chat/completions",
                data=json.dumps(body).encode(),
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
                method="POST")
            resp = urllib.request.urlopen(req, timeout=180)
            result = json.loads(resp.read().decode())
            return result["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            last_error = e
            if e.code in (401, 429):
                wait = 3 * (attempt + 1)
                print(f"[smart-ocr2] Rate limited, retry in {wait}s...", file=sys.stderr)
                time.sleep(wait)
                continue
            raise
    raise RuntimeError(f"MiMo failed after {max_retries} retries: {last_error}")


def call_mimo_vision(image_path, prompt):
    """Single-image convenience wrapper."""
    with open(image_path, "rb") as f:
        data_url = f"data:image/jpeg;base64,{base64.b64encode(f.read()).decode()}"
    return call_mimo_vision_multi((prompt, [data_url]), max_retries=3)


# ── Subject mapping ──
KNOWN_MAP = {"生活": "社會", "國小生活": "社會", "生活科技": "社會",
             "國文": "國語", "中文": "國語", "英語": "英文",
             "理化": "自然", "生物": "自然", "地科": "自然", "物理": "自然", "化學": "自然",
             "歷史": "社會", "地理": "社會", "公民": "社會", "健教": "社會"}


def resolve_subject(raw_subject, student_id):
    if not raw_subject: return None, None
    try:
        data = api_get("/subjects", {"student_id": student_id})
        subjects = data if isinstance(data, list) else data.get("subjects", [])
    except Exception:
        return raw_subject, None
    for s in subjects:
        if s.get("name") == raw_subject: return s["name"], s["id"]
    for k, v in KNOWN_MAP.items():
        if k in raw_subject:
            for s in subjects:
                if s.get("name") == v: return s["name"], s["id"]
    for s in subjects:
        if s.get("name","") in raw_subject or raw_subject in s.get("name",""):
            return s["name"], s["id"]
    if subjects: return subjects[0]["name"], subjects[0]["id"]
    return raw_subject, None


def get_student_id(name):
    data = api_get("/students/list")
    for s in data.get("students", []):
        if s.get("name") == name: return s["id"]
    for s in data.get("students", []):
        if name in s.get("name", ""): return s["id"]
    return None


# ── Main ──
def main():
    p = argparse.ArgumentParser(description="smart-ocr2 — 一鍵評量登錄（template matching + LLM vision）")
    p.add_argument("--student", required=True)
    p.add_argument("--image", action="append", default=[])
    p.add_argument("--vision-result", help="手動提供 vision 文字（跳過 LLM call）")
    p.add_argument("--notes")
    p.add_argument("--confirm-subject"); p.add_argument("--confirm-type")
    p.add_argument("--confirm-score", type=float); p.add_argument("--confirm-grade")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    student_id = get_student_id(args.student)
    if not student_id:
        print(json.dumps({"status":"error","error":f"Student '{args.student}' not found"}), flush=True); sys.exit(1)

    # 0. Upload image to get public URL (needed by classify-context)
    if not args.image and not args.vision_result:
        print("ERROR: need --image or --vision-result", file=sys.stderr); sys.exit(1)

    if args.vision_result:
        vision_text = args.vision_result
        vision_prompt = "(manual)"
        print("[smart-ocr2] Using provided --vision-result", file=sys.stderr)
    else:
        cover = args.image[0]
        
        # 1. Fetch templates from API (with image URLs)
        print("[smart-ocr2] Fetching templates...", file=sys.stderr)
        ctx_r = api_get("/agent/context", {"student_id": student_id})
        templates = []
        seen_key = set()
        if ctx_r.get("success"):
            for a in ctx_r.get("recent_assessments", []):
                imgs = a.get("image_urls", [])
                if not imgs or not isinstance(imgs, list) or len(imgs) == 0:
                    continue
                first_img = imgs[0]
                if not isinstance(first_img, dict) or not first_img.get("url"):
                    continue
                key = f"{a.get('subject_name','')}|{a.get('assessment_type','')}"
                if key in seen_key: continue
                seen_key.add(key)
                templates.append({
                    "subject": a.get("subject_name", ""),
                    "type": a.get("assessment_type", ""),
                    "title": a.get("title", ""),
                    "url": first_img["url"],
                })
        
        # Build type rules from DB
        atypes = ctx_r.get("assessment_types", [])
        if atypes:
            type_rules_str = "、".join(
                f"{t.get('display_name', t.get('type_key', ''))}→{t.get('type_key', '')}"
                for t in atypes if t.get("type_key"))
        else:
            type_rules_str = "小考→quiz、考試→exam、作業→homework"

        # ═══ Phase 1: Single-image OCR ═══
        ocr_prompt = f"""請看這張考卷照片，按以下欄位填空。只看照片中的文字，不編造。
找不到的留空，不要填「無」。

科目_標題區：{{考卷標題區寫的科目，如國語、數學}}
科目_內文判斷：{{從題目內容判斷科目，中文→國語，計算→數學，英文→英文}}
總分_標題區：{{老師手寫批改的總分，數字如95 或等第如A、B+、C-。圈起來的或「總分」旁的}}
等第_標題區：{{若總分是等第制（A/B/C/D/F，可含+-），填這裡；數字分數則留空}}
總分_小計：{{各題型得分，如「選擇題10/10, 填空題8/10」}}
標題_標題區：{{考試名稱，如第二次期中考、第5課小考}}
滿分_考卷標示：{{考卷上的滿分，如120。沒寫就填100}}
日期_考卷標示：{{考卷上的日期}}
評分模式_有無總分：{{有數字總分或等第填 scored，找不到填 record_only}}

只輸出上述格式，一行一個欄位，不要其他文字。"""
        
        print("[smart-ocr2] Phase 1: Single-image OCR...", file=sys.stderr)
        ocr_text = call_mimo_vision(cover, ocr_prompt)
        print(f"[smart-ocr2] OCR done ({len(ocr_text)} chars)", file=sys.stderr)

        # ═══ Phase 2: Multi-image classification (if templates exist) ═══
        classify_subject = None
        classify_type = None
        
        if templates:
            # Download templates as thumbnails
            from PIL import Image
            import io as pio
            template_labels = []
            template_data_urls = []
            for i, t in enumerate(templates[:8]):
                try:
                    req = urllib.request.Request(t["url"])
                    raw = urllib.request.urlopen(req, timeout=15).read()
                    img = Image.open(pio.BytesIO(raw))
                    img.thumbnail((400, 400), Image.LANCZOS)
                    buf = pio.BytesIO()
                    img.save(buf, format="JPEG", quality=75)
                    b64 = base64.b64encode(buf.getvalue()).decode()
                    template_data_urls.append(f"data:image/jpeg;base64,{b64}")
                    template_labels.append(f"[{i+1}] {t['subject']} · {t['type']} · {t['title']}")
                except Exception as e:
                    print(f"[smart-ocr2] Skip template {t['title']}: {e}", file=sys.stderr)
            
            if template_data_urls:
                subj_list = "、".join(sorted(set(t['subject'] for t in templates[:8])))
                tmpl_text = "\n".join(template_labels)
                classify_prompt = f"""下面是 {len(template_labels)} 張範本考卷 + 1 張新考卷（最後一張）。

範本對照（圖序對應編號）：
{tmpl_text}
已知科目：{subj_list}

最後一張是新考卷。只需比對排版格式、題型風格、字體，判斷：
1. 最相似的科目
2. 評量類型（{type_rules_str}）

只輸出兩行，不要其他文字：
分類科目：{{科目名稱}}
分類類型：{{type_key}}"""

                with open(cover, "rb") as f:
                    new_b64 = base64.b64encode(f.read()).decode()
                all_images = template_data_urls + [f"data:image/jpeg;base64,{new_b64}"]
                
                print(f"[smart-ocr2] Phase 2: Multi-image classification ({len(template_data_urls)} templates + 1 new)...", file=sys.stderr)
                classify_text = call_mimo_vision_multi((classify_prompt, all_images))
                print(f"[smart-ocr2] Classification done ({len(classify_text)} chars)", file=sys.stderr)
                
                # Parse classification result
                m_subj = re.search(r'分類科目[：:]\s*(.+)', classify_text)
                if m_subj: classify_subject = m_subj.group(1).strip()
                m_type = re.search(r'分類類型[：:]\s*(.+)', classify_text)
                if m_type: classify_type = m_type.group(1).strip()
                print(f"[smart-ocr2] Classified: subject={classify_subject}, type={classify_type}", file=sys.stderr)
        
        # Merge: OCR from phase 1, classification from phase 2
        # Build combined text in classify-context format for parse_assessment
        ocr_lines = ocr_text.strip().split("\n")
        if classify_type:
            # Replace or add type in OCR text
            has_type = False
            new_lines = []
            for line in ocr_lines:
                if line.startswith("類型_關鍵字"):
                    new_lines.append(f"類型_關鍵字：{classify_type}")
                    has_type = True
                else:
                    new_lines.append(line)
            if not has_type and classify_type:
                new_lines.append(f"類型_關鍵字：{classify_type}")
            ocr_lines = new_lines
        
        vision_text = "\n".join(ocr_lines)

    # 3. Parse via parse-assessment.py (classify_subject already set from Phase 2)
    result = subprocess.run(
        [sys.executable, os.path.join(SCRIPTS_DIR, "parse-assessment.py"), "--table", vision_text],
        capture_output=True, text=True, timeout=30)
    stdout = result.stdout.strip()
    fields = {}
    if stdout:
        try:
            data = json.loads(stdout)
        except json.JSONDecodeError:
            for line in stdout.split("\n"):
                line = line.strip()
                if line.startswith("{"):
                    combined = "\n".join(stdout.split("\n")[stdout.split("\n").index(line):])
                    try: data = json.loads(combined); break
                    except: continue
        fields = data.get("fields", {})
        questions = data.get("questions", [])

    # 4. Subject mapping: Phase 2 classification > OCR > fallback
    raw_subj = args.confirm_subject or classify_subject or fields.get("subject", "")
    subject_name, subject_id = resolve_subject(raw_subj, student_id)
    title = fields.get("title") or f"{subject_name or '評量'}測驗"
    atype = args.confirm_type or fields.get("type", "exam")
    scoring_mode = fields.get("scoring_mode", "record_only")
    score = fields.get("score")
    grade = fields.get("grade")
    max_score = fields.get("max_score", 100)
    score_type = fields.get("score_type", "numeric") if scoring_mode == "scored" else None

    if args.confirm_score is not None: score = args.confirm_score; scoring_mode = "scored"; score_type = "numeric"
    if args.confirm_grade: grade = args.confirm_grade; scoring_mode = "scored"; score_type = "letter"

    # 4. Preview
    print(f"\n📋 辨識結果:", file=sys.stderr)
    print(f"  科目: {raw_subj} → {subject_name}", file=sys.stderr)
    print(f"  標題: {title}", file=sys.stderr)
    print(f"  類型: {atype}", file=sys.stderr)
    if scoring_mode == "scored":
        if grade: print(f"  等第: {grade}", file=sys.stderr)
        elif score is not None: print(f"  分數: {score}/{max_score}", file=sys.stderr)
    else: print(f"  評分: 不計分 (record_only)", file=sys.stderr)
    print(f"  圖片: {len(args.image)} 張", file=sys.stderr)

    if args.dry_run:
        print("\n[DRY RUN]", file=sys.stderr); sys.exit(0)

    # 5. Upload images
    image_urls = []
    for img_path in args.image:
        print(f"[smart-ocr2] 上傳: {os.path.basename(img_path)}", file=sys.stderr)
        r = api_upload_image(img_path)
        if r.get("success"):
            for img in r.get("images", []): image_urls.append({"url": img["url"]})

    # 6. Notes
    notes = args.notes or ""
    if not notes:
        notes = f"主題: {title}\n單元: \n錯題: 概念混淆(0), 粗心(0), 計算錯誤(0)\n歸檔: 由 smart-ocr2 (Hermes Agent) 歸檔"

    # 7. Create via API
    body = {"student_id": student_id, "subject_id": subject_id, "subject": subject_name,
            "title": title, "assessment_type": atype, "scoring_mode": scoring_mode,
            "image_urls": image_urls, "notes": notes}
    if scoring_mode == "scored":
        body["score_type"] = score_type; body["max_score"] = max_score or 100
        if score is not None: body["score"] = score
        if grade: body["grade"] = grade

    result = api_post("/assessments/create", body)
    if not result.get("success"):
        print(json.dumps({"status":"error","error":str(result)}), flush=True); sys.exit(1)

    # 8. Summary
    assessment = result.get("data", result.get("assessment", {}))
    print(f"\n✅ 已存入資料庫\n", file=sys.stderr)
    print(f"學生：{args.student}", file=sys.stderr)
    print(f"科目：{subject_name}", file=sys.stderr)
    print(f"標題：{title}", file=sys.stderr)
    print(f"類型：{atype}", file=sys.stderr)
    if scoring_mode == "scored":
        if grade: print(f"等第：{grade}", file=sys.stderr)
        elif score is not None:
            mx = max_score or 100
            print(f"分數：{score} / {mx}（{score/mx*100:.0f}%）", file=sys.stderr)
    else: print(f"評分：不計分 (record_only)", file=sys.stderr)
    print(f"圖片：{len(image_urls)} 張", file=sys.stderr)
    if notes: print(f"備註：{notes}", file=sys.stderr)

    output = {"status":"ok","assessment_id":assessment.get("id"),"subject":subject_name,
              "score":score,"grade":grade,"max_score":max_score,"title":title,
              "type":atype,"scoring_mode":scoring_mode,"image_count":len(image_urls)}
    print(json.dumps(output, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
