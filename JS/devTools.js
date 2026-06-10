// ==========================================
// DEV PANEL — Solo para desarrollo
// Activar / desactivar con backtick (`) o F2
// ==========================================

const DEV = {
    active: false,
    invincible: true,      // Sincronizado con player.js (ver instrucciones)
    speedMult: 1.0,        // Multiplicador de dt del game loop
    showHitboxes: false,
};

// --- ESTILOS DEL PANEL ---
const _devCSS = document.createElement('style');
_devCSS.textContent = `
#dev-panel {
    display: none;
    position: fixed;
    top: 10px;
    left: 10px;
    width: 230px;
    background: rgba(10, 10, 20, 0.93);
    border: 1px solid #00ffaa;
    border-radius: 6px;
    color: #e0ffe0;
    font-family: monospace;
    font-size: 12px;
    z-index: 9999;
    user-select: none;
    padding-bottom: 6px;
}
#dev-panel .dev-header {
    background: #00ffaa22;
    border-bottom: 1px solid #00ffaa44;
    padding: 6px 10px;
    font-weight: bold;
    letter-spacing: 1px;
    display: flex;
    justify-content: space-between;
    color: #00ffaa;
}
#dev-panel .dev-close {
    cursor: pointer;
    color: #ff4466;
}
#dev-panel .dev-section {
    padding: 5px 10px 4px;
    border-bottom: 1px solid #ffffff11;
}
#dev-panel .dev-section b {
    display: block;
    font-size: 10px;
    color: #aaffcc;
    letter-spacing: 1px;
    margin-bottom: 4px;
}
#dev-panel button {
    display: inline-block;
    margin: 2px 2px 2px 0;
    padding: 3px 7px;
    background: #112211;
    border: 1px solid #00ffaa55;
    border-radius: 3px;
    color: #ccffcc;
    font-family: monospace;
    font-size: 11px;
    cursor: pointer;
}
#dev-panel button:hover { background: #1a3322; border-color: #00ffaa; }
#dev-panel input[type=range] { width: 130px; vertical-align: middle; }
#dev-stats { color: #88ffbb; line-height: 1.6; font-size: 11px; }
`;
document.head.appendChild(_devCSS);

// --- HTML DEL PANEL ---
function DevTools_init() {
    const panel = document.createElement('div');
    panel.id = 'dev-panel';
    panel.innerHTML = `
        <div class="dev-header">
            🛠 DEV PANEL
            <span class="dev-close" onclick="DevTools_toggle()">✕</span>
        </div>

        <div class="dev-section">
            <b>ESTADO EN VIVO</b>
            <div id="dev-stats">Esperando partida...</div>
        </div>

        <div class="dev-section">
            <b>MODO DIOS</b>
            <button onclick="DevTools_toggleGodMode()">
                INVINCIBLE: <span id="dev-inv">ON</span>
            </button>
        </div>

        <div class="dev-section">
            <b>TIEMPO</b>
            <button onclick="DevTools_skipToBoss()">⏩ Skip al Boss (5:00)</button>
            <button onclick="DevTools_skipToTime(60)">1 min</button>
            <button onclick="DevTools_skipToTime(120)">2 min</button>
            <button onclick="DevTools_resetTime()">⏪ Reset</button>
        </div>

        <div class="dev-section">
            <b>LEVEL UP</b>
            <button onclick="DevTools_forceLevelUp()">⬆ Forzar Level Up</button>
            <button onclick="DevTools_forceLevelUp(5)">⬆×5</button>
        </div>

        <div class="dev-section">
            <b>SPAWN ENEMIGOS (×10)</b>
            <button onclick="DevTools_spawnEnemy(0)">🔴 Crawler</button>
            <button onclick="DevTools_spawnEnemy(1)">🟣 Runner</button>
            <button onclick="DevTools_spawnEnemy(2)">🟣 Tank</button>
            <button onclick="DevTools_spawnEnemy(3)">🟢 Swarmer</button>
            <button onclick="DevTools_nukeEnemies()" style="color:#ff4466; border-color:#ff4466">
                💀 Nuke All
            </button>
        </div>

        <div class="dev-section">
            <b>VELOCIDAD DE JUEGO</b>
            <input type="range" id="dev-speed" min="10" max="500" value="100"
                   oninput="DevTools_setSpeed(this.value)">
            <span id="dev-speed-val">1.0x</span>
        </div>

        <div class="dev-section">
            <b>HITBOXES</b>
            <button onclick="DevTools_toggleHitboxes()">
                HITBOXES: <span id="dev-hb">OFF</span>
            </button>
        </div>

        <div class="dev-section" style="font-size:10px; color:#446644; padding-top:4px;">
            Atajo: backtick (´) o F2
        </div>
    `;
    document.body.appendChild(panel);

    // Actualizar stats cada 200ms
    setInterval(DevTools_updateStats, 200);
}

// --- TOGGLE PANEL ---
function DevTools_toggle() {
    DEV.active = !DEV.active;
    const panel = document.getElementById('dev-panel');
    if (panel) panel.style.display = DEV.active ? 'block' : 'none';
}

// --- STATS EN VIVO ---
function DevTools_updateStats() {
    const el = document.getElementById('dev-stats');
    if (!el || !DEV.active || typeof gameTime === 'undefined') return;

    const mins = Math.floor(gameTime / 60).toString().padStart(2, '0');
    const secs = Math.floor(gameTime % 60).toString().padStart(2, '0');

    let activeEnemies = 0;
    for (let i = 0; i < maxEnemies; i++) if (enemies[i].active) activeEnemies++;

    let activeProj = 0;
    for (let i = 0; i < maxProjectiles; i++) if (projectiles[i].active) activeProj++;

    const bossStatus = isBossFightActive
        ? '⚠️ ACTIVO'
        : bossSpawned ? '✅ MUERTO' : '⏳ PENDIENTE';

    el.innerHTML = `
        ⏱ ${mins}:${secs} &nbsp;|&nbsp; LV ${player.level}<br>
        👾 Enemigos: ${activeEnemies} / ${maxEnemies}<br>
        💥 Proyectiles: ${activeProj}<br>
        ❤️ HP: ${Math.floor(player.hp)} / ${player.maxHp}<br>
        💀 Kills: ${typeof kills !== 'undefined' ? kills : '?'}<br>
        🏁 Boss: ${bossStatus}<br>
        ⚡ Speed: ${DEV.speedMult.toFixed(1)}x
    `;
}

// --- GOD MODE ---
function DevTools_toggleGodMode() {
    DEV.invincible = !DEV.invincible;
    const el = document.getElementById('dev-inv');
    if (el) el.textContent = DEV.invincible ? 'ON' : 'OFF';
    showToast(`God Mode: ${DEV.invincible ? 'ON' : 'OFF'}`);
}

// --- TIEMPO ---
function DevTools_skipToBoss() {
    if (typeof gameTime !== 'undefined') {
        gameTime = 299;
        showToast('⏩ Saltando al Boss...');
    }
}

function DevTools_skipToTime(seconds) {
    if (typeof gameTime !== 'undefined') {
        gameTime = seconds;
        showToast(`⏩ Tiempo: ${seconds}s`);
    }
}

function DevTools_resetTime() {
    if (typeof gameTime === 'undefined') return;
    gameTime = 0;
    if (typeof bossSpawned !== 'undefined') {
        bossSpawned = false;
        boss.active = false;
        isBossFightActive = false;
        SoundManager.playBGM('gameplay');
    }
    showToast('⏪ Tiempo reseteado');
}

// --- LEVEL UP ---
function DevTools_forceLevelUp(times = 1) {
    for (let i = 0; i < times; i++) {
        gainXp(player.maxXp - player.xp + 1);
    }
}

// --- SPAWN ENEMIGOS ---
const _devEnemyDefs = [
    { name: 'Crawler', radius: 12, maxHp: 22, speed: 95, damage: 14, color: [0.95, 0.1, 0.25, 1.0] },
    { name: 'Runner', radius: 9, maxHp: 9, speed: 150, damage: 7, color: [1.0, 0.2, 0.65, 1.0] },
    { name: 'Tank', radius: 17, maxHp: 110, speed: 55, damage: 28, color: [0.65, 0.1, 0.95, 1.0] },
    { name: 'Swarmer', radius: 10.5, maxHp: 35, speed: 120, damage: 11, color: [0.2, 0.9, 0.35, 1.0] },
];

function DevTools_spawnEnemy(type, count = 10) {
    const def = _devEnemyDefs[type];
    if (!def) return;

    let spawned = 0;
    for (let j = 0; j < maxEnemies && spawned < count; j++) {
        const e = enemies[j];
        if (!e.active) {
            const angle = (spawned / count) * Math.PI * 2;
            const r = 220 + Math.random() * 80;
            e.active = true;
            e.x = player.x + Math.cos(angle) * r;
            e.y = player.y + Math.sin(angle) * r;
            e.type = type;
            e.radius = def.radius;
            e.maxHp = def.maxHp;
            e.hp = def.maxHp;
            e.speed = def.speed;
            e.damage = def.damage;
            e.color = [...def.color];
            spawned++;
        }
    }
    showToast(`Spawneados ${spawned}× ${def.name}`);
}

function DevTools_nukeEnemies() {
    let count = 0;
    for (let i = 0; i < maxEnemies; i++) {
        if (enemies[i].active) {
            spawnGem(enemies[i].x, enemies[i].y, enemies[i].maxHp);
            enemies[i].active = false;
            count++;
        }
    }
    if (typeof kills !== 'undefined') kills += count;
    showToast(`💀 Nuke: ${count} enemigos eliminados`);
}

// --- VELOCIDAD DEL JUEGO ---
function DevTools_setSpeed(val) {
    DEV.speedMult = parseFloat(val) / 100;
    const el = document.getElementById('dev-speed-val');
    if (el) el.textContent = DEV.speedMult.toFixed(1) + 'x';
}

// --- HITBOXES ---
function DevTools_toggleHitboxes() {
    DEV.showHitboxes = !DEV.showHitboxes;
    const el = document.getElementById('dev-hb');
    if (el) el.textContent = DEV.showHitboxes ? 'ON' : 'OFF';
}

DevTools_init();
window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.key === 'o') DevTools_toggle();
});