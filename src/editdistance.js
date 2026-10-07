/*
 * Edit distance (Levenshtein) - loi thuat toan dung chung cho demo, test va benchmark.
 * Chay duoc ca trong trinh duyet (window.EditDistance) lan Node (require).
 *
 * Quy uoc: bien doi chuoi A (n ky tu, hang i) thanh chuoi B (m ky tu, cot j).
 *   dp[i][j] = so thao tac it nhat de bien A[1..i] thanh B[1..j]
 *   dp[i][0] = i, dp[0][j] = j
 *   A[i] == B[j]: dp[i][j] = dp[i-1][j-1]
 *   nguoc lai   : dp[i][j] = 1 + min(dp[i-1][j-1] (thay), dp[i-1][j] (xoa), dp[i][j-1] (them))
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EditDistance = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Tach theo code point de ky tu Unicode (vd "Á") la mot ky tu.
  function chars(s) {
    return Array.isArray(s) ? s : Array.from(s);
  }

  // Bang DP day du, (n+1) x (m+1), moi hang la Int32Array.
  function buildTable(aIn, bIn) {
    const a = chars(aIn), b = chars(bIn);
    const n = a.length, m = b.length;
    const dp = new Array(n + 1);
    for (let i = 0; i <= n; i++) {
      dp[i] = new Int32Array(m + 1);
      dp[i][0] = i;
    }
    for (let j = 0; j <= m; j++) dp[0][j] = j;
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          const r = dp[i - 1][j - 1], d = dp[i - 1][j], ins = dp[i][j - 1];
          dp[i][j] = 1 + Math.min(r, d, ins);
        }
      }
    }
    return dp;
  }

  // Chi tinh khoang cach, giu 2 hang: O(n*m) thoi gian, O(m) bo nho.
  function distance(aIn, bIn) {
    const a = chars(aIn), b = chars(bIn);
    const n = a.length, m = b.length;
    let prev = new Int32Array(m + 1), cur = new Int32Array(m + 1);
    for (let j = 0; j <= m; j++) prev[j] = j;
    for (let i = 1; i <= n; i++) {
      cur[0] = i;
      for (let j = 1; j <= m; j++) {
        if (a[i - 1] === b[j - 1]) cur[j] = prev[j - 1];
        else cur[j] = 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
      }
      const t = prev; prev = cur; cur = t;
    }
    return prev[m];
  }

  // De quy thuan, khong nho: cong thuc truy hoi viet thang, doi thua O(3^min) ~ Delannoy.
  function naive(aIn, bIn) {
    const a = chars(aIn), b = chars(bIn);
    function f(i, j) {
      if (i === 0) return j;
      if (j === 0) return i;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      return Math.min(f(i - 1, j - 1) + cost, f(i - 1, j) + 1, f(i, j - 1) + 1);
    }
    return f(a.length, b.length);
  }

  // De quy co nho (top-down). Do sau de quy n+m nen se tran stack voi chuoi rat dai.
  function memo(aIn, bIn) {
    const a = chars(aIn), b = chars(bIn);
    const n = a.length, m = b.length;
    const w = m + 1;
    const cache = new Int32Array((n + 1) * w).fill(-1);
    function f(i, j) {
      if (i === 0) return j;
      if (j === 0) return i;
      const k = i * w + j;
      if (cache[k] !== -1) return cache[k];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(f(i - 1, j - 1) + cost, f(i - 1, j) + 1, f(i, j - 1) + 1);
      cache[k] = v;
      return v;
    }
    return f(n, m);
  }

  // Truy vet tu (n,m) ve (0,0). Thu tu uu tien: giu/thay, xoa, them.
  // Tra ve path (cac o, tu (n,m) den (0,0)) va moves[k] la buoc di tu path[k] sang path[k+1].
  function traceback(aIn, bIn, dp) {
    const a = chars(aIn), b = chars(bIn);
    let i = a.length, j = b.length;
    const path = [[i, j]];
    const moves = [];
    while (i > 0 || j > 0) {
      let kind;
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
        kind = 'keep';
      } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
        kind = 'replace';
      } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
        kind = 'delete';
      } else {
        kind = 'insert';
      }
      const move = { kind, i, j, aChar: null, bChar: null };
      if (kind === 'keep' || kind === 'replace') {
        move.aChar = a[i - 1]; move.bChar = b[j - 1]; i--; j--;
      } else if (kind === 'delete') {
        move.aChar = a[i - 1]; i--;
      } else {
        move.bChar = b[j - 1]; j--;
      }
      moves.push(move);
      path.push([i, j]);
    }
    return { path, moves };
  }

  // Dich cac buoc truy vet (di nguoc) thanh danh sach thao tac theo thu tu tien (tu trai sang phai),
  // kem chuoi sau moi thao tac de nguoi dung kiem chung bang mat.
  function buildOps(aIn, moves) {
    const cur = chars(aIn).slice();
    const forward = moves.slice().reverse();
    const ops = [];
    let pos = 0; // vi tri con tro trong chuoi hien tai
    for (const mv of forward) {
      let text;
      if (mv.kind === 'keep') {
        text = "Giữ '" + mv.aChar + "'";
        pos++;
      } else if (mv.kind === 'replace') {
        text = "Thay '" + mv.aChar + "' thành '" + mv.bChar + "'";
        cur[pos] = mv.bChar;
        pos++;
      } else if (mv.kind === 'delete') {
        text = "Xóa '" + mv.aChar + "'";
        cur.splice(pos, 1);
      } else {
        text = "Thêm '" + mv.bChar + "'";
        cur.splice(pos, 0, mv.bChar);
        pos++;
      }
      ops.push({ kind: mv.kind, text, result: cur.join(''), position: pos });
    }
    return ops;
  }

  // Tao toan bo mo hinh cho demo: bang DP, danh sach buoc (init, tung o, truy vet), duong di, thao tac.
  // steps[0] = khoi tao hang/cot 0; steps[1..n*m] = tung o theo thu tu hang; sau do moi o tren duong truy vet.
  function analyze(aIn, bIn) {
    const a = chars(aIn), b = chars(bIn);
    const n = a.length, m = b.length;
    const dp = buildTable(a, b);
    const steps = [{ type: 'init' }];
    const cellStep = [];
    for (let i = 0; i <= n; i++) cellStep.push(new Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const same = a[i - 1] === b[j - 1];
        cellStep[i][j] = steps.length;
        steps.push({
          type: 'cell', i, j, same, value: dp[i][j],
          diag: dp[i - 1][j - 1], up: dp[i - 1][j], left: dp[i][j - 1],
          aChar: a[i - 1], bChar: b[j - 1],
        });
      }
    }
    const { path, moves } = traceback(a, b, dp);
    const traceStart = steps.length;
    for (let k = 0; k < path.length; k++) {
      steps.push({ type: 'trace', k, i: path[k][0], j: path[k][1], move: moves[k] || null });
    }
    return {
      a, b, n, m, dp, steps, cellStep, path, moves,
      ops: buildOps(a, moves),
      distance: dp[n][m],
      lastCellStep: n * m, // chi so buoc cua o cuoi cung (0 neu khong co o nao)
      traceStart,
    };
  }

  return { chars, buildTable, distance, naive, memo, traceback, buildOps, analyze };
});
