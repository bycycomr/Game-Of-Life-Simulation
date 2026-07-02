/* ============================================================================
   patterns.js — classic Game of Life pattern library
   Each pattern is a list of live-cell coordinates ([x, y]) relative to its
   own top-left corner. The app centers them on the board when placing.
   ============================================================================ */
(function (global) {
  'use strict';

  /** Parse a compact ASCII picture ('O' = alive) into [x, y] pairs. */
  function fromAscii(art) {
    const cells = [];
    const lines = art.trim().split('\n');
    for (let y = 0; y < lines.length; y++) {
      const line = lines[y];
      for (let x = 0; x < line.length; x++) {
        if (line[x] === 'O') cells.push([x, y]);
      }
    }
    return cells;
  }

  const PATTERNS = [
    {
      id: 'soup',
      name: 'Rastgele Çorba',
      desc: 'Rastgele başlangıç durumu — kaostan düzen doğar.',
      cells: null // special-cased by the app: randomize()
    },
    {
      id: 'glider',
      name: 'Planör (Glider)',
      desc: 'Çapraz süzülen en küçük uzay gemisi. Periyot 4.',
      cells: fromAscii(`
.O.
..O
OOO`)
    },
    {
      id: 'lwss',
      name: 'Hafif Uzay Gemisi (LWSS)',
      desc: 'Yatay ilerleyen klasik uzay gemisi. Periyot 4.',
      cells: fromAscii(`
.O..O
O....
O...O
OOOO.`)
    },
    {
      id: 'pulsar',
      name: 'Pulsar',
      desc: 'En bilinen büyük osilatör. Periyot 3.',
      cells: fromAscii(`
..OOO...OOO..
.............
O....O.O....O
O....O.O....O
O....O.O....O
..OOO...OOO..
.............
..OOO...OOO..
O....O.O....O
O....O.O....O
O....O.O....O
.............
..OOO...OOO..`)
    },
    {
      id: 'pentadecathlon',
      name: 'Pentadecathlon',
      desc: 'Periyot 15\'lik zarif osilatör.',
      cells: fromAscii(`
..O....O..
OO.OOOO.OO
..O....O..`)
    },
    {
      id: 'gosper-gun',
      name: 'Gosper Planör Topu',
      desc: 'Sonsuza dek planör üreten ilk "silah" (1970).',
      cells: fromAscii(`
........................O...........
......................O.O...........
............OO......OO............OO
...........O...O....OO............OO
OO........O.....O...OO..............
OO........O...O.OO....O.O...........
..........O.....O.......O...........
...........O...O....................
............OO......................`)
    },
    {
      id: 'r-pentomino',
      name: 'R-Pentomino',
      desc: '5 hücreden 1103 nesil süren kaos — en ünlü metuşelah.',
      cells: fromAscii(`
.OO
OO.
.O.`)
    },
    {
      id: 'acorn',
      name: 'Meşe Palamudu (Acorn)',
      desc: '7 hücre, 5206 nesil boyunca büyür.',
      cells: fromAscii(`
.O.....
...O...
OO..OOO`)
    },
    {
      id: 'diehard',
      name: 'Diehard',
      desc: 'Tam 130 nesil yaşayıp tamamen yok olur.',
      cells: fromAscii(`
......O.
OO......
.O...OOO`)
    }
  ];

  global.GOL = global.GOL || {};
  global.GOL.PATTERNS = PATTERNS;
})(typeof window !== 'undefined' ? window : globalThis);
