# /bp/ favicon set

The mark reduced to its core for tiny sizes — green squircle + lowercase `bp`
(the slashes drop out below 16px per the logo rules).

## Files
| File | Use |
|---|---|
| `favicon.svg` | **Primary.** Scalable, crisp at any size. Modern browsers prefer this. |
| `icon-16.png` `icon-32.png` `icon-48.png` | Classic browser-tab fallbacks |
| `icon-180.png` | Apple touch icon (iOS home screen) |
| `icon-192.png` `icon-512.png` | PWA / Android / Open Graph |
| `site.webmanifest` | Install metadata (theme color `#57d36a`) |

## Drop-in `<head>`
```html
<link rel="icon" href="/favicon/favicon.svg" type="image/svg+xml" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon/icon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon/icon-16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/favicon/icon-180.png" />
<link rel="manifest" href="/favicon/site.webmanifest" />
```

## Note for production
The PNGs were rasterized with a fallback weight; the SVG carries the real
**JetBrains Mono** spec. For pixel-perfect PNGs in the brand font, re-export
from a machine with JetBrains Mono installed (or from the live site where the
font is loaded) — the SVG is the source of truth.
