"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QuestionType, SurveyQuestion } from "@/types/survey";

type SurveyDoc = {
  _id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
};

function newQuestion(partial?: Partial<SurveyQuestion>): SurveyQuestion {
  return {
    id: crypto.randomUUID(),
    text: "",
    type: "single",
    options: ["", ""],
    required: true,
    ...partial,
  };
}

export function SurveyBuilder({ surveyId }: { surveyId: string }) {
  const router = useRouter();
  const [survey, setSurvey] = useState<SurveyDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch(`/api/surveys/${surveyId}`);
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to load");
        return;
      }
      setSurvey({
        _id: data._id,
        title: data.title,
        description: data.description ?? "",
        questions: (data.questions ?? []).map((q: SurveyQuestion) => ({
          ...q,
          options: q.options ?? [],
          required: q.required !== false,
        })),
      });
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!survey) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: survey.title,
          description: survey.description,
          questions: survey.questions.map((q) => ({
            ...q,
            options:
              q.type === "text"
                ? []
                : q.options.map((o) => o.trim()).filter(Boolean),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Save failed");
        return;
      }
      setSurvey({
        _id: data._id,
        title: data.title,
        description: data.description ?? "",
        questions: data.questions ?? [],
      });
      setMsg("Saved");
      setTimeout(() => setMsg(null), 2000);
      router.refresh();
    } catch {
      setErr("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function removeSurvey() {
    if (!confirm("Delete this survey and all responses?")) return;
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setErr(data.error ?? "Delete failed");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setErr("Network error");
    }
  }

  if (loading) {
    return <p className="text-[var(--muted)]">Loading…</p>;
  }
  if (err && !survey) {
    return <p className="text-red-400">{err}</p>;
  }
  if (!survey) return null;

  function updateQuestion(index: number, patch: Partial<SurveyQuestion>) {
    setSurvey((s) => {
      if (!s) return s;
      const questions = [...s.questions];
      const cur = { ...questions[index], ...patch };
      if (patch.type === "text") {
        cur.options = [];
      } else if (
        (patch.type === "single" || patch.type === "multiple") &&
        cur.options.length === 0
      ) {
        cur.options = ["", ""];
      }
      questions[index] = cur;
      return { ...s, questions };
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Edit survey</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Public link:{" "}
            <Link
              href={`/surveys/${surveyId}`}
              className="text-[var(--accent)] hover:underline"
            >
              /surveys/{surveyId}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <Link
            href={`/surveys/${surveyId}/results`}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-white"
          >
            Results
          </Link>
          <button
            type="button"
            onClick={removeSurvey}
            className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>
      </div>

      {(err || msg) && (
        <p className={err ? "text-sm text-red-400" : "text-sm text-emerald-400"}>
          {err ?? msg}
        </p>
      )}

      <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300">Title</label>
          <input
            value={survey.title}
            onChange={(e) =>
              setSurvey((s) => (s ? { ...s, title: e.target.value } : s))
            }
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-zinc-900 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300">
            Description
          </label>
          <textarea
            value={survey.description}
            onChange={(e) =>
              setSurvey((s) => (s ? { ...s, description: e.target.value } : s))
            }
            rows={2}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-zinc-900 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Questions</h2>
          <button
            type="button"
            onClick={() =>
              setSurvey((s) =>
                s ? { ...s, questions: [...s.questions, newQuestion()] } : s
              )
            }
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-700"
          >
            Add question
          </button>
        </div>

        {survey.questions.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            No questions yet. Add one to publish a real survey.
          </p>
        )}

        <ul className="space-y-6">
          {survey.questions.map((q, i) => (
            <li
              key={q.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-zinc-500">
                  Question {i + 1}
                </span>
                <select
                  value={q.type}
                  onChange={(e) =>
                    updateQuestion(i, {
                      type: e.target.value as QuestionType,
                    })
                  }
                  className="rounded-md border border-[var(--border)] bg-zinc-900 px-2 py-1 text-sm text-white"
                >
                  <option value="single">Single choice</option>
                  <option value="multiple">Multiple choice</option>
                  <option value="text">Short text</option>
                </select>
                <label className="ml-auto flex items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) =>
                      updateQuestion(i, { required: e.target.checked })
                    }
                    className="rounded border-zinc-600"
                  />
                  Required
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSurvey((s) =>
                      s
                        ? {
                            ...s,
                            questions: s.questions.filter((_, j) => j !== i),
                          }
                        : s
                    )
                  }
                  className="text-sm text-red-400 hover:underline"
                >
                  Remove
                </button>
              </div>
              <input
                value={q.text}
                onChange={(e) => updateQuestion(i, { text: e.target.value })}
                placeholder="Question text"
                className="mb-4 w-full rounded-lg border border-[var(--border)] bg-zinc-900 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />

              {q.type !== "text" && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-500">Answer options</p>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex gap-2">
                      <input
                        value={opt}
                        onChange={(e) => {
                          const options = [...q.options];
                          options[oi] = e.target.value;
                          updateQuestion(i, { options });
                        }}
                        placeholder={`Option ${oi + 1}`}
                        className="flex-1 rounded-lg border border-[var(--border)] bg-zinc-900 px-3 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const options = q.options.filter((_, j) => j !== oi);
                          updateQuestion(i, {
                            options: options.length ? options : [""],
                          });
                        }}
                        className="text-zinc-500 hover:text-red-400"
                        aria-label="Remove option"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateQuestion(i, { options: [...q.options, ""] })
                    }
                    className="text-sm text-[var(--accent)] hover:underline"
                  >
                    + Add option
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
