/**
 * FruitRisk – eine Nixie-Röhrengruppe ansteuern
 * ==============================================
 *
 * Zeichengleiche Übernahme der Bauform aus den übrigen Automaten dieses
 * Projekts, mit fr-Präfixen.
 *
 * Eine Nixie-Röhre ist eine Glasröhre mit zehn übereinanderliegenden
 * Drahtziffern; genau eine davon glüht. machine.css bildet das ohne
 * JavaScript ab: jede Röhre trägt zehn deckungsgleiche Kathoden, und
 * --fr-digit entscheidet rein rechnerisch, welche leuchtet. −1 lässt alle
 * dunkel.
 *
 * Diese Datei tut deshalb sehr wenig: sie zerlegt eine Zahl in Ziffern und
 * setzt je Röhre eine Eigenschaft. Am gezeichneten Markup ändert sie nichts.
 *
 * DER EINE UNTERSCHIED ZU DEN ÜBRIGEN AUTOMATEN — UND ER ENTSTEHT VON SELBST
 * ---------------------------------------------------------------------------
 * Das vorhandene Fünf-Walzen-Gerät stellt neben jede Röhrengruppe einen
 * eigenen role="status"-Bereich. Dieses Gerät nicht: NixieGroup.html liefert
 * die Gruppe mit aria-hidden="true" und OHNE eigenen Ansagebereich aus
 * (Entscheidung aus Phase F2, weil CONCEPT.md C.14.12 die Zahl der
 * Live-Bereiche dieses Geräts auf vier festlegt — machine, grid, credit,
 * risk). Der Code hier braucht dafür KEINE Änderung: element.querySelector(
 * '[data-fr-announce]') liefert null, weil im Markup dieses Geräts kein
 * solches Element als Nachfahre einer Röhrengruppe steht, und die Klasse
 * arbeitet dann still weiter — genau die Haltung, die dieser Konstruktor
 * ohnehin für ein fehlendes Bedienteil hat. Angesagt werden die Werte
 * stattdessen durch die vier vorhandenen Bereiche (GUTHABEN und EINSATZ
 * durch „credit", GEWINN durch „grid", STUFE ab Phase F5 durch „risk").
 *
 * DIESER ABSATZ GEHÖRT AUSDRÜCKLICH HIER HIN, damit niemand später einen
 * eigenen Ansagebereich „nachrüstet" — das wäre ein fünfter Live-Bereich und
 * ein Vertragsbruch gegenüber C.14.12.
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Der Satz kommt aus der
 * Sprachdatei und reist als data-Attribut ins Dokument; was hier steht, ist
 * eine Entwicklermeldung für die Konsole.
 */

/**
 * Dauer des Zündvorgangs beim Ziffernwechsel. Muss zur Animation
 * fr-nixie-strike in machine.css passen (dort 200 ms); die zehn Millisekunden
 * Zuschlag verhindern, dass die Klasse abgeräumt wird, bevor das letzte Bild
 * gezeichnet ist.
 */
const STRIKE_MS = 210;

/**
 * Kürzeste Zeit zwischen zwei Zündungen DERSELBEN Röhre.
 *
 * CONCEPT.md B.9.3/B.6.1: keine Lichtquelle, die häufiger als dreimal je
 * Sekunde hell wird — nicht verhandelbar. Eine Zählfahrt (STEP_MS = 70 ms in
 * counter.js) würde die letzte Röhre ohne Bremse rund vierzehnmal je Sekunde
 * neu zünden. Die Drossel steckt hier, in der Anzeige, und nicht bei ihren
 * Aufrufern.
 */
const STRIKE_COOLDOWN_MS = 350;

/** Der Bereich, den nur Hilfsmittel lesen würden, falls es ihn gäbe. */
const SELECTOR_ANNOUNCE = '[data-fr-announce]';

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
	 * @param {HTMLElement} element ein .fr-nixie-group
	 */
	constructor(element) {
		this.element = element;
		/** @type {HTMLElement[]} */
		this.tubes = [...element.querySelectorAll('.fr-nixie')];
		/** Laufende Zündvorgänge, damit destroy() sie abräumen kann. */
		this.timers = new Set();

		// Der Bereich für Hilfsmittel und sein Satzbau. An diesem Gerät gibt
		// es ihn NICHT (siehe Dateikopf); querySelector liefert deshalb
		// immer null, und die Gruppe arbeitet still weiter — ein fehlendes
		// Bedienteil ist kein Grund, einen Automaten stillzulegen (gleiche
		// Haltung wie findNixieGroup() weiter unten).
		this.announcer = element.querySelector(SELECTOR_ANNOUNCE);
		this.announceTemplate = this.announcer?.dataset.frTextDisplay ?? '';
		if (this.announcer !== null && this.announceTemplate === '') {
			console.error('[fruit-risk] An einer Röhrengruppe fehlt data-fr-text-display.');
			this.announcer = null;
		}

		/** Laufender Ansage-Zeitgeber, oder 0. */
		this.announceTimer = 0;

		/** Wurde schon einmal angesagt? Die erste Ansage wartet nicht. */
		this.announced = false;

		/** Frühester Zeitpunkt der nächsten Zündung, je Röhre (siehe setTube()). */
		this.strikeReadyAt = new Map();
	}

	/** Anzahl der Röhren – die Stellenzahl der Gruppe. */
	get length() {
		return this.tubes.length;
	}

	/**
	 * Zeigt eine ganze Zahl an, rechtsbündig mit führenden Nullen.
	 *
	 * Passt die Zahl nicht in die vorhandenen Stellen, zeigt die Gruppe
	 * lauter Neunen — das Verhalten einer echten Röhrenanzeige. Die Gruppen
	 * GUTHABEN und GEWINN haben sieben Röhren und fassen damit 9.999.999; der
	 * höchste Rundengewinn liegt bei 401 (README.md), aber eine künftige
	 * Leiter (Phase F5) verdoppelt ohne Grenze.
	 *
	 * @param {number} value ganze Zahl ab 0
	 * @param {boolean} [announce] false lässt die Ansage aus. An diesem Gerät
	 *        bislang ungenutzt (es gibt keinen Ansagebereich je Gruppe),
	 *        bleibt aber Teil der Bauform für eine künftige Gruppe „stufe".
	 *        Vorgabe true — jeder vorhandene Aufruf verhält sich damit
	 *        unverändert.
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
	 * Die Ziffer selbst wird IMMER gesetzt – nur der Zündvorgang unterliegt
	 * der Drossel aus STRIKE_COOLDOWN_MS. Läuft deren Sperrzeit noch, bleibt
	 * die Röhre bei ihrem zuletzt gezündeten Helligkeitsverlauf stehen, statt
	 * ihn erneut anzustoßen.
	 *
	 * @param {HTMLElement} tube
	 * @param {number} digit 0 bis 9, oder −1 für dunkel
	 * @returns {void}
	 */
	setTube(tube, digit) {
		const current = tube.style.getPropertyValue('--fr-digit').trim();
		if (current === String(digit)) {
			return;
		}

		tube.style.setProperty('--fr-digit', String(digit));

		const now = globalThis.performance.now();
		const readyAt = this.strikeReadyAt.get(tube) ?? -Infinity;
		if (now < readyAt) {
			return;
		}
		this.strikeReadyAt.set(tube, now + STRIKE_COOLDOWN_MS);

		// Der kurze Helligkeitseinbruch im Moment des Wechsels. Die Klasse
		// wird erst entfernt und dann – nach einem erzwungenen Umbruch – neu
		// gesetzt, damit die Animation auch bei zwei Wechseln kurz
		// hintereinander wirklich neu anläuft.
		tube.classList.remove('fr-nixie--strike');
		void tube.offsetWidth;
		tube.classList.add('fr-nixie--strike');

		const timer = globalThis.setTimeout(() => {
			tube.classList.remove('fr-nixie--strike');
			this.timers.delete(timer);
		}, STRIKE_MS);
		this.timers.add(timer);
	}

	/**
	 * Sagt den Stand der Gruppe an — entprellt.
	 *
	 * An diesem Gerät gibt es keinen eigenen Ansagebereich (siehe Dateikopf);
	 * this.announcer ist deshalb immer null und diese Methode kehrt sofort
	 * zurück. Der Code bleibt trotzdem stehen — dieselbe Bauform wie bei den
	 * übrigen Automaten dieses Projekts, und der Ort, an dem eine künftige
	 * Gruppe „stufe" andocken könnte, falls C.14.12 das je erlaubt.
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
	 * Räumt laufende Zeitgeber ab. Wird von fruit-risk.js beim Verlassen der
	 * Seite aufgerufen.
	 *
	 * @returns {void}
	 */
	destroy() {
		for (const timer of this.timers) {
			globalThis.clearTimeout(timer);
		}
		this.timers.clear();
		this.strikeReadyAt.clear();

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
	const element = root.querySelector(`.fr-nixie-group[data-fr-display="${name}"]`);
	return element === null ? null : new NixieGroup(element);
}

export default NixieGroup;
