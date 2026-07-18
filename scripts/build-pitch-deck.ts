#!/usr/bin/env npx tsx
/**
 * MakanMate — Codex Hackathon 2026 Pitch Deck Builder
 *
 * Regenerates `plans/MakanMate-Demo.pptx` from
 * `plans/MakanMate-Pitch-Handoff.md` using pptxgenjs.
 *
 * Design rules:
 *   - Every illustration is built from NATIVE PPT shapes (rect, ellipse,
 *     line, chevron, triangle ...). No external image assets, no base64.
 *   - Visual style anchor on every slide: hand-drawn Malaysian retro —
 *     terracotta red (#8B1E1E), deep leaf green (#2F5D3A), cream parchment
 *     (#F4ECD8), batik ornaments, paper-grain texture.
 *   - Each slide carries the VERBATIM speaker script from the handoff MD
 *     as presenter notes, so this doubles as a teleprompter.
 *   - Appendix slides (15-20) hold the Judge Q&A prep — hidden during the
 *     live 6-minute pitch, surfaced only if a judge asks.
 *
 * Usage:
 *   npx tsx scripts/build-pitch-deck.ts
 *
 * Fonts: Fraunces (display) + DM Sans (body) are the brand fonts. They
 * must be installed on the presenting machine or PowerPoint/Keynote will
 * fall back. For universal rendering, swap FONT_DISPLAY / FONT_BODY below
 * to "Georgia" / "Helvetica Neue".
 */

import pptxgen from "pptxgenjs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// PALETTE — sourced from plans/MakanMate-Pitch-Handoff.md + globals.css
// ---------------------------------------------------------------------------

const C = {
  cream:      "F4ECD8",
  creamSoft:  "EFE6CC",
  surface:    "EAE0C2",
  surfaceDk:  "DDD0AE",
  terra:      "8B1E1E",
  terraMid:   "C4553A",
  terraSoft:  "E07A52",
  terraTint:  "F2D4CA",
  green:      "2F5D3A",
  greenMid:   "4A7C59",
  greenSoft:  "9CB9A2",
  greenTint:  "D6E2D4",
  gold:       "D4A947",
  goldDeep:   "B8902F",
  ink:        "2C1810",
  inkMuted:   "5B4636",
  border:     "C4A882",
  borderDk:   "A88860",
  grey:       "BFBFBF",
  greyMid:    "9E9E9E",
  greyDk:     "6E6E6E",
  white:      "FFFFFF",
  redFlag:    "B83A3A",
  redTint:    "F4D6D2",
  greenOk:    "3F7A4A",
  bronze:     "CD7F32",
  silver:     "AAB7C4",
  night:      "1F1410",
};

const FONT_DISPLAY = "Fraunces";
const FONT_BODY    = "DM Sans";

// ---------------------------------------------------------------------------
// LAYOUT — LAYOUT_WIDE = 13.333" x 7.5" (16:9 with breathing room)
// ---------------------------------------------------------------------------

const PAGE_W = 13.333;
const PAGE_H = 7.5;
const MARGIN = 0.55;
const CONTENT_X = MARGIN;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - 0.45;

type Slide = ReturnType<pptxgen["addSlide"]>;

// ---------------------------------------------------------------------------
// CORE HELPERS
// ---------------------------------------------------------------------------

function paintCanvas(slide: Slide, color: string = C.cream): void {
  slide.background = { color };
  slide.addShape("ellipse", {
    x: -2, y: -2, w: PAGE_W + 4, h: PAGE_W + 4,
    fill: { color: C.gold, transparency: 88 },
    line: { type: "none" },
  });
}

function batikFrame(slide: Slide, accent: string = C.terra): void {
  slide.addShape("rect", {
    x: 0.28, y: 0.28, w: PAGE_W - 0.56, h: PAGE_H - 0.56,
    fill: { type: "none" },
    line: { color: accent, width: 1.25 },
  });
  slide.addShape("rect", {
    x: 0.36, y: 0.36, w: PAGE_W - 0.72, h: PAGE_H - 0.72,
    fill: { type: "none" },
    line: { color: C.border, width: 0.75 },
  });
  const corners: Array<[number, number]> = [
    [0.28, 0.28],
    [PAGE_W - 0.78, 0.28],
    [0.28, PAGE_H - 0.78],
    [PAGE_W - 0.78, PAGE_H - 0.78],
  ];
  for (const [cx, cy] of corners) {
    batikFlower(slide, cx + 0.25, cy + 0.25, 0.22, accent);
  }
}

function batikFlower(
  slide: Slide,
  cx: number,
  cy: number,
  r: number,
  color: string,
): void {
  const petal = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    const ox = Math.cos(rad) * r * 0.55;
    const oy = Math.sin(rad) * r * 0.55;
    slide.addShape("ellipse", {
      x: cx + ox - r * 0.45,
      y: cy + oy - r * 0.3,
      w: r * 0.9,
      h: r * 0.6,
      fill: { color, transparency: 35 },
      line: { color, width: 0.5 },
      rotate: deg,
    });
  };
  petal(0); petal(90); petal(180); petal(270);
  slide.addShape("ellipse", {
    x: cx - r * 0.18, y: cy - r * 0.18, w: r * 0.36, h: r * 0.36,
    fill: { color: C.gold }, line: { color, width: 0.5 },
  });
}

function headline(
  slide: Slide,
  text: string,
  opts: {
    x?: number; y?: number; w?: number; h?: number;
    size?: number; color?: string;
    align?: pptxgen.AlignH; shadow?: boolean;
  } = {},
): void {
  const {
    x = CONTENT_X, y = 0.55, w = CONTENT_W, h = 1.0,
    size = 36, color = C.terra, align = "left", shadow = true,
  } = opts;
  if (shadow) {
    slide.addText(text, {
      x: x + 0.05, y: y + 0.05, w, h,
      fontFace: FONT_DISPLAY, fontSize: size, bold: true,
      color: C.border, align, valign: "top", isTextBox: true,
    });
  }
  slide.addText(text, {
    x, y, w, h,
    fontFace: FONT_DISPLAY, fontSize: size, bold: true,
    color, align, valign: "top", isTextBox: true,
  });
}

function eyebrow(
  slide: Slide,
  text: string,
  x = CONTENT_X,
  y = 0.42,
  color = C.terra,
  size = 11,
): void {
  slide.addText(text.toUpperCase(), {
    x, y, w: CONTENT_W, h: 0.3,
    fontFace: FONT_BODY, fontSize: size, bold: true,
    color, charSpacing: 4, align: "left", valign: "middle", isTextBox: true,
  });
}

function footerMarker(
  slide: Slide,
  num: string,
  tag = "MAKANMATE · CODEX HACKATHON 2026",
): void {
  slide.addText(tag, {
    x: CONTENT_X, y: FOOTER_Y, w: 6, h: 0.3,
    fontFace: FONT_BODY, fontSize: 9, bold: true,
    color: C.inkMuted, charSpacing: 3,
    align: "left", valign: "middle", isTextBox: true,
  });
  slide.addText(`( ${num} )`, {
    x: PAGE_W - 2.5, y: FOOTER_Y, w: 1.95, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, bold: true,
    color: C.terra, charSpacing: 3,
    align: "right", valign: "middle", isTextBox: true,
  });
}

function script(slide: Slide, text: string): void {
  slide.addNotes(text);
}

function card(
  slide: Slide,
  x: number, y: number, w: number, h: number,
  opts: {
    fill?: string; line?: string; lineW?: number;
    dash?: boolean; radius?: number;
  } = {},
): void {
  const {
    fill = C.surface, line = C.border, lineW = 1.25,
    dash = false, radius = 0.08,
  } = opts;
  slide.addShape("roundRect", {
    x, y, w, h,
    fill: { color: fill },
    line: { color: line, width: lineW, dashType: dash ? "dash" : "solid" },
    rectRadius: radius,
  });
}

function arrow(
  slide: Slide,
  x1: number, y1: number, x2: number, y2: number,
  color = C.terra, width = 2.25,
): void {
  slide.addShape("line", {
    x: x1, y: y1, w: x2 - x1, h: y2 - y1,
    line: { color, width, beginArrowType: "none", endArrowType: "triangle" },
  });
}

// ---------------------------------------------------------------------------
// ILLUSTRATION PRIMITIVES (all built from native PPT shapes)
// ---------------------------------------------------------------------------

function hawkerStall(
  slide: Slide, x: number, y: number, scale = 1,
  opts: { dim?: boolean; glow?: boolean } = {},
): void {
  const { dim = false, glow = false } = opts;
  const s = scale;
  const base = dim ? C.greyMid : C.terra;
  const roof = dim ? C.greyDk : C.green;
  const accent = dim ? C.grey : C.gold;

  if (glow) {
    slide.addShape("ellipse", {
      x: x - 0.4 * s, y: y - 0.3 * s, w: 3.2 * s, h: 2.6 * s,
      fill: { color: C.gold, transparency: 75 }, line: { type: "none" },
    });
  }
  slide.addShape("triangle", {
    x, y, w: 2.4 * s, h: 0.7 * s,
    fill: { color: roof }, line: { color: C.ink, width: 1 },
  });
  slide.addShape("rect", {
    x: x + 0.1 * s, y: y + 0.65 * s, w: 2.2 * s, h: 1.2 * s,
    fill: { color: base }, line: { color: C.ink, width: 1 },
  });
  slide.addShape("rect", {
    x: x + 0.35 * s, y: y + 0.8 * s, w: 1.7 * s, h: 0.42 * s,
    fill: { color: C.cream }, line: { color: C.ink, width: 0.75 },
  });
  for (let i = 0; i < 3; i++) {
    slide.addShape("line", {
      x: x + 0.42 * s, y: y + (0.9 + i * 0.1) * s, w: 1.5 * s, h: 0,
      line: { color: dim ? C.greyDk : C.inkMuted, width: 0.75 },
    });
  }
  slide.addShape("ellipse", {
    x: x + 0.7 * s, y: y + 1.5 * s, w: 0.7 * s, h: 0.3 * s,
    fill: { color: C.ink }, line: { color: C.ink, width: 0.75 },
  });
  if (!dim) {
    const smoke = (sx: number, sy: number, r: number) => {
      slide.addShape("ellipse", {
        x: sx, y: sy, w: r, h: r,
        fill: { color: C.white, transparency: 60 }, line: { type: "none" },
      });
    };
    smoke(x + 0.95 * s, y + 0.1 * s, 0.35 * s);
    smoke(x + 1.15 * s, y - 0.15 * s, 0.28 * s);
    smoke(x + 0.75 * s, y - 0.05 * s, 0.22 * s);
  }
  slide.addShape("ellipse", {
    x: x + 2.0 * s, y: y + 0.78 * s, w: 0.18 * s, h: 0.22 * s,
    fill: { color: accent }, line: { color: C.ink, width: 0.5 },
  });
}

function phoneFrame(
  slide: Slide, x: number, y: number, w: number, h: number,
  opts: { screenFill?: string; glow?: boolean } = {},
): void {
  const { screenFill = C.cream, glow = false } = opts;
  if (glow) {
    slide.addShape("roundRect", {
      x: x - 0.12, y: y - 0.12, w: w + 0.24, h: h + 0.24,
      fill: { color: C.gold, transparency: 78 }, line: { type: "none" },
      rectRadius: 0.2,
    });
  }
  slide.addShape("roundRect", {
    x, y, w, h,
    fill: { color: C.ink }, line: { color: C.ink, width: 1 },
    rectRadius: 0.14,
  });
  const bezel = 0.07;
  slide.addShape("roundRect", {
    x: x + bezel, y: y + bezel, w: w - bezel * 2, h: h - bezel * 2,
    fill: { color: screenFill }, line: { color: C.border, width: 0.5 },
    rectRadius: 0.08,
  });
  slide.addShape("roundRect", {
    x: x + w / 2 - 0.18, y: y + 0.04, w: 0.36, h: 0.06,
    fill: { color: C.ink }, line: { type: "none" }, rectRadius: 0.03,
  });
}

function iconEye(slide: Slide, cx: number, cy: number, r = 0.2, color = C.terra): void {
  slide.addShape("ellipse", {
    x: cx - r, y: cy - r * 0.55, w: r * 2, h: r * 1.1,
    fill: { color: C.cream }, line: { color, width: 1.5 },
  });
  slide.addShape("ellipse", {
    x: cx - r * 0.32, y: cy - r * 0.32, w: r * 0.64, h: r * 0.64,
    fill: { color }, line: { color: C.ink, width: 0.75 },
  });
}

function iconUser(slide: Slide, cx: number, cy: number, r = 0.2, color = C.green): void {
  slide.addShape("ellipse", {
    x: cx - r * 0.5, y: cy - r * 0.8, w: r, h: r,
    fill: { color }, line: { color: C.ink, width: 0.75 },
  });
  slide.addShape("roundRect", {
    x: cx - r * 0.95, y: cy - r * 0.05, w: r * 1.9, h: r * 1.1,
    fill: { color }, line: { color: C.ink, width: 0.75 }, rectRadius: 0.1,
  });
}

function iconBook(slide: Slide, cx: number, cy: number, r = 0.2, color = C.goldDeep): void {
  slide.addShape("rect", {
    x: cx - r, y: cy - r * 0.7, w: r, h: r * 1.4,
    fill: { color }, line: { color: C.ink, width: 0.75 },
  });
  slide.addShape("rect", {
    x: cx, y: cy - r * 0.7, w: r, h: r * 1.4,
    fill: { color: C.gold }, line: { color: C.ink, width: 0.75 },
  });
  slide.addShape("line", {
    x: cx, y: cy - r * 0.7, w: 0, h: r * 1.4,
    line: { color: C.ink, width: 1 },
  });
}

function iconShield(slide: Slide, cx: number, cy: number, r = 0.2, color = C.terra): void {
  slide.addShape("pentagon", {
    x: cx - r * 0.8, y: cy - r, w: r * 1.6, h: r * 2,
    fill: { color }, line: { color: C.ink, width: 0.75 }, rotate: 180,
  });
  slide.addShape("line", {
    x: cx - r * 0.35, y: cy + r * 0.05, w: r * 0.3, h: r * 0.35,
    line: { color: C.cream, width: 2 },
  });
  slide.addShape("line", {
    x: cx - r * 0.05, y: cy + r * 0.4, w: r * 0.5, h: -r * 0.55,
    line: { color: C.cream, width: 2 },
  });
}

function iconWarning(slide: Slide, cx: number, cy: number, r = 0.18, color = C.redFlag): void {
  slide.addShape("triangle", {
    x: cx - r, y: cy - r * 0.85, w: r * 2, h: r * 1.7,
    fill: { color }, line: { color: C.ink, width: 0.75 },
  });
  slide.addText("!", {
    x: cx - r, y: cy - r * 0.5, w: r * 2, h: r * 1.2,
    fontFace: FONT_DISPLAY, fontSize: 12, bold: true, color: C.cream,
    align: "center", valign: "middle", isTextBox: true,
  });
}

function iconShellfish(slide: Slide, cx: number, cy: number, r = 0.16): void {
  slide.addShape("ellipse", {
    x: cx - r, y: cy - r * 0.5, w: r * 2, h: r,
    fill: { color: C.redFlag }, line: { color: C.ink, width: 0.5 },
  });
  for (const deg of [-45, 45, -135, 135]) {
    const rad = (deg * Math.PI) / 180;
    slide.addShape("line", {
      x: cx + Math.cos(rad) * r * 0.4,
      y: cy + Math.sin(rad) * r * 0.4,
      w: Math.cos(rad) * r * 0.7,
      h: Math.sin(rad) * r * 0.7,
      line: { color: C.ink, width: 1 },
    });
  }
}

function iconCheck(slide: Slide, cx: number, cy: number, r = 0.16): void {
  slide.addShape("ellipse", {
    x: cx - r, y: cy - r, w: r * 2, h: r * 2,
    fill: { color: C.greenOk }, line: { color: C.ink, width: 0.75 },
  });
  slide.addShape("line", {
    x: cx - r * 0.45, y: cy + r * 0.05, w: r * 0.35, h: r * 0.4,
    line: { color: C.cream, width: 2 },
  });
  slide.addShape("line", {
    x: cx - r * 0.1, y: cy + r * 0.45, w: r * 0.55, h: -r * 0.6,
    line: { color: C.cream, width: 2 },
  });
}

function iconTrophy(
  slide: Slide, cx: number, cy: number, r = 0.2,
  color = C.gold, flip = false,
): void {
  const cup = flip ? C.greyMid : color;
  slide.addShape("roundRect", {
    x: cx - r * 0.55, y: cy - r * 0.7, w: r * 1.1, h: r * 0.9,
    fill: { color: cup }, line: { color: C.ink, width: 0.75 }, rectRadius: 0.06,
  });
  slide.addShape("rect", {
    x: cx - r * 0.2, y: cy + r * 0.2, w: r * 0.4, h: r * 0.35,
    fill: { color: cup }, line: { color: C.ink, width: 0.75 },
  });
  slide.addShape("rect", {
    x: cx - r * 0.5, y: cy + r * 0.5, w: r, h: r * 0.2,
    fill: { color: cup }, line: { color: C.ink, width: 0.75 },
  });
  slide.addShape("arc", {
    x: cx - r * 0.95, y: cy - r * 0.6, w: r * 0.5, h: r * 0.5,
    fill: { type: "none" }, line: { color: cup, width: 1.25 }, angleRange: [90, 270],
  });
  slide.addShape("arc", {
    x: cx + r * 0.45, y: cy - r * 0.6, w: r * 0.5, h: r * 0.5,
    fill: { type: "none" }, line: { color: cup, width: 1.25 }, angleRange: [-90, 90],
  });
}

function iconLens(slide: Slide, cx: number, cy: number, r = 0.2, color = C.green): void {
  slide.addShape("ellipse", {
    x: cx - r * 0.85, y: cy - r * 0.85, w: r * 1.4, h: r * 1.4,
    fill: { type: "none" }, line: { color, width: 2 },
  });
  slide.addShape("line", {
    x: cx + r * 0.2, y: cy + r * 0.2, w: r * 0.6, h: r * 0.6,
    line: { color, width: 2.5 },
  });
}

function iconRoots(slide: Slide, cx: number, cy: number, r = 0.25, color = C.green): void {
  slide.addShape("ellipse", {
    x: cx - r * 0.4, y: cy - r * 1.1, w: r * 0.8, h: r * 0.6,
    fill: { color: C.greenMid }, line: { color: C.ink, width: 0.5 },
  });
  slide.addShape("rect", {
    x: cx - r * 0.06, y: cy - r * 0.55, w: r * 0.12, h: r * 0.55,
    fill: { color: C.terraMid }, line: { color: C.ink, width: 0.5 },
  });
  const roots: Array<[number, number, number, number]> = [
    [cx, cy, cx - r * 0.6, cy + r * 0.6],
    [cx, cy, cx, cy + r * 0.7],
    [cx, cy, cx + r * 0.6, cy + r * 0.6],
    [cx - r * 0.3, cy + r * 0.3, cx - r * 0.85, cy + r * 0.85],
    [cx + r * 0.3, cy + r * 0.3, cx + r * 0.85, cy + r * 0.85],
  ];
  for (const [x1, y1, x2, y2] of roots) {
    slide.addShape("line", {
      x: x1, y: y1, w: x2 - x1, h: y2 - y1,
      line: { color, width: 1.5 },
    });
  }
}

function iconPlate(slide: Slide, cx: number, cy: number, r = 0.3, color = C.terraMid): void {
  slide.addShape("ellipse", {
    x: cx - r, y: cy - r * 0.35, w: r * 2, h: r * 0.7,
    fill: { color: C.cream }, line: { color: C.ink, width: 1 },
  });
  slide.addShape("ellipse", {
    x: cx - r * 0.75, y: cy - r * 0.22, w: r * 1.5, h: r * 0.45,
    fill: { color }, line: { color: C.ink, width: 0.5 },
  });
  for (let i = 0; i < 3; i++) {
    slide.addShape("arc", {
      x: cx - r * 0.55 + i * r * 0.35, y: cy - r * 0.2, w: r * 0.3, h: r * 0.2,
      fill: { type: "none" }, line: { color: C.gold, width: 0.75 }, angleRange: [0, 180],
    });
  }
}

function iconGlass(slide: Slide, cx: number, cy: number, r = 0.28): void {
  slide.addShape("roundRect", {
    x: cx - r * 0.6, y: cy - r, w: r * 1.2, h: r * 2,
    fill: { color: C.cream, transparency: 30 }, line: { color: C.ink, width: 1 },
    rectRadius: 0.05,
  });
  slide.addShape("roundRect", {
    x: cx - r * 0.55, y: cy + r * 0.3, w: r * 1.1, h: r * 0.65,
    fill: { color: C.greenMid }, line: { type: "none" }, rectRadius: 0.04,
  });
  slide.addShape("roundRect", {
    x: cx - r * 0.55, y: cy - r * 0.1, w: r * 1.1, h: r * 1.05,
    fill: { color: C.gold, transparency: 60 }, line: { type: "none" }, rectRadius: 0.04,
  });
  slide.addShape("line", {
    x: cx + r * 0.15, y: cy - r * 1.2, w: r * 0.2, h: r * 1.8,
    line: { color: C.terra, width: 2.5 },
  });
}

function iconSatay(slide: Slide, cx: number, cy: number, r = 0.3): void {
  for (let i = 0; i < 3; i++) {
    const yo = i * r * 0.35;
    slide.addShape("line", {
      x: cx - r, y: cy + yo - r * 0.5, w: r * 2, h: r,
      line: { color: C.inkMuted, width: 1.5 },
    });
    slide.addShape("roundRect", {
      x: cx - r * 0.4, y: cy + yo - r * 0.15, w: r * 1.1, h: r * 0.32,
      fill: { color: C.terraMid }, line: { color: C.ink, width: 0.5 }, rectRadius: 0.04,
    });
  }
}

function iconRoti(slide: Slide, cx: number, cy: number, r = 0.3): void {
  slide.addShape("ellipse", {
    x: cx - r, y: cy - r * 0.6, w: r * 2, h: r * 1.2,
    fill: { color: C.gold }, line: { color: C.ink, width: 1 },
  });
  slide.addShape("ellipse", {
    x: cx - r * 0.7, y: cy - r * 0.42, w: r * 1.4, h: r * 0.85,
    fill: { type: "none" }, line: { color: C.terra, width: 0.75, dashType: "dash" },
  });
  slide.addShape("ellipse", {
    x: cx - r * 0.4, y: cy - r * 0.24, w: r * 0.8, h: r * 0.5,
    fill: { type: "none" }, line: { color: C.terra, width: 0.5, dashType: "dash" },
  });
}

function iconCup(slide: Slide, cx: number, cy: number, r = 0.25): void {
  slide.addShape("roundRect", {
    x: cx - r * 0.7, y: cy - r * 0.7, w: r * 1.4, h: r * 1.3,
    fill: { color: C.cream }, line: { color: C.ink, width: 1 }, rectRadius: 0.05,
  });
  slide.addShape("ellipse", {
    x: cx - r * 0.7, y: cy - r * 0.85, w: r * 1.4, h: r * 0.4,
    fill: { color: C.ink }, line: { color: C.ink, width: 0.5 },
  });
  slide.addShape("arc", {
    x: cx + r * 0.6, y: cy - r * 0.3, w: r * 0.6, h: r * 0.6,
    fill: { type: "none" }, line: { color: C.ink, width: 1.25 }, angleRange: [-90, 90],
  });
  slide.addShape("arc", {
    x: cx - r * 0.3, y: cy - r * 1.4, w: r * 0.4, h: r * 0.4,
    fill: { type: "none" }, line: { color: C.grey, width: 0.75 }, angleRange: [180, 360],
  });
}

function qrPlaceholder(slide: Slide, x: number, y: number, size: number): void {
  slide.addShape("roundRect", {
    x, y, w: size, h: size,
    fill: { color: C.white }, line: { color: C.ink, width: 1.5 }, rectRadius: 0.06,
  });
  const cells = 11;
  const cell = size / cells;
  const filled = (i: number, j: number): boolean => {
    const inFinder = (oi: number, oj: number) =>
      i >= oi && i < oi + 3 && j >= oj && j < oj + 3;
    if (inFinder(0, 0) || inFinder(0, cells - 3) || inFinder(cells - 3, 0)) {
      const local = (oi: number, oj: number) => {
        const li = i - oi;
        const lj = j - oj;
        return li === 0 || li === 2 || lj === 0 || lj === 2 || (li === 1 && lj === 1);
      };
      return (
        (inFinder(0, 0) && local(0, 0)) ||
        (inFinder(0, cells - 3) && local(0, cells - 3)) ||
        (inFinder(cells - 3, 0) && local(cells - 3, 0))
      );
    }
    const v = (i * 31 + j * 17 + (i ^ j) * 7) % 7;
    return v < 3;
  };
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      if (filled(i, j)) {
        slide.addShape("rect", {
          x: x + j * cell, y: y + i * cell, w: cell, h: cell,
          fill: { color: C.ink }, line: { type: "none" },
        });
      }
    }
  }
}

function bulb(slide: Slide, cx: number, cyTop: number, r = 0.12): void {
  slide.addShape("line", {
    x: cx, y: cyTop, w: 0, h: r * 2.2,
    line: { color: C.gold, width: 0.75 },
  });
  slide.addShape("ellipse", {
    x: cx - r * 2, y: cyTop + r * 2 - r * 0.7, w: r * 4, h: r * 4,
    fill: { color: C.gold, transparency: 70 }, line: { type: "none" },
  });
  slide.addShape("ellipse", {
    x: cx - r * 0.85, y: cyTop + r * 1.8, w: r * 1.7, h: r * 1.9,
    fill: { color: C.gold }, line: { color: C.goldDeep, width: 0.75 },
  });
}

function drawPipelineIcon(
  slide: Slide, key: "eye" | "user" | "book" | "shield",
  cx: number, cy: number, color: string,
): void {
  if (key === "eye") iconEye(slide, cx, cy, 0.18, color);
  else if (key === "user") iconUser(slide, cx, cy, 0.2, color);
  else if (key === "book") iconBook(slide, cx, cy, 0.22, color);
  else iconShield(slide, cx, cy, 0.2, color);
}

// ---------------------------------------------------------------------------
// SLIDE BUILDERS — slides 1-4
// ---------------------------------------------------------------------------

function slide01Title(pptx: pptxgen): void {
  const s = pptx.addSlide();
  paintCanvas(s);
  batikFrame(s);

  hawkerStall(s, PAGE_W - 3.5, 3.6, 1.05, { glow: true });
  phoneFrame(s, 1.1, 3.7, 1.5, 2.7, { glow: true });
  iconCheck(s, 1.45, 4.2, 0.1);
  iconCheck(s, 1.45, 4.55, 0.1);
  iconWarning(s, 1.95, 4.9, 0.1);
  iconCheck(s, 1.45, 5.25, 0.1);
  for (let i = 0; i < 4; i++) {
    s.addShape("line", {
      x: 1.25, y: 5.6 + i * 0.18, w: 1.2, h: 0,
      line: { color: C.border, width: 0.75 },
    });
  }

  s.addText("MALAYSIAN STREET FOOD AI COMPANION", {
    x: CONTENT_X, y: 1.5, w: CONTENT_W, h: 0.4,
    fontFace: FONT_BODY, fontSize: 13, bold: true, color: C.terra,
    charSpacing: 6, align: "center", isTextBox: true,
  });

  s.addText("MAKANMATE", {
    x: CONTENT_X, y: 2.1, w: CONTENT_W, h: 1.4,
    fontFace: FONT_DISPLAY, fontSize: 96, bold: true, color: C.border,
    align: "center", valign: "middle", isTextBox: true,
  });
  s.addText("MAKANMATE", {
    x: CONTENT_X, y: 2.05, w: CONTENT_W, h: 1.4,
    fontFace: FONT_DISPLAY, fontSize: 96, bold: true, color: C.terra,
    align: "center", valign: "middle", isTextBox: true,
  });

  s.addShape("line", {
    x: PAGE_W / 2 - 1.5, y: 3.65, w: 3, h: 0,
    line: { color: C.gold, width: 1.5 },
  });
  batikFlower(s, PAGE_W / 2, 3.65, 0.25, C.terra);

  s.addText("HERITAGE  ·  AGENTIC AI  ·  CODEX HACKATHON 2026", {
    x: CONTENT_X, y: 6.55, w: CONTENT_W, h: 0.4,
    fontFace: FONT_BODY, fontSize: 13, bold: true, color: C.green,
    charSpacing: 5, align: "center", isTextBox: true,
  });

  script(s, "Selamat pagi, judges. This is MakanMate — the layer between a tourist's phone and the handwritten board at any Malaysian roadside stall. A Pokedex for street food, powered by agentic AI.");
}

function slide02Agenda(pptx: pptxgen): void {
  const s = pptx.addSlide();
  paintCanvas(s);
  batikFrame(s);

  headline(s, "AGENDA", { y: 0.7, size: 48 });
  eyebrow(s, "Six beats · ~6 minute pitch");

  const items: Array<[string, string, string]> = [
    ["01", "THE PROBLEM", C.terra],
    ["02", "THE SOLUTION", C.green],
    ["03", "AI ARCHITECTURE", C.terra],
    ["04", "THE HERO FLOW", C.green],
    ["05", "ALGORITHMIC EDGE", C.terra],
    ["06", "WHY WE WIN", C.green],
  ];
  const listX = CONTENT_X + 0.2;
  const listY = 1.95;
  const rowH = 0.7;
  items.forEach(([num, label, color], i) => {
    const y = listY + i * rowH;
    s.addShape("roundRect", {
      x: listX, y, w: 0.7, h: 0.55,
      fill: { color }, line: { color: C.ink, width: 0.75 }, rectRadius: 0.06,
    });
    s.addText(num, {
      x: listX, y, w: 0.7, h: 0.55,
      fontFace: FONT_DISPLAY, fontSize: 20, bold: true, color: C.cream,
      align: "center", valign: "middle", isTextBox: true,
    });
    s.addText(label, {
      x: listX + 0.95, y, w: 5.5, h: 0.55,
      fontFace: FONT_DISPLAY, fontSize: 18, bold: true, color: C.ink,
      align: "left", valign: "middle", isTextBox: true,
    });
    s.addShape("line", {
      x: listX, y: y + 0.62, w: 6.3, h: 0,
      line: { color: C.border, width: 0.5, dashType: "dash" },
    });
  });

  const shelfX = 8.8;
  s.addShape("line", {
    x: shelfX, y: 5.6, w: 3.8, h: 0,
    line: { color: C.terra, width: 2 },
  });
  s.addText("THE MENU OF MALAYSIA", {
    x: shelfX, y: 1.9, w: 3.8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.terra,
    charSpacing: 3, align: "center", isTextBox: true,
  });
  iconPlate(s, shelfX + 0.8, 2.7, 0.45);
  iconGlass(s, shelfX + 2.2, 2.7, 0.45);
  iconSatay(s, shelfX + 3.5, 2.7, 0.4);
  iconRoti(s, shelfX + 0.8, 3.9, 0.45);
  iconCup(s, shelfX + 2.2, 3.95, 0.4);
  const labels = [
    ["Char Kuey Teow", shelfX + 0.2, 3.15],
    ["Cendol", shelfX + 1.6, 3.15],
    ["Satay", shelfX + 2.95, 3.15],
    ["Roti Canai", shelfX + 0.2, 4.35],
    ["Kopi-O", shelfX + 1.6, 4.35],
  ] as const;
  for (const [t, x, y] of labels) {
    s.addText(t, {
      x, y, w: 1.4, h: 0.25,
      fontFace: FONT_BODY, fontSize: 8, color: C.inkMuted,
      align: "center", isTextBox: true,
    });
  }

  footerMarker(s, "—");
  script(s, "Six beats — the problem, the solution, the architecture, the user flow, the algorithmic edge, and why we win.");
}

function slide03Hook(pptx: pptxgen): void {
  const s = pptx.addSlide();
  paintCanvas(s);
  batikFrame(s);

  headline(s, "MALAYSIA'S BEST FOOD IS INVISIBLE.", { y: 0.7, size: 40, w: 8.5 });
  eyebrow(s, "The hook");

  card(s, CONTENT_X, 2.0, 6.2, 1.8, { fill: C.surface });
  s.addText(
    "The most authentic food lives at unmarked warungs, kopitiams and mamak stalls with 15 online reviews. When the uncle retires, the recipe disappears. No LLM has trained on these stalls.",
    {
      x: CONTENT_X + 0.3, y: 2.15, w: 5.6, h: 1.5,
      fontFace: FONT_BODY, fontSize: 13, color: C.ink,
      align: "left", valign: "middle", lineSpacingMultiple: 1.2, isTextBox: true,
    },
  );

  card(s, 7.05, 2.0, 5.7, 1.7, { fill: C.redTint, line: C.redFlag });
  s.addText(
    "Tourists can't read handwritten Malay or Manglish. Allergies can't be verified. B40 hawkers lose tourist revenue to westernized mall cafes.",
    {
      x: 7.3, y: 2.15, w: 5.2, h: 1.45,
      fontFace: FONT_BODY, fontSize: 11.5, color: C.ink,
      align: "left", valign: "middle", lineSpacingMultiple: 1.15, isTextBox: true,
    },
  );
  card(s, 7.05, 3.85, 5.7, 1.7, { fill: C.greenTint, line: C.green });
  s.addText(
    "MakanMate is the layer between a tourist's phone and the handwritten board. Vision, RAG, and a safety audit turn any stall into a safe, narrated, discoverable experience.",
    {
      x: 7.3, y: 4.0, w: 5.2, h: 1.45,
      fontFace: FONT_BODY, fontSize: 11.5, color: C.ink,
      align: "left", valign: "middle", lineSpacingMultiple: 1.15, isTextBox: true,
    },
  );

  // Visual band: greyed mall vs glowing hawker obscured by mist
  s.addShape("roundRect", {
    x: 0.9, y: 5.75, w: 2.6, h: 1.2,
    fill: { color: C.grey }, line: { color: C.greyDk, width: 1 }, rectRadius: 0.05,
  });
  s.addText("MALL CAFE", {
    x: 0.9, y: 5.78, w: 2.6, h: 0.3,
    fontFace: FONT_BODY, fontSize: 9, bold: true, color: C.greyDk,
    charSpacing: 3, align: "center", isTextBox: true,
  });
  for (let i = 0; i < 3; i++) {
    s.addShape("rect", {
      x: 1.1 + i * 0.8, y: 6.15, w: 0.55, h: 0.7,
      fill: { color: C.white, transparency: 70 }, line: { color: C.greyDk, width: 0.5 },
    });
  }
  s.addShape("ellipse", {
    x: 4.95, y: 6.0, w: 0.3, h: 0.3,
    fill: { color: C.ink }, line: { type: "none" },
  });
  s.addShape("roundRect", {
    x: 4.85, y: 6.3, w: 0.5, h: 0.6,
    fill: { color: C.ink }, line: { type: "none" }, rectRadius: 0.1,
  });
  s.addText("tourist", {
    x: 4.5, y: 6.9, w: 1.2, h: 0.2,
    fontFace: FONT_BODY, fontSize: 7, color: C.inkMuted,
    align: "center", isTextBox: true,
  });
  s.addText("?   ?", {
    x: 3.4, y: 6.1, w: 1.6, h: 0.4,
    fontFace: FONT_DISPLAY, fontSize: 18, bold: true, color: C.terra,
    align: "center", isTextBox: true,
  });

  hawkerStall(s, 7.7, 5.55, 0.7, { glow: true });
  for (let i = 0; i < 3; i++) {
    s.addShape("ellipse", {
      x: 7.5 + i * 0.9, y: 5.95 + (i % 2) * 0.3, w: 1.4, h: 0.7,
      fill: { color: C.cream, transparency: 55 }, line: { type: "none" },
    });
  }
  s.addText("THE INVISIBLE UNCLE", {
    x: 7.7, y: 6.95, w: 2.5, h: 0.25,
    fontFace: FONT_BODY, fontSize: 9, bold: true, color: C.terra,
    charSpacing: 2, align: "center", isTextBox: true,
  });

  footerMarker(s, "01");
  script(s, "Malaysia is a global food capital — but the food that matters isn't on Instagram. It's at roadside stalls with fifteen online reviews, run by third-generation hawkers. When the uncle retires, the recipe disappears. No foundation model has trained on these stalls. That's the moat — and that's the problem. Tourists can't read the menus, can't verify their allergies, and they walk away. The hawker loses. The heritage erodes.");
}

function drawProblemVignette(
  s: Slide, x: number, y: number, w: number, h: number,
  idx: number, color: string,
): void {
  if (idx === 0) {
    s.addShape("rect", {
      x: x + 0.2, y: y + 0.1, w: w - 0.4, h: h - 0.2,
      fill: { color: C.cream }, line: { color: C.ink, width: 1 },
    });
    for (let i = 0; i < 5; i++) {
      s.addShape("line", {
        x: x + 0.4, y: y + 0.3 + i * 0.22, w: w - 0.8, h: 0,
        line: { color: C.inkMuted, width: 1, dashType: "dashDot" },
      });
    }
    iconLens(s, x + w - 0.5, y + h - 0.4, 0.35, color);
  } else if (idx === 1) {
    iconPlate(s, x + w / 2, y + h - 0.35, 0.45);
    s.addShape("ellipse", {
      x: x + w / 2 - 0.4, y: y + 0.2, w: 0.8, h: 0.8,
      fill: { color: C.gold }, line: { color: C.ink, width: 1 },
    });
    s.addShape("line", { x: x + w / 2 - 0.22, y: y + 0.5, w: 0.12, h: 0.06, line: { color: C.ink, width: 2 } });
    s.addShape("line", { x: x + w / 2 + 0.1, y: y + 0.5, w: 0.12, h: 0.06, line: { color: C.ink, width: 2 } });
    s.addShape("arc", {
      x: x + w / 2 - 0.15, y: y + 0.65, w: 0.3, h: 0.15,
      fill: { type: "none" }, line: { color: C.ink, width: 1.5 }, angleRange: [180, 360],
    });
    iconShellfish(s, x + w - 0.4, y + 0.3, 0.18);
    s.addShape("roundRect", {
      x: x + w - 0.7, y: y + 0.55, w: 0.7, h: 0.22,
      fill: { color: C.redFlag }, line: { color: C.ink, width: 0.5 }, rectRadius: 0.05,
    });
    s.addText("SHELLFISH", {
      x: x + w - 0.7, y: y + 0.55, w: 0.7, h: 0.22,
      fontFace: FONT_BODY, fontSize: 6.5, bold: true, color: C.cream,
      align: "center", valign: "middle", charSpacing: 1, isTextBox: true,
    });
  } else {
    s.addShape("roundRect", {
      x: x + w - 1.4, y: y + 0.1, w: 1.2, h: 0.5,
      fill: { color: C.gold, transparency: 35 }, line: { color: C.gold, width: 0.75 },
      rectRadius: 0.05,
    });
    hawkerStall(s, x + 0.1, y + 0.4, 0.45, { dim: true });
    s.addShape("ellipse", {
      x: x + 0.7, y: y + h - 0.7, w: 0.22, h: 0.22,
      fill: { color: C.terraMid }, line: { color: C.ink, width: 0.5 },
    });
    s.addShape("roundRect", {
      x: x + 0.62, y: y + h - 0.5, w: 0.38, h: 0.4,
      fill: { color: C.terraMid }, line: { color: C.ink, width: 0.5 }, rectRadius: 0.05,
    });
    s.addShape("roundRect", {
      x: x + 1.15, y: y + h - 0.45, w: 0.25, h: 0.35,
      fill: { color: C.ink }, line: { type: "none" }, rectRadius: 0.03,
    });
    s.addText("0", {
      x: x + 1.15, y: y + h - 0.45, w: 0.25, h: 0.35,
      fontFace: FONT_DISPLAY, fontSize: 10, bold: true, color: C.grey,
      align: "center", valign: "middle", isTextBox: true,
    });
  }
}

function slide04Problem(pptx: pptxgen): void {
  const s = pptx.addSlide();
  paintCanvas(s);
  batikFrame(s);

  headline(s, "THE PROBLEM", { y: 0.55, size: 40 });
  eyebrow(s, "Three forces compound the invisibility");

  const cols = [
    {
      title: "LANGUAGE & LEGIBILITY",
      body: "Handwritten Malay, Manglish, Hokkien shorthand. 'CKT' doesn't decode itself. Standard translators translate words, not cultural context — so tourists still don't know what's inside the dish.",
      color: C.terra, fill: C.terraTint,
    },
    {
      title: "DIETARY ANXIETY",
      body: "Shrimp paste in sambal. Cockles in Char Kuey Teow. Pork lard in Halal-looking dishes. Severe allergies cannot be verified, so tourists skip local stalls entirely.",
      color: C.redFlag, fill: C.redTint,
    },
    {
      title: "ECONOMIC IMPACT",
      body: "Tourists default to expensive westernized cafes. Grassroots B40 hawkers miss out on high-yield tourist revenue. Intangible heritage fades with every retiring generation.",
      color: C.green, fill: C.greenTint,
    },
  ];

  const colW = 3.85;
  const colGap = 0.25;
  const startX = (PAGE_W - (colW * 3 + colGap * 2)) / 2;
  const topY = 1.85;

  cols.forEach((col, i) => {
    const x = startX + i * (colW + colGap);
    card(s, x, topY, colW, 4.4, { fill: C.creamSoft, line: col.color, lineW: 1.5 });
    s.addShape("rect", {
      x, y: topY, w: colW, h: 0.5,
      fill: { color: col.color }, line: { color: col.color, width: 1 },
    });
    s.addText(col.title, {
      x: x + 0.15, y: topY, w: colW - 0.3, h: 0.5,
      fontFace: FONT_DISPLAY, fontSize: 13, bold: true, color: C.cream,
      align: "center", valign: "middle", charSpacing: 1, isTextBox: true,
    });
    drawProblemVignette(s, x + 0.3, topY + 0.75, colW - 0.6, 1.5, i, col.color);
    s.addText(col.body, {
      x: x + 0.25, y: topY + 2.4, w: colW - 0.5, h: 1.85,
      fontFace: FONT_BODY, fontSize: 11, color: C.ink,
      align: "left", valign: "top", lineSpacingMultiple: 1.2, isTextBox: true,
    });
  });

  footerMarker(s, "02");
  script(s, "Three problems compound. First, language and legibility — these menus are handwritten, colloquial, full of shorthand like 'CKT.' Standard translators give you the words, not the meaning. Second, dietary anxiety — a tourist with a shellfish allergy cannot verify that the sambal contains shrimp paste, or that the Char Kuey Teow contains cockles. So they don't risk it. Third, the economic impact — they end up at the mall cafe. The B40 hawker loses high-yield tourist revenue. Multiply that across every tourist, every day, and the heritage literally disappears with the generation that cooked it.");
}

// ---------------------------------------------------------------------------
// SLIDE BUILDERS — slides 5-8
// ---------------------------------------------------------------------------

function slide05Solution(pptx: pptxgen): void {
  const s = pptx.addSlide();
  paintCanvas(s);
  batikFrame(s);

  headline(s, "THE SOLUTION", { y: 0.55, size: 40 });
  eyebrow(s, "A 4-layer agentic pipeline · zero vendor friction");

  s.addText("AGENTIC PIPELINE", {
    x: CONTENT_X, y: 1.75, w: 5, h: 0.3,
    fontFace: FONT_DISPLAY, fontSize: 14, bold: true, color: C.terra,
    charSpacing: 2, isTextBox: true,
  });
  const chipDefs: Array<["eye" | "user" | "book" | "shield", string, string]> = [
    ["eye", "VISION AGENT", C.terra],
    ["user", "PERSONALIZATION", C.green],
    ["book", "HERITAGE RAG", C.goldDeep],
    ["shield", "CRITIC AUDIT", C.terra],
  ];
  const pipeX = CONTENT_X + 0.2;
  const pipeStartY = 2.2;
  const chipH = 0.7;
  const chipGap = 0.35;
  chipDefs.forEach(([iconKey, label, color], i) => {
    const y = pipeStartY + i * (chipH + chipGap);
    card(s, pipeX, y, 4.4, chipH, { fill: C.cream, line: color, lineW: 1.5 });
    s.addShape("rect", {
      x: pipeX, y, w: 0.7, h: chipH,
      fill: { color }, line: { color, width: 1 },
    });
    drawPipelineIcon(s, iconKey, pipeX + 0.35, y + chipH / 2, color);
    s.addText(label, {
      x: pipeX + 0.85, y, w: 3.4, h: chipH,
      fontFace: FONT_DISPLAY, fontSize: 14, bold: true, color: C.ink,
      align: "left", valign: "middle", charSpacing: 1, isTextBox: true,
    });
    if (i < chipDefs.length - 1) {
      arrow(s, pipeX + 2.2, y + chipH, pipeX + 2.2, y + chipH + chipGap, C.gold, 2);
    }
  });

  s.addText(
    "Output is a safe, contextual translation — never a literal word swap. A dangerous ingredient is intercepted before the user sees the dish.",
    {
      x: CONTENT_X, y: pipeStartY + 4 * (chipH + chipGap) + 0.05, w: 5, h: 0.7,
      fontFace: FONT_BODY, fontSize: 10.5, italic: true, color: C.inkMuted,
      lineSpacingMultiple: 1.15, isTextBox: true,
    },
  );

  const rightX = 6.6;
  s.addText("ZERO VENDOR FRICTION", {
    x: rightX, y: 1.75, w: 6, h: 0.3,
    fontFace: FONT_DISPLAY, fontSize: 14, bold: true, color: C.green,
    charSpacing: 2, isTextBox: true,
  });

  s.addShape("rect", {
    x: rightX + 0.3, y: 5.4, w: 5.2, h: 1.1,
    fill: { color: C.surfaceDk }, line: { color: C.ink, width: 1 },
  });
  for (let i = 0; i < 4; i++) {
    s.addShape("line", {
      x: rightX + 0.5, y: 5.6 + i * 0.2, w: 4.8, h: 0,
      line: { color: C.inkMuted, width: 0.75, dashType: "dash" },
    });
  }
  s.addText("HANDWRITTEN BOARD", {
    x: rightX + 0.3, y: 6.5, w: 5.2, h: 0.2,
    fontFace: FONT_BODY, fontSize: 7.5, bold: true, color: C.inkMuted,
    charSpacing: 2, align: "center", isTextBox: true,
  });

  phoneFrame(s, rightX + 1.4, 2.3, 2.9, 3.0, { glow: true });
  iconCheck(s, rightX + 2.0, 2.85, 0.13);
  s.addShape("roundRect", {
    x: rightX + 2.25, y: 2.7, w: 1.8, h: 0.3,
    fill: { color: C.greenOk }, line: { color: C.ink, width: 0.5 }, rectRadius: 0.05,
  });
  s.addText("Ayam Goreng ✓", {
    x: rightX + 2.25, y: 2.7, w: 1.8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 8, bold: true, color: C.cream,
    align: "center", valign: "middle", isTextBox: true,
  });
  iconWarning(s, rightX + 2.0, 3.35, 0.13);
  s.addShape("roundRect", {
    x: rightX + 2.25, y: 3.2, w: 1.8, h: 0.3,
    fill: { color: C.redFlag }, line: { color: C.ink, width: 0.5 }, rectRadius: 0.05,
  });
  s.addText("CKT · cockles", {
    x: rightX + 2.25, y: 3.2, w: 1.8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 8, bold: true, color: C.cream,
    align: "center", valign: "middle", isTextBox: true,
  });
  s.addShape("roundRect", {
    x: rightX + 1.7, y: 3.7, w: 2.4, h: 1.3,
    fill: { color: C.cream }, line: { color: C.terra, width: 1 }, rectRadius: 0.06,
  });
  s.addText(
    [
      { text: "Char Kuey Teow\n", options: { bold: true, fontSize: 9, color: C.terra } },
      { text: "Stir-fried flat noodles with prawns, cockles & pork lard.", options: { fontSize: 7.5, color: C.ink } },
    ],
    {
      x: rightX + 1.8, y: 3.78, w: 2.2, h: 1.15,
      fontFace: FONT_BODY, align: "left", valign: "top",
      lineSpacingMultiple: 1.05, isTextBox: true,
    },
  );

  s.addText(
    "No new hardware. No reprinted menus. No vendor onboarding. The intelligence lives entirely between the tourist's phone and the existing handwritten board.",
    {
      x: rightX, y: 6.75, w: 6, h: 0.4,
      fontFace: FONT_BODY, fontSize: 10, italic: true, color: C.inkMuted,
      lineSpacingMultiple: 1.1, isTextBox: true,
    },
  );

  footerMarker(s, "02");
  script(s, "Our solution is a 4-layer agentic pipeline. Vision reads the menu. Personalization pulls the user's profile — allergies, Halal, spice tolerance. Heritage RAG retrieves the actual ingredient matrix and the cultural backstory. And then a Critic audits the output against the profile — if a dangerous ingredient is detected, it intercepts and flags the dish before the user sees it. The whole thing requires zero vendor friction. No new hardware. No reprinted menus.");
}

function slide06Architecture(pptx: pptxgen): void {
  const s = pptx.addSlide();
  paintCanvas(s);
  batikFrame(s);

  headline(s, "AI ARCHITECTURE", { y: 0.55, size: 40 });
  eyebrow(s, "Two pillars · multimodal ingestion + grounded knowledge");

  s.addShape("line", {
    x: PAGE_W / 2, y: 1.85, w: 0, h: 4.8,
    line: { color: C.border, width: 1, dashType: "dash" },
  });

  const leftX = CONTENT_X;
  s.addText("01", {
    x: leftX, y: 1.85, w: 0.7, h: 0.5,
    fontFace: FONT_DISPLAY, fontSize: 28, bold: true, color: C.terra, isTextBox: true,
  });
  s.addText("MULTIMODAL INGESTION", {
    x: leftX + 0.7, y: 1.95, w: 5, h: 0.4,
    fontFace: FONT_DISPLAY, fontSize: 16, bold: true, color: C.ink,
    charSpacing: 1, isTextBox: true,
  });

  iconEye(s, leftX + 1.5, 3.0, 0.5, C.terra);
  s.addShape("rect", {
    x: leftX + 0.3, y: 3.7, w: 5.4, h: 1.7,
    fill: { color: C.cream }, line: { color: C.ink, width: 1 },
  });
  const rows = [
    { y: 3.85, color: C.greenOk, label: "Ayam Goreng" },
    { y: 4.15, color: C.redFlag, label: "Char Kuey Teow" },
    { y: 4.45, color: C.greenOk, label: "Nasi Lemak" },
    { y: 4.75, color: C.redFlag, label: "Oh Chien" },
    { y: 5.05, color: C.greenOk, label: "Roti Canai" },
  ];
  rows.forEach((r) => {
    s.addShape("line", {
      x: leftX + 0.6, y: r.y + 0.18, w: 3, h: 0,
      line: { color: C.inkMuted, width: 0.75 },
    });
    s.addShape("rect", {
      x: leftX + 0.45, y: r.y, w: 4.5, h: 0.28,
      fill: { type: "none" }, line: { color: r.color, width: 1.25, dashType: "dash" },
    });
    s.addText(r.label, {
      x: leftX + 3.7, y: r.y, w: 1.7, h: 0.28,
      fontFace: FONT_BODY, fontSize: 7.5, bold: true, color: r.color,
      align: "right", valign: "middle", isTextBox: true,
    });
  });
  s.addText(
    "Vision mode reads photos & decodes Malaysian shorthand (CKT → Char Kuey Teow, NL → Nasi Lemak, BKT → Bak Kut Teh). Magic Lens returns bounding boxes for live AR overlays.",
    {
      x: leftX, y: 5.55, w: 5.7, h: 1.1,
      fontFace: FONT_BODY, fontSize: 10.5, color: C.ink,
      lineSpacingMultiple: 1.2, isTextBox: true,
    },
  );

  const rightX = PAGE_W / 2 + 0.5;
  s.addText("02", {
    x: rightX, y: 1.85, w: 0.7, h: 0.5,
    fontFace: FONT_DISPLAY, fontSize: 28, bold: true, color: C.green, isTextBox: true,
  });
  s.addText("GROUNDED KNOWLEDGE", {
    x: rightX + 0.7, y: 1.95, w: 5, h: 0.4,
    fontFace: FONT_DISPLAY, fontSize: 16, bold: true, color: C.ink,
    charSpacing: 1, isTextBox: true,
  });

  iconBook(s, rightX + 1.3, 3.05, 0.6, C.green);
  const cards = [
    { x: rightX + 0.2, y: 3.95, color: C.terra, label: "sambal · cited" },
    { x: rightX + 2.4, y: 4.05, color: C.green, label: "cockles · cited" },
    { x: rightX + 1.3, y: 4.45, color: C.goldDeep, label: "pork lard · cited" },
    { x: rightX + 0.5, y: 4.85, color: C.redFlag, label: "shrimp paste · cited" },
    { x: rightX + 2.6, y: 4.95, color: C.greenMid, label: "turmeric · cited" },
  ];
  cards.forEach((c) => {
    s.addShape("roundRect", {
      x: c.x, y: c.y, w: 1.5, h: 0.35,
      fill: { color: C.cream }, line: { color: c.color, width: 1 }, rectRadius: 0.05,
    });
    s.addText(c.label, {
      x: c.x, y: c.y, w: 1.5, h: 0.35,
      fontFace: FONT_BODY, fontSize: 7, bold: true, color: c.color,
      align: "center", valign: "middle", charSpacing: 0.5, isTextBox: true,
    });
    s.addShape("rect", {
      x: c.x + 1.35, y: c.y - 0.05, w: 0.2, h: 0.12,
      fill: { color: c.color }, line: { type: "none" },
    });
    s.addText("©", {
      x: c.x + 1.35, y: c.y - 0.05, w: 0.2, h: 0.12,
      fontFace: FONT_BODY, fontSize: 6, color: C.cream,
      align: "center", valign: "middle", isTextBox: true,
    });
  });
  s.addText(
    "Heritage RAG runs Tavily web search for every ingredient, injects real sources into Gemini, and returns cultural backstories with attribution. Migration mode reconstructs how each dish traveled to Malaysia.",
    {
      x: rightX, y: 5.55, w: 5.7, h: 1.1,
      fontFace: FONT_BODY, fontSize: 10.5, color: C.ink,
      lineSpacingMultiple: 1.2, isTextBox: true,
    },
  );

  footerMarker(s, "03");
  script(s, "Under the hood, the architecture has two pillars. Multimodal ingestion — our Vision mode reads photos, decodes Malaysian shorthand like CKT, and the Magic Lens returns actual bounding-box coordinates so allergen icons and halal badges can be placed on the live camera feed at the exact dish position. The second pillar is grounded knowledge. We don't trust the model to remember what's in sambal — we retrieve it. Tavily searches the web for every ingredient, Gemini synthesizes with those sources injected, and every output carries attribution.");
}

function slide07MagicLens(pptx: pptxgen): void {
  const s = pptx.addSlide();
  paintCanvas(s);
  batikFrame(s);

  s.addShape("roundRect", {
    x: PAGE_W - 2.4, y: 0.55, w: 1.6, h: 0.45,
    fill: { color: C.terra }, line: { color: C.ink, width: 1 }, rectRadius: 0.1,
  });
  s.addText("★ DEMO", {
    x: PAGE_W - 2.4, y: 0.55, w: 1.6, h: 0.45,
    fontFace: FONT_DISPLAY, fontSize: 14, bold: true, color: C.cream,
    align: "center", valign: "middle", charSpacing: 2, isTextBox: true,
  });

  headline(s, "MAGIC LENS", { y: 0.55, size: 40, w: 8 });
  eyebrow(s, "Allergen overlays · Halal & safety badges");

  const phoneX = 4.7;
  const phoneY = 1.95;
  const phoneW = 4.0;
  const phoneH = 4.6;
  phoneFrame(s, phoneX, phoneY, phoneW, phoneH);

  s.addShape("rect", {
    x: phoneX + 0.18, y: phoneY + 0.4, w: phoneW - 0.36, h: phoneH - 0.6,
    fill: { color: C.cream }, line: { color: C.border, width: 0.5 },
  });
  s.addText("MAKAN MAKAN STALL", {
    x: phoneX + 0.18, y: phoneY + 0.45, w: phoneW - 0.36, h: 0.3,
    fontFace: FONT_DISPLAY, fontSize: 10, bold: true, color: C.terra,
    align: "center", isTextBox: true,
  });
  s.addShape("line", {
    x: phoneX + 0.5, y: phoneY + 0.78, w: phoneW - 1, h: 0,
    line: { color: C.ink, width: 0.75 },
  });

  const dishRows = [
    { y: phoneY + 0.95, label: "Char Kuey Teow", bad: true, pork: true },
    { y: phoneY + 1.85, label: "Ayam Goreng", bad: false, translation: "Turmeric-spiced fried chicken" },
    { y: phoneY + 2.75, label: "Nasi Lemak", bad: false },
    { y: phoneY + 3.65, label: "Oh Chien", bad: true, pork: false },
  ];
  dishRows.forEach((r) => {
    const boxColor = r.bad ? C.redFlag : C.greenOk;
    s.addShape("rect", {
      x: phoneX + 0.32, y: r.y, w: phoneW - 0.64, h: 0.78,
      fill: { type: "none" }, line: { color: boxColor, width: 2, dashType: "dash" },
    });
    s.addShape("line", {
      x: phoneX + 0.5, y: r.y + 0.3, w: 1.8, h: 0,
      line: { color: C.inkMuted, width: 1.25 },
    });
    s.addText(r.label, {
      x: phoneX + 0.5, y: r.y + 0.42, w: 2.0, h: 0.25,
      fontFace: FONT_BODY, fontSize: 8, bold: true, color: C.ink, isTextBox: true,
    });
    if (r.bad) {
      iconWarning(s, phoneX + phoneW - 0.55, r.y + 0.2, 0.12, C.redFlag);
      iconShellfish(s, phoneX + phoneW - 0.85, r.y + 0.2, 0.12);
      if (r.pork) {
        s.addShape("roundRect", {
          x: phoneX + phoneW - 1.5, y: r.y + 0.05, w: 0.5, h: 0.2,
          fill: { color: C.redFlag }, line: { color: C.ink, width: 0.4 }, rectRadius: 0.04,
        });
        s.addText("PORK", {
          x: phoneX + phoneW - 1.5, y: r.y + 0.05, w: 0.5, h: 0.2,
          fontFace: FONT_BODY, fontSize: 6, bold: true, color: C.cream,
          align: "center", valign: "middle", isTextBox: true,
        });
      }
    } else {
      iconCheck(s, phoneX + phoneW - 0.55, r.y + 0.2, 0.12);
      if (r.translation) {
        s.addShape("roundRect", {
          x: phoneX + 0.5, y: r.y + 0.5, w: 2.6, h: 0.22,
          fill: { color: C.greenOk }, line: { color: C.ink, width: 0.4 }, rectRadius: 0.04,
        });
        s.addText(r.translation, {
          x: phoneX + 0.55, y: r.y + 0.5, w: 2.5, h: 0.22,
          fontFace: FONT_BODY, fontSize: 6.5, bold: true, color: C.cream,
          align: "center", valign: "middle", isTextBox: true,
        });
      }
    }
  });

  s.addText("ALLERGEN OVERLAYS", {
    x: CONTENT_X, y: 2.1, w: 3.8, h: 0.3,
    fontFace: FONT_DISPLAY, fontSize: 13, bold: true, color: C.terra,
    charSpacing: 1, isTextBox: true,
  });
  s.addText(
    "Vision Agent extracts text, layout and handwriting boundaries and returns percentage-based bounding boxes. Shellfish, peanut, gluten, dairy, egg and soy icons drop onto the exact dish on the live camera feed.",
    {
      x: CONTENT_X, y: 2.45, w: 3.9, h: 1.85,
      fontFace: FONT_BODY, fontSize: 10.5, color: C.ink,
      lineSpacingMultiple: 1.2, isTextBox: true,
    },
  );

  s.addText("HALAL & SAFETY BADGES", {
    x: CONTENT_X, y: 4.55, w: 3.8, h: 0.3,
    fontFace: FONT_DISPLAY, fontSize: 13, bold: true, color: C.green,
    charSpacing: 1, isTextBox: true,
  });
  s.addText(
    "Authentic Char Kuey Teow is flagged for cockles and pork lard. Ayam Goreng is highlighted green with a translated description. Unsafe dishes are intercepted before the user ever sees them.",
    {
      x: CONTENT_X, y: 4.9, w: 3.9, h: 1.7,
      fontFace: FONT_BODY, fontSize: 10.5, color: C.ink,
      lineSpacingMultiple: 1.2, isTextBox: true,
    },
  );

  s.addText("LIVE FEED", {
    x: 9.2, y: 2.1, w: 3.5, h: 0.3,
    fontFace: FONT_BODY, fontSize: 9, bold: true, color: C.terra,
    charSpacing: 3, align: "center", isTextBox: true,
  });

  footerMarker(s, "04");
  script(s, "And here's what that looks like in the user's hand. The Magic Lens. You point your phone at the menu, and the Vision Agent reads handwriting, returns bounding boxes, and we drop allergen icons — shellfish, peanut, gluten, dairy, egg, soy — onto the exact dish on the live camera feed. Char Kuey Teow gets greyed out with a red warning — cockles, pork lard. Ayam Goreng lights up green, with a translated description. This is the moment the allergic tourist feels safe.");
}

function slide08RagCritic(pptx: pptxgen): void {
  const s = pptx.addSlide();
  paintCanvas(s);
  batikFrame(s);

  headline(s, "HERITAGE RAG  +  CRITIC LOOP", { y: 0.55, size: 34 });
  eyebrow(s, "Grounded retrieval · safety audit");

  const flowY = 2.0;
  const flowH = 2.6;

  card(s, 0.7, flowY, 1.8, flowH, { fill: C.creamSoft, line: C.terra });
  s.addText("INPUT", {
    x: 0.7, y: flowY + 0.1, w: 1.8, h: 0.25,
    fontFace: FONT_BODY, fontSize: 8, bold: true, color: C.terra,
    charSpacing: 2, align: "center", isTextBox: true,
  });
  iconPlate(s, 1.6, flowY + 1.0, 0.45);
  s.addText("Char Kuey\nTeow", {
    x: 0.7, y: flowY + 1.6, w: 1.8, h: 0.7,
    fontFace: FONT_DISPLAY, fontSize: 12, bold: true, color: C.ink,
    align: "center", valign: "top", isTextBox: true,
  });

  arrow(s, 2.55, flowY + flowH / 2, 3.05, flowY + flowH / 2, C.gold);

  card(s, 3.1, flowY, 2.0, flowH, { fill: C.cream, line: C.green });
  s.addText("TAVILY SEARCH", {
    x: 3.1, y: flowY + 0.1, w: 2.0, h: 0.25,
    fontFace: FONT_BODY, fontSize: 8, bold: true, color: C.green,
    charSpacing: 1.5, align: "center", isTextBox: true,
  });
  for (let i = 0; i < 4; i++) {
    const dy = flowY + 0.5 + i * 0.42;
    s.addShape("rect", {
      x: 3.45 + i * 0.1, y: dy, w: 1.3, h: 0.32,
      fill: { color: i % 2 ? C.greenTint : C.cream },
      line: { color: C.green, width: 0.75 },
    });
    s.addShape("rect", {
      x: 3.5 + i * 0.1, y: dy - 0.04, w: 0.22, h: 0.1,
      fill: { color: C.green }, line: { type: "none" },
    });
    s.addText(`[ ${i + 1} ]`, {
      x: 4.5 + i * 0.1, y: dy, w: 0.3, h: 0.32,
      fontFace: FONT_BODY, fontSize: 7, bold: true, color: C.green,
      align: "center", valign: "middle", isTextBox: true,
    });
  }

  arrow(s, 5.15, flowY + flowH / 2, 5.65, flowY + flowH / 2, C.gold);

  card(s, 5.7, flowY, 1.9, flowH, { fill: C.terraTint, line: C.terra });
  s.addText("GEMINI SYNTH", {
    x: 5.7, y: flowY + 0.1, w: 1.9, h: 0.25,
    fontFace: FONT_BODY, fontSize: 8, bold: true, color: C.terra,
    charSpacing: 1.5, align: "center", isTextBox: true,
  });
  s.addShape("ellipse", {
    x: 6.35, y: flowY + 0.85, w: 0.9, h: 0.9,
    fill: { color: C.gold, transparency: 30 }, line: { color: C.terra, width: 1.5 },
  });
  s.addShape("ellipse", {
    x: 6.55, y: flowY + 1.05, w: 0.5, h: 0.5,
    fill: { color: C.terra }, line: { color: C.ink, width: 0.5 },
  });
  const orbits = 6;
  for (let i = 0; i < orbits; i++) {
    const ang = (i / orbits) * Math.PI * 2;
    const r = 0.8;
    const ox = 6.8 + Math.cos(ang) * r;
    const oy = flowY + 1.3 + Math.sin(ang) * r;
    s.addShape("ellipse", {
      x: ox - 0.05, y: oy - 0.05, w: 0.1, h: 0.1,
      fill: { color: C.green }, line: { type: "none" },
    });
  }

  arrow(s, 7.65, flowY + flowH / 2, 8.15, flowY + flowH / 2, C.gold);

  card(s, 8.2, flowY, 2.1, flowH, { fill: C.cream, line: C.terra });
  s.addText("CRITIC AUDIT", {
    x: 8.2, y: flowY + 0.1, w: 2.1, h: 0.25,
    fontFace: FONT_BODY, fontSize: 8, bold: true, color: C.terra,
    charSpacing: 1.5, align: "center", isTextBox: true,
  });
  iconShield(s, 9.25, flowY + 1.0, 0.35, C.terra);
  s.addShape("roundRect", {
    x: 8.45, y: flowY + 1.55, w: 1.6, h: 0.65,
    fill: { color: C.cream }, line: { color: C.green, width: 1 }, rectRadius: 0.05,
  });
  s.addText("USER PROFILE", {
    x: 8.45, y: flowY + 1.58, w: 1.6, h: 0.2,
    fontFace: FONT_BODY, fontSize: 6.5, bold: true, color: C.green,
    align: "center", isTextBox: true,
  });
  iconShellfish(s, 8.8, flowY + 1.95, 0.13);
  s.addShape("line", {
    x: 8.65, y: flowY + 2.01, w: 0.32, h: 0,
    line: { color: C.redFlag, width: 2 },
  });
  s.addText("shellfish", {
    x: 9.0, y: flowY + 1.88, w: 1.0, h: 0.18,
    fontFace: FONT_BODY, fontSize: 7, color: C.ink, isTextBox: true,
  });
  s.addText("halal · mild", {
    x: 8.6, y: flowY + 2.05, w: 1.4, h: 0.18,
    fontFace: FONT_BODY, fontSize: 7, color: C.inkMuted,
    align: "center", isTextBox: true,
  });

  arrow(s, 10.35, flowY + 0.7, 11.4, flowY + 0.5, C.greenOk);
  card(s, 11.4, flowY + 0.2, 1.4, 0.7, { fill: C.greenTint, line: C.greenOk });
  iconCheck(s, 11.7, flowY + 0.55, 0.13);
  s.addText("SAFE", {
    x: 11.85, y: flowY + 0.32, w: 0.9, h: 0.45,
    fontFace: FONT_DISPLAY, fontSize: 12, bold: true, color: C.greenOk,
    align: "center", valign: "middle", isTextBox: true,
  });
  arrow(s, 10.35, flowY + flowH - 0.7, 11.4, flowY + flowH - 0.5, C.redFlag);
  card(s, 11.4, flowY + flowH - 0.9, 1.4, 0.7, { fill: C.redTint, line: C.redFlag });
  iconWarning(s, 11.7, flowY + flowH - 0.55, 0.13);
  s.addText("FLAG", {
    x: 11.85, y: flowY + flowH - 0.78, w: 0.9, h: 0.45,
    fontFace: FONT_DISPLAY, fontSize: 12, bold: true, color: C.redFlag,
    align: "center", valign: "middle", isTextBox: true,
  });

  s.addText("01  GROUNDED RETRIEVAL", {
    x: CONTENT_X, y: 5.0, w: 6, h: 0.3,
    fontFace: FONT_DISPLAY, fontSize: 13, bold: true, color: C.green,
    charSpacing: 1, isTextBox: true,
  });
  s.addText(
    'Tavily queries "<ingredient> <dish> Malaysian food culture history origin". Results are formatted and injected into the Gemini context. Every output carries source attribution; graceful fallback is flagged if search fails.',
    {
      x: CONTENT_X, y: 5.3, w: 6.1, h: 1.4,
      fontFace: FONT_BODY, fontSize: 10, color: C.ink,
      lineSpacingMultiple: 1.15, isTextBox: true,
    },
  );

  s.addText("02  SAFETY AUDIT", {
    x: 7.0, y: 5.0, w: 5.5, h: 0.3,
    fontFace: FONT_DISPLAY, fontSize: 13, bold: true, color: C.terra,
    charSpacing: 1, isTextBox: true,
  });
  s.addText(
    "Magic Lens cross-references the user's profile (allergies, Halal, spice tolerance) against the retrieved ingredient matrix. Dangerous matches are greyed out with a red warning badge — a human-in-the-loop guardrail, not a guess.",
    {
      x: 7.0, y: 5.3, w: 5.6, h: 1.4,
      fontFace: FONT_BODY, fontSize: 10, color: C.ink,
      lineSpacingMultiple: 1.15, isTextBox: true,
    },
  );

  footerMarker(s, "04");
  script(s, "Two technical details matter here. First, retrieval is grounded — we search the web for the actual ingredient and its history, inject those sources into the model, and every response carries attribution. If search fails, we flag the response as a fallback rather than hallucinate. Second, the Critic loop. The model's output never reaches the user until it's been audited against their profile — allergies, Halal, spice tolerance. A dangerous match gets intercepted and replaced with a red warning badge. This is human-in-the-loop safety, not a guess.");
}

// ---------------------------------------------------------------------------
// SLIDE BUILDERS — slides 9-11
// ---------------------------------------------------------------------------

function drawStoryboardScreen(
  s: Slide, x: number, y: number, w: number, h: number,
  kind: string, color: string,
): void {
  s.addShape("rect", {
    x, y, w, h, fill: { color: C.cream }, line: { color: C.border, width: 0.4 },
  });
  if (kind === "onboard") {
    s.addText("YOUR PROFILE", {
      x, y: y + 0.05, w, h: 0.18,
      fontFace: FONT_BODY, fontSize: 6, bold: true, color: C.terra,
      align: "center", isTextBox: true,
    });
    const toggles: Array<[string, string]> = [
      ["seafood", C.redFlag],
      ["mild spice", C.goldDeep],
      ["halal", C.green],
    ];
    toggles.forEach(([lbl, c], i) => {
      const ty = y + 0.28 + i * 0.25;
      s.addShape("roundRect", {
        x: x + 0.1, y: ty, w: 0.3, h: 0.16,
        fill: { color: c }, line: { color: C.ink, width: 0.4 }, rectRadius: 0.06,
      });
      s.addText(lbl, {
        x: x + 0.45, y: ty - 0.02, w: w - 0.5, h: 0.2,
        fontFace: FONT_BODY, fontSize: 6, color: C.ink, isTextBox: true,
      });
    });
  } else if (kind === "capture") {
    s.addShape("rect", {
      x: x + 0.2, y: y + 0.2, w: w - 0.4, h: h - 0.4,
      fill: { color: C.surfaceDk }, line: { color: C.ink, width: 0.5 },
    });
    for (let i = 0; i < 4; i++) {
      s.addShape("line", {
        x: x + 0.35, y: y + 0.4 + i * 0.22, w: w - 0.7, h: 0,
        line: { color: C.inkMuted, width: 0.6, dashType: "dash" },
      });
    }
    const corners: Array<[number, number]> = [
      [x + 0.1, y + 0.1], [x + w - 0.25, y + 0.1],
      [x + 0.1, y + h - 0.25], [x + w - 0.25, y + h - 0.25],
    ];
    corners.forEach(([cx, cy]) => {
      s.addShape("rect", {
        x: cx, y: cy, w: 0.15, h: 0.15,
        fill: { type: "none" }, line: { color, width: 1.5 },
      });
    });
  } else if (kind === "extract") {
    s.addText("PARSING…", {
      x, y: y + 0.05, w, h: 0.2,
      fontFace: FONT_BODY, fontSize: 6, bold: true, color: color,
      align: "center", isTextBox: true,
    });
    const lines = ["Char Kuey Teow", "Ayam Goreng", "Nasi Lemak"];
    lines.forEach((t, i) => {
      const ly = y + 0.3 + i * 0.3;
      s.addShape("roundRect", {
        x: x + 0.15, y: ly, w: w - 0.3, h: 0.22,
        fill: { color: i < 2 ? C.greenTint : C.cream },
        line: { color: C.green, width: 0.5 }, rectRadius: 0.04,
      });
      s.addText(t, {
        x: x + 0.2, y: ly, w: w - 0.4, h: 0.22,
        fontFace: FONT_BODY, fontSize: 6, bold: i < 2, color: C.ink,
        align: "left", valign: "middle", isTextBox: true,
      });
    });
  } else if (kind === "evaluate") {
    s.addText("CRITIC CHECK", {
      x, y: y + 0.05, w, h: 0.2,
      fontFace: FONT_BODY, fontSize: 6, bold: true, color: color,
      align: "center", isTextBox: true,
    });
    iconShield(s, x + w / 2, y + 0.6, 0.22, color);
    s.addText("CKT  vs  profile", {
      x, y: y + 0.95, w, h: 0.2,
      fontFace: FONT_BODY, fontSize: 6, color: C.ink,
      align: "center", isTextBox: true,
    });
    iconShellfish(s, x + w / 2, y + h - 0.25, 0.13);
    s.addShape("line", {
      x: x + w / 2 - 0.16, y: y + h - 0.25, w: 0.32, h: 0,
      line: { color: C.redFlag, width: 2 },
    });
    s.addText("cockles = seafood", {
      x, y: y + h - 0.13, w, h: 0.13,
      fontFace: FONT_BODY, fontSize: 5.5, bold: true, color: C.redFlag,
      align: "center", isTextBox: true,
    });
  } else {
    s.addShape("roundRect", {
      x: x + 0.1, y: y + 0.15, w: w - 0.2, h: 0.4,
      fill: { color: C.redTint }, line: { color: C.redFlag, width: 1, dashType: "dash" },
      rectRadius: 0.04,
    });
    s.addText("CKT — flagged", {
      x: x + 0.15, y: y + 0.18, w: w - 0.3, h: 0.34,
      fontFace: FONT_BODY, fontSize: 6, bold: true, color: C.redFlag,
      align: "center", valign: "middle", isTextBox: true,
    });
    s.addShape("roundRect", {
      x: x + 0.1, y: y + 0.65, w: w - 0.2, h: 0.4,
      fill: { color: C.greenTint }, line: { color: C.greenOk, width: 1, dashType: "dash" },
      rectRadius: 0.04,
    });
    iconCheck(s, x + 0.3, y + 0.85, 0.08);
    s.addText("Ayam Goreng ✓", {
      x: x + 0.45, y: y + 0.68, w: w - 0.5, h: 0.34,
      fontFace: FONT_BODY, fontSize: 6, bold: true, color: C.greenOk,
      align: "left", valign: "middle", isTextBox: true,
    });
  }
}

function slide09HeroFlow(pptx: pptxgen): void {
  const s = pptx.addSlide();
  paintCanvas(s);
  batikFrame(s);

  headline(s, "THE HERO FLOW", { y: 0.55, size: 40 });
  eyebrow(s, "Five seconds · on-device feel · end to end");

  const steps: Array<[string, string, string, string, string]> = [
    ["01", "ONBOARDING", "Tourist toggles profile: seafood allergy, mild spice, Halal.", C.terra, "onboard"],
    ["02", "CAPTURE", "Snap the handwritten Penang hawker board.", C.green, "capture"],
    ["03", "EXTRACTION", "Vision Agent reads CKT and Ayam Goreng.", C.goldDeep, "extract"],
    ["04", "EVALUATION", "Critic cross-references RAG — CKT contains cockles.", C.terra, "evaluate"],
    ["05", "RENDER", "CKT greyed out, red warning. Ayam Goreng highlighted green.", C.green, "render"],
  ];

  const panelW = 2.35;
  const panelH = 4.4;
  const gap = 0.13;
  const totalW = panelW * 5 + gap * 4;
  const startX = (PAGE_W - totalW) / 2;
  const topY = 1.7;

  steps.forEach(([n, title, body, color, screen], i) => {
    const x = startX + i * (panelW + gap);
    card(s, x, topY, panelW, panelH, { fill: C.creamSoft, line: color, lineW: 1.25 });
    s.addShape("rect", {
      x, y: topY, w: panelW, h: 0.45,
      fill: { color }, line: { color, width: 0.75 },
    });
    s.addText(n, {
      x, y: topY, w: panelW, h: 0.45,
      fontFace: FONT_DISPLAY, fontSize: 14, bold: true, color: C.cream,
      align: "center", valign: "middle", isTextBox: true,
    });
    s.addText(title, {
      x: x + 0.05, y: topY + 0.5, w: panelW - 0.1, h: 0.3,
      fontFace: FONT_DISPLAY, fontSize: 11, bold: true, color: C.ink,
      align: "center", charSpacing: 1, isTextBox: true,
    });

    const mx = x + 0.35;
    const my = topY + 0.95;
    const mw = panelW - 0.7;
    const mh = 1.95;
    phoneFrame(s, mx, my, mw, mh);
    drawStoryboardScreen(s, mx + 0.1, my + 0.3, mw - 0.2, mh - 0.45, screen, color);

    s.addText(body, {
      x: x + 0.15, y: topY + 3.05, w: panelW - 0.3, h: 1.2,
      fontFace: FONT_BODY, fontSize: 9, color: C.ink,
      align: "center", valign: "top", lineSpacingMultiple: 1.15, isTextBox: true,
    });

    if (i < steps.length - 1) {
      s.addText("▸", {
        x: x + panelW - 0.05, y: topY + panelH / 2 - 0.2, w: gap + 0.1, h: 0.4,
        fontFace: FONT_DISPLAY, fontSize: 14, bold: true, color: C.gold,
        align: "center", valign: "middle", isTextBox: true,
      });
    }
  });

  footerMarker(s, "05");
  script(s, "End to end, here's the hero flow. The tourist onboardes — toggles seafood allergy, mild spice, Halal. They sit down at a Penang Char Kuey Teow stall, snap the board. Vision extracts 'Char Kuey Teow' and 'Ayam Goreng.' The Critic cross-references RAG and realizes authentic Char Kuey Teow contains cockles — seafood. The UI updates instantly: CKT is greyed out with a red warning. Ayam Goreng lights up green with an English description. Five seconds, end to end, on-device feel.");
}

function slide10Edge(pptx: pptxgen): void {
  const s = pptx.addSlide();
  paintCanvas(s);
  batikFrame(s);

  headline(s, "THE ALGORITHMIC EDGE", { y: 0.55, size: 38 });
  eyebrow(s, "Fewer reviews = higher rank · the invisible uncle beats the viral cafe");

  const chartX = 3.9;
  const chartY = 2.0;
  const chartW = 5.5;
  const chartH = 2.9;

  card(s, chartX - 0.2, chartY - 0.5, chartW + 0.4, chartH + 0.85, {
    fill: C.creamSoft, line: C.border, lineW: 0.75,
  });
  s.addText("FEWER DOTS  →  TALLER BAR", {
    x: chartX - 0.2, y: chartY - 0.42, w: chartW + 0.4, h: 0.25,
    fontFace: FONT_BODY, fontSize: 8, bold: true, color: C.terra,
    charSpacing: 2, align: "center", isTextBox: true,
  });
  s.addShape("line", {
    x: chartX, y: chartY + chartH, w: chartW, h: 0,
    line: { color: C.ink, width: 1.5 },
  });

  const cols = [
    { dots: 1, barH: 2.4, color: C.terra, trophy: true, label: "15 reviews" },
    { dots: 3, barH: 1.7, color: C.terraMid, label: "80 reviews" },
    { dots: 8, barH: 0.9, color: C.goldDeep, label: "500 reviews" },
    { dots: 14, barH: 0.35, color: C.greyDk, grey: true, label: "9k reviews" },
  ];
  const colSlot = (chartW - 0.6) / 4;
  cols.forEach((c, i) => {
    const cx = chartX + 0.3 + i * colSlot;
    const dotR = 0.07;
    const dotsPerRow = 5;
    for (let d = 0; d < c.dots; d++) {
      const row = Math.floor(d / dotsPerRow);
      const coln = d % dotsPerRow;
      s.addShape("ellipse", {
        x: cx + 0.2 + coln * (dotR * 2.2) - row * 0.05,
        y: chartY + chartH - 0.2 - row * (dotR * 2.2),
        w: dotR * 2, h: dotR * 2,
        fill: { color: c.grey ? C.greyDk : C.inkMuted }, line: { type: "none" },
      });
    }
    s.addShape("rect", {
      x: cx + 0.2, y: chartY + chartH - 0.5 - c.barH, w: colSlot - 0.4, h: c.barH,
      fill: { color: c.color }, line: { color: C.ink, width: 0.5 },
    });
    if (c.trophy) {
      iconTrophy(s, cx + colSlot / 2, chartY + chartH - 0.5 - c.barH - 0.3, 0.28, C.gold);
    }
    s.addText(c.label, {
      x: cx, y: chartY + chartH + 0.05, w: colSlot, h: 0.2,
      fontFace: FONT_BODY, fontSize: 7, color: C.inkMuted,
      align: "center", isTextBox: true,
    });
  });

  const edgeCols = [
    {
      icon: "trophy" as const,
      title: "INVERTED RANKING",
      body: "35% taste similarity, 30% Invisibility Boost, 20% Diversity Gap, 15% Proximity. The recommender deliberately inverts standard logic — fewer reviews means higher rank.",
      color: C.terra,
    },
    {
      icon: "lens" as const,
      title: "INVISIBILITY BOOST",
      body: "Stalls with fewer online reviews score higher: 1 − (reviews / 200), plus a 15-point bonus for true grassroots venues. The hidden uncle beats the viral cafe.",
      color: C.green,
    },
    {
      icon: "roots" as const,
      title: "AKAR SCORE",
      body: "Heritage score = age × 30% + scarcity × 30% + base × 40%. Tiers: Legendary 90+, Rare 75+, Uncommon 55+, Common. Drives card rarity and trail highlights.",
      color: C.goldDeep,
    },
  ];
  const ew = CONTENT_W / 3 - 0.15;
  const ey = 5.7;
  edgeCols.forEach((c, i) => {
    const x = CONTENT_X + i * (ew + 0.2);
    if (c.icon === "trophy") iconTrophy(s, x + 0.25, ey + 0.2, 0.18, c.color, true);
    else if (c.icon === "lens") iconLens(s, x + 0.25, ey + 0.2, 0.2, c.color);
    else iconRoots(s, x + 0.25, ey + 0.25, 0.22, c.color);
    s.addText(c.title, {
      x: x + 0.55, y: ey + 0.05, w: ew - 0.6, h: 0.3,
      fontFace: FONT_DISPLAY, fontSize: 11, bold: true, color: c.color,
      charSpacing: 0.5, isTextBox: true,
    });
    s.addText(c.body, {
      x, y: ey + 0.4, w: ew, h: 1.0,
      fontFace: FONT_BODY, fontSize: 8.5, color: C.ink,
      lineSpacingMultiple: 1.15, isTextBox: true,
    });
  });

  footerMarker(s, "06");
  script(s, "Here's where MakanMate gets opinionated. Our recommender deliberately inverts standard logic. Standard apps push you to the viral place with ten thousand reviews. We push you to the invisible uncle with fifteen. The Invisibility Boost is a literal term in our scoring — 1 minus reviews over 200, plus a 15-point bonus for grassroots venues. The Akar Score — Akar means 'root' in Malay — grades each stall on age, scarcity, and heritage, mapping to rarity tiers from Common to Legendary. The hidden uncle beats the viral cafe. That's the algorithmic moat.");
}

function slide11Gamified(pptx: pptxgen): void {
  const s = pptx.addSlide();
  paintCanvas(s);
  batikFrame(s);

  headline(s, "GAMIFIED DISCOVERY", { y: 0.55, size: 38 });
  eyebrow(s, "Heritage radar · pokédex · blueprint · trails");

  const mockW = 3.9;
  const mockH = 2.8;
  const gap = 0.3;
  const totalW = mockW * 3 + gap * 2;
  const startX = (PAGE_W - totalW) / 2;
  const topY = 1.85;

  // MOCKUP 1: Heritage Radar
  let mx = startX;
  card(s, mx, topY, mockW, mockH, { fill: C.cream, line: C.green, lineW: 1.25 });
  s.addText("HERITAGE RADAR", {
    x: mx, y: topY + 0.1, w: mockW, h: 0.3,
    fontFace: FONT_DISPLAY, fontSize: 12, bold: true, color: C.green,
    charSpacing: 1, align: "center", isTextBox: true,
  });
  s.addShape("rect", {
    x: mx + 0.2, y: topY + 0.45, w: mockW - 0.4, h: mockH - 1.3,
    fill: { color: C.greenTint }, line: { color: C.green, width: 0.5 },
  });
  for (let i = 0; i < 4; i++) {
    s.addShape("line", {
      x: mx + 0.2, y: topY + 0.7 + i * 0.4, w: mockW - 0.4, h: 0,
      line: { color: C.border, width: 0.5 },
    });
    s.addShape("line", {
      x: mx + 0.6 + i * 0.8, y: topY + 0.45, w: 0, h: mockH - 1.3,
      line: { color: C.border, width: 0.5 },
    });
  }
  const pins = [
    { x: mx + 0.8, y: topY + 0.9, grassroots: true },
    { x: mx + 2.3, y: topY + 1.3, grassroots: true },
    { x: mx + 1.5, y: topY + 1.8, grassroots: true },
    { x: mx + 2.9, y: topY + 0.85, grassroots: false },
    { x: mx + 3.1, y: topY + 1.7, grassroots: true },
  ];
  pins.forEach((p) => {
    if (p.grassroots) {
      s.addShape("ellipse", {
        x: p.x - 0.15, y: p.y - 0.15, w: 0.4, h: 0.4,
        fill: { color: C.terra, transparency: 50 }, line: { type: "none" },
      });
      s.addShape("ellipse", {
        x: p.x - 0.05, y: p.y - 0.05, w: 0.16, h: 0.16,
        fill: { color: C.terra }, line: { color: C.ink, width: 0.5 },
      });
    } else {
      s.addShape("ellipse", {
        x: p.x - 0.06, y: p.y - 0.06, w: 0.14, h: 0.14,
        fill: { color: C.grey }, line: { color: C.ink, width: 0.5 },
      });
    }
  });
  iconUser(s, mx + 0.45, topY + mockH - 0.45, 0.18, C.terra);
  s.addText("Uncle Lim narrates", {
    x: mx + 0.75, y: topY + mockH - 0.55, w: 2.2, h: 0.2,
    fontFace: FONT_BODY, fontSize: 8, bold: true, color: C.ink, isTextBox: true,
  });
  for (let i = 0; i < 4; i++) {
    s.addShape("line", {
      x: mx + mockW - 1.0 + i * 0.12, y: topY + mockH - 0.5,
      w: 0, h: 0.15 + (i % 2) * 0.1,
      line: { color: C.terra, width: 1.5 },
    });
  }

  // MOCKUP 2: Pokédex grid
  mx = startX + (mockW + gap);
  card(s, mx, topY, mockW, mockH, { fill: C.cream, line: C.terra, lineW: 1.25 });
  s.addText("POKÉDEX COLLECTION", {
    x: mx, y: topY + 0.1, w: mockW, h: 0.3,
    fontFace: FONT_DISPLAY, fontSize: 12, bold: true, color: C.terra,
    charSpacing: 1, align: "center", isTextBox: true,
  });
  const rarityColors = [C.gold, C.bronze, C.greenMid, C.silver, C.gold, C.bronze];
  const cardW = (mockW - 0.6) / 3;
  const cardH = 0.85;
  for (let i = 0; i < 6; i++) {
    const r = Math.floor(i / 3);
    const c = i % 3;
    const cx = mx + 0.2 + c * cardW;
    const cy = topY + 0.5 + r * (cardH + 0.1);
    s.addShape("roundRect", {
      x: cx + 0.05, y: cy, w: cardW - 0.1, h: cardH,
      fill: { color: C.creamSoft }, line: { color: rarityColors[i], width: 1 },
      rectRadius: 0.05,
    });
    s.addShape("ellipse", {
      x: cx + cardW / 2 - 0.1, y: cy + 0.05, w: 0.2, h: 0.18,
      fill: { color: rarityColors[i] }, line: { color: C.ink, width: 0.5 },
    });
    iconPlate(s, cx + cardW / 2, cy + 0.5, 0.18, rarityColors[i]);
    if (rarityColors[i] === C.gold) {
      s.addShape("ellipse", {
        x: cx + cardW - 0.2, y: cy + 0.05, w: 0.08, h: 0.08,
        fill: { color: C.gold }, line: { type: "none" },
      });
    }
  }

  // MOCKUP 3: Heritage Blueprint
  mx = startX + 2 * (mockW + gap);
  card(s, mx, topY, mockW, mockH, { fill: C.cream, line: C.goldDeep, lineW: 1.25 });
  s.addText("HERITAGE BLUEPRINT", {
    x: mx, y: topY + 0.1, w: mockW, h: 0.3,
    fontFace: FONT_DISPLAY, fontSize: 12, bold: true, color: C.goldDeep,
    charSpacing: 1, align: "center", isTextBox: true,
  });
  const ccx = mx + mockW / 2;
  const ccy = topY + mockH / 2 + 0.1;
  s.addShape("ellipse", {
    x: ccx - 0.4, y: ccy - 0.3, w: 0.8, h: 0.6,
    fill: { color: C.gold, transparency: 30 }, line: { color: C.terra, width: 1.5 },
  });
  iconPlate(s, ccx, ccy, 0.25);
  const nodes = 6;
  const radius = 1.1;
  const ingredients = ["rice", "coconut", "anchovy", "peanut", "egg", "sambal"];
  for (let i = 0; i < nodes; i++) {
    const ang = (i / nodes) * Math.PI * 2 - Math.PI / 2;
    const nx = ccx + Math.cos(ang) * radius;
    const ny = ccy + Math.sin(ang) * radius * 0.7;
    s.addShape("line", {
      x: ccx, y: ccy, w: nx - ccx, h: ny - ccy,
      line: { color: C.border, width: 0.75, dashType: "sysDot" },
    });
    s.addShape("ellipse", {
      x: nx - 0.18, y: ny - 0.12, w: 0.36, h: 0.24,
      fill: { color: C.greenTint }, line: { color: C.green, width: 0.75 },
    });
    s.addText(ingredients[i], {
      x: nx - 0.18, y: ny - 0.12, w: 0.36, h: 0.24,
      fontFace: FONT_BODY, fontSize: 5, color: C.ink,
      align: "center", valign: "middle", isTextBox: true,
    });
  }

  const bodies = [
    "HERITAGE RADAR — MapLibre GPS map, grassroots pins pulse, hyped mall stalls greyed out. Three regional voice personas — Uncle Lim, Auntie Kamala, Ah Kong — narrate as you approach, via browser-native Web Speech.",
    "POKÉDEX + BLUEPRINT — Catch flow validates GPS and reveals rarity-tiered cards. Heritage Blueprint renders an interactive 3D knowledge graph (React Three Fiber) — tap any ingredient node and RAG-powered cultural lore streams in.",
    "HERITAGE TRAILS — Three or more catches connect into a trail with an AI-generated narrative, route map and shareable PNG card.",
  ];
  bodies.forEach((body, i) => {
    const x = startX + i * (mockW + gap);
    s.addText(body, {
      x, y: topY + mockH + 0.2, w: mockW, h: 1.1,
      fontFace: FONT_BODY, fontSize: 9.5, color: C.ink,
      lineSpacingMultiple: 1.2, isTextBox: true,
    });
  });

  footerMarker(s, "07");
  script(s, "We wrapped all that intelligence in gamification so it actually gets used. Heritage Radar — pulsing GPS pins, with three regional voice personas that narrate as you walk up, browser-native speech, no API key. Pokedex — you catch cards by physically visiting stalls. Heritage Blueprint — a 3D knowledge graph in React Three Fiber; tap any ingredient and RAG-powered lore streams in. And Heritage Trails — connect three catches into a shareable story. The AI does the heavy lifting; the UX makes it sticky.");
}

// ---------------------------------------------------------------------------
// SLIDE BUILDERS — slides 12-14
// ---------------------------------------------------------------------------

function slide12TechStack(pptx: pptxgen): void {
  const s = pptx.addSlide();
  paintCanvas(s);
  batikFrame(s);

  headline(s, "TECH STACK", { y: 0.55, size: 40 });
  eyebrow(s, "Single API route · 6 Gemini modes · Zod-validated tools");

  // Constellation center
  const cx = PAGE_W / 2;
  const cy = 4.0;
  s.addShape("ellipse", {
    x: cx - 0.7, y: cy - 0.45, w: 1.4, h: 0.9,
    fill: { color: C.terra }, line: { color: C.ink, width: 1.5 },
  });
  s.addShape("ellipse", {
    x: cx - 0.55, y: cy - 0.3, w: 1.1, h: 0.6,
    fill: { color: C.terra, transparency: 50 }, line: { type: "none" },
  });
  s.addText("MakanMate", {
    x: cx - 0.7, y: cy - 0.45, w: 1.4, h: 0.9,
    fontFace: FONT_DISPLAY, fontSize: 11, bold: true, color: C.cream,
    align: "center", valign: "middle", isTextBox: true,
  });

  // 8 orbiting nodes (mix of green frontend + red AI/data)
  type Node = {
    label: string; angle: number; r: number; cluster: "fe" | "ai"; shape: "framework" | "db" | "ai" | "lens" | "3d" | "pin" | "box" | "mic";
  };
  const nodes: Node[] = [
    { label: "Next.js 16",   angle: -Math.PI / 2,         r: 2.6, cluster: "fe", shape: "framework" },
    { label: "React 19",     angle: -Math.PI / 4,         r: 2.4, cluster: "fe", shape: "framework" },
    { label: "React Three",  angle: 0,                    r: 2.6, cluster: "fe", shape: "3d" },
    { label: "MapLibre",     angle: Math.PI / 4,          r: 2.4, cluster: "fe", shape: "pin" },
    { label: "Zustand",      angle: Math.PI / 2,          r: 2.6, cluster: "fe", shape: "box" },
    { label: "Web Speech",   angle: (3 * Math.PI) / 4,    r: 2.4, cluster: "fe", shape: "mic" },
    { label: "Gemini",       angle: Math.PI,              r: 2.6, cluster: "ai", shape: "ai" },
    { label: "Tavily",       angle: (5 * Math.PI) / 4,    r: 2.4, cluster: "ai", shape: "lens" },
    { label: "Vercel AI",    angle: (3 * Math.PI) / 2,    r: 2.6, cluster: "ai", shape: "ai" },
    { label: "Zod",          angle: (7 * Math.PI) / 4,    r: 2.4, cluster: "ai", shape: "db" },
  ];
  nodes.forEach((n) => {
    const nx = cx + Math.cos(n.angle) * n.r;
    const ny = cy + Math.sin(n.angle) * n.r * 0.75;
    const color = n.cluster === "fe" ? C.green : C.terra;
    // connector
    s.addShape("line", {
      x: cx, y: cy, w: nx - cx, h: ny - cy,
      line: { color: n.cluster === "fe" ? C.greenMid : C.terraMid, width: 0.75, dashType: "sysDot" },
    });
    // node badge
    s.addShape("roundRect", {
      x: nx - 0.7, y: ny - 0.22, w: 1.4, h: 0.44,
      fill: { color: C.cream }, line: { color, width: 1.25 }, rectRadius: 0.08,
    });
    s.addShape("rect", {
      x: nx - 0.7, y: ny - 0.22, w: 0.08, h: 0.44,
      fill: { color }, line: { type: "none" },
    });
    s.addText(n.label, {
      x: nx - 0.6, y: ny - 0.22, w: 1.25, h: 0.44,
      fontFace: FONT_BODY, fontSize: 8.5, bold: true, color: C.ink,
      align: "center", valign: "middle", isTextBox: true,
    });
  });

  // Legend bottom-left
  s.addShape("roundRect", {
    x: CONTENT_X, y: 5.75, w: 0.25, h: 0.25,
    fill: { color: C.green }, line: { color: C.ink, width: 0.5 }, rectRadius: 0.03,
  });
  s.addText("Frontend & client intelligence", {
    x: CONTENT_X + 0.35, y: 5.72, w: 5, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.green,
    charSpacing: 1, isTextBox: true,
  });
  s.addShape("roundRect", {
    x: CONTENT_X, y: 6.15, w: 0.25, h: 0.25,
    fill: { color: C.terra }, line: { color: C.ink, width: 0.5 }, rectRadius: 0.03,
  });
  s.addText("AI & data", {
    x: CONTENT_X + 0.35, y: 6.12, w: 5, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.terra,
    charSpacing: 1, isTextBox: true,
  });

  // Right-side caption: bullet list of pillars
  s.addText("FRONTEND & CLIENT INTELLIGENCE", {
    x: 8.7, y: 1.9, w: 4.2, h: 0.3,
    fontFace: FONT_DISPLAY, fontSize: 11, bold: true, color: C.green,
    charSpacing: 1, isTextBox: true,
  });
  s.addText(
    "Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · Zustand + localStorage. React Three Fiber + drei for the 3D knowledge graph. MapLibre GL + CARTO (no API key) for the radar. Web Speech API for narration.",
    {
      x: 8.7, y: 2.25, w: 4.2, h: 1.6,
      fontFace: FONT_BODY, fontSize: 9.5, color: C.ink,
      lineSpacingMultiple: 1.2, isTextBox: true,
    },
  );
  s.addText("AI & DATA", {
    x: 8.7, y: 4.05, w: 4.2, h: 0.3,
    fontFace: FONT_DISPLAY, fontSize: 11, bold: true, color: C.terra,
    charSpacing: 1, isTextBox: true,
  });
  s.addText(
    "Single /api/chat route dispatches to an orchestrator running 6 Gemini modes with Zod-validated tool schemas and toolChoice=required. Tavily powers ingredient RAG. Dataset: 16 heritage nodes + 12 dish knowledge graphs curated by hand.",
    {
      x: 8.7, y: 4.4, w: 4.2, h: 1.9,
      fontFace: FONT_BODY, fontSize: 9.5, color: C.ink,
      lineSpacingMultiple: 1.2, isTextBox: true,
    },
  );

  footerMarker(s, "08");
  script(s, "Quick tech credibility. Next.js 16, React 19, TypeScript end-to-end. A single API route dispatches to an orchestrator running six Gemini modes — every mode uses Zod-validated tool schemas with toolChoice required, so output is always structured. Tavily powers the RAG. The 3D graph is React Three Fiber, the map is MapLibre with no API key, voice is Web Speech. And the dataset — 16 heritage nodes and 12 dish knowledge graphs — is hand-curated. That's the moat.");
}

function slide13WhyWeWin(pptx: pptxgen): void {
  const s = pptx.addSlide();
  paintCanvas(s);
  batikFrame(s);

  headline(s, "WHY WE WIN", { y: 0.55, size: 42 });
  eyebrow(s, "Hyper-local impact · responsible AI · cultural preservation");

  // Banner held up by three pillars
  s.addShape("roundRect", {
    x: CONTENT_X + 0.4, y: 1.7, w: CONTENT_W - 0.8, h: 0.65,
    fill: { color: C.terra }, line: { color: C.ink, width: 1.25 }, rectRadius: 0.08,
  });
  s.addText("MakanMate", {
    x: CONTENT_X + 0.4, y: 1.7, w: CONTENT_W - 0.8, h: 0.65,
    fontFace: FONT_DISPLAY, fontSize: 22, bold: true, color: C.cream,
    align: "center", valign: "middle", charSpacing: 4, isTextBox: true,
  });

  const pillars = [
    {
      title: "HYPER-LOCAL IMPACT",
      body: "Empowers Malaysian B40 hawkers without requiring new tech, reprinted menus, or vendor onboarding. Inverted-Ranking sends tourists to the most invisible heritage stalls, not the loudest.",
      color: C.terra,
      icon: "uncle" as const,
    },
    {
      title: "RESPONSIBLE AI",
      body: "Heritage RAG grounds every ingredient claim in cited sources. Magic Lens safety flags intercept unsafe dishes before the user sees them. Cultural preservation: every meal becomes an educational story before the hawker retires.",
      color: C.green,
      icon: "shield" as const,
    },
    {
      title: "CULTURAL PRESERVATION",
      body: "Every dish carries its migration story, ingredient genealogy, and rarity tier. The hawker's craft is captured as a shareable, citable artifact — locked in before the generation that cooked it retires.",
      color: C.goldDeep,
      icon: "grandma" as const,
    },
  ];
  const pillarW = 3.85;
  const pillarH = 3.5;
  const pillarGap = 0.25;
  const startX = (PAGE_W - (pillarW * 3 + pillarGap * 2)) / 2;
  const topY = 2.55;
  pillars.forEach((p, i) => {
    const x = startX + i * (pillarW + pillarGap);
    // pillar body
    s.addShape("roundRect", {
      x: x + 0.5, y: topY + 1.0, w: pillarW - 1.0, h: pillarH - 1.0,
      fill: { color: C.surface }, line: { color: p.color, width: 1.25 }, rectRadius: 0.05,
    });
    // pillar capital
    s.addShape("rect", {
      x: x + 0.3, y: topY + 0.85, w: pillarW - 0.6, h: 0.2,
      fill: { color: p.color }, line: { color: C.ink, width: 0.75 },
    });
    // pillar base
    s.addShape("rect", {
      x: x + 0.3, y: topY + pillarH - 0.2, w: pillarW - 0.6, h: 0.2,
      fill: { color: p.color }, line: { color: C.ink, width: 0.75 },
    });
    // title above capital
    s.addText(p.title, {
      x, y: topY + 0.2, w: pillarW, h: 0.45,
      fontFace: FONT_DISPLAY, fontSize: 13, bold: true, color: p.color,
      align: "center", valign: "middle", charSpacing: 1, isTextBox: true,
    });
    // vignette inside pillar
    drawPillarVignette(s, x + pillarW / 2, topY + 1.4, p.icon, p.color);
    // body
    s.addText(p.body, {
      x: x + 0.3, y: topY + 2.3, w: pillarW - 0.6, h: 1.0,
      fontFace: FONT_BODY, fontSize: 9.5, color: C.ink,
      align: "center", valign: "top", lineSpacingMultiple: 1.15, isTextBox: true,
    });
  });

  // bottom banner
  s.addShape("roundRect", {
    x: CONTENT_X, y: 6.4, w: CONTENT_W, h: 0.5,
    fill: { color: C.green }, line: { color: C.ink, width: 1 }, rectRadius: 0.06,
  });
  s.addText("BUILT FOR CODEX HACKATHON 2026  ·  Responsible, grounded, agentic.", {
    x: CONTENT_X, y: 6.4, w: CONTENT_W, h: 0.5,
    fontFace: FONT_DISPLAY, fontSize: 12, bold: true, color: C.cream,
    align: "center", valign: "middle", charSpacing: 3, isTextBox: true,
  });

  footerMarker(s, "—");
  script(s, "Why we win. Three pillars. Hyper-local impact — we empower B40 hawkers without requiring them to buy anything or change anything. Responsible AI — every ingredient claim is grounded in cited sources, and unsafe dishes are intercepted before the user sees them; this is safety-first, not vibes-first. And cultural preservation — every meal becomes an educational story, captured before the hawker retires. Responsible, grounded, agentic. That's MakanMate.");
}

function drawPillarVignette(
  s: Slide, cx: number, cy: number,
  icon: "uncle" | "shield" | "grandma", color: string,
): void {
  if (icon === "uncle") {
    // hawker uncle (aproned) + small tourist queue
    iconUser(s, cx - 0.2, cy, 0.35, C.terra);
    s.addShape("roundRect", {
      x: cx - 0.3, y: cy + 0.18, w: 0.6, h: 0.4,
      fill: { color: C.gold }, line: { color: C.ink, width: 0.5 }, rectRadius: 0.05,
    });
    // wok in front
    s.addShape("ellipse", {
      x: cx - 0.5, y: cy + 0.55, w: 0.35, h: 0.15,
      fill: { color: C.ink }, line: { type: "none" },
    });
    // tourists in queue
    iconUser(s, cx + 0.5, cy + 0.05, 0.2, C.green);
    iconUser(s, cx + 0.75, cy + 0.05, 0.2, C.greenMid);
    iconUser(s, cx + 0.98, cy + 0.05, 0.2, C.green);
  } else if (icon === "shield") {
    // big shield deflecting allergen icons
    iconShield(s, cx, cy + 0.1, 0.5, color);
    iconShellfish(s, cx - 0.7, cy - 0.05, 0.16);
    iconShellfish(s, cx - 0.85, cy + 0.2, 0.14);
    iconWarning(s, cx + 0.7, cy - 0.05, 0.14);
    // deflection lines
    s.addShape("line", {
      x: cx - 0.5, y: cy - 0.05, w: -0.2, h: -0.2,
      line: { color: C.redFlag, width: 1, dashType: "dash" },
    });
    s.addShape("line", {
      x: cx + 0.5, y: cy - 0.05, w: 0.2, h: -0.2,
      line: { color: C.redFlag, width: 1, dashType: "dash" },
    });
  } else {
    // grandmother + child + glowing recipe cards
    iconUser(s, cx - 0.3, cy, 0.32, C.terra);
    iconUser(s, cx + 0.25, cy + 0.1, 0.22, C.green);
    // recipe cards (glowing)
    const cards: Array<[number, number]> = [
      [cx + 0.6, cy - 0.25],
      [cx - 0.6, cy - 0.3],
      [cx, cy - 0.5],
    ];
    cards.forEach(([rx, ry]) => {
      s.addShape("ellipse", {
        x: rx - 0.18, y: ry - 0.13, w: 0.36, h: 0.26,
        fill: { color: C.gold, transparency: 60 }, line: { type: "none" },
      });
      s.addShape("roundRect", {
        x: rx - 0.13, y: ry - 0.1, w: 0.26, h: 0.2,
        fill: { color: C.cream }, line: { color: color, width: 0.75 }, rectRadius: 0.03,
      });
    });
  }
}

function slide14Thanks(pptx: pptxgen): void {
  const s = pptx.addSlide();
  paintCanvas(s, C.night);
  batikFrame(s, C.gold);

  // warm hanging bulbs across top
  const bulbXs = [2.0, 4.0, 6.5, 9.0, 11.0];
  bulbXs.forEach((bx) => bulb(s, bx, 0.45, 0.13));

  // hawker stall silhouette at night
  hawkerStall(s, 9.5, 3.6, 1.1, { glow: true });
  // steam wisps
  for (let i = 0; i < 3; i++) {
    s.addShape("ellipse", {
      x: 10.4 + i * 0.3, y: 3.2 - i * 0.15, w: 0.35, h: 0.35,
      fill: { color: C.white, transparency: 70 }, line: { type: "none" },
    });
  }

  // Massive "TERIMA KASIH"
  s.addText("TERIMA KASIH", {
    x: CONTENT_X, y: 1.7, w: 7.5, h: 1.4,
    fontFace: FONT_DISPLAY, fontSize: 64, bold: true, color: C.borderDk,
    align: "left", valign: "middle", isTextBox: true,
  });
  s.addText("TERIMA KASIH", {
    x: CONTENT_X, y: 1.65, w: 7.5, h: 1.4,
    fontFace: FONT_DISPLAY, fontSize: 64, bold: true, color: C.gold,
    align: "left", valign: "middle", isTextBox: true,
  });
  s.addText("Thank you · 谢谢 · நன்றி", {
    x: CONTENT_X, y: 3.05, w: 7.5, h: 0.4,
    fontFace: FONT_DISPLAY, fontSize: 16, italic: true, color: C.cream,
    align: "left", isTextBox: true,
  });

  // Contact fields (2 columns)
  const fields: Array<[string, string, string]> = [
    ["GitHub",   "github.com/yeeern1217/makanmate", C.gold],
    ["Live Demo","makanmate.vercel.app",           C.greenMid],
    ["Built at", "Codex Hackathon 2026 · Malaysia", C.terraMid],
    ["Try now",  "Scan the QR  →",                  C.gold],
  ];
  fields.forEach(([label, value, color], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = CONTENT_X + col * 3.85;
    const y = 3.75 + row * 0.85;
    s.addShape("roundRect", {
      x, y, w: 3.6, h: 0.7,
      fill: { color: C.night }, line: { color, width: 1 }, rectRadius: 0.07,
    });
    s.addShape("rect", {
      x, y, w: 0.08, h: 0.7, fill: { color }, line: { type: "none" },
    });
    s.addText(label.toUpperCase(), {
      x: x + 0.2, y: y + 0.07, w: 3.3, h: 0.22,
      fontFace: FONT_BODY, fontSize: 8, bold: true, color,
      charSpacing: 2, isTextBox: true,
    });
    s.addText(value, {
      x: x + 0.2, y: y + 0.28, w: 3.3, h: 0.36,
      fontFace: FONT_BODY, fontSize: 11, bold: true, color: C.cream,
      isTextBox: true,
    });
  });

  // QR placeholder card
  const qrSize = 1.8;
  const qrX = 8.7;
  const qrY = 3.7;
  s.addShape("roundRect", {
    x: qrX - 0.15, y: qrY - 0.15, w: qrSize + 0.7, h: qrSize + 0.3,
    fill: { color: C.cream }, line: { color: C.gold, width: 1.5 }, rectRadius: 0.08,
  });
  qrPlaceholder(s, qrX, qrY, qrSize);
  s.addText("TRY MAKANMATE NOW", {
    x: qrX + qrSize + 0.05, y: qrY + 0.05, w: 0.6, h: qrSize - 0.1,
    fontFace: FONT_DISPLAY, fontSize: 11, bold: true, color: C.terra,
    align: "center", valign: "middle", isTextBox: true,
  });

  footerMarker(s, "—", "BUILT FOR CODEX HACKATHON 2026 · Responsible, grounded, agentic.");
  script(s, "Terima kasih. Scan the QR to try MakanMate right now — the repo, the live demo, the dataset are all linked. We're around for questions. Thank you.");
}

// ---------------------------------------------------------------------------
// APPENDIX SLIDES — Judge Q&A prep (hidden during live pitch)
// ---------------------------------------------------------------------------

function slide15AppendixDivider(pptx: pptxgen): void {
  const s = pptx.addSlide();
  paintCanvas(s);
  batikFrame(s);

  s.addText("APPENDIX", {
    x: CONTENT_X, y: 2.2, w: CONTENT_W, h: 1.0,
    fontFace: FONT_DISPLAY, fontSize: 28, bold: true, color: C.terra,
    charSpacing: 12, align: "center", isTextBox: true,
  });
  s.addText("JUDGE Q&A PREP", {
    x: CONTENT_X, y: 3.1, w: CONTENT_W, h: 1.5,
    fontFace: FONT_DISPLAY, fontSize: 72, bold: true, color: C.terra,
    align: "center", valign: "middle", isTextBox: true,
  });
  s.addShape("line", {
    x: PAGE_W / 2 - 1.5, y: 4.85, w: 3, h: 0,
    line: { color: C.gold, width: 1.5 },
  });
  batikFlower(s, PAGE_W / 2, 4.85, 0.3, C.terra);
  s.addText("Five likely questions · flip here when prompted", {
    x: CONTENT_X, y: 5.2, w: CONTENT_W, h: 0.4,
    fontFace: FONT_BODY, fontSize: 12, italic: true, color: C.inkMuted,
    charSpacing: 3, align: "center", isTextBox: true,
  });

  footerMarker(s, "A");
}

function addQaSlide(
  pptx: pptxgen,
  num: string,
  question: string,
  answer: string,
): void {
  const s = pptx.addSlide();
  paintCanvas(s);
  batikFrame(s);

  // big number badge
  s.addShape("ellipse", {
    x: CONTENT_X, y: 0.9, w: 1.0, h: 1.0,
    fill: { color: C.terra }, line: { color: C.ink, width: 1.25 },
  });
  s.addText(num, {
    x: CONTENT_X, y: 0.9, w: 1.0, h: 1.0,
    fontFace: FONT_DISPLAY, fontSize: 28, bold: true, color: C.cream,
    align: "center", valign: "middle", isTextBox: true,
  });

  s.addText("QUESTION", {
    x: CONTENT_X + 1.25, y: 0.95, w: 10, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.terra,
    charSpacing: 4, isTextBox: true,
  });
  s.addText(question, {
    x: CONTENT_X + 1.25, y: 1.2, w: 10.5, h: 0.9,
    fontFace: FONT_DISPLAY, fontSize: 20, bold: true, color: C.ink,
    align: "left", valign: "top", lineSpacingMultiple: 1.05, isTextBox: true,
  });

  // divider
  s.addShape("line", {
    x: CONTENT_X, y: 2.45, w: CONTENT_W, h: 0,
    line: { color: C.gold, width: 1.25 },
  });

  s.addText("ANSWER", {
    x: CONTENT_X, y: 2.7, w: CONTENT_W, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.green,
    charSpacing: 4, isTextBox: true,
  });

  // answer in a card
  card(s, CONTENT_X, 3.1, CONTENT_W, 3.5, { fill: C.creamSoft, line: C.green, lineW: 1.25 });
  s.addText(answer, {
    x: CONTENT_X + 0.35, y: 3.3, w: CONTENT_W - 0.7, h: 3.1,
    fontFace: FONT_BODY, fontSize: 15, color: C.ink,
    align: "left", valign: "top", lineSpacingMultiple: 1.35, isTextBox: true,
  });

  footerMarker(s, `A · ${num}`);
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "MakanMate";
  pptx.company = "Codex Hackathon 2026";
  pptx.subject = "MakanMate Pitch Deck";
  pptx.title = "MakanMate — Codex Hackathon 2026 Pitch";

  // Slides 1-14: live pitch
  slide01Title(pptx);
  slide02Agenda(pptx);
  slide03Hook(pptx);
  slide04Problem(pptx);
  slide05Solution(pptx);
  slide06Architecture(pptx);
  slide07MagicLens(pptx);
  slide08RagCritic(pptx);
  slide09HeroFlow(pptx);
  slide10Edge(pptx);
  slide11Gamified(pptx);
  slide12TechStack(pptx);
  slide13WhyWeWin(pptx);
  slide14Thanks(pptx);

  // Appendix 15-20: Judge Q&A prep (from handoff MD Appendix B)
  slide15AppendixDivider(pptx);
  addQaSlide(
    pptx, "01",
    "How is this different from Google Lens + ChatGPT?",
    "Google Lens reads text. ChatGPT translates words. Neither knows what's in sambal, neither knows which Penang stall has 15 reviews and is worth your time, and neither can guarantee a shellfish-allergic user that a dish is safe. MakanMate has a curated dataset and a safety audit layer — that's the difference.",
  );
  addQaSlide(
    pptx, "02",
    "Does the Critic Agent actually catch real allergic reactions?",
    "It catches them at the ingredient-matrix level — every dish is mapped to its authentic ingredients via RAG, and the user's profile is checked against that matrix. We don't make medical claims, but we make sure the user sees the warning before they see the dish.",
  );
  addQaSlide(
    pptx, "03",
    "Why build the gamification layer at all?",
    "Because discovery without engagement doesn't get used. The Pokedex turns a one-time scan into a repeat behavior, which is what actually drives revenue back to hawkers.",
  );
  addQaSlide(
    pptx, "04",
    "How do you scale the dataset beyond 16 stalls?",
    "The architecture is built for community contribution — the catch flow already validates GPS and creates structured cards. A community-submitted pipeline is the natural V2.",
  );
  addQaSlide(
    pptx, "05",
    "Why Gemini over GPT-4 / Claude?",
    "Native multimodal (vision + text in one call), strong structured-output via Vercel AI SDK's tool-calling, and cost. The architecture is model-agnostic — the orchestrator can swap underlying models per mode.",
  );

  const outPath = path.resolve(process.cwd(), "plans", "MakanMate-Demo.pptx");
  await pptx.writeFile({ fileName: outPath });
  console.log(`✓ Wrote ${outPath}`);
  console.log("  20 slides (14 pitch + 6 appendix)");
}

main().catch((err) => {
  console.error("Deck build failed:", err);
  process.exit(1);
});
