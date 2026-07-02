/* ============================================================================
   renderer.js — CanvasRenderer: draws the LifeEngine state onto a <canvas>
   Age-based crimson "ember" ramp: newborn cells flash bright, long-lived
   cells settle into deep red. Handles devicePixelRatio for crisp cells.
   ============================================================================ */
(function (global) {
  'use strict';

  // Brand crimson ramp (see css custom properties) — indexed by cell age.
  const COLOR_NEWBORN = '#FFE8E9'; // age 1  — birth flash
  const COLOR_YOUNG = '#FB6770';   // age 2
  const COLOR_BRIGHT = '#F23B47';  // age 3
  const COLOR_PRIME = '#E11D2A';   // age 4..7 — brand primary
  const COLOR_OLD = '#C2121F';     // age 8..15
  const COLOR_ANCIENT = '#8E1219'; // age 16+ — settled still lifes

  const BG = '#0A0B0D';
  const GRID_LINE = 'rgba(255, 255, 255, 0.035)';

  function ageColor(age) {
    if (age === 1) return COLOR_NEWBORN;
    if (age === 2) return COLOR_YOUNG;
    if (age === 3) return COLOR_BRIGHT;
    if (age <= 7) return COLOR_PRIME;
    if (age <= 15) return COLOR_OLD;
    return COLOR_ANCIENT;
  }

  class CanvasRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cellSize = 6;
      this.showGrid = true;
      this.cssWidth = 0;
      this.cssHeight = 0;
    }

    /** Match the canvas backing store to its CSS size × devicePixelRatio. */
    configure(cssWidth, cssHeight, cellSize) {
      const dpr = global.devicePixelRatio || 1;
      this.cssWidth = cssWidth;
      this.cssHeight = cssHeight;
      this.cellSize = cellSize;
      this.canvas.width = Math.round(cssWidth * dpr);
      this.canvas.height = Math.round(cssHeight * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /** Convert a pointer event position (CSS px) to grid coordinates. */
    pointToCell(px, py) {
      return {
        x: Math.floor(px / this.cellSize),
        y: Math.floor(py / this.cellSize)
      };
    }

    draw(engine) {
      const ctx = this.ctx;
      const s = this.cellSize;
      const { cols, rows, cells } = engine;

      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);

      // Bucket cells by color so we change fillStyle only a handful of times.
      const buckets = new Map();
      for (let y = 0; y < rows; y++) {
        const row = y * cols;
        for (let x = 0; x < cols; x++) {
          const age = cells[row + x];
          if (!age) continue;
          const color = ageColor(age);
          let list = buckets.get(color);
          if (!list) buckets.set(color, (list = []));
          list.push(x, y);
        }
      }

      // Leave a 1px gap between cells when they are big enough to afford it.
      const gap = s >= 4 ? 1 : 0;
      for (const [color, list] of buckets) {
        ctx.fillStyle = color;
        for (let i = 0; i < list.length; i += 2) {
          ctx.fillRect(list[i] * s, list[i + 1] * s, s - gap, s - gap);
        }
      }

      if (this.showGrid && s >= 5) {
        ctx.strokeStyle = GRID_LINE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= cols; x++) {
          ctx.moveTo(x * s + 0.5, 0);
          ctx.lineTo(x * s + 0.5, rows * s);
        }
        for (let y = 0; y <= rows; y++) {
          ctx.moveTo(0, y * s + 0.5);
          ctx.lineTo(cols * s, y * s + 0.5);
        }
        ctx.stroke();
      }
    }
  }

  global.GOL = global.GOL || {};
  global.GOL.CanvasRenderer = CanvasRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
