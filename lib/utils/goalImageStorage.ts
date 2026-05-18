import { createAdminClient } from '@/lib/supabase/server-admin'

const GOAL_IMAGES_BUCKET = 'goal-images'

type AdminClient = ReturnType<typeof createAdminClient>

export type GoalImageRecord = Record<string, unknown> & {
  url?: string
  path?: string
  size?: number
  width?: number
  height?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function toGoalImageRecords(value: unknown): GoalImageRecord[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord) as GoalImageRecord[]
}

export function extractGoalImagePath(image: GoalImageRecord) {
  if (typeof image.path === 'string' && image.path.length > 0) return image.path

  if (typeof image.url !== 'string') return ''
  try {
    const url = new URL(image.url)
    const marker = `/object/public/${GOAL_IMAGES_BUCKET}/`
    const markerIndex = url.pathname.indexOf(marker)
    if (markerIndex === -1) return ''
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
  } catch {
    return ''
  }
}

export function isTemporaryGoalImagePath(path: string) {
  return (
    path.startsWith('pending/') ||
    path.startsWith('goal-templates/pending/') ||
    path.startsWith('student-goals/temp/')
  )
}

function getFileName(path: string) {
  return path.split('/').filter(Boolean).pop() || ''
}

async function targetFileExists(adminClient: AdminClient, targetFolder: string, fileName: string) {
  const { data } = await adminClient.storage
    .from(GOAL_IMAGES_BUCKET)
    .list(targetFolder, { limit: 1, search: fileName })

  return Boolean(data?.some((file) => file.name === fileName))
}

export async function moveTemporaryGoalImages(
  adminClient: AdminClient,
  images: unknown,
  targetFolder: string,
  options: { removeSource?: boolean; dropMissingTemporary?: boolean } = {}
) {
  const sourceImages = toGoalImageRecords(images)
  const movedImages: GoalImageRecord[] = []
  let changed = false

  for (const image of sourceImages) {
    const oldPath = extractGoalImagePath(image)

    if (!oldPath || !isTemporaryGoalImagePath(oldPath)) {
      movedImages.push(image)
      continue
    }

    const fileName = getFileName(oldPath)
    if (!fileName) {
      if (!options.dropMissingTemporary) movedImages.push(image)
      changed = true
      continue
    }

    const newPath = `${targetFolder}/${fileName}`
    const newUrl = adminClient.storage.from(GOAL_IMAGES_BUCKET).getPublicUrl(newPath).data?.publicUrl || ''
    const alreadyExists = await targetFileExists(adminClient, targetFolder, fileName)

    if (!alreadyExists) {
      const { data: fileData } = await adminClient.storage
        .from(GOAL_IMAGES_BUCKET)
        .download(oldPath)

      if (!fileData) {
        if (!options.dropMissingTemporary) movedImages.push(image)
        changed = true
        continue
      }

      const { error: uploadError } = await adminClient.storage
        .from(GOAL_IMAGES_BUCKET)
        .upload(newPath, fileData, {
          contentType: fileData.type || 'image/png',
          upsert: true,
        })

      if (uploadError) {
        if (!options.dropMissingTemporary) movedImages.push(image)
        changed = true
        continue
      }
    }

    if (options.removeSource && oldPath !== newPath) {
      await adminClient.storage.from(GOAL_IMAGES_BUCKET).remove([oldPath])
    }

    movedImages.push({
      ...image,
      url: newUrl,
      path: newPath,
    })
    changed = true
  }

  return { images: movedImages, changed }
}
