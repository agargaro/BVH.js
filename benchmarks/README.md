# Benchmarks

Opt-in CPU measurements with [tinybench](https://github.com/tinylibs/tinybench), run through `tsx` directly on `src/`. `benchmarks/tsconfig.tsx.json` turns off `verbatimModuleSyntax` for the runtime transform only, so baselines older than the `import type` cleanup still load. They never run in the default test suite; only the report parser and comparator are tested (`tests/unit/benchmark-results.test.ts`).

`npm run bench` runs `index.ts` and writes a JSON report (default `benchmarks/results/current.json`, ignored by git).

| Suite | Measures (one batch) | Validation |
| --- | --- | --- |
| `build` | `createFromArray` of `BENCH_COUNT` boxes | tree invariants |
| `insert` | `insert` of `BENCH_COUNT` boxes into an empty tree, with `BENCH_MARGIN` | tree invariants |
| `move` | `move` of `BENCH_MOVING` spread leaves, alternating between the original box and a shift larger than the margin | tree invariants against the moved boxes |
| `frustum` | `frustumCulling` with `BENCH_QUERIES` perspective cameras | brute-force plane test |
| `ray` | `rayIntersections` with `BENCH_QUERIES` rays from inside the scene | brute-force slab test |
| `box` | `intersectsBox` with `BENCH_QUERIES` query boxes, visiting every hit | brute-force overlap |
| `sphere` | `intersectsSphere` with `BENCH_QUERIES` spheres, visiting every hit | brute-force distance |
| `closest` | `closestPointToPoint` from `BENCH_QUERIES` points | brute-force minimum distance |

Tree invariants: every object appears once, parent links are consistent, every internal box is inside its parent and every object box is inside its leaf and its parent. Query validations ignore boxes within `1e-2` of a boundary (float32 rounding) and require at least one hit.

Inputs are deterministic (seeded PRNG): boxes with nonuniform half sizes in `[0.25, 1]`, spread in a cube whose side grows with `cbrt(BENCH_COUNT)` to keep the density constant.

| Variable | Default | Meaning |
| --- | --- | --- |
| `BENCH_SUITE` | all | Comma-separated suites |
| `BENCH_COUNT` | `10000` | Boxes in the tree |
| `BENCH_QUERIES` | `64` | Queries per batch |
| `BENCH_MOVING` | `1000` | Leaves moved per batch |
| `BENCH_MARGIN` | `0.5` | Margin of `insert` and `move` |
| `BENCH_HIGH_PRECISION` | `0` | `1` builds Float64 trees and inputs |
| `BENCH_TIME`, `BENCH_ITERATIONS` | `500`, `32` | tinybench run time (ms) and minimum iterations |
| `BENCH_WARMUP_TIME`, `BENCH_WARMUP_ITERATIONS` | `100`, `8` | tinybench warmup |
| `BENCH_OUTPUT` | `benchmarks/results/current.json` | Report path |
| `BENCH_SOURCE_ROOT` | `.` | Directory whose `src/index.ts` is measured |
| `BENCH_COMPARE_ROOT` | unset | Baseline directory for the same-process comparison (see below) |
| `BENCH_COMPARE_WARMUP`, `BENCH_COMPARE_SAMPLES` | `16`, `32` | Warmup pairs and samples per round of the same-process comparison |

## Validation only

`npm run bench:validate` runs each selected suite twice and checks it against the references, with no timing and no report. The `Node.js CI` workflow runs it in float32 and float64 (`BENCH_HIGH_PRECISION=1`), `npm run check` in float32: until `src/` has unit tests, it is the only automatic check of query and tree correctness.

Add cases to `index.ts` instead of creating a script per optimization. Remove experiment-only flags once the decision is made.

## Before/after

1. Measure only the affected path (`BENCH_SUITE`), with identical parameters. Extract the baseline source inside the project: `git archive <base> src | tar -x -C .cache/baseline`, then set `BENCH_SOURCE_ROOT=.cache/baseline` for the baseline runs.
2. Run at least three independent processes per side, alternating order (base/candidate, candidate/base, base/candidate), with no tests or builds running concurrently.
3. `npm run bench:compare -- before-0.json after-0.json before-1.json after-1.json before-2.json after-2.json`. A regression is confirmed only when every pair exceeds 1.10× latency including error margins; one pair is diagnostic only. Reports with a different harness, context or task set are rejected.
4. Put the summary (environment, parameters, means and RME, what was not measured) in the PR description. Raw results stay in ignored `benchmarks/results/` or `.cache/`.

The `CPU benchmarks` workflow (`.github/workflows/benchmark.yml`, manual) runs these three alternating rounds against a baseline ref.

### Same process

For small differences (a few percent) the variance between processes can hide the change. `BENCH_COMPARE_ROOT=.cache/baseline npm run bench` loads the baseline and the current `src/` as separate modules in one process and, for each selected suite, after `BENCH_COMPARE_WARMUP` pairs, runs 3 rounds of `BENCH_COMPARE_SAMPLES` samples alternating before/after (inputs reset outside timing; both sides verified after every round). It prints one JSON line per round with `beforeMs`, `afterMs` and `timeChangePercent`, and writes no report. A change is supported only when all three rounds agree in direction beyond their spread; it is diagnostic and does not replace the three-process gate for regressions.

## Rules

- Setup, input resets, validation and cleanup stay outside timing (tinybench `beforeEach` and checks after the run). A fast wrong result must fail.
- Record CPU, OS and Node version (the report does it). Never raise thresholds or drop tasks to pass the gate; overlapping ranges do not support a speedup claim.
