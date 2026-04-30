"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "@/lib/toast";
import type { QuestionType } from "@/types/survey";

type AnalyticsPayload = {
  surveyId: string;
  title: string;
  totalResponses: number;
  lastSubmittedAt: string | null;
  byQuestion: {
    questionId: string;
    text: string;
    type: QuestionType;
    options: string[];
    counts: Record<string, number>;
    textSamples: string[];
  }[];
};

export function AnalyticsDashboard({ surveyId }: { surveyId: string }) {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch(`/api/surveys/${surveyId}/analytics`);
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error ?? "Failed to load";
        toast.error(msg);
        setErr(msg);
        return;
      }
      setData(json);
    } catch {
      toast.error("Network error");
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 rounded-xl bg-zinc-800" />
        <div className="h-24 rounded-2xl bg-zinc-800/70" />
        <div className="h-48 rounded-2xl bg-zinc-800/50" />
      </div>
    );
  }
  if (err || !data) {
    return (
      <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">
        {err ?? "No data"}
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-hover)]">
            Analytics
          </p>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-white">
            {data.title}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {data.totalResponses} total response
            {data.totalResponses === 1 ? "" : "s"}
            {data.lastSubmittedAt
              ? ` · Last submission ${new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(data.lastSubmittedAt))}`
              : ""}
          </p>
        </header>
        <div className="flex flex-wrap gap-2">
          <Link href={`/surveys/${surveyId}/edit`} className="btn-secondary">
            Edit survey
          </Link>
          <Link href={`/surveys/${surveyId}`} className="btn-primary">
            Open live form
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="surface-card p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Responses
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-white">
            {data.totalResponses}
          </p>
        </div>
        <div className="surface-card p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Questions tracked
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-white">
            {data.byQuestion.length}
          </p>
        </div>
      </div>

      {data.totalResponses === 0 && (
        <div className="surface-card border-dashed p-8 text-center">
          <p className="text-[var(--muted)] leading-relaxed">
            No responses yet. Share the survey link to start collecting answers.
          </p>
          <Link
            href={`/surveys/${surveyId}`}
            className="btn-primary mt-6 inline-flex"
          >
            View shareable form
          </Link>
        </div>
      )}

      <div className="space-y-8">
        {data.byQuestion.map((q) => (
          <section key={q.questionId} className="surface-card p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white">
              {q.text || "Untitled"}
            </h2>
            <p className="mt-2 inline-flex rounded-lg bg-zinc-800/80 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
              {q.type === "text"
                ? "Text"
                : q.type === "single"
                  ? "Single choice"
                  : "Multiple choice"}
            </p>

            {q.type === "text" && (
              <ul className="mt-5 space-y-2 text-sm leading-relaxed text-zinc-300">
                {q.textSamples.length === 0 ? (
                  <li className="rounded-xl border border-dashed border-[var(--border)] py-8 text-center text-[var(--muted)]">
                    No text answers yet.
                  </li>
                ) : (
                  q.textSamples.map((t, i) => (
                    <li
                      key={`${q.questionId}-t-${i}`}
                      className="rounded-xl border border-[var(--border)] bg-zinc-950/50 px-4 py-3"
                    >
                      {t}
                    </li>
                  ))
                )}
              </ul>
            )}

            {(q.type === "single" || q.type === "multiple") && (
              <div className="mt-6 space-y-5">
                {(() => {
                  const entries = Object.entries(q.counts).sort(
                    (a, b) => b[1] - a[1]
                  );
                  const max = Math.max(1, ...entries.map(([, c]) => c));
                  return entries.map(([label, count], idx) => {
                    const pct = data.totalResponses
                      ? Math.round((count / data.totalResponses) * 100)
                      : 0;
                    const barPct = (count / max) * 100;
                    return (
                      <div key={`${q.questionId}-bar-${idx}-${label}`}>
                        <div className="mb-2 flex justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate font-medium text-zinc-200">
                            {label}
                          </span>
                          <span className="shrink-0 tabular-nums text-[var(--muted)]">
                            {count}{" "}
                            <span className="text-zinc-600">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800/90 ring-1 ring-black/20">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-indigo-400 transition-all duration-500 ease-out"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
