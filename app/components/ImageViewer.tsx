'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface ImageItem {
  url: string
}

interface ImageViewerProps {
  images: ImageItem[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

export default function ImageViewer({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [mounted, setMounted] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

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
          onLoad={() => setImageLoaded(true)}
          draggable={false}
        />
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
