"""Libro de LibrosIA en 3D: tapa blanda cuadrada de 19 x 19 cm.

Construye el libro de pie (Z arriba), con la portada mirando a -Y y el lomo a
la izquierda (x = 0). La portada gira sobre el lomo para abrirse, y detrás
queda la primera ilustración. Exporta un GLB para la web (three.js cambia las
texturas por las de cada cliente) y, si se pide, un render de comprobación.

Uso (siempre con tools/blender_slot.py):
  python tools/blender_slot.py --label libro -- -b --factory-startup --python-exit-code 1 \
    --python blender/build_book.py -- --tex build/libro3d/tex --salida build/libro3d --render
"""
import argparse
import math
import sys
from pathlib import Path

import bmesh
import bpy

W = 0.19            # ancho (m)
H = 0.19            # alto
T = 0.0036          # bloque de 32 páginas de 90 g (aprox.; confirmar con Bubok)
C = 0.00045         # grosor de la cubierta (cartulina plastificada)
INSET = 0.0012      # las páginas quedan un pelo dentro de la cubierta


def arguments():
    p = argparse.ArgumentParser()
    p.add_argument("--tex", required=True)
    p.add_argument("--salida", required=True)
    p.add_argument("--render", action="store_true")
    p.add_argument("--abierto", type=float, default=0.0, help="ángulo de apertura de la portada en grados (render)")
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    return p.parse_args(argv)


def limpiar_escena():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material_imagen(nombre, ruta, rugosidad=0.45):
    mat = bpy.data.materials.new(nombre)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(str(ruta))
    tex.interpolation = "Smart"
    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = rugosidad
    return mat


def material_color(nombre, rgb, rugosidad=0.6):
    mat = bpy.data.materials.new(nombre)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = rugosidad
    return mat


def caja(nombre, x0, x1, y0, y1, z0, z1, materiales, cara_textura=None, origen=(0, 0, 0)):
    """Caja con un material por cara; la cara indicada ('-y', '+y'...) lleva UV 0..1"""
    mesh = bpy.data.meshes.new(nombre)
    obj = bpy.data.objects.new(nombre, mesh)
    bpy.context.collection.objects.link(obj)
    for m in materiales:
        obj.data.materials.append(m)

    bm = bmesh.new()
    ox, oy, oz = origen
    v = {}
    for ix, x in enumerate((x0, x1)):
        for iy, y in enumerate((y0, y1)):
            for iz, z in enumerate((z0, z1)):
                v[(ix, iy, iz)] = bm.verts.new((x - ox, y - oy, z - oz))
    caras = {
        "-y": [(0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)],
        "+y": [(1, 1, 0), (0, 1, 0), (0, 1, 1), (1, 1, 1)],
        "-x": [(0, 1, 0), (0, 0, 0), (0, 0, 1), (0, 1, 1)],
        "+x": [(1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1)],
        "-z": [(0, 1, 0), (1, 1, 0), (1, 0, 0), (0, 0, 0)],
        "+z": [(0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)],
    }
    uv = bm.loops.layers.uv.new("UVMap")
    for clave, idx in caras.items():
        f = bm.faces.new([v[i] for i in idx])
        f.material_index = 0 if clave == cara_textura else min(1, len(materiales) - 1)
        # UV: la cara con textura ocupa la imagen entera (vista desde fuera)
        esquinas = [(0, 0), (1, 0), (1, 1), (0, 1)]
        if clave == "+y":
            esquinas = [(0, 0), (1, 0), (1, 1), (0, 1)]
        for loop, (u, w) in zip(f.loops, esquinas):
            loop[uv].uv = (u, w)
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    obj.location = origen
    return obj


def construir(tex: Path):
    portada = material_imagen("portada", tex / "portada.png", rugosidad=0.32)   # plastificado brillo
    contra = material_imagen("contraportada", tex / "contra.png", rugosidad=0.32)
    pagina = material_imagen("pagina", tex / "pagina.png", rugosidad=0.85)
    canto = material_imagen("canto", tex / "canto.png", rugosidad=0.9)
    crema = material_color("interior_cubierta", (0.97, 0.94, 0.88), 0.8)
    borde = material_color("borde_cubierta", (0.93, 0.9, 0.84), 0.5)

    # Portada: gira sobre la bisagra (x = 0, y = -T/2)
    front = caja("portada", 0, W, -T / 2 - C, -T / 2, 0, H, [portada, borde],
                 cara_textura="-y", origen=(0, -T / 2, 0))
    # Cara interior de la portada en crema
    front.data.materials.append(crema)
    for p in front.data.polygons:
        if p.normal.y > 0.5:
            p.material_index = 2

    back = caja("contraportada", 0, W, T / 2, T / 2 + C, 0, H, [contra, borde], cara_textura="+y")
    # La contraportada se ve desde +Y: invertir U para que no salga en espejo
    uvl = back.data.uv_layers.active.data
    for p in back.data.polygons:
        if p.normal.y > 0.5:
            for li in p.loop_indices:
                u, w = uvl[li].uv
                uvl[li].uv = (1 - u, w)

    spine = caja("lomo", -C, 0, -T / 2 - C, T / 2 + C, 0, H, [borde])
    pages = caja("paginas", 0.0004, W - INSET, -T / 2 + 0.0001, T / 2 - 0.0001, INSET * 0.6, H - INSET * 0.6,
                 [canto, canto])
    # Primera ilustración, detrás de la portada (se ve al abrir)
    first = caja("primera_pagina", 0.0004, W - INSET, -T / 2 + 0.00005, -T / 2 + 0.0001, INSET * 0.6,
                 H - INSET * 0.6, [pagina, canto], cara_textura="-y")

    libro = bpy.data.objects.new("libro", None)
    bpy.context.collection.objects.link(libro)
    for o in (front, back, spine, pages, first):
        o.parent = libro
    # Datos para la web: qué malla lleva cada textura del cliente
    libro["librosia"] = {"version": 1, "trim_mm": 190, "texturas": {"portada": "portada", "contraportada": "contraportada",
                                                                  "primera_pagina": "pagina"}}
    return libro, front


def exportar(destino: Path):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=str(destino), export_format="GLB", use_selection=True, export_yup=True,
                              export_extras=True, export_animations=False, export_cameras=False, export_lights=False)


def render(destino: Path, front, abierto: float):
    scene = bpy.context.scene
    front.rotation_euler[2] = math.radians(-abierto)
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = 1600, 1000
    # Sin el tono "AgX" por defecto, que lava los colores claros de las ilustraciones
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.render.film_transparent = False
    world = bpy.data.worlds.new("mundo")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (1.0, 0.96, 0.9, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.55
    scene.world = world
    # Suelo
    bpy.ops.mesh.primitive_plane_add(size=2, location=(0.1, 0.05, -0.0005))
    bpy.context.active_object.data.materials.append(material_color("suelo", (0.98, 0.94, 0.88), 0.9))
    # Luces: principal cálida + relleno
    for loc, energia in (((-0.35, -0.45, 0.6), 22), ((0.6, -0.3, 0.3), 7)):
        bpy.ops.object.light_add(type="AREA", location=loc)
        luz = bpy.context.active_object
        luz.data.energy, luz.data.size = energia, 0.6
        luz.rotation_euler = (math.radians(55), 0, math.radians(-35 if loc[0] < 0 else 50))
    # Cámara: tres cuartos, un poco por encima
    bpy.ops.object.camera_add(location=(0.42, -0.5, 0.26))
    cam = bpy.context.active_object
    cam.data.lens = 50
    objetivo = bpy.data.objects.new("objetivo", None)
    bpy.context.collection.objects.link(objetivo)
    objetivo.location = (0.08 if abierto else 0.095, 0, 0.095)
    c = cam.constraints.new("TRACK_TO")
    c.target, c.track_axis, c.up_axis = objetivo, "TRACK_NEGATIVE_Z", "UP_Y"
    scene.camera = cam
    scene.render.filepath = str(destino)
    bpy.ops.render.render(write_still=True)


def main():
    args = arguments()
    salida = Path(args.salida)
    salida.mkdir(parents=True, exist_ok=True)
    limpiar_escena()
    _, front = construir(Path(args.tex))
    exportar(salida / "libro.glb")
    if args.render:
        render(salida / f"render-{int(args.abierto)}.png", front, args.abierto)
    print("TERMINADO", flush=True)


main()
