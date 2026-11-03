// Vector redraw of the ZhaoXi mark (assets/icon.png) on a 1024 canvas, laid out
// from the icon itself: an orange→teal ring open at the lower left, 喜 in
// rounded strokes, two hearts and two leaves. Pure data, drawn and animated by
// src/splash/launch-splash.tsx.

export type Pt = readonly [number, number];
/** A stroked path drawn by animating its dash offset: `length` is its exact length. */
export type Stroke = { d: string; length: number };

export const CANVAS = 1024;

export const palette = {
  /** Splash background (= expo-splash-screen backgroundColor): the petrol of every screen header, so the hand-off into Home is seamless. */
  background: "#00323A",
  orange: "#FA8F3E",
  ring: [
    { offset: 0, color: "#F6924A" },
    { offset: 0.3, color: "#EBA247" },
    { offset: 0.55, color: "#A9A85A" },
    { offset: 0.78, color: "#4FA483" },
    { offset: 1, color: "#16A099" },
  ],
  leaf: "#717F47",
  leafShade: "#626F3C",
  vein: "#3B4424",
} as const;

const r2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (p: Pt) => `${r2(p[0])} ${r2(p[1])}`;

/** Path builder that keeps the exact length of lines and quarter-circle corners. */
class Pen {
  private d: string;
  private length = 0;
  private at: Pt;

  constructor(start: Pt) {
    this.d = `M${fmt(start)}`;
    this.at = start;
  }

  line(to: Pt): this {
    this.length += Math.hypot(to[0] - this.at[0], to[1] - this.at[1]);
    this.d += ` L${fmt(to)}`;
    this.at = to;
    return this;
  }

  /** Quarter-circle corner to `to` (|dx| = |dy| = radius); sweep 1 turns clockwise. */
  corner(to: Pt, sweep: 0 | 1): this {
    const radius = Math.abs(to[0] - this.at[0]);
    this.length += (Math.PI * radius) / 2;
    this.d += ` A${r2(radius)} ${r2(radius)} 0 0 ${sweep} ${fmt(to)}`;
    this.at = to;
    return this;
  }

  done(): Stroke {
    return { d: this.d, length: this.length };
  }
}

const line = (from: Pt, to: Pt) => new Pen(from).line(to).done();

// ── Ring ────────────────────────────────────────────────────────────────────
// Opens at the lower left (behind the leaves) and runs clockwise over the top
// to the bottom, orange turning teal on the right-hand side.
const RING_CENTER: Pt = [516, 502];
const RING_RADIUS = 405;
const RING_FROM = 162; // degrees, clockwise from 3 o'clock (screen coordinates)
const RING_SWEEP = 273.5;

function ringStroke(): Stroke {
  const at = (deg: number): Pt => {
    const rad = (deg * Math.PI) / 180;
    return [RING_CENTER[0] + RING_RADIUS * Math.cos(rad), RING_CENTER[1] + RING_RADIUS * Math.sin(rad)];
  };
  const start = at(RING_FROM);
  const end = at(RING_FROM + RING_SWEEP);
  return {
    d: `M${fmt(start)} A${RING_RADIUS} ${RING_RADIUS} 0 ${RING_SWEEP > 180 ? 1 : 0} 1 ${fmt(end)}`,
    length: (RING_RADIUS * RING_SWEEP * Math.PI) / 180,
  };
}

export const ring = {
  ...ringStroke(),
  width: 40,
  /** userSpace gradient axis: a conic sweep is not available in SVG, this line orders the ring's colours start→end. */
  gradient: { x1: 309, y1: 515, x2: 521, y2: 868 },
};

// ── 喜 ─────────────────────────────────────────────────────────────────────
// Twelve strokes in standard order: 士 (一 丨 一), 口 (丨 𠃍 一), 丷 (丶 丿),
// 一, 口 (丨 𠃍 一). Centerlines with round caps, like the rounded sign letters.
export const GLYPH_WIDTH = 38;

function box(left: number, right: number, top: number, bottom: number, radius: number): Stroke[] {
  return [
    // 丨 down the left side, both corners included
    new Pen([left + radius, top]).corner([left, top + radius], 0).line([left, bottom - radius]).corner([left + radius, bottom], 0).done(),
    // 𠃍 across the top and down the right side
    new Pen([left + radius, top]).line([right - radius, top]).corner([right, top + radius], 1).line([right, bottom - radius]).corner([right - radius, bottom], 1).done(),
    // 一 closing the bottom
    line([left + radius, bottom], [right - radius, bottom]),
  ];
}

export const glyph: Stroke[] = [
  line([410, 383], [734, 383]),
  line([562, 353], [562, 439]),
  line([422, 439], [710, 439]),
  ...box(426, 702, 495, 555, 14),
  line([466, 557], [474, 609]),
  line([662, 557], [654, 609]),
  line([390, 611], [742, 611]),
  ...box(416, 712, 665, 725, 22),
];

// ── Hearts ─────────────────────────────────────────────────────────────────
export type Shape = { d: string; center: Pt };

const HEART: Pt[][] = [
  // unit heart, x in [-0.5, 0.5], tip at the bottom; cubic segments after the start point
  [[0, 0.42]],
  [[-0.22, 0.27], [-0.5, 0.07], [-0.5, -0.16]],
  [[-0.5, -0.37], [-0.36, -0.48], [-0.22, -0.48]],
  [[-0.1, -0.48], [-0.03, -0.42], [0, -0.32]],
  [[0.03, -0.42], [0.1, -0.48], [0.22, -0.48]],
  [[0.36, -0.48], [0.5, -0.37], [0.5, -0.16]],
  [[0.5, 0.07], [0.22, 0.27], [0, 0.42]],
];

function heart(center: Pt, size: number, rotateDeg: number): Shape {
  const rad = (rotateDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const map = ([x, y]: Pt): Pt => [center[0] + size * (x * cos - y * sin), center[1] + size * (x * sin + y * cos)];
  const [[start], ...curves] = HEART;
  const d = `M${fmt(map(start!))} ${curves.map((c) => `C${c.map((p) => fmt(map(p))).join(" ")}`).join(" ")} Z`;
  return { d, center };
}

export const hearts = {
  big: heart([436, 254], 112, 12),
  small: heart([316, 338], 90, 30),
};

// ── Leaves ─────────────────────────────────────────────────────────────────
export type Leaf = Shape & { shade: string; veins: string; base: Pt };

/**
 * Leaf pointed at both ends from `base` to `tip`. `shadeSide` (±1) picks the
 * half that gets the darker tone, so each leaf reads as folded along its midrib.
 */
function leaf(base: Pt, tip: Pt, halfWidth: number, shadeSide: 1 | -1): Leaf {
  const length = Math.hypot(tip[0] - base[0], tip[1] - base[1]);
  const ex = (tip[0] - base[0]) / length;
  const ey = (tip[1] - base[1]) / length;
  // u along the leaf, v across it (v > 0 is the side to the right of base→tip on screen)
  const at = (u: number, v: number): string => fmt([base[0] + ex * u * length - ey * v * halfWidth, base[1] + ey * u * length + ex * v * halfWidth]);
  const upper = `C${at(0.16, 1.3)} ${at(0.56, 1.5)} ${at(1, 0)}`;
  const lower = `C${at(0.56, -1.42)} ${at(0.16, -1.24)} ${at(0, 0)}`;
  const d = `M${at(0, 0)} ${upper} ${lower} Z`;
  const shade =
    shadeSide === 1
      ? `M${at(0, 0)} ${upper} L${at(0, 0)} Z`
      : `M${at(1, 0)} ${lower} L${at(1, 0)} Z`;
  const veins = [
    `M${at(0.08, 0)} Q${at(0.5, 0.1)} ${at(0.88, 0)}`,
    ...[0.34, 0.56].flatMap((u) => [`M${at(u, 0.04)} Q${at(u + 0.08, 0.3)} ${at(u + 0.16, 0.55)}`, `M${at(u + 0.06, 0.03)} Q${at(u + 0.14, -0.28)} ${at(u + 0.22, -0.52)}`]),
  ].join(" ");
  return { d, shade, veins, base, center: [(base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2] };
}

export const leaves = {
  left: leaf([330, 868], [56, 640], 72, -1),
  right: leaf([310, 746], [626, 970], 78, 1),
};

export const VEIN_WIDTH = 5;
