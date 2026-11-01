import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const clavePublica = import.meta.env.VITE_SUPABASE_ANON_KEY

/** null mientras no haya un proyecto de Supabase configurado en .env.local. */
export const supabase = url && clavePublica ? createClient(url, clavePublica) : null
