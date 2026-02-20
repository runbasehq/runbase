import type { Metadata } from "next";
import { Faculty_Glyphic, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { QueryProvider } from "./providers/query-provider";

const satoshi = localFont({
  src: [
    {
      path: "./fonts/Satoshi-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/Satoshi-LightItalic.otf",
      weight: "300",
      style: "italic",
    },
    {
      path: "./fonts/Satoshi-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Satoshi-Italic.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/Satoshi-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Satoshi-MediumItalic.otf",
      weight: "500",
      style: "italic",
    },
    {
      path: "./fonts/Satoshi-Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/Satoshi-BoldItalic.otf",
      weight: "700",
      style: "italic",
    },
    {
      path: "./fonts/Satoshi-Black.otf",
      weight: "900",
      style: "normal",
    },
    {
      path: "./fonts/Satoshi-BlackItalic.otf",
      weight: "900",
      style: "italic",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const heroTitleFont = Faculty_Glyphic({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-hero-title",
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
    <html lang="en" className={`${satoshi.variable} ${heroTitleFont.variable}`}>
      <body className={`${geistMono.variable} antialiased`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
