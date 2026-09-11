// @pruefstand modus=egal laufzeit=kurz

/**
 * FruitRisk – Nachweis von Kasse, Gerätekredit und Angebot
 * ===========================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/fruit_risk/Resources/Private/Scripts/verify-credit.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei mindestens einer Abweichung.
 *
 *
 * WAS HIER BEWIESEN WIRD, UND IN WELCHER PHASE
 * -------------------------------------------------
 *  S-1 … S-4    die Selbstprüfung des Prüfstands selbst — siehe unten,
 *               „DIE STUB-FALLE", Phase F4c.
 *  K-1 … K-10   Kasse, Einwurf, Verrechnung, Verlassen der Seite, der
 *               doppelte Einlöse-Schutz des Anspruchs. Phase F4c.
 *  V-1 … V-4    der Ereignis- und Messpunktvertrag gegen machine.js.
 *               Phase F4d — kommt dazu, sobald machine.js existiert.
 *  R-1 … R-6    Runden und Angebot mit dem vollständigen Treiber.
 *               Phase F4d — kommt dazu, sobald machine.js existiert.
 *
 * STAND F4d: alle vier Blöcke sind eingetragen. Block V liest machine.js
 * (und die übrigen Absenderdateien) als TEXT und prüft den Vertrag aus
 * README.md gegen den Quelltext — es wird dafür nicht ausgeführt. Block R
 * spielt weiterhin über den TREIBER (siehe unten): wallet.js und bank.js
 * hören auf fr:round/fr:result, die dieser Prüfstand selbst auslöst, genau
 * wie es machine.js täte. Das ist bewusst so geblieben, nicht nachträglich
 * durch ein echtes Sichtfeld ersetzt worden: die Bewegung der Walzen ist
 * keine Geldfrage und würde nur ein vollständiges DOM aus 240 Leuchtfeldern
 * erzwingen, ohne Block K oder R schärfer zu machen (siehe „Was
 * verify-credit.mjs bewusst NICHT prüft" in README.md).
 *
 * STAND F5b: Block M (der ECHTE machine.js, über die virtuelle Uhr) und
 * Block L (die drei ECHTEN Risikospiele — risk.js, risk-ladder-multi.js,
 * risk-timing.js) sind dazugekommen; Block V wurde entsprechend erweitert
 * (mehrere Absender je Ereigniszeile, neue Zeilenzahlen).
 *
 * STAND F5c: Block AU (AU-1 … AU-6c) ist dazugekommen — der ECHTE Auto-Modus
 * (auto.js), mit demselben vollständigen Treiber wie Block L
 * (buildFullMachineWithRiskAndAuto()): Umschalten, 50 selbst ausgelöste Züge
 * ohne Leiter, sofortige Gutschrift, Selbstabschaltung bei zu geringem
 * Gerätekredit, höchstens ein Zeitgeber, und alle drei Umschaltzeitpunkte
 * (laufender Zug, Angebot, laufende Leiter). Block V wurde erneut erweitert
 * (fr:auto, fr:riskcollect, fr:spin sind jetzt ECHTE, in auto.js gesendete
 * Ereignisse, keine bloß vorgesehenen Übergabestellen mehr).
 *
 * Behebungslauf (Abnahmetest, Befund „zwei Live-Bereiche füllen sich beim
 * Laden von selbst"): Block LR (LR-1) ist dazugekommen — baut ein
 * vollständiges Gehäuse und verlangt, dass alle vier Live-Bereiche
 * ("machine", "grid", "credit", "risk") nach dem Aufbau leer sind, VOR jeder
 * Bedienung (C.14.12). Vorher fehlte genau diese Prüfung: Block M und Block K
 * prüften jeweils nur, WAS ein Bereich nach einer echten Handlung ansagt,
 * nie, dass er beim bloßen Aufbau still bleibt.
 *
 * Zweiter Behebungslauf (Abnahmetest, Befund „data-fr-sound doppelt belegt",
 * auf das ganze Feld ausgedehnt): Block D (D-1) ist dazugekommen —
 * `countAllDatasetFields()` prüft generisch, ob IRGENDEIN dataset-Feld auf
 * .fr-machine von mehr als einem Element getragen wird, statt nur nach einem
 * einzelnen benannten Namen zu fragen. Damit sofort gefunden:
 * `data-fr-cashout` litt am selben Fehlertyp wie `data-fr-sound` (T-84) —
 * behoben, heißt jetzt `data-fr-cashout-on`.
 *
 * STAND „Starttaste je Gruppe": Block L prüft die neue Regel — im Angebot
 * laden NUR die drei Starttasten ein, der Druck auf eine von ihnen startet die
 * Leiter auf Stufe 1 OHNE zu werten, erst der erste Richtungsdruck ist der
 * erste Versuch. Neu: L-10 (der Start ist kein Versuch), L-11 (danach ist
 * genau diese Gruppe erreichbar), L-12 (Starttasten sind während einer
 * laufenden Leiter und im Grundzustand wirkungslos), L-13 (der Live-Bereich
 * „risk" wird beim Start geleert, ohne etwas Neues anzusagen). L-1 dreht die
 * Erwartung an das Einladungsblinken um; L-3 kommt ohne den früheren
 * Kunstgriff aus, weil Stufe 1 jetzt über einen ECHTEN Druck beobachtbar ist.
 * Block V bleibt unverändert: es kommt weder ein Ereignis noch ein Messpunkt
 * hinzu (fünfzehn Ereignis-, fünfundzwanzig Messpunktzeilen).
 *
 * DIE STUB-FALLE — UND WARUM DIESER PRÜFSTAND SIE NICHT WIEDERHOLT
 * -----------------------------------------------------------------------
 * Im Nachweis des vorhandenen Fünf-Walzen-Geräts (video_slot/…/
 * verify-credit.mjs) setzt der Prüfstand in seinem eigenen Aufbau
 * `cashout.disabled = true` und prüft an zwei Stellen genau
 * `cashout.disabled === true`. Seit der Umstellung der Produktion auf
 * aria-disabled schreibt bank.js dieses Feld dort NIE MEHR — die beiden
 * Prüfungen bestehen seither grün, ohne noch etwas zu prüfen. Ein Nachweis,
 * der gegen seine eigene Vorbelegung prüft, ist schlimmer als keiner: er
 * behauptet Sicherheit, wo keine ist.
 *
 * Die Vorkehrung, dreifach:
 *
 *  1. StubElement führt ein SCHREIBBUCH (this.writes): jede Änderung an
 *     einem Attribut, einer Klasse, einem dataset-Eintrag oder einer Custom
 *     Property wird gezählt, getrennt nach Art und Name.
 *  2. checkWritten() prüft NICHT nur den Wert, sondern verlangt zusätzlich,
 *     dass mindestens ein Schreibvorgang stattgefunden hat. Ein Fund, der
 *     zufällig stimmt, aber von niemandem geschrieben wurde, gilt als
 *     FEHLER.
 *  3. presetMarkup() setzt, was das ausgelieferte HTML mitbringt (etwa
 *     aria-disabled="true" an CASH OUT), OHNE das Schreibbuch zu berühren —
 *     genau wie ein Fluid-Template, das beim Rendern schreibt, nicht die
 *     Produktion zur Laufzeit. Jede Prüfung, die diesen Wert betrifft,
 *     prüft danach einen ÜBERGANG (K-5), nie den Anfangszustand allein.
 *
 * Block S weist zusätzlich mit GEGENPROBEN nach, dass checkWritten() wirklich
 * rot wird, wenn das geprüfte Verhalten fehlt (S-1, S-2) — eine Prüfung, die
 * nie fehlschlagen kann, ist keine.
 *
 *
 * WARUM MIT DEN ECHTEN DATEIEN UND WIE
 * ------------------------------------------
 * Geladen werden zwölf echte Module über zwei Extensions:
 *
 *   casino_startpage   credit.js, machine-credit.js
 *   fruit_risk         paytable.js, nixie.js, counter.js, message.js,
 *                      payout.js, coinslot.js, press.js, announce.js,
 *                      wallet.js, bank.js
 *
 * Neun davon haben KEINEN Import (credit.js, paytable.js, nixie.js,
 * counter.js, message.js, payout.js, coinslot.js, press.js, announce.js)
 * und werden UNVERÄNDERT über ihre Datei-Adresse geladen. Die übrigen drei
 * (machine-credit.js, wallet.js, bank.js) importieren einander über die
 * Import-Map von TYPO3 ('@phomo17/…'); Node kennt diese Karte nicht. Sie
 * werden deshalb ALS TEXT gelesen, genau diese Namen durch die vollständige
 * Dateiadresse ersetzt und als data:-Modul geladen — Zeile für Zeile
 * derselbe Code, nur der Modulname ist ein anderer. Verfahren aus
 * casino_startpage/verify-machine-credit.mjs und video_slot/…/
 * verify-credit.mjs.
 *
 * Node hat weder ein Dokument noch einen Browserspeicher. Beides wird VOR
 * dem Laden hier bereitgestellt (Abschnitte 1 bis 2).
 *
 *
 * DER TREIBER — WAS machine.js AB PHASE F4d TÄTE
 * ----------------------------------------------------
 * fireRound(machine, win) sendet fr:round ABBRECHBAR mit {draw, stake:
 * STAKE} — genau wie startRound() es täte — und, kommt die Runde zustande,
 * unmittelbar danach fr:result mit dem übergebenen Gewinn. wallet.js
 * unterscheidet dabei nicht zwischen einem echten machine.js und diesem
 * Treiber: beide sprechen ausschließlich über die beiden Ereignisse. Damit
 * Block K nicht von der Wirklichkeit abweichen kann, prüft eine künftige
 * Phase F4d (Block V) den Vertrag unmittelbar an machine.js, sobald es
 * existiert.
 *
 *
 * WARUM DIE ZEIT VIRTUELL IST
 * ---------------------------------
 * setTimeout, requestAnimationFrame und performance.now() laufen auf einer
 * eigenen Uhr, die in Schritten von 8 ms vorgestellt wird. Alle Vergleiche
 * sind ganzzahlig. Im ganzen Skript steht kein Vergleich zweier Kommazahlen
 * auf Gleichheit.
 */

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** Resources/Public/JavaScript/ von casino_startpage. */
const CASINO_JS = new URL('../../../../casino_startpage/Resources/Public/JavaScript/', import.meta.url);
/** Resources/Public/JavaScript/ dieser Extension. */
const FRUIT_JS = new URL('../../Public/JavaScript/', import.meta.url);

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
 * vorübergehend gegen eine aus, die nur mitschreibt statt zu drucken und
 * die Gesamtbilanz zu belasten — siehe dort.
 *
 * @type {(condition: boolean, message: string) => void}
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
 * Damit lässt sich beweisen, dass eine Prüfung wirklich rot werden KANN
 * (Block S), statt es nur zu behaupten.
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

/* ==========================================================================
   1. EINE UHR, DIE STILLSTEHT, BIS MAN SIE VORSTELLT
   ========================================================================== */

/**
 * @param {string} name
 * @param {*} value
 * @returns {void}
 */
function defineGlobal(name, value) {
	Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

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

/**
 * Lässt alle setTimeout-Callbacks laufen, die zum AKTUELLEN Stand der
 * virtuellen Uhr bereits fällig sind — OHNE die Uhr selbst vorzustellen.
 * Bildet nach, was ein echter Browser zwischen zwei GETRENNTEN Bedienungen
 * ohnehin tut: die Ereignisschleife arbeitet einen bereits fälligen
 * Makrotask (etwa press.js' setTimeout(…, 0), siehe REVIEW-fruitrisk-f5.md
 * [C1]) ab, sobald die laufende Aufgabe endet — dafür muss keine reale Zeit
 * vergehen. Gebraucht in M-12, das mehrere UNABHÄNGIGE Bedienungen ohne ein
 * dazwischenliegendes advance() prüft.
 *
 * @returns {void}
 */
function flushTimers() {
	for (const [id, timer] of [...timers]) {
		if (timer.at <= clock.ms) {
			timers.delete(id);
			timer.fn();
		}
	}
}

/**
 * Stellt die Uhr vor und lässt dabei alles laufen, was fällig wird.
 *
 * @param {number} ms
 * @returns {Promise<void>}
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
		// fire() ist rein synchron; seine Wirkung (stake(), award(),
		// insert(), collect() …) läuft über await-Ketten. Ohne diese Pause
		// bliebe jede Prüfung unmittelbar danach auf dem Stand VOR der
		// Buchung.
		await Promise.resolve();
		await Promise.resolve();
	}
	await Promise.resolve();
}

/* ==========================================================================
   2. EIN DOKUMENT, DAS NUR ZUSTELLT — MIT SCHREIBBUCH
   ========================================================================== */

class StubEvent {
	constructor(type, options = {}) {
		this.type = type;
		this.detail = options.detail ?? null;
		this.bubbles = options.bubbles === true;
		this.cancelable = options.cancelable === true;
		this.isTrusted = options.isTrusted === true;
		this.isPrimary = options.isPrimary !== false;
		// 0 = primäre/linke Maustaste (PointerEvent.button-Konvention) —
		// derselbe Standardwert, den ein echter Linksklick trägt. Für [M8]
		// (press.js) muss ein Rechts-/Mittelklick (button: 2/1) ausdrücklich
		// gesetzt werden.
		this.button = options.button ?? 0;
		this.key = options.key ?? '';
		this.repeat = options.repeat === true;
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
 * Ein Element, das genug von HTMLElement nachbildet, um wallet.js, bank.js,
 * coinslot.js, message.js, nixie.js, counter.js und payout.js zu bedienen —
 * UND jede Änderung mitzählt (siehe Dateikopf, „DIE STUB-FALLE").
 */
class StubElement {
	/**
	 * @param {?StubElement} document
	 * @param {string[]} [selectors]
	 * @param {Record<string, string>} [datasetInit] Anfangswerte des
	 *        dataset, wie sie ein Fluid-Template beim Rendern mitgäbe.
	 *        Zugriffe DARAUF zählen NICHT als Schreibvorgang — nur was
	 *        DANACH über element.dataset.x = … gesetzt wird.
	 */
	constructor(document, selectors = [], datasetInit = {}) {
		this.ownerDocument = document ?? this;
		this.parentNode = null;
		this.children = [];
		this.selectors = new Set(selectors);
		this.classes = new Set();
		this.attributes = new Map();
		this.listeners = [];
		this.textContent = '';
		this.value = '';

		/**
		 * Das Schreibbuch: wer hat WAS wie oft geschrieben. Getrennt nach
		 * Art, damit S-3 sie einzeln nachrechnen kann.
		 */
		this.writes = {
			attributes: new Map(),
			classes: new Map(),
			dataset: new Map(),
			style: new Map(),
		};

		const styleMap = new Map();
		this.style = {
			getPropertyValue: (name) => (styleMap.has(name) ? styleMap.get(name) : ''),
			setProperty: (name, value) => {
				styleMap.set(name, String(value));
				this.bump('style', name);
			},
		};

		this.classList = {
			add: (name) => {
				this.classes.add(name);
				this.bump('classes', name);
			},
			remove: (name) => {
				this.classes.delete(name);
				this.bump('classes', name);
			},
			contains: (name) => this.classes.has(name),
			toggle: (name, on) => {
				const shouldAdd = on === true || (on === undefined && !this.classes.has(name));
				if (shouldAdd) {
					this.classes.add(name);
				} else {
					this.classes.delete(name);
				}
				this.bump('classes', name);
			},
		};

		const target = { ...datasetInit };
		this.dataset = new Proxy(target, {
			get: (obj, prop) => obj[prop],
			has: (obj, prop) => prop in obj,
			ownKeys: (obj) => Reflect.ownKeys(obj),
			getOwnPropertyDescriptor: (obj, prop) => Object.getOwnPropertyDescriptor(obj, prop),
			set: (obj, prop, value) => {
				obj[prop] = value;
				this.bump('dataset', prop);
				return true;
			},
			deleteProperty: (obj, prop) => {
				delete obj[prop];
				this.bump('dataset', prop);
				return true;
			},
		});
	}

	/**
	 * Zählt einen Schreibvorgang im Schreibbuch hoch.
	 *
	 * @param {'attributes'|'classes'|'dataset'|'style'} kind
	 * @param {string} name
	 * @returns {void}
	 */
	bump(kind, name) {
		const map = this.writes[kind];
		map.set(name, (map.get(name) ?? 0) + 1);
	}

	/**
	 * Leert das Schreibbuch (Behebungslauf REVIEW-fruitrisk-f4.md [M13]).
	 *
	 * this.writes wächst sonst über den ganzen Lauf monoton: eine spätere
	 * checkWritten()-Prüfung könnte durch einen frühen, sachlich unbeteiligten
	 * Schreibvorgang auf denselben Namen bestehen — der Schutz „mindestens
	 * einmal geschrieben" verwässert dadurch, je länger ein Element lebt. Vor
	 * der Handlung rufen, deren Wirkung geprüft werden soll.
	 *
	 * @returns {void}
	 */
	resetWrites() {
		this.writes.attributes.clear();
		this.writes.classes.clear();
		this.writes.dataset.clear();
		this.writes.style.clear();
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
		this.bump('attributes', name);
	}

	removeAttribute(name) {
		this.attributes.delete(name);
		this.bump('attributes', name);
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
 * Liest den Zustand eines Elements für checkWritten() — je nach Art auf
 * unterschiedliche Weise, weil ein Attribut, eine Klasse, ein dataset-Eintrag
 * und eine Custom Property jeweils anders gelesen werden.
 *
 * @param {StubElement} element
 * @param {'attributes'|'classes'|'dataset'|'style'} kind
 * @param {string} name
 * @returns {*}
 */
function readState(element, kind, name) {
	switch (kind) {
		case 'attributes':
			return element.getAttribute(name);
		case 'classes':
			return element.classes.has(name);
		case 'dataset':
			return element.dataset[name];
		case 'style':
			return element.style.getPropertyValue(name);
		default:
			throw new Error(`checkWritten(): unbekannte Art "${kind}".`);
	}
}

/**
 * Prüft einen Zustand, den die PRODUKTION setzen muss.
 *
 * Bestehen kann diese Prüfung nur, wenn der Wert stimmt UND das Element
 * mindestens einmal beschrieben wurde. Damit ist ausgeschlossen, dass eine
 * Prüfung gegen die Vorbelegung des Prüfstands besteht (siehe Dateikopf,
 * „DIE STUB-FALLE").
 *
 * @param {StubElement} element
 * @param {'attributes'|'classes'|'dataset'|'style'} kind
 * @param {string} name
 * @param {*} expected erwarteter Wert; null bedeutet „entfernt"
 * @param {string} message
 * @returns {void}
 */
function checkWritten(element, kind, name, expected, message) {
	const written = element.writes[kind].get(name) ?? 0;
	const actual = readState(element, kind, name);
	check(written > 0 && actual === expected,
		`${message} [Schreibvorgänge: ${written}, gelesen: ${String(actual)}]`);
}

/**
 * Setzt Attribute, wie sie ein Fluid-Template beim Rendern mitgäbe — OHNE
 * das Schreibbuch zu berühren. Siehe Dateikopf, Punkt 3.
 *
 * @param {StubElement} element
 * @param {Record<string, string>} attrs
 * @returns {void}
 */
function presetMarkup(element, attrs) {
	for (const [name, value] of Object.entries(attrs)) {
		element.attributes.set(name, String(value));
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
   3. DIE ZWÖLF MODULE
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

console.log('Die zwölf Module');

// Seit Ausbaustufe 3, D3b importieren credit.js UND machine-credit.js
// zusätzlich account-backend.js — ÜBER DAS PRÄFIX, nicht relativ (Korrektur
// vom 2026-09-10, zweiter Nachbesserungslauf: coin_pusher/store.js
// importiert account-backend.js zwangsläufig über dasselbe Präfix, ein
// abweichender relativer Import in credit.js/machine-credit.js erzeugte im
// Browser ein zweites, unabhängiges konto-Objekt unter einer zweiten
// Adresse — an der laufenden Seite gemessen). credit.js braucht deshalb
// jetzt ebenfalls einen Text-Patch, den es vor D3b nicht brauchte — CREDIT_URL
// zeigt ab hier auf die gepatchte Fassung.
const ACCOUNT_URL = new URL('account-backend.js', CASINO_JS).href;
const creditSourceForNode = await readFile(fileURLToPath(new URL('credit.js', CASINO_JS)), 'utf8');
const patchedCreditForNode = creditSourceForNode.replaceAll(
	"'@phomo17/casino-startpage/account-backend.js'", JSON.stringify(ACCOUNT_URL)
);
check(patchedCreditForNode !== creditSourceForNode, 'der Modulname account-backend.js in credit.js wurde für Node aufgelöst');
const CREDIT_URL = `data:text/javascript;base64,${Buffer.from(patchedCreditForNode, 'utf8').toString('base64')}`;
const PAYTABLE_URL = new URL('paytable.js', FRUIT_JS).href;
const NIXIE_URL = new URL('nixie.js', FRUIT_JS).href;
const COUNTER_URL = new URL('counter.js', FRUIT_JS).href;
const MESSAGE_URL = new URL('message.js', FRUIT_JS).href;
const PAYOUT_URL = new URL('payout.js', FRUIT_JS).href;
const COINSLOT_URL = new URL('coinslot.js', FRUIT_JS).href;
const PRESS_URL = new URL('press.js', FRUIT_JS).href;
const ANNOUNCE_URL = new URL('announce.js', FRUIT_JS).href;

const CREDIT_NAME = '@phomo17/casino-startpage/credit.js';
const ACCOUNT_NAME = '@phomo17/casino-startpage/account-backend.js';
const MACHINE_CREDIT_NAME = '@phomo17/casino-startpage/machine-credit.js';
const PAYTABLE_NAME = '@phomo17/fruit-risk/paytable.js';
const NIXIE_NAME = '@phomo17/fruit-risk/nixie.js';
const COUNTER_NAME = '@phomo17/fruit-risk/counter.js';
const PAYOUT_NAME = '@phomo17/fruit-risk/payout.js';
const COINSLOT_NAME = '@phomo17/fruit-risk/coinslot.js';
const PRESS_NAME = '@phomo17/fruit-risk/press.js';

const { credit } = await import(CREDIT_URL);
check(typeof credit?.canAfford === 'function', 'casino_startpage/credit.js über seine Datei-URL geladen');

const { STAKE, LAP, ROWS, REELS, SYMBOLS } = await import(PAYTABLE_URL);
check(typeof STAKE === 'number' && STAKE === 10, 'fruit_risk/paytable.js über seine Datei-URL geladen (STAKE)');

const { findNixieGroup } = await import(NIXIE_URL);
check(typeof findNixieGroup === 'function', 'fruit_risk/nixie.js über seine Datei-URL geladen');

const { NixieCounter } = await import(COUNTER_URL);
check(typeof NixieCounter === 'function',
	'fruit_risk/counter.js unverändert geladen – es hat keinen einzigen Import');

const { MessageBoard } = await import(MESSAGE_URL);
check(typeof MessageBoard === 'function', 'fruit_risk/message.js über seine Datei-URL geladen');

const { WinClaim } = await import(PAYOUT_URL);
check(typeof WinClaim === 'function', 'fruit_risk/payout.js über seine Datei-URL geladen');

const { CoinSlot } = await import(COINSLOT_URL);
check(typeof CoinSlot === 'function', 'fruit_risk/coinslot.js über seine Datei-URL geladen');

const { wirePressButton } = await import(PRESS_URL);
check(typeof wirePressButton === 'function', 'fruit_risk/press.js über seine Datei-URL geladen');

const { findRegion } = await import(ANNOUNCE_URL);
check(typeof findRegion === 'function', 'fruit_risk/announce.js über seine Datei-URL geladen');

const machineCreditUrl = await toModule(new URL('machine-credit.js', CASINO_JS),
	[[CREDIT_NAME, CREDIT_URL], [ACCOUNT_NAME, ACCOUNT_URL]], 'machine-credit.js');
const { openMachineCredit } = await import(machineCreditUrl);
check(typeof openMachineCredit === 'function', 'casino_startpage/machine-credit.js geladen (openMachineCredit)');

const walletUrl = await toModule(new URL('wallet.js', FRUIT_JS), [
	[MACHINE_CREDIT_NAME, machineCreditUrl],
	[PAYTABLE_NAME, PAYTABLE_URL],
	[NIXIE_NAME, NIXIE_URL],
	[COUNTER_NAME, COUNTER_URL],
	[PAYOUT_NAME, PAYOUT_URL],
	[COINSLOT_NAME, COINSLOT_URL],
	[PRESS_NAME, PRESS_URL],
], 'wallet.js');
const { Wallet } = await import(walletUrl);
check(typeof Wallet === 'function', 'fruit_risk/wallet.js geladen');

const bankUrl = await toModule(new URL('bank.js', FRUIT_JS),
	[[CREDIT_NAME, CREDIT_URL]], 'bank.js');
const { Bank } = await import(bankUrl);
check(typeof Bank === 'function', 'fruit_risk/bank.js geladen');

/*
 * DER SPIELKERN SELBST — machine.js, reel.js, grid-announce.js, rng.js
 * (Behebungslauf REVIEW-fruitrisk-f4.md [H1]-[H3]).
 *
 * Bis zu diesem Behebungslauf lud dieser Prüfstand machine.js überhaupt
 * nicht — Block R spielte über einen von Hand geschriebenen Treiber
 * (fireRound(), weiter unten), der fr:round/fr:result selbst auslöste, genau
 * wie es machine.js täte. README.md behauptete trotzdem, Block V und R
 * prüften machine.js „zur Laufzeit" — das war unzutreffend (siehe [H1]) und
 * ist mit diesem Lauf eingelöst: Block M (Abschnitt 8a) fährt jetzt den
 * ECHTEN machine.js, mit derselben virtuellen Uhr wie der Rest dieser Datei.
 *
 * rng.js hat keinen Import und wird unverändert geladen — Node bringt seit
 * Version 19 ein echtes globalThis.crypto mit (WebCrypto), drawIndex()
 * braucht deshalb keinen Ersatz.
 *
 * reel.js und grid-announce.js importieren seit dem [M7]-Teil dieses
 * Behebungslaufs LAP/ROWS bzw. SYMBOLS/ROWS/REELS aus paytable.js und werden
 * deshalb wie wallet.js/bank.js als Text-mit-ersetzten-Importen geladen.
 */
const RNG_URL = new URL('rng.js', FRUIT_JS).href;
const RNG_NAME = '@phomo17/fruit-risk/rng.js';
const REEL_NAME = '@phomo17/fruit-risk/reel.js';
const GRID_ANNOUNCE_NAME = '@phomo17/fruit-risk/grid-announce.js';

await import(RNG_URL);
check(true, 'fruit_risk/rng.js über seine Datei-URL geladen');

const reelUrl = await toModule(new URL('reel.js', FRUIT_JS),
	[[PAYTABLE_NAME, PAYTABLE_URL]], 'reel.js');
const { Reel } = await import(reelUrl);
check(typeof Reel === 'function', 'fruit_risk/reel.js geladen (LAP/ROWS aus paytable.js aufgelöst)');

const gridAnnounceUrl = await toModule(new URL('grid-announce.js', FRUIT_JS),
	[[PAYTABLE_NAME, PAYTABLE_URL]], 'grid-announce.js');
const { GridAnnouncer } = await import(gridAnnounceUrl);
check(typeof GridAnnouncer === 'function',
	'fruit_risk/grid-announce.js geladen (SYMBOLS/ROWS/REELS aus paytable.js aufgelöst)');

const machineUrl = await toModule(new URL('machine.js', FRUIT_JS), [
	[RNG_NAME, RNG_URL],
	[PAYTABLE_NAME, PAYTABLE_URL],
	[REEL_NAME, reelUrl],
	[NIXIE_NAME, NIXIE_URL],
	[COUNTER_NAME, COUNTER_URL],
	[GRID_ANNOUNCE_NAME, gridAnnounceUrl],
	[PRESS_NAME, PRESS_URL],
], 'machine.js');
const { Machine } = await import(machineUrl);
check(typeof Machine === 'function',
	'fruit_risk/machine.js geladen — DER ECHTE SPIELKERN, seit diesem Behebungslauf kein Nachbau mehr ([H1]-[H3])');

/*
 * DIE DREI RISIKOSPIELE (Phase F5b) — risk-timing.js, risk-ladder-multi.js
 * und risk.js.
 *
 * risk-timing.js hat KEINEN Import und wird wie bisher unmittelbar über
 * seine Datei-Adresse geladen. risk-ladder-multi.js importiert es über die
 * Import-Map ('@phomo17/casino-startpage/risk-timing.js') und wird deshalb
 * — wie machine-credit.js, wallet.js, bank.js, reel.js und
 * grid-announce.js — ALS TEXT gelesen, mit der vollständigen Datei-Adresse
 * ersetzt und als data:-Modul geladen. risk.js importiert BEIDE
 * Site-Package-Module sowie drei geräteeigene (rng.js, nixie.js, press.js,
 * bereits oben geladen) und wird nach demselben Verfahren behandelt.
 *
 * NACHGETRAGEN (Umsetzungsstück D3c, PLAN-d3-guthaben.md): risk-ladder-multi.js
 * importiert seit D3c zusätzlich account-backend.js — PRÄFIX, nicht relativ
 * (Begründung im Kopf von risk-ladder.js: dieses Skript lädt als data:-Modul,
 * ein relativer Import scheitert von dort aus). Derselbe ACCOUNT_URL, der
 * oben schon für machine-credit.js aufgelöst wird.
 */
const RISK_TIMING_URL = new URL('risk-timing.js', CASINO_JS).href;
const RISK_TIMING_NAME = '@phomo17/casino-startpage/risk-timing.js';
const RISK_LADDER_MULTI_NAME = '@phomo17/casino-startpage/risk-ladder-multi.js';
const RISK_LADDER_MULTI_ACCOUNT_NAME = '@phomo17/casino-startpage/account-backend.js';
const RISK_NAME = '@phomo17/fruit-risk/risk.js';

const { stepTiming, cycleMs, CURVE_FLAT: RISK_CURVE_FLAT, CURVE_STEEP: RISK_CURVE_STEEP } = await import(RISK_TIMING_URL);
check(typeof stepTiming === 'function' && typeof cycleMs === 'function',
	'casino_startpage/risk-timing.js über seine Datei-URL geladen (stepTiming, cycleMs)');

const riskLadderMultiUrl = await toModule(new URL('risk-ladder-multi.js', CASINO_JS),
	[[RISK_TIMING_NAME, RISK_TIMING_URL], [RISK_LADDER_MULTI_ACCOUNT_NAME, ACCOUNT_URL]], 'risk-ladder-multi.js');
const { MultiRiskLadder } = await import(riskLadderMultiUrl);
check(typeof MultiRiskLadder === 'function',
	'casino_startpage/risk-ladder-multi.js geladen (risk-timing.js aufgelöst) — DIE ECHTE MEHRTASTEN-LEITER');

const riskUrl = await toModule(new URL('risk.js', FRUIT_JS), [
	[RNG_NAME, RNG_URL],
	[NIXIE_NAME, NIXIE_URL],
	[COUNTER_NAME, COUNTER_URL],
	[PRESS_NAME, PRESS_URL],
	[RISK_LADDER_MULTI_NAME, riskLadderMultiUrl],
	[RISK_TIMING_NAME, RISK_TIMING_URL],
], 'risk.js');
const { RiskPanel, GROUPS } = await import(riskUrl);
check(typeof RiskPanel === 'function' && Array.isArray(GROUPS) && GROUPS.length === 3,
	'fruit_risk/risk.js geladen — DIE ECHTEN DREI RISIKOSPIELE, seit dieser Phase kein Nachbau mehr');

/*
 * DER AUTO-MODUS (Phase F5c) — auto.js.
 *
 * Hat genau EINEN Import (press.js, bereits oben geladen) und wird deshalb
 * wie wallet.js/bank.js/risk.js ALS TEXT gelesen, mit der vollständigen
 * Datei-Adresse ersetzt und als data:-Modul geladen.
 */
const autoUrl = await toModule(new URL('auto.js', FRUIT_JS), [
	[PRESS_NAME, PRESS_URL],
], 'auto.js');
const { AutoPlay } = await import(autoUrl);
check(typeof AutoPlay === 'function',
	'fruit_risk/auto.js geladen — DER ECHTE AUTO-MODUS, seit dieser Phase kein Nachbau mehr');

/* ==========================================================================
   4. DAS GEHÄUSE
   ========================================================================== */

const document = new StubDocument();

/**
 * Baut ein .fr-machine mit genau den Elementen, die wallet.js, bank.js,
 * coinslot.js und message.js unter den Selektoren suchen, unter denen sie
 * sie suchen — nicht mehr, nicht weniger, als Block S und K brauchen.
 * machine.js (Phase F4d) wird diesen Aufbau um Walzen und Risiko-Tasten
 * erweitern.
 *
 * @returns {object}
 */
function buildCabinet() {
	const root = document.append(new StubElement(document, ['.fr-machine']));
	const cabinet = root.append(new StubElement(document, ['.fr-cabinet']));

	const message = cabinet.append(new StubElement(document, ['.fr-message'], {
		frTextInsufficient: 'GUTHABEN ZU GERING',
		frTextInvalid: 'BETRAG UNGÜLTIG',
		frTextCapped: 'KONTO VOLL',
		frTextVoid: 'RUNDE UNGÜLTIG',
		frTextNocash: 'KASSE ZU GERING',
		frTextNorng: 'AUSSER BETRIEB',
	}));
	presetMarkup(message, { 'aria-hidden': 'true' });

	/** @param {string} name @param {number} length @returns {StubElement} */
	function nixieGroup(name, length) {
		const element = cabinet.append(new StubElement(document,
			['.fr-nixie-group', `.fr-nixie-group[data-fr-display="${name}"]`], { frDisplay: name }));
		for (let i = 0; i < length; i++) {
			element.append(new StubElement(document, ['.fr-nixie']));
		}
		return element;
	}
	nixieGroup('guthaben', 7);
	nixieGroup('einsatz', 2);
	nixieGroup('stufe', 2);
	nixieGroup('gewinn', 7);

	const start = cabinet.append(new StubElement(document, ['.fr-btn[data-fr-button="start"]']));
	presetMarkup(start, { 'data-fr-button': 'start' });

	const reward = cabinet.append(new StubElement(document, ['.fr-btn[data-fr-button="reward"]']));
	presetMarkup(reward, { 'data-fr-button': 'reward' });

	/*
	 * AUTO MODE (Phase F5c). aria-pressed="false" ist die REALE Vorbelegung,
	 * die Machine/Button.html ausliefert, seit der f:render-Aufruf toggle: 1
	 * statt disabled: 1 trägt (siehe Cabinet.html, STAND F5c) —
	 * aria-disabled="false" bleibt daneben stehen (Notfall-Argument, siehe
	 * Button.html, Dateikopf), auto.js rührt es nicht an.
	 */
	const auto = cabinet.append(new StubElement(document, ['.fr-btn[data-fr-button="auto"]']));
	presetMarkup(auto, { 'data-fr-button': 'auto', 'aria-pressed': 'false', 'aria-disabled': 'false' });

	/*
	 * Die acht Risiko-Tasten (Phase F5b). aria-disabled="false" ist HIER
	 * bewusst als Ausgangslage GESETZT — seit dem Behebungslauf 2026-09-05
	 * (N-05, siehe Cabinet.html) reicht Machine/Button.html für diese acht
	 * Tasten wieder disabled: 1 durch und liefert damit schon
	 * aria-disabled="true" aus. Der Stub hier bleibt trotzdem bei "false":
	 * er prüft nicht mehr die reale Vorbelegung, sondern dass risk.js in
	 * seinem Konstruktor UNBEDINGT auf "true" schreibt, unabhängig vom
	 * Ausgangswert — ein ECHTER Schreibvorgang, den checkWritten() unten
	 * nachweist.
	 */
	const riskButtonKeys = [
		'risk-left', 'risk-right', 'risk4-left', 'risk4-right',
		'risk8-left', 'risk8-right', 'risk8-up', 'risk8-down',
	];
	const riskButtons = {};
	for (const key of riskButtonKeys) {
		const button = cabinet.append(new StubElement(document, [`.fr-btn[data-fr-button="${key}"]`]));
		presetMarkup(button, { 'data-fr-button': key, 'aria-disabled': 'false' });
		riskButtons[key] = button;
	}

	/*
	 * Die drei STARTTASTEN. Getrennt von riskButtons gehalten, weil sie KEINE
	 * Seite einer Leiter sind: L-5 zählt über riskButtons, wie viele Tasten
	 * gleichzeitig leuchten, und eine Starttaste (die nie leuchtet) gehört dort
	 * nicht hinein. aria-disabled="false" als Ausgangslage, aus demselben Grund
	 * wie oben bei den acht: geprüft wird damit ein ECHTER Schreibvorgang von
	 * risk.js, nicht die Vorbelegung des Markups.
	 */
	const riskStartButtons = {};
	for (const key of ['risk-start', 'risk4-start', 'risk8-start']) {
		const button = cabinet.append(new StubElement(document, [`.fr-btn[data-fr-button="${key}"]`]));
		presetMarkup(button, { 'data-fr-button': key, 'aria-disabled': 'false' });
		riskStartButtons[key] = button;
	}

	const coinForm = cabinet.append(new StubElement(document, ['[data-fr-coinslot]']));
	for (const amount of [10, 100, 500]) {
		coinForm.append(new StubElement(document, ['[data-fr-coin-add]'], { frCoinAdd: String(amount) }));
	}
	const coinInsert = coinForm.append(new StubElement(document, ['[data-fr-coin-insert]']));
	const coinInput = coinForm.append(new StubElement(document, ['[data-fr-coin-input]']));
	const coin = coinForm.append(new StubElement(document, ['[data-fr-coin]']));
	void coinInsert;
	void coin;

	const bankDisplay = cabinet.append(new StubElement(document, ['[data-fr-bank-display]']));
	void bankDisplay;

	// { frCashout: '' } bildet die bloße Kennung nach, die die Taste im
	// ausgelieferten HTML trägt (Cabinet.html: `data-fr-cashout`, ohne
	// Wert) — ohne diesen Seed sähe Block D (D-1) eine Doppelbelegung dieses
	// Namens nie, weil StubElement .dataset nicht automatisch aus
	// .attributes/.selectors ableitet (dieselbe Bauform wie das
	// [data-fr-sound]-Bedienteil in verify-sound.mjs).
	const cashout = cabinet.append(new StubElement(document, ['[data-fr-cashout]'], { frCashout: '' }));
	presetMarkup(cashout, { 'aria-disabled': 'true' });

	cabinet.append(new StubElement(document, ['[data-fr-announce="machine"]']));
	cabinet.append(new StubElement(document, ['[data-fr-announce="grid"]']));
	cabinet.append(new StubElement(document, ['[data-fr-announce="credit"]'], {
		frTextCredit: 'Kasse: {0}, Guthaben: {1}',
	}));
	cabinet.append(new StubElement(document, ['[data-fr-announce="risk"]'], {
		frTextOffer: 'Risikospiel möglich: RISK START, RISK x4 START oder RISK x8 START drücken.'
			+ ' Danach führen die Richtungstasten die Leiter. REWARD schreibt den Gewinn gut.',
		frTextWon: 'Risikospiel gewonnen: {0} Kredite auf Stufe {1}.',
		frTextLost: 'Risikospiel verloren auf Stufe {0}. Der Gewinn ist weg.',
	}));

	return {
		root, cabinet, message, coinForm, coinInput, cashout,
		startButton: start, rewardButton: reward, riskButtons, riskStartButtons, autoButton: auto,
	};
}

/**
 * @param {StubElement} target
 * @param {string} type
 * @param {*} detail
 * @param {object} [options]
 * @returns {boolean} true, wenn NICHT abgebrochen wurde
 */
function fire(target, type, detail, options = {}) {
	return target.dispatchEvent(new StubEvent(type, { detail, bubbles: true, ...options }));
}

/**
 * Feuert einen VOLLSTÄNDIGEN Zeigerklick — pointerdown → pointerup → click,
 * in der echten Browser-Reihenfolge. Ein einzelnes pointerdown modelliert
 * seit press.js drei Ereignisarten zusammenführt (Zeiger, Tastatur, direkt
 * synthetisierter click) keinen vollständigen Klick mehr: der click, den ein
 * echtes <button> nach pointerup ohnehin sendet, muss mitgeschickt werden,
 * sonst prüft der Prüfstand nur die Hälfte des Vertrags von
 * wirePressButton() (Behebungslauf REVIEW-fruitrisk-f5.md [H1b]).
 *
 * @param {StubElement} button
 * @param {object} [options] an pointerdown/pointerup durchgereichte Optionen
 *   (z. B. { button: 2 } für einen Rechtsklick)
 * @returns {void}
 */
function press(button, options = {}) {
	const pointerOptions = { isPrimary: true, button: 0, ...options };
	fire(button, 'pointerdown', null, pointerOptions);
	fire(button, 'pointerup', null, pointerOptions);
	fire(button, 'click', null, { detail: 1 });
}

/**
 * Baut ein spielbares Gehäuse samt Wallet und Bank — genau die Reihenfolge
 * aus fruit-risk.js, bindMachines(): erst die Tafel, dann die Verrechnung
 * (sie legt den Gerätekredit an), dann die Kassenanzeige.
 *
 * @returns {object}
 */
function buildMachine() {
	const parts = buildCabinet();
	const machineRegion = findRegion(parts.root, 'machine');
	const creditRegion = findRegion(parts.root, 'credit');
	const board = new MessageBoard(parts.message, machineRegion);
	const wallet = new Wallet(parts.root, board);
	const bank = new Bank(parts.root, wallet.machineCredit, board, creditRegion);
	return { ...parts, machineRegion, creditRegion, board, wallet, bank };
}

/**
 * Wie buildMachine(), zusätzlich mit dem ECHTEN RiskPanel — für Block L.
 * Kein echter machine.js (kein Walzenwerk), also weiterhin über fireRound()
 * bzw. ein von Hand ausgelöstes fr:round gespielt.
 *
 * @returns {object}
 */
function buildMachineWithRisk() {
	const parts = buildCabinet();
	const machineRegion = findRegion(parts.root, 'machine');
	const creditRegion = findRegion(parts.root, 'credit');
	const riskRegion = findRegion(parts.root, 'risk');
	const board = new MessageBoard(parts.message, machineRegion);
	const wallet = new Wallet(parts.root, board);
	const bank = new Bank(parts.root, wallet.machineCredit, board, creditRegion);
	const risk = new RiskPanel(parts.root, riskRegion);
	return { ...parts, machineRegion, creditRegion, riskRegion, board, wallet, bank, risk };
}

/**
 * Spielt eine Runde über einen von Hand geschriebenen Treiber, OHNE
 * machine.js zu bemühen — für Block K und Block R, die die VERRECHNUNG
 * prüfen (wallet.js, bank.js), nicht die Zustandsmaschine oder die Walzen.
 * wallet.js unterscheidet dabei nicht zwischen einem echten machine.js und
 * diesem Treiber: beide sprechen ausschließlich über fr:round/fr:result.
 *
 * WARUM DIESER TREIBER SEIT DIESEM BEHEBUNGSLAUF NICHT ÜBERFLÜSSIG IST
 * (REVIEW-fruitrisk-f4.md [H1]-[H3]): Block M (Abschnitt 8a) fährt jetzt
 * zusätzlich den ECHTEN machine.js und prüft damit die Zustandsmaschine,
 * die Walzenbewegung und den Ereignisvertrag an der Quelle. Dieser Treiber
 * bleibt daneben bestehen, weil er Block R erlaubt, 50 Züge in praktisch
 * null Zeit durchzuspielen (ohne die rund 3,7 s Walzenlauf je Runde
 * abzuwarten) — für eine Bilanzprüfung über viele Runden ist das die
 * richtige Abstraktionsebene: sie prüft, ob wallet.js/bank.js RICHTIG auf
 * die beiden Ereignisse reagieren, nicht, wer sie im Normalbetrieb sendet.
 * Dass im Normalbetrieb wirklich machine.js sendet, prüft ausschließlich
 * Block M.
 *
 * @param {object} machine aus buildMachine()
 * @param {number} win der Gewinn dieser Runde
 * @returns {boolean} true, wenn die Runde zustande kam
 */
function fireRound(machine, win) {
	const draw = [0, 0, 0, 0, 0, 0];
	const came = fire(machine.root, 'fr:round', { draw, stake: STAKE }, { cancelable: true });
	if (!came) {
		return false;
	}
	fire(machine.root, 'fr:result', {
		grid: null,
		lines: [],
		field: { amount: win, counts: {}, parts: {} },
		lineAmount: 0,
		fieldAmount: win,
		stake: STAKE,
		win,
	});
	return true;
}

/**
 * Ein Walzenband für den ECHTEN Reel-Konstruktor: data-fr-reel, eine
 * .fr-reel__strip mit data-fr-strip (LAP Symbolnamen) und 2 × LAP .fr-cell —
 * exakt der Vertrag, den reel.js in seinem Konstruktor prüft.
 *
 * @param {number} number 1 bis REELS
 * @returns {StubElement}
 */
function buildReelElement(number) {
	const reel = new StubElement(document, ['.fr-reel']);
	presetMarkup(reel, { 'data-fr-reel': String(number) });

	// Alle Zellen tragen dasselbe Symbol: das macht den Rundengewinn
	// UNABHAENGIG von der echten, zufaellig gezogenen Landeposition
	// berechenbar (alle 30 Linien zahlen den Hoechstwert fuer SYMBOLS[0]
	// ueber sechs Walzen), ohne die Ziehung selbst zu manipulieren —
	// drawIndex() bleibt der echte, kryptographische Zufall aus rng.js.
	const strip = Array.from({ length: LAP }, () => SYMBOLS[0]);
	const band = reel.append(new StubElement(document, ['.fr-reel__strip']));
	presetMarkup(band, { 'data-fr-strip': strip.join(',') });

	for (let i = 0; i < LAP * 2; i++) {
		reel.append(new StubElement(document, ['.fr-cell']));
	}
	return reel;
}

/**
 * Baut ein Gehäuse, das zusätzlich zu allem aus buildCabinet() den ECHTEN
 * Machine bedienen kann (Behebungslauf REVIEW-fruitrisk-f4.md [H2]): sechs
 * .fr-reel mit data-fr-strip, eine STOP-Taste und die 30 [data-fr-line] für
 * markHits(). buildCabinet() liefert bereits die STAND-Taste, die
 * Röhrengruppe „gewinn" und den Live-Bereich „grid", die Machine ebenfalls
 * braucht.
 *
 * @returns {object}
 */
function buildMachineCabinet() {
	const parts = buildCabinet();

	const stop = parts.cabinet.append(new StubElement(document, ['.fr-btn[data-fr-button="stop"]']));
	presetMarkup(stop, { 'data-fr-button': 'stop' });

	for (let i = 1; i <= REELS; i++) {
		parts.cabinet.append(buildReelElement(i));
	}

	for (let i = 1; i <= 30; i++) {
		parts.cabinet.append(new StubElement(document, [`[data-fr-line="${i}"]`]));
	}

	return { ...parts, stopButton: stop };
}

/**
 * Baut ein vollständig spielbares Gehäuse mit dem ECHTEN machine.js —
 * dieselbe Reihenfolge wie fruit-risk.js, bindMachines(): Tafel, Wallet
 * (legt den Gerätekredit an), Bank, zuletzt Machine.
 *
 * @returns {object}
 */
function buildFullMachine() {
	const parts = buildMachineCabinet();
	const machineRegion = findRegion(parts.root, 'machine');
	const gridRegion = findRegion(parts.root, 'grid');
	const creditRegion = findRegion(parts.root, 'credit');
	const board = new MessageBoard(parts.message, machineRegion);
	const wallet = new Wallet(parts.root, board);
	const bank = new Bank(parts.root, wallet.machineCredit, board, creditRegion);
	const machine = new Machine(parts.root, gridRegion);
	return { ...parts, machineRegion, gridRegion, creditRegion, board, wallet, bank, machine };
}

/**
 * Wie buildFullMachine(), zusätzlich mit dem ECHTEN RiskPanel — für L-8, das
 * die zeitlich geteilte Eigentümerschaft der GEWINN-Röhren gegen den ECHTEN
 * machine.js prüft.
 *
 * @returns {object}
 */
function buildFullMachineWithRisk() {
	const parts = buildMachineCabinet();
	const machineRegion = findRegion(parts.root, 'machine');
	const gridRegion = findRegion(parts.root, 'grid');
	const creditRegion = findRegion(parts.root, 'credit');
	const riskRegion = findRegion(parts.root, 'risk');
	const board = new MessageBoard(parts.message, machineRegion);
	const wallet = new Wallet(parts.root, board);
	const bank = new Bank(parts.root, wallet.machineCredit, board, creditRegion);
	const machine = new Machine(parts.root, gridRegion);
	const risk = new RiskPanel(parts.root, riskRegion);
	return { ...parts, machineRegion, gridRegion, creditRegion, riskRegion, board, wallet, bank, machine, risk };
}

/**
 * Wie buildFullMachineWithRisk(), zusätzlich mit dem ECHTEN AutoPlay — für
 * Block AU. AutoPlay sucht sein Bedienteil selbst (.fr-btn[data-fr-button=
 * "auto"]), das buildCabinet() bereits liefert (parts.autoButton).
 *
 * @returns {object}
 */
function buildFullMachineWithRiskAndAuto() {
	const parts = buildFullMachineWithRisk();
	const auto = new AutoPlay(parts.root);
	return { ...parts, auto };
}

/* ==========================================================================
   5. S — DIE SELBSTPRÜFUNG DES PRÜFSTANDS
   ========================================================================== */

console.log('\nS-1 — checkWritten() schlägt fehl, wenn niemand geschrieben hat');
{
	const probe = new StubElement(document, ['.probe']);
	// Die richtige Vorbelegung steht da — aber NIEMAND hat sie über
	// setAttribute() geschrieben. Das ist exakt die Stub-Falle aus dem
	// Dateikopf, hier absichtlich nachgestellt.
	presetMarkup(probe, { 'aria-disabled': 'true' });
	const caught = expectFailure(() => checkWritten(probe, 'attributes', 'aria-disabled', 'true',
		'Gegenprobe: dieser Fund darf NICHT bestehen'));
	check(caught, 'checkWritten() erkennt eine korrekte, aber nie geschriebene Vorbelegung als Fehler'
		+ ' – genau der Fehler, den die Stub-Falle im vorhandenen Fünf-Walzen-Gerät NICHT gemacht hat');
}

console.log('\nS-2 — checkWritten() schlägt fehl, wenn geschrieben, aber falsch geschrieben wurde');
{
	const probe = new StubElement(document, ['.probe']);
	probe.setAttribute('aria-disabled', 'false');
	const caught = expectFailure(() => checkWritten(probe, 'attributes', 'aria-disabled', 'true',
		'Gegenprobe: dieser falsche Wert darf NICHT bestehen'));
	check(caught, 'checkWritten() erkennt einen geschriebenen, aber falschen Wert als Fehler');
}

console.log('\nS-3 — das Schreibbuch zählt Attribut, Klasse, dataset und Custom Property getrennt');
{
	const probe = new StubElement(document, ['.probe'], { vorhanden: 'ja' });
	probe.setAttribute('data-x', '1');
	probe.setAttribute('data-x', '2');
	probe.classList.add('an');
	probe.dataset.zusatz = 'wert';
	probe.style.setProperty('--x', '3');

	check(probe.writes.attributes.get('data-x') === 2, `Attribut-Schreibvorgänge werden gezählt (${probe.writes.attributes.get('data-x')})`);
	check(probe.writes.classes.get('an') === 1, 'Klassen-Schreibvorgänge werden gezählt');
	check(probe.writes.dataset.get('zusatz') === 1, 'dataset-Schreibvorgänge werden gezählt');
	check(probe.writes.style.get('--x') === 1, 'Custom-Property-Schreibvorgänge werden gezählt');
	check(probe.writes.dataset.get('vorhanden') === undefined,
		'die Vorbelegung des dataset über den Konstruktor zählt NICHT als Schreibvorgang');
	check(probe.writes.attributes.get('data-nie-gesetzt') === undefined,
		'ungeschriebene Namen bleiben ungezählt');
}

console.log('\nS-4 — die virtuelle Uhr läuft erst, wenn man sie vorstellt');
{
	let fired = false;
	globalThis.setTimeout(() => {
		fired = true;
	}, 700);
	await advance(699);
	check(fired === false, 'ein setTimeout über 700 ms feuert noch NICHT nach 699 ms');
	await advance(1);
	check(fired === true, 'und feuert, sobald 700 ms erreicht sind');
}

/* ==========================================================================
   6. K — KASSE, EINWURF, VERRECHNUNG, DAS ANGEBOT
   ========================================================================== */

console.log('\nK-1 — Anfangszustand');

const m1 = buildMachine();
check(m1.root.dataset.frMachineCredit === '0', 'data-fr-machine-credit ist 0');
check(m1.root.dataset.frMirror === '', 'data-fr-mirror ist leer');
check(m1.root.dataset.frBank === String(credit.balance), 'data-fr-bank gleich dem Kassenstand');
check(m1.root.dataset.frTotal === String(credit.balance), 'data-fr-total === Kasse + 0');
check(m1.root.dataset.frCashoutOn === 'off', 'data-fr-cashout-on ist off');
// Behebungslauf REVIEW-fruitrisk-f4.md [M10]: eine Zeile „CASH OUT trägt
// aria-disabled" gehörte hier NICHT hin — presetMarkup() (siehe Dateikopf,
// „DIE STUB-FALLE") schreibt genau diesen Wert VOR jeder Prüfung, ohne das
// Schreibbuch zu berühren. Eine Prüfung, die ihn hier zurückliest, prüft die
// eigene Vorbelegung des Prüfstands, nicht bank.js. K-5 deckt denselben
// Wert bereits als ÜBERGANG ab (checkWritten(), verlangt mindestens einen
// echten Schreibvorgang) — das ist die einzige Fassung, die etwas beweist.
check(m1.message.textContent === '',
	'die Tafel ist leer – kein Gruß mit GUTHABEN ZU GERING, bevor jemand etwas getan hat');

console.log('\nK-2 — Einwurf über die Schnellwerte, die Bilanz ändert sich NICHT');

await credit.reload();
await credit.set(1000);
let coinEvent = null;
m1.root.addEventListener('fr:coin', (event) => {
	coinEvent = event.detail;
});
for (const amount of [10, 100, 500]) {
	const totalBefore = credit.balance + m1.wallet.machineCredit.amount;
	const button = m1.coinForm.querySelectorAll('[data-fr-coin-add]')
		.find((candidate) => candidate.dataset.frCoinAdd === String(amount));
	fire(button, 'click', null, { cancelable: false });
	await advance(500);
	check(coinEvent?.reason === 'ok' && coinEvent?.moved === amount,
		`+${amount} wirft genau ${amount} ein (reason ${coinEvent?.reason}, moved ${coinEvent?.moved})`);
	check(credit.balance + m1.wallet.machineCredit.amount === totalBefore,
		`Bilanz unverändert nach +${amount} – nur der Topf hat gewechselt`);
}

console.log('\nK-3 — Einwurf ist alles oder nichts');

await credit.set(40);
let totalBefore = credit.balance + m1.wallet.machineCredit.amount;
m1.coinInput.value = '100';
fire(m1.coinForm, 'submit', null, { cancelable: false });
await advance(500);
check(coinEvent?.reason === 'nocash' && coinEvent?.moved === 0,
	`bei Kasse 40 und Einwurf 100 bewegt sich nichts (reason ${coinEvent?.reason}, moved ${coinEvent?.moved})`);
check(credit.balance + m1.wallet.machineCredit.amount === totalBefore, 'die Bilanz bleibt unverändert');
check(m1.message.textContent === 'KASSE ZU GERING', 'die Tafel zeigt KASSE ZU GERING');

console.log('\nK-4 — ein ungültiger Betrag bewegt nichts');

/*
 * Behebungslauf REVIEW-fruitrisk-f4.md [L5]: der Fall „Betrag 0" prüft einen
 * Weg, den der Browser im Normalbetrieb nie geht — das Feld trägt min="1",
 * die Formularprüfung des Browsers blockt das Absenden schon vorher und
 * zeigt ihre eigene Sprechblase, submitCustomAmount() läuft dann gar nicht
 * erst. Diese Prüfung bleibt trotzdem bestehen, weil sie den EIGENEN
 * Programmcode absichert, falls die Formularprüfung je durchließe (etwa über
 * ein Formular ohne min-Attribut, oder falls submitCustomAmount() künftig
 * auch von anderswo gerufen wird) — sie behauptet dabei nicht mehr, als das.
 * '1e5' (Behebungslauf [M3]) prüft dagegen einen Weg, den der Browser
 * WIRKLICH zulässt: input[type="number"] mit step="1" akzeptiert die
 * Exponentialschreibweise als formal gültige, schrittgültige Zahl.
 */
await credit.set(1000);
totalBefore = credit.balance + m1.wallet.machineCredit.amount;
m1.coinInput.value = '0';
fire(m1.coinForm, 'submit', null, { cancelable: false });
await advance(500);
check(m1.message.textContent === 'BETRAG UNGÜLTIG',
	'der Betrag 0 wird abgefangen, falls die Formularprüfung des Browsers (min="1") ihn je durchließe');
check(credit.balance + m1.wallet.machineCredit.amount === totalBefore, 'die Bilanz bleibt unverändert');

m1.coinInput.value = 'abc';
fire(m1.coinForm, 'submit', null, { cancelable: false });
await advance(500);
check(m1.message.textContent === 'BETRAG UNGÜLTIG', 'ein nicht-numerischer Betrag zeigt ebenfalls BETRAG UNGÜLTIG');

// [M3]: '1e5' ist für den Browser eine gültige, schrittgültige Zahl (100000)
// — Number('1e5') muss das auch als 100000 lesen, nicht als 1
// (Number.parseInt('1e5', 10) bräche am 'e' ab und läse 1). Die Kasse braucht
// dafür Deckung. Ein Einwurf verschiebt nur zwischen den Töpfen — die SUMME
// bleibt gleich, nur der Gerätekredit allein wächst um den eingeworfenen
// Betrag (dieselbe Unterscheidung wie in K-2).
await credit.set(200000);
const machineCreditBeforeExp = m1.wallet.machineCredit.amount;
const totalBeforeExp = credit.balance + machineCreditBeforeExp;
m1.coinInput.value = '1e5';
fire(m1.coinForm, 'submit', null, { cancelable: false });
await advance(500);
check(m1.wallet.machineCredit.amount === machineCreditBeforeExp + 100000,
	`'1e5' wird als 100000 in den Gerätekredit eingeworfen, nicht als 1 (Gerätekredit vorher`
	+ ` ${machineCreditBeforeExp}, nachher ${m1.wallet.machineCredit.amount})`);
check(credit.balance + m1.wallet.machineCredit.amount === totalBeforeExp,
	"'1e5' verschiebt nur zwischen den Töpfen — die Bilanz bleibt unverändert");
check(m1.coinInput.value === '', "das Feld wird nach dem erfolgreichen Einwurf von '1e5' geleert");

console.log('\nK-5 — CASH OUT bucht vollständig zurück, aria-disabled macht seinen Übergang');

m1.coinInput.value = '300';
fire(m1.coinForm, 'submit', null, { cancelable: false });
await advance(300);
check(m1.cashout.getAttribute('aria-disabled') === null,
	'CASH OUT verliert aria-disabled, sobald etwas im Gerät liegt');

// Behebungslauf REVIEW-fruitrisk-f4.md [M13]: das Schreibbuch wird hier
// geleert, bevor CASH OUT gedrückt wird. Ohne das bestünde die
// checkWritten()-Prüfung weiter unten schon wegen des removeAttribute() von
// eben (dem Verlust von aria-disabled beim Einwurf) — ein sachlich
// unbeteiligter, früherer Schreibvorgang auf denselben Namen, nicht die
// Wirkung des CASH OUT-Drucks selbst.
m1.cashout.resetWrites();

const bankBefore = credit.balance;
const machineCreditBefore = m1.wallet.machineCredit.amount;
let cashoutEvent = null;
m1.root.addEventListener('fr:cashout', (event) => {
	cashoutEvent = event.detail;
});
fire(m1.cashout, 'click', null, { cancelable: false, detail: 1 });
await advance(300);
check(m1.wallet.machineCredit.amount === 0, 'nach dem Druck ist der Gerätekredit 0');
check(credit.balance === bankBefore + machineCreditBefore,
	`die Kasse ist um genau den Betrag höher, der im Gerät lag (${machineCreditBefore})`);
check(cashoutEvent?.moved === machineCreditBefore && cashoutEvent?.capped === false,
	'fr:cashout meldet moved und capped');
checkWritten(m1.cashout, 'attributes', 'aria-disabled', 'true',
	'CASH OUT trägt danach wieder aria-disabled – geschrieben von paint(), nicht von der Vorbelegung');

console.log('\nK-6 — CASH OUT reagiert auf JEDEN click, unabhängig von event.detail');

/*
 * Behebungslauf REVIEW-fruitrisk-f4.md [M11]: die frühere Fassung behauptete,
 * dies beweise eine Unterscheidung von Tastatur- und Zeigerweg — das macht
 * bank.js gar nicht. CASH OUT ist bewusst NICHT über wirePressButton()
 * verdrahtet (bank.js, Dateikopf, „DIE TASTE HÖRT AUF click UND NICHT AUF
 * pointerdown"): ein gewöhnlicher click-Zuhörer liest event.detail nie, ein
 * click mit detail 0 und einer mit detail 1 laufen durch EXAKT denselben
 * Code. Die einzige Aussage, die hier wirklich trägt: CASH OUT zahlt bei
 * JEDEM click aus, gleich welchen detail-Werts — das ist gewollt so, weil
 * CASH OUT keine Spielhandlung ist (siehe bank.js). Die echte
 * Unterscheidung von Zeiger und Tastatur (press.js/wirePressButton) prüft
 * seit diesem Behebungslauf Block M an den Tasten, die sie tatsächlich
 * machen — START und STOP (M-12).
 */
m1.coinInput.value = '50';
fire(m1.coinForm, 'submit', null, { cancelable: false });
await advance(300);
const beforeKeyboard = credit.balance;
fire(m1.cashout, 'click', null, { cancelable: false, detail: 0 });
await advance(300);
check(credit.balance === beforeKeyboard + 50 && m1.wallet.machineCredit.amount === 0,
	'ein click mit detail 0 zahlt aus — CASH OUT liest event.detail nirgends');

// m1 wird hier vollstaendig abgeraeumt: openMachineCredit() laesst je
// Schluessel und Seite genau EINEN Gerätekredit zu (B.5.2) – ein zweiter
// buildMachine()-Aufruf mit demselben Schluessel wuerfe sonst.
m1.bank.destroy();
m1.wallet.destroy();

console.log('\nK-7 — ein zweites Einlösen desselben Anspruchs bucht NICHTS');

const m2 = buildMachine();
await credit.set(1000);

const claimA = new WinClaim(m2.root, 40, m2.wallet.machineCredit);
const firstCollect = await claimA.collect();
check(firstCollect.ok === true, 'die erste Einlösung gelingt');
const beforeSecond = m2.wallet.machineCredit.amount;
const secondCollect = await claimA.collect();
check(secondCollect.ok === false && secondCollect.reason === 'settled',
	'ein zweites collect() liefert {ok: false, reason: "settled"}');
check(m2.wallet.machineCredit.amount === beforeSecond, 'und bucht nichts');

console.log('\nK-8 — discard() nach collect() liefert false und ändert nichts');

const claimB = new WinClaim(m2.root, 25, m2.wallet.machineCredit);
await claimB.collect();
const afterCollectB = m2.wallet.machineCredit.amount;
check(claimB.discard() === false, 'discard() nach einem bereits erfolgten collect() liefert false');
check(m2.wallet.machineCredit.amount === afterCollectB, 'und ändert den Gerätekredit nicht');

const claimC = new WinClaim(m2.root, 15, m2.wallet.machineCredit);
const beforeDiscardC = m2.wallet.machineCredit.amount;
check(claimC.discard() === true, 'discard() auf einem frischen Anspruch liefert true');
check(m2.wallet.machineCredit.amount === beforeDiscardC, 'discard() bucht selbst nichts');
check(claimC.discard() === false, 'ein zweites discard() liefert ebenfalls false');

// m2 abraeumen, aus demselben Grund wie oben bei m1.
m2.bank.destroy();
m2.wallet.destroy();

console.log('\nK-9 — Verlassen der Seite löst ein offenes Angebot ein und bucht vollständig zurück');

const m3 = buildMachine();
await credit.set(2000);
m3.coinInput.value = '200';
fire(m3.coinForm, 'submit', null, { cancelable: false });
await advance(300);

const came = fireRound(m3, 45);
await advance(50);
check(came, 'fr:round kommt zustande (Deckung vorhanden)');
check(m3.root.dataset.frOffer === 'open' && m3.root.dataset.frClaim === '45',
	'die Runde endet im Angebot, ohne dass REWARD oder START gedrückt wurde');

// Die "wahre" Bilanz schliesst den offenen Anspruch ein: die 45 Kredite
// sind erspielt, auch wenn sie noch nicht im Geraetekredit stehen (B.5.2,
// "es kann nichts liegenbleiben").
const totalBeforeLeave = credit.balance + m3.wallet.machineCredit.amount + (m3.wallet.openClaim?.amount ?? 0);
m3.bank.destroy();
m3.wallet.destroy();
await advance(200);
check(credit.balance === totalBeforeLeave,
	'die Abräumkette löst das offene Angebot EIN und bucht danach alles vollständig zurück,'
	+ ' inklusive des erspielten, aber noch nicht gebuchten Gewinns');
const mirrorKey = `casinoKunterbunt.machine.${m3.wallet.machineCredit.key}`;
check(cells.get(mirrorKey) === undefined, 'der Spiegel ist gelöscht');
const survivors = [...cells.keys()].filter((key) => key !== 'casinoKunterbunt.credits');
check(survivors.length === 0,
	`im Speicher liegt nur noch der Kassenschlüssel casinoKunterbunt.credits (Fund: ${survivors.join(', ') || 'keiner'})`);

console.log('\nK-10 — der Gewinn wird SYNCHRON gutgeschrieben');

const m4 = buildMachine();
await credit.set(500);
const claimD = new WinClaim(m4.root, 33, m4.wallet.machineCredit);
const beforeCollectD = m4.wallet.machineCredit.amount;
const pending = claimD.collect(); // absichtlich NICHT abgewartet
check(m4.wallet.machineCredit.amount === beforeCollectD + 33,
	'unmittelbar nach dem nicht abgewarteten collect() – vor dem await – steht der Betrag bereits'
	+ ' im Gerätekredit (das ist die Zusage, auf der onRound() beruht)');
const resolvedD = await pending;
check(resolvedD.ok === true, 'das Versprechen löst anschließend regulär auf');

// m4 abraeumen, aus demselben Grund wie oben bei m1/m2: openMachineCredit()
// laesst je Schluessel und Seite genau EINEN Geraetekredit zu (B.5.2), und
// Block R baut unten weitere Gehaeuse mit demselben Schluessel.
m4.bank.destroy();
m4.wallet.destroy();

/* ==========================================================================
   7. V — DER VERTRAG: README.md GEGEN DEN QUELLTEXT UND GEGEN DEN LAUF
   ========================================================================== */

/**
 * Liest die "Ereignisse"-Tabelle aus README.md.
 *
 * Gelesen werden nur Zeilen mit VIER Spalten (Ereignis, Absender,
 * abbrechbar, Felder) — die "Entgegengenommen wird"-Tabelle (fr:spin) hat
 * drei und wird dadurch von selbst ausgeschlossen; sie wird unten (V-4)
 * eigens geprüft.
 *
 * STAND F5b: die Absender-Spalte kann MEHRERE, durch " · " getrennte
 * Absender tragen (fr:offerend kommt seit dieser Phase aus wallet.js UND
 * risk.js). Die Spalte wird deshalb als roher Text erfasst, und die darin
 * enthaltenen "xxx.js"-Namen werden anschließend einzeln herausgelesen —
 * V-1 prüft danach JEDEN genannten Absender für sich.
 *
 * @param {string} markdown
 * @returns {Array<{event: string, senders: string[], cancelable: boolean, fields: string[]}>}
 */
function readEventRows(markdown) {
	const rows = [];
	const pattern = /^\|\s*`(fr:[a-z]+)`\s*\|([^|]*)\|\s*(ja|nein)\s*\|\s*(.*[^|\s])\s*\|\s*$/;
	for (const line of markdown.split('\n')) {
		const match = pattern.exec(line.trim());
		if (match === null) {
			continue;
		}
		const [, event, senderCell, cancelableText, fieldsCell] = match;
		const senders = [...senderCell.matchAll(/`([a-zA-Z0-9_.]+\.js)`/g)].map((m) => m[1]);
		const fields = [...fieldsCell.matchAll(/`([a-zA-Z]+)`/g)].map((m) => m[1]);
		rows.push({ event, senders, cancelable: cancelableText === 'ja', fields });
	}
	return rows;
}

/**
 * Liest die "Messpunkte"-Tabelle aus README.md.
 *
 * @param {string} markdown
 * @returns {Array<{attr: string, writer: string}>}
 */
function readMeasurePointRows(markdown) {
	const rows = [];
	const pattern = /^\|\s*`(data-fr-[a-z-]+)`\s*\|\s*`([a-zA-Z0-9_.]+\.js)`\s*\|/;
	for (const line of markdown.split('\n')) {
		const match = pattern.exec(line.trim());
		if (match === null) {
			continue;
		}
		const [, attr, writer] = match;
		rows.push({ attr, writer });
	}
	return rows;
}

/**
 * Übersetzt ein data-Attribut in den Namen, unter dem es im dataset steht:
 * data-fr-machine-credit → frMachineCredit.
 *
 * @param {string} attr
 * @returns {string}
 */
function datasetName(attr) {
	const parts = attr.replace(/^data-/, '').split('-');
	return parts[0] + parts.slice(1).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

console.log('\nV — der Ereignis- und Messpunktvertrag aus README.md');

const README_URL = new URL('../../../README.md', import.meta.url);
const readme = await readFile(fileURLToPath(README_URL), 'utf8');
const eventRows = readEventRows(readme);
const measurePointRows = readMeasurePointRows(readme);
check(eventRows.length === 15, `README.md: fünfzehn Ereignis-Zeilen gelesen (gefunden: ${eventRows.length})`);
check(measurePointRows.length === 25, `README.md: fünfundzwanzig Messpunkt-Zeilen gelesen (gefunden: ${measurePointRows.length})`);

/**
 * Entfernt Block- und Zeilenkommentare, bevor auf echten Code geprüft wird —
 * sonst zählte ein Kommentar wie „genau einen Aufruf von drawIndex()." als
 * zweiter Aufruf. Ein einfacher, textbasierter Filter (kein Parser); für die
 * Muster dieses Prüfstands reicht das, weil kein Quelltext dieser Extension
 * „//" oder „/*" innerhalb einer Zeichenkette trägt.
 *
 * @param {string} source
 * @returns {string}
 */
function stripComments(source) {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// Alle JavaScript-Quelldateien dieser Extension als TEXT — nicht ausgeführt,
// nur gelesen, und ohne Kommentare. Block V prüft Quelltext gegen
// Dokumentation, keine Semantik (Grenze, ehrlich benannt, wie in
// verify-cabinet.mjs A-19).
const jsDir = fileURLToPath(FRUIT_JS);
const jsFileNames = (await readdir(jsDir)).filter((name) => name.endsWith('.js'));
const jsSources = new Map();
/** Ungekürzte Quelltexte, für die Annahme-Sicherung [L7] weiter unten. */
const jsRawSources = new Map();
for (const name of jsFileNames) {
	const raw = await readFile(path.join(jsDir, name), 'utf8');
	jsRawSources.set(name, raw);
	jsSources.set(name, stripComments(raw));
}
check(jsSources.has('machine.js') && jsSources.has('fruit-risk.js'),
	`alle ${jsSources.size} JavaScript-Dateien dieser Extension als Text gelesen (machine.js und fruit-risk.js darunter)`);

/*
 * Behebungslauf REVIEW-fruitrisk-f4.md [L7]: stripComments() schneidet
 * absichtlich einfach an "//" und "/*" — das Kopfkommentar der Funktion
 * benennt die Annahme, die das trägt: „kein Quelltext dieser Extension
 * trägt '//' oder '/*' innerhalb einer Zeichenkette". Diese Prüfung sichert
 * GENAU diese Annahme, statt sie nur zu behaupten: eine URL wie
 * 'https://…' oder ein regulärer Ausdruck wie /\/\//' enthielte '://' bzw.
 * zwei aufeinanderfolgende Schrägstriche in einer Zeichenkette — beides
 * würde stripComments() an der falschen Stelle abschneiden. Kein
 * Quelltext dieser Extension trägt das heute; bricht das je, meldet Block V
 * es laut, statt still falsch zu filtern.
 */
console.log('\nV-0 — die Annahme hinter stripComments() gilt für den heutigen Quelltext (Absicherung [L7])');
for (const [name, raw] of jsRawSources) {
	check(!raw.includes('://'),
		`${name} enthält keine Zeichenfolge "://" (z. B. eine URL) — sonst würde stripComments() sie fälschlich`
		+ ' als Kommentarbeginn lesen');
}

/**
 * Sucht ALLE Sendeaufrufe eines Ereignisses (this.emit(...) oder
 * new CustomEvent(...)) im Quelltext und liefert je Fundstelle den Text davor
 * und danach, damit die Felder des detail-Objekts gefunden werden können —
 * gleich, ob es inline (coinslot.js, bank.js, counter.js) oder in einer vorher
 * gebauten Variablen (payout.js) steht.
 *
 * Behebungslauf REVIEW-fruitrisk-f5.md [L3]: vormals fand findEventCall()
 * (Einzahl) nur die ERSTE Fundstelle. risk.js sendet fr:risk an SECHS
 * Stellen (start/hit/miss/collect/end/offer) mit je verschiedenen Feldern —
 * ein Feld, das nur an einer SPÄTEREN Stelle steht (etwa `lost`, nur bei
 * `phase: 'miss'`), fiel dadurch nie auf. Jetzt werden ALLE Fundstellen
 * zurückgegeben; V-1 unten prüft jedes Feld gegen die VEREINIGUNG aller
 * Fundstellen (ein Feld gilt als belegt, sobald es an IRGENDEINER Stelle
 * steht — passend zu Feldern, die nur in einer bestimmten Phase auftreten).
 *
 * @param {string} source
 * @param {string} eventName
 * @returns {Array<{isEmit: boolean, before: string, after: string, call: string}>}
 */
function findEventCalls(source, eventName) {
	const pattern = new RegExp(String.raw`(?:\.emit|new\s+CustomEvent)\(\s*['"]${eventName}['"]`, 'g');
	const calls = [];
	for (const match of source.matchAll(pattern)) {
		const beforeStart = Math.max(0, match.index - 500);
		const afterEnd = Math.min(source.length, match.index + match[0].length + 900);
		calls.push({
			isEmit: match[0].includes('.emit'),
			before: source.slice(beforeStart, match.index),
			after: source.slice(match.index + match[0].length, afterEnd),
			// Die genau zusammengehoerenden Klammern DIESES Aufrufs — nicht ein
			// Zeichenfenster, das versehentlich in den naechsten emit()-Aufruf
			// hineinreicht (der wiederum eine eigene, andere Abbrechbarkeit
			// haben kann).
			call: extractBalancedParens(source, match.index + match[0].indexOf('(')),
		});
	}
	return calls;
}

/**
 * Liefert den Text von der öffnenden Klammer bei openIndex bis zu ihrer
 * eigenen schließenden Klammer — Klammern innerhalb (Object.freeze(),
 * Array.from() …) zählen mit, ohne die Grenze zu verschieben.
 *
 * @param {string} source
 * @param {number} openIndex Index von "(" in source
 * @returns {string}
 */
function extractBalancedParens(source, openIndex) {
	let depth = 0;
	for (let i = openIndex; i < source.length; i++) {
		if (source[i] === '(') {
			depth++;
		} else if (source[i] === ')') {
			depth--;
			if (depth === 0) {
				return source.slice(openIndex, i + 1);
			}
		}
	}
	return source.slice(openIndex);
}

/**
 * Ist der gefundene Sendeaufruf abbrechbar? emit() trägt die Abbrechbarkeit
 * als drittes Argument (endet auf ", true)"); CustomEvent trägt sie als
 * "cancelable: true" in seinen Optionen. Geprüft wird an call — den genau
 * eigenen Klammern dieses Aufrufs —, nicht an einem Zeichenfenster, damit
 * kein späterer, anders abbrechbarer Aufruf hineinspielt.
 *
 * @param {{isEmit: boolean, call: string}} call
 * @returns {boolean}
 */
function callIsCancelable(call) {
	return call.isEmit
		? /,\s*true\s*\)$/.test(call.call.trimEnd())
		: /cancelable\s*:\s*true/.test(call.call);
}

/**
 * Prüft, ob das detail eines Ereignisses vor dem Senden mit Object.freeze()
 * versiegelt wird (Behebungslauf REVIEW-fruitrisk-f4.md [M1]) — README.md
 * sagt das für ALLE Ereignisse dieses Geräts zu.
 *
 * Zwei Bauformen kommen im Quelltext vor:
 *  - INLINE am Sendeaufruf selbst oder in der unmittelbar davor gebauten
 *    Variablen (bank.js, coinslot.js, counter.js, payout.js) — dafür reicht
 *    ein Blick auf call.call bzw. das bereits vorhandene call.before-Fenster.
 *  - GEMEINSAM in einer emit()-Methode, die für ALLE Ereignisse der Datei
 *    gilt (machine.js, wallet.js). Der einzelne Sendeaufruf (this.emit('fr:x',
 *    …)) trägt dort selbst kein Object.freeze — das steht, oft weit entfernt
 *    im Quelltext, in der gemeinsamen Methode. Eine reine Fenstersuche am
 *    Aufruf fände das nicht; deshalb wird ersatzweise die emit()-Methode der
 *    Datei gesucht und IHR Rumpf geprüft.
 *
 * Eine reine Textprüfung, keine Ausführung — dieselbe Grenze wie der Rest von
 * Block V.
 *
 * @param {string} source
 * @param {{before: string, call: string}} call
 * @returns {boolean}
 */
function detailIsFrozen(source, call) {
	if (/Object\.freeze\(/.test(call.call) || /Object\.freeze\(/.test(call.before)) {
		return true;
	}
	// [\s\S]*? ist absichtlich NICHT gierig: das lässt das Muster an der
	// ERSTEN schließenden Klammer stehen, die bei der hier benutzten Bauform
	// ("new CustomEvent(name, { detail: Object.freeze(detail), … })") bereits
	// die des CustomEvent-Optionsobjekts ist — und genau die muss den Freeze-
	// Aufruf schon enthalten.
	const emitMethod = /\bemit\s*\([^)]*\)\s*\{[\s\S]*?\}/.exec(source);
	return emitMethod !== null && /Object\.freeze\(\s*detail\s*\)/.test(emitMethod[0]);
}

console.log('\nV-1 — jedes Ereignis der Tabelle wird in JEDEM genannten Absender, an JEDER Fundstelle, mit den'
	+ ' genannten Feldern gesendet');
for (const row of eventRows) {
	for (const sender of row.senders) {
		const source = jsSources.get(sender);
		if (source === undefined) {
			check(false, `V-1 ${row.event}: die Absenderdatei "${sender}" existiert nicht`);
			continue;
		}
		const calls = findEventCalls(source, row.event);
		if (calls.length === 0) {
			check(false, `V-1 ${row.event} wird in ${sender} nicht gesendet`);
			continue;
		}
		/*
		 * Behebungslauf REVIEW-fruitrisk-f5.md [L3]: vormals wurde nur die
		 * ERSTE Fundstelle geprüft. risk.js sendet fr:risk an sechs Stellen
		 * mit je verschiedenen Feldern (etwa `lost`, das nur bei
		 * `phase: 'miss'` steht) — ein an einer SPÄTEREN Stelle fehlendes
		 * oder abbrechbar gewordenes Feld wäre nie aufgefallen. Jetzt werden
		 * ALLE Fundstellen geprüft:
		 *  - FELDER gelten als belegt, sobald sie an IRGENDEINER Fundstelle
		 *    stehen (Vereinigung über alle Aufrufe) — passend zu Feldern,
		 *    die nur in einer bestimmten Phase auftreten.
		 *  - ABBRECHBARKEIT: steht "nein" in der README, darf KEINE
		 *    Fundstelle abbrechbar sein (eine einzelne abbrechbar gewordene
		 *    Stelle wäre eine echte Regression). Steht "ja", muss WENIGSTENS
		 *    eine Fundstelle abbrechbar sein — dass nicht jede Phase
		 *    desselben Ereignisses dieselbe Abbrechbarkeit braucht (fr:risk
		 *    ist nur im Angebot abbrechbar, nicht bei hit/miss/collect/
		 *    start/end), ist eine bewusste, im Auto-Modus-Veto begründete
		 *    Asymmetrie, keine Inkonsistenz.
		 */
		const missingFieldsUnion = new Set(row.fields);
		let anyCancelable = false;
		let allNonCancelable = true;
		calls.forEach((call, callIndex) => {
			const callHasAnyField = row.fields.some((field) => new RegExp(`\\b${field}\\s*[,:}]`).test(call.call));
			const searchScope = callHasAnyField ? call.call : (call.before + call.after);
			for (const field of row.fields) {
				if (new RegExp(`\\b${field}\\s*[,:}]`).test(searchScope)) {
					missingFieldsUnion.delete(field);
				}
			}
			const callCancelable = callIsCancelable(call);
			anyCancelable = anyCancelable || callCancelable;
			allNonCancelable = allNonCancelable && !callCancelable;
			check(detailIsFrozen(source, call),
				`V-1 ${row.event} (${sender}): das detail wird vor dem Senden mit Object.freeze() versiegelt`
				+ (calls.length > 1 ? ` (Fundstelle ${callIndex + 1} von ${calls.length})` : ''));
		});
		check(missingFieldsUnion.size === 0,
			`V-1 ${row.event} (${sender}) trägt über alle ${calls.length} Fundstelle${calls.length === 1 ? '' : 'n'}`
			+ ` hinweg alle Felder aus der README (${row.fields.join(', ')})`
			+ (missingFieldsUnion.size > 0 ? ` — fehlend: ${[...missingFieldsUnion].join(', ')}` : ''));
		const cancelableOk = row.cancelable ? anyCancelable : allNonCancelable;
		check(cancelableOk,
			`V-1 ${row.event} (${sender}): Abbrechbarkeit stimmt (README: ${row.cancelable ? 'ja' : 'nein'},`
			+ ` Quelltext: ${row.cancelable ? `wenigstens eine von ${calls.length} Fundstellen abbrechbar` : `keine der ${calls.length} Fundstellen abbrechbar`})`);
	}
}

console.log('\nV-2 — jedes gesendete fr:-Ereignis steht in der Tabelle (kein undokumentiertes Ereignis)');
{
	const emitted = new Set();
	for (const source of jsSources.values()) {
		for (const m of source.matchAll(/(?:\.emit|new\s+CustomEvent)\(\s*['"](fr:[a-z]+)['"]/g)) {
			emitted.add(m[1]);
		}
	}
	const documented = new Set(eventRows.map((row) => row.event));
	const undocumented = [...emitted].filter((event) => !documented.has(event));
	check(emitted.size > 0, `mindestens ein fr:-Ereignis im Quelltext gefunden (${[...emitted].sort().join(', ')})`);
	check(undocumented.length === 0,
		`kein gesendetes fr:-Ereignis ist undokumentiert (gefunden: ${undocumented.join(', ') || 'keins'})`);
}

console.log('\nV-3 — jeder Messpunkt hat GENAU EINEN Schreiber, kein data-fr-Attribut bleibt undokumentiert');
{
	/**
	 * Sammelt die dataset-Namen (fr…, camelCase), die ein Quelltext
	 * SCHREIBT — per Zuweisung (…frXxx = …) oder per delete
	 * (delete …frXxx). Ein reiner Lesezugriff (…frXxx ?? …) zählt nicht.
	 *
	 * @param {string} text
	 * @returns {Set<string>}
	 */
	function scanDatasetWrites(text) {
		const names = new Set();
		for (const m of text.matchAll(/\.(fr[A-Z][A-Za-z]*)\s*=(?!=)/g)) {
			names.add(m[1]);
		}
		for (const m of text.matchAll(/delete\s+[\w.]+\.(fr[A-Z][A-Za-z]*)\b/g)) {
			names.add(m[1]);
		}
		return names;
	}

	const nameToFiles = new Map();
	for (const [file, text] of jsSources) {
		for (const name of scanDatasetWrites(text)) {
			if (!nameToFiles.has(name)) {
				nameToFiles.set(name, new Set());
			}
			nameToFiles.get(name).add(file);
		}
	}

	for (const row of measurePointRows) {
		const name = datasetName(row.attr);
		const owners = nameToFiles.get(name) ?? new Set();
		check(owners.size === 1 && owners.has(row.writer),
			`V-3 ${row.attr} wird von genau ${row.writer} geschrieben`
			+ ` (gefunden: ${owners.size === 0 ? 'niemand' : [...owners].join(', ')})`);
	}

	const documentedNames = new Set(measurePointRows.map((row) => datasetName(row.attr)));
	const undocumentedNames = [...nameToFiles.keys()].filter((name) => !documentedNames.has(name));
	check(undocumentedNames.length === 0,
		`keine Datei schreibt ein undokumentiertes data-fr-Attribut (gefunden: ${undocumentedNames.join(', ') || 'keins'})`);
}

console.log('\nV-4 — fr:spin ist der einzige Weg von außen in eine Runde');
{
	const machineSource = jsSources.get('machine.js');
	const drawCalls = (machineSource.match(/\bdrawIndex\(/g) ?? []).length;
	check(drawCalls === 1, `machine.js ruft drawIndex() genau einmal auf (gefunden: ${drawCalls})`);

	const spinMatch = /addEventListener\(\s*'fr:spin'/.exec(machineSource);
	const spinListeners = (machineSource.match(/addEventListener\(\s*'fr:spin'/g) ?? []).length;
	check(spinListeners === 1, `machine.js meldet genau einen Zuhörer für fr:spin an (gefunden: ${spinListeners})`);

	// startRound() steht in wireSpinRequest() VOR der addEventListener-Zeile
	// (der Zuhörer wird erst nach seiner eigenen Definition angemeldet) —
	// deshalb wird in beide Richtungen gesucht, nicht nur vorwärts.
	const spinNeighbourhood = spinMatch === null
		? ''
		: machineSource.slice(Math.max(0, spinMatch.index - 300), spinMatch.index + 300);
	check(/startRound\(\)/.test(spinNeighbourhood),
		'der fr:spin-Zuhörer ruft startRound() — derselbe Weg wie beim Menschen');
}

console.log('\nV-5 — [M5] RISK8_POSITIONS (sound.js) und GROUPS[risk8].buttons (risk.js) nennen dieselbe Reihenfolge');
{
	/*
	 * [M5] (Behebungslauf REVIEW-fruitrisk-f5.md): sound.js führt mit
	 * RISK8_POSITIONS ausdrücklich eine ZWEITE, eigene Kopie der
	 * Tastenreihenfolge der x8-Leiter — bewusst, um risk.js nicht zu
	 * importieren (Kopplungsverbot, siehe sound.js Dateikopf). Zwei
	 * Wahrheiten über dieselbe Reihenfolge ohne Naht dazwischen sind aber
	 * genau das Muster, das A-27/M-7 aus dem F4-Review für Einsatz und
	 * Symbolliste bereits geschlossen haben — würde GROUPS[2].buttons je
	 * umsortiert, spielte "oben" still den Ton von "links". verify-sound.mjs
	 * lädt risk.js gar nicht; hier, in Block V, liegt bereits BEIDES als
	 * Text vor.
	 */
	const riskSource = jsSources.get('risk.js');
	const soundSource = jsSources.get('sound.js');

	const risk8Match = /id:\s*'risk8'[\s\S]{0,120}?buttons:\s*Object\.freeze\(\[([^\]]*)\]\)/.exec(riskSource);
	check(risk8Match !== null, 'GROUPS[risk8].buttons in risk.js gefunden und lesbar');
	const risk8ButtonNames = risk8Match === null
		? []
		: [...risk8Match[1].matchAll(/'risk8-([a-z]+)'/g)].map((m) => m[1]);
	check(risk8ButtonNames.length === 4,
		`vier Tastenschlüssel aus GROUPS[risk8].buttons gelesen, auf ihre Endung reduziert`
		+ ` (gefunden: ${risk8ButtonNames.join(', ')})`);

	const positionsMatch = /RISK8_POSITIONS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/.exec(soundSource);
	check(positionsMatch !== null, 'RISK8_POSITIONS in sound.js gefunden und lesbar');
	const positionNames = positionsMatch === null
		? []
		: [...positionsMatch[1].matchAll(/name:\s*'([a-z]+)'/g)].map((m) => m[1]);
	check(positionNames.length === 4,
		`vier Namen aus RISK8_POSITIONS gelesen (gefunden: ${positionNames.join(', ')})`);

	check(risk8ButtonNames.length === 4 && positionNames.length === 4
		&& risk8ButtonNames.every((name, index) => name === positionNames[index]),
		'RISK8_POSITIONS (sound.js) und GROUPS[risk8].buttons (risk.js) nennen Feld für Feld dieselbe Reihenfolge'
		+ ` (risk.js: ${risk8ButtonNames.join(', ')}; sound.js: ${positionNames.join(', ')})`);
}

/* ==========================================================================
   8. R — RUNDEN UND ANGEBOT MIT DEM VOLLSTÄNDIGEN TREIBER
   ========================================================================== */

/**
 * Die "wahre" Bilanz: Kasse + Gerätekredit + ein noch offener Anspruch. Nur
 * Einsatz und Gewinn dürfen sie ändern (README.md, „data-fr-total"); Einwurf,
 * Auszahlung und das Einlösen eines Anspruchs verschieben nur zwischen den
 * drei Töpfen.
 *
 * @param {object} machine aus buildMachine()
 * @returns {number}
 */
function trueTotal(machine) {
	return credit.balance + machine.wallet.machineCredit.amount + (machine.wallet.openClaim?.amount ?? 0);
}

console.log('\nR-1 — 50 Züge, nach jedem einzelnen Schritt stimmt die Bilanz exakt');

const m5 = buildMachine();
await credit.set(100000);

// Gespielt wird ausschließlich vom GERÄTEKREDIT (B.5.2), der bei jedem neuen
// Gehäuse bei 0 beginnt — ohne diesen Einwurf käme der allererste Zug schon
// mangels Deckung nicht zustande. Der Einwurf selbst ändert die Bilanz nicht
// (K-2); geprüft wird das hier nicht erneut.
await m5.wallet.machineCredit.insert(2000);
await advance(50);

let previousTotal = trueTotal(m5);

for (let round = 1; round <= 50; round++) {
	// Gelegentlich einwerfen oder auszahlen – beides darf die Bilanz nicht
	// ändern, nur den Topf wechseln.
	if (round % 7 === 3) {
		await m5.wallet.machineCredit.insert(50);
		await advance(50);
		const afterInsert = trueTotal(m5);
		check(afterInsert === previousTotal, `Zug ${round}: Einwurf +50 ändert die Bilanz NICHT`);
		previousTotal = afterInsert;
	}
	if (round % 11 === 5 && m5.wallet.machineCredit.amount > 0) {
		await m5.wallet.machineCredit.cashOut();
		await advance(50);
		const afterCashout = trueTotal(m5);
		check(afterCashout === previousTotal, `Zug ${round}: CASH OUT ändert die Bilanz NICHT`);
		previousTotal = afterCashout;

		// CASH OUT leert den Gerätekredit vollständig (B.5.2) — sofort neu
		// einwerfen, sonst käme der nächste Zug mangels Deckung nicht
		// zustande. Auch dieser Einwurf ändert die Bilanz NICHT.
		await m5.wallet.machineCredit.insert(500);
		await advance(50);
		const afterRefill = trueTotal(m5);
		check(afterRefill === previousTotal, `Zug ${round}: der erneute Einwurf nach CASH OUT ändert die Bilanz NICHT`);
		previousTotal = afterRefill;
	}

	const draw = [round % 20, (round * 3) % 20, (round * 7) % 20, (round * 11) % 20, (round * 13) % 20, (round * 17) % 20];
	const win = ((round * 29 + 11) % 60) + 1;

	const came = fire(m5.root, 'fr:round', { draw, stake: STAKE }, { cancelable: true });
	await advance(50);
	check(came, `Zug ${round}: fr:round kommt zustande (Deckung vorhanden)`);
	const afterStake = trueTotal(m5);
	check(afterStake === previousTotal - STAKE, `Zug ${round}: der Einsatz senkt die Bilanz um genau ${STAKE}`);
	previousTotal = afterStake;

	fire(m5.root, 'fr:result', {
		grid: null,
		lines: [],
		field: { amount: win, counts: {}, parts: {} },
		lineAmount: 0,
		fieldAmount: win,
		stake: STAKE,
		win,
	});
	await advance(50);
	const afterResult = trueTotal(m5);
	check(afterResult === previousTotal + win, `Zug ${round}: der Gewinn ${win} hebt die Bilanz um genau diesen Betrag`);
	previousTotal = afterResult;

	// Jede dritte Runde sofort per REWARD einlösen, sonst bleibt sie liegen
	// und wird von der nächsten Runde (START) miteröffnet.
	if (round % 3 === 0) {
		fire(m5.rewardButton, 'click', null, { cancelable: false, detail: 0 });
		await advance(50);
		const afterReward = trueTotal(m5);
		check(afterReward === previousTotal, `Zug ${round}: REWARD verschiebt den Anspruch nur, die Bilanz bleibt gleich`);
		previousTotal = afterReward;
	}
}

if (m5.wallet.openClaim !== null) {
	fire(m5.rewardButton, 'click', null, { cancelable: false, detail: 0 });
	await advance(50);
}
check(m5.root.dataset.frTotal === String(credit.balance + m5.wallet.machineCredit.amount),
	'nach 50 Zügen: data-fr-total stimmt mit Kasse + Gerätekredit überein (beide Schnittstellen)');

m5.bank.destroy();
m5.wallet.destroy();

console.log('\nR-2 — jede Runde endet im Angebot');

const m6 = buildMachine();
await credit.set(1000);
await m6.wallet.machineCredit.insert(100);
await advance(50);
const came2 = fireRound(m6, 37);
await advance(50);
check(came2, 'fr:round kommt zustande');
check(m6.root.dataset.frOffer === 'open' && m6.root.dataset.frClaim === '37',
	'nach fr:result steht data-fr-offer auf "open" und data-fr-claim auf dem Gewinn');
check(m6.rewardButton.classList.contains('fr-btn--lit'), 'REWARD leuchtet');

console.log('\nR-3 — REWARD schreibt gut und beendet das Angebot; ein zweiter Druck bucht nichts');

let collectEvent = null;
let offerendEvent = null;
m6.root.addEventListener('fr:collect', (event) => {
	collectEvent = event.detail;
});
m6.root.addEventListener('fr:offerend', (event) => {
	offerendEvent = event.detail;
});

const creditBeforeReward = m6.wallet.machineCredit.amount;
fire(m6.rewardButton, 'click', null, { cancelable: false, detail: 0 });
await advance(50);
check(collectEvent !== null && collectEvent.amount === 37, 'fr:collect kommt, mit dem Gewinn');
check(m6.root.dataset.frOffer === 'none' && m6.root.dataset.frClaim === '0',
	'danach data-fr-offer = "none" und data-fr-claim = 0');
check(offerendEvent?.reason === 'reward', 'fr:offerend trägt reason "reward"');
check(m6.wallet.machineCredit.amount === creditBeforeReward + 37, 'der Gewinn ist gebucht');
check(!m6.rewardButton.classList.contains('fr-btn--lit'), 'REWARD leuchtet nicht mehr');

collectEvent = null;
const creditAfterFirstReward = m6.wallet.machineCredit.amount;
fire(m6.rewardButton, 'click', null, { cancelable: false, detail: 0 });
await advance(50);
check(collectEvent === null, 'ein zweiter Druck auf REWARD sendet kein weiteres fr:collect');
check(m6.wallet.machineCredit.amount === creditAfterFirstReward, 'und bucht nichts');

m6.bank.destroy();
m6.wallet.destroy();

console.log('\nR-4 — START mit offenem Angebot schreibt zuerst gut und beginnt dann die nächste Runde');

const m7 = buildMachine();
await credit.set(1000);
await m7.wallet.machineCredit.insert(100);
await advance(50);
fireRound(m7, 22);
await advance(50);
check(m7.root.dataset.frOffer === 'open', 'das Angebot aus der ersten Runde steht offen');

let offerendEvent4 = null;
m7.root.addEventListener('fr:offerend', (event) => {
	offerendEvent4 = event.detail;
});
const creditBeforeStart = m7.wallet.machineCredit.amount;
const came4 = fire(m7.root, 'fr:round', { draw: [0, 0, 0, 0, 0, 0], stake: STAKE }, { cancelable: true });
await advance(50);
check(came4, 'die zweite Runde kommt zustande');
check(m7.wallet.machineCredit.amount === creditBeforeStart + 22 - STAKE,
	`der Gewinn ist gebucht (+22) und der Einsatz abgebucht (-${STAKE})`);
check(offerendEvent4?.reason === 'start', 'fr:offerend trägt reason "start"');
check(m7.root.dataset.frOffer === 'none', 'das alte Angebot ist danach erledigt');

m7.bank.destroy();
m7.wallet.destroy();

console.log('\nR-5 — Deckung: erst einlösen, dann prüfen');

const m8 = buildMachine();
await credit.set(1000);
const cameShort = fire(m8.root, 'fr:round', { draw: [0, 0, 0, 0, 0, 0], stake: STAKE }, { cancelable: true });
await advance(50);
check(!cameShort, 'ohne Deckung (Gerätekredit 0) wird fr:round abgebrochen');
check(m8.wallet.machineCredit.amount === 0, 'es wird NICHTS abgebucht');
check(m8.message.textContent === 'GUTHABEN ZU GERING', 'die Tafel zeigt GUTHABEN ZU GERING');

await m8.wallet.machineCredit.insert(13);
await advance(50);
fireRound(m8, 10);
await advance(50);
check(m8.wallet.machineCredit.amount === 3 && m8.root.dataset.frOffer === 'open' && m8.root.dataset.frClaim === '10',
	'Gerätekredit 3 (13 - Einsatz 10), ein offenes Angebot über 10 deckt den nächsten Einsatz');

const cameCovered = fire(m8.root, 'fr:round', { draw: [1, 1, 1, 1, 1, 1], stake: STAKE }, { cancelable: true });
await advance(50);
check(cameCovered, 'mit dem offenen Angebot (3 + 10 = 13 ≥ 10) kommt die Runde zustande');
check(m8.wallet.machineCredit.amount === 3,
	'erst eingelöst (+10 → 13), dann geprüft und abgebucht (-10 → 3) — die Reihenfolge stimmt');

m8.bank.destroy();
m8.wallet.destroy();

console.log('\nR-6 — ein Zuhörer, der fr:offer abbricht, bekommt den Anspruch');

const m9 = buildMachine();
await credit.set(1000);
await m9.wallet.machineCredit.insert(100);
await advance(50);

let capturedClaim = null;
m9.root.addEventListener('fr:offer', (event) => {
	event.preventDefault();
	capturedClaim = event.detail.claim;
});

fireRound(m9, 44);
await advance(50);
check(capturedClaim !== null && capturedClaim.amount === 44, 'der Zuhörer bekommt den Anspruch aus fr:offer');
check(m9.wallet.openClaim === null, 'wallet.js hält danach KEINEN Anspruch');
check(!m9.rewardButton.classList.contains('fr-btn--lit'), 'REWARD leuchtet nicht (der Anspruch gehört niemandem hier)');

const creditBeforeIgnoredReward = m9.wallet.machineCredit.amount;
fire(m9.rewardButton, 'click', null, { cancelable: false, detail: 0 });
await advance(50);
check(m9.wallet.machineCredit.amount === creditBeforeIgnoredReward,
	'REWARD bucht nichts, solange wallet.js keinen Anspruch hält');

const firstResult = await capturedClaim.collect();
check(firstResult.ok === true && m9.wallet.machineCredit.amount === creditBeforeIgnoredReward + 44,
	'der übernommene Anspruch lässt sich einlösen und schreibt demselben Gerätekredit gut');
const secondResult = await capturedClaim.collect();
check(secondResult.ok === false && secondResult.reason === 'settled',
	'ein zweites Einlösen desselben übernommenen Anspruchs bucht NICHTS');

m9.bank.destroy();
m9.wallet.destroy();

/* ==========================================================================
   9. M — DER ECHTE machine.js (Behebungslauf REVIEW-fruitrisk-f4.md [H1]-[H3])
   ========================================================================== */

/*
 * Bis zu diesem Behebungslauf hatte der Spielkern (machine.js, 544 Zeilen)
 * NULL ausgeführte Abdeckung — Block V prüfte ihn nur als TEXT, Block R fuhr
 * einen Handtreiber. README.md behauptete trotzdem, beide prüften ihn „zur
 * Laufzeit" ([H1]). Block M lädt ab jetzt den ECHTEN machine.js (samt dem
 * ECHTEN reel.js, grid-announce.js und rng.js — Abschnitt 3a weiter oben) und
 * spielt tatsächlich damit: eine Runde von startRound() bis fr:result über
 * die virtuelle Uhr (M-1 bis M-7), STOP von Hand mit Reihenfolgesicherung
 * (M-8/M-9), fr:spin als gleichwertiger Weg (M-10), und — als bewusst
 * UNVERÄNDERT belassenes Verhalten, siehe [H4] — der Abbruch einer laufenden
 * Runde beim Verlassen der Seite (M-11).
 *
 * Jede der sechs Walzen dieses Abschnitts trägt AUSSCHLIESSLICH SYMBOLS[0]
 * ("sieben") — nicht, um die Ziehung zu manipulieren (drawIndex() bleibt der
 * echte, kryptographische Zufall aus rng.js, unverändert), sondern damit
 * jede der 30 Linien unabhängig von der tatsächlich gezogenen, zufälligen
 * Landeposition denselben, vorher berechenbaren Höchstwert zahlt — mit
 * beliebigen Bandinhalten wäre der Rundengewinn (und damit jede Prüfung
 * gegen ihn) vom Zufall abhängig und ließe sich nicht deterministisch
 * nachrechnen.
 */

console.log('\nM-1 — Anfangszustand des ECHTEN machine.js');

const mm1 = buildFullMachine();
await credit.set(5000);
await mm1.wallet.machineCredit.insert(1000);
await advance(50);

check(mm1.machine.state === 'idle', 'M-1 der echte machine.js beginnt im Zustand idle');
check(mm1.root.dataset.frState === 'idle', 'M-1 data-fr-state (vom ECHTEN machine.js geschrieben) ist idle');

const creditBeforeRound = mm1.wallet.machineCredit.amount;

// Regression [M8], am Ausgangszustand: ein Rechtsklick (button 2) auf START
// darf KEINE Runde auslösen.
fire(mm1.startButton, 'pointerdown', null, { isPrimary: true, button: 2 });
check(mm1.machine.state === 'idle' && mm1.wallet.machineCredit.amount === creditBeforeRound,
	'M-1b (Regression [M8]) ein Rechtsklick auf START bucht nichts ab und startet keine Runde');

console.log('\nM-2 … M-7 — eine vollständige Runde des ECHTEN machine.js, über die virtuelle Uhr');

const stateSequence = [];
mm1.root.addEventListener('fr:state', (event) => { stateSequence.push(event.detail.to); });
const reelRestEvents = [];
mm1.root.addEventListener('fr:reelrest', (event) => { reelRestEvents.push(event.detail); });
let roundEvent = null;
mm1.root.addEventListener('fr:round', (event) => { roundEvent = event.detail; });
let resultEvent = null;
mm1.root.addEventListener('fr:result', (event) => { resultEvent = event.detail; });

// START über den ECHTEN Tastenweg (press.js, pointerdown) — kein direkter
// Methodenaufruf. Das prüft dieselbe Verdrahtung, die auch am Gehäuse läuft.
fire(mm1.startButton, 'pointerdown', null, { isPrimary: true, button: 0 });
await advance(50);

check(roundEvent !== null, 'M-2 fr:round wird vom ECHTEN machine.js gesendet, ausgelöst über die reale START-Taste');
check(Array.isArray(roundEvent?.draw) && roundEvent.draw.length === REELS
	&& roundEvent.draw.every((n) => Number.isInteger(n) && n >= 0 && n < LAP),
	`M-2 die ECHTE Ziehung (drawIndex(), crypto.getRandomValues) hat ${REELS} ganze Zahlen aus [0, ${LAP})`
	+ ` (gefunden: ${roundEvent?.draw?.join(',')})`);
check(roundEvent?.stake === STAKE, 'M-2 fr:round trägt den festen Einsatz');

check(mm1.wallet.machineCredit.amount === creditBeforeRound - STAKE,
	'M-3 der Einsatz ist sofort abgebucht (Gerätekredit − STAKE) — wallet.js reagiert auf das ECHTE fr:round');
check(mm1.machine.state === 'spinning' && mm1.root.dataset.frState === 'spinning',
	'M-3 der ECHTE machine.js steht nach START im Zustand spinning (state UND data-fr-state)');

const drawFromDataset = mm1.root.dataset.frRound.split('-').map(Number);
check(drawFromDataset.length === REELS && drawFromDataset.every((n, i) => n === roundEvent.draw[i]),
	'M-3 data-fr-round (Prüfsiegel) trägt exakt die ECHTE Ziehung aus fr:round — geschrieben VOR dem ersten'
	+ ' möglichen STOP');

// GEGENPROBE M-3 (Nachlauf-Auflage: „weise mindestens eine Gegenprobe nach"):
// derselbe Vergleich, aber mit einer absichtlich falschen Erwartung — er MUSS
// dann rot werden, sonst wäre der Vergleich selbst wertlos.
const gegenprobeM3 = expectFailure(() => {
	check(drawFromDataset[0] === (roundEvent.draw[0] + 1) % LAP,
		'GEGENPROBE (wird NICHT gezählt): absichtlich falsche Erwartung an data-fr-round');
});
check(gegenprobeM3,
	'GEGENPROBE M-3: der Vergleich von data-fr-round gegen die ECHTE Ziehung aus machine.js kann tatsächlich rot'
	+ ' werden, wenn er eine falsche Position erwartet');

// H2: „dass ein zweiter startRound() im Zustand spinning nichts abbucht".
const creditDuringSpin = mm1.wallet.machineCredit.amount;
fire(mm1.startButton, 'pointerdown', null, { isPrimary: true, button: 0 });
check(mm1.wallet.machineCredit.amount === creditDuringSpin,
	'M-4 ein zweiter START-Druck WÄHREND spinning bucht NICHT ein zweites Mal ab (canSpin/startRound() im ECHTEN'
	+ ' machine.js)');
check(mm1.machine.state === 'spinning', 'M-4 der Zustand bleibt spinning — kein zweiter Rundenstart');

// Regression [M8], während einer laufenden Runde: ein Rechtsklick auf STOP
// löst KEINEN Halt aus.
fire(mm1.stopButton, 'pointerdown', null, { isPrimary: true, button: 2 });
check(mm1.machine.state === 'spinning',
	'M-4b (Regression [M8]) ein Rechtsklick auf STOP während spinning löst NICHT aus');

// Die volle Zeit laufen lassen: der späteste Auto-Stopp liegt bei 3,7 s
// (AUTO_STOP_S[5]), dazu Bremse (2 × 9 Zellen ÷ Laufgeschwindigkeit, höchstens
// rund 0,5 s) und Nachfedern (0,13 s). 6 s virtuelle Zeit sind reichlich
// Reserve — echte Wartezeit entsteht dabei nicht, die Uhr ist virtuell.
await advance(6000);

check(reelRestEvents.length === REELS,
	`M-5 fr:reelrest kommt genau ${REELS} Mal — einmal je Walze, vom ECHTEN machine.js (gefunden:`
	+ ` ${reelRestEvents.length})`);

// GEGENPROBE M-5.
const gegenprobeM5 = expectFailure(() => {
	check(reelRestEvents.length === REELS + 1,
		'GEGENPROBE (wird NICHT gezählt): absichtlich falsche Erwartung an die Zahl der fr:reelrest');
});
check(gegenprobeM5,
	'GEGENPROBE M-5: die Zählung der ECHTEN fr:reelrest-Ereignisse aus machine.js kann tatsächlich rot werden');

for (const detail of reelRestEvents) {
	const drawnIndex = roundEvent.draw[detail.reel - 1];
	check(detail.cell % LAP === drawnIndex,
		`M-5 Walze ${detail.reel}: die ECHTE Ruhelage aus fr:reelrest (Zelle ${detail.cell}) landet auf der`
		+ ` gezogenen Position ${drawnIndex} (${detail.cell} mod ${LAP} = ${detail.cell % LAP})`);
}

check(stateSequence.indexOf('spinning') !== -1 && stateSequence.indexOf('stopping') !== -1
	&& stateSequence.indexOf('evaluating') !== -1 && stateSequence.indexOf('offer') !== -1
	&& stateSequence.indexOf('spinning') < stateSequence.indexOf('stopping')
	&& stateSequence.indexOf('stopping') < stateSequence.indexOf('evaluating')
	&& stateSequence.indexOf('evaluating') < stateSequence.indexOf('offer'),
	`M-6 data-fr-state durchläuft im ECHTEN machine.js die volle Zustandsfolge spinning → stopping → evaluating →`
	+ ` offer (gefunden: ${stateSequence.join(' → ')})`);

check(resultEvent !== null, 'M-7 fr:result wird vom ECHTEN machine.js gesendet, nach der vollständigen Runde');
check(resultEvent?.win === 3000 && resultEvent?.lineAmount === 3000 && resultEvent?.fieldAmount === 0
	&& resultEvent?.lines?.length === 30,
	`M-7 der Rundengewinn ist deterministisch nachgerechnet: 30 Linien × 100 (PAYTABLE.sieben[6], SYMBOLS[0]`
	+ ` über alle sechs Walzen) = 3000, keine Feldzählung (gefunden: win ${resultEvent?.win}, lineAmount`
	+ ` ${resultEvent?.lineAmount}, fieldAmount ${resultEvent?.fieldAmount}, Linien ${resultEvent?.lines?.length})`);
check(mm1.root.dataset.frWin === String(resultEvent.win), 'M-7 data-fr-win stimmt mit dem ECHTEN fr:result.win überein');
check(mm1.root.dataset.frOffer === 'open' && mm1.root.dataset.frClaim === String(resultEvent.win),
	'M-7 die Runde endet im Angebot; wallet.js hat den ECHTEN Gewinn aus machine.js übernommen');
check(mm1.machine.state === 'offer', 'M-7 der ECHTE machine.js steht danach im Zustand offer (Ruhezustand)');

mm1.machine.destroy();
mm1.bank.destroy();
mm1.wallet.destroy();

console.log('\nM-8 … M-9 — STOP von Hand: die Reihenfolgesicherung aus commandStop()/tickFrame() greift wirklich');

const mm2 = buildFullMachine();
await mm2.wallet.machineCredit.insert(1000);
await advance(50);

let resultEvent2 = null;
mm2.root.addEventListener('fr:result', (event) => { resultEvent2 = event.detail; });

fire(mm2.startButton, 'pointerdown', null, { isPrimary: true, button: 0 });
check(mm2.machine.state === 'spinning', 'M-8 die Runde startet');

// Sechsmal STOP drücken, mit kleinem Abstand — weit vor dem frühesten
// Auto-Stopp (1,2 s). stopNext()/commandStop() müssen dabei alle sechs
// Walzen erreichen, nicht immer dieselbe.
for (let i = 0; i < REELS; i++) {
	fire(mm2.stopButton, 'pointerdown', null, { isPrimary: true, button: 0 });
	await advance(20);
}

check(mm2.machine.reels.every((reel) => reel.stopRequested),
	'M-8 nach sechs STOP-Drücken trägt JEDE der sechs Walzen einen Haltebefehl');

await advance(6000);

check(resultEvent2 !== null, 'M-9 die Runde endet auch beim manuellen Stoppen im fr:result des ECHTEN machine.js');

const restTimes = mm2.machine.reels.map((reel) => reel.restTime);
const geordnet = restTimes.every((zeit, i) => i === 0 || zeit > restTimes[i - 1]);
check(geordnet,
	`M-9 die Reihenfolgesicherung hält ein: keine später gedrückte Walze kommt vor einer früher gedrückten zur`
	+ ` Ruhe (Ruhezeiten: ${restTimes.map((t) => t.toFixed(3)).join(', ')})`);

mm2.machine.destroy();
mm2.bank.destroy();
mm2.wallet.destroy();

console.log('\nM-10 — fr:spin nimmt denselben Weg wie eine gedrückte START-Taste');

const mm3 = buildFullMachine();
await mm3.wallet.machineCredit.insert(1000);
await advance(50);

const creditBeforeSpin = mm3.wallet.machineCredit.amount;
let roundEvent3 = null;
mm3.root.addEventListener('fr:round', (event) => { roundEvent3 = event.detail; });

fire(mm3.root, 'fr:spin', null, { cancelable: false });
await advance(50);

check(roundEvent3 !== null, 'M-10 fr:spin löst im ECHTEN machine.js fr:round aus');
check(mm3.wallet.machineCredit.amount === creditBeforeSpin - STAKE,
	'M-10 fr:spin bucht den Einsatz genauso ab wie ein Tastendruck — derselbe Weg, keine Umgehung der Abbuchung');
check(mm3.machine.state === 'spinning', 'M-10 fr:spin versetzt den ECHTEN machine.js in spinning');

await advance(6000);

mm3.machine.destroy();
mm3.bank.destroy();
mm3.wallet.destroy();

console.log('\nM-11 — [H4], bewusst UNVERÄNDERTES Verhalten: Verlassen der Seite WÄHREND einer laufenden Runde'
	+ ' vernichtet den Einsatz');
{
	// Entscheidung übernommen aus DECISIONS.md, 2026-09-03 15:27 CEST
	// (Ausbaustufe 2, Phase 10, reel_slot/video_slot) — siehe DECISIONS.md,
	// Eintrag zu diesem Behebungslauf, und README.md. Diese Prüfung ändert
	// NICHTS am Verhalten, sie weist nur nach, was DECISIONS.md für dieses
	// Gerät ausdrücklich festhält. Die GEGENRICHTUNG — ein bereits OFFENES
	// Angebot wird beim Verlassen EINGELÖST — ist bereits durch K-9 geprüft
	// (dort über den Treiber, weil das eine Frage an wallet.js ist, nicht an
	// die Bewegung der Walzen).
	const mm4 = buildFullMachine();
	await credit.set(3000);
	await mm4.wallet.machineCredit.insert(500);
	await advance(50);

	let sawResult = false;
	mm4.root.addEventListener('fr:result', () => { sawResult = true; });

	const totalBefore = trueTotal(mm4);
	fire(mm4.startButton, 'pointerdown', null, { isPrimary: true, button: 0 });
	await advance(50); // weit vor dem ersten Auto-Stopp (1,2 s)
	check(mm4.machine.state === 'spinning', 'M-11 die Runde läuft noch (weit vor jedem Auto-Stopp)');

	// GENAU DIE REIHENFOLGE AUS fruit-risk.js, teardown(): Spielkern zuerst,
	// dann Bank, zuletzt Wallet.
	mm4.machine.destroy();
	mm4.bank.destroy();
	mm4.wallet.destroy();
	await advance(200);

	check(!sawResult,
		'M-11 fr:result kommt NICHT — destroy() während spinning wertet die abgebrochene Runde nicht mehr aus');
	check(credit.balance === totalBefore - STAKE,
		`M-11 der Einsatz (${STAKE}) ist unwiderruflich weg: die Bilanz endet um genau ${STAKE} niedriger, kein`
		+ ' Gewinn wird nachträglich gutgeschrieben — bewusst so belassen (DECISIONS.md, README.md)');
}

console.log('\nM-12 — press.js: der Vertrag von wirePressButton() isoliert geprüft (Behebungslauf [M9]/[M11])');
{
	/*
	 * K-6 zeigte bislang nur, dass CASH OUT (ein GEWÖHNLICHER click-Zuhörer)
	 * bei jedem event.detail auslöst — das ist keine Aussage über
	 * wirePressButton() (bank.js benutzt es nicht, siehe K-6 oben). Dieser
	 * Block prüft press.js DIREKT und isoliert von jeder Spiellogik, damit
	 * eine eigene Idempotenz-Sperre in machine.js/wallet.js (canSpin,
	 * WinClaim.settled) das Ergebnis nicht verdecken kann.
	 */
	const probeButton = new StubElement(document, ['.probe-button']);
	let hits = 0;
	const dispose = wirePressButton(probeButton, 'pressed', () => { hits++; });

	// Realer Zeigerablauf — ECHTE Browser-Reihenfolge: pointerdown →
	// pointerup → click (NICHT pointerdown → click → pointerup, siehe
	// REVIEW-fruitrisk-f5.md [C1]/[H1a]). press() feuert genau diese
	// Reihenfolge. pointerdown löst aus; der click, den ein echtes <button>
	// nach pointerup ohnehin sendet, darf NICHT ein zweites Mal auslösen.
	press(probeButton);
	check(hits === 1,
		`M-12 pointerdown → pointerup → click (echte Reihenfolge): löst genau einmal aus, der click NICHT`
		+ ` ein zweites Mal (gezählt: ${hits})`);
	flushTimers();

	// Der Fall, gegen den der Merker überhaupt eingeführt wurde: der Zeiger
	// verlässt die Taste vor dem Loslassen (pointerleave statt pointerup).
	// Es kommt gar kein click. Danach muss der Merker so weit zurückgesetzt
	// sein, dass eine SPÄTERE, vollständige Bedienung wieder normal
	// funktioniert — er darf nicht hängen bleiben.
	hits = 0;
	fire(probeButton, 'pointerdown', null, { isPrimary: true, button: 0 });
	fire(probeButton, 'pointerleave', null, { isPrimary: true, button: 0 });
	check(hits === 1, `M-12 pointerdown → pointerleave (kein click folgt): löst nur einmal aus (gezählt: ${hits})`);
	press(probeButton);
	check(hits === 2,
		'M-12 nach pointerleave bleibt der Merker nicht hängen — eine spätere vollständige Bedienung löst weiterhin'
		+ ` genau einmal aus (gezählt: ${hits})`);
	flushTimers();

	// Tastaturablauf — keydown löst aus; press.js unterdrückt den
	// synthetischen click, den Enter/Leertaste an einem echten <button>
	// nativ auslösen würden, bereits per preventDefault() AUF DEM keydown
	// (siehe press.js, Dateikopf) — unabhängig davon, ob dieser click (wie
	// bei Enter) noch VOR keyup oder (wie bei der Leertaste) ERST BEI keyup
	// entstünde. Es kommt deshalb in Wirklichkeit NIE ein click nach
	// Enter/Leertaste an. Dieser Block prüft trotzdem defensiv beide
	// denkbaren Reihenfolgen — falls doch einmal ein click ankäme, darf er
	// so wenig wie das Zeiger-Gegenstück ein zweites Mal auslösen.
	hits = 0;
	fire(probeButton, 'keydown', null, { key: 'Enter' });
	fire(probeButton, 'click', null, { detail: 0 });
	fire(probeButton, 'keyup', null, { key: 'Enter' });
	check(hits === 1,
		`M-12 keydown → click → keyup (Enter-Reihenfolge, ein echtes <button> würde hier den click auslösen):`
		+ ` löst genau einmal aus (gezählt: ${hits})`);
	flushTimers();

	hits = 0;
	fire(probeButton, 'keydown', null, { key: ' ' });
	fire(probeButton, 'keyup', null, { key: ' ' });
	fire(probeButton, 'click', null, { detail: 0 });
	check(hits === 1,
		`M-12 keydown → keyup → click (Leertasten-Reihenfolge, ein echtes <button> würde hier den click auslösen):`
		+ ` löst genau einmal aus (gezählt: ${hits})`);
	flushTimers();

	// [M9]: ein click OHNE vorheriges pointerdown/keydown kommt von einem
	// Hilfsmittel, das click direkt synthetisiert (Spracheingabe, Switch
	// Access, …) — der muss auslösen, UNABHÄNGIG von event.detail. Die
	// frühere Fassung verließ sich hier auf detail === 0 und hätte einen
	// Bedienweg verschluckt, der ein anderes detail synthetisiert.
	hits = 0;
	fire(probeButton, 'click', null, { detail: 0 });
	check(hits === 1, 'M-12 [M9] ein click ohne vorheriges pointerdown/keydown löst aus (detail 0)');
	hits = 0;
	fire(probeButton, 'click', null, { detail: 7 });
	check(hits === 1,
		'M-12 [M9] …auch mit einem beliebigen anderen event.detail-Wert — die frühere, brüchige Unterscheidung'
		+ ' an event.detail entfällt bewusst');

	// GEGENPROBE M-12.
	const gegenprobeM12 = expectFailure(() => {
		check(hits === 999, 'GEGENPROBE (wird NICHT gezählt): absichtlich falsche Erwartung an den Zähler');
	});
	check(gegenprobeM12, 'GEGENPROBE M-12: der Zähler-Vergleich kann tatsächlich rot werden');

	// Regression [M8]: ein Rechtsklick (button 2) löst NICHT aus.
	hits = 0;
	fire(probeButton, 'pointerdown', null, { isPrimary: true, button: 2 });
	check(hits === 0, 'M-12 (Regression [M8]) ein Rechtsklick (button 2) löst NICHT aus');

	// Regression [L2]: ein keyup einer ANDEREN Taste (Tab) darf die gedrückte
	// Kappe und den Merker nicht anfassen — nur Enter/Leertaste dürfen das.
	fire(probeButton, 'keydown', null, { key: 'Enter' });
	check(probeButton.classList.contains('pressed'), 'M-12 (Regression [L2]) die Kappe ist nach keydown Enter gedrückt');
	fire(probeButton, 'keyup', null, { key: 'Tab' });
	check(probeButton.classList.contains('pressed'),
		'M-12 (Regression [L2]) ein keyup von Tab nimmt die gedrückte Kappe NICHT ab');
	fire(probeButton, 'keyup', null, { key: 'Enter' });
	check(!probeButton.classList.contains('pressed'),
		'M-12 (Regression [L2]) das echte keyup (Enter) nimmt die Kappe danach ab');
	flushTimers();

	dispose();
}

/* ==========================================================================
   9a. HELFER FÜR BLOCK L
   ========================================================================== */

/**
 * Ersetzt vorübergehend crypto.getRandomValues() durch eine FESTE Ziehung.
 *
 * Gebraucht wird das EINZIG für den ERSTEN Druck einer frischen Leiter,
 * dessen Ausgang sich sonst nicht vorhersagen ließe: Wahl und Wertung
 * geschehen dort im selben synchronen Block (risk.js, onPress()), bevor
 * irgendein data-Attribut verrät, welche Seite brennt.
 *
 * MATHEMATISCHER BEWEIS, WARUM group.buttons[1] IMMER TRIFFT: Fisher-Yates
 * mit einer Ziehung, die IMMER 0 liefert, tauscht in jedem Schritt order[i]
 * gegen order[0] (i von n-1 abwärts bis 1). order[0] wird dabei in JEDEM
 * Schritt neu belegt — außer im LETZTEN (i=1), wo der ORIGINALE Wert an
 * Position 1 nach Position 0 wandert. Für jede Seitenzahl n endet order[0]
 * deshalb IMMER bei 1 — unabhängig von n. Die erste brennende Seite jedes
 * Umlaufs ist damit unter dieser festen Ziehung IMMER group.buttons[1],
 * gleich ob Paar oder Kreuz, und (da beginLevel() die Reihenfolge bei JEDEM
 * neuen Umlauf frisch zieht, sobald order null ist) auch bei jedem weiteren
 * Umlauf, solange die virtuelle Uhr zwischen zwei Drücken NICHT vorgestellt
 * wird (advance() bleibt während des Kletterns aus).
 *
 * @param {number} raw der Rohwert, den JEDE Ziehung während fn() liefert
 * @param {() => void} fn
 * @returns {void}
 */
function withFixedDraw(raw, fn) {
	const previous = globalThis.crypto;
	defineGlobal('crypto', { getRandomValues: (buffer) => { buffer[0] = raw; return buffer; } });
	try {
		fn();
	} finally {
		defineGlobal('crypto', previous);
	}
}

/**
 * Startet die Leiter der Gruppe über ihre STARTTASTE, falls sie noch nicht
 * läuft, und klettert dann um COUNT Stufen über group.buttons[1] — unter
 * withFixedDraw(0, …) immer ein Treffer, siehe dort.
 *
 * WARUM SICH DADURCH KEINE EINZIGE BESTEHENDE ERWARTUNG VERSCHIEBT: vorher war
 * der erste Druck zugleich der erste Versuch, climb(n) drückte n-mal und
 * erreichte Stufe n+1 mit dem n-fach vervielfachten Gewinn. Jetzt drückt
 * climb(n) einmal START (Stufe 1, ohne Wertung) und n-mal eine Richtungstaste
 * (Stufe n+1, n-fach vervielfacht) — dieselbe Stufe, derselbe Betrag.
 *
 * Der Start wird nur gedrückt, wenn die Leiter dieser Gruppe noch nicht läuft
 * (L-3 klettert in mehreren Aufrufen weiter). Ein zweiter Druck wäre ohnehin
 * wirkungslos; die Abfrage macht die Absicht sichtbar.
 *
 * @param {object} machine aus buildMachineWithRisk()/buildFullMachineWithRisk()
 * @param {object} group ein Eintrag aus GROUPS
 * @param {number} count Anzahl der VERSUCHE (Richtungsdrücke)
 * @returns {void}
 */
function climb(machine, group, count) {
	withFixedDraw(0, () => {
		if (machine.root.dataset.frRiskLadder !== group.id) {
			press(machine.riskStartButtons[group.start]);
		}
		for (let i = 0; i < count; i++) {
			press(machine.riskButtons[group.buttons[1]]);
		}
	});
}

/**
 * Tastet über totalMs virtuelle Zeit in Schritten von stepMs ab, wie viele
 * der acht Risiko-Tasten in JEDEM Bild gleichzeitig .fr-btn--lit tragen —
 * für L-5, die Blitzsicherheit.
 *
 * @param {object} machine aus buildMachineWithRisk()
 * @param {number} totalMs
 * @param {number} stepMs
 * @returns {Promise<number[]>}
 */
async function sampleLit(machine, totalMs, stepMs) {
	const samples = [];
	const target = clock.ms + totalMs;
	while (clock.ms < target) {
		clock.ms = Math.min(target, clock.ms + stepMs);
		const due = [...frames.values()];
		frames.clear();
		for (const fn of due) {
			fn(clock.ms);
		}
		for (const [id, timer] of [...timers]) {
			if (timer.at <= clock.ms) {
				timers.delete(id);
				timer.fn();
			}
		}
		await Promise.resolve();
		samples.push(Object.values(machine.riskButtons).filter((b) => b.classList.contains('fr-btn--lit')).length);
	}
	return samples;
}

/* ==========================================================================
   9b. L — DIE DREI LEITERN (Phase F5b)
   ========================================================================== */

console.log('\nL-1 — das Angebot: NUR die drei Starttasten laden ein, die acht Richtungstasten bleiben'
	+ ' gesperrt, REWARD leuchtet, die Ansage steht');

const mL1 = buildMachineWithRisk();
await credit.set(1000);
await mL1.wallet.machineCredit.insert(100);
await advance(50);

const cameL1 = fireRound(mL1, 30);
await advance(50);
check(cameL1, 'L-1 fr:round kommt zustande');
check(mL1.wallet.openClaim === null, 'L-1 wallet.js hat den Anspruch NICHT behalten — risk.js hat ihn per preventDefault() übernommen');
for (const group of GROUPS) {
	checkWritten(mL1.riskStartButtons[group.start], 'classes', 'fr-btn--invite', true,
		`L-1 ${group.start} trägt .fr-btn--invite`);
	checkWritten(mL1.riskStartButtons[group.start], 'attributes', 'aria-disabled', 'false',
		`L-1 ${group.start} trägt aria-disabled="false"`);
}
for (const key of Object.keys(mL1.riskButtons)) {
	check(!mL1.riskButtons[key].classList.contains('fr-btn--invite'),
		`L-1 ${key} (Richtungstaste) lädt NICHT ein — vor dem Start kann sie nichts bewirken`);
	checkWritten(mL1.riskButtons[key], 'attributes', 'aria-disabled', 'true',
		`L-1 ${key} (Richtungstaste) bleibt aria-disabled="true" — geschrieben, nicht bloß vorbelegt`);
}
check(mL1.rewardButton.classList.contains('fr-btn--lit'), 'L-1 REWARD leuchtet');
check(mL1.root.dataset.frRiskPhase === 'offer', 'L-1 data-fr-risk-phase steht auf "offer"');
check(mL1.root.dataset.frRiskWin === '30', 'L-1 data-fr-risk-win zeigt den angebotenen Betrag');
check(mL1.riskRegion.element.textContent
	=== 'Risikospiel möglich: RISK START, RISK x4 START oder RISK x8 START drücken.'
		+ ' Danach führen die Richtungstasten die Leiter. REWARD schreibt den Gewinn gut.',
	'L-1 der Live-Bereich "risk" trägt genau einen Satz — die Einladung');

// [H2]: eine ZWEITE Runde mit demselben Gewinn (also wörtlich demselben
// Einladungssatz) muss den Live-Bereich "risk" ERNEUT erreichen. Vorher
// blieb er ab der zweiten Runde stumm, weil LiveRegion.say() nur gegen den
// AKTUELLEN Text vergleicht und C.14.7 in jeder Runde einen Gewinn
// garantiert — der Satz ist dadurch jede Runde identisch (Behebungslauf
// REVIEW-fruitrisk-f5.md [H2]).
press(mL1.rewardButton);
await advance(50);
check(mL1.riskRegion.element.textContent === '',
	'L-1 [H2] nach REWARD ist der Live-Bereich "risk" geleert — keine veraltete Einladung bleibt stehen');
const cameL1Second = fireRound(mL1, 30);
await advance(50);
check(cameL1Second, 'L-1 [H2] eine zweite Runde mit demselben Gewinn (30) kommt zustande');
// Die ERSTE Ansage eines Live-Bereichs geht immer sofort hinaus
// (this.announced war noch false); jede weitere läuft über die
// 700-ms-Entprellung (ANNOUNCE_MS, announce.js) — deshalb hier abwarten,
// statt sofort zu prüfen.
await advance(750);
check(mL1.riskRegion.element.textContent
	=== 'Risikospiel möglich: RISK START, RISK x4 START oder RISK x8 START drücken.'
		+ ' Danach führen die Richtungstasten die Leiter. REWARD schreibt den Gewinn gut.',
	'L-1 [H2] dieselbe Einladung kommt in der zweiten Runde ERNEUT an, obwohl der Satz wörtlich unverändert ist');

mL1.bank.destroy();
mL1.wallet.destroy();
mL1.risk.destroy();

console.log('\nL-2 — der erste RICHTUNGSDRUCK ist der erste Versuch: Treffer'
	+ ' erhöht die Stufe, Fehlgriff verwirft alles');

const mL2hit = buildMachineWithRisk();
await credit.set(1000);
await mL2hit.wallet.machineCredit.insert(100);
await advance(50);
fireRound(mL2hit, 20);
await advance(50);
let offerendHit = null;
mL2hit.root.addEventListener('fr:offerend', (event) => { offerendHit = event.detail; });
withFixedDraw(0, () => {
	press(mL2hit.riskStartButtons['risk-start']);
	press(mL2hit.riskButtons['risk-right']);
});
check(mL2hit.root.dataset.frRiskPhase === 'ladder', 'L-2 Treffer: die Leiter läuft (data-fr-risk-phase "ladder")');
check(mL2hit.root.dataset.frRiskLadder === 'risk', 'L-2 Treffer: data-fr-risk-ladder "risk"');
check(mL2hit.root.dataset.frRiskLevel === '2', 'L-2 Treffer: Stufe 2');
check(mL2hit.root.dataset.frRiskWin === '40', 'L-2 Treffer: der Gewinn ist verdoppelt (20 × 2 = 40)');
check(!mL2hit.riskButtons['risk-left'].classList.contains('fr-btn--invite')
	&& !mL2hit.riskButtons['risk-right'].classList.contains('fr-btn--invite'),
	'L-2 Treffer: das Einladungsblinken ist weg');
check(offerendHit === null, 'L-2 Treffer: noch kein fr:offerend — die Leiter läuft weiter');
mL2hit.bank.destroy();
mL2hit.wallet.destroy();
mL2hit.risk.destroy();

const mL2miss = buildMachineWithRisk();
await credit.set(1000);
await mL2miss.wallet.machineCredit.insert(100);
await advance(50);
fireRound(mL2miss, 20);
await advance(50);
let offerendMiss = null;
mL2miss.root.addEventListener('fr:offerend', (event) => { offerendMiss = event.detail; });
withFixedDraw(0, () => {
	press(mL2miss.riskStartButtons['risk-start']);
	// unter raw 0 brennt group.buttons[1] = 'risk-right' — 'risk-left' ist
	// also mit Sicherheit ein Fehlgriff.
	press(mL2miss.riskButtons['risk-left']);
});
check(mL2miss.root.dataset.frRiskPhase === 'off', 'L-2 Fehlgriff: zurück im Grundzustand');
check(mL2miss.root.dataset.frRiskWin === '0', 'L-2 Fehlgriff: der Gewinn ist 0');
check(offerendMiss?.reason === 'ladder-lost' && offerendMiss?.amount === 0,
	'L-2 Fehlgriff: fr:offerend trägt reason "ladder-lost", amount 0');
// 100 eingeworfen, 10 Einsatz für die Runde abgebucht (fireRound), der
// Gewinn (20) NIE gutgeschrieben, weil risk.js ihn hielt und beim Fehlgriff
// verworfen hat: 100 − 10 = 90.
check(mL2miss.wallet.machineCredit.amount === 90, 'L-2 Fehlgriff: der Gerätekredit bleibt unverändert (der Anspruch wurde NICHT eingelöst)');
mL2miss.bank.destroy();
mL2miss.wallet.destroy();
mL2miss.risk.destroy();

console.log('\nL-3 — jede Leiter folgt ihrer eigenen Kurve (data-fr-risk-side/-on/-pause/-cycle)');

const GROUP_TIMING = {
	risk: { sides: 2, curve: RISK_CURVE_FLAT, pause: false },
	risk4: { sides: 2, curve: RISK_CURVE_STEEP, pause: false },
	risk8: { sides: 4, curve: RISK_CURVE_STEEP, pause: true },
};
for (const [groupId, cfg] of Object.entries(GROUP_TIMING)) {
	const group = GROUPS.find((g) => g.id === groupId);
	const mL3 = buildMachineWithRisk();
	await credit.set(1000);
	await mL3.wallet.machineCredit.insert(100);
	await advance(50);
	fireRound(mL3, 20);
	await advance(50);

	/*
	 * STUFE 1 IST SEIT DER EINFÜHRUNG DER STARTTASTEN ÜBER EINEN GEWÖHNLICHEN
	 * DRUCK BEOBACHTBAR: die Starttaste beginnt die Leiter, ohne zu werten, und
	 * die Leiter bleibt sichtbar auf Stufe 1 stehen. Der frühere Kunstgriff
	 * (offer()/start() von Hand, ohne guess()) entfällt ersatzlos — geprüft
	 * wird jetzt der ECHTE Weg.
	 *
	 * Auch dieser Druck läuft unter der festen Ziehung: sonst wäre this.lit
	 * nach start() echt zufällig und der erste Klettertritt von climb() träfe
	 * nur zufällig.
	 */
	withFixedDraw(0, () => {
		press(mL3.riskStartButtons[group.start]);
	});

	const timing1 = stepTiming(1, cfg.curve);
	const expectedPause1 = cfg.pause ? timing1.onMs : 0;
	const expectedCycle1 = cycleMs(1, { sides: cfg.sides, curve: cfg.curve, pause: cfg.pause });
	check(Number(mL3.root.dataset.frRiskSide) === timing1.sideMs,
		`L-3 ${groupId} Stufe 1: data-fr-risk-side = ${timing1.sideMs} (gefunden: ${mL3.root.dataset.frRiskSide})`);
	check(Number(mL3.root.dataset.frRiskOn) === timing1.onMs,
		`L-3 ${groupId} Stufe 1: data-fr-risk-on = ${timing1.onMs} (gefunden: ${mL3.root.dataset.frRiskOn})`);
	check(Number(mL3.root.dataset.frRiskPause) === expectedPause1,
		`L-3 ${groupId} Stufe 1: data-fr-risk-pause = ${expectedPause1} (gefunden: ${mL3.root.dataset.frRiskPause})`);
	check(Number(mL3.root.dataset.frRiskCycle) === expectedCycle1,
		`L-3 ${groupId} Stufe 1: data-fr-risk-cycle = ${expectedCycle1} (gefunden: ${mL3.root.dataset.frRiskCycle})`);

	// Ab hier steht die Leiter GENAU dort, wo ein echter erster Druck sie
	// hinterließe (aktiv, Stufe 1) — der Rest klettert über ECHTE
	// Tastendrücke (onPress()), wie jede weitere Stufe auch am Gehäuse
	// entstünde. climb(n) reicht n WEITERE Treffer, jeder erhöht die Stufe
	// um eins.
	let reachedLevel = 1;
	for (const targetLevel of [2, 3, 6, 20]) {
		climb(mL3, group, targetLevel - reachedLevel);
		reachedLevel = targetLevel;

		const timing = stepTiming(targetLevel, cfg.curve);
		const expectedPause = cfg.pause ? timing.onMs : 0;
		const expectedCycle = cycleMs(targetLevel, { sides: cfg.sides, curve: cfg.curve, pause: cfg.pause });
		check(Number(mL3.root.dataset.frRiskSide) === timing.sideMs,
			`L-3 ${groupId} Stufe ${targetLevel}: data-fr-risk-side = ${timing.sideMs}`
			+ ` (gefunden: ${mL3.root.dataset.frRiskSide})`);
		check(Number(mL3.root.dataset.frRiskOn) === timing.onMs,
			`L-3 ${groupId} Stufe ${targetLevel}: data-fr-risk-on = ${timing.onMs}`
			+ ` (gefunden: ${mL3.root.dataset.frRiskOn})`);
		check(Number(mL3.root.dataset.frRiskPause) === expectedPause,
			`L-3 ${groupId} Stufe ${targetLevel}: data-fr-risk-pause = ${expectedPause}`
			+ ` (gefunden: ${mL3.root.dataset.frRiskPause})`);
		check(Number(mL3.root.dataset.frRiskCycle) === expectedCycle,
			`L-3 ${groupId} Stufe ${targetLevel}: data-fr-risk-cycle = ${expectedCycle}`
			+ ` (gefunden: ${mL3.root.dataset.frRiskCycle})`);
	}
	mL3.bank.destroy();
	mL3.wallet.destroy();
	mL3.risk.destroy();
}

console.log('\nL-4 — ein Stufenwechsel mitten in der Leiter ist unmöglich: fremde Gruppen bleiben folgenlos');

const mL4 = buildMachineWithRisk();
await credit.set(1000);
await mL4.wallet.machineCredit.insert(100);
await advance(50);
fireRound(mL4, 20);
await advance(50);
climb(mL4, GROUPS.find((g) => g.id === 'risk8'), 1);
check(mL4.root.dataset.frRiskLadder === 'risk8', 'L-4 die x8-Leiter läuft');
const levelBefore = mL4.root.dataset.frRiskLevel;
const winBefore = mL4.root.dataset.frRiskWin;
for (const key of ['risk-left', 'risk-right', 'risk4-left', 'risk4-right']) {
	press(mL4.riskButtons[key]);
	check(mL4.root.dataset.frRiskLadder === 'risk8'
		&& mL4.root.dataset.frRiskLevel === levelBefore
		&& mL4.root.dataset.frRiskWin === winBefore,
		`L-4 ein Druck auf ${key} (fremde Gruppe) während der laufenden x8-Leiter ist folgenlos`);
}
mL4.bank.destroy();
mL4.wallet.destroy();
mL4.risk.destroy();

console.log('\nL-5 — nie zwei Tasten gleichzeitig, über 30 Sekunden virtueller Uhr in Schritten von 4 ms');

const mL5 = buildMachineWithRisk();
await credit.set(1000);
await mL5.wallet.machineCredit.insert(100);
await advance(50);
fireRound(mL5, 20);
await advance(50);
climb(mL5, GROUPS.find((g) => g.id === 'risk8'), 1);
const litSamples = await sampleLit(mL5, 30000, 4);
check(litSamples.every((n) => n <= 1),
	`L-5 zu keinem Zeitpunkt sind mehr als eine Taste gleichzeitig .fr-btn--lit (Höchstwert im Lauf: ${Math.max(...litSamples)})`);
check(litSamples.some((n) => n === 1),
	'L-5 mindestens einmal war tatsächlich eine Taste an — die Prüfung ist nicht trivial wahr');
// GEGENPROBE (Nachlauf-Auflage: mindestens eine neue Prüfung muss nachweisbar rot werden können).
const gegenprobeL5 = expectFailure(() => {
	check(litSamples.every((n) => n <= 0),
		'GEGENPROBE (wird NICHT gezählt): absichtlich falsche Erwartung, dass NIE eine Taste leuchtet');
});
check(gegenprobeL5, 'GEGENPROBE L-5: die Blitzsicherheits-Prüfung kann tatsächlich rot werden');
mL5.bank.destroy();
mL5.wallet.destroy();
mL5.risk.destroy();

console.log('\nL-5b — [M1] eine schnelle Trefferkette gegen dieselbe Blitzgrenze: über 30 Sekunden ein IMMER'
	+ ' richtig und SOFORT (0 Reaktionszeit) tippender Spieler, mit einer Ziehung, die order[0] bei JEDEM'
	+ ' Stufenwechsel zwischen den beiden Tasten der Gruppe "risk" wechseln lässt');
{
	/*
	 * [M1] (Behebungslauf REVIEW-fruitrisk-f5.md): beginLevel() setzt die
	 * Phasenuhr bei JEDEM Treffer zurück und malt sofort die neue order[0]
	 * (risk-ladder-multi.js). Die offene Frage war, ob eine schnelle
	 * Trefferkette dieselbe Taste öfter als dreimal je Sekunde aufleuchten
	 * lassen kann. climb()/withFixedDraw(0, …) prüft das NICHT: raw 0 liefert
	 * IMMER dieselbe Seite (group.buttons[1], siehe climb()s Dateikopf) — die
	 * Taste bliebe dabei einfach DURCHGEHEND an, kein Aus-Ein-Wechsel, also
	 * gar kein Blitz. Hier wird deshalb mit einer ALTERNIERENDEN Rohziehung
	 * (0, 1, 0, 1, …) gearbeitet: an einer Gruppe mit zwei Seiten liefert das
	 * bei JEDEM Stufenwechsel abwechselnd order[0] = 1, dann 0, dann 1, … —
	 * genau der im Review beschriebene ungünstigste Fall (X brennt → Treffer
	 * → Y brennt → Treffer → X brennt …). Zusätzlich drückt diese Schleife,
	 * anders als sampleLit() in L-5, bei JEDER erkannten neuen Taste SOFORT
	 * (im selben Abtastschritt) — die schnellstmögliche, rein synthetische
	 * Reaktion, die kein Mensch erreicht (siehe DECISIONS.md).
	 */
	const mL5b = buildMachineWithRisk();
	await credit.set(1000);
	await mL5b.wallet.machineCredit.insert(100);
	await advance(50);
	fireRound(mL5b, 20);
	await advance(50);

	const groupRiskL5b = GROUPS.find((g) => g.id === 'risk');
	const litEdgesByKeyL5b = new Map(groupRiskL5b.buttons.map((key) => [key, []]));
	const previousCryptoL5b = globalThis.crypto;
	let sequenceIndexL5b = 0;
	defineGlobal('crypto', {
		getRandomValues: (buf) => { buf[0] = sequenceIndexL5b % 2; sequenceIndexL5b += 1; return buf; },
	});
	// Die Leiter braucht einen Druck auf ihre STARTTASTE, um überhaupt
	// anzulaufen (onStart() → ladder.start()) — erst danach leuchtet je
	// eine Taste, die die Schleife unten erkennen kann. Der Start zieht die
	// erste Reihenfolge (sequenceIndex 0 → order[0] = 1 = 'risk-right');
	// ab da wechselt die alternierende Ziehung wie bisher bei JEDEM
	// Stufenwechsel.
	press(mL5b.riskStartButtons[groupRiskL5b.start]);
	let previousLitKeyL5b = null;
	const stepMsL5b = 4;
	const targetL5b = clock.ms + 30000;
	try {
		while (clock.ms < targetL5b) {
			clock.ms = Math.min(targetL5b, clock.ms + stepMsL5b);
			const dueL5b = [...frames.values()];
			frames.clear();
			for (const fn of dueL5b) {
				fn(clock.ms);
			}
			for (const [id, timer] of [...timers]) {
				if (timer.at <= clock.ms) {
					timers.delete(id);
					timer.fn();
				}
			}
			await Promise.resolve();
			const currentLitKeyL5b = groupRiskL5b.buttons.find(
				(key) => mL5b.riskButtons[key].classList.contains('fr-btn--lit')
			) ?? null;
			if (currentLitKeyL5b !== null && currentLitKeyL5b !== previousLitKeyL5b) {
				litEdgesByKeyL5b.get(currentLitKeyL5b).push(clock.ms);
				press(mL5b.riskButtons[currentLitKeyL5b]);
				await Promise.resolve();
			}
			previousLitKeyL5b = groupRiskL5b.buttons.find(
				(key) => mL5b.riskButtons[key].classList.contains('fr-btn--lit')
			) ?? null;
		}
	} finally {
		defineGlobal('crypto', previousCryptoL5b);
	}

	// Höchste Anzahl der Anschaltflanken EINER Taste in irgendeinem
	// gleitenden Ein-Sekunden-Fenster über den ganzen 30-Sekunden-Lauf.
	let worstPerSecondL5b = 0;
	for (const edges of litEdgesByKeyL5b.values()) {
		for (const edgeTime of edges) {
			const windowCount = edges.filter((t) => t > edgeTime - 1000 && t <= edgeTime).length;
			worstPerSecondL5b = Math.max(worstPerSecondL5b, windowCount);
		}
	}
	const edgeCountsL5b = [...litEdgesByKeyL5b.entries()].map(([k, v]) => `${k}=${v.length}`).join(', ');
	check(worstPerSecondL5b <= 3,
		`L-5b [M1] auch unter einer schnellen, alternierenden Trefferkette leuchtet keine Taste öfter als dreimal`
		+ ` je Sekunde (höchster gemessener Wert in einem gleitenden 1-s-Fenster: ${worstPerSecondL5b};`
		+ ` Anschaltflanken über 30 s: ${edgeCountsL5b})`);
	check(worstPerSecondL5b >= 1,
		'L-5b mindestens eine Taste hat tatsächlich mehrfach gewechselt — die Prüfung ist nicht trivial wahr');
	// GEGENPROBE (Nachlauf-Auflage: mindestens eine neue Prüfung muss nachweisbar rot werden können).
	const gegenprobeL5b = expectFailure(() => {
		check(worstPerSecondL5b <= 0,
			'GEGENPROBE (wird NICHT gezählt): absichtlich falsche Erwartung, dass NIE gewechselt wird');
	});
	check(gegenprobeL5b, 'GEGENPROBE L-5b: die Trefferketten-Prüfung kann tatsächlich rot werden');

	mL5b.bank.destroy();
	mL5b.wallet.destroy();
	mL5b.risk.destroy();
}

console.log('\nL-6 — Aussteigen: REWARD im Angebot, REWARD in der Leiter, START im Angebot, START in der Leiter wirkungslos');

const mL6a = buildMachineWithRisk();
await credit.set(1000);
await mL6a.wallet.machineCredit.insert(100);
await advance(50);
fireRound(mL6a, 20);
await advance(50);
let offerendL6a = null;
mL6a.root.addEventListener('fr:offerend', (event) => { offerendL6a = event.detail; });
const creditBeforeL6a = mL6a.wallet.machineCredit.amount;
press(mL6a.rewardButton);
await advance(50);
check(mL6a.wallet.machineCredit.amount === creditBeforeL6a + 20, 'L-6a REWARD im Angebot schreibt den Anspruch gut');
check(offerendL6a?.reason === 'reward' && offerendL6a?.amount === 20, 'L-6a fr:offerend reason "reward"');
check(mL6a.root.dataset.frRiskPhase === 'off', 'L-6a data-fr-risk-phase zurück auf "off"');
mL6a.bank.destroy();
mL6a.wallet.destroy();
mL6a.risk.destroy();

const mL6b = buildMachineWithRisk();
await credit.set(1000);
await mL6b.wallet.machineCredit.insert(100);
await advance(50);
fireRound(mL6b, 20);
await advance(50);
climb(mL6b, GROUPS.find((g) => g.id === 'risk'), 1);
let offerendL6b = null;
mL6b.root.addEventListener('fr:offerend', (event) => { offerendL6b = event.detail; });
const creditBeforeL6b = mL6b.wallet.machineCredit.amount;
press(mL6b.rewardButton);
await advance(50);
check(mL6b.wallet.machineCredit.amount === creditBeforeL6b + 40,
	'L-6b REWARD in der Leiter schreibt den aktuellen Leiterstand gut (40 = 20 × 2)');
check(offerendL6b?.reason === 'ladder-collect' && offerendL6b?.amount === 40, 'L-6b fr:offerend reason "ladder-collect"');
mL6b.bank.destroy();
mL6b.wallet.destroy();
mL6b.risk.destroy();

const mL6c = buildMachineWithRisk();
await credit.set(1000);
await mL6c.wallet.machineCredit.insert(100);
await advance(50);
fireRound(mL6c, 20);
await advance(50);
let offerendL6c = null;
mL6c.root.addEventListener('fr:offerend', (event) => { offerendL6c = event.detail; });
const creditBeforeL6c = mL6c.wallet.machineCredit.amount;
const cameL6c = fireRound(mL6c, 15);
await advance(50);
check(cameL6c, 'L-6c die zweite Runde kommt zustande');
check(mL6c.wallet.machineCredit.amount === creditBeforeL6c + 20 - STAKE,
	'L-6c START schreibt den alten Anspruch gut (+20) und bucht den neuen Einsatz ab (−10)');
check(offerendL6c?.reason === 'start', 'L-6c fr:offerend reason "start"');
check(mL6c.root.dataset.frRiskPhase === 'offer' && mL6c.root.dataset.frRiskWin === '15',
	'L-6c der neue Gewinn (15) geht erneut ins Angebot');
mL6c.bank.destroy();
mL6c.wallet.destroy();
mL6c.risk.destroy();

const mL6d = buildMachineWithRisk();
await credit.set(1000);
await mL6d.wallet.machineCredit.insert(100);
await advance(50);
fireRound(mL6d, 20);
await advance(50);
climb(mL6d, GROUPS.find((g) => g.id === 'risk'), 1);
const totalBeforeL6d = mL6d.wallet.machineCredit.amount;
const cameL6d = fire(mL6d.root, 'fr:round', { draw: [0, 0, 0, 0, 0, 0], stake: STAKE }, { cancelable: true });
await advance(50);
check(cameL6d === false, 'L-6d START während einer laufenden Leiter kommt NICHT zustande (risk.js bricht am Dokument ab)');
check(mL6d.wallet.machineCredit.amount === totalBeforeL6d, 'L-6d es wird nichts abgebucht');
check(mL6d.root.dataset.frRiskPhase === 'ladder', 'L-6d die Leiter läuft unverändert weiter');
mL6d.bank.destroy();
mL6d.wallet.destroy();
mL6d.risk.destroy();

console.log('\nL-7 — Verlassen der Seite schreibt einen offenen Anspruch UND eine laufende Leiter gut');

const mL7a = buildMachineWithRisk();
await credit.set(1000);
await mL7a.wallet.machineCredit.insert(100);
await advance(50);
fireRound(mL7a, 25);
await advance(50);
const totalBeforeLeaveL7a = credit.balance + mL7a.wallet.machineCredit.amount + 25;
mL7a.risk.destroy();
mL7a.bank.destroy();
mL7a.wallet.destroy();
await advance(50);
check(credit.balance + mL7a.wallet.machineCredit.amount === totalBeforeLeaveL7a,
	'L-7a Verlassen mit offenem Angebot: der Anspruch wird gutgeschrieben, die Bilanz stimmt danach exakt');

const mL7b = buildMachineWithRisk();
await credit.set(1000);
await mL7b.wallet.machineCredit.insert(100);
await advance(50);
fireRound(mL7b, 25);
await advance(50);
climb(mL7b, GROUPS.find((g) => g.id === 'risk'), 1);
const totalBeforeLeaveL7b = credit.balance + mL7b.wallet.machineCredit.amount + 50;
mL7b.risk.destroy();
mL7b.bank.destroy();
mL7b.wallet.destroy();
await advance(50);
check(credit.balance + mL7b.wallet.machineCredit.amount === totalBeforeLeaveL7b,
	'L-7b Verlassen mit laufender Leiter: der aktuelle Leiterstand (50 = 25 × 2) wird gutgeschrieben');

console.log('\nL-8 — nach der Leiter gehören die GEWINN-Röhren wieder machine.js, unverändert richtig');

const mL8 = buildFullMachineWithRisk();
await mL8.wallet.machineCredit.insert(1000);
await advance(50);

press(mL8.startButton);
await advance(6000);
check(mL8.root.dataset.frWin === '3000', 'L-8 machine.js zeigt den Rundengewinn (3000) in data-fr-win');
check(mL8.root.dataset.frRiskWin === '3000' && mL8.root.dataset.frRiskPhase === 'offer',
	'L-8 risk.js hat den Anspruch übernommen (data-fr-risk-win 3000, phase "offer")');

climb(mL8, GROUPS.find((g) => g.id === 'risk'), 1);
check(mL8.root.dataset.frRiskWin === '6000', 'L-8 die Leiter hat den Gewinn verdoppelt (6000)');

press(mL8.rewardButton);
await advance(50);
check(mL8.root.dataset.frRiskPhase === 'off', 'L-8 die Leiter ist beendet');

press(mL8.startButton);
await advance(6000);
check(mL8.root.dataset.frWin === '3000',
	'L-8 die zweite, echte Runde zeigt wieder den korrekten Rundengewinn (3000) —'
	+ " machine.js' eigenes Zählwerk ist vom vorherigen Leiterstand unberührt geblieben");

mL8.machine.destroy();
mL8.bank.destroy();
mL8.wallet.destroy();
mL8.risk.destroy();

console.log('\nL-9 — die Kappung: eine hoch geleiterte x8-Leiter sättigt am Höchstbetrag des Gerätekredits, meldet capped');

const mL9 = buildMachineWithRisk();
await credit.set(2_000_000_000);
await mL9.wallet.machineCredit.insert(100);
await advance(50);
fireRound(mL9, 20);
await advance(50);
// 8^10 × 20 = 214.748.364.800 — weit über dem Höchststand des Gerätekredits
// (999.999.999). Zehn Treffer reichen damit sicher aus.
climb(mL9, GROUPS.find((g) => g.id === 'risk8'), 10);
const uncappedWin = mL9.root.dataset.frRiskWin;
check(Number(uncappedWin) > mL9.wallet.machineCredit.MAX,
	`L-9 der rechnerische Leiterstand (${uncappedWin}) liegt bereits über dem Höchststand des Gerätekredits`
	+ ` (${mL9.wallet.machineCredit.MAX})`);

let collectEventL9 = null;
let offerendL9 = null;
mL9.root.addEventListener('fr:collect', (event) => { collectEventL9 = event.detail; });
mL9.root.addEventListener('fr:offerend', (event) => { offerendL9 = event.detail; });
press(mL9.rewardButton);
await advance(50);

check(mL9.wallet.machineCredit.amount === mL9.wallet.machineCredit.MAX,
	`L-9 der Gerätekredit sättigt exakt am Höchststand (${mL9.wallet.machineCredit.MAX}), gefunden:`
	+ ` ${mL9.wallet.machineCredit.amount}`);
check(collectEventL9?.capped === true, 'L-9 fr:collect meldet capped: true');
check(offerendL9?.reason === 'ladder-collect' && offerendL9?.amount === Number(uncappedWin),
	'L-9 fr:offerend trägt weiterhin den vollen, UNGEKAPPTEN Leiterstand — die Kappung ist eine Frage des'
	+ ' Gerätekredits, nicht der Leiter');
mL9.bank.destroy();
mL9.wallet.destroy();
mL9.risk.destroy();

console.log('\nL-10 — der Start ist KEIN Versuch: Stufe 1 steht, der Anspruch ist unverändert,'
	+ ' und REWARD holt ihn ungeschmälert zurück');

const mL10 = buildMachineWithRisk();
await credit.set(1000);
await mL10.wallet.machineCredit.insert(100);
await advance(50);
fireRound(mL10, 20);
await advance(50);
let offerendL10 = null;
mL10.root.addEventListener('fr:offerend', (event) => { offerendL10 = event.detail; });
withFixedDraw(0, () => { press(mL10.riskStartButtons['risk4-start']); });
check(mL10.root.dataset.frRiskPhase === 'ladder', 'L-10 nach dem Druck auf die Starttaste läuft die Leiter');
check(mL10.root.dataset.frRiskLadder === 'risk4', 'L-10 und zwar GENAU die Leiter dieser Gruppe');
check(mL10.root.dataset.frRiskLevel === '1',
	`L-10 sie steht auf Stufe 1 — der Start hat NICHT gewertet (gefunden: ${mL10.root.dataset.frRiskLevel})`);
check(mL10.root.dataset.frRiskWin === '20',
	'L-10 der offene Gewinn ist unverändert 20 — beim Start kann nichts verloren gehen'
	+ ` (gefunden: ${mL10.root.dataset.frRiskWin})`);
check(offerendL10 === null,
	'L-10 kein fr:offerend — das Angebot ist in die Leiter übergegangen, nicht beendet');
const creditBeforeL10 = mL10.wallet.machineCredit.amount;
press(mL10.rewardButton);
await advance(50);
check(mL10.wallet.machineCredit.amount === creditBeforeL10 + 20,
	'L-10 REWARD unmittelbar nach dem Start schreibt genau den ungeschmälerten Anspruch gut (20)'
	+ ' — der eigentliche Beweis, dass der Start kein Versuch war');
check(offerendL10?.reason === 'ladder-collect' && offerendL10?.amount === 20,
	'L-10 fr:offerend trägt reason "ladder-collect" mit dem vollen Betrag');
// GEGENPROBE (Auflage: mindestens eine neue Prüfung muss nachweisbar rot werden können).
const gegenprobeL10 = expectFailure(() => {
	check(mL10.wallet.machineCredit.amount === creditBeforeL10 + 40,
		'GEGENPROBE (wird NICHT gezählt): absichtlich falsche Erwartung, der Start hätte verdoppelt');
});
check(gegenprobeL10, 'GEGENPROBE L-10: die Prüfung „der Start wertet nicht" kann tatsächlich rot werden');
mL10.bank.destroy();
mL10.wallet.destroy();
mL10.risk.destroy();

console.log('\nL-11 — nach dem Start ist GENAU diese Gruppe erreichbar; alle drei Starttasten sind dunkel');

const mL11 = buildMachineWithRisk();
await credit.set(1000);
await mL11.wallet.machineCredit.insert(100);
await advance(50);
fireRound(mL11, 20);
await advance(50);
withFixedDraw(0, () => { press(mL11.riskStartButtons['risk4-start']); });
for (const key of ['risk4-left', 'risk4-right']) {
	checkWritten(mL11.riskButtons[key], 'attributes', 'aria-disabled', 'false',
		`L-11 ${key} ist jetzt erreichbar`);
}
for (const key of ['risk-left', 'risk-right', 'risk8-up', 'risk8-left', 'risk8-right', 'risk8-down']) {
	check(mL11.riskButtons[key].getAttribute('aria-disabled') === 'true',
		`L-11 ${key} (fremde Gruppe) bleibt aria-disabled="true"`);
}
for (const group of GROUPS) {
	const button = mL11.riskStartButtons[group.start];
	check(button.getAttribute('aria-disabled') === 'true' && !button.classList.contains('fr-btn--invite'),
		`L-11 ${group.start} ist wieder gesperrt und blinkt nicht mehr`);
	check(!button.classList.contains('fr-btn--lit'),
		`L-11 ${group.start} leuchtet nie (WCAG 2.2 SC 2.3.1: nur EINE Taste je Zeitpunkt)`);
}
mL11.bank.destroy();
mL11.wallet.destroy();
mL11.risk.destroy();

console.log('\nL-12 — Starttasten sind während einer laufenden Leiter und im Grundzustand wirkungslos');

const mL12 = buildMachineWithRisk();
await credit.set(1000);
await mL12.wallet.machineCredit.insert(100);
await advance(50);
fireRound(mL12, 20);
await advance(50);
climb(mL12, GROUPS.find((g) => g.id === 'risk8'), 1);
check(mL12.root.dataset.frRiskLadder === 'risk8', 'L-12 die x8-Leiter läuft');
const stateBeforeL12 = [mL12.root.dataset.frRiskLadder, mL12.root.dataset.frRiskLevel,
	mL12.root.dataset.frRiskWin].join('|');
for (const key of ['risk-start', 'risk4-start', 'risk8-start']) {
	press(mL12.riskStartButtons[key]);
	check([mL12.root.dataset.frRiskLadder, mL12.root.dataset.frRiskLevel,
		mL12.root.dataset.frRiskWin].join('|') === stateBeforeL12,
		`L-12 ein Druck auf ${key} während der laufenden x8-Leiter ist folgenlos`);
}
press(mL12.rewardButton);
await advance(50);
check(mL12.root.dataset.frRiskPhase === 'off', 'L-12 nach REWARD steht das Gerät im Grundzustand');
for (const key of ['risk-start', 'risk4-start', 'risk8-start']) {
	press(mL12.riskStartButtons[key]);
	check(mL12.root.dataset.frRiskPhase === 'off',
		`L-12 im Grundzustand (kein Angebot) ist ${key} wirkungslos`);
}
mL12.bank.destroy();
mL12.wallet.destroy();
mL12.risk.destroy();

console.log('\nL-13 — der Start leert den Live-Bereich „risk", ohne etwas Neues anzusagen;'
	+ ' der Ausgang wird trotzdem angesagt');

const mL13 = buildMachineWithRisk();
await credit.set(1000);
await mL13.wallet.machineCredit.insert(100);
await advance(50);
fireRound(mL13, 20);
await advance(50);
check(mL13.riskRegion.element.textContent !== '', 'L-13 im Angebot steht die Einladung');
withFixedDraw(0, () => { press(mL13.riskStartButtons['risk-start']); });
check(mL13.riskRegion.element.textContent === '',
	'L-13 mit dem Start ist der Bereich geleert — die Einladung nennt Tasten, die nicht mehr wirken');
press(mL13.rewardButton);
await advance(750);
check(mL13.riskRegion.element.textContent === 'Risikospiel gewonnen: 20 Kredite auf Stufe 1.',
	`L-13 der AUSGANG wird trotzdem angesagt (gefunden: "${mL13.riskRegion.element.textContent}")`);
mL13.bank.destroy();
mL13.wallet.destroy();
mL13.risk.destroy();

/* ==========================================================================
   9b. AU — DER AUTO-MODUS, MIT DEM ECHTEN auto.js
   ========================================================================== */

/**
 * Stellt die virtuelle Uhr in kleinen Schritten vor, bis predicate() wahr
 * wird oder maxMs erreicht ist — anders als advance(ms), das einen FESTEN
 * Betrag vorstellt.
 *
 * Für die selbst ausgelösten Züge in Block AU gebraucht: ein einzelner Zug
 * dauert (Pause + Walzenlauf + Bremse + Nachfedern) nur GESCHÄTZT rund
 * 5,3 s. Ein fester advance(6000) je Zug ließe die Fensterphase gegen die
 * tatsächliche Zyklusdauer DRIFTEN — der Übertrag von rund 700 ms je Zug
 * summiert sich, bis irgendwann zwei Züge in ein Fenster fallen (beobachtet
 * bei den Zügen 46 und 49 eines 50-Zug-Laufs, bevor diese Funktion es
 * behoben hat). advanceUntil() stellt stattdessen GENAU bis zu dem
 * Zeitpunkt vor, an dem predicate() wahr wird, und keinen Tick länger — die
 * nächste Pause bleibt dadurch unangetastet, egal wie lange der vorige Zug
 * tatsächlich brauchte.
 *
 * @param {() => boolean} predicate
 * @param {number} stepMs
 * @param {number} maxMs
 * @returns {Promise<boolean>} true, wenn predicate() innerhalb von maxMs wahr wurde
 */
async function advanceUntil(predicate, stepMs, maxMs) {
	const target = clock.ms + maxMs;
	while (!predicate() && clock.ms < target) {
		clock.ms = Math.min(target, clock.ms + stepMs);
		for (const [id, timer] of [...timers]) {
			if (timer.at <= clock.ms) {
				timers.delete(id);
				timer.fn();
			}
		}
		const dueFrames = [...frames.values()];
		frames.clear();
		for (const fn of dueFrames) {
			fn(clock.ms);
		}
		await Promise.resolve();
		await Promise.resolve();
	}
	await Promise.resolve();
	return predicate();
}

console.log('\nAU-1 — Umschalten: der erste Druck schaltet ein, der zweite aus');

const mAU1 = buildFullMachineWithRiskAndAuto();
await credit.set(5000);
await mAU1.wallet.machineCredit.insert(1000);
await advance(50);

press(mAU1.autoButton);
checkWritten(mAU1.root, 'dataset', 'frAuto', 'on', 'AU-1 data-fr-auto steht nach dem ersten Druck auf "on"');
checkWritten(mAU1.autoButton, 'attributes', 'aria-pressed', 'true',
	'AU-1 aria-pressed steht nach dem ersten Druck auf "true"');
checkWritten(mAU1.autoButton, 'classes', 'fr-btn--lit', true, 'AU-1 AUTO MODE leuchtet nach dem ersten Druck');

press(mAU1.autoButton);
checkWritten(mAU1.root, 'dataset', 'frAuto', 'off', 'AU-1 data-fr-auto steht nach dem zweiten Druck auf "off"');
checkWritten(mAU1.autoButton, 'attributes', 'aria-pressed', 'false',
	'AU-1 aria-pressed steht nach dem zweiten Druck auf "false"');
checkWritten(mAU1.autoButton, 'classes', 'fr-btn--lit', false,
	'AU-1 AUTO MODE leuchtet nicht mehr nach dem zweiten Druck');

mAU1.auto.destroy();
mAU1.machine.destroy();
mAU1.risk.destroy();
mAU1.bank.destroy();
mAU1.wallet.destroy();

console.log('\nAU-2 — 50 selbst ausgelöste Züge ohne Leiter: die acht Risiko-Tasten bleiben dunkel, die Bilanz stimmt'
	+ ' nach jedem einzelnen Zug');

const mAU2 = buildFullMachineWithRiskAndAuto();
await credit.set(100000);
await mAU2.wallet.machineCredit.insert(2000);
await advance(50);

let lastResultWinAU2 = null;
mAU2.root.addEventListener('fr:result', (event) => { lastResultWinAU2 = event.detail.win; });

press(mAU2.autoButton);
check(mAU2.root.dataset.frAuto === 'on', 'AU-2 der Auto-Modus ist eingeschaltet');

let previousTotalAU2 = trueTotal(mAU2);
// [L8] Nichttrivialitäts-Zähler: die eigentliche Gegenprobe darunter belegt
// bereits, dass die Einladungs-Prüfung rot werden KANN. Diese Zeile prüft
// stattdessen, dass die 50-Züge-Schleife wirklich 50 Mal durchlaufen wurde —
// nicht bloß, dass die Konjunktion aller Einzelprüfungen zufällig aufgeht
// (Behebungslauf REVIEW-fruitrisk-f5.md [L8]).
let observedRoundsAU2 = 0;

for (let round = 1; round <= 50; round++) {
	observedRoundsAU2++;
	lastResultWinAU2 = null;
	// advanceUntil() statt eines festen advance(): ein fester Betrag würde
	// gegen die tatsächliche Zyklusdauer driften (siehe Dateikopf von
	// advanceUntil()) und irgendwann zwei Züge in ein Fenster fallen lassen.
	const arrivedAU2 = await advanceUntil(() => lastResultWinAU2 !== null, 8, 6000);

	check(arrivedAU2, `AU-2 Zug ${round}: die Runde ist von selbst zustande gekommen (fr:result kam)`);
	const expectedTotalAU2 = previousTotalAU2 - STAKE + (lastResultWinAU2 ?? 0);
	check(trueTotal(mAU2) === expectedTotalAU2,
		`AU-2 Zug ${round}: die Bilanz stimmt exakt (Einsatz ${STAKE}, Gewinn ${lastResultWinAU2}, sofort gutgeschrieben)`);
	previousTotalAU2 = trueTotal(mAU2);

	const allRiskAU2 = { ...mAU2.riskButtons, ...mAU2.riskStartButtons };
	const litCountAU2 = Object.values(allRiskAU2).filter((b) => b.classList.contains('fr-btn--lit')).length;
	const inviteCountAU2 = Object.values(allRiskAU2).filter((b) => b.classList.contains('fr-btn--invite')).length;
	check(litCountAU2 === 0 && inviteCountAU2 === 0,
		`AU-2 Zug ${round}: keines der elf Risiko-Bedienteile leuchtet oder lädt ein`
		+ ` (gefunden: ${litCountAU2} leuchtend, ${inviteCountAU2} einladend)`);
	check(Object.values(allRiskAU2).every((b) => b.getAttribute('aria-disabled') === 'true'),
		`AU-2 Zug ${round}: alle elf Risiko-Bedienteile bleiben aria-disabled="true"`);
	check(mAU2.root.dataset.frRiskPhase === 'off', `AU-2 Zug ${round}: data-fr-risk-phase bleibt "off"`);
}
check(observedRoundsAU2 === 50,
	`AU-2 mindestens 50 Züge wurden wirklich beobachtet (gezählt: ${observedRoundsAU2})`);

// GEGENPROBE AU-2: Beweis, dass die Prüfung "keine Risiko-Taste lädt ein"
// tatsächlich rot werden kann, statt nur grün zu bleiben, weil sie nichts
// prüft.
mAU2.riskStartButtons['risk-start'].classList.add('fr-btn--invite');
const gegenprobeAU2 = expectFailure(() => {
	const allRiskAU2Gegenprobe = { ...mAU2.riskButtons, ...mAU2.riskStartButtons };
	check(Object.values(allRiskAU2Gegenprobe).every((b) => !b.classList.contains('fr-btn--invite')),
		'GEGENPROBE (wird NICHT gezählt): absichtlich eine Risiko-Taste zum Einladen gebracht');
});
check(gegenprobeAU2,
	'GEGENPROBE AU-2: die Prüfung „keine Risiko-Taste lädt ein" kann tatsächlich rot werden');
mAU2.riskStartButtons['risk-start'].classList.remove('fr-btn--invite');

mAU2.auto.destroy();
mAU2.machine.destroy();
mAU2.risk.destroy();
mAU2.bank.destroy();
mAU2.wallet.destroy();

console.log('\nAU-3 — der Gewinn wird SOFORT gutgeschrieben, bevor die Pause abläuft; fr:offerend trägt reason "auto"');

const mAU3 = buildFullMachineWithRiskAndAuto();
await credit.set(5000);
await mAU3.wallet.machineCredit.insert(1000);
await advance(50);

let resultWinAU3 = null;
let offerendAU3 = null;
mAU3.root.addEventListener('fr:result', (event) => { resultWinAU3 = event.detail.win; });
mAU3.root.addEventListener('fr:offerend', (event) => { offerendAU3 = event.detail; });

press(mAU3.autoButton);
const creditBeforeRoundAU3 = mAU3.wallet.machineCredit.amount;

// Die Pause läuft ab (1000 ms virtuell) und löst den ersten selbst
// ausgelösten Zug aus.
await advance(1050);
check(mAU3.machine.state === 'spinning', 'AU-3 die Pause löste den ersten selbst ausgelösten Zug aus');

// GENAU bis zum Eintreffen von fr:result vorstellen, keinen Tick länger —
// sonst könnte die NÄCHSTE 1-Sekunden-Pause, die onResult() synchron damit
// spannt, in derselben Prüfung schon wieder ablaufen (advanceUntil() statt
// eines geschätzten festen advance(), siehe deren Dateikopf).
const arrivedAU3 = await advanceUntil(() => resultWinAU3 !== null, 8, 6000);
check(arrivedAU3, 'AU-3 fr:result ist eingetroffen');
check(mAU3.root.dataset.frAutoPending === '1',
	'AU-3 die nächste Pause läuft bereits (data-fr-auto-pending "1") — der Gewinn ist trotzdem schon gutgeschrieben');
check(mAU3.wallet.machineCredit.amount === creditBeforeRoundAU3 - STAKE + resultWinAU3,
	'AU-3 der Gewinn steht SOFORT im Gerätekredit, VOR Ablauf der nächsten Pause — nicht erst mit dem nächsten START');
check(offerendAU3?.reason === 'auto', 'AU-3 fr:offerend trägt reason "auto"');
check(mAU3.root.dataset.frRiskPhase === 'off', 'AU-3 risk.js bleibt im Grundzustand — kein Angebot wurde je sichtbar');

mAU3.auto.destroy();
mAU3.machine.destroy();
mAU3.risk.destroy();
mAU3.bank.destroy();
mAU3.wallet.destroy();

console.log('\nAU-4 — Selbstabschaltung: reicht der Gerätekredit nicht mehr, schaltet sich der Auto-Modus beim'
	+ ' nächsten Versuch selbst ab, und es wird nichts abgebucht');

const mAU4 = buildFullMachineWithRiskAndAuto();
await credit.set(5000);
await mAU4.wallet.machineCredit.insert(STAKE - 1);
await advance(50);

let autoEventAU4 = null;
mAU4.root.addEventListener('fr:auto', (event) => { autoEventAU4 = event.detail; });

press(mAU4.autoButton);
check(mAU4.root.dataset.frAuto === 'on', 'AU-4 der Auto-Modus ist zunächst eingeschaltet');
const creditBeforeAttemptAU4 = mAU4.wallet.machineCredit.amount;

await advance(1050);

check(mAU4.machine.state === 'idle', 'AU-4 die Runde kam NICHT zustande — der Gerätekredit reicht nicht für den Einsatz');
check(mAU4.wallet.machineCredit.amount === creditBeforeAttemptAU4,
	'AU-4 es wurde NICHTS abgebucht — der abgelehnte Zug bucht keinen Einsatz');
check(mAU4.root.dataset.frAuto === 'off', 'AU-4 data-fr-auto steht jetzt auf "off"');
check(autoEventAU4?.on === false && autoEventAU4?.reason === 'insufficient',
	'AU-4 fr:auto meldet die Selbstabschaltung mit reason "insufficient"');
check(!mAU4.autoButton.classList.contains('fr-btn--lit') && mAU4.autoButton.getAttribute('aria-pressed') === 'false',
	'AU-4 AUTO MODE leuchtet nicht mehr und trägt aria-pressed="false"');

mAU4.auto.destroy();
mAU4.machine.destroy();
mAU4.risk.destroy();
mAU4.bank.destroy();
mAU4.wallet.destroy();

console.log('\nAU-5 — höchstens EIN Zeitgeber: data-fr-auto-pending ist über den ganzen Lauf nie etwas anderes als'
	+ ' "0" oder "1"; nach dem Abräumen ist es "0"');

const mAU5 = buildFullMachineWithRiskAndAuto();
await credit.set(100000);
await mAU5.wallet.machineCredit.insert(2000);
await advance(50);
press(mAU5.autoButton);

const seenPendingAU5 = new Set();
const targetAU5 = clock.ms + 12000; // gut zwei volle, selbst ausgelöste Züge
while (clock.ms < targetAU5) {
	clock.ms = Math.min(targetAU5, clock.ms + 8);
	for (const [id, timer] of [...timers]) {
		if (timer.at <= clock.ms) {
			timers.delete(id);
			timer.fn();
		}
	}
	const dueFramesAU5 = [...frames.values()];
	frames.clear();
	for (const fn of dueFramesAU5) {
		fn(clock.ms);
	}
	await Promise.resolve();
	await Promise.resolve();
	seenPendingAU5.add(mAU5.root.dataset.frAutoPending);
}
check([...seenPendingAU5].every((v) => v === '0' || v === '1'),
	`AU-5 data-fr-auto-pending war über den ganzen Lauf nur "0" oder "1" (gefunden: ${[...seenPendingAU5].join(', ')})`);
check(seenPendingAU5.has('1'),
	'AU-5 mindestens einmal lief tatsächlich eine Pause — die Prüfung findet wirklich etwas, statt an einem'
	+ ' leeren Lauf vorbeizulaufen');

mAU5.auto.destroy();
check(mAU5.root.dataset.frAutoPending === '0', 'AU-5 nach dem Abräumen steht data-fr-auto-pending auf "0"');
mAU5.machine.destroy();
mAU5.risk.destroy();
mAU5.bank.destroy();
mAU5.wallet.destroy();

console.log('\nAU-6a — Einschalten während eines laufenden Zugs: das Angebot entfällt, der Zug selbst läuft'
	+ ' unverändert zu Ende, der Auto-Modus wirkt erst ab dem nächsten Zug');

const mAU6a = buildFullMachineWithRiskAndAuto();
await credit.set(5000);
await mAU6a.wallet.machineCredit.insert(1000);
await advance(50);

let offerendAU6a = null;
mAU6a.root.addEventListener('fr:offerend', (event) => { offerendAU6a = event.detail; });

press(mAU6a.startButton);
await advance(50);
check(mAU6a.machine.state === 'spinning', 'AU-6a die Runde läuft (von Hand gestartet)');

press(mAU6a.autoButton);
check(mAU6a.root.dataset.frAuto === 'on', 'AU-6a der Auto-Modus ist jetzt eingeschaltet');
check(mAU6a.root.dataset.frAutoPending === '0',
	'AU-6a keine Pause wird während des laufenden Zugs gespannt — er wirkt erst ab dem nächsten Zug');

// GENAU bis zum fr:offerend dieses Zugs vorstellen, keinen Tick länger —
// sonst könnte die vom selben Chain-Aufruf gespannte NÄCHSTE Pause schon
// wieder abgelaufen sein, bevor data-fr-auto-pending geprüft wird.
const arrivedAU6a = await advanceUntil(() => offerendAU6a !== null, 8, 6000);
check(arrivedAU6a, 'AU-6a der Zug ist zu Ende gelaufen (fr:offerend kam)');
check(mAU6a.root.dataset.frRiskPhase === 'off', 'AU-6a kein Angebot ist sichtbar geworden — es entfällt');
check(offerendAU6a?.reason === 'auto', 'AU-6a der Gewinn dieser Runde wurde über reason "auto" sofort gutgeschrieben');
check(mAU6a.root.dataset.frAutoPending === '1',
	'AU-6a nach dem Ende dieses Zugs ist die nächste Pause gespannt — der nächste Zug wird selbst ausgelöst');

mAU6a.auto.destroy();
mAU6a.machine.destroy();
mAU6a.risk.destroy();
mAU6a.bank.destroy();
mAU6a.wallet.destroy();

console.log('\nAU-6b — Einschalten während des Angebots: fr:riskcollect nimmt den Gewinn, die Leiter entfällt');

const mAU6b = buildFullMachineWithRiskAndAuto();
await credit.set(5000);
await mAU6b.wallet.machineCredit.insert(1000);
await advance(50);

press(mAU6b.startButton);
await advance(6000);
check(mAU6b.root.dataset.frRiskPhase === 'offer', 'AU-6b das Angebot steht (der Auto-Modus war beim Anlaufen noch aus)');
const winAU6b = Number(mAU6b.root.dataset.frRiskWin);
check(winAU6b > 0, 'AU-6b es liegt ein offener Anspruch vor');

const creditBeforeAU6b = mAU6b.wallet.machineCredit.amount;
let offerendAU6b = null;
mAU6b.root.addEventListener('fr:offerend', (event) => { offerendAU6b = event.detail; });

press(mAU6b.autoButton);

check(mAU6b.root.dataset.frRiskPhase === 'off', 'AU-6b das Angebot ist beendet — die Leiter entfällt');
check(mAU6b.wallet.machineCredit.amount === creditBeforeAU6b + winAU6b,
	'AU-6b der offene Gewinn wurde gutgeschrieben');
check(offerendAU6b?.amount === winAU6b, 'AU-6b fr:offerend trägt den vollen Betrag');
check(offerendAU6b?.reason === 'auto',
	'AU-6b [M4] fr:offerend trägt reason "auto" — nicht von einer Handbedienung (REWARD) zu unterscheiden'
	+ ` wäre sonst ein Fehler (gefunden: ${offerendAU6b?.reason})`);
check([...Object.values(mAU6b.riskButtons), ...Object.values(mAU6b.riskStartButtons)]
	.every((b) => !b.classList.contains('fr-btn--invite')),
	'AU-6b keines der elf Risiko-Bedienteile lädt noch ein');

mAU6b.auto.destroy();
mAU6b.machine.destroy();
mAU6b.risk.destroy();
mAU6b.bank.destroy();
mAU6b.wallet.destroy();

console.log('\nAU-6c — Einschalten während einer laufenden Leiter: sie steigt aus und schreibt gut (Auslegung,'
	+ ' siehe DECISIONS.md)');

const mAU6c = buildFullMachineWithRiskAndAuto();
await credit.set(5000);
await mAU6c.wallet.machineCredit.insert(1000);
await advance(50);

press(mAU6c.startButton);
await advance(6000);
const groupAU6c = GROUPS.find((g) => g.id === 'risk');
climb(mAU6c, groupAU6c, 1);
check(mAU6c.root.dataset.frRiskPhase === 'ladder', 'AU-6c die Leiter läuft (ein Treffer, Stufe 2)');
const winAU6c = Number(mAU6c.root.dataset.frRiskWin);

const creditBeforeAU6c = mAU6c.wallet.machineCredit.amount;
let offerendAU6c = null;
mAU6c.root.addEventListener('fr:offerend', (event) => { offerendAU6c = event.detail; });

press(mAU6c.autoButton);

check(mAU6c.root.dataset.frRiskPhase === 'off', 'AU-6c die Leiter ist beendet — sie steigt aus');
check(mAU6c.wallet.machineCredit.amount === creditBeforeAU6c + winAU6c,
	'AU-6c der aktuelle Leiterstand wurde gutgeschrieben');
check(offerendAU6c?.reason === 'ladder-collect' && offerendAU6c?.amount === winAU6c,
	'AU-6c fr:offerend trägt reason "ladder-collect" mit dem vollen Leiterstand');

mAU6c.auto.destroy();
mAU6c.machine.destroy();
mAU6c.risk.destroy();
mAU6c.bank.destroy();
mAU6c.wallet.destroy();

/* ==========================================================================
   LR — nach dem Laden, VOR jeder Bedienung, sind alle vier Live-Bereiche leer
   (C.14.12)
   ========================================================================== */

console.log('\nLR-1 — nach dem Aufbau sind alle vier Live-Bereiche leer, vor jeder Bedienung');
{
	/*
	 * Befund aus dem Abnahmetest ("Sichtfeld: Kirsche, Weintraube, …" und
	 * "Kasse: 100, Guthaben: 0" standen im Browser sofort nach dem Laden von
	 * /fruit-risk in den Bereichen "grid" und "credit", VOR jeder Bedienung):
	 * machine.js rief gridAnnouncer.showGrid() im eigenen Konstruktor auf,
	 * und bank.js sagte über paint() beim allerersten, synchronen
	 * subscribe()-Aufruf bereits den Anfangsstand an. Ein role="status", der
	 * sich beim bloßen Aufbau der Seite füllt, liest einem Hilfsmittel eine
	 * ungefragte Ansage vor, ohne dass irgendetwas geschehen ist — genau das
	 * verbietet C.14.12. Diese Prüfung baut ein VOLLSTÄNDIGES Gehäuse
	 * (Machine, Wallet, Bank, RiskPanel, alle vier Live-Bereiche) und
	 * verlangt, dass KEINER der vier Bereiche vor der ersten Bedienung Text
	 * trägt.
	 */
	const lr = buildFullMachineWithRisk();
	const regions = {
		machine: lr.machineRegion,
		grid: lr.gridRegion,
		credit: lr.creditRegion,
		risk: lr.riskRegion,
	};
	for (const [name, region] of Object.entries(regions)) {
		check(region.element !== null, `LR-1 der Live-Bereich "${name}" wurde im Gehäuse gefunden`);
		check(region.element?.textContent === '',
			`LR-1 der Live-Bereich "${name}" ist nach dem Aufbau leer, vor jeder Bedienung`
			+ ` (gefunden: ${JSON.stringify(region.element?.textContent)})`);
	}

	lr.machine.destroy();
	lr.risk.destroy();
	lr.bank.destroy();
	lr.wallet.destroy();
}

/* ==========================================================================
   D — KEIN Messpunkt ist doppelt belegt (generische Prüfung, das GANZE Feld
   der README-Tabelle "Messpunkte")
   ========================================================================== */

/**
 * Zählt, wie viele Elemente im Teilbaum ab node ein bestimmtes dataset-Feld
 * TRAGEN (Wert nicht undefined).
 *
 * @param {StubElement} node
 * @param {string} key camelCase-Name im dataset, z. B. "frCashoutOn"
 * @returns {number}
 */
function countDatasetField(node, key) {
	let count = node.dataset[key] !== undefined ? 1 : 0;
	for (const child of node.children) {
		count += countDatasetField(child, key);
	}
	return count;
}

console.log('\nD-1 — KEIN Messpunkt aus der README-Tabelle "Messpunkte" ist doppelt belegt (generisch, über das'
	+ ' GANZE Feld, nicht nur einen benannten Namen)');
{
	/*
	 * Entstanden aus T-84 (`data-fr-sound`, `verify-sound.mjs`): die dortige
	 * erste Fassung fragte nur nach genau diesem einen Namen ab. Auf
	 * denselben Fehlertyp durchsucht, fand sich sofort ein zweiter,
	 * unbenannter Fall — `data-fr-cashout` (`bank.js`) trug dieselbe
	 * Krankheit: eine Bedienteil-Kennung aus dem ausgelieferten HTML UND ein
	 * Zustandsspiegel eines Moduls unter demselben Namen. Eine Prüfung, die
	 * nach einem EINZELNEN Namen fragt, findet immer nur den Fall, den sie
	 * schon kennt. Diese Fassung geht deshalb JEDE Zeile der README-Tabelle
	 * "Messpunkte" durch (measurePointRows, bereits oben für Block V
	 * gelesen) und verlangt für jede: GENAU EIN Element im ganzen Gehäuse
	 * trägt sie. Das ist die richtige Grenze — nicht "trägt IRGENDEIN
	 * beliebiges dataset-Feld mehr als ein Element": Attribute wie
	 * `data-fr-button` (auf allen zwölf Bedienteilen, je mit EIGENEM Wert),
	 * `data-fr-display` (auf den vier Röhrengruppen), `data-fr-coin-add`
	 * (auf den drei Münzbeträgen), `data-fr-line` (auf den 30 Gewinnlinien)
	 * oder `data-fr-name-*` (auf den zwölf Symbolnamen) stehen ABSICHTLICH
	 * auf mehreren Geschwisterelementen — das ist ein Bezeichner mit
	 * wertunterscheidendem Inhalt je Element, kein Messpunkt im Sinn dieser
	 * Tabelle, und eine blinde Zählung über ALLE dataset-Felder trifft genau
	 * diese Fälle als Fehlalarm (so gefunden und verworfen, siehe
	 * DECISIONS.md). Die README-Tabelle selbst ist die richtige Abgrenzung:
	 * sie benennt genau die Attribute, für die "je Attribut genau EIN
	 * Schreiber" überhaupt gilt.
	 *
	 * `buildFullMachineWithRiskAndAuto()` ist die vollständigste Bestückung
	 * dieses Prüfstands: Machine, Wallet, Bank, RiskPanel, AutoPlay, alle
	 * zwölf Bedienteile, CASH OUT, der Münzschlitz, alle vier Live-Bereiche.
	 * Jedes dieser fünf Module schreibt seinen vollständigen Anfangszustand
	 * bereits im eigenen Konstruktor (wallet.js Zeile 174, risk.js
	 * resetAttributes() Zeile 245, auto.js syncAttributes() Zeile 262,
	 * machine.js/bank.js siehe oben) — der Scan direkt nach dem Aufbau sieht
	 * damit bereits ALLE Messpunkte, ohne dass irgendetwas bedient werden
	 * muss.
	 *
	 * sound.js bleibt hier ABSICHTLICH außen vor (seine drei Zeilen werden
	 * übersprungen): es lebt in einem eigenen Prüfstand (verify-sound.mjs,
	 * T-11 unten dort), weil es einen eigenen AudioContext, eigene
	 * Zeitgeber und einen eigenen Satz Web-Audio-Stubs braucht, die dieser
	 * Prüfstand nicht bereitstellt. Es hier zusätzlich zu laden hieße, einen
	 * fünften, hier bislang fremden Satz Ereignis-Zuhörer (fr:round,
	 * fr:state, fr:result, fr:collect, fr:count, fr:coin, fr:cashout,
	 * fr:risk, fr:risktick, fr:auto — praktisch jedes Ereignis, das Block
	 * K/V/R/M/L/AU bereits auf die Millisekunde genau über die virtuelle Uhr
	 * prüfen) unbeteiligt in fast jeden bestehenden Testfall dieser Datei
	 * hineinzuziehen — ein Risiko für 885 bestehende, bereits bewiesene
	 * Prüfungen, das der Fund hier nicht verlangt. Zusammen decken D-1
	 * (dieser Prüfstand) und T-11 (verify-sound.mjs) trotzdem JEDES Modul
	 * ab, das ein data-fr-Attribut auf .fr-machine schreibt — die Summe der
	 * beiden Prüfstände, nicht nur einer, ist „das ganze Feld".
	 */
	const d1 = buildFullMachineWithRiskAndAuto();

	// data-fr-round und data-fr-win (machine.js) stehen NICHT schon im
	// Konstruktor — sie entstehen erst, wenn wirklich eine Runde gezogen
	// wurde. Ohne eine echte Runde bliebe die Prüfung für genau diese beiden
	// Zeilen trivial (0 statt 1 gefunden), ohne dass sie je den scharfen Fall
	// (zwei Träger) hätte prüfen können. Derselbe Weg wie in L-8: START
	// drücken und bis ins Angebot laufen lassen.
	await d1.wallet.machineCredit.insert(1000);
	await advance(50);
	press(d1.startButton);
	await advance(6000);
	check(d1.root.dataset.frRound !== undefined && d1.root.dataset.frWin !== undefined,
		'D-1 eine echte Runde ist gelaufen — data-fr-round und data-fr-win stehen jetzt, bevor sie geprüft werden');

	for (const row of measurePointRows) {
		if (row.writer === 'sound.js') {
			continue;
		}
		const name = datasetName(row.attr);
		const n = countDatasetField(d1.root, name);
		check(n === 1, `D-1 ${row.attr} trägt genau EIN Element im Gehäuse (gefunden: ${n})`);
	}

	d1.auto.destroy();
	d1.machine.destroy();
	d1.risk.destroy();
	d1.bank.destroy();
	d1.wallet.destroy();
}

/* ------------------------------------------------------------- Ergebnis */

console.log(failed
	? '\nERGEBNIS: mindestens eine Prüfung ist fehlgeschlagen.'
	: '\nERGEBNIS: alle Prüfungen bestanden (Block S: Selbstprüfung des Prüfstands,'
	+ ' Block K: Kasse, Einwurf, Auszahlung, doppeltes Einlösen, das Angebot beim'
	+ ' Verlassen der Seite, Block V: der Ereignis- und Messpunktvertrag gegen'
	+ ' README.md und den Quelltext, Block R: 50 Züge mit dem vollständigen'
	+ ' Treiber, die Bilanz stimmt nach jedem einzelnen Schritt, ein zweites'
	+ ' Einlösen bucht nichts, die Übergabestelle für eine künftige Phase F5 trägt,'
	+ ' Block M: der ECHTE machine.js spielt tatsächlich — Zustandsfolge, Ziehung,'
	+ ' Ruhelagen, Reihenfolgesicherung von STOP, fr:spin und der bewusst'
	+ ' unveränderte Abbruch einer laufenden Runde beim Verlassen der Seite, Block L:'
	+ ' die drei ECHTEN Risikospiele — Angebot mit den drei Starttasten, der Start'
	+ ' ohne Wertung, der erste Richtungsdruck als erster Versuch, die'
	+ ' drei Kurven, Gruppen-Isolation, die Blitzsicherheit über 30 s virtueller Uhr,'
	+ ' alle Ausstiegswege, das Verlassen der Seite und die Kappung am Höchststand'
	+ ' des Gerätekredits, Block AU: der ECHTE Auto-Modus — Umschalten, 50 selbst'
	+ ' ausgelöste Züge ohne Leiter mit exakter Bilanz nach jedem einzelnen Zug, der'
	+ ' Gewinn wird sofort gutgeschrieben, die Selbstabschaltung bei zu geringem'
	+ ' Gerätekredit, höchstens ein Zeitgeber, und alle drei Umschaltzeitpunkte,'
	+ ' Block LR: alle vier Live-Bereiche sind nach dem Aufbau leer, vor jeder'
	+ ' Bedienung, Block D: kein Messpunkt ist doppelt belegt — generisch geprüft'
	+ ' über das ganze Feld, nicht nur über einen einzelnen Namen).');

process.exit(failed ? 1 : 0);
