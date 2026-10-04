import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sandbox",
  description: "Development sandbox for portfolio components and design tokens.",
  alternates: {
    canonical: "/sandbox",
  },
  openGraph: {
    title: "Sandbox",
    description: "Development sandbox for portfolio components and design tokens.",
    url: "/sandbox",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function SandboxLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
