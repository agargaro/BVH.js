import { BVHNode, FloatArray } from '../core/BVHNode';
import { getLongestAxis } from '../utils/boxUtils';
import { IBVHBuilder, onLeafCreationCallback } from './IBVHBuilder';

export type TopDownNode<L> = BVHNode<{}, L>;

export class TopDownBuilder<L> implements IBVHBuilder<{}, L> {
  public root: TopDownNode<L> = null;

  public createFromArray(objects: L[], boxes: FloatArray[]): TopDownNode<L> {
    // this._strategy = params.strategy ?? SplitStrategy.centerCentroid;
    const maxCount = boxes.length;
    const typeArray = boxes[0].BYTES_PER_ELEMENT === 4 ? Float32Array : Float64Array; // hmm...
    const centroid = new typeArray(6);
    let axis: number;
    let position: number;

    this.root = buildNode(0, maxCount);

    return this.root;

    function buildNode(offset: number, count: number): TopDownNode<L> {
      if (count === 1) {
        return { box: boxes[offset], object: objects[offset] };
      }

      // const box = this._computeCentroids ? this.computeBBoxCentroid(centroid, offset, count) : this.computeBBox(offset, count);
      const box = computeBoxCentroid(offset, count);

      // updateSplitData(box, offset, count);
      updateSplitData();

      const leftEndOffset = split(offset, count);

      if (leftEndOffset === offset || leftEndOffset === offset + count) {
        // TROVARE ALTRA WAY TO SPLIT @todoooooooooo
        debugger;
        return { box, object: null };
      }

      return {
        box,
        left: buildNode(offset, leftEndOffset - offset),
        right: buildNode(leftEndOffset, count - leftEndOffset + offset)
      }
    }

    // return new bbox and update centroid
    function computeBoxCentroid(offset: number, count: number): FloatArray {
      const box = new typeArray(6);
      const end = offset + count;

      box[0] = Infinity;
      box[1] = -Infinity;
      box[2] = Infinity;
      box[3] = -Infinity;
      box[4] = Infinity;
      box[5] = -Infinity;

      centroid[0] = Infinity;
      centroid[1] = -Infinity;
      centroid[2] = Infinity;
      centroid[3] = -Infinity;
      centroid[4] = Infinity;
      centroid[5] = -Infinity;

      for (let i = offset; i < end; i++) {
        const boxToCheck = boxes[i];

        const xMin = boxToCheck[0];
        const xMax = boxToCheck[1];
        const yMin = boxToCheck[2];
        const yMax = boxToCheck[3];
        const zMin = boxToCheck[4];
        const zMax = boxToCheck[5];

        if (box[0] > xMin) box[0] = xMin;
        if (box[1] < xMax) box[1] = xMax;
        if (box[2] > yMin) box[2] = yMin;
        if (box[3] < yMax) box[3] = yMax;
        if (box[4] > zMin) box[4] = zMin;
        if (box[5] < zMax) box[5] = zMax;

        const xCenter = (xMax + xMin) * 0.5;
        const yCenter = (yMax + yMin) * 0.5;
        const zCenter = (zMax + zMin) * 0.5;

        if (centroid[0] > xCenter) centroid[0] = xCenter;
        if (centroid[1] < xCenter) centroid[1] = xCenter;
        if (centroid[2] > yCenter) centroid[2] = yCenter;
        if (centroid[3] < yCenter) centroid[3] = yCenter;
        if (centroid[4] > zCenter) centroid[4] = zCenter;
        if (centroid[5] < zCenter) centroid[5] = zCenter;
      }

      return box;
    }

    function updateSplitData(box?: FloatArray, offset?: number, count?: number): void {
      axis = getLongestAxis(centroid) * 2; // or we can get average
      position = (centroid[axis] + centroid[axis + 1]) * 0.5;
    }

    function split(offset: number, count: number): number {
      let left = offset;
      let right = offset + count - 1;

      while (left <= right) {
        const boxLeft = boxes[left];
        if ((boxLeft[axis + 1] + boxLeft[axis]) * 0.5 >= position) { // if equals, lies on right
          while (true) {
            const boxRight = boxes[right];
            if ((boxRight[axis + 1] + boxRight[axis]) * 0.5 < position) {

              const tempObject = objects[left];
              objects[left] = objects[right];
              objects[right] = tempObject;

              const tempBox = boxes[left];
              boxes[left] = boxes[right];
              boxes[right] = tempBox;

              right--;
              break;
            }

            right--;
            if (right <= left) return left;
          }
        }

        left++;
      }

      return left;
    }
  }

  public insert(object: L, box: FloatArray): TopDownNode<L> {
    throw new Error('Method not implemented.');
  }

  public insertRange(objects: L[], boxes: FloatArray[], onLeafCreation?: onLeafCreationCallback<{}, L>): void {
    throw new Error('Method not implemented.');
  }

  public move(node: TopDownNode<L>): void {
    throw new Error('Method not implemented.');
  }

  public delete(node: TopDownNode<L>): TopDownNode<L> {
    throw new Error('Method not implemented.');
  }

  public clear(): void {
    this.root = null;
  }

}
