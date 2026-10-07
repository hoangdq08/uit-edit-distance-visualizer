#!/usr/bin/env python3
"""Ghep video demo tu ban quay that (tools/record_demo.py) + giong doc can theo moc thao tac.

Phan 1: ban quay man hinh that (da cat bo thanh menu/tab/dia chi cua trinh duyet), giong doc dat dung
        tai moc thoi gian cua tung thao tac trong video/raw_events.json.
Phan 2: hai doan khung tinh (ket qua kiem thu, loi ket) dung lai ham cua make_video.py.
Moi doan loi doc duoc kiem tra co vua khoang thoi gian cua no khong; neu tran thi dung va bao.

Chay: python3 tools/assemble_video.py   (can raw.mov, raw_events.json trong video/; edge-tts, ffmpeg, Chrome)
Ra:   video/demo.mp4
"""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_video as mv

ROOT = mv.ROOT
OUT = mv.OUT
AU = os.path.join(OUT, 'audio2')
FR2 = os.path.join(OUT, 'frames2')
VW, VH = 1680, 934          # kich thuoc sau khi cat thanh trinh duyet
CROP_TOP = 116              # so dong phia tren cua ban quay (menu + tab + dia chi) can cat
GAP = 0.35                  # chua khoang lang toi thieu giua hai doan

# (moc su kien bat dau, moc su kien ket thuc cua cua so, loi doc)
CUES = [
    ('intro', 'input_shown',
     "Xin chào cô. Em xin trình bày bài tập lớn môn CS112: trực quan hóa thuật toán khoảng cách chỉnh sửa, "
     "Edit Distance, bằng quy hoạch động. Cho hai chuỗi A và B, tìm số thao tác ít nhất gồm thêm, xóa hoặc thay "
     "một ký tự để biến A thành B."),
    ('input_shown', 'next_1',
     "Phần nhập input: chuỗi A là LOVE, chuỗi B là MOVIE. Ô hàng i, cột j của bảng là số thao tác ít nhất "
     "để biến i ký tự đầu của A thành j ký tự đầu của B. Hàng không và cột không được khởi tạo sẵn."),
    ('next_1', 'step4_diff',
     "Mỗi lần tiến một bước, demo điền một ô. Ô vàng là ô đang tính, khung bên phải giải thích bước, "
     "và mã giả sáng đúng dòng đang chạy."),
    ('step4_diff', 'step5',
     "Ô hàng một, cột bốn, so L với I, khác nhau. Ba ô nguồn là thay, xóa, thêm, có giá trị "
     "ba, bốn và ba. Lấy nhỏ nhất cộng một, được bốn."),
    ('step5', 'step7',
     "Demo tiếp tục điền các ô."),
    ('step7', 'autoplay_start',
     "Đây là ô hàng hai, cột hai, so O với O, hai ký tự giống nhau. Khi đó không tốn thao tác nào, "
     "ô nhận luôn giá trị của ô chéo là một."),
    ('autoplay_start', 'autoplay_done',
     "Chế độ tự chạy điền hết bảng. Ô cuối cùng, hàng bốn cột năm, có giá trị hai, "
     "nhưng khung Kết quả vẫn chưa hiện đáp án. Sau đó là bước truy vết: đi ngược từ ô cuối về ô gốc, "
     "tô tím đường đi, và danh sách thao tác hiện dần."),
    ('autoplay_done', None,
     "Kết quả là hai thao tác: thay L thành M, giữ O, giữ V, thêm I, rồi giữ E. "
     "Chuỗi biến đổi từ LOVE sang MOVE, rồi thành MOVIE."),
]

# Phan 2: khung tinh. (loi doc, [(a, b, buoc)])
TAIL = [
    ("Về kiểm thử, em có ba mươi mốt testcase chia thành sáu nhóm, lớn nhất là năm nghìn nhân năm nghìn ký tự. "
     "Đáp án được tính bằng một cài đặt Python độc lập, và tất cả đều khớp. Giao diện cũng được kiểm tra "
     "tự động trên Chrome qua bảy trăm bảy mươi hai bước.",
     [(None, None, 'tests')]),
    ("Demo chỉ nhận tối đa hai mươi ký tự để bảng đọc được, còn thuật toán chạy tới năm nghìn ký tự trong bộ kiểm thử. "
     "Em có dùng AI hỗ trợ trong bài, quy trình được ghi ở mục tám của báo cáo. Em xin cảm ơn cô đã xem.",
     [('LOVE', 'MOVIE', 'end')]),
]


def tts_wav(text, name):
    """Tao file giong doc; dung lai neu loi doc khong doi (edge-tts hay loi tam thoi, ton thoi gian)."""
    import hashlib
    src = os.path.join(AU, name + '.mp3')
    wav = os.path.join(AU, name + '.wav')
    tag = os.path.join(AU, name + '.sha')
    h = hashlib.sha1((mv.EDGE_VOICE + '|' + text).encode('utf-8')).hexdigest()
    if os.path.exists(wav) and os.path.exists(tag) and open(tag).read() == h:
        return wav
    mv.edge_tts(text, src)
    mv.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-af',
            'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse',
            '-ar', '44100', '-ac', '1', wav])
    open(tag, 'w').write(h)
    return wav


def silence(sec, name):
    p = os.path.join(AU, name + '.wav')
    mv.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', '%.3f' % max(sec, 0.01), p])
    return p


PAUSE = 0.8   # nghi sau moi doan loi doc; phan hinh tinh thua sau do bi cat


def main():
    for d in (AU, FR2):
        os.makedirs(d, exist_ok=True)
    ev = {e['event']: e['t'] for e in json.load(open(os.path.join(OUT, 'raw_events.json')))}
    raw = os.path.join(OUT, 'raw.mov')
    # Do lech giua moc su kien (tinh tu luc script bat dau) va thoi gian trong file quay (screencapture khoi dong truoc).
    # Do bang khung hinh dau tien xuat hien sau phim Tien dau tien: do tre thuc cua man hinh.
    pts = [float(x.strip(',')) for x in subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                                                      'frame=pts_time', '-of', 'csv=p=0', raw]).decode().split() if x.strip(',')]
    first_change = next(t for t in pts if t > ev['next_1'])
    offset = min(max(first_change - ev['next_1'], 0.0), 4.0)
    print('do lech moc/hinh do duoc: %.2fs (khung dau sau phim Tien dau tien o %.2fs, phim o %.2fs)' % (offset, first_change, ev['next_1']))
    ev = {k: v + offset for k, v in ev.items()}
    real = float(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'frame=pts_time',
                                          '-of', 'csv=p=0', raw]).decode().split()[-1].strip(','))
    # screencapture ghi toc do khung hinh bien thien (man hinh dung yen thi khong ghi khung nao), nen cat theo moc thoi gian
    # truc tiep tren file goc se ra doan rong. Doi sang toc do co dinh 30 fps mot lan roi moi cat.
    cfr = os.path.join(OUT, 'raw_cfr.mp4')
    mv.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-vf', 'crop=%d:%d:0:%d,fps=30,format=yuv420p' % (VW, VH, CROP_TOP),
            '-an', '-c:v', 'libx264', '-crf', '20', '-g', '30', cfr])
    raw = cfr
    real = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', cfr]).decode().strip())
    vf = 'null'
    seg_files, a_parts, trimmed = [], [], 0.0
    for i, (a, b, text) in enumerate(CUES):
        start = ev[a]
        wav = tts_wav(text, 'c%02d' % i)
        d = mv.duration(wav)
        window_end = ev[b] if b else real
        want = d + PAUSE
        avail = window_end - start
        if b and d + GAP > avail:
            sys.exit('Doan %d (%s) doc %.1fs dai hon khoang thao tac %.1fs. Rut gon CUES roi chay lai.' % (i + 1, a, d, avail - GAP))
        length = min(want, avail) if b else want
        pad = max(0.0, length - avail) if not b else 0.0     # doan cuoi: giu khung cuoi neu hinh that het
        trimmed += max(0.0, avail - length)
        seg = os.path.join(OUT, 'seg%02d.mp4' % i)
        f = vf + (',tpad=stop_mode=clone:stop_duration=%.3f' % pad if pad > 0 else '')
        mv.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '%.3f' % start, '-i', raw, '-t', '%.3f' % length,
                '-vf', f, '-an', '-c:v', 'libx264', '-crf', '20', seg])
        seg_files.append(seg)
        a_parts += [wav, silence(length - d, 'p%02d' % i)]
        print('doan %d %-15s doc %.1fs, giu %.1fs / %.1fs hinh that (cat %.1fs)' % (i + 1, a, d, length, avail, max(0.0, avail - length)))
    print('tong hinh tinh da cat: %.1fs' % trimmed)
    with open(os.path.join(AU, 'vseg.txt'), 'w') as f:
        for p in seg_files:
            f.write("file '%s'\n" % p)
    crop = os.path.join(OUT, 'part1.mp4')
    mv.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', os.path.join(AU, 'vseg.txt'), '-c', 'copy', crop])
    parts = a_parts
    # --- phan 2: khung tinh
    mv.FR, mv.W, mv.H = FR2, VW, VH
    entries, tail_wavs = [], []
    for i, (text, frames) in enumerate(TAIL):
        wav = tts_wav(text, 't%02d' % i)
        dur = mv.duration(wav) + mv.PAD
        tail_wavs += [wav, silence(mv.PAD, 'tp%02d' % i)]
        for (a, b, s) in frames:
            entries.append((mv.capture(a, b, s), dur / len(frames)))
        print('doan cuoi %d: %.1fs' % (i + 1, dur))
    with open(os.path.join(AU, 'frames.txt'), 'w') as f:
        for p, d in entries:
            f.write("file '%s'\nduration %.3f\n" % (p, d))
        f.write("file '%s'\n" % entries[-1][0])
    part2 = os.path.join(OUT, 'part2.mp4')
    mv.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', os.path.join(AU, 'frames.txt'),
            '-vf', 'scale=-2:%d,pad=%d:%d:(ow-iw)/2:0:color=0xf2eee6,fps=30,format=yuv420p' % (VH, VW, VH),
            '-an', '-c:v', 'libx264', '-crf', '20', part2])
    # --- ghep
    with open(os.path.join(AU, 'a.txt'), 'w') as f:
        for p in parts + tail_wavs:
            f.write("file '%s'\n" % p)
    alla = os.path.join(AU, 'all.wav')
    mv.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', os.path.join(AU, 'a.txt'), alla])
    with open(os.path.join(AU, 'v.txt'), 'w') as f:
        f.write("file '%s'\nfile '%s'\n" % (crop, part2))
    mp4 = os.path.join(OUT, 'demo.mp4')
    mv.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', os.path.join(AU, 'v.txt'), '-i', alla,
            '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k',
            '-t', '%.3f' % mv.duration(alla), '-movflags', '+faststart', mp4])
    print('xong: %s  (hinh %.1fs, tieng %.1fs)' % (mp4, mv.duration(mp4), mv.duration(alla)))


if __name__ == '__main__':
    main()
