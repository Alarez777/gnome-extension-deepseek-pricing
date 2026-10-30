// SPDX-License-Identifier: GPL-2.0-or-later

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { createTranslator } from './i18n/index.js';
import type {
  DecimalSeparatorSetting,
  LanguageSetting,
  PanelMode,
  Terminology,
  TimeFormat,
} from './types.js';
import { HOLIDAY_DATA_UPDATED, yearsWithData } from './pricing/holidays.js';
import { PRICES_AS_OF } from './pricing/prices.js';

const PANEL_MODES: PanelMode[] = ['icon', 'status', 'countdown'];
const TIME_FORMATS: TimeFormat[] = ['system', '12h', '24h'];
const TERMINOLOGIES: Terminology[] = ['plain', 'official'];
const LANGUAGES: LanguageSetting[] = ['auto', 'en', 'es'];
const DECIMAL_SEPARATORS: DecimalSeparatorSetting[] = ['auto', 'point', 'comma'];
const PRICING_URL = 'https://api-docs.deepseek.com/quick_start/pricing';

export default class DeepSeekPricingPreferences extends ExtensionPreferences {
  private _window: Adw.PreferencesWindow | null = null;
  private _settings: Gio.Settings | null = null;
  private _pages: Adw.PreferencesPage[] = [];

  fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
    this._window = window;
    const settings = this.getSettings();
    this._settings = settings;
    this._render();

    window.connect('close-request', () => {
      this._window = null;
      this._settings = null;
      return false;
    });

    settings.connect('changed::language', () => {
      // Defer the rebuild: the combo row that emitted the change is about to
      // be destroyed with the rest of the page.
      GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
        this._render();
        return GLib.SOURCE_REMOVE;
      });
    });

    return Promise.resolve();
  }

  private _render(): void {
    const window = this._window;
    const settings = this._settings;
    if (!window || !settings)
      return;

    for (const page of this._pages)
      window.remove(page);
    this._pages = [];

    const _ = createTranslator(settings.get_string('language')).t;

    const page = new Adw.PreferencesPage({
      title: _('General'),
      iconName: 'preferences-system-symbolic',
    });
    window.add(page);
    this._pages.push(page);

    const languageGroup = new Adw.PreferencesGroup({
      title: _('Language and region'),
    });
    page.add(languageGroup);

    const languageValues = LANGUAGES;
    const storedLanguage = settings.get_string('language');
    const languageIndex = Math.max(
      0,
      languageValues.indexOf(storedLanguage as LanguageSetting),
    );
    const languageRow = new Adw.ComboRow({
      title: _('Language'),
      subtitle: _('Changes the language of the panel, menu and preferences'),
      model: Gtk.StringList.new([
        _('Automatic (system)'),
        'English',
        'Español',
      ]),
      selected: languageIndex,
    });
    languageRow.connect('notify::selected', () => {
      settings.set_string(
        'language',
        languageValues[languageRow.selected] ?? 'auto',
      );
    });
    languageGroup.add(languageRow);

    const separatorValues = DECIMAL_SEPARATORS;
    const storedSeparator = settings.get_string('decimal-separator');
    const separatorIndex = Math.max(
      0,
      separatorValues.indexOf(storedSeparator as DecimalSeparatorSetting),
    );
    const separatorRow = new Adw.ComboRow({
      title: _('Decimal separator'),
      subtitle: _('Automatic follows the region of your system'),
      model: Gtk.StringList.new([
        _('Automatic (system)'),
        _('Point (0.003)'),
        _('Comma (0,003)'),
      ]),
      selected: separatorIndex,
    });
    separatorRow.connect('notify::selected', () => {
      settings.set_string(
        'decimal-separator',
        separatorValues[separatorRow.selected] ?? 'auto',
      );
    });
    languageGroup.add(separatorRow);

    const panelGroup = new Adw.PreferencesGroup({
      title: _('Panel'),
      description: _('How the current DeepSeek price tier is shown in the top bar.'),
    });
    page.add(panelGroup);

    const modelRow = new Adw.ComboRow({
      title: _('Model'),
      subtitle: _('Rates shown in the popup menu'),
      model: Gtk.StringList.new([_('DeepSeek Flash'), _('DeepSeek Pro')]),
      selected: settings.get_string('model') === 'pro' ? 1 : 0,
    });
    modelRow.connect('notify::selected', () => {
      settings.set_string('model', modelRow.selected === 1 ? 'pro' : 'flash');
    });
    panelGroup.add(modelRow);

    const modeValues = PANEL_MODES;
    const storedMode = settings.get_string('panel-mode');
    const modeIndex = Math.max(0, modeValues.indexOf(storedMode as PanelMode));
    const modeRow = new Adw.ComboRow({
      title: _('Display'),
      subtitle: _('Choose how much information to show next to the icon'),
      model: Gtk.StringList.new([
        _('Icon only'),
        _('Icon and state'),
        _('Icon and countdown'),
      ]),
      selected: modeIndex,
    });
    modeRow.connect('notify::selected', () => {
      const mode = modeValues[modeRow.selected] ?? 'icon';
      settings.set_string('panel-mode', mode);
    });
    panelGroup.add(modeRow);

    const storedTimeFormat = settings.get_string('time-format');
    const timeIndex = Math.max(
      0,
      TIME_FORMATS.indexOf(storedTimeFormat as TimeFormat),
    );
    const timeRow = new Adw.ComboRow({
      title: _('Time format'),
      subtitle: _('Follows the system clock unless you override it'),
      model: Gtk.StringList.new([
        _('System'),
        _('12-hour'),
        _('24-hour'),
      ]),
      selected: timeIndex,
    });
    timeRow.connect('notify::selected', () => {
      settings.set_string(
        'time-format',
        TIME_FORMATS[timeRow.selected] ?? 'system',
      );
    });
    panelGroup.add(timeRow);

    const storedTerminology = settings.get_string('terminology');
    const terminologyIndex = Math.max(
      0,
      TERMINOLOGIES.indexOf(storedTerminology as Terminology),
    );
    const terminologyRow = new Adw.ComboRow({
      title: _('Terminology'),
      subtitle: _('Applies to the panel and menu'),
      model: Gtk.StringList.new([
        _('Cheap / Expensive'),
        _('Off-peak / Peak'),
      ]),
      selected: terminologyIndex,
    });
    terminologyRow.connect('notify::selected', () => {
      settings.set_string(
        'terminology',
        TERMINOLOGIES[terminologyRow.selected] ?? 'plain',
      );
    });
    panelGroup.add(terminologyRow);

    const progressRow = new Adw.SwitchRow({
      title: _('Show progress bar'),
      subtitle: _('Fills as the current price period elapses'),
      active: settings.get_boolean('show-progress'),
    });
    progressRow.connect('notify::active', () => {
      settings.set_boolean('show-progress', progressRow.active);
    });
    panelGroup.add(progressRow);

    const dataGroup = new Adw.PreferencesGroup({
      title: _('Data'),
      description: _('Dates of the bundled rates and holiday calendar.'),
    });
    page.add(dataGroup);

    const priceRow = new Adw.ActionRow({
      title: _('Prices'),
      subtitle: `${_('As of')} ${PRICES_AS_OF} · ${_('official DeepSeek rates')}`,
    });
    dataGroup.add(priceRow);

    const holidayYears = yearsWithData().join(', ');
    const holidayRow = new Adw.ActionRow({
      title: _('Chinese public holidays'),
      subtitle: `${holidayYears} · ${_('updated')} ${HOLIDAY_DATA_UPDATED}`,
    });
    dataGroup.add(holidayRow);

    const linkRow = new Adw.ActionRow({
      title: _('Official pricing'),
      subtitle: PRICING_URL,
    });
    const linkButton = new Gtk.LinkButton({
      uri: PRICING_URL,
      label: _('Open'),
    });
    linkRow.add_suffix(linkButton);
    linkRow.activatable_widget = linkButton;
    dataGroup.add(linkRow);

    const aboutGroup = new Adw.PreferencesGroup({ title: _('About') });
    page.add(aboutGroup);

    aboutGroup.add(
      new Adw.ActionRow({
        title: _('Disclaimer'),
        subtitle: _('Not affiliated with or endorsed by DeepSeek.'),
      }),
    );

    aboutGroup.add(
      new Adw.ActionRow({
        title: _('Peak hours'),
        subtitle: _('01:00–04:00 and 06:00–10:00 UTC, Monday to Friday, excluding Chinese public holidays.'),
      }),
    );

    aboutGroup.add(
      new Adw.ActionRow({
        title: _('Rest of the day'),
        subtitle: _('All other hours, including weekends and Chinese public holidays.'),
      }),
    );
  }
}
