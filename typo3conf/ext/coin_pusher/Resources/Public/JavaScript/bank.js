/**
 * Coin Pusher – die Kasse am Gehäuse
 * ================================
 *
 * Übernahme von video_slot/…/bank.js mit vs- → cp-. Zwei Bedienteile, ein
 * Thema: der Gesamtbestand.
 *
 *   .cp-bank       das beleuchtete Fenster im Sockel, das die KASSE zeigt
 *   .cp-cashout    die Taste CASH OUT auf der Auswurfschale
 *
 * CONCEPT.md B.5.1 verlangt: „Die Kasse ist auf JEDER Seite sichtbar, im Saal
 * am Leuchtschild und am Gerät als eigene Anzeige neben dem Gerätekredit."
 * Auf der Automatenseite gibt es kein Leuchtschild — CONCEPT.md Abschnitt 3.2
 * schließt jeden Kasten neben dem Gerät aus. Also zeichnet das Gerät die
 * Anzeige selbst.
 *
 *
 * WEM WAS GEHÖRT (CONCEPT.md Abschnitt 5, Grundsatz 8)
 * ----------------------------------------------------
 * Diese Datei ist DURCHGEHEND und ALLEIN Eigentümerin von:
 *
 *   .cp-bank__value (data-cp-bank-display)   der Kassenstand am Gerät
 *   .cp-bank__announce                        der Ansage-Bereich für Hilfsmittel
 *   .cp-cashout                                die Auszahl-Taste samt ihrem
 *                                               Leuchten und ihrer Sperre
 *   data-cp-bank            der Kassenstand, von außen ablesbar
 *   data-cp-total            Kasse + Gerätekredit. Darf sich durch Einwurf,
 *                             Münzeinwurf, Gewinn und Auszahlung NIE ändern.
 *   data-cp-cashout          on | off
 *
 * Sie fasst KEINE Nixie-Röhre an. GUTHABEN, MÜNZWERT und IM FELD gehören
 * anderen Modulen. Sie schreibt auch NICHT data-cp-machine-credit und NICHT
 * data-cp-mirror — die gehören wallet.js. Je Attribut genau ein Schreiber.
 *
 * Sie sendet EIN Ereignis am Gehäuse:
 *
 *   cp:cashout   { moved, capped, machineCredit }
 *
 * moved ist, was wirklich in die Kasse gewandert ist, capped meldet die
 * Kappung am Höchststand. Gesendet wird NACH der Buchung und AUSSCHLIESSLICH
 * von der Taste.
 *
 * Der zweite Weg, auf dem derselbe Betrag zurückwandert —
 * machineCredit.close() beim Verlassen der Seite —, läuft NICHT durch diese
 * Methode, sondern durch cashOut() des geteilten Bausteins selbst. Er bleibt
 * deshalb baulich stumm: coin-pusher.js räumt die Klangpulte als ERSTES ab,
 * damit niemand mehr Klang in eine sterbende Seite plant.
 *
 * Umgekehrt gehört ihr der GERÄTEKREDIT NICHT: sie bekommt das Objekt von
 * wallet.js gereicht und liest es. Angelegt und geschlossen wird es
 * ausschließlich dort.
 *
 *
 * WAS CASH OUT TUT UND WAS NICHT — DIE ABGRENZUNG ZU B.5.4
 * -----------------------------------------------------------
 * CONCEPT.md B.5.4 verbietet ausdrücklich eine Taste, die DAS FELD leert und
 * auszahlt. CASH OUT hier bucht ausschließlich den GERÄTEKREDIT zurück —
 * also Geld, das noch NICHT eingeworfen wurde — und rührt das Feld nicht an.
 * Das ist die von B.5.2 verlangte Taste „für einen Automaten" allgemein, und
 * sie ist NICHT die von B.5.4 verbotene Rückstell-Taste, weil dazwischen ein
 * Unterschied liegt, der nicht verhandelbar ist: Gerätekredit ist Geld, das
 * Feld ist Spielmaterial. Diese Datei ruft nirgends storage.clear() und
 * fasst field.js nicht an.
 *
 *
 * DIE TASTE HÖRT AUF click UND NICHT AUF pointerdown
 * --------------------------------------------------
 * CASH OUT ist keine Spielhandlung, sondern das Beenden — und sie muss mit
 * der Tastatur bedienbar sein. Ein click-Zuhörer an einem echten
 * button-Element wird von der Eingabe- UND der Leertaste ausgelöst, ein
 * pointerdown-Zuhörer von keiner von beiden.
 *
 * Ist nichts im Gerät, trägt die Taste aria-disabled="true" (Audit A-06,
 * 2026-09-05/06): sie ist dunkel und tut nichts, bleibt aber im
 * Tastaturweg erreichbar — ein echtes disabled nähme sie aus der
 * Tabulatorfolge und sperrte damit einen Menschen von seiner Auszahlung
 * aus. Das Attribut steht schon im Markup, damit die Taste auch ohne
 * JavaScript nicht so aussieht, als sei sie ein Angebot.
 *
 *
 * WARUM DER KASSENSTAND GESETZT UND NICHT HOCHGEZÄHLT WIRD
 * ----------------------------------------------------------
 * Es gibt in dieser Extension kein Zählwerk (siehe Kopf von nixie.js): am
 * Münzschieber gibt es keinen Gewinn, der in einem Stück ausgezahlt würde.
 * Das Fenster springt deshalb auf den neuen Wert.
 *
 *
 * WAS BEIM VERLASSEN DER SEITE PASSIERT
 * -------------------------------------
 * destroy() meldet ab und räumt seine drei data-Attribute weg. Es zahlt
 * NICHT aus: das tut wallet.js über machineCredit.close(), und zwar genau
 * einmal. Zwei Stellen, die beim Abräumen buchen, wären zwei Wahrheiten
 * über denselben Betrag.
 *
 * In dieser Datei steht kein deutscher Anzeigetext.
 */

import { credit } from '@phomo17/casino-startpage/credit.js';

/** Das Kassenfenster im Sockel. */
const SELECTOR_BANK = '[data-cp-bank-display]';

/** Die Auszahl-Taste auf der Auswurfschale. */
const SELECTOR_CASHOUT = '[data-cp-cashout]';

/** Der Haken, der die Taste leuchten lässt (machine.css, Abschnitt 9). */
const LIT_CLASS = 'cp-cashout--lit';

/** Der Bereich, den nur Hilfsmittel lesen (Machine/Cabinet.html). */
const SELECTOR_ANNOUNCE = '[data-cp-bank-announce]';

/**
 * Ruhezeit vor einer Ansage des Kassenstands, in Millisekunden. Dieselbe
 * wie an den anderen entprellten Ansagen dieses Automaten (nixie.js).
 */
const ANNOUNCE_MS = 700;

/**
 * Die Kasse eines Gehäuses.
 */
export class Bank {
	/**
	 * @param {HTMLElement} root ein .cp-machine
	 * @param {object} machineCredit der Gerätekredit, angelegt in wallet.js
	 * @param {{show: function(string): void, hide: function(): void}} board
	 *        das Meldungsschild — als Objekt übergeben, nicht importiert,
	 *        damit es je Gehäuse bei genau einem bleibt
	 */
	constructor(root, machineCredit, board) {
		this.root = root;
		this.machineCredit = machineCredit;
		this.board = board;

		// Fehlt eines der beiden Bedienteile, tut diese Klasse insoweit
		// nichts. Ein fehlendes Bedienteil ist kein Grund, einen Automaten
		// stillzulegen.
		this.display = root.querySelector(SELECTOR_BANK);
		this.button = root.querySelector(SELECTOR_CASHOUT);

		this.announcer = root.querySelector(SELECTOR_ANNOUNCE);
		this.announceTemplate = this.announcer?.dataset.cpTextBank ?? '';
		if (this.announcer !== null && this.announceTemplate === '') {
			this.announcer = null;
		}

		/** Laufender Ansage-Zeitgeber, oder 0. */
		this.announceTimer = 0;

		/** Wurde schon einmal angesagt? Die erste Ansage wartet nicht. */
		this.announced = false;

		/** @type {Array<{target: EventTarget, type: string, handler: function}>} */
		this.bound = [];

		if (this.button !== null) {
			this.listen(this.button, 'click', () => { void this.cashOut(); });
		}

		// Zwei Anmeldungen, zwei Quellen: der Kassenstand kommt aus credit.js,
		// der Zustand der Taste aus dem Gerätekredit. Beide rufen SOFORT
		// einmal auf (reason: 'subscribe') und setzen damit den
		// Anfangszustand.
		this.unsubscribeBank = credit.subscribe(() => this.paint());
		this.unsubscribeMachine = this.machineCredit.subscribe(() => this.paint());
	}

	/**
	 * @param {EventTarget} target
	 * @param {string} type
	 * @param {function} handler
	 * @returns {void}
	 */
	listen(target, type, handler) {
		target.addEventListener(type, handler);
		this.bound.push({ target, type, handler });
	}

	/**
	 * Bucht den Gerätekredit vollständig in die Kasse zurück (B.5.2). Rührt
	 * das FELD dabei nicht an — B.5.4.
	 *
	 * @returns {Promise<void>}
	 */
	async cashOut() {
		const result = await this.machineCredit.cashOut();
		if (result.capped) {
			this.board.show('capped');
		} else if (result.moved > 0) {
			this.board.hide();
		}

		this.root.dispatchEvent(new CustomEvent('cp:cashout', {
			detail: Object.freeze({
				moved: result.moved,
				capped: result.capped,
				machineCredit: result.amount,
			}),
			bubbles: true,
		}));
	}

	/**
	 * Schreibt Kassenstand, Tastenzustand und die drei data-Attribute.
	 *
	 * data-cp-total darf sich durch Einwurf und Auszahlung nie ändern.
	 *
	 * @returns {void}
	 */
	paint() {
		const bank = credit.balance;
		const machine = this.machineCredit.amount;

		const formatted = credit.format(bank);

		if (this.display !== null && this.display.textContent !== formatted) {
			this.display.textContent = formatted;
		}

		this.announce(formatted);

		const lit = machine > 0;
		if (this.button !== null) {
			this.button.classList.toggle(LIT_CLASS, lit);
			// aria-disabled statt disabled (Audit A-06): eine gesperrte Taste
			// bleibt erreichbar, ein echtes disabled nähme sie aus der
			// Tabulatorfolge.
			if (lit) {
				this.button.removeAttribute('aria-disabled');
			} else {
				this.button.setAttribute('aria-disabled', 'true');
			}
		}

		const data = this.root.dataset;
		data.cpBank = String(bank);
		data.cpTotal = String(bank + machine);
		data.cpCashout = lit ? 'on' : 'off';
	}

	/**
	 * Sagt den Kassenstand an — entprellt.
	 *
	 * @param {string} value der bereits formatierte Kassenstand
	 * @returns {void}
	 */
	announce(value) {
		if (this.announcer === null) {
			return;
		}

		const text = this.announceTemplate.replace('{0}', value);
		if (this.announcer.textContent === text) {
			return;
		}

		this.clearAnnounceTimer();

		if (!this.announced) {
			this.announced = true;
			this.announcer.textContent = text;
			return;
		}

		this.announceTimer = globalThis.setTimeout(() => {
			this.announceTimer = 0;
			this.announcer.textContent = text;
		}, ANNOUNCE_MS);
	}

	/** @returns {void} */
	clearAnnounceTimer() {
		if (this.announceTimer !== 0) {
			globalThis.clearTimeout(this.announceTimer);
			this.announceTimer = 0;
		}
	}

	/**
	 * Meldet alles ab. Es wird dabei NICHT ausgezahlt: siehe Dateikopf.
	 *
	 * @returns {void}
	 */
	destroy() {
		this.unsubscribeBank?.();
		this.unsubscribeBank = null;
		this.unsubscribeMachine?.();
		this.unsubscribeMachine = null;

		this.clearAnnounceTimer();
		if (this.announcer !== null) {
			this.announcer.textContent = '';
		}

		for (const { target, type, handler } of this.bound) {
			target.removeEventListener(type, handler);
		}
		this.bound = [];

		this.button?.classList.remove(LIT_CLASS);

		delete this.root.dataset.cpBank;
		delete this.root.dataset.cpTotal;
		delete this.root.dataset.cpCashout;
	}
}

export default Bank;
