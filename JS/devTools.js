// ==========================================
// DEV PANEL — Solo para desarrollo (ACTUALIZADO)
// Activar / desactivar con backtick (`) o F2 / o
// ==========================================

/**
 * Estado del panel de desarrollo.
 * Controla visibilidad, invencibilidad, velocidad global y hitboxes.
 */
const DEV = {
    active: false,
    invincible: true,      // Sincronizado con player.js
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
    max-height: 90vh; /* Evita que se salga de pantallas chicas */
    overflow-y: auto;  /* Scroll interno si crece mucho */
    background: rgba(10, 10, 20, 0.95);
    border: 1px solid #00ffaa;
    border-radius: 6px;
    color: #e0ffe0;
    font-family: monospace;
    font-size: 12px;
    z-index: 9999;
    user-select: none;
    padding-bottom: 6px;
}
#dev-panel::-webkit-scrollbar { width: 4px; }
#dev-panel::-webkit-scrollbar-thumb { background: #00ffaa44; border-radius: 2px; }

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
    padding: 3px 6px;
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
#dev-stats { color: #88ffbb; line-height: 1.5; font-size: 11px; }
`;
document.head.appendChild(_devCSS);

// --- HTML DEL PANEL ---
/**
 * Crea el panel de depuración en el DOM y registra el refresco periódico.
 * El panel expone atajos y controles para probar sistemas del juego.
 */
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
            <b>PROBAR RELIQUIAS</b>
            <button onclick="DevTools_upgradeRelic('grimorio_alquimia')">📖 Grim</button>
            <button onclick="DevTools_upgradeRelic('fuego_fatuo')">🔥 Fuego</button>
            <button onclick="DevTools_upgradeRelic('estatica_disruptiva')">⚡⚡ Estat</button>
            <br>
            <button onclick="DevTools_upgradeRelic('botas_hermes')">🥾 Herm</button>
            <button onclick="DevTools_upgradeRelic('espejismo')">🧥 Capa</button>
            <button onclick="DevTools_upgradeRelic('vampirismo')">🩸 Vamp</button>
            <button onclick="DevTools_resetRelics()" style="color:#ffaa00; border-color:#ffaa0044; font-size:9px;">🔄 Reset</button>
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
            Atajo: backtick (´) o F2 o O
        </div>
    `;
    document.body.appendChild(panel);

    // Actualizar stats cada 200ms
    setInterval(DevTools_updateStats, 200);
}

// --- TOGGLE PANEL ---
/**
 * Alterna la visibilidad del panel de desarrollo.
 */
function DevTools_toggle() {
    DEV.active = !DEV.active;
    const panel = document.getElementById('dev-panel');
    if (panel) panel.style.display = DEV.active ? 'block' : 'none';
}

// --- STATS EN VIVO (MUESTRA LAS RELIQUIAS AHORA) ---
/**
 * Renderiza estadísticas vivas para depuración.
 * Muestra tiempo, enemigos, proyectiles, vida y reliquias en tiempo real.
 */
function DevTools_updateStats() {
    const el = document.getElementById('dev-stats');
    if (!el || !DEV.active || typeof gameTime === 'undefined') return;

    const mins = Math.floor(gameTime / 60).toString().padStart(2, '0');
    const secs = Math.floor(gameTime % 60).toString().padStart(2, '0');

    let activeEnemies = 0;
    for (let i = 0; i < maxEnemies; i++) if (enemies[i] && enemies[i].active) activeEnemies++;

    let activeProj = 0;
    for (let i = 0; i < maxProjectiles; i++) if (projectiles[i] && projectiles[i].active) activeProj++;

    const bossStatus = isBossFightActive
        ? '⚠️ ACTIVO'
        : bossSpawned ? '✅ MUERTO' : '⏳ PENDIENTE';

    // String seguro para renderizar los niveles de las reliquias en vivo
    let relicsLiveStatus = "Ninguna";
    if (player && player.reliquias) {
        relicsLiveStatus = `<br>💎 <b>Niveles de Build:</b><br>` +
            `🔹 Grm:${player.reliquias.grimorio_alquimia || 0} | Fgo:${player.reliquias.fuego_fatuo || 0} | Est:${player.reliquias.estatica_disruptiva || 0}<br>` +
            `🔹 Hrm:${player.reliquias.botas_hermes || 0} | Esp:${player.reliquias.espejismo || 0} | Vmp:${player.reliquias.vampirismo || 0}`;
    }

    el.innerHTML = `
        ⏱ ${mins}:${secs} &nbsp;|&nbsp; LV ${player.level}<br>
        👾 Enemigos: ${activeEnemies} / ${maxEnemies}<br>
        💥 Proyectiles: ${activeProj}<br>
        ❤️ HP: ${Math.floor(player.hp)} / ${player.maxHp}<br>
        💀 Kills: ${typeof kills !== 'undefined' ? kills : '?'}<br>
        🏁 Boss: ${bossStatus}<br>
        ⚡ Speed: ${DEV.speedMult.toFixed(1)}x
        ${relicsLiveStatus}
    `;
}

// --- SUBIR NIVEL A UNA RELIQUIA DESDE EL PANEL ---
/**
 * Sube manualmente una reliquia desde el panel.
 * `id` identifica qué reliquia se está probando.
 */
function DevTools_upgradeRelic(id) {
    if (!player || !player.reliquias) return;

    // Soporte para ambos nombres de funcion por si acaso
    const funcMejora = typeof aplicarMejoraReliquia === 'function' ? aplicarMejoraReliquia : (typeof subirNivelReliquia === 'function' ? subirNivelReliquia : null);

    if (funcMejora) {
        if ((player.reliquias[id] || 0) < 3) {
            funcMejora(id);
            if (typeof showToast === 'function') showToast(`DevTools: +1 Nivel a ${id}`);
        } else {
            if (typeof showToast === 'function') showToast(`Máximo nivel alcanzado (Nivel 3)`);
        }
    } else {
        console.error("No se encontró la función aplicarMejoraReliquia o subirNivelReliquia en el juego.");
    }
}

// --- RESETEAR TODAS LAS RELIQUIAS A NIVEL 0 ---
/**
 * Reinicia todas las reliquias a nivel cero.
 * También limpia los modificadores mecánicos que dependen de ellas.
 */
function DevTools_resetRelics() {
    if (!player || !player.reliquias) return;
    Object.keys(player.reliquias).forEach(id => {
        player.reliquias[id] = 0;
    });
    // Resetear multiplicadores base de reliquias modificadas mecánicamente
    player.evasionChance = 0;
    player.maxProjectilePierce = 1;
    player.vampChance = 0;
    if (typeof showToast === 'function') showToast(`🔄 Reliquias limpiadas a Nivel 0`);
}

// --- GOD MODE ---
/**
 * Activa o desactiva la invencibilidad de pruebas.
 */
function DevTools_toggleGodMode() {
    DEV.invincible = !DEV.invincible;
    const el = document.getElementById('dev-inv');
    if (el) el.textContent = DEV.invincible ? 'ON' : 'OFF';
    if (typeof showToast === 'function') showToast(`God Mode: ${DEV.invincible ? 'ON' : 'OFF'}`);
}

// --- TIEMPO ---
/**
 * Avanza el reloj hasta la aparición del boss.
 */
function DevTools_skipToBoss() {
    if (typeof gameTime !== 'undefined') {
        gameTime = 299;
        if (typeof showToast === 'function') showToast('⏩ Saltando al Boss...');
    }
}

/**
 * Fija el tiempo de partida a un punto concreto.
 * `seconds` indica el segundo exacto al que saltar.
 */
function DevTools_skipToTime(seconds) {
    if (typeof gameTime !== 'undefined') {
        gameTime = seconds;
        if (typeof showToast === 'function') showToast(`⏩ Tiempo: ${seconds}s`);
    }
}

/**
 * Reinicia el reloj de partida y devuelve el combate al estado inicial.
 */
function DevTools_resetTime() {
    if (typeof gameTime === 'undefined') return;
    gameTime = 0;
    if (typeof bossSpawned !== 'undefined') {
        bossSpawned = false;
        if (typeof boss !== 'undefined') boss.active = false;
        isBossFightActive = false;
        if (typeof SoundManager !== 'undefined') SoundManager.playBGM('gameplay');
    }
    if (typeof showToast === 'function') showToast('⏪ Tiempo reseteado');
}

// --- LEVEL UP ---
/**
 * Fuerza uno o varios aumentos de nivel del jugador.
 * `times` determina cuántas subidas consecutivas se disparan.
 */
function DevTools_forceLevelUp(times = 1) {
    if (typeof gainXp === 'function') {
        for (let i = 0; i < times; i++) {
            gainXp(player.maxXp - player.xp + 1);
        }
    }
}

// --- SPAWN ENEMIGOS ---
const _devEnemyDefs = [
    { name: 'Crawler', radius: 12, maxHp: 22, speed: 95, damage: 14, color: [0.95, 0.1, 0.25, 1.0] },
    { name: 'Runner', radius: 9, maxHp: 9, speed: 150, damage: 7, color: [1.0, 0.2, 0.65, 1.0] },
    { name: 'Tank', radius: 17, maxHp: 110, speed: 55, damage: 28, color: [0.65, 0.1, 0.95, 1.0] },
    { name: 'Swarmer', radius: 10.5, maxHp: 35, speed: 120, damage: 11, color: [0.2, 0.9, 0.35, 1.0] },
];

/**
 * Genera una nube de enemigos de un tipo concreto alrededor del jugador.
 * `type` selecciona la plantilla y `count` define cuántos aparecen.
 */
function DevTools_spawnEnemy(type, count = 10) {
    const def = _devEnemyDefs[type];
    if (!def) return;

    let spawned = 0;
    for (let j = 0; j < maxEnemies && spawned < count; j++) {
        const e = enemies[j];
        if (e && !e.active) {
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
    if (typeof showToast === 'function') showToast(`Spawneados ${spawned}× ${def.name}`);
}

/**
 * Elimina todos los enemigos activos y deja sus drops.
 */
function DevTools_nukeEnemies() {
    let count = 0;
    for (let i = 0; i < maxEnemies; i++) {
        if (enemies[i] && enemies[i].active) {
            if (typeof spawnGem === 'function') spawnGem(enemies[i].x, enemies[i].y, enemies[i].maxHp);
            enemies[i].active = false;
            count++;
        }
    }
    if (typeof kills !== 'undefined') kills += count;
    if (typeof showToast === 'function') showToast(`💀 Nuke: ${count} enemigos eliminados`);
}

// --- VELOCIDAD DEL JUEGO ---
/**
 * Ajusta el multiplicador global de velocidad del juego.
 * `val` viene del slider del panel y se convierte a escala multiplicativa.
 */
function DevTools_setSpeed(val) {
    DEV.speedMult = parseFloat(val) / 100;
    const el = document.getElementById('dev-speed-val');
    if (el) el.textContent = DEV.speedMult.toFixed(1) + 'x';
}

// --- HITBOXES ---
/**
 * Activa o desactiva la visualización de hitboxes de depuración.
 */
function DevTools_toggleHitboxes() {
    DEV.showHitboxes = !DEV.showHitboxes;
    const el = document.getElementById('dev-hb');
    if (el) el.textContent = DEV.showHitboxes ? 'ON' : 'OFF';
}

// Inicialización automática
DevTools_init();
window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.key === 'o' || e.key === 'F2') DevTools_toggle();
});
