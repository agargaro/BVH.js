import { BVHNode } from '../core/BVHNode.js';

export type HeapItem = { value: number; node: BVHNode<unknown, unknown> };

/**
 * @reference https://github.com/zrwusa/data-structure-typed/blob/main/src/data-structures/heap/heap.ts
 */
export class MinHeap {
  protected _elements: HeapItem[] = [];
  protected _pool: HeapItem[] = [];
  protected _poolIndex: number = 0;

  public add(node: BVHNode<unknown, unknown>, value: number): boolean {
    const pool = this._pool;
    const elements = this._elements;
    const poolIndex = this._poolIndex;

    if (poolIndex >= pool.length) {
      pool.push({ value: -1, node: null });
    }

    const item = pool[poolIndex];
    item.node = node;
    item.value = value;

    this._poolIndex++;
    elements.push(item);
    return this._bubbleUp(elements.length - 1);
  }

  public poll(): HeapItem | undefined {
    const elements = this._elements;
    if (elements.length === 0) return;
    const value = elements[0];
    const last = elements.pop();
    if (elements.length) {
      elements[0] = last;
      this._sinkDown(0, elements.length >> 1);
    }
    return value;
  }

  public clear(): void {
    this._poolIndex = 0;
    this._elements.length = 0;
  }

  protected _bubbleUp(index: number): boolean {
    const elements = this._elements;
    const element = elements[index];
    while (index > 0) {
      const parent = (index - 1) >> 1;
      const parentItem = elements[parent];
      if (parentItem.value <= element.value) break;
      elements[index] = parentItem;
      index = parent;
    }
    elements[index] = element;
    return true;
  }

  protected _sinkDown(index: number, halfLength: number): boolean {
    const elements = this._elements;
    const element = elements[index];
    while (index < halfLength) {
      let left = (index << 1) | 1;
      const right = left + 1;
      let minItem = elements[left];
      if (right < elements.length && minItem.value > elements[right].value) {
        left = right;
        minItem = elements[right];
      }
      if (minItem.value >= element.value) break;
      elements[index] = minItem;
      index = left;
    }
    elements[index] = element;
    return true;
  }
}
