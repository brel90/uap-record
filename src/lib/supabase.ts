import { createClient } from '@supabase/supabase-js'

console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL ? 'set' : 'MISSING')
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'set' : 'MISSING')

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
