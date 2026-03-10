"use client";

import { useSignIn, useAuth } from "@clerk/nextjs";
import { useState, useEffect, FormEvent } from "react";

export default function SignInPage() {
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (authLoaded && isSignedIn) {
      setStatus("Already signed in, redirecting...");
      window.location.href = "/dashboard";
    }
  }, [authLoaded, isSignedIn]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!signInLoaded || !signIn) return;

    setError("");
    setStatus("Step 1: Creating sign-in...");

    try {
      // Step 1: Create sign-in with identifier only
      const si = await signIn.create({ identifier: email });
      setStatus(`Step 1 done: ${si.status}`);
      console.log("[SignIn] After create:", si.status, JSON.stringify(si, null, 2));

      // Step 2: Attempt first factor with password
      if (si.status === "needs_first_factor") {
        setStatus("Step 2: Verifying password...");
        const result = await si.attemptFirstFactor({
          strategy: "password",
          password,
        });
        setStatus(`Step 2 done: ${result.status}`);
        console.log("[SignIn] After first factor:", result.status);

        if (result.status === "complete") {
          setStatus("Step 3: Setting active session...");
          await setActive({ session: result.createdSessionId });
          setStatus("Done! Redirecting...");
          window.location.href = "/dashboard";
          return;
        }

        if (result.status === "needs_second_factor") {
          setStatus("2FA required — not yet supported in this form.");
          return;
        }

        setStatus(`Unexpected after password: ${result.status}. Check console.`);
        console.log("[SignIn] Unexpected:", JSON.stringify(result, null, 2));
        return;
      }

      // If create already completed (e.g. single-step)
      if (si.status === "complete") {
        setStatus("Step 3: Setting active session...");
        await setActive({ session: si.createdSessionId });
        setStatus("Done! Redirecting...");
        window.location.href = "/dashboard";
        return;
      }

      setStatus(`Unexpected after create: ${si.status}. Check console.`);
      console.log("[SignIn] Unexpected:", JSON.stringify(si, null, 2));
    } catch (err: any) {
      console.error("[SignIn] Error:", err);
      setError(
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        "Sign-in failed"
      );
      setStatus("");
    }
  }

  if (!signInLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Sign in
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          MeshSuture Daily Digest
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@meshsuture.com"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {status && (
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
              {status}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:opacity-50"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
