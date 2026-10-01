/**
 * Motor de audio Web Audio API para efectos físicos y realistas de interruptores y protecciones.
 * 100% autónomo, offline y de latencia cero (sin dependencias de archivos externos).
 */

class SoundEffectsManager {
  private audioCtx: AudioContext | null = null;
  private isMuted = false;
  private noiseBuffer: AudioBuffer | null = null;
  private lastTripTimestamp = 0;

  constructor() {
    // Si hay preferencia en localStorage
    try {
      const stored = localStorage.getItem('electrosim_audio_muted');
      if (stored !== null) {
        this.isMuted = stored === 'true';
      }
    } catch {}
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    if (this.audioCtx && !this.noiseBuffer) {
      this.generateNoiseBuffer();
    }

    return this.audioCtx;
  }

  private generateNoiseBuffer() {
    if (!this.audioCtx) return;
    const sampleRate = this.audioCtx.sampleRate;
    const bufferSize = sampleRate * 0.5; // 0.5 seg de ruido blanco
    const buffer = this.audioCtx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  /**
   * Sonido realista de tecla basculante de interruptor doméstico (Simon, Legrand, etc.)
   * Reproduce el característico "clic-clac" mecánico con cuerpo plástico y resorte.
   */
  public playSwitchClick(variant: 'on' | 'off' | 'toggle' | 'push_down' | 'push_up' = 'toggle') {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Variación sutil de frecuencia según si se enciende, apaga o conmuta
      let startFreq = 340;
      let endFreq = 160;
      let snapFreq = 3200;
      let volume = 0.38;

      if (variant === 'on') {
        startFreq = 380;
        endFreq = 190;
        snapFreq = 3400;
      } else if (variant === 'off') {
        startFreq = 300;
        endFreq = 140;
        snapFreq = 2900;
      } else if (variant === 'push_down') {
        startFreq = 420;
        endFreq = 220;
        snapFreq = 3600;
        volume = 0.42;
      } else if (variant === 'push_up') {
        startFreq = 280;
        endFreq = 160;
        snapFreq = 2600;
        volume = 0.28;
      }

      // 1. CHASSIS THUD (Cuerpo de la tecla y caja de mecanismos)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.032);

      oscGain.gain.setValueAtTime(volume * 0.9, now);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);

      // 2. CONTACT SNAP / MICRO-CLICK (Impacto de contactos y resorte rápido)
      if (this.noiseBuffer) {
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(snapFreq, now);
        bandpass.Q.setValueAtTime(3.2, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.0001, now);
        noiseGain.gain.linearRampToValueAtTime(volume * 0.85, now + 0.001);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

        noiseSource.connect(bandpass);
        bandpass.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        noiseSource.start(now);
        noiseSource.stop(now + 0.02);
      }

      // 3. SECONDARY CONTACT PING (Pequeño eco metálico de la lámina de cobre)
      const pingOsc = ctx.createOscillator();
      const pingGain = ctx.createGain();
      pingOsc.type = 'sine';
      pingOsc.frequency.setValueAtTime(1450, now);
      pingGain.gain.setValueAtTime(volume * 0.35, now);
      pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

      pingOsc.connect(pingGain);
      pingGain.connect(ctx.destination);
      pingOsc.start(now);
      pingOsc.stop(now + 0.025);

      // 4. MICRO SEATING REBOUND (Micro rebote físico 11ms después)
      const reboundNow = now + 0.011;
      const reboundOsc = ctx.createOscillator();
      const reboundGain = ctx.createGain();
      reboundOsc.type = 'triangle';
      reboundOsc.frequency.setValueAtTime(endFreq * 0.9, reboundNow);
      reboundGain.gain.setValueAtTime(volume * 0.22, reboundNow);
      reboundGain.gain.exponentialRampToValueAtTime(0.0001, reboundNow + 0.018);

      reboundOsc.connect(reboundGain);
      reboundGain.connect(ctx.destination);
      reboundOsc.start(reboundNow);
      reboundOsc.stop(reboundNow + 0.022);
    } catch {}
  }

  /**
   * Sonido rotundo de DESARME / DISPARO de una protección eléctrica (Magnetotérmico, Diferencial, IGA).
   * Reproduce la liberación violenta del resorte de disparo mecánico, golpe de gatillo y separación de contactos.
   */
  public playBreakerTrip(reason?: string) {
    if (this.isMuted) return;

    // Evitar disparos solapados en ráfaga (máximo 1 cada 100ms)
    const currentMs = Date.now();
    if (currentMs - this.lastTripTimestamp < 100) return;
    this.lastTripTimestamp = currentMs;

    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const masterVolume = 0.65;

      // 1. GOLPE GRAVE DE IMPACTO DEL MECANISMO (CLACK-THUMP)
      const lowOsc = ctx.createOscillator();
      const lowGain = ctx.createGain();
      lowOsc.type = 'triangle';
      lowOsc.frequency.setValueAtTime(220, now);
      lowOsc.frequency.exponentialRampToValueAtTime(55, now + 0.065);

      lowGain.gain.setValueAtTime(masterVolume * 0.95, now);
      lowGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

      lowOsc.connect(lowGain);
      lowGain.connect(ctx.destination);
      lowOsc.start(now);
      lowOsc.stop(now + 0.08);

      // 2. DISPARO VIOLENTO DE MUELLE INTERNO (Snap de alta energía filtrado)
      if (this.noiseBuffer) {
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(2600, now);
        bandpass.frequency.exponentialRampToValueAtTime(650, now + 0.04);
        bandpass.Q.setValueAtTime(2.0, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.0001, now);
        noiseGain.gain.linearRampToValueAtTime(masterVolume * 1.0, now + 0.001);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

        noiseSource.connect(bandpass);
        bandpass.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        noiseSource.start(now);
        noiseSource.stop(now + 0.05);
      }

      // 3. REBOTE / VIBRACIÓN DEL MUELLE Y GATILLO LIBERADO (Resonancia de desenganche)
      const springOsc = ctx.createOscillator();
      const springGain = ctx.createGain();
      springOsc.type = 'sawtooth';
      springOsc.frequency.setValueAtTime(460, now + 0.005);
      springOsc.frequency.exponentialRampToValueAtTime(180, now + 0.12);

      const springFilter = ctx.createBiquadFilter();
      springFilter.type = 'lowpass';
      springFilter.frequency.setValueAtTime(800, now);

      springGain.gain.setValueAtTime(0.0001, now);
      springGain.gain.linearRampToValueAtTime(masterVolume * 0.45, now + 0.008);
      springGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

      springOsc.connect(springFilter);
      springFilter.connect(springGain);
      springGain.connect(ctx.destination);

      springOsc.start(now + 0.004);
      springOsc.stop(now + 0.12);

      // 4. MICRO-CHISPA / SEPARACIÓN DE POLOS (Arco eléctrico microsegundos)
      const arcOsc = ctx.createOscillator();
      const arcGain = ctx.createGain();
      arcOsc.type = 'square';
      arcOsc.frequency.setValueAtTime(1100, now);
      arcGain.gain.setValueAtTime(masterVolume * 0.25, now);
      arcGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

      arcOsc.connect(arcGain);
      arcGain.connect(ctx.destination);
      arcOsc.start(now);
      arcOsc.stop(now + 0.02);
    } catch {}
  }

  /**
   * Sonido de accionamiento manual o rearme de palanca de magnetotérmico/diferencial.
   * Más robusto e industrial que el interruptor doméstico estándar.
   */
  public playBreakerToggle(action: 'rearm' | 'open' | 'toggle' = 'toggle') {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const isRearm = action === 'rearm';
      const volume = isRearm ? 0.55 : 0.45;

      // Palancazo mecánico pesado
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isRearm ? 280 : 220, now);
      osc.frequency.exponentialRampToValueAtTime(isRearm ? 130 : 100, now + 0.045);

      oscGain.gain.setValueAtTime(volume * 0.9, now);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);

      if (this.noiseBuffer) {
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(isRearm ? 1900 : 1400, now);
        filter.Q.setValueAtTime(2.5, now);

        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(volume * 0.7, now);
        nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.03);
      }
    } catch {}
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('electrosim_audio_muted', String(this.isMuted));
    } catch {}
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('electrosim_audio_muted', String(this.isMuted));
    } catch {}
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const soundEffects = new SoundEffectsManager();
