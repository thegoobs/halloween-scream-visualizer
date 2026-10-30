import { getTheme } from "./theme.js";

// A bone is two knobby end caps (never stretched, so the knobs stay round) joined
// by a shaft that stretches with the bar's level. All paths live in a 0..1 unit box and are
// traced straight onto the canvas each frame (no per-frame Path2D/DOMMatrix allocation).

// End cap, drawn at the top of the bone (flipped for the bottom).
// Top edge y=0 has two lobes with a notch; bottom edge y=1 meets the shaft at x 0.32..0.68.
export const CAP_PATH =
  "M0.25 1 L0.25 0.7 C0.15 0.72 0 0.62 0 0.35 C0 0.12 0.2 0 0.36 0.1 " +
  "C0.44 0.15 0.47 0.25 0.5 0.3 C0.53 0.25 0.56 0.15 0.64 0.1 " +
  "C0.8 0 1 0.12 1 0.35 C1 0.62 0.85 0.72 0.75 0.7 L0.75 1 Z";
// Shaft with a slight waist.
export const SHAFT_PATH = "M0 0 L1 0 Q0.7 0.5 1 1 L0 1 Q0.3 0.5 0 0 Z";

const GAP = 0.2; // fraction of each bar slot left empty
const CAP_ASPECT = 0.8; // cap height as a fraction of bar width
const SHAFT_X = 0.25; // shaft inset / width, matching the cap's neck
const SHAFT_W = 0.5;
const OUTLINE = 3; // px, before pixel ratio
const PEAK_EMOJI = "💀"; // peak-hold marker that bounces above each bone
const PEAK_SCALE = 1.1; // emoji size as a fraction of bar width
const PEAK_MIN = 16; // px, before pixel ratio
const WIGGLE_PHASE = 1.7; // radians between neighbouring bones so they don't move in lockstep
const SPRITE_PAD = 1.5; // sprite canvas size as a multiple of the emoji font size
const SPRITE_CACHE_MAX = 32;
const GRID_STEP = 10; // dB between y-axis labels
const HELD_FLOOR = 0.04; // fraction of chart height below which a bone is dropped

// Custom bar renderer. audioMotion only supplies the analysis (useCanvas: false);
// each bar is a cartoon bone built from the SVG path strings above, redrawn every frame.
// Swap the path strings / colors above to restyle.
//
// Module-level state, because drawBars is a bare callback called by audioMotion each frame.
// Visualizer pushes values in through the setters below.

// Live-tunable animation levers (see defines/settings.js), pushed in through setAnimation.
const animation = {
  boneHoldMs: 500,
  boneFallMs: 125,
  orangeRampDb: 25,
  wiggleDeg: 1,
  wiggleHz: 6,
};

// Bones are cream until they get close to the scream threshold, then fade to pumpkin orange,
// reaching full orange at the threshold line itself ("you're almost there"). Tied to the
// threshold (not a fixed screen height) so the change is visible however quiet it's set.
let gradient = null;
let gradientKey = "";

// Scream threshold (dBFS): drives the bone color change, and is also drawn as a line on the
// chart when `thresholdVisible`.
let thresholdDb = -20;
let thresholdVisible = true;

// Overall loudness (RMS dBFS, the same number the meter and the scream trigger use).
// Drawn as a line on the chart so it can be compared with the threshold line directly;
// the bones are per-frequency-band levels, which sit far below the overall level.
let levelDb = null;

// Bones rise instantly, hold at their top for a moment, then sink slowly. Done here rather than
// via the analyzer's `smoothing`, which would slow the rise as well.
let held = []; // per-bone displayed value (0-1)
let heldAt = []; // timestamp each bone last reached its current top
let lastDrawAt = 0;

// Skull emoji pre-rendered once per size. Drawing a color-emoji glyph with fillText every frame
// is slow, especially on a rotated canvas, so it is rendered to a sprite and blitted instead.
const skullSprites = new Map();

export const setAnimation = (values) => Object.assign(animation, values);

export const setThreshold = (db, visible) => {
  thresholdDb = db;
  thresholdVisible = visible;
};

export const setLevelLine = (db) => {
  levelDb = db;
};

const getGradient = (ctx, height, threshold, min, max) => {
  const key = `${height}|${threshold}|${min}|${max}|${animation.orangeRampDb}`;
  const span = max - min;
  // Gradient positions: 0 = bottom of chart, 1 = top.
  const end = Math.min(1, Math.max(0, (threshold - min) / span));
  const start = Math.max(0, end - animation.orangeRampDb / span);
  const { bone, hot } = getTheme();

  if (key !== gradientKey) {
    gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, bone); // bone
    gradient.addColorStop(start, bone);
    gradient.addColorStop(end, hot); // loud = glowing pumpkin orange
    gradientKey = key;
  }

  return gradient;
};

// Path strings are parsed once into [{ cmd, nums }] so they can be replayed onto the context.
const parsePath = (d) => {
  const ops = [];
  const tokens = d.match(/[MLCQZ]|-?\d*\.?\d+/g);
  let op = null;

  for (let i = 0; i < tokens.length; i++) {
    if (/[A-Z]/.test(tokens[i])) {
      op = { cmd: tokens[i], nums: [] };
      ops.push(op);
    } else {
      op.nums.push(Number(tokens[i]));
    }
  }

  return ops;
};

const CAP_OPS = parsePath(CAP_PATH);
const SHAFT_OPS = parsePath(SHAFT_PATH);

// Replay unit-box `ops` into the box at (ox, oy) scaled by (sx, sy); negative sy flips vertically.
// Done by transforming the points rather than the context, so fillStyle gradients stay in canvas
// space and the outline keeps a uniform width instead of being stretched with the shape.
const tracePath = (ctx, ops, ox, oy, sx, sy) => {
  let n = null;

  for (let i = 0; i < ops.length; i++) {
    n = ops[i].nums;

    if (ops[i].cmd === "M") {
      ctx.moveTo(ox + n[0] * sx, oy + n[1] * sy);
    } else if (ops[i].cmd === "L") {
      ctx.lineTo(ox + n[0] * sx, oy + n[1] * sy);
    } else if (ops[i].cmd === "C") {
      ctx.bezierCurveTo(
        ox + n[0] * sx,
        oy + n[1] * sy,
        ox + n[2] * sx,
        oy + n[3] * sy,
        ox + n[4] * sx,
        oy + n[5] * sy,
      );
    } else if (ops[i].cmd === "Q") {
      ctx.quadraticCurveTo(ox + n[0] * sx, oy + n[1] * sy, ox + n[2] * sx, oy + n[3] * sy);
    } else {
      ctx.closePath();
    }
  }
};

// Add one half of a bone to the current path. The top cap + shaft share a winding direction; the
// flipped bottom cap winds the other way, so it is filled separately (nonzero fill would cancel
// where they overlap and leave a seam).
const traceBone = (ctx, x, w, top, bottom, flipped) => {
  const h = bottom - top;
  const cap = Math.min(w * CAP_ASPECT, h / 2);
  const shaftH = h - 2 * cap;

  if (flipped) {
    tracePath(ctx, CAP_OPS, x, bottom, w, -cap);
  } else {
    tracePath(ctx, CAP_OPS, x, top, w, cap);

    if (shaftH > 0) {
      // 1px overlap each side hides seams between shaft and caps
      tracePath(ctx, SHAFT_OPS, x + SHAFT_X * w, top + cap - 1, SHAFT_W * w, shaftH + 2);
    }
  }
};

const getSkull = (size) => {
  const key = Math.round(size);
  let sprite = skullSprites.get(key);
  let sctx = null;

  if (!sprite) {
    if (skullSprites.size >= SPRITE_CACHE_MAX) {
      skullSprites.clear();
    }

    sprite = document.createElement("canvas");
    sprite.width = Math.ceil(key * SPRITE_PAD);
    sprite.height = Math.ceil(key * SPRITE_PAD);
    sctx = sprite.getContext("2d");
    sctx.font = `${key}px sans-serif`;
    sctx.textAlign = "center";
    sctx.textBaseline = "bottom";
    sctx.fillText(PEAK_EMOJI, sprite.width / 2, sprite.height);
    skullSprites.set(key, sprite);
  }

  return sprite;
};

const levelToY = (db, min, max, H) => H - ((db - min) / (max - min)) * H;

// y-axis: faint gridlines with dB labels, drawn behind the bones.
const drawYAxis = (ctx, min, max, W, H, pr) => {
  const { grid, label } = getTheme();

  ctx.font = `${11 * pr}px sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.lineWidth = pr;
  ctx.strokeStyle = grid;
  ctx.fillStyle = label;

  for (let db = Math.ceil(min / GRID_STEP) * GRID_STEP; db < max; db += GRID_STEP) {
    const y = levelToY(db, min, max, H);

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.fillText(`${db} dB`, 6 * pr, y - 2 * pr);
  }
};

// Dashed threshold line with its own label, drawn above the bones.
const drawThreshold = (ctx, db, min, max, W, H, pr) => {
  const { hot } = getTheme();

  if (db != null && db >= min && db <= max) {
    const y = levelToY(db, min, max, H);

    ctx.setLineDash([8 * pr, 6 * pr]);
    ctx.lineWidth = 2 * pr;
    ctx.strokeStyle = hot;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `bold ${12 * pr}px sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = hot;
    ctx.fillText(`scream ${db} dB`, W - 8 * pr, y - 3 * pr);
  }
};

// Solid overall-level line with a label on the left (the threshold label is on the right).
const drawLevel = (ctx, db, min, max, W, H, pr) => {
  const { volume } = getTheme();

  if (db != null) {
    const y = levelToY(Math.min(max, Math.max(min, db)), min, max, H);

    ctx.lineWidth = 2 * pr;
    ctx.strokeStyle = volume;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.font = `bold ${12 * pr}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = volume;
    ctx.fillText(`volume ${db.toFixed(0)} dB`, 8 * pr, y - 3 * pr);
  }
};

const updateHeld = (bars, now) => {
  const dt = lastDrawAt ? now - lastDrawAt : 0;

  lastDrawAt = now;

  if (held.length !== bars.length) {
    held = new Array(bars.length).fill(0);
    heldAt = new Array(bars.length).fill(now);
  }

  for (let i = 0; i < bars.length; i++) {
    const v = bars[i].value[0];

    if (v >= held[i]) {
      held[i] = v;
      heldAt[i] = now;
    } else if (now - heldAt[i] > animation.boneHoldMs) {
      held[i] = Math.max(v, held[i] * Math.exp(-dt / animation.boneFallMs));
    }

    // The exponential drop never reaches zero on its own; snap tiny values to nothing so a
    // bone (and its skull) is gone for good instead of shrinking forever.
    if (held[i] < HELD_FLOOR) {
      held[i] = 0;
    }
  }
};

// onCanvasDraw callback for audioMotion-analyzer.
export const drawBars = (instance) => {
  const { canvas, canvasCtx: ctx, pixelRatio, minDecibels: min, maxDecibels: max } = instance;
  const W = canvas.width;
  const H = canvas.height;
  const bars = instance.getBars();
  const now = performance.now();
  const wiggleT = (now / 1000) * animation.wiggleHz * 2 * Math.PI;
  const { chartBackground, boneOutline } = getTheme();
  const fill = getGradient(ctx, H, thresholdDb, min, max);

  ctx.fillStyle = chartBackground;
  ctx.fillRect(0, 0, W, H);
  drawYAxis(ctx, min, max, W, H, pixelRatio);
  updateHeld(bars, now);

  ctx.lineJoin = "round";
  ctx.lineWidth = OUTLINE * 2 * pixelRatio; // half is covered by the fill

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const next = bars[i + 1];
    // Bones in the orange zone wiggle about their base, more the closer they get to the
    // threshold (0 at the start of the fade, full at the threshold).
    const ramp = animation.orangeRampDb;
    const db = min + held[i] * (max - min);
    const closeness = Math.min(1, Math.max(0, (db - (thresholdDb - ramp)) / ramp));
    const angle =
      closeness * animation.wiggleDeg * (Math.PI / 180) * Math.sin(wiggleT + i * WIGGLE_PHASE);
    const h = held[i] * H;
    const peak = Math.max(bar.peak[0], held[i]); // skull never sinks below its bone
    let sprite = null;
    let slot = W;
    let w = 0;
    let x = 0;

    if (next) {
      slot = next.posX - bar.posX;
    } else if (i > 0) {
      slot = bar.posX - bars[i - 1].posX || W;
    }
    w = slot * (1 - GAP);
    x = bar.posX + (slot - w) / 2;

    ctx.save();

    if (angle) {
      ctx.translate(x + w / 2, H);
      ctx.rotate(angle);
      ctx.translate(-(x + w / 2), -H);
    }

    if (h >= 2) {
      // Stroke everything first, then fill on top: gives one outline around the union.
      ctx.strokeStyle = boneOutline;
      ctx.beginPath();
      traceBone(ctx, x, w, H - h, H, false);
      traceBone(ctx, x, w, H - h, H, true);
      ctx.stroke();

      ctx.fillStyle = fill;
      ctx.beginPath();
      traceBone(ctx, x, w, H - h, H, false);
      ctx.fill();
      ctx.beginPath();
      traceBone(ctx, x, w, H - h, H, true);
      ctx.fill();
    }

    if (peak > 0.01) {
      sprite = getSkull(Math.max(w * PEAK_SCALE, PEAK_MIN * pixelRatio));
      ctx.drawImage(sprite, x + w / 2 - sprite.width / 2, H - peak * H - 2 - sprite.height);
    }

    ctx.restore();
  }

  drawLevel(ctx, levelDb, min, max, W, H, pixelRatio);

  if (thresholdVisible) {
    drawThreshold(ctx, thresholdDb, min, max, W, H, pixelRatio);
  }
};
