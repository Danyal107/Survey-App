"use client";

import { useEffect, useState } from "react";
import { dismiss, subscribeToasts, type ToastItem } from "@/lib/toast";

const styles: Record<
  ToastItem["variant"],
  { bar: string; text: string; ring: string }
> = {
  error: {
    bar: "bg-red-500/90",
    text: "text-red-50",
    ring: "ring-red-400/30",
  },
  info: {
    bar: "bg-zinc-600/90",
    text: "text-zinc-50",
    ring: "ring-zinc-400/25",
  },
  success: {
    bar: "bg-emerald-600/90",
    text: "text-emerald-50",
    ring: "ring-emerald-400/35",
  },
};

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setList), []);

  return (
    <div
      className="pointer-events-none fixed bottom-0 right-0 z-[200] flex max-h-[min(100vh,28rem)] w-full flex-col-reverse gap-2 overflow-y-auto p-4 sm:max-w-md sm:p-6"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {list.map((t) => {
        const s = styles[t.variant];
        return (
          <div
            key={t.id}
            role={t.variant === "error" ? "alert" : "status"}
            className="pointer-events-auto flex animate-toast-in items-stretch overflow-hidden rounded-xl shadow-lg shadow-black/40 ring-1 ring-black/20"
          >
            <div className={`w-1 shrink-0 ${s.bar}`} aria-hidden />
            <div
              className={`flex min-w-0 flex-1 items-start gap-3 bg-[var(--card)] px-3.5 py-3 ring-1 ${s.ring} backdrop-blur-sm`}
            >
              <p className={`min-w-0 flex-1 text-sm font-medium leading-snug ${s.text}`}>
                {t.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-lg px-1.5 py-0.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
