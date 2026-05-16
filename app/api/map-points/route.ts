import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role to bypass RLS for hackathon speed
);

export async function GET() {
  // Fetch profiles and join their inventory records in one clean hit
  const { data, error } = await supabase.from("profiles").select(`
      id, name, business_name, is_store, latitude, longitude,
      inventory (*)
    `);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
