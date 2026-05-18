'use client'

import { useState, useRef, useCallback } from 'react'
import ImageViewer from '@/app/components/ImageViewer'

export interface UploadedImage {
  url: string
  path: string
  size: number
  width?: number
  height?: number
}

// 向後相容的別名
export type GoalTemplateImage = UploadedImage

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
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const MAX_DIMENSION = 1200
      let { width, height } = img

      // Resize if larger than max dimension
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height / width) * MAX_DIMENSION)
          width = MAX_DIMENSION
        } else {
          width = Math.round((width / height) * MAX_DIMENSION)
          height = MAX_DIMENSION
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

      // Determine output format
      const isPng = file.type === 'image/png'
      const mimeType = isPng ? 'image/png' : 'image/jpeg'
      const quality = isPng ? undefined : 0.7

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
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))

      if (newFiles.length === 0) {
        setError('Please select image files only')
        return
      }

      if (images.length + newFiles.length > maxCount) {
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
            blob = await compressImage(file)
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

          uploadedImages.push(data.image)
        } catch (err) {
          setError('Failed to upload image: ' + (err as Error).message)
        }
      }

      if (uploadedImages.length > 0) {
        onChange([...images, ...uploadedImages])
        setError('')
      }

      setUploading(false)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [images, maxCount, onChange]
  )

  const handleDelete = async (image: UploadedImage, index: number) => {
    // Remove from local state immediately
    const newImages = images.filter((_, i) => i !== index)
    onChange(newImages)

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const canUpload = !disabled && !uploading && images.length < maxCount

  return (
    <div className="space-y-3">
      {/* Preview images grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image.url}
                alt={`Image ${index + 1}`}
                className="w-20 h-20 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
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
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleDelete(image, index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                >
                  <span className="material-icons-outlined text-sm">close</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : canUpload
              ? 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer'
              : 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-60'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => canUpload && fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <span className="material-icons-outlined text-2xl text-blue-500 animate-spin">autorenew</span>
            <p className="text-sm text-slate-500">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-2">
            <span className="material-icons-outlined text-2xl text-slate-400">
              {images.length === 0 ? 'add_photo_alternate' : 'add'}
            </span>
            <p className="text-sm text-slate-500">
              {images.length === 0
                ? 'Click or drag images to upload'
                : 'Add more images'}
            </p>
            {images.length > 0 && (
              <p className="text-xs text-slate-400">
                {images.length} / {maxCount}
              </p>
            )}
          </div>
        )}

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
        images={images}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  )
}
