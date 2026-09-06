/**
 * Coin Pusher – eine Nixie-Röhrengruppe ansteuern
 * =============================================================
 *
 * Der Treiber der elf Röhren. Er findet eine Gruppe über
 * [data-cp-display="…"], verteilt eine Zahl auf ihre Röhren und pflegt den
 * unsichtbaren Ansagebereich daneben.
 *
 * Vorbild ist video_slot/nixie.js; übernommen werden Aufbau,
 * Ziffernverteilung, Führungsnullen, der Zündvorgang (cp-nixie--strike für
 * einen Helligkeitseinbruch im Moment des Ziffernwechsels) und die
 * Überlaufanzeige. ZWEI Vereinfachungen gegenüber dem Vorbild:
 *
 * 1. KEINE ZÄHLFAHRT. Der Video Slot lässt einen Gewinn hochzählen
 *    (counter.js) und koppelt daran eine aufsteigende Tonfolge. Am
 *    Münzschieber gibt es keinen Gewinn, der in einem Stück ausgezahlt
 *    würde — es gibt einzelne Münzen, die einzeln fallen. Jede ändert das
 *    Guthaben um ihren eigenen Wert, und jede hat ihren eigenen Klang. Eine
 *    Zählfahrt hier wäre eine erfundene Spannung, und CONCEPT.md B.7
 *    verbietet akustische Spannungstricks ausdrücklich. GUTHABEN wird
 *    deshalb GESETZT, nicht gefahren. Es gibt kein counter.js in dieser
 *    Extension — das Überlaufblinken (cp-nixie-group--overflow), das der
 *    Video Slot dort führt, steht deshalb hier in set().
 * 2. DIE ANSAGE WIRD ENTPRELLT, wie am Video Slot: die erste sofort, danach
 *    frühestens nach 700 ms. Bei einem Regen aus zwanzig Münzen soll ein
 *    Bildschirmleser den Endstand sagen, nicht zwanzig Zwischenstände. Die
 *    sichtbaren Röhren bleiben unentprellt — das Auge kommt mit, das Ohr
 *    nicht.
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Der Satz der Ansage
 * kommt aus der Sprachdatei und reist als data-Attribut ins Dokument.
 */

/**
 * Dauer des Zündvorgangs beim Ziffernwechsel. Muss zu @keyframes
 * cp-nixie-strike in machine.css passen (dort 200 ms); die zehn
 * Millisekunden Zuschlag verhindern, dass die Klasse abgeräumt wird, bevor
 * das letzte Bild gezeichnet ist.
 */
const STRIKE_MS = 210;

/** Der Bereich, den nur Hilfsmittel lesen (Machine/NixieGroup.html). */
const SELECTOR_ANNOUNCE = '[data-cp-announce]';

/** Die gezeichneten Röhren einer Gruppe. */
const SELECTOR_TUBES = '.cp-nixie';

/**
 * Ruhezeit vor einer Ansage, in Millisekunden. Dieselbe wie an den anderen
 * entprellten Ansagen dieses Automaten (bank.js).
 */
const ANNOUNCE_MS = 700;

/** Klasse, die eine übergelaufene Gruppe blinken lässt (machine.css, Abschnitt 4). */
const OVERFLOW_CLASS = 'cp-nixie-group--overflow';

/**
 * Bringt einen beliebigen Wert in die Form, die eine Röhrenanzeige zeigen
 * kann: eine ganze Zahl ab 0.
 *
 * @param {number} value
 * @returns {number}
 */
function normalise(value) {
	if (!Number.isFinite(value)) {
		return 0;
	}
	return Math.max(0, Math.trunc(value));
}

/**
 * Eine beschriftete Gruppe gleichartiger Röhren.
 */
export class NixieDisplay {
	/**
	 * @param {HTMLElement} root ein Vorfahre der Gruppe, z. B. .cp-machine
	 * @param {string} displayKey 'guthaben' | 'muenzwert' | 'feld'
	 */
	constructor(root, displayKey) {
		this.element = root.querySelector(`.cp-nixie-group[data-cp-display="${displayKey}"]`);

		/** @type {HTMLElement[]} */
		this.tubes = this.element === null ? [] : [...this.element.querySelectorAll(SELECTOR_TUBES)];

		/** Höchster Wert, den diese Gruppe darstellen kann. */
		this.ceiling = this.tubes.length === 0 ? 0 : 10 ** this.tubes.length - 1;

		/** Laufende Zündvorgänge, damit destroy() sie abräumen kann. */
		this.timers = new Set();

		// Der Bereich für Hilfsmittel und sein Satzbau. Fehlt der Bereich,
		// arbeitet die Gruppe still weiter; ein fehlendes Bedienteil ist kein
		// Grund, einen Automaten stillzulegen (gleiche Haltung wie
		// findNixie() weiter unten).
		this.announcer = this.element === null ? null : this.element.querySelector(SELECTOR_ANNOUNCE);
		this.announceTemplate = this.announcer?.dataset.cpTextDisplay ?? '';
		if (this.announcer !== null && this.announceTemplate === '') {
			this.announcer = null;
		}

		/** Laufender Ansage-Zeitgeber, oder 0. */
		this.announceTimer = 0;

		/** Wurde schon einmal angesagt? Die erste Ansage wartet nicht. */
		this.announced = false;
	}

	/**
	 * Zeigt eine Zahl an, rechtsbündig mit führenden Nullen; setzt die
	 * Ansage entprellt nach.
	 *
	 * Passt die Zahl nicht in die vorhandenen Stellen, zeigt die Gruppe
	 * lauter Neunen und blinkt (cp-nixie-group--overflow) — das Verhalten
	 * einer echten Röhrenanzeige.
	 *
	 * @param {number} value
	 * @returns {void}
	 */
	set(value) {
		if (this.element === null) {
			return;
		}
		const whole = normalise(value);
		const text = String(whole);
		const digits = text.length > this.tubes.length
			? '9'.repeat(this.tubes.length)
			: text.padStart(this.tubes.length, '0');

		for (let i = 0; i < this.tubes.length; i++) {
			this.setTube(this.tubes[i], Number(digits[i]));
		}

		this.element.classList.toggle(OVERFLOW_CLASS, whole > this.ceiling);

		this.announce(String(this.tubes.length === 0 ? whole : Number(digits)));
	}

	/**
	 * Löscht die Gruppe – alle Röhren unbeschickt (--cp-digit: -1).
	 *
	 * @returns {void}
	 */
	blank() {
		if (this.element === null) {
			return;
		}
		for (const tube of this.tubes) {
			this.setTube(tube, -1);
		}
		this.element.classList.remove(OVERFLOW_CLASS);
		// Dunkle Röhren zeigen keinen Wert — dann steht auch kein Satz da.
		this.announce(null);
	}

	/**
	 * Setzt eine einzelne Röhre und zündet sie, falls sich etwas ändert.
	 *
	 * @param {HTMLElement} tube
	 * @param {number} digit 0 bis 9, oder −1 für dunkel
	 * @returns {void}
	 */
	setTube(tube, digit) {
		const current = tube.style.getPropertyValue('--cp-digit').trim();
		if (current === String(digit)) {
			return;
		}

		tube.style.setProperty('--cp-digit', String(digit));

		// Der kurze Helligkeitseinbruch im Moment des Wechsels. Die Klasse
		// wird erst entfernt und dann – nach einem erzwungenen Umbruch –
		// neu gesetzt, damit die Animation auch bei zwei Wechseln kurz
		// hintereinander wirklich neu anläuft.
		tube.classList.remove('cp-nixie--strike');
		void tube.offsetWidth;
		tube.classList.add('cp-nixie--strike');

		const timer = globalThis.setTimeout(() => {
			tube.classList.remove('cp-nixie--strike');
			this.timers.delete(timer);
		}, STRIKE_MS);
		this.timers.add(timer);
	}

	/**
	 * Sagt den Stand der Gruppe an — entprellt.
	 *
	 * Geschrieben wird in den unsichtbaren Bereich mit role="status"
	 * (Machine/NixieGroup.html). Erst dessen Textänderung löst die Ansage
	 * aus; die Röhren daneben tragen aria-hidden und sind für Hilfsmittel gar
	 * nicht da. Deshalb steht hier der GANZE Satz und nicht nur die Zahl.
	 *
	 * Die allererste Ansage geht ohne Wartezeit hinaus. Sie fällt in den
	 * Seitenaufbau und ist damit keine Meldung „es hat sich etwas geändert",
	 * sondern der Anfangsstand.
	 *
	 * @param {?string} value die anzusagende Zahl, oder null für „dunkel"
	 * @returns {void}
	 */
	announce(value) {
		if (this.announcer === null) {
			return;
		}

		const text = value === null ? '' : this.announceTemplate.replace('{0}', value);
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
	 * Räumt laufende Zeitgeber ab. Wird beim Verlassen der Seite gerufen.
	 *
	 * @returns {void}
	 */
	destroy() {
		for (const timer of this.timers) {
			globalThis.clearTimeout(timer);
		}
		this.timers.clear();

		this.clearAnnounceTimer();
		if (this.announcer !== null) {
			this.announcer.textContent = '';
		}
		this.element?.classList.remove(OVERFLOW_CLASS);
	}
}

/**
 * Sucht eine Röhrengruppe an ihrem Namensschild.
 *
 * @param {HTMLElement} root ein Vorfahre der Gruppe
 * @param {string} displayKey 'guthaben' | 'muenzwert' | 'feld'
 * @returns {?NixieDisplay} null, wenn die Gruppe fehlt – der Automat spielt
 *          dann ohne diese Anzeige weiter, statt mit einem Fehler auszusteigen
 */
export function findNixie(root, displayKey) {
	const display = new NixieDisplay(root, displayKey);
	return display.element === null ? null : display;
}

export default NixieDisplay;
