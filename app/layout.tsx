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
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <header className="border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-white"
            >
              Survey Studio
            </Link>
            <nav className="flex gap-4 text-sm text-[var(--muted)]">
              <Link href="/" className="hover:text-white transition-colors">
                Surveys
              </Link>
              <Link
                href="/surveys/new"
                className="hover:text-[var(--accent-hover)] text-[var(--accent)] transition-colors"
              >
                New survey
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
