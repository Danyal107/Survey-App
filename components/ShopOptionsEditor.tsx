"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type CategoryRow = { label: string; requiresAudience: boolean };

type ShopOptionsPayload = {
  markets: string[];
  categories: CategoryRow[];
  updatedAt: string | null;
};

export function ShopOptionsEditor() {
  const [markets, setMarkets] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [newMarket, setNewMarket] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch("/api/shop-options");
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to load");
        return;
      }
      const payload = data as ShopOptionsPayload;
      setMarkets([...payload.markets]);
      setCategories(
        payload.categories.map((c) => ({
          label: c.label,
          requiresAudience: Boolean(c.requiresAudience),
        }))
      );
      setUpdatedAt(payload.updatedAt);
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function addMarket() {
    const t = newMarket.trim();
    if (!t) return;
    if (markets.includes(t)) {
      setNewMarket("");
      return;
    }
    setMarkets((m) => [...m, t]);
    setNewMarket("");
  }

  function removeMarket(index: number) {
    setMarkets((m) => m.filter((_, i) => i !== index));
  }

  function addCategory() {
    setCategories((c) => [...c, { label: "", requiresAudience: false }]);
  }

  function updateCategory(index: number, patch: Partial<CategoryRow>) {
    setCategories((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function removeCategory(index: number) {
    setCategories((c) => c.filter((_, i) => i !== index));
  }

  async function save() {
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/shop-options", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markets, categories }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Save failed");
        return;
      }
      const payload = data as ShopOptionsPayload;
      setMarkets([...payload.markets]);
      setCategories(
        payload.categories.map((c) => ({
          label: c.label,
          requiresAudience: Boolean(c.requiresAudience),
        }))
      );
      setUpdatedAt(payload.updatedAt);
      setMsg("Saved");
      setTimeout(() => setMsg(null), 2000);
    } catch {
      setErr("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 animate-pulse">
        <div className="h-10 w-2/3 rounded-xl bg-zinc-800" />
        <div className="h-40 rounded-2xl bg-zinc-800/80" />
        <div className="h-40 rounded-2xl bg-zinc-800/60" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-hover)]">
            Settings
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Shop markets &amp; categories
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            These lists power the respondent &ldquo;Your details&rdquo; section on
            every survey. Changes apply immediately for new submissions.
          </p>
          {updatedAt ? (
            <p className="mt-2 text-xs text-zinc-500">
              Last updated {new Date(updatedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
        <Link
          href="/"
          className="btn-secondary shrink-0 text-sm"
        >
          Back to surveys
        </Link>
      </div>

      <section className="surface-card p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white">Markets</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Respondents pick one market per response.
        </p>
        <ul className="mt-4 space-y-2">
          {markets.map((m, i) => (
            <li
              key={`${m}-${i}`}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-zinc-950/50 px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-[15px] text-zinc-200">
                {m}
              </span>
              <button
                type="button"
                onClick={() => removeMarket(i)}
                className="shrink-0 rounded-lg px-2 py-1 text-sm text-red-300 transition hover:bg-red-500/15"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={newMarket}
            onChange={(e) => setNewMarket(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addMarket();
              }
            }}
            className="input-field min-w-[12rem] flex-1"
            placeholder="New market name"
            maxLength={300}
            aria-label="New market name"
          />
          <button type="button" onClick={addMarket} className="btn-secondary">
            Add market
          </button>
        </div>
      </section>

      <section className="surface-card p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white">Categories</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Optionally require &ldquo;who does this shop mainly serve&rdquo; (male /
          female / both) for a category.
        </p>
        <ul className="mt-4 space-y-3">
          {categories.map((row, i) => (
            <li
              key={i}
              className="rounded-xl border border-[var(--border)] bg-zinc-950/50 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="label-field">Label</label>
                  <input
                    value={row.label}
                    onChange={(e) =>
                      updateCategory(i, { label: e.target.value })
                    }
                    className="input-field mt-2"
                    placeholder="e.g. Garments"
                    maxLength={300}
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-zinc-300 sm:shrink-0">
                  <input
                    type="checkbox"
                    checked={row.requiresAudience}
                    onChange={(e) =>
                      updateCategory(i, { requiresAudience: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-zinc-600 text-[var(--accent)]"
                  />
                  Requires audience segment
                </label>
                <button
                  type="button"
                  onClick={() => removeCategory(i)}
                  className="rounded-lg px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/15 sm:shrink-0"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addCategory}
          className="btn-secondary mt-4"
        >
          Add category
        </button>
      </section>

      {err ? (
        <p
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {msg}
        </p>
      ) : null}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="btn-primary w-full py-3.5 text-base sm:w-auto sm:px-10"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
