// SPDX-License-Identifier: GPL-2.0-or-later

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  effectiveClockFormat,
  formatClockTime,
} from '../src/pricing/clock.js';

test('system preference follows the desktop clock format', () => {
  assert.equal(effectiveClockFormat('system', '12h'), '12h');
  assert.equal(effectiveClockFormat('system', '24h'), '24h');
});

test('an invalid desktop value falls back to 24-hour', () => {
  assert.equal(effectiveClockFormat('system', ''), '24h');
  assert.equal(effectiveClockFormat('system', 'weird'), '24h');
});

test('explicit preference overrides the desktop format', () => {
  assert.equal(effectiveClockFormat('12h', '24h'), '12h');
  assert.equal(effectiveClockFormat('24h', '12h'), '24h');
});

test('an invalid preference falls back to the desktop format', () => {
  assert.equal(effectiveClockFormat('weird', '12h'), '12h');
  assert.equal(effectiveClockFormat('weird', '24h'), '24h');
});

test('24-hour times are zero padded', () => {
  assert.equal(formatClockTime(0, 0, '24h', 'en'), '00:00');
  assert.equal(formatClockTime(9, 5, '24h', 'es'), '09:05');
  assert.equal(formatClockTime(23, 59, '24h', 'en'), '23:59');
});

test('12-hour times follow the selected language', () => {
  assert.equal(formatClockTime(0, 7, '12h', 'en'), '12:07 AM');
  assert.equal(formatClockTime(9, 5, '12h', 'en'), '9:05 AM');
  assert.equal(formatClockTime(12, 0, '12h', 'en'), '12:00 PM');
  assert.equal(formatClockTime(15, 4, '12h', 'en'), '3:04 PM');

  assert.equal(formatClockTime(0, 7, '12h', 'es'), '12:07 a. m.');
  assert.equal(formatClockTime(15, 4, '12h', 'es'), '3:04 p. m.');
});
