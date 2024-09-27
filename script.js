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

// Initialize grid
function initializeGrid() {
    grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    drawGrid();
}

// Draw grid lines
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

// Convert image to grayscale
function convertToGrayscale(image) {
    let grayscaleData = [];
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        let avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        grayscaleData.push(avg);
    }
    
    return grayscaleData;
}

// Extract walls from the image using a threshold
function extractWallsFromImage(grayscaleData, threshold) {
    for (let i = 0; i < grayscaleData.length; i++) {
        let col = i % canvas.width;
        let row = Math.floor(i / canvas.width);
        
        if (grayscaleData[i] < threshold) {
            addWallToGrid(col, row);
        }
    }
}

// Convert coordinates to grid positions
function toGrid(x, y) {
    return {
        row: Math.floor(y / gridSize),
        col: Math.floor(x / gridSize)
    };
}

// Add wall to the grid
function addWallToGrid(x, y) {
    let { row, col } = toGrid(x, y);
    
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
        grid[row][col] = 1;
        ctx.fillStyle = 'black';
        ctx.fillRect(col * gridSize, row * gridSize, gridSize, gridSize);
    }
}

// Load and process the uploaded floor plan image
function loadAndProcessImage(image) {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
        img.src = e.target.result;
        img.onload = () => {
            const grayscaleData = convertToGrayscale(img);
            extractWallsFromImage(grayscaleData, 128); // Example threshold for wall detection
        };
    };
    reader.readAsDataURL(image);
}

// Event listener for image upload
document.getElementById('imageLoader').addEventListener('change', function (e) {
    const imageFile = e.target.files[0];
    if (imageFile) {
        loadAndProcessImage(imageFile);
    }
});

// Event listeners for manual wall drawing
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

// Drag-and-drop events for fiber start and end
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

// A* algorithm for finding the shortest path
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
    return null; // No path found
}

// Helper functions
function heuristic(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col); // Manhattan distance
}

function getNeighbors(node) {
    const neighbors = [];
    const directions = [
        { row: -1, col: 0 }, // up
        { row: 1, col: 0 },  // down
        { row: 0, col: -1 }, // left
        { row: 0, col: 1 },  // right
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

// Draw path
function drawPath(path) {
    if (path) {
        for (let node of path) {
            if (!(node.row === startFiber.row && node.col === startFiber.col) && 
                !(node.row === endFiber.row && node.col === endFiber.col)) {
                ctx.fillStyle = "green"; // Green path line
                ctx.fillRect(node.col * gridSize + gridSize / 4, node.row * gridSize + gridSize / 4, gridSize / 2, gridSize / 2);
            }
        }
    } else {
        alert("Nelze najít trasu!");
    }
}

// Redraw canvas
function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    // Draw walls
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 1) {
                ctx.fillStyle = 'black';
                ctx.fillRect(c * gridSize, r * gridSize, gridSize, gridSize);
            }
        }
    }

    // Draw start and end fiber
    if (startFiber) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(startFiber.col * gridSize, startFiber.row * gridSize, gridSize, gridSize);
    }
    if (endFiber) {
        ctx.fillStyle = 'red';
        ctx.fillRect(endFiber.col * gridSize, endFiber.row * gridSize, gridSize, gridSize);
    }
}

// Fiber planning button event
document.getElementById('planFiber').addEventListener('click', () => {
    if (startFiber && endFiber) {
        const path = aStar(startFiber, endFiber);
        drawPath(path);
    } else {
        alert("Nastavte začátek a konec vlákna.");
    }
});

// Initialize the grid on page load
initializeGrid();
