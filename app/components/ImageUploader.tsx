'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import ImageViewer from '@/app/components/ImageViewer'
import { toBrowserPublicStorageUrl } from '@/lib/storage/publicUrl'
import {
  IMAGE_QUALITY_PROFILES,
  IMAGE_QUALITY_SETTING_KEY,
  parseImageQualityProfile,
  type ImageQualityProfile,
  type ImageQualityProfileSpec,
} from '@/lib/imageQuality'

export interface UploadedImage {
  url: string
  path: string
  size: number
  width?: number
  height?: number
  order?: number
  rotation?: 0 | 90 | 180 | 270
}

// 向後相容的別名
export type GoalTemplateImage = UploadedImage

function isUploadedImage(value: unknown): value is UploadedImage {
  if (!value || typeof value !== 'object') return false
  const image = value as Partial<UploadedImage>
  return typeof image.url === 'string' && image.url.length > 0 &&
    typeof image.path === 'string' && image.path.length > 0
}

function withBrowserSafeUrl(image: UploadedImage): UploadedImage {
  return { ...image, url: toBrowserPublicStorageUrl(image.url) }
}

function extractStoragePathFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url, 'http://local.invalid')
    const marker = '/object/public/goal-images/'
    const markerIndex = parsedUrl.pathname.indexOf(marker)
    if (markerIndex === -1) return ''
    return decodeURIComponent(parsedUrl.pathname.slice(markerIndex + marker.length))
  } catch {
    return ''
  }
}

function normalizeImage(value: unknown, index: number): UploadedImage | null {
  if (isUploadedImage(value)) {
    return withBrowserSafeUrl({ ...value, order: value.order ?? index })
  }

  if (typeof value === 'string' && value.length > 0) {
    return {
      url: toBrowserPublicStorageUrl(value),
      path: extractStoragePathFromUrl(value),
      size: 0,
      order: index,
      rotation: 0,
    }
  }

  if (!value || typeof value !== 'object') return null

  const image = value as Partial<UploadedImage> & {
    publicUrl?: unknown
    public_url?: unknown
  }
  const url = typeof image.url === 'string' && image.url.length > 0
    ? image.url
    : typeof image.publicUrl === 'string' && image.publicUrl.length > 0
      ? image.publicUrl
      : typeof image.public_url === 'string' && image.public_url.length > 0
        ? image.public_url
        : ''

  if (!url) return null

  const path = typeof image.path === 'string' && image.path.length > 0
    ? image.path
    : extractStoragePathFromUrl(url)

  return {
    url: toBrowserPublicStorageUrl(url),
    path,
    size: typeof image.size === 'number' ? image.size : 0,
    width: typeof image.width === 'number' ? image.width : undefined,
    height: typeof image.height === 'number' ? image.height : undefined,
    order: typeof image.order === 'number' ? image.order : index,
    rotation: image.rotation === 90 || image.rotation === 180 || image.rotation === 270 ? image.rotation : 0,
  }
}

export function normalizeUploadedImages(images: unknown): UploadedImage[] {
  if (!Array.isArray(images)) return []
  return images
    .map(normalizeImage)
    .filter((image): image is UploadedImage => image !== null)
}

interface ImageUploaderProps {
  images: UploadedImage[]
  onChange: (images: UploadedImage[]) => void
  maxCount?: number
  disabled?: boolean
  /** Custom upload API endpoint (default: /api/goal-templates/upload-image) */
  uploadEndpoint?: string
  /** Custom delete API endpoint (default: /api/goal-templates/delete-image) */
  deleteEndpoint?: string
  /** Optional ID to pass as formData field (default: 'templateId') */
  idFieldName?: string
  /** Optional ID value to pass with upload requests */
  entityId?: string
  /** Enable drag-and-drop reordering (default: false) */
  sortable?: boolean
  /** Show subject match hint on the first image (default: false) */
  showSubjectMatchHint?: boolean
}

async function compressImage(file: File, spec: ImageQualityProfileSpec): Promise<Blob> {
  // ponytail: original 檔位 bypass，原檔直接上傳保留 EXIF；副作用：可能 timeout
  if (spec.bypass) {
    return file
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const maxDim = spec.maxDim
      let { width, height } = img

      if (maxDim && (width > maxDim || height > maxDim)) {
        if (width > height) {
          height = Math.round((height / width) * maxDim)
          width = maxDim
        } else {
          width = Math.round((width / height) * maxDim)
          height = maxDim
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      const isPng = file.type === 'image/png'
      const mimeType = isPng ? 'image/png' : 'image/jpeg'
      const quality = isPng ? undefined : spec.quality

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        mimeType,
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

export default function ImageUploader({
  images,
  onChange,
  maxCount = 10,
  disabled = false,
  uploadEndpoint = '/api/goal-templates/upload-image',
  deleteEndpoint = '/api/goal-templates/delete-image',
  idFieldName = 'templateId',
  entityId,
  sortable = false,
  showSubjectMatchHint = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // ponytail: 載入時拉一次 site_settings 拿目前選的 quality profile；
  // 若失敗就用 DEFAULT（standard），上傳行為不會中斷
  const [qualityProfile, setQualityProfile] = useState<ImageQualityProfile>(() =>
    parseImageQualityProfile(null)
  )
  useEffect(() => {
    let cancelled = false
    fetch('/api/settings')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data) return
        setQualityProfile(parseImageQualityProfile(data[IMAGE_QUALITY_SETTING_KEY]))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  const qualityProfileRef = useRef<ImageQualityProfile>(qualityProfile)
  useEffect(() => { qualityProfileRef.current = qualityProfile }, [qualityProfile])
  
  // Touch drag state for mobile support
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null)
  const [touchDragOverIndex, setTouchDragOverIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchDragRef = useRef<{ dragIndex: number; overIndex: number }>({ dragIndex: -1, overIndex: -1 })
  
  // Refs to always have latest values accessible in native event handlers
  const cleanImagesRef = useRef<UploadedImage[]>([])
  const commitChangeRef = useRef<((imgs: UploadedImage[]) => void) | null>(null)

  // Touch drag-and-drop for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    if (!sortable || disabled) return
    e.stopPropagation()
    setTouchDragIndex(index)
    setTouchDragOverIndex(index)
    touchDragRef.current = { dragIndex: index, overIndex: index }
    
    const onTouchMoveNative = (ev: TouchEvent) => {
      if (!containerRef.current) return
      ev.preventDefault() // Prevent scroll while dragging
      
      const touch = ev.touches[0]
      const elements = containerRef.current.querySelectorAll('[data-image-index]')
      
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i] as HTMLElement
        const rect = el.getBoundingClientRect()
        if (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom
        ) {
          const idx = parseInt(el.getAttribute('data-image-index') || '-1', 10)
          if (idx !== -1 && idx !== touchDragRef.current.overIndex) {
            touchDragRef.current.overIndex = idx
            setTouchDragOverIndex(idx)
          }
          break
        }
      }
    }
    
    const onTouchEndNative = () => {
      document.removeEventListener('touchmove', onTouchMoveNative)
      document.removeEventListener('touchend', onTouchEndNative)
      document.removeEventListener('touchcancel', onTouchEndNative)
      
      const { dragIndex: dIdx, overIndex: oIdx } = touchDragRef.current
      if (dIdx !== -1 && oIdx !== -1 && dIdx !== oIdx && cleanImagesRef.current && commitChangeRef.current) {
        const newImages = [...cleanImagesRef.current]
        const [moved] = newImages.splice(dIdx, 1)
        newImages.splice(oIdx, 0, moved)
        commitChangeRef.current(newImages)
      }
      
      setTouchDragIndex(null)
      setTouchDragOverIndex(null)
      touchDragRef.current = { dragIndex: -1, overIndex: -1 }
    }
    
    document.addEventListener('touchmove', onTouchMoveNative, { passive: false })
    document.addEventListener('touchend', onTouchEndNative)
    document.addEventListener('touchcancel', onTouchEndNative)
  }, [sortable, disabled])

  // Recalculate order values to match array position
  const syncOrder = useCallback(
    (imgs: UploadedImage[]): UploadedImage[] => {
      return imgs.map((img, idx) => ({ ...img, order: idx }))
    },
    []
  )

  const commitChange = useCallback(
    (imgs: UploadedImage[]) => {
      onChange(syncOrder(imgs))
    },
    [onChange, syncOrder]
  )
  const cleanImages = useMemo(() => normalizeUploadedImages(images), [images])
  
  // Keep refs in sync for native event handlers
  useEffect(() => { cleanImagesRef.current = cleanImages }, [cleanImages])
  useEffect(() => { commitChangeRef.current = commitChange }, [commitChange])

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))

      if (newFiles.length === 0) {
        setError('Please select image files only')
        return
      }

      if (cleanImages.length + newFiles.length > maxCount) {
        setError(`You can upload up to ${maxCount} images`)
        return
      }

      setUploading(true)
      setError('')

      const uploadedImages: UploadedImage[] = []

      for (const file of newFiles) {
        try {
          // Compress the image client-side
          let blob: Blob
          try {
            blob = await compressImage(file, IMAGE_QUALITY_PROFILES[qualityProfileRef.current])
          } catch {
            // If compression fails, use original
            blob = file
          }

          // Create FormData for upload
          const uploadFormData = new FormData()
          uploadFormData.append('file', blob, file.name)
          if (entityId) {
            uploadFormData.append(idFieldName, entityId)
          }

          const res = await fetch(uploadEndpoint, {
            method: 'POST',
            body: uploadFormData,
          })

          const data = await res.json()

          if (!data.success) {
            setError(data.error || 'Upload failed')
            continue
          }

          const returnedImages = Array.isArray(data.images) ? data.images : [data.image]
          const validImages = returnedImages.filter(isUploadedImage)

          if (validImages.length === 0) {
            setError(data.error || 'Upload failed')
            continue
          }

          uploadedImages.push(...validImages)
        } catch (err) {
          setError('Failed to upload image: ' + (err as Error).message)
        }
      }

      if (uploadedImages.length > 0) {
        commitChange([...cleanImages, ...uploadedImages])
        setError('')
      }

      setUploading(false)

      // Reset file inputs
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
    },
    [cleanImages, maxCount, commitChange, entityId, idFieldName, uploadEndpoint]
  )

  const handleDelete = async (image: UploadedImage, index: number) => {
    // Remove from local state immediately
    const newImages = cleanImages.filter((_, i) => i !== index)
    commitChange(newImages)

    // Try to delete from storage
    try {
      await fetch(deleteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: image.path }),
      })
    } catch {
      // Ignore delete errors - the image may not be in storage yet
    }
  }

  const handleViewerRotate = useCallback((index: number, direction: 'cw' | 'ccw') => {
    const cycleCw: Record<number, 0 | 90 | 180 | 270> = { 0: 90, 90: 180, 180: 270, 270: 0 }
    const cycleCcw: Record<number, 0 | 90 | 180 | 270> = { 0: 270, 90: 0, 180: 90, 270: 180 }
    const newImages = cleanImages.map((img, i) => {
      if (i !== index) return img
      const currentRotation = (img.rotation ?? 0) as 0 | 90 | 180 | 270
      return { ...img, rotation: direction === 'cw' ? cycleCw[currentRotation] : cycleCcw[currentRotation] }
    })
    commitChange(newImages)
  }, [cleanImages, commitChange])

  // ── Drag & Drop handlers ──

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!sortable || disabled) return
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    // Make the drag image semi-transparent
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '0.4'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!sortable || disabled || dragIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!sortable || disabled) return
    // Only clear when leaving the entire list
    const target = e.currentTarget as HTMLElement
    if (!target.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null)
    }
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    if (!sortable || disabled || dragIndex === null) return
    e.preventDefault()
    setDragOverIndex(null)

    if (dragIndex === dropIndex) {
      setDragIndex(null)
      return
    }

    const newImages = [...cleanImages]
    const [moved] = newImages.splice(dragIndex, 1)
    newImages.splice(dropIndex, 0, moved)
    commitChange(newImages)
    setDragIndex(null)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    if (!sortable || disabled) return
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '1'
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragOverContainer = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeaveContainer = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDropContainer = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const canUpload = !disabled && !uploading && cleanImages.length < maxCount

  // Rotation CSS mapping
  const rotationMap: Record<number, string> = {
    0: 'rotate(0deg)',
    90: 'rotate(90deg)',
    180: 'rotate(180deg)',
    270: 'rotate(270deg)',
  }

  return (
    <div className="space-y-3">
      {/* Preview images */}
      {cleanImages.length > 0 && (
        <div
          ref={containerRef}
          className="flex flex-wrap gap-3"
          onDragOver={handleDragOverContainer}
          onDragLeave={handleDragLeaveContainer}
          onDrop={handleDropContainer}
        >
          {cleanImages.map((image, index) => {
            const rotation = image.rotation ?? 0
            const isFirst = index === 0
            const isTouchDragging = touchDragIndex === index
            const isTouchTarget = touchDragOverIndex === index && touchDragIndex !== null && touchDragIndex !== index

            return (
              <div
                key={image.path || index}
                data-image-index={index}
                draggable={sortable && !disabled}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative flex flex-col items-center w-[92px] select-none ${
                  sortable && !disabled ? 'cursor-grab active:cursor-grabbing' : ''
                } ${dragIndex === index || isTouchDragging ? 'opacity-40' : ''} ${
                  (dragOverIndex === index && dragIndex !== index) || isTouchTarget
                    ? 'ring-2 ring-blue-500 rounded-xl'
                    : ''
                }`}
              >
                {/* Image card container */}
                <div className="relative w-full rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  {/* Drag handle + index badge */}
                  <div className="flex items-center justify-between px-1.5 py-1 bg-slate-50 border-b border-slate-200">
                    {sortable && !disabled ? (
                      <span
                        className="text-slate-400 text-sm leading-none cursor-grab active:cursor-grabbing select-none"
                        onTouchStart={(e) => handleTouchStart(e, index)}
                        style={{ touchAction: 'none' }}
                      >
                        ⋮⋮
                      </span>
                    ) : (
                      <span className="w-4" />
                    )}
                    <span className="text-[11px] font-bold text-slate-500">
                      #{index + 1}
                    </span>
                  </div>

                  {/* Subject match star badge (only first image, top-right) */}
                  {showSubjectMatchHint && isFirst && (
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center group">
                      <span
                        className="inline-flex items-center justify-center text-xs leading-none cursor-help"
                        title="第一張圖片將用於 AI 科目比對，請將考卷封面或標題頁排在最前面。"
                      >
                        ⭐
                      </span>
                      {/* Tooltip on hover - overlay inside card to avoid overflow-hidden clipping */}
                      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-40 px-2 py-1.5 rounded-lg bg-slate-800 text-[10px] text-white leading-relaxed shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-20 whitespace-normal -translate-y-full -mt-2">
                        ⭐ 第一張圖片（標示「比對用」）將用於 AI 科目比對。請將考卷封面或標題頁排在最前面。
                      </div>
                    </div>
                  )}

                  {/* Thumbnail with rotation */}
                  <div
                    className="flex items-center justify-center mx-auto"
                    style={{
                      width: 80,
                      height: 80,
                    }}
                  >
                    <img
                      src={image.url}
                      alt={`Image ${index + 1}`}
                      className="max-w-full max-h-full transition-transform duration-200"
                      style={{
                        transform: rotationMap[rotation] || 'rotate(0deg)',
                        objectFit: 'contain',
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        setViewerIndex(index)
                        setViewerOpen(true)
                      }}
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-center gap-1 px-1 py-1 bg-slate-50 border-t border-slate-200">
                    {/* Delete button */}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(image, index)
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <span className="material-icons-outlined text-sm">close</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : canUpload
              ? 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
              : 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-60'
        }`}
        onDragOver={handleDragOverContainer}
        onDragLeave={handleDragLeaveContainer}
        onDrop={handleDropContainer}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <span className="material-icons-outlined text-2xl text-blue-500 animate-spin">autorenew</span>
            <p className="text-sm text-slate-500">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex items-center gap-3">
              {/* 拍照按鈕 */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); canUpload && cameraInputRef.current?.click() }}
                disabled={!canUpload}
                className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-icons-outlined text-2xl text-blue-600">photo_camera</span>
                <span className="text-xs font-medium text-blue-700">拍照</span>
              </button>

              {/* 選圖庫按鈕 */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); canUpload && fileInputRef.current?.click() }}
                disabled={!canUpload}
                className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-icons-outlined text-2xl text-slate-600">photo_library</span>
                <span className="text-xs font-medium text-slate-700">選圖片</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              或拖放圖片至此
            </p>
            {cleanImages.length > 0 && (
              <p className="text-xs text-slate-400">
                {cleanImages.length} / {maxCount}
              </p>
            )}
          </div>
        )}

        {/* 拍照用 input（capture） */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={!canUpload}
        />

        {/* 圖庫用 input（無 capture） */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={!canUpload}
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span className="material-icons-outlined text-sm">error</span>
          {error}
        </p>
      )}

      {/* Image viewer */}
      <ImageViewer
        images={cleanImages}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onRotate={handleViewerRotate}
      />
    </div>
  )
}
