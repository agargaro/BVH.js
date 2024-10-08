export type FloatArray = Float32Array | Float64Array;
export type FloatArrayType = typeof Float32Array | typeof Float64Array;

export type BVHNode<NodeData, LeafData> = {
  box: FloatArray; // [minX, maxX, minY, maxY, minZ, maxZ]
  parent?: BVHNode<NodeData, LeafData>;
  left?: BVHNode<NodeData, LeafData>;
  right?: BVHNode<NodeData, LeafData>;
  object?: LeafData;
} & NodeData;
