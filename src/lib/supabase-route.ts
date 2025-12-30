import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
// Optional, falls du bereits Database Types hast:
// import type { Database } from "@/types/supabase";

export function createSupabaseRouteClient() {
  // Wenn du Database Types nutzt, setz <Database> ein:
  // return createRouteHandlerClient<Database>({ cookies });

  return createRouteHandlerClient({ cookies });
}
