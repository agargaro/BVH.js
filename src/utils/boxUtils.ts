import { FloatArray } from '../core/BVHNode';

export function unionBox(A: FloatArray, B: FloatArray, target: FloatArray, margin: number): void {
  target[0] = (A[0] > B[0] ? B[0] : A[0]) - margin;
  target[1] = (A[1] < B[1] ? B[1] : A[1]) + margin;
  target[2] = (A[2] > B[2] ? B[2] : A[2]) - margin;
  target[3] = (A[3] < B[3] ? B[3] : A[3]) + margin;
  target[4] = (A[4] > B[4] ? B[4] : A[4]) - margin;
  target[5] = (A[5] < B[5] ? B[5] : A[5]) + margin;
}

export function isBoxInsideBox(A: FloatArray, B: FloatArray): boolean {
  if (B[0] > A[0]) return false;
  if (B[1] < A[1]) return false;
  if (B[2] > A[2]) return false;
  if (B[3] < A[3]) return false;
  if (B[4] > A[4]) return false;
  if (B[5] < A[5]) return false;
  return true;
}

export function expandBox(A: FloatArray, target: FloatArray): FloatArray {
  const a0 = A[0];
  const a1 = A[1];
  const a2 = A[2];
  const a3 = A[3];
  const a4 = A[4];
  const a5 = A[5];

  if (target[0] > a0) target[0] = a0;
  if (target[1] < a1) target[1] = a1;
  if (target[2] > a2) target[2] = a2;
  if (target[3] < a3) target[3] = a3;
  if (target[4] > a4) target[4] = a4;
  if (target[5] < a5) target[5] = a5;

  return target;
}

export function areaBox(box: FloatArray): number {
  const d0 = box[1] - box[0];
  const d1 = box[3] - box[2];
  const d2 = box[5] - box[4];

  return 2 * (d0 * d1 + d1 * d2 + d2 * d0);
}

export function areaFromTwoBoxes(A: FloatArray, B: FloatArray): number {
  const minX = A[0] > B[0] ? B[0] : A[0];
  const maxX = A[1] < B[1] ? B[1] : A[1];
  const minY = A[2] > B[2] ? B[2] : A[2];
  const maxY = A[3] < B[3] ? B[3] : A[3];
  const minZ = A[4] > B[4] ? B[4] : A[4];
  const maxZ = A[5] < B[5] ? B[5] : A[5];

  const d0 = maxX - minX;
  const d1 = maxY - minY;
  const d2 = maxZ - minZ;

  return 2 * (d0 * d1 + d1 * d2 + d2 * d0);
}

export function getLongestAxis(box: FloatArray): number {
  const xSize = box[1] - box[0];
  const ySize = box[3] - box[2];
  const zSize = box[5] - box[4];

  if (xSize > ySize) return xSize > zSize ? 0 : 2;
  return ySize > zSize ? 1 : 2;
}
