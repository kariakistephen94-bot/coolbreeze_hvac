import { NextResponse } from "next/server";
import { fetchLiveSnapshot } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await fetchLiveSnapshot();
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    console.error("Failed to fetch live Supabase dashboard snapshot:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load dashboard data from Supabase" },
      { status: 500 },
    );
  }
}
