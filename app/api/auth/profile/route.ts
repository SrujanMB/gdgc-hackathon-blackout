import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Database } from "@/types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const authId = searchParams.get("authId");
  const userID = searchParams.get("userID");

  if (!authId && !userID) {
    return NextResponse.json({ error: "Missing authId or userID" }, { status: 400 });
  }

  let query = supabase
    .from("User")
    .select("UserID, name, email");

  if (authId) {
    query = query.eq("auth_id", authId);
  } else if (userID) {
    query = query.eq("UserID", parseInt(userID));
  }

  const { data: user, error } = await query.single();

  if (error || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
