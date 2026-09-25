import { storage } from '../utils/storage';

const MUTE_KEY = 'darafsh.muted';

export type SfxName =
  | 'release' | 'hit' | 'crit' | 'kill' | 'bounce' | 'absorb' | 'golden' | 'ui'
  | 'clang' | 'raise' | 'step' | 'spawn' | 'taunt' | 'lunge' | 'hurt' | 'growl' | 'wave'
  | 'bang' | 'drum' | 'slam' | 'shockwave' | 'barrierUp' | 'barrierChip' | 'barrierBreak' | 'stun'
  | 'summon' | 'bossHit' | 'heartbeat' | 'arrowLaunch' | 'shatter' | 'victory' | 'screech' | 'featherChime'
  | 'toast' | 'teamHit' | 'chainUp' | 'chainDown' | 'comboBreak' | 'heartFill' | 'rescue' | 'horn' | 'volley'
  | 'pause' | 'tick' | 'stamp' | 'whoosh' | 'bubble' | 'newBest' | 'dusk' | 'battle';

/**
 * Procedural SFX with Web Audio — no audio files to download.
 * The context is created and resumed on the first user gesture (autoplay rules).
 */
export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private draw: { osc: OscillatorNode; filter: BiquadFilterNode; gain: GainNode } | null = null;
  private hum: { oscs: OscillatorNode[]; gain: GainNode } | null = null;
  private choir: { oscs: OscillatorNode[]; gain: GainNode } | null = null;
  private _muted = storage.get(MUTE_KEY) === '1';
  private held = false;

  get muted(): boolean {
    return this._muted;
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    storage.set(MUTE_KEY, muted ? '1' : '0');
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.02);
    if (muted) {
      this.stopDraw();
      this.stopHum();
    }
  }

  /** Call from any user-gesture handler. Safe to call repeatedly. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const comp = ctx.createDynamicsCompressor();
      comp.connect(ctx.destination);
      const master = ctx.createGain();
      master.gain.value = this._muted ? 0 : 0.8;
      master.connect(comp);
      const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.ctx = ctx;
      this.master = master;
      this.noise = noise;
    }
    if (this.ctx.state === 'suspended' && !this.held) void this.ctx.resume();
  }

  suspend(): void {
    this.stopDraw();
    this.stopHum();
    this.stopChoir(0.1);
    if (this.ctx?.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx?.state === 'suspended' && !this.held) void this.ctx.resume();
  }

  /**
   * Pause menu: freezes all sound mid-note (the finisher's choir included) and resumes it exactly
   * where it was. Nothing else (gestures, the tab becoming visible) can resume it while held.
   */
  hold(on: boolean): void {
    this.held = on;
    if (!this.ctx) return;
    if (on && this.ctx.state === 'running') void this.ctx.suspend();
    else if (!on && !document.hidden && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  // ---- Bow tension (continuous while charging) ----

  startDraw(): void {
    const ctx = this.ready();
    if (!ctx || this.draw) return;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 70;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    filter.Q.value = 6;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(0.05, ctx.currentTime, 0.05);
    osc.connect(filter).connect(gain).connect(this.master!);
    osc.start();
    this.draw = { osc, filter, gain };
  }

  /** charge 0..1; golden brightens the tone. */
  updateDraw(charge: number, golden: boolean): void {
    if (!this.draw || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.draw.osc.frequency.setTargetAtTime(70 + charge * 110, t, 0.03);
    this.draw.filter.frequency.setTargetAtTime(golden ? 2600 : 450 + charge * 1100, t, 0.04);
    this.draw.gain.gain.setTargetAtTime(golden ? 0.075 : 0.035 + charge * 0.03, t, 0.05);
  }

  stopDraw(): void {
    if (!this.draw || !this.ctx) return;
    const { osc, gain } = this.draw;
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setTargetAtTime(0, t, 0.015);
    osc.stop(t + 0.1);
    this.draw = null;
  }

  // ---- Golden hum (soft rising tone while the golden window is open) ----

  startHum(durationMs: number): void {
    const ctx = this.ready();
    if (!ctx || this.hum) return;
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.07, t + 0.06);
    gain.connect(this.master!);
    const oscs = [220, 330.5, 440.8].map((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.5, t + durationMs / 1000);
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 1 : 0.35;
      osc.connect(g).connect(gain);
      osc.start(t);
      return osc;
    });
    this.hum = { oscs, gain };
  }

  stopHum(): void {
    if (!this.hum || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.hum.gain.gain.cancelScheduledValues(t);
    this.hum.gain.gain.setTargetAtTime(0, t, 0.03);
    for (const o of this.hum.oscs) o.stop(t + 0.2);
    this.hum = null;
  }

  // ---- Choir and nay (swells while the team finisher is charged) ----

  startChoir(): void {
    const ctx = this.ready();
    if (!ctx || this.choir) return;
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 1.4);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    gain.connect(filter).connect(this.master!);
    const oscs: OscillatorNode[] = [];
    // "Aah" pad: a D minor-ish chord, slightly detuned voices.
    for (const f of [146.8, 220, 293.7, 349.2, 440]) {
      for (const d of [-4, 4]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = d;
        const g = ctx.createGain();
        g.gain.value = 0.05;
        o.connect(g).connect(gain);
        o.start(t);
        oscs.push(o);
      }
    }
    // Nay: breathy reed melody on top, with vibrato.
    const nay = ctx.createOscillator();
    nay.type = 'triangle';
    const notes = [587.3, 659.3, 698.5, 659.3, 880];
    notes.forEach((f, i) => nay.frequency.setValueAtTime(f, t + i * 0.45));
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.5;
    const vibGain = ctx.createGain();
    vibGain.gain.value = 7;
    vib.connect(vibGain).connect(nay.frequency);
    const nayGain = ctx.createGain();
    nayGain.gain.setValueAtTime(0.0001, t);
    nayGain.gain.exponentialRampToValueAtTime(0.35, t + 0.5);
    nay.connect(nayGain).connect(gain);
    nay.start(t);
    vib.start(t);
    oscs.push(nay, vib);
    this.choir = { oscs, gain };
  }

  stopChoir(fadeSec = 0.4): void {
    if (!this.choir || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.choir.gain.gain.cancelScheduledValues(t);
    this.choir.gain.gain.setTargetAtTime(0.0001, t, fadeSec / 3);
    for (const o of this.choir.oscs) o.stop(t + fadeSec + 0.2);
    this.choir = null;
  }

  // ---- One-shots ----

  play(name: SfxName, intensity = 1): void {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    switch (name) {
      case 'release':
        this.noiseBurst(t, 0.14, 'bandpass', 3200, 500, 0.35 + 0.35 * intensity, 1.2);
        this.tone(t, 'triangle', 240, 80, 0.09, 0.3);
        break;
      case 'hit':
        this.noiseBurst(t, 0.08, 'lowpass', 1400, 400, 0.45, 0.7);
        this.tone(t, 'sine', 170, 55, 0.12, 0.55);
        break;
      case 'crit':
        this.noiseBurst(t, 0.1, 'lowpass', 2200, 500, 0.55, 0.7);
        this.tone(t, 'sine', 200, 50, 0.16, 0.7);
        this.tone(t, 'sine', 1046, 1046, 0.5, 0.16);
        this.tone(t + 0.02, 'sine', 1568, 1568, 0.45, 0.12);
        this.noiseBurst(t, 0.06, 'highpass', 6000, 6000, 0.12, 0.5);
        break;
      case 'kill':
        this.tone(t, 'sine', 130, 34, 0.38, 0.7);
        this.noiseBurst(t, 0.3, 'lowpass', 900, 150, 0.4, 0.5);
        break;
      case 'bounce':
        this.tone(t, 'sine', 2100, 1100, 0.06, 0.18);
        this.noiseBurst(t, 0.03, 'highpass', 4000, 4000, 0.15, 0.5);
        break;
      case 'absorb':
        this.noiseBurst(t, 0.07, 'lowpass', 700, 250, 0.3, 0.6);
        break;
      case 'golden':
        this.tone(t, 'sine', 1318, 1318, 0.55, 0.14);
        this.tone(t, 'sine', 1976, 1976, 0.45, 0.09);
        this.tone(t + 0.04, 'triangle', 2637, 2637, 0.25, 0.04);
        break;
      case 'ui':
        this.tone(t, 'sine', 740, 620, 0.06, 0.15);
        break;
      case 'clang':
        this.tone(t, 'square', 1480, 1320, 0.16, 0.08);
        this.tone(t, 'sine', 2960, 2700, 0.3, 0.12);
        this.tone(t, 'sine', 3950, 3900, 0.22, 0.06);
        this.noiseBurst(t, 0.05, 'highpass', 5000, 5000, 0.25, 0.7);
        break;
      case 'raise':
        this.noiseBurst(t, 0.12, 'bandpass', 2500, 6000, 0.12, 2);
        this.tone(t + 0.03, 'sine', 2200, 2600, 0.18, 0.05);
        break;
      case 'step':
        this.tone(t, 'sine', 70, 40, 0.14, 0.4 * intensity);
        this.noiseBurst(t, 0.08, 'lowpass', 400, 150, 0.18 * intensity, 0.6);
        break;
      case 'spawn':
        this.noiseBurst(t, 0.35, 'bandpass', 300, 1400, 0.22, 1.4);
        this.tone(t, 'sine', 160, 90, 0.3, 0.12);
        break;
      case 'taunt':
        this.tone(t, 'square', 520, 700, 0.07, 0.05);
        this.tone(t + 0.09, 'square', 560, 760, 0.07, 0.05);
        break;
      case 'lunge':
        this.noiseBurst(t, 0.18, 'bandpass', 900, 2600, 0.3, 1.2);
        this.tone(t, 'sawtooth', 180, 90, 0.18, 0.12);
        break;
      case 'hurt':
        this.tone(t, 'sawtooth', 240, 70, 0.3, 0.3);
        this.noiseBurst(t, 0.2, 'lowpass', 1200, 200, 0.4, 0.8);
        break;
      case 'growl': {
        // Low, rough, slightly wobbling roar.
        const ctx2 = this.ctx!;
        const osc = ctx2.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(58, t);
        osc.frequency.linearRampToValueAtTime(72, t + 0.35);
        osc.frequency.linearRampToValueAtTime(46, t + 1.1);
        const lfo = ctx2.createOscillator();
        lfo.frequency.value = 23;
        const lfoGain = ctx2.createGain();
        lfoGain.gain.value = 9;
        lfo.connect(lfoGain).connect(osc.frequency);
        const filter = ctx2.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 360;
        const g = ctx2.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.32, t + 0.18);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        osc.connect(filter).connect(g).connect(this.master!);
        osc.start(t);
        lfo.start(t);
        osc.stop(t + 1.25);
        lfo.stop(t + 1.25);
        this.noiseBurst(t, 1.0, 'lowpass', 500, 180, 0.12, 0.5);
        break;
      }
      case 'wave':
        this.tone(t, 'triangle', 392, 392, 0.22, 0.12);
        this.tone(t + 0.12, 'triangle', 523, 523, 0.3, 0.12);
        break;
      case 'bang':
        this.tone(t, 'square', 620, 520, 0.12, 0.05);
        this.tone(t, 'sine', 90, 50, 0.16, 0.3);
        this.noiseBurst(t, 0.06, 'bandpass', 2400, 1800, 0.12, 1.5);
        break;
      case 'drum':
        // War drum: deep pitched thump plus skin slap.
        this.tone(t, 'sine', 95, 38, 0.55, 0.9 * intensity);
        this.tone(t, 'triangle', 180, 60, 0.12, 0.25);
        this.noiseBurst(t, 0.09, 'lowpass', 900, 200, 0.35, 0.7);
        break;
      case 'slam':
        this.tone(t, 'sine', 70, 26, 0.9, 1.0 * intensity);
        this.noiseBurst(t, 0.6, 'lowpass', 1400, 120, 0.8 * intensity, 0.5);
        this.noiseBurst(t + 0.05, 0.4, 'bandpass', 600, 200, 0.3, 1);
        break;
      case 'shockwave':
        this.noiseBurst(t, 0.9, 'bandpass', 200, 2400, 0.45 * intensity, 0.9);
        this.tone(t, 'sine', 55, 30, 0.8, 0.6 * intensity);
        break;
      case 'barrierUp':
        this.tone(t, 'sine', 523, 523, 1.2, 0.08);
        this.tone(t + 0.08, 'sine', 659, 659, 1.1, 0.07);
        this.tone(t + 0.16, 'sine', 784, 784, 1.0, 0.07);
        this.tone(t + 0.24, 'triangle', 1046, 1046, 0.9, 0.05);
        this.noiseBurst(t, 0.5, 'highpass', 5000, 8000, 0.08, 0.7);
        break;
      case 'barrierChip':
        this.tone(t, 'sine', 2349, 1975, 0.25, 0.12);
        this.tone(t, 'square', 1175, 1100, 0.08, 0.04);
        this.noiseBurst(t, 0.12, 'highpass', 3500, 6000, 0.3, 0.8);
        break;
      case 'barrierBreak':
        for (let i = 0; i < 5; i++) this.tone(t + i * 0.03, 'sine', 2600 - i * 300, 900, 0.4, 0.07);
        this.noiseBurst(t, 0.45, 'highpass', 2500, 7000, 0.4, 0.6);
        this.tone(t, 'sine', 110, 45, 0.5, 0.4);
        break;
      case 'stun':
        // Dizzy warble.
        for (let i = 0; i < 4; i++) this.tone(t + i * 0.09, 'sine', 900 + (i % 2) * 300, 700, 0.12, 0.08);
        break;
      case 'summon':
        this.tone(t, 'sawtooth', 70, 140, 0.8, 0.12);
        this.noiseBurst(t, 0.8, 'bandpass', 300, 1600, 0.2, 2);
        break;
      case 'bossHit':
        this.tone(t, 'sine', 120, 48, 0.25, 0.55 * intensity);
        this.noiseBurst(t, 0.12, 'lowpass', 1100, 300, 0.4, 0.7);
        break;
      case 'heartbeat':
        this.tone(t, 'sine', 60, 42, 0.16, 0.8);
        this.tone(t + 0.2, 'sine', 55, 40, 0.14, 0.55);
        break;
      case 'arrowLaunch':
        this.noiseBurst(t, 1.1, 'bandpass', 400, 3200, 0.5, 1.5);
        this.tone(t, 'sine', 220, 880, 1.0, 0.18);
        break;
      case 'shatter':
        this.noiseBurst(t, 1.2, 'highpass', 1800, 6000, 0.5, 0.5);
        for (let i = 0; i < 8; i++) this.tone(t + i * 0.05, 'sine', 3000 - i * 220, 1200, 0.5, 0.06);
        this.tone(t, 'sine', 80, 30, 1.2, 0.8);
        break;
      case 'victory':
        // A bright horn-like fanfare.
        [[392, 0], [523, 0.18], [659, 0.36], [784, 0.54], [1046, 0.8]].forEach(([f, d]) => {
          this.tone(t + d, 'sawtooth', f, f, 0.6, 0.06);
          this.tone(t + d, 'triangle', f, f, 0.7, 0.12);
        });
        break;
      case 'screech':
        // The Simorgh, far above: a long falling cry with a flutter.
        this.tone(t, 'sawtooth', 2400, 1300, 0.9, 0.06);
        this.tone(t + 0.02, 'sine', 1800, 900, 0.9, 0.08);
        this.noiseBurst(t, 1.2, 'bandpass', 900, 400, 0.15, 1.2);
        break;
      case 'featherChime':
        this.tone(t, 'sine', 1568, 1568, 0.9, 0.1);
        this.tone(t + 0.07, 'sine', 2093, 2093, 0.8, 0.08);
        this.tone(t + 0.14, 'sine', 2637, 2637, 0.7, 0.06);
        break;
      case 'toast':
        // A soft plucked tar: two notes, a friend's knock.
        this.tone(t, 'triangle', 659, 659, 0.22, 0.09);
        this.tone(t + 0.07, 'triangle', 988, 988, 0.3, 0.07);
        break;
      case 'teamHit':
        // A teammate's blow landing on the far-away Div: muffled thud and a glint.
        this.tone(t, 'sine', 110, 50, 0.3, 0.3 * intensity);
        this.noiseBurst(t, 0.18, 'lowpass', 700, 200, 0.18 * intensity, 0.6);
        this.tone(t + 0.03, 'sine', 1760, 1760, 0.25, 0.04);
        break;
      case 'chainUp': {
        // Whoosh of a fanned flame, then a rising fifth (higher tiers, higher pitch).
        const k = 1 + 0.25 * (intensity - 1);
        this.noiseBurst(t, 0.45, 'bandpass', 400, 2600, 0.3, 0.9);
        this.tone(t + 0.05, 'triangle', 392 * k, 392 * k, 0.3, 0.1);
        this.tone(t + 0.16, 'triangle', 587 * k, 587 * k, 0.45, 0.1);
        break;
      }
      case 'chainDown':
        this.noiseBurst(t, 0.4, 'lowpass', 1400, 200, 0.2, 0.7);
        this.tone(t, 'sine', 330, 196, 0.35, 0.07);
        break;
      case 'comboBreak':
        // Glassy crack.
        for (let i = 0; i < 4; i++) this.tone(t + i * 0.025, 'square', 2400 - i * 380, 900, 0.12, 0.035);
        this.noiseBurst(t, 0.2, 'highpass', 3000, 7000, 0.22, 0.7);
        break;
      case 'heartFill':
        this.tone(t, 'sine', 523, 523, 0.3, 0.1);
        this.tone(t + 0.09, 'sine', 784, 784, 0.35, 0.1);
        this.tone(t + 0.18, 'sine', 1046, 1046, 0.5, 0.09);
        break;
      case 'rescue':
        // A held golden chord swelling in (the spirit's approach).
        for (const [f, d] of [[392, 0], [494, 0.08], [587, 0.16], [784, 0.24]]) {
          this.tone(t + d, 'sine', f, f, 1.4, 0.07);
          this.tone(t + d, 'triangle', f * 2, f * 2, 1.0, 0.025);
        }
        this.noiseBurst(t, 1.2, 'bandpass', 2000, 5000, 0.06, 1.5);
        break;
      case 'horn': {
        // Karnay war horn: two long brassy blasts.
        for (const [d, f] of [[0, 147], [0.55, 196]]) {
          this.tone(t + d, 'sawtooth', f * 0.97, f, 0.5, 0.1);
          this.tone(t + d, 'sawtooth', f * 1.5, f * 1.5, 0.45, 0.04);
        }
        this.noiseBurst(t, 1.1, 'lowpass', 600, 300, 0.1, 0.6);
        break;
      }
      case 'volley':
        this.noiseBurst(t, 0.5, 'bandpass', 1800, 700, 0.25, 1.4);
        this.tone(t, 'sine', 900, 500, 0.3, 0.05);
        break;
      case 'pause':
        this.tone(t, 'sine', 523, 392, 0.12, 0.12);
        break;
      case 'tick':
        // Counting up: a tiny wooden click, pitch rising with `intensity` (0..1).
        this.tone(t, 'square', 1200 + 600 * intensity, 900 + 400 * intensity, 0.03, 0.03);
        break;
      case 'stamp':
        // A seal pressed into wax: thump, then a bright glint.
        this.tone(t, 'sine', 140, 60, 0.22, 0.6);
        this.noiseBurst(t, 0.08, 'lowpass', 1600, 400, 0.4, 0.7);
        this.tone(t + 0.06, 'sine', 1760 * (0.9 + 0.1 * intensity), 1760, 0.4, 0.08);
        this.tone(t + 0.1, 'sine', 2637, 2637, 0.35, 0.05);
        break;
      case 'whoosh':
        this.noiseBurst(t, 0.6, 'bandpass', 300, 2400, 0.35, 1.2);
        break;
      case 'bubble':
        // A chat message popping in.
        this.tone(t, 'sine', 880, 1320, 0.08, 0.1);
        this.tone(t + 0.06, 'sine', 1320, 1320, 0.1, 0.06);
        break;
      case 'newBest':
        [[784, 0], [988, 0.1], [1175, 0.2], [1568, 0.32]].forEach(([f, d]) => this.tone(t + d, 'triangle', f, f, 0.35, 0.1));
        break;
      case 'dusk':
        // Defeat, with dignity: a low, warm minor chord that fades.
        for (const f of [110, 131, 165, 220]) this.tone(t, 'triangle', f, f * 0.99, 2.2, 0.06);
        this.noiseBurst(t, 1.6, 'lowpass', 500, 200, 0.05, 0.5);
        break;
      case 'battle':
        // «نبرد!»: a drum hit under a rising horn call.
        this.tone(t, 'sine', 95, 38, 0.55, 0.9);
        this.noiseBurst(t, 0.09, 'lowpass', 900, 200, 0.35, 0.7);
        for (const [d, f] of [[0.05, 196], [0.3, 262], [0.55, 392]]) this.tone(t + d, 'sawtooth', f, f, 0.35, 0.07);
        break;
    }
  }

  private ready(): AudioContext | null {
    if (this._muted || !this.ctx || this.ctx.state !== 'running') return null;
    return this.ctx;
  }

  private tone(t: number, type: OscillatorType, f0: number, f1: number, dur: number, vol: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noiseBurst(t: number, dur: number, type: BiquadFilterType, f0: number, f1: number, vol: number, q: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) filter.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(this.master!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
}
