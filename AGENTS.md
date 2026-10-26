# AGENTS.md

bvh.js: dynamic BVH (Erin Catto) published on npm, used in real-time 3D apps where queries run every frame. Performance is the product.

## Commands

- `npm run build`: library build + types into `dist/`. Publish only from `dist/`.
- `npm run lint`: ESLint with autofix (style is enforced there).
- `npm test`: not implemented yet. Never claim tests pass.

## Data conventions

- Box: `FloatArray` of 6, **`[minX, maxX, minY, maxY, minZ, maxZ]`**. Vector: `[x, y, z]`.
- New buffers follow the builder's `highPrecision` (Float64 vs Float32), never hardcode the type.
- Only `HybridBuilder` is active; commented-out builders are old experiments, leave them alone.

## Performance (mandatory)

- Maximum V8 performance, monomorphic code everywhere: same object shape (same properties, same order, all set at creation), same argument types at every call site.
- Initialize every field to `null`, never `undefined` or missing. Never `delete` properties.
- Hot paths (queries, culling, insert/move/refit): zero allocations, no closures/spread/array callbacks/`console`; reuse instance buffers.
- Any performance claim needs a before/after benchmark; if none exists, say so.

## Public API

- Every export in `src/index.ts` is semver-public: no internal exports, no signature changes without flagging a breaking change.
- No runtime dependencies.
- `createFromArray` reorders the caller's arrays in place and margins mutate caller boxes: keep or document it.

## Known debt

Leaves `{box, object, parent}` and internal nodes `{box, parent, left, right}` have different shapes, leaf check is `object !== undefined`, and `onLeafCreation` adds fields after creation. Fixing it is a breaking change: do it only as a dedicated task, never as a side effect.
