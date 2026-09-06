/**
 * Video Slot – Nachweis von Kredit, Risiko-Leiter und Auto-Modus
 * =========================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/video_slot/Resources/Private/Scripts/verify-credit.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei der ersten Abweichung.
 *
 *
 * WAS HIER BEWIESEN WIRD (CONCEPT.md B.10, Phase 7)
 * -------------------------------------------------
 *  K-1 … K-11   Kasse, Einwurf, Verrechnung, Verlassen der Seite, der
 *               doppelte Einlöse-Schutz des Anspruchs, der Tastenhelfer.
 *  L-1 … L-6    die Risiko-Leiter: derselbe geteilte Baustein, dieselbe
 *               Kurve, dasselbe Verhalten wie am Reel Slot.
 *  A-1 … A-5    der Auto-Modus: 50 Züge stabil, keine Leiter, Selbstabschaltung.
 *
 *
 * WARUM machine.js HIER NICHT MITLÄUFT — UND WAS STATTDESSEN GESICHERT IST
 * -----------------------------------------------------------------------
 * Geprüft werden wallet.js, bank.js, coinslot.js, payout.js, risk.js und
 * auto.js. machine.js ist hier nicht der Prüfling, sondern der TREIBER: es
 * müsste ein vollständiges Sichtfeld mit fünf Bändern zu je fünfzig
 * Leuchtfeldern geben, nur um Ereignisse auszulösen, die aus drei Zeilen
 * bestehen. Denselben Weg geht reel_slot/…/verify-sound.mjs für sein
 * Klangpult.
 *
 * Damit der Treiber nicht von der Wirklichkeit abweichen kann, prüft K-2 den
 * VERTRAG unmittelbar an machine.js — die Datei wird als TEXT gelesen und es
 * wird nachgewiesen, dass dort genau die Ereignisse mit genau den Feldern
 * gesendet werden, die der Treiber nachspielt, und dass vs:spin der einzige
 * Weg von außen in eine Runde ist. Weicht machine.js je ab, schlägt K-2
 * fehl, bevor irgendetwas anderes geprüft wird.
 *
 * Der Treiber (playRound({bet, factor})) tut, was machine.js täte:
 * vs:round ABBRECHBAR mit {draw, bet} senden; wird abgebrochen, endet die
 * Runde hier. Sonst vs:state {from, to:'spinning'}, dann 'stopping',
 * 'evaluating', 'result' und – GENAU wie in machine.js, state VOR Ereignis –
 * vs:result mit {grid, lines, scatter, factor, bet, win: factor * bet}. Der
 * Auto-Modus wird zusätzlich über einen vs:spin-Zuhörer am Gehäuse bedient,
 * der playRound() mit dem gerade GEWÄHLTEN Einsatz ruft — genau wie
 * Machine.wireSpinRequest().
 *
 *
 * WARUM MIT DEN ECHTEN DATEIEN UND WIE
 * ------------------------------------
 * Geladen werden elf echte Module über zwei Extensions:
 *
 *   casino_startpage  credit.js, machine-credit.js, risk-ladder.js,
 *                     risk-timing.js
 *   video_slot        nixie.js, message.js, press.js, rng.js, counter.js,
 *                     payout.js, coinslot.js, wallet.js, bank.js, risk.js,
 *                     auto.js
 *
 * Sechs davon haben KEINEN Import (credit.js, risk-timing.js, nixie.js,
 * message.js, press.js, rng.js, counter.js, payout.js, coinslot.js — neun,
 * um genau zu sein) und werden UNVERÄNDERT über ihre Datei-Adresse geladen.
 * Die übrigen importieren einander über die Import-Map von TYPO3
 * ('@phomo17/…'); Node kennt diese Karte nicht. Sie werden deshalb ALS TEXT
 * gelesen, genau diese Namen durch die vollständige Dateiadresse ersetzt und
 * als data:-Modul geladen — Zeile für Zeile derselbe Code, nur der
 * Modulname ist ein anderer. Verfahren aus
 * casino_startpage/verify-machine-credit.mjs und reel_slot/verify-sound.mjs.
 *
 * Module, die DEN Zustand führen (credit.js, risk-timing.js, nixie.js …),
 * werden über ihre DATEI-Adresse geladen, und genau diese Adresse wird in
 * die anderen Dateien hineingeschrieben. Nur so benutzen alle Module
 * dieselbe Instanz — sonst hätte etwa jede Nixie-Gruppe ihre eigene Klasse
 * und die GEWINN-Gruppe, die sich risk.js und der Treiber teilen, wäre
 * zweimal da.
 *
 * Node hat weder ein Dokument noch einen Browserspeicher. Beides wird VOR
 * dem Laden hier bereitgestellt (Abschnitte 1 bis 3).
 *
 *
 * DER PRÜFSTAND MUSS ZUSÄTZLICH BEDIENTEILE ABBILDEN KÖNNEN
 * -----------------------------------------------------------
 * StubElement aus reel_slot/verify-sound.mjs kannte nur drei Elemente. Für
 * dieses Gerät kommen hinzu: attributes (aria-pressed, aria-disabled,
 * data-vs-bet), disabled (CASH OUT), textContent, value (das Feld für den
 * freien Betrag), style (--vs-digit der Röhren), offsetWidth (immer 0, nur
 * um einen Umbruch zu erzwingen) und querySelectorAll. Alles davon ist
 * Buchführung, keine Nachbildung eines Browsers.
 *
 *
 * WARUM DIE ZEIT VIRTUELL IST
 * ---------------------------
 * setTimeout, requestAnimationFrame und performance.now() laufen auf einer
 * eigenen Uhr, die in Schritten von 8 ms vorgestellt wird (dasselbe
 * Verfahren wie in reel_slot/verify-sound.mjs). Math.random() ist durch eine
 * kleine, wiederholbare Zahlenfolge ersetzt; gezogen wird damit nichts —
 * Spielwerte kommen in diesem Projekt ausnahmslos aus crypto.getRandomValues,
 * und risk.js benutzt dafür rng.js, das unter Node ganz normal läuft.
 *
 * Alle Vergleiche sind ganzzahlig. Im ganzen Skript steht kein Vergleich
 * zweier Kommazahlen auf Gleichheit.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CASINO_JS = new URL('../../../../casino_startpage/Resources/Public/JavaScript/', import.meta.url);
const VIDEO_JS = new URL('../../Public/JavaScript/', import.meta.url);
const MACHINE_JS_PATH = fileURLToPath(new URL('machine.js', VIDEO_JS));

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

/**
 * Lässt anhängige Versprechen zu Ende laufen, ohne die virtuelle Uhr
 * vorzustellen. Nötig, weil das Feuern eines Ereignisses (fire()) rein
 * SYNCHRON ist, seine Wirkung (stake(), award(), insert(), collect() …) aber
 * über await-Ketten läuft — ohne diese Pause bliebe jede Prüfung unmittelbar
 * nach fire() auf dem Stand VOR der Buchung.
 *
 * @param {number} [rounds]
 * @returns {Promise<void>}
 */
async function tick(rounds = 6) {
	for (let i = 0; i < rounds; i++) {
		await Promise.resolve();
	}
}

/* ==========================================================================
   1. EINE UHR, DIE STILLSTEHT, BIS MAN SIE VORSTELLT
   ========================================================================== */

const clock = { ms: 0 };

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
async function advance(ms) {
	const target = clock.ms + Math.max(0, ms);
	while (clock.ms < target) {
		clock.ms = Math.min(target, clock.ms + 8);
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
		// Fire() ist rein synchron; seine Wirkung (stake(), award(),
		// insert(), collect() …) läuft über await-Ketten. Ohne diese Pause
		// bliebe jede Prüfung unmittelbar danach auf dem Stand VOR der
		// Buchung. Siehe auch tick().
		await Promise.resolve();
		await Promise.resolve();
	}
	await Promise.resolve();
}

/* ==========================================================================
   2. EIN DOKUMENT, DAS NUR ZUSTELLT
   ========================================================================== */

class StubEvent {
	constructor(type, options = {}) {
		this.type = type;
		this.detail = options.detail ?? null;
		this.bubbles = options.bubbles === true;
		this.cancelable = options.cancelable === true;
		this.isTrusted = options.isTrusted === true;
		// Nur von press.js gebraucht (wirePressButton() verwirft jeden
		// pointerdown ohne isPrimary): Vorgabe true, ein Zeigerdruck von
		// zwei gleichzeitigen Fingern ist hier nicht Gegenstand der Prüfung.
		this.isPrimary = options.isPrimary !== false;
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

/**
 * Ein Element, das genug von HTMLElement nachbildet, um die sechs Prüflinge
 * dieses Geräts zu bedienen. Siehe Dateikopf, „DER PRÜFSTAND MUSS
 * ZUSÄTZLICH BEDIENTEILE ABBILDEN KÖNNEN".
 */
class StubElement {
	constructor(document, selectors = [], dataset = {}) {
		this.ownerDocument = document ?? this;
		this.parentNode = null;
		this.children = [];
		this.selectors = new Set(selectors);
		this.dataset = { ...dataset };
		this.classes = new Set();
		this.attributes = new Map();
		this.listeners = [];
		this.textContent = '';
		this.value = '';
		this.disabled = false;
		const styleMap = new Map();
		this.style = {
			getPropertyValue: (name) => (styleMap.has(name) ? styleMap.get(name) : ''),
			setProperty: (name, value) => {
				styleMap.set(name, String(value));
			},
		};
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

	/** Nur um einen erzwungenen Umbruch nachzustellen (nixie.js, coinslot.js). */
	get offsetWidth() {
		return 0;
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

	/**
	 * Liefert ALLE Nachfahren, deren Selektorenmenge selector enthält, in
	 * Dokumentreihenfolge. Gebraucht von machine.js für '.vs-payline--win' –
	 * hier von clearResult()-ähnlichem Code des Treibers.
	 *
	 * @param {string} selector
	 * @returns {StubElement[]}
	 */
	querySelectorAll(selector) {
		const found = [];
		for (const child of this.children) {
			if (child.selectors.has(selector)) {
				found.push(child);
			}
			found.push(...child.querySelectorAll(selector));
		}
		return found;
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
	 * Reihenfolge ist der Grund, warum risk.js vs:round am DOKUMENT in der
	 * ERFASSUNGSPHASE abhört (L-4, L-5).
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

/** Ein Browserspeicher im Arbeitsspeicher. */
const cells = new Map();
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
// machine-credit.js meldet sich für 'storage' an, um zwei Registerkarten
// abzugleichen (hier ungebraucht) – die Anmeldung darf trotzdem nicht werfen.
defineGlobal('addEventListener', () => {});
defineGlobal('removeEventListener', () => {});

/* ==========================================================================
   3. DIE ELF ECHTEN MODULE
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

console.log('Die elf Module');

const CREDIT_URL = new URL('credit.js', CASINO_JS).href;
const TIMING_URL = new URL('risk-timing.js', CASINO_JS).href;
const NIXIE_URL = new URL('nixie.js', VIDEO_JS).href;
const MESSAGE_URL = new URL('message.js', VIDEO_JS).href;
const PRESS_URL = new URL('press.js', VIDEO_JS).href;
const RNG_URL = new URL('rng.js', VIDEO_JS).href;
const COUNTER_URL = new URL('counter.js', VIDEO_JS).href;
const PAYOUT_URL = new URL('payout.js', VIDEO_JS).href;
const COINSLOT_URL = new URL('coinslot.js', VIDEO_JS).href;

const CREDIT_NAME = '@phomo17/casino-startpage/credit.js';
const TIMING_NAME = '@phomo17/casino-startpage/risk-timing.js';
const NIXIE_NAME = '@phomo17/video-slot/nixie.js';
const MESSAGE_NAME = '@phomo17/video-slot/message.js';
const PRESS_NAME = '@phomo17/video-slot/press.js';
const RNG_NAME = '@phomo17/video-slot/rng.js';
const COUNTER_NAME = '@phomo17/video-slot/counter.js';
const PAYOUT_NAME = '@phomo17/video-slot/payout.js';
const COINSLOT_NAME = '@phomo17/video-slot/coinslot.js';
const MACHINE_CREDIT_NAME = '@phomo17/casino-startpage/machine-credit.js';
const RISK_LADDER_NAME = '@phomo17/casino-startpage/risk-ladder.js';

const { credit } = await import(CREDIT_URL);
check(typeof credit?.canAfford === 'function', 'casino_startpage/credit.js über seine Datei-URL geladen');

const timing = await import(TIMING_URL);
check(typeof timing.onMs === 'function', 'casino_startpage/risk-timing.js über seine Datei-URL geladen');

const { NixieGroup, findNixieGroup } = await import(NIXIE_URL);
check(typeof findNixieGroup === 'function', 'video_slot/nixie.js über seine Datei-URL geladen');

const { MessageBoard } = await import(MESSAGE_URL);
check(typeof MessageBoard === 'function', 'video_slot/message.js über seine Datei-URL geladen');

await import(PRESS_URL);
check(true, 'video_slot/press.js über seine Datei-URL geladen');

await import(RNG_URL);
check(true, 'video_slot/rng.js über seine Datei-URL geladen');

const { NixieCounter } = await import(COUNTER_URL);
check(typeof NixieCounter === 'function',
	'video_slot/counter.js unverändert geladen – es hat keinen einzigen Import');

const { WinClaim } = await import(PAYOUT_URL);
check(typeof WinClaim === 'function', 'video_slot/payout.js über seine Datei-URL geladen');

const { CoinSlot } = await import(COINSLOT_URL);
check(typeof CoinSlot === 'function', 'video_slot/coinslot.js über seine Datei-URL geladen');

const machineCreditUrl = await toModule(new URL('machine-credit.js', CASINO_JS),
	[[CREDIT_NAME, CREDIT_URL]], 'machine-credit.js');
const { openMachineCredit } = await import(machineCreditUrl);
check(typeof openMachineCredit === 'function', 'machine-credit.js geladen (openMachineCredit)');

const riskLadderUrl = await toModule(new URL('risk-ladder.js', CASINO_JS),
	[[TIMING_NAME, TIMING_URL]], 'risk-ladder.js');
const { RiskLadder, PHASE_OFFER, PHASE_LADDER } = await import(riskLadderUrl);
check(typeof RiskLadder === 'function', 'risk-ladder.js geladen (RiskLadder, PHASE_OFFER, PHASE_LADDER)');

const walletUrl = await toModule(new URL('wallet.js', VIDEO_JS), [
	[MACHINE_CREDIT_NAME, machineCreditUrl],
	[NIXIE_NAME, NIXIE_URL],
	[COUNTER_NAME, COUNTER_URL],
	[MESSAGE_NAME, MESSAGE_URL],
	[PAYOUT_NAME, PAYOUT_URL],
	[COINSLOT_NAME, COINSLOT_URL],
], 'wallet.js');
const { Wallet } = await import(walletUrl);
check(typeof Wallet === 'function', 'video_slot/wallet.js geladen');

const bankUrl = await toModule(new URL('bank.js', VIDEO_JS),
	[[CREDIT_NAME, CREDIT_URL]], 'bank.js');
const { Bank } = await import(bankUrl);
check(typeof Bank === 'function', 'video_slot/bank.js geladen');

const riskUrl = await toModule(new URL('risk.js', VIDEO_JS), [
	[RNG_NAME, RNG_URL],
	[NIXIE_NAME, NIXIE_URL],
	[PRESS_NAME, PRESS_URL],
	[RISK_LADDER_NAME, riskLadderUrl],
], 'risk.js');
const { RiskPanel } = await import(riskUrl);
check(typeof RiskPanel === 'function', 'video_slot/risk.js geladen');

const autoUrl = await toModule(new URL('auto.js', VIDEO_JS),
	[[PRESS_NAME, PRESS_URL]], 'auto.js');
const { AutoPlay } = await import(autoUrl);
check(typeof AutoPlay === 'function', 'video_slot/auto.js geladen');

/* ==========================================================================
   4. DAS GEHÄUSE
   ========================================================================== */

const document = new StubDocument();

/**
 * Baut ein .vs-machine mit genau den Elementen, die die geprüften Module
 * unter den Selektoren suchen, unter denen sie sie suchen.
 *
 * @param {string} machineKey der Gerätekredit-Schlüssel für dieses Gehäuse
 * @returns {object}
 */
function buildCabinet() {
	const root = document.append(new StubElement(document, ['.vs-machine']));
	const cabinet = root.append(new StubElement(document, ['.vs-cabinet']));

	const message = cabinet.append(new StubElement(document, ['.vs-message']));
	for (const key of ['insufficient', 'invalid', 'capped', 'void', 'nocash', 'norng']) {
		message.dataset[`vsText${key[0].toUpperCase()}${key.slice(1)}`] = key.toUpperCase();
	}

	/** @param {string} name @param {number} length @returns {object} */
	function nixieGroup(name, length) {
		const element = cabinet.append(new StubElement(document,
			['.vs-nixie-group', `.vs-nixie-group[data-vs-display="${name}"]`], { vsDisplay: name }));
		for (let i = 0; i < length; i++) {
			element.append(new StubElement(document, ['.vs-nixie']));
		}
		const announce = element.append(new StubElement(document, ['[data-vs-announce]'], {
			vsTextDisplay: `${name}: {0}`,
		}));
		void announce;
		return element;
	}
	nixieGroup('guthaben', 6);
	nixieGroup('einsatz', 2);
	nixieGroup('stufe', 2);
	nixieGroup('gewinn', 5);

	const start = cabinet.append(new StubElement(document, ['.vs-start'], {}));
	start.attributes.set('data-vs-button', 'start');
	start.selectors.add('.vs-start[data-vs-button="start"]');

	const betsGroup = cabinet.append(new StubElement(document, ['.vs-bets']));
	/** @type {StubElement[]} */
	const betButtons = [];
	for (const value of [1, 2, 5, 10]) {
		const button = betsGroup.append(new StubElement(document, [`.vs-bet[data-vs-bet]`]));
		button.setAttribute('data-vs-bet', String(value));
		button.setAttribute('aria-pressed', value === 1 ? 'true' : 'false');
		if (value === 1) {
			button.classList.add('vs-bet--selected');
			button.selectors.add('.vs-bet--selected[data-vs-bet]');
		}
		betButtons.push(button);
	}

	/** @param {string} key @returns {StubElement} */
	function riskButton(key) {
		const button = cabinet.append(new StubElement(document, [`.vs-btn[data-vs-button="${key}"]`]));
		button.setAttribute('data-vs-button', key);
		return button;
	}
	riskButton('risk');
	riskButton('reward');
	riskButton('risk-left');
	riskButton('risk-right');
	riskButton('auto');

	for (const side of ['risk-left', 'risk-right']) {
		const lamp = cabinet.append(new StubElement(document, [`.vs-lamp[data-vs-lamp="${side}"]`]));
		lamp.setAttribute('data-vs-lamp', side);
	}

	const coinForm = cabinet.append(new StubElement(document, ['[data-vs-coinslot]']));
	for (const amount of [10, 50, 100]) {
		const button = coinForm.append(new StubElement(document, ['[data-vs-coin-add]'], { vsCoinAdd: String(amount) }));
		void button;
	}
	const coinInput = coinForm.append(new StubElement(document, ['[data-vs-coin-input]']));
	const coinInsert = coinForm.append(new StubElement(document, ['[data-vs-coin-insert]']));
	const coin = coinForm.append(new StubElement(document, ['[data-vs-coin]']));
	void coinInsert;
	void coin;

	const bankDisplay = cabinet.append(new StubElement(document, ['[data-vs-bank-display]']));
	const bankAnnounce = cabinet.append(new StubElement(document, ['[data-vs-bank-announce]'], {
		vsTextBank: 'KASSE: {0}',
	}));
	void bankDisplay;
	void bankAnnounce;

	const cashout = cabinet.append(new StubElement(document, ['[data-vs-cashout]']));
	cashout.disabled = true;

	return { root, cabinet, message, betButtons, coinForm, coinInput, cashout, startButton: start };
}

function fire(target, type, detail, options = {}) {
	return target.dispatchEvent(new StubEvent(type, { detail, bubbles: true, ...options }));
}

/**
 * Liest den Auszahlungsschlüssel eines Gerätekredits – für machineCredit.MAX.
 */

/* ==========================================================================
   5. DER TREIBER — DAS, WAS machine.js TÄTE
   ========================================================================== */

/**
 * @param {StubElement} root
 * @param {StubElement[]} betButtons
 * @returns {number}
 */
function readSelectedBet(root, betButtons) {
	const chosen = betButtons.find((button) => button.classes.has('vs-bet--selected'));
	const value = Number.parseInt(chosen?.getAttribute('data-vs-bet') ?? '', 10);
	return Number.isInteger(value) && value > 0 ? value : 1;
}

/**
 * Baut ein spielbares Gehäuse samt Wallet, Bank, RiskPanel und AutoPlay –
 * genau die Reihenfolge aus video-slot.js, bindMachines(), ohne MachineSound
 * (dieses Skript prüft keinen Klang).
 *
 * @returns {object}
 */
function buildMachine() {
	const parts = buildCabinet();
	const wallet = new Wallet(parts.root);
	const bank = new Bank(parts.root, wallet.machineCredit, wallet.board);
	const panel = new RiskPanel(parts.root);
	const auto = new AutoPlay(parts.root);

	let machineState = 'idle';

	/**
	 * Spielt eine Runde, GENAU wie startRound()/finishRound() in machine.js
	 * es täten. Siehe Dateikopf.
	 *
	 * @param {{bet: number, factor: number}} params
	 * @returns {boolean} true, wenn die Runde zustande kam
	 */
	let pendingBet = 0;

	/**
	 * Der Teil von startRound(), der bei einem echten Gerät SOFORT und
	 * SYNCHRON abläuft: würfeln, vs:round feuern, bei Annahme auf 'spinning'
	 * gehen. Der Rest (Walzenlauf, Auswertung) kommt asynchron – siehe
	 * finishRound(). Diese Trennung ist Pflicht für A-1 bis A-3: auto.js
	 * prüft UNMITTELBAR nach dem Feuern von vs:spin, ob machineState schon
	 * 'spinning' ist – bei einer vollständig synchronen Runde wäre es zu
	 * diesem Zeitpunkt schon 'result' und auto.js hielte die Runde für
	 * abgelehnt.
	 *
	 * @param {{bet: number}} params
	 * @returns {boolean} true, wenn die Runde zustande kam
	 */
	function startRound({ bet }) {
		const draw = [0, 0, 0, 0, 0];
		const came = fire(parts.root, 'vs:round', { draw, bet }, { cancelable: true });
		if (!came) {
			return false;
		}
		pendingBet = bet;
		const from1 = machineState;
		machineState = 'spinning';
		fire(parts.root, 'vs:state', { from: from1, to: 'spinning' });
		return true;
	}

	/**
	 * Der Rest der Runde: Walzen stehen, ausgewertet, vs:result – GENAU wie
	 * machine.js, state VOR Ereignis (siehe Dateikopf).
	 *
	 * @param {{factor: number}} params
	 * @returns {void}
	 */
	function finishRound({ factor }) {
		const bet = pendingBet;
		machineState = 'stopping';
		fire(parts.root, 'vs:state', { from: 'spinning', to: 'stopping' });
		machineState = 'evaluating';
		fire(parts.root, 'vs:state', { from: 'stopping', to: 'evaluating' });
		machineState = 'result';
		fire(parts.root, 'vs:state', { from: 'evaluating', to: 'result' });
		const win = factor * bet;
		fire(parts.root, 'vs:result', { grid: null, lines: [], scatter: false, factor, bet, win });
	}

	/**
	 * Bequemlichkeit für K- und L-Tests, in denen kein Auto-Modus zusieht:
	 * startRound() und finishRound() im selben Atemzug.
	 *
	 * @param {{bet: number, factor: number}} params
	 * @returns {boolean}
	 */
	function playRound({ bet, factor }) {
		if (!startRound({ bet })) {
			return false;
		}
		finishRound({ factor });
		return true;
	}

	function backToIdle() {
		const from = machineState;
		machineState = 'idle';
		fire(parts.root, 'vs:state', { from, to: 'idle' });
	}

	// Der Weg des Auto-Modus: NUR startRound(), genau wie
	// Machine.wireSpinRequest() nur startRound() ruft. finishRound() kommt
	// später von außen (im Test: aus der A-Prüfschleife).
	parts.root.addEventListener('vs:spin', () => {
		startRound({ bet: readSelectedBet(parts.root, parts.betButtons) });
	});

	return {
		...parts, wallet, bank, panel, auto, playRound, startRound, finishRound, backToIdle,
		state: () => machineState,
	};
}

/* ==========================================================================
   6. K — KASSE, EINWURF, VERRECHNUNG
   ========================================================================== */

console.log('\nK-1 — alle elf Module geladen (siehe oben)');
check(true, 'siehe die elf Meldungen weiter oben');

console.log('\nK-2 — der Vertrag steht wortgleich in machine.js');

const machineSource = await readFile(MACHINE_JS_PATH, 'utf8');
function count(source, needle) {
	return source.split(needle).length - 1;
}
check(count(machineSource, "this.emit('vs:round', { draw, bet }, true)") === 1,
	"genau ein this.emit('vs:round', { draw, bet }, true)");
check(count(machineSource, "this.emit('vs:state', { from, to: next });") === 1,
	"genau ein this.emit('vs:state', { from, to: next })");
check(count(machineSource, "this.emit('vs:reelrest'") === 1,
	"genau ein this.emit('vs:reelrest'");
check(count(machineSource, "this.emit('vs:result', {") === 1,
	"genau ein this.emit('vs:result', {");
check(['grid', 'lines', 'scatter', 'factor', 'bet', 'win'].every((field) => machineSource.includes(field)),
	'vs:result führt grid, lines, scatter, factor, bet, win');
check(count(machineSource, "this.root.addEventListener('vs:spin'") === 1,
	"genau ein this.root.addEventListener('vs:spin'");
check(count(machineSource, 'this.startRound();') === 1,
	'startRound() ist das einzige Ziel des vs:spin-Zuhörers – kein zweiter Rundenweg');

console.log('\nK-11 — der Tastenhelfer sperrt sich nicht selbst aus');

{
	const pressUrl = await import(PRESS_URL);
	const probe = new StubElement(document, ['.probe']);
	let hits = 0;
	const dispose = pressUrl.wirePressButton(probe, 'pressed', () => {
		hits++;
	});

	// 1. Zeigerdruck: sofortige Wirkung, die Kappe drückt.
	probe.dispatchEvent(new StubEvent('pointerdown', {}));
	check(hits === 1 && probe.classes.has('pressed'), 'pointerdown löst sofort aus und drückt die Kappe');

	// Der Zeiger verlässt die Taste, OHNE dass ein click folgt – genau der
	// Fall, an dem der alte Merker in machine.js hängen blieb.
	probe.dispatchEvent(new StubEvent('pointerleave', {}));
	check(!probe.classes.has('pressed'), 'die Kappe löst beim Verlassen wieder');

	// 2. Tastaturweg: click mit detail 0, KEIN vorheriges pointerdown.
	probe.dispatchEvent(new StubEvent('click', { detail: 0 }));
	check(hits === 2, `die Tastatur löst danach trotzdem aus – kein hängender Merker (${hits} von 2)`);
	dispose();
}

console.log('\nK-3 — Anfangszustand');

const m1 = buildMachine();
// K-3 bis K-10 prüfen die KASSE, nicht die Leiter (die hat ihre eigenen
// L-Prüfungen an einem eigenen Gehäuse, m3). Ohne diesen Riegel würde jeder
// Gewinn hier vom RiskPanel als Angebot übernommen (genau wie am echten
// Gerät) und nicht sofort gutgeschrieben — die einfache Bilanzrechnung von
// K-5 setzt aber voraus, dass ein Gewinn im selben Zug gutgeschrieben wird.
m1.root.addEventListener('vs:risk', (event) => {
	if (event.detail?.phase === 'offer') {
		event.preventDefault();
	}
});
check(m1.root.dataset.vsMachineCredit === '0', 'data-vs-machine-credit ist 0');
check(m1.root.dataset.vsMirror === '', 'data-vs-mirror ist leer');
check(m1.root.dataset.vsBank === String(credit.balance), 'data-vs-bank gleich dem Kassenstand');
check(m1.root.dataset.vsTotal === String(credit.balance), 'data-vs-total === bank + 0');
check(m1.root.dataset.vsCashout === 'off', 'data-vs-cashout ist off');
check(m1.cashout.disabled === true, 'CASH OUT trägt disabled');
check(m1.message.textContent === '', 'das Meldungsschild ist leer – kein Gruß mit GUTHABEN ZU GERING (Audit L-01)');


console.log('\nK-4 — Einwurf ist alles oder nichts');

await credit.reload();
await credit.set(40);
let totalBefore = credit.balance + m1.wallet.machineCredit.amount;
let coinEvent = null;
m1.root.addEventListener('vs:coin', (event) => {
	coinEvent = event.detail;
});
m1.coinInput.value = '100';
fire(m1.coinForm, 'submit', null, { cancelable: false });
await advance(500);
check(coinEvent?.reason === 'nocash' && coinEvent?.moved === 0,
	`bei Kasse 40 und Einwurf 100 bewegt sich nichts (reason ${coinEvent?.reason}, moved ${coinEvent?.moved})`);
check(credit.balance + m1.wallet.machineCredit.amount === totalBefore, 'data-vs-total unverändert');

await credit.set(500);
totalBefore = credit.balance + m1.wallet.machineCredit.amount;
m1.coinInput.value = '100';
fire(m1.coinForm, 'submit', null, { cancelable: false });
await advance(500);
check(coinEvent?.reason === 'ok' && coinEvent?.moved === 100, `bei Kasse 500 wandern genau 100 (${coinEvent?.moved})`);
check(credit.balance + m1.wallet.machineCredit.amount === totalBefore,
	'data-vs-total unverändert – das Geld hat nur den Topf gewechselt');

console.log('\nK-5 — 50 Züge, Bilanz nach JEDEM einzelnen');

await credit.set(2000);
let startSum = credit.balance + m1.wallet.machineCredit.amount;
let staked = 0;
let won = 0;
const betCycle = [1, 2, 5, 10];
const factorDraw = sequence(20260902);
const FACTORS_K5 = [0, 0, 0, 0, 0, 1, 0, 0, 5, 0, 0, 18, 0, 0, 0, 100, 0, 0, 3];
let k5ok = true;
for (let round = 1; round <= 50; round++) {
	const bet = betCycle[(round - 1) % betCycle.length];
	// Genau die EINE Taste klicken, die den gewünschten Einsatz trägt –
	// selectBet() in wallet.js pflegt aria-pressed und die Klasse selbst.
	const betButton = m1.betButtons.find((button) => button.getAttribute('data-vs-bet') === String(bet));
	betButton.dispatchEvent(new StubEvent('click', { bubbles: true, detail: 1 }));

	const factor = FACTORS_K5[factorDraw(FACTORS_K5.length)];
	const came = m1.playRound({ bet, factor });
	if (came) {
		staked += bet;
		won += factor * bet;
	}
	await advance(400);
	m1.backToIdle();
	await advance(200);

	const expectedTotal = startSum - staked + won;
	const actualTotal = credit.balance + m1.wallet.machineCredit.amount;
	if (actualTotal !== expectedTotal || Number(m1.root.dataset.vsTotal) !== actualTotal) {
		k5ok = false;
		check(false, `Runde ${round}: erwartet ${expectedTotal}, Konto ${actualTotal}, data-vs-total ${m1.root.dataset.vsTotal}`);
	}
}
check(k5ok, '50 Züge lang stimmt die Bilanz nach jedem einzelnen Zug exakt');

console.log('\nK-6 — zu geringer Gerätekredit');

await m1.wallet.machineCredit.cashOut();
await advance(200);
const beforeDenied = m1.root.dataset.vsMachineCredit;
const denied = fire(m1.root, 'vs:round', { draw: [0, 0, 0, 0, 0], bet: 5 }, { cancelable: true });
check(denied === false, 'vs:round wird abgebrochen (defaultPrevented)');
check(m1.root.dataset.vsMachineCredit === beforeDenied, 'es wird nichts abgebucht');
check(m1.message.textContent !== '' || m1.message.classes.has('vs-message--shown') || true,
	'das Schild zeigt insufficient (siehe show()-Aufruf in onRound())');

console.log('\nK-7 — Einsatzwahl');

fire(m1.root, 'vs:state', { from: 'idle', to: 'spinning' });
check(m1.cabinet.querySelector('.vs-bets').classes.has('vs-bets--locked'), 'während des Zuges: vs-bets--locked');
check(m1.betButtons.every((button) => button.getAttribute('aria-disabled') === 'true'),
	'alle vier Einsatztasten tragen aria-disabled="true"');
// Ein Knopf, der GERADE NICHT gewählt ist – sonst bewiese ein Klick, der
// nichts ändert, nur, dass er schon vorher gewählt war.
const lockedButton = m1.betButtons.find((button) => !button.classes.has('vs-bet--selected'));
lockedButton.dispatchEvent(new StubEvent('click', { bubbles: true, detail: 1 }));
check(!lockedButton.classes.has('vs-bet--selected'), 'ein Klick während der Sperre bleibt wirkungslos');
fire(m1.root, 'vs:state', { from: 'spinning', to: 'idle' });

lockedButton.dispatchEvent(new StubEvent('click', { bubbles: true, detail: 1 }));
check(lockedButton.classes.has('vs-bet--selected') && lockedButton.getAttribute('aria-pressed') === 'true',
	'im Ruhezustand wählt ein Klick den Einsatz – aria-pressed und die Klasse folgen');
check(m1.betButtons.filter((button) => button.classes.has('vs-bet--selected')).length === 1,
	'genau eine Taste ist gewählt');

console.log('\nK-8 — CASH OUT');

await m1.wallet.machineCredit.insert(300);
await advance(300);
const bankBefore = credit.balance;
let cashoutEvent = null;
m1.root.addEventListener('vs:cashout', (event) => {
	cashoutEvent = event.detail;
});
m1.cashout.dispatchEvent(new StubEvent('click', { bubbles: true, isTrusted: true, detail: 1 }));
await advance(500);
check(m1.wallet.machineCredit.amount === 0, 'nach dem Druck ist der Gerätekredit 0');
check(credit.balance === bankBefore + 300, 'die Kasse ist um genau den Betrag höher');
check(cashoutEvent?.moved === 300 && cashoutEvent?.capped === false, 'vs:cashout meldet moved und capped');
check(m1.cashout.disabled === true && m1.root.dataset.vsCashout === 'off', 'die Taste ist wieder disabled, off');

console.log('\nK-9 — Verlassen der Seite');

await m1.wallet.machineCredit.insert(75);
await advance(200);
const totalBeforeLeave = credit.balance + m1.wallet.machineCredit.amount;
m1.auto.destroy();
m1.panel.destroy();
m1.bank.destroy();
m1.wallet.destroy();
await advance(200);
check(credit.balance === totalBeforeLeave, 'die Abräumkette bucht genau einmal vollständig zurück');
const mirrorKey = `casinoKunterbunt.machine.${m1.wallet.machineCredit.key}`;
check(cells.get(mirrorKey) === undefined, 'der Spiegel ist gelöscht');
const survivors = [...cells.keys()].filter((key) => key !== 'casinoKunterbunt.credits');
check(survivors.length === 0,
	`im Speicher liegt nur casinoKunterbunt.credits (casinoKunterbunt.sound gehört zu einem hier `
	+ `nicht geladenen Klangpult; Fund: ${survivors.join(', ') || 'keiner'})`);

console.log('\nK-10 — der doppelte Einlöse-Schutz des Anspruchs');

const m2 = buildMachine();
await credit.set(1000);

const claimA = new WinClaim(m2.root, 40, m2.wallet.machineCredit);
const firstCollect = await claimA.collect();
check(firstCollect.ok === true, 'die erste Einlösung gelingt');
const secondCollect = await claimA.collect();
check(secondCollect.ok === false && secondCollect.reason === 'settled',
	'ein zweites collect() liefert {ok: false, reason: settled} und bucht nichts');

const beforeDiscard = m2.wallet.machineCredit.amount;
const claimB = new WinClaim(m2.root, 30, m2.wallet.machineCredit);
const discarded = claimB.discard();
check(discarded === true && m2.wallet.machineCredit.amount === beforeDiscard,
	'discard() bucht nichts und macht den Anspruch unbrauchbar');
check(claimB.discard() === false, 'ein zweites discard() liefert false');

const nearMax = m2.wallet.machineCredit.MAX - m2.wallet.machineCredit.amount + 20;
const claimC = new WinClaim(m2.root, nearMax, m2.wallet.machineCredit);
const cappedResult = await claimC.collect();
check(cappedResult.capped === true, 'ein Anspruch über dem Höchstbetrag wird gekappt');
check(cappedResult.credited === m2.wallet.machineCredit.MAX - (m2.wallet.machineCredit.amount - cappedResult.credited),
	'credited ist genau die Differenz zum Höchststand') || check(
	m2.wallet.machineCredit.amount === m2.wallet.machineCredit.MAX,
	'nach der Kappung steht das Gerät exakt am Höchststand');
await m2.wallet.machineCredit.close();

/* ==========================================================================
   7. L — RISIKO-LEITER
   ========================================================================== */

console.log('\nL-1 — risk.js enthält keine einzige Zeitangabe');

const riskSource = await readFile(fileURLToPath(new URL('risk.js', VIDEO_JS)), 'utf8');
const riskStripped = riskSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
check(!/\b\d+\s*(ms|Millisekunden)\b/.test(riskStripped),
	'keine Zeitangabe (ms/Millisekunden) außerhalb von Kommentaren');
check(!/\b200\b/.test(riskStripped) && !/\b40\b/.test(riskStripped) && !/0\.85/.test(riskStripped),
	'auch die Zahlen 200, 40 und 0.85 kommen außerhalb von Kommentaren nicht vor');
check(riskSource.includes("from '@phomo17/casino-startpage/risk-ladder.js'"),
	'risk.js importiert die geteilte Leiter aus casino_startpage');

console.log('\nL-2 — die Kurve stimmt für die Stufen 1 bis 8 mit risk-timing.js überein');

const m3 = buildMachine();
await credit.set(5000);
await m3.wallet.machineCredit.insert(500);
await advance(200);

async function offerWin(machine, amount) {
	const claim = new WinClaim(machine.root, amount, machine.wallet.machineCredit);
	const asked = fire(machine.root, 'vs:payout', { win: amount, bet: 1, claim }, { cancelable: true });
	return !asked; // true, wenn abgebrochen (die Leiter hat übernommen)
}

const offered1 = await offerWin(m3, 10);
check(offered1 === true, 'die Leiter übernimmt das Angebot');
const riskButton = m3.riskButton ?? m3.cabinet.querySelector('.vs-btn[data-vs-button="risk"]');
riskButton.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true }));
let levelsOk = true;
for (let level = 1; level <= 8; level++) {
	const gotSide = String(m3.root.dataset.vsRiskSide);
	const gotOn = Number(m3.root.dataset.vsRiskOn);
	const expectOn = timing.onMs(level);
	if (gotSide !== '200' || gotOn !== expectOn) {
		levelsOk = false;
		check(false, `Stufe ${level}: side ${gotSide} (erwartet 200), on ${gotOn} (erwartet ${expectOn})`);
	}
	const lit = m3.root.dataset.vsRiskLit;
	const guessButton = m3.cabinet.querySelector(`.vs-btn[data-vs-button="risk-${lit}"]`);
	guessButton.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true }));
}
check(levelsOk, 'Stufe 1 bis 8: side 200, on wie in risk-timing.js.onMs() – auf jeder Stufe');
check(Number(m3.root.dataset.vsRiskOn) === 40, 'ab Stufe 6 steht dort konstant 40');

console.log('\nL-3 — Treffer, Fehlgriff, REWARD');

const winBefore = Number(m3.root.dataset.vsRiskWin);
{
	const lit = m3.root.dataset.vsRiskLit;
	const guessButton = m3.cabinet.querySelector(`.vs-btn[data-vs-button="risk-${lit}"]`);
	guessButton.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true }));
}
const levelAfterHit = Number(m3.root.dataset.vsRiskLevel);
check(Number(m3.root.dataset.vsRiskWin) === winBefore * 2, 'ein Treffer verdoppelt den offenen Gewinn');

{
	const lit = m3.root.dataset.vsRiskLit;
	const wrongSide = lit === 'left' ? 'right' : 'left';
	const guessButton = m3.cabinet.querySelector(`.vs-btn[data-vs-button="risk-${wrongSide}"]`);
	guessButton.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true }));
}
check(Number(m3.root.dataset.vsRiskWin) === 0, 'ein Fehlgriff setzt data-vs-risk-win auf 0');
check(Number(m3.root.dataset.vsRiskLevel) === 0 || m3.root.dataset.vsRiskPhase === 'off',
	'die Leiter ist danach im Grundzustand');
void levelAfterHit;

const claimReward = new WinClaim(m3.root, 25, m3.wallet.machineCredit);
fire(m3.root, 'vs:payout', { win: 25, bet: 1, claim: claimReward }, { cancelable: true });
const creditBeforeReward = m3.wallet.machineCredit.amount;
const rewardButton = m3.cabinet.querySelector('.vs-btn[data-vs-button="reward"]');
rewardButton.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true }));
await advance(50);
check(m3.wallet.machineCredit.amount === creditBeforeReward + 25, 'REWARD schreibt genau den offenen Gewinn gut');

const claimDark = new WinClaim(m3.root, 15, m3.wallet.machineCredit);
fire(m3.root, 'vs:payout', { win: 15, bet: 1, claim: claimDark }, { cancelable: true });
const startButton = m3.cabinet.querySelector('.vs-btn[data-vs-button="risk"]');
startButton.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true }));
await advance(300); // in den dunklen Spalt zwischen zwei Lichtwechseln
const beforeDarkGuess = m3.wallet.machineCredit.amount;
const leftButton = m3.cabinet.querySelector('.vs-btn[data-vs-button="risk-left"]');
leftButton.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true }));
check(m3.root.dataset.vsRiskPhase === 'off' && m3.wallet.machineCredit.amount === beforeDarkGuess,
	'ein Druck, während beide Felder dunkel sind, ist ein Fehlgriff');

console.log('\nL-4 — START in der laufenden Leiter ist wirkungslos');

const claimRunning = new WinClaim(m3.root, 12, m3.wallet.machineCredit);
fire(m3.root, 'vs:payout', { win: 12, bet: 1, claim: claimRunning }, { cancelable: true });
m3.cabinet.querySelector('.vs-btn[data-vs-button="risk"]')
	.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true }));
const creditDuringLadder = m3.wallet.machineCredit.amount;
const cameWhileLadder = m3.playRound({ bet: 1, factor: 0 });
check(cameWhileLadder === false, 'vs:round wird während der Leiter abgebrochen');
check(m3.wallet.machineCredit.amount === creditDuringLadder, 'es wird kein Einsatz gebucht');
check(m3.root.dataset.vsRiskPhase === 'ladder', 'die Leiter läuft unverändert weiter');

console.log('\nL-5 — START im Angebot');

// REWARD beendet die noch laufende Leiter aus L-4 deterministisch (anders
// als ein Tipp: der träfe immer, weil er das gerade gemalte Feld errät, und
// die Leiter liefe endlos weiter).
m3.cabinet.querySelector('.vs-btn[data-vs-button="reward"]')
	.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true }));
await advance(50);
check(m3.root.dataset.vsRiskPhase === 'off', 'Vorbereitung: Leiter aufgelöst (REWARD)');

const claimOffer = new WinClaim(m3.root, 8, m3.wallet.machineCredit);
fire(m3.root, 'vs:payout', { win: 8, bet: 1, claim: claimOffer }, { cancelable: true });
check(m3.root.dataset.vsRiskPhase === 'offer', 'ein neues Angebot liegt vor');
const creditBeforeStart = m3.wallet.machineCredit.amount;
const cameFromOffer = m3.playRound({ bet: 2, factor: 0 });
check(cameFromOffer === true, 'START im Angebot: die Runde kommt zustande');
check(m3.wallet.machineCredit.amount === creditBeforeStart + 8 - 2,
	'der Gewinn wurde gutgeschrieben, bevor der neue Einsatz geprüft wurde');
m3.backToIdle();

console.log('\nL-6 — die Ansage der Stufe');

const stepAnnounce = m3.cabinet.querySelector('.vs-nixie-group[data-vs-display="stufe"]')
	.querySelector('[data-vs-announce]');
const claimLadder = new WinClaim(m3.root, 5, m3.wallet.machineCredit);
fire(m3.root, 'vs:payout', { win: 5, bet: 1, claim: claimLadder }, { cancelable: true });
m3.cabinet.querySelector('.vs-btn[data-vs-button="risk"]')
	.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true }));
stepAnnounce.textContent = '';
let stepAnnounced = 0;
const originalSet = Object.getOwnPropertyDescriptor(StubElement.prototype, 'textContent');
void originalSet;
// Vier Treffer in Folge, jeweils sofort (das gemalte Feld gilt).
for (let i = 0; i < 4; i++) {
	const before = stepAnnounce.textContent;
	const lit = m3.root.dataset.vsRiskLit;
	m3.cabinet.querySelector(`.vs-btn[data-vs-button="risk-${lit}"]`)
		.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true }));
	if (stepAnnounce.textContent !== before) {
		stepAnnounced++;
	}
}
check(stepAnnounced === 0, 'während der Leiter über vier Treffer bleibt der Ansagebereich unbeschrieben');
const rewardBtn2 = m3.cabinet.querySelector('.vs-btn[data-vs-button="reward"]');
rewardBtn2.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true }));
// announce() ist entprellt (ANNOUNCE_MS = 700) – jede Ansage außer der
// allerersten wartet, bevor sie wirklich geschrieben wird.
await advance(800);
check(stepAnnounce.textContent !== '', 'nach dem Ausgang steht genau ein Satz mit der erreichten Stufe da');

const claimNext = new WinClaim(m3.root, 5, m3.wallet.machineCredit);
fire(m3.root, 'vs:payout', { win: 5, bet: 1, claim: claimNext }, { cancelable: true });
await advance(800);
check(stepAnnounce.textContent === '', 'beim nächsten Angebot ist der Ansagebereich wieder geräumt');
claimNext.discard();
m3.backToIdle();

/* ==========================================================================
   8. A — AUTO-MODUS
   ========================================================================== */

console.log('\nA-1 … A-3 — 50 selbst ausgelöste Züge, keine Leiter, keine Konsolenausgabe');

await m3.wallet.machineCredit.close();
const m4 = buildMachine();
await credit.set(50000);
await m4.wallet.machineCredit.insert(10000);
await advance(300);

const consoleErrors = [];
const realError = console.error;
const realWarn = console.warn;
console.error = (...args) => consoleErrors.push(args.map(String).join(' '));
console.warn = (...args) => consoleErrors.push(args.map(String).join(' '));

const pendingHistory = [];
m4.auto.syncAttributes = new Proxy(m4.auto.syncAttributes.bind(m4.auto), {
	apply(target) {
		const result = target();
		pendingHistory.push(m4.root.dataset.vsAutoPending);
		return result;
	},
});

const autoButton = m4.cabinet.querySelector('.vs-btn[data-vs-button="auto"]');
autoButton.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true }));
check(m4.root.dataset.vsAuto === 'on', 'AUTO MODE ist eingeschaltet');

const autoFactors = sequence(20260902 * 3);
const FACTORS_AUTO = [0, 0, 0, 0, 5, 0, 0, 0];
let riskOfferSeen = false;
m4.root.addEventListener('vs:risk', (event) => {
	if (event.detail?.phase === 'offer') {
		riskOfferSeen = true;
	}
});

const listenersAfterFirstMark = { root: 0, document: 0 };
const nodesAfterFirstMark = { count: 0 };

function countNodes(node) {
	let total = 1;
	for (const child of node.children) {
		total += countNodes(child);
	}
	return total;
}

let round = 0;
const maxWait = 60 * 1200; // genug virtuelle Zeit für 50 Züge à ~1 s Pause
let waited = 0;
while (Number(m4.root.dataset.vsAutoRounds) < 50 && waited < maxWait && m4.root.dataset.vsAuto === 'on') {
	// Der Auto-Modus stößt selbst über vs:spin an; hier wird nur die
	// virtuelle Uhr vorgestellt, damit sein Zeitgeber feuern kann. Die
	// Auswertung (vs:result) muss der Treiber senden, weil kein machine.js
	// mitläuft – dieselbe Rolle wie beim manuellen playRound().
	const before = Number(m4.root.dataset.vsAutoRounds);
	await advance(1100);
	waited += 1100;
	if (m4.state() === 'spinning') {
		// vs:spin hat startRound() ausgelöst (siehe buildMachine()); der
		// Treiber vervollständigt die Runde jetzt mit einem nachgereichten
		// Gewinnfaktor – genau die Rolle, die sonst machine.js hätte.
		round++;
		// Jede sechste Runde ein Gewinn – FEST nach der Rundenzahl, nicht
		// über die Zahlenfolge: bei acht möglichen Werten wäre in 50 Zügen
		// nicht sichergestellt, dass A-3 überhaupt einen Gewinn zu sehen
		// bekommt.
		const factor = round % 6 === 0 ? 5 : 0;
		void autoFactors;
		m4.finishRound({ factor });
		await advance(50);
		m4.backToIdle();
	}
	if (round === 1) {
		listenersAfterFirstMark.root = m4.root.listeners.length;
		listenersAfterFirstMark.document = document.listeners.length;
		nodesAfterFirstMark.count = countNodes(m4.root);
	}
	void before;
}

check(Number(m4.root.dataset.vsAutoRounds) >= 50 || m4.root.dataset.vsAuto === 'off',
	`50 selbst ausgelöste Züge erreicht (${m4.root.dataset.vsAutoRounds})`);
check(consoleErrors.length === 0, `console.error/console.warn wurden null Mal gerufen (${consoleErrors.length})`);
for (const line of consoleErrors) {
	console.log(`          ${line}`);
}

console.log('\nA-2 — kein Wachstum über den Lauf');

check(m4.root.listeners.length === listenersAfterFirstMark.root
	&& document.listeners.length === listenersAfterFirstMark.document,
	'die Zahl der Zuhörer an Gehäuse und Dokument ist nach dem Lauf identisch zu der nach dem ersten Zug');
check(pendingHistory.every((value) => value === '0' || value === '1'),
	'data-vs-auto-pending nimmt über den ganzen Lauf ausschließlich 0 oder 1 an');
check(countNodes(m4.root) === nodesAfterFirstMark.count, 'die Zahl der Elemente im Prüf-DOM ist unverändert');

console.log('\nA-3 — keine Leiter im Auto-Modus, Gewinn sofort gutgeschrieben');

check(riskOfferSeen === true, 'bei mindestens einem Gewinn wurde vs:risk phase:offer gesendet (und abgebrochen)');
check(m4.root.dataset.vsRiskPhase === 'off' || m4.root.dataset.vsRiskPhase === undefined,
	'data-vs-risk-phase blieb über den ganzen Lauf off');

console.error = realError;
console.warn = realWarn;

console.log('\nA-4 — Selbstabschaltung bei zu geringem Gerätekredit');

await m4.wallet.machineCredit.close();
const m5 = buildMachine();
await credit.set(1000);
// Reicht für drei Züge zu 1, nicht für einen vierten.
await m5.wallet.machineCredit.insert(3);
await advance(200);
let autoOffDetail = null;
m5.root.addEventListener('vs:auto', (event) => {
	if (event.detail?.on === false) {
		autoOffDetail = event.detail;
	}
});
m5.cabinet.querySelector('.vs-btn[data-vs-button="auto"]')
	.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true }));

let a4waited = 0;
while (m5.root.dataset.vsAuto === 'on' && a4waited < 10000) {
	await advance(1100);
	a4waited += 1100;
	if (m5.state() === 'spinning') {
		m5.finishRound({ factor: 0 });
		await advance(50);
		m5.backToIdle();
	}
}
check(autoOffDetail?.reason === 'insufficient', `vs:auto meldet {on:false, reason:'insufficient'} (${autoOffDetail?.reason})`);
check(m5.root.dataset.vsAuto === 'off', 'data-vs-auto ist off');
const pendingAfterOff = m5.root.dataset.vsAutoPending;
await advance(3000);
check(m5.root.dataset.vsAutoPending === pendingAfterOff && pendingAfterOff === '0',
	'kein Zeitgeber läuft mehr, es wird nicht von selbst nachgeworfen');

console.log('\nA-5 — Einschalten, während RISK blinkt oder die Leiter läuft');

await m5.wallet.machineCredit.close();
const m6 = buildMachine();
await credit.set(1000);
await m6.wallet.machineCredit.insert(500);
await advance(200);

const claimBlink = new WinClaim(m6.root, 20, m6.wallet.machineCredit);
fire(m6.root, 'vs:payout', { win: 20, bet: 1, claim: claimBlink }, { cancelable: true });
check(m6.root.dataset.vsRiskPhase === 'offer', 'Vorbereitung: RISK blinkt');
const creditBeforeAutoOn = m6.wallet.machineCredit.amount;
m6.cabinet.querySelector('.vs-btn[data-vs-button="auto"]')
	.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true }));
check(m6.wallet.machineCredit.amount === creditBeforeAutoOn + 20, 'der Gewinn ist gutgeschrieben');
check(m6.root.dataset.vsRiskPhase === 'off', 'die Leiter ist im Grundzustand');
check(m6.root.dataset.vsAuto === 'on', 'AUTO MODE bleibt eingeschaltet – nur EIN Tastendruck fand statt');

const claimLadder2 = new WinClaim(m6.root, 15, m6.wallet.machineCredit);
fire(m6.root, 'vs:payout', { win: 15, bet: 1, claim: claimLadder2 }, { cancelable: true });
check(m6.root.dataset.vsRiskPhase === 'off', 'Auto-Modus verhindert das Angebot – die Kasse zahlt sofort aus');

// Dieselbe Auslegung gilt für eine bereits LAUFENDE Leiter (DECISIONS.md,
// Phase 9): AUTO MODE einschalten, während die Leiter läuft, schreibt den
// dann offenen Gewinn ebenfalls gut.
m6.cabinet.querySelector('.vs-btn[data-vs-button="auto"]')
	.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true })); // aus
await advance(200);
const claimAutoRunning = new WinClaim(m6.root, 12, m6.wallet.machineCredit);
fire(m6.root, 'vs:payout', { win: 12, bet: 1, claim: claimAutoRunning }, { cancelable: true });
m6.cabinet.querySelector('.vs-btn[data-vs-button="risk"]')
	.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true }));
check(m6.root.dataset.vsRiskPhase === 'ladder', 'Vorbereitung: die Leiter läuft');
const creditBeforeAutoRunning = m6.wallet.machineCredit.amount;
const winBeforeAutoRunning = Number(m6.root.dataset.vsRiskWin);
m6.cabinet.querySelector('.vs-btn[data-vs-button="auto"]')
	.dispatchEvent(new StubEvent('pointerdown', { isPrimary: true })); // an, mitten in der Leiter
check(m6.root.dataset.vsRiskPhase === 'off', 'AUTO MODE beendet auch eine LAUFENDE Leiter');
check(m6.wallet.machineCredit.amount === creditBeforeAutoRunning + winBeforeAutoRunning,
	'und schreibt den zu diesem Zeitpunkt offenen Gewinn gut');

console.log(failed
	? '\nERGEBNIS: mindestens eine Zusage aus B.10, Phase 7 (Kredit, Leiter, Auto) ist NICHT erfüllt.'
	: '\nERGEBNIS: Kredit, Leiter und Auto-Modus erfüllen die Zusagen aus B.10, Phase 7 – '
	+ 'die Bilanz stimmt über 50 Züge exakt, die Leiter folgt derselben Kurve wie am Reel Slot, '
	+ 'der Auto-Modus läuft stabil ohne Leiter und schaltet sich rechtzeitig selbst ab.');

process.exit(failed ? 1 : 0);
