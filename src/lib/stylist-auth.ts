import { getServerSessionWithDB } from './auth-helpers'
import { createAdminClient } from './supabase/admin'

export async function getStylistId(): Promise<string | null> {
  const session = await getServerSessionWithDB()
  if (!session?.user?.email) return null
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', session.user.email)
    .single()
  return data?.id ?? null
}
