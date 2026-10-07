// Do thoi gian de quy thuan o n = m = 14 (mot lan). Chuoi sinh bang bo sinh so co hat giong de lap lai duoc.
'use strict';
const ED = require('../src/editdistance.js');
let seed = 14;
const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const rnd = n => Array.from({ length: n }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(rand() * 26)]).join('');
const a = rnd(14), b = rnd(14);
const expected = ED.distance(a, b);
const t = process.hrtime.bigint();
const v = ED.naive(a, b);
const ms = Number(process.hrtime.bigint() - t) / 1e6;
console.log(JSON.stringify({ n: 14, a, b, expected, naive: v, ok: v === expected, seconds: +(ms / 1000).toFixed(2), node: process.version, platform: process.platform + '/' + process.arch }));
