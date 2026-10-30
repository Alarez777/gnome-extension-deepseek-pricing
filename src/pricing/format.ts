// SPDX-License-Identifier: GPL-2.0-or-later

import GLib from 'gi://GLib';

import type { Language } from '../types.js';
import { weekdayShort } from '../i18n/messages.js';
import { type ClockFormat, formatClockTime } from './clock.js';

function local(ms: number): GLib.DateTime {
  return GLib.DateTime.new_from_unix_local(Math.floor(ms / 1000));
}

function utc(ms: number): GLib.DateTime {
  return GLib.DateTime.new_from_unix_utc(Math.floor(ms / 1000));
}

function clockText(
  dt: GLib.DateTime,
  clock: ClockFormat,
  language: Language,
): string {
  return formatClockTime(dt.get_hour(), dt.get_minute(), clock, language);
}

/** Local weekday and time, e.g. "Fri 02:00" or "vie 09:00 p. m.". */
export function formatLocalDateTime(
  ms: number,
  clock: ClockFormat,
  language: Language,
): string {
  const dt = local(ms);
  return `${weekdayShort(language, dt.get_day_of_week())} ${clockText(dt, clock, language)}`;
}

/**
 * Local time range, e.g. "Fri 02:00 – 04:00" or "Fri 22:00 – Sat 06:00".
 * The end repeats the weekday only when it falls on another day.
 */
export function formatLocalRange(
  startMs: number,
  endMs: number,
  clock: ClockFormat,
  language: Language,
): string {
  const start = local(startMs);
  const end = local(endMs);
  const sameDay = start.get_year() === end.get_year() &&
    start.get_day_of_year() === end.get_day_of_year();
  const startText =
    `${weekdayShort(language, start.get_day_of_week())} ${clockText(start, clock, language)}`;
  const endText = sameDay
    ? clockText(end, clock, language)
    : `${weekdayShort(language, end.get_day_of_week())} ${clockText(end, clock, language)}`;
  return `${startText} – ${endText}`;
}

/** UTC wall-clock time, e.g. "08:00" or "08:00 AM". */
export function formatUtcTime(
  ms: number,
  clock: ClockFormat,
  language: Language,
): string {
  return clockText(utc(ms), clock, language);
}

/** Compact duration, e.g. "3 h 12 min" or "45 min". */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0)
    return `${minutes} min`;
  if (minutes === 0)
    return `${hours} h`;
  return `${hours} h ${minutes} min`;
}
