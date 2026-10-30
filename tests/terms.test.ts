// SPDX-License-Identifier: GPL-2.0-or-later

import assert from 'node:assert/strict';
import test from 'node:test';

import { termsFor } from '../src/pricing/terms.js';
import type { MessageKey } from '../src/i18n/messages.js';

const identity = (text: MessageKey): string => text;

test('plain terminology uses cheap/expensive labels', () => {
  assert.deepEqual(termsFor('plain', identity), {
    cheap: 'Cheap',
    expensive: 'Expensive',
    cheapTitle: 'Cheap pricing',
    expensiveTitle: 'Expensive pricing',
    cheapLower: 'cheap',
    expensiveLower: 'expensive',
  });
});

test('official terminology uses off-peak/peak labels', () => {
  assert.deepEqual(termsFor('official', identity), {
    cheap: 'Off-peak',
    expensive: 'Peak',
    cheapTitle: 'Off-peak pricing',
    expensiveTitle: 'Peak pricing',
    cheapLower: 'off-peak',
    expensiveLower: 'peak',
  });
});

test('invalid terminology falls back to plain', () => {
  assert.equal(termsFor('weird', identity).cheap, 'Cheap');
});
