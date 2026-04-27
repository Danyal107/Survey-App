"use client";

import { useCallback, useEffect, useState } from "react";
import type { SurveyQuestion } from "@/types/survey";

type SurveyDoc = {
  _id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
};

export function TakeSurveyForm({ surveyId }: { surveyId: string }) {
  const [survey, setSurvey] = useState<SurveyDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [values, setValues] = useState<
    Record<string, string | string[]>
  >({});

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch(`/api/surveys/${surveyId}`);
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Not found");
        return;
      }
      setSurvey({
        _id: data._id,
        title: data.title,
        description: data.description ?? "",
        questions: data.questions ?? [],
      });
      const init: Record<string, string | string[]> = {};
      for (const q of data.questions ?? []) {
        init[q.id] = q.type === "multiple" ? [] : "";
      }
      setValues(init);
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!survey) return;
    setSubmitting(true);
    setErr(null);
    const answers = survey.questions.map((q) => ({
      questionId: q.id,
      value: values[q.id],
    }));
    try {
      const res = await fetch(`/api/surveys/${surveyId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Submit failed");
        return;
      }
      setDone(true);
    } catch {
      setErr("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-[var(--muted)]">Loading survey…</p>;
  if (err && !survey) return <p className="text-red-400">{err}</p>;
  if (!survey) return null;

  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <h1 className="text-xl font-semibold text-white">Thank you</h1>
        <p className="mt-2 text-[var(--muted)]">Your response has been recorded.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">{survey.title}</h1>
        {survey.description ? (
          <p className="mt-2 text-[var(--muted)]">{survey.description}</p>
        ) : null}
      </div>

      {survey.questions.length === 0 ? (
        <p className="text-[var(--muted)]">This survey has no questions yet.</p>
      ) : null}

      <div className="space-y-8">
        {survey.questions.map((q, i) => (
          <fieldset
            key={q.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
          >
            <legend className="px-1 text-sm font-medium text-zinc-400">
              {i + 1}. {q.text || "(Untitled question)"}
              {q.required ? <span className="text-red-400"> *</span> : null}
            </legend>

            {q.type === "text" && (
              <textarea
                required={q.required}
                value={(values[q.id] as string) ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [q.id]: e.target.value }))
                }
                rows={3}
                className="mt-3 w-full rounded-lg border border-[var(--border)] bg-zinc-900 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="Your answer"
              />
            )}

            {q.type === "single" && (
              <ul className="mt-3 space-y-2">
                {q.options.map((opt) => (
                  <li key={opt}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2 py-1 hover:border-[var(--border)]">
                      <input
                        type="radio"
                        name={q.id}
                        required={q.required}
                        value={opt}
                        checked={(values[q.id] as string) === opt}
                        onChange={() =>
                          setValues((v) => ({ ...v, [q.id]: opt }))
                        }
                        className="border-zinc-600 text-[var(--accent)] focus:ring-[var(--accent)]"
                      />
                      <span className="text-zinc-200">{opt}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            {q.type === "multiple" && (
              <ul className="mt-3 space-y-2">
                {q.options.map((opt) => {
                  const selected = ((values[q.id] as string[]) ?? []).includes(
                    opt
                  );
                  return (
                    <li key={opt}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2 py-1 hover:border-[var(--border)]">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            setValues((v) => {
                              const cur = new Set(
                                (v[q.id] as string[]) ?? []
                              );
                              if (cur.has(opt)) cur.delete(opt);
                              else cur.add(opt);
                              return { ...v, [q.id]: [...cur] };
                            });
                          }}
                          className="rounded border-zinc-600 text-[var(--accent)] focus:ring-[var(--accent)]"
                        />
                        <span className="text-zinc-200">{opt}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>
        ))}
      </div>

      {err && (
        <p className="text-sm text-red-400" role="alert">
          {err}
        </p>
      )}

      {survey.questions.length > 0 && (
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[var(--accent)] py-3 font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      )}
    </form>
  );
}
