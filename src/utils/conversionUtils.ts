import { FloatArray } from "../core/BVHNode.js";

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface Box3 {
    min: Vector3;
    max: Vector3;
}

export function vec3ToArray(vector: Vector3, target: FloatArray): FloatArray {
    target[0] = vector.x;
    target[1] = vector.y;
    target[2] = vector.z;

    return target;
}

export function box3ToArray(box: Box3, target: FloatArray): FloatArray {
    const min = box.min;
    const max = box.max;

    target[0] = min.x;
    target[1] = max.x;
    target[2] = min.y;
    target[3] = max.y;
    target[4] = min.z;
    target[5] = max.z;

    return target;
}
