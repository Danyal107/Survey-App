"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
        setErr(json.error ?? "Failed to load");
        return;
      }
      setData(json);
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-[var(--muted)]">Loading analytics…</p>;
  }
  if (err || !data) {
    return <p className="text-red-400">{err ?? "No data"}</p>;
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{data.title}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {data.totalResponses} total response
            {data.totalResponses === 1 ? "" : "s"}
            {data.lastSubmittedAt
              ? ` · Last submission ${new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(data.lastSubmittedAt))}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/surveys/${surveyId}/edit`}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:text-white"
          >
            Edit survey
          </Link>
          <Link
            href={`/surveys/${surveyId}`}
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700"
          >
            Open live form
          </Link>
        </div>
      </div>

      {data.totalResponses === 0 && (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-[var(--muted)]">
          No responses yet. Share the survey link to start collecting answers.
        </p>
      )}

      <div className="space-y-10">
        {data.byQuestion.map((q) => (
          <section
            key={q.questionId}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"
          >
            <h2 className="font-medium text-white">{q.text || "Untitled"}</h2>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
              {q.type === "text"
                ? "Text"
                : q.type === "single"
                  ? "Single choice"
                  : "Multiple choice"}
            </p>

            {q.type === "text" && (
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                {q.textSamples.length === 0 ? (
                  <li className="text-[var(--muted)]">No text answers yet.</li>
                ) : (
                  q.textSamples.map((t, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-[var(--border)] bg-zinc-900/50 px-3 py-2"
                    >
                      {t}
                    </li>
                  ))
                )}
              </ul>
            )}

            {(q.type === "single" || q.type === "multiple") && (
              <div className="mt-6 space-y-4">
                {(() => {
                  const entries = Object.entries(q.counts).sort(
                    (a, b) => b[1] - a[1]
                  );
                  const max = Math.max(1, ...entries.map(([, c]) => c));
                  return entries.map(([label, count]) => (
                    <div key={label}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-zinc-300">{label}</span>
                        <span className="text-[var(--muted)]">
                          {count}{" "}
                          <span className="text-zinc-600">
                            (
                            {data.totalResponses
                              ? Math.round(
                                  (count / data.totalResponses) * 100
                                )
                              : 0}
                            %)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all"
                          style={{
                            width: `${(count / max) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
