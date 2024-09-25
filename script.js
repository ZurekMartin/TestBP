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

// Inicializace mřížky a vykreslení
initializeGrid();

// Funkce pro přepínání aktivního tlačítka
function setActiveButton(button) {
    const buttons = document.querySelectorAll('.algorithm-btn');
    
    buttons.forEach(btn => btn.classList.remove('active'));

    button.classList.add('active');
}

// Přidání událostí pro jednotlivá tlačítka algoritmů
document.getElementById("both").addEventListener("click", function() {
    setActiveButton(this);
});

document.getElementById("shortestPathBtn").addEventListener("click", function() {
    setActiveButton(this);
});

document.getElementById("realisticPathBtn").addEventListener("click", function() {
    setActiveButton(this);
});
