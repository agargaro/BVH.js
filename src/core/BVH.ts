import { IBVHBuilder, onLeafCreationCallback } from "../builder/IBVHBuilder.js";
import { minDistanceSqPointToBox, minMaxDistanceSqPointToBox } from "../utils/boxUtils.js";
import { CoordinateSystem, Frustum, WebGLCoordinateSystem } from "../utils/frustum.js";
import { intersectBoxBox, intersectRayBox, intersectSphereBox } from "../utils/intersectUtils.js";
import { BVHNode, FloatArray } from "./BVHNode.js";

export type onTraverseCallback<N, L> = (node: BVHNode<N, L>, depth: number) => boolean;
export type onIntersectionCallback<L> = (obj: L) => boolean;
export type onClosestDistanceCallback<L> = (obj: L) => number;
export type onIntersectionRayCallback<L> = (obj: L) => void;
export type onFrustumIntersectionCallback<N, L> = (node: BVHNode<N, L>, frustum?: Frustum, mask?: number) => void;
export type onFrustumIntersectionLODCallback<N, L> = (node: BVHNode<N, L>, level: number, frustum?: Frustum, mask?: number) => void;

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

  public createFromArray(objects: L[], boxes: FloatArray[], onLeafCreation?: onLeafCreationCallback<N, L>, margin?: number): void {
    this.builder.createFromArray(objects, boxes, onLeafCreation, margin);
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

  public traverse(callback: onTraverseCallback<N, L>): void {
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

  public intersectsRay(dir: FloatArray, origin: FloatArray, onIntersection: onIntersectionCallback<L>, near = 0, far = Infinity): boolean {
    const dirInv = this._dirInv;
    const sign = this._sign;

    //TODO provare a non passare array

    dirInv[0] = 1 / dir[0];
    dirInv[1] = 1 / dir[1];
    dirInv[2] = 1 / dir[2];

    sign[0] = dirInv[0] < 0 ? 1 : 0;
    sign[1] = dirInv[1] < 0 ? 1 : 0;
    sign[2] = dirInv[2] < 0 ? 1 : 0;

    return _intersectsRay(this.root);

    function _intersectsRay(node: BVHNode<N, L>): boolean {
      if (!intersectRayBox(node.box, origin, dirInv, sign, near, far)) return false;

      if (node.object !== undefined) return onIntersection(node.object);

      return _intersectsRay(node.left) || _intersectsRay(node.right);
    }
  }

  public intersectsBox(box: FloatArray, onIntersection: onIntersectionCallback<L>): boolean {
    return _intersectsBox(this.root);

    function _intersectsBox(node: BVHNode<N, L>): boolean {
      if (!intersectBoxBox(box, node.box)) return false;

      if (node.object !== undefined) return onIntersection(node.object);

      return _intersectsBox(node.left) || _intersectsBox(node.right);
    }
  }

  public intersectsSphere(center: FloatArray, radius: number, onIntersection: onIntersectionCallback<L>): boolean {
    return _intersectsSphere(this.root);

    function _intersectsSphere(node: BVHNode<N, L>): boolean {
      if (!intersectSphereBox(center, radius, node.box)) return false;

      if (node.object !== undefined) return onIntersection(node.object);

      return _intersectsSphere(node.left) || _intersectsSphere(node.right);
    }
  }

  public isNodeIntersected(node: BVHNode<N, L>, onIntersection: onIntersectionCallback<L>): boolean {
    const nodeBox = node.box;
    let parent;

    while ((parent = node.parent)) {
      const oppositeNode = parent.left === node ? parent.right : parent.left;

      if (_isNodeIntersected(oppositeNode)) return true;

      node = parent;
    }

    return false;

    function _isNodeIntersected(node: BVHNode<N, L>): boolean {
      if (!intersectBoxBox(nodeBox, node.box)) return false;

      if (node.object !== undefined) return onIntersection(node.object);

      return _isNodeIntersected(node.left) || _isNodeIntersected(node.right);
    }
  }

  public rayIntersections(dir: FloatArray, origin: FloatArray, onIntersection: onIntersectionRayCallback<L>, near = 0, far = Infinity): void {
    const dirInv = this._dirInv;
    const sign = this._sign;

    dirInv[0] = 1 / dir[0];
    dirInv[1] = 1 / dir[1];
    dirInv[2] = 1 / dir[2];

    sign[0] = dirInv[0] < 0 ? 1 : 0;
    sign[1] = dirInv[1] < 0 ? 1 : 0;
    sign[2] = dirInv[2] < 0 ? 1 : 0;

    _rayIntersections(this.root);

    function _rayIntersections(node: BVHNode<N, L>): void {
      if (!intersectRayBox(node.box, origin, dirInv, sign, near, far)) return;

      if (node.object !== undefined) {
        onIntersection(node.object);
        return;
      }

      _rayIntersections(node.left);
      _rayIntersections(node.right);
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
        showAll(node.left);
        showAll(node.right);
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

  public frustumCullingLOD(projectionMatrix: FloatArray | number[], cameraPosition: FloatArray, levels: FloatArray, onIntersection: onFrustumIntersectionLODCallback<N, L>): void {
    const frustum = this.frustum.setFromProjectionMatrix(projectionMatrix);

    _frustumCullingLOD(this.root, 0b111111, null);

    function _frustumCullingLOD(node: BVHNode<N, L>, mask: number, level: number): void {
      const nodeBox = node.box;

      if (level === null) { // TODO trying use mask here?
        level = getLevel(nodeBox);
      }

      if (node.object !== undefined) {

        if (frustum.isIntersected(nodeBox, mask)) {
          onIntersection(node, level, frustum, mask);
        }

        return;
      }

      mask = frustum.intersectsBoxMask(nodeBox, mask);

      if (mask < 0) return; // -1 = out

      if (mask === 0) { // 0 = in
        showAll(node.left, level);
        showAll(node.right, level);
        return;
      }

      _frustumCullingLOD(node.left, mask, level);
      _frustumCullingLOD(node.right, mask, level);
    }

    function showAll(node: BVHNode<N, L>, level: number): void {
      if (level === null) {
        level = getLevel(node.box);
      }

      if (node.object !== undefined) {
        onIntersection(node, level, frustum, 0);
        return;
      }

      showAll(node.left, level);
      showAll(node.right, level);
    }

    function getLevel(nodeBox: FloatArray): number {
      const { min, max } = minMaxDistanceSqPointToBox(nodeBox, cameraPosition);

      for (let i = levels.length - 1; i > 0; i--) {
        // if we want to add hysteresis -> const levelDistance = level - (level * hysteresis);
        if (max >= levels[i]) {
          return min >= levels[i] ? i : null;
        }
      }

      return 0;
    }
  }

  // onClosestDistance callback should return SQUARED distance 
  public closestPointToPoint(point: FloatArray, onClosestDistance?: onClosestDistanceCallback<L>): number {
    let bestDistance = Infinity;

    _closestPointToPoint(this.root);

    return Math.sqrt(bestDistance);

    function _closestPointToPoint(node: BVHNode<N, L>): void {
      if (node.object !== undefined) {

        if (onClosestDistance) {
          const distance = onClosestDistance(node.object) ?? minDistanceSqPointToBox(node.box, point);
          if (distance < bestDistance) bestDistance = distance;
        } else {
          bestDistance = minDistanceSqPointToBox(node.box, point); // this was already calculated actually
        }

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
}

