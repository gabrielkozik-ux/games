// --- GLOBÁLNÍ PROMĚNNÉ ---
// Definujeme je zde, aby byly dostupné pro ostatní skripty
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

// --- UTILITY FUNCTIONS (Pomocné funkce) ---

// Bezpečné přehrávání zvuku
window.safePlay = function(audioElement) {
    if (!audioElement) return;
    const playPromise = audioElement.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log("Autoplay blocked or error:", error);
        });
    }
};

// Zvukové efekty
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

// --- FIREBASE LOGIKA (Skóre a Leaderboard) ---
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
            if (rank === 1) {
                rankIcon = '🥇';
                listItem.style.fontWeight = 'bold';
                listItem.style.color = '#fbbf24'; 
            } else if (rank === 2) rankIcon = '🥈';
            else if (rank === 3) rankIcon = '🥉';

            listItem.innerHTML = `<span class="truncate mr-2">${rankIcon} ${window.escapeHtml(data.userName)}</span> <span class="whitespace-nowrap">${data.score}${deleteButtonHTML}</span>`;
            listElement.appendChild(listItem);
            rank++;
        });
    } catch (error) {
        console.error(`Chyba při načítání žebříčku pro ${gameName}:`, error);
        listElement.innerHTML = '<li>Chyba načítání dat.</li>';
    }
};

window.saveCurrentScore = function() {
    const user = window.auth.currentUser;
    if (user && window.activeGame) {
        const gameName = window.activeGame;
        let scoreToSave = 0;

        if (gameName === 'pong') {
            scoreToSave = window.gameInstances[gameName].player.score;
        } else {
            scoreToSave = window.gameInstances[gameName].score;
        }

        // Specialita pro Dino Run (dělení skóre)
        if (gameName === 'dino' && scoreToSave > 0) {
            scoreToSave = Math.floor(scoreToSave / 5);
        }

        if (scoreToSave > 0) {
            window.db.collection("scores").add({
                userId: user.uid,
                userName: user.displayName,
                game: gameName,
                score: scoreToSave,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                console.log("Skóre uloženo.");
                window.displayLeaderboard(gameName);
            })
            .catch((error) => console.error("Chyba ukládání:", error));
        }
    }
};

// --- HLAVNÍ EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    const allAudio = document.querySelectorAll('audio');
    const muteButton = document.getElementById('mute-button');
    
    // Mute logika
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

    // Klávesnice
    window.addEventListener('keydown', (e) => { 
        if (window.activeGame && [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }
        window.keysPressed[e.key] = true; 
    });
    window.addEventListener('keyup', (e) => { window.keysPressed[e.key] = false; });

    // Inicializace her
    Object.values(window.gameInstances).forEach(game => {
        if(game.init) game.init();
    });

    // Kliknutí na herní okno (Spuštění hry)
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
            
            game.canvas.width = window.innerWidth;
            game.canvas.height = window.innerHeight;
            game.reset();
            game.draw();
            
            window.playCountdown(game, () => game.start());
        });
        
        // Tlačítko Zavřít
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

    // Mobilní ovládání
    function simulateKeyEvent(type, key) { window.dispatchEvent(new KeyboardEvent(type, { 'key': key, 'bubbles': true })); }
    const touchControls = { 'btn-left': 'ArrowLeft', 'btn-right': 'ArrowRight', 'btn-up': 'ArrowUp', 'btn-down': 'ArrowDown', 'btn-action': ' ' };
    for (const [btnId, key] of Object.entries(touchControls)) {
        const button = document.getElementById(btnId);
        if (button) {
            button.addEventListener('touchstart', (e) => { e.preventDefault(); simulateKeyEvent('keydown', key); button.style.transform='scale(0.9)'; }, { passive: false });
            button.addEventListener('touchend', (e) => { e.preventDefault(); simulateKeyEvent('keyup', key); button.style.transform='scale(1)'; }, { passive: false });
        }
    }

    // Firebase Auth UI
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const userNameEl = document.getElementById('user-name');

    if(loginBtn) {
        loginBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            window.auth.signInWithPopup(provider).catch(e => console.error("Login error:", e));
        });
    }
    if(logoutBtn) logoutBtn.addEventListener('click', () => window.auth.signOut());

    window.auth.onAuthStateChanged(user => {
        const leaderboards = document.querySelectorAll('.leaderboard');
        if (user) {
            if(loginBtn) loginBtn.classList.add('hidden');
            userInfo.classList.remove('hidden');
            userNameEl.textContent = user.displayName;
            leaderboards.forEach(lb => lb.style.display = 'block');
            Object.keys(window.gameInstances).forEach(window.displayLeaderboard);
        } else {
            if(loginBtn) loginBtn.classList.remove('hidden');
            userInfo.classList.add('hidden');
            leaderboards.forEach(lb => lb.style.display = 'none');
        }
    });

    // Mazání skóre
    document.querySelector('main').addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-score-btn')) {
            e.stopPropagation();
            const scoreId = e.target.dataset.id;
            const gameName = e.target.closest('.game-window').dataset.game;
            if (confirm("Opravdu chceš smazat tento záznam?")) {
                try {
                    await window.db.collection('scores').doc(scoreId).delete();
                    window.displayLeaderboard(gameName);
                } catch (error) { console.error("Error:", error); alert("Chyba mazání."); }
            }
        }
    });
    
    // Resize handler
    window.addEventListener('resize', () => {
        if (window.activeGame && window.gameInstances[window.activeGame]) {
            const game = window.gameInstances[window.activeGame];
            game.canvas.width = window.innerWidth;
            game.canvas.height = window.innerHeight;
            game.draw();
        }
    });

    // První načtení žebříčků
    setTimeout(() => Object.keys(window.gameInstances).forEach(window.displayLeaderboard), 1000);
});