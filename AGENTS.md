# AGENTS.md

bvh.js: dynamic BVH (Erin Catto) published on npm, used in real-time 3D apps where queries run every frame. Performance is the product.

## Workflow

- Before a PR run `npm run check`; report failing checks honestly.
- `src/` has no unit tests yet: `npm run bench:validate` (brute-force references) is the only correctness check. Never claim the library is tested.
- Publish from the repository root (`files` allowlist, `prepack` rebuilds), never from `build/`.

## Data conventions

- Box: `FloatArray` of 6, **`[minX, maxX, minY, maxY, minZ, maxZ]`**. Vector: `[x, y, z]`.
- New buffers follow the builder's `highPrecision` (Float64 vs Float32), never hardcode the type.
- Only `HybridBuilder` is active; commented-out builders are old experiments, leave them alone.

## Performance (mandatory)

- Maximum V8 performance, monomorphic code everywhere: same object shape (same properties, same order, all set at creation), same argument types at every call site.
- Initialize every field to `null`, never `undefined` or missing. Never `delete` properties.
- Hot paths (queries, culling, insert/move/refit): zero allocations, no closures/spread/array callbacks/`console`; reuse instance buffers.
- Any performance claim needs a before/after benchmark following [benchmarks/README.md](benchmarks/README.md); if no case covers the path, add one or say so.

## Public API

- Every export in `src/index.ts` is semver-public: no internal exports, no signature changes without flagging a breaking change.
- No runtime dependencies.
- `createFromArray` reorders the caller's arrays in place and margins mutate caller boxes: keep or document it.

## Known debt

Leaves `{box, object, parent}` and internal nodes `{box, parent, left, right}` have different shapes, leaf check is `object !== undefined`, and `onLeafCreation` adds fields after creation. Fixing it is a breaking change: do it only as a dedicated task, never as a side effect.
