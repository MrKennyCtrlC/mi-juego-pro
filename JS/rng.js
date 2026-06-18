// --- CONFIGURACIÓN GLOBAL DEL MOTOR ---
/**
 * Límites globales de pools y espacialización.
 * Estos valores determinan cuántas entidades puede gestionar el motor sin crear objetos nuevos.
 */
const maxEnemies = 2500;
const maxProjectiles = 500;
const maxGems = 1000;
const maxParticles = 300;

const CELL_SIZE = 60;
const NUM_BUCKETS = 8192;

// --- FUNCIONES RNG Y PROBABILIDAD ---
/**
 * Utilidades aleatorias y de drops.
 * Centraliza selección de mejoras, cálculo de XP y color de gemas.
 */
const rng = {
    // Retorna un ángulo aleatorio entre 0 y 2*PI
    randomAngle() {
        return Math.random() * Math.PI * 2;
    },

    // Retorna un rango aleatorio entre min y max
    randomRange(min, max) {
        return min + Math.random() * (max - min);
    },

    // Obtiene un conjunto de mejoras aleatorias sin repetir
    getRandomUpgrades(upgradesPool, count = 3) {
        const pool = [...upgradesPool];
        const choices = [];
        for (let i = 0; i < count; i++) {
            if (pool.length === 0) break;
            const idx = Math.floor(Math.random() * pool.length);
            choices.push(pool.splice(idx, 1)[0]);
        }
        return choices;
    },

    // Tabla de drop: Calcula la XP de la gema basada en la vida del enemigo
    getGemXpValue(enemyMaxHp) {
        return Math.ceil(enemyMaxHp / 8);
    },

    // Determina el color de la gema según su valor de XP
    getGemColor(xpValue) {
        if (xpValue >= 6) {
            return [1.0, 0.0, 0.9, 1.0]; // Magenta (alta XP)
        } else if (xpValue >= 3) {
            return [0.1, 0.9, 0.4, 1.0]; // Verde (media XP)
        } else {
            return [0.0, 0.85, 1.0, 1.0]; // Cyan (baja XP)
        }
    }
};

// Forzar a que el juego acepte tanto 'rng' como 'RNG' globalmente
if (typeof rng !== 'undefined') window.RNG = rng;
if (typeof RNG !== 'undefined') window.rng = RNG;
