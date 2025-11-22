window.gameInstances.tetris = {
    canvas: document.getElementById('tetris-canvas'), 
    music: document.getElementById('tetris-music'), 
    ctx: null, grid: [], score: 0, gameOver: false, paused: false, loop: null, dropCounter: 0, dropInterval: 1000, lastTime: 0, 
    cols: 10, rows: 20, blockSize: 0,
    boardWidth: 0, 
    
    player: { pos: { x: 0, y: 0 }, matrix: null, score: 0 }, 
    nextPiece: null, 
    pieces: 'TJLOSZI', 
    colors: [null, '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#8b5cf6'],
    
    init() { this.ctx = this.canvas.getContext('2d'); window.addEventListener('keydown', this.handleInput.bind(this)); },
    
    reset() {
        if (this.canvas.height === 0) return;
        
        // 1. Vypočítáme velikost bloku podle dostupné výšky (75% okna z app.js)
        this.rows = 20;
        this.blockSize = Math.floor(this.canvas.height / this.rows);
        
        this.cols = 10;
        this.boardWidth = this.cols * this.blockSize;
        const sidebarWidth = 150; // Místo pro "Next Piece"

        // 2. CRITICAL FIX: Změníme šířku plátna, aby odpovídala přesně hře.
        // Díky tomu bude fungovat CSS centrování (margin: auto / flexbox).
        this.canvas.width = this.boardWidth + sidebarWidth;
        // Zarovnáme i výšku přesně na pixely
        this.canvas.height = this.rows * this.blockSize;

        this.grid = this.createMatrix(this.cols, this.rows);
        this.score = 0; this.gameOver = false; this.paused = true;
        
        this.player.matrix = this.createPiece(this.pieces[Math.floor(Math.random() * this.pieces.length)]);
        this.nextPiece = this.createPiece(this.pieces[Math.floor(Math.random() * this.pieces.length)]);
        
        this.playerReset();
        this.music.currentTime = 0;
    },
    
    createMatrix(w, h) { const matrix = []; while (h--) { matrix.push(new Array(w).fill(0)); } return matrix; },
    
    createPiece(type) { 
        if (type === 'T') return [[0, 0, 0], [1, 1, 1], [0, 1, 0]]; 
        else if (type === 'O') return [[2, 2], [2, 2]]; 
        else if (type === 'L') return [[0, 3, 0], [0, 3, 0], [0, 3, 3]]; 
        else if (type === 'J') return [[0, 4, 0], [0, 4, 0], [4, 4, 0]]; 
        else if (type === 'I') return [[0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0]]; 
        else if (type === 'S') return [[0, 6, 6], [6, 6, 0], [0, 0, 0]]; 
        else if (type === 'Z') return [[7, 7, 0], [0, 7, 7], [0, 0, 0]]; 
    },
    
    playerReset() {
        if (this.nextPiece) { this.player.matrix = this.nextPiece; }
        this.nextPiece = this.createPiece(this.pieces[Math.floor(Math.random() * this.pieces.length)]);
        this.player.pos.y = 0; 
        this.player.pos.x = (this.cols / 2 | 0) - (this.player.matrix[0].length / 2 | 0);
        if (this.collide(this.grid, this.player)) { this.gameOver = true; window.playGameOverSound(); }
    },
    
    collide(grid, player) { const [m, o] = [player.matrix, player.pos]; for (let y = 0; y < m.length; ++y) { for (let x = 0; x < m[y].length; ++x) { if (m[y][x] !== 0 && (grid[y + o.y] && grid[y + o.y][x + o.x]) !== 0) return true; } } return false; },
    
    merge(grid, player) { player.matrix.forEach((row, y) => { row.forEach((value, x) => { if (value !== 0) { grid[y + player.pos.y][x + player.pos.x] = value; } }); }); },
    
    rotate(matrix, dir) { for (let y = 0; y < matrix.length; ++y) { for (let x = 0; x < y; ++x) { [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]]; } } if (dir > 0) { matrix.forEach(row => row.reverse()); } else { matrix.reverse(); } },
    
    playerRotate(dir) { const pos = this.player.pos.x; let offset = 1; this.rotate(this.player.matrix, dir); while (this.collide(this.grid, this.player)) { this.player.pos.x += offset; offset = -(offset + (offset > 0 ? 1 : -1)); if (offset > this.player.matrix[0].length) { this.rotate(this.player.matrix, -dir); this.player.pos.x = pos; return; } } },
    
    gridSweep() { outer: for (let y = this.grid.length - 1; y > 0; --y) { for (let x = 0; x < this.grid[y].length; ++x) { if (this.grid[y][x] === 0) continue outer; } const row = this.grid.splice(y, 1)[0].fill(0); this.grid.unshift(row); ++y; this.score += 10; } },
    
    handleInput(e) { 
        if (window.activeGame !== 'tetris') return;
        if (e.code === 'Space') { this.togglePause(); return; }
        if (this.paused || this.gameOver) return; 
        if (e.key === 'ArrowLeft') this.playerMove(-1); 
        else if (e.key === 'ArrowRight') this.playerMove(1); 
        else if (e.key === 'ArrowDown') this.playerDrop(); 
        else if (e.key === 'ArrowUp') this.playerRotate(1); 
    },
    
    playerMove(dir) { this.player.pos.x += dir; if (this.collide(this.grid, this.player)) this.player.pos.x -= dir; },
    playerDrop() { this.player.pos.y++; if (this.collide(this.grid, this.player)) { this.player.pos.y--; this.merge(this.grid, this.player); this.playerReset(); this.gridSweep(); } this.dropCounter = 0; },
    update(time = 0) { if (this.gameOver) return; const deltaTime = time - this.lastTime; this.lastTime = time; this.dropCounter += deltaTime; if (this.dropCounter > this.dropInterval) { this.playerDrop(); } },
    
    drawMatrix(matrix, offset, ctx = this.ctx) {
        matrix.forEach((row, y) => { 
            row.forEach((value, x) => { 
                if (value !== 0) { 
                    ctx.fillStyle = this.colors[value]; 
                    ctx.fillRect((x + offset.x) * this.blockSize, (y + offset.y) * this.blockSize, this.blockSize - 1, this.blockSize - 1); 
                    ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    ctx.fillRect((x + offset.x) * this.blockSize, (y + offset.y) * this.blockSize, this.blockSize - 1, 4);
                } 
            }); 
        });
    },
    
    draw() {
        this.ctx.fillStyle = '#1e293b'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        if (!this.grid || !this.player.matrix) return;
        
        // Herní plocha
        this.ctx.fillStyle = '#0f172a'; this.ctx.fillRect(0, 0, this.boardWidth, this.canvas.height);
        
        this.drawMatrix(this.grid, { x: 0, y: 0 });
        this.drawMatrix(this.player.matrix, this.player.pos);
        
        // UI Sidebar
        const sidebarX = this.boardWidth + 20;
        this.ctx.fillStyle = 'white'; this.ctx.textAlign = 'left';
        this.ctx.font = '20px "Silkscreen"'; this.ctx.fillText(`SCORE`, sidebarX, 50);
        this.ctx.font = '28px "Silkscreen"'; this.ctx.fillStyle = '#fbbf24'; this.ctx.fillText(`${this.score}`, sidebarX, 80);
        this.ctx.fillStyle = 'white'; this.ctx.font = '20px "Silkscreen"'; this.ctx.fillText(`NEXT`, sidebarX, 150);
        
        if (this.nextPiece) {
            const previewOffsetX = (sidebarX / this.blockSize) + 1;
            const previewOffsetY = 6;
            this.nextPiece.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        this.ctx.fillStyle = this.colors[value];
                        this.ctx.fillRect((x + previewOffsetX) * this.blockSize, (y + previewOffsetY) * this.blockSize, this.blockSize - 1, this.blockSize - 1);
                        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
                        this.ctx.fillRect((x + previewOffsetX) * this.blockSize, (y + previewOffsetY) * this.blockSize, this.blockSize - 1, 4);
                    }
                });
            });
        }

        if (this.paused && !this.gameOver) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.6)'; this.ctx.fillRect(0,0,this.boardWidth, this.canvas.height);
            this.ctx.fillStyle='white'; this.ctx.textAlign='center'; this.ctx.font='30px "Silkscreen"'; this.ctx.fillText('PAUSED', this.boardWidth/2, this.canvas.height/2);
        }
        
        if (this.gameOver) { 
            this.ctx.fillStyle = 'rgba(255,255,255,0.9)'; this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height); 
            this.ctx.fillStyle='black'; this.ctx.textAlign='center'; this.ctx.font='30px "Silkscreen"'; this.ctx.fillText('GAME OVER',this.canvas.width/2,this.canvas.height/2); 
        }
    },
    gameLoop(time) { if (!this.paused) { this.update(time); this.draw(); } this.loop = requestAnimationFrame(this.gameLoop.bind(this)); },
    start() { this.paused = false; this.lastTime = 0; this.dropCounter = 0; if(this.loop) cancelAnimationFrame(this.loop); this.loop = requestAnimationFrame(this.gameLoop.bind(this)); window.safePlay(this.music); },
    stop() { if(this.loop) cancelAnimationFrame(this.loop); this.loop = null; this.paused = true; this.music.pause(); document.body.style.overflow = 'auto';},
    togglePause() { this.paused = !this.paused; if(!this.gameOver && !this.paused) this.music.play(); else this.music.pause(); this.draw(); }
};