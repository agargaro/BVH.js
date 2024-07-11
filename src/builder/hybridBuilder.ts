import { BVHNode, FloatArray } from '../core/BVHNode';
import { areaBox, areaFromTwoBoxes, getLongestAxis, isBoxInsideBox, unionBox } from '../utils/boxUtils';
import { IBVHBuilder, onLeafCreationCallback } from './IBVHBuilder';

export type HybridNode<L> = BVHNode<HybridNodeData<L>, L>;

export type HybridNodeData<L> = {
  parent?: HybridNode<L>;
  area?: number;
};

export class HybridBuilder<L> implements IBVHBuilder<HybridNodeData<L>, L> {
  public root: HybridNode<L> = null;
  protected _margin: number;

  constructor(margin: number) {
    this._margin = margin;
  }

  public createFromArray(objects: L[], boxes: FloatArray[], onLeafCreation?: onLeafCreationCallback<HybridNodeData<L>, L>): void {
    const margin = this._margin;
    const maxCount = boxes.length;
    const typeArray = boxes[0].BYTES_PER_ELEMENT === 4 ? Float32Array : Float64Array;
    const centroid = new typeArray(6);
    let axis: number;
    let position: number;

    this.root = buildNode(0, maxCount, null);

    return; // is this useless probably TODO remove

    function buildNode(offset: number, count: number, parent: HybridNode<L>): HybridNode<L> {
      if (count === 1) {
        const box = boxes[offset];
        const node = { box, object: objects[offset], area: areaBox(box), parent };
        if (onLeafCreation) onLeafCreation(node);
        return node;
      }

      const box = computeBoxCentroid(offset, count);

      updateSplitData();

      const leftEndOffset = split(offset, count);

      if (leftEndOffset === offset || leftEndOffset === offset + count) {
        // TROVARE ALTRA WAY TO SPLIT @todoooooooooo
        // onLeafCreation TODO
        throw new Error('SPLIT FAILED.');
        // return { box, object: null, area: areaBox(box) };
      }

      const node: HybridNode<L> = { box, area: areaBox(box), parent };

      node.left = buildNode(offset, leftEndOffset - offset, node);
      node.right = buildNode(leftEndOffset, count - leftEndOffset + offset, node);

      return node;
    }

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

      box[0] -= margin;
      box[1] += margin;
      box[2] -= margin;
      box[3] += margin;
      box[4] -= margin;
      box[5] += margin;

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

  public insert(object: L, box: FloatArray): HybridNode<L> {
    const leaf = this.createLeafNode(object, box);

    if (this.root === null) {
      leaf.area = areaBox(box);
      this.root = leaf;
    } else {
      this.insertLeaf(leaf);
    }

    return leaf;
  }

  public insertRange(objects: L[], boxes: FloatArray[], onLeafCreation?: onLeafCreationCallback<HybridNodeData<L>, L>): void {
    throw new Error('Method not implemented.');
  }

  //update node.box before calling this function
  public move(node: HybridNode<L>): void {
    if (isBoxInsideBox(node.box, node.parent.box)) return;

    const deletedNode = this.delete(node);
    this.insertLeaf(node, deletedNode);
  }

  public delete(node: HybridNode<L>): HybridNode<L> {
    const parent = node.parent;
    const parent2 = parent.parent;

    const oppositeLeaf = parent.left === node ? parent.right : parent.left;

    oppositeLeaf.parent = parent2;
    node.parent = null;

    if (parent2 === null) {
      this.root = oppositeLeaf;
      return parent;
    }

    if (parent2.left === parent) parent2.left = oppositeLeaf;
    else parent2.right = oppositeLeaf;

    // parent.parent = null;
    // parent.left = null;
    // parent.right = null; // GC should work anyway

    this.refit(parent2); // i don't think we need rotation here

    return parent;
  }

  public clear(): void {
    this.root = null;
  }

  protected insertLeaf(leaf: HybridNode<L>, newParent?: HybridNode<L>): void {
    const area = !newParent ? areaBox(leaf.box) : leaf.area;

    const sibling = this.findBestSibling(leaf.box, area);

    const oldParent = sibling.parent;

    if (!newParent) {
      leaf.area = area;
      newParent = this.createInternalNode(oldParent, sibling, leaf);
    } else {
      newParent.parent = oldParent;
      newParent.left = sibling;
      newParent.right = leaf;
    }

    sibling.parent = newParent;
    leaf.parent = newParent;

    if (oldParent === null) {
      // The sibling was the root
      this.root = newParent;
    } else {
      if (oldParent.left == sibling) oldParent.left = newParent;
      else oldParent.right = newParent;
    }

    this.refitAndRotate(newParent);
  }

  protected createLeafNode(object: L, box: FloatArray): HybridNode<L> {
    return { box, object, parent: null, area: null };
  }

  protected createInternalNode(parent: HybridNode<L>, sibling: HybridNode<L>, leaf: HybridNode<L>): HybridNode<L> {
    return { parent, left: sibling, right: leaf, box: new Float64Array(6) };
  }

  protected findBestSibling(leafBox: FloatArray, leafArea: number): HybridNode<L> {
    const root = this.root;
    let bestNode = root;
    let bestCost = areaFromTwoBoxes(leafBox, root.box);

    _findBestSibling(root, bestCost - root.area);

    return bestNode;

    function _findBestSibling(node: HybridNode<L>, inheritedCost: number): void {
      if (node.object) return;

      const nodeL = node.left;
      const nodeR = node.right;

      const directCostL = areaFromTwoBoxes(leafBox, nodeL.box);
      const currentCostL = directCostL + inheritedCost;
      const inheritedCostL = inheritedCost + directCostL - nodeL.area;

      const directCostR = areaFromTwoBoxes(leafBox, nodeR.box);
      const currentCostR = directCostR + inheritedCost;
      const inheritedCostR = inheritedCost + directCostR - nodeR.area;

      if (currentCostL > currentCostR) {
        if (bestCost > currentCostR) {
          bestNode = nodeR;
          bestCost = currentCostR;
        }
      } else {
        if (bestCost > currentCostL) {
          bestNode = nodeL;
          bestCost = currentCostL;
        }
      }

      if (inheritedCostR > inheritedCostL) {

        if (leafArea + inheritedCostL >= bestCost) return;
        _findBestSibling(nodeL, inheritedCostL);

        if (leafArea + inheritedCostR >= bestCost) return;
        _findBestSibling(nodeR, inheritedCostR);

      } else {

        if (leafArea + inheritedCostR >= bestCost) return;
        _findBestSibling(nodeR, inheritedCostR);

        if (leafArea + inheritedCostL >= bestCost) return;
        _findBestSibling(nodeL, inheritedCostL);

      }
    }
  }

  protected refit(node: HybridNode<L>): void {
    const margin = this._margin;

    do {
      const left = node.left;
      const right = node.right;
      const nodeBox = node.box;

      // TODO CHECK if area doesn't change, stop iterating

      unionBox(left.box, right.box, nodeBox, margin);
      node.area = areaBox(nodeBox);

      node = node.parent;
    } while (node);
  }

  protected refitAndRotate(node: HybridNode<L>): void {
    const margin = this._margin;

    do {
      const left = node.left;
      const right = node.right;
      const nodeBox = node.box;
      const leftBox = left.box;
      const rightBox = right.box;

      unionBox(leftBox, rightBox, nodeBox, margin);
      node.area = areaBox(nodeBox);

      let nodeSwap1: HybridNode<L>;
      let nodeSwap2: HybridNode<L>;
      let bestCost = 0; // todo can we use rotatationBestCostTolerance?

      if (!right.object) { // is not leaf
        const RL = right.left;
        const RR = right.right;
        const rightArea = right.area;

        const diffRR = rightArea - areaFromTwoBoxes(leftBox, RL.box);
        const diffRL = rightArea - areaFromTwoBoxes(leftBox, RR.box);

        if (diffRR > diffRL) {
          if (diffRR > 0) {
            nodeSwap1 = left;
            nodeSwap2 = RR;
            bestCost = diffRR;
          }
        } else if (diffRL > 0) {
          nodeSwap1 = left;
          nodeSwap2 = RL;
          bestCost = diffRL;
        }
      }

      if (!left.object) { // is not leaf
        const LL = left.left;
        const LR = left.right;
        const leftArea = left.area;

        const diffLR = leftArea - areaFromTwoBoxes(rightBox, LL.box);
        const diffLL = leftArea - areaFromTwoBoxes(rightBox, LR.box);

        if (diffLR > diffLL) {
          if (diffLR > bestCost) {
            nodeSwap1 = right;
            nodeSwap2 = LR;
          }
        } else if (diffLL > bestCost) {
          nodeSwap1 = right;
          nodeSwap2 = LL;
        }
      }

      if (nodeSwap1) {
        this.swap(nodeSwap1, nodeSwap2);
      }

      node = node.parent;
    } while (node);
  }

  // this works only for rotation
  protected swap(A: HybridNode<L>, B: HybridNode<L>): void {
    const parentA = A.parent;
    const parentB = B.parent;
    const parentBox = parentB.box;

    if (parentA.left === A) parentA.left = B;
    else parentA.right = B;

    if (parentB.left === B) parentB.left = A;
    else parentB.right = A;

    A.parent = parentB;
    B.parent = parentA;

    unionBox(parentB.left.box, parentB.right.box, parentBox, this._margin);
    parentB.area = areaBox(parentBox);
  }

}
