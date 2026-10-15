// Brings the sound sorter to life. Every pose is a pure function of the time
// since the current reading started, so the tour, a tap and reduced motion all
// show the same machine. The SVG and SorterData come from the build script.
import { BOXES, READINGS, WORDS, scoreReading, type Score } from "./model";

export interface SorterData {
  basis: { x: number[]; y: number[]; z: number[] };
  park: number;
  stops: number[];
  top: number;
  blockH: number;
  spoutTip: number;
  holeDepth: number;
  hatPivot: number[];
  needle: { cx: number; cy: number };
  cable: { name: string; chunks: number };
  blocks: { hole: number; ipa: string; shape: string }[];
}

export type Phase = "recording" | "sending" | "listening" | "sorting" | "judging" | "returning" | "speaking" | "clearing";

export interface SorterInfo {
  reading: number;
  said: string;
  phase: Phase;
  score: Score;
  /** True once the feedback has been spoken in this reading. */
  spoken: boolean;
  readout: string;
}

interface Options {
  /** Called when the reading or its phase changes. */
  onChange?: (info: SorterInfo) => void;
  /** An element to write the short readout into. */
  readout?: HTMLElement | null;
}

// Seconds. One reading takes about 16 s.
const T = { rec: 1.4, send: 0.75, listen: 0.75, first: 0.65, travel: 0.38, drop: 0.46, home: 1.1, judge: 1.1, back: 0.75, speak: 2.2, hold: 2, clear: 0.9 };
const GRAVITY = 460; // world units / s², so a block falls the 11 units to the board in about 0.22 s
const SNR_ANGLE = 11; // the needle's angle for a quiet room, about 24 dB on a 0 to 40 dB scale
const IDLE_ANGLE = -55;

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

interface Times {
  send: number;
  listen: number;
  sort: number;
  arrive: number[];
  judge: number;
  back: number;
  speak: number;
  clear: number;
  end: number;
}
function timesOf(): Times {
  const send = T.rec;
  const listen = send + T.send;
  const sort = listen + T.listen;
  const arrive: number[] = [];
  let at = sort + T.first;
  BOXES.forEach(() => {
    arrive.push(at);
    at += T.drop + T.travel;
  });
  const judge = arrive[arrive.length - 1] + T.drop;
  const back = judge + T.judge;
  const speak = back + T.back;
  const clear = speak + T.speak + T.hold;
  return { send, listen, sort, arrive, judge, back, speak, clear, end: clear + T.clear };
}
const TIMES = timesOf();

/** The block's height (its bottom) and whether it has landed, `age` seconds after it starts to fall. */
function fallOf(age: number, fits: boolean, top: number, blockH: number, tip: number) {
  const land = fits ? top - blockH : top;
  const drop = tip - land;
  const tFall = Math.sqrt((2 * drop) / GRAVITY);
  if (age < tFall) return { z: tip - 0.5 * GRAVITY * age * age, landed: false };
  const after = age - tFall;
  if (fits) return { z: land - 0.8 * Math.exp(-after * 18) * Math.sin(Math.min(Math.PI, after * 26)), landed: true };
  // A wrong block bounces twice on the rim before it settles.
  const hops = [
    [0.16, 1.8],
    [0.1, 0.6],
  ];
  let t = after;
  for (const [d, h] of hops) {
    if (t < d) return { z: land + 4 * h * (t / d) * (1 - t / d), landed: true };
    t -= d;
  }
  return { z: land, landed: true };
}

/** The head's x and how far through a step it is (for its bob), at time t. */
function headAt(t: number, data: SorterData) {
  const { arrive, sort, judge } = TIMES;
  if (t < sort) return { x: data.park, walk: 0 };
  if (t >= judge) {
    // Home again once the last block is down, so the whole board shows while it is judged.
    const u = smooth(judge, judge + T.home, t);
    const from = data.stops[data.stops.length - 1];
    const steps = 3;
    return { x: from + (data.park - from) * u, walk: t < judge + T.home ? (((t - judge) / T.home) * steps) % 1 : 0 };
  }
  for (let i = 0; i < arrive.length; i++) {
    const start = i === 0 ? sort : arrive[i - 1] + T.drop;
    if (t < arrive[i]) {
      const from = i === 0 ? data.park : data.stops[i - 1];
      const u = smooth(start, arrive[i], t);
      return { x: from + (data.stops[i] - from) * u, walk: (t - start) / (arrive[i] - start) };
    }
    if (t < arrive[i] + T.drop) return { x: data.stops[i], walk: 0 };
  }
  return { x: data.stops[data.stops.length - 1], walk: 0 };
}

function phaseAt(t: number): Phase {
  const { send, listen, sort, judge, back, speak, clear } = TIMES;
  if (t < send) return "recording";
  if (t < listen) return "sending";
  if (t < sort) return "listening";
  if (t < judge) return "sorting";
  if (t < back) return "judging";
  if (t < speak) return "returning";
  if (t < clear) return "speaking";
  return "clearing";
}

const NAMES = ["one", "two", "three", "four"];

function readoutAt(t: number, reading: number, score: Score): string {
  const phase = phaseAt(t);
  const heard = READINGS[reading].heard;
  switch (phase) {
    case "recording":
      return `${reading + 1} of ${READINGS.length} · “${READINGS[reading].said}”`;
    case "sending":
      return "sending 16 kHz audio";
    case "listening":
      return "cleaning up noise";
    case "sorting": {
      let i = 0;
      while (i < TIMES.arrive.length - 1 && t >= TIMES.arrive[i + 1]) i++;
      if (t < TIMES.arrive[0]) return "lining up the sounds";
      const box = BOXES[i];
      const word = WORDS[box.word].text;
      return heard[i] === box.ipa ? `${word} · sound ${box.index + 1} fits` : `${word} · ${heard[i]} for ${box.ipa} · stuck`;
    }
    case "judging": {
      const flagged = score.words.find((word) => word.clear);
      if (flagged) return `${flagged.text} · ${flagged.errors} of ${flagged.total} sounds wrong`;
      return `${score.errors} of ${BOXES.length} sounds wrong`;
    }
    case "returning":
      return "sending the feedback back";
    case "speaking":
      return score.focus ? `names the ${score.focus} in ${score.words.find((word) => word.clear)?.text}` : `says “${score.says}”`;
    default:
      return `next: reading ${NAMES[(reading + 1) % READINGS.length]}`;
  }
}

export interface SorterControls {
  /** Start a reading from the beginning. */
  play: (reading: number) => void;
  /** Stop the loop and remove the listeners. */
  destroy: () => void;
}

export function mountSoundSorter(stage: HTMLElement, data: SorterData, options: Options = {}): SorterControls {
  const svg = stage.querySelector("svg");
  if (!svg) return { play: () => {}, destroy: () => {} };
  const $ = <E extends Element = SVGGElement>(sel: string) => svg.querySelector<E>(sel);
  const $$ = <E extends Element = SVGGElement>(sel: string) => [...svg.querySelectorAll<E>(sel)];
  const at = (x: number, y: number, z: number) => [x * data.basis.x[0] + y * data.basis.y[0] + z * data.basis.z[0], x * data.basis.x[1] + y * data.basis.y[1] + z * data.basis.z[1]];
  const move = (x: number, y: number, z: number) => {
    const [sx, sy] = at(x, y, z);
    return `translate(${sx.toFixed(2)} ${sy.toFixed(2)})`;
  };

  const el = {
    head: $('[data-part="head"]'),
    column: $('[data-part="column"]'),
    bob: $('[data-part="bob"]'),
    hat: $('[data-part="hat"]'),
    needle: $('[data-part="needle"]'),
    grille: $('[data-part="grille"]'),
    lamp: $(".ss-lamp"),
    led: $('[data-led="jbox"]'),
    rec: $(".ss-rec"),
    mic: $('[data-part="mic"]'),
    say: $<SVGTextElement>('[data-part="say"]'),
    chips: $$("[data-chip]"),
    lamps: $$("[data-lamp]"),
    flags: $$("[data-flag]"),
    holes: $$("[data-hole]"),
    blocks: $$("[data-block]"),
    voice: $$('[data-part="voice-rings"] [data-ring]'),
    horn: $$('[data-part="horn-rings"] [data-ring]'),
    cable: $$(`[data-route="${data.cable.name}"]`).sort((a, b) => Number(a.dataset.chunk) - Number(b.dataset.chunk)),
  };
  const blockOf = new Map<string, SVGGElement>();
  for (const g of el.blocks) blockOf.set(`${g.dataset.block}:${g.dataset.ipa}`, g);
  const solidOf = new Map<SVGGElement, Element | null>(el.blocks.map((g) => [g, g.querySelector(".iso-solid")]));
  const moverOf = new Map<SVGGElement, Element | null>(el.blocks.map((g) => [g, g.querySelector("[data-move]")]));

  // Write only what changed, since most frames change a handful of attributes.
  const last = new Map<Element, Map<string, string | null>>();
  const set = (node: Element | null | undefined, name: string, value: string | null) => {
    if (!node) return;
    let memo = last.get(node);
    if (!memo) last.set(node, (memo = new Map()));
    if (memo.get(name) === value) return;
    memo.set(name, value);
    if (value === null) node.removeAttribute(name);
    else node.setAttribute(name, value);
  };
  const style = (node: Element | null | undefined, name: "display" | "opacity", value: string) => {
    if (!node) return;
    let memo = last.get(node);
    if (!memo) last.set(node, (memo = new Map()));
    const key = `style:${name}`;
    if (memo.get(key) === value) return;
    memo.set(key, value);
    (node as SVGElement).style.setProperty(name, value);
  };

  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reading = 0;
  let score = scoreReading(READINGS[0].heard);
  let clock = still.matches ? TIMES.speak + T.speak : 0;
  let frame = 0;
  let lastNow = 0;
  let visible = false;
  let lastInfo = "";

  function pose(t: number) {
    const heard = READINGS[reading].heard;
    const calm = still.matches;

    // The head walks the rail and bobs once per step; the hat wobbles as it goes.
    const head = headAt(t, data);
    const bob = head.walk > 0 && !calm ? 1.6 * Math.sin(Math.PI * clamp(head.walk)) : 0;
    set(el.head, "transform", move(head.x, 0, 0));
    set(el.column, "transform", move(head.x, 0, 0));
    set(el.bob, "transform", bob ? move(0, 0, bob) : null);
    const great = score.says === "Great job!";
    const hop = great && !calm && t > TIMES.speak ? hopOf(t - TIMES.speak) : 0;
    const wobble = head.walk > 0 && !calm ? 5 * Math.sin(2 * Math.PI * clamp(head.walk)) : 0;
    const [px, py] = data.hatPivot;
    const hatMove = hop ? move(0, 0, hop) : "";
    set(el.hat, "transform", hatMove || wobble ? `${hatMove} rotate(${wobble.toFixed(2)} ${px} ${py})`.trim() : null);

    // Recording lights the record button and the mic on the screen, and rings the voice in.
    const recording = t < TIMES.send;
    set(el.rec, "data-on", recording ? "" : null);
    set(el.mic, "data-on", recording ? "" : null);
    el.voice.forEach((ring, i) => style(ring, "opacity", recording && !calm ? ringOpacity(t * 1.5 - i * 0.3, smooth(0, 0.2, t) * (1 - smooth(TIMES.send - 0.25, TIMES.send, t))) : "0"));

    // A pulse runs along the socket cable to the junction box, then back with the feedback.
    let pulse = -9;
    if (t >= TIMES.send && t < TIMES.listen) pulse = ((t - TIMES.send) / T.send) * (data.cable.chunks + 2) - 1;
    if (t >= TIMES.back && t < TIMES.speak) pulse = data.cable.chunks + 1 - ((t - TIMES.back) / T.back) * (data.cable.chunks + 2);
    el.cable.forEach((chunk, i) => set(chunk, "data-hot", !calm && Math.abs(i - pulse) < 1.4 ? "" : null));
    set(el.led, "data-on", t >= TIMES.listen - 0.15 && t < TIMES.back + 0.2 ? "" : null);

    // Listening lights the lamp and the grille and swings the noise meter.
    const listening = t >= TIMES.listen && t < TIMES.judge;
    set(el.lamp, "data-on", listening ? "" : null);
    set(el.grille, "data-on", t >= TIMES.listen && t < TIMES.sort ? "" : null);
    const sweep = smooth(TIMES.listen, TIMES.listen + 0.5, t) * (1 - smooth(TIMES.clear, TIMES.clear + 0.6, t));
    const jitter = listening && !calm ? 2.2 * Math.sin(t * 23) * Math.sin(t * 7.1) : 0;
    const angle = IDLE_ANGLE + (SNR_ANGLE - IDLE_ANGLE) * sweep + jitter;
    set(el.needle, "transform", `rotate(${angle.toFixed(2)} ${data.needle.cx} ${data.needle.cy})`);

    // Each block falls from the spout as the head arrives over its box.
    const fade = 1 - smooth(TIMES.clear, TIMES.clear + 0.5, t);
    const wanted = new Set<SVGGElement>();
    BOXES.forEach((box, i) => {
      const ipa = heard[i];
      const g = blockOf.get(`${i}:${ipa}`);
      const hole = el.holes[i];
      const start = TIMES.arrive[i] + 0.04;
      if (!g || t < start || fade <= 0) {
        set(hole, "data-state", null);
        return;
      }
      wanted.add(g);
      const fits = ipa === box.ipa;
      const fall = fallOf(t - start, fits, data.top, data.blockH, data.spoutTip);
      const sink = fits ? (1 - fade) * 3 : -(1 - fade) * 4;
      const z = fall.z - sink;
      style(g, "display", "inline");
      style(g, "opacity", fade < 1 ? fade.toFixed(3) : "1");
      set(moverOf.get(g), "transform", move(data.stops[i], 0, z));
      set(g, "clip-path", z < data.top - 0.01 ? `url(#ss-sink-${i})` : null);
      set(solidOf.get(g), "data-lit", fall.landed ? null : "");
      const state = fall.landed ? (fits ? "fit" : "stuck") : null;
      set(g, "data-state", state);
      // Seated flush, a block that fits shows only its top, like a plug in the hole.
      set(g, "data-seated", fits && fall.landed && Math.abs(z - (data.top - data.blockH)) < 0.25 ? "" : null);
      set(hole, "data-state", state);
    });
    for (const g of el.blocks) if (!wanted.has(g)) style(g, "display", "none");

    // Judging pops a flag up behind each clearly wrong word and lights the word lamps.
    score.words.forEach((word, w) => {
      const flag = el.flags[w];
      const age = t - (TIMES.judge + 0.1);
      const down = smooth(TIMES.clear, TIMES.clear + 0.4, t);
      if (!word.clear || age < 0 || down >= 1) {
        style(flag, "display", "none");
        return;
      }
      const rise = calm ? 0 : -12 * Math.exp(-age * 6) * Math.cos(age * 13);
      style(flag, "display", "inline");
      style(flag, "opacity", (smooth(0, 0.08, age) * (1 - down)).toFixed(3));
      set(flag.querySelector("[data-move]"), "transform", move(0, 0, rise - 12 * down));
    });
    el.lamps.forEach((lamp, i) => set(lamp, "data-band", t >= TIMES.judge + 0.15 * i && t < TIMES.clear ? score.words[i].band : null));

    // Speaking rings the horn, colours the screen's words and shows the spoken line.
    const speaking = t >= TIMES.speak && t < TIMES.speak + T.speak;
    el.horn.forEach((ring, i) => style(ring, "opacity", speaking && !calm ? ringOpacity((t - TIMES.speak) * 1.4 - i * 0.28, 1 - smooth(TIMES.speak + T.speak - 0.4, TIMES.speak + T.speak, t)) : "0"));
    el.chips.forEach((chip, i) => set(chip, "data-band", t >= TIMES.speak + 0.08 * i && t < TIMES.clear ? score.words[i].band : null));
    const line = t >= TIMES.speak && t < TIMES.clear ? score.short : "";
    if (el.say && el.say.textContent !== line) el.say.textContent = line;

    // The readout and the page's callback.
    const text = readoutAt(t, reading, score);
    if (options.readout && options.readout.textContent !== text) options.readout.textContent = text;
    const phase = phaseAt(t);
    const key = `${reading}:${phase}`;
    if (key !== lastInfo) {
      lastInfo = key;
      options.onChange?.({ reading, said: READINGS[reading].said, phase, score, spoken: t >= TIMES.speak, readout: text });
    }
  }

  function start(next: number) {
    reading = ((next % READINGS.length) + READINGS.length) % READINGS.length;
    score = scoreReading(READINGS[reading].heard);
    clock = still.matches ? TIMES.speak + T.speak : 0;
    pose(clock);
    run();
  }

  function tick(now: number) {
    const dt = lastNow ? Math.min((now - lastNow) / 1000, 1 / 30) : 1 / 60;
    lastNow = now;
    if (!still.matches) {
      clock += dt;
      if (clock >= TIMES.end) {
        start(reading + 1);
        return;
      }
    }
    pose(clock);
    frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
  }
  function run() {
    if (!frame && visible && !still.matches) {
      lastNow = 0;
      frame = requestAnimationFrame(tick);
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) run();
    },
    { rootMargin: "120px 0px" },
  );
  observer.observe(stage);

  const onClick = () => start(reading + 1);
  const onKey = (event: KeyboardEvent) => {
    let next: number | null = null;
    if (event.key === " " || event.key === "Enter" || event.key === "ArrowRight") next = reading + 1;
    if (event.key === "ArrowLeft") next = reading - 1;
    if (/^[1-4]$/.test(event.key)) next = Number(event.key) - 1;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = READINGS.length - 1;
    if (next === null) return;
    event.preventDefault();
    start(next);
  };
  const onMotion = () => start(reading);
  stage.addEventListener("click", onClick);
  stage.addEventListener("keydown", onKey);
  still.addEventListener("change", onMotion);
  pose(clock);

  return {
    play: start,
    destroy: () => {
      cancelAnimationFrame(frame);
      frame = 0;
      observer.disconnect();
      stage.removeEventListener("click", onClick);
      stage.removeEventListener("keydown", onKey);
      still.removeEventListener("change", onMotion);
    },
  };
}

/** A ring that swells and fades once per cycle; `gain` fades the whole set in and out. */
function ringOpacity(phase: number, gain: number): string {
  if (phase < 0) return "0";
  const f = phase % 1;
  return (gain * Math.sin(Math.PI * f) * 0.85).toFixed(3);
}

/** The hat's celebratory hop, up 9 units and down and then a smaller one, like the mascot's. */
function hopOf(age: number): number {
  const hops = [
    [0.42, 9],
    [0.26, 2.6],
  ];
  let t = age - 0.15;
  if (t < 0) return 0;
  for (const [d, h] of hops) {
    if (t < d) return 4 * h * (t / d) * (1 - t / d);
    t -= d;
  }
  return 0;
}
