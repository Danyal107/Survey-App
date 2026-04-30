"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"checking" | "locked" | "unlocked">(
    "checking"
  );
  const [configError, setConfigError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const checkSession = useCallback(async () => {
    const res = await fetch("/api/auth/session", { credentials: "include" });
    if (res.status === 503) {
      const j = await res.json().catch(() => ({}));
      const msg =
        typeof j.error === "string"
          ? j.error
          : "Admin password is not configured on the server.";
      setConfigError(msg);
      toast.error(msg);
      return "locked" as const;
    }
    if (res.ok) return "unlocked" as const;
    return "locked" as const;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await checkSession();
      if (!cancelled) setPhase(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [checkSession]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    setUnlocking(true);
    try {
      const res = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Server is not configured.";
        setConfigError(msg);
        toast.error(msg);
        return;
      }
      if (!res.ok) {
        const msg =
          typeof data.error === "string" ? data.error : "Invalid password.";
        setFormErr(msg);
        toast.error(msg);
        return;
      }
      setPassword("");
      setPhase("unlocked");
      toast.success("Unlocked — you can manage surveys for this session.");
    } catch {
      const msg = "Network error";
      setFormErr(msg);
      toast.error(msg);
    } finally {
      setUnlocking(false);
    }
  }

  if (phase === "checking") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-600 border-t-[var(--accent)]"
          aria-label="Checking access"
        />
      </div>
    );
  }

  if (phase === "locked") {
    return (
      <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
        <div
          className="surface-card w-full max-w-md space-y-5 p-6 sm:p-8 shadow-2xl shadow-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-gate-title"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-hover)]">
              Protected
            </p>
            <h2
              id="admin-gate-title"
              className="mt-2 text-xl font-bold tracking-tight text-white"
            >
              Admin password required
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Creating surveys, editing surveys, deleting surveys, managing
              shops, and changing the respondent form all require the password
              set in{" "}
              <code className="rounded bg-zinc-800 px-1">ADMIN_PASSWORD</code>{" "}
              on the server. Taking a survey and viewing results stay open.
            </p>
          </div>

          {configError ? (
            <p
              className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
              role="alert"
            >
              {configError}
            </p>
          ) : (
            <form onSubmit={unlock} className="space-y-4">
              <div>
                <label htmlFor="admin-gate-password" className="label-field">
                  Password
                </label>
                <input
                  id="admin-gate-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field mt-2"
                  required
                  minLength={1}
                />
              </div>
              {formErr ? (
                <p
                  className="text-sm text-red-300"
                  role="alert"
                >
                  {formErr}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={unlocking}
                className="btn-primary w-full py-3"
              >
                {unlocking ? "Checking…" : "Unlock"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
