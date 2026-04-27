"use client";

import { useCallback, useEffect, useId, useState } from "react";
import type { SurveyQuestion } from "@/types/survey";
import { SHOP_MARKETS } from "@/lib/shopMarkets";
import {
  SHOP_CATEGORIES,
  categoryNeedsGenderSegment,
} from "@/lib/shopCategories";

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

  const [shopName, setShopName] = useState("");
  const [shopCategory, setShopCategory] = useState("");
  const [shopAudience, setShopAudience] = useState<
    "" | "male" | "female" | "both"
  >("");
  const [market, setMarket] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [whatsappContact, setWhatsappContact] = useState("");
  const [shopImageUrls, setShopImageUrls] = useState<string[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

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

  async function uploadShopImage(file: File) {
    if (shopImageUrls.length >= 3) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload/shop-image", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Upload failed");
    }
    if (typeof data.url !== "string") {
      throw new Error("Invalid upload response");
    }
    setShopImageUrls((prev) => [...prev, data.url].slice(0, 3));
  }

  async function onShopImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || shopImageUrls.length >= 3) return;
    setUploadingIndex(shopImageUrls.length);
    setErr(null);
    try {
      await uploadShopImage(file);
    } catch (c) {
      setErr(c instanceof Error ? c.message : "Upload failed");
    } finally {
      setUploadingIndex(null);
    }
  }

  function removeShopImage(url: string) {
    setShopImageUrls((prev) => prev.filter((u) => u !== url));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!survey) return;
    if (categoryNeedsGenderSegment(shopCategory) && !shopAudience) {
      setErr(
        "Please select who the shop mainly serves: male, female, or both."
      );
      return;
    }
    setSubmitting(true);
    setErr(null);
    const answers = survey.questions.map((q) => ({
      questionId: q.id,
      value: values[q.id],
    }));
    const respondentInfo = {
      shopName: shopName.trim(),
      shopCategory,
      market,
      ...(categoryNeedsGenderSegment(shopCategory) && shopAudience
        ? { shopAudience }
        : {}),
      respondentName: respondentName.trim(),
      whatsappContact: whatsappContact.trim(),
      shopImageUrls,
    };
    try {
      const res = await fetch(`/api/surveys/${surveyId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respondentInfo, answers }),
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
  if (!survey) return null;

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
        <section
          className="surface-card p-6 sm:p-8"
          aria-labelledby={`${formId}-info-heading`}
        >
          <div className="flex items-start gap-3 border-b border-[var(--border)]/80 pb-5">
            <span
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent-hover)] ring-1 ring-indigo-500/15"
              aria-hidden
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
            <div>
              <h2
                id={`${formId}-info-heading`}
                className="text-lg font-semibold text-white"
              >
                Your details
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                Shop name, category, market, your name, WhatsApp, and up to three
                shop photos (optional).
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor={`${formId}-shop`} className="label-field">
                Shop name <span className="text-red-400">*</span>
              </label>
              <input
                id={`${formId}-shop`}
                name="shopName"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="input-field mt-2"
                placeholder="e.g. Khan General Store"
                maxLength={300}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor={`${formId}-category`} className="label-field">
                Shop category <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  id={`${formId}-category`}
                  name="shopCategory"
                  required
                  value={shopCategory}
                  onChange={(e) => {
                    const v = e.target.value;
                    setShopCategory(v);
                    if (!categoryNeedsGenderSegment(v)) setShopAudience("");
                  }}
                  className={`input-select ${shopCategory === "" ? "text-zinc-500" : "text-zinc-100"}`}
                  aria-describedby={`${formId}-category-hint`}
                >
                  <option value="" disabled>
                    Select category…
                  </option>
                  {SHOP_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <p
                id={`${formId}-category-hint`}
                className="text-xs leading-relaxed text-[var(--muted)]"
              >
                What does this shop mainly sell?
              </p>
              {categoryNeedsGenderSegment(shopCategory) ? (
                <div
                  className="mt-4 space-y-3 rounded-xl border border-[var(--border)] bg-zinc-950/50 p-4"
                  role="group"
                  aria-labelledby={`${formId}-audience-label`}
                >
                  <p id={`${formId}-audience-label`} className="label-field">
                    Who does this shop mainly serve?{" "}
                    <span className="text-red-400">*</span>
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Tick one: male, female, or both.
                  </p>
                  <ul className="space-y-2">
                    {(
                      [
                        { id: "male" as const, label: "Male" },
                        { id: "female" as const, label: "Female" },
                        { id: "both" as const, label: "Both" },
                      ] as const
                    ).map(({ id, label }) => (
                      <li key={id}>
                        <label
                          className={`${optionBase} ${shopAudience === id ? optionActive : optionIdle}`}
                        >
                          <input
                            type="checkbox"
                            checked={shopAudience === id}
                            onChange={(e) => {
                              if (e.target.checked) setShopAudience(id);
                              else if (shopAudience === id) setShopAudience("");
                            }}
                            className="h-4 w-4 shrink-0 rounded border-zinc-600 text-[var(--accent)] focus:ring-[var(--ring)]"
                          />
                          <span className="text-[15px] text-zinc-200">
                            {label}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor={`${formId}-market`} className="label-field">
                Market <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  id={`${formId}-market`}
                  name="market"
                  required
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  className={`input-select ${market === "" ? "text-zinc-500" : "text-zinc-100"}`}
                  aria-describedby={`${formId}-market-hint`}
                >
                  <option value="" disabled>
                    Select market…
                  </option>
                  {SHOP_MARKETS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <p
                id={`${formId}-market-hint`}
                className="text-xs leading-relaxed text-[var(--muted)]"
              >
                Flag which market this shop belongs to.
              </p>
            </div>
            <div>
              <label htmlFor={`${formId}-person`} className="label-field">
                Your name <span className="text-red-400">*</span>
              </label>
              <input
                id={`${formId}-person`}
                name="respondentName"
                required
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                className="input-field mt-2"
                placeholder="Person filling this survey"
                maxLength={300}
              />
            </div>
            <div>
              <label htmlFor={`${formId}-wa`} className="label-field">
                WhatsApp number <span className="text-red-400">*</span>
              </label>
              <input
                id={`${formId}-wa`}
                name="whatsappContact"
                type="tel"
                required
                value={whatsappContact}
                onChange={(e) => setWhatsappContact(e.target.value)}
                className="input-field mt-2"
                placeholder="+92 300 1234567"
                maxLength={40}
              />
            </div>
            <div>
              <span className="label-field">
                Shop images{" "}
                <span className="font-normal text-zinc-500">(optional, max 3)</span>
              </span>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                Use your camera on mobile, or pick from your gallery. JPEG,
                PNG, WebP, or GIF — up to 5 MB each.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {shopImageUrls.map((url) => (
                  <div
                    key={url}
                    className="relative h-24 w-24 overflow-hidden rounded-xl border border-[var(--border)] bg-zinc-900 shadow-inner"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Shop preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeShopImage(url)}
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-lg bg-black/75 text-sm text-white backdrop-blur-sm transition hover:bg-red-500/90"
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {shopImageUrls.length < 3 ? (
                  uploadingIndex !== null ? (
                    <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-[var(--accent)]" />
                      Uploading…
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <label className="btn-secondary cursor-pointer border-dashed py-2.5 text-xs sm:text-sm">
                        Take photo
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="sr-only"
                          onChange={onShopImageChange}
                          aria-label="Take a photo with the camera"
                        />
                      </label>
                      <label className="btn-secondary cursor-pointer border-dashed py-2.5 text-xs sm:text-sm">
                        Gallery
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="sr-only"
                          onChange={onShopImageChange}
                          aria-label="Choose an image from your device"
                        />
                      </label>
                    </div>
                  )
                ) : null}
              </div>
            </div>
          </div>
        </section>
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
          disabled={submitting || uploadingIndex !== null}
          className="btn-primary w-full py-3.5 text-base"
        >
          {submitting ? "Submitting…" : "Submit responses"}
        </button>
      )}
    </form>
  );
}
