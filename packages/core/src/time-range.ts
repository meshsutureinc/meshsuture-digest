import type { TimeRange } from "./types";
import type { SummaryWindowPreset } from "@meshsuture/db";

/**
 * Compute the time range for fetching messages based on user preferences.
 * All defaults are in Central Time (America/Chicago).
 */
export function computeTimeRange(
  preset: SummaryWindowPreset,
  customStart?: string | null,
  customEnd?: string | null,
  referenceTime?: Date
): TimeRange {
  const now = referenceTime || new Date();

  // Helper to get a date in Central Time
  const centralFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Get today at 7:00 AM Central
  const parts = centralFormatter.formatToParts(now);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value || "00";
  const todayStr = `${get("year")}-${get("month")}-${get("day")}`;
  const today7am = new Date(`${todayStr}T07:00:00-06:00`); // Approximate; DST handled below

  // Adjust for Central Time offset properly
  const centralOffset = getCentralOffset(now);
  const today7amCentral = new Date(
    `${todayStr}T07:00:00${centralOffset}`
  );

  switch (preset) {
    case "LAST_24_HOURS": {
      const end = now;
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      return { start, end };
    }
    case "LAST_12_HOURS": {
      const end = now;
      const start = new Date(end.getTime() - 12 * 60 * 60 * 1000);
      return { start, end };
    }
    case "LAST_8_HOURS": {
      const end = now;
      const start = new Date(end.getTime() - 8 * 60 * 60 * 1000);
      return { start, end };
    }
    case "SINCE_YESTERDAY_5PM": {
      const end = now;
      const yesterdayStr = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const start = new Date(
        `${yesterdayStr}T17:00:00${centralOffset}`
      );
      return { start, end };
    }
    case "CUSTOM": {
      if (customStart && customEnd) {
        const start = new Date(customStart);
        const end = new Date(customEnd);
        // Validate: max 7 days
        const maxRange = 7 * 24 * 60 * 60 * 1000;
        if (end.getTime() - start.getTime() > maxRange) {
          throw new Error("Custom range cannot exceed 7 days");
        }
        if (end <= start) {
          throw new Error("End time must be after start time");
        }
        return { start, end };
      }
      // Fallback to 24 hours
      const end = now;
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      return { start, end };
    }
    default: {
      const end = now;
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      return { start, end };
    }
  }
}

function getCentralOffset(date: Date): string {
  // Determine if Central Time is CDT (-05:00) or CST (-06:00)
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());

  // Create a date in Central and check its offset
  const central = new Date(
    date.toLocaleString("en-US", { timeZone: "America/Chicago" })
  );
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const diffMinutes = (utc.getTime() - central.getTime()) / 60000;

  return diffMinutes === 300 ? "-05:00" : "-06:00";
}
