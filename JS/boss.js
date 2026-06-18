// ==========================================
// CONFIGURACIÓN Y LÓGICA DEL JEFE FINAL (BOSS)
// ==========================================

/**
 * Estado del jefe final.
 * Guarda vida, posición, dash, cooldowns y radio de contacto.
 */
let boss = {
    active: false,
    x: 0,
    y: 0,
    hp: 100000,
    maxHp: 100000,
    radius: 35,             // Radio lógico
    speed: 100,             // px/segundo
    lastAttackTime: 0,
    attackCooldown: 3.0,    // Segundos
    dashTimer: 0,
    isDashing: false,
    dashDirectionX: 0,
    dashDirectionY: 0
};

let bossSpawned = false;
let isBossFightActive = false;

/**
 * Actualiza la lógica del boss, su aparición y su patrón de ataque.
 * `dt` controla el movimiento y el temporizador de habilidades.
 */
function updateBoss(dt) {
    // 1. Spawning al minuto 5 (300 segundos)
    if (gameTime >= 300 && !bossSpawned) {
        bossSpawned = true;
        isBossFightActive = true;
        SoundManager.playBGM('boss');

        // Despawn masivo de enemigos comunes
        for (let i = 0; i < maxEnemies; i++) {
            enemies[i].active = false;
        }

        boss.active = true;
        boss.hp = boss.maxHp;
        boss.lastAttackTime = 0;
        boss.dashTimer = 0;
        boss.isDashing = false;

        // Spawn justo fuera del campo visible
        const angle = Math.random() * Math.PI * 2;
        const spawnRadius = Math.max(viewWidth, viewHeight) * 0.5 + 40;
        boss.x = player.x + Math.cos(angle) * spawnRadius;
        boss.y = player.y + Math.sin(angle) * spawnRadius;
        showToast("⚠️ ¡EL JEFE FINAL HA APARECIDO! ⚠️");
    }

    // 2. Comportamiento si está activo
    if (boss.active) {
        const dx = player.x - boss.x;
        const dy = player.y - boss.y;
        const dist = Math.hypot(dx, dy);

        // Lógica de Dash
        if (boss.isDashing) {
            boss.dashTimer += dt;
            if (boss.dashTimer >= 0.4) {
                boss.isDashing = false;
                boss.dashTimer = 0;
            } else {
                // Desplazarse a velocidad x12
                boss.x += boss.dashDirectionX * boss.speed * 12 * dt;
                boss.y += boss.dashDirectionY * boss.speed * 12 * dt;
            }
        } else {
            boss.dashTimer += dt;
            if (boss.dashTimer >= 4.0) {
                boss.isDashing = true;
                boss.dashTimer = 0;
                if (dist > 0) {
                    boss.dashDirectionX = dx / dist;
                    boss.dashDirectionY = dy / dist;
                } else {
                    boss.dashDirectionX = 0;
                    boss.dashDirectionY = 0;
                }
            } else {
                // Movimiento normal
                if (dist > 0) {
                    boss.x += (dx / dist) * boss.speed * dt;
                    boss.y += (dy / dist) * boss.speed * dt;
                }
            }
        }

        // Daño por contacto continuo
        const playerHitRadius = player.width * 0.4;
        if (dist < (playerHitRadius + boss.radius)) {
            player.hp -= 50 * dt; // Quita 50 HP por segundo
            if (player.hp <= 0) {
                player.hp = 0;
                gameOver();
            }
        }

        // Ataque: Anillo de esbirros
        boss.lastAttackTime += dt;
        if (boss.lastAttackTime >= boss.attackCooldown) {
            boss.lastAttackTime = 0;
            spawnRingOfEnemies(boss.x, boss.y);
        }
    }
}
