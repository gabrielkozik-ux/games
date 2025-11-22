window.gameInstances.snake = {
    canvas: document.getElementById('snake-canvas'), 
    music: document.getElementById('snake-music'), 
    ctx: null, 
    tileSize: 20, 
    snake: [], 
    food: {}, 
    direction: 'right', 
    newDirection: 'right', 
    lastProcessedDirection: 'right', 
    score: 0, 
    gameOver: false, 
    paused: false, 
    loop: null, 
    lastUpdateTime: 0, 
    updateInterval: 120,
    
    init() { 
        this.ctx = this.canvas.getContext('2d'); 
        this.reset(); 
        window.addEventListener('keydown', this.handleInput.bind(this)); 
    },
    reset() { 
        this.snake = [{ x: 10, y: 10 }, {x:9, y:10}, {x:8, y:10}]; 
        this.direction = 'right'; this.newDirection = 'right'; this.lastProcessedDirection = 'right';
        this.score = 0; this.gameOver = false; 
        if(this.canvas.width > 0) this.placeFood(); 
        this.music.currentTime = 0; 
    },
    placeFood() { 
        const c = Math.floor(this.canvas.width / this.tileSize), r = Math.floor(this.canvas.height / this.tileSize); 
        this.food = { x: Math.floor(Math.random() * c), y: Math.floor(Math.random() * r) }; 
        for(let part of this.snake) {
            if(part.x === this.food.x && part.y === this.food.y) this.placeFood();
        }
    },
    handleInput(e) { 
        if (window.activeGame !== 'snake' || this.paused) return; 
        if (e.key === 'ArrowUp' && this.lastProcessedDirection !== 'down') this.newDirection = 'up'; 
        else if (e.key === 'ArrowDown' && this.lastProcessedDirection !== 'up') this.newDirection = 'down'; 
        else if (e.key === 'ArrowLeft' && this.lastProcessedDirection !== 'right') this.newDirection = 'left'; 
        else if (e.key === 'ArrowRight' && this.lastProcessedDirection !== 'left') this.newDirection = 'right'; 
    },
    update() { 
        if (this.gameOver) return; 
        this.direction = this.newDirection; 
        
        const head = { ...this.snake[0] }; 
        if (this.direction === 'right') head.x++; 
        if (this.direction === 'left') head.x--; 
        if (this.direction === 'up') head.y--; 
        if (this.direction === 'down') head.y++; 
        
        this.lastProcessedDirection = this.direction;

        const c = Math.floor(this.canvas.width / this.tileSize), r = Math.floor(this.canvas.height / this.tileSize); 
        
        if (head.x < 0 || head.x >= c || head.y < 0 || head.y >= r) { this.gameOver = true; window.playGameOverSound(); return; } 
        for (let i = 0; i < this.snake.length; i++) { if (head.x === this.snake[i].x && head.y === this.snake[i].y) { this.gameOver = true; window.playGameOverSound(); return; } } 
        
        this.snake.unshift(head); 
        if (head.x === this.food.x && head.y === this.food.y) { this.score++; this.placeFood(); } 
        else { this.snake.pop(); } 
    },
    draw() { 
        this.ctx.fillStyle = '#1a2e05'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); 
        this.snake.forEach((seg, index) => { 
            this.ctx.fillStyle = index === 0 ? '#bef264' : '#84cc16'; 
            this.ctx.fillRect(seg.x * this.tileSize, seg.y * this.tileSize, this.tileSize - 1, this.tileSize - 1); 
        }); 
        this.ctx.fillStyle = '#ef4444'; 
        this.ctx.beginPath();
        this.ctx.arc(this.food.x * this.tileSize + this.tileSize/2, this.food.y * this.tileSize + this.tileSize/2, this.tileSize/2 - 2, 0, Math.PI*2);
        this.ctx.fill();
        
        this.ctx.fillStyle = 'white'; this.ctx.font = `16px "Press Start 2P"`; 
        this.ctx.fillText(`Score: ${this.score}`, 10, 30); 
        
        if (this.gameOver) this.drawGameOver();
    },
    drawGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); 
        this.ctx.fillStyle = 'white'; this.ctx.textAlign = 'center'; 
        this.ctx.font = '30px "Press Start 2P"'; this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.font = '12px "Press Start 2P"'; this.ctx.fillText('Press Close to Menu', this.canvas.width / 2, this.canvas.height / 2 + 40);
        this.ctx.textAlign = 'start'; 
    },
    gameLoop(time) { if (!this.paused) { if (time - this.lastUpdateTime > this.updateInterval) { this.update(); this.lastUpdateTime = time; } this.draw(); } this.loop = requestAnimationFrame(this.gameLoop.bind(this)); },
    start() { this.paused = false; this.lastUpdateTime = 0; if(this.loop) cancelAnimationFrame(this.loop); this.loop = requestAnimationFrame(this.gameLoop.bind(this)); window.safePlay(this.music); },
    stop() { if(this.loop) cancelAnimationFrame(this.loop); this.loop = null; this.paused = true; this.music.pause(); document.body.style.overflow = 'auto'; },
    togglePause() { this.paused = !this.paused; if (this.gameOver) { /* Nic */ } else if (this.paused) this.music.pause(); else this.music.play(); }
};