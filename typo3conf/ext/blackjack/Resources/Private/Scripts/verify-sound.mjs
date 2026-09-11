/**
 * Blackjack – Nachweis des Klangs
 * =================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/verify-sound.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei der ersten Abweichung.
 *
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.30, Umsetzungsstück C5d)
 * ---------------------------------------------------------------------
 *   N-1   keine Audiodatei, kein Netzzugriff, keine data:-URI mit
 *         Klanginhalt, kein fetch, kein Audio( — in sound-blackjack.js
 *   N-2   jeder Klangaufruf trägt key UND minGap
 *   N-3   die Zuordnung ist vollständig: für jedes der zwölf Ereignisse aus
 *         der Tabelle in sound-blackjack.js gibt es genau eine Funktion, und
 *         jede Funktion erzeugt mindestens einen Klang
 *   N-4   Ehrlichkeit: kein Klang aus der Gewinnfamilie für einen Verlust,
 *         genau ein Klang für ein Patt
 *   N-5   rechnerische obere Schranke des Ausschlags bleibt unter 1,0
 *   N-6   bei ausgeschaltetem Ton erzeugt kein Aufruf eine Quelle
 *   N-7   ohne Nutzergeste erzeugt kein Aufruf eine Quelle; unlock() nur aus
 *         einem Zuhörer für ein echtes Ereignis
 *   N-8   bei prefers-reduced-motion läuft die Kartenkette ohne Abstände
 *   N-9   kein deutscher Anzeigetext in sound-blackjack.js
 *   N-10  der Ton-Schalter: echter Knopf, aria-pressed, Zustand über
 *         border-style, nicht nur über Farbe
 *
 * Gegenproben: N-2-G, N-4-G, N-10-G.
 *
 * Was dieses Skript AUSDRÜCKLICH NICHT prüfen kann: ob der Klang GUT ist, ob
 * er zu diesem Tisch passt und ob er an ein bestimmtes fremdes Spiel
 * erinnert (CONCEPT.md B.3 Nr. 11). Das kann nur ein Mensch — siehe test.txt.
 *
 * DIE EIGENTLICHE ENTSCHEIDUNG DIESES NACHWEISES: „BLACKJACK" UND
 * "ÜBERKAUFT" GEHÖREN onHand(), NICHT onResult()
 * -----------------------------------------------------------------------------
 * sound-blackjack.js#onResult({net}) kann aus der reinen Zahl net nur
 * Gewinn/Verlust/Patt ableiten — dieselben drei Antworten wie am
 * Roulette-Tisch. Ein Blackjack (immer ein Gewinn) und ein Überkauf (immer
 * ein Verlust) sind darin nicht von einer gewöhnlichen Gewinn- bzw.
 * Verlustrunde zu unterscheiden. onHand({outcome}) trägt deshalb genau diese
 * zwei Sonderfälle, und N-3 unten prüft dementsprechend zwölf Funktionsziele:
 * Chip legen, Chip zurücknehmen, Karte geben, Karte aufdecken, mischen,
 * überkauft (onHand), Blackjack (onHand), Gewinn (onResult), Patt
 * (onResult), Verlust (onResult), CASH OUT, Leerlauf. Siehe der ausführliche
 * Kopfkommentar von sound-blackjack.js für die Begründung in voller Länge.
 *
 *
 * WARUM MIT DEN ECHTEN DATEIEN, UND WIE
 * ----------------------------------------
 * Geladen werden die echten Module über zwei Extensions:
 *
 *   casino_startpage   sound.js       die Klangerzeugung
 *                      sound-kit.js   der Klangbaukasten
 *                      idle-noise.js  die Leerlaufgeräusche
 *   blackjack          sound-blackjack.js  die Klangzuordnung dieses Tisches
 *
 * Dasselbe Verfahren wie in roulette/fruit_risk/reel_slot/video_slot/
 * coin_pusher …/verify-sound.mjs: die Dateien, die über die Import-Map von
 * TYPO3 einander finden ('@phomo17/…', von Node nicht auflösbar), werden ALS
 * TEXT gelesen, genau diese Namen durch echte Datei-URLs ersetzt und als
 * data:-Modul geladen.
 *
 * Die Audio-Stubklassen (Param, StubNode und seine Ableitungen,
 * StubAudioContext, tracePath, peakBound/chainValue) in Abschnitt 2 sind
 * SINNGEMÄSS aus roulette/Resources/Private/Scripts/verify-sound.mjs
 * übernommen — EINSCHLIESSLICH der dort dokumentierten Korrektur an
 * Param.at() (bei zwei Reglerpunkten zur selben Zeit gewinnt der SPÄTERE;
 * DECISIONS.md, C3e, „Kleinere Randentscheidungen"). Wer diese Korrektur
 * nicht mitnimmt, misst einen falschen Spitzenausschlag (N-5).
 *
 * Node hat weder Web Audio noch ein Dokument noch einen Browserspeicher.
 * Alle drei werden vor dem Laden bereitgestellt.
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

/** Siehe roulette/verify-sound.mjs: tauscht die Prüffunktion vorübergehend gegen eine mitschreibende aus, für ehrliche Gegenproben. */
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
	timers.set(id, { at: clock.ms, fn });
	return id;
});
defineGlobal('cancelAnimationFrame', (id) => {
	timers.delete(id);
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
	}
	endDueSources();
}

/* ==========================================================================
   2. Web Audio als reine Buchführung (sinngemäß aus roulette/verify-sound.mjs)
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
	 * Korrektur gegenüber der naiven Fassung (siehe DECISIONS.md, C3e,
	 * „Kleinere Randentscheidungen"): bei zwei Punkten zur selben Zeit
	 * gewinnt der LETZTE, nicht der erste — genau wie ein echter AudioParam
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

/** Reduzierte Bewegung — für N-8 umschaltbar, sonst immer "matches: false". */
let reducedMotion = false;
defineGlobal('matchMedia', (query) => ({
	get matches() {
		return query.includes('prefers-reduced-motion') && reducedMotion;
	},
}));

/* ==========================================================================
   4. Die echten Module
   ========================================================================== */

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/blackjack/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const ALL_EXT = path.resolve(EXT, '..');
const CASINO_JS = new URL('../../../../casino_startpage/Resources/Public/JavaScript/', import.meta.url);
const BLACKJACK_JS = new URL('../../Public/JavaScript/', import.meta.url);

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

console.log('\nBlackjack – Nachweis des Klangs');
console.log('==================================\n');
console.log('Die echten Module');

const SOUND_URL = new URL('sound.js', CASINO_JS).href;
const SOUND_NAME = '@phomo17/casino-startpage/sound.js';
const KIT_NAME = '@phomo17/casino-startpage/sound-kit.js';
const IDLE_NAME = '@phomo17/casino-startpage/idle-noise.js';

const { sound } = await import(SOUND_URL);
check(typeof sound?.sustain === 'function', 'casino_startpage/sound.js über seine Datei-URL geladen — EINE Instanz für alle');

const kitUrl = await toModule(new URL('sound-kit.js', CASINO_JS), [[SOUND_NAME, SOUND_URL]], 'sound-kit.js');
const kit = await import(kitUrl);
check(typeof kit.metal === 'function' && typeof kit.countStep === 'function' && typeof kit.coinCascade === 'function',
	'sound-kit.js geladen (metal, ratchet, sheet, cashRegister, countStep, coinCascade)');

const idleUrl = await toModule(new URL('idle-noise.js', CASINO_JS), [[SOUND_NAME, SOUND_URL], [KIT_NAME, kitUrl]], 'idle-noise.js');
const { IdleNoise } = await import(idleUrl);
check(typeof IdleNoise === 'function', 'idle-noise.js geladen');

const soundBlackjackUrl = await toModule(
	new URL('sound-blackjack.js', BLACKJACK_JS),
	[[SOUND_NAME, SOUND_URL], [KIT_NAME, kitUrl], [IDLE_NAME, idleUrl]],
	'sound-blackjack.js'
);
const { connectSound } = await import(soundBlackjackUrl);
check(typeof connectSound === 'function', 'sound-blackjack.js geladen — die Klangzuordnung dieses Tisches');

const SOUND_BLACKJACK_PFAD = fileURLToPath(new URL('sound-blackjack.js', BLACKJACK_JS));
const SOUND_BLACKJACK_QUELLE = await readFile(SOUND_BLACKJACK_PFAD, 'utf8');

/* ==========================================================================
   5. Ein Tisch, eine Bank, ein paar Abkürzungen
   ========================================================================== */

function buildTable() {
	const root = new StubElement(['[data-ck-table]']);
	const switchEl = root.append(new StubElement(['[data-bj-sound]'], { textOn: 'Ton ist an', textOff: 'Ton ist aus' }));
	switchEl.setAttribute('aria-pressed', 'true');
	switchEl.setAttribute('data-bj-sound-on', 'true');
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

/** Eine minimale Bank, die nur subscribe()/notify() nachbildet — genau der Vertrag, auf den sound-blackjack.js sich verlässt (table-buyin.js, TableBank). */
function buildBank() {
	const listeners = new Set();
	return {
		subscribe(listener) {
			listeners.add(listener);
			listener({ amount: 0, staked: 0, reason: 'subscribe' });
			return () => listeners.delete(listener);
		},
		notify(reason) {
			for (const listener of [...listeners]) {
				listener({ amount: 0, staked: 0, reason });
			}
		},
	};
}

/** Entsperrt einen Tisch mit einem ECHTEN (isTrusted) Tastaturereignis. @returns {void} */
function unlock(root) {
	fire(root, 'keydown', new StubEvent('keydown', { isTrusted: true }));
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

console.log('\nN-1  Keine Audiodatei, kein Netzzugriff, keine data:-URI mit Klanginhalt — in sound-blackjack.js');
{
	const VERBOTENE_MUSTER = [/\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bnew\s+Audio\s*\(/, /data:audio\//i];
	const AUDIO_ENDUNG = /\.(mp3|wav|ogg|m4a|flac|aac|opus)/i;
	check(!AUDIO_ENDUNG.test(SOUND_BLACKJACK_QUELLE), 'sound-blackjack.js nennt keine Audiodateiendung');
	const treffer = VERBOTENE_MUSTER.filter((muster) => muster.test(SOUND_BLACKJACK_QUELLE));
	check(treffer.length === 0, 'sound-blackjack.js enthält kein fetch(), kein XMLHttpRequest, kein new Audio(), keine data:audio/',
		...treffer.map((m) => String(m)));
}

console.log('\nN-2  Jeder Klangaufruf trägt key und minGap');
{
	/**
	 * Findet jeden Aufruf `name(...)` im Quelltext und liefert den TEXT
	 * zwischen den Klammern — klammernbewusst (zählt jede runde Klammer),
	 * damit ein verschachteltes filter: {...} das Ende nicht vortäuscht.
	 * @param {string} quelltext
	 * @param {string} name
	 * @returns {string[]}
	 */
	function aufrufe(quelltext, name) {
		const ergebnis = [];
		const muster = new RegExp(`\\b${name.replace('.', '\\.')}\\(`, 'g');
		let treffer;
		while ((treffer = muster.exec(quelltext)) !== null) {
			let i = treffer.index + treffer[0].length;
			let tiefe = 1;
			const start = i;
			while (i < quelltext.length && tiefe > 0) {
				if (quelltext[i] === '(') { tiefe++; }
				else if (quelltext[i] === ')') { tiefe--; }
				i++;
			}
			ergebnis.push(quelltext.slice(start, i - 1));
		}
		return ergebnis;
	}

	// OHNE Kommentare: der Dateikopf nennt die Klangzuordnung als Prosatabelle
	// ("metal({pitch: 0.55})" o. ä.) — ohne diesen Schnitt fände dieselbe
	// Prüfung ihre eigene Dokumentation statt des tatsächlichen Aufrufs.
	const quelleOhneKommentare = SOUND_BLACKJACK_QUELLE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

	const KLANGFUNKTIONEN = ['metal', 'sheet', 'ratchet', 'coinCascade', 'countStep', 'cashRegister', 'sound.noise'];
	let gesamtzahl = 0;
	let ohneKeyOderMinGap = [];
	for (const name of KLANGFUNKTIONEN) {
		for (const rumpf of aufrufe(quelleOhneKommentare, name)) {
			gesamtzahl++;
			if (!/\bkey:/.test(rumpf) || !/\bminGap:/.test(rumpf)) {
				ohneKeyOderMinGap.push(`${name}(${rumpf.slice(0, 60)}…)`);
			}
		}
	}
	check(gesamtzahl > 0, `${gesamtzahl} Klangaufrufe in sound-blackjack.js gefunden`);
	check(ohneKeyOderMinGap.length === 0, 'jeder gefundene Klangaufruf trägt key UND minGap', ...ohneKeyOderMinGap);

	console.log('     Gegenprobe (N-2-G): ein künstlich entfernter key wird erkannt');
	const verstuemmelt = aufrufe(quelleOhneKommentare, 'metal')[0].replace(/key:\s*'[^']*',?\s*/, '');
	const g = expectFailure(() => {
		check(/\bkey:/.test(verstuemmelt), 'GEGENPROBE: der verstümmelte Aufruf trägt noch einen key');
	});
	check(g, 'N-2-G: ein entfernter key wird tatsächlich als fehlend erkannt');
}

console.log('\nN-7  Ohne Nutzergeste erzeugt kein Aufruf eine Quelle; unlock() nur bei event.isTrusted');
{
	// MUSS vor jedem anderen dynamischen Test laufen: sobald irgendein Test
	// zuvor unlock() ausgelöst hat, existiert der (modulweit EINE) AudioContext
	// bereits, und "vor der ersten Geste: kein Kontext" wäre nicht mehr
	// nachweisbar. Dieselbe Reihenfolge wie S-3 in roulette/verify-sound.mjs.
	check(sound.contextState === 'none', 'vor der ersten Geste: kein AudioContext');

	const quelleOhneKommentare = SOUND_BLACKJACK_QUELLE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
	const aufrufeUnlock = quelleOhneKommentare.match(/sound\.unlock\(\)/g) ?? [];
	check(aufrufeUnlock.length === 1, `sound.unlock() kommt im Quelltext (ohne Kommentare) genau einmal vor (gefunden: ${aufrufeUnlock.length})`);

	fire(one.root, 'pointerdown', new StubEvent('pointerdown', { isTrusted: false }));
	check(sound.contextState === 'none', 'ein nachgemachtes pointerdown legt keinen Kontext an');

	fire(one.root, 'keydown', new StubEvent('keydown', { isTrusted: true }));
	check(sound.contextState === 'running', 'ein ECHTES keydown (isTrusted) legt den Kontext an — der Tastaturweg schaltet ebenso frei wie der Zeiger');
	advance(200);
	check(humming() === 1, 'und der Leerlauf läuft mit an');
	board.setBusy(false);
}

console.log('\nN-3  Die Zuordnung ist vollständig: für jedes der zwölf Ereignisse gibt es genau eine Funktion');
{
	// Die Tabelle steht HIER, nicht im geprüften Modul. Jede Zeile wird mit
	// dem NACHGEBILDETEN Kontext tatsächlich ausgeführt (nicht nur im
	// Quelltext gesucht) und muss den benannten Klangschlüssel hörbar
	// hinterlassen.
	unlock(one.root);

	const EREIGNISSE = [
		{ name: 'Chip auf den Setzkreis gelegt', key: 'bj-chip-place', spielen: () => board.onChipPlace() },
		{ name: 'Chip zurückgenommen', key: 'bj-chip-remove', spielen: () => board.onChipRemove() },
		{ name: 'Karte wird gegeben', key: 'bj-card-deal', spielen: () => { board.onDeal(1); advance(20); } },
		{ name: 'Karte des Gebers wird aufgedeckt', key: 'bj-card-flip', spielen: () => board.onFlip() },
		{ name: 'Neu gemischt', key: 'bj-shuffle', spielen: () => board.onShuffle() },
		{ name: 'Blatt überkauft', key: 'bj-bust', spielen: () => board.onHand({ outcome: 'bust' }) },
		{ name: 'Blackjack', key: 'bj-blackjack', spielen: () => { board.onHand({ outcome: 'blackjack' }); advance(500); } },
		{ name: 'Hand gewonnen', key: 'bj-payout', spielen: () => board.onResult({ net: 20 }) },
		{ name: 'Patt', key: 'bj-push', spielen: () => board.onResult({ net: 0 }) },
		{ name: 'Hand verloren', key: 'bj-loss', spielen: () => board.onResult({ net: -20 }) },
		{ name: 'CASH OUT', key: 'bj-cashout', spielen: () => board.onCashOut() },
	];

	for (const { name, key, spielen } of EREIGNISSE) {
		const vorher = plays(key);
		spielen();
		advance(10);
		check(plays(key) > vorher, `${name}: erzeugt tatsächlich einen Klang mit dem Schlüssel "${key}"`);
	}

	console.log('     Leerlauf: eigene interne Schlüssel, über setBusy()/IdleNoise nachgewiesen');
	board.setBusy(true);
	advance(200);
	check(humming() >= 1, 'setBusy(true) hält mindestens einen Dauerklang (den Leerlauf)');
	board.setBusy(false);
}

console.log('\nN-4  Ehrlichkeit: kein Gewinnklang für einen Verlust, genau ein Klang für ein Patt');
{
	const VOR_GEWINNFAMILIE = { payout: plays('bj-payout'), blackjack: plays('bj-blackjack'), cashout: plays('bj-cashout') };
	board.onHand({ outcome: 'loss' });
	advance(500);
	check(plays('bj-payout') === VOR_GEWINNFAMILIE.payout
		&& plays('bj-blackjack') === VOR_GEWINNFAMILIE.blackjack
		&& plays('bj-cashout') === VOR_GEWINNFAMILIE.cashout,
		"onHand({outcome: 'loss'}) erzeugt keinen Klang aus der Gewinnfamilie (coinCascade/countStep/cashRegister) — tatsächlich erzeugt es GAR KEINEN Klang, siehe Dateikopf");

	const alleSchluessel = ['bj-chip-place', 'bj-chip-remove', 'bj-card-deal', 'bj-card-flip', 'bj-shuffle', 'bj-shuffle-ratchet',
		'bj-bust', 'bj-blackjack-count', 'bj-blackjack', 'bj-payout', 'bj-push', 'bj-loss', 'bj-cashout'];
	const vorPatt = Object.fromEntries(alleSchluessel.map((k) => [k, plays(k)]));
	board.onResult({ net: 0 });
	advance(10);
	const gewachsen = alleSchluessel.filter((k) => plays(k) > vorPatt[k]);
	check(gewachsen.length === 1 && gewachsen[0] === 'bj-push',
		"onResult({net: 0}) erzeugt genau einen Klang (bj-push), nicht zwei",
		`gewachsene Schlüssel: ${gewachsen.join(', ') || '(keiner)'}`);

	console.log('     Gegenprobe (N-4-G): eine Fassung, die bei net===0 zusätzlich einen zweiten Klang auslöste, würde hier auffallen');
	// ERST 400 ms weiterstellen: bj-push trägt minGap 0.3 — ohne diesen
	// Abstand würde der zweite onResult({net: 0})-Aufruf durch minGap
	// gedrosselt und die Gegenprobe prüfte nichts.
	advance(400);
	const g = expectFailure(() => {
		const vorGegenprobe = Object.fromEntries(alleSchluessel.map((k) => [k, plays(k)]));
		board.onResult({ net: 0 });
		board.onChipPlace(); // absichtlich ein ZWEITER, künstlich hinzugefügter Klang
		advance(10);
		const gewachsenGegenprobe = alleSchluessel.filter((k) => plays(k) > vorGegenprobe[k]);
		check(gewachsenGegenprobe.length === 1, 'GEGENPROBE: es wäre genau ein Klang gewesen');
	});
	check(g, 'N-4-G: ein zweiter, künstlich hinzugefügter Klang wird tatsächlich als Abweichung erkannt');
}

console.log('\nN-5  Rechnerische obere Schranke des Ausschlags bleibt unter 1,0');
{
	// Der lauteste denkbare Augenblick: das Ende der Blackjack-Folge
	// (dritter Zählschritt + die abschließende Kaskade), eine ZWEITE,
	// überlappende Auszahlung aus onResult() und der Leerlauf zugleich. Die
	// Blackjack-Kette braucht rund 180 ms bis zu ihrer eigenen Kaskade
	// (siehe onBlackjack()); onResult() wird bewusst SO KURZ VORHER
	// ausgelöst, dass beide Kaskaden real überlappen.
	unlock(one.root);
	board.setBusy(true);
	board.onHand({ outcome: 'blackjack' });
	advance(170);
	board.onResult({ net: 30 });
	advance(20);

	const bound = peakBound();
	console.log(`     ausgerechnete obere Schranke: ${bound.toFixed(3)}`);
	check(bound < 1, `die obere Schranke des Ausschlags bleibt unter 1,0 (${bound.toFixed(3)})`);
	check(bound > 0, 'und sie ist größer als 0 — es wurde wirklich etwas an den Ausgang gehängt');
	advance(2000);
	board.setBusy(false);
}

console.log('\nN-6  Bei ausgeschaltetem Ton erzeugt kein Aufruf eine Quelle');
{
	sound.disable();
	const vorher = { ...sound.stats().byKey };
	board.onChipPlace();
	board.onShuffle();
	board.onResult({ net: 10 });
	advance(500);
	const nachher = sound.stats().byKey;
	const veraendert = Object.keys(nachher).filter((k) => (nachher[k] ?? 0) !== (vorher[k] ?? 0));
	check(veraendert.length === 0, 'bei ausgeschaltetem Ton bleibt jeder Zählwert unverändert', ...veraendert);
	sound.enable();
}

console.log('\nN-8  Bei prefers-reduced-motion läuft die Kartenkette ohne Abstände');
{
	unlock(one.root);
	reducedMotion = false;
	const vorOhneDrosselung = plays('bj-card-deal');
	board.onDeal(4);
	advance(700);
	const nachOhneDrosselung = plays('bj-card-deal') - vorOhneDrosselung;
	check(nachOhneDrosselung === 4, `ohne Drosselung: vier gegebene Karten erzeugen vier Klänge (gefunden: ${nachOhneDrosselung})`);

	reducedMotion = true;
	const vorMitDrosselung = plays('bj-card-deal');
	board.onDeal(4);
	advance(700);
	const nachMitDrosselung = plays('bj-card-deal') - vorMitDrosselung;
	check(nachMitDrosselung === 1, `mit prefers-reduced-motion: vier gegebene Karten erzeugen EINEN Klang (gefunden: ${nachMitDrosselung})`);
	reducedMotion = false;
}

console.log('\nN-9  Kein deutscher Anzeigetext in sound-blackjack.js');
{
	const ohneKommentare = SOUND_BLACKJACK_QUELLE
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/.*$/gm, '')
		.replace(/console\.(?:error|warn|log)\([\s\S]*?\);/g, 'console.MELDUNG();');
	check(!/[äöüÄÖÜß]/.test(ohneKommentare), 'sound-blackjack.js enthält (außerhalb von Kommentaren und Konsolenmeldungen) keinen deutschen Umlaut');
}

console.log('\nN-10  Der Ton-Schalter: echter Knopf, aria-pressed, Zustand über border-style statt nur Farbe');
{
	const soundHtml = readFileSync(
		path.join(EXT, 'Resources/Private/Partials/Table/Blackjack/SoundSwitch.html'), 'utf8'
	).replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '');
	check(/<button\s+type="button"[^>]*data-bj-sound=""/.test(soundHtml), 'der Ton-Schalter ist ein <button type="button" data-bj-sound="">');
	check(/aria-pressed="true"/.test(soundHtml), 'er trägt aria-pressed="true" schon im ausgelieferten Markup');
	check(/data-bj-sound-on="true"/.test(soundHtml), 'er trägt data-bj-sound-on getrennt von data-bj-sound');
	check(/class="bj-sound__label"/.test(soundHtml), 'er trägt ein Namensschild (.bj-sound__label)');
	check(!/\bdisabled\b/.test(soundHtml.replace(/aria-disabled/g, '')), 'kein echtes disabled am Ton-Schalter');
	const sichtbarerText = /<span class="bj-sound__label">\s*([\s\S]*?)\s*<\/span>/.exec(soundHtml);
	check(sichtbarerText !== null && sichtbarerText[1].trim() !== '', 'der Knopf trägt sichtbaren Text (nicht nur aria-label)');

	const blackjackCss = readFileSync(path.join(EXT, 'Resources/Public/Css/blackjack.css'), 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, '');
	check(/\.bj-sound\[aria-pressed="false"\]::before\s*\{[^}]*border-style:\s*dashed/.test(blackjackCss),
		'blackjack.css unterscheidet den ausgeschalteten Zustand über border-style: dashed, nicht nur über eine Farbe');
	check(/\.bj-sound:focus-visible/.test(blackjackCss), '.bj-sound:focus-visible ist definiert');
	check(!/\.bj-sound[^{]*\{[^}]*outline\s*:\s*none/.test(blackjackCss), '.bj-sound hat kein outline: none ohne Ersatz');

	console.log('     Gegenprobe (N-10-G): eine Fassung, die nur die Farbe wechselt, wird erkannt');
	const nurFarbe = '.bj-sound[aria-pressed="false"]::before { border-color: red; }';
	const g = expectFailure(() => {
		check(/\.bj-sound\[aria-pressed="false"\]::before\s*\{[^}]*border-style:\s*dashed/.test(nurFarbe),
			'GEGENPROBE: eine reine Farbänderung enthält border-style: dashed');
	});
	check(g, 'N-10-G: eine Fassung, die nur die Farbe wechselt, wird als unzureichend erkannt');
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
	: '\nERGEBNIS: alle Prüfungen bestanden. Kein Netzzugriff, jeder Klangaufruf trägt key und '
	+ 'minGap, alle zwölf Ereignisse erzeugen tatsächlich einen Klang über ihre je eine zuständige '
	+ 'Funktion, kein Gewinnklang für einen Verlust, der ausgerechnete Ausschlag bleibt unter 1,0, '
	+ 'die Kartenkette respektiert prefers-reduced-motion, und der Ton-Schalter erfüllt seine '
	+ 'Barrierefreiheitszusagen.');

process.exit(failed ? 1 : 0);
