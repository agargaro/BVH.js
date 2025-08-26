import { FloatArray, IBVHBuilder, NumberArray, onLeafCreationCallback } from './builder/IBVHBuilder.js';
import { minDistanceSqPointToBox, minMaxDistanceSqPointToBox } from './utils/boxUtils.js';
import { CoordinateSystem, Frustum, WebGLCoordinateSystem } from './utils/frustum.js';
import { intersectBoxBox, intersectRayBox, intersectSphereBox } from './utils/intersectUtils.js';

export type onTraverseCallback = (nodeId: number, depth: number) => boolean;
export type onIntersectionCallback = (objId: number) => boolean;
export type onClosestDistanceCallback = (objId: number) => number;
export type onIntersectionRayCallback = (objId: number) => void;
export type onFrustumIntersectionCallback = (node: number, frustum?: Frustum, mask?: number) => void;
export type onFrustumIntersectionLODCallback = (node: number, level: number, frustum?: Frustum, mask?: number) => void;

export class BVH {
  public builder: IBVHBuilder;
  public frustum: Frustum;
  protected _dirInv: FloatArray;
  protected _sign = new Uint8Array(3);

  public get root(): number | null {
    return this.builder.rootId;
  }

  constructor(builder: IBVHBuilder, coordinateSystem: CoordinateSystem = WebGLCoordinateSystem) {
    this.builder = builder;
    const useFloat64 = builder.useFloat64;
    this.frustum = new Frustum(useFloat64, coordinateSystem);
    this._dirInv = useFloat64 ? new Float64Array(3) : new Float32Array(3);
  }

  // public createFromArray(objects: L[], boxes: FloatArray[], onLeafCreation?: onLeafCreationCallback, margin?: number): void {
  //   if (objects?.length > 0) {
  //     this.builder.createFromArray(objects, boxes, onLeafCreation, margin);
  //   }
  // }

  public insert(object: number, box: FloatArray, margin: number): number {
    return this.builder.insert(object, box, margin);
  }

  public insertRange(objectsId: NumberArray, boxes: FloatArray[], margins?: number | NumberArray, onLeafCreation?: onLeafCreationCallback): void {
    this.builder.insertRange(objectsId, boxes, margins, onLeafCreation);
  }

  public move(node: number, margin: number): void {
    // this.builder.move(node, margin);
  }

  public delete(node: number): number {
    // return this.builder.delete(node);
  }

  public clear(): void {
    this.builder.clear();
  }

  public traverse(callback: onTraverseCallback): void {
    // if (this.root === null) return;

    // _traverse(this.root, 0);

    // function _traverse(node: BVHNode, depth: number): void {
    //   if (node.object !== undefined) { // is leaf
    //     callback(node, depth);
    //     return;
    //   }

    //   const stopTraversal = callback(node, depth);

    //   if (!stopTraversal) {
    //     _traverse(node.left, depth + 1);
    //     _traverse(node.right, depth + 1);
    //   }
    // }
  }

  public intersectsRay(dir: FloatArray, origin: FloatArray, onIntersection: onIntersectionCallback, near = 0, far = Infinity): boolean {
    // if (this.root === null) return false;

    // const dirInv = this._dirInv;
    // const sign = this._sign;

    // // TODO provare a non passare array

    // dirInv[0] = 1 / dir[0];
    // dirInv[1] = 1 / dir[1];
    // dirInv[2] = 1 / dir[2];

    // sign[0] = dirInv[0] < 0 ? 1 : 0;
    // sign[1] = dirInv[1] < 0 ? 1 : 0;
    // sign[2] = dirInv[2] < 0 ? 1 : 0;

    // return _intersectsRay(this.root);

    // function _intersectsRay(node: BVHNode): boolean {
    //   if (!intersectRayBox(node.box, origin, dirInv, sign, near, far)) return false;

    //   if (node.object !== undefined) return onIntersection(node.object);

    //   return _intersectsRay(node.left) || _intersectsRay(node.right);
    // }
  }

  public intersectsBox(box: FloatArray, onIntersection: onIntersectionCallback): boolean {
    // if (this.root === null) return false;

    // return _intersectsBox(this.root);

    // function _intersectsBox(node: BVHNode): boolean {
    //   if (!intersectBoxBox(box, node.box)) return false;

    //   if (node.object !== undefined) return onIntersection(node.object);

    //   return _intersectsBox(node.left) || _intersectsBox(node.right);
    // }
  }

  public intersectsSphere(center: FloatArray, radius: number, onIntersection: onIntersectionCallback): boolean {
    // if (this.root === null) return false;

    // return _intersectsSphere(this.root);

    // function _intersectsSphere(node: BVHNode): boolean {
    //   if (!intersectSphereBox(center, radius, node.box)) return false;

    //   if (node.object !== undefined) return onIntersection(node.object);

    //   return _intersectsSphere(node.left) || _intersectsSphere(node.right);
    // }
  }

  public isNodeIntersected(node: number, onIntersection: onIntersectionCallback): boolean {
    // const nodeBox = node.box;
    // let parent;

    // while ((parent = node.parent)) {
    //   const oppositeNode = parent.left === node ? parent.right : parent.left;

    //   if (_isNodeIntersected(oppositeNode)) return true;

    //   node = parent;
    // }

    // return false;

    // function _isNodeIntersected(node: BVHNode): boolean {
    //   if (!intersectBoxBox(nodeBox, node.box)) return false;

    //   if (node.object !== undefined) return onIntersection(node.object);

    //   return _isNodeIntersected(node.left) || _isNodeIntersected(node.right);
    // }
  }

  public rayIntersections(dir: FloatArray, origin: FloatArray, onIntersection: onIntersectionRayCallback, near = 0, far = Infinity): void {
    // if (this.root === null) return;

    // const dirInv = this._dirInv;
    // const sign = this._sign;

    // dirInv[0] = 1 / dir[0];
    // dirInv[1] = 1 / dir[1];
    // dirInv[2] = 1 / dir[2];

    // sign[0] = dirInv[0] < 0 ? 1 : 0;
    // sign[1] = dirInv[1] < 0 ? 1 : 0;
    // sign[2] = dirInv[2] < 0 ? 1 : 0;

    // _rayIntersections(this.root);

    // function _rayIntersections(node: BVHNode): void {
    //   if (!intersectRayBox(node.box, origin, dirInv, sign, near, far)) return;

    //   if (node.object !== undefined) {
    //     onIntersection(node.object);
    //     return;
    //   }

    //   _rayIntersections(node.left);
    //   _rayIntersections(node.right);
    // }
  }

  public frustumCulling(projectionMatrix: FloatArray | number[], onIntersection: onFrustumIntersectionCallback): void {
    if (this.root === null) return;

    const builder = this.builder;
    const box = builder.box;
    const objectId = builder.objectId;
    const children = builder.children;

    const frustum = this.frustum.setFromProjectionMatrix(projectionMatrix);

    _frustumCulling(this.root, 0b111111);

    function _frustumCulling(nodeId: number, mask: number): void {
      if (objectId[nodeId] !== -1) {
        if (frustum.isIntersected(box, nodeId * 6, mask)) {
          onIntersection(nodeId, frustum, mask);
        }

        return;
      }

      mask = frustum.intersectsBoxMask(box, nodeId * 6, mask);

      if (mask < 0) return; // -1 = out

      const childrenId = nodeId * 2;

      if (mask === 0) { // 0 = in
        showAll(children[childrenId]);
        showAll(children[childrenId + 1]);
        return;
      }

      _frustumCulling(children[childrenId], mask);
      _frustumCulling(children[childrenId + 1], mask);
    }

    function showAll(nodeId: number): void {
      if (objectId[nodeId] !== -1) {
        onIntersection(nodeId, frustum, 0);
        return;
      }

      const childrenId = nodeId * 2;
      showAll(children[childrenId]);
      showAll(children[childrenId + 1]);
    }
  }

  public frustumCullingLOD(projectionMatrix: FloatArray | number[], cameraPosition: FloatArray, levels: FloatArray, onIntersection: onFrustumIntersectionLODCallback): void {
    // if (this.root === null) return;

    // const frustum = this.frustum.setFromProjectionMatrix(projectionMatrix);

    // _frustumCullingLOD(this.root, 0b111111, null);

    // function _frustumCullingLOD(node: BVHNode, mask: number, level: number): void {
    //   const nodeBox = node.box;

    //   if (level === null) { // TODO trying use mask here?
    //     level = getLevel(nodeBox);
    //   }

    //   if (node.object !== undefined) {
    //     if (frustum.isIntersected(nodeBox, mask)) {
    //       onIntersection(node, level, frustum, mask);
    //     }

    //     return;
    //   }

    //   mask = frustum.intersectsBoxMask(nodeBox, mask);

    //   if (mask < 0) return; // -1 = out

    //   if (mask === 0) { // 0 = in
    //     showAll(node.left, level);
    //     showAll(node.right, level);
    //     return;
    //   }

    //   _frustumCullingLOD(node.left, mask, level);
    //   _frustumCullingLOD(node.right, mask, level);
    // }

    // function showAll(node: BVHNode, level: number): void {
    //   if (level === null) {
    //     level = getLevel(node.box);
    //   }

    //   if (node.object !== undefined) {
    //     onIntersection(node, level, frustum, 0);
    //     return;
    //   }

    //   showAll(node.left, level);
    //   showAll(node.right, level);
    // }

    // function getLevel(nodeBox: FloatArray): number {
    //   const { min, max } = minMaxDistanceSqPointToBox(nodeBox, cameraPosition);

    //   for (let i = levels.length - 1; i > 0; i--) {
    //     // if we want to add hysteresis -> const levelDistance = level - (level * hysteresis);
    //     if (max >= levels[i]) {
    //       return min >= levels[i] ? i : null;
    //     }
    //   }

    //   return 0;
    // }
  }

  // onClosestDistance callback should return SQUARED distance
  public closestPointToPoint(point: FloatArray, onClosestDistance?: onClosestDistanceCallback): number {
    //   if (this.root === null) return;

    //   let bestDistance = Infinity;

    //   _closestPointToPoint(this.root);

    //   return Math.sqrt(bestDistance);

    //   function _closestPointToPoint(node: BVHNode): void {
    //     if (node.object !== undefined) {
    //       if (onClosestDistance) {
    //         const distance = onClosestDistance(node.object) ?? minDistanceSqPointToBox(node.box, point);
    //         if (distance < bestDistance) bestDistance = distance;
    //       } else {
    //         bestDistance = minDistanceSqPointToBox(node.box, point); // this was already calculated actually
    //       }

    //       return;
    //     }

    //     const leftDistance = minDistanceSqPointToBox(node.left.box, point);
    //     const rightDistance = minDistanceSqPointToBox(node.right.box, point);

    //     if (leftDistance < rightDistance) {
    //       if (leftDistance < bestDistance) {
    //         _closestPointToPoint(node.left);
    //         if (rightDistance < bestDistance) _closestPointToPoint(node.right);
    //       }
    //     } else if (rightDistance < bestDistance) {
    //       _closestPointToPoint(node.right);
    //       if (leftDistance < bestDistance) _closestPointToPoint(node.left);
    //     }
    //   }
  }
}
