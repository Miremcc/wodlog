import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nqviapmqhlvayiphwnfr.supabase.co'
const supabaseKey = 'sb_publishable_didyVxLHA_o5uWESmf4org_bYksoSci'

export const supabase = createClient(supabaseUrl, supabaseKey)