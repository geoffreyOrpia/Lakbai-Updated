# LakBai brand system

## Brand idea

LakBai's mark combines a destination pin with a winding local road, mountain landscape,
sun, coast/water, tropical foliage, and birds. The pin is the navigation anchor; the
road represents the journey; the landscape represents Davao del Norte tourism.

The mark should feel local, warm, outdoors-oriented, and modern rather than like a
generic global mapping product.

## Core palette

| Token | Hex | Use |
| --- | --- | --- |
| Forest Green | `#0F5132` | Primary mark, land, strong brand text |
| Leaf Green | `#2E7D32` | Secondary landscape / local-nature detail |
| Sunrise Orange | `#F7931E` | Sun and “Bai” accent |
| Sea Blue | `#0288D1` | Coast, water, adventure detail |
| Sand Cream | `#F9E7C5` | Warm icon/splash background |

The wider UI may continue to use its accessibility-tested interface tokens. Brand
colors are exposed separately in `src/theme.jsx` so the logo stays consistent.

## Production assets

- `lakbai-icon.png` — 1024×1024 opaque square icon for iOS/general Expo icon use.
- `lakbai-icon-foreground.png` — 1024×1024 transparent Android adaptive-icon foreground.
- `lakbai-splash.png` — 1024×1024 transparent native splash mark.
- `lakbai-mark.png` — 1024×1024 transparent raster master/fallback.
- `BrandMark.jsx` — scalable in-app vector mark and wordmark. Prefer this over PNGs in UI.

Do not screenshot or crop the brand board for production use. UI surfaces should use
the vector component; native platform surfaces should use the dedicated PNG exports.

## Wordmark

Write **LakBai** with:
- “Lak” in Forest Green
- “Bai” in Sunrise Orange

Preferred tagline:

> EXPLORE DAVAO DEL NORTE

The tagline is optional at compact header sizes.

## Logo motion

The first-launch reveal follows the approved story:

1. Pin/frame establishes the destination.
2. Landscape rises into the pin.
3. Sun appears.
4. Road/path reveals the journey.
5. Palm and birds complete the local-tourism scene.
6. LakBai wordmark settles below the mark.

Motion must respect the operating system Reduce Motion setting. Do not delay startup
only to finish the animation; native splash and session restoration should remain fast.

## Small-size rules

At header/app-icon sizes, prioritize silhouette and contrast over tiny illustration
detail. Keep generous safe-area padding for OS icon masks. Never add additional small
text inside the pin.

## Future visual work

Use this identity as the base for:
- destination hero treatments
- map pins and selected-location markers
- empty/loading states
- social/share cards
- optional dark-mode brand lockups

Avoid introducing extra tourism symbols into the core mark. The current pin, path,
landscape, sun, coast, and foliage already carry the story.
