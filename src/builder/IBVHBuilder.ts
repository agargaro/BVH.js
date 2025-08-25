export type FloatArray = Float32Array | Float64Array;
export type FloatArrayType = typeof Float32Array | typeof Float64Array;
export type NumberArray = Float32Array | number[];

export type onLeafCreationCallback = (nodeId: number) => void;

export interface IBVHBuilder {
  readonly useFloat64: boolean;
  rootId: number | null;
  // createFromArray(objectsId: NumberArray, boxes: FloatArray[], margin?: number): void;
  insert(objectId: number, box: FloatArray, margin?: number): number;
  insertRange(objectsId: NumberArray, boxes: FloatArray[], margins?: number | NumberArray, onLeafCreation?: onLeafCreationCallback): void;
  // insertChunk(): void;
  // move(nodeId: number, margin?: number): void;
  // delete(nodeId: number): number;
  clear(): void;
}
