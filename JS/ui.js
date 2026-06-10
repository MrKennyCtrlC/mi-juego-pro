// ==========================================
// SISTEMA DE INTERFAZ DE USUARIO (UI)
// ==========================================

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
        document.getElementById('enemy-display').textContent = `Enemigos: ${activeEnemyCount}`;

        // FPS
        if (fps !== undefined) {
            document.getElementById('fps-display').textContent = `FPS: ${fps}`;
        }
    }
};

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

function showLevelUpModal() {
    const container = document.getElementById('upgrade-options');
    container.innerHTML = '';

    // Seleccionar 3 mejoras aleatorias únicas del pool (usando el helper de RNG)
    const choices = RNG.getRandomUpgrades(upgrades, 3);

    choices.forEach(upg => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `
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

function resumeGame() {
    document.getElementById('ui-overlay').classList.add('hidden');

    const xpPercent = Math.min(100, (player.xp / player.maxXp) * 100);
    document.getElementById('xp-bar').style.width = `${xpPercent}%`;
    document.getElementById('level-display').textContent = `LV ${player.level}`;

    gameState = 'playing';
}

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

function goToMainMenu() {
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
}

function saveGameHistory() {
    const minutes = Math.floor(gameTime / 60);
    const seconds = Math.floor(gameTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    let history = [];
    try { history = JSON.parse(localStorage.getItem('neon_survivors_history') || '[]'); } catch (e) { }
    history.unshift({ time: timeStr, level: player.level, kills });
    if (history.length > 8) history = history.slice(0, 8); // Guardar solo las últimas 8
    localStorage.setItem('neon_survivors_history', JSON.stringify(history));
}

function gameOver() {
    SoundManager.stopBGM();
    saveGameHistory();
    gameState = 'gameOver';
    document.getElementById('game-over-screen').classList.remove('hidden');

    const minutes = Math.floor(gameTime / 60);
    const seconds = Math.floor(gameTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    document.getElementById('survival-time').textContent = `Sobrevivido: ${timeStr}`;
    document.getElementById('enemies-killed').textContent = `Bajas: ${kills}`;
}

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
});
