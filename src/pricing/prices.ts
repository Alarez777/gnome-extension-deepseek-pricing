// SPDX-License-Identifier: GPL-2.0-or-later

import type {
  DecimalSeparator,
  ModelId,
  ModelPrices,
  PriceRow,
  Tier,
} from '../types.js';

/**
 * Official DeepSeek API rates, USD per 1M tokens.
 *
 * Peak hours are 01:00-04:00 and 06:00-10:00 UTC, Monday to Friday,
 * excluding Chinese public holidays. Off-peak rates are exactly half of the
 * peak rates.
 *
 * Source: https://api-docs.deepseek.com/quick_start/pricing
 * Prices changed on 2026-08-16; PRICES_AS_OF is the last verification date.
 * Update this file (and PRICES_AS_OF) when DeepSeek changes its rates.
 */
export const PRICES_AS_OF = '2026-10-29';

export const OFFPEAK_DISCOUNT_PERCENT = 50;

function row(
  id: PriceRow['id'],
  peakMicroUsd: number,
  decimals: number,
): PriceRow {
  return {
    id,
    microUsd: { peak: peakMicroUsd, offpeak: peakMicroUsd / 2 },
    decimals,
  };
}

export const MODELS: Readonly<Record<ModelId, ModelPrices>> = {
  flash: {
    id: 'flash',
    name: 'deepseek-flash',
    version: 'DeepSeek-V4.1-Flash-1017',
    rows: [
      row('cacheHit', 6_000, 3),
      row('cacheMiss', 300_000, 2),
      row('output', 1_200_000, 2),
    ],
  },
  pro: {
    id: 'pro',
    name: 'deepseek-v4-pro',
    version: 'DeepSeek-V4-Pro-0813',
    rows: [
      row('cacheHit', 44_000, 3),
      row('cacheMiss', 1_320_000, 2),
      row('output', 3_960_000, 2),
    ],
  },
};

export function getModel(id: ModelId): ModelPrices {
  return MODELS[id];
}

/** Format integer micro-USD per 1M tokens as a plain decimal string. */
export function formatMicroUsd(
  microUsd: number,
  decimals: number,
  separator: DecimalSeparator = '.',
): string {
  const text = (microUsd / 1_000_000).toFixed(decimals);
  return separator === ',' ? text.replace('.', ',') : text;
}

export function priceFor(
  model: ModelPrices,
  rowId: PriceRow['id'],
  tier: Tier,
): number {
  const priceRow = model.rows.find(row => row.id === rowId);
  if (!priceRow)
    throw new Error(`Unknown price row: ${rowId}`);
  return priceRow.microUsd[tier];
}
