import { NextRequest, NextResponse } from "next/server";
import { updateLeadStatusOrPriority } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, priority } = body;

    const updated = await updateLeadStatusOrPriority(id, { status, priority });
    return NextResponse.json({ success: true, lead: updated });
  } catch (err: any) {
    console.error("Failed to update lead in Supabase:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update lead" },
      { status: 500 },
    );
  }
}
