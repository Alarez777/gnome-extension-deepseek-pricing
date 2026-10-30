// SPDX-License-Identifier: GPL-2.0-or-later

import type { Segment, Status, Tier, TierInfo } from '../types.js';
import { isChineseHoliday, yearsWithData } from './holidays.js';

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
export const DEFAULT_HORIZON_MS = DAY_MS;

/**
 * Peak windows in UTC. End is exclusive: 04:00 and 10:00 UTC are off-peak.
 * Monday to Friday only; weekends and Chinese public holidays are off-peak.
 */
export const PEAK_WINDOWS_UTC: readonly (readonly [number, number])[] = [
  [1, 4],
  [6, 10],
];

/** Upper bound for boundary scans (14 days). */
const MAX_SCAN_HOURS = 14 * 24;

export function toUtcDateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function tierAt(ms: number): TierInfo {
  const date = new Date(ms);
  const day = date.getUTCDay();

  if (day === 0 || day === 6)
    return { tier: 'offpeak', reason: 'weekend' };

  if (isChineseHoliday(toUtcDateKey(ms)))
    return { tier: 'offpeak', reason: 'holiday' };

  const hour = date.getUTCHours();
  for (const [start, end] of PEAK_WINDOWS_UTC) {
    if (hour >= start && hour < end)
      return { tier: 'peak', reason: 'peak-hours' };
  }

  return { tier: 'offpeak', reason: 'off-hours' };
}

/**
 * First instant after `ms` at which the tier changes.
 *
 * The tier only changes on whole UTC hours, so scanning hour boundaries is
 * exact. Returns null if nothing changes within 14 days.
 */
export function nextChangeAt(ms: number): number | null {
  let boundary = Math.floor(ms / HOUR_MS) * HOUR_MS + HOUR_MS;
  let tier = tierAt(ms).tier;

  for (let i = 0; i < MAX_SCAN_HOURS; i++, boundary += HOUR_MS) {
    const next = tierAt(boundary).tier;
    if (next !== tier)
      return boundary;
    tier = next;
  }

  return null;
}

export interface UpcomingChange {
  atMs: number;
  tier: Tier;
}

/**
 * The next `count` tier changes strictly after `ms`, with the tier that
 * starts at each one. Returns fewer entries if nothing changes within the
 * scan bound.
 */
export function nextChanges(ms: number, count: number): UpcomingChange[] {
  const changes: UpcomingChange[] = [];
  let at = nextChangeAt(ms);

  while (at !== null && changes.length < count) {
    changes.push({ atMs: at, tier: tierAt(at).tier });
    at = nextChangeAt(at);
  }

  return changes;
}

export interface PricePeriodBounds {
  startMs: number;
  /** End of the period, or null if no later change is within the scan bound. */
  endMs: number | null;
  tier: Tier;
}

export interface PricePeriod extends PricePeriodBounds {
  /** True for the period containing `ms`. */
  current: boolean;
}

/**
 * The real period containing `ms`, with its full start and end. Unlike the
 * timeline segments, these bounds are not clipped to the 24-hour horizon.
 */
export function pricePeriodAt(ms: number): PricePeriodBounds {
  return {
    startMs: previousChangeAt(ms),
    endMs: nextChangeAt(ms),
    tier: tierAt(ms).tier,
  };
}

/**
 * The current price period followed by the next `count` periods, each with
 * its start and end. One extra change is fetched so the last period shown
 * also has a known end.
 */
export function upcomingPeriods(ms: number, count: number): PricePeriod[] {
  const starts: UpcomingChange[] = [
    { atMs: previousChangeAt(ms), tier: tierAt(ms).tier },
    ...nextChanges(ms, count + 1),
  ];

  return starts.slice(0, count + 1).map((start, index) => ({
    startMs: start.atMs,
    endMs: starts[index + 1]?.atMs ?? null,
    tier: start.tier,
    current: index === 0,
  }));
}

/** Instant at which the tier active at `ms` started. */
export function previousChangeAt(ms: number): number {
  let boundary = Math.floor(ms / HOUR_MS) * HOUR_MS;
  const tier = tierAt(ms).tier;

  for (let i = 0; i < MAX_SCAN_HOURS; i++, boundary -= HOUR_MS) {
    if (tierAt(boundary - 1).tier !== tier)
      return boundary;
  }

  return ms - MAX_SCAN_HOURS * HOUR_MS;
}

/**
 * Contiguous segments covering [ms, ms + horizonMs], clipped to that range.
 * The first segment always starts at `ms`, so the UI never has to know the
 * peak/weekend/holiday rules.
 */
export function buildSegments(
  ms: number,
  horizonMs: number = DEFAULT_HORIZON_MS,
): Segment[] {
  const end = ms + horizonMs;
  const points: number[] = [ms];

  for (
    let boundary = Math.floor(ms / HOUR_MS) * HOUR_MS + HOUR_MS;
    boundary < end;
    boundary += HOUR_MS
  ) {
    points.push(boundary);
  }
  points.push(end);

  const segments: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const startMs = points[i];
    const endMs = Math.min(points[i + 1], end);
    const tier = tierAt(startMs).tier;
    const last = segments[segments.length - 1];

    if (last && last.tier === tier)
      last.endMs = endMs;
    else
      segments.push({ startMs, endMs, tier });
  }

  return segments;
}

const HOLIDAY_YEARS = new Set<number>(yearsWithData());

function missingHolidayYears(fromMs: number, toMs: number): number[] {
  const first = new Date(fromMs).getUTCFullYear();
  const last = new Date(toMs).getUTCFullYear();
  const missing: number[] = [];

  for (let year = first; year <= last; year++) {
    if (!HOLIDAY_YEARS.has(year))
      missing.push(year);
  }

  return missing;
}

/** Segment active at `timeMs`, or the last one for times past the horizon. */
export function segmentAtTime(
  segments: Segment[],
  timeMs: number,
): Segment | null {
  for (const segment of segments) {
    if (timeMs >= segment.startMs && timeMs < segment.endMs)
      return segment;
  }

  return segments.length > 0 ? segments[segments.length - 1] : null;
}

export function getStatus(
  ms: number,
  horizonMs: number = DEFAULT_HORIZON_MS,
): Status {
  const current = tierAt(ms);
  const nextChangeMs = nextChangeAt(ms);
  const currentStartMs = previousChangeAt(ms);

  return {
    nowMs: ms,
    current,
    currentStartMs,
    nextChangeMs,
    segments: buildSegments(ms, horizonMs),
    missingHolidayYears: missingHolidayYears(ms, ms + horizonMs),
  };
}


