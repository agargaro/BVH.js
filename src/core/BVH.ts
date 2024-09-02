import { IBVHBuilder, onLeafCreationCallback } from "../builder/IBVHBuilder.js";
import { minDistanceSqPointToBox } from "../utils/boxUtils.js";
import { CoordinateSystem, Frustum, WebGLCoordinateSystem } from "../utils/frustum.js";
import { intersectBoxBox, intersectRayBox, intersectSphereBox } from "../utils/intersectUtils.js";
import { BVHNode, FloatArray } from "./BVHNode.js";

export type onFrustumIntersectionCallback<N, L> = (node: BVHNode<N, L>, frustum: Frustum, mask: number) => void;
export type onClosestDistanceCallback<L> = (obj: L) => number;
export type onIntersectionCallback<L> = (obj: L) => boolean;

export class BVH<N, L> {
  public builder: IBVHBuilder<N, L>;
  public frustum: Frustum;
  protected _dirInv: FloatArray;
  protected _sign = new Uint8Array(3);

  public get root(): BVHNode<N, L> {
    return this.builder.root;
  }

  constructor(builder: IBVHBuilder<N, L>, coordinateSystem: CoordinateSystem = WebGLCoordinateSystem) {
    this.builder = builder;
    const highPrecision = builder.highPrecision;
    this.frustum = new Frustum(highPrecision, coordinateSystem);
    this._dirInv = highPrecision ? new Float64Array(3) : new Float32Array(3);
  }

  public createFromArray(objects: L[], boxes: FloatArray[], onLeafCreation?: onLeafCreationCallback<N, L>): void {
    this.builder.createFromArray(objects, boxes, onLeafCreation);
  }

  public insert(object: L, box: FloatArray, margin: number): BVHNode<N, L> {
    return this.builder.insert(object, box, margin);
  }

  public insertRange(objects: L[], boxes: FloatArray[], margins?: number | FloatArray | number[], onLeafCreation?: onLeafCreationCallback<N, L>): void {
    this.builder.insertRange(objects, boxes, margins, onLeafCreation);
  }

  public move(node: BVHNode<N, L>, margin: number): void {
    this.builder.move(node, margin);
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

      if (node.object !== undefined) { // is leaf
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
    const dirInv = this._dirInv;
    const sign = this._sign;

    dirInv[0] = 1 / dir[0];
    dirInv[1] = 1 / dir[1];
    dirInv[2] = 1 / dir[2];

    sign[0] = dirInv[0] < 0 ? 1 : 0;
    sign[1] = dirInv[1] < 0 ? 1 : 0;
    sign[2] = dirInv[2] < 0 ? 1 : 0;

    _intersectRay(this.root);

    return result;

    function _intersectRay(node: BVHNode<N, L>): void {
      if (!intersectRayBox(node.box, origin, dirInv, sign, near, far)) return;

      if (node.object !== undefined) {
        result.push(node.object);
        return;
      }

      _intersectRay(node.left);
      _intersectRay(node.right);
    }
  }

  public frustumCulling(projectionMatrix: FloatArray | number[], onIntersection: onFrustumIntersectionCallback<N, L>): void {
    const frustum = this.frustum.setFromProjectionMatrix(projectionMatrix);

    _frustumCulling(this.root, 0b111111);

    function _frustumCulling(node: BVHNode<N, L>, mask: number): void {
      if (node.object !== undefined) {

        if (frustum.isIntersected(node.box, mask)) {
          onIntersection(node, frustum, mask);
        }

        return;
      }

      mask = frustum.intersectsBoxMask(node.box, mask);

      if (mask < 0) return; // -1 = out

      if (mask === 0) { // 0 = in
        showAll(node);
        return;
      }

      _frustumCulling(node.left, mask);
      _frustumCulling(node.right, mask);
    }

    function showAll(node: BVHNode<N, L>): void {
      if (node.object !== undefined) {
        onIntersection(node, frustum, 0);
        return;
      }

      showAll(node.left);
      showAll(node.right);
    }
  }

  public closestPointToPoint(point: FloatArray, onClosestDistance?: onClosestDistanceCallback<L>): L {
    let bestDistance = Infinity;
    let bestLeaf: L = null;

    _closestPointToPoint(this.root);

    return bestLeaf;

    function _closestPointToPoint(node: BVHNode<N, L>): void {
      if (node.object !== undefined) {
        bestDistance = onClosestDistance ? onClosestDistance(node.object) : minDistanceSqPointToBox(node.box, point);
        bestLeaf = node.object;
        return;
      }

      const leftDistance = minDistanceSqPointToBox(node.left.box, point);
      const rightDistance = minDistanceSqPointToBox(node.right.box, point);

      if (leftDistance < rightDistance) {

        if (leftDistance < bestDistance) {

          _closestPointToPoint(node.left);
          if (rightDistance < bestDistance) _closestPointToPoint(node.right);

        }

      } else if (rightDistance < bestDistance) {

        _closestPointToPoint(node.right);
        if (leftDistance < bestDistance) _closestPointToPoint(node.left);

      }
    }
  }

  // provare approccio con priorità
  public intersectsBox(box: FloatArray, onIntersection: onIntersectionCallback<L>): boolean {
    return _intersectsBox(this.root);

    function _intersectsBox(node: BVHNode<N, L>): boolean {
      if (!intersectBoxBox(box, node.box)) return false;

      if (node.object !== undefined) return onIntersection(node.object);

      return _intersectsBox(node.left) || _intersectsBox(node.right);
    }
  }

  // provare approccio con priorità
  public intersectsSphere(center: FloatArray, radius: number, onIntersection: onIntersectionCallback<L>): boolean {
    return _intersectsSphere(this.root);

    function _intersectsSphere(node: BVHNode<N, L>): boolean {
      if (!intersectSphereBox(center, radius, node.box)) return false;

      if (node.object !== undefined) return onIntersection(node.object);

      return _intersectsSphere(node.left) || _intersectsSphere(node.right);
    }
  }
}

