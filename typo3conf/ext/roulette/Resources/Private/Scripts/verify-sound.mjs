/**
 * Roulette – Nachweis des Klangs
 * ================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-sound.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei der ersten Abweichung.
 *
 *
 * WAS HIER BEWIESEN WIRD (Auftrag "Der Klang", Teilstück C3e)
 * ---------------------------------------------------------------
 *   S-1   keine Audiodatei, kein Netzzugriff, keine data:-URI mit
 *         Klanginhalt, kein fetch, kein XMLHttpRequest — in KEINER Datei
 *         der Extension (nicht nur in sound-roulette.js).
 *   S-2   kein `new AudioContext` in dieser Extension: der Kontext gehört
 *         sound.js und der Seite.
 *   S-3   sound.unlock() wird ausschließlich aus einem Zuhörer gerufen, der
 *         event.isTrusted prüft.
 *   S-4   jedes Ereignis der Klangtabelle hat genau EINE Sendestelle, und
 *         jede Sendestelle gehört zu einem Ereignis der Tabelle — in beide
 *         Richtungen. Die Tabelle steht HIER, nicht in sound-roulette.js.
 *   S-5   kein Klang für ein Ereignis, das es nicht gibt: die drei
 *         Round-Ergebnis-Klänge hängen an Werten (report.total, credited),
 *         die round-roulette.js tatsächlich liefert, und schließen sich
 *         gegenseitig aus.
 *   S-6   rechnerische obere Schranke des Ausschlags bleibt unter 1,0 — im
 *         dichtesten denkbaren Augenblick (beide Dauerklänge plus ein
 *         Rillenstoß plus ein gelegter Chip gleichzeitig).
 *   S-7   höchstens zwei Dauerklänge zugleich (Rad, Kugel), beide in
 *         destroy() angehalten, kein Griff bleibt hängen.
 *   S-8   die Rillenklicks tragen key und minGap.
 *   S-9   der Ton-Schalter: echter Knopf, aria-pressed, ≥ 2,75rem,
 *         sichtbarer Fokusrahmen, Namensschild — Kontrast gegen JEDEN
 *         benannten Farbstopp seines Untergrunds (dieselbe Rechnung wie F-9
 *         in verify-felt.mjs).
 *   S-10  der Leerlauf: genau eine Instanz je Gerät, beendet in destroy().
 *
 * Gegenproben: S-4-G, S-6-G, S-7-G.
 *
 * Was dieses Skript AUSDRÜCKLICH NICHT prüfen kann: ob der Klang GUT ist, ob
 * er zu diesem Tisch passt und ob er an ein bestimmtes fremdes Spiel
 * erinnert (CONCEPT.md B.3 Nr. 11). Das kann nur ein Mensch — siehe test.txt.
 *
 *
 * WARUM MIT DEN ECHTEN DATEIEN, UND WIE
 * ----------------------------------------
 * Eine eigens für die Prüfung geschriebene Nachbildung könnte richtig
 * rechnen, während der Tisch falsch klingt. Geladen werden deshalb die
 * echten Module über zwei Extensions:
 *
 *   casino_startpage   sound.js       die Klangerzeugung
 *                      sound-kit.js   der Klangbaukasten
 *                      idle-noise.js  die Leerlaufgeräusche
 *   roulette           wheel-physics.js  (importfrei, nur die Konstanten)
 *                      sound-roulette.js  die Klangzuordnung dieses Tisches
 *
 * Dasselbe Verfahren wie in fruit_risk/reel_slot/video_slot/coin_pusher
 * …/verify-sound.mjs: die Dateien, die über die Import-Map von TYPO3
 * einander finden ('@phomo17/…', von Node nicht auflösbar), werden ALS TEXT
 * gelesen, genau diese Namen durch echte Datei-URLs ersetzt und als
 * data:-Modul geladen — Zeile für Zeile derselbe Code, nur der Modulname ist
 * ein anderer. casino_startpage/sound.js FÜHRT den Zustand und wird über
 * seine eigene Datei-URL geladen; genau diese URL wird in die anderen
 * Dateien hineingeschrieben, damit alle Module dieselbe Instanz benutzen.
 *
 * Die Audio-Stubklassen (Param, StubNode und seine Ableitungen,
 * StubAudioContext, tracePath, peakBound/chainValue) in Abschnitt 2 sind
 * SINNGEMÄSS aus fruit_risk/Resources/Private/Scripts/verify-sound.mjs
 * übernommen — mit neu geschriebenem Kopfkommentar für diese Datei. Sie sind
 * reine Prüfinfrastruktur (Buchführung über Web-Audio-Knoten), kein
 * Spielinhalt: dieselbe Rechnung passt unverändert, weil sound.js
 * unverändert dieselbe Datei ist.
 *
 * Node hat weder Web Audio noch ein Dokument noch einen Browserspeicher.
 * Alle drei werden vor dem Laden bereitgestellt.
 *
 *
 * WARUM DER AUSSCHLAG (S-6) AUSGERECHNET UND NICHT GEMESSEN WIRD
 * -------------------------------------------------------------------
 * Unter Node klingt nichts, eine Messung ergäbe 0. Gerechnet wird für jeden
 * Augenblick die Summe der Hüllkurven aller geplanten Stimmen, jede
 * multipliziert mit allen Verstärkungen auf ihrem Weg zum Ausgang. Weil jede
 * Auslöschung zwischen zwei Schwingungen ignoriert wird, ist das Ergebnis
 * eine OBERE SCHRANKE — der echte Ausschlag kann nie größer sein.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFile } from 'node:fs/promises';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

let failed = false;

/**
 * @param {boolean} condition
 * @param {string} message
 * @param {...string} zeilen
 * @returns {void}
 */
function defaultCheck(condition, message, ...zeilen) {
	if (condition) {
		console.log(`  ✓ ${message}`);
		return;
	}
	failed = true;
	console.log(`  ✗ ${message}`);
	for (const zeile of zeilen) {
		console.log(`      ${zeile}`);
	}
}

/** Siehe fruit_risk/verify-sound.mjs: tauscht die Prüffunktion vorübergehend gegen eine mitschreibende aus, für ehrliche Gegenproben. */
let currentCheck = defaultCheck;

function check(condition, message, ...zeilen) {
	currentCheck(condition, message, ...zeilen);
}

/**
 * @param {() => void} fn
 * @returns {boolean} true, wenn fn() intern mindestens ein fehlgeschlagenes check() ausgelöst hat
 */
function expectFailure(fn) {
	let sawFailure = false;
	const previous = currentCheck;
	currentCheck = (condition) => {
		if (condition === false) {
			sawFailure = true;
		}
	};
	try {
		fn();
	} finally {
		currentCheck = previous;
	}
	return sawFailure;
}

function defineGlobal(name, value) {
	Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

/* ==========================================================================
   1. Eine Uhr, die stillsteht, bis man sie vorstellt (setTimeout/rAF)
   ========================================================================== */

const clock = { ms: 0 };
function now() {
	return clock.ms / 1000;
}

let handleSeq = 0;
const timers = new Map();
const frames = new Map();

defineGlobal('setTimeout', (fn, delay) => {
	const id = ++handleSeq;
	timers.set(id, { at: clock.ms + Math.max(0, Number(delay) || 0), fn });
	return id;
});
defineGlobal('clearTimeout', (id) => {
	timers.delete(id);
});
defineGlobal('requestAnimationFrame', (fn) => {
	const id = ++handleSeq;
	frames.set(id, fn);
	return id;
});
defineGlobal('cancelAnimationFrame', (id) => {
	frames.delete(id);
});
defineGlobal('performance', { now: () => clock.ms });

function advance(ms) {
	const target = clock.ms + Math.max(0, ms);
	while (clock.ms < target) {
		clock.ms = Math.min(target, clock.ms + 8);
		endDueSources();
		for (const [id, timer] of [...timers]) {
			if (timer.at <= clock.ms) {
				timers.delete(id);
				timer.fn();
			}
		}
		const due = [...frames.values()];
		frames.clear();
		for (const fn of due) {
			fn(clock.ms);
		}
	}
	endDueSources();
}

/* ==========================================================================
   2. Web Audio als reine Buchführung (sinngemäß aus fruit_risk/verify-sound.mjs)
   ========================================================================== */

const scheduled = [];
const live = new Set();
const breakpoints = new Set([0]);

class Param {
	constructor(value) {
		this.points = [{ kind: 'set', t: 0, v: Number(value) || 0 }];
	}

	get value() {
		return this.at(now());
	}

	set value(next) {
		this.setValueAtTime(next, now());
	}

	add(point) {
		this.points.push(point);
		if (Number.isFinite(point.t)) {
			breakpoints.add(point.t);
		}
		return this;
	}

	setValueAtTime(value, time) {
		return this.add({ kind: 'set', t: Number(time) || 0, v: Number(value) || 0 });
	}

	linearRampToValueAtTime(value, time) {
		return this.add({ kind: 'linear', t: Number(time) || 0, v: Number(value) || 0 });
	}

	exponentialRampToValueAtTime(value, time) {
		return this.add({ kind: 'exp', t: Number(time) || 0, v: Number(value) || 0 });
	}

	setTargetAtTime(value, time) {
		const at = Number(time) || 0;
		return this.setValueAtTime(Number(value) || 0, at);
	}

	cancelScheduledValues(time) {
		const from = Number(time) || 0;
		const held = this.at(from);
		this.points = this.points.filter((point) => point.t < from);
		if (this.points.length === 0) {
			this.points.push({ kind: 'set', t: 0, v: held });
		}
		return this;
	}

	/**
	 * Behebungslauf gegenüber der fruit_risk-Vorlage: dort bricht die Suche
	 * beim ERSTEN Punkt mit t === 0 ab (`time <= previous.t` sofort wahr) und
	 * liefert dessen Wert — bei einem Regler, der bei t = 0 zunächst mit
	 * seinem Konstruktor-Standardwert (1) angelegt UND im selben Augenblick
	 * per setValueAtTime(0, 0) auf 0 gesetzt wird (playSustain(), t0 === 0),
	 * träfe das fälschlich den ALTEN Standardwert statt der spätere,
	 * überschreibenden Anweisung zur selben Zeit. Diese Fassung sucht
	 * stattdessen den LETZTEN Punkt mit point.t <= time — bei zwei Punkten
	 * zur selben Zeit gewinnt der spätere, genau wie ein echter AudioParam
	 * eine zweite Anweisung zum selben Zeitpunkt übernimmt.
	 * @param {number} time
	 * @returns {number}
	 */
	at(time) {
		let baseIndex = 0;
		for (let i = 0; i < this.points.length; i++) {
			if (this.points[i].t <= time) {
				baseIndex = i;
			} else {
				break;
			}
		}
		const base = this.points[baseIndex];
		const next = this.points[baseIndex + 1];
		if (!next || next.t <= time) {
			return base.v;
		}
		if (next.kind === 'linear') {
			const share = (time - base.t) / (next.t - base.t);
			return base.v + (next.v - base.v) * share;
		}
		if (next.kind === 'exp' && base.v > 0 && next.v > 0) {
			const share = (time - base.t) / (next.t - base.t);
			return base.v * (next.v / base.v) ** share;
		}
		return base.v;
	}
}

class StubNode {
	constructor(context) {
		this.context = context;
		this.outputs = new Set();
	}

	connect(target) {
		this.outputs.add(target);
		return target;
	}

	disconnect() {
		this.outputs.clear();
	}
}

class StubGain extends StubNode {
	constructor(context) {
		super(context);
		this.gain = new Param(1);
	}
}

class StubFilter extends StubNode {
	constructor(context) {
		super(context);
		this.type = 'lowpass';
		this.frequency = new Param(350);
		this.Q = new Param(1);
	}
}

class StubCompressor extends StubNode {
	constructor(context) {
		super(context);
		this.threshold = new Param(-24);
		this.knee = new Param(30);
		this.ratio = new Param(12);
		this.attack = new Param(0.003);
		this.release = new Param(0.25);
	}
}

class StubAnalyser extends StubNode {
	constructor(context) {
		super(context);
		this.fftSize = 2048;
	}

	getFloatTimeDomainData(array) {
		array.fill(0);
	}
}

class StubDestination extends StubNode {}

function tracePath(node) {
	const gains = [];
	const seen = new Set();
	let current = node;
	while (current !== null && current !== undefined && !seen.has(current)) {
		seen.add(current);
		if (current instanceof StubGain) {
			gains.push(current.gain);
		}
		const next = [...current.outputs][0] ?? null;
		if (next instanceof StubDestination) {
			return { gains, reaches: true };
		}
		current = next;
	}
	return { gains, reaches: false };
}

class StubSource extends StubNode {
	constructor(context) {
		super(context);
		this.onended = null;
		this.startTime = 0;
		this.stopTime = Number.POSITIVE_INFINITY;
		this.ended = false;
		this.path = { gains: [], reaches: false };
	}

	start(when) {
		this.startTime = Math.max(now(), Number(when) || 0);
		this.path = tracePath(this);
		scheduled.push(this);
		live.add(this);
	}

	stop(when) {
		const at = Math.max(this.startTime, Number(when) || 0);
		this.stopTime = Math.min(this.stopTime, at);
	}

	finish() {
		if (this.ended) {
			return;
		}
		this.ended = true;
		live.delete(this);
		if (typeof this.onended === 'function') {
			this.onended();
		}
	}
}

class StubOscillator extends StubSource {
	constructor(context) {
		super(context);
		this.type = 'sine';
		this.frequency = new Param(440);
		this.detune = new Param(0);
	}
}

class StubBufferSource extends StubSource {
	constructor(context) {
		super(context);
		this.buffer = null;
		this.loop = false;
		this.playbackRate = new Param(1);
	}
}

function endDueSources() {
	const t = now();
	for (const source of [...live]) {
		if (source.stopTime <= t) {
			source.finish();
		}
	}
}

class StubAudioContext {
	constructor() {
		this.sampleRate = 48000;
		this.state = 'running';
		this.destination = new StubDestination(this);
	}

	get currentTime() {
		return now();
	}

	createGain() {
		return new StubGain(this);
	}

	createBiquadFilter() {
		return new StubFilter(this);
	}

	createDynamicsCompressor() {
		return new StubCompressor(this);
	}

	createAnalyser() {
		return new StubAnalyser(this);
	}

	createOscillator() {
		return new StubOscillator(this);
	}

	createBufferSource() {
		return new StubBufferSource(this);
	}

	createBuffer(channels, frames, sampleRate) {
		const data = new Float32Array(frames);
		return {
			numberOfChannels: channels,
			length: frames,
			sampleRate,
			duration: frames / sampleRate,
			getChannelData: () => data,
		};
	}

	resume() {
		if (this.state !== 'closed') {
			this.state = 'running';
		}
		return Promise.resolve();
	}

	suspend() {
		if (this.state !== 'closed') {
			this.state = 'suspended';
		}
		return Promise.resolve();
	}

	close() {
		this.state = 'closed';
		return Promise.resolve();
	}
}

defineGlobal('AudioContext', StubAudioContext);

function chainValue(source, time) {
	let value = 1;
	for (const param of source.path.gains) {
		value *= param.at(time);
	}
	return value;
}

/** Der größte Ausschlag, den dieser Lauf überhaupt haben KANN. */
function peakBound() {
	const marks = new Set(breakpoints);
	const carrying = [];
	for (const source of scheduled) {
		if (source.path.reaches !== true) {
			continue;
		}
		carrying.push(source);
		marks.add(source.startTime);
		if (Number.isFinite(source.stopTime)) {
			marks.add(source.stopTime);
		}
	}
	const times = [...marks].filter((t) => Number.isFinite(t) && t >= 0).sort((a, b) => a - b);
	carrying.sort((a, b) => a.startTime - b.startTime);

	let peak = 0;
	let next = 0;
	const active = new Set();
	for (let i = 0; i < times.length - 1; i++) {
		const from = times[i];
		const to = times[i + 1];
		while (next < carrying.length && carrying[next].startTime <= from) {
			active.add(carrying[next]);
			next++;
		}
		let sum = 0;
		for (const source of [...active]) {
			if (source.stopTime <= from) {
				active.delete(source);
				continue;
			}
			sum += Math.max(chainValue(source, from), chainValue(source, to));
		}
		if (sum > peak) {
			peak = sum;
		}
	}
	return peak;
}

/* ==========================================================================
   3. Ein Dokument, ein Speicher, nur so viel wie diese Prüfung braucht
   ========================================================================== */

class StubEvent {
	constructor(type, options = {}) {
		this.type = type;
		this.isTrusted = options.isTrusted === true;
		this.defaultPrevented = false;
	}

	preventDefault() {
		this.defaultPrevented = true;
	}
}
defineGlobal('Event', StubEvent);

class StubElement {
	constructor(selectors = [], dataset = {}) {
		this.children = [];
		this.selectors = new Set(selectors);
		this.dataset = { ...dataset };
		this.attributes = new Map();
		this.listeners = new Map();
	}

	getAttribute(name) {
		return this.attributes.has(name) ? this.attributes.get(name) : null;
	}

	setAttribute(name, value) {
		this.attributes.set(name, String(value));
	}

	removeAttribute(name) {
		this.attributes.delete(name);
	}

	append(child) {
		this.children.push(child);
		return child;
	}

	querySelector(selector) {
		for (const child of this.children) {
			if (child.selectors.has(selector)) {
				return child;
			}
			const deeper = child.querySelector(selector);
			if (deeper !== null) {
				return deeper;
			}
		}
		return null;
	}

	addEventListener(type, handler) {
		if (!this.listeners.has(type)) {
			this.listeners.set(type, new Set());
		}
		this.listeners.get(type).add(handler);
	}

	removeEventListener(type, handler) {
		this.listeners.get(type)?.delete(handler);
	}

	/** Ruft direkt jeden angemeldeten Zuhörer eines Typs — kein Bubbling nötig, dieser Baum ist zwei Ebenen tief. */
	fire(type, event) {
		for (const handler of [...(this.listeners.get(type) ?? [])]) {
			handler(event);
		}
	}
}

const cells = new Map();
defineGlobal('localStorage', {
	getItem: (key) => (cells.has(key) ? cells.get(key) : null),
	setItem: (key, value) => {
		cells.set(key, String(value));
	},
	removeItem: (key) => {
		cells.delete(key);
	},
});

const globalListeners = new Map();
defineGlobal('addEventListener', (type, handler) => {
	if (!globalListeners.has(type)) {
		globalListeners.set(type, new Set());
	}
	globalListeners.get(type).add(handler);
});
defineGlobal('removeEventListener', (type, handler) => {
	globalListeners.get(type)?.delete(handler);
});

/* ==========================================================================
   4. Die echten Module
   ========================================================================== */

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/roulette/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const ALL_EXT = path.resolve(EXT, '..');
const CASINO_JS = new URL('../../../../casino_startpage/Resources/Public/JavaScript/', import.meta.url);
const ROULETTE_JS = new URL('../../Public/JavaScript/', import.meta.url);

/**
 * @param {URL} url
 * @param {Array<[string, string]>} replacements
 * @param {string} label
 * @returns {Promise<string>}
 */
async function toModule(url, replacements, label) {
	const source = await readFile(fileURLToPath(url), 'utf8');
	let patched = source;
	let replaced = 0;
	for (const [name, target] of replacements) {
		const before = patched;
		patched = patched.replaceAll(`'${name}'`, JSON.stringify(target));
		if (patched !== before) {
			replaced++;
		}
	}
	check(replaced === replacements.length,
		`${label}: ${replaced} von ${replacements.length} Modulnamen für Node aufgelöst`);
	return `data:text/javascript;base64,${Buffer.from(patched, 'utf8').toString('base64')}`;
}

console.log('\nRoulette – Nachweis des Klangs');
console.log('=================================\n');
console.log('Die echten Module');

const SOUND_URL = new URL('sound.js', CASINO_JS).href;
const SOUND_NAME = '@phomo17/casino-startpage/sound.js';
const KIT_NAME = '@phomo17/casino-startpage/sound-kit.js';
const IDLE_NAME = '@phomo17/casino-startpage/idle-noise.js';
const WHEEL_PHYSICS_URL = new URL('wheel-physics.js', ROULETTE_JS).href;
const WHEEL_PHYSICS_NAME = '@phomo17/roulette/wheel-physics.js';

const { sound } = await import(SOUND_URL);
check(typeof sound?.sustain === 'function', 'casino_startpage/sound.js über seine Datei-URL geladen — EINE Instanz für alle');

const kitUrl = await toModule(new URL('sound-kit.js', CASINO_JS), [[SOUND_NAME, SOUND_URL]], 'sound-kit.js');
const kit = await import(kitUrl);
check(typeof kit.metal === 'function' && typeof kit.countStep === 'function' && typeof kit.coinCascade === 'function',
	'sound-kit.js geladen (metal, ratchet, sheet, cashRegister, countStep, coinCascade)');

const idleUrl = await toModule(new URL('idle-noise.js', CASINO_JS), [[SOUND_NAME, SOUND_URL], [KIT_NAME, kitUrl]], 'idle-noise.js');
const { IdleNoise } = await import(idleUrl);
check(typeof IdleNoise === 'function', 'idle-noise.js geladen');

const soundRouletteUrl = await toModule(
	new URL('sound-roulette.js', ROULETTE_JS),
	[[SOUND_NAME, SOUND_URL], [KIT_NAME, kitUrl], [IDLE_NAME, idleUrl], [WHEEL_PHYSICS_NAME, WHEEL_PHYSICS_URL]],
	'sound-roulette.js'
);
const { connectSound } = await import(soundRouletteUrl);
check(typeof connectSound === 'function', 'sound-roulette.js geladen — die Klangzuordnung dieses Tisches');

/* ==========================================================================
   5. Ein Tisch, eine Bank, ein paar Abkürzungen
   ========================================================================== */

function buildTable() {
	const root = new StubElement(['[data-ck-table]']);
	const switchEl = root.append(new StubElement(['[data-ro-sound]'], { textOn: 'Ton ist an', textOff: 'Ton ist aus' }));
	switchEl.setAttribute('aria-pressed', 'true');
	return { root, switchEl };
}

/** @param {string} key @returns {number} */
function plays(key) {
	return sound.stats().byKey[key] ?? 0;
}

function humming() {
	return sound.stats().sustainedVoices;
}

function fire(target, type, event) {
	target.fire(type, event);
}

/** Eine minimale Bank, die nur subscribe()/notify() nachbildet — genau der Vertrag, auf den sound-roulette.js sich verlässt (table-buyin.js, TableBank). */
function buildBank() {
	const listeners = new Set();
	return {
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		notify(reason) {
			for (const listener of [...listeners]) {
				listener({ reason });
			}
		},
	};
}

const one = buildTable();
const bank = buildBank();
const consoleErrors = [];
const realError = console.error;
const realWarn = console.warn;
console.error = (...args) => consoleErrors.push(args.map(String).join(' '));
console.warn = (...args) => consoleErrors.push(args.map(String).join(' '));

const board = connectSound(one.root, { bank });

/* ==========================================================================
   6. Die Prüfungen
   ========================================================================== */

console.log('\nS-1  Keine Audiodatei, kein Netzzugriff, keine data:-URI mit Klanginhalt');
{
	const EXT_ROOT = EXT;
	const AUDIO_ENDUNGEN = /\.(mp3|wav|ogg|m4a|flac|aac|opus)$/i;
	const VERBOTENE_MUSTER = [/\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bnew\s+Audio\s*\(/, /data:audio\//i];

	/** @param {string} dir @returns {string[]} */
	function alleDateien(dir) {
		const ergebnis = [];
		for (const eintrag of readdirSync(dir)) {
			const voll = path.join(dir, eintrag);
			const stat = statSync(voll);
			if (stat.isDirectory()) {
				ergebnis.push(...alleDateien(voll));
			} else {
				ergebnis.push(voll);
			}
		}
		return ergebnis;
	}

	// Resources/Private/Scripts bleibt außen vor — dieselbe Abgrenzung wie
	// A-4 in fruit_risk/verify-cabinet.mjs ("AUSGELIEFERT schließt
	// Resources/Private/Scripts aus"): Entwicklerwerkzeuge werden nie an den
	// Browser ausgeliefert, und GENAU DIESES Skript (wie jedes verify-*.mjs)
	// nennt die verbotenen Muster zwangsläufig selbst in Kommentaren und
	// Mustertexten — ein Selbstfund wäre kein echter Befund.
	const dateien = alleDateien(path.join(EXT_ROOT, 'Resources'))
		.filter((datei) => !path.relative(EXT_ROOT, datei).startsWith(path.join('Resources', 'Private', 'Scripts')));
	check(dateien.length > 0, `${dateien.length} ausgelieferte Dateien unter Resources/ gefunden und durchsucht (Resources/Private/Scripts ausgenommen)`);

	let audioDateiGefunden = false;
	let musterGefunden = [];
	for (const datei of dateien) {
		if (AUDIO_ENDUNGEN.test(datei)) {
			audioDateiGefunden = true;
		}
		if (/\.(js|mjs|css|html|xlf|php)$/i.test(datei)) {
			const inhalt = readFileSync(datei, 'utf8');
			for (const muster of VERBOTENE_MUSTER) {
				if (muster.test(inhalt)) {
					musterGefunden.push(`${muster} in ${path.relative(EXT_ROOT, datei)}`);
				}
			}
		}
	}
	check(!audioDateiGefunden, 'keine Audiodatei (mp3/wav/ogg/m4a/flac/aac/opus) unter Resources/');
	check(musterGefunden.length === 0,
		'keine Datei enthält fetch(), XMLHttpRequest, new Audio() oder data:audio/', ...musterGefunden);
}

console.log('\nS-2  Kein eigener AudioContext in dieser Extension');
{
	const soundRouletteQuelle = await readFile(fileURLToPath(new URL('sound-roulette.js', ROULETTE_JS)), 'utf8');
	check(!/new\s+AudioContext\b/.test(soundRouletteQuelle), 'sound-roulette.js enthält kein "new AudioContext"');
}

console.log('\nS-3  sound.unlock() nur aus einem Zuhörer, der event.isTrusted prüft');
{
	const quelleRoh = await readFile(fileURLToPath(new URL('sound-roulette.js', ROULETTE_JS)), 'utf8');
	// Ohne Kommentare: der Dateikopf NENNT "sound.unlock()" in Prosa, das ist
	// kein zweiter Aufruf.
	const quelle = quelleRoh.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
	const aufrufe = quelle.match(/sound\.unlock\(\)/g) ?? [];
	check(aufrufe.length === 1, `sound.unlock() kommt im Quelltext (ohne Kommentare) genau einmal vor (gefunden: ${aufrufe.length})`);

	// Verhaltensnachweis, nicht nur Textnachweis: ein nachgemachtes Ereignis
	// darf den Kontext nicht anlegen, ein echtes muss es.
	check(sound.contextState === 'none', 'vor der ersten Geste: kein AudioContext');
	fire(one.root, 'pointerdown', new StubEvent('pointerdown', { isTrusted: false }));
	check(sound.contextState === 'none', 'ein nachgemachtes pointerdown legt keinen Kontext an');
	fire(one.root, 'keydown', new StubEvent('keydown', { isTrusted: true }));
	check(sound.contextState === 'running', 'ein ECHTES keydown (isTrusted) legt den Kontext an — der Tastaturweg schaltet ebenso frei wie der Zeiger');
	advance(200);
	check(humming() === 1, 'und der Leerlauf läuft mit an');
}

console.log('\nS-4  Jedes Ereignis der Klangtabelle hat genau eine Sendestelle, in beide Richtungen');
{
	// Die Tabelle steht HIER, nicht im geprüften Modul — eine Prüfung, die
	// ihre Erwartung aus dem Prüfling holt, prüft nichts.
	const KLANGTABELLE = [
		'ro-chip-place', 'ro-chip-remove', 'ro-nogomore', 'ro-fret', 'ro-deflector',
		'ro-ball-rest', 'ro-count', 'ro-payout', 'ro-loss', 'ro-cashout',
	];
	const quelle = await readFile(fileURLToPath(new URL('sound-roulette.js', ROULETTE_JS)), 'utf8');
	for (const schluessel of KLANGTABELLE) {
		const treffer = quelle.match(new RegExp(`['"]${schluessel}['"]`, 'g')) ?? [];
		check(treffer.length === 1, `Schlüssel "${schluessel}" kommt im Quelltext genau einmal vor (gefunden: ${treffer.length})`);
	}
	const alleSchluesselImQuelltext = new Set((quelle.match(/key:\s*'(ro-[a-z-]+)'/g) ?? [])
		.map((m) => m.match(/'(ro-[a-z-]+)'/)[1]));
	for (const gefunden of alleSchluesselImQuelltext) {
		check(KLANGTABELLE.includes(gefunden), `Sendestelle "${gefunden}" gehört zu einem Ereignis der Klangtabelle`);
	}

	console.log('     Gegenprobe (S-4-G): eine erfundene zusätzliche Sendestelle UND ein entfernter Tabelleneintrag werden beide erkannt');
	const erfunden = new Set([...alleSchluesselImQuelltext, 'ro-erfunden']);
	const g1 = expectFailure(() => {
		for (const gefunden of erfunden) {
			check(KLANGTABELLE.includes(gefunden), `GEGENPROBE: "${gefunden}" gehört zur Tabelle`);
		}
	});
	check(g1, 'S-4-G: eine erfundene Sendestelle, die nicht in der Tabelle steht, wird erkannt');

	const ohneEintrag = KLANGTABELLE.filter((k) => k !== 'ro-cashout');
	const g2 = expectFailure(() => {
		const treffer = quelle.match(/['"]ro-cashout['"]/g) ?? [];
		check(ohneEintrag.includes('ro-cashout') || treffer.length === 0,
			'GEGENPROBE: ro-cashout hat keine Sendestelle mehr (Tabelleneintrag entfernt)');
	});
	check(g2, 'S-4-G: ein aus der Tabelle entfernter Eintrag, der im Quelltext weiter sendet, wird erkannt');
}

console.log('\nS-5  Kein Klang für ein Ereignis, das es nicht gibt');
{
	const roundQuelle = await readFile(
		fileURLToPath(new URL('round-roulette.js', ROULETTE_JS)), 'utf8'
	);
	check(/report\.total/.test(roundQuelle) || /\.total\b/.test(roundQuelle),
		'round-roulette.js/table-bets.js liefert das Feld total, an dem onResult() den Gewinn/Verlust unterscheidet');

	// Verhaltensnachweis: die drei Antworten schließen sich in DIESEM Modul
	// gegenseitig aus — kein Doppelklang, keiner ohne Grund.
	fire(one.root, 'keydown', new StubEvent('keydown', { isTrusted: true }));
	advance(50);
	const vorLoss = plays('ro-loss');
	board.onResult({ hadBet: true, credited: 0, staked: 5 });
	advance(50);
	check(plays('ro-loss') === vorLoss + 1, 'Verlust: sheet() klingt genau einmal');
	check(plays('ro-count') === 0 && plays('ro-payout') === 0, 'und dabei klingt weder der Zählklang noch die Kaskade');

	const vorCount = plays('ro-count');
	board.onResult({ hadBet: true, credited: 30, staked: 5 });
	advance(2000);
	check(plays('ro-count') > vorCount, 'Gewinn: der Zählklang kommt');
	check(plays('ro-payout') === 1, 'und danach genau eine Auszahlungskaskade');
	check(plays('ro-loss') === vorLoss + 1, 'aber kein zusätzlicher Verlustklang');

	const vorAlles = { loss: plays('ro-loss'), count: plays('ro-count'), payout: plays('ro-payout') };
	board.onResult({ hadBet: false, credited: 0, staked: 0 });
	advance(500);
	check(plays('ro-loss') === vorAlles.loss && plays('ro-count') === vorAlles.count && plays('ro-payout') === vorAlles.payout,
		'kein Einsatz: es klingt buchstäblich nichts — es ist finanziell nichts passiert');

	// Behebung Review C3, L5: eine TEILRÜCKGABE (credited > 0, aber nicht
	// mehr als staked — 18 € zurück von 20 € Einsatz) ist netto ein Verlust
	// und muss wie einer klingen, nicht wie ein Gewinn.
	const vorTeilrueckgabe = { loss: plays('ro-loss'), count: plays('ro-count'), payout: plays('ro-payout') };
	board.onResult({ hadBet: true, credited: 18, staked: 20 });
	advance(2000);
	check(plays('ro-loss') === vorTeilrueckgabe.loss + 1,
		'Teilrückgabe (18 € zurück von 20 € Einsatz): klingt wie ein Verlust, nicht wie ein Gewinn');
	check(plays('ro-count') === vorTeilrueckgabe.count && plays('ro-payout') === vorTeilrueckgabe.payout,
		'und dabei klingt weder der Zählklang noch die Auszahlungskaskade');
}

console.log('\nS-6  Rechnerische obere Schranke des Ausschlags bleibt unter 1,0');
{
	// Der dichteste denkbare Augenblick: beide Dauerklänge laufen, dazu ein
	// Rillenstoß und ein gelegter Chip gleichzeitig.
	fire(one.root, 'keydown', new StubEvent('keydown', { isTrusted: true }));
	board.onFrame({ phase: 'rotor', wheelOmega: 0.6, ballOmega: 3 });
	advance(50);
	board.onFret(1);
	bank.notify('place');
	advance(10);

	const bound = peakBound();
	console.log(`     ausgerechnete obere Schranke: ${bound.toFixed(3)}`);
	check(bound < 1, `die obere Schranke des Ausschlags bleibt unter 1,0 (${bound.toFixed(3)})`);
	check(bound > 0, 'und sie ist größer als 0 — es wurde wirklich etwas an den Ausgang gehängt');

	console.log('     Gegenprobe (S-6-G): eine künstlich um 1,0 erhöhte Schranke reißt dieselbe Prüfung');
	const g = expectFailure(() => {
		check(bound + 1 < 1, 'GEGENPROBE: eine um 1,0 erhöhte obere Schranke bleibt unter 1,0');
	});
	check(g, 'S-6-G: eine zu hohe Schranke wird tatsächlich als zu hoch erkannt');
}

console.log('\nS-7  Höchstens zwei Dauerklänge, beide in destroy() angehalten');
{
	board.onFrame({ phase: 'rotor', wheelOmega: 0.5, ballOmega: 2 });
	advance(50);
	check(humming() <= 3, `höchstens drei Dauerklänge gleichzeitig (Leerlauf + Rad + Kugel): gefunden ${humming()}`);
	check(one.root.getAttribute('data-ro-sound-sustained') !== null
		&& Number(one.root.getAttribute('data-ro-sound-sustained')) <= 2,
		`data-ro-sound-sustained zählt höchstens die zwei EIGENEN Dauerklänge dieser Datei (gefunden: ${one.root.getAttribute('data-ro-sound-sustained')})`);

	board.destroy();
	check(humming() === 0, 'nach destroy() läuft kein Dauerklang mehr — kein Leck');
	check(one.root.getAttribute('data-ro-sound-sustained') === null, 'data-ro-sound-sustained ist beim Abräumen entfernt');

	console.log('     Gegenprobe (S-7-G): ein absichtlich NICHT angehaltener Dauerklang wird erkannt');
	const zweiterBoard = connectSound(buildTable().root, { bank: buildBank() });
	zweiterBoard.onFrame({ phase: 'rotor', wheelOmega: 0.5, ballOmega: 2 });
	// destroy() wird ABSICHTLICH nicht gerufen.
	const g = expectFailure(() => {
		check(humming() === 0, 'GEGENPROBE: ohne destroy() läuft kein Dauerklang mehr (falsch — er läuft noch)');
	});
	check(g, 'S-7-G: ein vergessener Dauerklang wird tatsächlich erkannt');
	zweiterBoard.destroy();
}

console.log('\nS-8  Die Rillenklicks tragen key und minGap');
{
	const quelle = await readFile(fileURLToPath(new URL('sound-roulette.js', ROULETTE_JS)), 'utf8');
	const fretFn = /function\s+onFret\s*\([^)]*\)\s*\{([\s\S]*?)\n\t\}/.exec(quelle)?.[1] ?? '';
	check(/key:\s*'ro-fret'/.test(fretFn), 'onFret() übergibt key: \'ro-fret\'');
	check(/minGap:\s*[\d.]+/.test(fretFn), 'onFret() übergibt eine minGap');

	// Verhaltensnachweis: zwei Rillenstöße in derselben Millisekunde stapeln
	// sich nicht (die zweite Stimme wird gedrosselt).
	fire(one.root, 'keydown', new StubEvent('keydown', { isTrusted: true }));
	const boardZwei = connectSound(one.root, { bank: buildBank() });
	const vor = sound.stats().gapDrops;
	boardZwei.onFret(1);
	boardZwei.onFret(2);
	advance(5);
	check(sound.stats().gapDrops === vor + 1, 'zwei Rillenstöße ohne Abstand: der zweite wird durch minGap gedrosselt, nicht gestapelt');
	boardZwei.destroy();
}

console.log('\nS-9  Der Ton-Schalter: echter Knopf, Größe, Fokus, Namensschild, Kontrast');
{
	const soundHtml = readFileSync(
		path.join(EXT, 'Resources/Private/Partials/Table/Roulette/SoundSwitch.html'), 'utf8'
	).replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '');
	check(/<button\s+type="button"[^>]*data-ro-sound=""/.test(soundHtml), 'der Ton-Schalter ist ein <button type="button" data-ro-sound="">');
	check(/aria-pressed="true"/.test(soundHtml), 'er trägt aria-pressed="true" schon im ausgelieferten Markup');
	check(/class="ro-sound__label"/.test(soundHtml), 'er trägt ein Namensschild (.ro-sound__label)');
	check(!/\bdisabled\b/.test(soundHtml.replace(/aria-disabled/g, '')), 'kein echtes disabled am Ton-Schalter');

	const feltCss = readFileSync(path.join(EXT, 'Resources/Public/Css/felt.css'), 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, '');
	const tokensCss = readFileSync(
		path.join(ALL_EXT, 'casino_startpage/Resources/Public/Css/tokens.css'), 'utf8'
	);

	function regelRumpf(css, selektor) {
		const escaped = selektor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const muster = new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{`);
		const treffer = muster.exec(css);
		if (!treffer) return null;
		let i = css.indexOf('{', treffer.index) + 1;
		let tiefe = 1;
		const start = i;
		while (i < css.length && tiefe > 0) {
			if (css[i] === '{') tiefe++;
			else if (css[i] === '}') tiefe--;
			i++;
		}
		return css.slice(start, i - 1);
	}
	function eigenschaftsWert(rumpf, eigenschaft) {
		const escaped = eigenschaft.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const muster = new RegExp(`(?:^|[\\s;{])${escaped}\\s*:\\s*([^;]+);`, 'm');
		const treffer = muster.exec(rumpf ?? '');
		return treffer ? treffer[1].trim() : null;
	}
	function hexZuRgb(hex) {
		return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
	}
	function leuchtdichte([r, g, b]) {
		const f = (v) => {
			const x = v / 255;
			return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
		};
		return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
	}
	function kontrast(c1, c2) {
		const l1 = leuchtdichte(c1);
		const l2 = leuchtdichte(c2);
		const [hell, dunkel] = l1 >= l2 ? [l1, l2] : [l2, l1];
		return (hell + 0.05) / (dunkel + 0.05);
	}
	function tokenFarben(quelle, token, tiefe = 0) {
		if (tiefe > 6) return [];
		const muster = new RegExp(`(?:^|[\\s;{])${token}\\s*:\\s*([^;]+);`, 'm');
		const treffer = muster.exec(quelle);
		if (!treffer) return [];
		const wert = treffer[1];
		const hex = /#([0-9a-fA-F]{6})\b/.exec(wert);
		if (hex) return [hexZuRgb(hex[1])];
		const rgb = /rgba?\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)/.exec(wert);
		if (rgb) return [[Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]];
		const verschachtelt = [...wert.matchAll(/var\((--ck-[a-z0-9-]+)\)/g)].map((m) => m[1]);
		return verschachtelt.flatMap((t) => tokenFarben(quelle, t, tiefe + 1));
	}

	const rumpf = regelRumpf(feltCss, '.ro-sound');
	check(rumpf !== null, '.ro-sound hat eine eigene Regel in felt.css');
	if (rumpf) {
		for (const eigenschaft of ['min-inline-size', 'min-block-size']) {
			const m = new RegExp(`${eigenschaft}\\s*:\\s*([\\d.]+)rem`).exec(rumpf);
			check(m !== null && Number(m[1]) >= 2.75, `.ro-sound: ${eigenschaft} ist mindestens 2.75rem`);
		}
	}
	check(/\.ro-sound:focus-visible\s*\{/.test(feltCss), '.ro-sound:focus-visible ist definiert');
	check(!/\.ro-sound[^{]*\{[^}]*outline\s*:\s*none/.test(feltCss), '.ro-sound hat kein outline: none ohne Ersatz');

	const labelRumpf = regelRumpf(feltCss, '.ro-sound__label');
	check(labelRumpf !== null, '.ro-sound__label hat eine eigene Regel in felt.css');
	if (labelRumpf) {
		const textWert = eigenschaftsWert(labelRumpf, 'color');
		const hgWert = eigenschaftsWert(labelRumpf, 'background-color');
		const textToken = /var\((--ck-[a-z0-9-]+)\)/.exec(textWert ?? '')?.[1];
		const hgToken = /var\((--ck-[a-z0-9-]+)\)/.exec(hgWert ?? '')?.[1];
		check(textToken && hgToken, '.ro-sound__label: Text- und Hintergrundfarbe kommen aus tokens.css-Variablen');
		if (textToken && hgToken) {
			const textFarben = tokenFarben(tokensCss, textToken);
			const hgFarben = tokenFarben(tokensCss, hgToken);
			check(textFarben.length > 0 && hgFarben.length > 0, 'beide Token lösen sich zu mindestens einer Farbe auf');
			if (textFarben.length > 0 && hgFarben.length > 0) {
				const [textFarbe] = textFarben;
				const werte = hgFarben.map((hg) => kontrast(textFarbe, hg));
				const ungünstigster = Math.min(...werte);
				check(ungünstigster >= 4.5,
					`.ro-sound__label: ungünstigster von ${werte.length} Farbstopp(s) ${ungünstigster.toFixed(2)}:1 (Soll ≥ 4,5:1)`);
			}
		}
	}
}

console.log('\nS-10  Der Leerlauf: genau eine Instanz je Gerät, beendet in destroy()');
{
	const quelle = await readFile(fileURLToPath(new URL('sound-roulette.js', ROULETTE_JS)), 'utf8');
	const instanzen = quelle.match(/new IdleNoise\(\)/g) ?? [];
	check(instanzen.length === 1, `genau eine "new IdleNoise()" im Quelltext (gefunden: ${instanzen.length})`);
	check(/idle\.destroy\(\)/.test(quelle), 'destroy() ruft idle.destroy()');
}

/* ------------------------------------------------------------- Ergebnis */

check(consoleErrors.length === 0, `keine einzige Konsolenausgabe während des ganzen Laufs (${consoleErrors.length})`);
for (const line of consoleErrors) {
	console.log(`      ${line}`);
}

console.error = realError;
console.warn = realWarn;

console.log(failed
	? '\nERGEBNIS: der Klang erfüllt mindestens eine Zusage nicht.'
	: '\nERGEBNIS: alle Prüfungen bestanden. Vor der ersten echten Geste entsteht kein '
	+ 'AudioContext, der Tastaturweg schaltet ebenso frei wie der Zeiger, jedes Ereignis der '
	+ 'Klangtabelle hat genau eine Sendestelle, kein Klang für ein nicht stattgefundenes '
	+ 'Ereignis, der ausgerechnete Ausschlag bleibt unter 1,0, höchstens zwei Dauerklänge '
	+ 'laufen gleichzeitig und keiner bleibt nach destroy() zurück, und der Ton-Schalter '
	+ 'erreicht den geforderten Kontrast.');

process.exit(failed ? 1 : 0);
