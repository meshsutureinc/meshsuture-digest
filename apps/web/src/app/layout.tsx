import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeshSuture Daily Digest",
  description:
    "AI-powered daily digest of your emails and Slack messages, prioritized by importance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen font-sohne">{children}</body>
      </html>
    </ClerkProvider>
  );
}
