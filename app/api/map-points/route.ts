import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Database } from "@/types"; // Adjust path as needed

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ==========================================
// 1. GET: Fetch & Parse Map Points
// ==========================================
export async function GET() {
  // Removed `user_id` from this select string
  const { data: offers, error } = await supabase.from("Trade_Offer").select(`
      id,
      location,
      User ( name ),
      offering_item:Item!Trade_Offer_offering_fkey ( id, title, description ),
      wanting_item:Item!Trade_Offer_wanting_fkey ( id, title, description )
    `);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const parsedPoints = (offers || []).map((offer: any) => {
    const coordinates = offer.location?.coordinates || [0, 0];

    return {
      id: offer.id,
      latitude: coordinates[1],
      longitude: coordinates[0],
      name: offer.User?.name || "Unknown Survivor",
      offering: offer.offering_item ? [offer.offering_item] : [],
      seeking: offer.wanting_item ? [offer.wanting_item] : [],
    };
  });

  return NextResponse.json(parsedPoints);
}

// ==========================================
// 2. POST: Multi-Step Trade Node Creation
// ==========================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Removed userId from being strictly required here for the Trade_Offer table
    const { lat, lng, haveTitle, haveDesc, wantTitle, wantDesc, userId } = body;

    if (!haveTitle || !wantTitle || !lat || !lng) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // A. Insert Offered Asset (Item table does seem to have an owner column based on your types)
    const { data: offerItem, error: offerErr } = await supabase
      .from("Item")
      .insert({
        title: haveTitle,
        description: haveDesc,
        UserID: userId || null,
      })
      .select("id")
      .single();

    if (offerErr) throw offerErr;

    // B. Insert Wanted Asset
    const { data: wantItem, error: wantErr } = await supabase
      .from("Item")
      .insert({ title: wantTitle, description: wantDesc })
      .select("id")
      .single();

    if (wantErr) throw wantErr;

    // C. Insert Complete Trade Offer Entry
    const postGisPoint = `POINT(${lng} ${lat})`;

    // Removed user_id from this insert payload entirely
    const { data: tradeOffer, error: tradeErr } = await supabase
      .from("Trade_Offer")
      .insert({
        location: postGisPoint,
        offering: offerItem.id,
        wanting: wantItem.id,
      })
      .select("id")
      .single();

    if (tradeErr) throw tradeErr;

    return NextResponse.json({ success: true, tradeId: tradeOffer.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// 3. DELETE: Tear down Trade Node
// ==========================================
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Trade Offer ID required" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("Trade_Offer")
      .delete()
      .eq("id", parseInt(id));

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
