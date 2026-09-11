/**
 * FruitRisk – Nachweis des Klangs
 * =========================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/fruit_risk/Resources/Private/Scripts/verify-sound.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei der ersten Abweichung.
 *
 *
 * WAS HIER BEWIESEN WIRD (Fertig-Kriterium F5d)
 * -----------------------------------------------
 *  T-1   vor der ersten ECHTEN Nutzergeste entsteht kein AudioContext und
 *        klingt nichts — auch ein nachgemachtes Ereignis erteilt keine
 *        Aktivierung.
 *  T-2   der TASTATURWEG schaltet ebenso frei wie der Zeiger: ein
 *        vertrauenswürdiges keydown erzeugt den Kontext genauso wie ein
 *        pointerdown.
 *  T-3   sechs Walzenstopps, unterscheidbar und STRENG STEIGEND
 *        (262/294/330/370/415/466 Hz) — der hörbare Unterschied zu
 *        video_slot, wo sie fallen.
 *  T-4   die drei Leitern klingen verschieden; risk8 liefert VIER
 *        verschiedene Tonhöhen, eine je Taste, ohne Stapelung.
 *  T-5   der Zählklang hängt an der FAHRT der Anzeige "guthaben", an keiner
 *        anderen.
 *  T-6   die Leerlaufgeräusche: genau EIN Brummen je Gehäuse, es schweigt
 *        vollständig, solange das Gerät arbeitet ODER eine Leiter läuft.
 *  T-7   zwei hörbare Absagen — ein abgelehnter Zug und ein abgelehnter
 *        Einwurf klingen, ein angenommener Zug bleibt still.
 *  T-8   ein Dauerlauf über 50 Runden mit allen vier Gewinnstufen, Einwürfen,
 *        Auszahlungen, allen drei Leiterläufen und Auto-Modus: NULL
 *        verworfene Stimmen, NULL verworfene Dauerklänge, NULL wegen
 *        Mindestabstand verworfene Klänge, NULL Konsolenausgaben, kein
 *        zurückgebliebener Dauerklang.
 *  T-9   der ausgerechnete Ausschlag über den GANZEN Lauf bleibt unter 1,0
 *        und ist größer als 0.
 *  T-10  aria-pressed und data-fr-sound-on folgen sound.enabled — auch dann,
 *        wenn eine ANDERE Registerkarte abgeschaltet hat (reason 'remote').
 *  T-11  KEIN dataset-Feld dieses Gehäuses ist doppelt belegt — generisch
 *        über das ganze Feld geprüft, nicht nur data-fr-sound (Abnahmetest
 *        T-84: der Ton-Schalter trägt data-fr-sound, .fr-machine schreibt
 *        dort NIE hinein, der eigene Zustandsspiegel heißt
 *        data-fr-sound-on).
 *
 * Was dieses Skript AUSDRÜCKLICH NICHT prüfen kann: ob der Klang GUT ist, ob
 * er zu diesem Gerät passt und ob er an ein bestimmtes fremdes Spiel
 * erinnert (CONCEPT.md B.3 Nummer 11). Das kann nur ein Mensch — siehe
 * test.txt.
 *
 *
 * WARUM MIT DEN ECHTEN DATEIEN UND WIE
 * ------------------------------------
 * Eine eigens für die Prüfung geschriebene Nachbildung könnte richtig
 * rechnen, während das Gerät falsch klingt. Geladen werden deshalb FÜNF
 * echte Module über ZWEI Extensions:
 *
 *   casino_startpage  sound.js       die Klangerzeugung
 *                     sound-kit.js   der Klangbaukasten
 *                     idle-noise.js  die Leerlaufgeräusche
 *   fruit_risk        sound.js       das Klangpult dieses Geräts
 *                     counter.js     das Zählwerk, das fr:count sendet
 *
 * Dasselbe Verfahren wie in video_slot/…/verify-sound.mjs und
 * reel_slot/…/verify-sound.mjs: vier der fünf Dateien importieren einander
 * über die Import-Map von TYPO3 ('@phomo17/…'), die Node nicht kennt. Sie
 * werden deshalb ALS TEXT gelesen, genau diese Namen ersetzt und als
 * data:-Modul geladen — Zeile für Zeile derselbe Code, nur der Modulname ist
 * ein anderer. counter.js hat keinen einzigen Import und wird deshalb
 * UNVERÄNDERT geladen. casino_startpage/sound.js führt DEN Zustand und wird
 * über seine DATEI-URL geladen; genau diese URL wird in die anderen Dateien
 * hineingeschrieben, damit alle fünf Module dieselbe Instanz benutzen.
 *
 * Node hat weder Web Audio noch ein Dokument noch einen Browserspeicher.
 * Alle drei werden VOR dem Laden bereitgestellt (Abschnitte 1 bis 3). Der
 * Speicher führt echte 'storage'-Zuhörer, weil T-10 eine ZWEITE
 * Registerkarte nachstellen muss (dasselbe Verfahren wie in
 * casino_startpage/verify-machine-credit.mjs).
 *
 *
 * WARUM DER AUSSCHLAG AUSGERECHNET UND NICHT GEMESSEN WIRD
 * ---------------------------------------------------------
 * Unter Node klingt nichts, eine Messung ergäbe 0. Gerechnet wird für jeden
 * Augenblick die Summe der Hüllkurven aller geplanten Stimmen, jede
 * multipliziert mit allen Verstärkungen auf ihrem Weg zum Ausgang. Weil jede
 * Auslöschung zwischen zwei Schwingungen ignoriert wird, ist das Ergebnis
 * eine OBERE SCHRANKE — der echte Ausschlag kann nie größer sein.
 *
 *
 * WARUM DIE ZEIT VIRTUELL IST
 * ---------------------------
 * 50 Runden dauern in Wirklichkeit mehrere Minuten. setTimeout,
 * requestAnimationFrame und performance.now() werden deshalb auf eine eigene
 * Uhr umgestellt, die in Schritten von 8 ms vorgestellt wird. Der geprüfte
 * Code merkt davon nichts.
 *
 * Auch Math.random() wird ersetzt — durch dieselbe kleine, wiederholbare
 * Zahlenfolge wie in den anderen Prüfskripten dieses Hauses. Erlaubt, weil
 * in den geprüften Dateien mit Math.random() nichts GEZOGEN wird: es streut
 * Tonhöhen und Abstände, also Klangfarbe. Spielwerte kommen in diesem
 * Projekt ausnahmslos aus crypto.getRandomValues.
 *
 * Alle Vergleiche sind ganzzahlig, bis auf den Ausschlag (T-9) — der wird
 * mit < geprüft.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/** Die beiden Modulverzeichnisse. Von hier aus: vier Ebenen hoch nach ext/. */
const CASINO_JS = new URL('../../../../casino_startpage/Resources/Public/JavaScript/', import.meta.url);
const FRUIT_JS = new URL('../../Public/JavaScript/', import.meta.url);

/** F5d verlangt einen Dauerlauf; 50 wie an den Nachbargeräten. */
const ROUNDS = 50;

/** Schrittweite der virtuellen Uhr in Millisekunden. */
const FRAME_MS = 8;

let failed = false;

/**
 * @param {boolean} condition
 * @param {string} message
 * @returns {void}
 */
function defaultCheck(condition, message) {
	if (condition) {
		console.log(`  OK      ${message}`);
		return;
	}
	failed = true;
	console.log(`  FEHLER  ${message}`);
}

/**
 * Die aktuell wirksame Prüffunktion. expectFailure() tauscht sie
 * vorübergehend gegen eine aus, die nur mitschreibt statt zu drucken und die
 * Gesamtbilanz zu belasten — siehe dort. Dieselbe Bauart wie
 * fruit_risk/verify-credit.mjs (Behebungslauf REVIEW-fruitrisk-f5.md [M6]).
 */
let currentCheck = defaultCheck;

/**
 * @param {boolean} condition
 * @param {string} message
 * @returns {void}
 */
function check(condition, message) {
	currentCheck(condition, message);
}

/**
 * Führt fn() aus und meldet, ob dabei GENAU EIN check()-Aufruf mit
 * condition === false stattgefunden hat — ohne dass dieser Aufruf gedruckt
 * oder in die Gesamtbilanz (failed) eingetragen wird.
 *
 * Damit lässt sich beweisen, dass eine Prüfung wirklich rot werden KANN,
 * statt es nur zu behaupten (Behebungslauf REVIEW-fruitrisk-f5.md [M6]:
 * dieser Prüfstand hatte bislang keine einzige Gegenprobe).
 *
 * @param {() => void} fn
 * @returns {boolean} true, wenn fn() intern mindestens ein fehlgeschlagenes
 *          check() ausgelöst hat
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

/**
 * @param {string} name
 * @param {*} value
 * @returns {void}
 */
function defineGlobal(name, value) {
	Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
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

let randomState = 20260905;
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

/** Ein Regler mit Gedächtnis. */
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
	 * Zustellung in drei Phasen: Erfassung, Ziel, Blase.
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
 * Ein Browserspeicher im Arbeitsspeicher, MIT echten 'storage'-Zuhörern —
 * T-10 braucht eine ZWEITE Registerkarte.
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

const boardUrl = await toModule(new URL('sound.js', FRUIT_JS),
	[[SOUND_NAME, SOUND_URL], [KIT_NAME, kitUrl], [IDLE_NAME, idleUrl]], 'fruit_risk/sound.js');
const { MachineSound } = await import(boardUrl);
check(typeof MachineSound === 'function', 'fruit_risk/sound.js geladen – das Klangpult');

const { NixieCounter } = await import(new URL('counter.js', FRUIT_JS).href);
check(typeof NixieCounter === 'function',
	'fruit_risk/counter.js unverändert geladen – es hat keinen einzigen Import');

/* ==========================================================================
   5. EIN GEHÄUSE, EIN ZÄHLWERK, EIN PAAR ABKÜRZUNGEN
   ========================================================================== */

const document = new StubDocument();

/**
 * @returns {{root: StubElement, button: StubElement, group: object}}
 */
function buildMachine() {
	const root = document.append(new StubElement(document, ['.fr-machine']));
	const cabinet = root.append(new StubElement(document, ['.fr-cabinet']));
	const button = cabinet.append(new StubElement(document, ['[data-fr-sound]'], { frSound: '' }));
	button.setAttribute('aria-pressed', 'true');
	const element = root.append(new StubElement(document, ['.fr-nixie-group'], { frDisplay: 'guthaben' }));
	const group = {
		element,
		length: 7,
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

console.log('\nT-1 — vor der ersten echten Geste bleibt alles still');

check(sound.contextState === 'none', 'beim Laden entsteht kein AudioContext');
check(humming() === 0, 'auch kein Brummen – idle.start() läuft ohne Kontext ins Leere');

fire(one.root, 'fr:state', { from: 'idle', to: 'spinning' });
advance(500);
check(sound.stats().startedVoices === 0, 'ein Rundenstart ohne Geste erzeugt keine einzige Stimme');
check(Object.keys(sound.stats().byKey).length === 0, 'und wird auch nicht als gespielt verbucht');

one.root.dispatchEvent(new StubEvent('pointerdown', { bubbles: true, isTrusted: false }));
check(sound.contextState === 'none', 'ein nachgemachter Zeigerdruck erteilt keine Aktivierung');

const fakeKey = new StubEvent('keydown', { bubbles: true, isTrusted: false });
one.root.dispatchEvent(fakeKey);
check(sound.contextState === 'none', 'ein nachgemachtes keydown erteilt ebenfalls keine Aktivierung');

// [M7]: onSwitch() war die einzige unlock()-Stelle ohne isTrusted-Prüfung —
// ein nachgemachter click auf den Ton-Schalter selbst darf ebenfalls keinen
// Kontext anlegen (Behebungslauf REVIEW-fruitrisk-f5.md [M7]). sound.toggle()
// darf dabei durchaus laufen (dieselbe Kasse schaltet auch von einer fremden
// Registerkarte aus um, siehe T-10) — nur unlock() darf nicht folgen.
const enabledBeforeFakeSwitch = sound.enabled;
one.button.dispatchEvent(new StubEvent('click', { bubbles: true, isTrusted: false }));
check(sound.contextState === 'none', 'ein nachgemachter Klick auf den Ton-Schalter legt keinen Kontext an');
check(sound.enabled === !enabledBeforeFakeSwitch,
	'der Schalter selbst schaltet trotzdem um — nur unlock() bleibt aus, nicht toggle()');
sound.setEnabled(enabledBeforeFakeSwitch); // Ausgangszustand für die folgenden Prüfungen wiederherstellen

fire(one.root, 'fr:state', { from: 'spinning', to: 'idle' });
advance(200);

console.log('\nT-2 — der Tastaturweg schaltet ebenso frei wie der Zeiger');

one.root.dispatchEvent(new StubEvent('keydown', { bubbles: true, isTrusted: true }));
check(sound.contextState === 'running',
	'ein vertrauenswürdiges keydown OHNE vorheriges pointerdown legt den Kontext an');
advance(200);
check(humming() === 1, 'und die Leerlaufgeräusche laufen an');
check(one.root.dataset.frSoundSustained === '1', 'data-fr-sound-sustained meldet es am Gehäuse');
check(one.root.dataset.frSoundDropped === '0', 'data-fr-sound-dropped steht auf 0');

console.log('\nT-3 — sechs Walzenstopps, unterscheidbar und streng steigend');

const STOP_FREQ = [262, 294, 330, 370, 415, 466];
let previousFreq = 0;
for (let reel = 1; reel <= 6; reel++) {
	const before = scheduled.length;
	fire(one.root, 'fr:reelrest', { reel, cell: 0, symbols: [] });
	advance(50);
	const added = scheduled.slice(before);
	const tone = added.find((source) => source instanceof StubOscillator && source.path.reaches === true);
	check(tone !== undefined, `stop-${reel} legt einen Ton an den Ausgang`);
	if (tone !== undefined) {
		const startFreq = Math.round(tone.frequency.at(tone.startTime));
		check(startFreq === STOP_FREQ[reel - 1],
			`stop-${reel} liegt bei ${STOP_FREQ[reel - 1]} Hz (gemessen ${startFreq})`);
		check(startFreq > previousFreq, `stop-${reel} liegt höher als der vorige (${previousFreq} → ${startFreq})`);
		previousFreq = startFreq;
	}
	check(plays(`stop-${reel}`) === 1, `stop-${reel} genau einmal gezählt`);
}

// GEGENPROBE T-3 (Nachlauf-Auflage [M6]): eine absichtlich falsche
// Frequenzerwartung muss tatsächlich rot werden — ohne das ist nicht
// unterscheidbar, ob hier wirklich am Ausgang gemessen wird oder ein
// durchgängiges undefined/null in der Messkette einfach nie auffiele
// (null === 523 wäre ebenfalls falsch, aber aus einem ganz anderen Grund).
const gegenprobeT3 = expectFailure(() => {
	check(previousFreq === 999,
		'GEGENPROBE (wird NICHT gezählt): absichtlich falsche Frequenzerwartung an stop-6');
});
check(gegenprobeT3, 'GEGENPROBE T-3: die Frequenzmessung der Walzenstopps kann tatsächlich rot werden');

console.log('\nT-4 — die drei Leitern klingen verschieden, risk8 mit vier Tonhöhen');

function tickFrequency(detail) {
	const before = scheduled.length;
	fire(one.root, 'fr:risktick', detail);
	advance(10);
	const added = scheduled.slice(before);
	const tone = added.find((source) => source instanceof StubOscillator && source.path.reaches === true);
	return tone === undefined ? null : Math.round(tone.frequency.at(tone.startTime));
}

check(tickFrequency({ ladder: 'risk', level: 1, lit: 0, on: true }) === 523, 'Leiter "risk" tickt bei 523 Hz');
advance(200);
check(tickFrequency({ ladder: 'risk4', level: 1, lit: 0, on: true }) === 698, 'Leiter "risk4" tickt höher, bei 698 Hz');
advance(200);

const RISK8_FREQ = { 0: 392, 1: 494, 2: 587, 3: 698 };
for (const [lit, freq] of Object.entries(RISK8_FREQ)) {
	check(tickFrequency({ ladder: 'risk8', level: 1, lit: Number(lit), on: true }) === freq,
		`risk8, Position ${lit}: ${freq} Hz`);
	advance(200);
}

const gapBefore = sound.stats().gapDrops;
fire(one.root, 'fr:risktick', { ladder: 'risk8', level: 1, lit: 0, on: true });
advance(5);
fire(one.root, 'fr:risktick', { ladder: 'risk8', level: 1, lit: 0, on: true });
advance(200);
check(sound.stats().gapDrops === gapBefore + 1,
	'zwei Ticks derselben Taste innerhalb 5 ms stapeln sich nicht – der zweite wird gedrosselt');

// GEGENPROBE T-4 (Nachlauf-Auflage [M6]): dieselbe Absicherung wie bei T-3,
// hier für die Leiter-Tonhöhen — eine bewusst falsche Erwartung an einen neu
// gemessenen Ton muss rot werden.
const gegenprobeT4 = expectFailure(() => {
	check(tickFrequency({ ladder: 'risk8', level: 1, lit: 3, on: true }) === 999,
		'GEGENPROBE (wird NICHT gezählt): absichtlich falsche Frequenzerwartung an risk8, Position 3');
});
check(gegenprobeT4, 'GEGENPROBE T-4: die Frequenzmessung der Leitertöne kann tatsächlich rot werden');

console.log('\nT-5 — der Zählklang hängt an der Fahrt der Anzeige "guthaben"');

const counter = new NixieCounter(one.group);
const counted = { up: 0, down: 0 };
one.root.addEventListener('fr:count', (event) => {
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

fire(one.root, 'fr:count', { display: 'gewinn', value: 5, index: 1, steps: 4, direction: 'up' });
advance(200);
check(plays('count') === 12, 'eine andere Anzeige (GEWINN, STUFE) löst keinen Zählklang aus');

console.log('\nT-6 — die Leerlaufgeräusche');

const idle = board.idle;
check(idle.hum !== null && idle.hum.running === true, 'genau ein Brummen, und es läuft');

const humParts = sustainedSources();
check(humParts.length === 4,
	`das Brummen besteht aus vier Quellen: 50, 100, 150 Hz und das Rauschen (${humParts.length})`);
check(humParts.every((source) => source.path.reaches === true),
	'und jede davon hängt WIRKLICH am Ausgang');

const quietBefore = plays('idle-relay') + plays('idle-tick');
fire(one.root, 'fr:state', { from: 'idle', to: 'spinning' });
advance(12000);
check(idle.busy === true, 'während der Walzenlauf läuft, tritt der Leerlauf zurück');
check(idle.timer === 0, 'sein Zeitgeber ist gelöscht, nicht nur übersprungen');
check(plays('idle-relay') + plays('idle-tick') === quietBefore,
	'in zwölf Sekunden Arbeit kein Relaisklick und kein Ticken');

fire(one.root, 'fr:state', { from: 'spinning', to: 'evaluating' });
fire(one.root, 'fr:risk', { phase: 'start', ladder: 'risk', level: 1, win: 5 });
fire(one.root, 'fr:state', { from: 'evaluating', to: 'offer' });
advance(200);
check(idle.busy === true, 'in der laufenden Risiko-Leiter bleibt es still, obwohl der Spielkern längst ruht');

fire(one.root, 'fr:risk', { phase: 'end', ladder: 'risk', level: 0, win: 0 });
fire(one.root, 'fr:state', { from: 'offer', to: 'idle' });
advance(200);
check(idle.busy === false, 'nach der Leiter lebt das Gerät wieder hörbar');
advance(20000);
check(plays('idle-relay') + plays('idle-tick') > quietBefore,
	'und im Ruhezustand sind Relais und Ticken wieder zu hören');

console.log('\nT-7 — zwei hörbare Absagen, eine stumme');

fire(one.root, 'fr:coin', { amount: 20, moved: 20, reason: 'ok', machineCredit: 120 });
advance(400);
check(plays('coin') === 1, 'ein angenommener Einwurf klingt nach Münze');

fire(one.root, 'fr:coin', { amount: 20, moved: 0, reason: 'nocash', machineCredit: 120 });
advance(400);
check(plays('coin-refused') === 1 && plays('coin') === 1,
	'ein abgelehnter Einwurf klingt anders – und nicht nach Münze');

const refuse = (event) => event.preventDefault();
one.root.addEventListener('fr:round', refuse);
fire(one.root, 'fr:round', { draw: [0, 0, 0, 0, 0, 0], stake: 10 }, { cancelable: true });
advance(500);
check(plays('round-refused') === 1, 'ein abgelehnter Zug bekommt seinen eigenen tiefen Anschlag');
one.root.removeEventListener('fr:round', refuse);

fire(one.root, 'fr:round', { draw: [0, 0, 0, 0, 0, 0], stake: 10 }, { cancelable: true });
advance(500);
check(plays('round-refused') === 1, 'ein angenommener Zug bleibt still');

// Dasselbe Verfahren wie bei den Nachbargeräten: risk.js hört fr:round am
// Dokument in der ERFASSUNGSPHASE ab und ruft dort stopPropagation() — das
// Ereignis erreicht die Blasenphase nie, in der diese Datei zuhört.
const swallow = (event) => {
	event.preventDefault();
	event.stopPropagation();
};
document.addEventListener('fr:round', swallow, true);
fire(one.root, 'fr:round', { draw: [0, 0, 0, 0, 0, 0], stake: 10 }, { cancelable: true });
advance(500);
check(plays('round-refused') === 1,
	'in einer laufenden Risiko-Leiter bleibt START stumm, obwohl der Zug abgelehnt ist');
document.removeEventListener('fr:round', swallow, true);

fire(one.root, 'fr:cashout', { moved: 0, capped: true, machineCredit: 250 });
advance(600);
check(plays('cashout-tray') === 0 && plays('cashout') === 0,
	'bei voller Kasse fließt nichts und es klingt nichts');

fire(one.root, 'fr:cashout', { moved: 250, capped: false, machineCredit: 0 });
advance(800);
check(plays('cashout-tray') === 1, 'die Klappe der Auswurfschale');
check(plays('cashout') === 1, 'und danach die Münzen');

one.button.dispatchEvent(new StubEvent('click', { bubbles: true, isTrusted: true, detail: 1 }));
check(sound.enabled === false, 'der Ton-Schalter schaltet ab');
check(humming() === 0, 'und nimmt das Brummen mit');
check(idle.timer === 0, 'auch der Zeitgeber ist weg');
check(plays('switch') === 0, 'das Ausschalten selbst bleibt stumm');

one.button.dispatchEvent(new StubEvent('click', { bubbles: true, isTrusted: true, detail: 1 }));
advance(300);
check(sound.enabled === true && humming() === 1, 'beim Einschalten kommt das Brummen zurück');
check(plays('switch') === 1, 'und eine kurze Klinke bestätigt es');

document.visibilityState = 'hidden';
document.dispatchEvent(new StubEvent('visibilitychange'));
advance(200);
check(humming() === 0 && idle.timer === 0, 'ein versteckter Tab schweigt vollständig');

document.visibilityState = 'visible';
document.dispatchEvent(new StubEvent('visibilitychange'));
advance(300);
check(humming() === 1, 'bei der Rückkehr brummt es wieder');

console.log('\nT-10 — aria-pressed und data-fr-sound-on folgen sound.enabled, auch aus der Ferne');

check(one.button.getAttribute('aria-pressed') === 'true', 'zu Beginn eingeschaltet');
check(one.root.dataset.frSoundOn === 'on', 'data-fr-sound-on steht auf "on"');
one.button.dispatchEvent(new StubEvent('click', { bubbles: true, isTrusted: true, detail: 1 }));
check(sound.enabled === false && one.button.getAttribute('aria-pressed') === 'false',
	'ein eigener Tastendruck setzt aria-pressed sofort mit');
check(one.root.dataset.frSoundOn === 'off', 'und data-fr-sound-on folgt mit');
one.button.dispatchEvent(new StubEvent('click', { bubbles: true, isTrusted: true, detail: 1 }));
advance(200);
check(sound.enabled === true && one.button.getAttribute('aria-pressed') === 'true', 'und wieder zurück');

foreignWrite(sound.STORAGE_KEY, '0');
check(sound.enabled === false, 'eine fremde Abschaltung übernimmt sound.enabled (reason remote)');
check(one.button.getAttribute('aria-pressed') === 'false' && one.root.dataset.frSoundOn === 'off',
	'und beide folgen ihr, obwohl niemand HIER die Taste gedrückt hat');

foreignWrite(sound.STORAGE_KEY, '1');
check(sound.enabled === true && one.button.getAttribute('aria-pressed') === 'true'
	&& one.root.dataset.frSoundOn === 'on',
	'dieselbe Naht schaltet auch wieder ein');

console.log('\nT-11 — KEIN dataset-Feld dieses Gehäuses ist doppelt belegt (generisch, nicht nur data-fr-sound)');

/**
 * Sammelt, für jeden dataset-Schlüssel im gesamten Teilbaum ab node, wie
 * viele Elemente ihn TRAGEN (Wert nicht undefined) — die generische
 * Doppelbelegungs-Prüfung über das GANZE Feld dieses Gehäuses, nicht nur
 * einen einzelnen benannten Namen. README.md, „Messpunkte": „Je Attribut
 * genau EIN Schreiber". Zwei Elemente mit demselben data-fr-Attribut sind
 * keine Messstelle mehr, sondern eine Falle: T-84 fand genau das, weil
 * sound.js früher denselben Namen (frSound) sowohl für die Kennung des
 * Ton-Schalters (im ausgelieferten HTML) als auch für den eigenen
 * Zustandsspiegel auf .fr-machine benutzte. Eine Prüfung, die nur nach
 * diesem EINEN Namen fragt, fände nur genau diesen einen Fall wieder — bei
 * `fruit_risk/verify-credit.mjs` (Block D) fand sich mit derselben Methode
 * sofort ein zweiter, bis dahin unbenannter Fall (`data-fr-cashout`,
 * `bank.js`). Diese Fassung fragt deshalb: WELCHE dataset-Felder gibt es im
 * ganzen Gehäuse, und wie oft trägt sie jeweils ein Element? Der Stub-Baum
 * dieses Prüfstands ist klein genug (Gehäuse, Röhrengruppe, Ton-Schalter),
 * dass kein Attribut hier absichtlich mit unterschiedlichem Wert auf
 * mehreren Geschwisterelementen steht (anders als z. B. `data-fr-button` im
 * größeren Gehäuse von `verify-credit.mjs`) — eine blinde Zählung über ALLE
 * Felder ist hier deshalb sicher, ohne Fehlalarm.
 *
 * @param {StubElement} node
 * @returns {Map<string, number>}
 */
function countAllDatasetFields(node) {
	const counts = new Map();
	const walk = (el) => {
		for (const key of Object.keys(el.dataset)) {
			if (el.dataset[key] !== undefined) {
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}
		}
		for (const child of el.children) {
			walk(child);
		}
	};
	walk(node);
	return counts;
}

const soundFieldCounts = countAllDatasetFields(one.root);
const soundDuplicates = [...soundFieldCounts.entries()].filter(([, n]) => n > 1);
check(soundDuplicates.length === 0,
	'kein dataset-Feld dieses Gehäuses wird von mehr als einem Element getragen (gefunden: '
	+ (soundDuplicates.length === 0 ? 'keins' : soundDuplicates.map(([key, n]) => `${key}=${n}`).join(', ')) + ')');

// Der konkrete Fund von T-84, jetzt behoben — namentlich geprüft, zusätzlich
// zur generischen Aussage oben.
check(soundFieldCounts.get('frSound') === 1,
	`data-fr-sound trägt genau EIN Element im Gehäuse (gefunden: ${soundFieldCounts.get('frSound') ?? 0})`
	+ ' — die Kennung des Ton-Schalters aus dem ausgelieferten HTML, kein Zustandsspiegel unter demselben Namen');
check(one.root.dataset.frSound === undefined,
	'.fr-machine selbst trägt data-fr-sound NICHT — der Zustandsspiegel des Geräts heißt data-fr-sound-on');
check(one.root.dataset.frSoundOn === 'on' || one.root.dataset.frSoundOn === 'off',
	'.fr-machine trägt stattdessen den eigenen, eindeutigen Messpunkt data-fr-sound-on');

console.log(`\nT-8 — Dauerlauf über ${ROUNDS} Runden`);

// Alle vier Jingle-Stufen (1–3 / 4–9 / 10–39 / ab 40) treffen, REIHUM nach
// Rundennummer — deterministisch statt über die hauseigene sequence()-Ziehung
// aus den anderen Prüfskripten: die tut mit dem kleinen Modulus 4 (Anzahl der
// Stufen) an der IEEE-754-Genauigkeitsgrenze ihrer Multiplikation
// (state * 1103515245 kann 2^53 überschreiten) etwas anderes, als ihr Name
// verspricht — nachgemessen mit denselben Zahlen liefert sie hier fast
// ausnahmslos 0. Für eine Ziehung im SPIEL wäre das ein Fehler; hier geht es
// nur darum, dass der Dauerlauf wirklich alle vier Stufen durchläuft, und ein
// Rundenzähler modulo 4 leistet das lückenlos und ist leichter nachzuprüfen
// als eine kryptische Zahlenfolge.
const WINS = [2, 6, 20, 60];
const LADDERS = [
	{ id: 'risk', ticks: [{ lit: 0 }] },
	{ id: 'risk4', ticks: [{ lit: 0 }] },
	{ id: 'risk8', ticks: [{ lit: 0 }, { lit: 1 }, { lit: 2 }, { lit: 3 }] },
];

let machineCredit = 500;
counter.snap(machineCredit);
let ladderTurn = 0;

for (let round = 1; round <= ROUNDS; round++) {
	if (round % 7 === 1) {
		machineCredit += 100;
		fire(one.root, 'fr:coin', { amount: 100, moved: 100, reason: 'ok', machineCredit });
		counter.ramp(machineCredit);
		advance(600);
	}

	fire(one.root, 'fr:round', { draw: [0, 0, 0, 0, 0, 0], stake: 10 }, { cancelable: true });
	machineCredit -= 10;
	counter.ramp(machineCredit);
	fire(one.root, 'fr:state', { from: 'idle', to: 'spinning' });
	advance(400);

	for (let reel = 1; reel <= 6; reel++) {
		fire(one.root, 'fr:reelrest', { reel, cell: 0, symbols: [] });
		advance(60);
	}

	fire(one.root, 'fr:state', { from: 'stopping', to: 'evaluating' });
	advance(80);

	const win = WINS[round % WINS.length];
	fire(one.root, 'fr:result', {
		grid: null, lines: [], field: { amount: win, counts: {}, parts: {} },
		lineAmount: 0, fieldAmount: win, stake: 10, win,
	});
	advance(60);
	fire(one.root, 'fr:state', { from: 'evaluating', to: 'offer' });
	advance(60);

	if (round % 4 === 0 && round % 13 !== 0) {
		// Eine echte Leiter, reihum über alle drei Gruppen — und über alle
		// vier Positionen bei risk8.
		const ladder = LADDERS[ladderTurn % LADDERS.length];
		ladderTurn++;
		fire(one.root, 'fr:risk', { phase: 'start', ladder: ladder.id, level: 1, win });
		advance(80);
		for (const tick of ladder.ticks) {
			fire(one.root, 'fr:risktick', { ladder: ladder.id, level: 1, lit: tick.lit, on: true });
			advance(210);
		}
		const factor = ladder.id === 'risk' ? 2 : ladder.id === 'risk4' ? 4 : 8;
		const grown = win * factor;
		fire(one.root, 'fr:risk', { phase: 'hit', ladder: ladder.id, level: 2, win: grown });
		advance(80);
		fire(one.root, 'fr:risk', { phase: 'collect', ladder: ladder.id, level: 2, win: grown });
		machineCredit += grown;
		fire(one.root, 'fr:collect', { amount: grown, credited: grown, capped: false, machineCredit });
		counter.ramp(machineCredit);
		fire(one.root, 'fr:risk', { phase: 'end', ladder: ladder.id, level: 0, win: 0 });
		advance(300);
	} else if (round % 13 === 0) {
		// Auto-Modus: das Angebot entfällt, sofortige Gutschrift.
		fire(one.root, 'fr:auto', { on: true, reason: 'user', rounds: 0 });
		machineCredit += win;
		fire(one.root, 'fr:collect', { amount: win, credited: win, capped: false, machineCredit });
		counter.ramp(machineCredit);
		advance(300);
		fire(one.root, 'fr:auto', { on: false, reason: 'user', rounds: 1 });
	} else {
		machineCredit += win;
		fire(one.root, 'fr:collect', { amount: win, credited: win, capped: false, machineCredit });
		counter.ramp(machineCredit);
		advance(1200);
	}

	fire(one.root, 'fr:state', { from: 'offer', to: 'idle' });
	advance(500);

	if (round % 11 === 0 && machineCredit > 200) {
		fire(one.root, 'fr:cashout', { moved: machineCredit, capped: false, machineCredit: 0 });
		machineCredit = 0;
		counter.ramp(0);
		advance(900);
	}
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
check(stats.gapDrops === gapBefore + 1,
	`keine weiteren wegen Mindestabstand verworfenen Klänge im Dauerlauf`
	+ ` (Gesamt seit T-4: ${stats.gapDrops})`);
check(stats.peakVoices < sound.MAX_VOICES,
	`höchste gleichzeitige Stimmenzahl ${stats.peakVoices} von ${sound.MAX_VOICES}`);
check(stats.activeVoices === 0, 'nach dem Lauf klingt nichts mehr nach');
check(consoleErrors.length === 0, `keine einzige Konsolenausgabe (${consoleErrors.length})`);
for (const line of consoleErrors) {
	console.log(`          ${line}`);
}

counter.destroy();
board.destroy();
advance(500);
check(humming() === 0, 'nach dem Abräumen läuft kein Dauerklang mehr – kein Leck');
check(one.root.dataset.frSoundSustained === undefined,
	'die drei Messpunkte sind beim Abräumen entfernt (frSoundSustained)');
check(sustainedSources().length === 0, 'auch im Klanggraphen läuft keine Quelle ohne Ende mehr');

console.log('\nT-9 — der ausgerechnete Ausschlag');

const bound = peakBound();
console.log(`  Stimmen im dichtesten Augenblick   ${bound.voices}`);
console.log(`  Zeitpunkt                          ${bound.at.toFixed(2).replace('.', ',')} s`);
console.log(`  gemessen (unter Node immer 0)      ${stats.peakLevel.toFixed(3).replace('.', ',')}`);
console.log(`  AUSGERECHNETE OBERE SCHRANKE       ${bound.peak.toFixed(3).replace('.', ',')}`);
check(bound.peak < 1,
	`die obere Schranke des Ausschlags bleibt unter 1,0 (${bound.peak.toFixed(3).replace('.', ',')})`);
check(bound.peak > 0,
	'und sie ist größer als 0 – es wurde wirklich etwas an den Ausgang gehängt');

// GEGENPROBE T-9 (Nachlauf-Auflage [M6]): dieselbe Absicherung für die
// Ausschlagsgrenze — eine bewusst zu hohe obere Schranke muss rot werden.
const gegenprobeT9 = expectFailure(() => {
	check(bound.peak + 1 < 1,
		'GEGENPROBE (wird NICHT gezählt): absichtlich zu hohe Ausschlagsgrenze');
});
check(gegenprobeT9, 'GEGENPROBE T-9: die Ausschlagsgrenze kann tatsächlich rot werden');

console.error = realError;
console.warn = realWarn;

console.log(failed
	? '\nERGEBNIS: der Klang erfüllt mindestens eine Zusage des Fertig-Kriteriums F5d nicht.'
	: `\nERGEBNIS: über ${ROUNDS} Runden keine verworfene Stimme, keine Konsolenausgabe, `
	+ 'der Ausschlag bleibt rechnerisch unter 1,0, der Zählklang hängt an der Fahrt der Anzeige '
	+ '"guthaben", sechs Walzenstopps steigen streng, die drei Leitern und ihre vier '
	+ 'risk8-Tonhöhen klingen unterscheidbar, alle Absagen klingen richtig, der Tastaturweg '
	+ 'schaltet ebenso frei wie der Zeiger, aria-pressed folgt auch einer fremden Registerkarte, '
	+ 'und kein Dauerklang bleibt zurück. Vor der ersten echten Geste entstand kein AudioContext.');

process.exit(failed ? 1 : 0);
