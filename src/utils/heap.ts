import { BVHNode } from '../core/BVHNode.js';

export type HeapItem = { value: number; node: BVHNode<unknown, unknown> };

/**
 * @reference https://github.com/zrwusa/data-structure-typed/blob/main/src/data-structures/heap/heap.ts
 */
export class MinHeap {
  public maxSize = 16;
  protected _elements: HeapItem[] = [];

  public add(element: HeapItem): boolean {
    this._elements.push(element);
    return this._bubbleUp(this._elements.length - 1);
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

  public isFull(): boolean {
    return this._elements.length >= this.maxSize;
  }

  public clear(): void {
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
