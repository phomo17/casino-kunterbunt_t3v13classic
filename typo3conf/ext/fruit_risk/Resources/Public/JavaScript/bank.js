/**
 * FruitRisk – die Kasse am Gehäuse
 * ===================================
 *
 * Zwei Bedienteile, ein Thema: der Gesamtbestand.
 *
 *   .fr-bank       das beleuchtete Fenster im Sockel, das die KASSE zeigt
 *   .fr-cashout    die Taste CASH OUT auf der Auswurfschale
 *
 * CONCEPT.md B.5.1 verlangt: „Die Kasse ist auf JEDER Seite sichtbar, im
 * Saal am Leuchtschild und am Gerät als eigene Anzeige neben dem
 * Gerätekredit." Auf der Automatenseite gibt es kein Leuchtschild, also
 * zeichnet das Gerät die Anzeige selbst, wie es das für das Guthaben schon
 * immer tut.
 *
 *
 * WARUM NICHT credit-display.js AUS DEM SITE PACKAGE
 * ------------------------------------------------------
 * Dieselbe Begründung wie im Kopf von coinslot.js: credit.js ist der
 * VERTRAG und wird benutzt, credit-display.js ist die Verdrahtung eines
 * BESTIMMTEN MARKUPS. Das Gehäuse hat weder [data-ck-credit-display] noch
 * [data-ck-credit-status]; es hat ein Kassenfenster und eine Tafel. Geteilt
 * wird die Rechnung, nicht das Blech.
 *
 *
 * WEM WAS GEHÖRT (CONCEPT.md Teil A, Abschnitt 5, Grundsatz 8)
 * -------------------------------------------------------------------
 * Diese Datei ist DURCHGEHEND und ALLEIN Eigentümerin von:
 *
 *   .fr-bank__value        der Kassenstand am Gerät
 *   .fr-cashout            die Auszahl-Taste samt ihrem Leuchten und ihrer
 *                          Sperre (aria-disabled)
 *   der Live-Bereich „credit"
 *   data-fr-bank           der Kassenstand, von außen ablesbar
 *   data-fr-total          Kasse + Gerätekredit. Die Bilanz als EINE Zahl:
 *                          sie darf sich durch Einwurf, Einsatz, Gewinn und
 *                          Auszahlung NIE ändern.
 *   data-fr-cashout-on     on | off — NICHT data-fr-cashout: das trägt
 *                          bereits die Taste selbst, als bloße Kennung ohne
 *                          Wert (Behebungslauf, derselbe Fehlertyp wie T-84
 *                          bei data-fr-sound/sound.js)
 *
 * Sie fasst KEINE Nixie-Röhre an. GUTHABEN und EINSATZ gehören wallet.js,
 * GEWINN gehört machine.js, STUFE gehört ab einer künftigen Phase F5
 * risk.js. Zwei Stellen dürfen nie dieselbe Anzeige pflegen.
 *
 * Sie schreibt auch NICHT data-fr-machine-credit und NICHT data-fr-mirror —
 * die gehören wallet.js. Je Attribut genau ein Schreiber.
 *
 * Sie sendet EIN Ereignis am Gehäuse:
 *
 *   fr:cashout   { moved, capped, machineCredit }
 *
 * moved ist, was wirklich in die Kasse gewandert ist, capped meldet die
 * Kappung am Höchststand, machineCredit ist der Rest, der im Gerät stehen
 * bleibt. Gesendet wird NACH der Buchung und AUSSCHLIESSLICH von der Taste.
 *
 * Der zweite Weg, auf dem derselbe Betrag zurückwandert —
 * machineCredit.close() beim Verlassen der Seite —, läuft NICHT durch diese
 * Methode, sondern durch cashOut() des geteilten Bausteins selbst.
 *
 * Umgekehrt gehört ihr der GERÄTEKREDIT NICHT: sie bekommt das Objekt von
 * wallet.js gereicht und liest es. Angelegt (openMachineCredit) und
 * geschlossen (close) wird es ausschließlich dort.
 *
 *
 * DIE TASTE HÖRT AUF click UND NICHT AUF pointerdown
 * -------------------------------------------------------
 * Das ist eine bewusste Abweichung von START, STOP und REWARD. Jene drei
 * sind Spieltasten: sie sollen im Moment des Drückens wirken, deshalb hängen
 * sie an pointerdown. CASH OUT ist keine Spielhandlung, sondern das Beenden.
 * Ein click-Zuhörer an einem echten button-Element wird von der Eingabe-
 * UND der Leertaste ausgelöst, ein pointerdown-Zuhörer von keiner von
 * beiden.
 *
 * Ist nichts im Gerät, trägt die Taste aria-disabled="true": sie ist dunkel
 * und tut nichts, bleibt aber im Tastaturweg erreichbar — ein echtes
 * disabled nähme sie aus der Tabulatorfolge. Die eigentliche Sperre besteht
 * in cashOut() selbst, das bei Gerätekredit 0 ein folgenloses No-op ist
 * (machine-credit.js).
 *
 *
 * DER LIVE-BEREICH „CREDIT" TRÄGT EINEN SATZ FÜR BEIDE ZAHLEN
 * ----------------------------------------------------------------
 * Der Bereich „credit" ist einer von vier (CONCEPT.md C.14.12), und zwei
 * Schreiber in einem Bereich wären zwei Wahrheiten. Diese Datei sieht beide
 * Zahlen ohnehin, weil sie an beiden Quellen hängt (credit.js und dem
 * Gerätekredit); also sagt sie beide, in EINEM Satz. Die Röhren und das
 * Kassenfenster tragen aria-hidden — deshalb steht hier der GANZE Satz und
 * nicht nur eine Zahl.
 *
 * paint() bekommt den reason der jeweiligen Quelle durchgereicht und sagt
 * beim allerersten, synchronen Aufruf (reason 'subscribe', direkt aus dem
 * Konstruktor, vor jeder Bedienung) NICHTS an — nur die sichtbare Anzeige
 * bekommt sofort ihren Anfangsstand. Ohne diese Ausnahme läse ein Hilfsmittel
 * beim bloßen Laden der Seite bereits „Kasse: …, Guthaben: …" vor, obwohl
 * niemand etwas getan hat (Abnahmetest, Befund „zwei Live-Bereiche füllen
 * sich beim Laden von selbst").
 *
 *
 * WAS BEIM VERLASSEN DER SEITE PASSIERT
 * -------------------------------------------
 * destroy() meldet ab und räumt seine data-Attribute weg. Es zahlt NICHT
 * aus: das tut wallet.js über machineCredit.close(), und zwar genau einmal.
 * Der Live-Bereich selbst wird NICHT hier zerstört — er gehört fruit-risk.js,
 * das ihn allen Modulen reicht.
 *
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Die Meldungen kommen aus
 * der Sprachdatei über die Tafel (message.js).
 */

import { credit } from '@phomo17/casino-startpage/credit.js';

/** Das Kassenfenster im Sockel. */
const SELECTOR_BANK = '[data-fr-bank-display]';

/** Die Auszahl-Taste auf der Auswurfschale. */
const SELECTOR_CASHOUT = '[data-fr-cashout]';

/** Der Haken, der die Taste leuchten lässt (machine.css, §8). */
const LIT_CLASS = 'fr-cashout--lit';

/**
 * Die Kasse eines Gehäuses.
 */
export class Bank {
	/**
	 * @param {HTMLElement} root ein .fr-machine
	 * @param {object} machineCredit der Gerätekredit, angelegt in wallet.js
	 * @param {{show: function(string): void, hide: function(): void}} board
	 *        die Tafel — als Objekt übergeben, nicht importiert
	 * @param {import('./announce.js').LiveRegion} region der Bereich „credit"
	 * @throws {Error} wenn das Gehäuse nicht dem Markup aus Phase F4 entspricht
	 */
	constructor(root, machineCredit, board, region) {
		const cabinet = root.querySelector('.fr-cabinet');
		if (cabinet === null) {
			throw new Error('Kein .fr-cabinet im Automaten gefunden.');
		}

		this.root = root;
		this.cabinet = cabinet;
		this.machineCredit = machineCredit;
		this.board = board;
		this.region = region;

		// Fehlt eines der beiden Bedienteile, tut diese Klasse insoweit
		// nichts. Ein fehlendes Bedienteil ist kein Grund, einen Automaten
		// stillzulegen.
		this.display = cabinet.querySelector(SELECTOR_BANK);
		this.button = cabinet.querySelector(SELECTOR_CASHOUT);

		// Der Satz für beide Zahlen. Fehlt das Attribut, wird EINMAL
		// gemeldet und danach geschwiegen — eine Meldung je paint() wäre
		// eine Konsole voller Zeilen.
		this.template = this.region.data.frTextCredit ?? '';
		this.templateWarned = false;

		/** @type {Array<{target: EventTarget, type: string, handler: function}>} */
		this.bound = [];

		if (this.button !== null) {
			this.listen(this.button, 'click', () => { void this.cashOut(); });
		}

		// Zwei Anmeldungen, zwei Quellen: der Kassenstand kommt aus
		// credit.js, der Gerätekredit aus dem übergebenen Objekt. Beide
		// rufen SOFORT einmal auf (reason: 'subscribe') und setzen damit
		// den Anfangszustand — die SICHTBARE Anzeige, nicht den Live-Bereich
		// (siehe paint(): C.14.12 verlangt, dass die vier Bereiche leer
		// ausgeliefert werden UND leer bleiben, bis wirklich etwas
		// geschieht; der Anfangsstand beim Seitenaufbau ist keine
		// Änderungsmeldung).
		this.unsubscribeBank = credit.subscribe((detail) => this.paint(detail.reason));
		this.unsubscribeMachine = this.machineCredit.subscribe((detail) => this.paint(detail.reason));
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
	 * Bucht den Gerätekredit vollständig in die Kasse zurück (B.5.2).
	 *
	 * Die Kappung am Höchststand kommt aus machine-credit.js: passt nicht
	 * alles hinein, bleibt der Rest im Gerät stehen und „KONTO VOLL" sagt
	 * es. Verschwinden kann dabei nichts.
	 *
	 * @returns {Promise<void>}
	 */
	async cashOut() {
		try {
			const result = await this.machineCredit.cashOut();
			if (result.capped) {
				this.board.show('capped');
			} else if (result.moved > 0) {
				this.board.hide();
			}

			// Nach der Buchung, mit den Zahlen, die die Schnittstelle SELBST
			// gemeldet hat — nicht mit nachgerechneten.
			this.root.dispatchEvent(new CustomEvent('fr:cashout', {
				detail: Object.freeze({
					moved: result.moved,
					capped: result.capped,
					machineCredit: result.amount,
				}),
				bubbles: true,
			}));
		} catch (error) {
			console.error('[fruit-risk] Die Auszahlung ist fehlgeschlagen.', error);
		}
	}

	/**
	 * Sagt Kasse UND Gerätekredit in EINEM Satz an — entprellt (über den
	 * Live-Bereich).
	 *
	 * Warum beide zusammen: der Bereich „credit" ist einer von vier
	 * (C.14.12), und zwei Schreiber in einem Bereich wären zwei Wahrheiten.
	 * Diese Datei sieht beide Zahlen ohnehin, weil sie an beiden Quellen
	 * hängt; also sagt sie beide. Die Röhren und das Kassenfenster tragen
	 * aria-hidden — deshalb steht hier der GANZE Satz und nicht nur die
	 * Zahl.
	 *
	 * @returns {void}
	 */
	announce() {
		if (this.template === '') {
			if (!this.templateWarned) {
				this.templateWarned = true;
				console.error('[fruit-risk] Am Live-Bereich "credit" fehlt data-fr-text-credit.');
			}
			return;
		}
		this.region.say(this.template
			.replace('{0}', credit.format(credit.balance))
			.replace('{1}', credit.format(this.machineCredit.amount)));
	}

	/**
	 * Schreibt Kassenstand, Tastenzustand und die drei data-Attribute.
	 *
	 * data-fr-total ist der eigentliche Nachweis dieser Phase: die Summe aus
	 * Kasse und Gerätekredit. Sie darf sich durch Einwurf und Auszahlung nie
	 * ändern; Einsatz und Gewinn verschieben sie um genau den Betrag, der
	 * gesetzt bzw. gewonnen wurde. Damit ist die Bilanz im DOM messbar statt
	 * eine Glaubensfrage.
	 *
	 * Behebungslauf (Abnahmetest, Befund „zwei Live-Bereiche füllen sich beim
	 * Laden von selbst"): reason ist 'subscribe' GENAU EINMAL je Quelle, beim
	 * synchronen Erstaufruf in subscribe() — noch bevor irgendjemand etwas
	 * bedient hat. Die SICHTBARE Anzeige (Kassenfenster, Taste, data-fr-*)
	 * bekommt ihren Anfangsstand trotzdem sofort, wie schon immer; nur die
	 * ANSAGE bleibt dabei aus (C.14.12: die vier Live-Bereiche werden leer
	 * ausgeliefert und bleiben es, bis wirklich etwas geschieht). Jeder
	 * spätere Aufruf trägt einen anderen reason (credit.js: 'deposit' u. a.;
	 * machine-credit.js: 'insert'/'cashout'/'stake'/'award'/…) und sagt
	 * normal an.
	 *
	 * @param {string} [reason] der Anlass des jeweiligen Aufrufs
	 * @returns {void}
	 */
	paint(reason) {
		const bank = credit.balance;
		const machine = this.machineCredit.amount;

		const formatted = credit.format(bank);

		if (this.display !== null && this.display.textContent !== formatted) {
			this.display.textContent = formatted;
		}

		if (reason !== 'subscribe') {
			this.announce();
		}

		const lit = machine > 0;
		if (this.button !== null) {
			this.button.classList.toggle(LIT_CLASS, lit);
			// aria-disabled statt disabled: eine gesperrte Taste bleibt
			// erreichbar, die Sperre selbst besteht in cashOut(), das bei
			// Gerätekredit 0 ein folgenloses No-op ist. Ein echtes disabled
			// nähme die Taste aus der Tabulatorfolge.
			if (lit) {
				this.button.removeAttribute('aria-disabled');
			} else {
				this.button.setAttribute('aria-disabled', 'true');
			}
		}

		const data = this.root.dataset;
		data.frBank = String(bank);
		data.frTotal = String(bank + machine);
		// data-fr-cashout-on, NICHT data-fr-cashout: dieselbe Falle wie
		// T-84 bei sound.js — die Taste selbst trägt data-fr-cashout bereits
		// als bloße Kennung ohne Wert (Cabinet.html), mit der der
		// Konstruktor oben sie findet (SELECTOR_CASHOUT). Ein Zustandsspiegel
		// unter demselben Namen auf .fr-machine liefe zur Laufzeit zwei
		// Elemente mit demselben Attribut.
		data.frCashoutOn = lit ? 'on' : 'off';
	}

	/**
	 * Meldet alles ab. Wird beim Verlassen der Seite gerufen.
	 *
	 * Es wird dabei NICHT ausgezahlt: siehe Dateikopf. Der Live-Bereich
	 * selbst wird NICHT hier zerstört — er gehört fruit-risk.js.
	 *
	 * @returns {void}
	 */
	destroy() {
		this.unsubscribeBank?.();
		this.unsubscribeBank = null;
		this.unsubscribeMachine?.();
		this.unsubscribeMachine = null;

		for (const { target, type, handler } of this.bound) {
			target.removeEventListener(type, handler);
		}
		this.bound = [];

		this.button?.classList.remove(LIT_CLASS);

		// Der Zustand gehört zum laufenden Betrieb, nicht zum Gehäuse.
		delete this.root.dataset.frBank;
		delete this.root.dataset.frTotal;
		delete this.root.dataset.frCashoutOn;
	}
}

export default Bank;
