import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GateCall — Boarding Reconciliation Console",
  description:
    "Voice-AI agent that calls missing passengers at boarding and reports their status live to airline gate staff.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
