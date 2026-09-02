/**
 * Video Slot – eine Walze
 * ======================================
 *
 * Zuständig für genau ein .vs-reel: seine Symbolfolge, seine Lage, seine
 * Bewegung und seine punktgenaue Landung. Kennt weder die Gewinntabelle noch
 * die anderen Walzen noch die Zustandsmaschine.
 *
 *
 * WARUM ZEICHENSCHLEIFE UND NICHT CSS-ÜBERGANG
 * --------------------------------------------
 * Wie bei reel_slot/reel.js, aus denselben drei nachgerechneten Gründen:
 *
 *  1. Ein CSS-Übergang muss beim Start wissen, wo er endet. STOP darf aber in
 *     JEDEM Bild kommen. Die laufende Zwischenlage eines Übergangs ist von
 *     außen nicht ablesbar: --vs-reel-pos ist keine über @property
 *     registrierte Eigenschaft, getComputedStyle() liefert also nur den
 *     zuletzt gesetzten Text, nicht den interpolierten Wert. Ein sauberer
 *     Abbruch ohne sichtbaren Sprung wäre damit nicht möglich.
 *  2. Das Nachfedern einer cubic-bezier-Kurve mit y > 1 ist ein ANTEIL der
 *     Strecke. Die Bremsstrecke schwankt hier je nach Lage um bis zu 25
 *     Zellen; das Überschwingen schwankte damit von unsichtbar bis absurd.
 *     Hier ist es eine feste Größe: 0,30 Zellen, immer.
 *  3. Das Band hat nur 50 Zellen. Eine lange Bremse müsste mitten im Lauf um
 *     25 Zellen umbrechen; ein Übergang kann das nicht, eine Zeichenschleife
 *     macht es unsichtbar (Zelle p und p−25 zeigen dasselbe Symbol).
 *
 * --vs-reel-duration und --vs-reel-ease bleiben deshalb auf ihren
 * Vorgabewerten (0 ms / linear, machine.css). Das Band folgt der gesetzten
 * Lage sofort; gebremst wird rechnerisch, nicht vom Browser. Die Bewegungs-
 * regel selbst (.vs-reel__strip, machine.css) stammt bereits aus Phase 6d und
 * kennt alle drei Custom Properties; diese Datei setzt zur Laufzeit nur noch
 * --vs-reel-pos.
 *
 *
 * DAS KOORDINATENSYSTEM
 * ---------------------
 * Intern rechnet die Walze in q: einer Lage in Zellen, die NIE umbricht und
 * immer nur wächst. Das macht die Bremsplanung trivial — kein Sonderfall am
 * Rundumschluss.
 *
 * Angezeigt wird daraus p = 23 + ((q − 23) mod 25), also immer aus [23, 48).
 * Warum ausgerechnet dieses Fenster: das Band trägt 50 Zellen (0 bis 49, zwei
 * volle Umläufe der 25 Rasterpositionen aus Rules::STRIPS). machine.css
 * schiebt es um (p − 1) × 14 Einheiten nach oben, das Sichtfenster ist
 * 42 Einheiten = drei Zellen hoch. Vollständig gefüllt ist es also nur,
 * solange (p − 1) × 14 + 42 ≤ 700, das heißt p ≤ 48. Das Fenster [23, 48)
 * hält diese Grenze ein und ist genau 25 Zellen breit, so dass der Umbruch
 * um −25 bildgleich bleibt.
 *
 * Zelle k zeigt Bandposition (k mod 25). Die Ruhelage für den gezogenen
 * Index i ist deshalb 23 + ((i − 23) mod 25); für i = 1 ergibt das 26 —
 * genau die defaultPosition aus dem CabinetProcessor.
 *
 *
 * DAS BEWEGUNGSMODELL
 * -------------------
 *   Verzug   – Stillstand, damit die fünf Walzen nicht im Gleichschritt
 *              anlaufen (0 / 60 / 120 / 180 / 240 ms).
 *   Anlauf   – gleichmäßige Beschleunigung auf Laufgeschwindigkeit, 260 ms.
 *   Lauf     – gleichbleibende Geschwindigkeit.
 *   Bremse   – gleichmäßige Verzögerung auf null über genau 9 Zellen. Weil
 *              Anfangsgeschwindigkeit und Strecke feststehen, steht auch die
 *              Bremsdauer fest: 2 × 9 / v. Der Übergang von Lauf zu Bremse ist
 *              dadurch stufenlos, es gibt keinen Geschwindigkeitssprung.
 *   Nachfedern – 0,30 Zellen zurück, 130 ms, mit Glättung an beiden Enden.
 *
 * Weil die Bremsstrecke fest ist, sieht die Bremse IMMER gleich aus. Was
 * schwankt, ist der Auslauf davor: die Walze läuft nach dem STOP-Befehl mit
 * gleichbleibender Geschwindigkeit weiter, bis sie den einen Punkt erreicht,
 * von dem aus die feste Bremsstrecke punktgenau auf der gezogenen Position
 * endet.
 *
 *
 * DAS ERGEBNIS IST NICHT BEEINFLUSSBAR
 * ------------------------------------
 * targetIndex wird ausschließlich in start() gesetzt und danach nur gelesen.
 * requestStop() nimmt kein Ziel entgegen und rührt targetIndex nicht an — es
 * entscheidet allein über den ZEITPUNKT, nie über das ZIEL. Es gibt in dieser
 * Datei keinen zweiten Schreibzugriff auf targetIndex.
 */

/** Rasterpositionen je Walze (Anhang D). */
const LAP = 25;

/** Untere Kante des Anzeigefensters; siehe Kopf. */
const BAND_START = 23;

/** Anlaufzeit in Sekunden. Kürzer wirkt wie ein Schnitt, länger wie Sirup. */
const RUNUP_S = 0.26;

/** Bremsstrecke in Zellen. Fest, damit jede Bremse gleich aussieht. */
const BRAKE_CELLS = 9;

/** Überschwingen beim Halt, in Zellen. Sichtbar, aber kein Symbolwechsel. */
const OVERSHOOT_CELLS = 0.3;

/** Dauer des Nachfederns in Sekunden. */
const SETTLE_S = 0.13;

/**
 * Laufgeschwindigkeit je Walze in Zellen je Sekunde.
 *
 * Die fünf Werte sind bewusst leicht verschieden, damit die Walzen nicht
 * wie miteinander verschraubt wirken.
 */
const CRUISE = Object.freeze([40, 42, 38, 41, 39]);

/** Anlaufverzug je Walze in Sekunden. Rein optisch. */
const START_DELAY = Object.freeze([0, 0.06, 0.12, 0.18, 0.24]);

/**
 * Rest einer Division, immer nicht-negativ. Der eingebaute %-Operator liefert
 * bei negativem Zähler ein negatives Ergebnis und wäre hier falsch.
 *
 * @param {number} value
 * @param {number} modulus
 * @returns {number}
 */
function mod(value, modulus) {
	return ((value % modulus) % modulus + modulus) % modulus;
}

/**
 * Die Zelle, auf der der gezogene Index zur Ruhe kommt.
 *
 * @param {number} index 0 bis 24
 * @returns {number} ganze Zahl aus [23, 48)
 */
export function restCellFor(index) {
	return BAND_START + mod(index - BAND_START, LAP);
}

/**
 * Eine Walze.
 */
export class Reel {
	/**
	 * @param {HTMLElement} element ein .vs-reel mit data-vs-reel="1…5"
	 * @throws {Error} wenn das Markup nicht dem Vertrag aus Grid.html entspricht
	 */
	constructor(element) {
		const number = Number.parseInt(element.getAttribute('data-vs-reel') ?? '', 10);
		if (!Number.isInteger(number) || number < 1 || number > 5) {
			throw new Error('Eine Walze braucht data-vs-reel mit 1 bis 5.');
		}

		const band = element.querySelector('.vs-reel__strip');
		const list = (band?.getAttribute('data-vs-strip') ?? '').split(',').map((name) => name.trim());
		if (list.length !== LAP || list.some((name) => name === '')) {
			throw new Error(`Walze ${number}: data-vs-strip trägt nicht ${LAP} Symbolnamen.`);
		}

		/** @type {HTMLElement[]} die 50 Leuchtfelder, in Dokumentreihenfolge. */
		const cells = [...element.querySelectorAll('.vs-cell')];
		if (cells.length !== LAP * 2) {
			throw new Error(`Walze ${number}: ${LAP * 2} .vs-cell erwartet, gefunden: ${cells.length}.`);
		}

		/** @type {HTMLElement} */
		this.element = element;
		/** Walzennummer 1 bis 5. */
		this.number = number;
		/** Nullbasierter Rang, für die Tabellen oben. */
		this.slot = number - 1;
		/**
		 * Die 25 Symbolnamen aus Anhang D – gelesen, nicht abgeschrieben.
		 * Quelle ist Classes/Rules.php über den CabinetProcessor.
		 * @type {ReadonlyArray<string>}
		 */
		this.symbols = Object.freeze(list);
		/** Die 50 Leuchtfelder des Bandes, für markCell()/clearWin(). */
		this.cells = cells;

		this.cruise = CRUISE[this.slot];
		this.startDelay = START_DELAY[this.slot];

		// Startlage aus dem Markup übernehmen. Steht dort nichts Brauchbares,
		// ist 25 die erste Zelle des zweiten Umlaufs und damit sicher gültig.
		const written = Number.parseFloat(this.element.style.getPropertyValue('--vs-reel-pos'));
		const start = Number.isFinite(written) ? Math.round(written) : LAP;

		/** Lage in Zellen, wächst monoton, bricht nie um. */
		this.q = start;
		/** Zuletzt in den DOM geschriebene Anzeigelage. */
		this.painted = Number.NaN;
		/** Ganzzahlige Zelle, auf der die Walze steht. */
		this.restCell = restCellFor(mod(start, LAP));

		/** @type {'rest'|'delay'|'runup'|'cruise'|'brake'|'settle'} */
		this.phase = 'rest';
		/** Beginn der laufenden Teilbewegung, in Sekunden. */
		this.phaseTime = 0;
		/** Lage zu Beginn der laufenden Teilbewegung. */
		this.phaseQ = start;

		/**
		 * Der gezogene Index, 0 bis 24. Wird NUR in start() geschrieben.
		 * @type {?number}
		 */
		this.targetIndex = null;
		/** true, sobald ein Halt befohlen ist – von Hand oder vom Zeitgeber. */
		this.stopRequested = false;
		/** Frühester erlaubter Stillstand, damit die Reihenfolge stimmt. */
		this.earliestRest = 0;
		/** Errechneter Zeitpunkt des Stillstands; 0, solange nicht geplant. */
		this.restTime = 0;
		/** Lage am Umkehrpunkt der Bremse (Ziel + Überschwingen). */
		this.overQ = 0;
	}

	/** Läuft die Walze noch und darf sie angehalten werden? */
	get stoppable() {
		return this.phase !== 'rest' && !this.stopRequested;
	}

	/** Steht die Walze? */
	get atRest() {
		return this.phase === 'rest';
	}

	/**
	 * Das Symbol, das gerade in Zeile row des Sichtfelds steht.
	 *
	 * @param {number} row 0 (oben) bis 2 (unten)
	 * @returns {string}
	 */
	symbolAt(row) {
		return this.symbols[mod(this.restCell - 1 + row, LAP)];
	}

	/**
	 * Startet einen Lauf.
	 *
	 * @param {number} now Zeit in Sekunden (Zeitstempel der Zeichenschleife)
	 * @param {number} targetIndex gezogene Position, 0 bis 24
	 * @returns {void}
	 */
	start(now, targetIndex) {
		this.targetIndex = targetIndex;
		this.stopRequested = false;
		this.earliestRest = 0;
		this.restTime = 0;
		this.phase = 'delay';
		this.phaseTime = now + this.startDelay;
		this.phaseQ = this.q;
	}

	/**
	 * Befiehlt den Halt. Nimmt bewusst kein Ziel entgegen.
	 *
	 * @param {number} earliestRest frühester erlaubter Stillstand in Sekunden
	 * @returns {void}
	 */
	requestStop(earliestRest) {
		if (!this.stoppable) {
			return;
		}
		this.stopRequested = true;
		this.earliestRest = earliestRest;
	}

	/**
	 * Legt Beginn und Ende der Bremse fest. Wird genau einmal je Lauf
	 * aufgerufen, und zwar erst, wenn die Walze auf Laufgeschwindigkeit ist.
	 *
	 * @param {number} now
	 * @returns {void}
	 */
	planBrake(now) {
		// Das Nachfedern endet auf targetIndex. Die Bremse endet also 0,30
		// Zellen darüber, und sie beginnt 9 Zellen vor diesem Umkehrpunkt.
		const entryPhase = this.targetIndex - BRAKE_CELLS + OVERSHOOT_CELLS;

		// So weit muss die Walze mit gleichbleibender Geschwindigkeit noch
		// laufen, bis der Bremspunkt in der richtigen Phase liegt: 0 bis 25
		// Zellen.
		let ahead = mod(entryPhase - this.q, LAP);
		const brakeTime = (2 * BRAKE_CELLS) / this.cruise;

		// Reihenfolge sichern. Ein rasch mehrfach gedrücktes STOP könnte sonst
		// eine spätere Walze vor einer früheren zum Stehen bringen. Angehängt
		// werden ganze Umläufe – die ändern die Landezelle nicht um ein Jota.
		let rest = now + ahead / this.cruise + brakeTime + SETTLE_S;
		while (rest < this.earliestRest) {
			ahead += LAP;
			rest += LAP / this.cruise;
		}

		this.phase = 'cruise';
		this.phaseTime = now;
		this.phaseQ = this.q;
		this.brakeAt = now + ahead / this.cruise;
		this.brakeTime = brakeTime;
		this.overQ = this.q + ahead + BRAKE_CELLS;
		this.restTime = rest;
	}

	/**
	 * Rechnet die Lage für diesen Zeitpunkt aus und schreibt sie in den DOM.
	 *
	 * @param {number} now Zeit in Sekunden
	 * @returns {boolean} true genau in dem Bild, in dem die Walze zur Ruhe kommt
	 */
	tick(now) {
		switch (this.phase) {
			case 'rest':
				return false;

			case 'delay':
				if (now >= this.phaseTime) {
					this.phase = 'runup';
					this.phaseTime = now;
					this.phaseQ = this.q;
				}
				break;

			case 'runup': {
				const u = Math.min(1, (now - this.phaseTime) / RUNUP_S);
				// Gleichmäßige Beschleunigung: Strecke wächst mit dem Quadrat
				// der Zeit. Auf voller Länge sind das v × t / 2 Zellen.
				this.q = this.phaseQ + 0.5 * this.cruise * RUNUP_S * u * u;
				if (u >= 1) {
					const cruiseStart = this.phaseTime + RUNUP_S;
					this.q = this.phaseQ + 0.5 * this.cruise * RUNUP_S;
					this.phase = 'cruise';
					this.phaseTime = cruiseStart;
					this.phaseQ = this.q;
					this.brakeAt = Number.POSITIVE_INFINITY;
				}
				break;
			}

			case 'cruise': {
				this.q = this.phaseQ + this.cruise * (now - this.phaseTime);
				if (this.stopRequested && this.restTime === 0) {
					// Erst hier planen, nie im Anlauf: die Bremse setzt einen
					// stufenlosen Übergang von voller Laufgeschwindigkeit
					// voraus. Ein STOP im Anlauf wartet also die 260 ms ab.
					this.planBrake(now);
				}
				if (this.restTime !== 0 && now >= this.brakeAt) {
					this.phase = 'brake';
					this.phaseTime = this.brakeAt;
					this.phaseQ = this.overQ - BRAKE_CELLS;
					this.q = this.phaseQ;
				}
				break;
			}

			case 'brake': {
				const u = Math.min(1, (now - this.phaseTime) / this.brakeTime);
				// Gleichmäßige Verzögerung, in Anteilen der Bremsstrecke:
				// s(u) = S × (2u − u²). Bei u = 0 ist die Steigung 2S, also
				// genau die Laufgeschwindigkeit (denn T = 2S/v) – kein Ruck.
				// Bei u = 1 ist sie null – kein zweiter Ruck.
				this.q = this.phaseQ + BRAKE_CELLS * (2 * u - u * u);
				if (u >= 1) {
					this.q = this.overQ;
					this.phase = 'settle';
					this.phaseTime = this.phaseTime + this.brakeTime;
				}
				break;
			}

			case 'settle': {
				const u = Math.min(1, (now - this.phaseTime) / SETTLE_S);
				// Glättung 3u² − 2u³: beginnt und endet mit Geschwindigkeit
				// null. Die Walze fällt weich in die Rastung zurück, statt
				// zweimal anzuschlagen.
				this.q = this.overQ - OVERSHOOT_CELLS * (3 * u * u - 2 * u * u * u);
				if (u >= 1) {
					this.phase = 'rest';
					this.restCell = restCellFor(this.targetIndex);
					// Die Ruhelage wird als ganze Zahl gesetzt, nicht
					// ausgerechnet. Damit kann kein Rundungsrest der
					// Gleitkommarechnung die angezeigte Zelle verschieben.
					this.q = this.restCell;
					this.paint(this.restCell);
					return true;
				}
				break;
			}

			default:
				break;
		}

		this.paint(BAND_START + mod(this.q - BAND_START, LAP));
		return false;
	}

	/**
	 * Schreibt eine Anzeigelage in den DOM – nur, wenn sie sich sichtbar
	 * geändert hat. Drei Zuweisungen je Bild sind billig, unnötige nicht.
	 *
	 * @param {number} position
	 * @returns {void}
	 */
	paint(position) {
		if (Math.abs(position - this.painted) < 0.001) {
			return;
		}
		this.painted = position;
		this.element.style.setProperty('--vs-reel-pos', position.toFixed(3));
	}

	/**
	 * Setzt die Treffer-Hervorhebung einer einzelnen Zelle der Ruhelage.
	 *
	 * restCell liegt immer in [23, 48); restCell − 1 ≥ 22 und restCell + 1
	 * ≤ 48 sind damit stets gültige Indizes in die 50 .vs-cell.
	 *
	 * @param {number} row 0 (oben) bis 2 (unten)
	 * @returns {void}
	 */
	markCell(row) {
		this.cells[this.restCell - 1 + row]?.classList.add('vs-cell--win');
	}

	/** Nimmt die Treffer-Hervorhebung aller Zellen dieser Walze zurück. */
	clearWin() {
		for (const cell of this.cells) {
			cell.classList.remove('vs-cell--win');
		}
	}
}

export default Reel;
