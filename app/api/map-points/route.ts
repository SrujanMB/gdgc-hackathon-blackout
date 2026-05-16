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
      offering_item:Item!Trade_Offer_offering_fkey ( id, title, description, image_url ),
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
    const contentType = request.headers.get("content-type") || "";
    let lat: number | null = null;
    let lng: number | null = null;
    let haveTitle = "";
    let haveDesc = "";
    let wantTitle = "";
    let wantDesc = "";
    let userId: number | null = null;
    let itemImage: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      lat = Number(formData.get("lat"));
      lng = Number(formData.get("lng"));
      haveTitle = String(formData.get("haveTitle") ?? "");
      haveDesc = String(formData.get("haveDesc") ?? "");
      wantTitle = String(formData.get("wantTitle") ?? "");
      wantDesc = String(formData.get("wantDesc") ?? "");
      const rawUserId = formData.get("userId");
      userId = rawUserId ? Number(rawUserId) : null;
      const fileCandidate = formData.get("itemImage");
      itemImage = fileCandidate instanceof File ? fileCandidate : null;
    } else {
      const body = await request.json();
      // Removed userId from being strictly required here for the Trade_Offer table
      const { lat: bodyLat, lng: bodyLng, haveTitle: bodyHaveTitle, haveDesc: bodyHaveDesc, wantTitle: bodyWantTitle, wantDesc: bodyWantDesc, userId: bodyUserId } = body;
      lat = Number(bodyLat);
      lng = Number(bodyLng);
      haveTitle = bodyHaveTitle;
      haveDesc = bodyHaveDesc;
      wantTitle = bodyWantTitle;
      wantDesc = bodyWantDesc;
      userId = bodyUserId ?? null;
    }

    console.log("Received coordinates:", { lat, lng, haveTitle, wantTitle });

    if (!haveTitle || !wantTitle || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    let imageUrl: string | null = null;
    if (itemImage && itemImage.size > 0) {
      const extension = itemImage.name.split(".").pop() || "jpg";
      const fileName = `item-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("Item_Images")
        .upload(fileName, itemImage, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error("Supabase storage upload error:", uploadError);
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from("Item_Images")
        .getPublicUrl(fileName);
      imageUrl = publicData?.publicUrl ?? null;
    }

    // A. Insert Offered Asset (Item table does seem to have an owner column based on your types)
    const offerPayload: any = {
      title: haveTitle,
      description: haveDesc,
      UserID: userId,
      image_url: imageUrl,
    };

    const { data: offerItem, error: offerErr } = await supabase
      .from("Item")
      .insert(offerPayload as any)
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
