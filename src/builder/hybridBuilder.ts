import { areaBox, areaFromTwoBoxes, expandBoxByMargin, getLongestAxis, isBoxInsideBox, isExpanded, unionBox, unionBoxChanged } from '../utils/boxUtils.js';
import { SortedListPriority } from '../utils/sortedListPriority.js';
import { FloatArray, FloatArrayType, IBVHBuilder, NumberArray, onLeafCreationCallback } from './IBVHBuilder.js';

// TODO: dynamic allocation

export class HybridBuilder implements IBVHBuilder {
  public readonly useFloat64: boolean;
  public rootId: number | null = null; // consider to use -1 instead
  protected readonly _sortedList = new SortedListPriority();
  protected count = 0;
  protected nodeCount = 0;

  public readonly box: FloatArray; // [minX, maxX, minY, maxY, minZ, maxZ, ...] // TODO consider to use single array
  public readonly parent: Int32Array;
  public readonly children: Int32Array; // left and right pointer
  public readonly objectId: Int32Array;

  constructor(capacity: number, useFloat64 = false) {
    this.useFloat64 = useFloat64;

    this.box = useFloat64 ? new Float64Array(capacity * 6) : new Float32Array(capacity * 6);
    this.parent = new Int32Array(capacity);
    this.children = new Int32Array(capacity * 2);
    this.objectId = new Int32Array(capacity);
  }

  // public createFromArray(objects: L[], boxes: FloatArray[], margin = 0): void {
  //   const maxCount = boxes.length;
  //   const typeArray = this._arrayType;
  //   if (typeArray !== (boxes[0].BYTES_PER_ELEMENT === 4 ? Float32Array : Float64Array)) console.warn('Different precision.');
  //   const centroid = new typeArray(6);
  //   let axis: number;
  //   let position: number;

  //   this.rootId = buildNode(0, maxCount, null);

  //   function buildNode(offset: number, count: number, parent: BVHNode): BVHNode {
  //     if (count === 1) {
  //       const box = boxes[offset];
  //       if (margin > 0) expandBoxByMargin(box, margin);
  //       const node = { box, object: objects[offset], parent } as BVHNode;
  //       if (onLeafCreation) onLeafCreation(node);
  //       return node;
  //     }

  //     const box = computeBoxCentroid(offset, count);

  //     updateSplitData();

  //     // const leftEndOffset = split(offset, count);
  //     let leftEndOffset = split(offset, count);

  //     if (leftEndOffset === offset || leftEndOffset === offset + count) {
  //       leftEndOffset = offset + (count >> 1); // this is a workaround. TODO IMPROVE THIS TRYING DIFFERENT AXIS
  //     }

  //     const node = { box, parent } as BVHNode;

  //     node.left = buildNode(offset, leftEndOffset - offset, node);
  //     node.right = buildNode(leftEndOffset, count - leftEndOffset + offset, node);

  //     return node;
  //   }

  //   function computeBoxCentroid(offset: number, count: number): FloatArray {
  //     const box = new typeArray(6);
  //     const end = offset + count;

  //     box[0] = Infinity;
  //     box[1] = -Infinity;
  //     box[2] = Infinity;
  //     box[3] = -Infinity;
  //     box[4] = Infinity;
  //     box[5] = -Infinity;

  //     centroid[0] = Infinity;
  //     centroid[1] = -Infinity;
  //     centroid[2] = Infinity;
  //     centroid[3] = -Infinity;
  //     centroid[4] = Infinity;
  //     centroid[5] = -Infinity;

  //     for (let i = offset; i < end; i++) {
  //       const boxToCheck = boxes[i];

  //       const xMin = boxToCheck[0];
  //       const xMax = boxToCheck[1];
  //       const yMin = boxToCheck[2];
  //       const yMax = boxToCheck[3];
  //       const zMin = boxToCheck[4];
  //       const zMax = boxToCheck[5];

  //       if (box[0] > xMin) box[0] = xMin;
  //       if (box[1] < xMax) box[1] = xMax;
  //       if (box[2] > yMin) box[2] = yMin;
  //       if (box[3] < yMax) box[3] = yMax;
  //       if (box[4] > zMin) box[4] = zMin;
  //       if (box[5] < zMax) box[5] = zMax;

  //       const xCenter = (xMax + xMin) * 0.5;
  //       const yCenter = (yMax + yMin) * 0.5;
  //       const zCenter = (zMax + zMin) * 0.5;

  //       if (centroid[0] > xCenter) centroid[0] = xCenter;
  //       if (centroid[1] < xCenter) centroid[1] = xCenter;
  //       if (centroid[2] > yCenter) centroid[2] = yCenter;
  //       if (centroid[3] < yCenter) centroid[3] = yCenter;
  //       if (centroid[4] > zCenter) centroid[4] = zCenter;
  //       if (centroid[5] < zCenter) centroid[5] = zCenter;
  //     }

  //     box[0] -= margin;
  //     box[1] += margin;
  //     box[2] -= margin;
  //     box[3] += margin;
  //     box[4] -= margin;
  //     box[5] += margin;

  //     return box;
  //   }

  //   // function updateSplitData(box?: FloatArray, offset?: number, count?: number): void { TODO
  //   function updateSplitData(): void {
  //     axis = getLongestAxis(centroid) * 2; // or we can get average
  //     position = (centroid[axis] + centroid[axis + 1]) * 0.5;
  //   }

  //   function split(offset: number, count: number): number {
  //     let left = offset;
  //     let right = offset + count - 1;

  //     while (left <= right) {
  //       const boxLeft = boxes[left];
  //       if ((boxLeft[axis + 1] + boxLeft[axis]) * 0.5 >= position) { // if equals, lies on right
  //         while (true) {
  //           const boxRight = boxes[right];
  //           if ((boxRight[axis + 1] + boxRight[axis]) * 0.5 < position) {
  //             const tempObject = objects[left];
  //             objects[left] = objects[right];
  //             objects[right] = tempObject;

  //             const tempBox = boxes[left];
  //             boxes[left] = boxes[right];
  //             boxes[right] = tempBox;

  //             right--;
  //             break;
  //           }

  //           right--;
  //           if (right <= left) return left;
  //         }
  //       }

  //       left++;
  //     }

  //     return left;
  //   }
  // }

  public insert(objectId: number, box: FloatArray, margin?: number): number {
    if (margin > 0) expandBoxByMargin(box, margin);
    const leafId = this.createLeafNode(objectId, box);

    if (this.rootId === null) this.rootId = leafId;
    else this.insertLeaf(leafId);

    this.count++;
    return leafId;
  }

  public insertRange(objectsId: NumberArray, boxes: FloatArray[], margins?: number | NumberArray, onLeafCreation?: onLeafCreationCallback): void {
    console.warn('Method not optimized yet. It just calls \'insert\' N times.');

    const count = objectsId.length;
    const margin = (margins as number) > 0 ? margins : (margins === undefined ? 0 : null);

    for (let i = 0; i < count; i++) {
      const nodeId = this.insert(objectsId[i], boxes[i], margin ?? margins[i]);
      if (onLeafCreation) onLeafCreation(nodeId);
    }
  }

  // // update node.box before calling this function
  // public move(node: BVHNode, margin: number): void {
  //   if (!node.parent || isBoxInsideBox(node.box, node.parent.box)) {
  //     if (margin > 0) expandBoxByMargin(node.box, margin);
  //     return;
  //   }

  //   if (margin > 0) expandBoxByMargin(node.box, margin);

  //   const deletedNode = this.delete(node);
  //   this.insertLeaf(node, deletedNode);
  //   this.count++;
  // }

  // public delete(node: BVHNode): BVHNode {
  //   const parent = node.parent;

  //   if (parent === null) {
  //     this.rootId = null;
  //     return null;
  //   }

  //   const parent2 = parent.parent;
  //   const oppositeLeaf = parent.left === node ? parent.right : parent.left;

  //   oppositeLeaf.parent = parent2;
  //   node.parent = null;

  //   if (parent2 === null) {
  //     this.rootId = oppositeLeaf;
  //     return parent;
  //   }

  //   if (parent2.left === parent) parent2.left = oppositeLeaf;
  //   else parent2.right = oppositeLeaf;

  //   // parent.parent = null; parent.left = null; parent.right = null; // GC should work anyway

  //   this.refit(parent2); // i don't think we need rotation here

  //   this.count--;

  //   return parent;
  // }

  public clear(): void {
    this.rootId = null;
  }

  protected createLeafNode(objectId: number, box: FloatArray): number {
    const nodeId = this.nodeCount++;

    this.box.set(box, nodeId * 6);
    this.objectId[nodeId] = objectId;
    this.parent[nodeId] = -1;
    // this.children[nodeId * 2] = -1; // probably useless
    // this.children[nodeId * 2 + 1] = -1; // probably useless

    return nodeId;
  }

  protected createInternalNode(parentId: number, siblingId: number, leafId: number): number {
    const nodeId = this.nodeCount++;
    const childrenId = nodeId * 2;

    // this.box is empty now
    this.objectId[nodeId] = -1;
    this.parent[nodeId] = parentId;
    this.children[childrenId] = siblingId;
    this.children[childrenId + 1] = leafId;

    return nodeId;
  }

  protected insertLeaf(leafId: number, newParentId?: number): void {
    const parent = this.parent;
    const children = this.children;
    const leafBox = this.box[leafId];
    const siblingId = this.findBestSibling(leafBox);

    const oldParentId = parent[siblingId];

    if (newParentId === undefined) {
      newParentId = this.createInternalNode(oldParentId, siblingId, leafId);
    } else {
      parent[newParentId] = oldParentId;
      const childrenId = newParentId * 2;
      children[childrenId] = siblingId;
      children[childrenId + 1] = leafId;
    }

    parent[siblingId] = newParentId;
    parent[leafId] = newParentId;

    if (oldParentId === -1) this.rootId = newParentId;
    else {
      const childrenId = oldParentId * 2;
      if (children[childrenId] === siblingId) children[childrenId] = newParentId;
      else children[childrenId + 1] = newParentId;
    }

    this.refitAndRotate(leafId, siblingId);
  }

  protected findBestSibling(leafBox: FloatArray): number {
    const objectId = this.objectId;
    const rootId = this.rootId;
    if (objectId[rootId] !== -1) return rootId;

    const box = this.box;
    const children = this.children;
    const leafArea = areaBox(leafBox);
    let bestNodeId = rootId;
    let bestCost = areaFromTwoBoxes(leafBox, box[rootId]);

    const sortedList = this._sortedList;
    sortedList.clear();

    let nodeObj = { nodeId: rootId, inheritedCost: bestCost - areaBox(box[rootId]) }; // TODO satisfies ItemListType;

    do {
      const { nodeId, inheritedCost } = nodeObj;

      if (leafArea + inheritedCost >= bestCost) break;

      const childrenId = nodeId * 2;
      const nodeL = children[childrenId];
      const nodeR = children[childrenId + 1];

      const boxL = box[nodeL];
      const directCostL = areaFromTwoBoxes(leafBox, boxL);
      const currentCostL = directCostL + inheritedCost;
      const inheritedCostL = currentCostL - areaBox(boxL);

      const boxR = box[nodeR];
      const directCostR = areaFromTwoBoxes(leafBox, boxR);
      const currentCostR = directCostR + inheritedCost;
      const inheritedCostR = currentCostR - areaBox(boxR);

      if (currentCostL > currentCostR) {
        if (bestCost > currentCostR) {
          bestNodeId = nodeR;
          bestCost = currentCostR;
        }
      } else if (bestCost > currentCostL) {
        bestNodeId = nodeL;
        bestCost = currentCostL;
      }

      if (inheritedCostR > inheritedCostL) {
        if (leafArea + inheritedCostL >= bestCost) continue;
        if (objectId[nodeL] === -1) sortedList.push({ nodeId: nodeL, inheritedCost: inheritedCostL });

        if (leafArea + inheritedCostR >= bestCost) continue;
        if (objectId[nodeR] === -1) sortedList.push({ nodeId: nodeR, inheritedCost: inheritedCostR });
      } else {
        if (leafArea + inheritedCostR >= bestCost) continue;
        if (objectId[nodeR] === -1) sortedList.push({ nodeId: nodeR, inheritedCost: inheritedCostR });

        if (leafArea + inheritedCostL >= bestCost) continue;
        if (objectId[nodeL] === -1) sortedList.push({ nodeId: nodeL, inheritedCost: inheritedCostL });
      }
    } while ((nodeObj = sortedList.pop()));

    return bestNodeId;
  }

  protected refit(nodeId: number): void {
    const box = this.box;
    const parent = this.parent;
    const children = this.children;
    let childrenId = nodeId * 2;

    unionBox(box[children[childrenId]], box[children[childrenId + 1]], box[nodeId]);

    while ((nodeId = parent[nodeId]) !== -1) {
      childrenId = nodeId * 2;
      if (!unionBoxChanged(box[children[childrenId]], box[children[childrenId + 1]], box[nodeId])) return;
    }
  }

  protected refitAndRotate(nodeId: number, siblingId: number): void {
    const box = this.box;
    const parent = this.parent;
    const children = this.children;
    const objectId = this.objectId;

    const originalNodeBox = box[nodeId];
    nodeId = parent[nodeId];
    const nodeBox = box[nodeId];

    unionBox(originalNodeBox, box[siblingId], nodeBox);

    while ((nodeId = parent[nodeId]) !== -1) {
      const nodeBox = box[nodeId];

      // we can use 'expandBox(originalNodeBox, nodeBox);' here if we want to performs all rotation
      if (!isExpanded(originalNodeBox, nodeBox)) return; // this avoid some rotations but is less expensive

      const childrenId = nodeId * 2;
      const leftId = children[childrenId];
      const rightId = children[childrenId + 1];
      const leftBox = box[leftId];
      const rightBox = box[rightId];

      let nodeSwap1 = -1;
      let nodeSwap2 = -1;
      let bestCost = 0;

      if (objectId[rightId] === -1) { // is not leaf
        const rightChildrenId = rightId * 2;
        const RL = children[rightChildrenId];
        const RR = children[rightChildrenId + 1];
        const rightArea = areaBox(box[rightId]);

        const diffRR = rightArea - areaFromTwoBoxes(leftBox, box[RL]);
        const diffRL = rightArea - areaFromTwoBoxes(leftBox, box[RR]);

        if (diffRR > diffRL) {
          if (diffRR > 0) {
            nodeSwap1 = leftId;
            nodeSwap2 = RR;
            bestCost = diffRR;
          }
        } else if (diffRL > 0) {
          nodeSwap1 = leftId;
          nodeSwap2 = RL;
          bestCost = diffRL;
        }
      }

      if (objectId[leftId] === -1) { // is not leaf
        const leftChildrenId = leftId * 2;
        const LL = children[leftChildrenId];
        const LR = children[leftChildrenId + 1];
        const leftArea = areaBox(box[leftId]);

        const diffLR = leftArea - areaFromTwoBoxes(rightBox, box[LL]);
        const diffLL = leftArea - areaFromTwoBoxes(rightBox, box[LR]);

        if (diffLR > diffLL) {
          if (diffLR > bestCost) {
            nodeSwap1 = rightId;
            nodeSwap2 = LR;
          }
        } else if (diffLL > bestCost) {
          nodeSwap1 = rightId;
          nodeSwap2 = LL;
        }
      }

      if (nodeSwap1 !== -1) this.swap(nodeSwap1, nodeSwap2);
    }
  }

  // this works only for rotation
  protected swap(nodeIdA: number, nodeIdB: number): void {
    const parent = this.parent;
    const children = this.children;
    const box = this.box;
    const parentIdA = parent[nodeIdA];
    const parentIdB = parent[nodeIdB];
    const childrenIdA = parentIdA * 2;
    const childrenIdB = parentIdB * 2;
    const parentBLeft = children[childrenIdB];
    const parentBRight = children[childrenIdB + 1];

    if (children[childrenIdA] === nodeIdA) children[childrenIdA] = nodeIdB;
    else children[childrenIdA + 1] = nodeIdB;

    if (parentBLeft === nodeIdB) children[childrenIdB] = nodeIdA;
    else children[childrenIdB + 1] = nodeIdA;

    parent[nodeIdA] = parentIdB;
    parent[nodeIdB] = parentIdA;

    unionBox(box, parentBLeft * 6, parentBRight * 6, parentIdB * 6);
  }
}
