"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { ConnectionCards } from "@/components/ConnectionCards";
import { PreferencesPanel } from "@/components/PreferencesPanel";
import { DigestPreview } from "@/components/DigestPreview";
import { Toast } from "@/components/Toast";

interface ConnectionStatus {
  microsoft: { connected: boolean; expiresAt: string | null };
  slack: { connected: boolean; teamName: string | null };
}

interface Preferences {
  notificationPreference: "EMAIL_ONLY" | "SLACK_ONLY" | "BOTH";
  summaryWindowPreset:
    | "LAST_24_HOURS"
    | "LAST_12_HOURS"
    | "LAST_8_HOURS"
    | "SINCE_YESTERDAY_5PM"
    | "CUSTOM";
  summaryStartTime: string | null;
  summaryEndTime: string | null;
  hasMicrosoft: boolean;
  hasSlack: boolean;
}

interface DigestResult {
  dailySummary: string;
  tasks: Array<{
    title: string;
    source: "email" | "slack";
    senderName: string;
    priority: "P1" | "P2" | "P3" | "P4";
    deadline?: string;
    reason: string;
  }>;
  emailsAnalyzed: number;
  slackMessagesAnalyzed: number;
  sentViaEmail: boolean;
  sentViaSlack: boolean;
}

export default function DashboardPage() {
  const { getToken, isLoaded } = useAuth();
  const [connections, setConnections] = useState<ConnectionStatus | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [digestResult, setDigestResult] = useState<DigestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingDigest, setTestingDigest] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const [connRes, prefRes] = await Promise.all([
        apiClient("/api/auth/status", token),
        apiClient("/api/preferences", token),
      ]);

      if (connRes.ok) setConnections(await connRes.json());
      if (prefRes.ok) setPreferences(await prefRes.json());
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isLoaded) fetchData();
  }, [isLoaded, fetchData]);

  // Check for OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");

    if (connected) {
      showToast(
        `${connected === "microsoft" ? "Microsoft 365" : "Slack"} connected successfully!`,
        "success"
      );
      window.history.replaceState({}, "", "/dashboard");
      fetchData();
    }
    if (error) {
      showToast(`Connection failed: ${error.replace(/_/g, " ")}`, "error");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [fetchData]);

  const handleSavePreferences = async (
    updates: Partial<Preferences>
  ) => {
    const token = await getToken();
    if (!token) return;

    try {
      const res = await apiClient("/api/preferences", token, {
        method: "PUT",
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const updated = await res.json();
        setPreferences((prev) => (prev ? { ...prev, ...updated } : prev));
        showToast("Preferences saved!", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save preferences", "error");
      }
    } catch {
      showToast("Failed to save preferences", "error");
    }
  };

  const handleTestDigest = async () => {
    const token = await getToken();
    if (!token) return;

    setTestingDigest(true);
    setDigestResult(null);

    try {
      const res = await apiClient("/api/digest/test", token, {
        method: "POST",
      });

      if (res.ok) {
        const result = await res.json();
        setDigestResult(result);
        showToast("Test digest generated!", "success");
      } else {
        const err = await res.json();
        showToast(err.message || err.error || "Failed to generate digest", "error");
      }
    } catch {
      showToast("Failed to generate test digest", "error");
    } finally {
      setTestingDigest(false);
    }
  };

  const handleConnectMicrosoft = async () => {
    const token = await getToken();
    if (!token) return;
    window.location.href = `/api/auth/microsoft?token=${token}`;
  };

  const handleConnectSlack = async () => {
    const token = await getToken();
    if (!token) return;
    window.location.href = `/api/auth/slack?token=${token}`;
  };

  const handleDisconnect = async (provider: "microsoft" | "slack") => {
    const token = await getToken();
    if (!token) return;

    try {
      const res = await apiClient("/api/auth/disconnect", token, {
        method: "POST",
        body: JSON.stringify({ provider }),
      });

      if (res.ok) {
        showToast(
          `${provider === "microsoft" ? "Microsoft 365" : "Slack"} disconnected`,
          "success"
        );
        fetchData();
      } else {
        showToast("Failed to disconnect", "error");
      }
    } catch {
      showToast("Failed to disconnect", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">
            MeshSuture Daily Digest
          </h1>
          <UserButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Connection Status */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Connected Services
          </h2>
          <ConnectionCards
            connections={connections}
            onConnectMicrosoft={handleConnectMicrosoft}
            onConnectSlack={handleConnectSlack}
            onDisconnect={handleDisconnect}
          />
        </section>

        {/* Preferences */}
        {preferences && (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Settings
            </h2>
            <PreferencesPanel
              preferences={preferences}
              onSave={handleSavePreferences}
            />
          </section>
        )}

        {/* Test Digest */}
        <section className="mb-8">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Test Digest
                </h2>
                <p className="text-sm text-gray-500">
                  Run the full pipeline now and preview your digest.
                </p>
              </div>
              <button
                onClick={handleTestDigest}
                disabled={
                  testingDigest ||
                  (!connections?.microsoft.connected &&
                    !connections?.slack.connected)
                }
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testingDigest ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Generating...
                  </span>
                ) : (
                  "Send test digest now"
                )}
              </button>
            </div>

            {digestResult && (
              <div className="mt-6">
                <DigestPreview digest={digestResult} />
              </div>
            )}
          </div>
        </section>
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
