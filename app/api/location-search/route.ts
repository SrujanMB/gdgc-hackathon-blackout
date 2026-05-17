import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Database } from "@/types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Haversine distance calculation
function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const locationCache = new Map<string, string>();

async function getLocationName(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = locationCache.get(key);
  if (cached !== undefined) return cached;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: { "User-Agent": "blackout-map-search" },
      },
    );

    if (!response.ok) {
      locationCache.set(key, "");
      return "";
    }

    const ct = response.headers.get("content-type") || "";
    if (!ct.includes("json")) {
      locationCache.set(key, "");
      return "";
    }

    const data = await response.json();
    const address = data.address || {};
    const name =
      address.suburb || address.village || address.town || address.city || "";
    locationCache.set(key, name.toLowerCase());
    return name.toLowerCase();
  } catch {
    locationCache.set(key, "");
    return "";
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const userLat = parseFloat(searchParams.get("lat") || "0");
    const userLng = parseFloat(searchParams.get("lng") || "0");
    const maxResults = parseInt(searchParams.get("limit") || "10");

    if (!query || query.length < 1) {
      return NextResponse.json([]);
    }

    // Fetch all trade offers with user names and item info
    const { data: offers, error } = await supabase.from("Trade_Offer").select(`
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

    const queryLower = query.toLowerCase();

    // Parse locations and calculate distances
    const resultsPromises = (offers || []).map(async (offer: any) => {
      let latitude = 0;
      let longitude = 0;

      if (offer.location) {
        if (Array.isArray(offer.location)) {
          [longitude, latitude] = offer.location;
        } else if (
          typeof offer.location === "object" &&
          offer.location.coordinates
        ) {
          [longitude, latitude] = offer.location.coordinates;
        } else if (
          typeof offer.location === "string" &&
          offer.location.startsWith("POINT")
        ) {
          const match = offer.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
          if (match) {
            longitude = parseFloat(match[1]);
            latitude = parseFloat(match[2]);
          }
        }
      }

      const distance = haversine(userLat, userLng, latitude, longitude);
      const userName = offer.User?.name || "Unknown Survivor";
      const offeringTitle = offer.offering_item?.title || "Unknown Item";
      const wantingTitle = offer.wanting_item?.title || "Unknown Item";

      // Check if query matches user name, offering, or wanting items
      const matchesUser = userName.toLowerCase().includes(queryLower);
      const matchesOffering = offeringTitle.toLowerCase().includes(queryLower);
      const matchesWanting = wantingTitle.toLowerCase().includes(queryLower);

      // Also check if query matches location/suburb/city
      const locationName = await getLocationName(latitude, longitude);
      const matchesLocation = locationName.includes(queryLower);

      if (
        !matchesUser &&
        !matchesOffering &&
        !matchesWanting &&
        !matchesLocation
      ) {
        return null;
      }

      // Always show the matched item first, then the person
      let label;
      if (matchesOffering) {
        label = `${offeringTitle} by ${userName}`;
      } else if (matchesWanting) {
        label = `${wantingTitle} — ${userName}`;
      } else if (matchesLocation) {
        label = `${locationName} — ${userName}`;
      } else {
        label = `${offeringTitle} by ${userName}`;
      }

      return {
        id: offer.id,
        userId: offer.UserID,
        latitude,
        longitude,
        distance,
        userName,
        label,
        offering: offeringTitle,
        wanting: wantingTitle,
      };
    });

    const results = (await Promise.all(resultsPromises))
      .filter(
        (result: any): result is (typeof resultsPromises)[0] => result !== null,
      )
      .sort((a: any, b: any) => a.distance - b.distance)
      .slice(0, maxResults);

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
