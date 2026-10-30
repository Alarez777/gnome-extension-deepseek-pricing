// SPDX-License-Identifier: GPL-2.0-or-later

import type { Language } from '../types.js';

export type ClockFormat = '12h' | '24h';

/**
 * Resolve the effective clock format.
 *
 * `preference` comes from the extension setting (system/12h/24h) and
 * `systemFormat` from org.gnome.desktop.interface clock-format.
 */
export function effectiveClockFormat(
  preference: string,
  systemFormat: string,
): ClockFormat {
  if (preference === '12h' || preference === '24h')
    return preference;
  return systemFormat === '12h' ? '12h' : '24h';
}

/**
 * Format a wall-clock time independently of the process locale, so an
 * English UI never shows Spanish "p. m." (or vice versa).
 */
export function formatClockTime(
  hour: number,
  minute: number,
  clock: ClockFormat,
  language: Language,
): string {
  const minutes = minute.toString().padStart(2, '0');

  if (clock === '24h')
    return `${hour.toString().padStart(2, '0')}:${minutes}`;

  const hours = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = language === 'es'
    ? (hour < 12 ? 'a. m.' : 'p. m.')
    : (hour < 12 ? 'AM' : 'PM');
  return `${hours}:${minutes} ${suffix}`;
}
