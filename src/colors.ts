// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Keep these in sync with the `.cheap` / `.peak` rules in stylesheet.css and
 * with the fills of icons/whale-cheap.svg and icons/whale-peak.svg.
 */
export const CHEAP_COLOR = '#2EC27E';
export const PEAK_COLOR = '#E5A50A';

export interface Rgba {
  r: number;
  g: number;
  b: number;
}

export function hexToRgba(hex: string): Rgba {
  const value = hex.replace('#', '');
  return {
    r: Number.parseInt(value.slice(0, 2), 16) / 255,
    g: Number.parseInt(value.slice(2, 4), 16) / 255,
    b: Number.parseInt(value.slice(4, 6), 16) / 255,
  };
}
