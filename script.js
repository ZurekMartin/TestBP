const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const gridSize = 10;
const rows = canvas.height / gridSize;
const cols = canvas.width / gridSize;

let walls = [];
let grid = [];
let startX, startY;
let drawing = false;
let draggingElement = null;
let startFiber = null;
let endFiber = null;

// Inicializace mřížky
function initializeGrid() {
    grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    drawGrid();
}

// Vykreslení mřížky
function drawGrid() {
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= rows; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }
    for (let i = 0; i <= cols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
    }
}

// Převod souřadnic na pozici v mřížce (přichytávání ke mřížce)
function toGrid(x, y) {
    return {
        row: Math.floor(y / gridSize),
        col: Math.floor(x / gridSize)
    };
}

// Přidání zdi do mřížky a kreslení zdi
function addWallToGrid(x1, y1, x2, y2) {
    let { row: row1, col: col1 } = toGrid(x1, y1);
    let { row: row2, col: col2 } = toGrid(x2, y2);

    let dx = Math.abs(col2 - col1), sx = col1 < col2 ? 1 : -1;
    let dy = Math.abs(row2 - row1), sy = row1 < row2 ? 1 : -1;
    let err = (dx > dy ? dx : -dy) / 2;

    while (true) {
        grid[row1][col1] = 1;  // Označit buňku jako zeď
        ctx.fillStyle = 'black';
        ctx.fillRect(col1 * gridSize, row1 * gridSize, gridSize, gridSize);

        if (col1 === col2 && row1 === row2) break;
        let e2 = err;
        if (e2 > -dx) { err -= dy; col1 += sx; }
        if (e2 < dy) { err += dx; row1 += sy; }
    }
}

// Události pro kreslení zdí
canvas.addEventListener("mousedown", (e) => {
    startX = e.offsetX;
    startY = e.offsetY;
    drawing = true;
});

canvas.addEventListener("mousemove", (e) => {
    if (drawing) {
        redraw();
        ctx.beginPath();
        let start = toGrid(startX, startY);
        let current = toGrid(e.offsetX, e.offsetY);
        ctx.moveTo(start.col * gridSize + gridSize / 2, start.row * gridSize + gridSize / 2);
        ctx.lineTo(current.col * gridSize + gridSize / 2, current.row * gridSize + gridSize / 2);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;  // Tenká čára
        ctx.stroke();
    }
});

canvas.addEventListener("mouseup", (e) => {
    if (drawing) {
        addWallToGrid(startX, startY, e.offsetX, e.offsetY);
        drawing = false;
    }
});

// Drag-and-drop události
document.querySelectorAll('.draggable').forEach(item => {
    item.addEventListener('dragstart', onDragStart);
});

canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
});

canvas.addEventListener('drop', onDrop);

function onDragStart(e) {
    draggingElement = e.target.id;
}

function onDrop(e) {
    const x = e.offsetX;
    const y = e.offsetY;

    if (draggingElement === "startFiber") {
        startFiber = toGrid(x, y);
        redraw();
    } else if (draggingElement === "endFiber") {
        endFiber = toGrid(x, y);
        redraw();
    }
}

let shortestPath = null;
let realisticPath = null;

document.getElementById("planFiber").addEventListener("click", () => {
    if (startFiber && endFiber) {
        shortestPath = findPath(startFiber, endFiber);
        realisticPath = findRealisticPath(startFiber, endFiber);
        if (!shortestPath) {
            alert("Nelze najít nejkratší trasu.");
        }
        if (!realisticPath) {
            alert("Nelze najít realistickou trasu.");
        }
        redraw();
    } else {
        alert("Musíte umístit začátek a konec vlákna.");
    }
});

// Překreslení canvasu
function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    // Vykreslení stěn
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 1) {
                ctx.fillStyle = 'black';
                ctx.fillRect(c * gridSize, r * gridSize, gridSize, gridSize);
            }
        }
    }
    // Vykreslení začátku a konce vlákna
    if (startFiber) {
        ctx.fillStyle = "blue";
        ctx.fillRect(startFiber.col * gridSize, startFiber.row * gridSize, gridSize, gridSize);
    }
    if (endFiber) {
        ctx.fillStyle = "red";
        ctx.fillRect(endFiber.col * gridSize, endFiber.row * gridSize, gridSize, gridSize);
    }
    // Vykreslení nejkratší trasy
    if (shortestPath) {
        drawPath(shortestPath, "green");
    }
    // Vykreslení realistické trasy
    if (realisticPath) {
        drawPath(realisticPath, "blue");
    }
}

// Překreslení canvasu
function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    // Vykreslení stěn
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 1) {
                ctx.fillStyle = 'black';
                ctx.fillRect(c * gridSize, r * gridSize, gridSize, gridSize);
            }
        }
    }
    // Vykreslení začátku a konce vlákna
    if (startFiber) {
        ctx.fillStyle = "blue";
        ctx.fillRect(startFiber.col * gridSize, startFiber.row * gridSize, gridSize, gridSize);
    }
    if (endFiber) {
        ctx.fillStyle = "red";
        ctx.fillRect(endFiber.col * gridSize, endFiber.row * gridSize, gridSize, gridSize);
    }
}

// A* algoritmus pro nalezení nejkratší cesty
function findPath(start, end) {
    const openSet = [start];
    const closedSet = [];
    const cameFrom = {};
    const gScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
    const fScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));

    gScore[start.row][start.col] = 0;
    fScore[start.row][start.col] = heuristic(start, end);

    while (openSet.length > 0) {
        let current = openSet.reduce((a, b) => (fScore[a.row][a.col] < fScore[b.row][b.col] ? a : b));

        if (current.row === end.row && current.col === end.col) {
            return reconstructPath(cameFrom, current);
        }

        openSet.splice(openSet.indexOf(current), 1);
        closedSet.push(current);

        getNeighbors(current).forEach(neighbor => {
            if (closedSet.find(n => n.row === neighbor.row && n.col === neighbor.col)) return;

            let tentative_gScore = gScore[current.row][current.col] + 1;

            if (!openSet.find(n => n.row === neighbor.row && n.col === neighbor.col)) {
                openSet.push(neighbor);
            } else if (tentative_gScore >= gScore[neighbor.row][neighbor.col]) {
                return;
            }

            cameFrom[`${neighbor.row},${neighbor.col}`] = current;
            gScore[neighbor.row][neighbor.col] = tentative_gScore;
            fScore[neighbor.row][neighbor.col] = gScore[neighbor.row][neighbor.col] + heuristic(neighbor, end);
        });
    }

    return null;
}

function reconstructPath(cameFrom, current) {
    let totalPath = [current];
    while (`${current.row},${current.col}` in cameFrom) {
        current = cameFrom[`${current.row},${current.col}`];
        totalPath.push(current);
    }
    return totalPath.reverse();
}

function heuristic(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function getNeighbors(node) {
    const neighbors = [];
    const dirs = [
        { row: -1, col: 0 }, { row: 1, col: 0 },
        { row: 0, col: -1 }, { row: 0, col: 1 }
    ];
    dirs.forEach(dir => {
        const neighbor = { row: node.row + dir.row, col: node.col + dir.col };
        if (neighbor.row >= 0 && neighbor.row < rows && neighbor.col >= 0 && neighbor.col < cols && grid[neighbor.row][neighbor.col] === 0) {
            neighbors.push(neighbor);
        }
    });
    return neighbors;
}

function drawPath(path, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;  // Tenká čára pro optické vlákno
    ctx.beginPath();
    ctx.moveTo(path[0].col * gridSize + gridSize / 2, path[0].row * gridSize + gridSize / 2);

    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].col * gridSize + gridSize / 2, path[i].row * gridSize + gridSize / 2);
    }

    ctx.stroke();
}

// Funkce pro nalezení realistické cesty podél stěn
function findRealisticPath(start, end) {
    // Implementace algoritmu pro realistickou trasu podél stěn
    // Tento algoritmus by měl zohlednit stěny a pokusit se najít cestu, která je co nejkratší, ale sleduje stěny
    // Pro jednoduchost zde použijeme stejný A* algoritmus, ale s jinou heuristikou nebo úpravou, aby preferoval cesty podél stěn

    // Příklad jednoduché úpravy heuristiky:
    function heuristicWithWalls(a, b) {
        // Preferovat cesty podél stěn
        let wallPenalty = 0;
        if (grid[a.row][a.col] === 1) wallPenalty += 10;
        if (grid[b.row][b.col] === 1) wallPenalty += 10;
        return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) + wallPenalty;
    }

    // Zbytek kódu je podobný jako ve funkci findPath, ale používá heuristicWithWalls místo heuristic
    const openSet = [start];
    const closedSet = [];
    const cameFrom = {};
    const gScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
    const fScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));

    gScore[start.row][start.col] = 0;
    fScore[start.row][start.col] = heuristicWithWalls(start, end);

    while (openSet.length > 0) {
        let current = openSet.reduce((a, b) => (fScore[a.row][a.col] < fScore[b.row][b.col] ? a : b));

        if (current.row === end.row && current.col === end.col) {
            return reconstructPath(cameFrom, current);
        }

        openSet.splice(openSet.indexOf(current), 1);
        closedSet.push(current);

        getNeighbors(current).forEach(neighbor => {
            if (closedSet.find(n => n.row === neighbor.row && n.col === neighbor.col)) return;

            let tentative_gScore = gScore[current.row][current.col] + 1;

            if (!openSet.find(n => n.row === neighbor.row && n.col === neighbor.col)) {
                openSet.push(neighbor);
            } else if (tentative_gScore >= gScore[neighbor.row][neighbor.col]) {
                return;
            }

            cameFrom[`${neighbor.row},${neighbor.col}`] = current;
            gScore[neighbor.row][neighbor.col] = tentative_gScore;
            fScore[neighbor.row][neighbor.col] = gScore[neighbor.row][neighbor.col] + heuristicWithWalls(neighbor, end);
        });
    }

    return null;  // Nelze najít realistickou trasu
}

// Inicializace mřížky a vykreslení
initializeGrid();