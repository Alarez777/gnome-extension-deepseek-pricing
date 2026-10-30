// SPDX-License-Identifier: GPL-2.0-or-later

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import Pango from 'gi://Pango';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { Timeline } from './timeline.js';
import type { MessageKey, Translator } from './i18n/index.js';
import type {
  DecimalSeparator,
  ModelId,
  PriceRow,
  Status,
  Tier,
} from './types.js';
import type { ClockFormat } from './pricing/clock.js';
import {
  formatDuration,
  formatLocalDateTime,
  formatLocalRange,
  formatUtcTime,
} from './pricing/format.js';
import { type PricePeriod, upcomingPeriods } from './pricing/schedule.js';
import type { Terms } from './pricing/terms.js';
import {
  MODELS,
  OFFPEAK_DISCOUNT_PERCENT,
  PRICES_AS_OF,
  formatMicroUsd,
  getModel,
} from './pricing/prices.js';

const PRICING_URL = 'https://api-docs.deepseek.com/quick_start/pricing';
const UPCOMING_COUNT = 5;
const PERIOD_COUNT = UPCOMING_COUNT + 1;

const ROW_LABEL_KEYS: Record<PriceRow['id'], MessageKey> = {
  cacheHit: 'Input (cache hit)',
  cacheMiss: 'Input (cache miss)',
  output: 'Output',
};

export interface PricingMenuOptions {
  button: PanelMenu.Button;
  translator: Translator;
  openPreferences: () => void;
}

interface PriceRowActors {
  id: PriceRow['id'];
  now: St.Label;
  next: St.Label;
}

interface UpcomingRowActors {
  row: St.BoxLayout;
  dot: St.Widget;
  time: St.Label;
}

export class PricingMenu {
  private readonly _button: PanelMenu.Button;
  private _translator: Translator;
  private readonly _openPreferences: () => void;
  private readonly _timeline: Timeline;
  private readonly _rows: PriceRowActors[] = [];
  private readonly _rowNames = new Map<PriceRow['id'], St.Label>();
  private readonly _upcomingRows: UpcomingRowActors[] = [];

  private readonly _dot: St.Widget;
  private readonly _title: St.Label;
  private readonly _discount: St.Label;
  private readonly _countdown: St.Label;
  private readonly _nextWhen: St.Label;
  private readonly _axisNow: St.Label;
  private readonly _axisEnd: St.Label;
  private readonly _legendCheap: St.Label;
  private readonly _legendExpensive: St.Label;
  private readonly _modelName: St.Label;
  private readonly _modelVersion: St.Label;
  private readonly _unit: St.Label;
  private readonly _nowHeader: St.Label;
  private readonly _nextHeader: St.Label;
  private readonly _upcomingTitle: St.Label;
  private readonly _warning: St.Label;
  private readonly _data: St.Label;
  private readonly _prefsItem: PopupMenu.PopupMenuItem;
  private readonly _linkItem: PopupMenu.PopupMenuItem;

  private _status: Status | null = null;
  private _clockFormat: ClockFormat = '24h';
  private _terms: Terms | null = null;
  private _separator: DecimalSeparator = '.';

  constructor(options: PricingMenuOptions) {
    this._button = options.button;
    this._translator = options.translator;
    this._openPreferences = options.openPreferences;

    const _ = this._translator.t;
    const menu = this._button.menu as unknown as PopupMenu.PopupMenu;

    const item = new PopupMenu.PopupBaseMenuItem({
      reactive: false,
      can_focus: false,
    });
    item.style_class = 'deepseek-popup-item';

    const box = new St.BoxLayout({
      vertical: true,
      style_class: 'deepseek-popup',
      x_expand: true,
    });
    item.add_child(box);

    // Header -----------------------------------------------------------------
    const header = new St.BoxLayout({ style_class: 'deepseek-header' });
    this._dot = new St.Widget({
      style_class: 'deepseek-dot cheap',
      width: 10,
      height: 10,
      x_align: Clutter.ActorAlign.CENTER,
      y_align: Clutter.ActorAlign.CENTER,
    });
    this._title = new St.Label({ style_class: 'deepseek-title' });
    this._discount = new St.Label({ style_class: 'deepseek-dim' });
    this._discount.opacity = 170;
    header.add_child(this._dot);
    header.add_child(this._title);
    header.add_child(this._discount);
    box.add_child(header);

    // Countdown --------------------------------------------------------------
    this._countdown = new St.Label({
      style_class: 'deepseek-countdown',
      x_expand: true,
    });
    this._nextWhen = new St.Label({
      style_class: 'deepseek-dim',
      x_expand: true,
    });
    this._nextWhen.opacity = 170;
    box.add_child(this._countdown);
    box.add_child(this._nextWhen);

    // Timeline ---------------------------------------------------------------
    this._timeline = new Timeline();
    box.add_child(this._timeline.actor);

    const axis = new St.BoxLayout({ style_class: 'deepseek-axis' });
    this._axisNow = new St.Label({
      text: _('now'),
      style_class: 'deepseek-dim',
      x_expand: true,
    });
    this._axisEnd = new St.Label({
      text: _('in 24 h'),
      style_class: 'deepseek-dim',
    });
    this._axisNow.opacity = 160;
    this._axisEnd.opacity = 160;
    axis.add_child(this._axisNow);
    axis.add_child(this._axisEnd);
    box.add_child(axis);

    const legend = new St.BoxLayout({ style_class: 'deepseek-legend' });
    this._legendCheap = this._legendItem(legend, 'cheap');
    this._legendExpensive = this._legendItem(legend, 'peak');
    box.add_child(legend);

    // Prices -----------------------------------------------------------------
    const prices = new St.BoxLayout({
      vertical: true,
      style_class: 'deepseek-prices',
      x_expand: true,
    });

    const modelRow = new St.BoxLayout({ style_class: 'deepseek-model-row' });
    this._modelName = new St.Label({
      style_class: 'deepseek-model',
      x_expand: true,
    });
    this._modelVersion = new St.Label({ style_class: 'deepseek-dim' });
    this._modelVersion.opacity = 160;
    modelRow.add_child(this._modelName);
    modelRow.add_child(this._modelVersion);
    prices.add_child(modelRow);

    this._unit = new St.Label({
      text: _('USD per 1M tokens'),
      style_class: 'deepseek-dim',
    });
    this._unit.opacity = 160;
    prices.add_child(this._unit);

    const priceHeader = new St.BoxLayout({
      style_class: 'deepseek-price-row',
    });
    priceHeader.add_child(new St.Label({ text: '', x_expand: true }));
    this._nowHeader = new St.Label({
      text: _('Now'),
      style_class: 'deepseek-price-head',
    });
    this._nextHeader = new St.Label({
      text: '',
      style_class: 'deepseek-price-head',
    });
    this._nowHeader.clutter_text.set_line_alignment(Pango.Alignment.RIGHT);
    this._nextHeader.clutter_text.set_line_alignment(Pango.Alignment.RIGHT);
    priceHeader.add_child(this._nowHeader);
    priceHeader.add_child(this._nextHeader);
    prices.add_child(priceHeader);

    for (const priceRow of MODELS.flash.rows) {
      const line = new St.BoxLayout({ style_class: 'deepseek-price-row' });
      const name = new St.Label({
        text: _(ROW_LABEL_KEYS[priceRow.id]),
        x_expand: true,
      });
      const now = this._priceLabel();
      const next = this._priceLabel();
      line.add_child(name);
      line.add_child(now);
      line.add_child(next);
      prices.add_child(line);
      this._rowNames.set(priceRow.id, name);
      this._rows.push({ id: priceRow.id, now, next });
    }

    box.add_child(prices);

    // Upcoming changes -------------------------------------------------------
    const upcoming = new St.BoxLayout({
      vertical: true,
      style_class: 'deepseek-upcoming',
      x_expand: true,
    });
    this._upcomingTitle = new St.Label({
      text: _('Pricing periods'),
      style_class: 'deepseek-dim',
    });
    this._upcomingTitle.opacity = 170;
    upcoming.add_child(this._upcomingTitle);

    for (let i = 0; i < PERIOD_COUNT; i++) {
      const row = new St.BoxLayout({ style_class: 'deepseek-upcoming-row' });
      const dot = new St.Widget({
        style_class: 'deepseek-legend-dot cheap',
        width: 8,
        height: 8,
        y_align: Clutter.ActorAlign.CENTER,
      });
      const time = new St.Label({
        style_class: 'deepseek-upcoming-time',
        x_expand: true,
      });
      row.add_child(dot);
      row.add_child(time);
      upcoming.add_child(row);
      this._upcomingRows.push({ row, dot, time });
    }

    box.add_child(upcoming);

    // Footer -----------------------------------------------------------------
    this._warning = new St.Label({
      style_class: 'deepseek-warning',
      visible: false,
      x_expand: true,
    });
    this._warning.clutter_text.line_wrap = true;
    box.add_child(this._warning);

    this._data = new St.Label({
      style_class: 'deepseek-dim deepseek-data',
      x_expand: true,
    });
    this._data.clutter_text.line_wrap = true;
    this._data.opacity = 160;
    box.add_child(this._data);

    menu.addMenuItem(item);
    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this._prefsItem = new PopupMenu.PopupMenuItem(_('Preferences'));
    this._prefsItem.connect('activate', () => {
      menu.close();
      this._openPreferences();
    });
    menu.addMenuItem(this._prefsItem);

    this._linkItem = new PopupMenu.PopupMenuItem(_('Official pricing'));
    this._linkItem.connect('activate', () => {
      menu.close();
      openUri(PRICING_URL);
    });
    menu.addMenuItem(this._linkItem);
  }

  /** Switch language in place, then call update() to refresh dynamic labels. */
  setTranslator(translator: Translator): void {
    this._translator = translator;
    const _ = translator.t;

    this._axisNow.set_text(_('now'));
    this._axisEnd.set_text(_('in 24 h'));
    this._unit.set_text(_('USD per 1M tokens'));
    for (const [id, label] of this._rowNames)
      label.set_text(_(ROW_LABEL_KEYS[id]));
    this._upcomingTitle.set_text(_('Pricing periods'));
    this._prefsItem.label.set_text(_('Preferences'));
    this._linkItem.label.set_text(_('Official pricing'));
  }

  update(
    status: Status,
    modelId: ModelId,
    clockFormat: ClockFormat,
    terms: Terms,
    separator: DecimalSeparator,
  ): void {
    this._status = status;
    this._clockFormat = clockFormat;
    this._terms = terms;
    this._separator = separator;

    const _ = this._translator.t;
    const model = getModel(modelId);
    const tier = status.current.tier;
    const nextTier: Tier = tier === 'peak' ? 'offpeak' : 'peak';

    this._dot.style_class = `deepseek-dot ${tier === 'peak' ? 'peak' : 'cheap'}`;
    this._title.set_text(
      tier === 'peak' ? terms.expensiveTitle : terms.cheapTitle,
    );
    this._discount.set_text(
      tier === 'peak'
        ? _('full price')
        : `${OFFPEAK_DISCOUNT_PERCENT} % ${_('cheaper')}`,
    );

    this._legendCheap.set_text(terms.cheapLower);
    this._legendExpensive.set_text(terms.expensiveLower);

    this._modelName.set_text(model.name);
    this._modelVersion.set_text(model.version);
    this._nowHeader.set_text(_('Now'));
    this._nextHeader.set_text(tier === 'peak' ? terms.cheap : terms.expensive);

    for (const entry of this._rows) {
      const priceRow = model.rows.find(row => row.id === entry.id);
      if (!priceRow)
        continue;
      entry.now.set_text(
        formatMicroUsd(
          priceRow.microUsd[tier],
          priceRow.decimals,
          this._separator,
        ),
      );
      entry.next.set_text(
        formatMicroUsd(
          priceRow.microUsd[nextTier],
          priceRow.decimals,
          this._separator,
        ),
      );
    }

    if (status.missingHolidayYears.length > 0) {
      this._warning.set_text(
        `${_('Holiday calendar missing for')} ${status.missingHolidayYears.join(', ')}. ` +
          _('Only weekends have reduced pricing.'),
      );
      this._warning.visible = true;
    } else {
      this._warning.set_text('');
      this._warning.visible = false;
    }

    this._data.set_text(
      `${_('Prices as of')} ${PRICES_AS_OF} · ${_('official DeepSeek rates')}`,
    );

    this._timeline.setStatus(
      status,
      this._clockFormat,
      terms,
      this._translator.language,
    );

    const periods = upcomingPeriods(status.nowMs, UPCOMING_COUNT);
    for (let i = 0; i < this._upcomingRows.length; i++) {
      const entry = this._upcomingRows[i];
      const period = periods[i];
      entry.row.visible = period !== undefined;
      if (!period)
        continue;
      entry.dot.style_class =
        `deepseek-legend-dot ${period.tier === 'peak' ? 'peak' : 'cheap'}`;
      entry.time.set_text(this._periodLabel(period));
    }

    this.tick(status.nowMs);
  }

  /** Update the live countdown without recomputing the whole status. */
  tick(nowMs: number): void {
    const status = this._status;
    if (!status)
      return;

    const _ = this._translator.t;
    const terms = this._terms;
    const next = status.nextChangeMs;

    if (!terms)
      return;

    if (next === null) {
      this._countdown.set_text(_('No upcoming change'));
      this._nextWhen.set_text('');
      return;
    }

    const nextName = status.current.tier === 'peak'
      ? terms.cheap
      : terms.expensive;
    this._countdown.set_text(
      `${nextName} ${_('in')} ${formatDuration(next - nowMs)}`,
    );
    this._nextWhen.set_text(
      `${formatLocalDateTime(
        next,
        this._clockFormat,
        this._translator.language,
      )} ${_('local')} · ` +
        `${formatUtcTime(
          next,
          this._clockFormat,
          this._translator.language,
        )} UTC`,
    );
  }

  hideHover(): void {
    this._timeline.resetHover();
  }

  destroy(): void {
    this._timeline.destroy();
    this._status = null;
  }

  private _periodLabel(period: PricePeriod): string {
    const language = this._translator.language;
    const range = period.endMs === null
      ? formatLocalDateTime(period.startMs, this._clockFormat, language)
      : formatLocalRange(
        period.startMs,
        period.endMs,
        this._clockFormat,
        language,
      );

    return period.current
      ? `${range} (${this._translator.t('current')})`
      : range;
  }

  private _legendItem(
    container: St.BoxLayout,
    styleClass: string,
  ): St.Label {
    const box = new St.BoxLayout({ style_class: 'deepseek-legend-item' });
    const dot = new St.Widget({
      style_class: `deepseek-legend-dot ${styleClass}`,
      width: 8,
      height: 8,
      y_align: Clutter.ActorAlign.CENTER,
    });
    const label = new St.Label({ text: '', style_class: 'deepseek-dim' });
    label.opacity = 170;
    box.add_child(dot);
    box.add_child(label);
    container.add_child(box);
    return label;
  }

  private _priceLabel(): St.Label {
    const label = new St.Label({ style_class: 'deepseek-price' });
    label.clutter_text.set_line_alignment(Pango.Alignment.RIGHT);
    return label;
  }
}

function openUri(uri: string): void {
  try {
    Gio.AppInfo.launch_default_for_uri(uri, null);
  } catch (e) {
    logError(e as Error, 'DeepSeek Pricing: failed to open pricing page');
  }
}
