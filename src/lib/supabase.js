import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error(
    "Supabase environment variables are missing! " +
    "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel/Environment settings."
  );
}

export const supabase = (SUPABASE_URL && SUPABASE_ANON) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON)
  : new Proxy({}, {
      get: (target, prop) => {
        throw new Error(`Supabase client called but not initialized. Missing environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Accessed property: ${prop}`);
      }
    });


