import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareReports, parseReport } from './results.js';
import type { Report } from './results.js';

const files = process.argv.slice(2);
assert(files.length >= 2 && files.length % 2 === 0, 'Usage: npm run bench:compare -- base.json candidate.json [base-1.json candidate-1.json ...]');
const pairs: [Report, Report][] = [];
for (let i = 0; i < files.length; i += 2) {
  const base = files[i];
  const candidate = files[i + 1];
  pairs.push([parseReport(JSON.parse(readFileSync(base, 'utf8'))), parseReport(JSON.parse(readFileSync(candidate, 'utf8')))]);
}
const regressions = compareReports(pairs);
assert.equal(regressions.length, 0, `Confirmed regressions: ${regressions.join(', ')}`);
