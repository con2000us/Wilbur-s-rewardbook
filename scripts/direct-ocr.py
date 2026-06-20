#!/usr/bin/env python3
"""direct-ocr.py — 直接 call MiMo vision API，繞過 Hermes 壓縮"""
import argparse, base64, json, os, sys, urllib.request

VISION_PROMPT = """請看這張考卷照片，按以下欄位填空。只看照片中的文字，不編造。
找不到的留空，不要填「無」。

科目_標題區：{考卷標題區寫的科目，如國語、數學}
科目_內文判斷：{從題目內容判斷，中文→國語，計算→數學，英文→英文}
總分_標題區：{老師手寫批改的總分，數字如95 或等第如A、B+、C-。圈起來的或「總分」旁的}
等第_標題區：{若總分是等第制（A/B/C/D/F，可含+-），填這裡；數字分數則留空}
總分_小計：{各題型得分，如「選擇題10/10, 填空題8/10」}
標題_標題區：{考試名稱，如第二次期中考、第5課小考}
類型_關鍵字：{期中考→exam, 小考→quiz, 作業→homework, 報告→project}
評分模式_有無總分：{有數字總分或等第填 scored，完全找不到任何分數或等第填 record_only}
滿分_考卷標示：{考卷上的滿分，如120。沒寫就填100}
日期_考卷標示：{考卷上的日期}

只輸出上述格式，一行一個欄位，不要其他文字。"""


def find_mimo_key():
    """Try all available keys, return first one found."""
    keys = []
    for p in [os.path.expanduser("~/.hermes/profiles/mimo-agent/.env"),
              os.path.expanduser("~/.hermes/.env")]:
        if os.path.exists(p):
            for line in open(p):
                if "XIAOMI_API_KEY" in line:
                    v = line.split("=", 1)[1].strip().replace('"', '').replace("'", '')
                    if v and v not in keys:
                        keys.append(v)
    return keys

def call_mimo_vision(image_path, max_retries=3):
    keys = find_mimo_key()
    if not keys:
        raise RuntimeError("XIAOMI_API_KEY not found")
    
    import time
    with open(image_path, "rb") as f:
        data_url = f"data:image/jpeg;base64,{base64.b64encode(f.read()).decode()}"
    
    body = {
        "model": "mimo-v2.5",
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": VISION_PROMPT},
            {"type": "image_url", "image_url": {"url": data_url}},
        ]}],
        "max_tokens": 3000,
    }
    
    last_error = None
    for attempt in range(max_retries):
        key = keys[attempt % len(keys)]
        try:
            req = urllib.request.Request(
                "https://token-plan-sgp.xiaomimimo.com/v1/chat/completions",
                data=json.dumps(body).encode(),
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
                method="POST")
            resp = urllib.request.urlopen(req, timeout=120)
            result = json.loads(resp.read().decode())
            return result["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            last_error = e
            if e.code == 401:
                print(f"[smart-ocr2] Key {attempt%len(keys)+1}/{len(keys)} auth failed, retry in 2s...", file=sys.stderr)
                time.sleep(2)
                continue
            raise
    raise RuntimeError(f"All keys exhausted: {last_error}")


def encode_image(path):
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    ext = os.path.splitext(path)[1].lower().lstrip(".")
    mime = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp"}.get(ext, "jpeg")
    return f"data:image/{mime};base64,{data}"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--image", required=True)
    p.add_argument("--model", default="mimo-v2.5")
    args = p.parse_args()

    size_kb = os.path.getsize(args.image) / 1024
    print(f"[direct-ocr] {args.model} | {os.path.basename(args.image)} ({size_kb:.0f}KB)", file=sys.stderr)

    content = call_mimo_vision(args.image)
    print(content)


if __name__ == "__main__":
    main()
