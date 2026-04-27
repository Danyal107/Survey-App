import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Survey } from "@/models/Survey";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let surveys: { _id: string; title: string; description: string; updatedAt: Date }[] =
    [];
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Your surveys
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Build forms, share the link, and explore response analytics.
        </p>
      </div>

      {error && (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          role="alert"
        >
          {error}
        </div>
      )}

      {!error && surveys.length === 0 && (
        <p className="text-[var(--muted)]">
          No surveys yet.{" "}
          <Link href="/surveys/new" className="text-[var(--accent)] hover:underline">
            Create your first one
          </Link>
          .
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {surveys.map((s) => (
          <li
            key={s._id}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-lg transition hover:border-zinc-600"
          >
            <h2 className="font-medium text-white">{s.title}</h2>
            {s.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                {s.description}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-zinc-500">
              Updated{" "}
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(s.updatedAt))}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/surveys/${s._id}/edit`}
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-700"
              >
                Edit
              </Link>
              <Link
                href={`/surveys/${s._id}`}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:text-white"
              >
                Take
              </Link>
              <Link
                href={`/surveys/${s._id}/results`}
                className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
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
