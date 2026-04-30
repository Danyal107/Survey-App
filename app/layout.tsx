import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { AppProviders } from "@/components/AppProviders";
import { MainNav } from "@/components/MainNav";
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
        <AppProviders>
          <header className="sticky top-0 z-50 overflow-x-hidden border-b border-[var(--border)]/80 bg-[var(--card)]/75 backdrop-blur-md backdrop-saturate-150">
            <div className="mx-auto flex max-w-5xl flex-col px-4 py-3 sm:h-[4.25rem] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-0">
              <Link
                href="/"
                className="group flex shrink-0 items-center gap-2.5 text-[var(--foreground)] transition-opacity hover:opacity-90"
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
              {/* Full-bleed divider on small screens only (edge-to-edge under logo row) */}
              <div
                className="relative left-1/2 mt-3 w-screen max-w-[100vw] -translate-x-1/2 border-t border-[var(--border)]/60 sm:mt-0 sm:hidden"
                aria-hidden
              />
              <div className="w-full pt-3 sm:w-auto sm:pt-0">
                <MainNav />
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
            {children}
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
