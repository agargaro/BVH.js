import { BVHNode, FloatArray, FloatArrayType } from '../core/BVHNode.js';
import { areaBox, areaFromTwoBoxes, expandBoxByMargin, getLongestAxis, isBoxInsideBox, isExpanded, unionBox, unionBoxChanged } from '../utils/boxUtils.js';
import { SortedListPriority } from '../utils/sortedListPriority.js';
import { IBVHBuilder, onLeafCreationCallback } from './IBVHBuilder.js';

export class HybridBuilder<N = {}, L = {}> implements IBVHBuilder<N, L> {
  public root: BVHNode<N, L> = null;
  public readonly highPrecision: boolean;
  protected _sortedList = new SortedListPriority();
  protected _typeArray: FloatArrayType;
  protected count = 0;

  constructor(highPrecision = false) {
    this.highPrecision = highPrecision;
    this._typeArray = highPrecision ? Float64Array : Float32Array;
  }

  public createFromArray(objects: L[], boxes: FloatArray[], onLeafCreation?: onLeafCreationCallback<N, L>, margin = 0): void {
    const maxCount = boxes.length;
    const typeArray = this._typeArray;
    if (typeArray !== (boxes[0].BYTES_PER_ELEMENT === 4 ? Float32Array : Float64Array)) console.warn('Different precision.');
    const centroid = new typeArray(6);
    let axis: number;
    let position: number;

    this.root = buildNode(0, maxCount, null);

    function buildNode(offset: number, count: number, parent: BVHNode<N, L>): BVHNode<N, L> {
      if (count === 1) {
        const box = boxes[offset];
        if (margin > 0) expandBoxByMargin(box, margin);
        const node = { box, object: objects[offset], parent } as BVHNode<N, L>;
        if (onLeafCreation) onLeafCreation(node);
        return node;
      }

      const box = computeBoxCentroid(offset, count);

      updateSplitData();

      // const leftEndOffset = split(offset, count);
      let leftEndOffset = split(offset, count);

      if (leftEndOffset === offset || leftEndOffset === offset + count) {
        leftEndOffset = offset + (count >> 1); // this is a workaround. TODO IMPROVE THIS TRYING DIFFERENT AXIS
      }

      const node = { box, parent } as BVHNode<N, L>;

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

    // function updateSplitData(box?: FloatArray, offset?: number, count?: number): void { TODO
    function updateSplitData(): void {
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

  public insert(object: L, box: FloatArray, margin: number): BVHNode<N, L> {
    if (margin > 0) expandBoxByMargin(box, margin);
    const leaf = this.createLeafNode(object, box);

    if (this.root === null) this.root = leaf;
    else this.insertLeaf(leaf);

    this.count++;
    return leaf;
  }

  public insertRange(objects: L[], boxes: FloatArray[], margins?: number | FloatArray | number[], onLeafCreation?: onLeafCreationCallback<N, L>): void {
    console.warn('Method not optimized yet. It just calls \'insert\' N times.');

    const count = objects.length;
    const margin = (margins as number) > 0 ? margins : (!margins ? 0 : null);

    for (let i = 0; i < count; i++) {
      const node = this.insert(objects[i], boxes[i], margin ?? margins[i]);
      if (onLeafCreation) onLeafCreation(node);
    }
  }

  // update node.box before calling this function
  public move(node: BVHNode<N, L>, margin: number): void {
    if (!node.parent || isBoxInsideBox(node.box, node.parent.box)) {
      if (margin > 0) expandBoxByMargin(node.box, margin);
      return;
    }

    if (margin > 0) expandBoxByMargin(node.box, margin);

    const deletedNode = this.delete(node);
    this.insertLeaf(node, deletedNode);
    this.count++;
  }

  public delete(node: BVHNode<N, L>): BVHNode<N, L> {
    const parent = node.parent;

    if (parent === null) {
      this.root = null;
      return null;
    }

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

    // parent.parent = null; parent.left = null; parent.right = null; // GC should work anyway

    this.refit(parent2); // i don't think we need rotation here

    this.count--;

    return parent;
  }

  public clear(): void {
    this.root = null;
  }

  protected insertLeaf(leaf: BVHNode<N, L>, newParent?: BVHNode<N, L>): void {
    const sibling = this.findBestSibling(leaf.box);

    const oldParent = sibling.parent;

    if (newParent === undefined) {
      newParent = this.createInternalNode(oldParent, sibling, leaf);
    } else {
      newParent.parent = oldParent;
      newParent.left = sibling;
      newParent.right = leaf;
    }

    sibling.parent = newParent;
    leaf.parent = newParent;

    if (oldParent === null) this.root = newParent;
    else if (oldParent.left === sibling) oldParent.left = newParent;
    else oldParent.right = newParent;

    this.refitAndRotate(leaf, sibling);
  }

  protected createLeafNode(object: L, box: FloatArray): BVHNode<N, L> {
    return { box, object, parent: null } as BVHNode<N, L>;
  }

  protected createInternalNode(parent: BVHNode<N, L>, sibling: BVHNode<N, L>, leaf: BVHNode<N, L>): BVHNode<N, L> {
    return { parent, left: sibling, right: leaf, box: new this._typeArray(6) } as BVHNode<N, L>;
  }

  protected findBestSibling(leafBox: FloatArray): BVHNode<N, L> {
    const root = this.root;
    let bestNode = root;
    let bestCost = areaFromTwoBoxes(leafBox, root.box);
    const leafArea = areaBox(leafBox);

    if (root.object !== undefined) return root;

    const sortedList = this._sortedList;
    sortedList.clear();
    let nodeObj = { node: root, inheritedCost: bestCost - areaBox(root.box) };

    do {
      const { node, inheritedCost } = nodeObj;

      if (leafArea + inheritedCost >= bestCost) break;

      const nodeL = node.left;
      const nodeR = node.right;

      const directCostL = areaFromTwoBoxes(leafBox, nodeL.box);
      const currentCostL = directCostL + inheritedCost;
      const inheritedCostL = currentCostL - areaBox(nodeL.box);

      const directCostR = areaFromTwoBoxes(leafBox, nodeR.box);
      const currentCostR = directCostR + inheritedCost;
      const inheritedCostR = currentCostR - areaBox(nodeR.box);

      if (currentCostL > currentCostR) {
        if (bestCost > currentCostR) {
          bestNode = nodeR;
          bestCost = currentCostR;
        }
      } else if (bestCost > currentCostL) {
        bestNode = nodeL;
        bestCost = currentCostL;
      }

      if (inheritedCostR > inheritedCostL) {
        if (leafArea + inheritedCostL >= bestCost) continue;
        if (nodeL.object === undefined) sortedList.push({ node: nodeL, inheritedCost: inheritedCostL });

        if (leafArea + inheritedCostR >= bestCost) continue;
        if (nodeR.object === undefined) sortedList.push({ node: nodeR, inheritedCost: inheritedCostR });
      } else {
        if (leafArea + inheritedCostR >= bestCost) continue;
        if (nodeR.object === undefined) sortedList.push({ node: nodeR, inheritedCost: inheritedCostR });

        if (leafArea + inheritedCostL >= bestCost) continue;
        if (nodeL.object === undefined) sortedList.push({ node: nodeL, inheritedCost: inheritedCostL });
      }
    } while ((nodeObj = sortedList.pop()));

    return bestNode;
  }

  protected refit(node: BVHNode<N, L>): void {
    unionBox(node.left.box, node.right.box, node.box);

    while ((node = node.parent)) {
      if (!unionBoxChanged(node.left.box, node.right.box, node.box)) return;
    }
  }

  protected refitAndRotate(node: BVHNode<N, L>, sibling: BVHNode<N, L>): void {
    const originalNodeBox = node.box;
    node = node.parent;
    const nodeBox = node.box;

    unionBox(originalNodeBox, sibling.box, nodeBox);

    while ((node = node.parent)) {
      const nodeBox = node.box;

      // we can use 'expandBox(originalNodeBox, nodeBox);' here if we want to performs all rotation
      if (!isExpanded(originalNodeBox, nodeBox)) return; // this avoid some rotations but is less expensive

      const left = node.left;
      const right = node.right;
      const leftBox = left.box;
      const rightBox = right.box;

      let nodeSwap1: BVHNode<N, L> = null;
      let nodeSwap2: BVHNode<N, L> = null;
      let bestCost = 0;

      if (right.object === undefined) { // is not leaf
        const RL = right.left;
        const RR = right.right;
        const rightArea = areaBox(right.box);

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

      if (left.object === undefined) { // is not leaf
        const LL = left.left;
        const LR = left.right;
        const leftArea = areaBox(left.box);

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

      if (nodeSwap1 !== null) this.swap(nodeSwap1, nodeSwap2);
    }
  }

  // this works only for rotation
  protected swap(A: BVHNode<N, L>, B: BVHNode<N, L>): void {
    const parentA = A.parent;
    const parentB = B.parent;
    const parentBox = parentB.box;

    if (parentA.left === A) parentA.left = B;
    else parentA.right = B;

    if (parentB.left === B) parentB.left = A;
    else parentB.right = A;

    A.parent = parentB;
    B.parent = parentA;

    unionBox(parentB.left.box, parentB.right.box, parentBox);
  }
}
