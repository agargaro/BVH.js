import { IBVHBuilder, onLeafCreationCallback } from "../builder/IBVHBuilder";
import { CoordinateSystem, Frustum, WebGLCoordinateSystem } from "../utils/frustum";
import { intersectRayBox } from "../utils/intersectUtils";
import { BVHNode, FloatArray } from "./BVHNode";

export class BVH<N, L> {
  public builder: IBVHBuilder<N, L>;
  public frustum: Frustum;

  public get root(): BVHNode<N, L> {
    return this.builder.root;
  }

  constructor(builder: IBVHBuilder<N, L>, coordinateSystem: CoordinateSystem = WebGLCoordinateSystem) {
    this.builder = builder;
    this.frustum = new Frustum(coordinateSystem);
  }

  public createFromArray(objects: L[], boxes: FloatArray[], onLeafCreation?: onLeafCreationCallback<N, L>): void {
    this.builder.createFromArray(objects, boxes, onLeafCreation);
  }

  public insert(object: L, box: FloatArray): BVHNode<N, L> {
    return this.builder.insert(object, box);
  }

  public insertRange(objects: L[], boxes: FloatArray[], onLeafCreation?: onLeafCreationCallback<N, L>): void {
    this.builder.insertRange(objects, boxes, onLeafCreation);
  }

  public move(node: BVHNode<N, L>): void {
    this.builder.move(node);
  }

  public delete(node: BVHNode<N, L>): BVHNode<N, L> {
    return this.builder.delete(node);
  }

  public clear(): void {
    this.builder.clear();
  }

  public traverse(callback: (node: BVHNode<N, L>, depth: number) => boolean): void {
    _traverse(this.root, 0);

    function _traverse(node: BVHNode<N, L>, depth: number): void {

      if (node.object) { // is leaf
        callback(node, depth);
        return;
      }

      const stopTraversal = callback(node, depth);

      if (!stopTraversal) {
        _traverse(node.left, depth + 1);
        _traverse(node.right, depth + 1);
      }
    }
  }

  public intersectRay(dir: FloatArray, origin: FloatArray, near = 0, far = Infinity, result: L[] = []): L[] {
    _dirInv[0] = 1 / dir[0];
    _dirInv[1] = 1 / dir[1];
    _dirInv[2] = 1 / dir[2];

    _sign[0] = _dirInv[0] < 0 ? 1 : 0;
    _sign[1] = _dirInv[1] < 0 ? 1 : 0;
    _sign[2] = _dirInv[2] < 0 ? 1 : 0;

    _intersectRay(this.root);

    return result;

    function _intersectRay(node: BVHNode<N, L>): void {
      if (!intersectRayBox(node.box, origin, _dirInv, _sign, near, far)) return;

      if (node.object) {
        result.push(node.object);
        return;
      }

      _intersectRay(node.left);
      _intersectRay(node.right);
    }
  }

  public frustumCulling(projectionMatrix: FloatArray | number[], result: L[] = []): void {
    const frustum = this.frustum.setFromProjectionMatrix(projectionMatrix);

    traverseVisibility(this.root, 0b111111);

    function traverseVisibility(node: BVHNode<N, L>, mask: number): void {
      mask = frustum.intesectsBoxMask(node.box, mask);

      if (mask < 0) return; // -1 = out

      if (mask === 0) { // 0 = in
        showAll(node);
        return;
      }

      // 1+ = intersect
      if (node.object) {
        result.push(node.object);
        return;
      }

      traverseVisibility(node.left, mask);
      traverseVisibility(node.right, mask);
    }

    function showAll(node: BVHNode<N, L>): void {
      if (node.object) {
        result.push(node.object);
        return;
      }

      showAll(node.left);
      showAll(node.right);
    }
  }

}

const _dirInv = new Float64Array(3);
const _sign = new Uint8Array(3);
