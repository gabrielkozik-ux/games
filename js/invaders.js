window.gameInstances.invaders = {
    canvas: document.getElementById('invaders-canvas'), 
    music: document.getElementById('invaders-music'), 
    ctx: null, player: {}, bullets: [], invaders: [], invaderBullets: [], invaderDirection: 1, invaderSpeed: 0.5, score: 0, lives: 3, paused: false, gameOver: false, loop: null, lastShotTime: 0, shootCooldown: 300,
    init() { this.ctx = this.canvas.getContext('2d'); },
    reset() {
        this.player = { x: this.canvas.width / 2 - 25, y: this.canvas.height - 40, width: 50, height: 20, speed: 5 };
        this.bullets = []; this.invaderBullets = []; this.createInvaders(); this.score = 0; this.lives = 3; this.gameOver = false; this.music.currentTime = 0;
    },
    createInvaders() {
        this.invaders = []; const rows = 5; const cols = 10;
        // ZMENA: Menší invaders (děleno 35) a větší mezery
        const invaderWidth = this.canvas.width / 35; 
        const invaderHeight = invaderWidth * 0.8;
        // ZMENA: Větší padding (stejný jako šířka invadera)
        const invaderPadding = invaderWidth; 
        
        const totalRowWidth = cols * (invaderWidth + invaderPadding) - invaderPadding;
        const startX = (this.canvas.width - totalRowWidth) / 2; 
        const startY = 30;
        
        for (let r = 0; r < rows; r++) { 
            for (let c = 0; c < cols; c++) { 
                this.invaders.push({ 
                    x: startX + c * (invaderWidth + invaderPadding), 
                    y: startY + r * (invaderHeight + invaderPadding), 
                    width: invaderWidth, 
                    height: invaderHeight 
                }); 
            } 
        }
    },
    update() {
        if (this.paused || this.gameOver) return;
        if (window.keysPressed['ArrowLeft'] && this.player.x > 0) this.player.x -= this.player.speed;
        if (window.keysPressed['ArrowRight'] && this.player.x + this.player.width < this.canvas.width) this.player.x += this.player.speed;
        if (window.keysPressed[' '] && Date.now() - this.lastShotTime > this.shootCooldown) {
            this.bullets.push({ x: this.player.x + this.player.width / 2 - 2.5, y: this.player.y, width: 5, height: 10, dy: -7 });
            this.lastShotTime = Date.now();
        }
        this.bullets.forEach((b, i) => { b.y += b.dy; if (b.y < 0) this.bullets.splice(i, 1); });
        this.invaderBullets.forEach((b, i) => { b.y += b.dy; if(b.y > this.canvas.height) this.invaderBullets.splice(i,1); 
            if(b.x > this.player.x && b.x < this.player.x+this.player.width && b.y > this.player.y && b.y < this.player.y+this.player.height) {
                this.invaderBullets.splice(i,1); this.lives--; if(this.lives<=0){this.gameOver=true;window.playGameOverSound();}
            }
        });
        let edgeReached = false;
        this.invaders.forEach(inv => { inv.x += this.invaderSpeed * this.invaderDirection; if (inv.x <= 0 || inv.x + inv.width >= this.canvas.width) edgeReached = true; if (inv.y + inv.height > this.player.y) { this.gameOver = true; window.playGameOverSound(); } });
        if (edgeReached) { this.invaderDirection *= -1; this.invaders.forEach(inv => inv.y += 20); }
        if (Math.random() < 0.02 && this.invaders.length > 0) { const s = this.invaders[Math.floor(Math.random()*this.invaders.length)]; this.invaderBullets.push({ x: s.x+s.width/2, y: s.y+s.height, width: 3, height: 7, dy: 4 }); }
        this.bullets.forEach((b,bi) => { this.invaders.forEach((inv,ii) => { if(b.x > inv.x && b.x < inv.x+inv.width && b.y > inv.y && b.y < inv.y+inv.height) { this.invaders.splice(ii,1); this.bullets.splice(bi,1); this.score+=10; } }); });
        if (this.invaders.length === 0) { this.createInvaders(); this.invaderSpeed += 0.2; }
    },
    draw() {
        this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#0f0'; this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        this.ctx.fillStyle = '#fff'; this.bullets.forEach(b => this.ctx.fillRect(b.x, b.y, b.width, b.height));
        this.ctx.fillStyle = '#f00'; this.invaderBullets.forEach(b => this.ctx.fillRect(b.x, b.y, b.width, b.height));
        this.ctx.fillStyle = '#ddd'; this.invaders.forEach(inv => this.ctx.fillRect(inv.x, inv.y, inv.width, inv.height));
        this.ctx.fillStyle = '#fff'; this.ctx.font = '20px "Press Start 2P"';
        this.ctx.textAlign = 'left'; this.ctx.fillText(`Score: ${this.score}`, 10, 25);
        this.ctx.textAlign = 'right'; this.ctx.fillText(`Lives: ${this.lives}`, this.canvas.width - 10, 25);
        if (this.gameOver) { this.ctx.fillStyle = 'rgba(255,0,0,0.6)'; this.ctx.fillRect(0,0,this.canvas.width, this.canvas.height); this.ctx.fillStyle = 'white'; this.ctx.textAlign = 'center'; this.ctx.fillText('GAME OVER', this.canvas.width/2, this.canvas.height/2); }
    },
    gameLoop() { if (!this.paused) { this.update(); this.draw(); } this.loop = requestAnimationFrame(this.gameLoop.bind(this)); },
    start() { this.paused = false; if(this.loop) cancelAnimationFrame(this.loop); this.loop = requestAnimationFrame(this.gameLoop.bind(this)); window.safePlay(this.music); },
    stop() { if(this.loop) cancelAnimationFrame(this.loop); this.loop = null; this.paused = true; this.music.pause(); document.body.style.overflow = 'auto';},
    togglePause() { this.paused = !this.paused; if(!this.gameOver && !this.paused) this.music.play(); else this.music.pause(); }
};