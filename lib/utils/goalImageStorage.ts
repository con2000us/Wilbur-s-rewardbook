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

/** 從 image_urls JSON 收集 storage path（去重） */
export function collectGoalImagePaths(images: unknown): string[] {
  const paths = new Set<string>()
  for (const image of toGoalImageRecords(images)) {
    const path = extractGoalImagePath(image)
    if (path) paths.add(path)
  }
  return [...paths]
}

const STORAGE_REMOVE_BATCH = 1000

/** 批次刪除 goal-images bucket 內的檔案 */
export async function removeGoalImagesByPaths(
  adminClient: AdminClient,
  paths: string[]
): Promise<void> {
  const unique = [...new Set(paths.filter(Boolean))]
  if (unique.length === 0) return

  for (let i = 0; i < unique.length; i += STORAGE_REMOVE_BATCH) {
    const batch = unique.slice(i, i + STORAGE_REMOVE_BATCH)
    const { error } = await adminClient.storage.from(GOAL_IMAGES_BUCKET).remove(batch)
    if (error) {
      console.error('removeGoalImagesByPaths error:', error.message, batch)
    }
  }
}

/** 列出 assessments/{assessmentId}/ 資料夾內所有檔案 path */
async function listAssessmentFolderPaths(
  adminClient: AdminClient,
  assessmentId: string
): Promise<string[]> {
  const folder = `assessments/${assessmentId}`
  const { data, error } = await adminClient.storage
    .from(GOAL_IMAGES_BUCKET)
    .list(folder, { limit: 1000 })

  if (error || !data) {
    if (error) console.error('listAssessmentFolderPaths error:', assessmentId, error.message)
    return []
  }

  return data
    .filter((file) => file.name)
    .map((file) => `${folder}/${file.name}`)
}

/**
 * 刪除評量附圖：image_urls 記錄 + assessments/{id}/ 資料夾內殘留檔案
 */
export async function purgeAssessmentImages(
  adminClient: AdminClient,
  assessmentId: string,
  imageUrls?: unknown
): Promise<void> {
  const paths = new Set(collectGoalImagePaths(imageUrls))
  const folderPaths = await listAssessmentFolderPaths(adminClient, assessmentId)
  folderPaths.forEach((p) => paths.add(p))
  await removeGoalImagesByPaths(adminClient, [...paths])
}

/** 批次刪除多筆評量的附圖 */
export async function purgeManyAssessmentImages(
  adminClient: AdminClient,
  assessments: Array<{ id: string; image_urls?: unknown }>
): Promise<void> {
  const paths = new Set<string>()
  for (const assessment of assessments) {
    collectGoalImagePaths(assessment.image_urls).forEach((p) => paths.add(p))
    const folderPaths = await listAssessmentFolderPaths(adminClient, assessment.id)
    folderPaths.forEach((p) => paths.add(p))
  }
  await removeGoalImagesByPaths(adminClient, [...paths])
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
