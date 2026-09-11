/**
 * Coin Pusher – Nachweis des Klangs von Lauf 2
 * =========================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/coin_pusher/Resources/Private/Scripts/verify-sound.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei der ersten Abweichung.
 *
 *
 * WAS HIER BEWIESEN WIRD (Plan Teil 2, Abschnitt 4.34)
 * -------------------------------------------------------
 *  S-1   vor der ersten ECHTEN Nutzergeste entsteht kein Kontext und klingt
 *        nichts – auch ein nachgemachtes Ereignis erteilt keine Aktivierung.
 *  S-2   der TASTATURWEG schaltet ebenfalls frei.
 *  S-3   der Münzeinwurf klingt, je Wert an einer anderen Tonhöhe
 *        unterscheidbar.
 *  S-4   eine gefallene Münze klingt anders als fünf; die Kaskade kostet
 *        höchstens zehn Stimmen, nicht zwanzig.
 *  S-5   der Verlust klingt, aber leiser und dumpfer; das Ventil klingt
 *        gar nicht.
 *  S-6   der Schub klingt zweimal je Umlauf, nicht öfter.
 *  S-7   genau ein Brummen je Gehäuse, es läuft durchgehend (der Leerlauf
 *        tritt an diesem Gerät NIE zurück), und der Ton-Schalter wie der
 *        Registerkartenwechsel nehmen es mit.
 *  S-8   zwei Gehäuse auf einer Seite stören einander nicht.
 *  S-9   Dauerlauf: 300 Einwürfe, 300 Fälle, 40 Verluste, 20 Auszahlungen –
 *        NULL verworfene Stimmen, NULL Konsolenausgaben, kein
 *        zurückgebliebener Dauerklang.
 *  S-10  der ausgerechnete Ausschlag über den GANZEN Lauf bleibt unter 1,0.
 *  S-11  aria-pressed am Ton-Schalter folgt sound.enabled – auch dann, wenn
 *        eine ANDERE Registerkarte abgeschaltet hat (reason 'remote').
 *
 *
 * WARUM MIT DEN ECHTEN DATEIEN UND WIE
 * ------------------------------------
 * Geladen werden vier echte Module über zwei Extensions:
 *
 *   casino_startpage  sound.js       die Klangerzeugung
 *                     sound-kit.js   der Klangbaukasten
 *                     idle-noise.js  die Leerlaufgeräusche
 *   coin_pusher       sound.js       das Klangpult dieses Geräts
 *
 * Drei der vier importieren einander über die Import-Map von TYPO3
 * ('@phomo17/…'); Node kennt diese Karte nicht. Sie werden deshalb ALS TEXT
 * gelesen, genau diese Namen ersetzt und als data:-Modul geladen — Zeile für
 * Zeile derselbe Code, nur der Modulname ist ein anderer. sound.js führt DEN
 * Zustand und wird deshalb EINMAL über seine Datei-Adresse geladen und an
 * alle weitergereicht (dasselbe Verfahren wie in video_slot/verify-sound.mjs).
 *
 * Node hat weder Web Audio noch ein Dokument noch einen Browserspeicher.
 * Alle drei werden VOR dem Laden hier bereitgestellt.
 *
 *
 * WARUM DER AUSSCHLAG AUSGERECHNET UND NICHT GEMESSEN WIRD
 * ---------------------------------------------------------
 * Unter Node klingt nichts, eine Messung ergäbe 0. Gerechnet wird für jeden
 * Augenblick die Summe der Hüllkurven aller geplanten Stimmen, jede
 * multipliziert mit allen Verstärkungen auf ihrem Weg zum Ausgang — eine
 * OBERE SCHRANKE, wörtlich wie in video_slot/verify-sound.mjs.
 *
 *
 * WARUM DIE ZEIT VIRTUELL IST
 * ---------------------------
 * Der Dauerlauf und die zwanzig simulierten Sekunden des Schubs dauern in
 * Wirklichkeit lange. setTimeout, requestAnimationFrame und performance.now()
 * werden deshalb auf eine eigene Uhr umgestellt, die in Schritten von 8 ms
 * vorgestellt wird. Der geprüfte Code merkt davon nichts.
 *
 * Auch Math.random() wird ersetzt – durch dieselbe kleine, wiederholbare
 * Zahlenfolge wie in den anderen Prüfskripten dieses Hauses. Erlaubt ist das,
 * weil in den geprüften Dateien mit Math.random() nichts GEZOGEN wird: es
 * streut Tonhöhen und Abstände, also Klangfarbe.
 *
 * Alle Vergleiche sind ganzzahlig, bis auf den Ausschlag (S-10) – der wird
 * mit < geprüft.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CASINO_JS = new URL('../../../../casino_startpage/Resources/Public/JavaScript/', import.meta.url);
const COIN_JS = new URL('../../Public/JavaScript/', import.meta.url);

/** Der Dauerlauf aus S-9. */
const THROWS = 300;
const WINS = 300;
const LOSSES = 40;
const CASHOUTS = 20;

/** Schrittweite der virtuellen Uhr in Millisekunden, rund 120 Bilder je Sekunde. */
const FRAME_MS = 8;

let failed = false;

/**
 * @param {boolean} condition
 * @param {string} message
 * @returns {void}
 */
function check(condition, message) {
	if (condition) {
		console.log(`  OK      ${message}`);
		return;
	}
	failed = true;
	console.log(`  FEHLER  ${message}`);
}

/**
 * @param {string} name
 * @param {*} value
 * @returns {void}
 */
function defineGlobal(name, value) {
	Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

/**
 * Eine kleine, wiederholbare Zahlenfolge – kein Zufall.
 *
 * @param {number} seed
 * @returns {function(number): number} liefert 0 bis grenze−1
 */
function sequence(seed) {
	let state = seed;
	return (limit) => {
		state = (state * 1103515245 + 12345) % 2147483648;
		return state % limit;
	};
}

/* ==========================================================================
   1. EINE UHR, DIE STILLSTEHT, BIS MAN SIE VORSTELLT
   ========================================================================== */

const clock = { ms: 0 };

/** Die Uhr des Kontexts rechnet in Sekunden, nicht in Millisekunden. */
function now() {
	return clock.ms / 1000;
}

let handleSeq = 0;
/** @type {Map<number, {at: number, fn: function}>} */
const timers = new Map();
/** @type {Map<number, function>} */
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

let randomState = 20260903;
Math.random = () => {
	randomState = (randomState * 1103515245 + 12345) % 2147483648;
	return randomState / 2147483648;
};

/**
 * Stellt die Uhr vor und lässt dabei alles laufen, was fällig wird.
 *
 * @param {number} ms
 * @returns {void}
 */
function advance(ms) {
	const target = clock.ms + Math.max(0, ms);
	while (clock.ms < target) {
		clock.ms = Math.min(target, clock.ms + FRAME_MS);
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
   2. WEB AUDIO ALS REINE BUCHFÜHRUNG
   ========================================================================== */

/** Jede je geplante Quelle. Die Grundlage der Ausschlagsrechnung. */
const scheduled = [];

/** Die noch nicht beendeten Quellen. Nur sie werden je Schritt angesehen. */
const live = new Set();

/** Jeder Zeitpunkt, an dem sich an irgendeinem Regler etwas ändert. */
const breakpoints = new Set([0]);

class Param {
	/** @param {number} value */
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

	setTargetAtTime(value, time, timeConstant) {
		void timeConstant;
		const at = Number(time) || 0;
		return this.setValueAtTime(Math.max(this.at(at), Number(value) || 0), at);
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
	 * @param {number} time
	 * @returns {number}
	 */
	at(time) {
		let previous = this.points[0];
		if (time <= previous.t) {
			return previous.v;
		}
		for (let i = 1; i < this.points.length; i++) {
			const point = this.points[i];
			if (time >= point.t) {
				previous = point;
				continue;
			}
			if (point.kind === 'linear') {
				const share = (time - previous.t) / (point.t - previous.t);
				return previous.v + (point.v - previous.v) * share;
			}
			if (point.kind === 'exp' && previous.v > 0 && point.v > 0) {
				const share = (time - previous.t) / (point.t - previous.t);
				return previous.v * (point.v / previous.v) ** share;
			}
			return previous.v;
		}
		return previous.v;
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

/**
 * Der Weg einer Quelle zum Ausgang, EINMAL beim Start festgehalten.
 *
 * @param {StubNode} node
 * @returns {{gains: Param[], reaches: boolean}}
 */
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

/** @returns {void} */
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

/**
 * Der größte Ausschlag, den dieser Lauf überhaupt haben KANN.
 *
 * @returns {{peak: number, at: number, voices: number}}
 */
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
	let peakAt = 0;
	let peakVoices = 0;
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
		let count = 0;
		for (const source of [...active]) {
			if (source.stopTime <= from) {
				active.delete(source);
				continue;
			}
			sum += Math.max(chainValue(source, from), chainValue(source, to));
			count++;
		}
		if (sum > peak) {
			peak = sum;
			peakAt = from;
			peakVoices = count;
		}
	}

	return { peak, at: peakAt, voices: peakVoices };
}

/**
 * @param {StubSource} source
 * @param {number} time
 * @returns {number}
 */
function chainValue(source, time) {
	let value = 1;
	for (const param of source.path.gains) {
		value *= param.at(time);
	}
	return value;
}

/* ==========================================================================
   3. EIN DOKUMENT, DAS NUR ZUSTELLT
   ========================================================================== */

class StubEvent {
	constructor(type, options = {}) {
		this.type = type;
		this.detail = options.detail ?? null;
		this.bubbles = options.bubbles === true;
		this.cancelable = options.cancelable === true;
		this.isTrusted = options.isTrusted === true;
		this.target = null;
		this.currentTarget = null;
		this.defaultPrevented = false;
		this.stopped = false;
	}

	preventDefault() {
		if (this.cancelable) {
			this.defaultPrevented = true;
		}
	}

	stopPropagation() {
		this.stopped = true;
	}

	stopImmediatePropagation() {
		this.stopped = true;
	}
}

defineGlobal('CustomEvent', StubEvent);
defineGlobal('Event', StubEvent);

class StubElement {
	/**
	 * @param {?StubElement} document
	 * @param {string[]} [selectors]
	 * @param {object} [dataset]
	 */
	constructor(document, selectors = [], dataset = {}) {
		this.ownerDocument = document ?? this;
		this.parentNode = null;
		this.children = [];
		this.selectors = new Set(selectors);
		this.dataset = { ...dataset };
		this.classes = new Set();
		this.attributes = new Map();
		this.listeners = [];
		this.classList = {
			add: (name) => this.classes.add(name),
			remove: (name) => this.classes.delete(name),
			contains: (name) => this.classes.has(name),
			toggle: (name, on) => {
				if (on === true || (on === undefined && !this.classes.has(name))) {
					this.classes.add(name);
					return;
				}
				this.classes.delete(name);
			},
		};
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
		child.parentNode = this;
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

	addEventListener(type, handler, capture = false) {
		this.listeners.push({ type, handler, capture: capture === true });
	}

	removeEventListener(type, handler, capture = false) {
		const at = this.listeners.findIndex((entry) => entry.type === type
			&& entry.handler === handler && entry.capture === (capture === true));
		if (at !== -1) {
			this.listeners.splice(at, 1);
		}
	}

	/**
	 * @param {StubEvent} event
	 * @param {boolean} capture
	 * @returns {void}
	 */
	fire(event, capture) {
		for (const entry of [...this.listeners]) {
			if (entry.type !== event.type || entry.capture !== capture) {
				continue;
			}
			event.currentTarget = this;
			entry.handler(event);
			if (event.stopped) {
				return;
			}
		}
	}

	/**
	 * @param {StubEvent} event
	 * @returns {boolean}
	 */
	dispatchEvent(event) {
		event.target = this;
		const path = [];
		for (let node = this.parentNode; node !== null && node !== undefined; node = node.parentNode) {
			path.push(node);
		}
		for (let i = path.length - 1; i >= 0 && !event.stopped; i--) {
			path[i].fire(event, true);
		}
		if (!event.stopped) {
			this.fire(event, true);
		}
		if (!event.stopped) {
			this.fire(event, false);
		}
		if (event.bubbles) {
			for (const node of path) {
				if (event.stopped) {
					break;
				}
				node.fire(event, false);
			}
		}
		return !event.defaultPrevented;
	}
}

class StubDocument extends StubElement {
	constructor() {
		super(null, [], {});
		this.visibilityState = 'visible';
	}
}

/** Ein Browserspeicher im Arbeitsspeicher, MIT echten 'storage'-Zuhörern (S-11). */
const cells = new Map();
const storageListeners = [];

defineGlobal('localStorage', {
	getItem: (key) => (cells.has(key) ? cells.get(key) : null),
	setItem: (key, value) => {
		cells.set(key, String(value));
	},
	removeItem: (key) => {
		cells.delete(key);
	},
	clear: () => {
		cells.clear();
	},
	key: (index) => [...cells.keys()][index] ?? null,
	get length() {
		return cells.size;
	},
});

defineGlobal('addEventListener', (type, handler) => {
	if (type === 'storage') {
		storageListeners.push(handler);
	}
});
defineGlobal('removeEventListener', (type, handler) => {
	if (type !== 'storage') {
		return;
	}
	const at = storageListeners.indexOf(handler);
	if (at !== -1) {
		storageListeners.splice(at, 1);
	}
});

/**
 * Spielt ein Speicherereignis einer ZWEITEN Registerkarte ein.
 *
 * @param {string} key
 * @param {?string} newValue
 * @returns {void}
 */
function foreignWrite(key, newValue) {
	const oldValue = cells.has(key) ? cells.get(key) : null;
	if (newValue === null) {
		cells.delete(key);
	} else {
		cells.set(key, newValue);
	}
	const event = { key, oldValue, newValue, storageArea: localStorage };
	for (const handler of [...storageListeners]) {
		handler(event);
	}
}

/* ==========================================================================
   4. DIE VIER ECHTEN MODULE
   ========================================================================== */

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

console.log('Die vier Module');

const SOUND_URL = new URL('sound.js', CASINO_JS).href;
const SOUND_NAME = '@phomo17/casino-startpage/sound.js';
const KIT_NAME = '@phomo17/casino-startpage/sound-kit.js';
const IDLE_NAME = '@phomo17/casino-startpage/idle-noise.js';

const { sound } = await import(SOUND_URL);
check(typeof sound?.sustain === 'function',
	'casino_startpage/sound.js über seine Datei-URL geladen – EINE Instanz für alle');

const kitUrl = await toModule(new URL('sound-kit.js', CASINO_JS),
	[[SOUND_NAME, SOUND_URL]], 'sound-kit.js');
const kit = await import(kitUrl);
check(typeof kit.coin === 'function' && typeof kit.coinCascade === 'function',
	'sound-kit.js geladen (coin, coinCascade, metal, sheet, ratchet)');

const idleUrl = await toModule(new URL('idle-noise.js', CASINO_JS),
	[[SOUND_NAME, SOUND_URL], [KIT_NAME, kitUrl]], 'idle-noise.js');
const { IdleNoise } = await import(idleUrl);
check(typeof IdleNoise === 'function', 'idle-noise.js geladen');

const boardUrl = await toModule(new URL('sound.js', COIN_JS),
	[[SOUND_NAME, SOUND_URL], [KIT_NAME, kitUrl], [IDLE_NAME, idleUrl]], 'coin_pusher/sound.js');
const { MachineSound, shutdownSound } = await import(boardUrl);
check(typeof MachineSound === 'function', 'coin_pusher/sound.js geladen – das Klangpult');

/* ==========================================================================
   5. EIN GEHÄUSE
   ========================================================================== */

const document = new StubDocument();

/**
 * @returns {{root: StubElement, button: StubElement}}
 */
function buildMachine() {
	const root = document.append(new StubElement(document, ['.cp-machine']));
	const button = root.append(new StubElement(document, ['[data-cp-sound]'], { cpSound: '' }));
	button.setAttribute('aria-pressed', 'true');
	button.classList.add('cp-sound--on');
	return { root, button };
}

/** @param {string} key @returns {number} */
function plays(key) {
	return sound.stats().byKey[key] ?? 0;
}

/** @returns {number} */
function humming() {
	return sound.stats().sustainedVoices;
}

/** Die laufenden Dauerklänge als QUELLEN – die einzigen ohne Endzeit. */
function sustainedSources() {
	return scheduled.filter((source) => !source.ended && !Number.isFinite(source.stopTime));
}

function fire(target, type, detail, options = {}) {
	return target.dispatchEvent(new StubEvent(type, { detail, bubbles: true, ...options }));
}

const one = buildMachine();
const consoleErrors = [];
const realError = console.error;
const realWarn = console.warn;
console.error = (...args) => consoleErrors.push(args.map(String).join(' '));
console.warn = (...args) => consoleErrors.push(args.map(String).join(' '));

const board = new MachineSound(one.root);

/* ==========================================================================
   6. DIE PRÜFUNGEN
   ========================================================================== */

console.log('\nS-1 — vor der ersten echten Geste bleibt alles still');

check(sound.contextState === 'none', 'beim Laden entsteht kein AudioContext');
check(humming() === 0, 'auch kein Brummen – idle.start() läuft ohne Kontext ins Leere');

fire(one.root, 'cp:throw', { value: 1, ok: true });
advance(300);
check(sound.stats().startedVoices === 0, 'ein Münzeinwurf ohne Geste erzeugt keine einzige Stimme');
check(Object.keys(sound.stats().byKey).length === 0, 'und wird auch nicht als gespielt verbucht');

one.root.dispatchEvent(new StubEvent('pointerdown', { bubbles: true, isTrusted: false }));
check(sound.contextState === 'none', 'ein nachgemachter Zeigerdruck erteilt keine Aktivierung');

console.log('\nS-2 — der Tastaturweg schaltet ebenfalls frei');

one.root.dispatchEvent(new StubEvent('click', { bubbles: true, isTrusted: true, detail: 0 }));
check(sound.contextState === 'running',
	'ein vertrauenswürdiges click OHNE vorheriges pointerdown legt den Kontext an');
advance(200);
check(humming() === 1, 'und die Leerlaufgeräusche laufen an');
check(one.root.dataset.cpSoundSustained === undefined,
	'coin-pusher/sound.js führt keine eigenen data-Attribute (anders als video_slot)');

console.log('\nS-3 — der Münzeinwurf klingt, je Wert an einer anderen Tonhöhe');

const throwFreqs = [];
for (const value of [1, 2, 5, 10]) {
	const before = scheduled.length;
	fire(one.root, 'cp:throw', { value, ok: true });
	advance(150);
	const added = scheduled.slice(before);
	const tone = added.find((source) => source instanceof StubOscillator && source.path.reaches === true);
	check(tone !== undefined, `Wert ${value} legt einen Ton an den Ausgang`);
	if (tone !== undefined) {
		throwFreqs.push(Math.round(tone.frequency.at(tone.startTime)));
	}
}
check(new Set(throwFreqs).size === 4,
	`alle vier Münzwerte klingen an einer eigenen Grundfrequenz (${throwFreqs.join(', ')})`);
check(throwFreqs[0] > throwFreqs[1] && throwFreqs[1] > throwFreqs[2] && throwFreqs[2] > throwFreqs[3],
	'die kleine Münze klimpert höher als die große – streng fallend mit dem Wert');

advance(400);

console.log('\nS-4 — eine gefallene Münze klingt anders als fünf');

const beforeSingle = scheduled.length;
fire(one.root, 'cp:won', { count: 1, total: 5, byValue: [0, 0, 1, 0] });
advance(300);
const singleVoices = scheduled.length - beforeSingle;
check(plays('cp-tray') === 1, 'eine einzelne Münze: die Schale klingt einmal');
check(plays('cp-won') === 1, 'und genau eine Münze klimpert (coin(), Schlüssel cp-won)');

advance(400);

const beforeCascade = scheduled.length;
fire(one.root, 'cp:won', { count: 5, total: 25, byValue: [5, 0, 0, 0] });
advance(300);
const cascadeVoices = scheduled.length - beforeCascade;
check(plays('cp-tray') === 2, 'auch die Kaskade lässt die Schale einmal klingen (insgesamt zweimal)');
check(cascadeVoices <= 10,
	`die Kaskade kostet höchstens zehn Stimmen, nicht zwanzig (gemessen: ${cascadeVoices})`);
check(cascadeVoices > singleVoices,
	'die Kaskade beansprucht hörbar mehr Stimmen als die einzelne Münze');

console.log('\nS-5 — der Verlust klingt leiser und dumpfer, das Ventil klingt gar nicht');

advance(400);
fire(one.root, 'cp:lost', { total: 1 });
advance(300);
check(plays('cp-lost') === 1, 'eine seitlich verlorene Münze klingt (Schlüssel cp-lost)');

const beforeValve = scheduled.length;
fire(one.root, 'cp:valve', { total: 2 });
advance(300);
check(scheduled.length === beforeValve, 'das Ventil plant keine einzige neue Quelle – B.9.3: „still"');

console.log('\nS-6 — der Schub klingt zweimal je Umlauf, nicht öfter');

advance(400);
let forward = true;
for (let i = 0; i < 10; i++) {
	fire(one.root, 'cp:plate', { forward });
	forward = !forward;
	advance(2000);
}
check(plays('cp-plate') === 10,
	`über 20 simulierte Sekunden genau zehn Schub-Klänge – Umlauf 4 s, zwei Richtungswechsel je Umlauf (${plays('cp-plate')})`);

console.log('\nS-7 — die Leerlaufgeräusche treten an diesem Gerät NIE zurück');

const idle = board.idle;
check(idle.hum !== null && idle.hum.running === true, 'genau ein Brummen, und es läuft');

const humParts = sustainedSources();
check(humParts.length === 4,
	`das Brummen besteht aus vier Quellen: 50, 100, 150 Hz und das Rauschen (${humParts.length})`);
check(humParts.every((source) => source.path.reaches === true),
	'und jede davon hängt WIRKLICH am Ausgang – nicht im Leeren');
check(idle.busy === false, 'idle.busy bleibt immer false – dieses Gerät kennt kein "arbeitet gerade"');

const quietBefore = plays('idle-relay') + plays('idle-tick');
advance(30000);
check(plays('idle-relay') + plays('idle-tick') > quietBefore,
	'über 30 Sekunden – während laufend Schub-, Wurf- und Gewinnklänge gespielt werden – meldet sich der Leerlauf trotzdem');

one.button.dispatchEvent(new StubEvent('click', { bubbles: true, isTrusted: true, detail: 1 }));
check(sound.enabled === false, 'der Ton-Schalter schaltet ab');
check(humming() === 0, 'und nimmt das Brummen mit');
check(idle.timer === 0, 'auch der Zeitgeber ist weg – er feuerte sonst ins Leere');

one.button.dispatchEvent(new StubEvent('click', { bubbles: true, isTrusted: true, detail: 1 }));
advance(300);
check(sound.enabled === true && humming() === 1, 'beim Einschalten kommt das Brummen zurück');

document.visibilityState = 'hidden';
document.dispatchEvent(new StubEvent('visibilitychange'));
advance(200);
check(humming() === 0, 'ein versteckter Tab schweigt vollständig');

document.visibilityState = 'visible';
document.dispatchEvent(new StubEvent('visibilitychange'));
advance(300);
check(humming() === 1, 'bei der Rückkehr brummt es wieder');

console.log('\nS-8 — zwei Gehäuse auf einer Seite stören einander nicht');

const two = buildMachine();
const board2 = new MachineSound(two.root);
two.root.dispatchEvent(new StubEvent('pointerdown', { bubbles: true, isTrusted: true }));
advance(300);
check(humming() === 2, 'zwei Gehäuse brummen getrennt, jedes für sich');

const gapsBefore = sound.stats().gapDrops;
fire(two.root, 'cp:lost', { total: 1 });
advance(300);
check(plays('cp-lost') === 2, 'der zweite Automat klingt auf sein eigenes Ereignis');
check(sound.stats().gapDrops === gapsBefore,
	'und der erste schweigt dazu – sonst hätte die Sperre einen zweiten Versuch abweisen müssen');

board2.destroy();
advance(300);
check(humming() === 1, 'das Abräumen des einen nimmt nur sein eigenes Brummen mit');
check(board.idle.hum?.running === true, 'das andere brummt weiter');

console.log('\nS-11 — aria-pressed folgt sound.enabled, auch aus der Ferne');

check(one.button.getAttribute('aria-pressed') === 'true', 'zu Beginn eingeschaltet');
one.button.dispatchEvent(new StubEvent('click', { bubbles: true, isTrusted: true, detail: 1 }));
check(sound.enabled === false && one.button.getAttribute('aria-pressed') === 'false',
	'ein eigener Tastendruck setzt aria-pressed sofort mit');
one.button.dispatchEvent(new StubEvent('click', { bubbles: true, isTrusted: true, detail: 1 }));
advance(200);
check(sound.enabled === true && one.button.getAttribute('aria-pressed') === 'true', 'und wieder zurück');

foreignWrite(sound.STORAGE_KEY, '0');
check(sound.enabled === false, 'eine fremde Abschaltung übernimmt sound.enabled (reason remote)');
check(one.button.getAttribute('aria-pressed') === 'false',
	'und aria-pressed folgt ihr, obwohl niemand HIER die Taste gedrückt hat');

foreignWrite(sound.STORAGE_KEY, '1');
check(sound.enabled === true && one.button.getAttribute('aria-pressed') === 'true',
	'dieselbe Naht schaltet auch wieder ein');

console.log(`\nS-9 — Dauerlauf: ${THROWS} Einwürfe, ${WINS} Fälle, ${LOSSES} Verluste, ${CASHOUTS} Auszahlungen`);

const draw = sequence(20260903);
const VALUES = [1, 2, 5, 10];
const totalEvents = THROWS + WINS + LOSSES + CASHOUTS;

/**
 * Baut die Reihenfolge der dreihundertsechzig Ereignisse: gleichmäßig über
 * die Streckenanteile verteilt, damit kein Block aus lauter gleichartigen
 * Ereignissen entsteht – dieselbe Überlegung wie beim Auto-Modus der
 * Walzengeräte, hier aber ohne jeden Zufall: eine feste, nachrechenbare
 * Reihenfolge nach dem größten gemeinsamen Anteil.
 *
 * @returns {string[]}
 */
function buildSchedule() {
	const kinds = [
		{ kind: 'throw', count: THROWS },
		{ kind: 'won', count: WINS },
		{ kind: 'lost', count: LOSSES },
		{ kind: 'cashout', count: CASHOUTS },
	];
	const positions = kinds.map((entry) => ({ ...entry, done: 0 }));
	const result = [];
	for (let slot = 0; slot < totalEvents; slot++) {
		// Der Kind mit dem größten Rückstand (Anteil noch offen) kommt dran –
		// das verteilt jede Sorte so gleichmäßig wie möglich über die Strecke.
		let chosen = positions[0];
		let bestShare = -1;
		for (const entry of positions) {
			if (entry.done >= entry.count) {
				continue;
			}
			const share = (entry.count - entry.done) / entry.count;
			if (share > bestShare) {
				bestShare = share;
				chosen = entry;
			}
		}
		chosen.done++;
		result.push(chosen.kind);
	}
	return result;
}

for (const kind of buildSchedule()) {
	if (kind === 'throw') {
		fire(one.root, 'cp:throw', { value: VALUES[draw(4)], ok: true });
	} else if (kind === 'won') {
		const count = 1 + draw(9);
		fire(one.root, 'cp:won', { count, total: count * VALUES[draw(4)], byValue: [count, 0, 0, 0] });
	} else if (kind === 'lost') {
		fire(one.root, 'cp:lost', { total: VALUES[draw(4)] });
	} else {
		fire(one.root, 'cp:cashout', { moved: 10 + draw(200) });
	}
	advance(40 + draw(60));
}

advance(3000);
const stats = sound.stats();

console.log('\n  Welcher Klang wie oft');
for (const [key, count] of Object.entries(stats.byKey).sort((a, b) => b[1] - a[1])) {
	console.log(`  ${key.padEnd(20)} ${String(count).padStart(5)}`);
}
console.log('');

check(stats.droppedVoices === 0,
	`null verworfene Stimmen (${stats.droppedVoices} von ${stats.startedVoices} geplanten)`);
check(stats.droppedSustained === 0, `null verworfene Dauerklänge (${stats.droppedSustained})`);
check(stats.peakVoices < sound.MAX_VOICES,
	`höchste gleichzeitige Stimmenzahl ${stats.peakVoices} von ${sound.MAX_VOICES}`);
check(stats.activeVoices === 0, 'nach dem Lauf klingt nichts mehr nach');
check(consoleErrors.length === 0,
	`keine einzige Konsolenausgabe (${consoleErrors.length})`);
for (const line of consoleErrors) {
	console.log(`          ${line}`);
}

board.destroy();
board2.destroy();
advance(500);
check(humming() === 0, 'nach dem Abräumen läuft kein Dauerklang mehr – kein Leck');
check(sustainedSources().length === 0, 'auch im Klanggraphen läuft keine Quelle ohne Ende mehr');

shutdownSound();

console.log('\nS-10 — der ausgerechnete Ausschlag');

const bound = peakBound();
console.log(`  Stimmen im dichtesten Augenblick   ${bound.voices}`);
console.log(`  Zeitpunkt                          ${bound.at.toFixed(2).replace('.', ',')} s`);
console.log(`  AUSGERECHNETE OBERE SCHRANKE       ${bound.peak.toFixed(3).replace('.', ',')}`);
check(bound.peak < 1,
	`die obere Schranke des Ausschlags bleibt unter 1,0 (${bound.peak.toFixed(3).replace('.', ',')})`);
check(bound.peak > 0,
	'und sie ist größer als 0 – es wurde wirklich etwas an den Ausgang gehängt');

console.error = realError;
console.warn = realWarn;

console.log(failed
	? '\nERGEBNIS: der Klang erfüllt mindestens eine Zusage aus Plan-Abschnitt 4.31/4.34 nicht.'
	: `\nERGEBNIS: über ${totalEvents} Ereignisse keine verworfene Stimme, keine Konsolenausgabe, `
	+ 'der Ausschlag bleibt rechnerisch unter 1,0, der Münzeinwurf klingt je Wert unterscheidbar, '
	+ 'eine Münze klingt anders als eine Kaskade, das Ventil bleibt stumm, der Schub klingt genau '
	+ 'zweimal je Umlauf, der Leerlauf tritt nie zurück, aria-pressed folgt auch einer fremden '
	+ 'Registerkarte, und kein Dauerklang bleibt zurück.');

process.exit(failed ? 1 : 0);
