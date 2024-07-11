import { FloatArray } from "../core/BVHNode";

export const WebGLCoordinateSystem = 0;
export const WebGPUCoordinateSystem = 1;
export type CoordinateSystem = typeof WebGLCoordinateSystem | typeof WebGPUCoordinateSystem;

export class Frustum {
  public array = new Float64Array(24); // [plane normal X, plane normal Y, plane normal Z, plane constant, ...]
  public coordinateSystem: CoordinateSystem;

  constructor(coordinateSystem: CoordinateSystem) {
    this.coordinateSystem = coordinateSystem;
  }

  public setFromProjectionMatrix(mat: FloatArray | number[]): this {
    this.updatePlane(0, mat[3] + mat[0], mat[7] + mat[4], mat[11] + mat[8], mat[15] + mat[12]); // Left clipping plane
    this.updatePlane(1, mat[3] - mat[0], mat[7] - mat[4], mat[11] - mat[8], mat[15] - mat[12]); // Right clipping plane
    this.updatePlane(2, mat[3] - mat[1], mat[7] - mat[5], mat[11] - mat[9], mat[15] - mat[13]); // Top clipping plane
    this.updatePlane(3, mat[3] + mat[1], mat[7] + mat[5], mat[11] + mat[9], mat[15] + mat[13]); // Bottom clipping plane
    this.updatePlane(4, mat[3] - mat[2], mat[7] - mat[6], mat[11] - mat[10], mat[15] - mat[14]); // Far clipping plane

    if (this.coordinateSystem === WebGLCoordinateSystem) {

      this.updatePlane(5, mat[3] + mat[2], mat[7] + mat[6], mat[11] + mat[10], mat[15] + mat[14]) // Near clipping plane

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

  /** returns -1 = OUT, 0 = IN, > 0 = INTERSECT. */
  public intesectsBoxMask(box: FloatArray, mask: number): number {
    const array = this.array;
    let xMin: number, yMin: number, zMin: number, xMax: number, yMax: number, zMax: number;

    for (let i = 0; i < 6; i++) {
      if ((mask & (0b100000 >> i)) === 0) continue; // if bit i is 0

      const offset = i * 4;
      const px = array[offset + 0];
      const py = array[offset + 1];
      const pz = array[offset + 2];
      const planeConstant = array[offset + 3];

      if (px > 0) {
        xMin = box[1];
        xMax = box[0];
      } else {
        xMin = box[0];
        xMax = box[1];
      }

      if (py > 0) {
        yMin = box[3];
        yMax = box[2];
      } else {
        yMin = box[2];
        yMax = box[3];
      }

      if (pz > 0) {
        zMin = box[5];
        zMax = box[4];
      } else {
        zMin = box[4];
        zMax = box[5];
      }

      if ((px * xMin) + (py * yMin) + (pz * zMin) < -planeConstant) {
        return -1; // is out
      }

      if ((px * xMax) + (py * yMax) + (pz * zMax) > -planeConstant) {
        mask ^= 0b100000 >> i; // is full in, set bit i to 0
      }
    }

    return mask;
  }
}
