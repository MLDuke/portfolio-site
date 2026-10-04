import type { Metadata } from "next";
import localFont from "next/font/local";
import { siteDescription, siteName, siteOrigin } from "./metadata";
import "./globals.css";

// IBM Plex ships in @mlduke/ui (fonts/), one woff2 per weight. These src lists
// must match the files the package ships, so check them when bumping its tag.
// The variable names are the ones the @mlduke/ui font-family tokens read.
// next/font needs literal paths, resolved from this file.

const plexSans = localFont({
  src: [
    {
      path: "../node_modules/@mlduke/ui/fonts/IBMPlexSans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@mlduke/ui/fonts/IBMPlexSans-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/@mlduke/ui/fonts/IBMPlexSans-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../node_modules/@mlduke/ui/fonts/IBMPlexSans-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-ibm-plex-sans",
});

const plexMono = localFont({
  src: [
    {
      path: "../node_modules/@mlduke/ui/fonts/IBMPlexMono-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@mlduke/ui/fonts/IBMPlexMono-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/@mlduke/ui/fonts/IBMPlexMono-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../node_modules/@mlduke/ui/fonts/IBMPlexMono-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  openGraph: {
    title: siteName,
    description: siteDescription,
    siteName,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${plexSans.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
