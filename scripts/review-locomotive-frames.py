"""Render the exact build frames for visual review; no substitute mockups."""
import importlib.util
from pathlib import Path
import sys
from PIL import Image, ImageDraw

spec = importlib.util.spec_from_file_location("sprites", Path(__file__).with_name("build-locomotive-sprites.py"))
sprites = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sprites)
out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
lineup = Image.new("RGB", (max(sprites.frame_width(e) for e in sprites.PROFILES)+40, len(sprites.PROFILES)*365), (38, 46, 50))
draw = ImageDraw.Draw(lineup)
for row, engine in enumerate(sprites.PROFILES):
    width = sprites.frame_width(engine)
    preview = Image.open(sprites.OUT / "previews" / f"{engine}.webp").convert("RGBA")
    lineup.paste(preview, (20, row*365+20), preview)
    draw.text((20, row*365+8), engine, fill="white")
    draw.line((20, row*365+352, 20+width, row*365+352), fill=(151, 160, 163), width=2)
    sheet = Image.open(sprites.OUT / "sprites" / f"{engine}.webp").convert("RGBA")
    matrix = Image.new("RGB", (width*2, 340*2), (38, 46, 50))
    for j, i in enumerate((0, 3, 7, 12)):
        frame = sheet.crop(((i % sprites.COLUMNS) * width,
                            (i // sprites.COLUMNS) * sprites.FRAME_H,
                            (i % sprites.COLUMNS + 1) * width,
                            (i // sprites.COLUMNS + 1) * sprites.FRAME_H))
        matrix.paste(frame, ((j%2)*width, (j//2)*340), frame)
    matrix.save(out / f"{engine}-motion.png")
lineup.save(out / "lineup.png")
