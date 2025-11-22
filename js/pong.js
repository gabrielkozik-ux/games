window.gameInstances.pong = {
    canvas: document.getElementById('pong-canvas'), 
    music: document.getElementById('pong-music'), 
    ctx: null, 
    ball: {}, 
    player: {}, 
    ai: {}, 
    paddleWidth: 0, 
    paddleHeight: 0, 
    paused: false, 
    loop: null, 
    maxScore: 15, 
    gameOver: false, 
    gameWon: false,
    
    init() { this.ctx = this.canvas.getContext('2d'); },
    
    reset() { 
        this.paddleWidth = this.canvas.width / 70; 
        this.paddleHeight = this.canvas.height / 5; 
        
        // ZRYCHLENÍ: Zvýšeno z 5 na 7
        const startSpeed = 7; 
        
        this.ball = { 
            x: this.canvas.width / 2, 
            y: this.canvas.height / 2, 
            size: this.canvas.width / 80, 
            dx: startSpeed, 
            dy: startSpeed 
        }; 
        
        // ZRYCHLENÍ: Hráč i AI jsou trochu rychlejší (8->10, 5->7)
        this.player = { x: 10, y: this.canvas.height / 2 - this.paddleHeight / 2, width: this.paddleWidth, height: this.paddleHeight, score: 0, speed: 10 }; 
        this.ai = { x: this.canvas.width - 10 - this.paddleWidth, y: this.canvas.height / 2 - this.paddleHeight / 2, width: this.paddleWidth, height: this.paddleHeight, score: 0, speed: 7 }; 
        
        this.gameOver = false; this.gameWon = false; this.music.currentTime = 0; 
    },
    
    update() {
        if (this.paused || this.gameOver || this.gameWon) return;
        if (this.ai.score >= this.maxScore) { this.gameOver = true; window.playGameOverSound(); return; }
        if (this.player.score >= this.maxScore) { this.gameWon = true; window.playVictorySound(); return; }

        if (window.keysPressed['ArrowUp']) this.player.y -= this.player.speed;
        if (window.keysPressed['ArrowDown']) this.player.y += this.player.speed;
        this.player.y = Math.max(0, Math.min(this.canvas.height - this.player.height, this.player.y));

        this.ball.x += this.ball.dx; this.ball.y += this.ball.dy;

        if (this.ball.y + this.ball.size > this.canvas.height || this.ball.y - this.ball.size < 0) this.ball.dy *= -1;

        let paddle = (this.ball.x < this.canvas.width / 2) ? this.player : this.ai;
        if (this.ball.x - this.ball.size < paddle.x + paddle.width && 
            this.ball.x + this.ball.size > paddle.x && 
            this.ball.y > paddle.y && 
            this.ball.y < paddle.y + paddle.height) {
                this.ball.dx *= -1.05; // Zrychlování po odrazu
                if(paddle === this.player) this.ball.x = this.player.x + this.player.width + this.ball.size;
                else this.ball.x = this.ai.x - this.ball.size;
        }

        if (this.ball.x + this.ball.size < 0) { this.ai.score++; this.resetBall(); }
        if (this.ball.x - this.ball.size > this.canvas.width) { this.player.score++; this.resetBall(); }

        const aiCenter = this.ai.y + this.ai.height / 2;
        if (aiCenter < this.ball.y - 35) this.ai.y += this.ai.speed;
        else if (aiCenter > this.ball.y + 35) this.ai.y -= this.ai.speed;
        this.ai.y = Math.max(0, Math.min(this.canvas.height - this.ai.height, this.ai.y));
    },
    
    resetBall() { 
        this.ball.x = this.canvas.width / 2; 
        this.ball.y = this.canvas.height / 2; 
        // Reset na základní rychlost 7
        this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * 7; 
        this.ball.dy = (Math.random() > 0.5 ? 1 : -1) * 7; 
    },
    
    draw() {
        this.ctx.fillStyle = '#0f172a'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = 'rgba(255,255,255,0.1)'; this.ctx.setLineDash([10, 10]); this.ctx.beginPath(); this.ctx.moveTo(this.canvas.width / 2, 0); this.ctx.lineTo(this.canvas.width / 2, this.canvas.height); this.ctx.stroke(); this.ctx.setLineDash([]);
        this.ctx.fillStyle = 'white'; 
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height); 
        this.ctx.fillRect(this.ai.x, this.ai.y, this.ai.width, this.ai.height);
        this.ctx.beginPath(); this.ctx.arc(this.ball.x, this.ball.y, this.ball.size, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.font = `40px "Silkscreen"`; this.ctx.textAlign = 'center'; 
        this.ctx.fillText(this.player.score, this.canvas.width / 4, 60); 
        this.ctx.fillText(this.ai.score, this.canvas.width * 3 / 4, 60);
        if (this.gameOver || this.gameWon) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.8)'; this.ctx.fillRect(0,0,this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = this.gameWon ? '#fde047' : 'white';
            this.ctx.fillText(this.gameWon ? 'YOU WIN!' : 'GAME OVER', this.canvas.width/2, this.canvas.height/2);
        }
    },
    gameLoop() { if (!this.paused) { this.update(); this.draw(); } this.loop = requestAnimationFrame(this.gameLoop.bind(this)); },
    start() { this.paused = false; if(this.loop) cancelAnimationFrame(this.loop); this.loop = requestAnimationFrame(this.gameLoop.bind(this)); window.safePlay(this.music);},
    stop() { if(this.loop) cancelAnimationFrame(this.loop); this.loop = null; this.paused = true; this.music.pause(); document.body.style.overflow = 'auto';},
    togglePause() { this.paused = !this.paused; if (!this.gameOver && !this.gameWon && !this.paused) this.music.play(); else this.music.pause(); }
};