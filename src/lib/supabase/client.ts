import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Stability Guard: Handle missing env vars without crashing sub-systems
  if (!supabaseUrl || !supabaseKey) {
    if (typeof window !== "undefined") {
      console.warn("Supabase credentials missing. Running in limited local mode.");
    }
    // Return a dummy client that fails gracefully rather than crashing with invalid URL
    return createBrowserClient(
      "https://placeholder-disabled.supabase.co", 
      "placeholder"
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
