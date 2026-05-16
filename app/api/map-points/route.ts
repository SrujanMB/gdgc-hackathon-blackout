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
  // Fetch raw data - location will be in EWKB binary hex format
  const { data: offers, error } = await supabase
    .from("Trade_Offer")
    .select(`
      id,
      location,
      UserID,
      User ( name ),
      offering_item:Item!Trade_Offer_offering_fkey ( id, title, description ),
      wanting_item:Item!Trade_Offer_wanting_fkey ( id, title, description )
    `);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const parsedPoints = (offers || []).map((offer: any) => {
    let latitude = 0;
    let longitude = 0;

    // Handle location data
    if (offer.location) {
      if (Array.isArray(offer.location)) {
        // Array format [lng, lat]
        [longitude, latitude] = offer.location;
      } else if (typeof offer.location === "object" && offer.location.coordinates) {
        // GeoJSON format { type: "Point", coordinates: [lng, lat] }
        [longitude, latitude] = offer.location.coordinates;
      } else if (typeof offer.location === "string" && offer.location.startsWith("POINT")) {
        // WKT string format "POINT(lng lat)"
        const match = offer.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
        if (match) {
          longitude = parseFloat(match[1]);
          latitude = parseFloat(match[2]);
        }
      }
    }

    return {
      id: offer.id,
      userId: offer.UserID,
      latitude,
      longitude,
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

    console.log('Received coordinates:', { lat, lng, haveTitle, wantTitle });

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
        UserID: userId,
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

    // C. Insert Complete Trade Offer Entry using a standard WKT string for GEOMETRY
    const { data: tradeOffer, error: tradeErr } = await supabase
      .from("Trade_Offer")
      .insert({
        location: `SRID=4326;POINT(${lng} ${lat})`, // Standard WKT for geometry
        offering: offerItem.id,
        wanting: wantItem.id,
        UserID: userId,
      })
      .select("id")
      .single();

    if (tradeErr) {
      console.error("Supabase insert error:", tradeErr);
      throw tradeErr;
    }

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
