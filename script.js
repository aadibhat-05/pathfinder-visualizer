// ── GRID SETTINGS ──
const ROWS = 20;
const COLS = 50;

// tracks which cell is start, which is end
let startCell = null;
let endCell = null;

// tracks mouse state for click-and-drag wall drawing
let isMouseDown = false;
let isPlacingStart = false;
let isPlacingEnd = false;

// ── BUILD THE GRID ──
function buildGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  // tell CSS how many columns to make
  grid.style.gridTemplateColumns = `repeat(${COLS}, 22px)`;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell', 'empty');
      cell.dataset.row = r;
      cell.dataset.col = c;

      // click to place start, end, or wall
      cell.addEventListener('mousedown', onMouseDown);
      cell.addEventListener('mouseenter', onMouseEnter);

      grid.appendChild(cell);
    }
  }

  // stop drawing walls when mouse is released anywhere
  document.addEventListener('mouseup', () => { isMouseDown = false; });

  // place default start and end nodes
  setStart(getCell(10, 10));
  setEnd(getCell(10, 40));
}

// ── GET A CELL BY ROW, COL ──
function getCell(row, col) {
  return document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

// ── SET START / END ──
function setStart(cell) {
  if (startCell) startCell.classList.replace('start', 'empty');
  cell.className = 'cell start';
  startCell = cell;
}

function setEnd(cell) {
  if (endCell) endCell.classList.replace('end', 'empty');
  cell.className = 'cell end';
  endCell = cell;
}

// ── MOUSE EVENTS ──
function onMouseDown(e) {
  isMouseDown = true;
  const cell = e.currentTarget;

  if (cell === startCell) {
    isPlacingStart = true;
  } else if (cell === endCell) {
    isPlacingEnd = true;
  } else {
    toggleWall(cell);
  }
}

function onMouseEnter(e) {
  if (!isMouseDown) return;
  const cell = e.currentTarget;

  if (isPlacingStart && cell !== endCell) {
    setStart(cell);
  } else if (isPlacingEnd && cell !== startCell) {
    setEnd(cell);
  } else if (cell !== startCell && cell !== endCell) {
    toggleWall(cell);
  }
}

// ── TOGGLE WALL ──
function toggleWall(cell) {
  if (cell.classList.contains('wall')) {
    cell.classList.replace('wall', 'empty');
  } else {
    cell.classList.replace('empty', 'wall');
  }
}

// ── CLEAR WALLS ──
document.getElementById('btn-clear-walls').addEventListener('click', () => {
  document.querySelectorAll('.cell.wall').forEach(cell => {
    cell.classList.replace('wall', 'empty');
  });
});

// ── RESET (clears everything including visited/path) ──
document.getElementById('btn-reset').addEventListener('click', () => {
  buildGrid();
});

// ── INIT ──
buildGrid();
// ── HELPERS ──

// returns all valid neighbours of a cell (up, down, left, right)
function getNeighbours(row, col) {
  const neighbours = [];
  const directions = [[-1,0],[1,0],[0,-1],[0,1]];

  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
      neighbours.push(getCell(nr, nc));
    }
  }
  return neighbours;
}

// traces back from end to start using the cameFrom map
function buildPath(cameFrom, current) {
  const path = [];
  while (cameFrom.has(current)) {
    current = cameFrom.get(current);
    if (current !== startCell) path.unshift(current);
  }
  return path;
}

// ── BFS ──
function bfs() {
  const visited = [];
  const cameFrom = new Map();
  const seen = new Set();

  const queue = [startCell];
  seen.add(startCell);

  while (queue.length > 0) {
    const current = queue.shift();

    if (current === endCell) {
      return { visited, path: buildPath(cameFrom, current) };
    }

    const row = parseInt(current.dataset.row);
    const col = parseInt(current.dataset.col);

    for (const neighbour of getNeighbours(row, col)) {
      if (seen.has(neighbour) || neighbour.classList.contains('wall')) continue;
      seen.add(neighbour);
      cameFrom.set(neighbour, current);
      if (neighbour !== endCell) visited.push(neighbour);
      queue.push(neighbour);
    }

    if (current !== startCell) visited.push(current);
  }

  return { visited, path: [] }; // no path found
}

// ── DFS ──
function dfs() {
  const visited = [];
  const cameFrom = new Map();
  const seen = new Set();

  const stack = [startCell];
  seen.add(startCell);

  while (stack.length > 0) {
    const current = stack.pop();

    if (current === endCell) {
      return { visited, path: buildPath(cameFrom, current) };
    }

    const row = parseInt(current.dataset.row);
    const col = parseInt(current.dataset.col);

    if (current !== startCell) visited.push(current);

    for (const neighbour of getNeighbours(row, col)) {
      if (seen.has(neighbour) || neighbour.classList.contains('wall')) continue;
      seen.add(neighbour);
      cameFrom.set(neighbour, current);
      stack.push(neighbour);
    }
  }

  return { visited, path: [] };
}

// ── DIJKSTRA ──
function dijkstra() {
  const visited = [];
  const cameFrom = new Map();
  const dist = new Map();

  dist.set(startCell, 0);
  const unvisited = new Set();

  // use startCell's parent to query the correct grid
  const gridEl = startCell.parentElement;
  gridEl.querySelectorAll('.cell:not(.wall)').forEach(cell => {
    if (cell !== startCell) dist.set(cell, Infinity);
    unvisited.add(cell);
  });

  while (unvisited.size > 0) {
    let current = null;
    let minDist = Infinity;
    for (const cell of unvisited) {
      const d = dist.get(cell) ?? Infinity;
      if (d < minDist) { minDist = d; current = cell; }
    }

    if (!current || minDist === Infinity) break;
    if (current === endCell) {
      return { visited, path: buildPath(cameFrom, current) };
    }

    unvisited.delete(current);
    if (current !== startCell) visited.push(current);

    const row = parseInt(current.dataset.row);
    const col = parseInt(current.dataset.col);

    for (const neighbour of getNeighbours(row, col)) {
      if (!unvisited.has(neighbour) || neighbour.classList.contains('wall')) continue;
      const newDist = dist.get(current) + 1;
      if (newDist < (dist.get(neighbour) ?? Infinity)) {
        dist.set(neighbour, newDist);
        cameFrom.set(neighbour, current);
      }
    }
  }

  return { visited, path: [] };
}
// ── A* ──
function heuristic(cell) {
  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);
  const eRow = parseInt(endCell.dataset.row);
  const eCol = parseInt(endCell.dataset.col);
  // Manhattan distance
  return Math.abs(row - eRow) + Math.abs(col - eCol);
}

// ── A* ──
function astar() {
  const visited = [];
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();
  const openSet = new Set([startCell]);
  const closedSet = new Set();

  gScore.set(startCell, 0);
  fScore.set(startCell, heuristic(startCell));

  while (openSet.size > 0) {
    // pick cell with lowest fScore
    let current = null;
    let minF = Infinity;
    for (const cell of openSet) {
      const f = fScore.get(cell) ?? Infinity;
      if (f < minF) { minF = f; current = cell; }
    }

    if (current === endCell) {
      return { visited, path: buildPath(cameFrom, current) };
    }

    openSet.delete(current);
    closedSet.add(current);

    if (current !== startCell) visited.push(current);

    const row = parseInt(current.dataset.row);
    const col = parseInt(current.dataset.col);

    for (const neighbour of getNeighbours(row, col)) {
      if (closedSet.has(neighbour) || neighbour.classList.contains('wall')) continue;

      const tentativeG = (gScore.get(current) ?? Infinity) + 1;

      if (!openSet.has(neighbour)) {
        openSet.add(neighbour);
      } else if (tentativeG >= (gScore.get(neighbour) ?? Infinity)) {
        continue;
      }

      cameFrom.set(neighbour, current);
      gScore.set(neighbour, tentativeG);
      fScore.set(neighbour, tentativeG + heuristic(neighbour));

      if (neighbour !== startCell && neighbour !== endCell) {
        visited.push(neighbour);
      }
    }
  }

  return { visited, path: [] };
}

// ── GREEDY BFS ──
function greedyBFS() {
  const visited = [];
  const cameFrom = new Map();
  const seen = new Set([startCell]);
  const openSet = [startCell];

  while (openSet.length > 0) {
    // sort by heuristic — always pick the cell closest to end
    openSet.sort((a, b) => heuristic(a) - heuristic(b));
    const current = openSet.shift();

    if (current === endCell) {
      return { visited, path: buildPath(cameFrom, current) };
    }

    if (current !== startCell) visited.push(current);

    const row = parseInt(current.dataset.row);
    const col = parseInt(current.dataset.col);

    for (const neighbour of getNeighbours(row, col)) {
      if (seen.has(neighbour) || neighbour.classList.contains('wall')) continue;
      seen.add(neighbour);
      cameFrom.set(neighbour, current);
      openSet.push(neighbour);
    }
  }

  return { visited, path: [] };
}
// ── ANIMATION ──

let isRunning = false;

function animate(visited, path) {
  const speedSlider = document.getElementById('speed');
  // higher slider value = faster = lower delay
  const delay = 105 - speedSlider.value;

  isRunning = true;
  disableControls(true);

  let i = 0;

  // animate visited nodes one by one
  function animateVisited() {
    if (i >= visited.length) {
      animatePath(0); // once done, animate the path
      return;
    }

    visited[i].classList.replace('empty', 'visited');
    i++;
    setTimeout(animateVisited, delay);
  }

  // animate the final path
  function animatePath(j) {
    if (j >= path.length) {
      isRunning = false;
      disableControls(false);
      return;
    }

    path[j].classList.replace('visited', 'path');
    setTimeout(() => animatePath(j + 1), delay * 2);
  }

  animateVisited();
}

// ── CLEAR VISITED/PATH CELLS (keep walls, start, end) ──
function clearVisualization() {
  document.querySelectorAll('.cell.visited, .cell.path').forEach(cell => {
    cell.classList.replace('visited', 'empty');
    cell.classList.replace('path', 'empty');
  });
}

// ── DISABLE CONTROLS WHILE RUNNING ──
function disableControls(disabled) {
  document.getElementById('btn-run').disabled = disabled;
  document.getElementById('btn-reset').disabled = disabled;
  document.getElementById('btn-clear-walls').disabled = disabled;
  document.getElementById('algo-select').disabled = disabled;
  document.getElementById('btn-run').textContent = disabled ? '⏳ Running...' : '▶ Run';
}

// ── UPDATE STATS BAR ──
function updateStats(algoName, visitedCount, pathLength, timeMs) {
  document.getElementById('stat-algo').innerHTML =
    `Algorithm: <strong>${algoName}</strong>`;
  document.getElementById('stat-nodes').innerHTML =
    `Nodes explored: <strong>${visitedCount}</strong>`;
  document.getElementById('stat-length').innerHTML =
    `Path length: <strong>${pathLength === 0 ? 'No path found' : pathLength}</strong>`;
  document.getElementById('stat-time').innerHTML =
    `Time: <strong>${timeMs}ms</strong>`;
}

// ── RUN BUTTON ──
document.getElementById('btn-run').addEventListener('click', () => {
  if (isRunning) return;

  clearVisualization();

  const algo = document.getElementById('algo-select').value;
  const algoNames = {
    bfs: 'BFS',
    dfs: 'DFS',
    dijkstra: 'Dijkstra',
    astar: 'A*',
    greedy: 'Greedy BFS'
  };

  // run the selected algorithm and measure time
  const t0 = performance.now();
  let result;
  if (algo === 'bfs')      result = bfs();
  else if (algo === 'dfs') result = dfs();
  else if (algo === 'dijkstra') result = dijkstra();
  else if (algo === 'astar')    result = astar();
  else if (algo === 'greedy')   result = greedyBFS();
  const t1 = performance.now();
  const timeMs = (t1 - t0).toFixed(2);
  updateStats(algoNames[algo], result.visited.length, result.path.length, timeMs);
  animate(result.visited, result.path);
});
// ── MAZE GENERATOR (Recursive Backtracker) ──
function generateMaze() {
  if (isRunning) return;

  // reset the grid first
  buildGrid();

  const visited = new Set();

  // fill everything with walls first
  document.querySelectorAll('.cell').forEach(cell => {
    if (cell !== startCell && cell !== endCell) {
      cell.classList.replace('empty', 'wall');
    }
  });

  // only carve through odd rows and cols so walls stay between paths
  function getUnvisitedNeighbours(row, col) {
    const neighbours = [];
    const directions = [[-2,0],[2,0],[0,-2],[0,2]];
    for (const [dr, dc] of directions) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr > 0 && nr < ROWS - 1 && nc > 0 && nc < COLS - 1) {
        const neighbour = getCell(nr, nc);
        if (!visited.has(neighbour)) {
          neighbours.push({ cell: neighbour, row: nr, col: nc, wallRow: row + dr/2, wallCol: col + dc/2 });
        }
      }
    }
    return neighbours;
  }

  // carve passages using recursive backtracking (iterative with stack)
  function carve(startRow, startCol) {
    const stack = [{ row: startRow, col: startCol }];
    const startC = getCell(startRow, startCol);
    visited.add(startC);
    startC.classList.replace('wall', 'empty');

    while (stack.length > 0) {
      const { row, col } = stack[stack.length - 1];
      const neighbours = getUnvisitedNeighbours(row, col);

      if (neighbours.length === 0) {
        stack.pop();
        continue;
      }

      // pick a random neighbour
      const { cell, row: nr, col: nc, wallRow, wallCol } = 
        neighbours[Math.floor(Math.random() * neighbours.length)];

      // carve through the wall between current and neighbour
      const wallCell = getCell(wallRow, wallCol);
      wallCell.classList.replace('wall', 'empty');
      cell.classList.replace('wall', 'empty');

      visited.add(cell);
      stack.push({ row: nr, col: nc });
    }
  }

  // start carving from (1,1)
  carve(1, 1);

  // make sure start and end cells are clear
  startCell.className = 'cell start';
  endCell.className = 'cell end';

  // clear the cells immediately around start and end so they're never blocked
  const sRow = parseInt(startCell.dataset.row);
  const sCol = parseInt(startCell.dataset.col);
  const eRow = parseInt(endCell.dataset.row);
  const eCol = parseInt(endCell.dataset.col);

  [[sRow-1,sCol],[sRow+1,sCol],[sRow,sCol-1],[sRow,sCol+1]].forEach(([r,c]) => {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      const cell = getCell(r, c);
      if (cell !== startCell && cell !== endCell) {
        cell.classList.replace('wall', 'empty');
      }
    }
  });

  [[eRow-1,eCol],[eRow+1,eCol],[eRow,eCol-1],[eRow,eCol+1]].forEach(([r,c]) => {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      const cell = getCell(r, c);
      if (cell !== startCell && cell !== endCell) {
        cell.classList.replace('wall', 'empty');
      }
    }
  });
}

// ── MAZE BUTTON ──
document.getElementById('btn-maze').addEventListener('click', generateMaze);
// ── COMPARISON MODE ──

let compareMode = false;
let savedWalls = [];

function getWallPositions() {
  const walls = [];
  document.querySelectorAll('.cell.wall').forEach(cell => {
    walls.push({
      row: parseInt(cell.dataset.row),
      col: parseInt(cell.dataset.col)
    });
  });
  return walls;
}

function buildCompareGrid(containerId, walls) {
  const gridEl = document.createElement('div');
  gridEl.classList.add('compare-grid');
  gridEl.style.gridTemplateColumns = `repeat(${COLS}, 14px)`;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell', 'empty');
      cell.dataset.row = r;
      cell.dataset.col = c;
      gridEl.appendChild(cell);
    }
  }

  // apply walls
  walls.forEach(({ row, col }) => {
    gridEl.querySelector(`[data-row="${row}"][data-col="${col}"]`)
      .classList.replace('empty', 'wall');
  });

  // apply start and end
  const sRow = parseInt(startCell.dataset.row);
  const sCol = parseInt(startCell.dataset.col);
  const eRow = parseInt(endCell.dataset.row);
  const eCol = parseInt(endCell.dataset.col);

  gridEl.querySelector(`[data-row="${sRow}"][data-col="${sCol}"]`)
    .classList.replace('empty', 'start');
  gridEl.querySelector(`[data-row="${eRow}"][data-col="${eCol}"]`)
    .classList.replace('empty', 'end');

  return gridEl;
}

function runCompareAlgo(algo, gridEl) {
  const realStart = startCell;
  const realEnd = endCell;

  startCell = gridEl.querySelector('.cell.start');
  endCell = gridEl.querySelector('.cell.end');

  // override getCell to query the compare grid instead of main grid
  const realGetCell = getCell;
  window.getCell = (row, col) =>
    gridEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);

  const t0 = performance.now();
  let result;
  if (algo === 'bfs')           result = bfs();
  else if (algo === 'dfs')      result = dfs();
  else if (algo === 'dijkstra') result = dijkstra();
  else if (algo === 'astar')    result = astar();
  else if (algo === 'greedy')   result = greedyBFS();
  const t1 = performance.now();

  // restore everything
  window.getCell = realGetCell;
  startCell = realStart;
  endCell = realEnd;

  return { ...result, time: (t1 - t0).toFixed(2) };
}

function animateCompareGrid(gridEl, visited, path, delay, onDone) {
  let i = 0;

  function animateVisited() {
    if (i >= visited.length) { animatePath(0); return; }
    visited[i].classList.replace('empty', 'visited');
    i++;
    setTimeout(animateVisited, delay);
  }

  function animatePath(j) {
    if (j >= path.length) { if (onDone) onDone(); return; }
    path[j].classList.replace('visited', 'path');
    setTimeout(() => animatePath(j + 1), delay * 2);
  }

  animateVisited();
}

function startComparison() {
  if (isRunning) return;

  const algos = [
    { key: 'bfs',      label: 'BFS' },
    { key: 'dfs',      label: 'DFS' },
    { key: 'dijkstra', label: 'Dijkstra' },
    { key: 'astar',    label: 'A*' },
    { key: 'greedy',   label: 'Greedy BFS' },
  ];

  const walls = getWallPositions();
  const container = document.getElementById('compare-container');
  const delay = 105 - document.getElementById('speed').value;

  container.innerHTML = '';
  container.classList.add('active');

  // hide main grid
  document.getElementById('grid').style.display = 'none';

  algos.forEach(({ key, label }) => {
    // build card
    const card = document.createElement('div');
    card.classList.add('compare-card');

    // header
    const header = document.createElement('div');
    header.classList.add('compare-header');

    const title = document.createElement('div');
    title.classList.add('compare-title');
    title.textContent = label;

    const stats = document.createElement('div');
    stats.classList.add('compare-stats');
    stats.id = `stats-${key}`;
    stats.innerHTML = `
      <span>Nodes: <strong>—</strong></span>
      <span>Path: <strong>—</strong></span>
      <span>Time: <strong>—</strong></span>
    `;

    header.appendChild(title);
    header.appendChild(stats);

    // mini grid
    const gridEl = buildCompareGrid(key, walls);

    card.appendChild(header);
    card.appendChild(gridEl);
    container.appendChild(card);

    // run algo and animate
    const result = runCompareAlgo(key, gridEl);

    // update stats
    const spans = stats.querySelectorAll('strong');
    spans[0].textContent = result.visited.length;
    spans[1].textContent = result.path.length === 0 ? 'No path' : result.path.length;
    spans[2].textContent = result.time + 'ms';

    animateCompareGrid(gridEl, result.visited, result.path, delay, null);
  });

  // swap compare button to exit button
  const btn = document.getElementById('btn-compare');
  btn.textContent = '✕ Exit Compare';
  btn.onclick = exitComparison;
}

function exitComparison() {
  document.getElementById('compare-container').classList.remove('active');
  document.getElementById('grid').style.display = 'grid';

  const btn = document.getElementById('btn-compare');
  btn.textContent = '⚡ Compare';
  btn.onclick = startComparison;
}

document.getElementById('btn-compare').addEventListener('click', startComparison);