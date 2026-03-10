import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeshSuture Daily Digest",
  description:
    "AI-powered daily digest of your emails and Slack messages, prioritized by importance.",
};

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      signInUrl={
        process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ||
        "https://accounts.dailydigest.meshsuture.com/sign-in"
      }
      signUpUrl={
        process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ||
        "https://accounts.dailydigest.meshsuture.com/sign-up"
      }
      signInFallbackRedirectUrl={`${appUrl}/dashboard`}
      signUpFallbackRedirectUrl={`${appUrl}/dashboard`}
      afterSignOutUrl={appUrl}
      allowedRedirectOrigins={[
        "http://localhost:3000",
        "https://dailydigest.meshsuture.com",
        "https://accounts.dailydigest.meshsuture.com",
      ]}
    >
      <html lang="en">
        <body className="min-h-screen">{children}</body>
      </html>
    </ClerkProvider>
  );
}
