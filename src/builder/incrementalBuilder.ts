import { BVHNode, FloatArray } from '../core/BVHNode';
import { areaBox, areaFromTwoBoxes, isBoxInsideBox, unionBox } from '../utils/boxUtils';
import { IBVHBuilder, onLeafCreationCallback } from './IBVHBuilder';

export type IncrementalNode<L> = BVHNode<IncrementalNodeData<L>, L>;

export type IncrementalNodeData<L> = {
  parent?: IncrementalNode<L>;
  area?: number; // this use more memory but makes add faster
};

export class IncrementalBuilder<L> implements IBVHBuilder<IncrementalNodeData<L>, L> {
  public root: IncrementalNode<L> = null;
  protected _margin: number;

  constructor(margin: number) {
    this._margin = margin;
  }

  public createFromArray(objects: L[], boxes: FloatArray[], onLeafCreation?: onLeafCreationCallback<IncrementalNodeData<L>, L>): void {
    throw new Error('Method not implemented.');
  }

  public insert(object: L, box: FloatArray): IncrementalNode<L> {
    const leaf = this.createLeafNode(object, box);

    if (this.root === null) {
      leaf.area = areaBox(box);
      this.root = leaf;
    } else {
      this.insertLeaf(leaf);
    }

    return leaf;
  }

  public insertRange(objects: L[], boxes: FloatArray[], onLeafCreation?: onLeafCreationCallback<IncrementalNodeData<L>, L>): void {
    throw new Error('Method not implemented.');
  }

  //update node.box before calling this function
  public move(node: IncrementalNode<L>): void {
    if (isBoxInsideBox(node.box, node.parent.box)) return;

    const deletedNode = this.delete(node);
    this.insertLeaf(node, deletedNode);
  }

  public delete(node: IncrementalNode<L>): IncrementalNode<L> {
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

  protected insertLeaf(leaf: IncrementalNode<L>, newParent?: IncrementalNode<L>): void {
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

  protected createLeafNode(object: L, box: FloatArray): IncrementalNode<L> {
    return { box, object, parent: null, area: null };
  }

  protected createInternalNode(parent: IncrementalNode<L>, sibling: IncrementalNode<L>, leaf: IncrementalNode<L>): IncrementalNode<L> {
    return { parent, left: sibling, right: leaf, box: new Float64Array(6) };
  }

  protected findBestSibling(leafBox: FloatArray, leafArea: number): IncrementalNode<L> {
    const root = this.root;
    let bestNode = root;
    let bestCost = areaFromTwoBoxes(leafBox, root.box);

    _findBestSibling(root, bestCost - root.area);

    return bestNode;

    function _findBestSibling(node: IncrementalNode<L>, inheritedCost: number): void {
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

  protected refit(node: IncrementalNode<L>): void {
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

  protected refitAndRotate(node: IncrementalNode<L>): void {
    const margin = this._margin;

    do {
      const left = node.left;
      const right = node.right;
      const nodeBox = node.box;
      const leftBox = left.box;
      const rightBox = right.box;

      unionBox(leftBox, rightBox, nodeBox, margin);
      node.area = areaBox(nodeBox);

      let nodeSwap1: IncrementalNode<L>;
      let nodeSwap2: IncrementalNode<L>;
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
  protected swap(A: IncrementalNode<L>, B: IncrementalNode<L>): void {
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
