/*
 * Ma gia cua thuat toan va anh xa tu buoc cua demo sang dong ma gia can to sang.
 * Dung chung cho demo (window.Pseudocode) va test (require).
 *
 * forStep(step) tra ve { act: [...], ctx: [...] }:
 *   act = dong dang thuc thi (to dam), ctx = dong bao quanh/vong lap (to nhat). So dong tinh tu 1.
 * Buoc la phan tu cua analyze(...).steps trong editdistance.js.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Pseudocode = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Moi dong: [muc thut le, noi dung]
  var LINES = [
    [0, 'for i ← 0 to n: dp[i][0] ← i                      // khởi tạo cột 0'],
    [0, 'for j ← 0 to m: dp[0][j] ← j                      // khởi tạo hàng 0'],
    [0, 'for i ← 1 to n:'],
    [1, 'for j ← 1 to m:'],
    [2, 'if A[i] = B[j]:'],
    [3, 'dp[i][j] ← dp[i-1][j-1]                      // trùng: không tốn thao tác'],
    [2, 'else:'],
    [3, 'dp[i][j] ← 1 + min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1])'],
    [0, 'i ← n;  j ← m                                      // truy vết'],
    [0, 'while i > 0 or j > 0:'],
    [1, 'if i>0 and j>0 and A[i] = B[j] and dp[i][j] = dp[i-1][j-1]:'],
    [2, 'giữ A[i];  i ← i-1;  j ← j-1'],
    [1, 'else if i>0 and j>0 and dp[i][j] = dp[i-1][j-1] + 1:'],
    [2, 'thay A[i] bằng B[j];  i ← i-1;  j ← j-1'],
    [1, 'else if i>0 and dp[i][j] = dp[i-1][j] + 1:'],
    [2, 'xóa A[i];  i ← i-1'],
    [1, 'else:'],
    [2, 'thêm B[j];  j ← j-1'],
    [0, 'return dp[n][m]'],
  ];

  var MOVE_LINES = { keep: [11, 12], replace: [13, 14], delete: [15, 16], insert: [17, 18] };

  function forStep(st) {
    if (st.type === 'init') return { act: [1, 2], ctx: [] };
    if (st.type === 'cell') {
      return st.same
        ? { act: [5, 6], ctx: [3, 4] }
        : { act: [5, 7, 8], ctx: [3, 4] };
    }
    // trace
    if (!st.move) return { act: [19], ctx: [10] };
    var act = MOVE_LINES[st.move.kind].slice();
    if (st.k === 0) act.unshift(9);
    return { act: act, ctx: [10] };
  }

  return { LINES: LINES, forStep: forStep };
});
