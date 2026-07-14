import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "src/app/page.tsx"
JOURNEY = ROOT / "src/components/sections/home/HomeScrollJourney.tsx"
TERRARIUM = ROOT / "src/components/sections/TerrariumExperience.tsx"
PRODUCT = ROOT / "src/components/sections/home/ProductShowcase.tsx"
TERRARIUM_CSS = ROOT / "src/components/sections/TerrariumExperience.module.css"
PRODUCT_CSS = ROOT / "src/components/sections/home/ProductShowcase.module.css"
JOURNEY_CSS = ROOT / "src/components/sections/home/HomeScrollJourney.module.css"


class HomeScrollJourneyContractTests(unittest.TestCase):
    def test_homepage_uses_a_single_fullscreen_journey_controller(self) -> None:
        page = PAGE.read_text(encoding="utf-8")
        journey = JOURNEY.read_text(encoding="utf-8")
        self.assertIn("HomeScrollJourney", page)
        self.assertIn("data-home-journey", journey)
        self.assertIn("data-home-screen", journey)
        self.assertIn("handleWheel", journey)
        self.assertIn("transitionCurtain", journey)

    def test_regular_and_pinned_screens_share_the_same_navigation_axis(self) -> None:
        sources = "\n".join(
            path.read_text(encoding="utf-8")
            for path in (
                TERRARIUM,
                PRODUCT,
                ROOT / "src/components/sections/home/AboutSection.tsx",
                ROOT / "src/components/sections/home/WorkshopSection.tsx",
                ROOT / "src/components/sections/home/CTASection.tsx",
            )
        )
        self.assertGreaterEqual(sources.count("data-home-screen"), 5)
        self.assertGreaterEqual(sources.count("data-home-pinned"), 2)

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
        journey_css = JOURNEY_CSS.read_text(encoding="utf-8")
        self.assertIn("[data-home-screen='regular']", journey_css)
        self.assertIn("[data-home-screen='pinned']", journey_css)

    def test_product_copy_is_layered_over_a_full_bleed_image(self) -> None:
        css = PRODUCT_CSS.read_text(encoding="utf-8")
        self.assertIn(".imageColumn", css)
        self.assertIn("width: 100%", css[css.index(".imageColumn"):css.index(".imageLayer")])
        self.assertIn(".infoColumn", css)
        self.assertIn("background:", css[css.index(".infoColumn"):css.index(".indexRow")])


if __name__ == "__main__":
    unittest.main()
