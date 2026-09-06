/**
 * FruitRisk – der Geldeinwurf am Gehäuse
 * =========================================
 *
 * CONCEPT.md B.5.2: über den Münzschlitz am Gehäuse wirft der Spieler einen
 * Betrag AUS DER KASSE in das Gerät ein: Schnellwerte und freier Betrag, aber
 * die Quelle ist die Kasse, nicht das Nichts. Mehr als der Kassenbestand kann
 * nicht eingeworfen werden.
 *
 * Die Buchung läuft über machineCredit.insert(): statt Kredite aus dem
 * Nichts zu erzeugen, verschiebt der Einwurf sie aus der Kasse in dieses
 * Gerät. Die Bilanz kann sich dabei nicht ändern — insert() bucht erst aus
 * der Kasse ab und schreibt erst danach dem Gerät gut, nie umgekehrt.
 *
 * ALLES ODER NICHTS: reicht die Kasse für den gewählten Betrag nicht, wird
 * NICHTS bewegt und die Tafel zeigt „KASSE ZU GERING". Das ist dieselbe
 * Zusage, die credit.subtract() schon gibt, und die verständlichere: wer 100
 * wirft und 40 hat, bekommt eine Auskunft statt einer stillen Teilbuchung,
 * die er nicht verlangt hat.
 *
 * Den Gerätekredit legt diese Datei NICHT an — sie bekommt ihn von wallet.js
 * gereicht. Je Schlüssel und Seite gibt es genau einen.
 *
 *
 * WO DER EINWURF SITZT
 * ----------------------
 * In der Geldreihe des Sockels (Cabinet.html, Abschnitt „Geldeinwurf am
 * Sockel"; die Fassung steht im Shell-SVG). Der gezeichnete Münzschlitz in
 * der Mitte ist der Auslöser: man wirft ein, indem man in den Schlitz
 * greift. Er ist absichtlich KEIN type="submit" (Behebungslauf
 * REVIEW-fruitrisk-f4.md [L4]): ohne JavaScript oder bevor dieses Modul
 * geladen ist, hätte ein echtes Formular-Submit die Seite neu geladen und
 * eine Rückmeldung gegeben, die es nicht einlösen kann. Klick auf den
 * Schlitz und die Eingabetaste im Feld werden deshalb hier je selbst über
 * eigene Zuhörer (click bzw. keydown) verdrahtet, nicht über den
 * Formular-Mechanismus des Browsers.
 *
 * Die beiden unsichtbaren Beschriftungen (.fr-coinslot__legend) stehen schon
 * im Markup: jedes Eingabefeld und jeder Knopf braucht einen Namen, und am
 * Gehäuse ist dafür kein Platz.
 *
 *
 * WARUM NICHT credit-display.js AUS DEM SITE PACKAGE
 * -----------------------------------------------------
 * casino_startpage liefert zwei Module. credit.js ist der VERTRAG und wird
 * hier benutzt — es ist die einzige erlaubte Tür zum Speicher.
 * credit-display.js ist dagegen die Verdrahtung EINES BESTIMMTEN MARKUPS: es
 * schreibt eine formatierte Zahl in [data-ck-credit-display] und braucht
 * eine Statuszeile [data-ck-credit-status]. Das Gehäuse hat weder das eine
 * noch das andere — es hat Nixie-Röhren und eine Tafel. Übernähme es das
 * fremde Markup, hinge sein Gehäuse an den ck-credit__*-Stilen des
 * Leuchtschildes; genau die Kopplung, die casino_startpage/README.md
 * ausschließt.
 *
 *
 * DIE MÜNZE
 * ---------
 * Die Einwurf-Animation ist reines CSS (@keyframes fr-coin-drop). Diese
 * Datei setzt nur eine Klasse und nimmt sie nach 480 ms wieder ab. Sie läuft,
 * sobald der Betrag GÜLTIG ist — also im Moment des Drückens, nicht erst
 * nach der Gutschrift. Das ist die richtige Reihenfolge: die Münze fällt,
 * während die Mechanik zählt, nicht danach. Bei einem ungültigen Betrag
 * fällt keine Münze; dann war nichts in der Hand.
 *
 *
 * IN DIESER DATEI STEHT KEIN DEUTSCHER ANZEIGETEXT
 * ----------------------------------------------------
 * Die Meldungen kommen aus der Sprachdatei über die Tafel (message.js). Was
 * hier an Text steht, sind Entwicklermeldungen für die Browserkonsole.
 */

/** Das Formular des Einwurfs am Gehäuse. */
const SELECTOR_FORM = '[data-fr-coinslot]';

/** Ein Schnellwert-Knopf; sein Betrag steht im Attribut. */
const SELECTOR_ADD = '[data-fr-coin-add]';

/** Das Feld für den freien Betrag. */
const SELECTOR_INPUT = '[data-fr-coin-input]';

/** Der unsichtbare Knopf über dem gezeichneten Schlitz. */
const SELECTOR_SLOT = '[data-fr-coin-insert]';

/** Die fallende Münze. */
const SELECTOR_COIN = '[data-fr-coin]';

const COIN_CLASS = 'fr-coinslot__coin--drop';
const SLOT_CLASS = 'fr-coinslot__slot--flash';

/**
 * Laufzeit der Münzanimation in Millisekunden.
 *
 * Muss zu @keyframes fr-coin-drop in machine.css passen (dort 460 ms); die
 * zwanzig Millisekunden Zuschlag verhindern, dass die Klasse abgeräumt wird,
 * bevor das letzte Bild gezeichnet ist. Dieselbe Vorsichtsmaßnahme wie beim
 * Zündvorgang der Röhren in nixie.js.
 */
const COIN_MS = 480;

/**
 * Der Geldeinwurf eines Gehäuses.
 */
export class CoinSlot {
	/**
	 * @param {HTMLElement} root das .fr-machine
	 * @param {{show: function(string): void, hide: function(): void}} board
	 *        die Tafel — als Objekt übergeben, nicht importiert, damit diese
	 *        Datei und wallet.js sich nicht gegenseitig importieren
	 * @param {object} machineCredit der Gerätekredit dieses Gehäuses. Er
	 *        kennt die Kasse und verschiebt zwischen beiden. Aus demselben
	 *        Grund übergeben und nicht selbst angelegt: es gibt je Gehäuse
	 *        genau einen, und angelegt wird er in wallet.js.
	 */
	constructor(root, board, machineCredit) {
		this.root = root;
		this.board = board;
		this.machineCredit = machineCredit;

		this.form = root.querySelector(SELECTOR_FORM);
		this.input = this.form === null ? null : this.form.querySelector(SELECTOR_INPUT);
		this.slot = this.form === null ? null : this.form.querySelector(SELECTOR_SLOT);
		this.coin = this.form === null ? null : this.form.querySelector(SELECTOR_COIN);

		/** @type {HTMLElement[]} */
		this.quickButtons = this.form === null ? [] : [...this.form.querySelectorAll(SELECTOR_ADD)];

		/** Laufender Zeitgeber der Münzanimation, oder 0. */
		this.coinTimer = 0;

		/** @type {Array<{target: EventTarget, type: string, handler: function}>} */
		this.bound = [];

		// Fehlt das Formular, tut diese Klasse nichts. Ein Gehäuse ohne
		// Einwurf ist kein Fehler, den man laut melden müsste.
		if (this.form === null) {
			return;
		}

		this.wire();
	}

	/**
	 * Meldet alle Zuhörer an und merkt sie sich, damit destroy() sie wieder
	 * loswird.
	 *
	 * @returns {void}
	 */
	wire() {
		for (const button of this.quickButtons) {
			this.listen(button, 'click', () => {
				const amount = Number.parseInt(button.dataset.frCoinAdd ?? '', 10);
				void this.insert(amount);
			});
		}

		// Behebungslauf REVIEW-fruitrisk-f4.md [L4]: data-fr-coin-insert ist
		// jetzt type="button" (Cabinet.html) und löst NICHT mehr automatisch
		// ein Formular-Submit aus — ohne JavaScript oder bevor dieses Modul
		// geladen ist, tut der Schlitz deshalb einfach nichts, statt die
		// Seite neu zu laden. Klick auf den Schlitz UND die Eingabetaste im
		// Feld werden deshalb hier je eigens verdrahtet.
		if (this.slot !== null) {
			this.listen(this.slot, 'click', () => {
				void this.submitCustomAmount();
			});
		}
		if (this.input !== null) {
			this.listen(this.input, 'keydown', (event) => {
				if (event.key !== 'Enter') {
					return;
				}
				event.preventDefault();
				void this.submitCustomAmount();
			});
		}

		// Bleibt als Sicherheitsnetz stehen: kein Bedienweg dieser Datei löst
		// ein Formular-Submit mehr aus, aber falls doch einmal eines
		// entstünde (etwa durch ein künftiges type="submit" an anderer
		// Stelle), lädt es nicht die Seite neu.
		this.listen(this.form, 'submit', (event) => {
			event.preventDefault();
			void this.submitCustomAmount();
		});
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
	 * Liest das Feld für den freien Betrag und wirft ein.
	 *
	 * Zum Verhalten bei der Eingabe 0 oder einer negativen Zahl: das Feld
	 * trägt min="1", also blockt die Formularprüfung des Browsers das
	 * Absenden schon vorher und zeigt ihre eigene Sprechblase — der eigene
	 * Hinweis erscheint dann gar nicht. Bei leerem oder unsinnigem Feld
	 * greift der eigene Hinweis wie vorgesehen.
	 *
	 * WARUM Number() UND NICHT Number.parseInt() (Behebungslauf
	 * REVIEW-fruitrisk-f4.md [M3]): ein input[type="number"] mit step="1"
	 * lässt nach HTML-Spezifikation auch die Exponentialschreibweise ("1e5")
	 * als formal gültige Zahl durch — die Formularprüfung des Browsers greift
	 * dort also NICHT. Number.parseInt('1e5', 10) läse das als 1, weil es am
	 * ersten nicht-numerischen Zeichen abbricht; Number('1e5') liefert
	 * korrekt 100000. insert() prüft das Ergebnis ohnehin mit
	 * Number.isInteger, ein nicht-ganzzahliger Betrag (etwa "1.5e3") fällt
	 * also weiterhin auf BETRAG UNGÜLTIG.
	 *
	 * @returns {Promise<void>}
	 */
	async submitCustomAmount() {
		if (this.input === null) {
			return;
		}
		const amount = Number(this.input.value.trim());
		if (await this.insert(amount)) {
			// Nur nach erfolgreichem Einwurf leeren. Bei einem ungültigen
			// Betrag bleibt die Eingabe stehen, damit man sie berichtigen
			// kann statt sie neu zu tippen.
			this.input.value = '';
		}
	}

	/**
	 * Wirft einen Betrag aus der Kasse in das Gerät.
	 *
	 * Die Prüfung ist absichtlich strenger als insert(): dort ist ein
	 * ungültiger Betrag ein Programmierfehler und wird als RangeError
	 * geworfen. Hier ist er eine Fehleingabe eines Menschen und damit ein
	 * normaler Betriebsfall — er wird abgefangen, bevor die Schnittstelle
	 * ihn zu sehen bekommt, und als Meldung am Gehäuse beantwortet.
	 *
	 * Die Münze fällt auch dann, wenn die Kasse absagt: sie war in der Hand,
	 * der Druck ist angekommen, und die Tafel sagt im selben Augenblick
	 * warum. Eine Münze, die bei „KASSE ZU GERING" gar nicht erst erscheint,
	 * ließe offen, ob überhaupt etwas passiert ist.
	 *
	 * @param {number} amount
	 * @returns {Promise<boolean>} true, wenn etwas ins Gerät gewandert ist
	 */
	async insert(amount) {
		if (!Number.isInteger(amount) || amount < 1 || amount > this.machineCredit.MAX) {
			this.board.show('invalid');
			return false;
		}

		// Erst die Münze, dann die Buchung: physisch fällt sie im Moment
		// des Drückens, nicht nach der Verrechnung.
		this.playCoin();

		const result = await this.machineCredit.insert(amount);

		if (result.ok !== true) {
			// 'nocash'  die Kasse gibt so viel nicht her (B.5.2)
			// 'full'    der Gerätekredit steht am Höchststand
			// 'closed'  die Seite räumt gerade ab; im Betrieb unerreichbar,
			//            deshalb ohne eigene Meldung mit 'nocash' zusammen
			this.board.show(result.reason === 'full' ? 'capped' : 'nocash');
		} else {
			this.board.hide();
		}

		this.root.dispatchEvent(new CustomEvent('fr:coin', {
			detail: Object.freeze({
				amount,
				moved: result.ok === true ? result.moved : 0,
				reason: result.ok === true ? 'ok' : result.reason,
				machineCredit: result.amount,
			}),
			bubbles: true,
		}));

		// Nur nach einem geglückten Einwurf soll der Aufrufer das
		// Eingabefeld leeren; sonst bleibt die Eingabe stehen, damit man sie
		// berichtigen kann statt sie neu zu tippen.
		return result.ok === true && result.moved > 0;
	}

	/**
	 * Lässt eine Münze in den Schlitz fallen und den Schlitz kurz
	 * aufleuchten.
	 *
	 * Die Klasse wird erst entfernt und dann – nach einem erzwungenen
	 * Umbruch – neu gesetzt, damit die Animation auch bei zwei Einwürfen
	 * kurz hintereinander wirklich neu anläuft. Ohne den Umbruch fasst der
	 * Browser Abnehmen und Anlegen zu „keine Änderung" zusammen und die
	 * zweite Münze fällt nie. Dasselbe Verfahren wie beim Zündvorgang in
	 * nixie.js.
	 *
	 * @returns {void}
	 */
	playCoin() {
		if (this.coin === null) {
			return;
		}

		this.clearCoinTimer();

		this.coin.classList.remove(COIN_CLASS);
		this.slot?.classList.remove(SLOT_CLASS);
		void this.coin.offsetWidth;
		this.coin.classList.add(COIN_CLASS);
		this.slot?.classList.add(SLOT_CLASS);

		this.coinTimer = globalThis.setTimeout(() => {
			this.coinTimer = 0;
			this.coin?.classList.remove(COIN_CLASS);
			this.slot?.classList.remove(SLOT_CLASS);
		}, COIN_MS);
	}

	/** @returns {void} */
	clearCoinTimer() {
		if (this.coinTimer !== 0) {
			globalThis.clearTimeout(this.coinTimer);
			this.coinTimer = 0;
		}
	}

	/**
	 * Meldet alle Zuhörer ab und räumt den Zeitgeber weg. Wird beim
	 * Verlassen der Seite gerufen.
	 *
	 * @returns {void}
	 */
	destroy() {
		this.clearCoinTimer();
		this.coin?.classList.remove(COIN_CLASS);
		this.slot?.classList.remove(SLOT_CLASS);

		for (const { target, type, handler } of this.bound) {
			target.removeEventListener(type, handler);
		}
		this.bound = [];
	}
}

export default CoinSlot;
