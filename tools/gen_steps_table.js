#!/usr/bin/env node
// Sinh bang LaTeX liet ke tung buoc cua demo cho mot cap chuoi (mac dinh LOVE, MOVIE), de dua vao report.
// Dung: node tools/gen_steps_table.js [A] [B]
'use strict';
const ED = require('../src/editdistance.js');
const A = process.argv[2] || 'LOVE', B = process.argv[3] || 'MOVIE';
const m = ED.analyze(A, B);
const tex = s => String(s).replace(/([&%$#_{}])/g, '\\$1');
const out = [];
out.push('\\begin{center}\\small');
out.push('\\begin{tabular}{@{}rcclrrrr@{}}');
out.push('\\toprule');
out.push('Bước & Ô & $A[i]$ vs $B[j]$ & Nhánh & $\\nwarrow$ & $\\uparrow$ & $\\leftarrow$ & Giá trị\\\\');
out.push('\\midrule');
m.steps.forEach((s, k) => {
  if (s.type === 'init') out.push(k + ' & \\multicolumn{7}{l}{khởi tạo hàng và cột 0: $dp[i][0]=i$, $dp[0][j]=j$}\\\\');
  if (s.type === 'cell') {
    const cmp = '\\code{' + tex(s.aChar) + '} / \\code{' + tex(s.bChar) + '}';
    out.push([k, '(' + s.i + ',' + s.j + ')', cmp, s.same ? 'trùng' : 'min',
      s.diag, s.same ? '--' : s.up, s.same ? '--' : s.left, '\\textbf{' + s.value + '}'].join(' & ') + '\\\\');
  }
});
out.push('\\bottomrule');
out.push('\\end{tabular}');
out.push('\\end{center}');
out.push('');
out.push('% --- truy vet (di nguoc tu o cuoi ve (0,0)) ---');
out.push('\\begin{center}\\small');
out.push('\\begin{tabular}{@{}rcll@{}}');
out.push('\\toprule');
out.push('Bước & Ô & Thao tác & Giá trị ô\\\\');
out.push('\\midrule');
const kindVi = { keep: 'giữ', replace: 'thay', delete: 'xóa', insert: 'thêm' };
m.steps.forEach((s, k) => {
  if (s.type !== 'trace') return;
  let op = 'xong, về $(0,0)$';
  if (s.move) {
    const mv = s.move;
    op = kindVi[mv.kind] + (mv.kind === 'keep' ? ' \\code{' + tex(mv.aChar) + '}' : mv.kind === 'replace' ? ' \\code{' + tex(mv.aChar) + '} thành \\code{' + tex(mv.bChar) + '}' : mv.kind === 'delete' ? ' \\code{' + tex(mv.aChar) + '}' : ' \\code{' + tex(mv.bChar) + '}');
  }
  out.push([k, '(' + s.i + ',' + s.j + ')', op, m.dp[s.i][s.j]].join(' & ') + '\\\\');
});
out.push('\\bottomrule');
out.push('\\end{tabular}');
out.push('\\end{center}');
console.log(out.join('\n'));
