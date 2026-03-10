"use client";

interface ConnectionStatus {
  microsoft: { connected: boolean; expiresAt: string | null };
  slack: { connected: boolean; teamName: string | null };
}

interface Props {
  connections: ConnectionStatus | null;
  onConnectMicrosoft: () => void;
  onConnectSlack: () => void;
}

export function ConnectionCards({
  connections,
  onConnectMicrosoft,
  onConnectSlack,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Microsoft 365 Card */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M11.5 3v8.5H3V3h8.5zm0 18H3v-8.5h8.5V21zm1-18H21v8.5h-8.5V3zm0 18v-8.5H21V21h-8.5z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Microsoft 365</h3>
            <p className="text-xs text-gray-500">Outlook email access</p>
          </div>
        </div>
        {connections?.microsoft.connected ? (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-700">
              Connected
            </span>
          </div>
        ) : (
          <button
            onClick={onConnectMicrosoft}
            className="w-full rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
          >
            Connect Microsoft 365
          </button>
        )}
      </div>

      {/* Slack Card */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
            <svg
              className="h-6 w-6 text-purple-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Slack</h3>
            <p className="text-xs text-gray-500">Channel & DM access</p>
          </div>
        </div>
        {connections?.slack.connected ? (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-700">
              Connected{connections.slack.teamName ? ` to ${connections.slack.teamName}` : ""}
            </span>
          </div>
        ) : (
          <button
            onClick={onConnectSlack}
            className="w-full rounded-lg border border-purple-600 px-4 py-2 text-sm font-medium text-purple-600 transition hover:bg-purple-50"
          >
            Connect Slack
          </button>
        )}
      </div>
    </div>
  );
}
