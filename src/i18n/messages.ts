// SPDX-License-Identifier: GPL-2.0-or-later

import type { Language } from '../types.js';

/**
 * Every user-visible string, keyed by its English text. English is the source
 * catalog: adding a key here forces the Spanish catalog to translate it.
 */
export const EN = {
  now: 'now',
  'in 24 h': 'in 24 h',
  cheap: 'cheap',
  peak: 'peak',
  'off-peak': 'off-peak',
  expensive: 'expensive',
  Now: 'Now',
  'Input (cache hit)': 'Input (cache hit)',
  'Input (cache miss)': 'Input (cache miss)',
  Output: 'Output',
  'USD per 1M tokens': 'USD per 1M tokens',
  Preferences: 'Preferences',
  'Official pricing': 'Official pricing',
  'Peak pricing': 'Peak pricing',
  'Off-peak pricing': 'Off-peak pricing',
  'Cheap pricing': 'Cheap pricing',
  'Expensive pricing': 'Expensive pricing',
  'full price': 'full price',
  cheaper: 'cheaper',
  Cheap: 'Cheap',
  Expensive: 'Expensive',
  'Off-peak': 'Off-peak',
  Peak: 'Peak',
  in: 'in',
  local: 'local',
  'No upcoming change': 'No upcoming change',
  'Pricing periods': 'Pricing periods',
  current: 'current',
  'Holiday calendar missing for': 'Holiday calendar missing for',
  'Only weekends have reduced pricing.': 'Only weekends have reduced pricing.',
  'Prices as of': 'Prices as of',
  'official DeepSeek rates': 'official DeepSeek rates',
  'Peak hours': 'Peak hours',
  General: 'General',
  Panel: 'Panel',
  'How the current DeepSeek price tier is shown in the top bar.':
    'How the current DeepSeek price tier is shown in the top bar.',
  Model: 'Model',
  'Rates shown in the popup menu': 'Rates shown in the popup menu',
  'DeepSeek Flash': 'DeepSeek Flash',
  'DeepSeek Pro': 'DeepSeek Pro',
  Display: 'Display',
  'Choose how much information to show next to the icon':
    'Choose how much information to show next to the icon',
  'Icon only': 'Icon only',
  'Icon and state': 'Icon and state',
  'Icon and countdown': 'Icon and countdown',
  'Time format': 'Time format',
  'Follows the system clock unless you override it':
    'Follows the system clock unless you override it',
  System: 'System',
  '12-hour': '12-hour',
  '24-hour': '24-hour',
  Terminology: 'Terminology',
  'Applies to the panel and menu': 'Applies to the panel and menu',
  'Cheap / Expensive': 'Cheap / Expensive',
  'Off-peak / Peak': 'Off-peak / Peak',
  'Show progress bar': 'Show progress bar',
  'Fills as the current price period elapses':
    'Fills as the current price period elapses',
  Data: 'Data',
  'Dates of the bundled rates and holiday calendar.':
    'Dates of the bundled rates and holiday calendar.',
  Prices: 'Prices',
  'As of': 'As of',
  'Chinese public holidays': 'Chinese public holidays',
  updated: 'updated',
  Open: 'Open',
  About: 'About',
  Disclaimer: 'Disclaimer',
  'Not affiliated with or endorsed by DeepSeek.':
    'Not affiliated with or endorsed by DeepSeek.',
  'Rest of the day': 'Rest of the day',
  '01:00–04:00 and 06:00–10:00 UTC, Monday to Friday, excluding Chinese public holidays.':
    '01:00–04:00 and 06:00–10:00 UTC, Monday to Friday, excluding Chinese public holidays.',
  'All other hours, including weekends and Chinese public holidays.':
    'All other hours, including weekends and Chinese public holidays.',
  Language: 'Language',
  'Language and region': 'Language and region',
  'Changes the language of the panel, menu and preferences':
    'Changes the language of the panel, menu and preferences',
  'Automatic (system)': 'Automatic (system)',
  'Decimal separator': 'Decimal separator',
  'Automatic follows the region of your system':
    'Automatic follows the region of your system',
  'Point (0.003)': 'Point (0.003)',
  'Comma (0,003)': 'Comma (0,003)',
} as const;

export type MessageKey = keyof typeof EN;

/**
 * Spanish catalog. The Record type makes a missing or extra key a compile
 * error, which is what prevents half-translated menus.
 */
export const ES: Record<MessageKey, string> = {
  now: 'ahora',
  'in 24 h': 'en 24 h',
  cheap: 'barato',
  peak: 'pico',
  'off-peak': 'valle',
  expensive: 'caro',
  Now: 'Ahora',
  'Input (cache hit)': 'Entrada (acierto de caché)',
  'Input (cache miss)': 'Entrada (fallo de caché)',
  Output: 'Salida',
  'USD per 1M tokens': 'USD por 1M tokens',
  Preferences: 'Preferencias',
  'Official pricing': 'Precios oficiales',
  'Peak pricing': 'Tarifa pico',
  'Off-peak pricing': 'Tarifa valle',
  'Cheap pricing': 'Tarifa barata',
  'Expensive pricing': 'Tarifa cara',
  'full price': 'precio completo',
  cheaper: 'más barato',
  Cheap: 'Barato',
  Expensive: 'Caro',
  'Off-peak': 'Valle',
  Peak: 'Pico',
  in: 'en',
  local: 'local',
  'No upcoming change': 'Sin cambios próximos',
  'Pricing periods': 'Periodos de precio',
  current: 'actual',
  'Holiday calendar missing for': 'Falta el calendario de feriados de',
  'Only weekends have reduced pricing.':
    'Solo los fines de semana tienen tarifa reducida.',
  'Prices as of': 'Precios al',
  'official DeepSeek rates': 'tarifas oficiales de DeepSeek',
  'Peak hours': 'Horas pico',
  General: 'General',
  Panel: 'Panel',
  'How the current DeepSeek price tier is shown in the top bar.':
    'Cómo se muestra el tramo de precios actual de DeepSeek en la barra superior.',
  Model: 'Modelo',
  'Rates shown in the popup menu': 'Tarifas que se muestran en el menú',
  'DeepSeek Flash': 'DeepSeek Flash',
  'DeepSeek Pro': 'DeepSeek Pro',
  Display: 'Visualización',
  'Choose how much information to show next to the icon':
    'Elige cuánta información mostrar junto al icono',
  'Icon only': 'Solo icono',
  'Icon and state': 'Icono y estado',
  'Icon and countdown': 'Icono y cuenta atrás',
  'Time format': 'Formato de hora',
  'Follows the system clock unless you override it':
    'Sigue el reloj del sistema salvo que lo cambies',
  System: 'Sistema',
  '12-hour': '12 horas',
  '24-hour': '24 horas',
  Terminology: 'Terminología',
  'Applies to the panel and menu': 'Se aplica al panel y al menú',
  'Cheap / Expensive': 'Barato / Caro',
  'Off-peak / Peak': 'Valle / Pico',
  'Show progress bar': 'Mostrar barra de progreso',
  'Fills as the current price period elapses':
    'Se llena a medida que transcurre el periodo de precio actual',
  Data: 'Datos',
  'Dates of the bundled rates and holiday calendar.':
    'Fechas de las tarifas y del calendario de feriados incluidos.',
  Prices: 'Precios',
  'As of': 'Al',
  'Chinese public holidays': 'Feriados públicos chinos',
  updated: 'actualizado',
  Open: 'Abrir',
  About: 'Acerca de',
  Disclaimer: 'Aviso',
  'Not affiliated with or endorsed by DeepSeek.':
    'No está afiliado a DeepSeek ni cuenta con su respaldo.',
  'Rest of the day': 'Resto del día',
  '01:00–04:00 and 06:00–10:00 UTC, Monday to Friday, excluding Chinese public holidays.':
    '01:00–04:00 y 06:00–10:00 UTC, de lunes a viernes, excluyendo los feriados públicos chinos.',
  'All other hours, including weekends and Chinese public holidays.':
    'Todas las demás horas, incluidos fines de semana y feriados públicos chinos.',
  Language: 'Idioma',
  'Language and region': 'Idioma y región',
  'Changes the language of the panel, menu and preferences':
    'Cambia el idioma del panel, del menú y de las preferencias',
  'Automatic (system)': 'Automático (sistema)',
  'Decimal separator': 'Separador decimal',
  'Automatic follows the region of your system':
    'Automático sigue la región de tu sistema',
  'Point (0.003)': 'Punto (0.003)',
  'Comma (0,003)': 'Coma (0,003)',
};

/** Short weekday names indexed by GLib's day of week modulo 7 (Sunday = 0). */
const WEEKDAYS: Record<Language, readonly string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
};

/** `day` uses GLib's 1 (Monday) to 7 (Sunday) convention. */
export function weekdayShort(language: Language, day: number): string {
  return WEEKDAYS[language][day % 7];
}
