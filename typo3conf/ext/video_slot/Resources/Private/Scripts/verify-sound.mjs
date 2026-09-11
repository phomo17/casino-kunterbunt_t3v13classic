/**
 * Video Slot – Nachweis des Klangs
 * =========================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/video_slot/Resources/Private/Scripts/verify-sound.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei der ersten Abweichung.
 *
 *
 * WAS HIER BEWIESEN WIRD (CONCEPT.md B.10, Phase 7)
 * -------------------------------------------------
 *  S-1   vor der ersten ECHTEN Nutzergeste entsteht kein Kontext und klingt
 *        nichts – auch ein nachgemachtes Ereignis erteilt keine Aktivierung.
 *  S-2   der TASTATURWEG schaltet ebenfalls frei: ein vertrauenswürdiges
 *        click ohne vorheriges pointerdown erzeugt den Kontext genauso.
 *  S-3   der Zählklang hängt an der FAHRT: ein Ton je sichtbarem Schritt,
 *        keiner beim Setzen, keiner abwärts, keiner für eine fremde Anzeige.
 *  S-4   ZWEI hörbar verschiedene Absagen – und eine dritte, die stumm
 *        bleibt, weil das Ereignis die Blasenphase nie erreicht.
 *  S-5   CASH OUT klingt nur, wenn wirklich Geld geflossen ist.
 *  S-6   die Leerlaufgeräusche: genau EIN Brummen je Gehäuse, es schweigt
 *        vollständig, solange das Gerät arbeitet ODER die Leiter läuft, und
 *        der Ton-Schalter wie der Registerkartenwechsel nehmen es mit.
 *  S-7   zwei Gehäuse auf einer Seite stören einander nicht.
 *  S-8   ein Dauerlauf über 50 Runden mit allen vier Gewinnstufen, Einwürfen,
 *        Auszahlungen und Leiterläufen: NULL verworfene Stimmen, NULL
 *        Konsolenausgaben, kein zurückgebliebener Dauerklang.
 *  S-9   der ausgerechnete Ausschlag über den GANZEN Lauf bleibt unter 1,0.
 *  S-10  fünf Walzenstopps, in dieser Reihenfolge, an fallenden Grundtönen
 *        unterscheidbar (360/330/300/275/250 Hz).
 *  S-11  aria-pressed am Ton-Schalter folgt sound.enabled – auch dann, wenn
 *        eine ANDERE Registerkarte abgeschaltet hat (reason 'remote').
 *
 *
 * WARUM MIT DEN ECHTEN DATEIEN UND WIE
 * ------------------------------------
 * Eine eigens für die Prüfung geschriebene Nachbildung könnte richtig rechnen,
 * während das Gerät falsch klingt; dann wäre der Nachweis wertlos. Geladen
 * werden deshalb FÜNF echte Module über ZWEI Extensions:
 *
 *   casino_startpage  sound.js       die Klangerzeugung
 *                     sound-kit.js   der Klangbaukasten
 *                     idle-noise.js  die Leerlaufgeräusche
 *   video_slot        sound.js       das Klangpult dieses Geräts
 *                     counter.js     das Zählwerk, das vs:count sendet
 *
 * Zwei Hindernisse und ihre Auflösung (dasselbe Verfahren wie in
 * reel_slot/verify-sound.mjs):
 *
 *  a) Vier der fünf Dateien importieren einander über die Import-Map von
 *     TYPO3 ('@phomo17/…'). Node kennt diese Karte nicht. Sie werden deshalb
 *     ALS TEXT gelesen, genau diese Namen ersetzt und als data:-Modul
 *     geladen. Es ist Zeile für Zeile derselbe Code; nur der Modulname ist
 *     ein anderer. counter.js hat keinen einzigen Import und wird deshalb
 *     UNVERÄNDERT geladen.
 *  b) sound.js führt DEN Zustand: Kontext, Stimmenzählung, Schalter. Es wird
 *     über seine DATEI-URL geladen, und genau diese URL wird in die anderen
 *     Dateien hineingeschrieben. Damit benutzen alle fünf Module dieselbe
 *     Instanz.
 *
 * Node hat weder Web Audio noch ein Dokument noch einen Browserspeicher.
 * Beides wird VOR dem Laden hier bereitgestellt (Abschnitte 1 bis 3). Anders
 * als reel_slot/verify-sound.mjs führt der Speicher hier ZUSÄTZLICH echte
 * 'storage'-Zuhörer, weil S-11 eine ZWEITE Registerkarte nachstellen muss
 * (dasselbe Verfahren wie in casino_startpage/verify-machine-credit.mjs).
 *
 *
 * WARUM DER AUSSCHLAG AUSGERECHNET UND NICHT GEMESSEN WIRD
 * ---------------------------------------------------------
 * Unter Node klingt nichts, eine Messung ergäbe 0. Gerechnet wird für jeden
 * Augenblick die Summe der Hüllkurven aller geplanten Stimmen, jede
 * multipliziert mit allen Verstärkungen auf ihrem Weg zum Ausgang. Weil jede
 * Auslöschung zwischen zwei Schwingungen ignoriert wird, ist das Ergebnis
 * eine OBERE SCHRANKE – der echte Ausschlag kann nie größer sein. Gerechnet
 * wird auf den Stützstellen selbst, nicht auf einem Raster; zwischen zwei
 * benachbarten Stützstellen ist jede Hüllkurve monoton, deshalb genügt je
 * Abschnitt der größere Randwert. Ein Raster könnte den lautesten Augenblick
 * verfehlen, diese Rechnung nicht.
 *
 *
 * WARUM DIE ZEIT VIRTUELL IST
 * ---------------------------
 * 50 Runden dauern in Wirklichkeit mehrere Minuten. setTimeout,
 * requestAnimationFrame und performance.now() werden deshalb auf eine eigene
 * Uhr umgestellt, die in Schritten von 8 ms vorgestellt wird. Der geprüfte
 * Code merkt davon nichts: er ruft dieselben Funktionen wie im Browser.
 *
 * Auch Math.random() wird ersetzt – durch dieselbe kleine, wiederholbare
 * Zahlenfolge wie in den anderen Prüfskripten dieses Hauses. Erlaubt ist das,
 * weil in den geprüften Dateien mit Math.random() nichts GEZOGEN wird: es
 * streut Tonhöhen und Abstände, also Klangfarbe. Spielwerte kommen in diesem
 * Projekt ausnahmslos aus crypto.getRandomValues.
 *
 * Alle Vergleiche sind ganzzahlig, bis auf den Ausschlag (S-9) – der wird mit
 * < geprüft. Im ganzen Skript steht sonst kein Vergleich zweier Kommazahlen
 * auf Gleichheit.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/** Die beiden Modulverzeichnisse. Von hier aus: vier Ebenen hoch nach ext/. */
const CASINO_JS = new URL('../../../../casino_startpage/Resources/Public/JavaScript/', import.meta.url);
const VIDEO_JS = new URL('../../Public/JavaScript/', import.meta.url);

/** CONCEPT.md B.10, Phase 7 verlangt einen Dauerlauf; 50 wie am Reel Slot. */
const ROUNDS = 50;

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
 * Setzt einen globalen Namen – auch dann, wenn Node ihn schon belegt.
 *
 * @param {string} name
 * @param {*} value
 * @returns {void}
 */
function defineGlobal(name, value) {
	Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

/**
 * Eine kleine, wiederholbare Zahlenfolge – kein Zufall, damit jeder Lauf
 * dasselbe Ergebnis liefert.
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

let randomState = 20260902;
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

/**
 * Ein Regler mit Gedächtnis. Siehe reel_slot/verify-sound.mjs für die
 * ausführliche Begründung – hier wortgleich übernommen.
 */
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
	 * Zustellung in drei Phasen: Erfassung, Ziel, Blase. Genau diese
	 * Reihenfolge ist der Grund, warum sound.js vs:round am Dokument in der
	 * BLASENPHASE abhört – erst dort steht defaultPrevented fest.
	 *
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

/**
 * Ein Browserspeicher im Arbeitsspeicher, MIT echten 'storage'-Zuhörern.
 *
 * Anders als reel_slot/verify-sound.mjs, das addEventListener zu einem
 * No-op macht: S-11 braucht eine ZWEITE Registerkarte, und die kann nur
 * nachgestellt werden, wenn eine 'storage'-Anmeldung wirklich etwas merkt.
 * Dasselbe Verfahren wie in casino_startpage/verify-machine-credit.mjs.
 */
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
 * Spielt ein Speicherereignis einer ZWEITEN Registerkarte ein. Schreibt
 * dabei selbst in den Speicher, weil ein 'storage'-Ereignis im Browser nie
 * in der schreibenden Karte selbst feuert.
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
   4. DIE FÜNF ECHTEN MODULE
   ========================================================================== */

/**
 * Liest eine Datei als Text, ersetzt die Modulnamen und liefert sie als
 * data:-Modul zurück.
 *
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

console.log('Die fünf Module');

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
check(typeof kit.coin === 'function' && typeof kit.countStep === 'function',
	'sound-kit.js geladen (coin, coinCascade, metal, sheet, ratchet, cashRegister, countStep)');

const idleUrl = await toModule(new URL('idle-noise.js', CASINO_JS),
	[[SOUND_NAME, SOUND_URL], [KIT_NAME, kitUrl]], 'idle-noise.js');
const { IdleNoise } = await import(idleUrl);
check(typeof IdleNoise === 'function', 'idle-noise.js geladen');

const boardUrl = await toModule(new URL('sound.js', VIDEO_JS),
	[[SOUND_NAME, SOUND_URL], [KIT_NAME, kitUrl], [IDLE_NAME, idleUrl]], 'video_slot/sound.js');
const { MachineSound } = await import(boardUrl);
check(typeof MachineSound === 'function', 'video_slot/sound.js geladen – das Klangpult');

const { NixieCounter } = await import(new URL('counter.js', VIDEO_JS).href);
check(typeof NixieCounter === 'function',
	'video_slot/counter.js unverändert geladen – es hat keinen einzigen Import');

/* ==========================================================================
   5. EIN GEHÄUSE, EIN ZÄHLWERK, EIN PAAR ABKÜRZUNGEN
   ========================================================================== */

const document = new StubDocument();

/**
 * @returns {{root: StubElement, button: StubElement, group: object}}
 */
function buildMachine() {
	const root = document.append(new StubElement(document, ['.vs-machine']));
	const cabinet = root.append(new StubElement(document, ['.vs-cabinet']));
	const button = cabinet.append(new StubElement(document, ['[data-vs-sound]'], { vsSound: '' }));
	button.setAttribute('aria-pressed', 'true');
	const element = root.append(new StubElement(document, ['.vs-nixie-group'], { vsDisplay: 'guthaben' }));
	const group = {
		element,
		length: 6,
		shown: [],
		show(value) {
			this.shown.push(value);
		},
		destroy() {},
	};
	return { root, button, group };
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

fire(one.root, 'vs:state', { from: 'idle', to: 'spinning' });
advance(500);
check(sound.stats().startedVoices === 0, 'ein Tastendruck ohne Geste erzeugt keine einzige Stimme');
check(Object.keys(sound.stats().byKey).length === 0, 'und wird auch nicht als gespielt verbucht');

one.root.dispatchEvent(new StubEvent('pointerdown', { bubbles: true, isTrusted: false }));
check(sound.contextState === 'none', 'ein nachgemachter Zeigerdruck erteilt keine Aktivierung');

fire(one.root, 'vs:state', { from: 'spinning', to: 'idle' });
advance(200);

console.log('\nS-2 — der Tastaturweg schaltet ebenfalls frei');

one.root.dispatchEvent(new StubEvent('click', { bubbles: true, isTrusted: true, detail: 0 }));
check(sound.contextState === 'running',
	'ein vertrauenswürdiges click OHNE vorheriges pointerdown legt den Kontext an');
advance(200);
check(humming() === 1, 'und die Leerlaufgeräusche laufen an');
check(one.root.dataset.vsSoundSustained === '1', 'data-vs-sound-sustained meldet es am Gehäuse');
check(one.root.dataset.vsSoundSustainDropped === '0', 'data-vs-sound-sustain-dropped steht auf 0');

console.log('\nS-3 — der Zählklang hängt an der Fahrt, nicht am Betrag');

const counter = new NixieCounter(one.group);
let counted = { up: 0, down: 0 };
one.root.addEventListener('vs:count', (event) => {
	counted[event.detail.direction === 'up' ? 'up' : 'down']++;
});

counter.snap(100);
advance(300);
check(counted.up === 0 && plays('count') === 0, 'snap() ist ein Setzen und kein Zählen – es klingt nicht');

counter.ramp(112);
advance(1500);
check(counter.value === 112, 'die Fahrt kommt auf dem Zielwert an');
check(counted.up === 12, `zwölf sichtbare Schritte, zwölf Meldungen (${counted.up})`);
check(plays('count') === 12, `und genau zwölf Zählklänge (${plays('count')})`);

counter.ramp(100);
advance(1500);
check(counted.down === 12, 'auch abwärts meldet das Zählwerk jeden Schritt');
check(plays('count') === 12, 'aber abwärts klingt kein einziger – das wäre ein Verlustklang ohne Verlust');

fire(one.root, 'vs:count', { display: 'einsatz', value: 5, index: 1, steps: 4, direction: 'up' });
advance(200);
check(plays('count') === 12, 'eine andere Anzeige löst keinen Zählklang aus');

console.log('\nS-4 — zwei hörbare Absagen, eine stumme');

fire(one.root, 'vs:coin', { amount: 20, moved: 20, reason: 'ok', machineCredit: 120 });
advance(400);
check(plays('coin') === 1, 'ein angenommener Einwurf klingt nach Münze');

fire(one.root, 'vs:coin', { amount: 20, moved: 0, reason: 'nocash', machineCredit: 120 });
advance(400);
check(plays('coin-refused') === 1 && plays('coin') === 1,
	'ABSAGE 1: eine abgelehnte Münze klingt anders – und nicht nach Münze');

const refuse = (event) => event.preventDefault();
one.root.addEventListener('vs:round', refuse);
fire(one.root, 'vs:round', { draw: [0, 0, 0, 0, 0], bet: 1 }, { cancelable: true });
advance(500);
check(plays('round-refused') === 1, 'ABSAGE 2: ein abgelehnter Zug bekommt seinen eigenen tiefen Anschlag');
one.root.removeEventListener('vs:round', refuse);

fire(one.root, 'vs:round', { draw: [0, 0, 0, 0, 0], bet: 1 }, { cancelable: true });
advance(500);
check(plays('round-refused') === 1, 'ein angenommener Zug bleibt still');

// Genau das tut risk.js: am Dokument, in der Erfassungsphase, mit
// stopPropagation(). Das Ereignis erreicht die Blasenphase nie.
const swallow = (event) => {
	event.preventDefault();
	event.stopPropagation();
};
document.addEventListener('vs:round', swallow, true);
fire(one.root, 'vs:round', { draw: [0, 0, 0, 0, 0], bet: 1 }, { cancelable: true });
advance(500);
check(plays('round-refused') === 1,
	'ABSAGE 3: in der Risiko-Leiter bleibt START stumm, obwohl der Zug abgelehnt ist');
document.removeEventListener('vs:round', swallow, true);

console.log('\nS-5 — CASH OUT klingt nur, wenn wirklich Geld fließt');

fire(one.root, 'vs:cashout', { moved: 0, capped: true, machineCredit: 250 });
advance(600);
check(plays('cashout-tray') === 0 && plays('cashout') === 0,
	'bei voller Kasse fließt nichts und es klingt nichts – das Schild sagt es');

fire(one.root, 'vs:cashout', { moved: 250, capped: false, machineCredit: 0 });
advance(800);
check(plays('cashout-tray') === 1, 'die Klappe der Auswurfschale');
check(plays('cashout') === 1, 'und danach die Münzen');

console.log('\nS-6 — die Leerlaufgeräusche');

const idle = board.idle;
check(idle.hum !== null && idle.hum.running === true, 'genau ein Brummen, und es läuft');

const humParts = sustainedSources();
check(humParts.length === 4,
	`das Brummen besteht aus vier Quellen: 50, 100, 150 Hz und das Rauschen (${humParts.length})`);
check(humParts.every((source) => source.path.reaches === true),
	'und jede davon hängt WIRKLICH am Ausgang – nicht im Leeren');

const quietBefore = plays('idle-relay') + plays('idle-tick');
fire(one.root, 'vs:state', { from: 'idle', to: 'spinning' });
advance(12000);
check(idle.busy === true, 'während der Walzenlauf läuft, tritt der Leerlauf zurück');
check(idle.timer === 0, 'sein Zeitgeber ist gelöscht, nicht nur übersprungen');
check(plays('idle-relay') + plays('idle-tick') === quietBefore,
	'in zwölf Sekunden Arbeit kein Relaisklick und kein Ticken');

fire(one.root, 'vs:state', { from: 'spinning', to: 'evaluating' });
fire(one.root, 'vs:risk', { phase: 'start', level: 1, win: 5 });
fire(one.root, 'vs:state', { from: 'evaluating', to: 'result' });
advance(200);
check(idle.busy === true,
	'in der laufenden Risiko-Leiter bleibt es still, obwohl der Spielkern längst ruht');

fire(one.root, 'vs:risk', { phase: 'end', level: 0, win: 0 });
fire(one.root, 'vs:state', { from: 'result', to: 'idle' });
advance(200);
check(idle.busy === false, 'nach der Leiter lebt das Gerät wieder hörbar');
advance(20000);
check(plays('idle-relay') + plays('idle-tick') > quietBefore,
	'und im Ruhezustand sind Relais und Ticken wieder zu hören');

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
check(humming() === 0 && idle.timer === 0, 'ein versteckter Tab schweigt vollständig');

document.visibilityState = 'visible';
document.dispatchEvent(new StubEvent('visibilitychange'));
advance(300);
check(humming() === 1, 'bei der Rückkehr brummt es wieder');

console.log('\nS-7 — zwei Gehäuse auf einer Seite stören einander nicht');

const two = buildMachine();
const board2 = new MachineSound(two.root);
two.root.dispatchEvent(new StubEvent('pointerdown', { bubbles: true, isTrusted: true }));
advance(300);
check(humming() === 2, 'zwei Gehäuse brummen getrennt, jedes für sich');

const gapsBefore = sound.stats().gapDrops;
const refuseTwo = (event) => event.preventDefault();
two.root.addEventListener('vs:round', refuseTwo);
fire(two.root, 'vs:round', { draw: [0, 0, 0, 0, 0], bet: 1 }, { cancelable: true });
advance(500);
two.root.removeEventListener('vs:round', refuseTwo);
check(plays('round-refused') === 2, 'der zweite Automat antwortet auf seine eigene Absage');
check(sound.stats().gapDrops === gapsBefore,
	'und der erste schweigt dazu – sonst hätte die Sperre einen zweiten Versuch abweisen müssen');

board2.destroy();
advance(300);
check(humming() === 1, 'das Abräumen des einen nimmt nur sein eigenes Brummen mit');
check(board.idle.hum?.running === true, 'das andere brummt weiter');
check(two.root.dataset.vsSoundSustained === '1',
	'das Attribut meldet die SEITE, nicht das Gehäuse – alle teilen einen Kontext');

console.log('\nS-10 — fünf Walzenstopps, fallende Grundtöne');

const START_FREQ = [360, 330, 300, 275, 250];
for (let reel = 1; reel <= 5; reel++) {
	const before = scheduled.length;
	fire(one.root, 'vs:reelrest', { reel });
	advance(50);
	const added = scheduled.slice(before);
	const tone = added.find((source) => source instanceof StubOscillator && source.path.reaches === true);
	check(tone !== undefined, `stop-${reel} legt einen Ton an den Ausgang`);
	if (tone !== undefined) {
		const startFreq = Math.round(tone.frequency.at(tone.startTime));
		check(startFreq === START_FREQ[reel - 1],
			`stop-${reel} beginnt bei ${START_FREQ[reel - 1]} Hz (gemessen ${startFreq})`);
	}
	check(plays(`stop-${reel}`) === 1, `stop-${reel} genau einmal gezählt`);
}

console.log('\nS-11 — aria-pressed folgt sound.enabled, auch aus der Ferne');

check(one.button.getAttribute('aria-pressed') === 'true', 'zu Beginn eingeschaltet');
one.button.dispatchEvent(new StubEvent('click', { bubbles: true, isTrusted: true, detail: 1 }));
check(sound.enabled === false && one.button.getAttribute('aria-pressed') === 'false',
	'ein eigener Tastendruck setzt aria-pressed sofort mit');
one.button.dispatchEvent(new StubEvent('click', { bubbles: true, isTrusted: true, detail: 1 }));
advance(200);
check(sound.enabled === true && one.button.getAttribute('aria-pressed') === 'true', 'und wieder zurück');

// Eine ANDERE Registerkarte schreibt auf denselben Speicherschlüssel: sound.js
// meldet sich beim Laden für 'storage' an; der Zuhörer läuft SYNCHRON, wenn
// foreignWrite() ihn ruft.
foreignWrite(sound.STORAGE_KEY, '0');
check(sound.enabled === false, 'eine fremde Abschaltung übernimmt sound.enabled (reason remote)');
check(one.button.getAttribute('aria-pressed') === 'false',
	'und aria-pressed folgt ihr, obwohl niemand HIER die Taste gedrückt hat');

foreignWrite(sound.STORAGE_KEY, '1');
check(sound.enabled === true && one.button.getAttribute('aria-pressed') === 'true',
	'dieselbe Naht schaltet auch wieder ein');

console.log(`\nS-8 — Dauerlauf über ${ROUNDS} Runden`);

const BETS = [1, 2, 5, 10];
// Faktoren, die gezielt alle vier Gewinnstufen dieses Geräts treffen:
// 1 (klein), 5 (mittel), 18 (gross), 100 (jackpot) – und viele Nullen dazwischen,
// denn die Trefferhäufigkeit liegt bei 0,192662 je Runde (README).
const FACTORS = [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 5, 0, 0, 0, 0, 18, 0, 0, 0, 0, 100, 0, 0, 0, 3];
const draw = sequence(20260902);

let machineCredit = 500;
counter.snap(machineCredit);

for (let round = 1; round <= ROUNDS; round++) {
	const bet = BETS[draw(BETS.length)];

	if (round % 7 === 1) {
		machineCredit += 100;
		fire(one.root, 'vs:coin', { amount: 100, moved: 100, reason: 'ok', machineCredit });
		counter.ramp(machineCredit);
		advance(600);
	}

	fire(one.root, 'vs:round', { draw: [0, 0, 0, 0, 0], bet }, { cancelable: true });
	machineCredit -= bet;
	counter.ramp(machineCredit);
	fire(one.root, 'vs:state', { from: 'idle', to: 'spinning' });
	advance(400);

	for (let reel = 1; reel <= 5; reel++) {
		fire(one.root, 'vs:reelrest', { reel });
		advance(80);
	}

	fire(one.root, 'vs:state', { from: 'stopping', to: 'evaluating' });
	advance(120);

	const factor = FACTORS[draw(FACTORS.length)];
	fire(one.root, 'vs:result', { factor, win: factor * bet, bet });
	advance(60);

	if (factor > 0) {
		// Jede fünfte Gewinnrunde geht über die Risiko-Leiter statt der
		// sofortigen Gutschrift – derselbe Klangweg wie eine echte Leiter.
		if (round % 5 === 0) {
			const win = factor * bet;
			fire(one.root, 'vs:risk', { phase: 'start', level: 1, win });
			advance(200);
			fire(one.root, 'vs:risktick', { level: 1, lit: 'left', on: true });
			advance(200);
			fire(one.root, 'vs:risk', { phase: 'hit', level: 2, win: win * 2 });
			advance(200);
			fire(one.root, 'vs:risk', { phase: 'collect', level: 2, win: win * 2 });
			machineCredit += win * 2;
			fire(one.root, 'vs:collect', { amount: win * 2, credited: win * 2, capped: false, machineCredit });
			counter.ramp(machineCredit);
			fire(one.root, 'vs:risk', { phase: 'end', level: 0, win: 0 });
			advance(2600);
		} else {
			const credited = factor * bet;
			machineCredit += credited;
			fire(one.root, 'vs:collect', { amount: credited, credited, capped: false, machineCredit });
			counter.ramp(machineCredit);
			advance(2600);
		}
	}

	fire(one.root, 'vs:state', { from: 'evaluating', to: 'result' });
	advance(300);
	fire(one.root, 'vs:state', { from: 'result', to: 'idle' });
	advance(500);

	if (round % 11 === 0 && machineCredit > 200) {
		fire(one.root, 'vs:cashout', { moved: machineCredit, capped: false, machineCredit: 0 });
		machineCredit = 0;
		counter.ramp(0);
		advance(900);
	}
}

advance(3000);
const stats = sound.stats();

console.log('\n  Welcher Klang wie oft');
for (const [key, count] of Object.entries(stats.byKey).sort((a, b) => b[1] - a[1])) {
	console.log(`  ${key.padEnd(16)} ${String(count).padStart(5)}`);
}
console.log('');

check(stats.droppedVoices === 0,
	`null verworfene Stimmen (${stats.droppedVoices} von ${stats.startedVoices} geplanten)`);
check(stats.droppedSustained === 0, `null verworfene Dauerklänge (${stats.droppedSustained})`);
check(stats.gapDrops === 0, `null wegen Mindestabstand verworfene Klänge (${stats.gapDrops})`);
check(stats.peakVoices < sound.MAX_VOICES,
	`höchste gleichzeitige Stimmenzahl ${stats.peakVoices} von ${sound.MAX_VOICES}`);
check(stats.activeVoices === 0, 'nach dem Lauf klingt nichts mehr nach');
check(consoleErrors.length === 0,
	`keine einzige Konsolenausgabe (${consoleErrors.length})`);
for (const line of consoleErrors) {
	console.log(`          ${line}`);
}

counter.destroy();
board.destroy();
advance(500);
check(humming() === 0, 'nach dem Abräumen läuft kein Dauerklang mehr – kein Leck');
check(one.root.dataset.vsSoundSustained === '0',
	'und das Gehäuse meldet das auch: data-vs-sound-sustained ist 0');
check(sustainedSources().length === 0, 'auch im Klanggraphen läuft keine Quelle ohne Ende mehr');

console.log('\nS-9 — der ausgerechnete Ausschlag');

const bound = peakBound();
console.log(`  Stimmen im dichtesten Augenblick   ${bound.voices}`);
console.log(`  Zeitpunkt                          ${bound.at.toFixed(2).replace('.', ',')} s`);
console.log(`  gemessen (unter Node immer 0)      ${stats.peakLevel.toFixed(3).replace('.', ',')}`);
console.log(`  AUSGERECHNETE OBERE SCHRANKE       ${bound.peak.toFixed(3).replace('.', ',')}`);
check(bound.peak < 1,
	`die obere Schranke des Ausschlags bleibt unter 1,0 (${bound.peak.toFixed(3).replace('.', ',')})`);
check(bound.peak > 0,
	'und sie ist größer als 0 – es wurde wirklich etwas an den Ausgang gehängt');

console.error = realError;
console.warn = realWarn;

console.log(failed
	? '\nERGEBNIS: der Klang erfüllt mindestens eine Zusage aus B.10, Phase 7 nicht.'
	: `\nERGEBNIS: über ${ROUNDS} Runden keine verworfene Stimme, keine Konsolenausgabe, `
	+ 'der Ausschlag bleibt rechnerisch unter 1,0, der Zählklang hängt an der Fahrt, '
	+ 'alle Absagen klingen richtig, der Tastaturweg schaltet frei, aria-pressed folgt '
	+ 'auch einer fremden Registerkarte, und kein Dauerklang bleibt zurück.');

process.exit(failed ? 1 : 0);
