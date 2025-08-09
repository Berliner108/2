import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      // nur im Browser localStorage verwenden
      storage: typeof window !== "undefined" ? localStorage : undefined,
      autoRefreshToken: true,
    },
  }
);
