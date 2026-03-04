import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn(
    "[I.D.I.O.T.] Supabase env vars missing — running in demo mode.\n" +
    "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to connect."
  );
}

export const supabase = url && key ? createClient(url, key) : null;

/** true when Supabase is configured and available */
export const isLive = !!supabase;
