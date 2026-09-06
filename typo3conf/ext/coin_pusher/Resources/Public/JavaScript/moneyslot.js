/**
 * Coin Pusher – der Geldeinwurf am Sockel
 * ======================================================
 *
 * Übernahme von video_slot/…/coinslot.js (Kasse → Gerätekredit) mit
 * vs- → cp-, data-vs-* → data-cp-* und den Klassen cp-coinslot__coin--drop /
 * cp-coinslot__slot--flash.
 *
 * NICHT ZU VERWECHSELN mit coinslot.js, dem Münzeinwurf ÜBER DEM FELD: dieser
 * hier nimmt Geld aus der KASSE und macht daraus GERÄTEKREDIT; jener nimmt
 * Geld aus dem GERÄTEKREDIT und macht daraus SPIELMATERIAL (B.5.4). An
 * diesem Gerät gibt es ZWEI Einwürfe, und der Name „coinslot" gehört dem, der
 * wirklich MÜNZEN einwirft — der Geldeinwurf heißt deshalb moneyslot.js
 * (DECISIONS.md).
 *
 * CONCEPT.md B.5.2: „Über den Münzschlitz am Gehäuse wirft der Spieler einen
 * Betrag AUS DER KASSE in das Gerät ein: Schnellwerte und freier Betrag, aber
 * die Quelle ist die Kasse. Mehr als der Kassenbestand kann nicht eingeworfen
 * werden." Abschnitt 3.2 verbietet dafür jede Schaltfläche und jeden Kasten
 * NEBEN dem Gerät — alles gehört auf das Gehäuse.
 *
 * Die Buchung läuft über machineCredit.insert(): statt Kredite aus dem
 * Nichts zu erzeugen, verschiebt der Einwurf sie aus der Kasse in dieses
 * Gerät. Die Bilanz kann sich dabei nicht ändern — insert() bucht erst aus
 * der Kasse ab und schreibt erst danach dem Gerät gut, nie umgekehrt.
 *
 * ALLES ODER NICHTS: reicht die Kasse für den gewählten Betrag nicht, wird
 * NICHTS bewegt und das Schild zeigt „KASSE ZU GERING".
 *
 * Den Gerätekredit legt diese Datei NICHT an — sie bekommt ihn von wallet.js
 * gereicht. Je Schlüssel und Seite gibt es genau einen.
 *
 *
 * DIE MÜNZE
 * ---------
 * Die Einwurf-Animation ist reines CSS (@keyframes cp-coin-drop). Diese
 * Datei setzt nur eine Klasse und nimmt sie nach 460 ms wieder ab. Sie läuft,
 * sobald der Betrag GÜLTIG ist — also im Moment des Drückens, nicht erst
 * nach der Gutschrift.
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Die Meldungen kommen aus
 * der Sprachdatei über das Meldungsschild (message.js).
 */

/** Das Formular des Einwurfs am Gehäuse. */
const SELECTOR_FORM = '[data-cp-coinslot]';

/** Ein Schnellwert-Knopf; sein Betrag steht im Attribut. */
const SELECTOR_ADD = '[data-cp-coin-add]';

/** Das Feld für den freien Betrag. */
const SELECTOR_INPUT = '[data-cp-coin-input]';

/** Der unsichtbare Absendeknopf über dem gezeichneten Schlitz. */
const SELECTOR_SLOT = '[data-cp-coin-insert]';

/** Die fallende Münze. */
const SELECTOR_COIN = '[data-cp-coin]';

const COIN_CLASS = 'cp-coinslot__coin--drop';
const SLOT_CLASS = 'cp-coinslot__slot--flash';

/**
 * Laufzeit der Münzanimation in Millisekunden. Muss zu @keyframes
 * cp-coin-drop in machine.css passen (dort 460 ms); die zwanzig
 * Millisekunden Zuschlag verhindern, dass die Klasse abgeräumt wird, bevor
 * das letzte Bild gezeichnet ist.
 */
const COIN_MS = 480;

/**
 * Der Geldeinwurf eines Gehäuses.
 */
export class MoneySlot {
	/**
	 * @param {HTMLElement} root das .cp-machine
	 * @param {{show: function(string): void, hide: function(): void}} board
	 *        das Meldungsschild
	 * @param {object} machineCredit der Gerätekredit dieses Gehäuses
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
				const amount = Number.parseInt(button.dataset.cpCoinAdd ?? '', 10);
				void this.insert(amount);
			});
		}

		this.listen(this.form, 'submit', (event) => {
			// Ohne das lädt das Formular die Seite neu.
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
	 * @returns {Promise<void>}
	 */
	async submitCustomAmount() {
		if (this.input === null) {
			return;
		}
		const amount = Number.parseInt(this.input.value.trim(), 10);
		if (await this.insert(amount)) {
			// Nur nach erfolgreichem Einwurf leeren.
			this.input.value = '';
		}
	}

	/**
	 * Wirft einen Betrag aus der Kasse in das Gerät.
	 *
	 * Die Münze fällt auch dann, wenn die Kasse absagt: sie war in der Hand,
	 * der Druck ist angekommen, und das Schild sagt im selben Augenblick
	 * warum.
	 *
	 * @param {number} amount
	 * @returns {Promise<boolean>} true, wenn etwas ins Gerät gewandert ist
	 */
	async insert(amount) {
		if (!Number.isInteger(amount) || amount < 1 || amount > this.machineCredit.MAX) {
			this.board.show('invalid');
			return false;
		}

		// Erst die Münze, dann die Buchung.
		this.playCoin();

		const result = await this.machineCredit.insert(amount);

		if (result.ok !== true) {
			// 'nocash'  die Kasse gibt so viel nicht her (B.5.2)
			// 'full'    der Gerätekredit steht am Höchststand
			// 'closed'  die Seite räumt gerade ab; im Betrieb unerreichbar
			this.board.show(result.reason === 'full' ? 'capped' : 'nocash');
		} else {
			this.board.hide();
		}

		this.root.dispatchEvent(new CustomEvent('cp:coin', {
			detail: Object.freeze({
				amount,
				moved: result.ok === true ? result.moved : 0,
				reason: result.ok === true ? 'ok' : result.reason,
				machineCredit: result.amount,
			}),
			bubbles: true,
		}));

		return result.ok === true && result.moved > 0;
	}

	/**
	 * Lässt eine Münze in den Schlitz fallen und den Schlitz kurz aufleuchten.
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
	 * Meldet alle Zuhörer ab und räumt den Zeitgeber weg.
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

export default MoneySlot;
