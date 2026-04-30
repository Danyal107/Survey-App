import Link from "next/link";
import { notFound } from "next/navigation";
import { ShopEditorLauncher } from "@/components/ShopEditorLauncher";
import { ShopReadOnlyProfile } from "@/components/ShopReadOnlyProfile";
import { connectDB } from "@/lib/db";
import { formatDateTimeMedium } from "@/lib/formatDate";
import { shopDisplayName } from "@/lib/shopDisplay";
import { notDeleted } from "@/lib/notDeleted";
import { getOrCreateRespondentFormConfig } from "@/lib/respondentFormStore";
import { Shop, type IShopDetails } from "@/models/Shop";
import { SurveyResponse } from "@/models/Response";
import mongoose from "mongoose";
import type { RespondentFieldDef } from "@/types/respondentForm";

type ShopDetailLean = {
  _id: mongoose.Types.ObjectId;
  details?: unknown;
  coordinates?: unknown;
  createdAt: Date;
};

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

function syncKey(details: unknown, coordinates: unknown): string {
  const d =
    details && typeof details === "object" && !Array.isArray(details)
      ? JSON.stringify(details)
      : "";
  const c = Array.isArray(coordinates)
    ? coordinates.join(",")
    : coordinates == null
      ? ""
      : String(coordinates);
  return `${d}::${c}`;
}

export default async function ShopDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  await connectDB();
  const shop = await Shop.findOne({ _id: id, ...notDeleted })
    .select("details coordinates createdAt")
    .lean<ShopDetailLean | null>();

  if (!shop) {
    notFound();
  }

  const { fields } = await getOrCreateRespondentFormConfig();
  const responseCount = await SurveyResponse.countDocuments({
    shopId: id,
    ...notDeleted,
  });

  const detailsRaw =
    shop.details &&
    typeof shop.details === "object" &&
    !Array.isArray(shop.details)
      ? (shop.details as IShopDetails)
      : {};

  const title = shopDisplayName(detailsRaw);
  const coords =
    Array.isArray(shop.coordinates) &&
    shop.coordinates.length === 2 &&
    typeof shop.coordinates[0] === "number" &&
    typeof shop.coordinates[1] === "number"
      ? ([shop.coordinates[0], shop.coordinates[1]] as [number, number])
      : null;

  const fieldsSer = JSON.parse(
    JSON.stringify(fields)
  ) as RespondentFieldDef[];

  return (
    <div className="space-y-10">
      <nav className="text-sm text-[var(--muted)]">
        <Link href="/shops" className="text-[var(--accent-hover)] hover:underline">
          Shops
        </Link>
        <span className="mx-2 text-zinc-600">/</span>
        <span className="text-zinc-400">{title}</span>
      </nav>

      <header className="space-y-3">
        <h1 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {responseCount}{" "}
          {responseCount === 1 ? "survey response" : "survey responses"} linked
          · Added {formatDateTimeMedium(shop.createdAt)}
        </p>
      </header>

      <ShopReadOnlyProfile
        fields={fieldsSer}
        details={detailsRaw}
        coordinates={coords}
      />

      <ShopEditorLauncher
        shopId={String(shop._id)}
        fields={fieldsSer}
        initialDetails={detailsRaw}
        initialCoordinates={coords}
        panelKey={syncKey(shop.details, shop.coordinates)}
      />
    </div>
  );
}
