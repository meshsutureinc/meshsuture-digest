"use client";

import { SignInButton, SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-white">
          MeshSuture Daily Digest
        </h1>
        <p className="mb-8 text-lg text-blue-200">
          AI-powered daily digest of your emails and Slack messages, prioritized
          by importance using the Eisenhower Matrix.
        </p>

        <SignedOut>
          <SignInButton mode="redirect" forceRedirectUrl="/dashboard">
            <button className="rounded-lg bg-white px-8 py-3 text-lg font-semibold text-blue-900 shadow-lg transition hover:bg-blue-50 hover:shadow-xl">
              Sign in with @meshsuture.com
            </button>
          </SignInButton>
          <p className="mt-4 text-sm text-blue-300">
            Only @meshsuture.com email addresses are allowed.
          </p>
        </SignedOut>

        <SignedIn>
          <p className="text-white">Redirecting to dashboard...</p>
        </SignedIn>
      </div>
    </main>
  );
}
