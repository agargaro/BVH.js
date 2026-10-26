import { describe, expect, it } from 'vitest';
import { compareReports, parseReport } from '../../benchmarks/results.js';
import type { Report } from '../../benchmarks/results.js';

function report(meanMs = 1, rme = 1): Report {
  return {
    schema: 1,
    fingerprint: 'same harness',
    context: {
      node: 'v24', platform: 'test', arch: 'test', cpu: 'test', tinybench: 'test', highPrecision: false,
      count: 1, queries: 1, moving: 1, margin: 0, time: 0, iterations: 2, warmupTime: 0, warmupIterations: 1
    },
    measurements: [{ name: 'task', meanMs, rme, samples: 2 }]
  };
}

describe('benchmark comparison gate', () => {
  it('requires at least three pairs to confirm a regression', () => {
    const pair: [Report, Report] = [report(), report(2)];
    expect(compareReports([pair])).toEqual([]);
    expect(compareReports([pair, pair, pair])).toEqual(['task']);
  });

  it('does not fail noisy or inconsistent pairs', () => {
    const noisy: [Report, Report] = [report(1, 50), report(2, 50)];
    expect(compareReports([noisy, noisy, noisy])).toEqual([]);
    const regression: [Report, Report] = [report(), report(2)];
    expect(compareReports([regression, regression, [report(), report()]])).toEqual([]);
  });

  it('rejects malformed reports, duplicates, incompatible workloads and missing tasks', () => {
    expect(() => parseReport(null)).toThrow();
    expect(() => parseReport({ ...report(), schema: 2 })).toThrow();
    expect(() => parseReport({ ...report(), measurements: [] })).toThrow();
    expect(() => parseReport({ ...report(), measurements: [{ name: 'task', meanMs: NaN, rme: 0, samples: 2 }] })).toThrow();
    expect(() => parseReport({ ...report(), measurements: [{ name: 'task', meanMs: 1, rme: 0, samples: 1 }] })).toThrow();
    expect(() => parseReport({ ...report(), measurements: [...report().measurements, ...report().measurements] })).toThrow();
    expect(() => parseReport({ ...report(), context: { ...report().context, highPrecision: 'no' } })).toThrow();
    expect(() => compareReports([[report(), { ...report(), context: { ...report().context, count: 2 } }]])).toThrow();
    expect(() => compareReports([[report(), { ...report(), context: { ...report().context, highPrecision: true } }]])).toThrow();
    expect(() => compareReports([[report(), { ...report(), fingerprint: 'changed' }]])).toThrow();
    expect(() => compareReports([[report(), { ...report(), measurements: [{ name: 'other', meanMs: 1, rme: 1, samples: 2 }] }]])).toThrow();
  });
});
