"use client";

import { useCallback, useEffect, useId, useState } from "react";
import type { SurveyQuestion } from "@/types/survey";

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

  const [values, setValues] = useState<
    Record<string, string | string[]>
  >({});

  const [shopName, setShopName] = useState("");
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
    const slot = shopImageUrls.length;
    setUploadingIndex(slot);
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
    setSubmitting(true);
    setErr(null);
    const answers = survey.questions.map((q) => ({
      questionId: q.id,
      value: values[q.id],
    }));
    const respondentInfo = {
      shopName: shopName.trim(),
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

  const hasQuestions = survey.questions.length > 0;

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">{survey.title}</h1>
        {survey.description ? (
          <p className="mt-2 text-[var(--muted)]">{survey.description}</p>
        ) : null}
      </div>

      {hasQuestions ? (
        <section
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
          aria-labelledby={`${formId}-info-heading`}
        >
          <h2
            id={`${formId}-info-heading`}
            className="text-base font-semibold text-white"
          >
            Your details
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Shop name, your name, WhatsApp number, and up to three shop photos.
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor={`${formId}-shop`}
                className="block text-sm font-medium text-zinc-300"
              >
                Shop name <span className="text-red-400">*</span>
              </label>
              <input
                id={`${formId}-shop`}
                name="shopName"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-zinc-900 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="e.g. Khan General Store"
                maxLength={300}
              />
            </div>
            <div>
              <label
                htmlFor={`${formId}-person`}
                className="block text-sm font-medium text-zinc-300"
              >
                Your name <span className="text-red-400">*</span>
              </label>
              <input
                id={`${formId}-person`}
                name="respondentName"
                required
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-zinc-900 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="Person filling this survey"
                maxLength={300}
              />
            </div>
            <div>
              <label
                htmlFor={`${formId}-wa`}
                className="block text-sm font-medium text-zinc-300"
              >
                WhatsApp number <span className="text-red-400">*</span>
              </label>
              <input
                id={`${formId}-wa`}
                name="whatsappContact"
                type="tel"
                required
                value={whatsappContact}
                onChange={(e) => setWhatsappContact(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-zinc-900 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="+92 300 1234567"
                maxLength={40}
              />
            </div>
            <div>
              <span className="block text-sm font-medium text-zinc-300">
                Shop images (optional, up to 3)
              </span>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Take a new photo (opens the camera on phones) or pick from your
                gallery. JPEG, PNG, WebP, or GIF — max 5 MB each.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {shopImageUrls.map((url) => (
                  <div
                    key={url}
                    className="relative h-20 w-20 overflow-hidden rounded-lg border border-[var(--border)] bg-zinc-900"
                  >
                    <img
                      src={url}
                      alt="Shop"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeShopImage(url)}
                      className="absolute right-0.5 top-0.5 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white hover:bg-black"
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {shopImageUrls.length < 3 ? (
                  uploadingIndex !== null ? (
                    <p className="text-sm text-[var(--muted)]">Uploading…</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-600 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-300 hover:border-[var(--accent)] hover:text-white">
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
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-600 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-300 hover:border-[var(--accent)] hover:text-white">
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
        <p className="text-[var(--muted)]">This survey has no questions yet.</p>
      ) : null}

      <div className="space-y-8">
        {survey.questions.map((q, i) => {
          const headingId = `${formId}-q-${q.id}`;
          return (
            <section
              key={q.id}
              role="group"
              aria-labelledby={headingId}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
            >
              <h2
                id={headingId}
                className="text-base font-medium leading-snug text-white"
              >
                <span className="text-zinc-400">{i + 1}.</span>{" "}
                {q.text || "(Untitled question)"}
                {q.required ? (
                  <span className="text-red-400" aria-hidden="true">
                    {" "}
                    *
                  </span>
                ) : null}
              </h2>

              <div className="mt-4">
                {q.type === "text" && (
                  <textarea
                    required={q.required}
                    value={(values[q.id] as string) ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [q.id]: e.target.value }))
                    }
                    rows={3}
                    className="w-full rounded-lg border border-[var(--border)] bg-zinc-900 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="Your answer"
                    aria-labelledby={headingId}
                  />
                )}

                {q.type === "single" && (
                  <ul className="space-y-1" role="radiogroup" aria-labelledby={headingId}>
                    {q.options.map((opt) => (
                      <li key={opt}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg py-2 pl-0 pr-2 hover:bg-zinc-800/60">
                          <input
                            type="radio"
                            name={q.id}
                            required={q.required}
                            value={opt}
                            checked={(values[q.id] as string) === opt}
                            onChange={() =>
                              setValues((v) => ({ ...v, [q.id]: opt }))
                            }
                            className="shrink-0 border-zinc-600 text-[var(--accent)] focus:ring-[var(--accent)]"
                          />
                          <span className="text-zinc-200">{opt}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}

                {q.type === "multiple" && (
                  <ul className="space-y-1" aria-labelledby={headingId}>
                    {q.options.map((opt) => {
                      const selected = ((values[q.id] as string[]) ?? []).includes(
                        opt
                      );
                      return (
                        <li key={opt}>
                          <label className="flex cursor-pointer items-center gap-3 rounded-lg py-2 pl-0 pr-2 hover:bg-zinc-800/60">
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
                              className="shrink-0 rounded border-zinc-600 text-[var(--accent)] focus:ring-[var(--accent)]"
                            />
                            <span className="text-zinc-200">{opt}</span>
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
        <p className="text-sm text-red-400" role="alert">
          {err}
        </p>
      )}

      {hasQuestions && (
        <button
          type="submit"
          disabled={submitting || uploadingIndex !== null}
          className="w-full rounded-lg bg-[var(--accent)] py-3 font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      )}
    </form>
  );
}
