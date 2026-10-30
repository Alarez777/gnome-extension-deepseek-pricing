# DeepSeek Pricing

**Español** | [English](README.en.md)

[![CI](https://github.com/Alarez777/gnome-extension-deepseek-pricing/actions/workflows/ci.yml/badge.svg)](https://github.com/Alarez777/gnome-extension-deepseek-pricing/actions/workflows/ci.yml)
[![Licencia: GPL-2.0-or-later](https://img.shields.io/badge/licencia-GPL--2.0--or--later-blue)](LICENSE)

Extensión de GNOME Shell que muestra si la API de DeepSeek está ahora en **tarifa barata** o **cara**, con una cuenta atrás al siguiente cambio, un timeline de las próximas 24 horas y las tarifas oficiales por millón de tokens.

- Ballena propia en el panel: verde cuando es barato, ámbar cuando es caro.
- Subrayado fino que se llena a medida que avanza el tramo actual; si se muestra estado o cuenta atrás, se estira debajo del texto.
- Click para ver estado, cuenta atrás, timeline de 24 h, precios actuales/alternos y los próximos tramos con su rango (el actual marcado).
- Al pasar el cursor por el timeline aparece una línea de posición y un tooltip con el tramo horario y su estado (`Caro · 22:00–00:00`).
- Preferencias nativas (Adw) para idioma, separador decimal, modelo, modo del panel, formato de hora, terminología y barra de progreso.
- Interfaz en español o inglés. Por defecto sigue el idioma del sistema y cae a inglés si no es compatible; el cambio se aplica al instante, sin reiniciar GNOME Shell.
- Separador decimal configurable: por defecto sigue la región del sistema (México → `0.003`, España → `0,003`) y se puede forzar punto o coma.
- Horas en formato de 12 o 24 h: sigue el reloj de GNOME por defecto, con opción de forzarlo.
- Terminología configurable: **Barato/Caro** (simple, por defecto) o **Valle/Pico** (oficial).
- Sin peticiones de red automáticas, sin telemetría y sin claves API: todo se calcula localmente. El único enlace externo es el de precios oficiales, que abre el navegador cuando lo pulsas.
- Publicable en [extensions.gnome.org](https://extensions.gnome.org) (solo GJS/JS).

![Icono de la extensión](icons/whale-cheap.svg)

## Horario y precios

DeepSeek cambió su esquema en agosto de 2026:

- **Pico:** 01:00–04:00 y 06:00–10:00 **UTC**, de lunes a viernes, excluyendo feriados públicos chinos.
- **Valle:** todo lo demás, incluidos fines de semana y feriados completos.
- El valle cuesta **50 %** del pico.

Por defecto la interfaz usa **barato** y **caro** para que se entienda de un vistazo; en Preferencias → *Terminología* se puede cambiar a **valle** y **pico**, los nombres de la documentación oficial.

| USD / 1M tokens | Flash valle | Flash pico | Pro valle | Pro pico |
|---|---|---|---|---|
| Input (cache hit) | 0.003 | 0.006 | 0.022 | 0.044 |
| Input (cache miss) | 0.15 | 0.30 | 0.66 | 1.32 |
| Output | 0.60 | 1.20 | 1.98 | 3.96 |

Fuente: [Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing). Verificado el 2026-10-29.

El día hábil se decide en **UTC**, no en tu hora local. Por ejemplo, en `America/Mexico_City` (UTC−6) el tramo caro cae:

- domingo a jueves, 19:00–22:00 local;
- lunes a viernes, 00:00–04:00 local.

Por eso el domingo por la noche puede ser caro (en UTC ya es lunes) y el viernes por la noche es barato (en UTC ya es sábado). El timeline del menú resuelve esa ambigüedad visualmente.

En México el tramo barato largo va del **viernes 04:00 al domingo 19:00**; después hay pico el domingo 19:00–22:00, un hueco barato de 22:00 a 00:00 y otro pico el lunes 00:00–04:00. El tooltip del timeline muestra el final real del tramo aunque quede fuera de las próximas 24 horas.

## Idioma y números

La interfaz está en español e inglés. En Preferencias → *Idioma y región*:

- **Idioma:** *Automático* sigue el idioma del sistema; si no es español ni inglés, se usa inglés. También se puede forzar *English* o *Español*. El cambio se aplica al panel, al menú y a las preferencias al instante.
- **Separador decimal:** *Automático* sigue la región del sistema (México → `0.003`, España → `0,003`); si el sistema no es español ni inglés, usa punto. También se puede forzar punto o coma. En español no hay una regla única: la RAE documenta coma en España, Argentina, Chile, Colombia, Ecuador, Paraguay, Perú y Uruguay, punto en México, Centroamérica, el Caribe y Venezuela, y recomienda el punto para unificar.

## Requisitos

- GNOME Shell 48 (probado en 48.7).
- Para compilar: Node.js 20+, npm, `glib-compile-schemas` y `zip`.
- Para probar: `gjs` y, opcionalmente, un shell anidado (`gnome-shell --nested --wayland`).

## Instalar

```sh
git clone https://github.com/Alarez777/gnome-extension-deepseek-pricing.git
cd gnome-extension-deepseek-pricing
npm install
make pack          # crea deepseek-pricing.zip
make install       # copia a ~/.local/share/gnome-shell/extensions/
```

Luego:

```sh
gnome-extensions enable deepseek-pricing@alarez777.github.io
```

En Wayland hay que cerrar sesión y volver a entrar **cada vez que instales o actualices**: GNOME Shell no recarga el código de una extensión en ejecución. En X11 puedes reiniciar el Shell con `Alt+F2` → `r`.

Para comprobar que la copia instalada coincide con `dist/`:

```sh
make verify-install
```

Para desinstalar:

```sh
make uninstall
```

## Desarrollo

```sh
npm run typecheck  # tsc estricto sobre src + tests
npm test           # node:test sobre la lógica pura de pricing/
make build         # compila TS + copia assets + compila el schema

# Shell anidado para probar sin afectar la sesión:
make install
dbus-run-session -- gnome-shell --nested --wayland
# en una terminal dentro de esa sesión:
gnome-extensions enable deepseek-pricing@alarez777.github.io
```

Logs:

```sh
journalctl -f -o cat /usr/bin/gnome-shell
```

La lógica de precios, feriados y segmentos vive en `src/pricing/` y **no importa GJS**, así que los tests corren en Node. La UI (`indicator.ts`, `menu.ts`, `timeline.ts`) es GJS/St y se prueba manualmente.

## Datos y mantenimiento

- **Precios:** `src/pricing/prices.ts` (enteros en micro-USD por 1M tokens) y `PRICES_AS_OF`. Actualízalos cuando DeepSeek cambie tarifas; publica una nueva versión.
- **Feriados chinos:** `src/pricing/holidays.ts`, generado a partir de [holiday-cn](https://github.com/NateScarlet/holiday-cn) y de los avisos del Consejo de Estado (`gov.cn`). Solo se listan los días no laborables; los fines de semana ya son baratos.
- **2027:** el calendario se publica alrededor de noviembre de 2026. Mientras falte, el menú avisa y se aplican solo las reglas de fin de semana. Añade el año y actualiza `HOLIDAY_DATA_UPDATED`.
- El menú muestra la fecha de los precios para que se vea su antigüedad.

## Estructura

```
src/
  extension.ts        # Extension: enable/disable
  indicator.ts        # panel, icono, progreso, timers, settings
  menu.ts             # popup: estado, timeline, precios, enlaces
  timeline.ts         # dibujo Cairo de las próximas 24 h
  prefs.ts            # ventana Adw
  colors.ts           # paleta compartida con el CSS y los SVG
  i18n/
    messages.ts       # catálogos inglés/español (tipados)
    locale.ts         # detección de idioma y separador decimal (puro)
    index.ts          # traductor para el Shell y las preferencias
  pricing/
    schedule.ts       # tier, siguiente cambio, segmentos (puro)
    holidays.ts       # calendario chino (puro)
    prices.ts         # tarifas oficiales (puro)
    clock.ts          # 12 h / 24 h y formato de hora (puro)
    terms.ts          # terminología barato/caro o valle/pico (puro)
    format.ts         # horas locales/UTC y duraciones (GLib)
tests/                # tests de la lógica pura
icons/                # ballena original, verde y ámbar
schemas/              # GSettings
```

## Reglas del proyecto

- El panel indica el estado con el icono y el color; el texto del panel es opcional (preferencia "Icono y estado" o "Icono y cuenta atrás").
- La UI no reimplementa las reglas de precio: `getStatus()` devuelve los segmentos de 24 h y el próximo cambio; el menú solo pinta.
- `disable()` elimina timers, señales y actores. No se crean objetos GObject al importar los módulos.
- El proyecto no usa red. El futuro saldo/uso de la API requeriría una nueva fase y almacenamiento seguro de la clave.

## Limitaciones conocidas

- Solo se anuncia para GNOME Shell 48 (probado en 48.7). GNOME 49–51 no están probados: 51 elimina la propiedad `St.BoxLayout.vertical`, que este código todavía usa. Para portarla, cámbiala por `orientation: Clutter.Orientation.VERTICAL` (compatible con 48), actualiza `shell-version` en `metadata.json` y prueba en cada versión antes de anunciarla.
- GNOME 49 eliminó el modo anidado `--nested` (se usa `--devkit --wayland`) y GNOME 50 eliminó X11, así que las instrucciones de reinicio con `Alt+F2` → `r` solo aplican a 48.
- GNOME 48 no expone tooltips en `St`; la información está en el popup y en el modo de texto opcional.
- Se muestran tarifas oficiales por token, no tu gasto ni tu saldo real.
- El nombre y la descripción que GNOME muestra en la lista de extensiones vienen de `metadata.json` y no cambian con la preferencia de idioma.
- Los precios están en USD; no hay conversión de moneda.
- La barra de progreso avanza dentro del tramo actual; en un fin de semana largo el avance es lento por diseño.

## Publicar en extensions.gnome.org

```sh
make pack
```

Sube `deepseek-pricing.zip`. El ZIP contiene solo el JS compilado, `metadata.json`, `stylesheet.css`, iconos y el schema compilado: no incluye `src/`, tests, `node_modules` ni scripts de build.

Antes de enviarlo:

- Revisa que el UUID (`deepseek-pricing@alarez777.github.io`) coincida con tu cuenta/namespace de GitHub. Si cambias de namespace, actualiza `metadata.json` y el `UUID` del `Makefile`.
- El icono es una ballena original, no el logo de DeepSeek. El nombre es descriptivo y la descripción incluye el descargo de afiliación.
- Las guías de EGO piden que el autor pueda explicar el código; revisa y adapta lo que haga falta antes de publicar.
- Verifica la lista de revisión: nada se crea fuera de `enable()`, todo se destruye en `disable()`, sin GTK en el proceso de Shell, sin binarios, sin telemetría.

## Licencia

GPL-2.0-or-later. Ver [LICENSE](LICENSE).

Este proyecto no está afiliado a DeepSeek ni cuenta con su respaldo. "DeepSeek" se usa solo para describir compatibilidad.
