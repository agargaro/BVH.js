export type FloatArray = Float32Array | Float64Array;

export type BVHNode<NodeData, LeafData> = {
  box: FloatArray; // [minX, maxX, minY, maxY, minZ, maxZ]
  left?: BVHNode<NodeData, LeafData>;
  right?: BVHNode<NodeData, LeafData>;
  object?: LeafData;
} & NodeData;
