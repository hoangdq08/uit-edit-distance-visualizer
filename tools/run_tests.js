#!/usr/bin/env node
/*
 * Chay toan bo testcase va in bang ket qua.
 * Kiem tra:
 *   1. Moi cai dat JS (DP bang, 2 hang, memo, de quy thuan khi du nho) == expected (tinh doc lap bang Python).
 *   2. Ban C da nop len Wecode (src/edit_distance.c) cho cung ket qua tren file .in.
 *   3. Tinh chat cua truy vet: so thao tac khong-giu == khoang cach; ap dung thao tac len A
 *      thi ra dung B (kiem chung duong di, khong chi con so).
 *   4. Doi xung: d(A,B) == d(B,A).
 * Thoat voi ma 1 neu co testcase sai.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const ED = require('../src/editdistance.js');

const ROOT = path.join(__dirname, '..');
const cases = JSON.parse(fs.readFileSync(path.join(ROOT, 'testcases', 'testcases.json'), 'utf8'));

// Bien dich ban C (neu co gcc)
let cBin = null;
const cSrc = path.join(ROOT, 'src', 'edit_distance.c');
const cOut = path.join(ROOT, 'tools', '.edit_distance_c');
try {
  execFileSync('gcc', ['-O2', '-o', cOut, cSrc], { stdio: 'pipe' });
  cBin = cOut;
} catch (e) {
  console.log('! Khong bien dich duoc ban C, bo qua kiem tra C');
}

function applyOps(a, ops) {
  // ops la danh sach tien, ket qua cuoi cung phai la chuoi dich
  return ops.length ? ops[ops.length - 1].result : a;
}

let fail = 0;
const rows = [];
for (const c of cases) {
  const errs = [];
  const exp = c.expected;
  const nm = ED.chars(c.a).length * ED.chars(c.b).length;

  const dTable = ED.buildTable(c.a, c.b);
  const vTable = dTable[ED.chars(c.a).length][ED.chars(c.b).length];
  const vTwo = ED.distance(c.a, c.b);
  if (vTable !== exp) errs.push('DP bang=' + vTable);
  if (vTwo !== exp) errs.push('2 hang=' + vTwo);

  // memo: de quy sau n+m, chi chay khi du nho de khong tran stack
  if (nm <= 4000000) {
    let vMemo;
    try { vMemo = ED.memo(c.a, c.b); } catch (e) { vMemo = 'loi:' + e.message; }
    if (vMemo !== exp) errs.push('memo=' + vMemo);
  }
  // de quy thuan: chi khi cuc nho (O(3^n))
  if (ED.chars(c.a).length + ED.chars(c.b).length <= 14) {
    const v = ED.naive(c.a, c.b);
    if (v !== exp) errs.push('naive=' + v);
  }
  // doi xung
  if (ED.distance(c.b, c.a) !== exp) errs.push('khong doi xung');

  // truy vet
  // Khong goi analyze(): no tao 1 object buoc cho moi o (25 trieu o voi 5000x5000 -> het heap).
  // analyze chi danh cho demo, co gioi han kich thuoc; o day dung thang traceback + buildOps.
  const { moves } = ED.traceback(c.a, c.b, dTable);
  const ops = ED.buildOps(c.a, moves);
  const nonKeep = moves.filter(m => m.kind !== 'keep').length;
  if (nonKeep !== exp) errs.push('truy vet: ' + nonKeep + ' thao tac != ' + exp);
  const finalStr = applyOps(c.a, ops);
  if (finalStr !== c.b) errs.push('ap dung thao tac ra khac chuoi dich');

  // ban C
  let cRes = '-';
  if (cBin) {
    const r = spawnSync(cBin, [], { input: fs.readFileSync(path.join(ROOT, 'testcases', 'cases', c.file)), encoding: 'utf8' });
    cRes = String(parseInt(r.stdout, 10));
    if (parseInt(r.stdout, 10) !== exp) errs.push('C=' + r.stdout.trim());
  }

  const ok = errs.length === 0;
  if (!ok) fail++;
  rows.push([c.id, c.group, c.name.slice(0, 26), ED.chars(c.a).length + 'x' + ED.chars(c.b).length, exp, cRes, ok ? 'OK' : 'FAIL ' + errs.join('; ')]);
}

const w = [3, 9, 26, 9, 5, 5, 4];
const head = ['#', 'nhom', 'ten', 'n x m', 'dap an', 'C', 'kq'];
const line = r => r.map((x, i) => String(x).padEnd(w[i] || 4)).join(' ');
console.log(line(head));
console.log('-'.repeat(70));
for (const r of rows) console.log(line(r));
console.log('-'.repeat(70));
console.log(cases.length - fail + '/' + cases.length + ' testcase dat' + (cBin ? ' (da kiem tra ca ban C)' : ''));

// --- Anh xa buoc -> dong ma gia (cho demo): kiem tra tren cac test nho, moi buoc cua analyze() ---
const PC = require('../src/pseudocode.js');
let pcFail = 0, pcSteps = 0;
function pcCheck(cond, msg) { if (!cond) { pcFail++; if (pcFail <= 5) console.log('  ma gia SAI: ' + msg); } }
for (const c of cases) {
  if (ED.chars(c.a).length > 20 || ED.chars(c.b).length > 20) continue; // demo chi nhan <= 20
  const model = ED.analyze(c.a, c.b);
  for (const st of model.steps) {
    pcSteps++;
    const m = PC.forStep(st);
    const all = m.act.concat(m.ctx);
    pcCheck(all.every(n => Number.isInteger(n) && n >= 1 && n <= PC.LINES.length), 'dong ngoai pham vi o test ' + c.id);
    pcCheck(m.act.length > 0, 'buoc khong co dong nao duoc to (test ' + c.id + ', ' + st.type + ')');
    const txt = n => PC.LINES[n - 1][1];
    if (st.type === 'cell') {
      // dong duoc to phai dung nhanh if/else so voi st.same, va lap dung ve dp[i][j]
      pcCheck(m.act.some(n => txt(n).startsWith('dp[i][j] ← dp[i-1][j-1]')) === st.same, 'nhanh trung/khac sai o test ' + c.id);
      pcCheck(m.act.some(n => txt(n).includes('1 + min(')) === !st.same, 'nhanh min sai o test ' + c.id);
    } else if (st.type === 'trace' && st.move) {
      const want = { keep: 'giữ', replace: 'thay', delete: 'xóa', insert: 'thêm' }[st.move.kind];
      pcCheck(m.act.some(n => txt(n).startsWith(want)), 'thao tac ' + st.move.kind + ' khong khop dong ma gia o test ' + c.id);
    }
  }
}
console.log(pcSteps + ' buoc demo kiem tra anh xa ma gia: ' + (pcFail ? pcFail + ' loi' : 'khop'));
if (pcFail) fail++;
process.exit(fail ? 1 : 0);
