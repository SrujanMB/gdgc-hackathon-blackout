import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Database } from "@/types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ==========================================
// GET: Fetch messages for a conversation
// ==========================================
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const senderId = searchParams.get("senderId");
  const receiverId = searchParams.get("receiverId");
  const tradeOfferId = searchParams.get("tradeOfferId");

  if (!senderId || !receiverId) {
    return NextResponse.json(
      { error: "Missing senderId or receiverId" },
      { status: 400 },
    );
  }

  try {
    let query = supabase
      .from("Message")
      .select(
        `
        id,
        sender_id,
        receiver_id,
        content,
        created_at,
        trade_offer_id
      `,
      )
      .or(
        `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`,
      )
      .order("created_at", { ascending: true });

    if (tradeOfferId) {
      query = query.eq("trade_offer_id", parseInt(tradeOfferId));
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Ensure we always return an array
    return NextResponse.json(messages || []);
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// POST: Send a message
// ==========================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { senderId, receiverId, content, tradeOfferId } = body;

    if (!senderId || !receiverId || !content) {
      return NextResponse.json(
        { error: "Missing required fields: senderId, receiverId, content" },
        { status: 400 },
      );
    }

    const { data: message, error } = await supabase
      .from("Message")
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        trade_offer_id: tradeOfferId || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
