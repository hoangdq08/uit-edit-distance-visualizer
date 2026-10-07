# Edit Distance - minh họa từng bước (CS112, Bài tập lớn)

Bài toán: cho hai chuỗi A và B, tìm số thao tác **thêm / xóa / thay** một ký tự ít nhất để biến A thành B.
Giải bằng quy hoạch động O(n·m). Nguồn gốc: bài "Rút bài trúng thưởng" trên Wecode (n, m ≤ 5000).

## Chạy demo

Mở `index.html` bằng trình duyệt (không cần cài gì, không cần server).

- Nhập hai chuỗi (tối đa 20 ký tự mỗi chuỗi) hoặc chọn ví dụ có sẵn, bấm **Nạp chuỗi** (hoặc Enter). Demo tự nạp cặp LOVE → MOVIE khi mở trang.
- **Tiến / Lùi** từng bước, **Tự chạy** (chỉnh tốc độ), **Đầu**, **Kết quả**.
- Phím tắt: `→` tiến, `←` lùi, `Space` tự chạy / dừng, `Home` về đầu, `End` tới kết quả.
- Ba giai đoạn: 1. khởi tạo hàng/cột 0, 2. điền từng ô (tô sáng ô đang tính, ba ô nguồn ↖ ↑ ←, ô được chọn viền đậm, kèm công thức), 3. truy vết từ ô cuối về (0,0) để ra danh sách thao tác.
- **Mã giả** ở cột phải, dưới khung "Bước hiện tại" (cùng một màn hình với bảng DP ở 1440x900 trở lên): dòng đang thực hiện được tô vàng, dòng bao quanh (vòng lặp, `while`) tô nhạt. Ánh xạ bước → dòng nằm trong `src/pseudocode.js` và được `run_tests.js` kiểm tra.
- Khung **Mô hình bài toán** cuối trang: Input/Output có tên biến, kiểu, giới hạn; công thức truy hồi; độ phức tạp.

## Cấu trúc

```
index.html              giao diện demo
src/editdistance.js     lõi thuật toán (dùng chung cho demo, test, benchmark)
src/pseudocode.js       mã giả + ánh xạ bước demo → dòng mã giả cần tô sáng
src/app.js, style.css   giao diện
src/edit_distance.c     bản C đã nộp lên Wecode (2 hàng, O(m) bộ nhớ)
tools/gen_testcases.py  sinh bộ testcase + đáp án từ cài đặt Python độc lập
tools/run_tests.js      chạy toàn bộ testcase
tools/dom_check.html    kiểm tra DOM thật trong trình duyệt headless
tools/benchmark.js      so sánh naive / memo / bảng / 2 hàng / C
testcases/testcases.json, testcases/cases/*.in   bộ testcase (31 test, 6 nhóm)
testcases/benchmark_result.json                  kết quả benchmark gần nhất
```

## Kiểm thử

```
python3 tools/gen_testcases.py   # sinh lại testcase (cần Python 3)
node tools/run_tests.js          # cần Node, gcc để kiểm tra bản C
node tools/benchmark.js          # ~10 giây

# Kiểm tra DOM thật trong Chrome headless (đi hết mọi bước của 14 cặp chuỗi, 772 bước)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --allow-file-access-from-files --virtual-time-budget=20000 --dump-dom \
  "file://$PWD/tools/dom_check.html" 2>/dev/null | grep -oE '(PASS|FAIL)[^<]*' | head -1
```

`tools/dom_check.html` nạp `index.html`, gọi `window.__demo.go(s)` cho từng bước rồi kiểm tra DOM thật: ô đang tính (đúng ô, đúng giá trị), số ô nguồn (1 khi trùng, 3 khi khác), dòng mã giả đang sáng (đọc chữ thật của dòng, không dùng lại hàm ánh xạ), đường truy vết, danh sách thao tác, kết quả không lộ trước khi truy vết xong, nút Lùi/Tiến bị khóa đúng ở đầu/cuối, và báo lỗi khi nhập quá 20 ký tự. Đã kiểm chứng bằng đột biến: chèn 4 lỗi cố ý (ánh xạ nhánh trùng sai, ánh xạ thao tác xóa sai, lộ kết quả sớm, giá trị ô sai) thì check đều báo FAIL, bản gốc báo PASS.

`run_tests.js` kiểm tra mỗi testcase theo 4 cách:
1. Bốn cài đặt JS (bảng, 2 hàng, memo, đệ quy thuần khi đủ nhỏ) cho đúng đáp án.
2. Bản C cho đúng đáp án trên cùng input.
3. Truy vết: số thao tác khác "giữ" bằng khoảng cách, và áp dụng các thao tác lên A thì ra đúng B.
4. Đối xứng: d(A,B) = d(B,A).
5. Ánh xạ mã giả: với mọi bước của mọi testcase cỡ demo (≤ 20 ký tự), dòng được tô sáng khớp nhánh `if/else` và loại thao tác truy vết tương ứng.

Đáp án (`expected`) do `gen_testcases.py` tính bằng cài đặt Python **độc lập** với JS và C
(DP hai hàng, và với test nhỏ còn đối chiếu thêm với đệ quy có nhớ viết theo định nghĩa truy hồi).

Nhóm testcase: `de-bai` (4), `bien` (6), `dac-biet` (8), `thuong` (5), `lon` (3), `gioi-han` (5, n = m = 5000).

## Giới hạn đã biết

- Demo chỉ nhận tối đa 20 ký tự mỗi chuỗi (để bảng đọc được). Thuật toán chạy tới 5000 ký tự.
- Truy vết chọn một đường đi tối ưu theo thứ tự ưu tiên giữ/thay, xóa, thêm. Có thể có nhiều đường
  cùng số thao tác, khi đó demo chỉ hiển thị một đường.
- `memo` là đệ quy sâu n+m nên có thể tràn stack với chuỗi rất dài (xem `benchmark.js`, n = 5000 vẫn chạy được trên Node 26 ở máy này).
- Đã kiểm tra giao diện thủ công trên Firefox và tự động trên Chrome 154 headless (DOM check ở trên). Chưa thử Safari, và chưa kiểm tra bố cục (chỉ kiểm tra nội dung DOM, không kiểm tra hình ảnh).
