#!/usr/bin/env python3
"""Dung video demo co giong doc tu cac khung hinh Chrome headless.

Giong doc: mac dinh edge-tts vi-VN-HoaiMyNeural (can mang, pip install edge-tts);
VOICE=linh de dung giong macOS `say -v Linh` (offline).

Chay:  python3 tools/make_video.py        (can: Google Chrome, ffmpeg, node)
Ra:    video/demo.mp4  (video/ khong duoc commit)

Moi doan = loi doc + danh sach (cap chuoi, buoc). Thoi luong moi khung hinh chia deu
theo do dai that cua giong doc, nen hinh luon khop tieng.
"""
import os, subprocess, sys, json, shutil, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'video')
FR = os.path.join(OUT, 'frames')
AU = os.path.join(OUT, 'audio')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
W, H = 1440, 900
PAD = 0.55  # giay lang giua cac doan
VOICE = os.environ.get('VOICE', 'hoaimy')
EDGE_BIN = os.environ.get('EDGE_TTS', 'edge-tts')
EDGE_VOICE = 'vi-VN-HoaiMyNeural'

# (loi doc, [(A, B, buoc)])   buoc: so nguyen, 'end', hoac 'tests' cho khung ket qua kiem thu
SEGMENTS = [
    ("Xin chào cô. Em xin trình bày bài tập lớn môn CS112: trực quan hóa thuật toán khoảng cách chỉnh sửa, "
     "tiếng Anh là Edit Distance, bằng quy hoạch động. Bài toán cho hai chuỗi A và B, "
     "tìm số thao tác ít nhất gồm thêm, xóa hoặc thay một ký tự để biến A thành B.",
     [('LOVE', 'MOVIE', 0)]),
    ("Phía trên là phần nhập input: chuỗi A là LOVE, chuỗi B là MOVIE, mỗi chuỗi tối đa hai mươi ký tự, "
     "bấm Nạp chuỗi để bắt đầu. Bảng bên trái là bảng quy hoạch động: ô hàng i, cột j cho biết số thao tác ít nhất "
     "để biến i ký tự đầu của A thành j ký tự đầu của B. Hàng không và cột không được khởi tạo từ đầu.",
     [('LOVE', 'MOVIE', 0)]),
    ("Mỗi lần bấm Tiến, demo điền một ô, lần lượt theo từng hàng. Ô tô vàng là ô đang tính, "
     "khung bên phải giải thích bước hiện tại và mã giả hiện dòng đang chạy.",
     [('LOVE', 'MOVIE', 1), ('LOVE', 'MOVIE', 2), ('LOVE', 'MOVIE', 3)]),
    ("Đây là ô hàng một, cột bốn, so L với I, hai ký tự khác nhau. Ba ô nguồn là thay, xóa và thêm, có giá trị "
     "ba, bốn và ba. Lấy giá trị nhỏ nhất cộng một, được bốn. Dòng năm, bảy và tám của mã giả sáng lên.",
     [('LOVE', 'MOVIE', 4)]),
    ("Còn đây là ô hàng hai, cột hai, so O với O, hai ký tự giống nhau. Khi đó không tốn thao tác nào, "
     "ô nhận luôn giá trị của ô chéo là một.",
     [('LOVE', 'MOVIE', 7)]),
    ("Điền xong toàn bộ bảng thì ô cuối cùng, hàng bốn cột năm, có giá trị hai. "
     "Nhưng khung Kết quả vẫn chưa hiện đáp án, vì còn bước truy vết để tìm dãy thao tác.",
     [('LOVE', 'MOVIE', 20)]),
    ("Truy vết đi ngược từ ô cuối về ô gốc. Ở mỗi ô, demo chọn ô trước mà giá trị cộng với chi phí của thao tác "
     "đúng bằng giá trị hiện tại. Đường truy vết được tô màu tím, và danh sách thao tác hiện dần ở khung Kết quả.",
     [('LOVE', 'MOVIE', 21), ('LOVE', 'MOVIE', 22), ('LOVE', 'MOVIE', 24)]),
    ("Kết quả là hai thao tác. Thay L thành M, giữ O, giữ V, thêm I, rồi giữ E. "
     "Chuỗi biến đổi từ LOVE sang MOVE, rồi thành MOVIE.",
     [('LOVE', 'MOVIE', 'end')]),
    ("Em thử thêm một cặp quen thuộc là KITTEN và SITTING. Demo cho kết quả ba thao tác.",
     [('KITTEN', 'SITTING', 'end')]),
    ("Về kiểm thử, em có ba mươi mốt testcase chia thành sáu nhóm, lớn nhất là năm nghìn nhân năm nghìn ký tự. "
     "Đáp án được tính bằng một cài đặt Python độc lập, và tất cả đều khớp. Giao diện cũng được kiểm tra "
     "tự động trên Chrome qua bảy trăm bảy mươi hai bước.",
     [(None, None, 'tests')]),
    ("Demo chỉ nhận tối đa hai mươi ký tự để bảng đọc được, còn thuật toán chạy tới năm nghìn ký tự trong bộ kiểm thử. "
     "Em có dùng AI hỗ trợ trong bài, quy trình được ghi ở mục tám của báo cáo. Em xin cảm ơn cô đã xem.",
     [('LOVE', 'MOVIE', 'end')]),
]


def run(cmd, **kw):
    subprocess.run(cmd, check=True, **kw)


def edge_tts(text, out, tries=8):
    """edge-tts goi dich vu mang, doi khi tra 'No audio' (chap chon / gioi han toc do): thu lai co kiem soat."""
    import time
    last = ''
    for k in range(tries):
        r = subprocess.run([EDGE_BIN, '--voice', EDGE_VOICE, '--text', text, '--write-media', out], capture_output=True, text=True)
        if r.returncode == 0 and os.path.exists(out) and os.path.getsize(out) > 1000:
            time.sleep(1.5)  # gian cach de tranh bi gioi han toc do
            return
        last = (r.stderr or '').strip().splitlines()[-1:] or ['(khong co thong bao)']
        print('  edge-tts loi lan %d/%d: %s' % (k + 1, tries, last[0]))
        time.sleep(3 + 2 * k)
    sys.exit('edge-tts that bai sau %d lan; dung VOICE=linh de dung giong macOS offline' % tries)


def frame_path(a, b, s):
    return os.path.join(FR, '%s_%s_%s.png' % (a, b, s))


def capture(a, b, s):
    p = frame_path(a, b, s)
    if os.path.exists(p):
        return p
    if s == 'tests':
        txt = subprocess.run(['node', os.path.join(ROOT, 'tools', 'run_tests.js')], capture_output=True, text=True, cwd=ROOT).stdout
        page = os.path.join(FR, 'tests.html')
        with open(page, 'w', encoding='utf-8') as f:
            f.write('<meta charset="utf-8"><body style="margin:0;background:#fff"><div style="padding:20px 36px;font:15px/1.45 Menlo,monospace;color:#1c2733">'
                    '<div style="font:700 24px Helvetica,Arial,sans-serif;margin-bottom:6px">Kết quả chạy: node tools/run_tests.js</div>'
                    '<pre style="margin:0;font:inherit;white-space:pre">' + html.escape(txt) + '</pre></div></body>')
        url = 'file://' + page
    else:
        url = 'file://%s/tools/shot.html?w=%d&h=%d&a=%s&b=%s&step=%s' % (ROOT, W, H, a, b, s)
    run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
         '--window-size=%d,%d' % (W, H), '--virtual-time-budget=3000', '--screenshot=' + p, url],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return p


def duration(path):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).decode().strip())


def main():
    for d in (FR, AU):
        os.makedirs(d, exist_ok=True)
    run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', str(PAD), os.path.join(AU, 'pad.wav')])
    entries, wavs, total = [], [], 0.0
    for i, (text, frames) in enumerate(SEGMENTS):
        aiff = os.path.join(AU, 's%02d.aiff' % i)
        wav = os.path.join(AU, 's%02d.wav' % i)
        if VOICE == 'linh':
            run(['say', '-v', 'Linh', '-r', '165', '-o', aiff, text])
            src = aiff
        else:
            src = os.path.join(AU, 's%02d.mp3' % i)
            edge_tts(text, src)
        # cat khoang lang o dau/cuoi do dich vu them vao, de khoang nghi giua cac doan chi con PAD
        run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-af',
             'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse',
             '-ar', '44100', '-ac', '1', wav])
        dur = duration(wav) + PAD
        total += dur
        wavs += [wav, os.path.join(AU, 'pad.wav')]
        per = dur / len(frames)
        for (a, b, s) in frames:
            entries.append((capture(a, b, s), per))
        print('doan %02d: %.1fs, %d khung' % (i + 1, dur, len(frames)))
    with open(os.path.join(AU, 'list.txt'), 'w') as f:
        for w in wavs:
            f.write("file '%s'\n" % w)
    run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', os.path.join(AU, 'list.txt'), os.path.join(AU, 'all.wav')])
    with open(os.path.join(AU, 'frames.txt'), 'w') as f:
        for p, d in entries:
            f.write("file '%s'\nduration %.3f\n" % (p, d))
        f.write("file '%s'\n" % entries[-1][0])
    mp4 = os.path.join(OUT, 'demo.mp4')
    run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', os.path.join(AU, 'frames.txt'),
         '-i', os.path.join(AU, 'all.wav'), '-vf', 'fps=30,scale=1440:900,format=yuv420p',
         '-c:v', 'libx264', '-crf', '20', '-c:a', 'aac', '-b:a', '128k', '-t', '%.3f' % duration(os.path.join(AU, 'all.wav')), '-movflags', '+faststart', mp4])
    print('xong: %s (tong %.1fs, audio %.1fs, video %.1fs)' % (mp4, total, duration(os.path.join(AU, 'all.wav')), duration(mp4)))


if __name__ == '__main__':
    main()
