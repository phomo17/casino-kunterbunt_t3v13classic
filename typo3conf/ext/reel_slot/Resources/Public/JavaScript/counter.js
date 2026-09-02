/**
 * Reel Slot – Zählwerk für eine Nixie-Gruppe
 * ==========================================================
 *
 * CONCEPT.md Abschnitt 6, Phase 7: „Nixie-Anzeigen zählen Werte sichtbar hoch
 * statt zu springen." Diese Datei ist genau das und sonst nichts. Sie kennt
 * weder Guthaben noch Einsatz noch Gewinn — sie bekommt eine Röhrengruppe und
 * eine Zielzahl und fährt die eine zur anderen.
 *
 * Deshalb steht sie hier und nicht in nixie.js: nixie.js gehört Phase 6 und
 * hält in ihrem eigenen Kopf fest, dass Phase 7 dort nichts ändern muss. Diese
 * Zusage wird eingehalten. Phase 8 kann dieses Zählwerk unverändert für die
 * Gewinnanzeige der Risiko-Leiter benutzen.
 *
 *
 * WARUM SCHRITTE UND NICHT JEDES BILD
 * -----------------------------------
 * Naheliegend wäre, in jedem Bild der Zeichenschleife einen neuen Wert zu
 * setzen. Das wäre aus zwei Gründen falsch:
 *
 *  1. NixieGroup.setTube() löst bei jedem Ziffernwechsel den Zündvorgang aus —
 *     Klasse ab, erzwungener Umbruch, Klasse an, Zeitgeber über 210 ms. Bei
 *     60 Bildern je Sekunde entstünden 60 Zeitgeber und 60 erzwungene Umbrüche
 *     je Sekunde und Röhre, und das Zünden liefe dauernd neu an, statt sichtbar
 *     zu sein.
 *  2. Ein echtes Zählwerk rastet. Es gleitet nicht. Sichtbar hochzählen heißt,
 *     dass man die einzelnen Schritte SIEHT.
 *
 * Deshalb: ein Schritt alle 70 ms, höchstens 12 Schritte je Fahrt. Eine Fahrt
 * dauert damit nie länger als 840 ms — kurz genug, dass der nächste Hebelzug
 * nicht warten muss.
 *
 *
 * WIE DIE SCHRITTE VERTEILT SIND
 * ------------------------------
 * Ist der Unterschied klein (bis 12), wird eins nach dem anderen gezählt:
 * 97, 98, 99, 100. Ist er groß, wird in 12 Schritten gefahren, die nach hinten
 * kürzer werden (quadratisches Auslaufen) — das Zählwerk kommt an wie eine
 * Trommel, die ausrollt, statt abrupt zu stehen.
 *
 * Eine neue Zielzahl während einer laufenden Fahrt bricht nichts ab: sie setzt
 * den Startpunkt auf den GERADE ANGEZEIGTEN Wert und fährt von dort weiter. Die
 * Anzeige springt dadurch nie zurück.
 *
 *
 * ÜBERLAUF
 * --------
 * DECISIONS.md, Phase 5 („Überlauf der Anzeigen") empfiehlt: bei Überlauf alle
 * Röhren auf 9 und die Gruppe blinken lassen. Genau das passiert hier. Die
 * Neunen setzt NixieGroup.show() von allein; das Blinken kommt über die Klasse
 * .rs-nixie-group--overflow aus machine.css. Der Grund für den Überlauf: das
 * Konto sättigt erst bei 999.999.999, GUTHABEN hat aber sechs Röhren.
 *
 *
 * DAS EINZIGE, WAS DIESE DATEI NACH AUSSEN SAGT
 * ---------------------------------------------
 * Je SICHTBAREM Schritt einer Fahrt wird am Element der Gruppe ein Ereignis
 * rs:count ausgelöst, das nach oben bis zum Gehäuse blubbert:
 *
 *   detail.display    'guthaben' | 'einsatz' | 'gewinn' — das Namensschild
 *                     der Gruppe aus data-rs-display
 *   detail.value      der Wert, der JETZT in den Röhren steht
 *   detail.index      der wievielte Schritt, aufsteigend ab 1
 *   detail.steps      wie viele Schritte die Fahrt hat
 *   detail.direction  'up' oder 'down'
 *
 * Es wird NICHT abgebrochen, NICHT abgewartet und von dieser Datei selbst
 * nicht gelesen. Wer nicht zuhört, merkt nichts davon; das Zählwerk verhält
 * sich mit und ohne Zuhörer Zeile für Zeile gleich.
 *
 * snap() löst KEIN Ereignis aus. snap() ist keine Fahrt, sondern ein Setzen
 * (Einsatzwahl, erstes Anzeigen) — ein Zählklang dort wäre ein Klang für
 * etwas, das gar nicht gezählt hat.
 *
 * Diese Datei bekommt KEINEN Import. Sie wird zusätzlich von einem Prüfskript
 * unter Node geladen, das die Import-Map von TYPO3 nicht kennt — dieselbe
 * Regel wie bei paytable.js.
 */

/**
 * Abstand zwischen zwei sichtbaren Schritten, in Millisekunden.
 *
 * 70 ms sind rund vier Bilder bei 60 Hz — langsam genug, dass jeder Schritt zu
 * sehen ist, schnell genug, dass eine volle Fahrt nicht stört. Der Zündvorgang
 * der Röhren dauert 200 ms und überlappt dadurch die nächsten zwei bis drei
 * Schritte; das ist gewollt und sieht aus wie eine glühende Ziffer, die nicht
 * zur Ruhe kommt.
 */
const STEP_MS = 70;

/** Höchstzahl der Schritte einer Fahrt. 12 × 70 ms = 840 ms. */
const MAX_STEPS = 12;

/** Klasse, die eine übergelaufene Gruppe blinken lässt (machine.css, Abschnitt 3). */
const OVERFLOW_CLASS = 'rs-nixie-group--overflow';

/**
 * Bringt einen beliebigen Wert in die Form, die eine Röhrenanzeige zeigen kann:
 * eine ganze Zahl ab 0.
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
 * Ein Zählwerk vor genau einer Röhrengruppe.
 */
export class NixieCounter {
	/**
	 * @param {import('./nixie.js').NixieGroup} group eine Gruppe aus findNixieGroup()
	 */
	constructor(group) {
		this.group = group;

		/**
		 * Der höchste Wert, den diese Gruppe darstellen kann. Sechs Röhren
		 * können 999999, zwei können 99. Alles darüber ist Überlauf.
		 */
		this.ceiling = 10 ** group.length - 1;

		/** Der gerade angezeigte Wert. Immer das, was wirklich in den Röhren steht. */
		this.value = 0;

		/** Startwert, Zielwert und Schrittzahl der laufenden Fahrt. */
		this.from = 0;
		this.to = 0;
		this.steps = 1;

		/** Zuletzt ausgeführter Schritt, damit ein Bild nicht doppelt zählt. */
		this.lastStep = 0;

		/** Beginn der Fahrt auf der Uhr der Zeichenschleife, in Millisekunden. */
		this.startTime = 0;

		/** Kennung der laufenden Zeichenschleife, oder 0. */
		this.frame = 0;

		this.frameStep = (timestamp) => this.tick(timestamp);
	}

	/** Stellenzahl der Gruppe. */
	get length() {
		return this.group.length;
	}

	/**
	 * Setzt einen Wert ohne Fahrt, sofort.
	 *
	 * Gebraucht wird das an zwei Stellen: beim allerersten Anzeigen des
	 * Guthabens (die Röhren sind dann dunkel, eine Fahrt aus dem Nichts wäre
	 * sinnlos) und bei der Einsatzwahl — der Einsatz ist eine Schalterstellung,
	 * kein Zählerstand. Eine Fahrt von 1 auf 10 würde unterwegs 3, 4, 6, 7
	 * zeigen, also Einsätze, die es gar nicht gibt. Das wäre eine sichtbare
	 * Lüge.
	 *
	 * @param {number} value
	 * @returns {void}
	 */
	snap(value) {
		this.cancel();
		this.value = normalise(value);
		this.paint();
	}

	/**
	 * Fährt sichtbar auf einen neuen Wert.
	 *
	 * @param {number} value
	 * @returns {void}
	 */
	ramp(value) {
		const target = normalise(value);
		if (target === this.value) {
			this.cancel();
			return;
		}

		// Startpunkt ist immer der GERADE ANGEZEIGTE Wert, nicht das alte Ziel.
		// Dadurch springt die Anzeige beim Umschwenken nie zurück.
		this.from = this.value;
		this.to = target;
		this.steps = Math.min(MAX_STEPS, Math.abs(target - this.from));
		this.lastStep = 0;
		this.startTime = globalThis.performance.now();

		// Läuft schon eine Schleife, übernimmt sie im nächsten Bild die neuen
		// Werte. Eine zweite anzumelden würde dieselbe Arbeit doppelt tun.
		if (this.frame === 0) {
			this.frame = globalThis.requestAnimationFrame(this.frameStep);
		}
	}

	/**
	 * Ein Bild der Fahrt.
	 *
	 * Die Zeitstempel von requestAnimationFrame und performance.now() zählen von
	 * derselben Nullstelle; der Vergleich mit startTime ist deshalb exakt.
	 *
	 * @param {number} now Zeit in Millisekunden
	 * @returns {void}
	 */
	tick(now) {
		this.frame = 0;

		const index = Math.min(this.steps, Math.floor((now - this.startTime) / STEP_MS) + 1);

		if (index !== this.lastStep) {
			this.lastStep = index;
			const t = index / this.steps;

			// Kleiner Unterschied: eins nach dem anderen, gleichmäßig.
			// Großer Unterschied: quadratisches Auslaufen, damit das Zählwerk
			// ankommt statt anzuhalten.
			const linear = this.steps === Math.abs(this.to - this.from);
			const eased = linear ? t : 1 - (1 - t) * (1 - t);

			// Der letzte Schritt wird gesetzt, nicht gerechnet: die Anzeige muss
			// exakt auf dem Zielwert stehen bleiben, nicht auf einer Rundung.
			this.value = index === this.steps
				? this.to
				: Math.round(this.from + (this.to - this.from) * eased);

			this.paint();

			// Erst malen, dann melden: ein Zuhörer, der auf diese Meldung hin
			// die Anzeige liest, soll den neuen Wert vorfinden und nicht den
			// alten.
			this.announce(index);
		}

		if (index < this.steps) {
			this.frame = globalThis.requestAnimationFrame(this.frameStep);
		}
	}

	/**
	 * Schreibt den aktuellen Wert in die Röhren und pflegt das Überlaufblinken.
	 *
	 * Die Neunen bei Überlauf setzt NixieGroup.show() selbst — hier kommt nur
	 * das Blinken dazu.
	 *
	 * @returns {void}
	 */
	paint() {
		this.group.show(this.value);
		this.group.element.classList.toggle(OVERFLOW_CLASS, this.value > this.ceiling);
	}

	/**
	 * Sagt dem Rest des Automaten, dass ein Schritt sichtbar geworden ist.
	 *
	 * bubbles: true, damit die Meldung von der Röhrengruppe bis zum .rs-machine
	 * hinaufsteigt — dort hängen seit Phase 6 alle Zuhörer. Nicht abbrechbar:
	 * es gibt nichts zu verhindern, die Ziffer steht schon.
	 *
	 * Object.freeze() wie überall in diesem Automaten: ein Zuhörer, der das
	 * detail eines Ereignisses verändert, verändert es für alle nachfolgenden.
	 *
	 * @param {number} index der wievielte Schritt, ab 1
	 * @returns {void}
	 */
	announce(index) {
		const element = this.group.element;
		element.dispatchEvent(new CustomEvent('rs:count', {
			detail: Object.freeze({
				display: element.dataset.rsDisplay ?? '',
				value: this.value,
				index,
				steps: this.steps,
				// Aus der laufenden Fahrt, nicht aus dem Vergleich mit dem
				// vorigen Wert: eine Fahrt, die unterwegs umschwenkt, setzt
				// from auf den GERADE angezeigten Wert (siehe ramp()), also
				// stimmt die Richtung auch dann.
				direction: this.to >= this.from ? 'up' : 'down',
			}),
			bubbles: true,
		}));
	}

	/** Hält eine laufende Fahrt an, ohne den angezeigten Wert zu ändern. */
	cancel() {
		if (this.frame !== 0) {
			globalThis.cancelAnimationFrame(this.frame);
			this.frame = 0;
		}
	}

	/**
	 * Räumt Fahrt, Blinken und die Zündzeitgeber der Gruppe ab. Wird beim
	 * Verlassen der Seite gerufen; Phase 9 verlangt das ausdrücklich.
	 *
	 * @returns {void}
	 */
	destroy() {
		this.cancel();
		this.group.element.classList.remove(OVERFLOW_CLASS);
		this.group.destroy();
	}
}

export default NixieCounter;
