// --- GAME ENTITIES POOLS ---
const player = {
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
    directionY: 0
};

// --- CONTROLES DE ENTRADA (INPUT GESTION) ---
const keys = {};
let touchStartPos = { x: 0, y: 0 };
let isDragging = false;

// Registrar listeners de teclado tras carga del DOM
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

// --- FUNCIONES DEL JUGADOR ---

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
    const isInvincible = true;
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

function checkPlayerDamage(dt) {
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
                    const playerHitRadius = player.width * 0.4; // Ajuste fino del radio de colisión del jugador

                    if (dist < (playerHitRadius + e.radius)) {
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

function shootWeapons() {
    const nearest = findNearestEnemy();
    if (!nearest) return;

    const baseAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    const count = player.projectileCount;

    // Separación en abanico (15 grados aprox. en radianes)
    const spread = 0.25;
    const startAngle = baseAngle - (count - 1) * spread / 2;

    for (let i = 0; i < count; i++) {
        const angle = startAngle + i * spread;
        const tx = player.x + Math.cos(angle) * 100;
        const ty = player.y + Math.sin(angle) * 100;
        spawnProjectile(player.x, player.y, tx, ty);
    }
}

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

function gainXp(amount) {
    player.xp += amount;
    if (player.xp >= player.maxXp) {
        player.xp -= player.maxXp;
        player.level++;
        player.maxXp = Math.floor(player.maxXp * 1.35) + 6;
        levelUp();
    }
}

function levelUp() {
    gameState = 'levelUp';
    showLevelUpModal();
}
