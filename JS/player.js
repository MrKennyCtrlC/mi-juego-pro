// --- INICIALIZACIÓN GLOBAL DE MONEDAS ---
/**
 * Estado global de monedas de la sesión actual.
 * `sessionGold` se consolida al terminar una partida o volver al menú.
 */
const game = { sessionGold: 0 };

// --- GAME ENTITIES POOLS ---
/**
 * Estado principal del jugador.
 * Define vida, experiencia, movimiento, disparo y reliquias activas.
 */
const player = {
    totalGold: parseInt(localStorage.getItem("game_total_gold")) || 0,
    x: 0,
    y: 0,
    width: 26,
    height: 26,
    speed: 160,
    hp: 100,
    maxHp: 100,
    xp: 0,
    maxXp: 10,
    level: 1,
    color: [0.0, 0.9, 1.0, 1.0], // Neon blue
    damageMultiplier: 1.0,
    attackCooldownMultiplier: 1.0,
    speedMultiplier: 1.0,
    magnetRadius: 90,
    projectileSpeed: 380,
    projectileSize: 7,
    projectileDamage: 20,
    projectileCount: 1,
    regenRate: 0,
    attackTimer: 0,
    attackInterval: 0.8,
    directionX: 0,
    directionY: 0,
    reliquias: {
        grimorio_alquimia: 0,
        fuego_fatuo: 0,
        estatica_disruptiva: 0,
        botas_hermes: 0,
        espejismo: 0,
        vampirismo: 0
    },
    evasionChance: 0,
    maxProjectilePierce: 1,
    supremeMagnetTriggered: false
};

// --- CONTROLES DE ENTRADA (INPUT GESTION) ---
/**
 * Entradas temporales del jugador.
 * `keys` guarda teclado, `touchStartPos` marca el joystick táctil
 * e `isDragging` indica si el control móvil está siendo arrastrado.
 */
const keys = {};
let touchStartPos = { x: 0, y: 0 };
let isDragging = false;

// Registrar listeners de teclado tras carga del DOM
/**
 * Registra los controles de teclado y táctil cuando el DOM ya está listo.
 * Este bloque conecta el input con la lógica de pausa y movimiento.
 */
document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        // Tecla de pausa: Esc o P
        if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && !isMainMenuActive) {
            if (gameState === 'playing' || isGamePaused) {
                togglePause();
            }
        }
    });
    window.addEventListener('keyup', (e) => { keys[e.key] = false; });

    // Joystick Virtual
    const joystickContainer = document.getElementById('joystick-container');
    const joystickKnob = document.getElementById('joystick-knob');

    window.addEventListener('touchstart', (e) => {
        if (gameState !== 'playing' || isMainMenuActive || isGamePaused) return;
        if (e.target.closest('#hud') || e.target.closest('.modal') || e.target.closest('.pixel-btn')) return;

        const touch = e.touches[0];
        touchStartPos = { x: touch.clientX, y: touch.clientY };
        isDragging = true;

        joystickContainer.style.left = `${touchStartPos.x}px`;
        joystickContainer.style.top = `${touchStartPos.y}px`;
        joystickContainer.classList.remove('hidden');
        joystickKnob.style.transform = 'translate(-50%, -50%)';
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const touch = e.touches[0];
        const dx = touch.clientX - touchStartPos.x;
        const dy = touch.clientY - touchStartPos.y;
        const dist = Math.hypot(dx, dy);
        const maxDist = 45;

        if (dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            const clampedDist = Math.min(dist, maxDist);

            joystickKnob.style.transform = `translate(calc(-50% + ${nx * clampedDist}px), calc(-50% + ${ny * clampedDist}px))`;

            // En el juego: Arriba es Y positivo, Abajo es Y negativo
            player.directionX = nx;
            player.directionY = -ny;
        }
    }, { passive: false });

    window.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        joystickContainer.classList.add('hidden');
        player.directionX = 0;
        player.directionY = 0;
    });
});

// --- POOL DE PROYECTILES ---
/**
 * Pool fijo de proyectiles reutilizables.
 * Evita crear nuevos objetos en cada disparo y estabiliza el rendimiento.
 */
const projectiles = Array.from({ length: maxProjectiles }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 0,
    damage: 0,
    color: [0, 0, 0, 0],
    life: 0
}));

// --- MEJORAS DEL JUGADOR (UPGRADES DATA) ---
/**
 * Mejoras base disponibles en el sistema de nivel-up.
 * Cada entrada modifica una estadística concreta del jugador.
 */
const upgrades = [
    {
        id: 'damage',
        name: '🔥 Sobrecarga de Daño',
        desc: '+25% Daño de Proyectil',
        action: () => { player.damageMultiplier += 0.25; }
    },
    {
        id: 'speed',
        name: '⚡ Impulso Cinético',
        desc: '+15% Velocidad de Movimiento',
        action: () => { player.speedMultiplier += 0.15; }
    },
    {
        id: 'cooldown',
        name: '⏱️ Cargador Rápido',
        desc: '+20% Frecuencia de Disparo (Cooldown -20%)',
        action: () => { player.attackCooldownMultiplier *= 0.8; }
    },
    {
        id: 'magnet',
        name: '🧲 Campo Gravitacional',
        desc: '+30% Radio del Imán y +1px Tamaño de Bala',
        action: () => { player.magnetRadius += 28; player.projectileSize += 1; }
    },
    {
        id: 'regen',
        name: '💚 Nano-Regeneración',
        desc: 'Cura 50% HP, +20 HP Máx y Regenera +1 HP/s',
        action: () => {
            player.maxHp += 20;
            player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.50);
            player.regenRate += 1.0;
        }
    },
    {
        id: 'multishot',
        name: '🌀 Disparo Múltiple',
        desc: '+1 Proyectil por ráfaga de disparo',
        action: () => { player.projectileCount += 1; }
    }
];

// Genera una lista unificada de mejoras comunes + reliquias elegibles
/**
 * Combina mejoras base con reliquias que aún pueden subir de nivel.
 * El resultado alimenta la selección de opciones al subir de nivel.
 */
function obtenerPoolCompletoMejoras() {
    // 1. Empezamos con las mejoras básicas fijas de siempre
    let poolCompleto = [...upgrades];

    // 2. Revisamos las 6 reliquias para ver cuáles pueden subir de nivel
    Object.keys(RELIQUIAS_BASE).forEach(id => {
        const nivelActual = player.reliquias[id] || 0;

        // Si la reliquia aún no llega al Nivel Máximo (Nivel 3), puede aparecer en la tómbola
        if (nivelActual < 3) {
            const reliquiaData = RELIQUIAS_BASE[id];
            const proximoNivel = nivelActual + 1;

            poolCompleto.push({
                id: id,
                isRelic: true, // Bandera por si quieres ponerle un marco especial en la UI
                name: `💎 ${reliquiaData.nombre} (Nivel ${proximoNivel})`,
                desc: reliquiaData.descripcion[nivelActual], // El texto exacto del siguiente nivel
                action: () => { aplicarMejoraReliquia(id); } // Ejecuta su escalado lógico
            });
        }
    });

    return poolCompleto;
}

/**
 * Sube una reliquia de nivel y aplica su efecto mecánico inmediato.
 * `id` identifica la reliquia dentro del inventario del jugador.
 */
function aplicarMejoraReliquia(id) {
    player.reliquias[id]++; // Incrementa el nivel en tu inventario (0 -> 1 -> 2 -> 3)
    const nivel = player.reliquias[id];

    // ESCALADO DE ESTADÍSTICAS SEGÚN TU DISEÑO:
    switch (id) {
        case 'botas_hermes':
            player.speedMultiplier += 0.15; // +15%, +30%, +45% total
            break;

        case 'espejismo':
            if (nivel === 1) player.evasionChance = 0.10;
            if (nivel === 2) player.evasionChance = 0.20;
            if (nivel === 3) player.evasionChance = 0.30;
            break;

        case 'grimorio_alquimia':
            if (nivel === 1) player.maxProjectilePierce = 2; // Atraviesa 1 extra
            if (nivel === 2) player.maxProjectilePierce = 3;
            if (nivel === 3) player.maxProjectilePierce = 4;
            break;

        case 'vampirismo':
            // Las probabilidades (5%, 7%, 10%) las leerá tu función de matar enemigos
            if (nivel === 1) player.vampChance = 0.05;
            if (nivel === 2) player.vampChance = 0.07;
            if (nivel === 3) player.vampChance = 0.10;
            break;

        case 'fuego_fatuo':
        case 'estatica_disruptiva':
            // El motor leerá directamente el entero 'player.reliquias[id]' 
            // en sus respectivos bucles para aumentar daño/radio/duración.
            break;
    }
}

// --- FUNCIONES DEL JUGADOR ---

/**
 * Actualiza movimiento, regeneración y ataque automático del jugador.
 * `dt` es el delta time en segundos usado para un movimiento independiente de FPS.
 */
function updatePlayer(dt) {
    // 1. Leer entradas de movimiento (Teclado)
    let dx = 0;
    let dy = 0;
    if (keys['w'] || keys['W'] || keys['ArrowUp']) dy += 1;
    if (keys['s'] || keys['S'] || keys['ArrowDown']) dy -= 1;
    if (keys['a'] || keys['A'] || keys['ArrowLeft']) dx -= 1;
    if (keys['d'] || keys['D'] || keys['ArrowRight']) dx += 1;

    // Si no hay entrada por joystick activo, aplicar teclado
    if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        player.directionX = dx / len;
        player.directionY = dy / len;
    } else if (!isDragging) {
        player.directionX = 0;
        player.directionY = 0;
    }

    // 2. Mover jugador
    const currentSpeed = player.speed * player.speedMultiplier;
    player.x += player.directionX * currentSpeed * dt;
    player.y += player.directionY * currentSpeed * dt;

    // --- CONTROL DE INVENCIBILIDAD (MODO DIOS) ---
    // Cambia "true" a "false" si quieres desactivar la invencibilidad (modo normal)
    const isInvincible = (typeof DEV !== 'undefined') ? DEV.invincible : false;
    if (isInvincible) {
        player.hp = player.maxHp;
    } else if (player.regenRate > 0) {
        player.hp = Math.min(player.maxHp, player.hp + player.regenRate * dt);
    }

    // 3. Sistema de ataque automático
    player.attackTimer += dt;
    const attackIntervalWithMods = player.attackInterval * player.attackCooldownMultiplier;
    if (player.attackTimer >= attackIntervalWithMods) {
        player.attackTimer = 0;
        shootWeapons();
    }
}

// Cooldown para el toast de evasión (evita spam)
/**
 * Temporizador anti-spam para el aviso visual de evasión.
 * Evita mostrar toasts repetidos cuando Espejismo activa varias esquivas.
 */
let _evasionToastCooldown = 0;

/**
 * Calcula daño por contacto usando la grilla espacial de enemigos.
 * `dt` ajusta el daño continuo y mantiene la simulación estable.
 */
function checkPlayerDamage(dt) {
    if (_evasionToastCooldown > 0) _evasionToastCooldown -= dt;

    const pCx = Math.floor(player.x / CELL_SIZE);
    const pCy = Math.floor(player.y / CELL_SIZE);

    for (let ny = pCy - 1; ny <= pCy + 1; ny++) {
        for (let nx = pCx - 1; nx <= pCx + 1; nx++) {
            const hash = Math.abs((nx * 73856093) ^ (ny * 19349663)) % NUM_BUCKETS;
            let nIdx = bucketHeaders[hash];
            while (nIdx !== -1) {
                const e = enemies[nIdx];
                if (e.active && e.gridCx === nx && e.gridCy === ny) {
                    const dx = e.x - player.x;
                    const dy = e.y - player.y;
                    const dist = Math.hypot(dx, dy);
                    const playerHitRadius = player.width * 0.4;

                    if (dist < (playerHitRadius + e.radius)) {
                        // 🧥 ESPEJISMO: Tirada de evasión por contacto
                        if (player.evasionChance > 0 && Math.random() < player.evasionChance) {
                            if (_evasionToastCooldown <= 0) {
                                if (typeof showToast === 'function') showToast("💨 ¡EVADIDO!");
                                _evasionToastCooldown = 1.5; // Mínimo 1.5s entre toasts
                            }
                            nIdx = entityNext[nIdx];
                            continue;
                        }

                        player.hp -= e.damage * dt;
                        if (player.hp <= 0) {
                            player.hp = 0;
                            gameOver();
                        }
                    }
                }
                nIdx = entityNext[nIdx];
            }
        }
    }
}

/**
 * Busca el enemigo activo más cercano al jugador.
 * La función alimenta el auto-aim del sistema de disparo.
 */
function findNearestEnemy() {
    let nearestDistSq = Infinity;
    let nearestIdx = -1;

    for (let i = 0; i < maxEnemies; i++) {
        const e = enemies[i];
        if (e.active) {
            const dx = e.x - player.x;
            const dy = e.y - player.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearestIdx = i;
            }
        }
    }

    return nearestIdx !== -1 ? enemies[nearestIdx] : null;
}

/**
 * Dispara proyectiles hacia el objetivo prioritario.
 * En boss fight prioriza amenazas cercanas; fuera de eso apunta al enemigo más próximo.
 */
function shootWeapons() {
    let target = null;

    if (typeof isBossFightActive !== 'undefined' && isBossFightActive && boss.active) {
        // Buscar esbirro a menos de 80px (peligro inmediato)
        let dangerMinion = null;
        let closestDist = 80;
        for (let i = 0; i < maxEnemies; i++) {
            const e = enemies[i];
            if (!e.active) continue;
            const dist = Math.hypot(e.x - player.x, e.y - player.y);
            if (dist < closestDist) {
                closestDist = dist;
                dangerMinion = e;
            }
        }
        // Esbirro en zona de peligro → defensa, si no → boss
        target = dangerMinion ?? boss;
    } else {
        target = findNearestEnemy();
    }

    if (!target) return;

    const baseAngle = Math.atan2(target.y - player.y, target.x - player.x);
    const count = player.projectileCount;
    const spread = 0.25;
    const startAngle = baseAngle - (count - 1) * spread / 2;

    for (let i = 0; i < count; i++) {
        const angle = startAngle + i * spread;
        spawnProjectile(player.x, player.y,
            player.x + Math.cos(angle) * 100,
            player.y + Math.sin(angle) * 100);
    }
}

/**
 * Activa un proyectil libre del pool y le asigna trayectoria y daño.
 * Los parámetros definen el origen y la dirección del disparo.
 */
function spawnProjectile(startX, startY, targetX, targetY) {
    for (let i = 0; i < maxProjectiles; i++) {
        const p = projectiles[i];
        if (!p.active) {
            p.active = true;
            p.x = startX;
            p.y = startY;

            const dx = targetX - startX;
            const dy = targetY - startY;
            const len = Math.hypot(dx, dy);

            if (len > 0) {
                p.vx = (dx / len) * player.projectileSpeed;
                p.vy = (dy / len) * player.projectileSpeed;
            } else {
                p.vx = player.projectileSpeed;
                p.vy = 0;
            }

            p.radius = player.projectileSize;
            p.damage = player.projectileDamage * player.damageMultiplier;
            p.color = [1.0, 0.85, 0.2, 1.0]; // Glowing gold
            AudioEngine.playSFX("shoot");
            p.life = 2.0; // segundos de vida máxima
            break;
        }
    }
}

/**
 * Suma experiencia y gestiona el salto de nivel.
 * `amount` representa la XP obtenida por gemas, drops o eventos del motor.
 */
function gainXp(amount) {
    player.xp += amount;
    if (player.xp >= player.maxXp) {
        player.xp -= player.maxXp;
        player.level++;
        player.maxXp = Math.floor(player.maxXp * 1.35) + 6;

        // RECOMPENSA MID-GAME: IMÁN SUPREMO AL NIVEL 15
        if (player.level >= 15 && !player.supremeMagnetTriggered) {
            player.supremeMagnetTriggered = true;
            if (typeof showToast === 'function') {
                showToast("🧲 ¡RECOMPENSA DE NIVEL 15: IMÁN SUPREMO! 🧲");
            }

            // Activar onda visual expansiva del Imán Supremo
            if (typeof magnetEffect !== 'undefined') {
                magnetEffect.active = true;
                magnetEffect.radius = 0;
                magnetEffect.timer = 0;
            }

            // Ejecuta la atracción masiva inmediata de todas las gemas activas en el mapa
            if (typeof gems !== 'undefined') {
                gems.forEach(gem => {
                    if (gem.active) {
                        gem.magnetizing = true; // Activa la física de imán nativa del juego para cada gema
                        gem.magnetSpeed = (gem.magnetSpeed || 160) * 2; // Aumentar velocidad de atracción
                    }
                });
            }
        }

        levelUp();
    }
}

/**
 * Cambia el estado del juego a `levelUp` para abrir la selección de mejoras.
 * Bloquea el flujo normal hasta que el jugador elige una opción.
 */
function levelUp() {
    gameState = 'levelUp';
    showLevelUpModal();
}
