from __future__ import annotations

import math
import random
import traceback
from datetime import datetime
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector


ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "3d-source" / "hero"
BACKUP_DIR = SOURCE_DIR / "backups"
RENDER_DIR = SOURCE_DIR / "renders"
TEMP_DIR = SOURCE_DIR / "tmp"
MODEL_DIR = ROOT / "public" / "models"
ASSET_DIR = ROOT / "3d-source" / "assets" / "polyhaven"
SCAN_BLEND = ASSET_DIR / "rock_moss_set_01_2k.blend"
SCAN_DIFFUSE = ASSET_DIR / "textures" / "mossy_rock_diff_2k.jpg"
SCAN_NORMAL = ASSET_DIR / "textures" / "mossy_rock_nor_gl_2k.exr"
SCAN_ROUGHNESS = ASSET_DIR / "textures" / "mossy_rock_rough_2k.jpg"
MOSS_BLEND = ASSET_DIR / "moss_01_2k.blend"
FERN_BLEND = ASSET_DIR / "fern_02_2k.blend"
TEXTURE_DIR = ASSET_DIR / "textures"
EXPORT_DIR = SOURCE_DIR / "exports"
BLEND_PATH = SOURCE_DIR / "terrarium-hero.blend"
GLB_PATH = EXPORT_DIR / "terrarium-hero-source.glb"
RENDER_PATH = RENDER_DIR / "terrarium-hero-cycles.png"
LOG_PATH = SOURCE_DIR / "terrarium-hero-build.log"
EXPORT_SOURCE_GLB = False
SPHAGNUM_COLONY_COUNT = 96
SPHAGNUM_LOBES_PER_COLONY = 4
ROCK_MOSS_PATCH_COUNT = 64
FERN_PLACEMENT_COUNT = 40
ROCK_FERN_COUNT = 58
TALL_FERN_ACCENT_COUNT = 3
CANOPY_FERN_COUNT = 22
CANOPY_STEM_MIN_HEIGHT = 0.62
CANOPY_STEM_MAX_HEIGHT = 1.34
SUBSTRATE_SPHERE_RADIUS = 2.73
SUBSTRATE_SPHERE_CENTER_Z = 1.68
SOIL_EDGE_HEIGHT = 1.47
SOIL_OUTER_RADIUS = math.sqrt(
    SUBSTRATE_SPHERE_RADIUS**2
    - (SOIL_EDGE_HEIGHT-SUBSTRATE_SPHERE_CENTER_Z)**2
)
SOIL_GLASS_GAP_LIMIT = 0.04
GROUND_MOSS_SAFE_RADIUS = 2.70
GLASS_DROPLET_COUNT = 180

for directory in (SOURCE_DIR, BACKUP_DIR, RENDER_DIR, TEMP_DIR, MODEL_DIR, EXPORT_DIR):
    directory.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.temporary_directory = str(TEMP_DIR)


def log(message: str) -> None:
    with LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(f"[{datetime.now().isoformat(timespec='seconds')}] {message}\n")


def socket(node, *names):
    for name in names:
        found = node.inputs.get(name)
        if found is not None:
            return found
    return None


def set_socket(node, names, value) -> None:
    target = socket(node, *names)
    if target is not None:
        target.default_value = value


def principled(material):
    return next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")


def organic_material(name, dark, light, roughness, scale, bump_strength, metallic=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = principled(material)
    set_socket(bsdf, ("Roughness",), roughness)
    set_socket(bsdf, ("Metallic",), metallic)

    coordinates = nodes.new("ShaderNodeTexCoord")
    mapping_noise = nodes.new("ShaderNodeTexNoise")
    mapping_noise.inputs["Scale"].default_value = scale
    mapping_noise.inputs["Detail"].default_value = 8.0
    mapping_noise.inputs["Roughness"].default_value = 0.72
    mapping_noise.inputs["Distortion"].default_value = 0.18
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.24
    ramp.color_ramp.elements[0].color = (*dark, 1.0)
    ramp.color_ramp.elements[1].position = 0.78
    ramp.color_ramp.elements[1].color = (*light, 1.0)
    bump_noise = nodes.new("ShaderNodeTexNoise")
    bump_noise.inputs["Scale"].default_value = scale * 4.5
    bump_noise.inputs["Detail"].default_value = 12.0
    bump_noise.inputs["Roughness"].default_value = 0.8
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = bump_strength
    bump.inputs["Distance"].default_value = 0.055
    links.new(coordinates.outputs["Generated"], mapping_noise.inputs["Vector"])
    links.new(coordinates.outputs["Generated"], bump_noise.inputs["Vector"])
    links.new(mapping_noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], socket(bsdf, "Base Color"))
    links.new(bump_noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], socket(bsdf, "Normal"))
    return material


def scanned_rock_material():
    material = bpy.data.materials.new("Dark wet basalt scan")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = principled(material)
    diffuse = nodes.new("ShaderNodeTexImage")
    diffuse.image = bpy.data.images.load(str(SCAN_DIFFUSE), check_existing=True)
    normal_texture = nodes.new("ShaderNodeTexImage")
    normal_texture.image = bpy.data.images.load(str(SCAN_NORMAL), check_existing=True)
    normal_texture.image.colorspace_settings.name = "Non-Color"
    roughness = nodes.new("ShaderNodeTexImage")
    roughness.image = bpy.data.images.load(str(SCAN_ROUGHNESS), check_existing=True)
    roughness.image.colorspace_settings.name = "Non-Color"
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = 0.72
    darken = nodes.new("ShaderNodeHueSaturation")
    darken.inputs["Saturation"].default_value = 0.32
    darken.inputs["Value"].default_value = 0.16
    links.new(diffuse.outputs["Color"], darken.inputs["Color"])
    links.new(darken.outputs["Color"], socket(bsdf, "Base Color"))
    roughness_ramp = nodes.new("ShaderNodeMapRange")
    roughness_ramp.inputs["To Min"].default_value = 0.16
    roughness_ramp.inputs["To Max"].default_value = 0.34
    links.new(roughness.outputs["Color"], roughness_ramp.inputs["Value"])
    links.new(roughness_ramp.outputs["Result"], socket(bsdf, "Roughness"))
    links.new(normal_texture.outputs["Color"], normal.inputs["Color"])
    links.new(normal.outputs["Normal"], socket(bsdf, "Normal"))
    set_socket(bsdf, ("Coat Weight", "Clearcoat"), 0.24)
    set_socket(bsdf, ("Coat Roughness", "Clearcoat Roughness"), 0.10)
    return material


def foliage_pbr_material(name, prefix):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = principled(material)
    diffuse = nodes.new("ShaderNodeTexImage")
    diffuse.image = bpy.data.images.load(str(TEXTURE_DIR / f"{prefix}_diff_2k.jpg"), check_existing=True)
    alpha = nodes.new("ShaderNodeTexImage")
    alpha.image = bpy.data.images.load(str(TEXTURE_DIR / f"{prefix}_alpha_2k.png"), check_existing=True)
    alpha.image.colorspace_settings.name = "Non-Color"
    normal_texture = nodes.new("ShaderNodeTexImage")
    normal_texture.image = bpy.data.images.load(str(TEXTURE_DIR / f"{prefix}_nor_gl_2k.jpg"), check_existing=True)
    normal_texture.image.colorspace_settings.name = "Non-Color"
    roughness = nodes.new("ShaderNodeTexImage")
    roughness.image = bpy.data.images.load(str(TEXTURE_DIR / f"{prefix}_rough_2k.jpg"), check_existing=True)
    roughness.image.colorspace_settings.name = "Non-Color"
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = 0.62
    if prefix == "moss_01":
        hue = nodes.new("ShaderNodeHueSaturation")
        hue.inputs["Hue"].default_value = 0.56
        hue.inputs["Saturation"].default_value = 0.84
        hue.inputs["Value"].default_value = 0.78
        links.new(diffuse.outputs["Color"], hue.inputs["Color"])
        links.new(hue.outputs["Color"], socket(bsdf, "Base Color"))
    else:
        links.new(diffuse.outputs["Color"], socket(bsdf, "Base Color"))
    links.new(alpha.outputs["Color"], socket(bsdf, "Alpha"))
    links.new(roughness.outputs["Color"], socket(bsdf, "Roughness"))
    links.new(normal_texture.outputs["Color"], normal.inputs["Color"])
    links.new(normal.outputs["Normal"], socket(bsdf, "Normal"))
    set_socket(bsdf, ("Subsurface Weight", "Subsurface"), 0.035)
    if hasattr(material, "surface_render_method"):
        material.surface_render_method = "DITHERED"
    return material


def glass_material():
    material = bpy.data.materials.new("Optical glass")
    material.use_nodes = True
    bsdf = principled(material)
    set_socket(bsdf, ("Base Color",), (0.92, 0.98, 0.94, 1.0))
    set_socket(bsdf, ("Roughness",), 0.028)
    set_socket(bsdf, ("IOR",), 1.47)
    set_socket(bsdf, ("Transmission Weight", "Transmission"), 0.0)
    set_socket(bsdf, ("IOR Level", "Specular IOR Level"), 0.16)
    set_socket(bsdf, ("Coat Weight", "Clearcoat"), 0.0)
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    output = next(node for node in nodes if node.type == "OUTPUT_MATERIAL")
    for link in list(output.inputs["Surface"].links):
        links.remove(link)
    transparent = nodes.new("ShaderNodeBsdfTransparent")
    transparent.inputs["Color"].default_value = (0.90, 0.97, 0.92, 1.0)
    mix = nodes.new("ShaderNodeMixShader")
    mix.inputs[0].default_value = 0.018
    links.new(transparent.outputs[0], mix.inputs[1])
    links.new(bsdf.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], output.inputs["Surface"])
    return material


def water_droplet_material():
    material = bpy.data.materials.new("Condensation water")
    material.use_nodes = True
    bsdf = principled(material)
    set_socket(bsdf, ("Base Color",), (0.96, 0.99, 1.0, 1.0))
    set_socket(bsdf, ("Roughness",), 0.018)
    set_socket(bsdf, ("IOR",), 1.333)
    set_socket(bsdf, ("Transmission Weight", "Transmission"), 1.0)
    set_socket(bsdf, ("Coat Weight", "Clearcoat"), 0.22)
    set_socket(bsdf, ("Coat Roughness", "Clearcoat Roughness"), 0.025)
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    output = next(node for node in nodes if node.type == "OUTPUT_MATERIAL")
    for link in list(output.inputs["Surface"].links):
        links.remove(link)
    transparent = nodes.new("ShaderNodeBsdfTransparent")
    transparent.inputs["Color"].default_value = (0.96, 0.99, 1.0, 1.0)
    mix = nodes.new("ShaderNodeMixShader")
    mix.inputs[0].default_value = 0.14
    links.new(transparent.outputs[0], mix.inputs[1])
    links.new(bsdf.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], output.inputs["Surface"])
    return material


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
        bpy.data.textures,
    ):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def add_cylinder(name, radius, depth, z, material, vertices=128):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=(0, 0, z))
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.data.materials.append(material)
    bevel = obj.modifiers.new("Soft natural boundary", "BEVEL")
    bevel.width = 0.045
    bevel.segments = 3
    return obj


def combined_icospheres(name, instances, material, subdivisions=1):
    vertices = []
    faces = []
    phi = (1 + math.sqrt(5)) / 2
    base = [
        (-1, phi, 0), (1, phi, 0), (-1, -phi, 0), (1, -phi, 0),
        (0, -1, phi), (0, 1, phi), (0, -1, -phi), (0, 1, -phi),
        (phi, 0, -1), (phi, 0, 1), (-phi, 0, -1), (-phi, 0, 1),
    ]
    base = [Vector(v).normalized() for v in base]
    base_faces = [
        (0,11,5),(0,5,1),(0,1,7),(0,7,10),(0,10,11),(1,5,9),(5,11,4),(11,10,2),(10,7,6),(7,1,8),
        (3,9,4),(3,4,2),(3,2,6),(3,6,8),(3,8,9),(4,9,5),(2,4,11),(6,2,10),(8,6,7),(9,8,1),
    ]
    for location, dimensions, rotation in instances:
        offset = len(vertices)
        cos_r, sin_r = math.cos(rotation), math.sin(rotation)
        for point in base:
            x = point.x * dimensions.x
            y = point.y * dimensions.y
            vertices.append((location.x + x*cos_r-y*sin_r, location.y + x*sin_r+y*cos_r, location.z + point.z*dimensions.z))
        faces.extend(tuple(offset + index for index in face) for face in base_faces)
    mesh = bpy.data.meshes.new(f"{name} Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def create_tapered_layer(name, bottom_radius, top_radius, bottom_z, top_z, material, segments=192):
    vertices = []
    for z, radius in ((bottom_z, bottom_radius), (top_z, top_radius)):
        for segment in range(segments):
            angle = math.tau * segment / segments
            vertices.append((radius * math.cos(angle), radius * math.sin(angle), z))
    faces = []
    for segment in range(segments):
        nxt = (segment + 1) % segments
        faces.append((segment, nxt, segments + nxt, segments + segment))
    faces.append(tuple(reversed(range(segments))))
    faces.append(tuple(range(segments, segments * 2)))
    mesh = bpy.data.meshes.new(f"{name} Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bevel = obj.modifiers.new("Soft layered edge", "BEVEL")
    bevel.width = 0.035
    bevel.segments = 3
    return obj


def substrate_radius_at_height(z):
    return math.sqrt(max(
        0.0,
        SUBSTRATE_SPHERE_RADIUS**2 - (z-SUBSTRATE_SPHERE_CENTER_Z)**2,
    ))


def create_spherical_layer(name, bottom_z, top_z, material, segments=192, cap_top=True):
    profile_steps = 18
    vertices, faces = [], []
    for step in range(profile_steps):
        z = bottom_z + (top_z-bottom_z) * step / (profile_steps-1)
        radius = substrate_radius_at_height(z)
        for segment in range(segments):
            angle = math.tau * segment / segments
            vertices.append((radius*math.cos(angle), radius*math.sin(angle), z))
    for step in range(profile_steps-1):
        current, following = step*segments, (step+1)*segments
        for segment in range(segments):
            nxt = (segment+1) % segments
            faces.append((current+segment, current+nxt, following+nxt, following+segment))
    faces.append(tuple(reversed(range(segments))))
    if cap_top:
        top_start = (profile_steps-1)*segments
        faces.append(tuple(top_start+segment for segment in range(segments)))
    mesh = bpy.data.meshes.new(f"{name} Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def soil_surface_height(x, y):
    radius = min(1.0, math.sqrt(x*x + y*y) / SOIL_OUTER_RADIUS)
    return 1.08 + (SOIL_EDGE_HEIGHT - 1.08) * radius ** 2.15


def soil_surface_normal(x, y):
    radius = math.sqrt(x*x + y*y)
    if radius < 1e-6:
        return Vector((0, 0, 1))
    normalized_radius = min(1.0, radius / SOIL_OUTER_RADIUS)
    radial_slope = (
        (SOIL_EDGE_HEIGHT - 1.08)
        * 2.15
        / SOIL_OUTER_RADIUS
        * normalized_radius ** 1.15
    )
    return Vector((-radial_slope * x / radius, -radial_slope * y / radius, 1.0)).normalized()


def create_rising_soil_surface(material):
    rings, segments, radius = 32, 192, SOIL_OUTER_RADIUS
    vertices = [(0.0, 0.0, soil_surface_height(0, 0))]
    faces = []
    for ring in range(1, rings + 1):
        ring_radius = radius * ring / rings
        for segment in range(segments):
            angle = math.tau * segment / segments
            x, y = ring_radius * math.cos(angle), ring_radius * math.sin(angle)
            ripple = 0.018 * math.sin(angle * 5 + ring * 0.7) * math.sin(math.pi*ring/rings)
            vertices.append((x, y, soil_surface_height(x, y) + ripple))
    for segment in range(segments):
        faces.append((0, 1 + segment, 1 + (segment + 1) % segments))
    for ring in range(1, rings):
        current, following = 1 + (ring - 1) * segments, 1 + ring * segments
        for segment in range(segments):
            nxt = (segment + 1) % segments
            faces.append((current + segment, following + segment, following + nxt, current + nxt))
    mesh = bpy.data.meshes.new("Rising living soil surface Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    mesh.materials.append(material)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    obj = bpy.data.objects.new("Rising living soil surface", mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def create_layered_substrate(materials) -> None:
    create_spherical_layer("Drainage layer", 0.14, 0.52, materials["gravel"])
    create_spherical_layer("Charcoal layer", 0.52, 0.74, materials["charcoal"])
    create_spherical_layer("Living soil", 0.72, SOIL_EDGE_HEIGHT, materials["soil"], cap_top=False)
    create_rising_soil_surface(materials["soil"])
    rng = random.Random(5021)
    stones = []
    for _ in range(54):
        radius = 2.48 * math.sqrt(rng.random())
        angle = rng.random() * math.tau
        x, y = radius * math.cos(angle), radius * math.sin(angle)
        size = rng.uniform(0.025, 0.060)
        stones.append((Vector((x, y, soil_surface_height(x, y) + 0.01)), Vector((size*1.4, size, size*0.62)), rng.random()*math.tau))
    combined_icospheres("Natural surface gravel", stones, materials["pebble"])


def create_volcanic_rock(name, location, scale, material, seed):
    rng = random.Random(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5, radius=1.0, location=location)
    rock = bpy.context.view_layer.objects.active
    rock.name = name
    rock.scale = scale
    rock.rotation_euler = (rng.uniform(-0.12,0.12), rng.uniform(-0.14,0.14), rng.uniform(-0.7,0.7))
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    coarse = bpy.data.textures.new(f"{name} fractured mass", type="CLOUDS")
    coarse.noise_scale = 0.48
    coarse.noise_depth = 2
    coarse.noise_type = "HARD_NOISE"
    coarse.noise_basis = "VORONOI_F2_F1"
    modifier = rock.modifiers.new("Fractured silhouette", "DISPLACE")
    modifier.texture = coarse
    modifier.strength = 0.30
    modifier.mid_level = 0.53
    fine = bpy.data.textures.new(f"{name} vesicles", type="VORONOI")
    fine.noise_scale = 0.115
    fine.noise_intensity = 1.0
    fine_modifier = rock.modifiers.new("Porous vesicles", "DISPLACE")
    fine_modifier.texture = fine
    fine_modifier.strength = 0.075
    fine_modifier.mid_level = 0.56
    rock.data.materials.append(material)
    bpy.context.view_layer.objects.active = rock
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.ops.object.modifier_apply(modifier=fine_modifier.name)
    for polygon in rock.data.polygons:
        polygon.use_smooth = True
    return rock


def append_scanned_rocks(material):
    names = ["rock_moss_set_01_rock04", "rock_moss_set_01_rock03", "rock_moss_set_01_rock06"]
    with bpy.data.libraries.load(str(SCAN_BLEND), link=False) as (source, target):
        target.objects = [name for name in names if name in source.objects]
    rocks = [obj for obj in target.objects if obj is not None]
    for rock in rocks:
        bpy.context.collection.objects.link(rock)
        rock.data.materials.clear()
        rock.data.materials.append(material)
        for polygon in rock.data.polygons:
            polygon.use_smooth = True
    hero, left, right = rocks
    hero.name = "Hero scanned rock"
    hero.location = (0.00, 0.24, 1.70)
    hero.scale = (0.78, 0.68, 0.90)
    hero.rotation_euler = (0.08, -0.05, -0.12)
    left.name = "Left scanned rock"
    left.location = (-0.92, 0.22, 1.40)
    left.scale = (0.45, 0.43, 0.52)
    left.rotation_euler = (0.08, 0.02, 0.52)
    right.name = "Right scanned rock"
    right.location = (0.92, 0.20, 1.42)
    right.scale = (0.43, 0.40, 0.50)
    right.rotation_euler = (-0.03, 0.06, -0.44)
    return hero, rocks


def add_cross_blade(vertices, faces, origin, height, width, angle, lean):
    for rotation in (angle, angle + math.pi/2):
        side = Vector((math.cos(rotation), math.sin(rotation), 0)) * width
        drift = Vector((math.cos(angle+0.7), math.sin(angle+0.7), 0)) * lean
        start = len(vertices)
        vertices.extend((origin-side, origin+side, origin+drift+Vector((0,0,height))+side*0.22, origin+drift+Vector((0,0,height))-side*0.22))
        faces.append((start, start+1, start+2, start+3))


def create_moss_carpet(material, rock_material=None) -> None:
    rng = random.Random(90442)
    cushions = []
    for _ in range(105):
        radius = rng.uniform(0.55, 2.0)
        angle = rng.random()*math.tau
        center = Vector((radius*math.cos(angle), radius*math.sin(angle), 1.13+rng.uniform(-0.01,0.045)))
        size = rng.uniform(0.08, 0.22)
        cushions.append((center, Vector((size*rng.uniform(1.15,1.65), size, rng.uniform(0.014,0.032))), rng.random()*math.tau))
    combined_icospheres("Moss cushion foundations", cushions, material)

    vertices, faces = [], []
    for _ in range(11500):
        radius = 2.03*math.sqrt(rng.random())
        angle = rng.random()*math.tau
        if rng.random() < 0.30 and radius < 0.55:
            continue
        origin = Vector((radius*math.cos(angle), radius*math.sin(angle), 1.16+rng.uniform(-0.006,0.025)))
        add_cross_blade(vertices, faces, origin, rng.uniform(0.018,0.068), rng.uniform(0.0022,0.0055), rng.random()*math.tau, rng.uniform(0,0.018))

    # A separate colony climbs the hero rock's lower, forward-facing surface.
    for _ in range(2800):
        theta = rng.uniform(-1.18, 1.18)
        phi = rng.uniform(0.34, 1.30)
        x = 0.03 + 1.03*math.sin(phi)*math.sin(theta)
        y = -0.02 - 0.71*math.sin(phi)*math.cos(theta)
        z = 1.50 + 1.38*math.cos(phi)
        origin = Vector((x,y,z))
        add_cross_blade(vertices, faces, origin, rng.uniform(0.018,0.052), rng.uniform(0.0018,0.0042), rng.random()*math.tau, rng.uniform(0,0.012))
    mesh = bpy.data.meshes.new("Moss microstructure Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    moss = bpy.data.objects.new("Moss microstructure", mesh)
    bpy.context.collection.objects.link(moss)
    moss.data.materials.append(material)


def create_domed_patch_mesh(name, patches, material):
    """Create overlapping organic caps without a flat lawn-like base."""
    vertices, faces = [], []
    rings, segments = 6, 28
    for center, normal, radius_x, radius_y, height, rotation in patches:
        normal = normal.normalized()
        reference = Vector((1, 0, 0)) if abs(normal.z) > 0.82 else Vector((0, 0, 1))
        tangent = normal.cross(reference).normalized()
        bitangent = normal.cross(tangent).normalized()
        tangent, bitangent = (
            tangent * math.cos(rotation) + bitangent * math.sin(rotation),
            -tangent * math.sin(rotation) + bitangent * math.cos(rotation),
        )
        start = len(vertices)
        vertices.append(center + normal * height)
        for ring in range(1, rings + 1):
            fraction = ring / rings
            lift = height * (1.0 - fraction ** 1.55)
            for segment in range(segments):
                angle = math.tau * segment / segments
                ripple = 1.0 + 0.08 * math.sin(angle * 3.0 + rotation * 2.0)
                point = center + (
                    tangent * math.cos(angle) * radius_x * fraction * ripple
                    + bitangent * math.sin(angle) * radius_y * fraction * ripple
                    + normal * lift
                )
                vertices.append(point)
        for segment in range(segments):
            faces.append((start, start + 1 + segment, start + 1 + (segment + 1) % segments))
        for ring in range(1, rings):
            current = start + 1 + (ring - 1) * segments
            following = current + segments
            for segment in range(segments):
                nxt = (segment + 1) % segments
                faces.append((current + segment, following + segment, following + nxt, current + nxt))
    mesh = bpy.data.meshes.new(f"{name} Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    mesh.materials.append(material)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return mesh


def load_scanned_moss_template(material):
    with bpy.data.libraries.load(str(MOSS_BLEND), link=False) as (source, target):
        target.objects = ["moss_01_geometry_nodes"] if "moss_01_geometry_nodes" in source.objects else []
    if not target.objects or target.objects[0] is None:
        raise RuntimeError("The scanned moss Geometry Nodes object could not be loaded")
    template = target.objects[0]
    for source_object in bpy.data.objects:
        if source_object.name.startswith("moss_strand_") and source_object.type == "MESH":
            source_object.data.materials.clear()
            source_object.data.materials.append(material)
    return template


def moss_object_from_patches(template, name, patches, foundation_material, density, tall_density):
    moss = template.copy()
    moss.data = create_domed_patch_mesh(name, patches, foundation_material)
    bpy.context.collection.objects.link(moss)
    moss.name = name
    moss.location = (0.0, 0.0, 0.0)
    moss.rotation_euler = (0.0, 0.0, 0.0)
    moss.scale = (1.0, 1.0, 1.0)
    modifier = moss.modifiers[0]
    modifier["Input_2"] = density
    modifier["Input_3"] = tall_density
    modifier["Input_4_use_attribute"] = 0
    modifier["Input_4"] = 1.0
    return moss


def create_sphagnum_colonies(template, foundation_material):
    rng = random.Random(19780501)
    patches = []
    for index in range(SPHAGNUM_COLONY_COUNT):
        # Interlocking cushions concentrate around the stones while leaving
        # irregular dark-soil channels, like wet sphagnum rather than turf.
        radius = 2.50 * math.sqrt(rng.random())
        angle = rng.random() * math.tau
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        for lobe in range(SPHAGNUM_LOBES_PER_COLONY):
            lobe_angle = rng.random() * math.tau
            offset = rng.uniform(0.025, 0.15) * (0.20 if lobe == 0 else 1.0)
            lobe_x = x + math.cos(lobe_angle) * offset
            lobe_y = y + math.sin(lobe_angle) * offset
            lobe_radius = math.sqrt(lobe_x*lobe_x + lobe_y*lobe_y)
            if lobe_radius > 2.54:
                clamp = 2.54 / lobe_radius
                lobe_x *= clamp
                lobe_y *= clamp
                lobe_radius = 2.54
            available_radius = GROUND_MOSS_SAFE_RADIUS - lobe_radius
            max_extent = max(0.075, available_radius * 0.86)
            width = min(rng.uniform(0.13, 0.285), max_extent)
            depth = min(width * rng.uniform(0.72, 1.36), max_extent)
            height = rng.uniform(0.065, 0.185) * (1.20 if index % 9 == 0 else 1.0)
            normal = soil_surface_normal(lobe_x, lobe_y)
            patches.append((
                Vector((
                    lobe_x,
                    lobe_y,
                    soil_surface_height(lobe_x, lobe_y) + 0.018,
                )),
                normal, width, depth, height, rng.random() * math.tau,
            ))
    return moss_object_from_patches(template, "Sphagnum cushion colonies", patches, foundation_material, 54.0, 12.0)


def create_rock_moss_surface_mesh(rocks, foundation_material):
    """Extract irregular patches of the real rock surface for conforming moss."""
    rng = random.Random(61083)
    vertices, faces = [], []
    seed_total = 0
    distribution = (36, 14, 14)
    bpy.context.view_layer.update()
    for rock, wanted in zip(rocks, distribution):
        normal_matrix = rock.matrix_world.to_3x3().inverted().transposed()
        candidates = []
        world_polygons = []
        for polygon in rock.data.polygons:
            center = rock.matrix_world @ polygon.center
            normal = (normal_matrix @ polygon.normal).normalized()
            world_polygons.append((polygon, center, normal))
            if center.z > 1.08 and normal.y < 0.38 and normal.z > -0.82:
                candidates.append((center, normal))
        if not candidates:
            candidates = [(center, normal) for _, center, normal in world_polygons if center.z > 1.05]
        if not candidates:
            raise RuntimeError(f"No usable moss faces found on {rock.name}")
        seeds = []
        for _ in range(wanted):
            center, _ = candidates[rng.randrange(len(candidates))]
            seeds.append((center, rng.uniform(0.09, 0.21)))
        seed_total += len(seeds)
        for polygon, center, normal in world_polygons:
            if normal.y > 0.55 or center.z < 1.05:
                continue
            if not any((center - seed).length < radius * (1.0 + 0.18 * math.sin(center.x * 19 + center.z * 13)) for seed, radius in seeds):
                continue
            start = len(vertices)
            for vertex_index in polygon.vertices:
                point = rock.matrix_world @ rock.data.vertices[vertex_index].co
                vertices.append(point + normal * 0.010)
            faces.append(tuple(range(start, start + len(polygon.vertices))))
    if seed_total != ROCK_MOSS_PATCH_COUNT:
        raise RuntimeError(f"Expected {ROCK_MOSS_PATCH_COUNT} rock moss seeds, built {seed_total}")
    if not faces:
        raise RuntimeError("Rock moss surface extraction produced no faces")
    mesh = bpy.data.meshes.new("Rock conforming moss surface Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    mesh.materials.append(foundation_material)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return mesh


def create_rock_moss_colonies(template, rocks, foundation_material) -> None:
    moss = template.copy()
    moss.data = create_rock_moss_surface_mesh(rocks, foundation_material)
    bpy.context.collection.objects.link(moss)
    moss.name = "Rock conforming moss colonies"
    moss.location = (0.0, 0.0, 0.0)
    moss.rotation_euler = (0.0, 0.0, 0.0)
    moss.scale = (1.0, 1.0, 1.0)
    modifier = moss.modifiers[0]
    modifier["Input_2"] = 145.0
    modifier["Input_3"] = 20.0
    modifier["Input_4_use_attribute"] = 0
    modifier["Input_4"] = 1.0


def create_scanned_moss(material, foundation_material, rocks):
    template = load_scanned_moss_template(material)
    sphagnum = create_sphagnum_colonies(template, foundation_material)
    create_rock_moss_colonies(template, rocks, foundation_material)
    return sphagnum


def create_fern_instance(source, material, name):
    fern = source.copy()
    fern.data = source.data
    if not fern.data.materials or fern.data.materials[0] != material:
        fern.data.materials.clear()
        fern.data.materials.append(material)
    bpy.context.collection.objects.link(fern)
    fern.name = name
    return fern


def create_rock_fern_cover(originals, material, rocks, rng) -> None:
    bpy.context.view_layer.update()
    candidates = []
    for rock in rocks:
        normal_matrix = rock.matrix_world.to_3x3().inverted().transposed()
        for polygon in rock.data.polygons:
            center = rock.matrix_world @ polygon.center
            normal = (normal_matrix @ polygon.normal).normalized()
            if center.z > 1.10 and normal.y < 0.48 and normal.z > -0.55:
                candidates.append((center, normal))
    if not candidates:
        raise RuntimeError("No fern-bearing rock faces were found")
    high_candidates = sorted(candidates, key=lambda item: item[0].z, reverse=True)[:max(12, len(candidates)//12)]
    for index in range(ROCK_FERN_COUNT):
        pool = high_candidates if index < 9 else candidates
        center, normal = pool[rng.randrange(len(pool))]
        if index < TALL_FERN_ACCENT_COUNT:
            normal = (normal * 0.22 + Vector((0, 0, 1)) * 0.78).normalized()
        fern = create_fern_instance(originals[index % len(originals)], material, f"Rock fern {index+1:02d}")
        fern.location = center + normal * 0.022
        if index < TALL_FERN_ACCENT_COUNT:
            scale = rng.uniform(1.18, 1.46)
        elif index < 9:
            scale = rng.uniform(0.48, 0.82)
        else:
            scale = rng.uniform(0.18, 0.48)
        fern.scale = (scale, scale, scale)
        align = Vector((0, 0, 1)).rotation_difference(normal)
        spin = Quaternion(normal, rng.random() * math.tau)
        fern.rotation_mode = "QUATERNION"
        fern.rotation_quaternion = spin @ align


def create_forest_canopy(originals, material, stem_material, rng) -> None:
    placements = []
    for index in range(CANOPY_FERN_COUNT):
        if index < 16:
            side = -1 if index % 2 == 0 else 1
            x = side * rng.uniform(0.58, 1.58)
            y = rng.uniform(-0.22, 0.72)
        else:
            x = rng.uniform(-0.62, 0.62)
            y = rng.uniform(0.42, 1.18)
        placements.append((x, y))
    curve = bpy.data.curves.new("Canopy fern stems", type="CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.012
    curve.bevel_resolution = 3
    curve.resolution_u = 3
    stems = bpy.data.objects.new("Canopy fern stems", curve)
    bpy.context.collection.objects.link(stems)
    stems.data.materials.append(stem_material)
    for index, (x, y) in enumerate(placements):
        base = Vector((x, y, soil_surface_height(x, y) + 0.025))
        height = rng.uniform(CANOPY_STEM_MIN_HEIGHT, CANOPY_STEM_MAX_HEIGHT)
        if index >= 16:
            height *= rng.uniform(1.06, 1.16)
        lean = Vector((-x * rng.uniform(0.025, 0.075), -y * 0.025, 0.0))
        top = base + lean + Vector((0, 0, height))
        spline = curve.splines.new("BEZIER")
        spline.bezier_points.add(3)
        for point_index, point in enumerate(spline.bezier_points):
            t = point_index / 3
            point.co = base.lerp(top, t) + Vector((0, 0, 0.08 * math.sin(math.pi*t)))
            point.handle_left_type = "AUTO"
            point.handle_right_type = "AUTO"
        fern = create_fern_instance(
            originals[(index + 1) % len(originals)],
            material,
            f"Canopy fern {index+1:02d}",
        )
        normal = (soil_surface_normal(x, y) * 0.12 + Vector((0, 0, 1)) * 0.88).normalized()
        fern.location = top
        scale = rng.uniform(0.72, 1.08)
        if index >= 16:
            scale *= rng.uniform(1.04, 1.12)
        fern.scale = (scale, scale, scale)
        align = Vector((0, 0, 1)).rotation_difference(normal)
        spin = Quaternion(normal, rng.random() * math.tau)
        fern.rotation_mode = "QUATERNION"
        fern.rotation_quaternion = spin @ align


def create_fern_understory(material, rocks, stem_material) -> None:
    wanted = ["fern_02_a", "fern_02_b", "fern_02_c", "fern_02_d"]
    with bpy.data.libraries.load(str(FERN_BLEND), link=False) as (source, target):
        target.objects = [name for name in wanted if name in source.objects]
    originals = [obj for obj in target.objects if obj is not None]
    if not originals:
        raise RuntimeError("The scanned fern objects could not be loaded")
    rng = random.Random(45210)
    for source in originals:
        source.data.materials.clear()
        source.data.materials.append(material)
    placements = []
    while len(placements) < FERN_PLACEMENT_COUNT:
        x = rng.uniform(-2.12, 2.12)
        y = rng.uniform(-1.18, 1.08)
        if x*x + y*y > 4.52 or (abs(x) < 0.30 and y > 0.05):
            continue
        scale = rng.uniform(0.30, 0.88)
        placements.append((x, y, soil_surface_height(x, y) + rng.uniform(0.015, 0.055), scale))
    for index, placement in enumerate(placements):
        source = originals[index % len(originals)]
        fern = create_fern_instance(source, material, f"Ground fern {index+1:02d}")
        fern.location = placement[:3]
        fern.scale = (placement[3], placement[3], placement[3])
        fern.rotation_euler.z = rng.random()*math.tau
    create_forest_canopy(originals, material, stem_material, rng)
    create_rock_fern_cover(originals, material, rocks, rng)


def leaf_quad(vertices, faces, center, direction, lateral, length, width, lift):
    direction = direction.normalized()
    lateral = lateral.normalized()
    base = center - direction*length*0.16
    tip = center + direction*length
    mid = center + direction*length*0.36 + Vector((0,0,lift))
    start = len(vertices)
    vertices.extend((base, mid+lateral*width, tip, mid-lateral*width))
    faces.append((start,start+1,start+2,start+3))


def create_fern_cluster(stem_material, leaf_material) -> None:
    rng = random.Random(7788)
    curve = bpy.data.curves.new("Fern rachises", type="CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.008
    curve.bevel_resolution = 2
    curve.resolution_u = 3
    vertices, faces = [], []
    for plant in range(8):
        base_angle = rng.random()*math.tau
        base_radius = rng.uniform(0.55,1.72)
        base = Vector((base_radius*math.cos(base_angle), base_radius*math.sin(base_angle), 1.17))
        for frond in range(rng.randint(4,7)):
            heading = base_angle + rng.uniform(-1.35,1.35)
            horizontal = Vector((math.cos(heading), math.sin(heading), 0))
            lateral = Vector((-math.sin(heading), math.cos(heading), 0))
            length = rng.uniform(0.40,0.82)
            spline = curve.splines.new("BEZIER")
            spline.bezier_points.add(3)
            for i, point in enumerate(spline.bezier_points):
                t = i/3
                point.co = base + horizontal*(length*0.34*t) + Vector((0,0,length*(0.92*t-0.25*t*t)))
                point.handle_left_type = "AUTO"
                point.handle_right_type = "AUTO"
            for i in range(9):
                t = 0.12+i*0.085
                center = base + horizontal*(length*0.34*t) + Vector((0,0,length*(0.92*t-0.25*t*t)))
                leaflet_scale = math.sin(math.pi*min(0.98,t+0.08))
                for side in (-1,1):
                    direction = (lateral*side + horizontal*0.16 + Vector((0,0,0.08))).normalized()
                    leaf_quad(vertices, faces, center, direction, horizontal, length*0.17*leaflet_scale, length*0.030*leaflet_scale, length*0.012)
    stems = bpy.data.objects.new("Fern rachises", curve)
    bpy.context.collection.objects.link(stems)
    stems.data.materials.append(stem_material)
    mesh = bpy.data.meshes.new("Fern leaflets Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    leaves = bpy.data.objects.new("Fern leaflets", mesh)
    bpy.context.collection.objects.link(leaves)
    leaves.data.materials.append(leaf_material)


def create_glass_vessel(material):
    sphere_radius = 2.76
    sphere_center_z = 1.68
    bottom_z = 0.12
    top_z = 3.45
    profile_steps = 56
    profile = []
    for step in range(profile_steps):
        height = bottom_z + (top_z-bottom_z)*step/(profile_steps-1)
        radius = math.sqrt(max(0.0, sphere_radius*sphere_radius-(height-sphere_center_z)*(height-sphere_center_z)))
        profile.append((radius,height))
    segments = 256
    vertices, faces = [], []
    for segment in range(segments):
        angle = math.tau*segment/segments
        for radius,height in profile:
            vertices.append((radius*math.cos(angle),radius*math.sin(angle),height))
    count = len(profile)
    for segment in range(segments):
        nxt = (segment+1)%segments
        for index in range(count-1):
            following = index+1
            faces.append((segment*count+index,nxt*count+index,nxt*count+following,segment*count+following))
    mesh = bpy.data.meshes.new("Hand blown glass vessel Mesh")
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    vessel = bpy.data.objects.new("Hand blown glass vessel",mesh)
    bpy.context.collection.objects.link(vessel)
    vessel.data.materials.append(material)
    for polygon in mesh.polygons:
        polygon.use_smooth=True
    bevel=vessel.modifiers.new("Rounded glass rim","BEVEL")
    bevel.width=0.014
    bevel.segments=3
    bpy.ops.mesh.primitive_torus_add(major_radius=profile[-1][0],minor_radius=0.024,major_segments=256,minor_segments=16,location=(0,0,top_z))
    rim=bpy.context.view_layer.objects.active
    rim.name="Thin glass rim"
    rim.data.materials.append(material)
    return vessel


def create_glass_droplets(material):
    rng = random.Random(740074)
    sphere_radius = 2.76
    sphere_center_z = 1.68
    patches = []
    while len(patches) < GLASS_DROPLET_COUNT:
        z = rng.uniform(0.58, 3.24)
        vertical = z - sphere_center_z
        horizontal_radius = math.sqrt(max(0.0, sphere_radius*sphere_radius - vertical*vertical))
        x = rng.uniform(-horizontal_radius * 0.90, horizontal_radius * 0.90)
        y_squared = sphere_radius*sphere_radius - vertical*vertical - x*x
        if y_squared <= 0:
            continue
        y = -math.sqrt(y_squared)
        normal = Vector((x, y, vertical)).normalized()
        size = rng.uniform(0.006, 0.015) if rng.random() < 0.88 else rng.uniform(0.018, 0.032)
        elongation = rng.uniform(1.0, 1.42)
        patches.append((
            Vector((x, y, z)) + normal * 0.008,
            normal,
            size * rng.uniform(0.72, 0.96),
            size * elongation,
            size * rng.uniform(0.34, 0.58),
            rng.uniform(-0.24, 0.24),
        ))
    mesh = create_domed_patch_mesh("Glass condensation droplets", patches, material)
    droplets = bpy.data.objects.new("Glass condensation droplets", mesh)
    bpy.context.collection.objects.link(droplets)
    return droplets


def look_at(obj, target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()


def add_area(name, location, energy, size, size_y, color, target=(0,0,1.55)):
    data=bpy.data.lights.new(name,type="AREA")
    data.energy=energy
    data.shape="RECTANGLE"
    data.size=size
    data.size_y=size_y
    data.color=color
    light=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(light)
    light.location=location
    if hasattr(light, "visible_glossy"):
        light.visible_glossy=False
    look_at(light,target)
    return light


def configure_cycles(scene):
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 384
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.006
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 12
    scene.cycles.transmission_bounces = 10
    scene.cycles.volume_bounces = 2
    scene.cycles.use_light_tree = True
    try:
        preferences=bpy.context.preferences.addons["cycles"].preferences
        preferences.get_devices()
        for backend in ("OPTIX","CUDA","HIP","ONEAPI"):
            try:
                preferences.compute_device_type=backend
                active=[device for device in preferences.devices if device.type != "CPU"]
                if active:
                    for device in preferences.devices:
                        device.use=True
                    scene.cycles.device="GPU"
                    log(f"Cycles GPU backend: {backend}")
                    break
            except Exception:
                continue
    except Exception as error:
        log(f"Cycles GPU unavailable, using CPU: {error}")


def validate_scene_geometry(sphagnum):
    vessel_radius = 2.76
    vessel_center_z = 1.68
    spherical_gaps = []
    for z in (0.14, 0.30, 0.52, 0.74, 1.02, SOIL_EDGE_HEIGHT):
        glass_radius = math.sqrt(vessel_radius*vessel_radius - (z-vessel_center_z)**2)
        spherical_gaps.append(glass_radius - substrate_radius_at_height(z))
    log(
        "Substrate spherical gap range: "
        f"{min(spherical_gaps):.4f}..{max(spherical_gaps):.4f} m"
    )
    if min(spherical_gaps) < 0.0 or max(spherical_gaps) > SOIL_GLASS_GAP_LIMIT:
        raise RuntimeError(f"Substrate spherical gap outside tolerance: {spherical_gaps}")
    glass_radius_at_soil_edge = math.sqrt(
        vessel_radius*vessel_radius - (SOIL_EDGE_HEIGHT-vessel_center_z)**2
    )
    soil_glass_gap = glass_radius_at_soil_edge - SOIL_OUTER_RADIUS
    log(f"Soil-to-glass gap: {soil_glass_gap:.4f} m")
    if soil_glass_gap < 0.0 or soil_glass_gap > SOIL_GLASS_GAP_LIMIT:
        raise RuntimeError(f"Soil-to-glass gap outside tolerance: {soil_glass_gap:.4f} m")

    max_radius = 0.0
    minimum_clearance = float("inf")
    for vertex in sphagnum.data.vertices:
        point = vertex.co
        radius = math.sqrt(point.x*point.x + point.y*point.y)
        max_radius = max(max_radius, radius)
        minimum_clearance = min(
            minimum_clearance,
            point.z - soil_surface_height(point.x, point.y),
        )
    log(f"Ground moss maximum radius: {max_radius:.4f} m")
    log(f"Ground moss minimum soil clearance: {minimum_clearance:.4f} m")
    if max_radius > GROUND_MOSS_SAFE_RADIUS + 0.001:
        raise RuntimeError(f"Ground moss outside glass: {max_radius:.4f} m")
    if minimum_clearance < -0.025:
        raise RuntimeError(f"Ground moss buried below soil: {minimum_clearance:.4f} m")


def build_scene():
    timestamp=datetime.now().strftime("%Y%m%d-%H%M%S")
    backup=BACKUP_DIR/f"before-hero-{timestamp}.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(backup),check_existing=False)
    log(f"Backed up current scene to {backup}")
    # A full reset prevents unlinked scan dependencies from accumulating over
    # repeated art-direction renders in the same long-lived Blender process.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.temporary_directory = str(TEMP_DIR)
    scene=bpy.context.scene
    configure_cycles(scene)
    scene.render.resolution_x=2560
    scene.render.resolution_y=1440
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGB"
    scene.render.film_transparent=False
    scene.view_settings.look="AgX - Medium High Contrast"
    scene.view_settings.exposure=0.55
    scene.render.filepath=str(RENDER_PATH)
    if scene.world is None:
        scene.world=bpy.data.worlds.new("Terrarium World")
    scene.world.use_nodes=True
    background=next(node for node in scene.world.node_tree.nodes if node.type == "BACKGROUND")
    background.inputs["Color"].default_value=(0.004,0.007,0.004,1)
    background.inputs["Strength"].default_value=0.025

    materials={
        "floor":organic_material("Black stone floor",(0.006,0.009,0.007),(0.025,0.032,0.025),0.72,5.0,0.22),
        "gravel":organic_material("Drainage",(0.018,0.020,0.016),(0.07,0.075,0.06),0.88,14.0,0.38),
        "charcoal":organic_material("Charcoal",(0.003,0.004,0.003),(0.018,0.022,0.016),0.92,18.0,0.44),
        "soil":organic_material("Humid soil",(0.0003,0.00025,0.0002),(0.0038,0.0032,0.0024),0.66,11.0,0.52),
        "pebble":organic_material("Surface pebbles",(0.012,0.014,0.011),(0.055,0.060,0.042),0.72,16.0,0.48),
        "rock":organic_material("Wet vesicular basalt",(0.003,0.006,0.004),(0.055,0.075,0.052),0.32,3.8,0.72),
        "moss":foliage_pbr_material("Scanned Moss 01 PBR","moss_01"),
        "moss_foundation":organic_material("Moist sphagnum cushion",(0.010,0.025,0.002),(0.12,0.26,0.024),0.86,12.0,0.72),
        "stem":organic_material("Fern stems",(0.008,0.038,0.003),(0.055,0.18,0.012),0.67,8.0,0.2),
        "leaf":foliage_pbr_material("Scanned Fern 02 PBR","fern_02"),
    }
    set_socket(principled(materials["rock"]),("Coat Weight","Clearcoat"),0.16)
    set_socket(principled(materials["rock"]),("Coat Roughness","Clearcoat Roughness"),0.13)
    set_socket(principled(materials["leaf"]),("Subsurface Weight","Subsurface"),0.055)

    bpy.ops.mesh.primitive_plane_add(size=36,location=(0,0,0))
    floor=bpy.context.view_layer.objects.active
    floor.name="Gallery floor"
    floor.data.materials.append(materials["floor"])
    create_layered_substrate(materials)
    materials["scan_rock"] = scanned_rock_material()
    hero_rock, rocks = append_scanned_rocks(materials["scan_rock"])
    sphagnum = create_scanned_moss(materials["moss"], materials["moss_foundation"], rocks)
    create_fern_understory(materials["leaf"], rocks, materials["stem"])
    create_glass_vessel(glass_material())
    create_glass_droplets(water_droplet_material())
    validate_scene_geometry(sphagnum)

    bpy.ops.object.camera_add(location=(0,-11.6,4.05))
    camera=bpy.context.view_layer.objects.active
    camera.name="Hero camera"
    camera.data.lens=62
    camera.data.sensor_width=36
    camera.data.dof.use_dof=True
    camera.data.dof.focus_object=hero_rock
    camera.data.dof.aperture_fstop=7.1
    look_at(camera,(0,0,1.62))
    scene.camera=camera

    add_area("Top botanical key",(-1.4,-1.0,8.6),1380,3.2,1.0,(1.0,0.93,0.76))
    add_area("Glass strip",(5.2,1.8,4.9),430,5.0,0.13,(0.90,0.96,1.0))
    add_area("Rear canopy",(-1.0,4.6,6.2),520,4.2,1.2,(0.88,1.0,0.82))
    add_area("Front fill",(-4.4,-5.5,2.7),90,3.0,1.0,(0.88,0.92,0.84))

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH),check_existing=False)
    log(f"Saved source scene to {BLEND_PATH}")
    if EXPORT_SOURCE_GLB:
        bpy.ops.export_scene.gltf(filepath=str(GLB_PATH),export_format="GLB",export_apply=True,export_cameras=False,export_lights=False,export_yup=True)
        log(f"Exported source model to {GLB_PATH}")
    else:
        log("Skipped source GLB export until art direction is approved")
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH),check_existing=False)
    log(f"Rendered Cycles hero to {RENDER_PATH}")


LOG_PATH.write_text("",encoding="utf-8")
log("Starting high-quality terrarium hero build")
try:
    build_scene()
    log("SUCCESS")
except Exception:
    log("FAILED")
    log(traceback.format_exc())
    raise
