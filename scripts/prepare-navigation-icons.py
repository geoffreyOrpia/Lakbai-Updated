"""Extend the app's map symbols using its installed Ionicons font (Pillow required)."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT_ROOT = ROOT / 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons'
GLYPHS = json.loads((FONT_ROOT / 'glyphmaps/Ionicons.json').read_text())
SYMBOLS = {
    'fuel': ('fuel-pump', '#237E91'),
    'parking': ('P', '#237E91'),
    'camp': ('bonfire', '#6B67C8'),
    'pharmacy': ('medical', '#B84646'),
    'fire': ('flame', '#B84646'),
    'emergency': ('call', '#B84646'),
    'ferry': ('boat', '#237E91'),
    'airport': ('airplane', '#237E91'),
    'taxi': ('car', '#237E91'),
    'charging': ('flash', '#237E91'),
    'atm': ('cash', '#347B5B'),
    'bank': ('business', '#347B5B'),
    'toilets': ('WC', '#237E91'),
    'water': ('water', '#237E91'),
    'shops': ('storefront', '#A26536'),
    'post': ('mail', '#237E91'),
    'museum': ('library', '#A26536'),
    'beach': ('umbrella', '#A26536'),
    'viewpoint': ('eye', '#A26536'),
    'park': ('leaf', '#347B5B'),
    'worship': ('home', '#A26536'),
    'place': ('location', '#237E91'),
}

for name, (glyph, color) in SYMBOLS.items():
    image = Image.new('RGBA', (256, 256))
    draw = ImageDraw.Draw(image)
    draw.ellipse((8, 8, 248, 248), fill='white')
    draw.ellipse((24, 24, 232, 232), fill=color)
    if glyph == 'fuel-pump':
        draw.rounded_rectangle((69, 57, 144, 190), radius=9, fill='white')
        draw.rectangle((81, 71, 132, 113), fill=color)
        draw.rounded_rectangle((57, 184, 154, 199), radius=5, fill='white')
        draw.line([(143, 130), (165, 130), (165, 175), (186, 175), (186, 99), (161, 74)], fill='white', width=12, joint='curve')
        draw.line([(176, 87), (176, 111), (187, 118)], fill='white', width=11)
        image.resize((64, 64), Image.Resampling.LANCZOS).save(ROOT / f'assets/map-icons/poi-{name}.png')
        continue
    if glyph in ('WC', 'P'):
        # Plain WC is more recognisable than a generic information symbol.
        font = ImageFont.truetype('arialbd.ttf', 92 if glyph == 'WC' else 150)
        text = glyph
    else:
        font = ImageFont.truetype(str(FONT_ROOT / 'Fonts/Ionicons.ttf'), 150)
        text = chr(GLYPHS[glyph])
    box = draw.textbbox((0, 0), text, font=font)
    draw.text(((256 - box[2] + box[0]) / 2 - box[0], (256 - box[3] + box[1]) / 2 - box[1]), text, font=font, fill='white')
    image.resize((64, 64), Image.Resampling.LANCZOS).save(ROOT / f'assets/map-icons/poi-{name}.png')
