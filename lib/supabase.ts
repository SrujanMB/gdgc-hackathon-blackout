// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import { Database } from "../types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// The <Database> generic provides full type safety for your queries
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
