import { FloatArray } from '../core/BVHNode.js';

export const WebGLCoordinateSystem = 0;
export const WebGPUCoordinateSystem = 1;
export type CoordinateSystem = typeof WebGLCoordinateSystem | typeof WebGPUCoordinateSystem;

export class Frustum {
  public array: FloatArray; // [plane normal X, plane normal Y, plane normal Z, plane constant, ...]
  public coordinateSystem: CoordinateSystem;

  constructor(highPrecision: boolean, coordinateSystem: CoordinateSystem) {
    this.coordinateSystem = coordinateSystem;
    this.array = highPrecision ? new Float64Array(24) : new Float32Array(24);
  }

  public setFromProjectionMatrix(mat: FloatArray | number[]): this {
    this.updatePlane(0, mat[3] + mat[0], mat[7] + mat[4], mat[11] + mat[8], mat[15] + mat[12]); // Left clipping plane
    this.updatePlane(1, mat[3] - mat[0], mat[7] - mat[4], mat[11] - mat[8], mat[15] - mat[12]); // Right clipping plane
    this.updatePlane(2, mat[3] - mat[1], mat[7] - mat[5], mat[11] - mat[9], mat[15] - mat[13]); // Top clipping plane
    this.updatePlane(3, mat[3] + mat[1], mat[7] + mat[5], mat[11] + mat[9], mat[15] + mat[13]); // Bottom clipping plane
    this.updatePlane(4, mat[3] - mat[2], mat[7] - mat[6], mat[11] - mat[10], mat[15] - mat[14]); // Far clipping plane

    if (this.coordinateSystem === WebGLCoordinateSystem) {
      this.updatePlane(5, mat[3] + mat[2], mat[7] + mat[6], mat[11] + mat[10], mat[15] + mat[14]); // Near clipping plane
    } else if (this.coordinateSystem === WebGPUCoordinateSystem) {
      this.updatePlane(5, mat[2], mat[6], mat[10], mat[14]); // Near clipping plane
    } else throw new Error('Invalid coordinate system: ' + this.coordinateSystem);

    return this;
  }

  protected updatePlane(index: number, x: number, y: number, z: number, constant: number): void {
    const array = this.array;
    const offset = index * 4;
    const length = Math.sqrt(x * x + y * y + z * z);
    array[offset + 0] = x / length;
    array[offset + 1] = y / length;
    array[offset + 2] = z / length;
    array[offset + 3] = constant / length;
  }

  /** @internal returns -1 = OUT, 0 = IN, > 0 = INTERSECT. */
  public intersectsBoxMask(box: FloatArray, mask: number): number {
    const array = this.array;
    for (let i = 0; i < 6; i++) {
      const bit = 0b100000 >> i;
      if ((mask & bit) === 0) continue;

      const offset = i * 4;
      const px = array[offset];
      const py = array[offset + 1];
      const pz = array[offset + 2];
      const planeConstant = array[offset + 3];

      const ix = px > 0 ? 1 : 0;
      const iy = py > 0 ? 3 : 2;
      const iz = pz > 0 ? 5 : 4;

      const xMin = box[ix];
      const xMax = box[ix ^ 1];
      const yMin = box[iy];
      const yMax = box[iy ^ 1];
      const zMin = box[iz];
      const zMax = box[iz ^ 1];

      const minDot = (px * xMin) + (py * yMin) + (pz * zMin);
      if (minDot < -planeConstant) {
        return -1;
      }

      const maxDot = (px * xMax) + (py * yMax) + (pz * zMax);
      if (maxDot > -planeConstant) {
        mask ^= bit;
      }
    }
    return mask;
  }

  /** @internal */
  public isIntersected(box: FloatArray, mask: number): boolean {
    const array = this.array;
    for (let i = 0; i < 6; i++) {
      const bit = 0b100000 >> i;
      if ((mask & bit) === 0) continue;

      const offset = i * 4;
      const px = array[offset];
      const py = array[offset + 1];
      const pz = array[offset + 2];
      const planeConstant = array[offset + 3];

      const xMin = px > 0 ? box[1] : box[0];
      const yMin = py > 0 ? box[3] : box[2];
      const zMin = pz > 0 ? box[5] : box[4];

      const minDot = (px * xMin) + (py * yMin) + (pz * zMin);
      if (minDot < -planeConstant) return false;
    }
    return true;
  }

  // use it only in 'onFrustumIntersectionCallback' if you have margin > 0.
  public isIntersectedMargin(box: FloatArray, mask: number, margin: number): boolean {
    if (mask === 0) return true;
    const array = this.array;
    for (let i = 0; i < 6; i++) {
      const bit = 0b100000 >> i;
      if ((mask & bit) === 0) continue;

      const offset = i * 4;
      const px = array[offset];
      const py = array[offset + 1];
      const pz = array[offset + 2];
      const planeConstant = array[offset + 3];

      const xMin = px > 0 ? box[1] - margin : box[0] + margin;
      const yMin = py > 0 ? box[3] - margin : box[2] + margin;
      const zMin = pz > 0 ? box[5] - margin : box[4] + margin;

      const minDot = (px * xMin) + (py * yMin) + (pz * zMin);
      if (minDot < -planeConstant) return false;
    }
    return true;
  }
}
