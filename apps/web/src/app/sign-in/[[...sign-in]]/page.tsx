"use client";

import { useSignIn, useAuth } from "@clerk/nextjs";
import { useState, useEffect, FormEvent } from "react";

function MsiLogo() {
  return (
    <div className="mb-8 flex items-baseline justify-center gap-0.5">
      <span className="text-3xl font-semibold tracking-tight text-msi-navy">
        MeshSuture
      </span>
      <span className="text-3xl font-semibold text-msi-cyan">.</span>
    </div>
  );
}

export default function SignInPage() {
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");

  useEffect(() => {
    if (authLoaded && isSignedIn) {
      window.location.href = "/dashboard";
    }
  }, [authLoaded, isSignedIn]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!signInLoaded || !signIn) return;

    setError("");
    setLoading(true);

    if (mode === "sign-up" && password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const endpoint =
        mode === "sign-in" ? "/api/auth/sign-in" : "/api/auth/sign-up";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `${mode === "sign-in" ? "Sign-in" : "Sign-up"} failed`);
        setLoading(false);
        return;
      }

      // Use the token to create a client-side session
      const result = await signIn.create({
        strategy: "ticket",
        ticket: data.token,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        window.location.href = "/dashboard";
      } else {
        setError(`Unexpected status: ${result.status}`);
        setLoading(false);
      }
    } catch (err: any) {
      console.error(`[${mode}] Error:`, err);
      setError(err?.message || `${mode === "sign-in" ? "Sign-in" : "Sign-up"} failed`);
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(mode === "sign-in" ? "sign-up" : "sign-in");
    setError("");
    setConfirmPassword("");
  }

  if (!signInLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-msi-pale-cyan to-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-msi-navy border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-msi-pale-cyan to-white">
      <div className="w-full max-w-md rounded-2xl border border-msi-light-blue bg-white p-10 shadow-lg">
        <MsiLogo />

        <h1 className="mb-1 text-center text-xl font-semibold text-msi-navy">
          {mode === "sign-in" ? "Sign in to" : "Create your"} Daily Digest
          {mode === "sign-up" ? " account" : ""}
        </h1>
        <p className="mb-8 text-center text-sm text-msi-gray">
          {mode === "sign-in"
            ? "Your AI-powered morning briefing"
            : "Set up your account to get started"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-msi-dark"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@meshsuture.com"
              className="block w-full rounded-xl border border-msi-light-blue bg-white px-4 py-2.5 text-msi-dark shadow-sm placeholder:text-msi-gray/60 focus:border-msi-cyan focus:outline-none focus:ring-2 focus:ring-msi-cyan/20"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-msi-dark"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "sign-up" ? "At least 8 characters" : ""}
              className="block w-full rounded-xl border border-msi-light-blue bg-white px-4 py-2.5 text-msi-dark shadow-sm placeholder:text-msi-gray/60 focus:border-msi-cyan focus:outline-none focus:ring-2 focus:ring-msi-cyan/20"
            />
          </div>

          {mode === "sign-up" && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-msi-dark"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-xl border border-msi-light-blue bg-white px-4 py-2.5 text-msi-dark shadow-sm focus:border-msi-cyan focus:outline-none focus:ring-2 focus:ring-msi-cyan/20"
              />
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-brand bg-msi-cyan px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-msi-navy focus:outline-none focus:ring-2 focus:ring-msi-cyan/40 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading
              ? mode === "sign-in"
                ? "Signing in..."
                : "Creating account..."
              : mode === "sign-in"
                ? "Continue"
                : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-msi-gray">
          {mode === "sign-in" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={switchMode}
                className="font-semibold text-msi-cyan hover:text-msi-navy"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={switchMode}
                className="font-semibold text-msi-cyan hover:text-msi-navy"
              >
                Sign in
              </button>
            </>
          )}
        </p>

        <p className="mt-3 text-center text-xs text-msi-gray">
          Only @meshsuture.com email addresses are allowed.
        </p>
      </div>
    </div>
  );
}
