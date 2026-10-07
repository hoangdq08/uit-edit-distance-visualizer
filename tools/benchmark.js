#!/usr/bin/env node
/*
 * Benchmark 4 cach cai dat edit distance (JS) + ban C da nop Wecode.
 *   naive : de quy thuan, khong nho            ~ O(3^(n+m)) (Delannoy), chi chay duoc chuoi rat ngan
 *   memo  : de quy co nho (top-down)           O(n*m) thoi gian, O(n*m) bo nho, de quy sau n+m
 *   table : DP bang day du (bottom-up)         O(n*m) thoi gian, O(n*m) bo nho
 *   2row  : DP chi giu 2 hang                  O(n*m) thoi gian, O(m) bo nho
 *   C     : ban nop Wecode (2 hang, -O2), do ca thoi gian khoi dong tien trinh
 * Do: trung vi cua nhieu lan chay (sau khi khoi dong lai JIT). Moi o co time-limit rieng de khong treo.
 * Cach dung: node tools/benchmark.js [--quick]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const ED = require('../src/editdistance.js');

const ROOT = path.join(__dirname, '..');
const quick = process.argv.includes('--quick');
const az = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// bo sinh so ngau nhien co hat giong de ket qua lap lai duoc
let seed = 20261007;
function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function rnd(n, alpha) { let s = ''; for (let i = 0; i < n; i++) s += alpha[Math.floor(rand() * alpha.length)]; return s; }

function timeMs(fn) {
  const t = process.hrtime.bigint();
  const v = fn();
  return { ms: Number(process.hrtime.bigint() - t) / 1e6, v };
}
function median(xs) { const s = xs.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; }
function fmt(ms) {
  if (ms == null) return '-';
  if (ms >= 1000) return (ms / 1000).toFixed(2) + ' s';
  if (ms >= 10) return ms.toFixed(0) + ' ms';
  if (ms >= 0.1) return ms.toFixed(2) + ' ms';
  return (ms * 1000).toFixed(1) + ' us';
}

// Chay mot cai dat nhieu lan, bo qua neu mot lan don le da vuot tran thoi gian.
function bench(fn, a, b, expected, reps, capMs, warm) {
  if (warm !== false) fn(a, b); // khoi dong JIT (naive khong khoi dong: moi lan chay da rat lau)
  const first = timeMs(() => fn(a, b));
  if (first.v !== expected) return { err: 'SAI ' + first.v };
  if (first.ms > capMs) return { ms: first.ms, once: true };
  const ts = [first.ms];
  for (let k = 1; k < reps; k++) ts.push(timeMs(() => fn(a, b)).ms);
  return { ms: median(ts) };
}

// ban C
const cSrc = path.join(ROOT, 'src', 'edit_distance.c');
const cBin = path.join(ROOT, 'tools', '.edit_distance_c');
let haveC = false;
try { execFileSync('gcc', ['-O2', '-o', cBin, cSrc], { stdio: 'pipe' }); haveC = true; } catch (e) { /* khong co gcc */ }
function benchC(a, b, expected, reps) {
  if (!haveC) return null;
  const input = a + '\n' + b + '\n';
  const ts = [];
  for (let k = 0; k < reps; k++) {
    const t = process.hrtime.bigint();
    const r = spawnSync(cBin, [], { input, encoding: 'utf8' });
    ts.push(Number(process.hrtime.bigint() - t) / 1e6);
    if (parseInt(r.stdout, 10) !== expected) return { err: 'SAI ' + r.stdout.trim() };
  }
  return { ms: median(ts) };
}

const CAP_NAIVE = 3000; // ms: neu mot lan chay naive > 3s thi khong lap lai
const sizes = quick ? [4, 8, 10, 12, 14, 200, 1000] : [4, 6, 8, 10, 12, 14, 20, 50, 100, 200, 500, 1000, 2000, 5000];
const NAIVE_MAX_LEN = 12; // n=14 da mat ~30 giay, n=16 se ~15 phut: khong thu

console.log('Node ' + process.version + ', ' + process.platform + '/' + process.arch + ', chuoi ngau nhien ' + az.length + ' ky tu, n = m');
console.log('Thoi gian trung vi; "(1 lan)" = chi chay mot lan vi qua cham; "-" = khong chay (qua lon)\n');
const head = ['n=m', 'naive', 'memo', 'table', '2row', 'C (ca process)'];
const rows = [];
const results = [];
for (const n of sizes) {
  const a = rnd(n, az), b = rnd(n, az);
  const expected = ED.distance(a, b);
  const reps = n <= 200 ? 21 : n <= 1000 ? 7 : 3;
  const r = {};
  r.naive = n <= NAIVE_MAX_LEN ? bench(ED.naive, a, b, expected, 3, CAP_NAIVE, false) : null;
  // memo de quy sau n+m: tren ~ 5000 co the tran stack -> bao loi that thay vi gia vo
  try {
    r.memo = bench(ED.memo, a, b, expected, reps, 1e9);
  } catch (e) { r.memo = { err: 'loi: ' + e.constructor.name }; }
  r.table = bench((x, y) => { const d = ED.buildTable(x, y); return d[d.length - 1][d[0].length - 1]; }, a, b, expected, reps, 1e9);
  r.two = bench(ED.distance, a, b, expected, reps, 1e9);
  r.c = benchC(a, b, expected, Math.min(reps, 7));
  const cell = x => !x ? '-' : x.err ? x.err : fmt(x.ms) + (x.once ? ' (1 lan)' : '');
  rows.push([n, cell(r.naive), cell(r.memo), cell(r.table), cell(r.two), cell(r.c)]);
  results.push({ n, naive: r.naive && r.naive.ms, memo: r.memo && r.memo.ms, table: r.table && r.table.ms, twoRow: r.two && r.two.ms, c: r.c && r.c.ms, expected });
}
const w = head.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i]).length)));
const line = r => r.map((x, i) => String(x).padEnd(w[i])).join('  ');
console.log(line(head)); console.log(w.map(x => '-'.repeat(x)).join('  '));
rows.forEach(r => console.log(line(r)));

// Bo nho: do so o cua bang so voi 2 hang
console.log('\nBo nho bang DP (Int32): n=m=5000 -> ' + ((5001 * 5001 * 4) / 1048576).toFixed(0) + ' MiB, 2 hang -> ' + ((2 * 5001 * 4) / 1024).toFixed(0) + ' KiB');

// Do tang cua naive: so lan goi ham
console.log('\nSo lan goi ham cua de quy thuan khi n = m (khong phu thuoc ky tu cu the), moi 2 buoc nhan ~ 5.83^2 ~ 34:');
function countCalls(n) {
  let c = 0;
  const f = (i, j) => { c++; if (i === 0 || j === 0) return; f(i - 1, j - 1); f(i - 1, j); f(i, j - 1); };
  f(n, n); return c;
}
let prev = 0;
for (const n of [2, 4, 6, 8, 10, 12]) {
  const c = countCalls(n);
  console.log('  n=' + String(n).padEnd(3) + ' ' + String(c).padStart(12) + (prev ? '   x' + (c / prev).toFixed(1) + ' so voi 2 buoc truoc' : ''));
  prev = c;
}

const out = path.join(ROOT, 'testcases', 'benchmark_result.json');
fs.writeFileSync(out, JSON.stringify({ node: process.version, platform: process.platform + '/' + process.arch, results }, null, 1));
console.log('\nGhi ' + path.relative(ROOT, out));
