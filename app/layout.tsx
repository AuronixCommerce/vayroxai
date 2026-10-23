import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vayrox AI — By Chohan Gen AI",
  description: "Your thoughtful AI workspace. Write with clarity, build with confidence, and explore what comes next.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
