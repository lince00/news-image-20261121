// news-image-20261121 — "The World Today: Saturday 21 November 2026"
// A program that draws, in code only, a one-page newspaper front page
// summing up Saturday 21 November 2026's world news, and writes it to
// /output/entry.png. Node 22 standard library only. No network, no clock,
// no randomness: two runs write byte-identical output.
//
// Layout (1024x1024): masthead with the date, 12 featured stories
// (headline + summary) in two columns, a numbered world map, 23 more
// stories in a numbered list, a markets strip and a sources footer.
// All 35 stories were first reported on Saturday 21 November 2026.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";
import * as crypto from "node:crypto";

// ---------------------------------------------------------------- font
// A 5x7 bitmap font, drawn from first principles: each glyph is 7 rows
// of 5 bits, "1" = ink. Only the characters the page uses are defined.

type Glyph = string[];

const FONT: Record<string, Glyph> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "10110", "11001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10000", "10000", "10001", "01110"],
  d: ["00001", "00001", "01101", "10011", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01001", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01111", "10001", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "10110", "11001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "00010", "10010"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "10110", "11001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "00000", "10110", "11001", "10001", "11110", "10000"],
  q: ["00000", "00000", "01101", "10011", "10001", "01111", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["01000", "01000", "11100", "01000", "01000", "01001", "00110"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "\u2013": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "\u2014": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "*": ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01110"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "<": ["00010", "00100", "01000", "10000", "01000", "00100", "00010"],
  ">": ["01000", "00100", "00010", "00001", "00010", "00100", "01000"],
  "\u00b7": ["00000", "00000", "00000", "00000", "01100", "01100", "00000"],
  "\u2022": ["00000", "00100", "01110", "01110", "01110", "00100", "00000"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
};

const CHAR_W = 5;
const CHAR_H = 7;

function textWidth(s: string, scale: number): number {
  let w = 0;
  for (const ch of s) {
    if (!FONT[ch]) throw new Error("missing glyph: " + JSON.stringify(ch));
    w += (CHAR_W + 1) * scale;
  }
  return w > 0 ? w - scale : 0;
}

function wrapText(s: string, scale: number, maxW: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (textWidth(trial, scale) <= maxW || !cur) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------- canvas
// A plain RGB pixel buffer with rectangle, circle, polygon and text
// drawing, plus a minimal PNG writer (zlib deflate + CRC32, stdlib only).

type RGB = [number, number, number];

const PAPER: RGB = [253, 251, 244];
const INK: RGB = [26, 26, 26];
const RED: RGB = [178, 28, 28];
const BLUE: RGB = [30, 58, 95];
const GREY: RGB = [110, 110, 104];
const LAND: RGB = [214, 222, 208];
const LAND_EDGE: RGB = [120, 130, 115];
const SEA: RGB = [226, 234, 240];
const RULE: RGB = [26, 26, 26];

const W = 1024;
const H = 1024;

class Canvas {
  buf: Buffer;
  constructor() {
    this.buf = Buffer.alloc(W * H * 3);
    for (let i = 0; i < W * H; i++) {
      this.buf[i * 3] = PAPER[0];
      this.buf[i * 3 + 1] = PAPER[1];
      this.buf[i * 3 + 2] = PAPER[2];
    }
  }
  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }
  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
  }
  hline(x0: number, x1: number, y: number, c: RGB, t = 1): void {
    for (let t0 = 0; t0 < t; t0++) for (let x = x0; x <= x1; x++) this.set(x, y + t0, c);
  }
  vline(x: number, y0: number, y1: number, c: RGB, t = 1): void {
    for (let t0 = 0; t0 < t; t0++) for (let y = y0; y <= y1; y++) this.set(x + t0, y, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.set(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }
  circle(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r * r) this.set(x, y, c);
      }
    }
  }
  ring(cx: number, cy: number, r: number, c: RGB): void {
    for (let a = 0; a < 360; a++) {
      const rad = (a * Math.PI) / 180;
      this.set(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
    }
  }
  // Scanline fill of a polygon given as [x, y] points.
  polygon(pts: [number, number][], fill: RGB, edge: RGB): void {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) this.set(x, y, fill);
      }
    }
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      this.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), edge);
    }
  }
  glyph(ch: string, x: number, y: number, scale: number, c: RGB): void {
    const g = FONT[ch];
    if (!g) throw new Error("missing glyph: " + JSON.stringify(ch));
    for (let r = 0; r < CHAR_H; r++) {
      for (let col = 0; col < CHAR_W; col++) {
        if (g[r][col] === "1") {
          this.rect(x + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
  }
  text(s: string, x: number, y: number, scale: number, c: RGB): number {
    let cx = x;
    for (const ch of s) {
      this.glyph(ch, cx, y, scale, c);
      cx += (CHAR_W + 1) * scale;
    }
    return cx;
  }
  textCentered(s: string, cx: number, y: number, scale: number, c: RGB): void {
    this.text(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
  }
}

// ---------------------------------------------------------------- PNG out
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function writePng(cv: Canvas): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter none
    cv.buf.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- stories
// 35 real stories, all first reported on Saturday 21 November 2026.
// Headlines and summaries are my own wording of the reported facts.

interface Story {
  n: number;
  headline: string;
  summary: string;
  lon: number;
  lat: number;
}

const FEATURED: Story[] = [
  {
    n: 1,
    headline: "Magnitude 6.8 quake shakes Peru",
    summary:
      "The Andean region of Junin jolts at 00:09 UTC; tremors shake Lima, 320 km away, sending residents into the streets. No casualties reported.",
    lon: -75,
    lat: -12,
  },
  {
    n: 2,
    headline: "Gen Z takes to the streets across Europe",
    summary:
      "Thousands rally in 25 countries against living costs, military spending and the climate crisis, with more action planned for Sunday.",
    lon: 10,
    lat: 50,
  },
  {
    n: 3,
    headline: "Saudi coalition downs Houthi missiles",
    summary:
      "Three missiles fired at Riyadh are intercepted and Hodeidah is struck; Iran's Guard claims it downed a US MQ-9 drone over Hormuz.",
    lon: 47,
    lat: 25,
  },
  {
    n: 4,
    headline: "COP31 deal stalls in Antalya",
    summary:
      "Climate talks risk ending with no agreement on fossil fuels or finance as negotiators struggle over the final text.",
    lon: 31,
    lat: 37,
  },
  {
    n: 5,
    headline: "Trump: bring back Jensen Huang",
    summary:
      "The US president calls on Nvidia to reinstate its 'brilliant' former chief executive and urges him to 'make a big apology'.",
    lon: -122,
    lat: 37,
  },
  {
    n: 6,
    headline: "Denmark expels Russian diplomat",
    summary:
      "Copenhagen accuses Moscow of plotting to kill a US-Ukrainian rapper with a banned local gang; Russia says there is no evidence.",
    lon: 12.5,
    lat: 55.7,
  },
  {
    n: 7,
    headline: "Record foreign cash floods Indian shares",
    summary:
      "Overseas investors put a net Rs 1.22 lakh crore into Indian equities in November, the biggest monthly inflow on record.",
    lon: 77,
    lat: 21,
  },
  {
    n: 8,
    headline: "Rahul completes the SENA set",
    summary:
      "KL Rahul's 100 in Wellington makes him the first Indian opener with Test centuries in South Africa, England, New Zealand and Australia.",
    lon: 174.8,
    lat: -41.3,
  },
  {
    n: 9,
    headline: "Cyberattack hits JPMorgan, Visa, Mastercard",
    summary:
      "The banking giants report incidents at third-party vendors; they say their core payment networks were not affected.",
    lon: -74,
    lat: 40.7,
  },
  {
    n: 10,
    headline: "Russia targets Kyiv crossings",
    summary:
      "Fresh strikes hit the capital's crossings days after Ukraine struck the Crimean Bridge; allies hold a military exercise nearby.",
    lon: 30.5,
    lat: 50.5,
  },
  {
    n: 11,
    headline: "Nepal's PM heads to Delhi on first trip",
    summary:
      "Balendra Shah begins his first foreign visit as prime minister, a two-day state visit to India starting on Sunday.",
    lon: 77.2,
    lat: 28.6,
  },
  {
    n: 12,
    headline: "French police sentenced over Zecler beating",
    summary:
      "Officers are sentenced for the 2020 beating of music producer Michel Zecler, a case that sparked protests across France.",
    lon: 2.35,
    lat: 48.85,
  },
];

const ALSO: string[] = [
  "US lawmakers push tougher AI chip rules amid China export crackdown",
  "Trump defends Putin ties; AI data centres must stay in US, he says",
  "Trump praises India's growth and low rates, criticises the Fed",
  "Israeli drone attacks kill seven Palestinians in central Gaza",
  "Gaza's displaced children mark World Children's Day",
  "Two Salvadoran soldiers killed in Haiti while handling explosives",
  "Mourners' boat capsizes in Nigeria; at least four dead",
  "Rahul Gandhi backs strong India-Israel ties despite Gaza war",
  "Africa's new credit agency aims to change how the continent is rated",
  "US declassifies more UFO footage filmed in the Middle East",
  "Indian man jailed 19+ years over plot to kill US-based Sikh leader",
  "Depardieu and French author investigated over sexual allegations",
  "COP31 AI pledge fails to attract major US tech companies",
  "2027 Hyundai Elantra unveiled at the Los Angeles Auto Show",
  "Sensex rallies nearly 898 points to end the week higher",
  "Modi to launch Rs 34,470-crore projects in Bihar; IIT Kharagpur jubilee",
  "IFFI Goa opens Indian Panorama with 'Dhurandhar'",
  "Lakshya Sen faces Antonsen in Hong Kong Open semi-final",
  "Erigaisi, Praggnanandhaa win; Vaishali loses in chess classification",
  "Advani, Ramachandran win World Snooker Championship openers",
  "Tom Brady buys a Chelsea stake after leaving Birmingham",
  "Tuas Port phase 2 breaks ground in Singapore: 21 berths, 1,000 robots",
  "Malaysia tops 10,000 screenings for World Diabetes Day",
];

// ---------------------------------------------------------------- map
// Schematic continents: rough lon/lat outlines, equirectangular.
// Drawn from general geography, simplified for a 976x140 strip.

type LonLat = [number, number];

const CONTINENTS: LonLat[][] = [
  // North America
  [
    [-168, 66], [-150, 70], [-135, 69], [-125, 71], [-115, 68], [-105, 68],
    [-95, 69], [-88, 66], [-82, 62], [-78, 62], [-70, 60], [-65, 60],
    [-60, 55], [-55, 47], [-60, 45], [-65, 44], [-70, 42], [-75, 38],
    [-80, 32], [-81, 26], [-84, 30], [-89, 21], [-94, 18], [-97, 16],
    [-92, 14], [-87, 13], [-82, 9], [-78, 7], [-83, 9], [-90, 14],
    [-96, 16], [-104, 20], [-110, 23], [-114, 28], [-119, 33], [-124, 40],
    [-125, 49], [-130, 55], [-140, 60], [-152, 58], [-162, 58], [-168, 66],
  ],
  // South America
  [
    [-77, 7], [-75, 10], [-71, 12], [-64, 10], [-60, 8], [-53, 5],
    [-50, 0], [-44, -3], [-38, -5], [-35, -9], [-39, -15], [-41, -22],
    [-48, -27], [-54, -34], [-58, -38], [-65, -41], [-68, -50], [-70, -54],
    [-73, -50], [-73, -42], [-73, -35], [-72, -28], [-70, -20], [-76, -14],
    [-81, -7], [-81, -3], [-80, 1], [-77, 7],
  ],
  // Europe
  [
    [-10, 36], [-9, 43], [-2, 47], [-1, 49], [2, 51], [5, 53], [8, 57],
    [10, 59], [6, 60], [6, 62], [12, 65], [18, 69], [24, 71], [30, 70],
    [38, 68], [44, 68], [41, 64], [36, 61], [30, 60], [28, 56], [30, 52],
    [28, 47], [30, 44], [28, 41], [24, 40], [22, 37], [20, 40], [19, 42],
    [14, 44], [10, 44], [7, 44], [3, 42], [0, 39], [-2, 37], [-6, 36],
    [-10, 36],
  ],
  // Africa
  [
    [-6, 35], [0, 36], [10, 37], [11, 34], [19, 32], [30, 31], [32, 31],
    [34, 28], [36, 23], [37, 20], [39, 18], [43, 12], [48, 11], [51, 10],
    [45, 5], [41, 0], [39, -5], [36, -12], [35, -18], [33, -26], [28, -33],
    [20, -35], [17, -30], [13, -19], [12, -10], [10, -3], [9, 4], [4, 6],
    [-8, 4], [-13, 8], [-16, 14], [-17, 20], [-15, 25], [-10, 31], [-6, 35],
  ],
  // Asia (mainland, simplified)
  [
    [30, 42], [34, 41], [38, 39], [42, 39], [44, 41], [48, 39], [50, 37],
    [54, 37], [57, 37], [61, 37], [60, 33], [58, 29], [56, 26], [54, 24],
    [51, 25], [50, 29], [48, 30], [52, 28], [56, 27], [59, 25], [62, 25],
    [66, 25], [70, 24], [72, 21], [75, 17], [77, 13], [80, 10], [77, 8],
    [80, 7], [84, 11], [87, 15], [89, 22], [91, 22], [93, 20], [94, 17],
    [97, 16], [99, 13], [101, 10], [104, 8], [105, 3], [103, 1], [100, 6],
    [98, 9], [97, 13], [94, 17], [92, 21], [89, 22], [87, 21], [85, 19],
    [83, 18], [80, 16], [79, 14], [77, 11], [75, 12], [73, 16], [70, 20],
    [67, 23], [64, 25], [61, 25], [58, 26], [55, 27], [52, 28], [50, 29],
    [48, 30], [51, 32], [54, 35], [57, 37], [60, 38], [63, 40], [66, 41],
    [69, 42], [72, 43], [75, 43], [78, 45], [81, 47], [85, 49], [89, 50],
    [93, 52], [97, 53], [101, 54], [105, 55], [109, 56], [113, 58], [118, 60],
    [123, 62], [128, 64], [133, 65], [138, 66], [143, 68], [148, 69],
    [153, 69], [158, 69], [162, 66], [166, 65], [170, 66], [173, 64],
    [170, 62], [165, 60], [160, 58], [156, 56], [152, 54], [148, 52],
    [144, 50], [141, 48], [138, 46], [135, 43], [132, 43], [130, 42],
    [128, 40], [126, 38], [124, 37], [122, 38], [120, 36], [118, 34],
    [116, 32], [114, 30], [112, 28], [110, 26], [108, 24], [106, 22],
    [104, 21], [102, 20], [100, 18], [98, 15], [96, 15], [94, 17],
    [92, 21], [90, 22], [88, 22], [86, 20], [84, 18], [82, 17], [80, 14],
    [78, 10], [76, 9], [74, 12], [72, 17], [70, 20], [68, 22], [66, 24],
    [64, 25], [62, 25], [60, 25], [58, 25], [56, 26], [54, 24], [52, 26],
    [50, 29], [48, 30], [47, 31], [44, 33], [42, 35], [40, 37], [38, 38],
    [36, 36], [34, 38], [32, 40], [30, 42],
  ],
  // Australia
  [
    [113, -22], [114, -30], [115, -33], [118, -35], [124, -33], [129, -32],
    [132, -32], [135, -35], [138, -35], [140, -38], [145, -38], [150, -37],
    [153, -32], [153, -27], [150, -22], [146, -19], [142, -15], [142, -11],
    [137, -12], [135, -15], [132, -12], [130, -13], [126, -14], [122, -17],
    [118, -20], [113, -22],
  ],
  // Greenland
  [
    [-55, 60], [-50, 64], [-45, 60], [-40, 64], [-35, 68], [-28, 70],
    [-20, 70], [-25, 76], [-35, 76], [-45, 74], [-55, 70], [-58, 64],
  ],
  // United Kingdom
  [
    [-5, 50], [-3, 53], [-5, 56], [-3, 58], [-1, 57], [0, 53], [1, 51],
    [-3, 50],
  ],
  // Japan
  [
    [130, 31], [132, 33], [135, 34], [138, 35], [140, 36], [141, 38],
    [142, 41], [144, 44], [142, 45], [140, 42], [139, 38], [137, 36],
    [134, 34], [131, 32],
  ],
  // Indonesia
  [
    [95, 5], [100, 0], [105, -5], [110, -7], [115, -8], [120, -9],
    [125, -9], [130, -4], [135, -3], [140, -4], [141, -8], [136, -6],
    [130, -3], [125, 0], [120, 0], [115, 0], [110, 2], [105, 3], [100, 4],
  ],
  // New Zealand
  [
    [167, -45], [170, -42], [173, -40], [176, -38], [178, -38], [175, -40],
    [172, -43], [168, -46],
  ],
  // Madagascar
  [
    [44, -16], [47, -15], [50, -16], [49, -20], [47, -24], [44, -25],
    [43, -21],
  ],
];

// ---------------------------------------------------------------- layout
const MARGIN = 24;
const COL_W = 476;
const COL_X = [MARGIN, MARGIN + COL_W + 28];

function drawBadge(cv: Canvas, n: number, x: number, y: number): void {
  cv.rect(x, y, 20, 20, RED);
  const s = String(n);
  const tw = textWidth(s, 1);
  cv.text(s, x + Math.floor((20 - tw) / 2), y + 6, 1, [255, 255, 255]);
}

function drawFeatured(cv: Canvas, y0: number): number {
  cv.text("THE DAY IN BRIEF", MARGIN, y0, 1, RED);
  cv.hline(MARGIN, W - MARGIN, y0 + 11, RULE, 2);
  const top = y0 + 20;
  const blockH = 60;
  for (let col = 0; col < 2; col++) {
    for (let row = 0; row < 6; row++) {
      const st = FEATURED[col * 6 + row];
      const x = COL_X[col];
      const y = top + row * blockH;
      drawBadge(cv, st.n, x, y);
      const tx = x + 28;
      const tw = COL_W - 28;
      const hl = wrapText(st.headline, 2, tw);
      let hy = y;
      for (const line of hl.slice(0, 2)) {
        cv.text(line, tx, hy, 2, INK);
        hy += 16;
      }
      const sy = hy + 1;
      const sl = wrapText(st.summary, 1, tw);
      let yy = sy;
      for (const line of sl.slice(0, 2)) {
        cv.text(line, tx, yy, 1, [70, 70, 66]);
        yy += 10;
      }
      if (hl.length > 2 || sl.length > 2) {
        console.warn("overflow story", st.n, "headline lines", hl.length, "summary lines", sl.length);
      }
    }
  }
  return top + 6 * blockH;
}

function drawMap(cv: Canvas, y0: number): number {
  cv.text("WHERE IT HAPPENED", MARGIN, y0, 1, RED);
  cv.hline(MARGIN, W - MARGIN, y0 + 11, RULE, 2);
  const mapX = MARGIN;
  const mapY = y0 + 18;
  const mapW = W - 2 * MARGIN;
  const mapH = 138;
  cv.rect(mapX, mapY, mapW, mapH, SEA);
  const proj = (lon: number, lat: number): [number, number] => [
    Math.round(mapX + ((lon + 180) / 360) * mapW),
    Math.round(mapY + ((84 - lat) / 168) * mapH),
  ];
  for (const poly of CONTINENTS) {
    cv.polygon(
      poly.map(([lon, lat]) => proj(lon, lat)),
      LAND,
      LAND_EDGE,
    );
  }
  // Numbered markers for the 12 featured stories, in story order.
  // Two passes: all discs first, then all numbers, so overlapping
  // discs never hide a neighbouring number.
  const marks: [number, number, string][] = [];
  for (const st of FEATURED) {
    const [px, py] = proj(st.lon, st.lat);
    cv.circle(px, py, 10, RED);
    cv.ring(px, py, 10, [255, 255, 255]);
    marks.push([px, py, String(st.n)]);
  }
  for (const [px, py, s] of marks) {
    const tw = textWidth(s, 1);
    cv.text(s, px - Math.floor(tw / 2), py - 3, 1, [255, 255, 255]);
  }
  return mapY + mapH;
}

function drawAlso(cv: Canvas, y0: number): number {
  cv.text("ALSO ON SATURDAY", MARGIN, y0, 1, RED);
  cv.hline(MARGIN, W - MARGIN, y0 + 11, RULE, 2);
  const top = y0 + 20;
  const rowH = 14;
  for (let col = 0; col < 2; col++) {
    const items = ALSO.slice(col * 12, col * 12 + 12);
    for (let i = 0; i < items.length; i++) {
      const n = 13 + col * 12 + i;
      let line = n + ". " + items[i];
      // Trim to the column width so nothing runs off the page.
      while (textWidth(line, 1) > COL_W && line.length > 4) {
        line = line.slice(0, -4) + "\u2026";
      }
      cv.text(line, COL_X[col], top + i * rowH, 1, INK);
    }
  }
  return top + 12 * rowH;
}

function drawPage(): Canvas {
  const cv = new Canvas();
  // Masthead
  cv.hline(MARGIN, W - MARGIN, 14, RULE, 3);
  cv.textCentered("THE WORLD TODAY", W / 2, 26, 4, INK);
  cv.textCentered("Saturday 21 November 2026", W / 2, 62, 2, RED);
  cv.textCentered(
    "35 stories from around the world, all first reported on this day",
    W / 2,
    86,
    1,
    GREY,
  );
  cv.hline(MARGIN, W - MARGIN, 102, RULE, 2);

  let y = drawFeatured(cv, 112);
  y = drawMap(cv, y + 8);
  y = drawAlso(cv, y + 10);

  // Markets strip (Friday's close, reported on Saturday)
  const my = y + 8;
  cv.hline(MARGIN, W - MARGIN, my, RULE, 2);
  cv.text(
    "MARKETS (Friday close): S&P 500 6,910 -3.7%  Nasdaq 22,618 -5.3%  Dow 48,147 -1.9%  Sensex +898  Bitcoin below $60,000  Gold worst week in 8 months",
    MARGIN,
    my + 9,
    1,
    BLUE,
  );
  // Footer
  const fy = my + 28;
  cv.hline(MARGIN, W - MARGIN, fy, RULE, 1);
  cv.text(
    "Sources: Reuters, AP, BBC, Al Jazeera, AFP, NDTV, The Daily Short, WION, IMD.",
    MARGIN,
    fy + 8,
    1,
    GREY,
  );
  cv.text(
    "Image drawn in code - no photographs. Every story above was first reported on Saturday 21 November 2026.",
    MARGIN,
    fy + 21,
    1,
    GREY,
  );
  cv.hline(MARGIN, W - MARGIN, fy + 36, RULE, 3);
  return cv;
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const cv = drawPage();
  const png = writePng(cv);
  const outPath = path.join(outDir, "entry.png");
  fs.writeFileSync(outPath, png);
  const sha = crypto.createHash("sha256").update(png).digest("hex");
  console.log("wrote", outPath, png.length, "bytes, sha256", sha);
  if (png.length > 1048576) throw new Error("entry.png exceeds 1 MiB");
}

main();
