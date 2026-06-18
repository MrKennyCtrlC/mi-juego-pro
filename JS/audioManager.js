// ==========================================
// SISTEMA DE AUDIO LOCAL (SOUND MANAGER)
// ==========================================
/**
 * Gestiona la música de fondo y el volumen global por pistas.
 * Separa música de gameplay y boss para cambiar la atmósfera del combate.
 */
const SoundManager = {
    currentBGM: null,
    tracks: {
        gameplay: 'SoundManager/GameplaySoundtrack.ogg',
        boss: 'SoundManager/BossBattleSoundtrack.ogg'
    },
    masterVolume: 1.0,
    musicVolume: 0.5,

    playBGM(type) {
        const targetUrl = this.tracks[type];
        if (!targetUrl) return;
        if (this.currentBGM && this.currentBGM.src.includes(targetUrl)) return;
        if (this.currentBGM) this.currentBGM.pause();

        this.currentBGM = new Audio(targetUrl);
        this.currentBGM.loop = true;
        this.updateVolume();

        // Creamos una función interna de intento de reproducción
        const intentarReproducir = () => {
            if (!this.currentBGM) return;

            this.currentBGM.play()
                .then(() => {
                    console.log("🔊 ¡Música iniciada con éxito tras la interacción del usuario!");
                })
                .catch(error => {
                    console.warn("⚠️ Audio bloqueado temporalmente. Reintentando automáticamente en tu próximo clic...");

                    // Si el navegador lo bloquea, creamos un detector temporal:
                    // En cuanto hagas UN CLIC en cualquier parte, se volverá a ejecutar esta función
                    window.addEventListener('click', intentarReproducir, { once: true });
                });
        };

        // Ejecutamos el primer intento al cargar
        intentarReproducir();
    },
    updateVolume() {
        if (this.currentBGM) {
            // El volumen real es la combinación de ambos sliders
            this.currentBGM.volume = this.masterVolume * this.musicVolume;
        }
    },

    setMusicVolume(value) {
        this.musicVolume = value;
        this.updateVolume();
    },

    setMasterVolume(value) {
        this.masterVolume = value;
        this.updateVolume();
    },

    stopBGM() {
        if (this.currentBGM) {
            this.currentBGM.pause();
            this.currentBGM.currentTime = 0; // Reinicia la canción al segundo cero
        }
    }
};

// ==========================================
// MOTOR DE SINTETIZACIÓN DE EFECTOS (AUDIO ENGINE)
// ==========================================
/**
 * Motor de audio WebAudio para efectos cortos.
 * Maneja ganancia global, volumen de SFX y síntesis de disparos o impactos.
 */
const AudioEngine = {
    ctx: null,
    masterGain: null,
    sfxGain: null,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();

            // Jerarquía de ganancia: sfxGain → masterGain → destination
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.8;
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 1.0;
            this.sfxGain.connect(this.masterGain);
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    setMasterVolume(v) {
        if (this.masterGain) this.masterGain.gain.setValueAtTime(v, this.ctx.currentTime);
    },
    // Stub: slider de música existente no tendrá efecto sin BGM activo
    setMusicVolume(v) { },
    setSfxVolume(v) {
        if (this.sfxGain) this.sfxGain.gain.setValueAtTime(v, this.ctx.currentTime);
    },

    // Stubs para evitar errores en los call sites existentes
    playTrack(track) { },
    stopBGM() { },

    playSFX(type) {
        if (!this.ctx || !this.sfxGain) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        osc.connect(gain);
        // SFX → sfxGain → masterGain → destination
        gain.connect(this.sfxGain);
        let now = this.ctx.currentTime;

        if (type === 'shoot') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.05);
            osc.start(now); osc.stop(now + 0.05);
        } else if (type === 'hit') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.linearRampToValueAtTime(30, now + 0.03);

            gain.gain.setValueAtTime(0.4, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.03);
            osc.start(now); osc.stop(now + 0.03);
        } else if (type === 'dash') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(900, now + 0.2);

            gain.gain.setValueAtTime(0.5, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
        }
    }
};
