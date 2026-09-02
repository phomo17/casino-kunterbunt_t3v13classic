/**
 * Reel Slot – der Geldeinwurf am Gehäuse
 * ======================================================
 *
 * CONCEPT.md B.5.2: „Über den Münzschlitz am Gehäuse wirft der Spieler einen
 * Betrag AUS DER KASSE in das Gerät ein: Schnellwerte und freier Betrag wie
 * bisher, aber die Quelle ist jetzt die Kasse, nicht das Nichts. Mehr als der
 * Kassenbestand kann nicht eingeworfen werden." Abschnitt 3.2 verbietet dafür
 * jede Schaltfläche und jeden Kasten NEBEN dem Gerät — alles gehört auf das
 * Gehäuse.
 *
 * Der einzige Unterschied zu Ausbaustufe 1 ist damit die Buchung: aus
 * credit.add() ist machineCredit.insert() geworden. Statt Kredite aus dem
 * Nichts zu erzeugen, verschiebt der Einwurf sie aus der Kasse in dieses
 * Gerät. Die Bilanz kann sich dabei nicht ändern — insert() bucht erst aus der
 * Kasse ab und schreibt erst danach dem Gerät gut, nie umgekehrt.
 *
 * ALLES ODER NICHTS: reicht die Kasse für den gewählten Betrag nicht, wird
 * NICHTS bewegt und das Schild zeigt „KASSE ZU GERING". Das ist dieselbe
 * Zusage, die credit.subtract() schon gibt, und die verständlichere: wer 100
 * wirft und 40 hat, bekommt eine Auskunft statt einer stillen Teilbuchung, die
 * er nicht verlangt hat.
 *
 * Den Gerätekredit legt diese Datei NICHT an — sie bekommt ihn von wallet.js
 * gereicht. Je Schlüssel und Seite gibt es genau einen.
 *
 *
 * WO DER EINWURF SITZT
 * --------------------
 * In der Sockelreihe, die Phase 5 dafür freigelassen hat. Der Kopf von
 * machine.css nennt sie im Maßraster; das Shell-SVG hält an derselben Stelle
 * ausdrücklich Platz frei („Der Platz links (x 8–28) und rechts (x 66–78) in
 * dieser Reihe bleibt frei — dort kommen in Phase 7 die Aufladeknöpfe hin").
 *
 *   x  8–28    drei Messingknöpfe +10 / +50 / +100
 *   x 30–37    der gezeichnete Münzschlitz — hier fällt die Münze hinein,
 *              und ein unsichtbarer Knopf darüber macht ihn bedienbar
 *   x 41–62    der gezeichnete Geldscheineinzug, reine Zierde
 *   x 66–78    das Feld für den freien Betrag
 *
 * Der Münzschlitz ist zugleich der Absendeknopf des Formulars. Man wirft ein,
 * indem man in den Schlitz greift — nicht, indem man auf eine Schaltfläche
 * daneben drückt. Zusätzlich löst die Eingabetaste im Feld denselben Weg aus,
 * weil das bei einem Formular so gehört.
 *
 *
 * WARUM NICHT credit-display.js AUS DEM SITE PACKAGE
 * --------------------------------------------------
 * casino_startpage liefert zwei Module. credit.js ist der VERTRAG und wird hier
 * benutzt — es ist laut CONCEPT.md Abschnitt 3.6 die einzige erlaubte Tür zum
 * Speicher. credit-display.js ist dagegen die Verdrahtung EINES BESTIMMTEN
 * MARKUPS: es schreibt eine formatierte Zahl in [data-ck-credit-display] und
 * braucht eine Statuszeile [data-ck-credit-status]. Der Automat hat weder das
 * eine noch das andere — er hat Nixie-Röhren und ein Meldungsschild. Übernähme
 * er das fremde Markup, hinge sein Gehäuse an den ck-credit__*-Stilen des
 * Leuchtschildes; genau die Kopplung, die die README dieser Extension
 * ausschließt. casino_startpage/README.md sagt es selbst: „Ein Automat, der
 * seine Anzeige selbst zeichnet, importiert nur credit.js."
 *
 * Automat Nummer zwei erbt daraus den Vertrag und das Muster — Formular am
 * Gehäuse, data-Haken, Texte aus XLIFF, credit.add() —, nicht das Markup. Jede
 * Bauform hat einen anderen Einwurf. Geteilt wird die Rechnung, nicht das Blech.
 *
 *
 * DIE MÜNZE
 * ---------
 * Die Einwurf-Animation ist reines CSS (@keyframes rs-coin-drop). Diese Datei
 * setzt nur eine Klasse und nimmt sie nach 480 ms wieder ab. Sie läuft, sobald
 * der Betrag GÜLTIG ist — also im Moment des Drückens, nicht erst nach der
 * Gutschrift. Das ist die richtige Reihenfolge: die Münze fällt, während die
 * Mechanik zählt, nicht danach. Bei einem ungültigen Betrag fällt keine Münze;
 * dann war nichts in der Hand.
 *
 *
 * IN DIESER DATEI STEHT KEIN DEUTSCHER ANZEIGETEXT
 * ------------------------------------------------
 * Die Meldungen kommen aus der Sprachdatei über das Meldungsschild
 * (message.js). Was hier an Text steht, sind Entwicklermeldungen für die
 * Browserkonsole.
 */

/** Das Formular des Einwurfs am Gehäuse. */
const SELECTOR_FORM = '[data-rs-coinslot]';

/** Ein Schnellwert-Knopf; sein Betrag steht im Attribut. */
const SELECTOR_ADD = '[data-rs-coin-add]';

/** Das Feld für den freien Betrag. */
const SELECTOR_INPUT = '[data-rs-coin-input]';

/** Der unsichtbare Knopf über dem gezeichneten Schlitz. */
const SELECTOR_SLOT = '[data-rs-coin-insert]';

/** Die fallende Münze. */
const SELECTOR_COIN = '[data-rs-coin]';

const COIN_CLASS = 'rs-coinslot__coin--drop';
const SLOT_CLASS = 'rs-coinslot__slot--flash';

/**
 * Laufzeit der Münzanimation in Millisekunden.
 *
 * Muss zu @keyframes rs-coin-drop in machine.css passen (dort 460 ms); die
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
	 * @param {HTMLElement} root das .rs-machine
	 * @param {{show: function(string): void, hide: function(): void}} board
	 *        das Meldungsschild — als Objekt übergeben, nicht importiert, damit
	 *        diese Datei und wallet.js sich nicht gegenseitig importieren
	 * @param {object} machineCredit der Gerätekredit dieses Gehäuses. Er kennt
	 *        die Kasse und verschiebt zwischen beiden. Aus demselben Grund
	 *        übergeben und nicht selbst angelegt: es gibt je Gehäuse genau
	 *        einen, und angelegt wird er in wallet.js.
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

		// Fehlt das Formular, tut diese Klasse nichts. Ein Gehäuse ohne Einwurf
		// ist kein Fehler, den man laut melden müsste — es ist ein Gehäuse ohne
		// Einwurf. Dieselbe Haltung wie findNixieGroup() in nixie.js.
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
				const amount = Number.parseInt(button.dataset.rsCoinAdd ?? '', 10);
				void this.insert(amount);
			});
		}

		this.listen(this.form, 'submit', (event) => {
			// Ohne das lädt das Formular die Seite neu und der Automat wäre nach
			// jedem Einwurf zurückgesetzt.
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
	 * Zum Verhalten bei der Eingabe 0 oder einer negativen Zahl: das Feld trägt
	 * min="1", also blockt die Formularprüfung des Browsers das Absenden schon
	 * vorher und zeigt ihre eigene Sprechblase — der eigene Hinweis erscheint
	 * dann gar nicht. Das ist richtiges Verhalten und in DECISIONS.md, Phase 3
	 * für das Leuchtschild im Saal bereits als Randbefund festgehalten. Bei
	 * leerem oder unsinnigem Feld greift der eigene Hinweis wie vorgesehen.
	 *
	 * @returns {Promise<void>}
	 */
	async submitCustomAmount() {
		if (this.input === null) {
			return;
		}
		const amount = Number.parseInt(this.input.value.trim(), 10);
		if (await this.insert(amount)) {
			// Nur nach erfolgreichem Einwurf leeren. Bei einem ungültigen Betrag
			// bleibt die Eingabe stehen, damit man sie berichtigen kann statt
			// sie neu zu tippen.
			this.input.value = '';
		}
	}

	/**
	 * Wirft einen Betrag aus der Kasse in das Gerät.
	 *
	 * Die Prüfung ist absichtlich strenger als insert(): dort ist ein
	 * ungültiger Betrag ein Programmierfehler und wird als RangeError geworfen
	 * (siehe casino_startpage/README.md). Hier ist er eine Fehleingabe eines
	 * Menschen und damit ein normaler Betriebsfall — er wird abgefangen, bevor
	 * die Schnittstelle ihn zu sehen bekommt, und als Meldung am Gehäuse
	 * beantwortet.
	 *
	 * Die Münze fällt auch dann, wenn die Kasse absagt: sie war in der Hand,
	 * der Druck ist angekommen, und das Schild sagt im selben Augenblick warum.
	 * Eine Münze, die bei „KASSE ZU GERING" gar nicht erst erscheint, ließe
	 * offen, ob überhaupt etwas passiert ist.
	 *
	 * @param {number} amount
	 * @returns {Promise<boolean>} true, wenn etwas ins Gerät gewandert ist
	 */
	async insert(amount) {
		if (!Number.isInteger(amount) || amount < 1 || amount > this.machineCredit.MAX) {
			this.board.show('invalid');
			return false;
		}

		// Erst die Münze, dann die Buchung: physisch fällt sie im Moment des
		// Drückens, nicht nach der Verrechnung.
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

		this.root.dispatchEvent(new CustomEvent('rs:coin', {
			detail: Object.freeze({
				amount,
				moved: result.ok === true ? result.moved : 0,
				reason: result.ok === true ? 'ok' : result.reason,
				machineCredit: result.amount,
			}),
			bubbles: true,
		}));

		// Nur nach einem geglückten Einwurf soll der Aufrufer das Eingabefeld
		// leeren; sonst bleibt die Eingabe stehen, damit man sie berichtigen
		// kann statt sie neu zu tippen.
		return result.ok === true && result.moved > 0;
	}

	/**
	 * Lässt eine Münze in den Schlitz fallen und den Schlitz kurz aufleuchten.
	 *
	 * Die Klasse wird erst entfernt und dann – nach einem erzwungenen Umbruch –
	 * neu gesetzt, damit die Animation auch bei zwei Einwürfen kurz
	 * hintereinander wirklich neu anläuft. Ohne den Umbruch fasst der Browser
	 * Abnehmen und Anlegen zu „keine Änderung" zusammen und die zweite Münze
	 * fällt nie. Dasselbe Verfahren wie beim Zündvorgang in nixie.js.
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
	 * Meldet alle Zuhörer ab und räumt den Zeitgeber weg. Wird beim Verlassen
	 * der Seite gerufen; Phase 9 verlangt das ausdrücklich.
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
