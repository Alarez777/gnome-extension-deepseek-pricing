// SPDX-License-Identifier: GPL-2.0-or-later

import type { MessageKey } from '../i18n/messages.js';
import type { Terminology } from '../types.js';

export interface Terms {
  /** Short label, e.g. "Barato" / "Valle". */
  cheap: string;
  /** Short label, e.g. "Caro" / "Pico". */
  expensive: string;
  /** Menu title, e.g. "Tarifa barata" / "Tarifa valle". */
  cheapTitle: string;
  /** Menu title, e.g. "Tarifa cara" / "Tarifa pico". */
  expensiveTitle: string;
  /** Lowercase legend label, e.g. "barato" / "valle". */
  cheapLower: string;
  /** Lowercase legend label, e.g. "caro" / "pico". */
  expensiveLower: string;
}

export function termsFor(
  terminology: Terminology | string,
  gettext: (text: MessageKey) => string,
): Terms {
  if (terminology === 'official') {
    return {
      cheap: gettext('Off-peak'),
      expensive: gettext('Peak'),
      cheapTitle: gettext('Off-peak pricing'),
      expensiveTitle: gettext('Peak pricing'),
      cheapLower: gettext('off-peak'),
      expensiveLower: gettext('peak'),
    };
  }

  return {
    cheap: gettext('Cheap'),
    expensive: gettext('Expensive'),
    cheapTitle: gettext('Cheap pricing'),
    expensiveTitle: gettext('Expensive pricing'),
    cheapLower: gettext('cheap'),
    expensiveLower: gettext('expensive'),
  };
}
