class BuzzerAudioManager {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private isMuted = false;
  private masterGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;

  private initContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
  }

  public start() {
    if (this.isPlaying || this.isMuted) return;

    this.initContext();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    try {
      const now = this.audioCtx.currentTime;

      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(0.0001, now);
      this.masterGain.gain.linearRampToValueAtTime(0.16, now + 0.005);

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(750, now);
      filter.Q.setValueAtTime(2.2, now);

      const amGain = this.audioCtx.createGain();
      amGain.gain.setValueAtTime(0.65, now);

      this.lfo = this.audioCtx.createOscillator();
      const lfoGain = this.audioCtx.createGain();
      this.lfo.type = 'sine';
      this.lfo.frequency.setValueAtTime(50, now);
      lfoGain.gain.setValueAtTime(0.35, now);

      this.lfo.connect(lfoGain);
      lfoGain.connect(amGain.gain);

      this.osc1 = this.audioCtx.createOscillator();
      this.osc1.type = 'sawtooth';
      this.osc1.frequency.setValueAtTime(160, now);

      this.osc2 = this.audioCtx.createOscillator();
      this.osc2.type = 'square';
      this.osc2.frequency.setValueAtTime(480, now);
      const osc2Gain = this.audioCtx.createGain();
      osc2Gain.gain.setValueAtTime(0.35, now);
      this.osc2.connect(osc2Gain);

      this.oscSub = this.audioCtx.createOscillator();
      this.oscSub.type = 'sawtooth';
      this.oscSub.frequency.setValueAtTime(50, now);
      const subGain = this.audioCtx.createGain();
      subGain.gain.setValueAtTime(0.5, now);
      this.oscSub.connect(subGain);

      this.osc1.connect(filter);
      osc2Gain.connect(filter);
      subGain.connect(filter);

      filter.connect(amGain);
      amGain.connect(this.masterGain);
      this.masterGain.connect(this.audioCtx.destination);

      this.lfo.start(now);
      this.osc1.start(now);
      this.osc2.start(now);
      this.oscSub.start(now);

      this.isPlaying = true;
    } catch {
      this.isPlaying = false;
    }
  }

  public stop() {
    if (!this.isPlaying || !this.audioCtx || !this.masterGain) {
      this.isPlaying = false;
      return;
    }

    try {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.008);

      const stopTime = now + 0.01;
      if (this.osc1) {
        this.osc1.stop(stopTime);
        this.osc1.disconnect();
        this.osc1 = null;
      }
      if (this.osc2) {
        this.osc2.stop(stopTime);
        this.osc2.disconnect();
        this.osc2 = null;
      }
      if (this.oscSub) {
        this.oscSub.stop(stopTime);
        this.oscSub.disconnect();
        this.oscSub = null;
      }
      if (this.lfo) {
        this.lfo.stop(stopTime);
        this.lfo.disconnect();
        this.lfo = null;
      }

      this.masterGain = null;
    } catch {
    } finally {
      this.isPlaying = false;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.isPlaying) {
      this.stop();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const buzzerAudio = new BuzzerAudioManager();
