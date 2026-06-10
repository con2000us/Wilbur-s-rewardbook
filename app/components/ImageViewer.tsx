'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface ImageItem {
  url: string
  rotation?: number
}

interface ImageViewerProps {
  images: ImageItem[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
  onRotate?: (index: number, direction: 'cw' | 'ccw') => void
}

const cycleCw: Record<number, 0 | 90 | 180 | 270> = { 0: 90, 90: 180, 180: 270, 270: 0 }
const cycleCcw: Record<number, 0 | 90 | 180 | 270> = { 0: 270, 90: 0, 180: 90, 270: 180 }

const rotationMap: Record<number, string> = {
  0: 'rotate(0deg)',
  90: 'rotate(90deg)',
  180: 'rotate(180deg)',
  270: 'rotate(270deg)',
}

const rotationLabels: Record<number, string> = {
  0: '0°',
  90: '90°',
  180: '180°',
  270: '270°',
}

export default function ImageViewer({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  onRotate,
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [mounted, setMounted] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Internal rotation state per image (for visual-only rotation when no onRotate)
  const [localRotations, setLocalRotations] = useState<Record<number, number>>({})

  // Reset local rotations when viewer opens with new images
  useEffect(() => {
    if (isOpen) {
      const initial: Record<number, number> = {}
      images.forEach((img, i) => {
        initial[i] = img.rotation ?? 0
      })
      setLocalRotations(initial)
    }
  }, [isOpen, images])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex, isOpen])

  const goNext = useCallback(() => {
    setImageLoaded(false)
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  const goPrev = useCallback(() => {
    setImageLoaded(false)
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }, [images.length])

  const handleRotate = useCallback((direction: 'cw' | 'ccw') => {
    const currentRotation = (localRotations[currentIndex] ?? 0) as 0 | 90 | 180 | 270
    const newRotation = direction === 'cw' ? cycleCw[currentRotation] : cycleCcw[currentRotation]

    setLocalRotations((prev) => ({ ...prev, [currentIndex]: newRotation }))

    // Also notify parent if callback provided (for persistence in ImageUploader)
    if (onRotate) {
      onRotate(currentIndex, direction)
    }
  }, [currentIndex, localRotations, onRotate])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight') {
        goNext()
      } else if (e.key === 'ArrowLeft') {
        goPrev()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, goNext, goPrev])

  if (!isOpen || !mounted || images.length === 0) return null

  const currentImage = images[currentIndex]
  const hasMultiple = images.length > 1
  const rotation = (localRotations[currentIndex] ?? currentImage?.rotation ?? 0) as number

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center animate-fadeIn"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-110"
        aria-label="Close"
      >
        <span className="material-icons-outlined text-white text-2xl">close</span>
      </button>

      {/* Image counter */}
      {hasMultiple && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
          <span className="text-white text-sm font-medium tabular-nums">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
      )}

      {/* Previous button */}
      {hasMultiple && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev() }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-110"
          aria-label="Previous image"
        >
          <span className="material-icons-outlined text-white text-3xl">chevron_left</span>
        </button>
      )}

      {/* Next button */}
      {hasMultiple && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext() }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-110"
          aria-label="Next image"
        >
          <span className="material-icons-outlined text-white text-3xl">chevron_right</span>
        </button>
      )}

      {/* Image container */}
      <div className="w-full h-full flex items-center justify-center p-20" onClick={(e) => e.stopPropagation()}>
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-icons-outlined text-4xl text-white/40 animate-spin">autorenew</span>
          </div>
        )}
        <img
          src={currentImage.url}
          alt={`Image ${currentIndex + 1}`}
          className={`max-w-full max-h-full object-contain rounded-lg select-none transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            transform: rotationMap[rotation] || 'rotate(0deg)',
            maxWidth: rotation === 90 || rotation === 270 ? 'none' : undefined,
            maxHeight: rotation === 90 || rotation === 270 ? '100%' : undefined,
          }}
          onLoad={() => setImageLoaded(true)}
          draggable={false}
        />

        {/* Rotation controls inside the image container */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleRotate('ccw')
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            aria-label="Rotate counter-clockwise"
            title="向左旋轉 90°"
          >
            <span className="material-icons-outlined text-white text-2xl">rotate_left</span>
          </button>

          <span className="text-white text-sm font-medium tabular-nums min-w-[32px] text-center">
            {rotationLabels[rotation] || '0°'}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation()
              handleRotate('cw')
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            aria-label="Rotate clockwise"
            title="向右旋轉 90°"
          >
            <span className="material-icons-outlined text-white text-2xl">rotate_right</span>
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  )

  return createPortal(modalContent, document.body)
}
