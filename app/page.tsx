import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Survey } from "@/models/Survey";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let surveys: {
    _id: string;
    title: string;
    description: string;
    updatedAt: Date;
  }[] = [];
  let error: string | null = null;

  try {
    await connectDB();
    const rows = await Survey.find()
      .sort({ updatedAt: -1 })
      .select("title description updatedAt")
      .lean();
    surveys = rows.map((s) => ({
      _id: String(s._id),
      title: s.title,
      description: s.description,
      updatedAt: s.updatedAt,
    }));
  } catch {
    error =
      "Could not connect to MongoDB. Add MONGODB_URI to .env.local and ensure the database is running.";
  }

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-hover)]">
          Dashboard
        </p>
        <h1 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Your surveys
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-[var(--muted)]">
          Build forms, share a single link, and review answers with per-question
          analytics—all in one place.
        </p>
      </header>

      {error && (
        <div
          className="rounded-2xl border border-amber-500/35 bg-amber-500/[0.08] px-5 py-4 text-sm leading-relaxed text-amber-100 shadow-sm shadow-amber-950/20"
          role="alert"
        >
          {error}
        </div>
      )}

      {!error && surveys.length === 0 && (
        <div className="surface-card max-w-lg p-8 text-center">
          <p className="text-[var(--muted)]">No surveys yet.</p>
          <Link
            href="/surveys/new"
            className="btn-primary mt-6 w-full sm:w-auto"
          >
            Create your first survey
          </Link>
        </div>
      )}

      <ul className="grid gap-5 sm:grid-cols-2">
        {surveys.map((s) => (
          <li key={s._id} className="surface-card-interactive group p-6">
            <h2 className="text-lg font-semibold tracking-tight text-white group-hover:text-indigo-50">
              {s.title}
            </h2>
            {s.description ? (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">
                {s.description}
              </p>
            ) : (
              <p className="mt-2 text-sm italic text-zinc-600">No description</p>
            )}
            <p className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-600"
                aria-hidden
              />
              Updated{" "}
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(s.updatedAt))}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)]/60 pt-5">
              <Link
                href={`/surveys/${s._id}/edit`}
                className="btn-secondary py-2 text-xs sm:text-sm"
              >
                Edit
              </Link>
              <Link
                href={`/surveys/${s._id}`}
                className="btn-ghost border border-transparent py-2 text-xs ring-1 ring-[var(--border)] hover:bg-zinc-800/80 sm:text-sm"
              >
                Take survey
              </Link>
              <Link
                href={`/surveys/${s._id}/results`}
                className="btn-primary py-2 text-xs sm:text-sm"
              >
                Results
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
