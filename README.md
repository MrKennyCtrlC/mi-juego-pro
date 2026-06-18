# 🎮 Survivor Game - Documentación Técnica de Arquitectura

## 🚀 Descripción General

Survivor Game es un videojuego HTML5 Canvas con un game loop síncrono basado en `dt` para mantener la simulación estable sin depender de los FPS.
El motor separa render, actualización de entidades y UI, y usa `Spatial Hash Grid` para optimizar colisiones y consultas de cercanía entre jugador, enemigos, proyectiles y drops.
La arquitectura está orientada a pools fijos de entidades para reducir creación de objetos durante la partida y sostener el rendimiento en combate intenso.

## ⚙️ Constantes Globales y Configuración

- `maxEnemies`: límite máximo de enemigos activos que el motor puede gestionar al mismo tiempo.
- `maxProjectiles`: capacidad total del pool de proyectiles reutilizables.
- `maxGems`: tope de gemas de experiencia en pantalla.
- `maxParticles`: máximo de partículas visuales simultáneas.
- `CELL_SIZE`: tamaño de cada celda de la grilla espacial usada para consultas de proximidad.
- `NUM_BUCKETS`: cantidad de buckets del hash espacial para distribuir entidades y reducir colisiones costosas.
- `maxPickups`: límite de pickups, como corazones de curación.
- `CELL_SIZE` y `NUM_BUCKETS` trabajan juntos para acelerar detección de enemigos cercanos, contacto con el jugador y colisiones de proyectiles.

## 📁 Estructura de Módulos (Archivos .js)

- **JS/rng.js**: define las constantes globales del motor y las utilidades aleatorias para mejoras, drops y color de gemas.
  - `rng.randomAngle()`: devuelve un ángulo aleatorio para spawns y patrones circulares.
  - `rng.randomRange(min, max)`: genera números aleatorios en un intervalo.
  - `rng.getRandomUpgrades(upgradesPool, count)`: selecciona mejoras únicas para el nivel-up.
  - `rng.getGemXpValue(enemyMaxHp)`: calcula la XP de una gema según la vida del enemigo.
  - `rng.getGemColor(xpValue)`: asigna color visual a la gema según su valor.
- **JS/player.js**: concentra el estado del jugador, input, disparo automático y progresión.
  - `obtenerPoolCompletoMejoras()`: combina mejoras base con reliquias elegibles.
  - `aplicarMejoraReliquia(id)`: sube una reliquia de nivel y aplica su efecto.
  - `updatePlayer(dt)`: mueve al jugador y dispara automáticamente.
  - `checkPlayerDamage(dt)`: resuelve daño por contacto con enemigos cercanos.
  - `findNearestEnemy()`: localiza el enemigo más cercano para el auto-aim.
  - `shootWeapons()`: calcula la ráfaga y prioriza el objetivo.
  - `spawnProjectile(startX, startY, targetX, targetY)`: activa un proyectil del pool.
  - `gainXp(amount)`: suma experiencia, sube niveles y dispara recompensas especiales.
  - `levelUp()`: cambia el estado a selección de mejoras.
- **JS/enemies.js**: gestiona enemigos, gemas, partículas, pickups y colisiones.
  - `spawnEnemy()`: activa un enemigo libre del pool.
  - `spawnRingOfEnemies(centerX, centerY)`: genera un anillo de refuerzos alrededor de un punto.
  - `updateEnemies(dt)`: mueve enemigos, reconstruye la grilla espacial y separa entidades solapadas.
  - `spawnGem(x, y, enemyMaxHp)`: crea una gema de XP al morir un enemigo.
  - `spawnDamageParticles(x, y, color)`: emite partículas de impacto.
  - `checkProjectileCollisions(dt)`: resuelve impactos de proyectiles contra enemigos y boss.
  - `updateGems(dt)`: actualiza la atracción y recolección de gemas.
  - `updateParticles(dt)`: envejece y desvanece partículas.
  - `spawnHeart(x, y, healAmount)`: crea un pickup de curación.
  - `updatePickups(dt)`: mueve y recoge pickups de vida.
  - `window.actualizarReliquiasPasivas(dt)`: ejecuta los efectos pasivos de Fuego Fatuo y Estática Disruptiva.
- **JS/ui.js**: centraliza HUD, overlays, menús, toasts, pausa y flujo de fin de partida.
  - `updateGoldHUD()`: muestra el oro de sesión.
  - `saveLastSessionGold(amount)`: persiste el oro de la última sesión.
  - `renderLastSessionGold()`: presenta el oro anterior en el menú.
  - `showToast(message)`: muestra feedback temporal.
  - `showLevelUpModal()`: abre la selección de mejoras.
  - `resumeGame()`: cierra el overlay de mejora y reanuda la partida.
  - `togglePause()`: pausa o reanuda el juego.
  - `goToMainMenu()`: devuelve el flujo al menú principal.
  - `saveGameHistory()`: registra partidas en el historial local.
  - `gameOver()`: procesa el resumen de derrota.
  - `renderStatsTable()`: dibuja la tabla histórica de partidas.
  - `applyVolumeFromSlider(sliderId, type)`: sincroniza sliders de audio.
  - `syncPauseSliders()`: mantiene coherentes los controles de volumen.
  - `mostrarMenuReliquiasInicial()`: presenta la selección inicial de reliquias.
  - `equiparReliquiaInicial(id)`: asigna reliquias de arranque y aplica su efecto.
- **JS/devTools.js**: agrega un panel de depuración para pruebas, atajos y control manual de balance.
  - `DevTools_init()`: crea el panel en el DOM.
  - `DevTools_toggle()`: muestra u oculta el panel.
  - `DevTools_updateStats()`: imprime métricas vivas de partida.
  - `DevTools_upgradeRelic(id)`: sube reliquias manualmente.
  - `DevTools_resetRelics()`: reinicia reliquias y modificadores.
  - `DevTools_toggleGodMode()`: alterna invencibilidad.
  - `DevTools_skipToBoss()`: avanza el tiempo al boss.
  - `DevTools_skipToTime(seconds)`: fija el reloj en un segundo concreto.
  - `DevTools_resetTime()`: reinicia el tiempo de partida.
  - `DevTools_forceLevelUp(times)`: fuerza subidas de nivel.
  - `DevTools_spawnEnemy(type, count)`: genera lotes de enemigos.
  - `DevTools_nukeEnemies()`: elimina enemigos activos.
  - `DevTools_setSpeed(val)`: ajusta la velocidad global.
  - `DevTools_toggleHitboxes()`: activa o desactiva hitboxes de depuración.
- **JS/boss.js**: contiene el jefe final, su aparición en minuto 5 y su patrón de dash y refuerzo.
  - `updateBoss(dt)`: controla aparición, persecución, dash y ataques del boss.
- **JS/audioManager.js**: separa música de fondo y efectos de sonido.
  - `SoundManager.playBGM(type)`: reproduce la pista correspondiente a gameplay o boss.
  - `SoundManager.updateVolume()`: combina volumen maestro y volumen de música.
  - `SoundManager.setMusicVolume(value)`: ajusta volumen musical.
  - `SoundManager.setMasterVolume(value)`: ajusta el volumen global.
  - `SoundManager.stopBGM()`: detiene la música actual.
  - `AudioEngine.init()`: inicializa WebAudio y la jerarquía de ganancia.
  - `AudioEngine.setMasterVolume(v)`: ajusta el volumen maestro del motor.
  - `AudioEngine.setSfxVolume(v)`: ajusta el volumen de efectos.
  - `AudioEngine.playSFX(type)`: sintetiza sonidos de disparo, impacto o dash.

## 🔮 Sistema de Reliquias e Inventario

El juego implementa 6 reliquias con progresión por niveles y efectos directos sobre el jugador o el motor:

- **Botas de Hermes**: incrementan la velocidad de movimiento mediante `player.speedMultiplier`.
- **Vampirismo**: habilita curación probabilística al matar enemigos y puede recuperar vida en `updateGems(dt)` y colisiones relacionadas.
- **Grimorio de Alquimia**: aumenta la perforación máxima de proyectiles con `player.maxProjectilePierce`.
- **Espejismo**: añade probabilidad de evasión y evita daño por contacto cuando la tirada es exitosa.
- **Fuego Fatuo**: crea disparos pasivos periódicos hacia el enemigo más cercano, usando el pool de proyectiles.
- **Estática Disruptiva**: emite pulsos eléctricos de área que dañan enemigos cercanos y generan feedback visual.

Las reliquias se almacenan en `player.reliquias` como niveles enteros y se integran al flujo de mejora mediante el pool combinado de nivel-up. Esto permite que el inventario influya tanto en el combate como en la progresión general de la partida.
