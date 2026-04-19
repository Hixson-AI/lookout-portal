/**
 * Rubric Trend Reporter
 * Reads rubric-history.json and prints a sparkline table of scores over rounds.
 * Run with: npx ts-node e2e/rubric-trend.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const histPath = path.join(__dirname, 'rubric-history.json');
const history = JSON.parse(fs.readFileSync(histPath, 'utf8'));
const runs = history.runs;

const dims = ['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10'] as const;
const BARS = ' ▁▂▃▄▅▆▇█';

function sparkline(scores: (number | null)[]): string {
  return scores.map(s => s == null ? '·' : BARS[Math.min(8, Math.round(s * 8 / 10))]).join('');
}

function delta(a: number | null, b: number | null): string {
  if (a == null || b == null) return '  ·';
  const d = b - a;
  return (d > 0 ? '+' : '') + d.toFixed(0).padStart(2);
}

console.log('\n📈 RUBRIC SCORE TRENDS\n');
console.log('Dim  ' + runs.map((r: any) => `R${r.round}`.padStart(4)).join('') + '  Trend  Δ');
console.log('─'.repeat(20 + runs.length * 4));

for (const dim of dims) {
  const scores = runs.map((r: any) => r.scores[dim]);
  const latest = scores[scores.length - 1];
  const prev = scores[scores.length - 2];
  const spark = sparkline(scores);
  const d = delta(prev, latest);
  const latestStr = latest == null ? ' ·' : String(latest).padStart(2);
  console.log(`${dim.padEnd(5)}${scores.map((s: number | null) => (s == null ? '   ·' : String(s).padStart(4))).join('')}  ${spark}  ${d}`);
}

const avgs = runs.map((r: any) => {
  const vals = dims.map(d => r.scores[d]).filter((v: any): v is number => typeof v === 'number');
  return vals.length ? +(vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1) : null;
});

console.log('─'.repeat(20 + runs.length * 4));
console.log(`AVG  ${avgs.map((s: number | null) => (s == null ? '   ·' : String(s).padStart(4))).join('')}  ${sparkline(avgs)}  ${delta(avgs[avgs.length-2], avgs[avgs.length-1])}`);
console.log();
