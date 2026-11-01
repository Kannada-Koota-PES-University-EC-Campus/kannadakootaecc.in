/* Transition sounds for the intro film, made live in the browser with the Web Audio API (no files).

   There is no background music: a short sound plays only when the film crosses from one scene to
   the next. Scrolling forward plays the next scene's cue; scrolling back plays a single soft bell.
   Sounds never pile up when the visitor scrolls back and forth:
   - a new cue quickly fades out whatever is still ringing from the last one;
   - a change is only played once the scroll has stayed in the new scene for a moment, so crossing
     a boundary and coming straight back plays nothing, and fast wiggles collapse into one cue.
   Everything is in one key (raga Mohanam: S R G P D, Sa = D), so cues never clash.

   Browsers only allow sound after a click, tap or key press, so it starts on the visitor's first one. */

const SA = 146.83; // D3
const note = (semi: number, oct = 0) => SA * Math.pow(2, semi / 12 + oct);
const SETTLE_MS = 160; // how long the scroll must stay in a new scene before its cue plays
const MIN_GAP = 0.45; // seconds between two cues

type Cue = { dry: GainNode; wet: GainNode };

export class IntroSound {
  private c: AudioContext | null = null;
  private master!: GainNode;
  private verb!: ConvolverNode;
  private noise!: AudioBuffer;
  private enabled = false;
  private inView = true;
  private scene = 0; // where the scroll is now
  private sounded = 0; // the scene the last cue was played for
  private cue: Cue | null = null;
  private lastCue = -1;
  private timer = 0;
  private readonly onVisibility = () => {
    if (!this.c) return;
    if (document.hidden) void this.c.suspend();
    else if (this.enabled) void this.c.resume();
  };

  get isOn() { return this.enabled; }
  /** true once the browser actually lets the sound play */
  get isRunning() { return this.c?.state === "running"; }

  /** Must be called from a click / tap / key press. `chime` plays a soft bell to confirm. */
  enable(chime = true) {
    if (!this.c) this.build();
    const c = this.c as AudioContext;
    void c.resume();
    this.enabled = true;
    this.sounded = this.scene;
    this.applyLevel();
    if (!chime) return;
    this.newCue();
    this.bell(c.currentTime + 0.05, note(7, 2), 0.06, 2.5);
  }

  disable() {
    this.enabled = false;
    window.clearTimeout(this.timer);
    this.applyLevel();
  }

  setScene(index: number, inView: boolean) {
    this.scene = index;
    if (inView !== this.inView) { this.inView = inView; this.applyLevel(); }
    if (!this.enabled || !this.c) return;
    window.clearTimeout(this.timer);
    const wait = Math.max(SETTLE_MS, (this.lastCue + MIN_GAP - this.c.currentTime) * 1000);
    this.timer = window.setTimeout(() => this.fire(), wait);
  }

  dispose() {
    this.disable();
    document.removeEventListener("visibilitychange", this.onVisibility);
    void this.c?.close();
    this.c = null;
  }

  // ---- set-up ----
  private build() {
    const c = new AudioContext();
    this.c = c;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    comp.connect(c.destination);
    this.master = c.createGain();
    this.master.gain.value = 0;
    this.master.connect(comp);

    // a soft hall: decaying noise as the impulse response
    const len = Math.floor(c.sampleRate * 2.4);
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.4);
    }
    this.verb = c.createConvolver();
    this.verb.buffer = ir;
    const wet = c.createGain();
    wet.gain.value = 0.4;
    this.verb.connect(wet).connect(this.master);

    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const n = this.noise.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;

    document.addEventListener("visibilitychange", this.onVisibility);
  }

  private applyLevel() {
    if (!this.c) return;
    const on = this.enabled && this.inView;
    this.master.gain.setTargetAtTime(on ? 1.3 : 0, this.c.currentTime, on ? 0.05 : 0.25);
  }

  /** start a fresh bus for the next cue, fading out the one before so nothing piles up */
  private newCue() {
    const c = this.c as AudioContext;
    const now = c.currentTime;
    const old = this.cue;
    if (old) {
      for (const g of [old.dry, old.wet]) g.gain.setTargetAtTime(0, now, 0.07);
      window.setTimeout(() => { old.dry.disconnect(); old.wet.disconnect(); }, 1500);
    }
    const dry = c.createGain();
    const wet = c.createGain();
    dry.connect(this.master);
    wet.connect(this.verb);
    this.cue = { dry, wet };
    this.lastCue = now;
  }

  /** where a voice plays: into the current cue, with some of it sent to the hall */
  private out(send = 0.5): AudioNode {
    const c = this.c as AudioContext;
    const cue = this.cue as Cue;
    const g = c.createGain();
    g.connect(cue.dry);
    const s = c.createGain();
    s.gain.value = send;
    g.connect(s).connect(cue.wet);
    return g;
  }

  // ---- the cues ----
  private fire() {
    const c = this.c;
    // nothing is queued while the browser still blocks sound, so nothing bursts out later
    if (!c || c.state !== "running" || !this.enabled || !this.inView) return;
    const to = this.scene, from = this.sounded;
    if (to === from) return; // went over a boundary and came straight back: stay quiet
    this.sounded = to;
    this.newCue();
    const t = c.currentTime + 0.02;
    if (to > from) this.forward(to, t);
    else this.back(to, t);
  }

  private forward(to: number, t: number) {
    switch (to) {
      case 1: // the land: wind rises, a three-note flute call
        this.whoosh(t, 1.1, 0.07);
        [[4, 0], [7, 0.22], [9, 0.44]].forEach(([semi, at]) => this.flute(t + 0.15 + at, note(semi, 2), at === 0.44 ? 0.9 : 0.24, 0.11));
        return;
      case 2: // Hampi: a temple bell, and the flute answers
        this.bell(t, note(7, 1), 0.1, 3);
        [[12, 0, 0.26], [9, 0.28, 0.2], [7, 0.5, 0.9]].forEach(([semi, at, len]) => this.flute(t + 0.35 + at, note(semi, 2), len, 0.09));
        return;
      case 3: // the script: a soft high bell, then one long lamp-lit flute note
        this.bell(t, note(12, 2), 0.05, 2.5);
        this.flute(t + 0.3, note(9, 2), 1.3, 0.09);
        return;
      case 4: // Yakshagana: ghungroo jingling and a quick rising flute run
        this.ghungroo(t, 0.5, 0.05);
        [0, 2, 4, 7, 9].forEach((semi, k) => this.flute(t + 0.1 + k * 0.08, note(semi, 2), k === 4 ? 0.7 : 0.07, 0.08));
        this.ghungroo(t + 0.55, 0.35, 0.035);
        return;
      case 5: // Bengaluru: a bright flute call, two quick notes and a leap up
        [[12, 0, 0.1], [12, 0.16, 0.1], [16, 0.32, 0.9]].forEach(([semi, at, len]) => this.flute(t + 0.05 + at, note(semi, 2), len, 0.085));
        return;
      case 6: // the Koota: falling bells over a gentle swell, then a last flute note
        this.swell(t, [note(0), note(7), note(12)], 3.2, 0.05);
        [12, 9, 7, 4, 0].forEach((semi, k) => this.bell(t + 0.1 + k * 0.16, note(semi, 2), 0.06, 2.5));
        this.flute(t + 1.0, note(12, 2), 1.4, 0.08);
        return;
    }
  }

  /** scrolling back: one soft bell */
  private back(to: number, t: number) {
    this.bell(t, note([0, 4, 7, 12, 9, 7, 4][to] ?? 0, 2), 0.07, 2);
  }

  // ---- instruments ----
  private env(t: number, peak: number, attack: number, dur: number) {
    const g = (this.c as AudioContext).createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return g;
  }

  private bell(t: number, freq: number, gain: number, dur: number) {
    const c = this.c as AudioContext;
    const out = this.out(0.7);
    [[1, 1], [2.01, 0.5], [2.76, 0.32], [5.4, 0.16], [8.93, 0.08]].forEach(([ratio, amp], i) => {
      const osc = c.createOscillator();
      osc.frequency.value = freq * ratio;
      osc.connect(this.env(t, gain * amp, 0.004, dur / (1 + i * 0.7))).connect(out);
      osc.start(t);
      osc.stop(t + dur);
    });
  }

  private flute(t: number, freq: number, len: number, gain: number) {
    const c = this.c as AudioContext;
    const out = this.out(0.55);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.07);
    g.gain.setValueAtTime(gain, t + Math.max(0.08, len - 0.05));
    g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.25);
    g.connect(out);
    const lfo = c.createOscillator();
    lfo.frequency.value = 5.2;
    const depth = c.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(9, t + 0.4);
    lfo.connect(depth);
    for (const [type, amp] of [["sine", 1], ["triangle", 0.25]] as const) {
      const osc = c.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      depth.connect(osc.detune);
      const a = c.createGain();
      a.gain.value = amp;
      osc.connect(a).connect(g);
      osc.start(t);
      osc.stop(t + len + 0.3);
    }
    lfo.start(t);
    lfo.stop(t + len + 0.3);
    // breath
    const n = c.createBufferSource();
    n.buffer = this.noise;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq * 1.5;
    n.connect(bp).connect(this.env(t, gain * 0.25, 0.04, len + 0.2)).connect(out);
    n.start(t, Math.random());
    n.stop(t + len + 0.25);
  }

  /** ghungroo: a cluster of tiny bells jingling */
  private ghungroo(t: number, spread: number, gain: number) {
    const c = this.c as AudioContext;
    const out = this.out(0.5);
    for (let k = 0; k < 14; k++) {
      const at = t + Math.random() * spread;
      const freq = 3200 + Math.random() * 2600;
      for (const [ratio, amp] of [[1, 1], [1.53, 0.4]]) {
        const osc = c.createOscillator();
        osc.frequency.value = freq * ratio;
        osc.connect(this.env(at, gain * amp, 0.002, 0.12 + Math.random() * 0.12)).connect(out);
        osc.start(at);
        osc.stop(at + 0.3);
      }
    }
  }

  /** air moving past, rising */
  private whoosh(t: number, dur: number, gain: number) {
    const c = this.c as AudioContext;
    const n = c.createBufferSource();
    n.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.4;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(2800, t + dur * 0.7);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(g).connect(this.out(0.6));
    n.start(t, Math.random());
    n.stop(t + dur + 0.05);
  }

  /** a soft swell of pure tones under the finale */
  private swell(t: number, freqs: number[], dur: number, gain: number) {
    const c = this.c as AudioContext;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.out(0.7));
    for (const freq of freqs) for (const d of [-4, 4]) {
      const osc = c.createOscillator();
      osc.frequency.value = freq;
      osc.detune.value = d;
      osc.connect(g);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
  }
}
