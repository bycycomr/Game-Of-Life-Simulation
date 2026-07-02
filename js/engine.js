/* ============================================================================
   engine.js — LifeEngine: Conway's Game of Life core (rule B3/S23)
   Pure logic layer. No DOM access — operates only on typed arrays so it can
   be unit-tested in Node and reused anywhere.

   Cell encoding: Uint8Array where 0 = dead, 1..255 = alive (value = age,
   capped at 255). Age only feeds the renderer's color ramp; the rules treat
   any non-zero value as "alive".
   ============================================================================ */
(function (global) {
  'use strict';

  class LifeEngine {
    /**
     * @param {number} cols  grid width in cells
     * @param {number} rows  grid height in cells
     * @param {boolean} wrap toroidal edges (true) or dead borders (false)
     */
    constructor(cols, rows, wrap = true) {
      this.wrap = wrap;
      this.generation = 0;
      this.population = 0;
      this.cols = 0;
      this.rows = 0;
      this.cells = null;
      this.next = null;
      this.resize(cols, rows);
    }

    /** Resize the grid, preserving the overlapping region (top-left anchored). */
    resize(cols, rows) {
      const old = this.cells;
      const oldCols = this.cols;
      const oldRows = this.rows;
      this.cols = cols;
      this.rows = rows;
      this.cells = new Uint8Array(cols * rows);
      this.next = new Uint8Array(cols * rows);
      if (old) {
        const cw = Math.min(cols, oldCols);
        const ch = Math.min(rows, oldRows);
        for (let y = 0; y < ch; y++) {
          for (let x = 0; x < cw; x++) {
            this.cells[y * cols + x] = old[y * oldCols + x];
          }
        }
      }
      this.countPopulation();
    }

    clear() {
      this.cells.fill(0);
      this.generation = 0;
      this.population = 0;
    }

    /** Fill the board with random live cells at the given density (0..1). */
    randomize(density) {
      const cells = this.cells;
      for (let i = 0; i < cells.length; i++) {
        cells[i] = Math.random() < density ? 1 : 0;
      }
      this.generation = 0;
      this.countPopulation();
    }

    getCell(x, y) {
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return 0;
      return this.cells[y * this.cols + x];
    }

    setCell(x, y, alive) {
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
      const i = y * this.cols + x;
      const was = this.cells[i] ? 1 : 0;
      const now = alive ? 1 : 0;
      this.cells[i] = now;
      this.population += now - was;
    }

    /** Stamp a pattern (array of [x, y] pairs) with its top-left at (ox, oy). */
    placePattern(patternCells, ox, oy) {
      for (const [px, py] of patternCells) {
        this.setCell(ox + px, oy + py, true);
      }
    }

    /** Advance one generation. Returns the new population. */
    step() {
      const { cols, rows, cells, next, wrap } = this;
      let pop = 0;
      for (let y = 0; y < rows; y++) {
        const yUp = wrap ? ((y - 1 + rows) % rows) : y - 1;
        const yDown = wrap ? ((y + 1) % rows) : y + 1;
        const rowUp = yUp * cols;
        const rowMid = y * cols;
        const rowDown = yDown * cols;
        const upOk = yUp >= 0;
        const downOk = yDown < rows;
        for (let x = 0; x < cols; x++) {
          const xL = wrap ? ((x - 1 + cols) % cols) : x - 1;
          const xR = wrap ? ((x + 1) % cols) : x + 1;
          const lOk = xL >= 0;
          const rOk = xR < cols;

          let n = 0;
          if (upOk) {
            if (lOk && cells[rowUp + xL]) n++;
            if (cells[rowUp + x]) n++;
            if (rOk && cells[rowUp + xR]) n++;
          }
          if (lOk && cells[rowMid + xL]) n++;
          if (rOk && cells[rowMid + xR]) n++;
          if (downOk) {
            if (lOk && cells[rowDown + xL]) n++;
            if (cells[rowDown + x]) n++;
            if (rOk && cells[rowDown + xR]) n++;
          }

          const i = rowMid + x;
          const age = cells[i];
          let out = 0;
          if (age) {
            // Survival: 2 or 3 neighbours. Age grows (capped for the renderer).
            if (n === 2 || n === 3) out = age < 255 ? age + 1 : 255;
          } else if (n === 3) {
            // Birth: exactly 3 neighbours.
            out = 1;
          }
          next[i] = out;
          if (out) pop++;
        }
      }
      // Swap buffers instead of copying.
      this.cells = next;
      this.next = cells;
      this.generation++;
      this.population = pop;
      return pop;
    }

    countPopulation() {
      let pop = 0;
      const cells = this.cells;
      for (let i = 0; i < cells.length; i++) if (cells[i]) pop++;
      this.population = pop;
      return pop;
    }

    /**
     * FNV-1a hash over aliveness (not age!) so still lifes and oscillators
     * produce repeating hashes. Used by the app for cycle detection.
     */
    hash() {
      let h = 0x811c9dc5;
      const cells = this.cells;
      for (let i = 0; i < cells.length; i++) {
        h ^= cells[i] ? 1 : 0;
        h = Math.imul(h, 0x01000193);
      }
      return h >>> 0;
    }
  }

  global.GOL = global.GOL || {};
  global.GOL.LifeEngine = LifeEngine;
})(typeof window !== 'undefined' ? window : globalThis);
