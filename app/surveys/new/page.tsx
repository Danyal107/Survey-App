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
      <div>
        <h1 className="text-2xl font-semibold text-white">New survey</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Name it, then add questions on the next screen.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-zinc-300">
            Title
          </label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-zinc-900 px-3 py-2 text-white outline-none ring-[var(--accent)] focus:ring-2"
            placeholder="Customer satisfaction Q2"
          />
        </div>
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-zinc-300"
          >
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-zinc-900 px-3 py-2 text-white outline-none ring-[var(--accent)] focus:ring-2"
            placeholder="Short intro shown at the top of the survey"
          />
        </div>

        {err && (
          <p className="text-sm text-red-400" role="alert">
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--accent)] py-2.5 font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {loading ? "Creating…" : "Continue to builder"}
        </button>
      </form>
    </div>
  );
}
