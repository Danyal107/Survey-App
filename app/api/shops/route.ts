import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { notDeleted } from "@/lib/notDeleted";
import { Shop } from "@/models/Shop";

export async function GET() {
  try {
    await connectDB();
    const rows = await Shop.find(notDeleted)
      .sort({ createdAt: -1 })
      .select("details coordinates createdAt")
      .lean();
    return NextResponse.json(
      rows.map((s) => ({
        _id: String(s._id),
        details: s.details ?? {},
        coordinates: s.coordinates ?? null,
        createdAt: s.createdAt?.toISOString?.() ?? null,
      }))
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load shops" },
      { status: 500 }
    );
  }
}
