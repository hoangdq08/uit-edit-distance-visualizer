#!/bin/bash
# Kiem tra chinh bo kiem thu giao dien bang dot bien. Lam viec tren BAN SAO o /tmp/ed_mutation_work, KHONG sua repo.
# Chen tung loi co y vao ban sao roi chay tools/dom_check.html bang Chrome headless; moi loi phai lam ket qua doi tu PASS sang FAIL.
# Dung: bash tools/mutation_check.sh   (can Chrome; dat CHROME=... neu o duong dan khac)
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CH="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
W=/tmp/ed_mutation_work

fresh() { rm -rf "$W"; mkdir -p "$W"; cp -R "$ROOT/index.html" "$ROOT/src" "$ROOT/tools" "$W/"; }
run() {
  "$CH" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=20000 \
    --dump-dom "file://$W/tools/dom_check.html" 2>/dev/null | grep -oE '(PASS|FAIL)[^<]{0,110}' | head -1
}
detected=0; total=0
mutate() {   # mutate <ten> <file tuong doi> <sed expr>
  local name="$1" file="$2" expr="$3"
  fresh
  cp "$W/$file" "$W/$file.orig"
  sed -i.bak "$expr" "$W/$file"
  if cmp -s "$W/$file" "$W/$file.orig"; then echo "[$name] LOI: dot bien khong ap dung duoc (sed khong khop)"; total=$((total+1)); return; fi
  local r; r="$(run)"; total=$((total+1))
  case "$r" in FAIL*) detected=$((detected+1)); echo "[$name] bi bat: $r" ;; *) echo "[$name] LOT QUA: $r" ;; esac
}

fresh; echo "[ban goc] $(run)"
mutate "anh xa nhanh trung sai"      src/pseudocode.js  's/? { act: \[5, 6\], ctx: \[3, 4\] }/? { act: [5, 8], ctx: [3, 4] }/'
mutate "anh xa thao tac xoa sai"     src/pseudocode.js  's/delete: \[15, 16\]/delete: [17, 18]/'
mutate "lo ket qua som"              src/app.js         "s/(atEnd ? model.distance : '?')/model.distance/"
mutate "gia tri o sai"               src/editdistance.js 's/same, value: dp\[i\]\[j\],/same, value: dp[i][j] + 1,/'
mutate "lo dap an qua khung giai thich" src/app.js "s/'. Từ mỗi ô, đi ngược về/' (đây là kết quả: ' + distTxt + '). Từ mỗi ô, đi ngược về/"
echo "ket qua: $detected/$total dot bien bi bat"
[ "$detected" = "$total" ]
