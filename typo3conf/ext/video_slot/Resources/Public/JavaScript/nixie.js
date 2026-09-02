/**
 * Video Slot – eine Nixie-Röhrengruppe ansteuern
 * =============================================================
 *
 * Zeichengleiche Übernahme der Bauform aus reel_slot/nixie.js, mit
 * vs-Präfixen.
 *
 * Eine Nixie-Röhre ist eine Glasröhre mit zehn übereinanderliegenden
 * Drahtziffern; genau eine davon glüht. machine.css bildet das ohne
 * JavaScript ab: jede Röhre trägt zehn deckungsgleiche Kathoden, und
 * --vs-digit entscheidet rein rechnerisch, welche leuchtet. −1 lässt alle
 * dunkel.
 *
 * Diese Datei tut deshalb sehr wenig: sie zerlegt eine Zahl in Ziffern und
 * setzt je Röhre eine Eigenschaft. Am gezeichneten Markup ändert sie nichts.
 *
 * Phase 6 steuert damit nur GEWINN. Phase 7 bekommt GUTHABEN, EINSATZ und
 * STUFE geschenkt, ohne hier etwas ändern zu müssen — deshalb steht die
 * Klasse schon jetzt in einer eigenen Datei und nicht in machine.js.
 *
 *
 * DER ANSAGEBEREICH GEHÖRT DIESER DATEI
 * --------------------------------------------------
 * NixieGroup.html liefert je Gruppe EINEN leeren Bereich mit role="status"
 * aus; die gezeichneten Röhren daneben tragen aria-hidden. Eine Nixie zeigt
 * ihre Ziffer nur als Form, nicht als Text — ohne diesen Bereich ist die
 * Anzeige für ein Hilfsmittel gar nicht da.
 *
 * Gefüllt wird er ausschließlich hier, und zwar genau dort, wo auch die
 * Röhren gesetzt werden: in show() und clear(). Damit gilt für die Ansage
 * dieselbe Eigentümerregel wie für die Ziffern — wer eine Gruppe steuert,
 * steuert ihre Ansage mit, und keine zweite Stelle schreibt in denselben
 * Bereich.
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Der Satz kommt aus der
 * Sprachdatei und reist als data-Attribut ins Dokument; was hier steht, ist
 * eine Entwicklermeldung für die Konsole.
 */

/**
 * Dauer des Zündvorgangs beim Ziffernwechsel. Muss zur Animation
 * vs-nixie-strike in machine.css passen (dort 200 ms); die zehn
 * Millisekunden Zuschlag verhindern, dass die Klasse abgeräumt wird, bevor
 * das letzte Bild gezeichnet ist.
 */
const STRIKE_MS = 210;

/** Der Bereich, den nur Hilfsmittel lesen (NixieGroup.html). */
const SELECTOR_ANNOUNCE = '[data-vs-announce]';

/**
 * Ruhezeit vor einer Ansage, in Millisekunden. Dieselbe wie an anderen
 * entprellten Ansagen dieses Automaten — zwei verschiedene Ruhezeiten am
 * selben Gerät wären für das Ohr ein Rhythmuswechsel ohne Grund.
 */
const ANNOUNCE_MS = 700;

/**
 * Eine beschriftete Gruppe gleichartiger Röhren.
 */
export class NixieGroup {
	/**
	 * @param {HTMLElement} element ein .vs-nixie-group
	 */
	constructor(element) {
		this.element = element;
		/** @type {HTMLElement[]} */
		this.tubes = [...element.querySelectorAll('.vs-nixie')];
		/** Laufende Zündvorgänge, damit destroy() sie abräumen kann. */
		this.timers = new Set();

		// Der Bereich für Hilfsmittel und sein Satzbau. Fehlt der Bereich —
		// altes Markup —, arbeitet die Gruppe still weiter; ein fehlendes
		// Bedienteil ist kein Grund, einen Automaten stillzulegen (gleiche
		// Haltung wie findNixieGroup() weiter unten). Fehlt umgekehrt nur die
		// Vorlage, wird EINMAL gemeldet und danach geschwiegen — eine Meldung
		// je Ziffernwechsel wäre eine Konsole voller Zeilen.
		this.announcer = element.querySelector(SELECTOR_ANNOUNCE);
		this.announceTemplate = this.announcer?.dataset.vsTextDisplay ?? '';
		if (this.announcer !== null && this.announceTemplate === '') {
			console.error('[video-slot] An einer Röhrengruppe fehlt data-vs-text-display.');
			this.announcer = null;
		}

		/** Laufender Ansage-Zeitgeber, oder 0. */
		this.announceTimer = 0;

		/** Wurde schon einmal angesagt? Die erste Ansage wartet nicht. */
		this.announced = false;
	}

	/** Anzahl der Röhren – die Stellenzahl der Gruppe. */
	get length() {
		return this.tubes.length;
	}

	/**
	 * Zeigt eine ganze Zahl an, rechtsbündig mit führenden Nullen.
	 *
	 * Passt die Zahl nicht in die vorhandenen Stellen, zeigt die Gruppe lauter
	 * Neunen — das Verhalten einer echten Röhrenanzeige. In Phase 6 kann es
	 * nicht vorkommen — der höchste Gewinn ist 900 × 10 —, aber die
	 * Risiko-Leiter aus Phase 7 verdoppelt ohne Grenze.
	 *
	 * @param {number} value ganze Zahl ab 0
	 * @returns {void}
	 */
	show(value) {
		const whole = Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0));
		const text = String(whole);
		const digits = text.length > this.length
			? '9'.repeat(this.length)
			: text.padStart(this.length, '0');

		for (let i = 0; i < this.length; i++) {
			this.setTube(this.tubes[i], Number(digits[i]));
		}

		// Dieselbe Zahl noch einmal, für Hilfsmittel — verzögert, siehe
		// announce(). Angesagt wird, was WIRKLICH in den Röhren steht: also
		// ohne die führenden Nullen, aber mit den Neunen des Überlaufs. Und
		// als EINE Zahl, wie ein Mensch sie spräche, nicht Ziffer für Ziffer.
		this.announce(String(this.length === 0 ? whole : Number(digits)));
	}

	/**
	 * Löscht die Gruppe – alle Röhren unbeschickt.
	 *
	 * @returns {void}
	 */
	clear() {
		for (const tube of this.tubes) {
			this.setTube(tube, -1);
		}

		// Dunkle Röhren zeigen keinen Wert — dann steht auch kein Satz da.
		// „Gewinn: 0" wäre etwas anderes als eine unbeschickte Anzeige.
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
		const current = tube.style.getPropertyValue('--vs-digit').trim();
		if (current === String(digit)) {
			return;
		}

		tube.style.setProperty('--vs-digit', String(digit));

		// Der kurze Helligkeitseinbruch im Moment des Wechsels. Die Klasse
		// wird erst entfernt und dann – nach einem erzwungenen Umbruch – neu
		// gesetzt, damit die Animation auch bei zwei Wechseln kurz
		// hintereinander wirklich neu anläuft.
		tube.classList.remove('vs-nixie--strike');
		void tube.offsetWidth;
		tube.classList.add('vs-nixie--strike');

		const timer = globalThis.setTimeout(() => {
			tube.classList.remove('vs-nixie--strike');
			this.timers.delete(timer);
		}, STRIKE_MS);
		this.timers.add(timer);
	}

	/**
	 * Sagt den Stand der Gruppe an — entprellt.
	 *
	 * Geschrieben wird in den unsichtbaren Bereich mit role="status"
	 * (NixieGroup.html). Erst dessen Textänderung löst die Ansage aus; die
	 * Röhren daneben tragen aria-hidden und sind für Hilfsmittel gar nicht da.
	 * Deshalb steht hier der GANZE Satz und nicht nur die Zahl.
	 *
	 * Die allererste Ansage geht ohne Wartezeit hinaus. Sie fällt in den
	 * Seitenaufbau und ist damit keine Meldung „es hat sich etwas geändert",
	 * sondern der Anfangsstand — sie soll dastehen, sobald das Gerät steht.
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
			// Nichts geändert — kein Schreiben, keine Ansage. show() läuft auch
			// dann, wenn dieselbe Zahl noch einmal gesetzt wird.
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
	 * Räumt laufende Zeitgeber ab. Wird von video-slot.js beim Verlassen der
	 * Seite aufgerufen.
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
	}
}

/**
 * Sucht eine Röhrengruppe an ihrem Namensschild.
 *
 * @param {Element} root das Gehäuse
 * @param {string} name 'guthaben' | 'einsatz' | 'stufe' | 'gewinn'
 * @returns {?NixieGroup} null, wenn die Gruppe fehlt – der Automat spielt
 *          dann ohne diese Anzeige weiter, statt mit einem Fehler auszusteigen
 */
export function findNixieGroup(root, name) {
	const element = root.querySelector(`.vs-nixie-group[data-vs-display="${name}"]`);
	return element === null ? null : new NixieGroup(element);
}

export default NixieGroup;
