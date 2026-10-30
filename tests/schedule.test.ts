// SPDX-License-Identifier: GPL-2.0-or-later

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DAY_MS,
  buildSegments,
  getStatus,
  nextChangeAt,
  nextChanges,
  previousChangeAt,
  pricePeriodAt,
  segmentAtTime,
  tierAt,
  upcomingPeriods,
} from '../src/pricing/schedule.js';
import { isChineseHoliday, yearsWithData } from '../src/pricing/holidays.js';

const at = (iso: string): number => Date.parse(iso);

test('peak windows use inclusive start and exclusive end', () => {
  assert.deepEqual(tierAt(at('2026-10-26T00:59:00Z')), {
    tier: 'offpeak',
    reason: 'off-hours',
  });
  assert.deepEqual(tierAt(at('2026-10-26T01:00:00Z')), {
    tier: 'peak',
    reason: 'peak-hours',
  });
  assert.deepEqual(tierAt(at('2026-10-26T03:59:59Z')), {
    tier: 'peak',
    reason: 'peak-hours',
  });
  assert.deepEqual(tierAt(at('2026-10-26T04:00:00Z')), {
    tier: 'offpeak',
    reason: 'off-hours',
  });
  assert.deepEqual(tierAt(at('2026-10-26T05:59:00Z')), {
    tier: 'offpeak',
    reason: 'off-hours',
  });
  assert.deepEqual(tierAt(at('2026-10-26T06:00:00Z')), {
    tier: 'peak',
    reason: 'peak-hours',
  });
  assert.deepEqual(tierAt(at('2026-10-26T09:59:59Z')), {
    tier: 'peak',
    reason: 'peak-hours',
  });
  assert.deepEqual(tierAt(at('2026-10-26T10:00:00Z')), {
    tier: 'offpeak',
    reason: 'off-hours',
  });
});

test('weekends are off-peak in full', () => {
  for (const iso of [
    '2026-10-31T02:00:00Z',
    '2026-10-31T09:00:00Z',
    '2026-11-01T07:00:00Z',
  ]) {
    assert.deepEqual(tierAt(at(iso)), {
      tier: 'offpeak',
      reason: 'weekend',
    });
  }
});

test('Chinese public holidays are off-peak all day', () => {
  assert.equal(isChineseHoliday('2026-10-01'), true);
  assert.equal(isChineseHoliday('2026-09-30'), false);

  assert.deepEqual(tierAt(at('2026-10-01T02:00:00Z')), {
    tier: 'offpeak',
    reason: 'holiday',
  });
  assert.deepEqual(tierAt(at('2026-10-05T07:00:00Z')), {
    tier: 'offpeak',
    reason: 'holiday',
  });
  // A holiday that falls on a weekend is reported as a weekend.
  assert.deepEqual(tierAt(at('2026-10-04T07:00:00Z')), {
    tier: 'offpeak',
    reason: 'weekend',
  });
});

test('next change skips the weekend', () => {
  assert.equal(
    nextChangeAt(at('2026-10-30T09:59:00Z')),
    at('2026-10-30T10:00:00Z'),
  );
  assert.equal(
    nextChangeAt(at('2026-10-30T10:00:00Z')),
    at('2026-11-02T01:00:00Z'),
  );
});

test('next change skips a full holiday week', () => {
  assert.equal(
    nextChangeAt(at('2026-09-30T23:00:00Z')),
    at('2026-10-08T01:00:00Z'),
  );
  // The holiday starts at midnight, but the tier was already off-peak since
  // the previous peak ended at 10:00 the day before.
  assert.equal(
    previousChangeAt(at('2026-10-01T02:00:00Z')),
    at('2026-09-30T10:00:00Z'),
  );
});

test('next changes list the following transitions with their tiers', () => {
  assert.deepEqual(nextChanges(at('2026-10-29T20:31:00Z'), 5), [
    { atMs: at('2026-10-30T01:00:00Z'), tier: 'peak' },
    { atMs: at('2026-10-30T04:00:00Z'), tier: 'offpeak' },
    { atMs: at('2026-10-30T06:00:00Z'), tier: 'peak' },
    { atMs: at('2026-10-30T10:00:00Z'), tier: 'offpeak' },
    { atMs: at('2026-11-02T01:00:00Z'), tier: 'peak' },
  ]);

  assert.deepEqual(nextChanges(at('2026-10-29T20:31:00Z'), 0), []);
});

test('upcoming periods include the current range and its end', () => {
  const now = at('2026-10-29T20:31:00Z');

  assert.deepEqual(upcomingPeriods(now, 5), [
    {
      startMs: at('2026-10-29T10:00:00Z'),
      endMs: at('2026-10-30T01:00:00Z'),
      tier: 'offpeak',
      current: true,
    },
    {
      startMs: at('2026-10-30T01:00:00Z'),
      endMs: at('2026-10-30T04:00:00Z'),
      tier: 'peak',
      current: false,
    },
    {
      startMs: at('2026-10-30T04:00:00Z'),
      endMs: at('2026-10-30T06:00:00Z'),
      tier: 'offpeak',
      current: false,
    },
    {
      startMs: at('2026-10-30T06:00:00Z'),
      endMs: at('2026-10-30T10:00:00Z'),
      tier: 'peak',
      current: false,
    },
    {
      startMs: at('2026-10-30T10:00:00Z'),
      endMs: at('2026-11-02T01:00:00Z'),
      tier: 'offpeak',
      current: false,
    },
    {
      startMs: at('2026-11-02T01:00:00Z'),
      endMs: at('2026-11-02T04:00:00Z'),
      tier: 'peak',
      current: false,
    },
  ]);

  assert.deepEqual(upcomingPeriods(now, 0), [
    {
      startMs: at('2026-10-29T10:00:00Z'),
      endMs: at('2026-10-30T01:00:00Z'),
      tier: 'offpeak',
      current: true,
    },
  ]);
});

test('previous change finds the start of the current tier', () => {
  assert.equal(
    previousChangeAt(at('2026-10-26T02:30:00Z')),
    at('2026-10-26T01:00:00Z'),
  );
  assert.equal(
    previousChangeAt(at('2026-10-26T04:00:00Z')),
    at('2026-10-26T04:00:00Z'),
  );
  assert.equal(
    previousChangeAt(at('2026-10-26T03:59:00Z')),
    at('2026-10-26T01:00:00Z'),
  );
});

test('segments are contiguous and cover the horizon exactly', () => {
  const now = at('2026-10-29T20:31:00Z');
  const status = getStatus(now);
  const { segments } = status;

  assert.ok(segments.length >= 2);
  assert.equal(segments[0].startMs, now);
  assert.equal(segments[segments.length - 1].endMs, now + DAY_MS);

  for (let i = 1; i < segments.length; i++)
    assert.equal(segments[i].startMs, segments[i - 1].endMs);

  for (const segment of segments)
    assert.ok(segment.endMs > segment.startMs);

  assert.equal(status.nextChangeMs, segments[1].startMs);
  assert.equal(
    segments.filter(segment => segment.tier === 'peak').length,
    2,
  );
});

test('segments do not merge different tiers', () => {
  const segments = buildSegments(at('2026-10-26T00:00:00Z'), 12 * 3_600_000);
  assert.deepEqual(
    segments.map(segment => segment.tier),
    ['offpeak', 'peak', 'offpeak', 'peak', 'offpeak'],
  );
});

test('finds the timeline segment for a hovered instant', () => {
  const status = getStatus(at('2026-10-29T20:31:00Z'));
  const first = status.segments[0];
  const peak = status.segments.find(segment => segment.tier === 'peak');
  const last = status.segments[status.segments.length - 1];

  assert.ok(peak);
  assert.equal(segmentAtTime(status.segments, first.startMs)?.tier, first.tier);
  assert.equal(
    segmentAtTime(status.segments, peak.startMs)?.startMs,
    peak.startMs,
  );
  assert.equal(segmentAtTime(status.segments, peak.endMs)?.tier, 'offpeak');
  assert.equal(segmentAtTime(status.segments, last.endMs)?.tier, last.tier);
});

test('price periods report their real bounds beyond the timeline horizon', () => {
  // Friday 10:00 UTC is Friday 04:00 in Mexico City: the start of the long
  // off-peak stretch that ends on Sunday night local time.
  const now = at('2026-10-30T10:00:00Z');

  assert.deepEqual(pricePeriodAt(now), {
    startMs: at('2026-10-30T10:00:00Z'),
    endMs: at('2026-11-02T01:00:00Z'),
    tier: 'offpeak',
  });

  // The drawn segment is clipped to the 24-hour window...
  const status = getStatus(now);
  assert.equal(status.segments[status.segments.length - 1].endMs, now + DAY_MS);

  // ...but the period keeps its real end when queried mid-period.
  assert.deepEqual(pricePeriodAt(at('2026-10-31T18:00:00Z')), {
    startMs: at('2026-10-30T10:00:00Z'),
    endMs: at('2026-11-02T01:00:00Z'),
    tier: 'offpeak',
  });
});

test('missing holiday calendars are reported, not guessed', () => {
  const status = getStatus(at('2027-01-05T02:00:00Z'));
  assert.deepEqual(status.missingHolidayYears, [2027]);
  assert.deepEqual(status.current, {
    tier: 'peak',
    reason: 'peak-hours',
  });
  assert.deepEqual(yearsWithData(), [2026]);
});
