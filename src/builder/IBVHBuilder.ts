import { BVHNode, FloatArray } from "../core/BVHNode";

export type onLeafCreationCallback<N, L> = (node: BVHNode<N, L>) => void;

export interface IBVHBuilder<N, L> {
  root: BVHNode<N, L>;
  createFromArray(objects: L[], boxes: FloatArray[], onLeafCreation?: onLeafCreationCallback<N, L>): void;
  insert(object: L, box: FloatArray): BVHNode<N, L>;
  insertRange(objects: L[], boxes: FloatArray[], onLeafCreation?: onLeafCreationCallback<N, L>): void;
  move(node: BVHNode<N, L>): void;
  delete(node: BVHNode<N, L>): BVHNode<N, L>;
  clear(): void;
}
