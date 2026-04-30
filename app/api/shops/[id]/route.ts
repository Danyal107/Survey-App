import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/adminAuth";
import { connectDB } from "@/lib/db";
import { notDeleted } from "@/lib/notDeleted";
import {
  isLocationValue,
  normalizeShopDetailsAndCoords,
  SHOP_LOCATION_FIELD_ID,
} from "@/lib/shopCoordinates";
import { shopExistsAtCoordinates } from "@/lib/shopExistsAtCoordinates";
import { Shop, type IShop, type IShopDetails } from "@/models/Shop";
import { SurveyResponse } from "@/models/Response";
import type { IRespondentInfo } from "@/models/Response";

type RouteParams = { params: Promise<{ id: string }> };

function isValidObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

function sanitizeDetailsPatch(raw: unknown): IShopDetails {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: IShopDetails = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") out[k] = v;
    else if (Array.isArray(v) && v.every((x) => typeof x === "string"))
      out[k] = v;
  }
  return out;
}

function jsonShop(s: IShop & { _id: mongoose.Types.ObjectId }) {
  return {
    _id: String(s._id),
    details: s.details ?? {},
    coordinates: s.coordinates ?? null,
    createdAt:
      s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
  };
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    await connectDB();
    const shop = await Shop.findOne({ _id: id, ...notDeleted }).lean<
      IShop | null
    >();
    if (!shop) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const responseCount = await SurveyResponse.countDocuments({
      shopId: id,
      ...notDeleted,
    });
    return NextResponse.json({
      ...jsonShop(shop as IShop & { _id: mongoose.Types.ObjectId }),
      responseCount,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load shop" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    await connectDB();
    const shop = await Shop.findOne({ _id: id, ...notDeleted });
    if (!shop) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const prevDetails =
      shop.details &&
      typeof shop.details === "object" &&
      !Array.isArray(shop.details)
        ? (shop.details as IShopDetails)
        : {};

    const patch = sanitizeDetailsPatch(body.details);
    const baseDetails: IShopDetails = { ...prevDetails, ...patch };

    const coordInBody = Object.prototype.hasOwnProperty.call(
      body,
      "coordinates"
    );

    const merged: IRespondentInfo = { ...baseDetails };

    if (!coordInBody) {
      if (
        Array.isArray(shop.coordinates) &&
        shop.coordinates.length === 2 &&
        typeof shop.coordinates[0] === "number" &&
        typeof shop.coordinates[1] === "number"
      ) {
        merged[SHOP_LOCATION_FIELD_ID] = {
          lat: shop.coordinates[0],
          lng: shop.coordinates[1],
        };
      }
    } else if (body.coordinates == null) {
      for (const key of Object.keys(merged)) {
        if (isLocationValue(merged[key])) {
          delete merged[key];
        }
      }
    } else if (
      typeof body.coordinates === "object" &&
      body.coordinates !== null &&
      !Array.isArray(body.coordinates)
    ) {
      const o = body.coordinates as Record<string, unknown>;
      const lat = Number(o.lat);
      const lng = Number(o.lng);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        merged[SHOP_LOCATION_FIELD_ID] = { lat, lng };
      } else {
        return NextResponse.json(
          { error: "coordinates must be { lat, lng } with valid ranges" },
          { status: 400 }
        );
      }
    }

    const normalized = normalizeShopDetailsAndCoords(merged);

    if (normalized.coordinates) {
      const taken = await shopExistsAtCoordinates(
        normalized.coordinates,
        shop._id as mongoose.Types.ObjectId
      );
      if (taken) {
        return NextResponse.json(
          {
            error:
              "Another shop is already registered at this map location. Choose a different pin.",
          },
          { status: 409 }
        );
      }
    }

    shop.details = normalized.details;
    if (normalized.coordinates) {
      shop.coordinates = normalized.coordinates;
    } else {
      shop.set("coordinates", undefined);
    }

    await shop.save();
    return NextResponse.json(
      jsonShop(shop.toObject() as IShop & { _id: mongoose.Types.ObjectId })
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update shop" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await connectDB();
    const shop = await Shop.findOneAndUpdate(
      { _id: id, ...notDeleted },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!shop) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete shop" },
      { status: 500 }
    );
  }
}
