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
    if (this._elements.length === 0) return;
    const value = this._elements[0];
    const last = this._elements.pop();
    if (this._elements.length) {
      this._elements[0] = last;
      this._sinkDown(0, this._elements.length >> 1);
    }
    return value;
  }

  public clear(): void {
    this._elements = [];
  }

  protected _bubbleUp(index: number): boolean {
    const element = this._elements[index];
    while (index > 0) {
      const parent = (index - 1) >> 1;
      const parentItem = this._elements[parent];
      if (this._comparator(parentItem, element) <= 0) break;
      this._elements[index] = parentItem;
      index = parent;
    }
    this._elements[index] = element;
    return true;
  }

  protected _sinkDown(index: number, halfLength: number): boolean {
    const element = this._elements[index];
    while (index < halfLength) {
      let left = (index << 1) | 1;
      const right = left + 1;
      let minItem = this._elements[left];
      if (right < this._elements.length && this._comparator(minItem, this._elements[right]) > 0) {
        left = right;
        minItem = this._elements[right];
      }
      if (this._comparator(minItem, element) >= 0) break;
      this._elements[index] = minItem;
      index = left;
    }
    this._elements[index] = element;
    return true;
  }
}
