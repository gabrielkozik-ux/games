// --- GLOBÁLNÍ PROMĚNNÉ ---
window.gameInstances = {};
window.activeGame = null;
window.keysPressed = {};
window.isMuted = false;
window.auth = null;
window.db = null;

// --- INICIALIZACE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyBWJAbTCutFX3sU_KLt6XSCvhJ_Vl5trjo",
    authDomain: "retro-herni-arkada.firebaseapp.com",
    projectId: "retro-herni-arkada",
    storageBucket: "retro-herni-arkada.appspot.com",
    messagingSenderId: "15367501595",
    appId: "1:15367501595:web:f8323a29e3c24a6dd985be"
};

firebase.initializeApp(firebaseConfig);
window.auth = firebase.auth();
window.db = firebase.firestore();

// --- UTILITY FUNCTIONS ---

// POMOCNÁ FUNKCE: Výpočet bezpečné výšky pro hru
// Toto řeší problém "uříznuté spodní části"
window.getPlayableHeight = function() {
    // Na mobilu odečteme více místa pro UI prohlížeče a ovládací prvky
    const safeZone = window.innerWidth < 768 ? 140 : 0;
    // Maximální výška by měla korespondovat s CSS (max-height: 80vh u desktopu, ale flexibilní u mobilu)
    // Bereme 100% výšky okna mínus safeZone, ale maximálně 85% výšky (aby zbylo místo nahoře/dole)
    return Math.min(window.innerHeight - safeZone, window.innerHeight * 0.85);
};

window.safePlay = function(audioElement) {
    if (!audioElement) return;
    const playPromise = audioElement.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => console.log("Autoplay blocked:", error));
    }
};

const gameOverSound = document.getElementById('game-over-sound');
const readyFightSound = document.getElementById('ready-fight-sound');
const victorySound = document.getElementById('victory-sound');

window.stopAllMusic = function() {
    if (window.activeGame && window.gameInstances[window.activeGame] && window.gameInstances[window.activeGame].music) {
        window.gameInstances[window.activeGame].music.pause();
        window.gameInstances[window.activeGame].music.currentTime = 0;
    }
};

window.playGameOverSound = function() {
    window.stopAllMusic();
    if(gameOverSound) {
        gameOverSound.currentTime = 0;
        window.safePlay(gameOverSound);
    }
    document.body.style.overflow = 'auto';
    window.saveCurrentScore();
};

window.playVictorySound = function() {
    window.stopAllMusic();
    if(victorySound) {
        victorySound.currentTime = 0;
        window.safePlay(victorySound);
    }
    document.body.style.overflow = 'auto';
    window.saveCurrentScore();
};

window.playCountdown = function(game, callback) {
    const overlay = game.canvas.nextElementSibling;
    let count = 3;
    if(readyFightSound) {
        readyFightSound.currentTime = 0;
        window.safePlay(readyFightSound);
    }
    
    overlay.style.opacity = 1;
    overlay.innerText = count;
    
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            overlay.innerText = count;
        } else if (count === 0) {
            overlay.innerText = "GO!";
        } else {
            clearInterval(interval);
            overlay.style.opacity = 0;
            callback();
        }
    }, 600);
};

// --- FIREBASE LOGIKA ---
window.escapeHtml = function(text) {
    if (!text) return 'Anonym';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

window.displayLeaderboard = async function(gameName) {
    const gameWindow = document.querySelector(`.game-window[data-game="${gameName}"]`);
    if(!gameWindow) return;
    const listElement = gameWindow.querySelector('.leaderboard-list');
    if (!listElement) return;

    const currentUser = window.auth.currentUser;
    listElement.innerHTML = '<li>Načítání...</li>';

    try {
        const querySnapshot = await window.db.collection("scores")
            .where("game", "==", gameName)
            .orderBy("score", "desc")
            .limit(5)
            .get();

        if (querySnapshot.empty) {
            listElement.innerHTML = '<li style="justify-content:center; color:#888;">Zatím žádné skóre.</li>';
            return;
        }

        listElement.innerHTML = '';
        let rank = 1;
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const listItem = document.createElement('li');
            let deleteButtonHTML = '';
            if (currentUser && data.userId === currentUser.uid) {
                deleteButtonHTML = `<button data-id="${doc.id}" class="delete-score-btn text-red-500 font-bold ml-2 hover:text-red-700" title="Smazat">×</button>`;
            }
            let rankIcon = `${rank}.`;
            if (rank === 1) { rankIcon = '🥇'; listItem.style.fontWeight = 'bold'; listItem.style.color = '#fbbf24'; } 
            else if (rank === 2) rankIcon = '🥈';
            else if (rank === 3) rankIcon = '🥉';

            listItem.innerHTML = `<span class="truncate mr-2">${rankIcon} ${window.escapeHtml(data.userName)}</span> <span class="whitespace-nowrap">${data.score}${deleteButtonHTML}</span>`;
            listElement.appendChild(listItem);
            rank++;
        });
    } catch (error) {
        console.error(`Chyba:`, error);
        listElement.innerHTML = '<li>Chyba načítání.</li>';
    }
};

window.saveCurrentScore = function() {
    const user = window.auth.currentUser;
    if (user && window.activeGame) {
        const gameName = window.activeGame;
        let scoreToSave = 0;
        if (gameName === 'pong') scoreToSave = window.gameInstances[gameName].player.score;
        else scoreToSave = window.gameInstances[gameName].score;

        if (gameName === 'dino' && scoreToSave > 0) scoreToSave = Math.floor(scoreToSave / 5);

        if (scoreToSave > 0) {
            window.db.collection("scores").add({
                userId: user.uid,
                userName: user.displayName,
                game: gameName,
                score: scoreToSave,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => window.displayLeaderboard(gameName));
        }
    }
};

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    const allAudio = document.querySelectorAll('audio');
    const muteButton = document.getElementById('mute-button');
    
    const savedMuteState = localStorage.getItem('isMuted');
    if (savedMuteState === 'true') { 
        window.isMuted = true; 
        allAudio.forEach(audio => audio.muted = true); 
        muteButton.textContent = '🔇'; 
    }
    
    muteButton.addEventListener('click', () => {
        window.isMuted = !window.isMuted;
        allAudio.forEach(audio => audio.muted = window.isMuted);
        muteButton.textContent = window.isMuted ? '🔇' : '🔊';
        localStorage.setItem('isMuted', window.isMuted);
    });

    window.addEventListener('keydown', (e) => { 
        if (window.activeGame && [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
        window.keysPressed[e.key] = true; 
    });
    window.addEventListener('keyup', (e) => { window.keysPressed[e.key] = false; });

    Object.values(window.gameInstances).forEach(game => { if(game.init) game.init(); });

    document.querySelectorAll('.game-window').forEach(win => {
        win.addEventListener('click', (e) => {
            if (e.target.closest('.delete-score-btn') || e.target.closest('.close-btn')) return;

            const gameName = win.dataset.game;
            const game = window.gameInstances[gameName];

            if (gameName === window.activeGame) {
                game.togglePause();
                return;
            }
            
            if (window.activeGame && window.gameInstances[window.activeGame]) {
                window.gameInstances[window.activeGame].stop();
                document.querySelector(`[data-game="${window.activeGame}"]`).classList.remove('active');
            }
            
            document.body.style.overflow = 'hidden';
            window.activeGame = gameName;
            win.classList.add('active');
            
            // --- DŮLEŽITÉ: NASTAVENÍ VELIKOSTI ---
            game.canvas.width = window.innerWidth;
            game.canvas.height = window.getPlayableHeight();
            
            game.reset();
            game.draw();
            
            window.playCountdown(game, () => game.start());
        });
        
        const closeBtn = win.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gameName = win.dataset.game;
                if (window.gameInstances[gameName]) {
                    window.gameInstances[gameName].stop();
                    win.classList.remove('active');
                    window.activeGame = null;
                    document.body.style.overflow = 'auto';
                }
            });
        }
    });

    function simulateKeyEvent(type, key) { window.dispatchEvent(new KeyboardEvent(type, { 'key': key, 'bubbles': true })); }
    const touchControls = { 'btn-left': 'ArrowLeft', 'btn-right': 'ArrowRight', 'btn-up': 'ArrowUp', 'btn-down': 'ArrowDown', 'btn-action': ' ' };
    for (const [btnId, key] of Object.entries(touchControls)) {
        const button = document.getElementById(btnId);
        if (button) {
            button.addEventListener('touchstart', (e) => { e.preventDefault(); simulateKeyEvent('keydown', key); button.style.transform='scale(0.9)'; }, { passive: false });
            button.addEventListener('touchend', (e) => { e.preventDefault(); simulateKeyEvent('keyup', key); button.style.transform='scale(1)'; }, { passive: false });
        }
    }

    // Login / Logout handlers (zkráceno)
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const userNameEl = document.getElementById('user-name');
    if(loginBtn) loginBtn.addEventListener('click', () => window.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()));
    if(logoutBtn) logoutBtn.addEventListener('click', () => window.auth.signOut());

    window.auth.onAuthStateChanged(user => {
        if (user) {
            if(loginBtn) loginBtn.classList.add('hidden');
            userInfo.classList.remove('hidden');
            userNameEl.textContent = user.displayName;
            document.querySelectorAll('.leaderboard').forEach(lb => lb.style.display = 'block');
            Object.keys(window.gameInstances).forEach(window.displayLeaderboard);
        } else {
            if(loginBtn) loginBtn.classList.remove('hidden');
            userInfo.classList.add('hidden');
            document.querySelectorAll('.leaderboard').forEach(lb => lb.style.display = 'none');
        }
    });

    // Mazání
    document.querySelector('main').addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-score-btn')) {
            e.stopPropagation();
            if (confirm("Smazat?")) {
                try {
                    await window.db.collection('scores').doc(e.target.dataset.id).delete();
                    window.displayLeaderboard(e.target.closest('.game-window').dataset.game);
                } catch (error) { console.error(error); }
            }
        }
    });
    
    // Resize handler s opravou
    window.addEventListener('resize', () => {
        if (window.activeGame && window.gameInstances[window.activeGame]) {
            const game = window.gameInstances[window.activeGame];
            game.canvas.width = window.innerWidth;
            game.canvas.height = window.getPlayableHeight();
            game.draw();
        }
    });

    setTimeout(() => Object.keys(window.gameInstances).forEach(window.displayLeaderboard), 1000);
});