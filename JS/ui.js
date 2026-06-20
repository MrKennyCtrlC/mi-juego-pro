// ==========================================
// MEJORAS PERMANENTES (META-PROGRESIÓN)
// ==========================================

/**
 * Diccionario de mejoras permanentes con su estado actual.
 * Se persiste en localStorage bajo "game_permanent_upgrades".
 * `window.permanentUpgrades` lo expone para que startGame() pueda leerlo.
 */
window.permanentUpgrades = (() => {
    const DEFAULTS = {
        dano_global: {
            nombre: '\ud83d\udca5 Da\u00f1o Global',
            nivel: 0,
            maxNivel: 5,
            costoBase: 100,
            multiplicadorCosto: 1.5,
            beneficioPorNivel: 0.05   // +5% da\u00f1o por nivel
        },
        hp_inicial: {
            nombre: '\u2764\ufe0f Vida Inicial',
            nivel: 0,
            maxNivel: 5,
            costoBase: 150,
            multiplicadorCosto: 1.4,
            beneficioPorNivel: 10     // +10 HP por nivel
        }
    };

    try {
        const saved = JSON.parse(localStorage.getItem('game_permanent_upgrades'));
        if (saved) {
            // Fusionar niveles guardados sobre los defaults (seguro ante claves nuevas)
            Object.keys(DEFAULTS).forEach(k => {
                if (saved[k] !== undefined) DEFAULTS[k].nivel = saved[k].nivel || 0;
            });
        }
    } catch (_) { /* primera vez o JSON corrupto: usar defaults */ }

    return DEFAULTS;
})();

// ==========================================
// SISTEMA DE INTERFAZ DE USUARIO (UI)
// ==========================================

const RELIQUIAS_BASE = {
    // --- OFENSIVAS ---
    grimorio_alquimia: {
        nombre: "Grimorio de Alquimia",
        tipo: "ofensiva",
        sprite: "ITEM_GRIMORIO_ALQUIMIA",
        descripcion: ["+1 Perforación de proyectil", "+2 Perforación de proyectil", "+3 Perforación de proyectil"]
    },
    fuego_fatuo: {
        nombre: "Poción de Fuego Fatuo",
        tipo: "ofensiva",
        sprite: "ITEM_FUEGO_FATUO",
        descripcion: ["Deja un rastro de fuego al caminar", "Mayor duración del fuego", "Mayor daño y área de fuego"]
    },
    estatica_disruptiva: {
        nombre: "Estática Disruptiva",
        tipo: "ofensiva",
        sprite: "ITEM_ESTATICA_DISRUPTIVA",
        descripcion: ["Pulso eléctrico cercano periódico", "Más radio y daño de choque", "Menor cooldown de descarga"]
    },

    // --- DEFENSIVAS ---
    botas_hermes: {
        nombre: "Botas de Hermes",
        tipo: "defensiva",
        sprite: "ITEM_BOTAS_HERMES",
        descripcion: ["+15% Velocidad de movimiento", "+30% Velocidad de movimiento", "+45% Velocidad de movimiento"]
    },
    espejismo: {
        nombre: "Capa del Espejismo",
        tipo: "defensiva",
        sprite: "ITEM_ESPEJISMO",
        descripcion: ["10% Probabilidad de esquivar (MISS)", "20% Probabilidad de esquivar (MISS)", "30% Probabilidad de esquivar (MISS)"]
    },
    vampirismo: {
        nombre: "Amuleto de Vampirismo",
        tipo: "defensiva",
        sprite: "ITEM_VAMPIRISMO",
        descripcion: ["5% Probabilidad de recuperar 1 HP al matar", "7% Probabilidad de recuperar 1 HP al matar", "10% Probabilidad de recuperar 1 HP al matar"]
    }
};

/**
 * Fachada de interfaz para el HUD principal.
 * Centraliza timer, vida, XP, nivel, enemigos y FPS.
 */
const UI = {
    // Actualización de textos y barras del HUD
    updateHUD(gameTime, playerHp, playerMaxHp, playerXp, playerMaxXp, playerLevel, activeEnemyCount, fps) {
        // Timer
        const minutes = Math.floor(gameTime / 60);
        const seconds = Math.floor(gameTime % 60);
        document.getElementById('timer-display').textContent =
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // HP
        const hpPercent = Math.max(0, (playerHp / playerMaxHp) * 100);
        document.getElementById('hp-bar').style.width = `${hpPercent}%`;
        document.getElementById('hp-text').textContent = `${Math.ceil(playerHp)} / ${playerMaxHp}`;

        // XP
        const xpPercent = Math.max(0, Math.min(100, (playerXp / playerMaxXp) * 100));
        document.getElementById('xp-bar').style.width = `${xpPercent}%`;
        document.getElementById('level-display').textContent = `LV ${playerLevel}`;

        // Enemigos
        if (activeEnemyCount !== undefined) {
            document.getElementById('enemy-display').textContent = `Enemigos: ${activeEnemyCount}`;
        }

        updateGoldHUD();

        // FPS
        if (fps !== undefined) {
            document.getElementById('fps-display').textContent = `FPS: ${fps}`;
        }
    }
};

/**
 * Refresca el contador de oro de la sesión en pantalla.
 */
function updateGoldHUD() {
    const goldDisplay = document.getElementById('gold-display');
    if (!goldDisplay) return;

    goldDisplay.textContent = `Oro: ${game.sessionGold || 0}`;
}

/**
 * Guarda el oro de la última sesión en almacenamiento local.
 */
function saveLastSessionGold(amount) {
    localStorage.setItem("game_last_session_gold", Math.max(0, amount || 0));
}

/**
 * Muestra el oro de la sesión anterior en el menú principal.
 */
function renderLastSessionGold() {
    const lastSessionGold = document.getElementById('last-session-gold');
    if (!lastSessionGold) return;

    const gold = parseInt(localStorage.getItem("game_last_session_gold")) || 0;
    lastSessionGold.textContent = `Ultima sesion: ${gold} oro`;
    lastSessionGold.classList.remove('hidden');
}

/**
 * Muestra una notificación temporal flotante en la UI.
 */
function showToast(message) {
    const toast = document.getElementById('notification-toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.style.opacity = '1';

    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        window.toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 500);
    }, 2500);
}

// Diccionario de iconos temáticos por ID de reliquia
const relicIcons = {
    grimorio_alquimia: '📖',
    fuego_fatuo: '🔥',
    estatica_disruptiva: '⚡',
    botas_hermes: '🥾',
    espejismo: '🧥',
    vampirismo: '🩸'
};

/**
 * Abre el modal de nivel-up con 3 opciones aleatorias del pool disponible.
 */
function showLevelUpModal() {
    const container = document.getElementById('upgrade-options');
    container.innerHTML = '';

    // Seleccionar 3 mejoras aleatorias únicas del pool (usando el helper de RNG)
    const poolDisponible = obtenerPoolCompletoMejoras();
    const choices = rng.getRandomUpgrades(poolDisponible, 3);

    choices.forEach(upg => {
        const card = document.createElement('div');
        card.className = 'upgrade-card' + (upg.isRelic ? ' upgrade-card--relic' : '');

        // Mostrar icono si es una reliquia
        const iconHtml = upg.isRelic && relicIcons[upg.id]
            ? `<div class="relic-pixel-icon">${relicIcons[upg.id]}</div>`
            : '';

        card.innerHTML = `
            ${iconHtml}
            <h3>${upg.name}</h3>
            <p>${upg.desc}</p>
        `;
        card.onclick = () => {
            upg.action();
            resumeGame();
        };
        container.appendChild(card);
    });

    document.getElementById('ui-overlay').classList.remove('hidden');
}

/**
 * Cierra el overlay de mejora y devuelve el estado a `playing`.
 */
function resumeGame() {
    document.getElementById('ui-overlay').classList.add('hidden');

    const xpPercent = Math.min(100, (player.xp / player.maxXp) * 100);
    document.getElementById('xp-bar').style.width = `${xpPercent}%`;
    document.getElementById('level-display').textContent = `LV ${player.level}`;

    gameState = 'playing';
}

/**
 * Alterna la pausa del juego y sincroniza el estado de audio.
 */
function togglePause() {
    isGamePaused = !isGamePaused;
    const pauseMenu = document.getElementById('pause-menu');
    if (isGamePaused) {
        pauseMenu.classList.remove('hidden');
        // Sincronizar sliders del pauseMenu con los valores actuales
        syncPauseSliders();
        if (AudioEngine.ctx && AudioEngine.ctx.state === 'running') AudioEngine.ctx.suspend();
    } else {
        pauseMenu.classList.add('hidden');
        if (AudioEngine.ctx && AudioEngine.ctx.state === 'suspended') AudioEngine.ctx.resume();
    }
}

/**
 * Consolida oro, limpia pools y vuelve al menú principal.
 */
function goToMainMenu() {
    if (game.sessionGold > 0) {
        saveLastSessionGold(game.sessionGold);
        player.totalGold += game.sessionGold;
        localStorage.setItem("game_total_gold", player.totalGold);
        game.sessionGold = 0;
        updateGoldHUD();
    }

    // Limpiar todos los pools activos
    resetPools();
    // Detener música
    SoundManager.stopBGM();
    // Actualizar FSM
    isMainMenuActive = true;
    isGamePaused = false;
    gameState = 'start';
    // Mostrar menú principal, ocultar otros overlays
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('float-pause-btn').classList.add('hidden');
    // Refrescar tabla de estadísticas
    renderStatsTable();
    renderLastSessionGold();
}

/**
 * Guarda un resumen compacto de la partida en el historial local.
 */
function saveGameHistory() {
    const minutes = Math.floor(gameTime / 60);
    const seconds = Math.floor(gameTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    let history = [];
    try { history = JSON.parse(localStorage.getItem('neon_survivors_history') || '[]'); } catch (e) { }
    history.unshift({ time: timeStr, level: player.level, kills, gold: game.sessionGold });
    if (history.length > 8) history = history.slice(0, 8); // Guardar solo las últimas 8
    localStorage.setItem('neon_survivors_history', JSON.stringify(history));
}

/**
 * Ejecuta la pantalla de fin de partida y consolida la progresión.
 */
function gameOver() {
    SoundManager.stopBGM();
    saveGameHistory();
    saveLastSessionGold(game.sessionGold);

    const minutes = Math.floor(gameTime / 60);
    const seconds = Math.floor(gameTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Consolidar y guardar oro persistente
    player.totalGold += game.sessionGold;
    localStorage.setItem("game_total_gold", player.totalGold);

    gameState = 'gameOver';
    document.getElementById('game-over-screen').classList.remove('hidden');

    document.getElementById('survival-time').textContent = `Sobrevivido: ${timeStr}`;
    document.getElementById('enemies-killed').textContent = `Bajas: ${kills}`;

    // Actualizar textos de UI
    document.getElementById('gold-earned').textContent = `Oro Juntado: +${game.sessionGold}`;
    document.getElementById('gold-total').textContent = `Oro Total: ${player.totalGold}`;

    // Reiniciar oro de sesión para la siguiente partida
    game.sessionGold = 0;
    updateGoldHUD();
    renderLastSessionGold();
}

/**
 * Renderiza la tabla de partidas registradas en localStorage.
 */
function renderStatsTable() {
    const container = document.getElementById('stats-container');
    let history = [];
    try { history = JSON.parse(localStorage.getItem('neon_survivors_history') || '[]'); } catch (e) { }

    if (history.length === 0) {
        container.innerHTML = '<p class="stats-empty">Aún no tienes partidas registradas.<br>¡Comienza tu primera batalla!</p>';
        return;
    }

    const rows = history.map((entry, i) => `
        <tr>
            <td>#${i + 1}</td>
            <td>${entry.time}</td>
            <td>Nv. ${entry.level}</td>
            <td>${entry.kills} bajas</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Duración</th>
                    <th>Nivel</th>
                    <th>Enemigos</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

/**
 * Aplica el valor de un slider al sistema de audio correspondiente.
 */
function applyVolumeFromSlider(sliderId, type) {
    const slider = document.getElementById(sliderId);
    if (!slider) return;

    const val = parseFloat(slider.value) / 100;

    if (type === 'master') {
        SoundManager.setMasterVolume(val);
    } else if (type === 'music') {
        SoundManager.setMusicVolume(val);
    } else if (type === 'sfx') {
        // Mantiene el sonido de las balas usando el AudioEngine
        if (typeof AudioEngine !== 'undefined' && AudioEngine.setSfxVolume) {
            AudioEngine.setSfxVolume(val);
        }
    }
}

/**
 * Copia los valores de volumen entre el menú principal y el de pausa.
 */
function syncPauseSliders() {
    const masterVol = document.getElementById('master-vol');
    const pMasterVol = document.getElementById('p-master-vol');
    if (masterVol && pMasterVol) pMasterVol.value = masterVol.value;

    const musicVol = document.getElementById('music-vol');
    const pMusicVol = document.getElementById('p-music-vol');
    if (musicVol && pMusicVol) pMusicVol.value = musicVol.value;

    const sfxVol = document.getElementById('sfx-vol');
    const pSfxVol = document.getElementById('p-sfx-vol');
    if (sfxVol && pSfxVol) pSfxVol.value = sfxVol.value;
}

// ==========================================
// REGISTRO DE EVENTOS UI Y SLIDERS
// ==========================================

// Asegurar enlace tras el DOM listo
document.addEventListener('DOMContentLoaded', () => {
    // Botones de inicio y reinicio
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', startGame);
    document.getElementById('start-game-btn').addEventListener('click', startGame);

    // Botón flotante de pausa
    document.getElementById('float-pause-btn').addEventListener('click', togglePause);

    // Botón REANUDAR en pause menu
    document.getElementById('resume-btn').addEventListener('click', () => {
        if (isGamePaused) togglePause();
    });

    // Botón SALIR AL MENÚ PRINCIPAL
    document.getElementById('quit-to-menu-btn').addEventListener('click', () => {
        SoundManager.stopBGM();
        goToMainMenu();
    });

    // --- Sliders del Main Menu ---
    document.getElementById('master-vol').addEventListener('input', function () {
        document.getElementById('master-vol-val').textContent = this.value + '%';
        applyVolumeFromSlider('master-vol', 'master');
        // Sincronizar pause menu
        const pMaster = document.getElementById('p-master-vol');
        const pMasterVal = document.getElementById('p-master-vol-val');
        if (pMaster) pMaster.value = this.value;
        if (pMasterVal) pMasterVal.textContent = this.value + '%';
    });

    document.getElementById('music-vol').addEventListener('input', function () {
        document.getElementById('music-vol-val').textContent = this.value + '%';
        applyVolumeFromSlider('music-vol', 'music');
        // Sincronizar pause menu
        const pMusic = document.getElementById('p-music-vol');
        const pMusicVal = document.getElementById('p-music-vol-val');
        if (pMusic) pMusic.value = this.value;
        if (pMusicVal) pMusicVal.textContent = this.value + '%';
    });

    document.getElementById('sfx-vol').addEventListener('input', function () {
        document.getElementById('sfx-vol-val').textContent = this.value + '%';
        applyVolumeFromSlider('sfx-vol', 'sfx');
        // Sincronizar pause menu
        const pSfx = document.getElementById('p-sfx-vol');
        const pSfxVal = document.getElementById('p-sfx-vol-val');
        if (pSfx) pSfx.value = this.value;
        if (pSfxVal) pSfxVal.textContent = this.value + '%';
    });

    // --- Sliders del Pause Menu ---
    document.getElementById('p-master-vol').addEventListener('input', function () {
        document.getElementById('p-master-vol-val').textContent = this.value + '%';
        applyVolumeFromSlider('p-master-vol', 'master');
        // Sincronizar main menu
        const master = document.getElementById('master-vol');
        const masterVal = document.getElementById('master-vol-val');
        if (master) master.value = this.value;
        if (masterVal) masterVal.textContent = this.value + '%';

        if (typeof SoundManager !== 'undefined') {
            SoundManager.setMasterVolume(parseFloat(this.value) / 100);
        }
    });

    document.getElementById('p-music-vol').addEventListener('input', function () {
        document.getElementById('p-music-vol-val').textContent = this.value + '%';
        applyVolumeFromSlider('p-music-vol', 'music');
        // Sincronizar main menu
        const music = document.getElementById('music-vol');
        const musicVal = document.getElementById('music-vol-val');
        if (music) music.value = this.value;
        if (musicVal) musicVal.textContent = this.value + '%';

        if (typeof SoundManager !== 'undefined') {
            SoundManager.setMusicVolume(parseFloat(this.value) / 100);
        }
    });

    document.getElementById('p-sfx-vol').addEventListener('input', function () {
        document.getElementById('p-sfx-vol-val').textContent = this.value + '%';
        applyVolumeFromSlider('p-sfx-vol', 'sfx');
        // Sincronizar main menu
        const sfx = document.getElementById('sfx-vol');
        const sfxVal = document.getElementById('sfx-vol-val');
        if (sfx) sfx.value = this.value;
        if (sfxVal) sfxVal.textContent = this.value + '%';
    });

    // Cargar estadísticas iniciales
    renderStatsTable();
    renderLastSessionGold();
    updateGoldHUD();

    // --- Tienda de Mejoras ---
    document.getElementById('open-shop-btn').addEventListener('click', openShop);
    document.getElementById('shop-back-btn').addEventListener('click', closeShop);
});

// ==========================================
// TIENDA DE MEJORAS PERMANENTES
// ==========================================

/**
 * Calcula el costo actual de una mejora seg\u00fan su nivel.
 */
function calcShopCost(upg) {
    return Math.floor(upg.costoBase * Math.pow(upg.multiplicadorCosto, upg.nivel));
}

/**
 * Persiste el estado de mejoras permanentes y el oro del jugador en localStorage.
 */
function saveShopState() {
    const snapshot = {};
    Object.keys(window.permanentUpgrades).forEach(k => {
        snapshot[k] = { nivel: window.permanentUpgrades[k].nivel };
    });
    localStorage.setItem('game_permanent_upgrades', JSON.stringify(snapshot));
    localStorage.setItem('game_total_gold', player.totalGold);
}

/**
 * Renderiza las tarjetas de mejora dentro del panel de la tienda.
 * Se llama al abrir la tienda y tras cada compra.
 */
function renderShopCards() {
    const container = document.getElementById('shop-cards-container');
    const goldText  = document.getElementById('shop-gold-text');
    goldText.textContent = `\ud83e\ude99 Tesoro disponible: ${player.totalGold} oro`;

    container.innerHTML = Object.entries(window.permanentUpgrades).map(([id, upg]) => {
        const isMax    = upg.nivel >= upg.maxNivel;
        const costo    = isMax ? '\u2014' : calcShopCost(upg);
        const canAfford = !isMax && player.totalGold >= calcShopCost(upg);

        // Descripci\u00f3n del beneficio actual acumulado
        let bonusDesc;
        if (id === 'dano_global') {
            const pct = (upg.nivel * upg.beneficioPorNivel * 100).toFixed(0);
            bonusDesc = upg.nivel === 0
                ? 'Sin mejoras a\u00fan'
                : `Da\u00f1o +${pct}% acumulado`;
        } else {
            const hp = upg.nivel * upg.beneficioPorNivel;
            bonusDesc = upg.nivel === 0
                ? 'Sin mejoras a\u00fan'
                : `+${hp} HP m\u00e1x acumulados`;
        }

        let btnClass = 'shop-buy-btn';
        let btnText;
        let btnDisabled;
        if (isMax) {
            btnClass += ' is-maxed';
            btnText   = 'M\u00c1XIMO';
            btnDisabled = 'disabled';
        } else if (!canAfford) {
            btnClass += ' no-gold';
            btnText   = `Comprar (${costo} \ud83e\ude99)`;
            btnDisabled = 'disabled';
        } else {
            btnText   = `Comprar (${costo} \ud83e\ude99)`;
            btnDisabled = '';
        }

        return `
        <div class="shop-card">
            <div class="shop-card-header">
                <span class="shop-card-name">${upg.nombre}</span>
                <span class="shop-card-level">Nivel ${upg.nivel} / ${upg.maxNivel}</span>
            </div>
            <p class="shop-card-desc">
                ${bonusDesc}<br>
                <em>Pr\u00f3xima mejora: +${id === 'dano_global'
                    ? (upg.beneficioPorNivel * 100) + '% da\u00f1o'
                    : upg.beneficioPorNivel + ' HP m\u00e1x'
                }</em>
            </p>
            <button class="${btnClass}" ${btnDisabled}
                    onclick="purchaseUpgrade('${id}')">${btnText}</button>
        </div>`;
    }).join('');
}

/**
 * Intenta comprar una mejora permanente.
 * Valida oro, actualiza estado, persiste y refresca la UI.
 */
function purchaseUpgrade(id) {
    const upg  = window.permanentUpgrades[id];
    if (!upg || upg.nivel >= upg.maxNivel) return;

    const costo = calcShopCost(upg);
    if (player.totalGold < costo) {
        showToast('\ud83e\ude99 \u00a1Oro insuficiente!');
        return;
    }

    // Transacci\u00f3n
    player.totalGold -= costo;
    upg.nivel++;

    // Persistencia inmediata
    saveShopState();
    updateGoldHUD();
    renderShopCards();

    showToast(`\u2728 \u00a1${upg.nombre} mejorado a Nivel ${upg.nivel}!`);
}

/**
 * Abre el panel de la tienda y oculta el men\u00fa principal.
 */
function openShop() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('shop-overlay').classList.remove('hidden');
    renderShopCards();
}

/**
 * Cierra la tienda y vuelve al men\u00fa principal.
 */
function closeShop() {
    document.getElementById('shop-overlay').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    renderStatsTable();
    renderLastSessionGold();
}

let faseSeleccion = "ofensiva"; // Puede ser "ofensiva" o "defensiva"

function mostrarMenuReliquiasInicial() {
    // 1. Congelar el juego inmediatamente
    isPaused = true;

    const screen = document.getElementById("relic-selection-screen");
    const title = document.getElementById("relic-title");
    const container = document.getElementById("relic-options-container");

    // Limpiar opciones anteriores
    container.innerHTML = "";
    screen.classList.remove("hidden");

    title.innerText = faseSeleccion === "ofensiva" ? "ELIGE UNA RELIQUIA OFENSIVA" : "ELIGE UNA RELIQUIA DEFENSIVA";

    // Filtrar reliquias según la fase actual
    Object.keys(RELIQUIAS_BASE).forEach(id => {
        const reliquia = RELIQUIAS_BASE[id];
        if (reliquia.tipo === faseSeleccion) {

            // Icono temático
            const icon = relicIcons[id] || '📦';

            // Crear la tarjeta interactiva
            const card = document.createElement("div");
            card.className = "relic-card";
            card.innerHTML = `
                <div class="relic-pixel-icon">${icon}</div>
                <h3>${reliquia.nombre}</h3>
                <p>${reliquia.descripcion[0]}</p>
            `;

            // Evento al hacer clic en la reliquia
            card.onclick = () => equiparReliquiaInicial(id);
            container.appendChild(card);
        }
    });
}

function equiparReliquiaInicial(id) {
    // Subir a nivel 1 en el inventario del jugador
    player.reliquias[id] = 1;

    // Aplicar efectos mecánicos inmediatos si los tienen
    if (id === "botas_hermes") player.speedMultiplier += 0.15;
    if (id === "espejismo") player.evasionChance = 0.10;
    if (id === "grimorio_alquimia") player.maxProjectilePierce = 2; // Pasa de atravesar 1 a atravesar 2

    if (faseSeleccion === "ofensiva") {
        // Pasar a la siguiente fase
        faseSeleccion = "defensiva";
        mostrarMenuReliquiasInicial();
    } else {
        // Terminar selección, cerrar menú y arrancar el juego
        document.getElementById("relic-selection-screen").classList.add("hidden");
        isPaused = false;
    }
}
