// ==========================================
// SISTEMA DE ENEMIGOS, PROYECTILES Y COLISIONES
// ==========================================

// --- GAME ENTITIES POOLS ---
const enemies = Array.from({ length: maxEnemies }, () => ({
    active: false,
    x: 0,
    y: 0,
    radius: 0,
    hp: 0,
    maxHp: 0,
    speed: 0,
    damage: 0,
    color: [0, 0, 0, 0],
    gridCx: 0,
    gridCy: 0,
    type: 0
}));

const gems = Array.from({ length: maxGems }, () => ({
    active: false,
    x: 0,
    y: 0,
    xpValue: 0,
    radius: 5,
    color: [0, 0, 0, 0],
    magnetizing: false,
    magnetSpeed: 0
}));

const particles = Array.from({ length: maxParticles }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 0,
    color: [0, 0, 0, 0],
    life: 0,
    maxLife: 0
}));

// ==========================================
// SISTEMA DE POPUPS FLOTANTES DE DAÑO
// ==========================================

window.damagePopups = [];

window.spawnDamagePopup = function(x, y, text, color = '#ff4444') {
    window.damagePopups.push({
        x: x,
        y: y - 10,    // Mundo: ligeramente arriba del impacto
        text: text,
        color: color,
        alpha: 1.0,
        vy: 45        // Velocidad de subida en unidades de mundo por segundo
    });
};

// updateAndRenderDamagePopups se llama desde el pipeline de render de index.html
// con coordenadas de pantalla ya convertidas.
window.updateAndRenderDamagePopups = function(ctx, dt, scaleX, scaleY, halfW, halfH, camX, camY) {
    for (let i = window.damagePopups.length - 1; i >= 0; i--) {
        const p = window.damagePopups[i];
        p.y += p.vy * dt;    // Sube en espacio-mundo
        p.alpha -= dt * 1.8;

        if (p.alpha <= 0) {
            window.damagePopups.splice(i, 1);
            continue;
        }

        // Convertir mundo → pantalla
        const screenX = (p.x - camX) * scaleX + halfW;
        const screenY = halfH - (p.y - camY) * scaleY;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.font = "bold 13px 'Courier New', monospace";
        ctx.textAlign = 'center';
        // Sombra para legibilidad sobre fondo oscuro
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 3;
        ctx.fillText(p.text, screenX, screenY);
        ctx.restore();
    }
};

// ==========================================
// RELIQUIAS PASIVAS (Fuego Fatuo + Estática)
// ==========================================

let _timerFuegoFatuo = 0;
let _timerEstatica = 0;

// Resetear timers al iniciar nueva partida
window._resetRelicTimers = function() {
    _timerFuegoFatuo = 0;
    _timerEstatica = 0;
    window.damagePopups = [];
};

window.actualizarReliquiasPasivas = function(dt) {
    if (typeof isPaused !== 'undefined' && isPaused) return;
    if (!player || !player.reliquias) return;

    // --- 🔥 FUEGO FATUO ---
    if (player.reliquias.fuego_fatuo > 0) {
        _timerFuegoFatuo += dt;
        const cooldown = 2.0;
        if (_timerFuegoFatuo >= cooldown) {
            _timerFuegoFatuo = 0;

            // Buscar enemigo más cercano
            let closestEnemy = null;
            let minDist = Infinity;
            for (let i = 0; i < maxEnemies; i++) {
                const e = enemies[i];
                if (e && e.active) {
                    const d = Math.hypot(e.x - player.x, e.y - player.y);
                    if (d < minDist) { minDist = d; closestEnemy = e; }
                }
            }

            if (closestEnemy) {
                const angle = Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x);
                const dmg = player.reliquias.fuego_fatuo * 15;

                // Reutilizar pool de proyectiles con parámetros de fuego
                for (let i = 0; i < maxProjectiles; i++) {
                    const p = projectiles[i];
                    if (!p.active) {
                        p.active = true;
                        p.x = player.x;
                        p.y = player.y;
                        p.vx = Math.cos(angle) * 280;
                        p.vy = Math.sin(angle) * 280;
                        p.radius = 6;
                        p.damage = dmg;
                        p.color = [1.0, 0.4, 0.0, 1.0]; // Naranja fuego
                        p.life = 2.5;
                        p.pierce = undefined; // Respetar pierce del jugador
                        break;
                    }
                }

                window.spawnDamagePopup(closestEnemy.x, closestEnemy.y, `\uD83D\uDD25-${dmg}`, '#ff6600');
            }
        }
    }

    // --- ⚡ ESTÁTICA DISRUPTIVA ---
    if (player.reliquias.estatica_disruptiva > 0) {
        _timerEstatica += dt;
        const cooldown = 3.0;
        if (_timerEstatica >= cooldown) {
            _timerEstatica = 0;

            const radioAoe = 120 + (player.reliquias.estatica_disruptiva * 30);
            const danoEstatica = player.reliquias.estatica_disruptiva * 25;
            let golpeados = false;

            for (let i = 0; i < maxEnemies; i++) {
                const e = enemies[i];
                if (e && e.active) {
                    const d = Math.hypot(e.x - player.x, e.y - player.y);
                    if (d < radioAoe) {
                        e.hp -= danoEstatica;
                        window.spawnDamagePopup(e.x, e.y, `⚡-${danoEstatica}`, '#00ffff');
                        spawnDamageParticles(e.x, e.y, [0.2, 0.9, 1.0, 1.0]);

                        if (e.hp <= 0) {
                            e.active = false;
                            kills++;
                            spawnGem(e.x, e.y, e.maxHp);
                        }
                        golpeados = true;
                    }
                }
            }

            if (golpeados && typeof showToast === 'function') {
                showToast('⚡ ¡DESCARGA ELÉCTRICA!');
            }
        }
    }
};


// --- SPATIAL HASH GRID ---
const bucketHeaders = new Int32Array(NUM_BUCKETS);
const entityNext = new Int32Array(maxEnemies);

// --- ESTADOS DE OLEADAS ---
let enemySpawnTimer = 0;
let enemySpawnInterval = 0.5;

// --- FUNCIONES DE SPANWNING ---

function spawnEnemy() {
    if (isBossFightActive) return;
    for (let i = 0; i < maxEnemies; i++) {
        const e = enemies[i];
        if (!e.active) {
            e.active = true;

            // Spawnear en un círculo justo fuera del campo visible
            const angle = Math.random() * Math.PI * 2;
            const spawnRadius = Math.max(viewWidth, viewHeight) * 0.5 + 40;
            e.x = player.x + Math.cos(angle) * spawnRadius;
            e.y = player.y + Math.sin(angle) * spawnRadius;

            const stage = Math.floor(gameTime / 30);
            const statScale = 1.0 + stage * 0.18; // Escala stats 18% por stage

            // Selección de tipo de enemigo
            let type = 0;
            const r = Math.random();
            if (stage === 0) {
                type = r < 0.85 ? 1 : 0; // Crawler o Runner
            } else if (stage === 1) {
                type = r < 0.5 ? 1 : (r < 0.85 ? 0 : 3); // Más Swarmer
            } else if (stage === 2) {
                type = r < 0.4 ? 1 : (r < 0.75 ? 0 : (r < 0.92 ? 3 : 2)); // Intro Tank
            } else {
                type = Math.floor(Math.random() * 4);
            }

            e.type = type;

            if (type === 0) {
                // Crawler: Mediano, vida media, color rojo
                e.radius = 12;
                e.maxHp = 22 * statScale;
                e.speed = 95 * (1.0 + stage * 0.03);
                e.damage = 14 * statScale;
                e.color = [0.95, 0.1, 0.25, 1.0];
            } else if (type === 1) {
                // Runner: Pequeño, muy veloz, rosa
                e.radius = 9;
                e.maxHp = 9 * statScale;
                e.speed = 150 * (1.0 + stage * 0.04);
                e.damage = 7 * statScale;
                e.color = [1.0, 0.2, 0.65, 1.0];
            } else if (type === 2) {
                // Tank: Grande, lento, mucha vida, morado
                e.radius = 17;
                e.maxHp = 110 * statScale;
                e.speed = 55 * (1.0 + stage * 0.02);
                e.damage = 28 * statScale;
                e.color = [0.65, 0.1, 0.95, 1.0];
            } else {
                // Swarmer: Mediano, veloz, verde
                e.radius = 10.5;
                e.maxHp = 35 * statScale;
                e.speed = 120 * (1.0 + stage * 0.035);
                e.damage = 11 * statScale;
                e.color = [0.2, 0.9, 0.35, 1.0];
            }

            e.hp = e.maxHp;
            break;
        }
    }
}

function spawnRingOfEnemies(centerX, centerY) {
    const numEnemiesInRing = 16;
    const spawnRadius = 450;

    const stage = Math.floor(gameTime / 30);
    const statScale = 1.0 + stage * 0.18;

    for (let i = 0; i < numEnemiesInRing; i++) {
        const angle = (i / numEnemiesInRing) * Math.PI * 2;
        const spawnX = centerX + Math.cos(angle) * spawnRadius;
        const spawnY = centerY + Math.sin(angle) * spawnRadius;

        for (let j = 0; j < maxEnemies; j++) {
            const e = enemies[j];
            if (!e.active) {
                e.active = true;
                e.x = spawnX;
                e.y = spawnY;
                e.type = 3;

                // Propiedades físicas idénticas a Swarmer
                e.radius = 10.5;
                e.maxHp = 35 * statScale;
                e.hp = e.maxHp;
                e.speed = 120 * (1.0 + stage * 0.035);
                e.damage = 11 * statScale;
                e.color = [0.2, 0.9, 0.35, 1.0];
                break;
            }
        }
    }
}

// --- ACTUALIZACIONES DE LOGICA DE ENEMIGOS ---

function updateEnemies(dt) {
    bucketHeaders.fill(-1);
    let activeEnemyCount = 0;
    const maxDistCheck = Math.max(viewWidth, viewHeight) * 1.1;

    // 1. Re-inicializar cuadrícula y contar enemigos
    for (let i = 0; i < maxEnemies; i++) {
        const e = enemies[i];
        if (e.active) {
            activeEnemyCount++;

            // Teleportar enemigos lejanos detrás del jugador
            const dPx = e.x - player.x;
            const dPy = e.y - player.y;
            const distSq = dPx * dPx + dPy * dPy;

            if (distSq > maxDistCheck * maxDistCheck) {
                const angle = RNG.randomAngle();
                const spawnRadius = Math.max(viewWidth, viewHeight) * 0.5 + 40;
                e.x = player.x + Math.cos(angle) * spawnRadius;
                e.y = player.y + Math.sin(angle) * spawnRadius;
            }

            // Calcular celda
            const cx = Math.floor(e.x / CELL_SIZE);
            const cy = Math.floor(e.y / CELL_SIZE);
            e.gridCx = cx;
            e.gridCy = cy;

            // Insertar en hash grid
            const hash = Math.abs((cx * 73856093) ^ (cy * 19349663)) % NUM_BUCKETS;
            entityNext[i] = bucketHeaders[hash];
            bucketHeaders[hash] = i;
        }
    }

    // Actualizar HUD
    document.getElementById('enemy-display').textContent = `Enemigos: ${activeEnemyCount}`;

    // 2. Spawnear enemigos comunes periódicamente
    if (!isBossFightActive) {
        enemySpawnTimer += dt;
        if (enemySpawnTimer >= enemySpawnInterval && activeEnemyCount < maxEnemies) {
            enemySpawnTimer = 0;
            spawnEnemy();
        }
    }

    // 3. Movimiento y separación (flocking)
    for (let i = 0; i < maxEnemies; i++) {
        const e = enemies[i];
        if (e.active) {
            // Persecución hacia el jugador
            const dx = player.x - e.x;
            const dy = player.y - e.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 0) {
                e.x += (dx / dist) * e.speed * dt;
                e.y += (dy / dist) * e.speed * dt;
            }

            // Separación usando Spatial Hash Grid
            const cx = e.gridCx;
            const cy = e.gridCy;

            for (let ny = cy - 1; ny <= cy + 1; ny++) {
                for (let nx = cx - 1; nx <= cx + 1; nx++) {
                    const hash = Math.abs((nx * 73856093) ^ (ny * 19349663)) % NUM_BUCKETS;
                    let nIdx = bucketHeaders[hash];
                    while (nIdx !== -1) {
                        if (nIdx !== i) {
                            const other = enemies[nIdx];
                            if (other.active && other.gridCx === nx && other.gridCy === ny) {
                                const sepX = other.x - e.x;
                                const sepY = other.y - e.y;
                                const sepDist = Math.hypot(sepX, sepY);
                                const minDist = e.radius + other.radius;

                                if (sepDist < minDist) {
                                    const overlap = minDist - sepDist;
                                    const pushX = (sepX / (sepDist || 1)) * overlap * 0.16;
                                    const pushY = (sepY / (sepDist || 1)) * overlap * 0.16;
                                    e.x -= pushX;
                                    e.y -= pushY;
                                    other.x += pushX;
                                    other.y += pushY;
                                }
                            }
                        }
                        nIdx = entityNext[nIdx];
                    }
                }
            }
        }
    }
}

// --- DROPS Y EFECTOS ---

function spawnGem(x, y, enemyMaxHp) {
    for (let i = 0; i < maxGems; i++) {
        const g = gems[i];
        if (!g.active) {
            g.active = true;
            g.x = x;
            g.y = y;
            g.xpValue = RNG.getGemXpValue(enemyMaxHp);
            g.magnetizing = false;
            g.magnetSpeed = 180;
            g.color = RNG.getGemColor(g.xpValue);
            break;
        }
    }
}

function spawnDamageParticles(x, y, color) {
    let count = 0;
    for (let i = 0; i < maxParticles; i++) {
        const pt = particles[i];
        if (!pt.active) {
            pt.active = true;
            pt.x = x;
            pt.y = y;

            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 90;
            pt.vx = Math.cos(angle) * speed;
            pt.vy = Math.sin(angle) * speed;

            pt.color = [color[0], color[1], color[2], 0.9];
            pt.radius = 2.0 + Math.random() * 2.5;
            pt.life = 0.25 + Math.random() * 0.2;
            pt.maxLife = pt.life;

            count++;
            if (count >= 5) break;
        }
    }
}

// --- ACTUALIZACIÓN DE PROYECTILES Y COLISIONES ---

function checkProjectileCollisions(dt) {
    for (let i = 0; i < maxProjectiles; i++) {
        const p = projectiles[i];
        if (p.active) {
            // Mover proyectil
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            if (p.life <= 0) {
                p.active = false;
                continue;
            }

            // Colisiones con el Boss (si está activo)
            if (boss.active) {
                const dxBoss = boss.x - p.x;
                const dyBoss = boss.y - p.y;
                const distBoss = Math.hypot(dxBoss, dyBoss);
                if (distBoss < p.radius + boss.radius) {
                    boss.hp -= p.damage;
                    AudioEngine.playSFX("hit");
                    spawnDamageParticles(p.x, p.y, [1.0, 0.2, 0.2, 1.0]);

                    // --- CONEXIÓN DE PERFORACIÓN EN BOSS ---
                    if (p.pierce === undefined) {
                        p.pierce = player.maxProjectilePierce || 1;
                    }
                    p.pierce--;
                    if (p.pierce <= 0) p.active = false;

                    if (boss.hp <= 0) {
                        boss.active = false;
                        isBossFightActive = false;
                        SoundManager.playBGM('gameplay');
                        kills += 100; // Bono de bajas
                        spawnGem(boss.x, boss.y, 500); // Gema de mucha XP
                        showToast("🏆 ¡JEFE DESTRUIDO! 🏆");
                    }
                    if (!p.active) continue; // Si la bala se quedó sin pierce, saltar al siguiente
                }
            }

            // Colisiones contra enemigos ( Spatial Hash Grid )
            const cx = Math.floor(p.x / CELL_SIZE);
            const cy = Math.floor(p.y / CELL_SIZE);
            let collided = false;

            for (let ny = cy - 1; ny <= cy + 1; ny++) {
                for (let nx = cx - 1; nx <= cx + 1; nx++) {
                    const hash = Math.abs((nx * 73856093) ^ (ny * 19349663)) % NUM_BUCKETS;
                    let nIdx = bucketHeaders[hash];
                    while (nIdx !== -1) {
                        const e = enemies[nIdx];
                        if (e.active && e.gridCx === nx && e.gridCy === ny) {
                            const dx = e.x - p.x;
                            const dy = e.y - p.y;
                            const dist = Math.hypot(dx, dy);
                            const hitLimit = p.radius + e.radius;

                            if (dist < hitLimit) {
                                e.hp -= p.damage;
                                spawnDamageParticles(p.x, p.y, e.color);

                                // --- CONEXIÓN DE PERFORACIÓN EN ENEMIGOS ---
                                if (p.pierce === undefined) {
                                    // Si la bala es nueva, le asigna la perforación actual del jugador
                                    p.pierce = player.maxProjectilePierce || 1;
                                }
                                p.pierce--;

                                // Solo apaga la bala si se le acabaron las perforaciones
                                if (p.pierce <= 0) {
                                    p.active = false;
                                    collided = true;
                                }

                                if (e.hp <= 0) {
                                    e.active = false;
                                    kills++;
                                    spawnGem(e.x, e.y, e.maxHp);
                                }
                                if (p.pierce <= 0) break; // Rompe el ciclo de este bucket si la bala murió
                            }
                        }
                        nIdx = entityNext[nIdx];
                    }
                    if (collided) break;
                }
                if (collided) break;
            }
        }
    }
}


// --- ACTUALIZACIÓN DE GEMAS Y PARTÍCULAS ---

function updateGems(dt) {
    // EFECTO DE VAMPIRISMO
    if (player.reliquias && player.reliquias.vampirismo > 0) {
        const chances = [0, 0.05, 0.07, 0.10]; // Nivel 1 (5%), Nivel 2 (7%), Nivel 3 (10%)
        const probabilidad = chances[player.reliquias.vampirismo];

        if (Math.random() < probabilidad) {
            player.hp = Math.min(player.maxHp, player.hp + 2); // Cura 2 HP sin sobrepasar el máximo
            if (typeof showToast === 'function') showToast("🩸 Vampirismo: +2 HP");
        }
    }
    for (let i = 0; i < maxGems; i++) {
        const g = gems[i];
        if (g.active) {
            const dx = player.x - g.x;
            const dy = player.y - g.y;
            const dist = Math.hypot(dx, dy);

            if (g.magnetizing) {
                g.magnetSpeed += 550 * dt;
                g.x += (dx / dist) * g.magnetSpeed * dt;
                g.y += (dy / dist) * g.magnetSpeed * dt;

                if (dist < 15) {
                    g.active = false;
                    gainXp(g.xpValue);
                }
            } else if (dist < player.magnetRadius) {
                g.magnetizing = true;
                g.magnetSpeed = 160;
            }
        }
    }
}

function updateParticles(dt) {
    for (let i = 0; i < maxParticles; i++) {
        const pt = particles[i];
        if (pt.active) {
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.vx *= 0.93; // Fricción
            pt.vy *= 0.93;
            pt.life -= dt;
            pt.color[3] = pt.life / pt.maxLife;

            if (pt.life <= 0) {
                pt.active = false;
            }
        }
    }
}
