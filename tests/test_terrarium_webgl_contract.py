import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class TerrariumWebglContractTests(unittest.TestCase):
    def test_three_is_a_runtime_dependency(self) -> None:
        package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        self.assertIn("three", package["dependencies"])

    def test_experience_uses_lazy_webgl_scene(self) -> None:
        source = (ROOT / "src/components/sections/TerrariumExperience.tsx").read_text(
            encoding="utf-8"
        )
        self.assertIn("dynamic(", source)
        self.assertIn("TerrariumWebGL", source)
        self.assertIn("/models/terrarium-hero-web.glb", source)
        self.assertNotIn("terrariumCanvasSequence", source)

    def test_webgl_scene_has_draco_and_accessible_fallback(self) -> None:
        source = (ROOT / "src/components/sections/TerrariumWebGL.tsx").read_text(
            encoding="utf-8"
        )
        self.assertIn("DRACOLoader", source)
        self.assertIn('data-testid="terrarium-webgl-canvas"', source)
        self.assertIn('data-testid="terrarium-webgl-poster"', source)
        self.assertIn("prefers-reduced-motion", source)

    def test_web_model_is_small_enough_for_preview_delivery(self) -> None:
        model = ROOT / "public/models/terrarium-hero-web.glb"
        self.assertTrue(model.exists())
        self.assertLess(model.stat().st_size, 12 * 1024 * 1024)


if __name__ == "__main__":
    unittest.main()
