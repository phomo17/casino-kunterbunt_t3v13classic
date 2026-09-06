/**
 * Reel Slot – eine Nixie-Röhrengruppe ansteuern
 * =============================================================
 *
 * Eine Nixie-Röhre ist eine Glasröhre mit zehn übereinanderliegenden
 * Drahtziffern; genau eine davon glüht. machine.css bildet das ohne
 * JavaScript ab: jede Röhre trägt zehn deckungsgleiche Kathoden, und
 * --rs-digit entscheidet rein rechnerisch, welche leuchtet. −1 lässt alle
 * dunkel (DECISIONS.md, Phase 5).
 *
 * Diese Datei tut deshalb sehr wenig: sie zerlegt eine Zahl in Ziffern und
 * setzt je Röhre eine Eigenschaft. Am gezeichneten Markup ändert sie nichts.
 *
 * Phase 6 steuert damit nur GEWINN. Phase 7 bekommt GUTHABEN und EINSATZ
 * geschenkt, ohne hier etwas ändern zu müssen — deshalb steht die Klasse
 * schon jetzt in einer eigenen Datei und nicht in machine.js.
 *
 *
 * DER ANSAGEBEREICH GEHÖRT DIESER DATEI (Audit R-01)
 * --------------------------------------------------
 * NixieGroup.html liefert je Gruppe EINEN leeren Bereich mit role="status"
 * aus; die gezeichneten Röhren daneben tragen aria-hidden. Eine Nixie zeigt
 * ihre Ziffer nur als Form, nicht als Text — ohne diesen Bereich ist die
 * Anzeige für ein Hilfsmittel gar nicht da.
 *
 * Gefüllt wird er ausschließlich hier, und zwar genau dort, wo auch die
 * Röhren gesetzt werden: in show() und clear(). Damit gilt für die Ansage
 * dieselbe Eigentümerregel wie für die Ziffern (CONCEPT.md Abschnitt 5,
 * Grundsatz 8) — wer eine Gruppe steuert, steuert ihre Ansage mit, und keine
 * zweite Stelle schreibt in denselben Bereich.
 *
 * Das Muster ist von bank.js übernommen: Satzvorlage aus einem data-Attribut,
 * erste Ansage sofort, danach entprellt, Zeitgeber im destroy() abgeräumt.
 * Warum entprellt: siehe ANNOUNCE_MS.
 *
 * SEIT DEM AUDIT-NACHLAUF (2026-09-05/06, Befund N-04) lassen sich show()
 * und clear() STILL aufrufen (zweites Argument false): counter.js braucht
 * das für den allerersten Anfangsstand beim Seitenaufbau (GUTHABEN,
 * EINSATZ) — die sichtbaren Röhren sollen sofort ihren Startwert zeigen,
 * der Live-Bereich aber leer bleiben, bis wirklich eine Bedienhandlung
 * stattgefunden hat (C.14.12 sinngemäß auf dieses Gerät übertragen: ein
 * Hilfsmittel las beim bloßen Laden der Seite sonst „Guthaben: 0" und
 * „Einsatz: 1" vor, ohne dass jemand etwas getan hätte). Übernommene
 * Bauform aus video_slot/nixie.js, das dasselbe Argument bereits für die
 * Gruppe „stufe" der Risiko-Leiter kennt.
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Der Satz kommt aus der
 * Sprachdatei und reist als data-Attribut ins Dokument (CONCEPT.md
 * Abschnitt 4); was hier steht, ist eine Entwicklermeldung für die Konsole.
 */

/**
 * Dauer des Zündvorgangs beim Ziffernwechsel. Muss zur Animation
 * rs-nixie-strike in machine.css passen (dort 200 ms); die zehn
 * Millisekunden Zuschlag verhindern, dass die Klasse abgeräumt wird, bevor
 * das letzte Bild gezeichnet ist.
 */
const STRIKE_MS = 210;

/** Der Bereich, den nur Hilfsmittel lesen (NixieGroup.html, Audit R-01). */
const SELECTOR_ANNOUNCE = '[data-rs-announce]';

/**
 * Ruhezeit vor einer Ansage, in Millisekunden. Dieselbe wie am Kassenfenster
 * (bank.js) — zwei verschiedene Ruhezeiten am selben Gerät wären für das Ohr
 * ein Rhythmuswechsel ohne Grund.
 *
 * Eine Zählfahrt ändert den Wert dutzendfach in kurzer Folge (counter.js
 * setzt alle 70 ms eine neue Zahl). Angesagt wird deshalb erst, wenn so lange
 * keine neue Änderung mehr kam; aus einer Fahrt wird EINE Ansage mit dem
 * Endstand. Die sichtbaren Röhren warten NICHT — das Auge kommt mit, das Ohr
 * nicht.
 */
const ANNOUNCE_MS = 700;

/**
 * Eine beschriftete Gruppe gleichartiger Röhren.
 */
export class NixieGroup {
	/**
	 * @param {HTMLElement} element ein .rs-nixie-group
	 */
	constructor(element) {
		this.element = element;
		/** @type {HTMLElement[]} */
		this.tubes = [...element.querySelectorAll('.rs-nixie')];
		/** Laufende Zündvorgänge, damit destroy() sie abräumen kann. */
		this.timers = new Set();

		// Der Bereich für Hilfsmittel und sein Satzbau. Fehlt der Bereich —
		// altes Markup —, arbeitet die Gruppe still weiter; ein fehlendes
		// Bedienteil ist kein Grund, einen Automaten stillzulegen (gleiche
		// Haltung wie findNixieGroup() weiter unten). Fehlt umgekehrt nur die
		// Vorlage, wird EINMAL gemeldet und danach geschwiegen — eine Meldung
		// je Ziffernwechsel wäre eine Konsole voller Zeilen.
		this.announcer = element.querySelector(SELECTOR_ANNOUNCE);
		this.announceTemplate = this.announcer?.dataset.rsTextDisplay ?? '';
		if (this.announcer !== null && this.announceTemplate === '') {
			console.error('[reel-slot] An einer Röhrengruppe fehlt data-rs-text-display.');
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
	 * Neunen. Das ist das Verhalten einer echten Röhrenanzeige und die
	 * Empfehlung aus DECISIONS.md, Phase 5 („Überlauf der Anzeigen"). In
	 * Phase 6 kann es nicht vorkommen — der höchste Gewinn ist 100 × 10 —
	 * aber die Risiko-Leiter aus Phase 8 verdoppelt ohne Grenze.
	 *
	 * @param {number} value ganze Zahl ab 0
	 * @param {boolean} [announce] false lässt die Ansage aus. Gebraucht vom
	 *        Zählwerk (counter.js) für den allerersten Anfangsstand beim
	 *        Seitenaufbau. Vorgabe true — jeder vorhandene Aufruf verhält
	 *        sich damit unverändert.
	 * @returns {void}
	 */
	show(value, announce = true) {
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
		if (announce) {
			this.announce(String(this.length === 0 ? whole : Number(digits)));
		}
	}

	/**
	 * Löscht die Gruppe – alle Röhren unbeschickt.
	 *
	 * @param {boolean} [announce] siehe show()
	 * @returns {void}
	 */
	clear(announce = true) {
		for (const tube of this.tubes) {
			this.setTube(tube, -1);
		}

		// Dunkle Röhren zeigen keinen Wert — dann steht auch kein Satz da.
		// „Gewinn: 0" wäre etwas anderes als eine unbeschickte Anzeige.
		if (announce) {
			this.announce(null);
		}
	}

	/**
	 * Setzt eine einzelne Röhre und zündet sie, falls sich etwas ändert.
	 *
	 * @param {HTMLElement} tube
	 * @param {number} digit 0 bis 9, oder −1 für dunkel
	 * @returns {void}
	 */
	setTube(tube, digit) {
		const current = tube.style.getPropertyValue('--rs-digit').trim();
		if (current === String(digit)) {
			return;
		}

		tube.style.setProperty('--rs-digit', String(digit));

		// Der kurze Helligkeitseinbruch im Moment des Wechsels. Die Klasse
		// wird erst entfernt und dann – nach einem erzwungenen Umbruch – neu
		// gesetzt, damit die Animation auch bei zwei Wechseln kurz
		// hintereinander wirklich neu anläuft.
		tube.classList.remove('rs-nixie--strike');
		void tube.offsetWidth;
		tube.classList.add('rs-nixie--strike');

		const timer = globalThis.setTimeout(() => {
			tube.classList.remove('rs-nixie--strike');
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
	 * Räumt laufende Zeitgeber ab. Wird von reel-slot.js beim Verlassen der Seite
	 * aufgerufen; Phase 9 verlangt das ausdrücklich.
	 *
	 * @returns {void}
	 */
	destroy() {
		for (const timer of this.timers) {
			globalThis.clearTimeout(timer);
		}
		this.timers.clear();

		// Auch der Ansage-Zeitgeber. CONCEPT.md Phase 9 verlangt „sauberes
		// Aufräumen laufender Zeitgeber" — ein Zeitgeber, der das Gehäuse
		// überlebt, schriebe in ein Element, das es nicht mehr gibt.
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
 * @param {string} name 'guthaben' | 'einsatz' | 'gewinn'
 * @returns {?NixieGroup} null, wenn die Gruppe fehlt – der Automat spielt
 *          dann ohne diese Anzeige weiter, statt mit einem Fehler auszusteigen
 */
export function findNixieGroup(root, name) {
	const element = root.querySelector(`.rs-nixie-group[data-rs-display="${name}"]`);
	return element === null ? null : new NixieGroup(element);
}

export default NixieGroup;
