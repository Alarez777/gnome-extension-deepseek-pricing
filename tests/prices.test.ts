// SPDX-License-Identifier: GPL-2.0-or-later

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MODELS,
  formatMicroUsd,
  getModel,
  priceFor,
} from '../src/pricing/prices.js';

test('formats micro-USD with the documented precision', () => {
  assert.equal(formatMicroUsd(3_000, 3), '0.003');
  assert.equal(formatMicroUsd(6_000, 3), '0.006');
  assert.equal(formatMicroUsd(150_000, 2), '0.15');
  assert.equal(formatMicroUsd(300_000, 2), '0.30');
  assert.equal(formatMicroUsd(1_200_000, 2), '1.20');
  assert.equal(formatMicroUsd(22_000, 3), '0.022');
  assert.equal(formatMicroUsd(3_960_000, 2), '3.96');
});

test('uses the decimal comma when requested', () => {
  assert.equal(formatMicroUsd(3_000, 3, ','), '0,003');
  assert.equal(formatMicroUsd(300_000, 2, ','), '0,30');
  assert.equal(formatMicroUsd(1_200_000, 2, ','), '1,20');
});

test('off-peak is exactly half of peak for every row', () => {
  for (const model of Object.values(MODELS)) {
    for (const row of model.rows)
      assert.equal(row.microUsd.offpeak * 2, row.microUsd.peak);
  }
});

test('looks up official rates', () => {
  const flash = getModel('flash');
  assert.equal(priceFor(flash, 'cacheHit', 'offpeak'), 3_000);
  assert.equal(priceFor(flash, 'cacheHit', 'peak'), 6_000);
  assert.equal(priceFor(flash, 'cacheMiss', 'offpeak'), 150_000);
  assert.equal(priceFor(flash, 'output', 'peak'), 1_200_000);

  const pro = getModel('pro');
  assert.equal(priceFor(pro, 'cacheMiss', 'offpeak'), 660_000);
  assert.equal(priceFor(pro, 'output', 'peak'), 3_960_000);
});
