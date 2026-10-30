// SPDX-License-Identifier: GPL-2.0-or-later

export type Tier = 'peak' | 'offpeak';

export type Reason = 'peak-hours' | 'off-hours' | 'weekend' | 'holiday';

export type ModelId = 'flash' | 'pro';

export type PanelMode = 'icon' | 'status' | 'countdown';

export type TimeFormat = 'system' | '12h' | '24h';

export type Terminology = 'plain' | 'official';

export type Language = 'en' | 'es';

export type LanguageSetting = 'auto' | Language;

export type DecimalSeparator = '.' | ',';

export type DecimalSeparatorSetting = 'auto' | 'point' | 'comma';

export interface TierInfo {
  tier: Tier;
  reason: Reason;
}

export interface Segment {
  startMs: number;
  endMs: number;
  tier: Tier;
}

export interface Status {
  /** The instant the status was computed for. */
  nowMs: number;
  current: TierInfo;
  /** When the current price tier started. */
  currentStartMs: number;
  /** When the current price tier ends, or null if unknown. */
  nextChangeMs: number | null;
  /** Contiguous segments covering [nowMs, nowMs + horizon]. */
  segments: Segment[];
  /** Years in the horizon for which no holiday calendar is bundled. */
  missingHolidayYears: number[];
}

export interface PriceRow {
  id: 'cacheHit' | 'cacheMiss' | 'output';
  /** Integer micro-USD per 1M tokens, to avoid floating point rounding. */
  microUsd: Record<Tier, number>;
  decimals: number;
}

export interface ModelPrices {
  id: ModelId;
  /** API model name, e.g. "deepseek-flash". */
  name: string;
  /** Snapshot name from the pricing page. */
  version: string;
  rows: PriceRow[];
}
