import assert from 'node:assert/strict';

export interface Measurement {
  name: string;
  meanMs: number;
  rme: number;
  samples: number;
}

export interface Report {
  schema: 1;
  fingerprint: string;
  context: {
    node: string;
    platform: string;
    arch: string;
    cpu: string;
    tinybench: string;
    highPrecision: boolean;
    count: number;
    queries: number;
    moving: number;
    margin: number;
    time: number;
    iterations: number;
    warmupTime: number;
    warmupIterations: number;
  };
  measurements: Measurement[];
}

function record(value: unknown): Record<string, unknown> {
  assert(typeof value === 'object' && value !== null && !Array.isArray(value), 'Expected an object');
  return value as Record<string, unknown>;
}

function positive(value: unknown, integer = false): number {
  assert(typeof value === 'number' && Number.isFinite(value) && value > 0, 'Expected a finite positive number');
  if (integer) assert(Number.isInteger(value), 'Expected an integer');
  return value;
}

function nonnegative(value: unknown): number {
  assert(typeof value === 'number' && Number.isFinite(value) && value >= 0, 'Expected a finite nonnegative number');
  return value;
}

function text(value: unknown): string {
  assert(typeof value === 'string' && value.length > 0, 'Expected a nonempty string');
  return value;
}

function flag(value: unknown): boolean {
  assert(typeof value === 'boolean', 'Expected a boolean');
  return value;
}

export function parseReport(value: unknown): Report {
  const input = record(value);
  assert(input['schema'] === 1, 'Unsupported benchmark schema');
  const context = record(input['context']);
  assert(Array.isArray(input['measurements']) && input['measurements'].length > 0, 'No benchmark measurements');
  const names = new Set<string>();
  const measurements = input['measurements'].map((item: unknown): Measurement => {
    const measurement = record(item);
    const name = text(measurement['name']);
    assert(!names.has(name), 'Duplicate benchmark task');
    names.add(name);
    const samples = positive(measurement['samples'], true);
    assert(samples >= 2, 'At least two samples are required');
    return { name, meanMs: positive(measurement['meanMs']), rme: nonnegative(measurement['rme']), samples };
  });
  const iterations = positive(context['iterations'], true);
  assert(iterations >= 2);
  for (const item of measurements) assert(item.samples >= iterations, 'Insufficient samples');
  return {
    schema: 1,
    fingerprint: text(input['fingerprint']),
    context: {
      node: text(context['node']), platform: text(context['platform']), arch: text(context['arch']),
      cpu: text(context['cpu']), tinybench: text(context['tinybench']), highPrecision: flag(context['highPrecision']),
      count: positive(context['count'], true), queries: positive(context['queries'], true),
      moving: positive(context['moving'], true), margin: nonnegative(context['margin']),
      time: nonnegative(context['time']), iterations,
      warmupTime: nonnegative(context['warmupTime']), warmupIterations: positive(context['warmupIterations'], true)
    },
    measurements
  };
}

export function compareReports(pairs: readonly (readonly [Report, Report])[], threshold = 1.1): string[] {
  assert(pairs.length > 0, 'No benchmark pairs');
  positive(threshold);
  assert(threshold > 1, 'Regression threshold must exceed 1');
  const confirmed = new Map<string, number>();
  let reference: Report | undefined;
  for (const [baseInput, candidateInput] of pairs) {
    const base = parseReport(baseInput);
    const candidate = parseReport(candidateInput);
    reference ??= base;
    assert.equal(base.fingerprint, candidate.fingerprint, 'Benchmark harness differs');
    assert.equal(base.fingerprint, reference.fingerprint, 'Benchmark rounds differ');
    assert.deepEqual(base.context, candidate.context, 'Benchmark contexts differ');
    assert.deepEqual(base.context, reference.context, 'Round contexts differ');
    assert.deepEqual(base.measurements.map((item) => item.name).sort(), candidate.measurements.map((item) => item.name).sort(), 'Task sets differ');
    assert.deepEqual(base.measurements.map((item) => item.name).sort(), reference.measurements.map((item) => item.name).sort(), 'Round task sets differ');
    for (const before of base.measurements) {
      const after = candidate.measurements.find((item) => item.name === before.name);
      assert(after !== undefined);
      const lower = after.meanMs * Math.max(0, 1 - after.rme / 100);
      const upper = before.meanMs * (1 + before.rme / 100);
      if (lower / upper > threshold) confirmed.set(before.name, (confirmed.get(before.name) ?? 0) + 1);
      console.info(`${before.name}: ${(after.meanMs / before.meanMs).toFixed(3)}x latency`);
    }
  }
  if (pairs.length < 3) {
    console.warn('Fewer than three pairs: diagnostic only, no regression certification');
    return [];
  }
  return [...confirmed].filter(([, rounds]) => rounds === pairs.length).map(([name]) => name);
}
