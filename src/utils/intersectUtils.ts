import { FloatArray } from "../core/BVHNode";

export function intersectRayBox(box: FloatArray, origins: FloatArray, dirsInv: FloatArray, signs: Uint8Array, near: number, far: number): boolean {
    // X axis
    
    let sign = signs[0];
    let origin = origins[0];
    let dirInv = dirsInv[0];

    let min = (box[sign] - origin) * dirInv;
    let max = (box[sign ^ 0b1] - origin) * dirInv;

    let tmin = min > 0 ? min : 0; // this will exclude NaN
    let tmax = max < Infinity ? max : Infinity;

    // Y axis

    sign = signs[1];
    origin = origins[1];
    dirInv = dirsInv[1];

    min = (box[sign + 2] - origin) * dirInv;
    if (min > tmax) return false;
    
    max = (box[sign ^ 0b1 + 2] - origin) * dirInv;
    if (tmin > max) return false;

    tmin = min > tmin ? min : tmin;
    tmax = max < tmax ? max : tmax;

    // Z axis

    sign = signs[2];
    origin = origins[2];
    dirInv = dirsInv[2];

    min = (box[sign + 4] - origin) * dirInv;
    if (min > tmax) return false;
    
    max = (box[sign ^ 0b1 + 4] - origin) * dirInv;
    if (tmin > max) return false;

    tmin = min > tmin ? min : tmin;
    tmax = max < tmax ? max : tmax;

    return tmin <= far && tmax >= near;
}
