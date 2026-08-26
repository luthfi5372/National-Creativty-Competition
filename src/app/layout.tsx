import type { Metadata } from "next";
import { Inter, Josefin_Sans } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import SessionManager from "@/components/auth/SessionManager";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const josefin = Josefin_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ncc2026.id"), // Ganti dengan domain asli jika sudah live
  title: {
    default: "NCC 13th — National Creativity Competition 2026",
    template: "%s | NCC 13th"
  },
  description:
    "Kompetisi kreativitas nasional terbesar untuk generasi muda Indonesia. Ikuti Speech Contest, LKTI, MTQ, dan Olimpiade MIPA. Tunjukkan bakatmu dan raih prestasi di tingkat nasional bersama NCC 13th.",
  keywords: [
    "NCC 2026",
    "National Creativity Competition",
    "Lomba Nasional 2026",
    "LKTI Nasional",
    "Speech Contest Indonesia",
    "Olimpiade MIPA",
    "MTQ Nasional",
    "Kompetisi Mahasiswa",
    "NCC 13th"
  ],
  authors: [{ name: "NCC Organizing Committee" }],
  creator: "NCC Tech Team",
  openGraph: {
    title: "NCC 13th — National Creativity Competition 2026",
    description: "Wadahi kreativitas, raih prestasi tingkat nasional. Daftar sekarang!",
    url: "https://ncc2026.id",
    siteName: "NCC 13th",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/og-image.png", // Pastikan file ini ada di folder public/
        width: 1200,
        height: 630,
        alt: "NCC 13th National Creativity Competition",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NCC 13th — National Creativity Competition 2026",
    description: "Join the biggest national creativity competition. Register your team now!",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: "#4f46e5", // Indigo color corresponding to NCC branding
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${josefin.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground relative"
        suppressHydrationWarning
      >
        <SessionManager />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
