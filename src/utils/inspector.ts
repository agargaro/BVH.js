import { BVH } from "../core/BVH";
import { BVHNode } from "../core/BVHNode";
import { areaBox } from "./boxUtils";

export class BVHInspector {
    public totalNodes = 0;
    public totalLeafNodes = 0;
    public surfaceScore = 0;
    public areaProportion = 0;
    public minDepth = Infinity;
    public maxDepth = 0;
    public memory = 0; // TODO
    protected _bvh: BVH<{}, {}>;

    constructor(bvh: BVH<{}, {}>) {
        this._bvh = bvh;
        this.update();
    }

    public update(): void {
        this.reset();
        this.getNodeData(this._bvh.root, 0);
        this.areaProportion = this.surfaceScore / areaBox(this._bvh.root.box);
    }

    protected reset(): void {
        this.totalNodes = 0;
        this.totalLeafNodes = 0;
        this.surfaceScore = 0;
        this.areaProportion = 0;
        this.minDepth = Infinity;
        this.maxDepth = 0;
        this.memory = 0;
    }

    protected getNodeData(node: BVHNode<{}, {}>, depth: number): void {
        this.totalNodes++;

        const area = areaBox(node.box);
        this.surfaceScore += area;

        if (node.object) {
            this.totalLeafNodes++;

            if (depth < this.minDepth) this.minDepth = depth;
            if (depth > this.maxDepth) this.maxDepth = depth;

            return;
        }

        depth++;

        this.getNodeData(node.left, depth);
        this.getNodeData(node.right, depth);
    }
}
