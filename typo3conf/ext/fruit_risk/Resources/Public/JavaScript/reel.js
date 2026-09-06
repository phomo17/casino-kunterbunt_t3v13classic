/**
 * FruitRisk – eine Walze
 * ========================
 *
 * Zuständig für genau ein .fr-reel: seine Symbolfolge, seine Lage, seine
 * Bewegung und seine punktgenaue Landung. Kennt weder die Gewinntabelle noch
 * die anderen Walzen noch die Zustandsmaschine.
 *
 *
 * WARUM ZEICHENSCHLEIFE UND NICHT CSS-ÜBERGANG
 * -----------------------------------------------
 * Wie bei den übrigen Automaten dieses Projekts, aus denselben drei
 * nachgerechneten Gründen:
 *
 *  1. Ein CSS-Übergang muss beim Start wissen, wo er endet. STOP darf aber
 *     in JEDEM Bild kommen. Die laufende Zwischenlage eines Übergangs ist
 *     von außen nicht ablesbar: --fr-reel-pos ist keine über @property
 *     registrierte Eigenschaft, getComputedStyle() liefert also nur den
 *     zuletzt gesetzten Text, nicht den interpolierten Wert. Ein sauberer
 *     Abbruch ohne sichtbaren Sprung wäre damit nicht möglich.
 *  2. Das Nachfedern einer cubic-bezier-Kurve mit y > 1 ist ein ANTEIL der
 *     Strecke. Die Bremsstrecke schwankt hier je nach Lage um bis zu 20
 *     Zellen; das Überschwingen schwankte damit von unsichtbar bis absurd.
 *     Hier ist es eine feste Größe: 0,30 Zellen, immer.
 *  3. Das Band hat nur 40 Zellen. Eine lange Bremse müsste mitten im Lauf um
 *     20 Zellen umbrechen; ein Übergang kann das nicht, eine Zeichenschleife
 *     macht es unsichtbar (Zelle k und k−20 zeigen dasselbe Symbol).
 *
 * machine.css setzt --fr-reel-pos ohne transition (Regelteil §3); diese
 * Datei setzt zur Laufzeit nur noch diese eine Custom Property.
 *
 *
 * DAS KOORDINATENSYSTEM
 * -----------------------
 * Intern rechnet die Walze in q: einer Lage in Zellen, die NIE umbricht und
 * immer nur wächst. Das macht die Bremsplanung trivial — kein Sonderfall am
 * Rundumschluss.
 *
 * Angezeigt wird p = bandStart + ((q − bandStart) mod 20), also immer aus
 * [bandStart, bandStart + 20). bandStart wird NICHT als Zahl geschrieben,
 * sondern aus dem Markup abgeleitet: cells.length − ROWS − LAP =
 * 40 − 5 − 20 = 15. Dieselbe Formel steht als Kommentar im
 * CabinetProcessor (BAND_START); so gibt es die 15 nirgends zweimal.
 *
 * Das Band trägt 40 Zellen (0 bis 39, zwei volle Umläufe der 20
 * Rasterpositionen aus Rules::STRIPS). machine.css schiebt es um
 * p × 8 Einheiten nach oben; das Sichtfenster ist 40 Einheiten = fünf Zellen
 * hoch. Vollständig gefüllt ist es also nur, solange p × 8 + 40 ≤ 320, das
 * heißt p ≤ 35. Das Fenster [15, 35) hält diese Grenze ein und ist genau 20
 * Zellen breit, so dass der Umbruch um −20 bildgleich bleibt.
 *
 * Zelle k zeigt Bandposition (k mod 20). --fr-reel-pos trägt den Zellindex
 * der OBERSTEN sichtbaren Zeile — anders als bei einem Gerät mit ungerader
 * Zeilenzahl gibt es hier keine Mitte, die ohne Versatz zur Zeile 0 der
 * Auswertung (paytable.js) passt.
 *
 * symbolAt(row) = symbols[mod(restCell + row, 20)] — OHNE das „−1", das ein
 * Gerät mit mittlerer Bezugszeile bräuchte, genau deswegen. Ebenso
 * markCell(row) = cells[restCell + row]: restCell liegt immer in [15, 35),
 * und restCell + 4 ≤ 38 < 40 ist damit stets ein gültiger Index in die 40
 * .fr-cell.
 *
 *
 * DAS BEWEGUNGSMODELL
 * ---------------------
 *   Verzug     – Stillstand, damit die sechs Walzen nicht im Gleichschritt
 *                anlaufen (0 / 60 / 120 / 180 / 240 / 300 ms).
 *   Anlauf     – gleichmäßige Beschleunigung auf Laufgeschwindigkeit, 260 ms.
 *   Lauf       – gleichbleibende Geschwindigkeit.
 *   Bremse     – gleichmäßige Verzögerung auf null über genau 9 Zellen. Weil
 *                Anfangsgeschwindigkeit und Strecke feststehen, steht auch
 *                die Bremsdauer fest: 2 × 9 / v. Der Übergang von Lauf zu
 *                Bremse ist dadurch stufenlos, es gibt keinen
 *                Geschwindigkeitssprung.
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
 * ----------------------------------------
 * targetIndex wird ausschließlich in start() gesetzt und danach nur
 * gelesen. requestStop() nimmt kein Ziel entgegen und rührt targetIndex
 * nicht an — es entscheidet allein über den ZEITPUNKT, nie über das ZIEL. Es
 * gibt in dieser Datei keinen zweiten Schreibzugriff auf targetIndex.
 *
 * LAP UND ROWS KOMMEN AUS paytable.js (Behebungslauf REVIEW-fruitrisk-f4.md
 * [M7]): paytable.js exportiert beide Werte bereits, und machine.js liest sie
 * von dort. Diese Datei schrieb sie bislang ein zweites Mal auf — der
 * „dritte Ort derselben Wahrheit", den diese Phase laut Auftrag gerade
 * vermeiden soll (hier für die Rastergröße statt für die Gewinnwerte). Ein
 * Import ist unproblematisch: paytable.js hat selbst keinen Import und wird
 * unter Node genauso geladen wie diese Datei (verify-credit.mjs, Block M).
 */

import { LAP, ROWS } from '@phomo17/fruit-risk/paytable.js';

/** Anlaufzeit in Sekunden. Kürzer wirkt wie ein Schnitt, länger wie Sirup. */
const RUNUP_S = 0.26;

/** Bremsstrecke in Zellen. Fest, damit jede Bremse gleich aussieht. */
const BRAKE_CELLS = 9;

/** Überschwingen beim Halt, in Zellen. Sichtbar, aber kein Symbolwechsel. */
const OVERSHOOT_CELLS = 0.3;

/** Dauer des Nachfederns in Sekunden. */
const SETTLE_S = 0.13;

/**
 * Laufgeschwindigkeit je Walze in Zellen je Sekunde. Sechs bewusst leicht
 * verschiedene Werte, damit die Walzen nicht wie miteinander verschraubt
 * wirken.
 */
const CRUISE = Object.freeze([40, 42, 38, 41, 39, 43]);

/** Anlaufverzug je Walze in Sekunden. Rein optisch. */
const START_DELAY = Object.freeze([0, 0.06, 0.12, 0.18, 0.24, 0.30]);

/**
 * Rest einer Division, immer nicht-negativ. Der eingebaute %-Operator
 * liefert bei negativem Zähler ein negatives Ergebnis und wäre hier falsch.
 *
 * @param {number} value
 * @param {number} modulus
 * @returns {number}
 */
function mod(value, modulus) {
	return ((value % modulus) % modulus + modulus) % modulus;
}

/**
 * Eine Walze.
 */
export class Reel {
	/**
	 * @param {HTMLElement} element ein .fr-reel mit data-fr-reel="1…6"
	 * @throws {Error} wenn das Markup nicht dem Vertrag aus Grid.html entspricht
	 */
	constructor(element) {
		const number = Number.parseInt(element.getAttribute('data-fr-reel') ?? '', 10);
		if (!Number.isInteger(number) || number < 1 || number > 6) {
			throw new Error('Eine Walze braucht data-fr-reel mit 1 bis 6.');
		}

		const band = element.querySelector('.fr-reel__strip');
		const list = (band?.getAttribute('data-fr-strip') ?? '').split(',').map((name) => name.trim());
		if (list.length !== LAP || list.some((name) => name === '')) {
			throw new Error(`Walze ${number}: data-fr-strip trägt nicht ${LAP} Symbolnamen.`);
		}

		/** @type {HTMLElement[]} die 40 Leuchtfelder, in Dokumentreihenfolge. */
		const cells = [...element.querySelectorAll('.fr-cell')];
		if (cells.length !== LAP * 2) {
			throw new Error(`Walze ${number}: ${LAP * 2} .fr-cell erwartet, gefunden: ${cells.length}.`);
		}

		/** @type {HTMLElement} */
		this.element = element;
		/** Walzennummer 1 bis 6. */
		this.number = number;
		/** Nullbasierter Rang, für die Tabellen oben. */
		this.slot = number - 1;
		/**
		 * Die 20 Symbolnamen aus Rules::STRIPS – gelesen, nicht
		 * abgeschrieben. Quelle ist Classes/Rules.php über den
		 * CabinetProcessor.
		 * @type {ReadonlyArray<string>}
		 */
		this.symbols = Object.freeze(list);
		/** Die 40 Leuchtfelder des Bandes, für markCell()/clearWin(). */
		this.cells = cells;

		this.cruise = CRUISE[this.slot];
		this.startDelay = START_DELAY[this.slot];

		// Erste Zelle des Anzeigefensters, aus dem Markup abgeleitet statt
		// aufgeschrieben: sichtbar sind ROWS Zeilen, das Fenster ist einen
		// Umlauf breit, also beginnt es bei cells − ROWS − LAP. Siehe
		// Dateikopf und CabinetProcessor::BAND_START.
		this.bandStart = cells.length - ROWS - LAP;

		// Startlage aus dem Markup übernehmen. Steht dort nichts
		// Brauchbares, ist LAP die erste Zelle des zweiten Umlaufs und
		// damit sicher gültig.
		const written = Number.parseFloat(this.element.style.getPropertyValue('--fr-reel-pos'));
		const start = Number.isFinite(written) ? Math.round(written) : LAP;

		/** Lage in Zellen, wächst monoton, bricht nie um. */
		this.q = start;
		/** Zuletzt in den DOM geschriebene Anzeigelage. */
		this.painted = Number.NaN;
		/** Ganzzahlige Zelle, auf der die Walze steht. */
		this.restCell = this.restCellFor(mod(start, LAP));

		/** @type {'rest'|'delay'|'runup'|'cruise'|'brake'|'settle'} */
		this.phase = 'rest';
		/** Beginn der laufenden Teilbewegung, in Sekunden. */
		this.phaseTime = 0;
		/** Lage zu Beginn der laufenden Teilbewegung. */
		this.phaseQ = start;

		/**
		 * Der gezogene Index, 0 bis 19. Wird NUR in start() geschrieben.
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

	/**
	 * Die Zelle, auf der der gezogene Index zur Ruhe kommt.
	 *
	 * @param {number} index 0 bis 19
	 * @returns {number} ganze Zahl aus [bandStart, bandStart + LAP)
	 */
	restCellFor(index) {
		return this.bandStart + mod(index - this.bandStart, LAP);
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
	 * @param {number} row 0 (oben) bis 4 (unten)
	 * @returns {string}
	 */
	symbolAt(row) {
		return this.symbols[mod(this.restCell + row, LAP)];
	}

	/**
	 * Startet einen Lauf.
	 *
	 * @param {number} now Zeit in Sekunden (Zeitstempel der Zeichenschleife)
	 * @param {number} targetIndex gezogene Position, 0 bis 19
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
		// laufen, bis der Bremspunkt in der richtigen Phase liegt: 0 bis 20
		// Zellen.
		let ahead = mod(entryPhase - this.q, LAP);
		const brakeTime = (2 * BRAKE_CELLS) / this.cruise;

		// Reihenfolge sichern. Ein rasch mehrfach gedrücktes STOP könnte
		// sonst eine spätere Walze vor einer früheren zum Stehen bringen.
		// Angehängt werden ganze Umläufe – die ändern die Landezelle nicht
		// um ein Jota.
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
				// Gleichmäßige Beschleunigung: Strecke wächst mit dem
				// Quadrat der Zeit. Auf voller Länge sind das v × t / 2
				// Zellen.
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
					// Erst hier planen, nie im Anlauf: die Bremse setzt
					// einen stufenlosen Übergang von voller
					// Laufgeschwindigkeit voraus. Ein STOP im Anlauf wartet
					// also die 260 ms ab.
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
					this.restCell = this.restCellFor(this.targetIndex);
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

		this.paint(this.bandStart + mod(this.q - this.bandStart, LAP));
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
		this.element.style.setProperty('--fr-reel-pos', position.toFixed(3));
	}

	/**
	 * Setzt die Treffer-Hervorhebung einer einzelnen Zelle der Ruhelage.
	 *
	 * restCell liegt immer in [15, 35); restCell + 4 ≤ 38 < 40 ist damit
	 * stets ein gültiger Index in die 40 .fr-cell.
	 *
	 * @param {number} row 0 (oben) bis 4 (unten)
	 * @returns {void}
	 */
	markCell(row) {
		this.cells[this.restCell + row]?.classList.add('fr-cell--win');
	}

	/** Nimmt die Treffer-Hervorhebung aller Zellen dieser Walze zurück. */
	clearWin() {
		for (const cell of this.cells) {
			cell.classList.remove('fr-cell--win');
		}
	}
}

export default Reel;
