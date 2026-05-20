import { createClient } from '@supabase/supabase-js'

// Public keys — safe to bundle in client-side code; RLS policies protect data access.
// Env vars take precedence when available (local dev); hardcoded values are the production fallback.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://pxyxnpafrhykwmztixth.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4eXhucGFmcmh5a3dtenRpeHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTczNDUsImV4cCI6MjA5MzkzMzM0NX0.HmMtYHMUUeOsfgX78caaelYUOissUnpsjx2-ukcDewE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
