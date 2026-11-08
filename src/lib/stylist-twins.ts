import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * A client's style twin and the looks rendered on it, for Tee's client page.
 *
 * Twins and renders are created by the mobile app's API and live in the
 * private `twins` storage bucket (see grwtee-mobile docs/style-twin.md), so
 * every image here is a short-lived signed URL.
 */

const TWIN_BUCKET = 'twins'
const VIEW_TTL_SECONDS = 60 * 60

export type ClientTwinRender = {
  id: string
  lookId: string | null
  lookTitle: string | null
  url: string
  createdAt: string
}

export type ClientTwin = {
  source: 'photo' | 'generated'
  status: 'processing' | 'ready' | 'failed'
  imageUrl: string | null
  updatedAt: string
  renders: ClientTwinRender[]
}

type TwinRow = {
  source: ClientTwin['source']
  status: ClientTwin['status']
  image_path: string | null
  version: number
  updated_at: string
}

type RenderRow = {
  id: string
  look_id: string | null
  result_path: string | null
  created_at: string
}

/** Null when the client has no twin (or twins aren't set up in this project). */
export async function getClientTwin(
  admin: SupabaseClient,
  clientId: string,
  renderLimit = 8
): Promise<ClientTwin | null> {
  const { data: twin, error } = await admin
    .from('style_twins')
    .select('source, status, image_path, version, updated_at')
    .eq('user_id', clientId)
    .maybeSingle<TwinRow>()
  if (error || !twin) return null

  const { data: jobs } = await admin
    .from('tryon_jobs')
    .select('id, look_id, result_path, created_at')
    .eq('user_id', clientId)
    .eq('status', 'completed')
    .eq('twin_version', twin.version)
    .not('result_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(renderLimit)
    .returns<RenderRow[]>()

  const renders = jobs ?? []
  const lookIds = [...new Set(renders.map((r) => r.look_id).filter((id): id is string => !!id))]
  const paths = [twin.image_path, ...renders.map((r) => r.result_path)].filter((p): p is string => !!p)

  const [looksRes, signedRes] = await Promise.all([
    lookIds.length
      ? admin.from('looks').select('id, title').in('id', lookIds).returns<Array<{ id: string; title: string }>>()
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    paths.length
      ? admin.storage.from(TWIN_BUCKET).createSignedUrls(paths, VIEW_TTL_SECONDS)
      : Promise.resolve({ data: [] as Array<{ path: string | null; signedUrl: string; error: string | null }> })
  ])

  const titles = new Map((looksRes.data ?? []).map((l) => [l.id, l.title]))
  const signed = new Map(
    (signedRes.data ?? [])
      .filter((s) => s.path && s.signedUrl && !s.error)
      .map((s) => [s.path as string, s.signedUrl])
  )

  return {
    source: twin.source,
    status: twin.status,
    imageUrl: twin.image_path ? signed.get(twin.image_path) ?? null : null,
    updatedAt: twin.updated_at,
    renders: renders.flatMap((r) => {
      const url = r.result_path ? signed.get(r.result_path) : undefined
      return url
        ? [{ id: r.id, lookId: r.look_id, lookTitle: r.look_id ? titles.get(r.look_id) ?? null : null, url, createdAt: r.created_at }]
        : []
    })
  }
}
