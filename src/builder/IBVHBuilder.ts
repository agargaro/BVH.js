import { BVHNode, FloatArray } from '../core/BVHNode.js';

export type onLeafCreationCallback<N, L> = (node: BVHNode<N, L>) => void;

export interface IBVHBuilder<N, L> {
  root: BVHNode<N, L>;
  createFromArray(objects: L[], boxes: FloatArray[], onLeafCreation?: onLeafCreationCallback<N, L>, margin?: number): void;
  insert(object: L, box: FloatArray, margin: number): BVHNode<N, L>;
  insertRange(objects: L[], boxes: FloatArray[], margins?: number | FloatArray | number[], onLeafCreation?: onLeafCreationCallback<N, L>): void;
  move(node: BVHNode<N, L>, margin: number): void;
  delete(node: BVHNode<N, L>): BVHNode<N, L>;
  clear(): void;
  readonly highPrecision: boolean;
}
