/**
 * Craps – Nachweis des Klangs
 * =============================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-sound.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei der ersten Abweichung.
 *
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.28, Umsetzungsstück C7f)
 * ---------------------------------------------------------------------
 *   S-1   keine Audiodatei, kein new Audio(, kein fetch(, kein
 *         decodeAudioData, keine data:-URI, keine http(s)://-Adresse — in
 *         KEINER ausgelieferten Datei dieser Extension.
 *   S-2   kein eigener new AudioContext in sound-craps.js: der Kontext
 *         gehört sound.js und der Seite.
 *   S-3   sound.unlock() wird ausschließlich aus einem Zuhörer gerufen, der
 *         event.isTrusted prüft, und genau an EINER Stelle im Quelltext.
 *   S-4   jeder Aufruf trägt einen key und ein minGap; alle key-Werte
 *         beginnen mit cr- und sind paarweise verschieden — die Tabelle
 *         steht HIER, nicht in sound-craps.js.
 *   S-5   KEIN Dauerklang: kein sound.sustain( in dieser Datei;
 *         data-cr-sound-sustained wird gesetzt und steht immer auf '0'.
 *   S-6   destroy() meldet jeden Zuhörer wieder ab (Schalter, Bank,
 *         pagehide, pointerdown, keydown), ist mehrfach aufrufbar, und
 *         sound-craps.js meldet pagehide SELBST an.
 *   S-7   onResult() spielt genau EINEN der vier sich ausschließenden
 *         Geldklänge — als else-if-Kette, nicht als vier eigenständige if.
 *   S-8   KEINE MELODIE: kein Feld mit mehr als drei aufeinanderfolgenden
 *         Tonhöhen in einer sequence(), keine Tonleiter.
 *   S-9   der Ton-Schalter: <button type="button"> mit aria-pressed,
 *         sichtbarem Text, data-text-on/-off, Mindestgröße, Fokusrahmen,
 *         Namensschild mit ausreichendem Kontrast.
 *
 * Gegenproben: S-4-G, S-7-G, S-8-G.
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
 *   craps              sound-craps.js die Klangzuordnung dieses Tisches
 *
 * Dasselbe Verfahren wie in roulette/…/verify-sound.mjs: die Dateien, die
 * über die Import-Map von TYPO3 einander finden ('@phomo17/…', von Node
 * nicht auflösbar), werden ALS TEXT gelesen, genau diese Namen durch echte
 * Datei-URLs ersetzt und als data:-Modul geladen — Zeile für Zeile derselbe
 * Code, nur der Modulname ist ein anderer. Die Audio-Stubklassen in
 * Abschnitt 2 sind SINNGEMÄSS aus fruit_risk/…/verify-sound.mjs übernommen,
 * ebenso wie in roulette/…/verify-sound.mjs.
 *
 * Node hat weder Web Audio noch ein Dokument noch einen Browserspeicher.
 * Alle drei werden vor dem Laden bereitgestellt.
 */

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

/** Siehe roulette/…/verify-sound.mjs: tauscht die Prüffunktion vorübergehend gegen eine mitschreibende aus, für ehrliche Gegenproben. */
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
		return this.setValueAtTime(Number(value) || 0, Number(time) || 0);
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

	/** siehe roulette/…/verify-sound.mjs: letzter Punkt mit point.t <= time gewinnt. */
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

class StubSource extends StubNode {
	constructor(context) {
		super(context);
		this.onended = null;
		this.startTime = 0;
		this.stopTime = Number.POSITIVE_INFINITY;
		this.ended = false;
	}

	start(when) {
		this.startTime = Math.max(now(), Number(when) || 0);
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
/** typo3conf/ext/craps/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const ALL_EXT = path.resolve(EXT, '..');
const CASINO_JS = new URL('../../../../casino_startpage/Resources/Public/JavaScript/', import.meta.url);
const CRAPS_JS = new URL('../../Public/JavaScript/', import.meta.url);

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

console.log('\nCraps – Nachweis des Klangs');
console.log('==============================\n');
console.log('Die echten Module');

const SOUND_URL = new URL('sound.js', CASINO_JS).href;
const SOUND_NAME = '@phomo17/casino-startpage/sound.js';
const KIT_NAME = '@phomo17/casino-startpage/sound-kit.js';
const IDLE_NAME = '@phomo17/casino-startpage/idle-noise.js';

const { sound } = await import(SOUND_URL);
check(typeof sound?.sustain === 'function', 'casino_startpage/sound.js über seine Datei-URL geladen — EINE Instanz für alle');

const kitUrl = await toModule(new URL('sound-kit.js', CASINO_JS), [[SOUND_NAME, SOUND_URL]], 'sound-kit.js');
const kit = await import(kitUrl);
check(typeof kit.coin === 'function' && typeof kit.coinCascade === 'function' && typeof kit.metal === 'function'
	&& typeof kit.sheet === 'function' && typeof kit.ratchet === 'function' && typeof kit.cashRegister === 'function',
	'sound-kit.js geladen (coin, coinCascade, metal, sheet, ratchet, cashRegister)');

const idleUrl = await toModule(new URL('idle-noise.js', CASINO_JS), [[SOUND_NAME, SOUND_URL], [KIT_NAME, kitUrl]], 'idle-noise.js');
const { IdleNoise } = await import(idleUrl);
check(typeof IdleNoise === 'function', 'idle-noise.js geladen');

const soundCrapsUrl = await toModule(
	new URL('sound-craps.js', CRAPS_JS),
	[[SOUND_NAME, SOUND_URL], [KIT_NAME, kitUrl], [IDLE_NAME, idleUrl]],
	'sound-craps.js'
);
const { connectSound } = await import(soundCrapsUrl);
check(typeof connectSound === 'function', 'sound-craps.js geladen — die Klangzuordnung dieses Tisches');

/* ==========================================================================
   5. Ein Tisch, eine Bank, ein paar Abkürzungen
   ========================================================================== */

function buildTable() {
	const root = new StubElement(['[data-ck-table]']);
	const switchEl = root.append(new StubElement(['[data-cr-sound]'], { textOn: 'Ton ist an, ausschalten', textOff: 'Ton ist aus, einschalten' }));
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

/** Eine minimale Bank, die nur subscribe()/notify() nachbildet — genau der Vertrag, auf den sound-craps.js sich verlässt (table-buyin.js, TableBank). */
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
	const AUDIO_ENDUNGEN = /\.(mp3|wav|ogg|m4a|flac|aac|opus)$/i;
	const VERBOTENE_MUSTER = [
		/\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bnew\s+Audio\s*\(/, /data:audio\//i,
		/\bdecodeAudioData\s*\(/, /https?:\/\//i,
	];

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
	// A-4 in verify-cabinet.mjs: Entwicklerwerkzeuge werden nie an den
	// Browser ausgeliefert, und GENAU DIESES Skript nennt die verbotenen
	// Muster zwangsläufig selbst in Kommentaren und Mustertexten.
	const dateien = alleDateien(path.join(EXT, 'Resources'))
		.filter((datei) => !path.relative(EXT, datei).startsWith(path.join('Resources', 'Private', 'Scripts')));
	check(dateien.length > 0, `${dateien.length} ausgelieferte Dateien unter Resources/ gefunden und durchsucht (Resources/Private/Scripts ausgenommen)`);

	let audioDateiGefunden = false;
	const musterGefunden = [];
	for (const datei of dateien) {
		if (AUDIO_ENDUNGEN.test(datei)) {
			audioDateiGefunden = true;
		}
		if (/\.(js|mjs|css|html|xlf|php)$/i.test(datei)) {
			const inhalt = readFileSync(datei, 'utf8');
			for (const muster of VERBOTENE_MUSTER) {
				if (muster.test(inhalt)) {
					musterGefunden.push(`${muster} in ${path.relative(EXT, datei)}`);
				}
			}
		}
	}
	check(!audioDateiGefunden, 'keine Audiodatei (mp3/wav/ogg/m4a/flac/aac/opus) unter Resources/');
	check(musterGefunden.length === 0,
		'keine ausgelieferte Datei enthält fetch(), XMLHttpRequest, new Audio(),'
		+ ' decodeAudioData(), data:audio/ oder eine http(s)://-Adresse',
		...musterGefunden);
}

console.log('\nS-2  Kein eigener AudioContext in sound-craps.js');
{
	const quelle = await readFile(fileURLToPath(new URL('sound-craps.js', CRAPS_JS)), 'utf8');
	check(!/new\s+AudioContext\b/.test(quelle), 'sound-craps.js enthält kein "new AudioContext"');
}

console.log('\nS-3  sound.unlock() nur aus einem Zuhörer, der event.isTrusted prüft, und genau einmal im Quelltext');
{
	const quelleRoh = await readFile(fileURLToPath(new URL('sound-craps.js', CRAPS_JS)), 'utf8');
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

console.log('\nS-4  Jeder Aufruf trägt key und minGap; alle Schlüssel beginnen mit cr- und sind paarweise verschieden');
{
	// Die Tabelle steht HIER, nicht im geprüften Modul — eine Prüfung, die
	// ihre Erwartung aus dem Prüfling holt, prüft nichts.
	const KLANGTABELLE = [
		'cr-chip-place', 'cr-chip-remove', 'cr-shake', 'cr-dice-rest', 'cr-puck',
		'cr-sevenout', 'cr-payout', 'cr-partial', 'cr-loss', 'cr-cashout',
	];
	const quelle = await readFile(fileURLToPath(new URL('sound-craps.js', CRAPS_JS)), 'utf8');
	for (const schluessel of KLANGTABELLE) {
		const treffer = quelle.match(new RegExp(`['"]${schluessel}['"]`, 'g')) ?? [];
		check(treffer.length === 1, `Schlüssel "${schluessel}" kommt im Quelltext genau einmal vor (gefunden: ${treffer.length})`);
		const minGapTreffer = new RegExp(`key:\\s*'${schluessel}'[^}]*minGap:\\s*[\\d.]+`).test(quelle);
		check(minGapTreffer, `der Aufruf mit key: '${schluessel}' übergibt auch eine minGap`);
	}
	const alleSchluesselImQuelltext = new Set((quelle.match(/key:\s*'(cr-[a-z-]+)'/g) ?? [])
		.map((m) => m.match(/'(cr-[a-z-]+)'/)[1]));
	for (const gefunden of alleSchluesselImQuelltext) {
		check(KLANGTABELLE.includes(gefunden), `Sendestelle "${gefunden}" gehört zu einem Ereignis der Klangtabelle`);
	}
	check(alleSchluesselImQuelltext.size === new Set(KLANGTABELLE).size,
		`genau ${KLANGTABELLE.length} paarweise verschiedene Schlüssel im Quelltext (gefunden: ${alleSchluesselImQuelltext.size})`);

	console.log('     Gegenprobe (S-4-G): eine erfundene zusätzliche Sendestelle UND ein entfernter Tabelleneintrag werden beide erkannt');
	const erfunden = new Set([...alleSchluesselImQuelltext, 'cr-erfunden']);
	const g1 = expectFailure(() => {
		for (const gefunden of erfunden) {
			check(KLANGTABELLE.includes(gefunden), `GEGENPROBE: "${gefunden}" gehört zur Tabelle`);
		}
	});
	check(g1, 'S-4-G: eine erfundene Sendestelle, die nicht in der Tabelle steht, wird erkannt');

	const ohneEintrag = KLANGTABELLE.filter((k) => k !== 'cr-cashout');
	const g2 = expectFailure(() => {
		const treffer = quelle.match(/['"]cr-cashout['"]/g) ?? [];
		check(ohneEintrag.includes('cr-cashout') || treffer.length === 0,
			'GEGENPROBE: cr-cashout hat keine Sendestelle mehr (Tabelleneintrag entfernt)');
	});
	check(g2, 'S-4-G: ein aus der Tabelle entfernter Eintrag, der im Quelltext weiter sendet, wird erkannt');
}

console.log('\nS-5  Kein Dauerklang: kein sound.sustain(, data-cr-sound-sustained steht immer auf \'0\'');
{
	const quelle = await readFile(fileURLToPath(new URL('sound-craps.js', CRAPS_JS)), 'utf8');
	check(!/sound\.sustain\(/.test(quelle), 'sound-craps.js enthält kein sound.sustain(');
	check(/setAttribute\(\s*'data-cr-sound-sustained',\s*'0'\)/.test(quelle),
		"data-cr-sound-sustained wird explizit auf die feste Zeichenkette '0' gesetzt");

	check(one.root.getAttribute('data-cr-sound-sustained') === '0',
		'nach connectSound(): data-cr-sound-sustained steht auf 0');
	board.onThrow();
	board.onDiceRest();
	board.onResult({ event: 'point-set', hadBet: false, credited: 0, staked: 0 });
	advance(50);
	check(one.root.getAttribute('data-cr-sound-sustained') === '0',
		'auch nach Wurf, Aufschlag und Ereignis bleibt data-cr-sound-sustained auf 0 — kein Dauerklang entsteht');
}

console.log('\nS-6  destroy() meldet jeden Zuhörer ab, ist mehrfach aufrufbar, sound-craps.js meldet pagehide selbst an');
{
	const quelle = await readFile(fileURLToPath(new URL('sound-craps.js', CRAPS_JS)), 'utf8');
	check(/globalThis\.addEventListener\(\s*'pagehide'/.test(quelle), 'sound-craps.js meldet pagehide selbst an');
	check(/globalThis\.removeEventListener\(\s*'pagehide'/.test(quelle), 'und meldet es in destroy() wieder ab');
	check(/unsubscribeSwitch\(\)/.test(quelle) && /unsubscribeBank\(\)/.test(quelle),
		'destroy() meldet den Ton-Schalter und die Bank über ihre Abmeldefunktionen ab');
	check(/root\.removeEventListener\(\s*'pointerdown'/.test(quelle) && /root\.removeEventListener\(\s*'keydown'/.test(quelle),
		'destroy() meldet pointerdown und keydown auf der Tischwurzel ab');

	const zweitesTisch = buildTable();
	const zweiteBank = buildBank();
	const zweitesBoard = connectSound(zweitesTisch.root, { bank: zweiteBank });
	fire(zweitesTisch.root, 'keydown', new StubEvent('keydown', { isTrusted: true }));
	advance(50);
	check(humming() >= 1, 'der Leerlauf des zweiten Tisches läuft');

	const vorPlace = plays('cr-chip-place');
	zweitesBoard.destroy();
	check(one.root.getAttribute !== undefined, 'die Tischwurzel bleibt ein gültiges Element (kein Absturz)');
	check(zweitesTisch.root.getAttribute('data-cr-sound-on') === null, 'data-cr-sound-on ist nach destroy() entfernt');
	check(zweitesTisch.root.getAttribute('data-cr-sound-sustained') === null, 'data-cr-sound-sustained ist nach destroy() entfernt');

	zweiteBank.notify('place');
	advance(10);
	check(plays('cr-chip-place') === vorPlace, 'nach destroy() löst ein Bank-Ereignis keinen Klang mehr aus — unsubscribeBank() wirkt');

	console.log('     mehrfach aufrufbar:');
	let threw = false;
	try {
		zweitesBoard.destroy();
		zweitesBoard.destroy();
	} catch {
		threw = true;
	}
	check(!threw, 'destroy() darf beliebig oft aufgerufen werden, ohne zu werfen');
}

console.log('\nS-7  onResult() spielt genau einen der vier sich ausschließenden Geldklänge, als else-if-Kette');
{
	const quelleRoh = await readFile(fileURLToPath(new URL('sound-craps.js', CRAPS_JS)), 'utf8');
	const kette = /if\s*\(\s*!hadBet\s*\)\s*\{[\s\S]*?\}\s*else if\s*\(\s*credited\s*>\s*staked\s*\)\s*\{[\s\S]*?\}\s*else if\s*\(\s*credited\s*>\s*0\s*\)\s*\{[\s\S]*?\}\s*else\s*\{/.test(quelleRoh);
	check(kette, 'onResult() verzweigt über eine einzige if/else-if/else-Kette (!hadBet, credited > staked, credited > 0, sonst)');

	console.log('     Gegenprobe (S-7-G): vier eigenständige if statt einer Kette müssten auffallen');
	const vierEigenstaendige = `\n\tif (!hadBet) { a(); }\n\tif (credited > staked) { b(); }\n\tif (credited > 0) { c(); }\n\tif (true) { d(); }\n`;
	const g = expectFailure(() => {
		check(/if\s*\(\s*!hadBet\s*\)\s*\{[\s\S]*?\}\s*else if/.test(vierEigenstaendige),
			'GEGENPROBE: vier eigenständige if bilden KEINE else-if-Kette');
	});
	check(g, 'S-7-G: vier eigenständige if werden von der Kettenprüfung als Nicht-Kette erkannt');

	// Verhaltensnachweis: die vier Antworten schließen sich in DIESEM Modul
	// gegenseitig aus.
	fire(one.root, 'keydown', new StubEvent('keydown', { isTrusted: true }));
	advance(50);

	const vorNichts = { loss: plays('cr-loss'), partial: plays('cr-partial'), payout: plays('cr-payout') };
	board.onResult({ event: 'roll', hadBet: false, credited: 0, staked: 0 });
	advance(500);
	check(plays('cr-loss') === vorNichts.loss && plays('cr-partial') === vorNichts.partial && plays('cr-payout') === vorNichts.payout,
		'kein Einsatz: es klingt buchstäblich nichts — es ist finanziell nichts passiert');

	const vorLoss = plays('cr-loss');
	board.onResult({ event: 'seven-out', hadBet: true, credited: 0, staked: 5 });
	advance(50);
	check(plays('cr-loss') === vorLoss + 1, 'Verlust mit Einsatz: sheet() klingt genau einmal als Geldantwort');
	check(plays('cr-partial') === vorNichts.partial && plays('cr-payout') === vorNichts.payout,
		'und dabei klingt weder die Teilrückgabe noch die Auszahlungskaskade');

	const vorPartial = plays('cr-partial');
	board.onResult({ event: 'roll', hadBet: true, credited: 18, staked: 20 });
	advance(50);
	check(plays('cr-partial') === vorPartial + 1, 'Teilrückgabe (18 € zurück von 20 € Einsatz): klingt als Teilrückgabe, nicht als Gewinn');
	check(plays('cr-loss') === vorLoss + 1 && plays('cr-payout') === vorNichts.payout,
		'und dabei klingt weder ein zusätzlicher Verlust noch ein Gewinn');

	const vorPayout = plays('cr-payout');
	board.onResult({ event: 'point-made', hadBet: true, credited: 30, staked: 5 });
	advance(50);
	check(plays('cr-payout') === vorPayout + 1, 'Gewinn (30 € zurück von 5 € Einsatz): genau eine Auszahlungskaskade');
	check(plays('cr-loss') === vorLoss + 1 && plays('cr-partial') === vorPartial + 1,
		'aber kein zusätzlicher Verlust- oder Teilrückgabeklang');

	console.log('     das Ereignisgeräusch kommt zusätzlich zur Geldantwort, nicht statt ihrer:');
	// minGap von cr-puck (0,05s) und cr-sevenout (0,3s) müssen erst verstreichen
	// — der frühere Verlust-Test hat cr-sevenout bereits einmal gespielt.
	advance(500);
	const vorPuck = plays('cr-puck');
	const vorSevenout = plays('cr-sevenout');
	board.onResult({ event: 'point-set', hadBet: false, credited: 0, staked: 0 });
	advance(50);
	check(plays('cr-puck') === vorPuck + 1, 'point-set klingt, auch ganz ohne Einsatz');
	advance(500);
	board.onResult({ event: 'seven-out', hadBet: false, credited: 0, staked: 0 });
	advance(50);
	check(plays('cr-sevenout') === vorSevenout + 1, 'seven-out klingt, auch ganz ohne Einsatz');
}

console.log('\nS-8  Keine Melodie: kein Feld mit mehr als drei aufeinanderfolgenden Tonhöhen, keine Tonleiter');
{
	const quelle = await readFile(fileURLToPath(new URL('sound-craps.js', CRAPS_JS)), 'utf8');

	/** Zählt die Einträge in jedem "tones: [...]"-Feld des Quelltexts. */
	function toneFeldLaengen(text) {
		const laengen = [];
		for (const m of text.matchAll(/tones:\s*\[([\s\S]*?)\]/g)) {
			const eintraege = m[1].split(/\},?\s*\{/).filter((s) => s.trim() !== '');
			laengen.push(eintraege.length);
		}
		return laengen;
	}

	const laengen = toneFeldLaengen(quelle);
	check(laengen.every((n) => n <= 3), `jedes tones:[...]-Feld in sound-craps.js hat höchstens drei Einträge (gefunden: ${laengen.join(', ') || 'keins'})`);
	check(!/sound\.sequence\(/.test(quelle),
		'sound-craps.js ruft sound.sequence() nicht unmittelbar auf — jeder Klang kommt aus dem Baukasten (sound-kit.js), der seine eigene Melodiefreiheit bereits nachweist');

	console.log('     Gegenprobe (S-8-G): eine eingefügte Fünftonfolge muss auffallen');
	const mitFuenftonfolge = `${quelle}\n// Testzeile: tones: [{freq:1},{freq:2},{freq:3},{freq:4},{freq:5}]`;
	const g = expectFailure(() => {
		const l = toneFeldLaengen(mitFuenftonfolge);
		check(l.every((n) => n <= 3), 'GEGENPROBE: auch mit einer eingefügten Fünftonfolge bleiben alle Felder ≤ 3');
	});
	check(g, 'S-8-G: eine eingefügte Fünftonfolge wird als zu lang erkannt');
}

console.log('\nS-9  Der Ton-Schalter: echter Knopf, Größe, Fokus, Namensschild, Kontrast');
{
	const soundHtml = readFileSync(
		path.join(EXT, 'Resources/Private/Partials/Table/Craps/SoundSwitch.html'), 'utf8'
	).replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '');
	check(/<button\s+type="button"[^>]*data-cr-sound=""/.test(soundHtml), 'der Ton-Schalter ist ein <button type="button" data-cr-sound="">');
	check(/aria-pressed="true"/.test(soundHtml), 'er trägt aria-pressed="true" schon im ausgelieferten Markup');
	check(/data-text-on="/.test(soundHtml) && /data-text-off="/.test(soundHtml), 'er trägt data-text-on und data-text-off');
	check(/class="cr-sound__label"/.test(soundHtml), 'er trägt ein Namensschild (.cr-sound__label)');
	check(!/\bdisabled\b/.test(soundHtml.replace(/aria-disabled/g, '')), 'kein echtes disabled am Ton-Schalter');

	const localeXlf = readFileSync(path.join(EXT, 'Resources/Private/Language/locallang.xlf'), 'utf8');
	for (const id of ['sound.label', 'sound.on', 'sound.off']) {
		check(localeXlf.includes(`id="${id}"`), `locallang.xlf enthält die Einheit ${id}`);
	}

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

	const rumpf = regelRumpf(feltCss, '.cr-sound');
	check(rumpf !== null, '.cr-sound hat eine eigene Regel in felt.css');
	if (rumpf) {
		for (const eigenschaft of ['min-inline-size', 'min-block-size']) {
			const m = new RegExp(`${eigenschaft}\\s*:\\s*([\\d.]+)rem`).exec(rumpf);
			check(m !== null && Number(m[1]) >= 2.75, `.cr-sound: ${eigenschaft} ist mindestens 2.75rem`);
		}
	}
	check(/\.cr-sound:focus-visible\s*\{/.test(feltCss), '.cr-sound:focus-visible ist definiert');
	check(!/\.cr-sound[^{]*\{[^}]*outline\s*:\s*none/.test(feltCss), '.cr-sound hat kein outline: none ohne Ersatz');

	const labelRumpf = regelRumpf(feltCss, '.cr-sound__label');
	check(labelRumpf !== null, '.cr-sound__label hat eine eigene Regel in felt.css');
	if (labelRumpf) {
		const textWert = eigenschaftsWert(labelRumpf, 'color');
		const hgWert = eigenschaftsWert(labelRumpf, 'background-color');
		const textToken = /var\((--ck-[a-z0-9-]+)\)/.exec(textWert ?? '')?.[1];
		const hgToken = /var\((--ck-[a-z0-9-]+)\)/.exec(hgWert ?? '')?.[1];
		check(textToken && hgToken, '.cr-sound__label: Text- und Hintergrundfarbe kommen aus tokens.css-Variablen');
		if (textToken && hgToken) {
			const textFarben = tokenFarben(tokensCss, textToken);
			const hgFarben = tokenFarben(tokensCss, hgToken);
			check(textFarben.length > 0 && hgFarben.length > 0, 'beide Token lösen sich zu mindestens einer Farbe auf');
			if (textFarben.length > 0 && hgFarben.length > 0) {
				const [textFarbe] = textFarben;
				const werte = hgFarben.map((hg) => kontrast(textFarbe, hg));
				const ungünstigster = Math.min(...werte);
				check(ungünstigster >= 4.5,
					`.cr-sound__label: ungünstigster von ${werte.length} Farbstopp(s) ${ungünstigster.toFixed(2)}:1 (Soll ≥ 4,5:1)`);
			}
		}
	}
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
	+ 'AudioContext, der Tastaturweg schaltet ebenso frei wie der Zeiger, jeder Klangschlüssel '
	+ 'ist eindeutig und beginnt mit cr-, kein Dauerklang entsteht, destroy() räumt vollständig '
	+ 'ab und ist mehrfach aufrufbar, die Geldantwort ist eine einzige else-if-Kette mit genau '
	+ 'einer klingenden Antwort, keine Melodie entsteht, und der Ton-Schalter erreicht den '
	+ 'geforderten Kontrast.');

process.exit(failed ? 1 : 0);
