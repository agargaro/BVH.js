// import { areaBox } from '../utils/boxUtils';

// export interface IBVHBuilderPacked {
//   rootIndex: number;
//   nodeCount: number;
//   buffer: ArrayBuffer;
//   insert(objectId: number, box: Float32Array): number;
//   move(nodeId: number): void;
//   delete(nodeId: number): number;
//   clear(): void;
//   getObject(id: number): number;
//   getParent(id: number): number;
//   getLeft(id: number): number;
//   getRight(id: number): number;
//   getBox(id: number): Float32Array;
// }

// /** BAD EXPERIMENT */
// export class IncrementalBuilderPacked implements IBVHBuilderPacked {
//   public rootIndex: number = null;
//   public nodeCount: number;
//   public buffer: ArrayBuffer;
//   public bufferFloat32: Float32Array;
//   public bufferUInt32: Uint32Array;
//   protected _margin: number;

//   constructor(maxCount: number, margin: number) {
//     this._margin = margin;
//     this.nodeCount = 0;
//     this.buffer = new ArrayBuffer((maxCount * 2 - 1) * _nodeSize * 4);
//     this.bufferFloat32 = new Float32Array(this.buffer);
//     this.bufferUInt32 = new Uint32Array(this.buffer);
//   }

//   public clear(): void {
//     console.error("Not implemented yet.");
//   }

//   public insert(objectId: number, box: Float32Array): number {
//     const leafId = this.allocateLeafNode(objectId, box);

//     if (this.rootIndex === null) {
//       this.setArea(leafId, areaBox(box));
//       this.rootIndex = leafId;
//     } else {
//       this.insertLeaf(leafId, box);
//     }

//     return leafId;
//   }

//   protected insertLeaf(leafId: number, box: Float32Array, newParentId?: number): void {
//     const area = areaBox(box);
//     this.setArea(leafId, area);  // if only move we don't need to recalculate it?

//     const siblingId = this.findBestSibling(box, area);

//     const oldParent = this.getParent(siblingId);

//     if (newParentId === undefined) {
//       newParentId = this.allocateInternalNode(oldParent, siblingId, leafId);
//     } else {
//       this.setParent(newParentId, oldParent);
//       this.setLeft(newParentId, siblingId);
//       this.setRight(newParentId, leafId);
//       // check box se giusto
//     }

//     this.setParent(siblingId, newParentId);
//     this.setParent(leafId, newParentId);

//     if (oldParent === 4294967295) { // todo check
//       // The sibling was the root
//       this.rootIndex = newParentId;
//     } else {
//       if (this.getLeft(oldParent) == siblingId) this.setLeft(oldParent, newParentId);
//       else this.setRight(oldParent, newParentId);
//     }

//     this.refitAndRotate(newParentId);
//   }

//   //update node.box before calling this function
//   public move(nodeId: number): void {
//     if (this.isBoxInsideBox(nodeId, this.getParent(nodeId))) return;

//     //TODO add queue of empty indexes

//     const deletedNode = this.delete(nodeId);
//     this.insertLeaf(nodeId, this.getBox(nodeId), deletedNode);
//   }

//   public delete(nodeId: number): number {
//     const parent = this.getParent(nodeId);
//     const parentParent = this.getParent(parent); // TODO Fix if this is -1

//     const leftP = this.getLeft(parent);
//     const oppositeLeaf = leftP === nodeId ? this.getRight(parent) : leftP;

//     if (this.getLeft(parentParent) === parent) this.setLeft(parentParent, oppositeLeaf);
//     else this.setRight(parentParent, oppositeLeaf);

//     this.setParent(oppositeLeaf, parentParent);
//     this.setParent(nodeId, 4294967295); // capire -1; serve?
//     // parent.parent = null;
//     // parent.left = null;
//     // parent.right = null; // GC should work anyway

//     this.refit(parentParent); // i don't think we need rotation here

//     return parent;
//   }

//   protected allocateLeafNode(objectId: number, box: Float32Array): number {
//     // return { box, object, parent: null } as Node<N, L>;
//     const id = this.nodeCount++;

//     this.setBox(id, box);
//     this.setObject(id, objectId);
//     this.setParent(id, 4294967295); // capire meglio, non possiamo mettere null

//     return id;
//   }

//   protected allocateInternalNode(parentId: number, sibling: number, leaf: number): number {
//     // return { parent: parentId, left: sibling, right: leaf, box: new Float64Array(6) } as Node<N, L>;
//     const id = this.nodeCount++;

//     this.setParent(id, parentId);
//     this.setLeft(id, sibling);
//     this.setRight(id, leaf);
//     this.setBox(id, _emptyBox);

//     return id;
//   }

//   // Branch and Bound
//   protected findBestSibling(leafBox: Float32Array, leafArea: number): number {
//     const self = this;
//     const rootId = this.rootIndex;
//     let bestNodeId = rootId;
//     let bestCost = this.areaFromTwoBoxes(leafBox, rootId);

//     _findBestSibling(rootId, bestCost - this.getArea(rootId)); // capire call

//     function _findBestSibling(nodeId: number, inheritedCost: number): void {
//       if (self.getObject(nodeId) !== 0) return; // TODO migliorare... no sense creare oggetto se esce subito

//       const nodeL = self.getLeft(nodeId);
//       const nodeR = self.getRight(nodeId);

//       const directCostL = self.areaFromTwoBoxes(leafBox, nodeL);
//       const currentCostL = directCostL + inheritedCost;
//       const inheritedCostL = inheritedCost + directCostL - self.getArea(nodeL);

//       const directCostR = self.areaFromTwoBoxes(leafBox, nodeR);
//       const currentCostR = directCostR + inheritedCost;
//       const inheritedCostR = inheritedCost + directCostR - self.getArea(nodeR);

//       if (currentCostL > currentCostR) {
//         if (bestCost > currentCostR) {
//           bestNodeId = nodeR;
//           bestCost = currentCostR;
//         }
//       } else {
//         if (bestCost > currentCostL) {
//           bestNodeId = nodeL;
//           bestCost = currentCostL;
//         }
//       }

//       if (inheritedCostR > inheritedCostL) {

//         if (leafArea + inheritedCostL >= bestCost) return;
//         _findBestSibling(nodeL, inheritedCostL);

//         if (leafArea + inheritedCostR >= bestCost) return;
//         _findBestSibling(nodeR, inheritedCostR);

//       } else {

//         if (leafArea + inheritedCostR >= bestCost) return;
//         _findBestSibling(nodeR, inheritedCostR);

//         if (leafArea + inheritedCostL >= bestCost) return;
//         _findBestSibling(nodeL, inheritedCostL);

//       }
//     }

//     return bestNodeId;
//   }

//   protected refit(nodeId: number): void {
//     do {
//       const left = this.getLeft(nodeId);
//       const right = this.getRight(nodeId);

//       // TODO CHECK if area doesn't change, stop iterating

//       const area = this.unionBoxAndGetArea(left, right, nodeId, this._margin);
//       this.setArea(nodeId, area);

//       nodeId = this.getParent(nodeId);
//     } while (nodeId);
//   }

//   protected refitAndRotate(nodeId: number): void {
//     do {
//       const left = this.getLeft(nodeId);
//       const right = this.getRight(nodeId);

//       const area = this.unionBoxAndGetArea(left, right, nodeId, this._margin);
//       this.setArea(nodeId, area);

//       this.rotate(left, right);

//       nodeId = this.getParent(nodeId);
//     } while (nodeId);
//   }

//   protected rotate(left: number, right: number): void {
//     let nodeSwap1: number;
//     let nodeSwap2: number;
//     let bestCost = 0; // todo can we use rotatationBestCostTolerance?

//     if (this.getObject(right) === 0) {
//       //is not leaf
//       const RL = this.getLeft(right);
//       const RR = this.getRight(right);
//       const areaR = this.getArea(right);

//       const diffRR = areaR - this.areaFromTwoBoxesArray(left, RL);
//       const diffRL = areaR - this.areaFromTwoBoxesArray(left, RR);

//       if (diffRR > diffRL) {
//         if (diffRR > 0) {
//           nodeSwap1 = left;
//           nodeSwap2 = RR;
//           bestCost = diffRR;
//         }
//       } else if (diffRL > 0) {
//         nodeSwap1 = left;
//         nodeSwap2 = RL;
//         bestCost = diffRL;
//       }
//     }

//     if (this.getObject(left) === 0) {
//       //is not leaf
//       const LL = this.getLeft(left);
//       const LR = this.getRight(left);
//       const areaL = this.getArea(right);

//       const diffLR = areaL - this.areaFromTwoBoxesArray(right, LL);
//       const diffLL = areaL - this.areaFromTwoBoxesArray(right, LR);

//       if (diffLR > diffLL) {
//         if (diffLR > bestCost) {
//           nodeSwap1 = right;
//           nodeSwap2 = LR;
//         }
//       } else if (diffLL > bestCost) {
//         nodeSwap1 = right;
//         nodeSwap2 = LL;
//       }
//     }

//     if (nodeSwap1) {
//       this.swap(nodeSwap1, nodeSwap2);
//     }
//   }

//   // this works only for rotation
//   protected swap(A: number, B: number): void {
//     const parentA = this.getParent(A);
//     const parentB = this.getParent(B);

//     if (this.getLeft(parentA) === A) this.setLeft(parentA, B);
//     else this.setRight(parentA, B);

//     if (this.getLeft(parentB) === B) this.setLeft(parentB, A);
//     else this.setRight(parentB, A);

//     this.setParent(A, parentB);
//     this.setParent(B, parentA);

//     const area = this.unionBoxAndGetArea(this.getLeft(parentB), this.getRight(parentB), parentB, this._margin);
//     this.setArea(parentB, area);

//     // CALCOLARE ANCHE AREA DI ALTRO PARENT? ...
//   }

//   protected setBox(id: number, box: Float32Array): void {
//     this.bufferFloat32.set(box, id * _nodeSize + _boxOffset);
//   }

//   protected setObject(id: number, objectId: number): void {
//     this.bufferUInt32[id * _nodeSize + _objectIdOffset] = objectId;
//   }

//   protected setArea(id: number, area: number): void {
//     this.bufferFloat32[id * _nodeSize + _areaOffset] = area;
//   }

//   protected setParent(id: number, parentId: number): void {
//     this.bufferUInt32[id * _nodeSize + _parentIdOffset] = parentId;
//   }

//   protected setLeft(id: number, leftId: number): void {
//     this.bufferUInt32[id * _nodeSize + _leftOffset] = leftId;
//   }

//   protected setRight(id: number, rightId: number): void {
//     this.bufferUInt32[id * _nodeSize + _rightOffset] = rightId;
//   }

//   public getBox(id: number): Float32Array { // TODO check tutto
//     // _box.set(this.bufferFloat32, );
//     // this.bufferFloat32.subarray();
//     const offset = id * _nodeSize + _boxOffset;

//     _box[0] = this.bufferFloat32[offset + 0];
//     _box[1] = this.bufferFloat32[offset + 1];
//     _box[2] = this.bufferFloat32[offset + 2];
//     _box[3] = this.bufferFloat32[offset + 3];
//     _box[4] = this.bufferFloat32[offset + 4];
//     _box[5] = this.bufferFloat32[offset + 5];

//     return _box;
//   }

//   public getObject(id: number): number {
//     return this.bufferUInt32[id * _nodeSize + _objectIdOffset];
//   }

//   public getArea(id: number): number {
//     return this.bufferFloat32[id * _nodeSize + _areaOffset];
//   }

//   public getParent(id: number): number {
//     return this.bufferUInt32[id * _nodeSize + _parentIdOffset];
//   }

//   public getLeft(id: number): number {
//     return this.bufferUInt32[id * _nodeSize + _leftOffset];
//   }

//   public getRight(id: number): number {
//     return this.bufferUInt32[id * _nodeSize + _rightOffset];
//   }

//   protected isBoxInsideBox(offsetA: number, offsetB: number): boolean { // move it
//     const a = this.bufferFloat32;
//     const offsetBoxA = offsetA * _nodeSize + _boxOffset;
//     const offsetBoxB = offsetB * _nodeSize + _boxOffset;

//     if (a[offsetBoxA + 0] > a[offsetBoxB + 0]) return false;
//     if (a[offsetBoxA + 1] < a[offsetBoxB + 1]) return false;
//     if (a[offsetBoxA + 2] > a[offsetBoxB + 2]) return false;
//     if (a[offsetBoxA + 3] < a[offsetBoxB + 3]) return false;
//     if (a[offsetBoxA + 4] > a[offsetBoxB + 4]) return false;
//     if (a[offsetBoxA + 5] < a[offsetBoxB + 5]) return false;

//     return true;
//   }

//   protected unionBoxAndGetArea(offsetA: number, offsetB: number, targetOffset: number, margin: number): number { // move it
//     const a = this.bufferFloat32;
//     const offsetBoxA = offsetA * _nodeSize + _boxOffset;
//     const offsetBoxB = offsetB * _nodeSize + _boxOffset;
//     const offsetBoxTarget = targetOffset * _nodeSize + _boxOffset;

//     a[offsetBoxTarget + 0] = (a[offsetBoxA + 0] > a[offsetBoxB + 0] ? a[offsetBoxB + 0] : a[offsetBoxA + 0]) - margin;
//     a[offsetBoxTarget + 1] = (a[offsetBoxA + 1] < a[offsetBoxB + 1] ? a[offsetBoxB + 1] : a[offsetBoxA + 1]) + margin;
//     a[offsetBoxTarget + 2] = (a[offsetBoxA + 2] > a[offsetBoxB + 2] ? a[offsetBoxB + 2] : a[offsetBoxA + 2]) - margin;
//     a[offsetBoxTarget + 3] = (a[offsetBoxA + 3] < a[offsetBoxB + 3] ? a[offsetBoxB + 3] : a[offsetBoxA + 3]) + margin;
//     a[offsetBoxTarget + 4] = (a[offsetBoxA + 4] > a[offsetBoxB + 4] ? a[offsetBoxB + 4] : a[offsetBoxA + 4]) - margin;
//     a[offsetBoxTarget + 5] = (a[offsetBoxA + 5] < a[offsetBoxB + 5] ? a[offsetBoxB + 5] : a[offsetBoxA + 5]) + margin;

//     const d0 = a[offsetBoxTarget + 1] - a[offsetBoxTarget + 0];
//     const d1 = a[offsetBoxTarget + 3] - a[offsetBoxTarget + 2];
//     const d2 = a[offsetBoxTarget + 5] - a[offsetBoxTarget + 4];

//     return 2 * (d0 * d1 + d1 * d2 + d2 * d0);
//   }

//   protected areaFromTwoBoxes(leafBox: Float32Array, offset: number): number {
//     const a = this.bufferFloat32;
//     const offsetBox = offset * _nodeSize + _boxOffset;

//     const minX = leafBox[0] > a[offsetBox + 0] ? a[offsetBox + 0] : leafBox[0];
//     const maxX = leafBox[1] < a[offsetBox + 1] ? a[offsetBox + 1] : leafBox[1];
//     const minY = leafBox[2] > a[offsetBox + 2] ? a[offsetBox + 2] : leafBox[2];
//     const maxY = leafBox[3] < a[offsetBox + 3] ? a[offsetBox + 3] : leafBox[3];
//     const minZ = leafBox[4] > a[offsetBox + 4] ? a[offsetBox + 4] : leafBox[4];
//     const maxZ = leafBox[5] < a[offsetBox + 5] ? a[offsetBox + 5] : leafBox[5];

//     const d0 = maxX - minX;
//     const d1 = maxY - minY;
//     const d2 = maxZ - minZ;

//     return 2 * (d0 * d1 + d1 * d2 + d2 * d0);
//   }

//   protected areaFromTwoBoxesArray(offsetA: number, offsetB: number): number {
//     const a = this.bufferFloat32;
//     const offsetBoxA = offsetA * _nodeSize + _boxOffset;
//     const offsetBoxB = offsetB * _nodeSize + _boxOffset;

//     const minX = a[offsetBoxA + 0] > a[offsetBoxB + 0] ? a[offsetBoxB + 0] : a[offsetBoxA + 0];
//     const maxX = a[offsetBoxA + 1] < a[offsetBoxB + 1] ? a[offsetBoxB + 1] : a[offsetBoxA + 1];
//     const minY = a[offsetBoxA + 2] > a[offsetBoxB + 2] ? a[offsetBoxB + 2] : a[offsetBoxA + 2];
//     const maxY = a[offsetBoxA + 3] < a[offsetBoxB + 3] ? a[offsetBoxB + 3] : a[offsetBoxA + 3];
//     const minZ = a[offsetBoxA + 4] > a[offsetBoxB + 4] ? a[offsetBoxB + 4] : a[offsetBoxA + 4];
//     const maxZ = a[offsetBoxA + 5] < a[offsetBoxB + 5] ? a[offsetBoxB + 5] : a[offsetBoxA + 5];

//     const d0 = maxX - minX;
//     const d1 = maxY - minY;
//     const d2 = maxZ - minZ;

//     return 2 * (d0 * d1 + d1 * d2 + d2 * d0);
//   }

// }

// const _boxOffset = 0;
// const _leftOffset = 6;
// const _rightOffset = 7;
// const _objectIdOffset = 8;
// const _parentIdOffset = 9;
// const _areaOffset = 10;
// const _nodeSize = 11; // all are 4 bytes
// const _emptyBox = new Float32Array(6);
// const _box = new Float32Array(6);
