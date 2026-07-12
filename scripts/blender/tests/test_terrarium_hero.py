from pathlib import Path
import unittest


SCRIPT = Path(__file__).parents[1] / "build_terrarium_hero.py"


class TerrariumHeroScriptTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = SCRIPT.read_text(encoding="utf-8")

    def test_uses_cycles_for_the_quality_render(self):
        self.assertIn('scene.render.engine = "CYCLES"', self.source)
        self.assertIn("use_denoising = True", self.source)

    def test_contains_organic_detail_generators(self):
        for function_name in (
            "create_layered_substrate",
            "create_spherical_layer",
            "create_rising_soil_surface",
            "create_volcanic_rock",
            "create_moss_carpet",
            "create_fern_cluster",
            "create_glass_vessel",
        ):
            self.assertIn(f"def {function_name}", self.source)

    def test_uses_real_scan_geometry_and_pbr_maps(self):
        self.assertIn("rock_moss_set_01_2k.blend", self.source)
        self.assertIn("mossy_rock_diff_2k.jpg", self.source)
        self.assertIn("mossy_rock_nor_gl_2k.exr", self.source)
        self.assertIn("def append_scanned_rocks", self.source)
        self.assertIn("moss_01_2k.blend", self.source)
        self.assertIn("def create_scanned_moss", self.source)
        self.assertIn("fern_02_2k.blend", self.source)
        self.assertIn("def create_fern_understory", self.source)
        self.assertIn("def foliage_pbr_material", self.source)
        self.assertIn('f"{prefix}_alpha_2k.png"', self.source)
        self.assertIn('foliage_pbr_material("Scanned Fern 02 PBR","fern_02")', self.source)
        self.assertIn('foliage_pbr_material("Scanned Moss 01 PBR","moss_01")', self.source)

    def test_builds_dense_moss_and_a_smooth_spherical_vessel(self):
        self.assertIn("def create_sphagnum_colonies", self.source)
        self.assertIn("def create_rock_moss_colonies", self.source)
        self.assertIn("def create_rock_moss_surface_mesh", self.source)
        self.assertIn("SPHAGNUM_COLONY_COUNT = 96", self.source)
        self.assertIn("SPHAGNUM_LOBES_PER_COLONY = 4", self.source)
        self.assertIn("ROCK_MOSS_PATCH_COUNT = 64", self.source)
        self.assertNotIn("Continuous scanned moss carpet", self.source)
        self.assertIn("bpy.ops.wm.read_factory_settings(use_empty=True)", self.source)
        self.assertIn("profile_steps = 56", self.source)
        self.assertIn("math.sqrt(max(0.0, sphere_radius*sphere_radius", self.source)

    def test_uses_a_dense_varied_fern_understory(self):
        self.assertIn("FERN_PLACEMENT_COUNT = 40", self.source)
        self.assertIn("ROCK_FERN_COUNT = 58", self.source)
        self.assertIn("TALL_FERN_ACCENT_COUNT = 3", self.source)
        self.assertIn("def create_fern_understory", self.source)
        self.assertIn("def create_rock_fern_cover", self.source)
        self.assertIn("rotation_difference(normal)", self.source)

    def test_builds_a_tall_layered_forest_canopy(self):
        self.assertIn("CANOPY_FERN_COUNT = 22", self.source)
        self.assertIn("CANOPY_STEM_MIN_HEIGHT = 0.62", self.source)
        self.assertIn("CANOPY_STEM_MAX_HEIGHT = 1.34", self.source)
        self.assertIn("def create_forest_canopy", self.source)
        self.assertIn("rng.uniform(0.72, 1.08)", self.source)
        self.assertIn("side = -1 if index % 2 == 0 else 1", self.source)
        self.assertIn("curve.bevel_depth = 0.012", self.source)
        self.assertIn("create_forest_canopy(originals, material, stem_material, rng)", self.source)

    def test_uses_dark_wet_rock_as_a_background_for_plants(self):
        self.assertIn('material = bpy.data.materials.new("Dark wet basalt scan")', self.source)
        self.assertIn('darken.inputs["Value"].default_value = 0.16', self.source)
        self.assertIn('set_socket(bsdf, ("Coat Weight", "Clearcoat"), 0.24)', self.source)

    def test_soil_rises_outward_to_follow_the_glass(self):
        self.assertIn("SUBSTRATE_SPHERE_RADIUS = 2.73", self.source)
        self.assertIn("SUBSTRATE_SPHERE_CENTER_Z = 1.68", self.source)
        self.assertIn("SOIL_EDGE_HEIGHT = 1.47", self.source)
        self.assertIn('create_spherical_layer("Living soil", 0.72, SOIL_EDGE_HEIGHT', self.source)
        self.assertNotIn('create_tapered_layer("Living soil"', self.source)
        self.assertIn("SOIL_GLASS_GAP_LIMIT = 0.04", self.source)

    def test_substrate_outer_wall_has_one_continuous_spherical_curvature(self):
        self.assertIn("def substrate_radius_at_height", self.source)
        self.assertIn("radius = substrate_radius_at_height(z)", self.source)
        self.assertIn("profile_steps = 18", self.source)
        self.assertIn("Substrate spherical gap range", self.source)

    def test_adds_real_water_droplets_to_the_glass(self):
        self.assertIn("GLASS_DROPLET_COUNT = 180", self.source)
        self.assertIn("def water_droplet_material", self.source)
        self.assertIn("def create_glass_droplets", self.source)
        self.assertIn('set_socket(bsdf, ("Transmission Weight", "Transmission"), 1.0)', self.source)
        self.assertIn('mix.inputs[0].default_value = 0.14', self.source)
        self.assertIn('rng.uniform(0.006, 0.015)', self.source)

    def test_ground_moss_is_slope_aligned_and_clipped_inside_glass(self):
        self.assertIn("GROUND_MOSS_SAFE_RADIUS = 2.70", self.source)
        self.assertIn("def soil_surface_normal", self.source)
        self.assertIn("available_radius = GROUND_MOSS_SAFE_RADIUS - lobe_radius", self.source)
        self.assertIn("normal = soil_surface_normal(lobe_x, lobe_y)", self.source)

    def test_runtime_geometry_validation_runs_before_render(self):
        self.assertIn("def validate_scene_geometry", self.source)
        self.assertIn("Soil-to-glass gap", self.source)
        self.assertIn("Ground moss outside glass", self.source)
        self.assertIn("Ground moss buried below soil", self.source)
        self.assertIn("validate_scene_geometry(sphagnum)", self.source)

    def test_exports_a_web_model_and_a_quality_render(self):
        self.assertIn("terrarium-hero-source.glb", self.source)
        self.assertIn("terrarium-hero-cycles.png", self.source)
        self.assertIn("bpy.ops.export_scene.gltf", self.source)

    def test_outputs_resolve_from_project_root_without_c_drive_paths(self):
        self.assertIn("ROOT = Path(__file__).resolve().parents[2]", self.source)
        self.assertNotIn('Path(r"C:', self.source)


if __name__ == "__main__":
    unittest.main()
