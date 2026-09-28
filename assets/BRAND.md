# LakBai brand system

## Approved identity

The approved LakBai mark is the detailed tourism pin shown in the accepted branding
board: tropical palm, layered mountains, sunrise-orange sun, blue water, winding cream
road, dense green foliage, and birds inside a dark forest-green destination pin.

The approved wordmark uses **Lak** in forest green and **Bai** in sunrise orange with
the green leaf accent, followed by:

> EXPLORE DAVAO DEL NORTE

Do not replace this artwork with a simplified redraw or substitute SVG.

## Core palette

| Token | Hex | Use |
| --- | --- | --- |
| Forest Green | `#0F5132` | Primary mark, land, strong brand text |
| Leaf Green | `#2E7D32` | Secondary landscape / local-nature detail |
| Sunrise Orange | `#F7931E` | Sun and “Bai” accent |
| Sea Blue | `#0288D1` | Coast, water, adventure detail |
| Sand Cream | `#F9E7C5` | Warm icon/splash background |

The wider UI may continue to use its accessibility-tested interface tokens. Brand
colors are exposed separately in `src/theme.jsx`.

## Production assets

- `lakbai-mark.png` — 1024×1024 transparent standalone approved mark.
- `lakbai-wordmark.png` — transparent approved LakBai wordmark and tagline.
- `lakbai-lockup.png` — transparent compact mark + wordmark lockup for app headers.
- `lakbai-icon.png` — 1024×1024 light app icon.
- `lakbai-icon-foreground.png` — 1080×1080 transparent Android adaptive-icon foreground.
- `lakbai-splash.png` — 1242×2436 portrait splash artwork.
- `lakbai-loading.png` — compact transparent loading/restore lockup.
- `lakbai-welcome.png` — exact approved full-screen first-launch Welcome artwork; do not redraw, crop into a different composition, or replace with substitute UI.

The production files are built from the accepted branding-board artwork by isolating
the approved mark and wordmark, cleaning their edges, upscaling them, and recomposing
them at each target size. They are not raw screenshots, and they are not substitute
redraws.

## In-app usage

Use `lakbai-lockup.png` in compact headers, `lakbai-mark.png` where the icon stands
alone, and `lakbai-wordmark.png` when the text identity is shown separately.

Native icon and splash surfaces use their dedicated production exports. Avoid resizing
small raster screenshots into large branding surfaces.

## Logo motion

The first-launch reveal animates the approved standalone mark as one intact artwork,
followed by the approved wordmark. A subtle glow and road-light pass provide movement
without rebuilding the logo from alternate shapes.

Motion must respect the operating-system Reduce Motion setting and must not delay app
startup merely to finish branding animation.

## Small-size rules

At header/app-icon sizes, prioritize the mark silhouette and contrast. Keep generous
safe-area padding for operating-system icon masks. Do not add text inside the pin or
remove the palm, mountain, road, water, sun, or bird details from the approved mark.

## Future visual work

Use this identity as the base for:

- destination hero treatments
- map pins and selected-location markers
- empty/loading states
- social/share cards
- optional dark-background brand variants

Any future variant must remain visibly derived from the approved LakBai branding board.
