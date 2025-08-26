import { FloatArray } from '../builder/IBVHBuilder.js';

// TODO improve name

export function unionBox(box: FloatArray, srcA: number, srcB: number, dstId: number): void {
  box[dstId] = box[srcA] > box[srcB] ? box[srcB] : box[srcA];
  box[dstId + 1] = box[srcA + 1] < box[srcB + 1] ? box[srcB + 1] : box[srcA + 1];
  box[dstId + 2] = box[srcA + 2] > box[srcB + 2] ? box[srcB + 2] : box[srcA + 2];
  box[dstId + 3] = box[srcA + 3] < box[srcB + 3] ? box[srcB + 3] : box[srcA + 3];
  box[dstId + 4] = box[srcA + 4] > box[srcB + 4] ? box[srcB + 4] : box[srcA + 4];
  box[dstId + 5] = box[srcA + 5] < box[srcB + 5] ? box[srcB + 5] : box[srcA + 5];
}

export function unionBoxChanged(box: FloatArray, srcA: number, srcB: number, dstId: number): boolean {
  let changed = false;

  const t0 = box[srcA] > box[srcB] ? box[srcB] : box[srcA];
  const t1 = box[srcA + 1] < box[srcB + 1] ? box[srcB + 1] : box[srcA + 1];
  const t2 = box[srcA + 2] > box[srcB + 2] ? box[srcB + 2] : box[srcA + 2];
  const t3 = box[srcA + 3] < box[srcB + 3] ? box[srcB + 3] : box[srcA + 3];
  const t4 = box[srcA + 4] > box[srcB + 4] ? box[srcB + 4] : box[srcA + 4];
  const t5 = box[srcA + 5] < box[srcB + 5] ? box[srcB + 5] : box[srcA + 5];

  if (box[dstId] > t0) {
    box[dstId] = t0;
    changed = true;
  }

  if (box[dstId + 1] < t1) {
    box[dstId + 1] = t1;
    changed = true;
  }

  if (box[dstId + 2] > t2) {
    box[dstId + 2] = t2;
    changed = true;
  }

  if (box[dstId + 3] < t3) {
    box[dstId + 3] = t3;
    changed = true;
  }

  if (box[dstId + 4] > t4) {
    box[dstId + 4] = t4;
    changed = true;
  }

  if (box[dstId + 5] < t5) {
    box[dstId + 5] = t5;
    changed = true;
  }

  return changed;
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

export function isExpanded(box: FloatArray, src: number, dst: number): boolean {
  let expanded = false;

  if (box[dst] > box[src]) {
    box[dst] = box[src];
    expanded = true;
  }

  if (box[dst + 1] < box[src + 1]) {
    box[dst + 1] = box[src + 1];
    expanded = true;
  }

  if (box[dst + 2] > box[src + 2]) {
    box[dst + 2] = box[src + 2];
    expanded = true;
  }

  if (box[dst + 3] < box[src + 3]) {
    box[dst + 3] = box[src + 3];
    expanded = true;
  }

  if (box[dst + 4] > box[src + 4]) {
    box[dst + 4] = box[src + 4];
    expanded = true;
  }

  if (box[dst + 5] < box[src + 5]) {
    box[dst + 5] = box[src + 5];
    expanded = true;
  }

  return expanded;
}

export function expandBox(A: FloatArray, target: FloatArray): void {
  if (target[0] > A[0]) target[0] = A[0];
  if (target[1] < A[1]) target[1] = A[1];
  if (target[2] > A[2]) target[2] = A[2];
  if (target[3] < A[3]) target[3] = A[3];
  if (target[4] > A[4]) target[4] = A[4];
  if (target[5] < A[5]) target[5] = A[5];
}

export function expandBoxByMargin(target: FloatArray, margin: number): void {
  target[0] -= margin;
  target[1] += margin;
  target[2] -= margin;
  target[3] += margin;
  target[4] -= margin;
  target[5] += margin;
}

export function areaBox(box: FloatArray, boxOffset: number): number {
  const d0 = box[boxOffset + 1] - box[boxOffset];
  const d1 = box[boxOffset + 3] - box[boxOffset + 2];
  const d2 = box[boxOffset + 5] - box[boxOffset + 4];

  return 2 * (d0 * d1 + d1 * d2 + d2 * d0);
}

export function areaFromTwoBoxes(box: FloatArray, offsetA: number, offsetB: number): number {
  const minX = box[offsetA] > box[offsetB] ? box[offsetB] : box[offsetA];
  const maxX = box[offsetA + 1] < box[offsetB + 1] ? box[offsetB + 1] : box[offsetA + 1];
  const minY = box[offsetA + 2] > box[offsetB + 2] ? box[offsetB + 2] : box[offsetA + 2];
  const maxY = box[offsetA + 3] < box[offsetB + 3] ? box[offsetB + 3] : box[offsetA + 3];
  const minZ = box[offsetA + 4] > box[offsetB + 4] ? box[offsetB + 4] : box[offsetA + 4];
  const maxZ = box[offsetA + 5] < box[offsetB + 5] ? box[offsetB + 5] : box[offsetA + 5];

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

export function minDistanceSqPointToBox(box: FloatArray, point: FloatArray): number {
  const xMin = box[0] - point[0];
  const xMax = point[0] - box[1];
  let dx = xMin > xMax ? xMin : xMax;
  if (dx < 0) dx = 0;

  const yMin = box[2] - point[1];
  const yMax = point[1] - box[3];
  let dy = yMin > yMax ? yMin : yMax;
  if (dy < 0) dy = 0;

  const zMin = box[4] - point[2];
  const zMax = point[2] - box[5];
  let dz = zMin > zMax ? zMin : zMax;
  if (dz < 0) dz = 0;

  return dx * dx + dy * dy + dz * dz;
}

export function minDistancePointToBox(box: FloatArray, point: FloatArray): number {
  return Math.sqrt(minDistanceSqPointToBox(box, point));
}

export function minMaxDistanceSqPointToBox(box: FloatArray, point: FloatArray): { min: number; max: number } {
  let dXmin, dXmax, dYmin, dYmax, dZmin, dZmax;

  const xMin = box[0] - point[0];
  const xMax = point[0] - box[1];

  if (xMin > xMax) {
    dXmin = xMin;
    dXmax = xMax;
  } else {
    dXmin = xMax;
    dXmax = xMin;
  }

  if (dXmin < 0) dXmin = 0;

  const yMin = box[2] - point[1];
  const yMax = point[1] - box[3];

  if (yMin > yMax) {
    dYmin = yMin;
    dYmax = yMax;
  } else {
    dYmin = yMax;
    dYmax = yMin;
  }

  if (dYmin < 0) dYmin = 0;

  const zMin = box[4] - point[2];
  const zMax = point[2] - box[5];

  if (zMin > zMax) {
    dZmin = zMin;
    dZmax = zMax;
  } else {
    dZmin = zMax;
    dZmax = zMin;
  }

  if (dZmin < 0) dZmin = 0;

  return {
    min: dXmin * dXmin + dYmin * dYmin + dZmin * dZmin,
    max: dXmax * dXmax + dYmax * dYmax + dZmax * dZmax
  };
}

export function minMaxDistancePointToBox(box: FloatArray, point: FloatArray): { min: number; max: number } {
  const result = minMaxDistanceSqPointToBox(box, point);
  result.min = Math.sqrt(result.min);
  result.max = Math.sqrt(result.max);
  return result;
}
