import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Database } from "@/types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ==========================================
// POST: Signup - Create a new user
// ==========================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, password" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("User")
      .select("UserID")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 },
      );
    }

    // Create new user in User table
    // Note: In production, you should hash the password before storing
    const { data: user, error } = await supabase
      .from("User")
      .insert({
        name,
        email,
        password_hash: password, // TODO: Hash this with bcrypt in production
      })
      .select("UserID, name, email")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      user: {
        userID: user.UserID,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
