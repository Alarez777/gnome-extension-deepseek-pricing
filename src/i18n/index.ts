// SPDX-License-Identifier: GPL-2.0-or-later

import GLib from 'gi://GLib';

import type { Language } from '../types.js';
import { resolveLanguage } from './locale.js';
import { EN, ES, weekdayShort, type MessageKey } from './messages.js';

export interface Translator {
  readonly language: Language;
  /** Translate an English message id, falling back to the id itself. */
  t(text: MessageKey): string;
  /** Short weekday name for a GLib day of week (1 = Monday, 7 = Sunday). */
  weekdayShort(day: number): string;
}

/** Language names in preference order, as reported by the user's locale. */
export function detectLanguageNames(): string[] {
  return GLib.get_language_names();
}

export function createTranslator(
  setting: string,
  names: readonly string[] = detectLanguageNames(),
): Translator {
  const language = resolveLanguage(setting, names);
  const catalog = language === 'es' ? ES : EN;

  return {
    language,
    t: (text: MessageKey): string => catalog[text],
    weekdayShort: (day: number): string => weekdayShort(language, day),
  };
}

export type { MessageKey } from './messages.js';
