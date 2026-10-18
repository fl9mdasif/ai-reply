#!/usr/bin/env node
// Reads PROGRESS.md, counts checkboxes per "###" group, prints a summary.
// Usage:
//   node scripts/progress.mjs            print summary to the terminal
//   node scripts/progress.mjs --write    also rewrite the summary block in PROGRESS.md

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'PROGRESS.md');
const text = readFileSync(file, 'utf8');

const START = '<!-- progress:start -->';
const END = '<!-- progress:end -->';

const groups = [];
let current = null;
let inSummary = false;

for (const line of text.split('\n')) {
  if (line.startsWith(START)) inSummary = true;
  if (line.startsWith(END)) inSummary = false;
  if (inSummary) continue;

  const heading = line.match(/^###\s+(.+)/);
  if (heading) {
    current = { name: heading[1].trim(), done: 0, total: 0 };
    groups.push(current);
    continue;
  }
  if (/^##\s+/.test(line)) current = null;

  const box = line.match(/^- \[( |x)\]/i);
  if (box && current) {
    current.total += 1;
    if (box[1].toLowerCase() === 'x') current.done += 1;
  }
}

const counted = groups.filter((g) => g.total > 0);
const done = counted.reduce((n, g) => n + g.done, 0);
const total = counted.reduce((n, g) => n + g.total, 0);
const pct = (d, t) => (t === 0 ? 0 : Math.round((d / t) * 100));
const bar = (d, t, width = 20) => {
  const filled = Math.round((pct(d, t) / 100) * width);
  return '#'.repeat(filled) + '-'.repeat(width - filled);
};
const status = (g) =>
  g.done === g.total ? 'Done' : g.done === 0 ? 'Not started' : 'In progress';

const rows = counted.map(
  (g) => `| ${g.name} | ${g.done}/${g.total} | ${pct(g.done, g.total)}% | ${status(g)} |`,
);

const block = [
  START,
  `Overall: **${done}/${total}** items done (${pct(done, total)}%)`,
  '',
  '```',
  `[${bar(done, total)}] ${pct(done, total)}%`,
  '```',
  '',
  '| Group | Done | Percent | Status |',
  '|---|---|---|---|',
  ...rows,
  END,
].join('\n');

if (process.argv.includes('--write')) {
  const re = new RegExp(`${START}[\\s\\S]*?${END}`);
  writeFileSync(file, text.replace(re, block));
  console.log('PROGRESS.md summary updated.');
}

console.log(`Overall: ${done}/${total} (${pct(done, total)}%)`);
for (const g of counted) {
  console.log(`${g.name.padEnd(46)} ${String(g.done).padStart(3)}/${String(g.total).padEnd(3)} ${bar(g.done, g.total, 12)} ${status(g)}`);
}
