// news-image-20261118 — a program that draws one 1024x1024 PNG summing up the
// world's news of Wednesday 18 November 2026 and writes it to entry.png.
// Node 22+, standard library only (node:fs, node:zlib, node:path). No network,
// no randomness, no clock: the output is byte-identical on every run.

import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 characters ('#' = on).
// Uppercase A-Z, digits 0-9 and common punctuation only; all copy in the
// image is set in capitals so the font stays small and legible.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.#...'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#..##'],
  '(': ['...##', '..#..', '.#...', '.#...', '.#...', '..#..', '...##'],
  ')': ['##...', '..#..', '...#.', '...#.', '...#.', '..#..', '##...'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '+': ['.....', '..#..', '..#..', '.###.', '..#..', '..#..', '.....'],
  '&': ['.##..', '#..#.', '#..#.', '.#...', '#.#.#', '#..#.', '.##.#'],
  '=': ['.....', '.....', '.###.', '.....', '.###.', '.....', '.....'],
};

// ---------------------------------------------------------------------------
// Pixel buffer and drawing primitives (RGB, top-left origin).
// ---------------------------------------------------------------------------
type RGB = [number, number, number];

const CREAM: RGB = [245, 239, 224];
const PAPER: RGB = [255, 253, 247];
const INK: RGB = [20, 24, 34];
const NAVY: RGB = [20, 33, 61];
const NAVY2: RGB = [38, 54, 92];
const RED: RGB = [193, 18, 31];
const GOLD: RGB = [212, 160, 23];
const SLATE: RGB = [70, 95, 130];
const TEAL: RGB = [15, 118, 110];
const GREEN: RGB = [34, 128, 74];
const ORANGE: RGB = [198, 93, 7];
const PURPLE: RGB = [106, 61, 155];
const GREY: RGB = [120, 124, 130];
const LIGHT: RGB = [226, 222, 210];

const buf = new Uint8Array(W * H * 3);

function fillAll(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    buf[i * 3] = c[0];
    buf[i * 3 + 1] = c[1];
    buf[i * 3 + 2] = c[2];
  }
}

function px(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) px(i, j, c);
  }
}

function rectOutline(x: number, y: number, w: number, h: number, c: RGB, t = 2): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

// Bresenham line.
function line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  for (;;) {
    for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) px(x + a, y + b, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) px(x, y, c);
    }
  }
}

function circleOutline(cx: number, cy: number, r: number, c: RGB, t = 2): void {
  for (let a = 0; a < 360; a += 1) {
    const rad = (a * Math.PI) / 180;
    const x = Math.round(cx + r * Math.cos(rad));
    const y = Math.round(cy + r * Math.sin(rad));
    for (let i = 0; i < t; i++) for (let j = 0; j < t; j++) px(x + i, y + j, c);
  }
}

// ---------------------------------------------------------------------------
// Text. One glyph cell is 5*scale wide plus 1*scale of spacing; 7*scale tall.
// ---------------------------------------------------------------------------
function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawText(x: number, y: number, s: string, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s) {
    const g = FONT[ch] ?? FONT[' '];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === '#') {
          fillRect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(x: number, y: number, w: number, s: string, scale: number, c: RGB): void {
  drawText(x + Math.floor((w - textWidth(s, scale)) / 2), y, s, scale, c);
}

// Greedy word wrap into lines no wider than maxW pixels.
function wrapText(s: string, scale: number, maxW: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur === '' ? word : cur + ' ' + word;
    if (textWidth(test, scale) <= maxW) {
      cur = test;
    } else {
      if (cur !== '') lines.push(cur);
      cur = word;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// Minimal PNG encoder: RGB8, filter 0 on every row, zlib deflate, CRC32.
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, 'ascii');
  data.copy(out, 8);
  const crcData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  out.writeUInt32BE(crc32(crcData), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    Buffer.from(buf.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Small geometric icons, drawn inside a square of side `s` at (x, y).
// ---------------------------------------------------------------------------
function iconBurst(x: number, y: number, s: number, c: RGB): void {
  const cx = x + s / 2;
  const cy = y + s / 2;
  for (let a = 0; a < 8; a++) {
    const rad = (a * Math.PI) / 4;
    line(
      Math.round(cx + 12 * Math.cos(rad)), Math.round(cy + 12 * Math.sin(rad)),
      Math.round(cx + (s / 2 - 2) * Math.cos(rad)), Math.round(cy + (s / 2 - 2) * Math.sin(rad)),
      c, 3,
    );
  }
  disc(Math.round(cx), Math.round(cy), 10, c);
  disc(Math.round(cx), Math.round(cy), 4, PAPER);
}

function iconBridge(x: number, y: number, s: number, c: RGB): void {
  const w = s - 8;
  const y0 = y + s - 26;
  line(x + 4, y0, x + 4 + w, y0, c, 4); // deck
  // arch: half-ellipse above the deck
  for (let a = 0; a <= 180; a += 2) {
    const rad = (a * Math.PI) / 180;
    const px0 = Math.round(x + 4 + (w / 2) * (1 - Math.cos(rad)));
    const py0 = Math.round(y0 - 34 * Math.sin(rad));
    px(px0, py0, c); px(px0 + 1, py0, c); px(px0, py0 + 1, c);
  }
  line(x + 14, y0, x + 14, y0 + 18, c, 3); // pillars
  line(x + w - 10, y0, x + w - 10, y0 + 18, c, 3);
  line(x + 4, y0 + 24, x + 4 + w, y0 + 24, SLATE, 2); // water
  line(x + 14, y0 + 30, x + 4 + w - 14, y0 + 30, SLATE, 2);
}

function iconFlags(x: number, y: number, s: number, c: RGB): void {
  const cx = x + s / 2;
  line(cx - 14, y + 8, cx - 14, y + s - 8, c, 3); // left pole
  line(cx + 14, y + 8, cx + 14, y + s - 8, c, 3); // right pole
  fillRect(cx - 14, y + 10, 30, 20, RED); // left flag
  fillRect(cx + 14, y + 10, 30, 20, GOLD); // right flag
  disc(cx + 1, y + 20, 3, PAPER);
  disc(cx + 29, y + 20, 3, PAPER);
}

function iconBallot(x: number, y: number, s: number, c: RGB): void {
  const bx = x + 10;
  const by = y + s - 44;
  fillRect(bx, by, s - 20, 34, c); // box
  fillRect(bx + 8, by + 6, s - 36, 4, PAPER); // slot
  fillRect(x + s / 2 - 14, y + 6, 28, 34, PAPER); // ballot paper
  rectOutline(x + s / 2 - 14, y + 6, 28, 34, c, 2);
  line(x + s / 2 - 8, y + 24, x + s / 2 - 2, y + 32, RED, 3); // check mark
  line(x + s / 2 - 2, y + 32, x + s / 2 + 10, y + 14, RED, 3);
}

function iconVirus(x: number, y: number, s: number, c: RGB): void {
  const cx = x + s / 2;
  const cy = y + s / 2;
  for (let a = 0; a < 10; a++) {
    const rad = (a * Math.PI) / 5;
    line(
      Math.round(cx + 16 * Math.cos(rad)), Math.round(cy + 16 * Math.sin(rad)),
      Math.round(cx + 26 * Math.cos(rad)), Math.round(cy + 26 * Math.sin(rad)),
      c, 3,
    );
    disc(Math.round(cx + 28 * Math.cos(rad)), Math.round(cy + 28 * Math.sin(rad)), 3, c);
  }
  disc(Math.round(cx), Math.round(cy), 16, c);
  disc(Math.round(cx - 5), Math.round(cy - 4), 3, PAPER);
  disc(Math.round(cx + 6), Math.round(cy + 5), 3, PAPER);
}

function iconShield(x: number, y: number, s: number, c: RGB): void {
  const cx = x + s / 2;
  const top = y + 6;
  const bot = y + s - 8;
  // shield outline: two slanted sides meeting at the bottom point
  line(cx - 26, top, cx + 26, top, c, 3);
  line(cx - 26, top, cx - 26, top + 34, c, 3);
  line(cx + 26, top, cx + 26, top + 34, c, 3);
  line(cx - 26, top + 34, cx, bot, c, 3);
  line(cx + 26, top + 34, cx, bot, c, 3);
  // cross inside
  fillRect(cx - 4, top + 12, 8, 26, RED);
  fillRect(cx - 13, top + 19, 26, 8, RED);
}

function iconCraft(x: number, y: number, s: number, c: RGB): void {
  const cx = x + s / 2;
  const cy = y + s / 2;
  // body: triangle pointing up-right
  line(cx - 28, cy + 22, cx + 8, cy - 30, c, 3);
  line(cx + 8, cy - 30, cx + 30, cy + 16, c, 3);
  line(cx + 30, cy + 16, cx - 28, cy + 22, c, 3);
  disc(cx + 4, cy + 0, 7, GOLD);
  line(cx - 34, cy + 28, cx - 50, cy + 40, GOLD, 3); // trail
  line(cx - 28, cy + 32, cx - 44, cy + 48, GOLD, 2);
  disc(cx - 52, cy + 42, 3, GOLD);
}

// ---------------------------------------------------------------------------
// Layout.
// ---------------------------------------------------------------------------
const M = 24; // page margin
const CONTENT_W = W - 2 * M;

interface Story {
  kicker: string;
  headline: string;
  body: string;
  color: RGB;
  icon: (x: number, y: number, s: number, c: RGB) => void;
}

const STORIES: Story[] = [
  {
    kicker: 'MIDDLE EAST',
    headline: 'US STRIKES QESHM ISLAND',
    body: 'IRAN ANSWERS WITH STRIKES ON BAHRAIN AND KUWAIT.',
    color: RED,
    icon: iconBurst,
  },
  {
    kicker: 'UKRAINE',
    headline: 'KERCH BRIDGE HIT AGAIN',
    body: 'A SPAN COLLAPSES ON THE SECOND DAY OF ATTACKS.',
    color: SLATE,
    icon: iconBridge,
  },
  {
    kicker: 'CHINA',
    headline: 'XI AND PUTIN MEET',
    body: 'THE TWO LEADERS HOLD TALKS IN SHENZHEN.',
    color: GOLD,
    icon: iconFlags,
  },
  {
    kicker: 'UNITED STATES',
    headline: 'PELTOLA WINS ALASKA',
    body: 'DEMOCRATS TAKE THE US SENATE, 56-44.',
    color: NAVY2,
    icon: iconBallot,
  },
  {
    kicker: 'HEALTH',
    headline: 'EBOLA PASSES 11,000 CASES',
    body: 'THE OUTBREAK GROWS IN DR CONGO.',
    color: GREEN,
    icon: iconVirus,
  },
  {
    kicker: 'HEALTH',
    headline: 'US LOSES MEASLES-FREE STATUS',
    body: 'HEALTH OFFICIALS CONFIRM THE SETBACK.',
    color: ORANGE,
    icon: iconShield,
  },
  {
    kicker: 'SPACE',
    headline: 'VOYAGER 1 REACHES ONE LIGHT-DAY',
    body: 'THE PROBE IS NOW A LIGHT-DAY FROM EARTH.',
    color: PURPLE,
    icon: iconCraft,
  },
];

function drawPanel(x: number, y: number, w: number, h: number, st: Story, lead: boolean): void {
  fillRect(x, y, w, h, PAPER);
  rectOutline(x, y, w, h, LIGHT, 2);
  // coloured kicker band
  const bandH = lead ? 40 : 34;
  fillRect(x, y, w, bandH, st.color);
  drawText(x + 14, y + (bandH - 14) / 2, st.kicker, 2, PAPER);
  const iconS = lead ? 150 : 92;
  const iconX = x + w - iconS - 14;
  const iconY = y + bandH + Math.floor((h - bandH - iconS) / 2);
  st.icon(iconX, iconY, iconS, st.color);
  // headline + body on the left of the icon
  const tx = x + 14;
  const tw = w - iconS - 14 - 14 - 14;
  const hs = lead ? 4 : 2;
  const headLines = wrapText(st.headline, hs, tw).slice(0, 2);
  const bodyLines = wrapText(st.body, 2, tw).slice(0, 3);
  // Centre the text block vertically in the lead panel so it does not sit
  // high with empty space below; grid panels stay top-aligned.
  const textH = headLines.length * (7 * hs + 4) + 4 + bodyLines.length * (7 * 2 + 3);
  let ty = lead
    ? y + bandH + Math.floor((h - bandH - textH) / 2)
    : y + bandH + 14;
  for (const ln of headLines) {
    drawText(tx, ty, ln, hs, INK);
    ty += 7 * hs + 4;
  }
  ty += 4;
  for (const ln of bodyLines) {
    drawText(tx, ty, ln, 2, INK);
    ty += 7 * 2 + 3;
  }
}

// ---------------------------------------------------------------------------
// Compose the page.
// ---------------------------------------------------------------------------
fillAll(CREAM);

// Masthead band.
fillRect(0, 0, W, 132, NAVY);
fillRect(0, 132, W, 4, GOLD);
drawTextCentered(0, 18, W, 'THE WORLD IN ONE PAGE', 5, CREAM);
drawTextCentered(0, 66, W, 'WEDNESDAY 18 NOVEMBER 2026', 4, GOLD);
drawTextCentered(0, 102, W, 'SEVEN STORIES THAT SHAPED THE DAY', 2, CREAM);

// Lead story (story 1) full width.
drawPanel(M, 152, CONTENT_W, 196, STORIES[0], true);

// Grid: stories 2-7 in 2 columns x 3 rows.
const gridTop = 364;
const gap = 16;
const panelW = Math.floor((CONTENT_W - gap) / 2);
const panelH = 190;
for (let i = 1; i < STORIES.length; i++) {
  const idx = i - 1;
  const col = idx % 2;
  const row = Math.floor(idx / 2);
  drawPanel(
    M + col * (panelW + gap),
    gridTop + row * (panelH + gap),
    panelW,
    panelH,
    STORIES[i],
    false,
  );
}

// Footer.
const footY = gridTop + 3 * panelH + 2 * gap + 12;
drawTextCentered(0, footY, W, 'ALL STORIES VERIFIED FROM NEWS REPORTS  -  18 NOVEMBER 2026', 2, GREY);

// ---------------------------------------------------------------------------
// Write the file.
// ---------------------------------------------------------------------------
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), encodePNG());
