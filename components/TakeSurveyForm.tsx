"use client";

import { useCallback, useEffect, useId, useState } from "react";
import type { SurveyQuestion } from "@/types/survey";
import type {
  RespondentFormDTO,
  RespondentLocationValue,
} from "@/types/respondentForm";
import { isLocationValue } from "@/lib/shopCoordinates";
import { MAX_SHOP_IMAGES_PER_RESPONSE } from "@/lib/shopImageUrls";
import { RespondentFormSection } from "@/components/RespondentFormSection";

type SurveyDoc = {
  _id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
};

export function TakeSurveyForm({ surveyId }: { surveyId: string }) {
  const formId = useId();
  const [survey, setSurvey] = useState<SurveyDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [respondentForm, setRespondentForm] =
    useState<RespondentFormDTO | null>(null);
  const [respondentValues, setRespondentValues] = useState<
    Record<
      string,
      string | string[] | RespondentLocationValue | undefined
    >
  >({});
  const [respondentUploading, setRespondentUploading] = useState(false);

  const onRespondentFieldChange = useCallback(
    (
      id: string,
      value: string | string[] | RespondentLocationValue | undefined
    ) => {
      setErr(null);
      setRespondentValues((prev) => ({ ...prev, [id]: value }));
    },
    []
  );

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [surveyRes, formRes] = await Promise.all([
        fetch(`/api/surveys/${surveyId}`),
        fetch("/api/respondent-form"),
      ]);
      const surveyData = await surveyRes.json();
      const formData = await formRes.json();

      if (!surveyRes.ok) {
        setErr(surveyData.error ?? "Not found");
        return;
      }
      if (!formRes.ok) {
        setErr(formData.error ?? "Failed to load respondent form");
        return;
      }

      const form = formData as RespondentFormDTO;

      if (!Array.isArray(form.fields) || form.fields.length === 0) {
        setErr("Respondent form has no fields configured.");
        return;
      }

      setRespondentForm(form);
      setSurvey({
        _id: surveyData._id,
        title: surveyData.title,
        description: surveyData.description ?? "",
        questions: surveyData.questions ?? [],
      });
      const init: Record<string, string | string[]> = {};
      for (const q of surveyData.questions ?? []) {
        init[q.id] = q.type === "multiple" ? [] : "";
      }
      setValues(init);

      const rInit: Record<
        string,
        string | string[] | RespondentLocationValue | undefined
      > = {};
      for (const f of form.fields) {
        if (f.kind === "photo" || f.kind === "multiple") rInit[f.id] = [];
        else if (f.kind === "location") {
          /* pin set on map */
        } else rInit[f.id] = "";
      }
      setRespondentValues(rInit);
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    load();
  }, [load]);

  function validateRespondentBeforeSubmit(): string | null {
    if (!respondentForm) return "Form not ready.";
    for (const f of respondentForm.fields) {
      if (f.kind === "photo") {
        const urls = respondentValues[f.id];
        const maxF = f.maxFiles ?? MAX_SHOP_IMAGES_PER_RESPONSE;
        if (Array.isArray(urls) && urls.length > maxF) {
          return `You can attach at most ${maxF} images for “${f.label}”. Remove some to continue.`;
        }
        if (f.required && (!Array.isArray(urls) || urls.length === 0)) {
          return `“${f.label}” requires at least one photo.`;
        }
      }
      if (f.kind === "multiple" && f.required) {
        const arr = respondentValues[f.id];
        if (!Array.isArray(arr) || arr.length === 0) {
          return `Please select at least one option for “${f.label}”.`;
        }
      }
      if (f.kind === "single" && f.required) {
        const s = (respondentValues[f.id] as string) ?? "";
        if (!s) {
          return `Please choose an option for “${f.label}”.`;
        }
      }
      if (f.kind === "text" && f.required) {
        const s = (respondentValues[f.id] as string) ?? "";
        if (!s.trim()) {
          return `“${f.label}” is required.`;
        }
      }
      if (f.kind === "location" && f.required) {
        const loc = respondentValues[f.id];
        if (!isLocationValue(loc)) {
          return `Please set a map pin for “${f.label}”.`;
        }
      }
    }
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!survey || !respondentForm) return;

    const vErr = validateRespondentBeforeSubmit();
    if (vErr) {
      setErr(vErr);
      return;
    }

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
        body: JSON.stringify({
          respondentInfo: respondentValues,
          answers,
        }),
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

  if (loading) {
    return (
      <div className="mx-auto max-w-xl space-y-6 animate-pulse">
        <div className="h-10 w-3/4 max-w-md rounded-xl bg-zinc-800" />
        <div className="h-24 rounded-2xl bg-zinc-800/80" />
        <div className="h-48 rounded-2xl bg-zinc-800/60" />
        <div className="h-32 rounded-2xl bg-zinc-800/50" />
      </div>
    );
  }
  if (err && !survey) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-6 text-center text-red-200">
        {err}
      </div>
    );
  }
  if (!survey || !respondentForm) return null;

  if (done) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="surface-card border-emerald-500/25 bg-gradient-to-b from-emerald-500/10 to-transparent px-8 py-10 shadow-lg shadow-emerald-950/20">
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl ring-1 ring-emerald-400/30"
            aria-hidden
          >
            ✓
          </div>
          <h1 className="text-2xl font-bold text-white">Thank you</h1>
          <p className="mt-3 text-[var(--muted)] leading-relaxed">
            Your response has been recorded. You can close this page.
          </p>
        </div>
      </div>
    );
  }

  const hasQuestions = survey.questions.length > 0;

  const optionBase =
    "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition duration-150";
  const optionIdle =
    "border-[var(--border)] bg-zinc-950/50 hover:border-zinc-600 hover:bg-zinc-900/60";
  const optionActive =
    "border-[var(--accent)]/45 bg-[var(--accent-muted)] ring-1 ring-indigo-500/20";

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-8 pb-8">
      <header className="surface-card overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-hover)]">
          Survey
        </p>
        <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {survey.title}
        </h1>
        {survey.description ? (
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
            {survey.description}
          </p>
        ) : null}
      </header>

      {hasQuestions ? (
        <RespondentFormSection
          formId={formId}
          title={respondentForm.sectionTitle}
          description={respondentForm.sectionDescription}
          fields={respondentForm.fields}
          values={respondentValues}
          onFieldChange={onRespondentFieldChange}
          onImageUploadingChange={setRespondentUploading}
          onClientError={setErr}
        />
      ) : null}

      {!hasQuestions ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] bg-zinc-900/30 px-4 py-6 text-center text-[var(--muted)]">
          This survey has no questions yet.
        </p>
      ) : null}

      <div className="space-y-5">
        {survey.questions.map((q, i) => {
          const headingId = `${formId}-q-${q.id}`;
          return (
            <section
              key={q.id}
              role="group"
              aria-labelledby={headingId}
              className="surface-card p-6 sm:p-8"
            >
              <h2
                id={headingId}
                className="text-balance text-lg font-semibold leading-snug text-white"
              >
                <span className="mr-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold text-zinc-400">
                  {i + 1}
                </span>
                {q.text || "(Untitled question)"}
                {q.required ? (
                  <span className="text-red-400" aria-hidden="true">
                    {" "}
                    *
                  </span>
                ) : null}
              </h2>

              <div className="mt-5">
                {q.type === "text" && (
                  <textarea
                    required={q.required}
                    value={(values[q.id] as string) ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [q.id]: e.target.value }))
                    }
                    rows={4}
                    className="input-field min-h-[6.5rem] resize-y"
                    placeholder="Type your answer here…"
                    aria-labelledby={headingId}
                  />
                )}

                {q.type === "single" && (
                  <ul
                    className="space-y-2"
                    role="radiogroup"
                    aria-labelledby={headingId}
                  >
                    {q.options.map((opt, optIndex) => {
                      const checked = (values[q.id] as string) === opt;
                      return (
                        <li key={`${q.id}-single-${optIndex}`}>
                          <label
                            className={`${optionBase} ${checked ? optionActive : optionIdle}`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              required={q.required}
                              value={opt}
                              checked={checked}
                              onChange={() =>
                                setValues((v) => ({ ...v, [q.id]: opt }))
                              }
                              className="shrink-0 border-zinc-600 text-[var(--accent)] focus:ring-[var(--ring)]"
                            />
                            <span className="text-[15px] text-zinc-200">
                              {opt}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {q.type === "multiple" && (
                  <ul className="space-y-2" aria-labelledby={headingId}>
                    {q.options.map((opt, optIndex) => {
                      const selected = (
                        (values[q.id] as string[]) ?? []
                      ).includes(opt);
                      return (
                        <li key={`${q.id}-multi-${optIndex}`}>
                          <label
                            className={`${optionBase} ${selected ? optionActive : optionIdle}`}
                          >
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
                              className="shrink-0 rounded border-zinc-600 text-[var(--accent)] focus:ring-[var(--ring)]"
                            />
                            <span className="text-[15px] text-zinc-200">
                              {opt}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {err && (
        <p
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {err}
        </p>
      )}

      {hasQuestions && (
        <button
          type="submit"
          disabled={submitting || respondentUploading}
          className="btn-primary w-full py-3.5 text-base"
        >
          {submitting ? "Submitting…" : "Submit responses"}
        </button>
      )}
    </form>
  );
}
