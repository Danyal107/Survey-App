import Link from "next/link";
import { ServerMessageToast } from "@/components/ServerMessageToast";
import { connectDB } from "@/lib/db";
import { formatDateTimeMedium } from "@/lib/formatDate";
import { shopDisplayName } from "@/lib/shopDisplay";
import { notDeleted } from "@/lib/notDeleted";
import { Shop } from "@/models/Shop";

export const dynamic = "force-dynamic";

export default async function ShopsPage() {
  let shops: {
    _id: string;
    title: string;
    subtitle: string;
    hasPin: boolean;
    createdAt: Date;
  }[] = [];
  let error: string | null = null;

  try {
    await connectDB();
    const rows = await Shop.find(notDeleted)
      .sort({ createdAt: -1 })
      .select("details coordinates createdAt")
      .lean();
    shops = rows.map((s) => {
      const details =
        s.details &&
        typeof s.details === "object" &&
        !Array.isArray(s.details)
          ? (s.details as Record<string, string | string[]>)
          : {};
      const market =
        typeof details.market === "string" ? details.market.trim() : "";
      return {
        _id: String(s._id),
        title: shopDisplayName(details),
        subtitle: market || "—",
        hasPin: Array.isArray(s.coordinates) && s.coordinates.length === 2,
        createdAt: s.createdAt,
      };
    });
  } catch {
    error =
      "Could not connect to MongoDB. Add MONGODB_URI to .env.local and ensure the database is running.";
  }

  return (
    <div className="space-y-10">
      <ServerMessageToast message={error} variant="error" />
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-hover)]">
          Directory
        </p>
        <h1 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Shops
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-[var(--muted)]">
          Shops are created when respondents submit surveys. Open a shop to
          view its profile; editing and deletion require an admin session.
        </p>
      </header>

      {!error && shops.length === 0 && (
        <div className="surface-card max-w-lg p-8 text-center">
          <p className="text-[var(--muted)]">No shops yet.</p>
          <p className="mt-2 text-sm text-zinc-500">
            They appear here after the first survey submission that includes shop
            details.
          </p>
          <Link href="/" className="btn-primary mt-6 inline-flex">
            Back to surveys
          </Link>
        </div>
      )}

      <ul className="grid gap-5 sm:grid-cols-2">
        {shops.map((s) => (
          <li key={s._id}>
            <Link
              href={`/shops/${s._id}`}
              className="surface-card-interactive block p-6"
            >
              <h2 className="text-lg font-semibold tracking-tight text-white group-hover:text-indigo-50">
                {s.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Market: <span className="text-zinc-300">{s.subtitle}</span>
              </p>
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={
                      s.hasPin
                        ? "h-1.5 w-1.5 rounded-full bg-emerald-500/90"
                        : "h-1.5 w-1.5 rounded-full bg-zinc-600"
                    }
                    aria-hidden
                  />
                  {s.hasPin ? "Map pin" : "No pin"}
                </span>
                <span className="text-zinc-600" aria-hidden>
                  ·
                </span>
                <span>Added {formatDateTimeMedium(s.createdAt)}</span>
              </p>
              <p className="mt-4 text-sm font-medium text-[var(--accent-hover)]">
                View details →
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
