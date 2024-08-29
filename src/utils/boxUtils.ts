import { FloatArray } from '../core/BVHNode.js';

export function unionBox(A: FloatArray, B: FloatArray, target: FloatArray): void {
  target[0] = A[0] > B[0] ? B[0] : A[0];
  target[1] = A[1] < B[1] ? B[1] : A[1];
  target[2] = A[2] > B[2] ? B[2] : A[2];
  target[3] = A[3] < B[3] ? B[3] : A[3];
  target[4] = A[4] > B[4] ? B[4] : A[4];
  target[5] = A[5] < B[5] ? B[5] : A[5];
}

export function unionBoxMargin(A: FloatArray, B: FloatArray, target: FloatArray, margin: number): void {
  target[0] = (A[0] > B[0] ? B[0] : A[0]) - margin;
  target[1] = (A[1] < B[1] ? B[1] : A[1]) + margin;
  target[2] = (A[2] > B[2] ? B[2] : A[2]) - margin;
  target[3] = (A[3] < B[3] ? B[3] : A[3]) + margin;
  target[4] = (A[4] > B[4] ? B[4] : A[4]) - margin;
  target[5] = (A[5] < B[5] ? B[5] : A[5]) + margin;
}

export function isBoxInsideBox(innerBox: FloatArray, outerBox: FloatArray): boolean {
  if (outerBox[0] > innerBox[0]) return false;
  if (outerBox[1] < innerBox[1]) return false;
  if (outerBox[2] > innerBox[2]) return false;
  if (outerBox[3] < innerBox[3]) return false;
  if (outerBox[4] > innerBox[4]) return false;
  if (outerBox[5] < innerBox[5]) return false;
  return true;
}

export function expandBox(A: FloatArray, target: FloatArray, margin: number): boolean {
  let expanded = false;

  const a0 = A[0] - margin; // TODO capire se serve
  const a1 = A[1] + margin;
  const a2 = A[2] - margin;
  const a3 = A[3] + margin;
  const a4 = A[4] - margin;
  const a5 = A[5] + margin;

  if (target[0] > a0) {
    target[0] = a0;
    expanded = true;
  }

  if (target[1] < a1) {
    target[1] = a1;
    expanded = true;
  }

  if (target[2] > a2) {
    target[2] = a2;
    expanded = true;
  }

  if (target[3] < a3) {
    target[3] = a3;
    expanded = true;
  }

  if (target[4] > a4) {
    target[4] = a4;
    expanded = true;
  }

  if (target[5] < a5) {
    target[5] = a5;
    expanded = true;
  }

  return expanded;
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

export function closestDistanceSquaredPointToBox(box: FloatArray, point: FloatArray) {
  const xMin = box[0] - point[0];
  const xMax = point[0] - box[1];
  const dx = xMin > xMax ? (xMin > 0 ? xMin : 0) : (xMax > 0 ? xMax : 0);

  const yMin = box[2] - point[1];
  const yMax = point[1] - box[3];
  const dy = yMin > yMax ? (yMin > 0 ? yMin : 0) : (yMax > 0 ? yMax : 0);

  const zMin = box[4] - point[2];
  const zMax = point[2] - box[5];
  const dz = zMin > zMax ? (zMin > 0 ? zMin : 0) : (zMax > 0 ? zMax : 0);

  // TODO refactor

  return dx * dx + dy * dy + dz * dz;
}

export function closestDistancePointToBox(box: FloatArray, point: FloatArray) {
  return Math.sqrt(closestDistanceSquaredPointToBox(box, point));
}
