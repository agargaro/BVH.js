type ItemListType = { node: any, inheritedCost: number }; // fix d.ts

export class SortedListPriority {
    public array: ItemListType[] = [];

    public clear(): void {
        this.array = [];
    }

    public push(node: ItemListType): void {
        const array = this.array;
        const cost = node.inheritedCost;
        const end = array.length > 6 ? array.length - 6 : 0;
        let i: number;

        for (i = array.length - 1; i >= end; i--) {
            if (cost <= array[i].inheritedCost) break;
        }

        i++;
        if (i > array.length - 6) array.splice(i, 0, node);
    }

    public pop() {
        return this.array.pop();
    }
}
