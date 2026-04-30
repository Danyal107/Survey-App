import { NextResponse } from "next/server";
import {
  getOrCreateShopOptions,
  toShopOptionsDTO,
} from "@/lib/shopOptionsStore";
import { parseShopOptionsBody } from "@/lib/shopOptionsValidate";

export async function GET() {
  try {
    const doc = await getOrCreateShopOptions();
    return NextResponse.json(toShopOptionsDTO(doc));
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load shop options" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const parsed = parseShopOptionsBody(body);
    if (parsed instanceof NextResponse) {
      return parsed;
    }
    const doc = await getOrCreateShopOptions();
    doc.markets = parsed.markets;
    doc.categories = parsed.categories;
    await doc.save();
    return NextResponse.json(toShopOptionsDTO(doc));
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update shop options" },
      { status: 500 }
    );
  }
}
