// SPDX-License-Identifier: GPL-2.0-or-later

import type {
  DecimalSeparator,
  Language,
} from '../types.js';

/** Normalize a GLib locale name into a BCP 47-ish tag ("es_MX.UTF-8" → "es-mx"). */
export function normalizeLocale(raw: string): string {
  return raw.split('.')[0]?.split('@')[0]?.replace(/_/g, '-').toLowerCase() ?? '';
}

function primaryLanguage(locale: string): string {
  return locale.split('-')[0] ?? '';
}

function supportedLanguage(name: string): Language | null {
  const primary = primaryLanguage(normalizeLocale(name));
  return primary === 'es' || primary === 'en' ? primary : null;
}

/**
 * Resolve the effective UI language.
 *
 * An explicit setting always wins. Otherwise the first supported language in
 * `names` is used (GLib puts the user's preferences first), falling back to
 * English when nothing compatible is available.
 */
export function resolveLanguage(
  setting: string,
  names: readonly string[],
): Language {
  if (setting === 'en' || setting === 'es')
    return setting;

  for (const name of names) {
    const language = supportedLanguage(name);
    if (language)
      return language;
  }

  return 'en';
}

/** First supported locale in `names`, used to follow the system's region. */
export function preferredLocale(names: readonly string[]): string {
  for (const name of names) {
    const locale = normalizeLocale(name);
    if (supportedLanguage(locale))
      return locale;
  }

  return 'en';
}

/** Decimal separator that CLDR associates with a locale. */
export function decimalSeparatorForLocale(locale: string): DecimalSeparator {
  try {
    const parts = new Intl.NumberFormat(locale, { useGrouping: false })
      .formatToParts(1.5);
    return parts.find(part => part.type === 'decimal')?.value === ',' ? ',' : '.';
  } catch {
    return '.';
  }
}

export function decimalSeparatorForSetting(
  setting: string,
  names: readonly string[],
): DecimalSeparator {
  if (setting === 'comma')
    return ',';
  if (setting === 'point')
    return '.';

  return decimalSeparatorForLocale(preferredLocale(names));
}
