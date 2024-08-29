import { IBVHBuilder, onLeafCreationCallback } from "../builder/IBVHBuilder.js";
import { closestDistanceSquaredPointToBox } from "../utils/boxUtils.js";
import { CoordinateSystem, Frustum, WebGLCoordinateSystem } from "../utils/frustum.js";
import { intersectRayBox } from "../utils/intersectUtils.js";
import { BVHNode, FloatArray } from "./BVHNode.js";

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

  public frustumCulling(projectionMatrix: FloatArray | number[], onFrustumIntersected: (leaf: L) => void): void {
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
      if (node.object !== undefined) {
        onFrustumIntersected(node.object);
        return;
      }

      traverseVisibility(node.left, mask);
      traverseVisibility(node.right, mask);
    }

    function showAll(node: BVHNode<N, L>): void {
      if (node.object !== undefined) {
        onFrustumIntersected(node.object);
        return;
      }

      showAll(node.left);
      showAll(node.right);
    }
  }

  public closestToPoint(point: FloatArray): L {
    let bestDistance = Infinity;
    let bestLeaf: L = null;

    _closestToPoint(this.root);

    return bestLeaf;

    function _closestToPoint(node: BVHNode<N, L>): void {
      if (node.object !== undefined) {
        // TODO add callback 

        bestDistance = closestDistanceSquaredPointToBox(node.box, point);
        bestLeaf = node.object;

        return;
      }

      const leftDistance = closestDistanceSquaredPointToBox(node.left.box, point);
      const rightDistance = closestDistanceSquaredPointToBox(node.right.box, point);

      if (leftDistance < rightDistance) {

        if (leftDistance < bestDistance) {

          _closestToPoint(node.left);
          if (rightDistance < bestDistance) _closestToPoint(node.right);

        }

      } else if (rightDistance < bestDistance) {

        _closestToPoint(node.right);
        if (leftDistance < bestDistance) _closestToPoint(node.left);

      }
    }
  }
}

