// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Chinese public holidays that DeepSeek excludes from peak pricing.
 *
 * Source: https://github.com/NateScarlet/holiday-cn (generated from the
 * official State Council notices at https://www.gov.cn/).
 *
 * Only days with `isOffDay: true` are listed: DeepSeek treats full Chinese
 * public holidays as off-peak. Make-up working days that fall on a weekend
 * stay off-peak anyway, because weekends are always off-peak.
 *
 * The 2027 calendar is published around November 2026. Add it here (and bump
 * HOLIDAY_DATA_UPDATED) when it becomes available. Missing years degrade
 * gracefully to weekday/weekend rules, and the menu warns about it.
 */
const CN_HOLIDAYS: Readonly<Record<number, readonly string[]>> = {
  2026: [
    '2026-01-01',
    '2026-01-02',
    '2026-01-03',
    '2026-02-15',
    '2026-02-16',
    '2026-02-17',
    '2026-02-18',
    '2026-02-19',
    '2026-02-20',
    '2026-02-21',
    '2026-02-22',
    '2026-02-23',
    '2026-04-04',
    '2026-04-05',
    '2026-04-06',
    '2026-05-01',
    '2026-05-02',
    '2026-05-03',
    '2026-05-04',
    '2026-05-05',
    '2026-06-19',
    '2026-06-20',
    '2026-06-21',
    '2026-09-25',
    '2026-09-26',
    '2026-09-27',
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
  ],
};

export const HOLIDAY_DATA_UPDATED = '2026-10-29';

export function isChineseHoliday(dateKey: string): boolean {
  const year = Number.parseInt(dateKey.slice(0, 4), 10);
  return CN_HOLIDAYS[year]?.includes(dateKey) ?? false;
}

export function yearsWithData(): number[] {
  return Object.keys(CN_HOLIDAYS)
    .map(year => Number.parseInt(year, 10))
    .sort((a, b) => a - b);
}
