import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Survey Studio",
  description: "Create surveys, collect responses, view analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans antialiased`}
        suppressHydrationWarning
      >
        <header className="sticky top-0 z-50 border-b border-[var(--border)]/80 bg-[var(--card)]/75 backdrop-blur-md backdrop-saturate-150">
          <div className="mx-auto flex h-[4.25rem] max-w-5xl items-center justify-between gap-6 px-4 sm:px-6">
            <Link
              href="/"
              className="group flex items-center gap-2.5 text-[var(--foreground)] transition-opacity hover:opacity-90"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-indigo-600 text-sm font-bold text-white shadow-md shadow-indigo-950/50 ring-1 ring-white/10"
                aria-hidden
              >
                S
              </span>
              <span className="text-lg font-semibold tracking-tight">
                Survey Studio
              </span>
            </Link>
            <nav
              className="flex items-center gap-1 sm:gap-2"
              aria-label="Main"
            >
              <Link
                href="/"
                className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-zinc-800/60 hover:text-white"
              >
                Surveys
              </Link>
              <Link
                href="/settings/shop-options"
                className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-zinc-800/60 hover:text-white"
              >
                Shop options
              </Link>
              <Link
                href="/surveys/new"
                className="rounded-lg bg-[var(--accent-muted)] px-3.5 py-2 text-sm font-semibold text-[var(--accent-hover)] ring-1 ring-indigo-500/20 transition-colors hover:bg-indigo-500/20 hover:text-indigo-100"
              >
                New survey
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
          {children}
        </main>
      </body>
    </html>
  );
}
