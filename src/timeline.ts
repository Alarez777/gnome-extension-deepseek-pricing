// SPDX-License-Identifier: GPL-2.0-or-later

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import type { Language, Status } from './types.js';
import { CHEAP_COLOR, PEAK_COLOR, hexToRgba } from './colors.js';
import type { ClockFormat } from './pricing/clock.js';
import { formatLocalDateTime, formatLocalRange } from './pricing/format.js';
import {
  pricePeriodAt,
  segmentAtTime,
} from './pricing/schedule.js';
import type { Terms } from './pricing/terms.js';

const CHEAP = hexToRgba(CHEAP_COLOR);
const PEAK = hexToRgba(PEAK_COLOR);
const WIDTH = 320;
const HEIGHT = 18;
const TOOLTIP_OFFSET = 4;

type CairoContext = ReturnType<St.DrawingArea['get_context']>;

function roundedRect(
  cr: CairoContext,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  cr.newSubPath();
  cr.arc(x + width - r, y + r, r, -Math.PI / 2, 0);
  cr.arc(x + width - r, y + height - r, r, 0, Math.PI / 2);
  cr.arc(x + r, y + height - r, r, Math.PI / 2, Math.PI);
  cr.arc(x + r, y + r, r, Math.PI, (3 * Math.PI) / 2);
  cr.closePath();
}

export class Timeline {
  readonly actor: St.Widget;

  private readonly _area: St.DrawingArea;
  private readonly _tooltip: St.Label;

  private _status: Status | null = null;
  private _clockFormat: ClockFormat = '24h';
  private _language: Language = 'en';
  private _terms: Terms | null = null;
  private _hoverX: number | null = null;

  private _repaintId = 0;
  private _enterId = 0;
  private _motionId = 0;
  private _leaveId = 0;

  constructor() {
    this.actor = new St.Widget({
      layout_manager: new Clutter.FixedLayout(),
      width: WIDTH,
      height: HEIGHT,
      reactive: true,
    });

    this._area = new St.DrawingArea({
      style_class: 'deepseek-timeline',
      width: WIDTH,
      height: HEIGHT,
      reactive: false,
    });

    this._tooltip = new St.Label({
      style_class: 'deepseek-timeline-tooltip',
      visible: false,
      reactive: false,
    });

    this.actor.add_child(this._area);
    this.actor.add_child(this._tooltip);

    this._repaintId = this._area.connect('repaint', () => this._draw());
    this._enterId = this.actor.connect(
      'enter-event',
      (actor: Clutter.Actor, event: Clutter.Event) => this._onPointer(actor, event),
    );
    this._motionId = this.actor.connect(
      'motion-event',
      (actor: Clutter.Actor, event: Clutter.Event) => this._onPointer(actor, event),
    );
    this._leaveId = this.actor.connect('leave-event', () => this._onLeave());
  }

  setStatus(
    status: Status,
    clockFormat: ClockFormat,
    terms: Terms,
    language: Language,
  ): void {
    this._status = status;
    this._clockFormat = clockFormat;
    this._terms = terms;
    this._language = language;
    this._area.queue_repaint();

    if (this._hoverX !== null)
      this._updateTooltip();
  }

  /** Clear the hover marker, e.g. when the menu closes. */
  resetHover(): void {
    this._hoverX = null;
    this._tooltip.visible = false;
    this._area.queue_repaint();
  }

  destroy(): void {
    if (this._repaintId !== 0) {
      this._area.disconnect(this._repaintId);
      this._repaintId = 0;
    }
    if (this._enterId !== 0) {
      this.actor.disconnect(this._enterId);
      this._enterId = 0;
    }
    if (this._motionId !== 0) {
      this.actor.disconnect(this._motionId);
      this._motionId = 0;
    }
    if (this._leaveId !== 0) {
      this.actor.disconnect(this._leaveId);
      this._leaveId = 0;
    }

    this._status = null;
    this._terms = null;
    this._hoverX = null;
    this.actor.destroy();
  }

  private _onPointer(actor: Clutter.Actor, event: Clutter.Event): boolean {
    const [stageX] = event.get_coords();
    const [actorX] = actor.get_transformed_position();
    const x = Math.max(0, Math.min(WIDTH - 1, stageX - actorX));

    this._hoverX = x;
    this._area.queue_repaint();
    this._updateTooltip();
    return Clutter.EVENT_PROPAGATE;
  }

  private _onLeave(): boolean {
    this._hoverX = null;
    this._tooltip.visible = false;
    this._area.queue_repaint();
    return Clutter.EVENT_PROPAGATE;
  }

  private _updateTooltip(): void {
    const status = this._status;
    const terms = this._terms;
    const hoverX = this._hoverX;

    if (!status || !terms || hoverX === null || status.segments.length === 0) {
      this._tooltip.visible = false;
      return;
    }

    const duration =
      status.segments[status.segments.length - 1].endMs - status.nowMs;
    if (duration <= 0) {
      this._tooltip.visible = false;
      return;
    }

    const timeMs = status.nowMs + (hoverX / WIDTH) * duration;
    const segment = segmentAtTime(status.segments, timeMs);
    if (!segment) {
      this._tooltip.visible = false;
      return;
    }

    // Segments are clipped to the visible 24-hour window, but the tooltip
    // should report the real period: a cheap weekend can end days later.
    const period = pricePeriodAt(segment.startMs);
    const tier = period.tier === 'peak' ? terms.expensive : terms.cheap;
    const range = period.endMs === null
      ? formatLocalDateTime(period.startMs, this._clockFormat, this._language)
      : formatLocalRange(
        period.startMs,
        period.endMs,
        this._clockFormat,
        this._language,
      );

    this._tooltip.set_text(`${tier} · ${range}`);
    this._tooltip.show();

    const [, naturalWidth] = this._tooltip.get_preferred_width(-1);
    const [, naturalHeight] = this._tooltip.get_preferred_height(naturalWidth);
    const x = Math.max(
      0,
      Math.min(hoverX - naturalWidth / 2, WIDTH - naturalWidth),
    );

    this._tooltip.set_position(
      Math.round(x),
      Math.round(-naturalHeight - TOOLTIP_OFFSET),
    );
  }

  private _draw(): void {
    const cr = this._area.get_context();
    const [width, height] = this._area.get_surface_size();
    const status = this._status;

    if (!status || width <= 0 || height <= 0) {
      cr.$dispose();
      return;
    }

    const duration = status.segments.length > 0
      ? status.segments[status.segments.length - 1].endMs - status.nowMs
      : 0;

    // Base: off-peak (cheap) across the whole timeline.
    cr.setSourceRGBA(CHEAP.r, CHEAP.g, CHEAP.b, 0.9);
    roundedRect(cr, 0, 0, width, height, height / 2);
    cr.fill();

    if (duration > 0) {
      cr.save();
      roundedRect(cr, 0, 0, width, height, height / 2);
      cr.clip();

      for (const segment of status.segments) {
        if (segment.tier !== 'peak')
          continue;

        const x1 = ((segment.startMs - status.nowMs) / duration) * width;
        const x2 = ((segment.endMs - status.nowMs) / duration) * width;
        cr.setSourceRGBA(PEAK.r, PEAK.g, PEAK.b, 0.95);
        cr.rectangle(x1, 0, Math.max(0, x2 - x1), height);
        cr.fill();
      }

      // Faint six-hour guides.
      cr.setSourceRGBA(0, 0, 0, 0.12);
      cr.setLineWidth(1);
      for (let hours = 6; hours < 24; hours += 6) {
        const x = Math.round((hours / 24) * width) + 0.5;
        cr.moveTo(x, 2);
        cr.lineTo(x, height - 2);
        cr.stroke();
      }

      cr.restore();
    }

    // Border.
    cr.setSourceRGBA(0, 0, 0, 0.25);
    cr.setLineWidth(1);
    roundedRect(cr, 0.5, 0.5, width - 1, height - 1, height / 2);
    cr.stroke();

    // Hover marker. Scale the logical pointer position to the drawing surface
    // so it stays accurate on HiDPI displays.
    if (this._hoverX !== null && this._area.width > 0) {
      const scale = width / this._area.width;
      const x = Math.max(0, Math.min(width - 3, this._hoverX * scale));

      cr.setSourceRGBA(0, 0, 0, 0.4);
      cr.rectangle(x - 1, 0, 3, height);
      cr.fill();
      cr.setSourceRGBA(1, 1, 1, 0.95);
      cr.rectangle(x, 0, 1, height);
      cr.fill();
    }

    cr.$dispose();
  }
}
