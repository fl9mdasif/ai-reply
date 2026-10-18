#!/usr/bin/env node
// Generates progress.html at the repo root directly from PROGRESS.md.
// Run after every `node scripts/progress.mjs --write` so the HTML tracker
// can never drift from the source of truth. Pure Node, no dependencies.
//
//   node scripts/generate-progress-html.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const progressPath = path.join(repoRoot, 'PROGRESS.md');
const outPath = path.join(repoRoot, 'progress.html');

const markdown = readFileSync(progressPath, 'utf8');
const lines = markdown.split(/\r?\n/);

const lastUpdatedMatch = markdown.match(/Last updated:\s*(.+)/);
const lastUpdated = lastUpdatedMatch ? lastUpdatedMatch[1].trim() : '';

/** @type {{heading: string, parent: string|null, items: {text: string, done: boolean, checkbox: boolean}[]}[]} */
const sections = [];
let currentH2 = null;
let current = null;
let inSummaryBlock = false;

for (const line of lines) {
  if (line.includes('<!-- progress:start -->')) {
    inSummaryBlock = true;
    continue;
  }
  if (line.includes('<!-- progress:end -->')) {
    inSummaryBlock = false;
    continue;
  }
  if (inSummaryBlock) continue;

  const h2 = line.match(/^##\s+(.+)/);
  if (h2) {
    currentH2 = h2[1].trim();
    current = null;
    continue;
  }

  const h3 = line.match(/^###\s+(.+)/);
  if (h3) {
    current = { heading: h3[1].trim(), parent: currentH2, items: [] };
    sections.push(current);
    continue;
  }

  const checkboxItem = line.match(/^- \[( |x|X)\]\s+(.+)/);
  if (checkboxItem && current) {
    current.items.push({
      text: checkboxItem[2].trim(),
      done: checkboxItem[1].toLowerCase() === 'x',
      checkbox: true,
    });
    continue;
  }

  const plainItem = line.match(/^-\s+(.+)/);
  if (plainItem && current && currentH2 === 'Parking lot (Phase 3+, not in the MVP)') {
    current.items.push({ text: plainItem[1].trim(), done: false, checkbox: false });
  }
}

// If "Parking lot" has no ### heading of its own, collect its plain list
// items directly under the ## heading.
if (!sections.some((s) => s.parent === 'Parking lot (Phase 3+, not in the MVP)')) {
  const parkingItems = [];
  let inParking = false;
  for (const line of lines) {
    if (line.match(/^##\s+Parking lot/)) {
      inParking = true;
      continue;
    }
    if (inParking && line.match(/^##\s+/)) break;
    const plain = line.match(/^-\s+(.+)/);
    if (inParking && plain) parkingItems.push({ text: plain[1].trim(), done: false, checkbox: false });
  }
  if (parkingItems.length > 0) {
    sections.push({ heading: 'Parking lot', parent: 'Parking lot (Phase 3+, not in the MVP)', items: parkingItems });
  }
}

function countsFor(items) {
  const checkboxItems = items.filter((i) => i.checkbox);
  const done = checkboxItems.filter((i) => i.done).length;
  const total = checkboxItems.length;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

// Scoped to Core API only for now (per the user: right now we're in core
// API; when rag-engine work starts, add 'Other apps (tracked here only at
// a high level)' back to this filter so that section appears too).
const coreSections = sections.filter((s) => s.parent === 'Core API (apps/core-api)');
const parkingSection = sections.find((s) => s.parent === 'Parking lot (Phase 3+, not in the MVP)');

let overallDone = 0;
let overallTotal = 0;
for (const s of coreSections) {
  const { done, total } = countsFor(s.items);
  overallDone += done;
  overallTotal += total;
}
const overallPct = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0;

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Render inline markdown code spans (`like this`) and bold (**like this**).
function renderInline(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return html;
}

function statusFor(section) {
  const { done, total } = countsFor(section.items);
  if (total === 0) return 'todo';
  if (done === total) return 'done';
  if (done === 0) return 'todo';
  return 'active';
}

// Short label for the rail's circular node: "M0", "M3", "P" (Prerequisites),
// "RAG" (Integration with the real rag-engine), else first 3 letters.
function nodeLabelFor(heading) {
  const milestone = heading.match(/^(M\d+)\b/);
  if (milestone) return milestone[1];
  if (/^Prerequisites/.test(heading)) return 'PRE';
  if (/rag-engine/i.test(heading)) return 'RAG';
  return heading.slice(0, 3).toUpperCase();
}

const CHEV_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>';

const sectionsHtml = coreSections
  .map((section, idx) => {
    const { done, total, pct } = countsFor(section.items);
    const status = statusFor(section);
    const statusLabel = status === 'done' ? 'Done' : status === 'active' ? 'In progress' : 'Not started';
    const open = status === 'active' ? ' open' : '';

    const itemsHtml = section.items
      .map((item) => {
        const cls = !item.checkbox ? 'plain' : item.done ? 'done' : 'todo';
        const check = item.checkbox ? (item.done ? '✓' : '') : '•';
        return `<li class="${cls}"><span class="check ${item.done ? 'yes' : 'no'}">${check}</span><span>${renderInline(item.text)}</span></li>`;
      })
      .join('\n            ');

    return `
    <div class="milestone ${status}">
      <div class="node">${nodeLabelFor(section.heading)}</div>
      <details class="ms-card ${status}"${open} id="section-${idx}">
        <summary class="ms-head">
          <span class="chev">${CHEV_SVG}</span>
          <span class="ms-name">${escapeHtml(section.heading)}</span>
          <span class="ms-meta"><span class="ms-count">${done}/${total}</span><span class="pill ${status}">${statusLabel}</span></span>
        </summary>
        <div class="ms-track"><span style="width:${pct}%"></span></div>
        <ul class="req-list">
            ${itemsHtml}
        </ul>
      </details>
    </div>`;
  })
  .join('\n');

const parkingHtml = parkingSection
  ? `
    <details class="parking">
      <summary><span class="chev">${CHEV_SVG}</span><span class="parking-title">Parking lot — Phase 3+, not in the MVP</span></summary>
      <ul>
        ${parkingSection.items.map((i) => `<li>${renderInline(i.text)}</li>`).join('\n        ')}
      </ul>
    </details>`
  : '';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>jobabai Core API Build Tracker</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>
:root {
  --bg: #0d1420;
  --panel: #141e2d;
  --panel-raised: #1a2638;
  --border: #253449;
  --fg: #e8edf5;
  --fg-muted: #8fa0b8;
  --fg-faint: #5c6f88;
  --accent: #41c9b4;
  --accent-soft: #1d3a37;
  --ok: #5fd98a;
  --ok-soft: #173024;
  --warn: #eab656;
  --warn-soft: #352611;
  --bad: #e2715f;
  --bad-soft: #351c17;
  --font-display: 'Fraunces', 'Iowan Old Style', Georgia, serif;
  --font-body: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;
  --font-mono: 'IBM Plex Mono', 'SF Mono', Consolas, monospace;
}
@media (prefers-color-scheme: light) {
  :root {
    --bg: #f3f0e8; --panel: #ffffff; --panel-raised: #fbf9f3; --border: #e1dccb;
    --fg: #1b2230; --fg-muted: #5c6577; --fg-faint: #93967f;
    --accent: #0f8f7c; --accent-soft: #e2f3ef;
    --ok: #2f8f4f; --ok-soft: #e4f3e7;
    --warn: #a9690a; --warn-soft: #f7ead2;
    --bad: #b8452f; --bad-soft: #f8e4de;
    color-scheme: light;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.5;
  padding: 0 16px;
}
.wrap { max-width: 760px; margin: 0 auto; padding: 32px 0 64px; }
.eyebrow {
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--accent); display: flex; align-items: center; gap: 8px;
}
.eyebrow::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); display: inline-block; }
h1 {
  font-family: var(--font-display); font-weight: 600; font-size: clamp(28px, 6vw, 38px);
  margin: 10px 0 6px; letter-spacing: -0.01em;
}
.subtitle { color: var(--fg-muted); max-width: 60ch; }
.subtitle code {
  font-family: var(--font-mono); font-size: 0.9em; background: var(--panel-raised);
  border: 1px solid var(--border); padding: 0 4px; border-radius: 4px;
}
.hero {
  margin-top: 28px; background: var(--panel); border: 1px solid var(--border); border-radius: 16px;
  padding: 24px; display: flex; gap: 24px; align-items: center; flex-wrap: wrap;
}
.hero-figure { display: flex; align-items: baseline; gap: 6px; white-space: nowrap; }
.hero-figure .num { font-family: var(--font-display); font-weight: 600; font-size: 52px; font-variant-numeric: tabular-nums; line-height: 1; }
.hero-figure .pct { color: var(--accent); font-family: var(--font-mono); font-size: 17px; }
.hero-detail { flex: 1; min-width: 180px; }
.hero-detail .label { color: var(--fg-muted); font-size: 13px; margin-bottom: 8px; }
.hero-track { height: 8px; border-radius: 99px; background: var(--panel-raised); border: 1px solid var(--border); overflow: hidden; }
.hero-track > span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), #6fe0cf); border-radius: 99px; }
.rail { margin-top: 28px; position: relative; }
.rail::before { content: ""; position: absolute; left: 19px; top: 8px; bottom: 8px; width: 2px; background: var(--border); }
.milestone { position: relative; padding-left: 48px; margin-bottom: 10px; }
.milestone .node {
  position: absolute; left: 0; top: 14px; width: 40px; height: 40px; border-radius: 50%;
  background: var(--panel); border: 2px solid var(--border); display: grid; place-items: center;
  font-family: var(--font-mono); font-weight: 600; font-size: 11px; color: var(--fg-muted); z-index: 1;
}
.milestone.done .node { border-color: var(--ok); color: var(--ok); background: var(--ok-soft); }
.milestone.active .node { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
.ms-card { border: 1px solid var(--border); background: var(--panel); border-radius: 14px; overflow: hidden; }
.ms-head { cursor: pointer; list-style: none; padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
.ms-head::-webkit-details-marker { display: none; }
.chev { color: var(--fg-faint); transition: transform 0.15s ease; flex: none; }
.ms-card[open] .chev { transform: rotate(90deg); }
.ms-name { font-weight: 600; flex: 1; min-width: 0; }
.ms-meta { display: flex; align-items: center; gap: 10px; flex: none; }
.ms-count { font-family: var(--font-mono); font-size: 12.5px; color: var(--fg-muted); white-space: nowrap; }
.pill {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.03em; padding: 3px 9px; border-radius: 99px;
  text-transform: uppercase; white-space: nowrap;
}
.pill.done { background: var(--ok-soft); color: var(--ok); }
.pill.active { background: var(--warn-soft); color: var(--warn); }
.pill.todo { background: var(--panel-raised); color: var(--fg-faint); border: 1px solid var(--border); }
.ms-track { height: 5px; margin: 0 16px 14px; border-radius: 99px; background: var(--panel-raised); overflow: hidden; }
.ms-track > span { display: block; height: 100%; border-radius: 99px; background: var(--accent); }
.ms-card.done .ms-track > span { background: var(--ok); }
.req-list { list-style: none; margin: 0; padding: 0 16px 16px; display: flex; flex-direction: column; gap: 8px; }
.req-list li {
  display: flex; gap: 10px; align-items: flex-start; font-size: 13.5px; padding: 8px 10px; border-radius: 9px;
  background: var(--panel-raised); border: 1px solid var(--border);
}
.req-list li.todo { color: var(--fg-muted); }
.req-list li.plain { color: var(--fg-muted); background: transparent; border: none; padding: 2px 10px; }
.check { flex: none; width: 17px; height: 17px; border-radius: 5px; display: grid; place-items: center; font-size: 11px; margin-top: 1px; }
.check.yes { background: var(--ok-soft); color: var(--ok); }
.check.no { border: 1.5px solid var(--fg-faint); }
.req-list li.plain .check { border: none; }
code { font-family: var(--font-mono); background: var(--panel-raised); border: 1px solid var(--border); padding: 0 4px; border-radius: 4px; font-size: 0.9em; }
.parking { margin-top: 28px; border: 1px solid var(--border); border-radius: 12px; background: var(--panel); padding: 14px 16px; }
.parking summary { cursor: pointer; list-style: none; display: flex; align-items: center; gap: 10px; }
.parking summary::-webkit-details-marker { display: none; }
.parking[open] .chev { transform: rotate(90deg); }
.parking-title { font-weight: 600; color: var(--fg-muted); font-size: 13.5px; }
.parking ul { margin: 12px 0 0; padding-left: 20px; color: var(--fg-muted); font-size: 13px; }
footer {
  margin-top: 28px; padding-top: 16px; border-top: 1px solid var(--border); color: var(--fg-faint);
  font-size: 12px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
}
@media (max-width: 480px) { .ms-meta { flex-wrap: wrap; justify-content: flex-end; } }
</style>
</head>
<body>
<div class="wrap">
  <p class="eyebrow">jobabai · apps/core-api</p>
  <h1>Core API Build Tracker</h1>
  <p class="subtitle">Scoped to <code>apps/core-api</code> only — rag-engine and jobabai-dashboard are added
  here once that work starts. Generated directly from <code>PROGRESS.md</code>, never hand-edited: re-run
  <code>node scripts/generate-progress-html.mjs</code> after updating it.</p>

  <div class="hero">
    <div class="hero-figure"><span class="num">${overallDone}/${overallTotal}</span><span class="pct">${overallPct}%</span></div>
    <div class="hero-detail">
      <div class="label">Requirements verified with a passing, named test</div>
      <div class="hero-track"><span style="width:${overallPct}%"></span></div>
    </div>
  </div>

  <div class="rail">${sectionsHtml}
  </div>

  ${parkingHtml}

  <footer>
    <span>Source: <code>PROGRESS.md</code></span>
    <span>Last synced: ${escapeHtml(lastUpdated)}</span>
  </footer>
</div>
</body>
</html>
`;

writeFileSync(outPath, html, 'utf8');
console.log(`progress.html regenerated (${overallDone}/${overallTotal}, ${overallPct}%).`);
