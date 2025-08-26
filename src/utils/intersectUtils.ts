import { FloatArray } from '../builder/IBVHBuilder.js';
import { minDistanceSqPointToBox } from './boxUtils.js';

export function intersectRayBox(box: FloatArray, origins: FloatArray, dirsInv: FloatArray, signs: Uint8Array, near: number, far: number): boolean {
  const xSign = signs[0];
  const ySign = signs[1];
  const zSign = signs[2];
  const xOrigin = origins[0];
  const yOrigin = origins[1];
  const zOrigin = origins[2];
  const xDirInv = dirsInv[0];
  const yDirInv = dirsInv[1];
  const zDirInv = dirsInv[2];

  // X
  const xMin = (box[xSign] - xOrigin) * xDirInv;
  const xMax = (box[xSign ^ 1] - xOrigin) * xDirInv;
  let tmin = xMin > 0 ? xMin : 0;
  let tmax = xMax < Infinity ? xMax : Infinity;

  // Y
  const yMin = (box[ySign + 2] - yOrigin) * yDirInv;
  if (yMin > tmax) return false;
  const yMax = (box[ySign ^ 1 + 2] - yOrigin) * yDirInv;
  if (tmin > yMax) return false;
  tmin = yMin > tmin ? yMin : tmin;
  tmax = yMax < tmax ? yMax : tmax;

  // Z
  const zMin = (box[zSign + 4] - zOrigin) * zDirInv;
  if (zMin > tmax) return false;
  const zMax = (box[zSign ^ 1 + 4] - zOrigin) * zDirInv;
  if (tmin > zMax) return false;
  tmin = zMin > tmin ? zMin : tmin;
  tmax = zMax < tmax ? zMax : tmax;

  return tmin <= far && tmax >= near;
}

export function intersectBoxBox(A: FloatArray, B: FloatArray): boolean {
  return A[1] >= B[0] && B[1] >= A[0] && A[3] >= B[2] && B[3] >= A[2] && A[5] >= B[4] && B[5] >= A[4];
}

export function intersectSphereBox(center: FloatArray, radius: number, box: FloatArray): boolean {
  return minDistanceSqPointToBox(box, center) <= radius * radius;
}
