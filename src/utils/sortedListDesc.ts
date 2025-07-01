type ItemListType = { node: any; inheritedCost: number }; // fix d.ts

export class SortedListDesc {
  public array: ItemListType[] = [];

  public clear(): void {
    this.array.length = 0;
  }

  public push(node: ItemListType): void {
    const index = this.binarySearch(node.inheritedCost);
    this.array.splice(index, 0, node);
  }

  public pop(): ItemListType {
    return this.array.pop();
  }

  public binarySearch(score: number): number {
    const array = this.array;
    let low = 0, high = array.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (array[mid].inheritedCost > score) low = mid + 1;
      else high = mid;
    }
    return low;
  }
}
