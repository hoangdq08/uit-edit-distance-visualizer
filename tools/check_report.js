#!/usr/bin/env node
// Doi chieu cac con so trong report/report.tex voi du lieu that trong repo. Thoat 1 neu co so lech.
// Dung: node tools/check_report.js
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const tex = fs.readFileSync(path.join(ROOT, 'report', 'report.tex'), 'utf8');
const cases = JSON.parse(fs.readFileSync(path.join(ROOT, 'testcases', 'testcases.json'), 'utf8'));
const bench = JSON.parse(fs.readFileSync(path.join(ROOT, 'testcases', 'benchmark_result.json'), 'utf8')).results;
const ED = require('../src/editdistance.js');
let bad = 0, n = 0;
function check(name, ok, detail) { n++; if (!ok) { bad++; console.log('SAI  ' + name + (detail ? ' :: ' + detail : '')); } else console.log('dung ' + name); }
const has = s => tex.includes(s);
// Moi con so phai xuat hien dung o MOI cho no duoc dung: dem so lan, va cam cac gia tri lech nam canh.
const count = s => tex.split(s).length - 1;
function everyUse(name, good, wrongs) {
  const k = count(good), w = wrongs.filter(x => count(x) > 0);
  check(name + ' (xuat hien ' + k + ' lan, khong con gia tri lech)', k > 0 && w.length === 0, w.length ? 'con gia tri lech: ' + w.join(', ') : 'khong thay ' + good);
}

// 1. testcase: tong va tung nhom
check('31 testcase', cases.length === 31 && has('31 test chia 6 nh'));
const groups = {}; cases.forEach(c => groups[c.group] = (groups[c.group] || 0) + 1);
for (const [g, k] of Object.entries(groups)) {
  const re = new RegExp('(^|\\n)' + g + ' & ' + k + ' &');
  check('nhom ' + g + ' = ' + k, re.test(tex), 'khong thay dong "' + g + ' & ' + k + '" trong bang nhom');
}
// 2. bang benchmark (so nguyen n, cac cot) - doi chieu dinh dang trong report
const fmt = ms => ms >= 1000 ? (ms / 1000).toFixed(2) + ' s' : ms >= 10 ? ms.toFixed(0) + ' ms' : ms >= 0.1 ? ms.toFixed(2) + ' ms' : (ms * 1000).toFixed(1) + ' $\\mu$s';
const texFmt = ms => fmt(ms).replace(' ms', ' ms').replace(' s', ' s');
for (const r of bench.filter(r => [4, 8, 10, 12, 100, 1000, 2000, 5000].includes(r.n))) {
  const cells = [r.naive, r.memo, r.table, r.twoRow, r.c].map(v => v == null ? '--' : texFmt(v));
  const row = r.n + ' & ' + cells.join(' & ');
  check('benchmark n=' + r.n, has(row), 'mong doi dong: ' + row);
}
// 3. ti le va bo nho
const g = n => bench.find(r => r.n === n);
check('24x (table 1000->5000)', Math.round(g(5000).table / g(1000).table) === 24 && has('tức 24 lần'));
check('5.4x memo/table', (g(5000).memo / g(5000).table).toFixed(1) === '5.4' && has('5.4 lần'));
check('2.1x table/2row', (g(5000).table / g(5000).twoRow).toFixed(1) === '2.1' && has('2.1 lần'));
check('95 MiB', Math.round(5001 * 5001 * 4 / 1048576) === 95 && has('95~MiB'));
check('39 KiB', Math.round(2 * 5001 * 4 / 1024) === 39 && has('39~KiB'));
// 4. so lan goi de quy
function T(k) { const t = []; for (let i = 0; i <= k; i++) t.push(new Array(k + 1).fill(1)); for (let i = 1; i <= k; i++) for (let j = 1; j <= k; j++) t[i][j] = 1 + t[i - 1][j - 1] + t[i - 1][j] + t[i][j - 1]; return t; }
const t = T(40);
for (const [k, s] of [[2, '19 lời'], [6, '13\\,483'], [10, '12\\,146\\,179'], [12, '377\\,393\\,953']]) check('so loi goi n=' + k + ' = ' + t[k][k], has(s));
check('ti le n=20 la 32.3', (t[20][20] / t[18][18]).toFixed(1) === '32.2' || (t[20][20] / t[18][18]).toFixed(1) === '32.3', (t[20][20] / t[18][18]).toFixed(3));
check('ti le n=40 la 33.1', (t[40][40] / t[38][38]).toFixed(1) === '33.1');
// 5. bang LOVE->MOVIE trong report
const m = ED.analyze('LOVE', 'MOVIE');
check('d(LOVE,MOVIE)=2 va 5 thao tac', m.distance === 2 && m.ops.length === 5);
const rowsTex = ['0 & 1 & 2 & 3 & 4 & 5', '1 & 1 & 2 & 3 & 4 & 5'];
check('bang dp 4x5 khop mo hinh', m.dp[4][5] === 2 && m.dp[1][4] === 4 && m.dp[2][2] === 1);
check('26 buoc sau buoc 0', m.steps.length - 1 === 26 && has('26 bước sau bước 0'));
// 6. so lieu kiem thu: chay that
const out = execFileSync('node', [path.join(ROOT, 'tools', 'run_tests.js')], { encoding: 'utf8' });
check('run_tests: 31/31', /31\/31 testcase dat/.test(out));
const map = out.match(/(\d+) buoc demo kiem tra anh xa ma gia: khop/);
check('1377 buoc anh xa ma gia', map && +map[1] === 1377 && has('1377'));
everyUse('1377 o moi cho', '1377', ['1337', '1737', '1372', '1387', '1477']);
everyUse('772 buoc DOM o moi cho', '772 b', ['727 b', '722 b', '752 b']);
everyUse('14 cap chuoi DOM', '14 cặp chuỗi', ['41 cặp chuỗi', '12 cặp chuỗi', '16 cặp chuỗi']);
fs.rmSync(path.join(ROOT, 'tools', '.edit_distance_c'), { force: true });
// 7. cac tham chieu nhan va marker
const labels = [...tex.matchAll(/\\label\{([^}]+)\}/g)].map(x => x[1]);
const refs = [...tex.matchAll(/\\ref\{([^}]+)\}/g)].map(x => x[1]);
const missing = refs.filter(r => !labels.includes(r));
check('moi \\ref co \\label', missing.length === 0, missing.join(','));
const cites = [...tex.matchAll(/\\cite\{([^}]+)\}/g)].map(x => x[1]);
const bibs = [...tex.matchAll(/\\bibitem\{([^}]+)\}/g)].map(x => x[1]);
check('moi \\cite co \\bibitem', cites.every(c => bibs.includes(c)));
const figs = [...tex.matchAll(/includegraphics\[[^\]]*\]\{([^}]+)\}/g)].map(x => x[1]);
check('moi anh ton tai (' + figs.length + ')', figs.every(f => fs.existsSync(path.join(ROOT, 'report', f))), figs.filter(f => !fs.existsSync(path.join(ROOT, 'report', f))).join(','));
check('khong con ky tu loi U+FFFD', !tex.includes('\ufffd'));
// 8. so dot bien: report phai khop so phep mutate thuc su co trong tools/mutation_check.sh
const nMut = (fs.readFileSync(path.join(ROOT, 'tools', 'mutation_check.sh'), 'utf8').match(/^mutate /gm) || []).length;
const words = { 4: ['bốn lỗi cố ý', 'cả 4 lỗi', 'Cả bốn'], 5: ['năm lỗi cố ý', 'cả 5 lỗi', 'Cả năm'] };
check('so dot bien trong script = ' + nMut, nMut === 5);
check('report khong con noi sai so dot bien', Object.entries(words).every(([k, ws]) => +k === nMut || ws.every(w => !has(w))), 'con cum tu cua so khac ' + nMut);
check('report neu dung so dot bien (' + nMut + ')', words[nMut] && words[nMut].every(w => has(w)));
// 9. khong con cau khang dinh qua muc ve 'moi testcase' chay du bon cai dat
check('khong con "Bốn cài đặt JavaScript ... đều cho đúng" cho moi testcase', !has('Bốn cài đặt JavaScript (bảng'));
const todo = (tex.match(/\\todo\{/g) || []).length - 1, ver = (tex.match(/\\verify\{/g) || []).length - 1; // tru dong \newcommand
console.log('\nmarker con lai (de sinh vien dien): todo=' + todo + ' verify=' + ver);
console.log('\n' + (n - bad) + '/' + n + ' kiem tra dung');
process.exit(bad ? 1 : 0);
