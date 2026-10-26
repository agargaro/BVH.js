import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Bench } from 'tinybench';
import type { BVH, BVHNode, FloatArray } from '../src/index.js';
import { parseReport } from './results.js';

function parameter(name: string, fallback: number, minimum: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  assert(raw === undefined || raw.trim().length > 0, `${name} cannot be empty`);
  assert(Number.isSafeInteger(value) && value >= minimum, `Invalid ${name}`);
  return value;
}

function decimal(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  assert(raw === undefined || raw.trim().length > 0, `${name} cannot be empty`);
  assert(Number.isFinite(value) && value >= 0, `Invalid ${name}`);
  return value;
}

function version(name: string): string {
  const value: unknown = JSON.parse(readFileSync(resolve('node_modules', name, 'package.json'), 'utf8'));
  assert(typeof value === 'object' && value !== null && 'version' in value && typeof value.version === 'string');
  return value.version;
}

type Runtime = typeof import('../src/index.js');

async function load(root: string): Promise<Runtime> {
  const runtime = await import(pathToFileURL(resolve(root, 'src/index.ts')).href) as Runtime;
  assert(typeof runtime.BVH === 'function' && typeof runtime.HybridBuilder === 'function', `${root}: missing BVH exports`);
  return runtime;
}

const sourceRoot = process.env['BENCH_SOURCE_ROOT'] ?? '.';
const compareRoot = process.env['BENCH_COMPARE_ROOT'];
const validateOnly = process.argv.includes('--validate');
assert(!validateOnly || compareRoot === undefined, '--validate and BENCH_COMPARE_ROOT are exclusive');

const suites = ['build', 'insert', 'move', 'frustum', 'ray', 'box', 'sphere', 'closest'];
const requested = process.env['BENCH_SUITE'];
const selected = requested === undefined ? suites : requested.split(',').map((item) => item.trim());
for (const suite of selected) assert(suites.includes(suite), `Unknown BENCH_SUITE entry: ${suite}`);

const context = {
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  cpu: cpus()[0]?.model ?? 'unknown',
  tinybench: version('tinybench'),
  highPrecision: process.env['BENCH_HIGH_PRECISION'] === '1',
  count: parameter('BENCH_COUNT', 10000, 2),
  queries: parameter('BENCH_QUERIES', 64, 1),
  moving: parameter('BENCH_MOVING', 1000, 1),
  margin: decimal('BENCH_MARGIN', 0.5),
  time: parameter('BENCH_TIME', 500, 0),
  iterations: parameter('BENCH_ITERATIONS', 32, 2),
  warmupTime: parameter('BENCH_WARMUP_TIME', 100, 0),
  warmupIterations: parameter('BENCH_WARMUP_ITERATIONS', 8, 1)
};
const { count, queries, moving, margin, highPrecision } = context;
assert(moving <= count, 'BENCH_MOVING cannot exceed BENCH_COUNT');

type Tree = BVH<object, number>;
type Node = BVHNode<object, number>;

/** Absolute tolerance in world units for float32 boundary cases; elements within it of a boundary are not checked. */
const epsilon = 1e-2;

let seed = 0x2545f491;
function random(): number {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function createArray(length: number): FloatArray {
  return highPrecision ? new Float64Array(length) : new Float32Array(length);
}

function createTree(runtime: Runtime): Tree {
  return new runtime.BVH<object, number>(new runtime.HybridBuilder<object, number>(highPrecision));
}

function copyBoxes(boxes: readonly FloatArray[]): FloatArray[] {
  return boxes.map((box) => {
    const copy = createArray(6);
    copy.set(box);
    return copy;
  });
}

const extent = Math.cbrt(count) * 4;
function randomPoint(scale: number): FloatArray {
  const point = createArray(3);
  point[0] = (random() * 2 - 1) * scale;
  point[1] = (random() * 2 - 1) * scale;
  point[2] = (random() * 2 - 1) * scale;
  return point;
}

function randomDirection(): FloatArray {
  const direction = createArray(3);
  let length = 0;
  while (length < 1e-3) {
    direction[0] = random() * 2 - 1;
    direction[1] = random() * 2 - 1;
    direction[2] = random() * 2 - 1;
    length = Math.hypot(direction[0], direction[1], direction[2]);
  }
  direction[0] /= length;
  direction[1] /= length;
  direction[2] /= length;
  return direction;
}

function randomBox(halfMin: number, halfMax: number): FloatArray {
  const box = createArray(6);
  for (let axis = 0; axis < 3; axis++) {
    const center = (random() * 2 - 1) * extent;
    const half = halfMin + random() * (halfMax - halfMin);
    box[axis * 2] = center - half;
    box[axis * 2 + 1] = center + half;
  }
  return box;
}

const ids = Array.from({ length: count }, (_, i) => i);
const source = ids.map(() => randomBox(0.25, 1));

/** Column-major WebGL view-projection of a perspective camera at `eye` looking at `target`. */
function viewProjection(eye: FloatArray, target: FloatArray): Float64Array {
  const fov = Math.PI / 3.6;
  const aspect = 16 / 9;
  const near = 0.1;
  const far = extent * 2;
  const f = 1 / Math.tan(fov / 2);
  let zx = eye[0] - target[0];
  let zy = eye[1] - target[1];
  let zz = eye[2] - target[2];
  const zLength = Math.hypot(zx, zy, zz);
  zx /= zLength;
  zy /= zLength;
  zz /= zLength;
  let xx = zz;
  let xy = 0;
  let xz = -zx;
  const xLength = Math.hypot(xx, xy, xz);
  xx /= xLength;
  xy /= xLength;
  xz /= xLength;
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;
  const view = [
    xx, yx, zx, 0,
    xy, yy, zy, 0,
    xz, yz, zz, 0,
    -(xx * eye[0] + xy * eye[1] + xz * eye[2]), -(yx * eye[0] + yy * eye[1] + yz * eye[2]), -(zx * eye[0] + zy * eye[1] + zz * eye[2]), 1
  ];
  const projection = [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0
  ];
  const result = new Float64Array(16);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += projection[k * 4 + row] * view[column * 4 + k];
      result[column * 4 + row] = sum;
    }
  }
  return result;
}

/** Signed distance of the box's farthest corner along each normalized frustum plane, minimized over planes. */
function frustumScore(matrix: Float64Array, box: FloatArray): number {
  let score = Infinity;
  for (let plane = 0; plane < 6; plane++) {
    const row = plane >> 1;
    const sign = (plane & 1) === 0 ? 1 : -1;
    const x = matrix[3] + sign * matrix[row];
    const y = matrix[7] + sign * matrix[4 + row];
    const z = matrix[11] + sign * matrix[8 + row];
    const w = matrix[15] + sign * matrix[12 + row];
    const length = Math.hypot(x, y, z);
    const distance = (x * (x > 0 ? box[1] : box[0]) + y * (y > 0 ? box[3] : box[2]) + z * (z > 0 ? box[5] : box[4]) + w) / length;
    score = Math.min(score, distance);
  }
  return score;
}

function rayScore(origin: FloatArray, direction: FloatArray, box: FloatArray): number {
  let near = 0;
  let far = Infinity;
  for (let axis = 0; axis < 3; axis++) {
    const t1 = (box[axis * 2] - origin[axis]) / direction[axis];
    const t2 = (box[axis * 2 + 1] - origin[axis]) / direction[axis];
    near = Math.max(near, Math.min(t1, t2));
    far = Math.min(far, Math.max(t1, t2));
  }
  return far - near;
}

function boxScore(query: FloatArray, box: FloatArray): number {
  let score = Infinity;
  for (let axis = 0; axis < 3; axis++) {
    score = Math.min(score, Math.min(query[axis * 2 + 1], box[axis * 2 + 1]) - Math.max(query[axis * 2], box[axis * 2]));
  }
  return score;
}

function pointBoxDistance(point: FloatArray, box: FloatArray): number {
  let sum = 0;
  for (let axis = 0; axis < 3; axis++) {
    const value = point[axis];
    const gap = Math.max(box[axis * 2] - value, 0, value - box[axis * 2 + 1]);
    sum += gap * gap;
  }
  return Math.sqrt(sum);
}

function sourceBox(object: number): FloatArray {
  return source[object];
}

const marks = new Uint8Array(count);
function markNode(node: Node): void {
  assert(node.object !== undefined, 'Callback received an internal node');
  marks[node.object] = 1;
}

function markObject(object: number): boolean {
  marks[object] = 1;
  return false;
}

function verifyMarks(label: string, score: (box: FloatArray) => number): number {
  let hits = 0;
  for (let i = 0; i < count; i++) {
    const value = score(source[i]);
    if (value > epsilon) assert.equal(marks[i], 1, `${label}: missing object ${i}`);
    else if (value < -epsilon) assert.equal(marks[i], 0, `${label}: unexpected object ${i}`);
    hits += marks[i];
  }
  marks.fill(0);
  return hits;
}

function isInside(box: FloatArray, outer: FloatArray): boolean {
  return box[0] >= outer[0] && box[1] <= outer[1] && box[2] >= outer[2] && box[3] <= outer[3] && box[4] >= outer[4] && box[5] <= outer[5];
}

/**
 * Leaf set, unique objects, parent links, every internal box inside its parent box and the root without parent.
 * Leaves are checked through `objectBox`, the object's box without margin: `move` keeps a leaf whose new box fits its
 * parent and only then expands it by the margin, so the expanded leaf box may exceed the parent.
 */
function verifyTree(tree: Tree, label: string, objectBox: (object: number) => FloatArray): void {
  const root = tree.root;
  assert(!root.parent, `${label}: root has a parent`);
  let leaves = 0;
  tree.traverse((node) => {
    const parent = node.parent;
    const object = node.object;
    const box = object !== undefined ? objectBox(object) : node.box;
    if (object !== undefined) assert(isInside(box, node.box), `${label}: object outside its leaf`);
    if (node !== root) {
      assert(parent !== undefined && (parent.left === node || parent.right === node), `${label}: broken parent link`);
      assert(isInside(box, parent.box), `${label}: child outside parent`);
    }
    if (object !== undefined) {
      assert.equal(marks[object], 0, `${label}: duplicate object ${object}`);
      marks[object] = 1;
      leaves++;
    }
    return false;
  });
  assert.equal(leaves, count, `${label}: wrong leaf count`);
  marks.fill(0);
}

let sink = 0;
function countNode(): void {
  sink++;
}

function countObject(): boolean {
  sink++;
  return false;
}

const frustumMatrices = Array.from({ length: queries }, () => viewProjection(randomPoint(extent * 1.5), randomPoint(extent * 0.5)));
const rayOrigins = Array.from({ length: queries }, () => randomPoint(extent));
const rayDirections = Array.from({ length: queries }, () => randomDirection());
const queryBoxes = Array.from({ length: queries }, () => randomBox(extent * 0.02, extent * 0.1));
const sphereCenters = Array.from({ length: queries }, () => randomPoint(extent));
const sphereRadius = extent * 0.1;
const closestPoints = Array.from({ length: queries }, () => randomPoint(extent * 1.2));
const closestExpected = closestPoints.map((point) => {
  let expected = Infinity;
  for (const box of source) expected = Math.min(expected, pointBoxDistance(point, box));
  return expected;
});

/** One measured batch: `reset` restores its inputs outside timing, `verify` checks the last batch against the references. */
interface Suite {
  name: string;
  run: () => void;
  reset: () => void;
  verify: () => void;
}

function noReset(): void {}

function createSuites(runtime: Runtime): Suite[] {
  const result: Suite[] = [];

  if (selected.includes('build')) {
    let tree = createTree(runtime);
    let objects: number[] = [];
    let boxes: FloatArray[] = [];
    result.push({
      name: `createFromArray (${count} boxes)`,
      run() {
        tree.createFromArray(objects, boxes);
      },
      reset() {
        tree = createTree(runtime);
        objects = ids.slice();
        boxes = source.slice();
      },
      verify() {
        verifyTree(tree, 'createFromArray', sourceBox);
      }
    });
  }

  if (selected.includes('insert')) {
    let tree = createTree(runtime);
    const boxes = copyBoxes(source);
    result.push({
      name: `insert (${count} boxes, margin ${margin})`,
      run() {
        for (let i = 0; i < count; i++) tree.insert(i, boxes[i], margin);
      },
      reset() {
        tree = createTree(runtime);
        for (let i = 0; i < count; i++) boxes[i].set(source[i]);
      },
      verify() {
        verifyTree(tree, 'insert', sourceBox);
      }
    });
  }

  if (selected.includes('move')) {
    const tree = createTree(runtime);
    const boxes = copyBoxes(source);
    const nodes = ids.map((i) => tree.insert(i, boxes[i], margin));
    const stride = Math.floor(count / moving);
    const offset = margin * 2 + 1;
    let step = 0;
    let shift = 0;
    result.push({
      name: `move (${moving} of ${count} leaves, margin ${margin})`,
      run() {
        shift = (step & 1) === 0 ? offset : 0;
        step++;
        for (let k = 0; k < moving; k++) {
          const node = nodes[k * stride];
          const box = node.box;
          const from = source[k * stride];
          box[0] = from[0] + shift;
          box[1] = from[1] + shift;
          box[2] = from[2] - shift;
          box[3] = from[3] - shift;
          box[4] = from[4];
          box[5] = from[5];
          tree.move(node, margin);
        }
      },
      reset: noReset,
      verify() {
        verifyTree(tree, 'move', (object) => {
          const from = source[object];
          if (object % stride !== 0 || object / stride >= moving) return from;
          const box = createArray(6);
          box.set(from);
          box[0] += shift;
          box[1] += shift;
          box[2] -= shift;
          box[3] -= shift;
          return box;
        });
      }
    });
  }

  const queryTree = createTree(runtime);
  queryTree.createFromArray(ids.slice(), copyBoxes(source));
  verifyTree(queryTree, 'query tree', sourceBox);

  if (selected.includes('frustum')) {
    result.push({
      name: `frustumCulling (${queries} cameras, ${count} boxes)`,
      run() {
        for (let q = 0; q < queries; q++) queryTree.frustumCulling(frustumMatrices[q], countNode);
      },
      reset: noReset,
      verify() {
        let hits = 0;
        for (const matrix of frustumMatrices) {
          queryTree.frustumCulling(matrix, markNode);
          hits += verifyMarks('frustumCulling', (box) => frustumScore(matrix, box));
        }
        assert(hits > 0, 'frustumCulling: no hits');
      }
    });
  }

  if (selected.includes('ray')) {
    result.push({
      name: `rayIntersections (${queries} rays, ${count} boxes)`,
      run() {
        for (let q = 0; q < queries; q++) queryTree.rayIntersections(rayDirections[q], rayOrigins[q], countNode);
      },
      reset: noReset,
      verify() {
        let hits = 0;
        for (let q = 0; q < queries; q++) {
          queryTree.rayIntersections(rayDirections[q], rayOrigins[q], markObject);
          hits += verifyMarks('rayIntersections', (box) => rayScore(rayOrigins[q], rayDirections[q], box));
        }
        assert(hits > 0, 'rayIntersections: no hits');
      }
    });
  }

  if (selected.includes('box')) {
    result.push({
      name: `intersectsBox (${queries} boxes, ${count} boxes)`,
      run() {
        for (let q = 0; q < queries; q++) queryTree.intersectsBox(queryBoxes[q], countObject);
      },
      reset: noReset,
      verify() {
        let hits = 0;
        for (const query of queryBoxes) {
          queryTree.intersectsBox(query, markObject);
          hits += verifyMarks('intersectsBox', (box) => boxScore(query, box));
        }
        assert(hits > 0, 'intersectsBox: no hits');
      }
    });
  }

  if (selected.includes('sphere')) {
    result.push({
      name: `intersectsSphere (${queries} spheres, ${count} boxes)`,
      run() {
        for (let q = 0; q < queries; q++) queryTree.intersectsSphere(sphereCenters[q], sphereRadius, countObject);
      },
      reset: noReset,
      verify() {
        let hits = 0;
        for (const center of sphereCenters) {
          queryTree.intersectsSphere(center, sphereRadius, markObject);
          hits += verifyMarks('intersectsSphere', (box) => sphereRadius - pointBoxDistance(center, box));
        }
        assert(hits > 0, 'intersectsSphere: no hits');
      }
    });
  }

  if (selected.includes('closest')) {
    result.push({
      name: `closestPointToPoint (${queries} points, ${count} boxes)`,
      run() {
        for (let q = 0; q < queries; q++) sink += queryTree.closestPointToPoint(closestPoints[q]);
      },
      reset: noReset,
      verify() {
        for (let q = 0; q < queries; q++) {
          const actual = queryTree.closestPointToPoint(closestPoints[q]);
          assert(Math.abs(actual - closestExpected[q]) <= epsilon, `closestPointToPoint: ${actual} instead of ${closestExpected[q]}`);
        }
      }
    });
  }

  return result;
}

function sample(suite: Suite): number {
  suite.reset();
  const start = performance.now();
  suite.run();
  return performance.now() - start;
}

if (validateOnly) {
  for (const suite of createSuites(await load(sourceRoot))) {
    for (let i = 0; i < 2; i++) {
      suite.reset();
      suite.run();
      suite.verify();
    }
    console.info(JSON.stringify({ name: suite.name, highPrecision, state: 'validated', timing: 'not measured' }));
  }
} else if (compareRoot !== undefined) {
  const warmup = parameter('BENCH_COMPARE_WARMUP', 16, 0);
  const samples = parameter('BENCH_COMPARE_SAMPLES', 32, 2);
  const rounds = 3;
  const befores = createSuites(await load(compareRoot));
  const afters = createSuites(await load(sourceRoot));
  console.info(JSON.stringify({ ...context, beforeRoot: resolve(compareRoot), afterRoot: resolve(sourceRoot), warmup, samples, rounds,
    timing: 'one process; inputs reset outside timing; samples alternate before/after' }));
  for (let i = 0; i < befores.length; i++) {
    const before = befores[i];
    const after = afters[i];
    sample(before);
    sample(after);
    before.verify();
    after.verify();
    for (let w = 0; w < warmup; w++) {
      sample(before);
      sample(after);
    }
    for (let round = 0; round < rounds; round++) {
      let beforeMs = 0;
      let afterMs = 0;
      for (let s = 0; s < samples; s++) {
        if ((s + round) % 2 === 0) {
          beforeMs += sample(before);
          afterMs += sample(after);
        } else {
          afterMs += sample(after);
          beforeMs += sample(before);
        }
      }
      before.verify();
      after.verify();
      console.info(JSON.stringify({ name: before.name, round: round + 1, beforeMs: beforeMs / samples, afterMs: afterMs / samples,
        timeChangePercent: (afterMs / beforeMs - 1) * 100 }));
    }
  }
} else {
  const bench = new Bench({
    time: context.time, iterations: context.iterations,
    warmupTime: context.warmupTime, warmupIterations: context.warmupIterations,
    retainSamples: false
  });
  const measured = createSuites(await load(sourceRoot));
  for (const suite of measured) {
    suite.reset();
    suite.run();
    suite.verify();
  }
  for (const suite of measured) bench.add(suite.name, suite.run, { beforeEach: suite.reset });
  await bench.run();
  for (const suite of measured) suite.verify();
  assert(Number.isFinite(sink));
  const measurements = bench.tasks.map((task) => {
    const result = task.result;
    if (result.state === 'errored') throw result.error;
    assert(result.state === 'completed', `Incomplete benchmark: ${task.name}`);
    return { name: task.name, meanMs: result.latency.mean, rme: result.latency.rme, samples: result.latency.samplesCount };
  });
  const fingerprint = createHash('sha256');
  for (const file of ['benchmarks/index.ts', 'benchmarks/results.ts']) fingerprint.update(readFileSync(file));
  const report = parseReport({ schema: 1, fingerprint: fingerprint.digest('hex'), context, measurements });
  const destination = resolve(process.env['BENCH_OUTPUT'] ?? 'benchmarks/results/current.json');
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`);
  for (const item of report.measurements) console.info(`${item.name}: ${item.meanMs.toFixed(3)} ms/batch, ${(1000 / item.meanMs).toFixed(1)} batches/sec, RME ${item.rme.toFixed(2)}%`);
  console.info(`Source: ${resolve(sourceRoot, 'src')}; results: ${destination}`);
}
