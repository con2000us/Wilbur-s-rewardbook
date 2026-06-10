# Self-Hosted Infrastructure Notes / 自架基礎設施筆記

> 適用於自有伺服器部署 Supabase + Wilbur 的環境設定。

## Kong 上傳檔案大小限制（非主因）

Supabase 自架使用 Kong 作為 API gateway，預設 `client_max_body_size` 可能過小。
可透過 docker-compose 的 Kong 環境變數調整：

```yaml
KONG_NGINX_HTTP_CLIENT_MAX_BODY_SIZE: 50m
```

## Supabase Storage Bucket 檔案大小限制（主因）

**這是真正限制來源。** 每個 bucket 有獨立的 `file_size_limit`，預設為 4MB（4194304 bytes）。
classify-context 產生的拼圖超過 4MB 時會被拒絕（`413 EntityTooLarge`）。

**修復方式：** 透過 Storage API 更新 bucket 限制：

```bash
curl -X PUT "http://127.0.0.1:8043/storage/v1/bucket/assessment-imports" \
  -H "Authorization: Bearer <service_role_key>" \
  -H "Content-Type: application/json" \
  -d '{"public":true,"file_size_limit":52428800,"allowed_mime_types":["image/jpeg","image/png","image/webp"]}'
```

## Supabase Storage 服務本身限制

Storage 服務的 `FILE_SIZE_LIMIT` 環境變數預設為 50MB（`52428800`）。

## 內網直連 vs 外網 CDN

- **Server-side API**（如 classify-context、upload-image）：使用 `SUPABASE_INTERNAL_URL=http://127.0.0.1:8043` 直連，跳過 Apache
- **瀏覽器端**：使用 `NEXT_PUBLIC_SUPABASE_URL=https://mayacraft.net/supabase`
