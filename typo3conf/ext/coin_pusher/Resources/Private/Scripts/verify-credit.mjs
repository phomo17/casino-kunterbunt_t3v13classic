/**
 * Coin Pusher – Nachweis der Verrechnung von Lauf 2
 * =========================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/coin_pusher/Resources/Private/Scripts/verify-credit.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei der ersten Abweichung.
 *
 *
 * WAS HIER BEWIESEN WIRD (Plan Teil 2, Abschnitt 4.33)
 * -------------------------------------------------------
 *  C-1   Beim Betreten ist der Gerätekredit 0, auch wenn die Kasse voll ist.
 *  C-2   Geldeinwurf verschiebt, er erzeugt nicht.
 *  C-3   Alles oder nichts: reicht die Kasse nicht, wird nichts bewegt.
 *  C-4   Der Münzeinwurf kostet genau den Münzwert, die Kasse bleibt unberührt.
 *  C-5   Ohne Deckung keine Münze.
 *  C-6   Zwischen Tastendruck und Wurf liegt kein Zeitschritt der Physik.
 *  C-7   Eine vorn gefallene Münze schreibt genau ihren Wert gut.
 *  C-8   Seitlicher Verlust und Ventil schreiben nichts gut.
 *  C-9   B.5.4, der Kern: nach dem Verlassen der Seite ist der Gerätekredit
 *        vollständig in der Kasse, das Feld bleibt unangetastet.
 *  C-10  Es gibt keine Taste, die das Feld leert und auszahlt.
 *  C-11  CASH OUT bucht nur den Gerätekredit.
 *  C-12  Je Attribut genau ein Schreiber.
 *  C-13  Kein Doppeleinwurf.
 *
 *
 * WARUM MIT DEN ECHTEN DATEIEN UND WIE
 * ------------------------------------
 * Geladen werden elf echte Module über zwei Extensions:
 *
 *   casino_startpage  credit.js, machine-credit.js
 *   coin_pusher       field.js, nixie.js, message.js, press.js, pusher.js,
 *                     wallet.js, bank.js, moneyslot.js, coinslot.js
 *
 * Fünf davon haben keinen Import (credit.js, field.js, nixie.js, message.js,
 * press.js, moneyslot.js — sechs, um genau zu sein) und werden UNVERÄNDERT
 * über ihre Datei-Adresse geladen. Die übrigen importieren einander über die
 * Import-Map von TYPO3 ('@phomo17/…'); Node kennt diese Karte nicht. Sie
 * werden deshalb ALS TEXT gelesen, genau diese Namen durch die vollständige
 * Dateiadresse ersetzt und als data:-Modul geladen — Zeile für Zeile
 * derselbe Code, nur der Modulname ist ein anderer. Dasselbe Verfahren wie in
 * video_slot/verify-credit.mjs.
 *
 * Module, die DEN Zustand führen (credit.js, field.js), werden über ihre
 * DATEI-Adresse geladen, und genau diese Adresse wird in die anderen Dateien
 * hineingeschrieben. Nur so benutzen alle Module dieselbe Instanz.
 *
 * Node hat weder ein Dokument noch einen Browserspeicher noch
 * requestAnimationFrame. Alle drei werden VOR dem Laden hier bereitgestellt.
 * KEINE virtuelle Uhr: keiner der dreizehn Nachweise braucht eine laufende
 * Animation abzuwarten — nur ein paar Mikroaufgaben, bis eine asynchrone
 * Buchung fertig ist (tick()). requestAnimationFrame wird deshalb auf einen
 * Blindgänger gestellt, der nie von selbst feuert: Pusher.tick() läuft in
 * diesem Nachweis nie, throwCoin() braucht sie nicht.
 *
 * Math.random() ist durch eine kleine, wiederholbare Zahlenfolge ersetzt;
 * gezogen wird damit nichts, das dieser Nachweis auswertet — field.js zieht
 * für den Stift-Slalom, dessen Streuung hier nicht geprüft wird.
 *
 * Alle Vergleiche sind ganzzahlig. Im ganzen Skript steht kein Vergleich
 * zweier Kommazahlen auf Gleichheit.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFile } from 'node:fs/promises';
import { readFileSync as readSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CASINO_JS = new URL('../../../../casino_startpage/Resources/Public/JavaScript/', import.meta.url);
const COIN_JS = new URL('../../Public/JavaScript/', import.meta.url);

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

/** Lässt anhängige Versprechen zu Ende laufen (stake(), award(), insert() …). */
async function tick(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await Promise.resolve();
	}
}

/* ==========================================================================
   1. requestAnimationFrame ALS BLINDGÄNGER, EIN DOKUMENT, EIN SPEICHER
   ========================================================================== */

let rafSeq = 0;
defineGlobal('requestAnimationFrame', () => (++rafSeq));
defineGlobal('cancelAnimationFrame', () => {});

class StubEvent {
	constructor(type, options = {}) {
		this.type = type;
		this.detail = options.detail ?? null;
		this.bubbles = options.bubbles === true;
		this.cancelable = options.cancelable === true;
		this.isTrusted = options.isTrusted === true;
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
 * Ein Element, das genug von HTMLElement nachbildet, um die neun Prüflinge
 * dieses Geräts zu bedienen.
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

	/** Nur um einen erzwungenen Umbruch nachzustellen (nixie.js, coinslot.js, moneyslot.js). */
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
		this.hidden = false;
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
   2. DIE ELF ECHTEN MODULE
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

// Seit Ausbaustufe 3, D3b importiert credit.js selbst ein Modul
// (account-backend.js, die Umschaltstelle zwischen Browserspeicher und
// Konto) — ÜBER DAS PRÄFIX (@phomo17/casino-startpage/…), nicht relativ:
// coin_pusher/store.js importiert account-backend.js zwangsläufig über
// dasselbe Präfix (andere Extension), und ein hier abweichender relativer
// Import erzeugte im Browser ein ZWEITES, unabhängiges konto-Objekt unter
// einer zweiten Adresse (an der laufenden Seite gemessen, Korrektur vom
// 2026-09-10, zweiter Nachbesserungslauf). Ein bare specifier löst Node
// ohne die Import-Map von TYPO3 nicht auf. credit.js wird deshalb, wie
// machine-credit.js es hier schon immer vormacht, ALS TEXT gelesen, der
// eine Modulname aufgelöst und über eine data:-Adresse geladen. CREDIT_URL
// zeigt ab hier auf diese gepatchte Fassung — jede der drei bestehenden
// Stellen, die CREDIT_URL benutzen (der direkte Import unten, sowie die
// Ersetzungsziele für machine-credit.js und bank.js), bekommt dadurch
// automatisch denselben Kassen-Singleton.
const ACCOUNT_URL_FOR_CREDIT = new URL('account-backend.js', CASINO_JS).href;
const creditSourceForNode = await readFile(fileURLToPath(new URL('credit.js', CASINO_JS)), 'utf8');
const patchedCreditForNode = creditSourceForNode.replaceAll(
	"'@phomo17/casino-startpage/account-backend.js'", JSON.stringify(ACCOUNT_URL_FOR_CREDIT)
);
check(patchedCreditForNode !== creditSourceForNode, 'der Modulname account-backend.js in credit.js wurde für Node aufgelöst');
const CREDIT_URL = `data:text/javascript;base64,${Buffer.from(patchedCreditForNode, 'utf8').toString('base64')}`;
const FIELD_URL = new URL('field.js', COIN_JS).href;
const NIXIE_URL = new URL('nixie.js', COIN_JS).href;
const MESSAGE_URL = new URL('message.js', COIN_JS).href;
const PRESS_URL = new URL('press.js', COIN_JS).href;
const MONEYSLOT_URL = new URL('moneyslot.js', COIN_JS).href;

const CREDIT_NAME = '@phomo17/casino-startpage/credit.js';
const ACCOUNT_NAME = '@phomo17/casino-startpage/account-backend.js';
const FIELD_NAME = '@phomo17/coin-pusher/field.js';
const NIXIE_NAME = '@phomo17/coin-pusher/nixie.js';
const PRESS_NAME = '@phomo17/coin-pusher/press.js';
const MACHINE_CREDIT_NAME = '@phomo17/casino-startpage/machine-credit.js';

const { credit } = await import(CREDIT_URL);
check(typeof credit?.canAfford === 'function', 'casino_startpage/credit.js über seine Datei-URL geladen');

const { Field, COIN_VALUES, COIN_RADIUS, FIELD_DEPTH, FRONT_ZONE_DEPTH, LOWER_DEPTH, PLATE_STROKE, DECK_HEIGHT } = await import(FIELD_URL);
check(typeof Field === 'function', 'coin_pusher/field.js über seine Datei-URL geladen');

/**
 * Die einzige Tiefe, die bei JEDER Phase der Vorderwand sicher auf der
 * unteren Ebene liegt: die Mitte zwischen dem vorderen Bereich (wo eine
 * Münze in den Schacht fiele) und der VORDERSTEN Lage der Vorderwand
 * (dahinter stünde in dieser Phase Metall) – dieselbe Konstante wie F-18 in
 * verify-physics.mjs. Abgeleitet und nicht festgeschrieben, damit die
 * nächste Maßänderung diese Handplatzierungen nicht wieder von Hand
 * nachzieht.
 */
const SAFE_LOWER_Y = (FRONT_ZONE_DEPTH + (LOWER_DEPTH - PLATE_STROKE)) / 2;

const { findNixie } = await import(NIXIE_URL);
check(typeof findNixie === 'function', 'coin_pusher/nixie.js über seine Datei-URL geladen');

const { MessageBoard } = await import(MESSAGE_URL);
check(typeof MessageBoard === 'function', 'coin_pusher/message.js über seine Datei-URL geladen');

await import(PRESS_URL);
check(true, 'coin_pusher/press.js über seine Datei-URL geladen');

const { MoneySlot } = await import(MONEYSLOT_URL);
check(typeof MoneySlot === 'function', 'coin_pusher/moneyslot.js über seine Datei-URL geladen');

const machineCreditUrl = await toModule(new URL('machine-credit.js', CASINO_JS),
	[[CREDIT_NAME, CREDIT_URL], [ACCOUNT_NAME, ACCOUNT_URL_FOR_CREDIT]], 'machine-credit.js');
const { openMachineCredit } = await import(machineCreditUrl);
check(typeof openMachineCredit === 'function', 'machine-credit.js geladen (openMachineCredit)');

const pusherUrl = await toModule(new URL('pusher.js', COIN_JS),
	[[FIELD_NAME, FIELD_URL]], 'pusher.js');
const { Pusher } = await import(pusherUrl);
check(typeof Pusher === 'function', 'coin_pusher/pusher.js geladen');

const walletUrl = await toModule(new URL('wallet.js', COIN_JS), [
	[MACHINE_CREDIT_NAME, machineCreditUrl],
	[NIXIE_NAME, NIXIE_URL],
], 'wallet.js');
const { Wallet } = await import(walletUrl);
check(typeof Wallet === 'function', 'coin_pusher/wallet.js geladen');

const bankUrl = await toModule(new URL('bank.js', COIN_JS),
	[[CREDIT_NAME, CREDIT_URL]], 'bank.js');
const { Bank } = await import(bankUrl);
check(typeof Bank === 'function', 'coin_pusher/bank.js geladen');

const coinslotUrl = await toModule(new URL('coinslot.js', COIN_JS), [
	[PRESS_NAME, PRESS_URL],
	[NIXIE_NAME, NIXIE_URL],
	[FIELD_NAME, FIELD_URL],
], 'coinslot.js');
const { CoinSlot } = await import(coinslotUrl);
check(typeof CoinSlot === 'function', 'coin_pusher/coinslot.js geladen');

/* ==========================================================================
   3. EIN GEHÄUSE UND EINE KLEINE, WIEDERHOLBARE ZAHLENFOLGE
   ========================================================================== */

const document = new StubDocument();

/**
 * @param {number} seed
 * @returns {() => number}
 */
function makeRandom(seed) {
	let state = seed >>> 0;
	return () => {
		state = (Math.imul(state, 1103515245) + 12345) >>> 0;
		return state;
	};
}

/**
 * Baut ein .cp-machine mit genau den Elementen, die die geprüften Module
 * unter den Selektoren suchen, unter denen sie sie suchen.
 *
 * @returns {object}
 */
function buildCabinet() {
	const root = document.append(new StubElement(document, ['.cp-machine']));

	const message = root.append(new StubElement(document, ['.cp-message']));
	for (const key of ['insufficient', 'nocash', 'capped', 'invalid', 'norng']) {
		message.dataset[`cpText${key[0].toUpperCase()}${key.slice(1)}`] = key.toUpperCase();
	}

	/** @param {string} name @param {number} length @returns {StubElement} */
	function nixieGroup(name, length) {
		const element = root.append(new StubElement(document,
			['.cp-nixie-group', `.cp-nixie-group[data-cp-display="${name}"]`], { cpDisplay: name }));
		for (let i = 0; i < length; i++) {
			element.append(new StubElement(document, ['.cp-nixie']));
		}
		element.append(new StubElement(document, ['[data-cp-announce]'], { cpTextDisplay: `${name}: {0}` }));
		return element;
	}
	nixieGroup('guthaben', 6);
	nixieGroup('muenzwert', 2);

	/** @type {StubElement[]} */
	const valueButtons = [];
	for (const value of COIN_VALUES) {
		const button = root.append(new StubElement(document, ['[data-cp-value]']));
		button.setAttribute('data-cp-value', String(value));
		button.setAttribute('aria-pressed', value === COIN_VALUES[0] ? 'true' : 'false');
		if (value === COIN_VALUES[0]) {
			button.classList.add('cp-value--selected');
		}
		valueButtons.push(button);
	}

	const dropButton = root.append(new StubElement(document, ['[data-cp-drop]']));
	const dropCoin = dropButton.append(new StubElement(document, ['[data-cp-drop-coin]']));
	void dropCoin;

	const bankDisplay = root.append(new StubElement(document, ['[data-cp-bank-display]']));
	const bankAnnounce = root.append(new StubElement(document, ['[data-cp-bank-announce]'], {
		cpTextBank: 'KASSE: {0}',
	}));
	void bankDisplay;
	void bankAnnounce;

	const cashout = root.append(new StubElement(document, ['[data-cp-cashout]']));
	cashout.disabled = true;

	const coinForm = root.append(new StubElement(document, ['[data-cp-coinslot]']));
	for (const amount of [10, 50, 100]) {
		coinForm.append(new StubElement(document, ['[data-cp-coin-add]'], { cpCoinAdd: String(amount) }));
	}
	const coinInput = coinForm.append(new StubElement(document, ['[data-cp-coin-input]']));
	coinForm.append(new StubElement(document, ['[data-cp-coin-insert]']));
	coinForm.append(new StubElement(document, ['[data-cp-coin]']));

	return { root, message, valueButtons, dropButton, cashout, coinForm, coinInput };
}

function fire(target, type, detail, options = {}) {
	return target.dispatchEvent(new StubEvent(type, { detail, bubbles: true, ...options }));
}

/**
 * Baut ein spielbares Gehäuse: Meldungsschild, Verrechnung, Kasse, Physik,
 * Geldeinwurf und Münzeinwurf — genau die Reihenfolge aus coin-pusher.js,
 * bindMachines(), ohne MachineSound (dieses Skript prüft keinen Klang).
 *
 * @param {number} seed
 * @returns {object}
 */
function buildMachine(seed) {
	const parts = buildCabinet();
	const board = new MessageBoard(parts.message);
	const wallet = new Wallet(parts.root, board);
	const bank = new Bank(parts.root, wallet.machineCredit, board);
	const field = new Field({ random: makeRandom(seed) });
	const pusher = new Pusher(parts.root, field, { draw() {} });
	const moneySlot = new MoneySlot(parts.root, board, wallet.machineCredit);
	const coinSlot = new CoinSlot(parts.root, wallet, pusher);

	return { ...parts, board, wallet, bank, field, pusher, moneySlot, coinSlot };
}

/* ==========================================================================
   4. C — DIE VERRECHNUNG
   ========================================================================== */

console.log('\nC-1 — beim Betreten ist der Gerätekredit 0');

await credit.reload();
await credit.set(credit.MAX_CREDITS);
const m = buildMachine(20260903);
check(m.wallet.machineCredit.amount === 0, 'der Gerätekredit ist 0, obwohl die Kasse voll ist');
check(m.root.dataset.cpMachineCredit === '0', 'data-cp-machine-credit meldet es sofort');
check(m.root.dataset.cpMirror === '', 'data-cp-mirror ist leer');
check(m.cashout.disabled === true, 'CASH OUT trägt disabled');

console.log('\nC-2 — Geldeinwurf verschiebt, er erzeugt nicht');

await credit.set(100);
let totalBefore = credit.balance + m.wallet.machineCredit.amount;
m.coinInput.value = '40';
fire(m.coinForm, 'submit', null, { cancelable: false });
await tick();
check(credit.balance === 60, `Kasse 100, Einwurf 40 → Kasse 60 (${credit.balance})`);
check(m.wallet.machineCredit.amount === 40, `Gerätekredit 40 (${m.wallet.machineCredit.amount})`);
check(credit.balance + m.wallet.machineCredit.amount === totalBefore, 'die Summe bleibt unverändert');

console.log('\nC-3 — alles oder nichts');

await m.wallet.machineCredit.cashOut();
await tick();
await credit.set(30);
totalBefore = credit.balance + m.wallet.machineCredit.amount;
m.coinInput.value = '100';
fire(m.coinForm, 'submit', null, { cancelable: false });
await tick();
check(m.wallet.machineCredit.amount === 0, 'Kasse 30, Einwurf 100 → nichts wandert ins Gerät');
check(credit.balance === 30, 'die Kasse bleibt bei 30');
check(m.board.current === 'nocash', `das Schild zeigt nocash (${m.board.current})`);
check(credit.balance + m.wallet.machineCredit.amount === totalBefore, 'die Summe bleibt unverändert');

console.log('\nC-4 — der Münzeinwurf kostet genau den Münzwert');

await credit.set(100);
await m.wallet.machineCredit.insert(20);
await tick();
const kasseBeforeC4 = credit.balance;
const coinsBeforeC4 = m.pusher.field.count;
m.coinSlot.selectValue(5);
const droppedC4 = await m.coinSlot.drop();
check(droppedC4 === true, 'der Einwurf gelingt');
check(m.wallet.machineCredit.amount === 15, `Gerätekredit 20, Wert 5 → 15 (${m.wallet.machineCredit.amount})`);
check(credit.balance === kasseBeforeC4, 'die Kasse bleibt unberührt');
check(m.pusher.field.count === coinsBeforeC4 + 1, `field.count steigt um genau 1 (${m.pusher.field.count})`);

console.log('\nC-5 — ohne Deckung keine Münze');

await m.wallet.machineCredit.cashOut();
await tick();
await m.wallet.machineCredit.insert(2);
await tick();
const coinsBeforeC5 = m.pusher.field.count;
m.coinSlot.selectValue(5);
const droppedC5 = await m.coinSlot.drop();
check(droppedC5 === false, 'Gerätekredit 2, Wert 5 → keine Münze');
check(m.wallet.machineCredit.amount === 2, 'der Gerätekredit bleibt unverändert');
check(m.pusher.field.count === coinsBeforeC5, 'field.count bleibt unverändert');
check(m.board.current === 'insufficient', `das Schild zeigt insufficient (${m.board.current})`);

console.log('\nC-6 — zwischen Tastendruck und Wurf liegt kein Zeitschritt');

await m.wallet.machineCredit.insert(50);
await tick();
m.coinSlot.selectValue(1);
const stepBefore = m.pusher.field.stepCount;
await m.coinSlot.drop();
const stepAfter = m.pusher.field.stepCount;
check(stepBefore === stepAfter, `field.stepCount unverändert (${stepBefore} = ${stepAfter})`);

console.log('\nC-7 — eine vorn gefallene Münze schreibt genau ihren Wert gut');

{
	const scratch = new Field({ random: makeRandom(1) });
	const index = COIN_VALUES.indexOf(5);
	scratch.x[0] = 64;
	scratch.y[0] = 0.3;
	scratch.z[0] = 0;
	scratch.vx[0] = 0;
	scratch.vy[0] = -50;
	scratch.vz[0] = 0;
	scratch.r[0] = COIN_RADIUS[index];
	scratch.value[0] = 5;
	scratch.born[0] = 0;
	scratch.count = 1;
	// scratch.area ist seit dem Umbau eine berechnete Eigenschaft (field.js,
	// get area()) und ergibt sich automatisch aus r[]/count.

	let steps = 0;
	while (scratch.count > 0 && steps < 50) {
		scratch.step();
		steps++;
	}
	check(scratch.count === 0, `die Münze ist nach ${steps} Schritten gefallen`);

	const won = scratch.takeWon();
	check(won.total === 5, `takeWon() liefert genau den Münzwert (${won.total})`);

	const creditBefore = m.wallet.machineCredit.amount;
	const kasseBeforeC7 = credit.balance;
	fire(m.root, 'cp:won', Object.freeze({
		total: won.total,
		byValue: won.byValue,
		count: won.byValue.reduce((a, b) => a + b, 0),
	}));
	await tick();
	check(m.wallet.machineCredit.amount === creditBefore + 5,
		`der Gerätekredit steigt um genau 5 (${m.wallet.machineCredit.amount})`);
	check(credit.balance === kasseBeforeC7, 'die Kasse bleibt unberührt');
}

console.log('\nC-8 — seitlicher Verlust und Ventil schreiben nichts gut');

{
	const scratchLost = new Field({ random: makeRandom(2) });
	const index = COIN_VALUES.indexOf(1);
	scratchLost.x[0] = -2;
	scratchLost.y[0] = 1;
	scratchLost.z[0] = 0;
	scratchLost.vz[0] = 0;
	scratchLost.r[0] = COIN_RADIUS[index];
	scratchLost.value[0] = 1;
	scratchLost.born[0] = 0;
	scratchLost.count = 1;
	// scratchLost.area ist seit dem Umbau eine berechnete Eigenschaft.
	scratchLost.applyWalls();
	scratchLost.collect();
	check(scratchLost.count === 0 && scratchLost.chuteValue === 1,
		'die Münze fällt seitlich in den Schacht');

	// Die Münze des Ventil-Kandidaten muss auf der OBEREN Ebene liegen (y im
	// Rückwandstreifen, z = DECK_HEIGHT) – sonst zöge relieve() sie über den
	// Ausweichzweig „hinterste Münze" statt über die Ventilregel, und die
	// Prüfung bewiese etwas anderes, als ihr Text behauptet.
	// buildGrid()/settleHeights() füllen support[], das relieve() braucht.
	const scratchValve = new Field({ random: makeRandom(3) });
	for (let i = 0; i < 3; i++) {
		scratchValve.x[i] = 50;
		scratchValve.y[i] = FIELD_DEPTH - 10;
		scratchValve.z[i] = DECK_HEIGHT;
		scratchValve.vz[i] = 0;
		scratchValve.r[i] = COIN_RADIUS[0];
		scratchValve.value[i] = COIN_VALUES[0];
		scratchValve.born[i] = i;
	}
	scratchValve.count = 3;
	scratchValve.buildGrid();
	scratchValve.settleHeights();
	const removed = scratchValve.relieve();
	check(removed === true && scratchValve.valveValue === COIN_VALUES[0],
		'das Ventil entfernt eine Münze ohne Gutschrift');

	const creditBefore = m.wallet.machineCredit.amount;
	const kasseBefore = credit.balance;
	fire(m.root, 'cp:lost', Object.freeze({ total: 1 }));
	fire(m.root, 'cp:valve', Object.freeze({ total: COIN_VALUES[0] }));
	await tick();
	check(m.wallet.machineCredit.amount === creditBefore, 'cp:lost/cp:valve ändern den Gerätekredit nicht');
	check(credit.balance === kasseBefore, 'und auch die Kasse nicht');
}

console.log('\nC-13 — kein Doppeleinwurf');

{
	await m.wallet.machineCredit.insert(10);
	await tick();
	m.coinSlot.selectValue(1);
	const before = m.pusher.field.count;
	const p1 = m.coinSlot.drop();
	const p2 = m.coinSlot.drop();
	const [r1, r2] = await Promise.all([p1, p2]);
	check(r1 === true && r2 === false, `nur der erste Druck wirft eine Münze (${r1}, ${r2})`);
	check(m.pusher.field.count === before + 1, `field.count steigt um genau eins (${m.pusher.field.count})`);
}

console.log('\nC-9 — B.5.4, der Kern: Verlassen der Seite');

{
	const fieldCountBefore = m.pusher.field.count;
	const kasseBefore = credit.balance;
	const machineCreditBefore = m.wallet.machineCredit.amount;
	m.wallet.destroy();
	await tick();
	check(credit.balance === kasseBefore + machineCreditBefore,
		'der Gerätekredit ist vollständig in der Kasse');
	check(m.pusher.field.count === fieldCountBefore, 'field.count bleibt unverändert — die Münzen wandern nicht mit');
}

console.log('\nC-11 — CASH OUT bucht nur den Gerätekredit');

await credit.set(100);
const m2 = buildMachine(20260904);
for (let i = 0; i < 3; i++) {
	m2.pusher.field.x[i] = 30 + i * 10;
	m2.pusher.field.y[i] = SAFE_LOWER_Y;
	m2.pusher.field.z[i] = 0;
	m2.pusher.field.vz[i] = 0;
	m2.pusher.field.r[i] = COIN_RADIUS[0];
	m2.pusher.field.value[i] = COIN_VALUES[0];
	m2.pusher.field.born[i] = i;
}
m2.pusher.field.count = 3;
await m2.wallet.machineCredit.insert(30);
await tick();
const kasseBeforeC11 = credit.balance;
const fieldCountBeforeC11 = m2.pusher.field.count;
await m2.bank.cashOut();
await tick();
check(credit.balance === kasseBeforeC11 + 30, `die Kasse steigt um genau 30 (${credit.balance})`);
check(m2.wallet.machineCredit.amount === 0, 'der Gerätekredit ist 0');
check(m2.pusher.field.count === fieldCountBeforeC11, 'field.count ist unverändert — die liegenden Münzen bleiben liegen');

/* ==========================================================================
   5. C-10, C-12 — TEXTPRÜFUNG ÜBER DIE MODULE
   ========================================================================== */

console.log('\nC-10 — es gibt keine Taste, die das Feld leert und auszahlt');

{
	// Kommentare zuerst raus: bank.js und wallet.js NENNEN storage.clear()
	// im Kopfkommentar ausdrücklich als das, was NICHT gerufen wird — das
	// darf die Prüfung nicht selbst auslösen.
	const ohneKommentare = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

	// coin-pusher.js ist das EINSTIEGSMODUL, kein Bedienteil, und räumt beim
	// Abräumen legitime Set#clear()-Aufrufe auf (sounds.clear() usw.) — die
	// gehören nicht in diese Prüfung. Keines der fünf Bedienteil-Module
	// importiert store.js/storage.js überhaupt (Textprüfung), also kann
	// keines von ihnen storage.clear() erreichen.
	const BEDIENTEIL_MODULE = ['coinslot.js', 'moneyslot.js', 'bank.js', 'wallet.js', 'sound.js'];
	const treffer = [];
	for (const name of BEDIENTEIL_MODULE) {
		const source = ohneKommentare(readSync(new URL(name, COIN_JS), 'utf8'));
		if (/storage\s*\.\s*clear\s*\(/.test(source)
			|| /from\s+['"]@phomo17\/coin-pusher\/stor(?:e|age)\.js['"]/.test(source)) {
			treffer.push(name);
		}
	}
	check(treffer.length === 0,
		'storage.clear( kommt in keinem der fünf Bedienteil-Module vor, und keines importiert store.js/storage.js',
		...treffer);
}

console.log('\nC-12 — je Attribut genau ein Schreiber');

{
	const OWNERS = {
		cpMachineCredit: ['wallet.js'],
		cpMirror: ['wallet.js'],
		cpBank: ['bank.js'],
		cpTotal: ['bank.js'],
		cpCashout: ['bank.js'],
		cpCoins: ['pusher.js'],
	};
	const ALL_MODULES = [
		'press.js', 'message.js', 'nixie.js', 'wallet.js', 'bank.js', 'moneyslot.js',
		'coinslot.js', 'sound.js', 'coin-pusher.js', 'pusher.js', 'lamp.js', 'view.js', 'store.js', 'seed.js',
	];
	const sources = new Map();
	for (const name of ALL_MODULES) {
		sources.set(name, readSync(new URL(name, COIN_JS), 'utf8'));
	}
	for (const [property, owners] of Object.entries(OWNERS)) {
		const writers = [];
		for (const [name, source] of sources) {
			if (new RegExp(`\\.${property}\\s*=`).test(source)) {
				writers.push(name);
			}
		}
		check(writers.length === owners.length && owners.every((owner) => writers.includes(owner)),
			`${property} wird nur in ${owners.join(', ')} geschrieben (gefunden: ${writers.join(', ') || 'nirgends'})`);
	}
}

/* ------------------------------------------------------------- Ergebnis */

console.log(failed
	? '\nERGEBNIS: mindestens eine Zusage zur Verrechnung von Lauf 2 ist nicht erfüllt.'
	: '\nERGEBNIS: der Gerätekredit startet bei 0, Geldeinwurf und Münzeinwurf verschieben nur, '
	+ 'CASH OUT bucht nur den Gerätekredit, das Feld bleibt beim Verlassen unangetastet, '
	+ 'es gibt keine Rückstell-Taste, und jedes Attribut hat genau einen Schreiber.');

process.exit(failed ? 1 : 0);
