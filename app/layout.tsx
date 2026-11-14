import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ghostline — Find your frequency",
  description: "The walkie-talkie, resurrected. A quiet corner of the internet for your crew. Hold to talk, release to listen.",
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
