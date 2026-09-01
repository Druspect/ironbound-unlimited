"""Pixel-level fleet gate, including negative controls for reported defects."""
import importlib.util
import json
from copy import deepcopy
from pathlib import Path
import unittest
from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("sprites", ROOT / "scripts/build-locomotive-sprites.py")
sprites = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sprites)


def visible_axles(engine, frame, rendered):
    """Verify the actual rendered tire ring, not just a coordinate declaration."""
    expected = sprites.wheel_layer(engine, frame)
    rods = sprites.rod_layer(engine, frame).getchannel("A")
    for a in sprites.axle_geometry(engine):
        d, cx, cy = a["diameter"], a["cx"], a["cy"]
        left, top = round(cx-d/2), round(cy-d/2)
        visible = total = 0
        for y in range(top, top+d):
            for x in range(left, left+d):
                radius = ((x-cx)**2+(y-cy)**2)**.5
                if not .37*d < radius < .47*d or rods.getpixel((x,y)) > 20:
                    continue
                # Intentional seating is restricted to the upper crown for
                # drivers and the outside bearing for trucks. Independently
                # test the entire remaining tire arc, not a generated mask.
                if y < (top+d*.20 if a["kind"] == "driver" else cy+d*.15):
                    continue
                target = expected.getpixel((x,y))
                if target[3] < 220:
                    continue
                total += 1
                pixel = rendered.getpixel((x,y))
                if pixel[3] > 220 and max(abs(pixel[i]-target[i]) for i in range(3)) < 24:
                    visible += 1
        if total < 15 or visible / total < .88:
            raise ValueError(f"{engine}/{a['id']}: missing or occluded wheel ({visible}/{total})")


class LocomotiveRegistrationTest(unittest.TestCase):
    def test_every_shell_and_stack_tip(self):
        manifest = json.loads((sprites.OUT / "profiles.json").read_text())
        self.assertEqual(len(sprites.PROFILES), 12)
        self.assertNotIn("jupiter", sprites.PROFILES)
        for engine, profile in sprites.PROFILES.items():
            with self.subTest(engine=engine):
                registration = sprites.register_shells(engine)
                for key, value in registration.items():
                    self.assertEqual(manifest["profiles"][engine][key], value)
                self.assertLessEqual(max(registration["support_contact_gaps_px"].values()), 0)
                self.assertEqual(len(registration["support_contact_gaps_px"]), len(registration["axles"]))
                native = sprites.load_component(sprites.component_path(engine, "body"), "solid")
                x, y = profile["stack_tip"].values()
                region = native.getchannel("A").crop((max(0,x-5), max(0,y-5), x+6,y+6))
                self.assertGreater(region.getextrema()[1],100)

    def test_no_overlapping_or_clipped_axles(self):
        sprites.validate_profiles()

    def test_raised_body_cannot_be_hidden_by_stretched_supports(self):
        for engine, p in sprites.PROFILES.items():
            with self.subTest(engine=engine):
                original = p["body_bottom"]
                try:
                    p["body_bottom"] += 8  # 20.8 source pixels above its seat.
                    # The starter's taller crown hits the canvas boundary
                    # before its wheel seats can open; either way it cannot
                    # be concealed by stretching the suspension.
                    expected = "shell or stack crown is clipped" if engine == "tom-thumb" else "raw shell gap"
                    with self.assertRaisesRegex(ValueError, expected):
                        sprites.register_shells(engine)
                finally:
                    p["body_bottom"] = original

    def test_every_model_has_bounded_stationary_wheel_seating(self):
        self.assertEqual(set(sprites.WHEEL_SEATING), set(sprites.PROFILES))
        for engine in sprites.PROFILES:
            shells, _, _ = sprites.shell_layers(engine)
            supports = sprites.support_layer(engine, shells)
            foreground = sprites.wheel_foreground_layer(engine, shells, supports)
            alpha = foreground.getchannel("A")
            for a in sprites.axle_geometry(engine):
                with self.subTest(engine=engine, axle=a["id"]):
                    cx, cy, d = a["cx"], a["cy"], a["diameter"]
                    left, top = round(cx-d/2), round(cy-d/2)
                    protected_y = round(top+d*.20 if a["kind"] == "driver" else cy+d*.15)
                    protected = alpha.crop((left, protected_y, left+d, top+d))
                    self.assertIsNone(protected.getbbox(), "frame must not cover lower tires or driver crankpins")
                    upper = alpha.crop((left, top, left+d, protected_y))
                    self.assertGreater(sum(upper.histogram()[101:]), d,
                                       "each axle needs a visible chassis lip or outside-bearing frame")

    def test_seating_is_present_in_finished_frames(self):
        for engine in sprites.PROFILES:
            shells, _, _ = sprites.shell_layers(engine)
            supports = sprites.support_layer(engine, shells)
            # This detects the old wheels-always-on-top composition, not just
            # the existence of a seating profile or separate overlay asset.
            old = shells.copy()
            old.alpha_composite(supports)
            old.alpha_composite(sprites.wheel_layer(engine, 0))
            old.alpha_composite(sprites.rod_layer(engine, 0))
            expected = sprites.render_frame(engine, 0)
            self.assertIsNotNone(ImageChops.difference(old, expected).convert("RGB").getbbox())
            sheet = Image.open(sprites.OUT/"sprites"/f"{engine}.webp").convert("RGBA")
            width = sprites.frame_width(engine)
            for frame in (0, 3, 7, 12):
                actual = sheet.crop(((frame % sprites.COLUMNS) * width,
                                     (frame // sprites.COLUMNS) * sprites.FRAME_H,
                                     (frame % sprites.COLUMNS + 1) * width,
                                     (frame // sprites.COLUMNS + 1) * sprites.FRAME_H))
                # Lossy WebP may discard RGB beneath fully transparent pixels.
                # Compare visible composites, not that unobservable RGB data.
                expected = sprites.render_frame(engine, frame)
                matte = Image.new("RGBA", actual.size, (38, 46, 50, 255))
                diff = ImageChops.difference(
                    Image.alpha_composite(matte, actual).convert("RGB"),
                    Image.alpha_composite(matte, expected).convert("RGB"))
                self.assertLess(max(ImageStat.Stat(diff).mean), 3)

    def test_original_oversized_big_boy_drivers_are_rejected(self):
        p = sprites.PROFILES["big-boy-4014"]
        size = p["driver_size"]
        try:
            p["driver_size"] = 11.5
            with self.assertRaisesRegex(ValueError, "overlapping wheels"):
                sprites.validate_profiles()
        finally:
            p["driver_size"] = size

    def test_missing_driver_count_is_rejected(self):
        p = sprites.PROFILES["nkp-765"]
        original = p["drivers"][:]
        try:
            p["drivers"].pop()
            with self.assertRaisesRegex(ValueError, "driver count"):
                sprites.validate_profiles()
        finally:
            p["drivers"] = original

    def test_clipped_stack_is_rejected(self):
        p = sprites.PROFILES["southern-4501"]
        original = p["stack_tip"]
        try:
            p["stack_tip"] = {"x":933, "y":-1000}
            with self.assertRaisesRegex(ValueError, "clipped"):
                sprites.register_shells("southern-4501")
        finally:
            p["stack_tip"] = original

    def test_missing_rendered_wheel_is_rejected_even_when_profile_count_is_correct(self):
        engine = "southern-4501"
        shells, _, _ = sprites.shell_layers(engine)
        shells.alpha_composite(sprites.support_layer(engine, shells))
        shells.alpha_composite(sprites.wheel_layer(engine, 0, omit="driver-3"))
        shells.alpha_composite(sprites.rod_layer(engine,0))
        with self.assertRaisesRegex(ValueError, "driver-3.*missing or occluded"):
            visible_axles(engine, 0, shells)

    def test_all_visible_axles_in_all_384_frames(self):
        for engine in sprites.PROFILES:
            with self.subTest(engine=engine):
                sheet = Image.open(sprites.OUT/"sprites"/f"{engine}.webp").convert("RGBA")
                width = sprites.frame_width(engine)
                for frame in range(sprites.FRAMES):
                    rendered = sheet.crop(((frame % sprites.COLUMNS) * width,
                                           (frame // sprites.COLUMNS) * sprites.FRAME_H,
                                           (frame % sprites.COLUMNS + 1) * width,
                                           (frame // sprites.COLUMNS + 1) * sprites.FRAME_H))
                    visible_axles(engine,frame,rendered)

    def test_individual_wheels_rotate_without_hub_or_rail_drift(self):
        for engine in sprites.PROFILES:
            first = sprites.wheel_layer(engine,0)
            later = sprites.wheel_layer(engine,3)
            for a in sprites.axle_geometry(engine):
                with self.subTest(engine=engine,axle=a["id"]):
                    d,cx,cy = a["diameter"],a["cx"],a["cy"]
                    box = (round(cx-d/2),round(cy-d/2),round(cx+d/2),round(cy+d/2))
                    self.assertGreater(sum(ImageStat.Stat(ImageChops.difference(first.crop(box),later.crop(box))).mean),10)
                    for frame in range(sprites.FRAMES):
                        tire = sprites.wheel_layer(engine,frame).crop(box)
                        bounds = tire.getchannel("A").point(lambda a:255 if a>100 else 0).getbbox()
                        self.assertLessEqual(abs((bounds[2]-bounds[0])-(bounds[3]-bounds[1])),2)
                        self.assertLessEqual(abs((bounds[0]+bounds[2])/2-d/2),1)
                        self.assertLessEqual(abs((bounds[1]+bounds[3])/2-d/2),1)
                        self.assertLessEqual(abs(bounds[3]-d),2)

    def test_store_is_exact_frame_zero(self):
        for engine in sprites.PROFILES:
            with self.subTest(engine=engine):
                preview = Image.open(sprites.OUT/"previews"/f"{engine}.webp").convert("RGBA")
                sheet = Image.open(sprites.OUT/"sprites"/f"{engine}.webp").convert("RGBA")
                diff = ImageChops.difference(preview,sheet.crop((0,0,sprites.frame_width(engine),340)))
                self.assertLess(max(ImageStat.Stat(diff).mean),3)

    def test_southern_trailing_axle_is_centered_in_native_cab_opening(self):
        engine = "southern-4501"
        _, body, _ = sprites.shell_layers(engine)
        native = sprites.load_component(sprites.PARTS/engine/"body.webp", "solid")
        axle = next(a for a in sprites.axle_geometry(engine) if a["kind"] == "trailing")
        native_x = (axle["cx"]-body["x"])*native.width/body["width"]
        # Measured transparent opening in this source body at native y=325:
        # x=136..258. The old axle (x≈145) sat against the rear edge.
        self.assertLessEqual(abs(native_x-197), 5)
        self.assertEqual(axle["diameter"], 55)
        self.assertEqual(axle["cy"]+axle["diameter"]/2, sprites.RAIL_Y)
        leading = next(a for a in sprites.axle_geometry(engine) if a["kind"] == "leading")
        self.assertEqual(leading["diameter"], 40, "rear sizing must not enlarge the pilot wheel")
        self.assertAlmostEqual(axle["diameter"]/80, .68, delta=.015)
        self.assertEqual([a["cx"] for a in sprites.axle_geometry(engine) if a["kind"] == "driver"],
                         [549, 634, 718, 803])

    def test_big_boy_gap_translates_complete_engine_without_rescaling(self):
        engine = "big-boy-4014"
        profile = sprites.PROFILES[engine]
        extension = profile["coupling_extension"]
        actual = sprites.axle_geometry(engine)
        _, body, tender = sprites.shell_layers(engine)
        registration = sprites.register_shells(engine)
        self.assertEqual(extension, 36)
        try:
            profile["coupling_extension"] = 0
            before = sprites.axle_geometry(engine)
            _, old_body, old_tender = sprites.shell_layers(engine)
            old_registration = sprites.register_shells(engine)
        finally:
            profile["coupling_extension"] = extension
        self.assertEqual(tender, old_tender)
        self.assertEqual(body, {**old_body, "x":old_body["x"]+extension})
        for a, b in zip(actual, before):
            self.assertEqual(a, {**b, "cx":b["cx"]+(0 if b["kind"] == "tender" else extension)})
        self.assertEqual(body["x"]-(tender["x"]+tender["width"]), 8)
        new_smoke_x = registration["smoke_socket"]["x"]*sprites.frame_width(engine)/100
        old_smoke_x = old_registration["smoke_socket"]["x"]*sprites.FRAME_W/100
        self.assertAlmostEqual(new_smoke_x-old_smoke_x, extension, places=3)
        self.assertEqual(registration["smoke_socket"]["y"], old_registration["smoke_socket"]["y"])
        link = sprites.coupling_layer(engine).getchannel("A")
        self.assertIsNotNone(link.crop((326, 298, 334, 303)).getbbox())

    def test_closed_animation_cycle_has_no_phase_snap(self):
        for engine in sprites.PROFILES:
            with self.subTest(engine=engine):
                self.assertIsNone(ImageChops.difference(sprites.wheel_layer(engine,0),sprites.wheel_layer(engine,sprites.FRAMES)).getbbox())

    def test_articulation_preserves_independent_rods_and_matching_driver_sets(self):
        for engine in ("nw-1218", "challenger-3985", "big-boy-4014"):
            drivers = [a for a in sprites.axle_geometry(engine) if a["kind"] == "driver"]
            rear = [a for a in drivers if a["rodGroup"] == 0]
            front = [a for a in drivers if a["rodGroup"] == 1]
            self.assertEqual([a["diameter"] for a in rear], [a["diameter"] for a in front])
            self.assertNotEqual(rear[0]["phase"], front[0]["phase"])
            middle = round((rear[-1]["cx"]+front[0]["cx"])/2)
            for frame in range(sprites.FRAMES):
                rods = sprites.rod_layer(engine, frame).getchannel("A")
                self.assertIsNone(rods.crop((middle-1, 0, middle+2, sprites.FRAME_H)).getbbox(),
                                  f"{engine}: a coupling rod must not cross the articulation")


if __name__ == "__main__":
    unittest.main(verbosity=2)
