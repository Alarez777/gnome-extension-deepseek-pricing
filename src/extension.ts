// SPDX-License-Identifier: GPL-2.0-or-later

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { IndicatorController } from './indicator.js';

export default class DeepSeekPricingExtension extends Extension {
  private _indicator: IndicatorController | null = null;

  enable(): void {
    const indicator = new IndicatorController({
      name: this.metadata.name,
      settings: this.getSettings(),
      extensionDir: this.dir,
      openPreferences: () => this.openPreferences(),
    });

    this._indicator = indicator;
    Main.panel.addToStatusArea(this.uuid, indicator.button);
  }

  disable(): void {
    this._indicator?.destroy();
    this._indicator = null;
  }
}
