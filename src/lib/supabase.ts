import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    _client = createClient(url, key)
  }
  return _client
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_: SupabaseClient, prop: string | symbol) {
    const client = getClient()
    const val = client[prop as keyof SupabaseClient]
    return typeof val === 'function' ? (val as (...args: unknown[]) => unknown).bind(client) : val
  },
})
