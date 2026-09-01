#!/usr/bin/env python3
"""Build audited, fixed-canvas locomotive animation sheets.

The browser never positions wheels or rods. This build step cleans the source
components, registers every axle to a model-specific profile, and flattens the
complete locomotive into frames that share one fixed canvas. Extra transparent
headroom preserves tall stack crowns without changing the 260px rail geometry.
"""

from collections import deque
from functools import lru_cache
from hashlib import sha256
import json
from math import cos, pi, sin
from pathlib import Path
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter


PUBLIC = Path(__file__).resolve().parents[1] / "public"
PARTS = PUBLIC / "assets/locomotive-shop/v2"
OUT = PUBLIC / "assets/locomotive-shop/v3"
FRAME_W, FRAME_H = 960, 340
REFERENCE_H = 260  # Wheel, rod, and shell offsets retain their approved rail scale.
FRAMES, COLUMNS = 32, 8

# Every point below belongs to exactly one locomotive. Coordinates are
# percentages of that model's tender or locomotive section, measured from the
# left edge of the original 960px section geometry. Big Boy adds drawbar
# length to its canvas; its sections and all wheel diameters stay unchanged.
PROFILES = {
    "tom-thumb": dict(wheel_arrangement="4-6-0", tender_width=30, locomotive_width=72,
        body_bottom=14, tender_bottom=10, stack_tip=dict(x=1043, y=7),
        drivers=[29.6, 50.9, 72.3], driver_size=18, trailing=[], leading=[87.5, 95.1], truck_size=6.8,
        tender_axles=[18.4, 39.4, 67.4, 88.4], tender_wheel_size=19.8,
        tender_groups=[[0, 1], [2, 3]], rod_groups=[dict(start=29.6, end=72.3, phase=0)]),
    "southern-4501": dict(wheel_arrangement="2-8-2", tender_width=35, locomotive_width=68,
        body_bottom=1, tender_bottom=9, stack_tip=dict(x=933, y=3),
        drivers=[37, 50, 63, 76], driver_size=12.3, trailing=[17.5], leading=[91], truck_size=6.15,
        trailing_size=8.4,  # Photo/drawing calibrated: ~0.68 of the 63in drivers, not the pilot's 0.50.
        tender_axles=[14, 29, 65, 80], tender_wheel_size=12,
        tender_groups=[[0, 1], [2, 3]], rod_groups=[dict(start=37, end=76, phase=0)]),
    "prr-1361": dict(wheel_arrangement="4-6-2", tender_width=35, locomotive_width=68,
        body_bottom=0, tender_bottom=9, stack_tip=dict(x=926, y=4),
        drivers=[32, 47, 62], driver_size=13.8, trailing=[16], leading=[87, 94.5], truck_size=5.5,
        trailing_size=8.3,
        tender_axles=[14, 29, 65, 80], tender_wheel_size=12,
        tender_groups=[[0, 1], [2, 3]], rod_groups=[dict(start=32, end=62, phase=0)]),
    "nkp-765": dict(wheel_arrangement="2-8-4", tender_width=36, locomotive_width=67,
        body_bottom=6, tender_bottom=9, stack_tip=dict(x=856, y=0),
        drivers=[31.5, 44.5, 57.5, 70.5], driver_size=12.2, trailing=[10, 20], leading=[94], truck_size=5.9,
        trailing_size=7.3,
        tender_axles=[14, 29, 65, 80], tender_wheel_size=12,
        tender_groups=[[0, 1], [2, 3]], rod_groups=[dict(start=31.5, end=70.5, phase=0)]),
    "atsf-3751": dict(wheel_arrangement="4-8-4", tender_width=35, locomotive_width=68,
        body_bottom=6, tender_bottom=10, stack_tip=dict(x=937, y=3),
        # No. 3751 has the same 80-inch-driver visual class as UP 844. Spread
        # the four axles evenly before enlarging them so adjacent tire rings
        # retain a clean, physical clearance instead of touching.
        drivers=[35, 48.5, 62, 75.5], driver_size=13.1,
        trailing=[11, 20], leading=[90, 97], truck_size=5.7, trailing_size=7.5,
        tender_axles=[14, 29, 65, 80], tender_wheel_size=12,
        tender_groups=[[0, 1], [2, 3]], rod_groups=[dict(start=35, end=75.5, phase=0)]),
    "nw-611": dict(wheel_arrangement="4-8-4", tender_width=38, locomotive_width=65,
        body_bottom=3, tender_bottom=9, stack_tip=dict(x=880, y=9),
        drivers=[40, 53, 66, 79], driver_size=12.3, trailing=[12, 21], leading=[89, 96.3], truck_size=6.6,
        trailing_size=7.7,
        tender_axles=[14, 29, 65, 80], tender_wheel_size=12,
        tender_groups=[[0, 1], [2, 3]], rod_groups=[dict(start=40, end=79, phase=0)]),
    "up-844": dict(wheel_arrangement="4-8-4", tender_width=35, locomotive_width=68,
        body_bottom=6, tender_bottom=7, stack_tip=dict(x=905, y=1),
        drivers=[35, 49, 63, 77], driver_size=13.1, trailing=[11, 20], leading=[90, 97], truck_size=5.65,
        trailing_size=7.5,
        tender_axles=[14, 29, 65, 80], tender_wheel_size=12,
        tender_groups=[[0, 1], [2, 3]], rod_groups=[dict(start=35, end=77, phase=0)]),
    "nw-1218": dict(wheel_arrangement="2-6-6-4", tender_width=35, locomotive_width=68,
        body_bottom=4, tender_bottom=7, stack_tip=dict(x=896, y=4),
        drivers=[30, 40, 50, 64, 74, 84], driver_size=9.6, trailing=[8, 16], leading=[95], truck_size=5.4,
        trailing_size=6,
        tender_axles=[14, 29, 65, 80], tender_wheel_size=12,
        tender_groups=[[0, 1], [2, 3]],
        rod_groups=[dict(start=30, end=50, phase=0), dict(start=64, end=84, phase=90)]),
    "challenger-3985": dict(wheel_arrangement="4-6-6-4", tender_width=34, locomotive_width=69,
        body_bottom=1, tender_bottom=7, stack_tip=dict(x=919, y=3),
        drivers=[29, 39, 49, 64, 74, 84], driver_size=9.6, trailing=[6, 13], leading=[92, 97.3], truck_size=5,
        trailing_size=6,
        tender_axles=[14, 29, 65, 80], tender_wheel_size=12,
        tender_groups=[[0, 1], [2, 3]],
        rod_groups=[dict(start=29, end=49, phase=0), dict(start=64, end=84, phase=90)]),
    "big-boy-4014": dict(wheel_arrangement="4-8-8-4", tender_width=34, locomotive_width=69,
        body_bottom=5, tender_bottom=2, stack_tip=dict(x=899, y=3), coupling_extension=36,
        drivers=[19, 28, 37, 46, 58, 67, 76, 85], driver_size=8.6, trailing=[6, 11], leading=[92.5, 97.5], truck_size=4.3,
        tender_axles=[12, 25, 38, 62, 75, 88], tender_wheel_size=11,
        tender_groups=[[0, 1, 2], [3, 4, 5]],
        rod_groups=[dict(start=19, end=46, phase=0), dict(start=58, end=85, phase=90)]),
    "the-flyer-1907": dict(wheel_arrangement="4-4-2", tender_width=34, locomotive_width=69,
        body_bottom=0, tender_bottom=4, stack_tip=dict(x=1532, y=4),
        drivers=[39.5, 61], driver_size=13.7, trailing=[15], leading=[85.5, 93], truck_size=5.7,
        trailing_size=8.8,
        tender_axles=[15, 30, 68, 83], tender_wheel_size=11.5,
        tender_groups=[[0, 1], [2, 3]], rod_groups=[dict(start=39.5, end=61, phase=0)]),
    "polar-express-1225": dict(wheel_arrangement="2-8-4", tender_width=36, locomotive_width=67,
        body_bottom=4, tender_bottom=4, stack_tip=dict(x=1793, y=4),
        drivers=[30, 43, 56, 69], driver_size=12.1, trailing=[10, 19], leading=[94], truck_size=5.8,
        trailing_size=7.2,
        tender_axles=[14, 29, 65, 80], tender_wheel_size=12,
        tender_groups=[[0, 1], [2, 3]], rod_groups=[dict(start=30, end=69, phase=0)]),
}
WHEEL_PARTS = PUBLIC / "assets/locomotive-shop/v4"
RAIL_Y = FRAME_H - 8


def frame_width(engine: str) -> int:
    """Extra coupling space extends the canvas, never scales body or wheels."""
    return FRAME_W + PROFILES[engine].get("coupling_extension", 0)

# Pixel depths on the immutable canvas, NOT wheel offsets. Upper tire crowns
# sit behind the existing chassis; the lower wheel faces and crankpins remain
# outside it. Keep the streamlined J's skirt distinct from open-frame engines.
# Raw-shell gap limits are measured BEFORE adding suspension, so a stretched
# support cannot make a badly raised body pass registration again.
WHEEL_SEATING = {
    "tom-thumb": dict(driver_inset=8, truck_inset=5, max_gap=dict(driver=0, leading=0, trailing=0, tender=0)),
    # Southern's larger trailing wheel fills its native arch with 8px clearance.
    "southern-4501": dict(driver_inset=6, truck_inset=5, max_gap=dict(driver=11, leading=0, trailing=10, tender=10)),
    "prr-1361": dict(driver_inset=7, truck_inset=5, max_gap=dict(driver=0, leading=8, trailing=7, tender=9)),
    "nkp-765": dict(driver_inset=6, truck_inset=5, max_gap=dict(driver=3, leading=0, trailing=11, tender=10)),
    "atsf-3751": dict(driver_inset=7, truck_inset=5, max_gap=dict(driver=0, leading=0, trailing=15, tender=8)),
    "nw-611": dict(driver_inset=9, truck_inset=6, max_gap=dict(driver=13, leading=0, trailing=20, tender=9)),
    "up-844": dict(driver_inset=6, truck_inset=5, max_gap=dict(driver=0, leading=5, trailing=20, tender=9)),
    "nw-1218": dict(driver_inset=5, truck_inset=4, max_gap=dict(driver=6, leading=0, trailing=22, tender=0)),
    "challenger-3985": dict(driver_inset=5, truck_inset=4, max_gap=dict(driver=8, leading=0, trailing=28, tender=0)),
    "big-boy-4014": dict(driver_inset=5, truck_inset=4, max_gap=dict(driver=10, leading=0, trailing=8, tender=2)),
    "the-flyer-1907": dict(driver_inset=7, truck_inset=5, max_gap=dict(driver=0, leading=0, trailing=15, tender=0)),
    "polar-express-1225": dict(driver_inset=6, truck_inset=5, max_gap=dict(driver=0, leading=0, trailing=3, tender=0)),
}


def component_path(engine: str, kind: str) -> Path:
    """Keep the starter's original artwork while sharing registration/rendering."""
    if engine == "tom-thumb":
        return PUBLIC / "assets" / ("train-v5-locomotive-flare-aligned.webp" if kind == "body" else "train-v2-tender.webp")
    return PARTS / engine / f"{kind}.webp"


def largest_alpha_component(image: Image.Image) -> Image.Image:
    """Remove neighboring atlas fragments without touching the main component."""

    alpha = image.getchannel("A")
    width, height = image.size
    pixels = alpha.tobytes()
    seen = bytearray(width * height)
    largest: list[int] = []

    for start, value in enumerate(pixels):
        if value <= 8 or seen[start]:
            continue
        seen[start] = 1
        queue = deque([start])
        component: list[int] = []
        while queue:
            index = queue.popleft()
            component.append(index)
            x, y = index % width, index // width
            for ny in range(max(0, y - 1), min(height, y + 2)):
                row = ny * width
                for nx in range(max(0, x - 1), min(width, x + 2)):
                    neighbor = row + nx
                    if not seen[neighbor] and pixels[neighbor] > 8:
                        seen[neighbor] = 1
                        queue.append(neighbor)
        if len(component) > len(largest):
            largest = component

    if not largest:
        raise ValueError("Component has no visible alpha pixels")

    hard_mask = Image.new("L", image.size, 0)
    hard_data = bytearray(width * height)
    for index in largest:
        hard_data[index] = 255
    hard_mask.frombytes(bytes(hard_data))
    retained = hard_mask.filter(ImageFilter.MaxFilter(3))
    cleaned = image.copy()
    cleaned.putalpha(ImageChops.multiply(alpha, retained))
    return cleaned


def normalize_wheel(image: Image.Image) -> Image.Image:
    """Register the new orthographic masters around their neutral hub.

    Mechanical circular masking removes edge residue; the old perspective
    wheel crops are never reused. Full wheels rotate, not double-exposed faces.
    """
    center = (image.width / 2, image.height / 2)
    radius = min(image.size) / 2 - 18
    square = image.crop((round(center[0] - radius), round(center[1] - radius),
                         round(center[0] + radius), round(center[1] + radius)))
    square = square.resize((384, 384), Image.Resampling.LANCZOS)
    mask = Image.new("L", square.size, 0)
    ImageDraw.Draw(mask).ellipse((1, 1, 382, 382), fill=255)
    square.putalpha(ImageChops.multiply(square.getchannel("A"), mask))
    return square


def prepare_wheel_assets() -> None:
    for kind in ("driver", "truck"):
        image = normalize_wheel(Image.open(WHEEL_PARTS / "source" / f"{kind}.png").convert("RGBA"))
        image.save(WHEEL_PARTS / f"{kind}.webp", "WEBP", lossless=True)
    image = largest_alpha_component(Image.open(WHEEL_PARTS / "source/bogie.png").convert("RGBA"))
    box = image.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()
    image.crop(box).save(WHEEL_PARTS / "bogie.webp", "WEBP", lossless=True)


def normalize_rod(image: Image.Image) -> Image.Image:
    """Keep one complete running-gear assembly and discard detached atlas debris."""

    cleaned = largest_alpha_component(image)
    box = cleaned.getchannel("A").getbbox()
    if box is None:
        raise ValueError("Rod is empty after cleaning")
    left, top, right, bottom = box
    padding = 2
    return cleaned.crop((max(0, left - padding), max(0, top - padding), min(cleaned.width, right + padding), min(cleaned.height, bottom + padding)))


@lru_cache(maxsize=None)
def load_component(path: Path, kind: str) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    if kind == "wheel":
        return normalize_wheel(image)
    if kind == "rod":
        return normalize_rod(image)
    if kind == "solid":
        return largest_alpha_component(image)
    return image


def fit_width(path: Path, width: float, kind: str = "plain") -> Image.Image:
    image = load_component(path, kind)
    target_width = max(1, round(width))
    target_height = max(1, round(image.height * target_width / image.width))
    return image.resize((target_width, target_height), Image.Resampling.LANCZOS)


def paste_center(canvas: Image.Image, image: Image.Image, center_x: float, bottom: float) -> None:
    canvas.alpha_composite(image, (round(center_x - image.width / 2), round(FRAME_H - bottom - image.height)))


def rotate_wheel_face(wheel: Image.Image, angle: float) -> Image.Image:
    """Whole orthographic wheel rotates around its immutable neutral hub."""
    return wheel.rotate(angle, Image.Resampling.BICUBIC, expand=False)


def axle_geometry(engine: str) -> list[dict]:
    """Exact rendered pixel boxes: the sole source of runtime axle geometry."""
    p = PROFILES[engine]
    lw, tw = FRAME_W * p["locomotive_width"] / 100, FRAME_W * p["tender_width"] / 100
    left = frame_width(engine) - lw
    result = []
    group_size = len(p["drivers"]) // len(p["rod_groups"])
    for kind, points, width, size, offset in (
        ("driver", p["drivers"], lw, p["driver_size"], left),
        ("leading", p["leading"], lw, p["truck_size"], left),
        ("trailing", p["trailing"], lw, p.get("trailing_size", p["truck_size"]), left),
        ("tender", p["tender_axles"], tw, p["tender_wheel_size"], 0),
    ):
        diameter = round(width * size / 100)
        for i, x in enumerate(points):
            group = i // group_size if kind == "driver" else None
            cx = round(offset + width * x / 100 - diameter / 2) + diameter / 2
            result.append(dict(id=f"{kind}-{i + 1}", kind=kind, x=x, size=size,
                cx=cx, cy=RAIL_Y - diameter / 2, diameter=diameter,
                bottom=8 / REFERENCE_H * 100, rodGroup=group,
                phase=p["rod_groups"][group]["phase"] if group is not None else 0))
    return result


def shell_layers(engine: str) -> tuple[Image.Image, dict, dict]:
    p = PROFILES[engine]
    lw, tw = FRAME_W * p["locomotive_width"] / 100, FRAME_W * p["tender_width"] / 100
    body = fit_width(component_path(engine, "body"), lw, "solid")
    tender = fit_width(component_path(engine, "tender"), tw, "solid")
    by = round(FRAME_H - REFERENCE_H * p["body_bottom"] / 100 - body.height)
    ty = round(FRAME_H - REFERENCE_H * p["tender_bottom"] / 100 - tender.height)
    canvas = Image.new("RGBA", (frame_width(engine), FRAME_H), (0, 0, 0, 0))
    canvas.alpha_composite(tender, (0, ty))
    canvas.alpha_composite(body, (round(frame_width(engine) - lw), by))
    return canvas, dict(x=round(frame_width(engine)-lw), y=by, width=body.width, height=body.height), dict(x=0, y=ty, width=tender.width, height=tender.height)


def coupling_layer(engine: str) -> Image.Image:
    """Retained steel-link artwork spans the extended Big Boy drawbar gap."""
    canvas = Image.new("RGBA", (frame_width(engine), FRAME_H), (0, 0, 0, 0))
    if not PROFILES[engine].get("coupling_extension"):
        return canvas
    p = PROFILES[engine]
    tender_end = round(FRAME_W*p["tender_width"]/100)
    cab_start = round(frame_width(engine)-FRAME_W*p["locomotive_width"]/100)
    if cab_start <= tender_end:
        raise ValueError(f"{engine}: extended coupling must separate tender and cab")
    link = load_component(PUBLIC / "assets/train-v3-coupling-rod.webp", "plain")
    link = link.resize((cab_start-tender_end+12, 5), Image.Resampling.LANCZOS)
    canvas.alpha_composite(link, (tender_end-6, RAIL_Y-34))
    return canvas


def support_layer(engine: str, shells: Image.Image) -> Image.Image:
    """Suspension connects EACH axle to actual shell pixels, including trucks."""
    p = PROFILES[engine]
    points = axle_geometry(engine)
    canvas = Image.new("RGBA", shells.size, (0, 0, 0, 0))
    alpha = shells.getchannel("A")
    source = load_component(WHEEL_PARTS / "bogie.webp", "plain")
    journal = source.crop((0, 0, round(source.width / 3), source.height))
    for a in points:
        cx, cy, d = a["cx"], a["cy"], a["diameter"]
        column = alpha.crop((round(cx)-2, 0, round(cx)+3, round(cy)))
        bbox = column.point(lambda v: 255 if v > 40 else 0).getbbox()
        if not bbox:
            raise ValueError(f"{engine}/{a['id']}: missing supporting chassis")
        shell_y = bbox[3] - 1
        # Use the retained cast spring/journal component, not a thin generated
        # vertical post. Driver bearings stay inboard; truck sideframes are
        # composited outside their wheel faces below.
        width = max(18, round(d * (.62 if a["kind"] == "driver" else .95)))
        height = max(round(d * .60), round((cy-shell_y+5)/.80))
        mount = journal.resize((width, height), Image.Resampling.LANCZOS)
        canvas.alpha_composite(mount, (round(cx-.375*width), round(cy-.80*height)))
    # Frame asset has no baked wheels. Affine registration puts each end bearing
    # on its axle; repeated segments form three-axle tender trucks.
    groups = [[a for a in points if a["kind"] == "driver" and a["rodGroup"] == i] for i in range(len(p["rod_groups"]))]
    tender = [a for a in points if a["kind"] == "tender"]
    groups += [[tender[i] for i in ids] for ids in p["tender_groups"]]
    groups += [[a for a in points if a["kind"] == kind] for kind in ("leading", "trailing")]
    for group in groups:
        for a, b in zip(group, group[1:]):
            width = max(1, round((b["cx"]-a["cx"]) / .75))
            height = max(12, round(min(a["diameter"], b["diameter"]) * .62))
            frame = source.resize((width, height), Image.Resampling.LANCZOS)
            canvas.alpha_composite(frame, (round(a["cx"]-.125*width), round(a["cy"]-.80*height)))
    # Close the upper void between truck and driver sets using the retained
    # suspension casting. Keep the lower tire space open and never bridge the
    # two articulated groups with one rigid casting.
    for first_kind, last_kind in (("trailing", "driver"), ("driver", "leading")):
        rear = [a for a in points if a["kind"] == first_kind]
        front = [a for a in points if a["kind"] == last_kind]
        if not rear or not front:
            continue
        a, b = rear[-1], front[0]
        left, right = round(a["cx"]), round(b["cx"])
        top = round(min(a["cy"]-a["diameter"]/2, b["cy"]-b["diameter"]/2)-8)
        casting = source.resize((right-left, 20), Image.Resampling.LANCZOS)
        canvas.alpha_composite(casting, (left, top))
    for rear, front in zip(groups[:len(p["rod_groups"])], groups[1:len(p["rod_groups"]) ]):
        a, b = rear[-1], front[0]
        left = round(a["cx"]+a["diameter"]*.3)
        right = round(b["cx"]-b["diameter"]*.3)
        middle = (left+right)//2
        top = round(a["cy"]-a["diameter"]/2-7)
        # Two abutting cradle ends close the void at crown height. The seam
        # remains visible and both rods remain entirely within their own set.
        for start, end in ((left, middle), (middle+2, right)):
            casting = source.resize((max(1, end-start), 18), Image.Resampling.LANCZOS)
            canvas.alpha_composite(casting, (start, top))
    return canvas


def wheel_foreground_layer(engine: str, shells: Image.Image, supports: Image.Image) -> Image.Image:
    """Stationary chassis lips and outside-bearing truck frames.

    Never move or resize a tire to create recess. Only the upper crown can be
    covered by the body; driver hubs/rods and every lower tire remain visible.
    This is composed into the same fixed frames used by both shop and game.
    """
    seating = WHEEL_SEATING[engine]
    shell_mask = Image.new("L", shells.size, 0)
    support_mask = Image.new("L", shells.size, 0)
    shell_draw, support_draw = ImageDraw.Draw(shell_mask), ImageDraw.Draw(support_mask)
    for a in axle_geometry(engine):
        cx, cy, d = a["cx"], a["cy"], a["diameter"]
        left, top = round(cx-d/2), round(cy-d/2)
        inset = seating["driver_inset" if a["kind"] == "driver" else "truck_inset"]
        shell_draw.rectangle((left, top, left+d, top+inset), fill=255)
        # Truck journal covers sit over the bearing, but do not swallow the
        # bottom half of the tire. Driver bearings stay behind the wheel face.
        cover_bottom = top+inset if a["kind"] == "driver" else round(cy+d*.10)
        support_draw.rectangle((left, top, left+d, cover_bottom), fill=255)
    foreground = supports.copy()
    foreground.putalpha(ImageChops.multiply(foreground.getchannel("A"), support_mask))
    lips = shells.copy()
    lips.putalpha(ImageChops.multiply(lips.getchannel("A"), shell_mask))
    foreground.alpha_composite(lips)
    return foreground


@lru_cache(maxsize=256)
def wheel_layer(engine: str, frame: int, omit: str | None = None) -> Image.Image:
    canvas = Image.new("RGBA", (frame_width(engine), FRAME_H), (0, 0, 0, 0))
    rotation = -frame * 360 / FRAMES
    points = axle_geometry(engine)
    driver_d = points[0]["diameter"]
    for a in points:
        if a["id"] == omit:
            continue
        wheel_path = (PUBLIC / "assets/train-v4-driver-wheel-clean.webp"
                      if engine == "tom-thumb" and a["kind"] == "driver"
                      else WHEEL_PARTS / ("driver.webp" if a["kind"] == "driver" else "truck.webp"))
        wheel = fit_width(wheel_path, a["diameter"])
        # Closed sprite cycles require whole turns. Small wheels use the nearest
        # circumference-derived integer rate (2 turns here), avoiding a visible
        # phase jump at frame 15 -> 0. Driver travel remains exact.
        ratio = round(driver_d / a["diameter"])
        angle = rotation * ratio + a["phase"]
        wheel = rotate_wheel_face(wheel, angle)
        canvas.alpha_composite(wheel, (round(a["cx"]-a["diameter"]/2), round(a["cy"]-a["diameter"]/2)))
    return canvas


@lru_cache(maxsize=256)
def rod_layer(engine: str, frame: int) -> Image.Image:
    """Code-native exact linkage: every bearing is an actual wheel crankpin.

    Source atlas rod crops had arbitrary margins and neighboring rods. Here a
    narrow steel link is drawn between each adjacent pair of registered pins.
    """
    canvas = Image.new("RGBA", (frame_width(engine), FRAME_H), (0, 0, 0, 0))
    # Draw at 3x so small linkage eyes remain round when reduced for the store.
    high = Image.new("RGBA", (frame_width(engine)*3, FRAME_H*3), (0, 0, 0, 0))
    draw = ImageDraw.Draw(high)
    for group in range(len(PROFILES[engine]["rod_groups"])):
        axles = [a for a in axle_geometry(engine) if a["kind"] == "driver" and a["rodGroup"] == group]
        pins = []
        for a in axles:
            phase = (frame * 360 / FRAMES - a["phase"]) * pi / 180
            crank = a["diameter"] * .19
            pins.append(((a["cx"]+cos(phase)*crank)*3, (a["cy"]+sin(phase)*crank)*3))
        for first, last in zip(pins, pins[1:]):
            draw.line((*first, *last), fill=(27, 31, 33, 255), width=15)
            draw.line((first[0], first[1]-2, last[0], last[1]-2), fill=(177, 180, 180, 255), width=8)
        for x, y in pins:
            draw.ellipse((x-8, y-8, x+8, y+8), fill=(38, 43, 45, 255), outline=(199, 201, 198, 255), width=3)
    canvas.alpha_composite(high.resize(canvas.size, Image.Resampling.LANCZOS))
    return canvas


def render_frame(engine: str, frame: int) -> Image.Image:
    canvas, _, _ = shell_layers(engine)
    supports = support_layer(engine, canvas)
    foreground = wheel_foreground_layer(engine, canvas, supports)
    canvas.alpha_composite(coupling_layer(engine))
    canvas.alpha_composite(supports)
    canvas.alpha_composite(wheel_layer(engine, frame))
    canvas.alpha_composite(foreground)
    canvas.alpha_composite(rod_layer(engine, frame))
    return canvas


def validate_profiles() -> None:
    for engine, profile in PROFILES.items():
        groups = [int(value) for value in profile["wheel_arrangement"].split("-")]
        expected_drivers = sum(groups[1:-1]) // 2
        if len(profile["drivers"]) != expected_drivers:
            raise ValueError(f"{engine}: driver count does not match {profile['wheel_arrangement']}")
        if len(profile["leading"]) != groups[0] // 2:
            raise ValueError(f"{engine}: leading axle count does not match {profile['wheel_arrangement']}")
        if len(profile["trailing"]) != groups[-1] // 2:
            raise ValueError(f"{engine}: trailing axle count does not match {profile['wheel_arrangement']}")
        if len(profile["rod_groups"]) != len(groups) - 2:
            raise ValueError(f"{engine}: rod group count does not match articulation")
        geometry = axle_geometry(engine)
        for section in ("tender", "engine"):
            axles = sorted([a for a in geometry if (a["kind"] == "tender") == (section == "tender")], key=lambda a: a["cx"])
            for first, second in zip(axles, axles[1:]):
                clearance = second["cx"] - first["cx"] - (first["diameter"] + second["diameter"]) / 2
                if clearance < 2:
                    raise ValueError(f"{engine}: overlapping wheels {first['id']} / {second['id']} ({clearance}px)")
        for a in geometry:
            if a["cx"] - a["diameter"]/2 < 0 or a["cx"] + a["diameter"]/2 > frame_width(engine):
                raise ValueError(f"{engine}/{a['id']}: wheel clipped at canvas edge")
        points = profile["drivers"] + profile["leading"] + profile["trailing"] + profile["tender_axles"]
        if any(point <= 0 or point >= 100 for point in points):
            raise ValueError(f"{engine}: axle point falls outside its fixed canvas")
        if not 0 <= profile["body_bottom"] <= 16 or not 0 <= profile["tender_bottom"] <= 16:
            raise ValueError(f"{engine}: shell registration falls outside the calibrated range")
        native = load_component(component_path(engine, "body"), "solid")
        tip = profile["stack_tip"]
        if not 0 <= tip["x"] < native.width or not 0 <= tip["y"] < native.height:
            raise ValueError(f"{engine}: native stack tip falls outside its body")


def register_shells(engine: str) -> dict:
    p = PROFILES[engine]
    shells, body, tender = shell_layers(engine)
    native = load_component(component_path(engine, "body"), "solid")
    tip = p["stack_tip"]
    sx = body["x"] + tip["x"] * body["width"] / native.width
    sy = body["y"] + tip["y"] * body["height"] / native.height
    if body["y"] < 0 or tender["y"] < 0 or not 0 <= sy < FRAME_H:
        raise ValueError(f"{engine}: shell or stack crown is clipped")
    raw_alpha = shells.getchannel("A")
    raw_gaps = {}
    for a in axle_geometry(engine):
        cx, cy, d = a["cx"], a["cy"], a["diameter"]
        band = raw_alpha.crop((round(cx)-2, 0, round(cx)+3, round(cy)))
        bbox = band.point(lambda v: 255 if v > 40 else 0).getbbox()
        if not bbox:
            raise ValueError(f"{engine}/{a['id']}: missing raw shell")
        raw_gaps[a["id"]] = round(cy-d/2-(bbox[3]-1), 2)
        if raw_gaps[a["id"]] > WHEEL_SEATING[engine]["max_gap"][a["kind"]]:
            raise ValueError(f"{engine}/{a['id']}: raw shell gap exceeds calibrated seat")
    shells.alpha_composite(support_layer(engine, shells))
    alpha = shells.getchannel("A")
    gaps = {}
    for a in axle_geometry(engine):
        cx, cy, d = a["cx"], a["cy"], a["diameter"]
        band = alpha.crop((round(cx)-2, 0, round(cx)+3, round(cy)+1))
        bbox = band.point(lambda v: 255 if v > 40 else 0).getbbox()
        if not bbox:
            raise ValueError(f"{engine}/{a['id']}: axle has no supporting shell")
        gaps[a["id"]] = round(cy - d/2 - (bbox[3]-1), 2)
        if gaps[a["id"]] > 0:
            raise ValueError(f"{engine}/{a['id']}: visible shell/tire gap")
    points = axle_geometry(engine)
    return dict(
        canvas=dict(width=frame_width(engine), height=FRAME_H),
        smoke_socket=dict(x=round(sx/frame_width(engine)*100, 5), y=round(sy/FRAME_H*100, 5)),
        body_bounds=body, tender_bounds=tender, axles=points,
        wheel_seating=WHEEL_SEATING[engine], raw_shell_gaps_px=raw_gaps,
        support_contact_gaps_px=gaps,
        driver_contact_gaps_px=[gaps[a["id"]] for a in points if a["kind"] == "driver"],
        tender_contact_gaps_px=[gaps[a["id"]] for a in points if a["kind"] == "tender"],
    )


def write_manifest() -> None:
    digest = sha256()
    for engine in PROFILES:
        for kind in ("previews", "sprites"):
            digest.update((OUT / kind / f"{engine}.webp").read_bytes())
    manifest = {
        "art_revision": digest.hexdigest()[:16],
        "canvas": {"width": FRAME_W, "height": FRAME_H},
        "animation": {"frames": FRAMES, "columns": COLUMNS, "direction": "clockwise"},
        "rail_reference_height": REFERENCE_H,
        "rail_y": RAIL_Y,
        "profiles": {engine: {**profile, **register_shells(engine)} for engine, profile in PROFILES.items()},
    }
    (OUT / "profiles.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    # Runtime consumes this same generated registration; no hand-copied sockets.
    runtime = PUBLIC.parent / "app/locomotive-registration.json"
    runtime.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    prepare_wheel_assets()
    validate_profiles()
    sprite_dir = OUT / "sprites"
    preview_dir = OUT / "previews"
    sprite_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)
    for engine in PROFILES:
        register_shells(engine)
    rows = FRAMES // COLUMNS
    engines = sys.argv[1:] or list(PROFILES)
    for engine in engines:
        if engine not in PROFILES:
            raise ValueError(f"Unknown locomotive profile: {engine}")
        width = frame_width(engine)
        sheet = Image.new("RGBA", (width * COLUMNS, FRAME_H * rows), (0, 0, 0, 0))
        for frame in range(FRAMES):
            rendered = render_frame(engine, frame)
            sheet.alpha_composite(rendered, ((frame % COLUMNS) * width, (frame // COLUMNS) * FRAME_H))
            if frame == 0:
                rendered.save(preview_dir / f"{engine}.webp", "WEBP", quality=90, method=4)
        sheet.save(sprite_dir / f"{engine}.webp", "WEBP", quality=84, method=4)
    write_manifest()


if __name__ == "__main__":
    main()
