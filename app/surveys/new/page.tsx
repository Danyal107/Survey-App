"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewSurveyPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, questions: [] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to create");
        return;
      }
      router.push(`/surveys/${data._id}/edit`);
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-hover)]">
          Create
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          New survey
        </h1>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Give it a name and optional intro—you&apos;ll add questions on the
          next screen.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="surface-card space-y-5 p-6 sm:p-8"
      >
        <div>
          <label htmlFor="title" className="label-field">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field mt-2"
            placeholder="e.g. Retailer feedback — April"
          />
        </div>
        <div>
          <label htmlFor="description" className="label-field">
            Description{" "}
            <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input-field mt-2 min-h-[5.5rem] resize-y"
            placeholder="Short text shown at the top of the live survey"
          />
        </div>

        {err && (
          <p
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
            role="alert"
          >
            {err}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating…" : "Continue to builder"}
        </button>
      </form>
    </div>
  );
}
