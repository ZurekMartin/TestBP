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
        ctx.lineWidth = 1;
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

// A* algoritmus pro nalezení nejkratší trasy
function aStar(start, end) {
    const openSet = [start];
    const cameFrom = {};
    const gScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
    const fScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));

    gScore[start.row][start.col] = 0;
    fScore[start.row][start.col] = heuristic(start, end);

    while (openSet.length > 0) {
        let current = openSet.reduce((prev, curr) => fScore[curr.row][curr.col] < fScore[prev.row][prev.col] ? curr : prev);

        if (current.row === end.row && current.col === end.col) {
            return reconstructPath(cameFrom, current);
        }

        openSet.splice(openSet.indexOf(current), 1);

        for (let neighbor of getNeighbors(current)) {
            let tentativeGScore = gScore[current.row][current.col] + 1;

            if (tentativeGScore < gScore[neighbor.row][neighbor.col]) {
                cameFrom[`${neighbor.row},${neighbor.col}`] = current;
                gScore[neighbor.row][neighbor.col] = tentativeGScore;
                fScore[neighbor.row][neighbor.col] = tentativeGScore + heuristic(neighbor, end);

                if (!openSet.some(n => n.row === neighbor.row && n.col === neighbor.col)) {
                    openSet.push(neighbor);
                }
            }
        }
    }
    return null; // Trasa nebyla nalezena
}

// Pomocné funkce
function heuristic(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col); // Manhattan distance
}

function getNeighbors(node) {
    const neighbors = [];
    const directions = [
        { row: -1, col: 0 }, // nahoru
        { row: 1, col: 0 },  // dolů
        { row: 0, col: -1 }, // vlevo
        { row: 0, col: 1 },  // vpravo
    ];

    for (let dir of directions) {
        const newRow = node.row + dir.row;
        const newCol = node.col + dir.col;
        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols && grid[newRow][newCol] === 0) {
            neighbors.push({ row: newRow, col: newCol });
        }
    }
    return neighbors;
}

function reconstructPath(cameFrom, current) {
    const path = [];
    while (current) {
        path.push(current);
        current = cameFrom[`${current.row},${current.col}`];
    }
    return path.reverse();
}

// Vykreslení cesty
function drawPath(path) {
    if (path) {
        for (let node of path) {
            if (!(node.row === startFiber.row && node.col === startFiber.col) && 
                !(node.row === endFiber.row && node.col === endFiber.col)) {
                ctx.fillStyle = "green"; // Zelená čára pro trasu
                ctx.fillRect(node.col * gridSize + gridSize / 4, node.row * gridSize + gridSize / 4, gridSize / 2, gridSize / 2);
            }
        }
    } else {
        alert("Nelze najít trasu!");
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

// Plánování trasy
document.getElementById("planFiber").addEventListener("click", () => {
    if (startFiber && endFiber) {
        const path = aStar(startFiber, endFiber);
        drawPath(path);
    } else {
        alert("Prosím, nastavte začátek a konec vlákna.");
    }
});

// Inicializace mřížky a vykreslení
initializeGrid();
