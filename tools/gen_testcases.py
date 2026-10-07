#!/usr/bin/env python3
"""Sinh bo testcase cho edit distance.

Dap an `expected` duoc tinh bang mot cai dat DOC LAP voi ban JS va ban C:
  - chuoi ngan: de quy co nho (lru_cache) viet theo dinh nghia truy hoi
  - moi chuoi: DP bang hai hang bang Python
Hai cach phai khop nhau, neu khong script dung lai (khong ghi file).
Ket qua: testcases/testcases.json va testcases/cases/NN_ten.in (cho ban C).
"""
import json
import os
import random
import sys
from functools import lru_cache

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_JSON = os.path.join(ROOT, "testcases", "testcases.json")
OUT_DIR = os.path.join(ROOT, "testcases", "cases")


def ref_rows(a, b):
    prev = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        cur = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] != b[j - 1]))
        prev = cur
    return prev[len(b)]


def ref_rec(a, b):
    @lru_cache(maxsize=None)
    def f(i, j):
        if i == 0:
            return j
        if j == 0:
            return i
        return min(f(i - 1, j) + 1, f(i, j - 1) + 1, f(i - 1, j - 1) + (a[i - 1] != b[j - 1]))

    sys.setrecursionlimit(20000)
    return f(len(a), len(b))


def expected(a, b):
    v = ref_rows(a, b)
    if len(a) * len(b) <= 40000:  # hai cach doc lap phai khop
        w = ref_rec(a, b)
        if v != w:
            raise SystemExit("Reference mismatch on %r %r: %d vs %d" % (a[:20], b[:20], v, w))
    return v


def rnd(rng, n, alphabet):
    return "".join(rng.choice(alphabet) for _ in range(n))


def main():
    rng = random.Random(20261007)
    az = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    cases = []

    def add(group, name, a, b, note=""):
        cases.append({"group": group, "name": name, "a": a, "b": b, "note": note})

    # --- Vi du trong de ---
    add("de-bai", "LOVE-MOVIE", "LOVE", "MOVIE", "vi du de: thay L->M, them I")
    add("de-bai", "ABCDEF-ABCDEF", "ABCDEF", "ABCDEF", "giong het: 0")
    add("de-bai", "ABCDEF-ABCDE", "ABCDEF", "ABCDE", "xoa 1 ky tu cuoi")
    add("de-bai", "TAT-TBT", "TAT", "TBT", "thay 1 ky tu")

    # --- Bien: chuoi ngan nhat ---
    add("bien", "A-A", "A", "A", "do dai 1, giong nhau")
    add("bien", "A-B", "A", "B", "do dai 1, khac nhau")
    add("bien", "A-ABCDE", "A", "ABCDE", "mot chuoi la con (tien to) cua chuoi kia")
    add("bien", "ABCDE-A", "ABCDE", "A", "dao chieu: phai doi xung")
    add("bien", "E-ABCDE", "E", "ABCDE", "hau to")
    add("bien", "C-ABCDE", "C", "ABCDE", "o giua")

    # --- Dac biet ---
    add("dac-biet", "khac-hoan-toan", "AAAAAAAA", "BBBBBBBB", "thay het: do dai")
    add("dac-biet", "dao-nguoc", "ABCDEFG", "GFEDCBA", "dao nguoc")
    add("dac-biet", "lap-ky-tu", "AAAAAA", "AAA", "xoa 3")
    add("dac-biet", "ke-nhau", "ABAB", "BABA", "lech 1 vi tri")
    add("dac-biet", "xen-ke", "ABABABAB", "BABABABA", "xen ke")
    add("dac-biet", "kitten-sitting", "KITTEN", "SITTING", "vi du kinh dien: 3")
    add("dac-biet", "sunday-saturday", "SUNDAY", "SATURDAY", "vi du kinh dien: 3")
    add("dac-biet", "intention-execution", "INTENTION", "EXECUTION", "vi du kinh dien: 5")

    # --- Thuong: ngau nhien, bang chu cai nho de co nhieu ky tu trung ---
    for k, (n, m, al) in enumerate([(8, 8, "AB"), (12, 9, "ABC"), (15, 15, "ABCD"), (20, 14, az[:6]), (25, 30, az)]):
        add("thuong", "ngau-nhien-%d" % (k + 1), rnd(rng, n, al), rnd(rng, m, al), "n=%d m=%d, %d ky tu" % (n, m, len(al)))

    # --- Du lieu lon ---
    for n, m, al, tag in [(500, 500, "AB", "bang-chu-cai-2"), (1000, 800, az, "26-ky-tu"), (2000, 2000, "ABC", "bang-chu-cai-3")]:
        add("lon", "lon-%dx%d-%s" % (n, m, tag), rnd(rng, n, al), rnd(rng, m, al), "kiem tra toc do va do chinh xac")

    # --- Gioi han de (Wecode: n,m <= 5000) ---
    add("gioi-han", "5000-ngau-nhien", rnd(rng, 5000, az), rnd(rng, 5000, az), "n=m=5000, bang chu cai day du")
    add("gioi-han", "5000-A-vs-B", "A" * 5000, "B" * 5000, "tat ca ky tu khac: 5000")
    add("gioi-han", "5000-A-vs-A", "A" * 5000, "A", "xoa 4999")
    add("gioi-han", "5000-giong-het", "ABCDE" * 1000, "ABCDE" * 1000, "giong het: 0, duong cheo")
    base = rnd(rng, 5000, az)
    mutated = list(base)
    for p in rng.sample(range(5000), 50):
        mutated[p] = rng.choice(az)
    add("gioi-han", "5000-sai-lech-50", base, "".join(mutated), "bien the cua cung mot chuoi, khoang cach nho")

    os.makedirs(OUT_DIR, exist_ok=True)
    for f in os.listdir(OUT_DIR):
        if f.endswith(".in"):
            os.remove(os.path.join(OUT_DIR, f))

    for idx, c in enumerate(cases, 1):
        c["id"] = idx
        c["expected"] = expected(c["a"], c["b"])
        with open(os.path.join(OUT_DIR, "%02d_%s.in" % (idx, c["name"])), "w") as fh:
            fh.write(c["a"] + "\n" + c["b"] + "\n")
        c["file"] = "%02d_%s.in" % (idx, c["name"])

    with open(OUT_JSON, "w") as fh:
        json.dump(cases, fh, ensure_ascii=False, indent=1)
    print("wrote %d cases -> %s" % (len(cases), OUT_JSON))
    for g in dict.fromkeys(c["group"] for c in cases):
        print("  %-9s %d" % (g, sum(1 for c in cases if c["group"] == g)))


if __name__ == "__main__":
    main()
