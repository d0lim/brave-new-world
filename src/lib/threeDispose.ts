import type { BufferGeometry, Material, Object3D, Texture } from "three";

export function disposeGeometry(geometry: BufferGeometry | null | undefined): void {
  geometry?.dispose();
}

export function disposeTexture(texture: Texture | null | undefined): void {
  texture?.dispose();
}

export function disposeMaterial(material: Material | Material[] | null | undefined): void {
  if (!material) return;
  const materials = Array.isArray(material) ? material : [material];
  for (const mat of materials) {
    mat.dispose();
    for (const value of Object.values(mat)) {
      if (value && typeof value === "object" && "isTexture" in value) {
        const tex = value as Texture;
        if (tex.isTexture) tex.dispose();
      }
    }
  }
}

/** Mesh·Line 등 geometry/material 보유 Object3D 정리 */
export function disposeObject3DResources(
  object: Pick<Object3D, "traverse"> | null | undefined,
): void {
  if (!object) return;
  object.traverse((node) => {
    const mesh = node as Object3D & {
      geometry?: BufferGeometry;
      material?: Material | Material[];
    };
    if (mesh.geometry) disposeGeometry(mesh.geometry);
    if (mesh.material) disposeMaterial(mesh.material);
  });
}
