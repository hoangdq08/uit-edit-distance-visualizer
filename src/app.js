/* Giao dien minh hoa edit distance. Trang thai chi gom (model, step); moi lan doi buoc ve lai tu step. */
(function () {
  'use strict';
  var ED = window.EditDistance;
  var PC = window.Pseudocode;
  var MAXLEN = 20; // gioi han demo, khop voi maxlength cua input

  var PRESETS = [
    ['LOVE', 'MOVIE', 'LOVE → MOVIE (ví dụ đề bài)'],
    ['KITTEN', 'SITTING', 'KITTEN → SITTING (kinh điển, = 3)'],
    ['SUNDAY', 'SATURDAY', 'SUNDAY → SATURDAY (= 3)'],
    ['INTENTION', 'EXECUTION', 'INTENTION → EXECUTION (= 5)'],
    ['TAT', 'TBT', 'TAT → TBT (thay 1 ký tự)'],
    ['ABCDEF', 'ABCDE', 'ABCDEF → ABCDE (xóa 1)'],
    ['ABCDEFG', 'GFEDCBA', 'ABCDEFG → GFEDCBA (đảo ngược)'],
    ['AAAAAA', 'AAA', 'AAAAAA → AAA (lặp ký tự)'],
    ['', 'ABC', 'rỗng → ABC (biên: chỉ thêm)'],
    ['ABC', '', 'ABC → rỗng (biên: chỉ xóa)'],
    ['ABC', 'ABC', 'ABC → ABC (giống hệt = 0)'],
  ];

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    a: $('inA'), b: $('inB'), preset: $('preset'), load: $('btnLoad'), msg: $('inputMsg'),
    reset: $('btnReset'), back: $('btnBack'), play: $('btnPlay'), next: $('btnNext'), end: $('btnEnd'),
    speed: $('speed'), phases: $('phases'), stepInfo: $('stepInfo'),
    dp: $('dp'), explain: $('explain'), result: $('result'), ops: $('ops'), pseudo: $('pseudo'),
  };

  // Ma gia: dung mot lan, moi buoc chi doi class act/ctx.
  var pseudoLis = PC.LINES.map(function (ln, idx) {
    var li = document.createElement('li');
    var text = ln[1], cm = '', k = text.indexOf('//');
    if (k >= 0) { cm = text.slice(k); text = text.slice(0, k).replace(/\s+$/, ''); }
    li.innerHTML = '<span class="no">' + (idx + 1) + '</span><span>' + new Array(ln[0] * 4 + 1).join(' ') + esc(text) +
      (cm ? '  <span class="cm">' + esc(cm) + '</span>' : '') + '</span>';
    el.pseudo.appendChild(li);
    return li;
  });
  function renderPseudo(st) {
    var m = PC.forStep(st);
    pseudoLis.forEach(function (li, idx) {
      var n = idx + 1;
      li.className = m.act.indexOf(n) >= 0 ? 'act' : m.ctx.indexOf(n) >= 0 ? 'ctx' : '';
    });
  }

  var model = null, step = 0, timer = null;
  var cells = []; // cells[i][j] = <td>
  var colHead = [], rowHead = [];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function q(ch) { return '<b>\'' + esc(ch) + '\'</b>'; }
  function showMsg(t, info) { el.msg.textContent = t || ''; el.msg.className = 'msg' + (info ? ' info' : ''); }

  function load(a, b) {
    stop();
    var A = ED.chars(a), B = ED.chars(b);
    if (A.length > MAXLEN || B.length > MAXLEN) {
      showMsg('Demo chỉ nhận tối đa ' + MAXLEN + ' ký tự mỗi chuỗi (hiện A=' + A.length + ', B=' + B.length + ').');
      return;
    }
    showMsg(A.length === 0 || B.length === 0 ? 'Một chuỗi rỗng: bảng chỉ có hàng/cột khởi tạo, kết quả bằng độ dài chuỗi còn lại.' : '', true);
    model = ED.analyze(A, B);
    step = 0;
    buildTable();
    render();
  }

  function buildTable() {
    var n = model.n, m = model.m;
    var html = '<tr><th class="corner">A \\ B</th><th class="corner">ε</th>';
    for (var j = 1; j <= m; j++) html += '<th data-c="' + j + '">' + esc(model.b[j - 1]) + '</th>';
    html += '</tr>';
    for (var i = 0; i <= n; i++) {
      html += '<tr><th ' + (i ? 'data-r="' + i + '"' : 'class="corner"') + '>' + (i ? esc(model.a[i - 1]) : 'ε') + '</th>';
      for (var j2 = 0; j2 <= m; j2++) html += '<td data-i="' + i + '" data-j="' + j2 + '">' + model.dp[i][j2] + '</td>';
      html += '</tr>';
    }
    el.dp.innerHTML = html;
    cells = []; colHead = []; rowHead = [];
    for (var r = 0; r <= n; r++) cells.push(new Array(m + 1));
    Array.prototype.forEach.call(el.dp.querySelectorAll('td'), function (td) {
      cells[+td.dataset.i][+td.dataset.j] = td;
    });
    Array.prototype.forEach.call(el.dp.querySelectorAll('th[data-c]'), function (th) { colHead[+th.dataset.c] = th; });
    Array.prototype.forEach.call(el.dp.querySelectorAll('th[data-r]'), function (th) { rowHead[+th.dataset.r] = th; });
  }

  function phaseOf(s) {
    var t = model.steps[s].type;
    return t === 'init' ? 0 : t === 'cell' ? 1 : 2;
  }

  function render() {
    var n = model.n, m = model.m, st = model.steps[step];
    var inTrace = st.type === 'trace';
    var i, j;

    // reset class
    for (i = 0; i <= n; i++) for (j = 0; j <= m; j++) {
      var td = cells[i][j];
      td.className = (i === 0 || j === 0) ? 'vis base' : (step >= model.cellStep[i][j] ? 'vis' : '');
      td.removeAttribute('data-tag');
    }
    for (i = 1; i <= n; i++) rowHead[i].className = '';
    for (j = 1; j <= m; j++) colHead[j].className = '';

    if (st.type === 'cell') {
      cells[st.i][st.j].classList.add('cur');
      rowHead[st.i].className = 'hl';
      colHead[st.j].className = 'hl';
      var min = st.same ? st.diag : Math.min(st.diag, st.up, st.left);
      var src = [
        [st.i - 1, st.j - 1, 'dg', '↖', st.diag],
        [st.i - 1, st.j, 'up', '↑', st.up],
        [st.i, st.j - 1, 'lf', '←', st.left],
      ];
      src.forEach(function (s) {
        var c = cells[s[0]][s[1]];
        if (st.same && s[2] !== 'dg') return; // trung ky tu: chi nguon cheo duoc dung
        c.classList.add(s[2]);
        c.setAttribute('data-tag', s[3]);
        if (s[4] === min) c.classList.add('ch');
      });
    }

    var revealed = 0;
    if (inTrace) {
      for (var k = 0; k <= st.k; k++) cells[model.path[k][0]][model.path[k][1]].classList.add('pa');
      cells[st.i][st.j].classList.add('cur');
      revealed = Math.min(st.k + 1, model.moves.length);
      if (st.move) {
        if (st.move.i > 0 && st.move.kind !== 'insert') rowHead[st.move.i].className = 'hl';
        if (st.move.j > 0 && st.move.kind !== 'delete') colHead[st.move.j].className = 'hl';
      }
    }

    // phases + counters
    var ph = phaseOf(step);
    Array.prototype.forEach.call(el.phases.children, function (sp) { sp.classList.toggle('on', +sp.dataset.ph === ph); });
    el.stepInfo.textContent = 'Bước ' + step + ' / ' + (model.steps.length - 1);
    el.back.disabled = step === 0;
    el.reset.disabled = step === 0;
    var atEnd = step === model.steps.length - 1;
    el.next.disabled = atEnd;
    el.end.disabled = atEnd;
    if (atEnd) stop();

    el.explain.innerHTML = explain(st);
    renderPseudo(st);
    renderResult(inTrace, revealed, atEnd);
  }

  function explain(st) {
    var a = model.a, b = model.b;
    if (st.type === 'init') {
      var s = '<p><b>Khởi tạo.</b> Biến <code>A[1..i]</code> thành chuỗi rỗng cần <b>i</b> lần xóa, nên <code>dp[i][0] = i</code>. ' +
        'Biến chuỗi rỗng thành <code>B[1..j]</code> cần <b>j</b> lần thêm, nên <code>dp[0][j] = j</code>.</p>';
      if (model.n * model.m > 0) s += '<p>Bấm <b>Tiến</b> để điền từng ô, theo thứ tự từng hàng từ trái sang phải.</p>';
      else s += '<p>Một chuỗi rỗng nên không còn ô nào để điền. Bấm <b>Tiến</b> để xem truy vết.</p>';
      return s;
    }
    if (st.type === 'cell') {
      var h = '<p>Ô <code>dp[' + st.i + '][' + st.j + ']</code>: so ' + q(st.aChar) + ' (A[' + st.i + ']) với ' + q(st.bChar) + ' (B[' + st.j + ']).</p>';
      if (st.same) {
        h += '<p><span class="tag ok">trùng</span> Hai ký tự giống nhau nên không tốn thao tác, lấy luôn ô chéo.</p>' +
          '<div class="eq">dp[' + st.i + '][' + st.j + '] = dp[' + (st.i - 1) + '][' + (st.j - 1) + '] = ' + st.diag + '</div>';
      } else {
        var min = Math.min(st.diag, st.up, st.left);
        h += '<p><span class="tag up">khác</span> Chọn thao tác rẻ nhất trong ba cách, cộng thêm 1:</p>' +
          '<p><span class="tag dg">↖ thay</span> ' + q(st.aChar) + ' thành ' + q(st.bChar) + ': <code>' + st.diag + '</code><br>' +
          '<span class="tag up">↑ xóa</span> ' + q(st.aChar) + ': <code>' + st.up + '</code><br>' +
          '<span class="tag lf">← thêm</span> ' + q(st.bChar) + ': <code>' + st.left + '</code></p>' +
          '<div class="eq">dp[' + st.i + '][' + st.j + '] = 1 + min(' + st.diag + ', ' + st.up + ', ' + st.left + ') = 1 + ' + min + ' = ' + st.value + '</div>';
      }
      return h + '<p>Gán <b class="big">' + st.value + '</b> vào ô đang tô vàng.</p>';
    }
    // trace
    var distTxt = '<b>' + model.distance + '</b>';
    if (!st.move) {
      return '<p><b>Truy vết xong.</b> Đã về ô <code>(0,0)</code>. Đường tím từ <code>(' + model.n + ',' + model.m + ')</code> về <code>(0,0)</code> cho ' +
        'danh sách thao tác ở khung Kết quả. Số thao tác khác "giữ" đúng bằng ' + distTxt + '.</p>';
    }
    var mv = st.move, desc;
    var from = '<code>dp[' + st.i + '][' + st.j + '] = ' + model.dp[st.i][st.j] + '</code>';
    if (st.k === 0) {
      var intro = '<p>Bắt đầu truy vết từ ô cuối ' + from + '. Từ mỗi ô, đi ngược về ô đã sinh ra giá trị đó.</p>';
    } else intro = '<p>Đang ở ô ' + from + '.</p>';
    if (mv.kind === 'keep') desc = '<span class="tag ok">giữ</span> ' + q(mv.aChar) + ' = ' + q(mv.bChar) + ' và ô chéo bằng nhau: đi chéo ↖, không tốn thao tác.';
    else if (mv.kind === 'replace') desc = '<span class="tag dg">↖ thay</span> ô chéo nhỏ hơn 1: thay ' + q(mv.aChar) + ' thành ' + q(mv.bChar) + '.';
    else if (mv.kind === 'delete') desc = '<span class="tag up">↑ xóa</span> ô phía trên nhỏ hơn 1: xóa ' + q(mv.aChar) + ' khỏi A.';
    else desc = '<span class="tag lf">← thêm</span> ô bên trái nhỏ hơn 1: thêm ' + q(mv.bChar) + ' vào A.';
    return intro + '<p>' + desc + '</p>';
  }

  function resultString(op) {
    var cs = ED.chars(op.result), out = '';
    for (var i = 0; i <= cs.length; i++) {
      if (op.kind === 'delete' && i === op.position) out += '<span class="bar"></span>';
      if (i < cs.length) {
        var hl = op.kind !== 'delete' && op.kind !== 'keep' && i === op.position - 1;
        out += hl ? '<mark>' + esc(cs[i]) + '</mark>' : esc(cs[i]);
      }
    }
    return out || '<i>(rỗng)</i>';
  }

  function renderResult(inTrace, revealed, atEnd) {
    var html;
    if (!inTrace) {
      html = 'Chưa có. Hoàn thành bước điền bảng và truy vết để xem kết quả.';
      el.ops.innerHTML = '';
    } else {
      html = 'Khoảng cách chỉnh sửa <b>' + esc(model.a.join('')) + '</b> → <b>' + esc(model.b.join('')) + '</b><br>' +
        '<span class="dist">' + (atEnd ? model.distance : '?') + '</span>' +
        (atEnd ? ' thao tác' : ' <span style="font-size:13px">(hiện khi truy vết xong)</span>');
      var lis = '';
      var total = model.ops.length;
      model.ops.forEach(function (op, f) {
        var moveIdx = total - 1 - f; // op thu f (xuoi) ung voi move thu total-1-f (truy vet nguoc)
        lis += '<li class="' + op.kind + (moveIdx < revealed ? ' show' : '') + '"><span class="n">' + (f + 1) + '</span>' +
          '<span>' + esc(op.text) + ' &rarr; <span class="res">' + resultString(op) + '</span></span></li>';
      });
      el.ops.innerHTML = lis;
    }
    el.result.innerHTML = html;
  }

  // --- dieu khien ---
  function go(s) {
    step = Math.max(0, Math.min(model.steps.length - 1, s));
    render();
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    el.play.textContent = '▶ Tự chạy';
  }
  function interval() { return 1100 - el.speed.value * 100; } // 1000ms .. 100ms
  function start() {
    if (!model) return;
    if (step >= model.steps.length - 1) go(0);
    el.play.textContent = '⏸ Dừng';
    timer = setInterval(function () { go(step + 1); }, interval());
  }
  function togglePlay() { timer ? stop() : start(); }

  PRESETS.forEach(function (p, idx) {
    var o = document.createElement('option');
    o.value = idx; o.textContent = p[2];
    el.preset.appendChild(o);
  });
  el.preset.addEventListener('change', function () {
    var p = PRESETS[+el.preset.value];
    el.a.value = p[0]; el.b.value = p[1];
    load(p[0], p[1]);
  });
  el.load.addEventListener('click', function () { load(el.a.value, el.b.value); });
  [el.a, el.b].forEach(function (inp) {
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') load(el.a.value, el.b.value); });
  });
  el.reset.addEventListener('click', function () { stop(); go(0); });
  el.back.addEventListener('click', function () { stop(); go(step - 1); });
  el.next.addEventListener('click', function () { stop(); go(step + 1); });
  el.end.addEventListener('click', function () { stop(); go(model.steps.length - 1); });
  el.play.addEventListener('click', togglePlay);
  el.speed.addEventListener('input', function () { if (timer) { stop(); start(); } });
  document.addEventListener('keydown', function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON' || e.metaKey || e.ctrlKey) return;
    if (e.key === 'ArrowRight') { stop(); go(step + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { stop(); go(step - 1); e.preventDefault(); }
    else if (e.key === ' ') { togglePlay(); e.preventDefault(); }
    else if (e.key === 'Home') { stop(); go(0); e.preventDefault(); }
    else if (e.key === 'End') { stop(); go(model.steps.length - 1); e.preventDefault(); }
  });

  load(el.a.value, el.b.value);
  // de test/chup anh: window.__demo
  window.__demo = { go: go, load: load, get step() { return step; }, get model() { return model; } };
})();
