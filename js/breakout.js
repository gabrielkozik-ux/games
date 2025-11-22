window.gameInstances.breakout = {
    canvas: document.getElementById('breakout-canvas'), 
    music: document.getElementById('breakout-music'), 
    ctx: null, paddle: {}, balls: [], bricks: [], powerUps: [], score: 0, lives: 3, paused: false, gameOver: false, loop: null,
    
    init() { 
        this.ctx = this.canvas.getContext('2d'); 
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && window.activeGame === 'breakout') {
                this.togglePause();
            }
        });
    },
    
    reset() { 
        this.paddle = { x: this.canvas.width / 2 - 50, y: this.canvas.height - 20, width: 100, height: 10, speed: 10 }; 
        this.balls = [{ x: this.canvas.width / 2, y: this.canvas.height - 30, size: 7, dx: 4, dy: -4 }]; 
        this.powerUps = []; 
        this.createBricks(); 
        this.score = 0; this.lives = 3; this.gameOver = false; this.music.currentTime = 0; 
    },
    
    createBricks() { this.bricks = []; const rows = 5, cols = 8, padding = 5; const brickWidth = (this.canvas.width - padding * (cols + 1)) / cols; const brickHeight = 20; for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) this.bricks.push({ x: c * (brickWidth + padding) + padding, y: r * (brickHeight + padding) + padding + 40, width: brickWidth, height: brickHeight, visible: true }); },
    
    spawnPowerUp(x, y) { if (Math.random() < 0.2) { const type = Math.random() < 0.5 ? 'widePaddle' : 'multiBall'; this.powerUps.push({ x, y, size: 10, dy: 2, type }); } },
    
    update() {
        if (this.paused || this.gameOver) return;
        if (window.keysPressed['ArrowLeft']) this.paddle.x -= this.paddle.speed; if (window.keysPressed['ArrowRight']) this.paddle.x += this.paddle.speed;
        this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, this.paddle.x));
        
        for (let i = this.balls.length - 1; i >= 0; i--) {
            let ball = this.balls[i];
            ball.x += ball.dx; ball.y += ball.dy;
            if (ball.x + ball.size > this.canvas.width || ball.x - ball.size < 0) ball.dx *= -1;
            if (ball.y - ball.size < 0) ball.dy *= -1;
            
            if (ball.y + ball.size > this.canvas.height) { 
                this.balls.splice(i, 1); 
                if (this.balls.length === 0) { 
                    this.lives--; 
                    if (this.lives <= 0) { this.gameOver = true; window.playGameOverSound(); } 
                    else { this.paddle.width = 100; this.balls.push({ x: this.canvas.width / 2, y: this.canvas.height - 30, size: 7, dx: 4, dy: -4 }); } 
                } 
            }
            if (ball.y + ball.size >= this.paddle.y && ball.y < this.paddle.y + this.paddle.height && ball.x > this.paddle.x && ball.x < this.paddle.x + this.paddle.width) {
                ball.dy = -Math.abs(ball.dy) * 1.02; 
                let hitPoint = ball.x - (this.paddle.x + this.paddle.width / 2);
                ball.dx = hitPoint * 0.15; 
            }
            this.bricks.forEach(brick => { 
                if (brick.visible && ball.x > brick.x && ball.x < brick.x + brick.width && ball.y > brick.y && ball.y < brick.y + brick.height) { 
                    brick.visible = false; ball.dy *= -1; this.score++; this.spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2); 
                } 
            });
        }
        this.powerUps.forEach((p, i) => { p.y += p.dy; if (p.y > this.canvas.height) this.powerUps.splice(i, 1); if (p.x > this.paddle.x && p.x < this.paddle.x + this.paddle.width && p.y > this.paddle.y && p.y < this.paddle.y + this.paddle.height) { if (p.type === 'widePaddle') this.paddle.width = 150; if (p.type === 'multiBall') this.balls.push({ x: this.paddle.x + this.paddle.width / 2, y: this.paddle.y - 10, size: 7, dx: (Math.random() - 0.5) * 8, dy: -4 }); this.powerUps.splice(i, 1); } });
        if (this.bricks.every(b => !b.visible)) { this.createBricks(); this.balls.push({ x: this.canvas.width / 2, y: this.canvas.height / 2, size: 7, dx: 4, dy: -4 }); }
    },
    draw() {
        this.ctx.fillStyle = '#4a044e'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#fde047'; this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
        this.balls.forEach(ball => { this.ctx.beginPath(); this.ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2); this.ctx.fill(); });
        this.bricks.forEach((brick, i) => { if (brick.visible) { this.ctx.fillStyle = `hsl(${i * 10}, 70%, 60%)`; this.ctx.fillRect(brick.x, brick.y, brick.width-1, brick.height-1); } });
        this.powerUps.forEach(p => { this.ctx.fillStyle = p.type === 'widePaddle' ? '#22c55e' : '#3b82f6'; this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); this.ctx.fill(); this.ctx.fillStyle='white'; this.ctx.textAlign='center'; this.ctx.font='10px sans-serif'; this.ctx.fillText(p.type[0].toUpperCase(), p.x, p.y+3);});
        
        this.ctx.fillStyle = 'white'; this.ctx.font = '20px "Bungee"'; this.ctx.textAlign = 'left'; this.ctx.fillText(`Score: ${this.score}`, 10, 30);
        this.ctx.textAlign = 'right'; this.ctx.fillText(`Lives: ${this.lives}`, this.canvas.width - 10, 30);
        
        // PAUSE TEXT
        if (this.paused && !this.gameOver) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(0,0,this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white'; this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width/2, this.canvas.height/2);
            this.ctx.textAlign = 'start'; // Reset
        }

        if (this.gameOver) { this.ctx.fillStyle = 'rgba(0,0,0,0.7)'; this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height); this.ctx.fillStyle='white'; this.ctx.textAlign='center'; this.ctx.fillText('GAME OVER', this.canvas.width/2, this.canvas.height/2); }
    },
    gameLoop() { if (!this.paused) { this.update(); this.draw(); } this.loop = requestAnimationFrame(this.gameLoop.bind(this)); },
    start() { this.paused = false; if(this.loop) cancelAnimationFrame(this.loop); this.loop = requestAnimationFrame(this.gameLoop.bind(this)); window.safePlay(this.music);},
    stop() { if(this.loop) cancelAnimationFrame(this.loop); this.loop = null; this.paused = true; this.music.pause(); document.body.style.overflow = 'auto';},
    togglePause() { this.paused = !this.paused; if(!this.gameOver && !this.paused) this.music.play(); else this.music.pause(); this.draw(); }
};