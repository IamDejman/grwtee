import { createAdminClient } from '@/lib/supabase/admin'

export type StylistClient = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  body_shape: string | null
  style_tags: string[] | null
  subscription_tier: string | null
  location: string | null
  conversation_id: string
  last_message_at: string | null
}

/** Clients are the app users who have a conversation with this stylist, most recent first. */
export async function getStylistClients(ownerId: string): Promise<{ clients: StylistClient[]; error: boolean }> {
  const admin = createAdminClient()
  const { data: conversations, error } = await admin
    .from('conversations')
    .select('id, client_id, last_message_at')
    .eq('stylist_id', ownerId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
  if (error) return { clients: [], error: true }
  if (!conversations?.length) return { clients: [], error: false }

  const { data: profiles, error: profileError } = await admin
    .from('profiles')
    .select('id, full_name, email, avatar_url, body_shape, style_tags, subscription_tier, location')
    .in('id', conversations.map((c) => c.client_id))
  if (profileError) return { clients: [], error: true }

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]))
  const clients = conversations.flatMap((c) => {
    const profile = byId.get(c.client_id)
    return profile ? [{ ...profile, conversation_id: c.id, last_message_at: c.last_message_at }] : []
  })
  return { clients, error: false }
}

export function clientName(client: Pick<StylistClient, 'full_name' | 'email'>): string {
  return client.full_name?.trim() || client.email || 'Unnamed client'
}
