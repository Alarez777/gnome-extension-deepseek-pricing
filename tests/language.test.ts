// SPDX-License-Identifier: GPL-2.0-or-later

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decimalSeparatorForLocale,
  decimalSeparatorForSetting,
  normalizeLocale,
  preferredLocale,
  resolveLanguage,
} from '../src/i18n/locale.js';
import { weekdayShort, ES } from '../src/i18n/messages.js';

test('normalizes GLib locale names', () => {
  assert.equal(normalizeLocale('es_MX.UTF-8'), 'es-mx');
  assert.equal(normalizeLocale('en_US.UTF-8@modifier'), 'en-us');
  assert.equal(normalizeLocale('C'), 'c');
});

test('automatic language follows the first supported system language', () => {
  assert.equal(
    resolveLanguage('auto', ['es_MX.UTF-8', 'es_MX', 'es', 'en']),
    'es',
  );
  assert.equal(
    resolveLanguage('auto', ['en_GB.UTF-8', 'en_GB', 'en']),
    'en',
  );
});

test('automatic language falls back to English when nothing is compatible', () => {
  assert.equal(resolveLanguage('auto', ['fr_FR.UTF-8', 'fr']), 'en');
  assert.equal(resolveLanguage('auto', ['C']), 'en');
  assert.equal(resolveLanguage('auto', []), 'en');
});

test('an explicit language overrides the system', () => {
  assert.equal(resolveLanguage('es', ['en_US.UTF-8', 'en']), 'es');
  assert.equal(resolveLanguage('en', ['es_MX.UTF-8', 'es']), 'en');
});

test('the preferred locale is the first supported one', () => {
  assert.equal(preferredLocale(['fr_FR', 'es-MX', 'en-US']), 'es-mx');
  assert.equal(preferredLocale(['fr_FR']), 'en');
});

test('automatic decimal separator follows the system region', () => {
  assert.equal(decimalSeparatorForLocale('es-ES'), ',');
  assert.equal(decimalSeparatorForLocale('es-MX'), '.');
  assert.equal(decimalSeparatorForLocale('es-AR'), ',');

  assert.equal(decimalSeparatorForSetting('auto', ['es_MX.UTF-8', 'es']), '.');
  assert.equal(decimalSeparatorForSetting('auto', ['es_ES.UTF-8', 'es']), ',');
  assert.equal(decimalSeparatorForSetting('auto', ['fr_FR.UTF-8', 'fr']), '.');
});

test('an explicit decimal separator overrides the system', () => {
  assert.equal(decimalSeparatorForSetting('comma', ['en_US.UTF-8', 'en']), ',');
  assert.equal(decimalSeparatorForSetting('point', ['es_ES.UTF-8', 'es']), '.');
  assert.equal(decimalSeparatorForSetting('weird', ['es_ES.UTF-8', 'es']), ',');
});

test('weekday names follow the selected language', () => {
  assert.equal(weekdayShort('en', 1), 'Mon');
  assert.equal(weekdayShort('es', 1), 'lun');
  assert.equal(weekdayShort('en', 7), 'Sun');
  assert.equal(weekdayShort('es', 7), 'dom');
  assert.equal(weekdayShort('es', 5), 'vie');
});

test('the Spanish catalog has no empty translations', () => {
  for (const [key, value] of Object.entries(ES))
    assert.ok(value.trim().length > 0, `empty translation for ${key}`);
});
