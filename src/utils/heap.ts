export type Comparator<K> = (a: K, b: K) => number;

/**
 * @reference https://github.com/zrwusa/data-structure-typed/blob/main/src/data-structures/heap/heap.ts
 */
export class Heap<E> {
  protected _comparator: Comparator<E>;
  protected _elements: E[] = [];

  constructor(comparator: Comparator<E>) {
    this._comparator = comparator;
  }

  public add(element: E): boolean {
    this._elements.push(element);
    return this._bubbleUp(this._elements.length - 1);
  }

  public poll(): E | undefined {
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
    this._elements.length = 0;
  }

  protected _bubbleUp(index: number): boolean {
    const comparator = this._comparator;
    const elements = this._elements;
    const element = elements[index];
    while (index > 0) {
      const parent = (index - 1) >> 1;
      const parentItem = elements[parent];
      if (comparator(parentItem, element) <= 0) break;
      elements[index] = parentItem;
      index = parent;
    }
    elements[index] = element;
    return true;
  }

  protected _sinkDown(index: number, halfLength: number): boolean {
    const elements = this._elements;
    const element = elements[index];
    const comparator = this._comparator;
    while (index < halfLength) {
      let left = (index << 1) | 1;
      const right = left + 1;
      let minItem = elements[left];
      if (right < elements.length && comparator(minItem, elements[right]) > 0) {
        left = right;
        minItem = elements[right];
      }
      if (comparator(minItem, element) >= 0) break;
      elements[index] = minItem;
      index = left;
    }
    elements[index] = element;
    return true;
  }
}
