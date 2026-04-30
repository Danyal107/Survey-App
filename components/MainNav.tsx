"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function navItemClass(active: boolean) {
  return [
    "rounded-lg px-2 py-2 text-sm font-medium transition-colors sm:px-3",
    active
      ? "bg-zinc-800/90 text-white shadow-sm shadow-black/20"
      : "text-[var(--muted)] hover:bg-zinc-800/60 hover:text-white",
  ].join(" ");
}

export function MainNav() {
  const pathname = usePathname() ?? "";

  const isSurveys =
    pathname === "/" ||
    (pathname.startsWith("/surveys") && pathname !== "/surveys/new");
  const isRespondentForm = pathname.startsWith("/settings/respondent-form");
  const isNewSurvey = pathname === "/surveys/new";

  return (
    <nav
      className="flex w-full flex-nowrap items-center justify-between gap-1 sm:w-auto sm:justify-start sm:gap-2"
      aria-label="Main"
    >
      <Link
        href="/"
        className={navItemClass(isSurveys)}
        aria-current={isSurveys ? "page" : undefined}
      >
        Surveys
      </Link>
      <Link
        href="/settings/respondent-form"
        className={navItemClass(isRespondentForm)}
        aria-current={isRespondentForm ? "page" : undefined}
      >
        Respondent form
      </Link>
      <Link
        href="/surveys/new"
        className={[
          "rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors ring-1 sm:px-3.5",
          isNewSurvey
            ? "bg-indigo-500/25 text-indigo-100 ring-indigo-400/40 shadow-md shadow-indigo-950/30"
            : "bg-[var(--accent-muted)] text-[var(--accent-hover)] ring-indigo-500/20 hover:bg-indigo-500/20 hover:text-indigo-100",
        ].join(" ")}
        aria-current={isNewSurvey ? "page" : undefined}
      >
        New survey
      </Link>
    </nav>
  );
}
