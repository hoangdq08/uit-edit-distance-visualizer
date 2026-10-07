#!/usr/bin/env python3
"""Quay thao tac that tren Firefox (macOS) va ghi moc thoi gian tung thao tac.

Chay sau khi: demo dang mo o cua so Firefox rieng, chi 1 tab, o buoc 0, la cua so phia truoc.
Ra: video/raw.mov + video/raw_events.json   (mac dinh trong $OUT, mac dinh video/)
Moi thao tac gui bang System Events (phim that), khong phai goi ham trong trang.
"""
import json, os, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('OUT', os.path.join(ROOT, 'video'))
os.makedirs(OUT, exist_ok=True)
MOV = os.path.join(OUT, 'raw.mov')

# Ma phim macOS: 124 = mui ten phai (Tien), 123 = mui ten trai, 49 = Space, 115 = Home, 119 = End
def key(code):
    subprocess.run(['osascript', '-e', 'tell application "System Events" to key code %d' % code], check=True)

def typ(text):
    subprocess.run(['osascript', '-e', 'tell application "System Events" to keystroke "%s"' % text], check=True)

def click(x, y):
    subprocess.run(['osascript', '-e', 'tell application "System Events" to click at {%d, %d}' % (x, y)], check=True)

ev = []
t0 = None

def mark(name, wait=0.0):
    ev.append({'t': round(time.time() - t0, 2), 'event': name})
    if wait:
        time.sleep(wait)

def main():
    global t0
    if os.path.exists(MOV):
        os.remove(MOV)
    dur = int(os.environ.get('DURATION', '160'))
    rec = subprocess.Popen(['screencapture', '-v', '-V', str(dur), MOV], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2.0)
    t0 = time.time()
    # 1. gioi thieu
    # Moc thoi gian duoc ghi lai; loi doc se duoc can theo cac moc nay (xem tools/make_video.py)
    key(115)                                       # Home: ve buoc 0 (bam that)
    mark('intro', 16)                              # nhin toan man hinh, gioi thieu bai toan
    mark('input_shown', 14)                        # chi vao o nhap va bang
    for i in range(1, 4):
        key(124); mark('next_%d' % i, 3.2)         # tien tung o dau tien
    key(124); mark('step4_diff', 15)               # buoc 4: o (1,4) khac ky tu, 3 o nguon
    for i in range(5, 8):
        key(124); mark('step%d' % i, 2.2)
    mark('step7_same', 10)                         # buoc 7: o (2,2) cung ky tu
    key(49); mark('autoplay_start', 17)            # Space: tu chay het (19 buoc x 0.6s ~ 12s), de chay toi buoc cuoi
    mark('autoplay_done', 14)                      # dung yen o buoc 26: khong bam Space lan 2 (se chay lai tu buoc 0)
    mark('end', 3)
    json.dump(ev, open(os.path.join(OUT, 'raw_events.json'), 'w'), indent=1)
    rec.wait()

if __name__ == '__main__':
    main()
