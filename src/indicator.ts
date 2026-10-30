// SPDX-License-Identifier: GPL-2.0-or-later

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { PricingMenu } from './menu.js';
import {
  type Translator,
  createTranslator,
  detectLanguageNames,
} from './i18n/index.js';
import { decimalSeparatorForSetting } from './i18n/locale.js';
import type {
  DecimalSeparator,
  ModelId,
  PanelMode,
  Status,
  Terminology,
} from './types.js';
import { type ClockFormat, effectiveClockFormat } from './pricing/clock.js';
import { formatDuration } from './pricing/format.js';
import { getStatus } from './pricing/schedule.js';
import { type Terms, termsFor } from './pricing/terms.js';

const SAFETY_TICK_SECONDS = 60;
const TRANSITION_SLACK_MS = 1_000;
const MAX_TRANSITION_DELAY_MS = 6 * 3_600_000;

export interface IndicatorOptions {
  name: string;
  settings: Gio.Settings;
  extensionDir: Gio.File;
  openPreferences: () => void;
}

export class IndicatorController {
  readonly button: PanelMenu.Button;

  private readonly _settings: Gio.Settings;
  private readonly _desktopSettings: Gio.Settings;
  private readonly _localeNames: string[];
  private _translator: Translator;
  private _separator: DecimalSeparator;
  private readonly _menu: PricingMenu;
  private readonly _icon: St.Icon;
  private readonly _progressTrack: St.Widget;
  private readonly _progressFill: St.Widget;
  private readonly _panelLabel: St.Label;
  // @girs/gnome-shell 48 bundles an older Gio type package than @girs/gjs,
  // so a nominally typed Gio.Icon is rejected by St.Icon.gicon. The runtime
  // object is identical; keep this boundary untyped.
  private readonly _cheapIcon: any;
  private readonly _peakIcon: any;

  private _status: Status | null = null;
  private _model: ModelId;
  private _panelMode: PanelMode;
  private _clockFormat: ClockFormat;
  private _terminology: Terminology;
  private _lastPeak: boolean | null = null;
  private _progressFraction = 0;
  private _progressWidthId = 0;
  private _settingsId = 0;
  private _desktopSettingsId = 0;
  private _menuOpenId = 0;
  private _tickId = 0;
  private _transitionId = 0;
  private _countdownId = 0;
  private _scheduledFor: number | null = null;

  constructor(options: IndicatorOptions) {
    this._settings = options.settings;
    this._localeNames = detectLanguageNames();
    this._translator = createTranslator(
      this._settings.get_string('language'),
      this._localeNames,
    );
    this._separator = decimalSeparatorForSetting(
      this._settings.get_string('decimal-separator'),
      this._localeNames,
    );

    this._model = normalizeModel(this._settings.get_string('model'));
    this._panelMode = normalizePanelMode(this._settings.get_string('panel-mode'));
    this._desktopSettings = new Gio.Settings({
      schema_id: 'org.gnome.desktop.interface',
    });
    this._clockFormat = this._computeClockFormat();
    this._terminology = normalizeTerminology(
      this._settings.get_string('terminology'),
    );

    this.button = new PanelMenu.Button(0.0, options.name, false);

    const icons = options.extensionDir.get_child('icons');
    this._cheapIcon = loadIcon(icons, 'whale-cheap.svg');
    this._peakIcon = loadIcon(icons, 'whale-peak.svg');

    const stack = new St.BoxLayout({
      vertical: true,
      style_class: 'deepseek-panel-stack',
      // El ButtonBox de GNOME Shell estira a su hijo a todo el alto de la
      // barra, así que un wrapper con BinLayout es lo que permite centrar
      // el bloque (icono/texto + progreso) verticalmente.
      y_align: Clutter.ActorAlign.CENTER,
    });
    const content = new St.BoxLayout({ style_class: 'deepseek-panel-content' });

    this._icon = new St.Icon({
      gicon: this._cheapIcon,
      icon_size: 16,
      x_align: Clutter.ActorAlign.CENTER,
      y_align: Clutter.ActorAlign.CENTER,
    });

    this._progressFill = new St.Widget({
      style_class: 'deepseek-progress-fill cheap',
      width: 0,
      height: 2,
      // BinLayout solo respeta x_align en los hijos que expanden; sin esto
      // el relleno se centra dentro del track en lugar de crecer desde la
      // izquierda.
      x_expand: true,
      x_align: Clutter.ActorAlign.START,
      y_align: Clutter.ActorAlign.CENTER,
    });

    this._progressTrack = new St.Widget({
      layout_manager: new Clutter.BinLayout(),
      style_class: 'deepseek-progress-track',
      height: 2,
      x_align: Clutter.ActorAlign.FILL,
    });
    this._progressTrack.add_child(this._progressFill);
    this._progressTrack.visible = this._settings.get_boolean('show-progress');
    this._progressWidthId = this._progressTrack.connect(
      'notify::width',
      () => this._updateProgressWidth(),
    );

    this._panelLabel = new St.Label({
      style_class: 'deepseek-panel-label',
      visible: false,
      y_align: Clutter.ActorAlign.CENTER,
    });

    content.add_child(this._icon);
    content.add_child(this._panelLabel);
    stack.add_child(content);
    stack.add_child(this._progressTrack);

    const panelRoot = new St.Widget({
      layout_manager: new Clutter.BinLayout(),
    });
    panelRoot.add_child(stack);
    this.button.add_child(panelRoot);

    this._menu = new PricingMenu({
      button: this.button,
      translator: this._translator,
      openPreferences: options.openPreferences,
    });

    const menu = this.button.menu as unknown as PopupMenu.PopupMenu;
    this._menuOpenId = menu.connect(
      'open-state-changed',
      (_menu, open: boolean) => {
        if (open) {
          this.refresh();
          this._startCountdown();
        } else {
          this._stopCountdown();
          this._menu.hideHover();
        }
        return undefined;
      },
    );

    this._settingsId = this._settings.connect('changed', (_settings, key) => {
      this._onSettingsChanged(key);
    });

    this._desktopSettingsId = this._desktopSettings.connect(
      'changed::clock-format',
      () => {
        this._clockFormat = this._computeClockFormat();
        this.refresh();
      },
    );

    this.refresh();
    this._tickId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      SAFETY_TICK_SECONDS,
      () => {
        this.refresh();
        return GLib.SOURCE_CONTINUE;
      },
    );
  }

  refresh(): void {
    const status = getStatus(Date.now());
    this._status = status;

    const peak = status.current.tier === 'peak';
    if (this._lastPeak !== peak) {
      this._lastPeak = peak;
      this._icon.gicon = peak ? this._peakIcon : this._cheapIcon;
      this._progressFill.style_class =
        `deepseek-progress-fill ${peak ? 'peak' : 'cheap'}`;
    }

    const total = status.nextChangeMs === null
      ? 0
      : status.nextChangeMs - status.currentStartMs;
    const elapsed = status.nowMs - status.currentStartMs;
    this._progressFraction = total > 0 ? clamp(elapsed / total, 0, 1) : 0;
    this._updateProgressWidth();

    const terms = termsFor(this._terminology, this._translator.t);
    this._updatePanelLabel(status, terms);
    this._menu.update(
      status,
      this._model,
      this._clockFormat,
      terms,
      this._separator,
    );
    this.button.set_accessible_name(this._accessibleName(status, terms));
    this._scheduleTransition(status);
  }

  destroy(): void {
    if (this._tickId !== 0) {
      GLib.source_remove(this._tickId);
      this._tickId = 0;
    }
    this._stopCountdown();
    if (this._transitionId !== 0) {
      GLib.source_remove(this._transitionId);
      this._transitionId = 0;
    }
    if (this._progressWidthId !== 0) {
      this._progressTrack.disconnect(this._progressWidthId);
      this._progressWidthId = 0;
    }
    if (this._settingsId !== 0) {
      this._settings.disconnect(this._settingsId);
      this._settingsId = 0;
    }
    if (this._desktopSettingsId !== 0) {
      this._desktopSettings.disconnect(this._desktopSettingsId);
      this._desktopSettingsId = 0;
    }
    if (this._menuOpenId !== 0) {
      const menu = this.button.menu as unknown as PopupMenu.PopupMenu;
      menu.disconnect(this._menuOpenId);
      this._menuOpenId = 0;
    }

    this._menu.destroy();
    this.button.destroy();
    this._status = null;
  }

  private _onSettingsChanged(key: string): void {
    switch (key) {
      case 'model':
        this._model = normalizeModel(this._settings.get_string('model'));
        break;
      case 'panel-mode':
        this._panelMode = normalizePanelMode(
          this._settings.get_string('panel-mode'),
        );
        break;
      case 'show-progress':
        this._progressTrack.visible =
          this._settings.get_boolean('show-progress');
        this._updateProgressWidth();
        break;
      case 'time-format':
        this._clockFormat = this._computeClockFormat();
        break;
      case 'terminology':
        this._terminology = normalizeTerminology(
          this._settings.get_string('terminology'),
        );
        break;
      case 'language':
        this._translator = createTranslator(
          this._settings.get_string('language'),
          this._localeNames,
        );
        this._menu.setTranslator(this._translator);
        break;
      case 'decimal-separator':
        this._separator = decimalSeparatorForSetting(
          this._settings.get_string('decimal-separator'),
          this._localeNames,
        );
        break;
      default:
        return;
    }

    this.refresh();
  }

  private _updateProgressWidth(): void {
    const width = this._progressTrack.width;
    const fillWidth = width > 0
      ? Math.round(width * this._progressFraction)
      : 0;
    this._progressFill.set_width(Math.max(0, Math.min(width, fillWidth)));
  }

  private _computeClockFormat(): ClockFormat {
    return effectiveClockFormat(
      this._settings.get_string('time-format'),
      this._desktopSettings.get_string('clock-format'),
    );
  }

  private _updatePanelLabel(status: Status, terms: Terms): void {
    const peak = status.current.tier === 'peak';

    if (this._panelMode === 'icon') {
      this._panelLabel.visible = false;
      return;
    }

    this._panelLabel.visible = true;

    if (this._panelMode === 'status') {
      this._panelLabel.set_text(peak ? terms.expensive : terms.cheap);
      return;
    }

    this._panelLabel.set_text(
      status.nextChangeMs === null
        ? '—'
        : formatDuration(status.nextChangeMs - status.nowMs),
    );
  }

  private _accessibleName(status: Status, terms: Terms): string {
    const _ = this._translator.t;
    const peak = status.current.tier === 'peak';
    const state = peak ? terms.expensiveTitle : terms.cheapTitle;

    if (status.nextChangeMs === null)
      return state;

    const next = peak ? terms.cheap : terms.expensive;
    return `${state}. ${next} ${_('in')} ${formatDuration(status.nextChangeMs - status.nowMs)}`;
  }

  private _scheduleTransition(status: Status): void {
    const next = status.nextChangeMs;

    if (this._transitionId !== 0 && this._scheduledFor === next)
      return;

    if (this._transitionId !== 0) {
      GLib.source_remove(this._transitionId);
      this._transitionId = 0;
    }

    this._scheduledFor = next;
    if (next === null)
      return;

    const delay = Math.max(
      TRANSITION_SLACK_MS,
      Math.min(next - status.nowMs + TRANSITION_SLACK_MS, MAX_TRANSITION_DELAY_MS),
    );

    this._transitionId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      delay,
      () => {
        this._transitionId = 0;
        this._scheduledFor = null;
        this.refresh();
        return GLib.SOURCE_REMOVE;
      },
    );
  }

  private _startCountdown(): void {
    if (this._countdownId !== 0)
      return;

    this._countdownId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      1,
      () => {
        const now = Date.now();
        const next = this._status?.nextChangeMs ?? null;

        if (next !== null && now >= next)
          this.refresh();
        else
          this._menu.tick(now);

        return GLib.SOURCE_CONTINUE;
      },
    );
  }

  private _stopCountdown(): void {
    if (this._countdownId !== 0) {
      GLib.source_remove(this._countdownId);
      this._countdownId = 0;
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeModel(value: string): ModelId {
  return value === 'pro' ? 'pro' : 'flash';
}

function normalizePanelMode(value: string): PanelMode {
  return value === 'status' || value === 'countdown' ? value : 'icon';
}

function normalizeTerminology(value: string): Terminology {
  return value === 'official' ? 'official' : 'plain';
}

function loadIcon(dir: Gio.File, name: string): any {
  const file = dir.get_child(name);
  if (file.query_exists(null)) {
    const path = file.get_path();
    if (path)
      return Gio.icon_new_for_string(path);
  }
  return Gio.icon_new_for_string('dialog-information-symbolic');
}
