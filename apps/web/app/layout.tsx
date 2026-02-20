import type { Metadata } from "next";
import { Faculty_Glyphic, Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "./providers/query-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const facultyGlyphic = Faculty_Glyphic({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-faculty-glyphic",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Runbase Multi-Tenant",
  description: "Subdomain-based multi-tenant demo with Upstash Redis",
  icons: {
    icon: "/runbase-mark.svg",
    shortcut: "/runbase-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${facultyGlyphic.variable}`}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
