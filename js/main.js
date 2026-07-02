/* ============================================================================
   main.js — application layer
   Wires LifeEngine + CanvasRenderer to the UI: the simulation loop, drawing
   with the pointer, pattern placement, stats, and the "self-running" logic
   (cycle detection → automatic reseed) that keeps the board alive forever.
   ============================================================================ */
(function () {
  'use strict';

  const { LifeEngine, CanvasRenderer, PATTERNS } = window.GOL;

  /* ------------------------------------------------------------------ DOM */
  const canvas = document.getElementById('life-canvas');
  const canvasWrap = document.getElementById('canvas-wrap');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const statGen = document.getElementById('stat-gen');
  const statPop = document.getElementById('stat-pop');
  const statSpeed = document.getElementById('stat-speed');
  const statGrid = document.getElementById('stat-grid');
  const btnPlay = document.getElementById('btn-play');
  const btnPlayLabel = document.getElementById('btn-play-label');
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');
  const btnStep = document.getElementById('btn-step');
  const btnRandom = document.getElementById('btn-random');
  const btnClear = document.getElementById('btn-clear');
  const speedSlider = document.getElementById('speed-slider');
  const speedValue = document.getElementById('speed-value');
  const densitySlider = document.getElementById('density-slider');
  const densityValue = document.getElementById('density-value');
  const patternSelect = document.getElementById('pattern-select');
  const patternDesc = document.getElementById('pattern-desc');
  const toggleGrid = document.getElementById('toggle-grid');
  const toggleWrap = document.getElementById('toggle-wrap');
  const toggleAuto = document.getElementById('toggle-auto');

  /* ---------------------------------------------------------------- state */
  const CELL_SIZE = 6;           // CSS px per cell
  const HISTORY_SIZE = 60;       // hashes kept for cycle detection
  const STAGNANT_THRESHOLD = 12; // consecutive repeats before declaring a cycle
  const RESEED_DELAY_MS = 2600;  // pause on "cycle detected" before reseeding
  const DEAD_DELAY_MS = 1200;    // shorter pause when the board dies out

  let engine = null;
  let renderer = null;
  let running = true;
  let genPerSec = 30;
  let density = 0.18;
  let autoReseed = true;

  let stepAccumulator = 0;
  let lastFrameTime = 0;

  // Cycle detection + reseed scheduling
  let hashHistory = [];
  let stagnantCount = 0;
  let reseedAt = 0; // timestamp; 0 = no reseed scheduled

  // Measured throughput (generations per second)
  let genCounter = 0;
  let genRateTime = 0;
  let genRate = 0;

  // Pointer drawing
  let drawing = false;
  let drawValue = 1;
  let lastCell = null;

  /* ---------------------------------------------------------------- setup */
  function boardSizeFromWrap() {
    const rect = canvasWrap.getBoundingClientRect();
    const cols = Math.max(16, Math.floor(rect.width / CELL_SIZE));
    const rows = Math.max(16, Math.floor(rect.height / CELL_SIZE));
    return { cols, rows, width: cols * CELL_SIZE, height: rows * CELL_SIZE };
  }

  function setupBoard() {
    const { cols, rows, width, height } = boardSizeFromWrap();
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    renderer.configure(width, height, CELL_SIZE);
    if (engine) {
      engine.resize(cols, rows);
    } else {
      engine = new LifeEngine(cols, rows, toggleWrap.checked);
    }
    statGrid.textContent = cols + '×' + rows;
  }

  function resetDetection() {
    hashHistory = [];
    stagnantCount = 0;
    reseedAt = 0;
  }

  function reseed() {
    engine.randomize(density);
    resetDetection();
    setStatus('running');
  }

  /* --------------------------------------------------------------- status */
  function setStatus(mode) {
    statusDot.className = 'status-dot ' + mode;
    if (mode === 'running') statusText.textContent = 'SIM: RUNNING';
    else if (mode === 'paused') statusText.textContent = 'SIM: PAUSED';
    else if (mode === 'reseed') statusText.textContent = 'SIM: RESEEDING…';
  }

  function setRunning(value) {
    running = value;
    iconPlay.style.display = running ? 'none' : '';
    iconPause.style.display = running ? '' : 'none';
    btnPlayLabel.textContent = running ? 'DURAKLAT' : 'BAŞLAT';
    if (!running) reseedAt = 0;
    setStatus(running ? 'running' : 'paused');
  }

  /* ----------------------------------------------------- self-running loop */
  function afterStep(now) {
    genCounter++;

    // Track repeating states: still lifes and oscillators (period ≤ HISTORY_SIZE)
    // make the board hash reappear; moving patterns keep changing it.
    const h = engine.hash();
    if (hashHistory.indexOf(h) !== -1) stagnantCount++;
    else stagnantCount = 0;
    hashHistory.push(h);
    if (hashHistory.length > HISTORY_SIZE) hashHistory.shift();

    if (autoReseed && reseedAt === 0) {
      if (engine.population === 0) {
        reseedAt = now + DEAD_DELAY_MS;
        setStatus('reseed');
      } else if (stagnantCount >= STAGNANT_THRESHOLD) {
        reseedAt = now + RESEED_DELAY_MS;
        setStatus('reseed');
      }
    }
  }

  function frame(now) {
    if (!lastFrameTime) lastFrameTime = now;
    const dt = Math.min(now - lastFrameTime, 250); // clamp tab-switch jumps
    lastFrameTime = now;

    if (running) {
      if (reseedAt !== 0 && now >= reseedAt) reseed();

      stepAccumulator += dt * genPerSec / 1000;
      // Cap steps per frame so slow devices degrade gracefully.
      let steps = Math.min(Math.floor(stepAccumulator), 8);
      stepAccumulator -= Math.floor(stepAccumulator);
      while (steps-- > 0) {
        engine.step();
        afterStep(now);
      }
    }

    renderer.draw(engine);

    // Refresh the HUD stats ~4×/s to keep the text calm.
    if (now - genRateTime >= 250) {
      genRate = Math.round(genCounter * 1000 / (now - genRateTime));
      genCounter = 0;
      genRateTime = now;
      statGen.textContent = String(engine.generation).padStart(6, '0');
      statPop.textContent = engine.population.toLocaleString('tr-TR');
      statSpeed.textContent = (running ? genRate : 0) + ' n/s';
    }

    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------ pointer drawing */
  function cellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    return renderer.pointToCell(e.clientX - rect.left, e.clientY - rect.top);
  }

  function paintLine(a, b, value) {
    // Bresenham between consecutive pointer samples so fast strokes stay solid.
    let x0 = a.x, y0 = a.y;
    const x1 = b.x, y1 = b.y;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      engine.setCell(x0, y0, value);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    const cell = cellFromEvent(e);
    drawValue = engine.getCell(cell.x, cell.y) ? 0 : 1; // toggle-style painting
    engine.setCell(cell.x, cell.y, drawValue);
    lastCell = cell;
    resetDetection();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const cell = cellFromEvent(e);
    if (lastCell && (cell.x !== lastCell.x || cell.y !== lastCell.y)) {
      paintLine(lastCell, cell, drawValue);
      lastCell = cell;
    }
  });

  const stopDrawing = () => { drawing = false; lastCell = null; };
  canvas.addEventListener('pointerup', stopDrawing);
  canvas.addEventListener('pointercancel', stopDrawing);

  /* --------------------------------------------------------------- controls */
  btnPlay.addEventListener('click', () => setRunning(!running));

  btnStep.addEventListener('click', () => {
    setRunning(false);
    engine.step();
  });

  btnRandom.addEventListener('click', () => {
    reseed();
    if (!running) setRunning(true);
  });

  btnClear.addEventListener('click', () => {
    engine.clear();
    resetDetection();
    setRunning(false);
  });

  speedSlider.addEventListener('input', () => {
    genPerSec = Number(speedSlider.value);
    speedValue.textContent = genPerSec + ' n/s';
  });

  densitySlider.addEventListener('input', () => {
    density = Number(densitySlider.value) / 100;
    densityValue.textContent = '%' + densitySlider.value;
  });

  patternSelect.addEventListener('change', () => {
    const pattern = PATTERNS.find((p) => p.id === patternSelect.value);
    if (!pattern) return;
    patternDesc.textContent = pattern.desc;
    engine.clear();
    if (pattern.cells) {
      const w = Math.max(...pattern.cells.map((c) => c[0])) + 1;
      const h = Math.max(...pattern.cells.map((c) => c[1])) + 1;
      engine.placePattern(
        pattern.cells,
        Math.floor((engine.cols - w) / 2),
        Math.floor((engine.rows - h) / 2)
      );
    } else {
      engine.randomize(density);
    }
    resetDetection();
    if (!running) setRunning(true);
  });

  toggleGrid.addEventListener('change', () => {
    renderer.showGrid = toggleGrid.checked;
  });

  toggleWrap.addEventListener('change', () => {
    engine.wrap = toggleWrap.checked;
  });

  toggleAuto.addEventListener('change', () => {
    autoReseed = toggleAuto.checked;
    if (!autoReseed) {
      reseedAt = 0;
      if (running) setStatus('running');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLElement &&
        /^(input|select|textarea)$/i.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); btnPlay.click(); }
    else if (e.key === 's' || e.key === 'S') btnStep.click();
    else if (e.key === 'r' || e.key === 'R') btnRandom.click();
    else if (e.key === 'c' || e.key === 'C') btnClear.click();
  });

  // Rebuild the board when the panel is resized (orientation change, etc.)
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setupBoard();
      resetDetection();
    }, 180);
  });

  /* ------------------------------------------------------------------ init */
  function populatePatternSelect() {
    for (const p of PATTERNS) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      patternSelect.appendChild(opt);
    }
    patternSelect.value = 'soup';
    patternDesc.textContent = PATTERNS[0].desc;
  }

  renderer = new CanvasRenderer(canvas);
  renderer.showGrid = toggleGrid.checked;
  populatePatternSelect();
  speedSlider.value = String(genPerSec);
  speedValue.textContent = genPerSec + ' n/s';
  densitySlider.value = String(Math.round(density * 100));
  densityValue.textContent = '%' + Math.round(density * 100);
  setupBoard();
  engine.wrap = toggleWrap.checked;
  engine.randomize(density); // self-start: the page boots straight into life
  setRunning(true);
  requestAnimationFrame(frame);
})();
