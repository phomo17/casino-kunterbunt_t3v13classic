/**
 * Reel Slot – Zustandsmaschine und Rundenablauf
 * =============================================================
 *
 * Die eine Stelle, an der der Automat weiß, was gerade los ist.
 * CONCEPT.md Abschnitt 5, Grundsatz 8: „Zustand nur an einer Stelle. Der
 * sichtbare Zustand des Gehäuses wird ausschließlich aus ihr abgeleitet, nie
 * parallel gepflegt."
 *
 *
 * DER ABLAUF EINER RUNDE (CONCEPT.md Abschnitt 3.3)
 * -------------------------------------------------
 *   1. Hebel gezogen.
 *   2. IN DIESEM MOMENT wird gewürfelt – dreimal unabhängig, je gleichverteilt
 *      über die 20 Rasterpositionen der eigenen Walze. Nur diese Ziehung
 *      erzeugt die Zahlen aus Anhang C.
 *   3. Die Walzen laufen an.
 *   4. STOP hält die erste noch laufende Walze an.
 *   5. Ohne Druck halten sie von allein: 1,2 s / 1,9 s / 2,6 s ab Hebelzug.
 *   6. Stehen alle drei, wird ausgewertet.
 *
 *
 * WARUM DER DRUCKZEITPUNKT DAS ERGEBNIS NICHT ÄNDERN KANN
 * -------------------------------------------------------
 * Drei bauliche Sperren, nicht eine Absichtserklärung:
 *
 *  1. Gewürfelt wird ausschließlich in startRound(). Es gibt in dieser Datei
 *     genau einen Aufruf von drawIndex(). stopNext() kennt this.draw nicht und
 *     fasst es nicht an.
 *  2. Reel.requestStop() nimmt kein Ziel entgegen (siehe reel.js). Eine Walze
 *     kann ihren Zielindex nach start() nicht mehr ändern; STOP entscheidet
 *     allein über den Zeitpunkt der Bremse, nie über deren Ende.
 *  3. Die Ziehung steht ab dem Hebelzug als data-rs-round am Gehäuse. Sie ist
 *     damit VOR dem ersten STOP von außen ablesbar und danach nachprüfbar —
 *     der Nachweis ist eine Zeile im Prüfskript, keine Glaubensfrage.
 *     Ein Nachteil ist das nicht: CONCEPT.md Abschnitt 4 hält ausdrücklich
 *     fest, dass im Browser gewürfelt wird und das Ergebnis dort einsehbar
 *     ist. Es geht um kein echtes Geld.
 *
 *
 * WARUM DIE AUSWERTUNG IMMER ZU DEN SICHTBAREN SYMBOLEN PASST
 * -----------------------------------------------------------
 * Ausgewertet wird NICHT die Ziehung, sondern das, was auf der Gewinnlinie
 * steht: reel.symbolOnPayline() liest den Namen aus derselben Symbolliste, aus
 * der auch das Band gebaut ist (data-rs-strip), an derselben Zelle, die als
 * --rs-reel-pos im DOM steht. Sichtbares und Bewertetes sind damit dieselbe
 * Zahl, nicht zwei Zahlen, die übereinstimmen sollen.
 * Die Kontrollrechnung in finishRound() vergleicht zusätzlich Ruhelage und
 * Ziehung. Schlüge sie je an, wäre die Anzeige trotzdem richtig – nur die
 * Bewegung wäre falsch gelandet. Genau die richtige Fehlerrichtung.
 *
 *
 * WIE DIE PHASEN 7 BIS 10 HIER ANDOCKEN
 * -------------------------------------
 * Über vier DOM-Ereignisse am Gehäuse (.rs-machine), nicht über Importe.
 * Eine spätere Phase hört zu, ohne diese Datei anzufassen:
 *
 *   rs:round      vor dem Anlaufen. detail: { draw, bet }. ABBRECHBAR –
 *                  preventDefault() lässt die Runde nicht zustande kommen.
 *                  Phase 7 bucht hier ab oder bricht mit „GUTHABEN ZU GERING".
 *   rs:reelrest   je Walze beim Stillstand. detail: { reel, cell, symbol }.
 *                  Phase 10 hängt den Walzenstopp-Klang daran.
 *   rs:result     nach dem Anzeigen. detail: { symbols, row, factor, bet, win }.
 *                  Phase 7 verrechnet hier und fragt dabei über das
 *                  abbrechbare rs:payout, ob jemand den Gewinn übernehmen
 *                  will; genau dort hängt Phase 8 die Risiko-Leiter ein.
 *                  Phase 9 spannt hier ihre Pause bis zum nächsten Zug.
 *   rs:state      jeder Zustandswechsel. detail: { from, to }.
 *
 * Alle vier steigen auf (bubbles), sind also auch am Dokument zu hören.
 *
 *
 * DAS EINE EREIGNIS, DAS DIESE DATEI ENTGEGENNIMMT
 * ------------------------------------------------
 *   rs:spin       „Zieh jetzt den Hebel." Nicht abbrechbar, ohne detail.
 *                  Wirkung: genau ein startRound(), also GENAU DERSELBE Weg
 *                  wie beim Menschen — es wird gewürfelt, das abbrechbare
 *                  rs:round wird gefeuert, die Kasse bucht ab, risk.js sieht
 *                  es. Es gibt keinen zweiten Rundenweg.
 *
 * Phase 9 (auto.js) benutzt das, um den nächsten Zug auszulösen. Ob die Runde
 * zustande kam, ist am folgenden rs:state (to: 'spinning') abzulesen — bleibt
 * es aus, hat jemand rs:round abgebrochen. Ein Rückgabewert wäre bei einem
 * Ereignis nicht zu haben, und ein zweites Vetorecht an rs:spin wäre ein
 * zweiter Mechanismus für dieselbe Frage.
 *
 * Dieselbe Bauform benutzt risk.js seit Phase 8 mit rs:riskcollect. Ein
 * Zustand „auto" ist dafür ausdrücklich NICHT entstanden: die Zustandsmaschine
 * beschreibt den Zug, nicht die Betriebsart (Begründung im Kopf von auto.js).
 */

import { drawIndex } from '@phomo17/reel-slot/rng.js';
import { evaluate } from '@phomo17/reel-slot/paytable.js';
import { Reel } from '@phomo17/reel-slot/reel.js';
import { Lever } from '@phomo17/reel-slot/lever.js';
import { findNixieGroup } from '@phomo17/reel-slot/nixie.js';

/** Rasterpositionen je Walze (Anhang C). */
const LAP = 20;

/**
 * Die Zustände des Automaten.
 *
 * CONCEPT.md Abschnitt 5, Grundsatz 8 nennt die Kette
 * „leerlauf → dreht → hält an → auswertung → risiko → …". Die ersten vier sind
 * Phase 6; „result" ist der Ruhepunkt danach, an dem Phase 8 die Risiko-Leiter
 * einhängt und Phase 9 den nächsten Zug anstößt.
 */
export const STATE = Object.freeze({
	IDLE: 'idle',
	SPINNING: 'spinning',
	STOPPING: 'stopping',
	EVALUATING: 'evaluating',
	RESULT: 'result',
});

/**
 * Erlaubte Übergänge. Ein nicht aufgeführter Übergang ist ein Programmfehler
 * und wird laut gemeldet, statt still einen unmöglichen Zustand herzustellen.
 *
 * Phase 8 hat diese Tabelle entgegen der früheren Vermutung NICHT erweitert.
 * Die Risiko-Leiter ist ein eigener Zustandsautomat in risk.js und lässt den
 * Automaten währenddessen in RESULT stehen — sie muss es sogar: im Angebot
 * MUSS der Hebel wirken (er nimmt den Gewinn und startet den nächsten Zug),
 * in der Leiter darf er es nicht. Ein Zustand mit canPull === false könnte nur
 * das Zweite. Wirkungslos ist der Hebel in der Leiter deshalb nicht über einen
 * Zustand, sondern weil risk.js das abbrechbare rs:round abbricht und die
 * Weitergabe stoppt. Einzelheiten im Kopf von risk.js.
 */
const TRANSITIONS = Object.freeze({
	[STATE.IDLE]: [STATE.SPINNING],
	[STATE.SPINNING]: [STATE.STOPPING],
	[STATE.STOPPING]: [STATE.EVALUATING],
	[STATE.EVALUATING]: [STATE.RESULT],
	[STATE.RESULT]: [STATE.SPINNING],
});

/**
 * Selbsttätiger Halt je Walze, in Sekunden ab Hebelzug (CONCEPT.md 3.3).
 *
 * Ausgelöst wird damit genau dasselbe wie durch einen STOP-Druck: der Halt
 * wird BEFOHLEN. Bis zum Stillstand vergehen danach noch Auslauf, Bremse und
 * Nachfedern, also 0,58 bis rund 1,1 Sekunden. Diese Lesart ist gewählt, weil
 * das Konzept den selbsttätigen Halt ausdrücklich als Ersatz für den nicht
 * erfolgten Druck beschreibt („Wird nicht gedrückt, halten die Walzen von
 * allein an"). Handbedienung und Zeitgeber laufen dadurch durch denselben
 * Weg, und es gibt keinen zweiten Bewegungsablauf, der eigens stimmen müsste.
 */
const AUTO_STOP_S = Object.freeze([1.2, 1.9, 2.6]);

/**
 * Mindestabstand zwischen zwei Stillständen, in Sekunden.
 *
 * Dreimal schnell hintereinander gedrücktes STOP könnte sonst Walze 2 vor
 * Walze 1 zum Stehen bringen, weil der Auslauf je nach Lage unterschiedlich
 * lang ist. reel.planBrake() hängt in diesem Fall ganze Umläufe an – die
 * ändern die Landezelle nicht.
 */
const MIN_GAP_S = 0.1;

/** Voreingestellter Einsatz, falls keine Taste als gewählt markiert ist. */
const DEFAULT_BET = 1;

/**
 * Ein bedienbarer Automat.
 */
export class Machine {
	/**
	 * @param {HTMLElement} root ein .rs-machine
	 * @throws {Error} wenn das Gehäuse nicht dem Markup aus Phase 5 entspricht
	 */
	constructor(root) {
		const cabinet = root.querySelector('.rs-cabinet');
		if (cabinet === null) {
			throw new Error('Kein .rs-cabinet im Automaten gefunden.');
		}

		this.root = root;
		this.cabinet = cabinet;

		/** @type {Reel[]} */
		this.reels = [...cabinet.querySelectorAll('.rs-reel')].map((element) => new Reel(element));
		if (this.reels.length !== 3) {
			throw new Error(`Der Automat braucht genau drei Walzen, gefunden: ${this.reels.length}.`);
		}

		this.payline = cabinet.querySelector('.rs-payline');
		this.winDisplay = findNixieGroup(cabinet, 'gewinn');
		this.stopButton = cabinet.querySelector('.rs-btn[data-rs-button="stop"]');

		/** @type {string} */
		this.currentState = STATE.IDLE;
		/** Die Ziehung der laufenden Runde. Nur in startRound() geschrieben. */
		this.draw = null;
		/** Zeitpunkt des Hebelzugs, in Sekunden auf der Uhr der Zeichenschleife. */
		this.spinTime = 0;
		/** Kennung der laufenden Zeichenschleife, oder 0. */
		this.frame = 0;

		this.frameStep = (timestamp) => this.tickFrame(timestamp / 1000);

		const leverElement = cabinet.querySelector('.rs-lever');
		this.lever = leverElement === null
			? null
			: new Lever(leverElement, cabinet, () => this.startRound());

		this.wireStopButton();
		this.wireSpinRequest();
	}

	/** Der aktuelle Zustand. */
	get state() {
		return this.currentState;
	}

	/** Darf der Hebel eine neue Runde starten? */
	get canPull() {
		return this.currentState === STATE.IDLE || this.currentState === STATE.RESULT;
	}

	/**
	 * Wechselt den Zustand und meldet den Wechsel.
	 *
	 * @param {string} next
	 * @returns {void}
	 */
	setState(next) {
		const allowed = TRANSITIONS[this.currentState] ?? [];
		if (!allowed.includes(next)) {
			console.error(`[reel-slot] Unzulässiger Zustandswechsel: ${this.currentState} → ${next}`);
			return;
		}
		const from = this.currentState;
		this.currentState = next;
		this.emit('rs:state', { from, to: next });
	}

	/**
	 * Löst ein Ereignis am Gehäuse aus.
	 *
	 * @param {string} name
	 * @param {object} detail
	 * @param {boolean} [cancelable]
	 * @returns {CustomEvent}
	 */
	emit(name, detail, cancelable = false) {
		const event = new CustomEvent(name, { detail, cancelable, bubbles: true });
		this.root.dispatchEvent(event);
		return event;
	}

	/**
	 * Liest den gewählten Einsatz aus dem Gehäuse.
	 *
	 * Phase 6 verrechnet nichts (CONCEPT.md Abschnitt 6, Phase 6: „Noch ohne
	 * Guthabenverrechnung — der Gewinnbetrag wird nur angezeigt"), aber der
	 * angezeigte Betrag ist laut Abschnitt 3.3 Tabellenwert × Einsatz. Der
	 * Einsatz wird deshalb gelesen, die Tasten aber nicht verdrahtet: das
	 * Umschalten ist Phase 7. Bis dahin steht .rs-bet--selected fest auf 1,
	 * und sobald Phase 7 die Klasse umhängt, stimmt der Betrag ohne eine
	 * einzige Änderung an dieser Datei.
	 *
	 * @returns {number}
	 */
	readBet() {
		const chosen = this.cabinet.querySelector('.rs-bet--selected[data-rs-bet]');
		const value = Number.parseInt(chosen?.getAttribute('data-rs-bet') ?? '', 10);
		return Number.isInteger(value) && value > 0 ? value : DEFAULT_BET;
	}

	/**
	 * Startet eine Runde. Wird vom Hebel gerufen.
	 *
	 * @returns {boolean} true, wenn die Runde zustande kam
	 */
	startRound() {
		if (!this.canPull) {
			return false;
		}

		// Der eine Würfelwurf. Drei unabhängige Ziehungen, je gleichverteilt
		// über die 20 Rasterpositionen der eigenen Walze – genau das Modell,
		// aus dem die Zahlen in Anhang C gerechnet sind.
		const draw = Object.freeze([drawIndex(LAP), drawIndex(LAP), drawIndex(LAP)]);
		const bet = this.readBet();

		// Phase 7 bucht hier ab und kann die Runde absagen.
		if (this.emit('rs:round', { draw, bet }, true).defaultPrevented) {
			return false;
		}

		this.draw = draw;
		// Prüfsiegel: die Ziehung steht ab jetzt und vor dem ersten STOP am
		// Gehäuse. Siehe Dateikopf.
		this.root.dataset.rsRound = draw.join('-');

		this.clearResult();
		this.setState(STATE.SPINNING);

		// performance.now() und die Zeitstempel von requestAnimationFrame
		// zählen von derselben Nullstelle. Der Hebelzug ist damit exakt der
		// Nullpunkt für die 1,2 / 1,9 / 2,6 Sekunden.
		this.spinTime = globalThis.performance.now() / 1000;
		for (let i = 0; i < 3; i++) {
			this.reels[i].start(this.spinTime, draw[i]);
		}

		this.startLoop();
		return true;
	}

	/**
	 * STOP: hält die erste noch laufende Walze an.
	 *
	 * Stehen bereits alle drei oder läuft keine Runde, tut die Taste nichts —
	 * ausdrücklich so verlangt in CONCEPT.md Abschnitt 3.3.
	 *
	 * @returns {void}
	 */
	stopNext() {
		if (this.currentState !== STATE.SPINNING && this.currentState !== STATE.STOPPING) {
			return;
		}
		const reel = this.reels.find((candidate) => candidate.stoppable);
		if (reel === undefined) {
			return;
		}
		this.commandStop(reel);
	}

	/**
	 * @param {Reel} reel
	 * @returns {void}
	 */
	commandStop(reel) {
		const previous = reel.slot === 0 ? null : this.reels[reel.slot - 1];
		reel.requestStop(previous === null ? 0 : previous.restTime + MIN_GAP_S);
		if (this.currentState === STATE.SPINNING) {
			this.setState(STATE.STOPPING);
		}
	}

	/** Startet die Zeichenschleife, falls sie nicht schon läuft. */
	startLoop() {
		if (this.frame === 0) {
			this.frame = globalThis.requestAnimationFrame(this.frameStep);
		}
	}

	/**
	 * Ein Bild. Eine einzige Schleife für alle drei Walzen — drei getrennte
	 * Schleifen würden dieselbe Arbeit dreifach anmelden und könnten
	 * gegeneinander verrutschen.
	 *
	 * Auch die selbsttätigen Halte hängen hier und nicht an setTimeout: so gibt
	 * es genau eine Uhr, keinen Zeitgeber, der nach dem Rundenende noch
	 * feuert, und nichts, was Phase 9 gesondert aufräumen müsste.
	 *
	 * @param {number} now Zeit in Sekunden
	 * @returns {void}
	 */
	tickFrame(now) {
		this.frame = 0;
		const elapsed = now - this.spinTime;

		for (let i = 0; i < 3; i++) {
			const reel = this.reels[i];

			if (reel.stoppable && elapsed >= AUTO_STOP_S[i]) {
				this.commandStop(reel);
			}

			// Der früheste erlaubte Stillstand wird bis zur Bremsplanung
			// nachgeführt: beim Befehl steht die Bremse der Vorgängerwalze
			// unter Umständen noch nicht fest. Die Walzen werden von links
			// nach rechts getickt, die Vorgängerin hat also in diesem Bild
			// bereits geplant, falls sie geplant hat.
			if (i > 0 && reel.stopRequested && reel.restTime === 0) {
				reel.earliestRest = this.reels[i - 1].restTime + MIN_GAP_S;
			}

			if (reel.tick(now)) {
				this.emit('rs:reelrest', {
					reel: reel.number,
					cell: reel.restCell,
					symbol: reel.symbolOnPayline(),
				});
			}
		}

		if (this.reels.every((reel) => reel.atRest)) {
			this.finishRound();
			return;
		}

		this.frame = globalThis.requestAnimationFrame(this.frameStep);
	}

	/**
	 * Wertet aus, zeigt an, hebt hervor.
	 *
	 * @returns {void}
	 */
	finishRound() {
		this.setState(STATE.EVALUATING);

		// Gelesen wird, was auf der Gewinnlinie STEHT – nicht, was gezogen
		// wurde. Siehe Dateikopf.
		const symbols = this.reels.map((reel) => reel.symbolOnPayline());
		const row = evaluate(symbols);
		const bet = this.readBet();
		const factor = row === null ? 0 : row.factor;
		const win = factor * bet;

		// Kontrollrechnung. Darf nie anschlagen; wenn doch, ist die Bewegung
		// falsch gelandet und nicht die Auswertung falsch.
		for (let i = 0; i < 3; i++) {
			const landed = ((this.reels[i].restCell % LAP) + LAP) % LAP;
			if (landed !== this.draw[i]) {
				console.error(
					`[reel-slot] Walze ${i + 1} steht auf Position ${landed}, gezogen war ${this.draw[i]}.`
				);
			}
		}

		if (this.winDisplay !== null) {
			this.winDisplay.show(win);
		}

		if (row !== null) {
			for (let i = 0; i < 3; i++) {
				if (row.reels[i]) {
					this.reels[i].markWin();
				}
			}
			this.payline?.classList.add('rs-payline--win');
		}

		this.setState(STATE.RESULT);
		this.emit('rs:result', {
			symbols: Object.freeze(symbols),
			row: row === null ? null : row.id,
			factor,
			bet,
			win,
		});
	}

	/**
	 * Räumt die Anzeige des vorigen Ergebnisses ab.
	 *
	 * @returns {void}
	 */
	clearResult() {
		for (const reel of this.reels) {
			reel.clearWin();
		}
		this.payline?.classList.remove('rs-payline--win');
		this.winDisplay?.show(0);
	}

	/**
	 * Verdrahtet die STOP-Taste.
	 *
	 * Ausgelöst wird auf pointerdown, nicht auf click: eine Halte-Taste an
	 * einem Spielautomaten reagiert im Moment des Drückens, nicht beim
	 * Loslassen. .rs-btn--pressed hält die Kappe unten, solange gedrückt
	 * wird; machine.css hat dafür zusätzlich :active, das aber verloren geht,
	 * sobald der Zeiger die Taste verlässt.
	 *
	 * @returns {void}
	 */
	wireStopButton() {
		if (this.stopButton === null) {
			return;
		}

		this.onStopDown = (event) => {
			if (!event.isPrimary) {
				return;
			}
			this.stopButton.classList.add('rs-btn--pressed');
			this.stopNext();
		};
		this.onStopRelease = () => {
			this.stopButton.classList.remove('rs-btn--pressed');
		};

		this.stopButton.addEventListener('pointerdown', this.onStopDown);
		this.stopButton.addEventListener('pointerup', this.onStopRelease);
		this.stopButton.addEventListener('pointercancel', this.onStopRelease);
		this.stopButton.addEventListener('pointerleave', this.onStopRelease);
	}

	/**
	 * Nimmt rs:spin entgegen: eine Runde von außen anstoßen.
	 *
	 * Der ganze Vertrag ist eine Zeile Wirkung. Absichtlich KEINE eigene
	 * Prüfung, keine eigene Absage, kein eigenes Veto: startRound() prüft
	 * canPull selbst und feuert das abbrechbare rs:round wie immer. Damit
	 * läuft ein von Phase 9 ausgelöster Zug durch genau dieselben Sperren wie
	 * ein von Hand gezogener — Abbuchung und Vetoketten können nicht umgangen
	 * werden. Einzelheiten im Dateikopf.
	 *
	 * @returns {void}
	 */
	wireSpinRequest() {
		this.onSpinRequest = () => {
			this.startRound();
		};
		this.root.addEventListener('rs:spin', this.onSpinRequest);
	}

	/**
	 * Hält alles an und meldet alle Zuhörer ab.
	 *
	 * Wird beim Verlassen der Seite gerufen. Phase 9 verlangt ausdrücklich
	 * „Sauberes Aufräumen laufender Zeitgeber beim Verlassen der Seite".
	 *
	 * @returns {void}
	 */
	destroy() {
		if (this.frame !== 0) {
			globalThis.cancelAnimationFrame(this.frame);
			this.frame = 0;
		}
		this.lever?.destroy();
		this.winDisplay?.destroy();
		this.root.removeEventListener('rs:spin', this.onSpinRequest);

		// Der Zustand gehört zum laufenden Betrieb, nicht zum Gehäuse. risk.js
		// und auto.js räumen ihre data-Attribute genauso ab; ohne diese Zeile
		// bliebe die Ziehung der letzten Runde am Element kleben.
		delete this.root.dataset.rsRound;

		if (this.stopButton !== null) {
			this.stopButton.removeEventListener('pointerdown', this.onStopDown);
			this.stopButton.removeEventListener('pointerup', this.onStopRelease);
			this.stopButton.removeEventListener('pointercancel', this.onStopRelease);
			this.stopButton.removeEventListener('pointerleave', this.onStopRelease);
			this.stopButton.classList.remove('rs-btn--pressed');
		}
	}
}

export default Machine;
