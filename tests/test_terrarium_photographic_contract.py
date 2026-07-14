import struct
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXPERIENCE = ROOT / "src/components/sections/TerrariumExperience.tsx"
PHOTO_SCROLL = ROOT / "src/components/sections/TerrariumPhotographicScroll.tsx"
HERO_IMAGE = (
    ROOT
    / "public/images/terrarium-generated/terrarium-hero-key-030-v1.png"
)


def png_dimensions(path: Path) -> tuple[int, int]:
    with path.open("rb") as image:
        signature = image.read(24)
    if signature[:8] != b"\x89PNG\r\n\x1a\n":
        raise AssertionError(f"{path} is not a PNG")
    return struct.unpack(">II", signature[16:24])


class TerrariumPhotographicContractTests(unittest.TestCase):
    def test_experience_uses_the_photographic_scroll_source(self) -> None:
        source = EXPERIENCE.read_text(encoding="utf-8")
        self.assertIn("TerrariumPhotographicScroll", source)
        self.assertNotIn("TerrariumWebGL", source)
        self.assertNotIn("terrarium-hero-web.glb", source)
        self.assertIn('data-storyboard-source="photographic-terrarium-scroll"', source)
        self.assertIn("ROTATION_SNAP_POINTS", source)
        self.assertIn("snapTo", source)

    def test_photo_scroll_keeps_motion_on_one_sharp_source(self) -> None:
        source = PHOTO_SCROLL.read_text(encoding="utf-8")
        self.assertIn("next/image", source)
        for filename in (
            "terrarium-hero-angle-left-024-v1.png",
            "terrarium-hero-key-030-v1.png",
            "terrarium-hero-angle-right-028-v1.png",
            "terrarium-hero-angle-right-close-v1.png",
        ):
            self.assertIn(filename, source)
        self.assertIn("ROTATION_FRAMES", source)
        self.assertIn('data-renderer="photographic-multiview"', source)
        self.assertIn("--terrarium-progress", source)
        self.assertIn("data-rotation-view", source)
        self.assertIn('data-active-view="left"', source)
        self.assertNotIn("canvas", source.lower())
        self.assertNotIn("frameIndex", source)

    def test_photo_scroll_has_accessible_reduced_motion_fallback(self) -> None:
        source = PHOTO_SCROLL.read_text(encoding="utf-8")
        self.assertIn("prefers-reduced-motion", source)
        self.assertIn("alt=", source)
        self.assertIn('data-testid="terrarium-photo"', source)
        self.assertIn('data-testid="terrarium-rotation-frame"', source)

    def test_generated_hero_is_large_enough_for_fullscreen_delivery(self) -> None:
        self.assertTrue(HERO_IMAGE.exists())
        width, height = png_dimensions(HERO_IMAGE)
        self.assertGreaterEqual(width, 1600)
        self.assertGreaterEqual(height, 900)
        self.assertLess(HERO_IMAGE.stat().st_size, 4 * 1024 * 1024)


if __name__ == "__main__":
    unittest.main()
