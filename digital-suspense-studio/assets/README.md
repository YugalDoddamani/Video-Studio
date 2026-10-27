# Assets

All assets here are original or appropriately licensed. Everything visual in a
video (interfaces, icons, rain, the car, the silhouette) is drawn with
HTML/CSS/SVG at render time — there are no image or video files to license.

## Fonts

| File | Family | Weight | License |
| --- | --- | --- | --- |
| `fonts/inter-latin-400-normal.woff2` | Inter | 400 | SIL OFL 1.1 |
| `fonts/inter-latin-500-normal.woff2` | Inter | 500 | SIL OFL 1.1 |
| `fonts/inter-latin-600-normal.woff2` | Inter | 600 | SIL OFL 1.1 |
| `fonts/inter-latin-700-normal.woff2` | Inter | 700 | SIL OFL 1.1 |

Source: <https://github.com/rsms/inter> (the Inter Project Authors), distributed
via the `@fontsource/inter` npm package. Latin subset only, which keeps each
file under 25 KB.

The full licence text is in `fonts/OFL.txt` and must stay alongside the font
files. The SIL Open Font License permits bundling and redistribution, including
in commercial work, provided the licence travels with the fonts and the fonts
are not sold on their own.

Fonts are loaded from disk by the stage page (`src/stage/style.css`), never from
a CDN, so rendering works offline and produces identical output every run.

## Adding an asset

1. Confirm the licence permits commercial use and redistribution.
2. Put the licence text next to the file.
3. Record it in this table.
4. Load it locally — never over the network.
5. Re-run `npm run determinism -- <slug>` to confirm nothing shifted.
