import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TERRARIUM = ROOT / "src/components/sections/TerrariumExperience.tsx"
PRODUCT = ROOT / "src/components/sections/home/ProductShowcase.tsx"
TERRARIUM_CSS = ROOT / "src/components/sections/TerrariumExperience.module.css"
PRODUCT_CSS = ROOT / "src/components/sections/home/ProductShowcase.module.css"


class HomeScrollJourneyContractTests(unittest.TestCase):
    def test_terrarium_uses_discrete_scene_navigation(self) -> None:
        source = TERRARIUM.read_text(encoding="utf-8")
        self.assertIn("useDiscreteSceneScroll", source)
        self.assertIn("ROTATION_SNAP_POINTS", source)
        self.assertNotIn("import Lenis", source)
        self.assertNotIn("scrub:", source)

    def test_product_showcase_uses_discrete_scene_navigation(self) -> None:
        source = PRODUCT.read_text(encoding="utf-8")
        self.assertIn("useDiscreteSceneScroll", source)
        self.assertIn("SEGMENT_POINTS", source)
        self.assertNotIn("scrub:", source)

    def test_pinned_sections_do_not_outrank_following_page_content(self) -> None:
        terrarium_css = TERRARIUM_CSS.read_text(encoding="utf-8")
        product_css = PRODUCT_CSS.read_text(encoding="utf-8")
        self.assertNotIn("z-index: 60", terrarium_css)
        self.assertNotIn("z-index: 50", product_css)

    def test_product_copy_is_layered_over_a_full_bleed_image(self) -> None:
        css = PRODUCT_CSS.read_text(encoding="utf-8")
        self.assertIn(".imageColumn", css)
        self.assertIn("width: 100%", css[css.index(".imageColumn"):css.index(".imageLayer")])
        self.assertIn(".infoColumn", css)
        self.assertIn("background:", css[css.index(".infoColumn"):css.index(".indexRow")])


if __name__ == "__main__":
    unittest.main()
