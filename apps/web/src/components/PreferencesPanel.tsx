"use client";

import { useState } from "react";

type NotificationPref = "EMAIL_ONLY" | "SLACK_ONLY" | "BOTH";
type DataSourcePref = "EMAILS_ONLY" | "SLACK_ONLY" | "BOTH";
type SummaryPreset =
  | "LAST_24_HOURS"
  | "LAST_12_HOURS"
  | "LAST_8_HOURS"
  | "SINCE_YESTERDAY_5PM"
  | "CUSTOM";

interface Preferences {
  notificationPreference: NotificationPref;
  dataSourcePreference: DataSourcePref;
  summaryWindowPreset: SummaryPreset;
  summaryStartTime: string | null;
  summaryEndTime: string | null;
  hasMicrosoft: boolean;
  hasSlack: boolean;
}

interface Props {
  preferences: Preferences;
  onSave: (updates: Partial<Preferences>) => Promise<void>;
}

const NOTIFICATION_OPTIONS: { value: NotificationPref; label: string }[] = [
  { value: "EMAIL_ONLY", label: "Email only" },
  { value: "SLACK_ONLY", label: "Slack only" },
  { value: "BOTH", label: "Both" },
];

const DATA_SOURCE_OPTIONS: { value: DataSourcePref; label: string; description: string }[] = [
  { value: "EMAILS_ONLY", label: "Emails only", description: "Summarize Outlook emails" },
  { value: "SLACK_ONLY", label: "Slack only", description: "Summarize Slack messages" },
  { value: "BOTH", label: "Both", description: "Summarize emails and Slack" },
];

const SUMMARY_PRESETS: { value: SummaryPreset; label: string }[] = [
  { value: "LAST_24_HOURS", label: "Last 24 hours" },
  { value: "LAST_12_HOURS", label: "Last 12 hours" },
  { value: "LAST_8_HOURS", label: "Last 8 hours (work day only)" },
  { value: "SINCE_YESTERDAY_5PM", label: "Since yesterday 5 PM" },
  { value: "CUSTOM", label: "Custom" },
];

export function PreferencesPanel({ preferences, onSave }: Props) {
  const [notifPref, setNotifPref] = useState(
    preferences.notificationPreference
  );
  const [dataSourcePref, setDataSourcePref] = useState(
    preferences.dataSourcePreference
  );
  const [summaryPreset, setSummaryPreset] = useState(
    preferences.summaryWindowPreset
  );
  const [startTime, setStartTime] = useState(
    preferences.summaryStartTime || ""
  );
  const [endTime, setEndTime] = useState(preferences.summaryEndTime || "");
  const [saving, setSaving] = useState(false);

  const isNotifDisabled = (opt: NotificationPref): boolean => {
    if (opt === "EMAIL_ONLY" && !preferences.hasMicrosoft) return true;
    if (opt === "SLACK_ONLY" && !preferences.hasSlack) return true;
    if (opt === "BOTH" && (!preferences.hasMicrosoft || !preferences.hasSlack))
      return true;
    return false;
  };

  const isDataSourceDisabled = (opt: DataSourcePref): boolean => {
    if (opt === "EMAILS_ONLY" && !preferences.hasMicrosoft) return true;
    if (opt === "SLACK_ONLY" && !preferences.hasSlack) return true;
    if (opt === "BOTH" && (!preferences.hasMicrosoft || !preferences.hasSlack))
      return true;
    return false;
  };

  const handleSave = async () => {
    setSaving(true);
    const updates: any = {
      notificationPreference: notifPref,
      dataSourcePreference: dataSourcePref,
      summaryWindowPreset: summaryPreset,
    };
    if (summaryPreset === "CUSTOM") {
      updates.summaryStartTime = startTime || null;
      updates.summaryEndTime = endTime || null;
    }
    await onSave(updates);
    setSaving(false);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-msi-light-blue bg-white p-6 shadow-sm">
      {/* Data Source Preference */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-msi-navy">
          Data to summarize
        </label>
        <div className="flex gap-3">
          {DATA_SOURCE_OPTIONS.map((opt) => {
            const disabled = isDataSourceDisabled(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => !disabled && setDataSourcePref(opt.value)}
                disabled={disabled}
                className={`flex-1 rounded-brand border-2 px-4 py-3 text-left transition ${
                  dataSourcePref === opt.value
                    ? "border-msi-cyan bg-msi-pale-cyan"
                    : disabled
                      ? "cursor-not-allowed border-msi-light-blue bg-msi-off-white"
                      : "border-msi-light-blue hover:border-msi-cyan"
                }`}
              >
                <span
                  className={`block text-sm font-medium ${
                    dataSourcePref === opt.value
                      ? "text-msi-navy"
                      : disabled
                        ? "text-msi-gray/50"
                        : "text-msi-dark"
                  }`}
                >
                  {opt.label}
                </span>
                <span
                  className={`mt-0.5 block text-xs ${
                    dataSourcePref === opt.value
                      ? "text-msi-cyan"
                      : "text-msi-gray"
                  }`}
                >
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
        {!preferences.hasMicrosoft && (
          <p className="mt-1 text-xs text-msi-gray">
            Connect Microsoft 365 to include emails.
          </p>
        )}
        {!preferences.hasSlack && (
          <p className="mt-1 text-xs text-msi-gray">
            Connect Slack to include Slack messages.
          </p>
        )}
      </div>

      {/* Notification Preference */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-msi-navy">
          Deliver digest via
        </label>
        <div className="flex gap-3">
          {NOTIFICATION_OPTIONS.map((opt) => {
            const disabled = isNotifDisabled(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => !disabled && setNotifPref(opt.value)}
                disabled={disabled}
                className={`rounded-brand border-2 px-4 py-2 text-sm font-medium transition ${
                  notifPref === opt.value
                    ? "border-msi-cyan bg-msi-pale-cyan text-msi-navy"
                    : disabled
                      ? "cursor-not-allowed border-msi-light-blue bg-msi-off-white text-msi-gray/50"
                      : "border-msi-light-blue text-msi-dark hover:border-msi-cyan"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Window */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-msi-navy">
          Summary window
        </label>
        <select
          value={summaryPreset}
          onChange={(e) => setSummaryPreset(e.target.value as SummaryPreset)}
          className="rounded-xl border border-msi-light-blue px-3 py-2 text-sm text-msi-dark focus:border-msi-cyan focus:outline-none focus:ring-2 focus:ring-msi-cyan/20"
        >
          {SUMMARY_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        {summaryPreset === "CUSTOM" && (
          <div className="mt-3 flex gap-4">
            <div>
              <label className="mb-1 block text-xs text-msi-gray">
                Start (Central Time)
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-xl border border-msi-light-blue px-3 py-1.5 text-sm text-msi-dark focus:border-msi-cyan focus:outline-none focus:ring-2 focus:ring-msi-cyan/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-msi-gray">
                End (Central Time)
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded-xl border border-msi-light-blue px-3 py-1.5 text-sm text-msi-dark focus:border-msi-cyan focus:outline-none focus:ring-2 focus:ring-msi-cyan/20"
              />
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-brand bg-msi-cyan px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-msi-navy focus:outline-none focus:ring-2 focus:ring-msi-cyan/40 focus:ring-offset-2 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save preferences"}
      </button>
    </div>
  );
}
