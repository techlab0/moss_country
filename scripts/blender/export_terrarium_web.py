"""Export the approved hero terrarium as a compact, web-delivery GLB.

Run Blender with the source .blend already opened. The script only mutates the
in-memory scene and deliberately does not save it.
"""

from __future__ import annotations

from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public" / "models" / "terrarium-hero-web.glb"
GROUND_MOSS = "Sphagnum cushion colonies"
ROCK_MOSS = "Rock conforming moss colonies"


def apply_web_moss(object_name: str, density: float, tall_density: float) -> None:
    moss = bpy.data.objects.get(object_name)
    if moss is None or not moss.modifiers:
        raise RuntimeError(f"Missing Geometry Nodes moss object: {object_name}")

    modifier = moss.modifiers[0]
    modifier["Input_2"] = density
    modifier["Input_3"] = tall_density
    modifier["Input_2_use_attribute"] = 0
    modifier["Input_3_use_attribute"] = 0
    moss.update_tag(refresh={"DATA", "OBJECT"})
    bpy.context.view_layer.update()
    bpy.context.evaluated_depsgraph_get().update()
    bpy.context.view_layer.objects.active = moss
    bpy.ops.object.select_all(action="DESELECT")
    moss.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    moss.select_set(False)


def hide_non_web_objects() -> None:
    floor = bpy.data.objects.get("Gallery floor")
    if floor is not None:
        floor.hide_set(True)
        floor.hide_render = True


def export() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    apply_web_moss(GROUND_MOSS, density=4.0, tall_density=1.2)
    apply_web_moss(ROCK_MOSS, density=12.0, tall_density=3.0)
    hide_non_web_objects()

    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT),
        export_format="GLB",
        export_apply=False,
        export_cameras=False,
        export_lights=False,
        export_yup=True,
        use_visible=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
        export_image_format="WEBP",
        export_image_quality=75,
        export_unused_images=False,
    )
    size_mb = OUTPUT.stat().st_size / (1024 * 1024)
    if size_mb > 12:
        raise RuntimeError(f"Web model is too large: {size_mb:.2f} MiB")
    print(f"WEB_GLTF={OUTPUT}")
    print(f"WEB_GLTF_MIB={size_mb:.2f}")


export()
