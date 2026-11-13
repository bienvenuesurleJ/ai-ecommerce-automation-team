export type SoundKind = "start" | "done" | "notify" | "transmit" | "alert" | "approve";

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0) {
  const audio = ac();
  if (!audio) return;
  const t = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp);
  amp.connect(audio.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sound = {
  play(kind: SoundKind) {
    if (kind === "start") {
      tone(220, 0.12, "triangle", 0.05, 0);
      tone(330, 0.12, "triangle", 0.05, 0.1);
      tone(440, 0.18, "triangle", 0.06, 0.2);
    } else if (kind === "done") {
      tone(660, 0.14, "sine", 0.05);
      tone(880, 0.18, "sine", 0.04, 0.08);
    } else if (kind === "notify") {
      tone(520, 0.09, "sine", 0.04);
    } else if (kind === "transmit") {
      const audio = ac();
      if (!audio) return;
      const osc = audio.createOscillator();
      const amp = audio.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(280, audio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(760, audio.currentTime + 0.18);
      amp.gain.setValueAtTime(0.04, audio.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.22);
      osc.connect(amp);
      amp.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + 0.24);
    } else if (kind === "alert") {
      tone(146, 0.2, "square", 0.03);
      tone(110, 0.22, "square", 0.03, 0.12);
    } else if (kind === "approve") {
      tone(784, 0.1, "triangle", 0.05);
      tone(1046, 0.16, "triangle", 0.05, 0.09);
    }
  },
};
