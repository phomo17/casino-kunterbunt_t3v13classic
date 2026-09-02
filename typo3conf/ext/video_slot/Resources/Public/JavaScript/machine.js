/**
 * Video Slot – Zustandsmaschine und Rundenablauf
 * =============================================================
 *
 * Die eine Stelle, an der der Automat weiß, was gerade los ist. Der
 * sichtbare Zustand des Gehäuses wird ausschließlich aus ihr abgeleitet, nie
 * parallel gepflegt — dieselbe Bauform wie reel_slot/machine.js.
 *
 *
 * DER ABLAUF EINER RUNDE
 * -----------------------------
 *   1. START gedrückt → startRound().
 *   2. IN DIESEM MOMENT wird gewürfelt – fünfmal unabhängig, je
 *      gleichverteilt über die 25 Rasterpositionen der eigenen Walze. Nur
 *      diese Ziehung erzeugt die Zahlen aus Anhang D.
 *   3. Abbrechbares vs:round (detail: {draw, bet}) — Phase 7 bucht hier ab
 *      oder sagt ab.
 *   4. this.root.dataset.vsRound = draw.join('-') — Prüfsiegel: die Ziehung
 *      steht vor dem ersten STOP von außen ablesbar am Gehäuse.
 *   5. Die Walzen laufen an.
 *   6. Selbsttätiger Halt ab 1,2/1,8/2,4/3,0/3,6 s ab Start, sofern nicht
 *      vorher gedrückt.
 *   7. STOP hält die erste noch laufende Walze an.
 *   8. Stehen alle fünf, wird ausgewertet (finishRound()).
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
 *  3. Die Ziehung steht ab dem Tastendruck als data-vs-round am Gehäuse. Sie
 *     ist damit VOR dem ersten STOP von außen ablesbar und danach
 *     nachprüfbar.
 *
 *
 * WARUM DIE AUSWERTUNG IMMER ZU DEN SICHTBAREN SYMBOLEN PASST
 * -----------------------------------------------------------
 * Ausgewertet wird NICHT die Ziehung, sondern das, was im Fenster STEHT:
 * reel.symbolAt(row) liest den Namen aus derselben Symbolliste, aus der auch
 * das Band gebaut ist (data-vs-strip), an derselben Zelle, die als
 * --vs-reel-pos im DOM steht. Sichtbares und Bewertetes sind damit dieselbe
 * Zahl, nicht zwei Zahlen, die übereinstimmen sollen. Die Kontrollrechnung in
 * finishRound() vergleicht zusätzlich Ruhelage und Ziehung. Schlüge sie je
 * an, wäre die Anzeige trotzdem richtig – nur die Bewegung wäre falsch
 * gelandet. Genau die richtige Fehlerrichtung.
 *
 *
 * TASTENVERDRAHTUNG — VERBESSERUNG GEGENÜBER DEM REEL SLOT
 * ----------------------------------------------------------------------
 * Der Reel Slot hängt STOP nur an pointerdown; mit der Tastatur ist die Taste
 * dort nicht bedienbar. CONCEPT B.1 verlangt für dieses Gerät volle
 * Barrierefreiheit. wirePressButton() löst das für START und STOP:
 *
 *   - pointerdown (nur event.isPrimary) → Kappe drückt, Aktion SOFORT,
 *     consumeClick = true;
 *   - click → wenn consumeClick gesetzt: zurücksetzen und NICHTS tun; sonst
 *     Aktion (das ist der Tastaturweg: eine per Enter/Leertaste ausgelöste
 *     Schaltfläche feuert click ohne vorheriges pointerdown);
 *   - pointerup/pointercancel/pointerleave → Kappe löst.
 *
 * Damit wirkt die Taste beim Drücken (Gefühl) UND ist mit der Tastatur
 * bedienbar. Der Reel Slot wird in dieser Phase NICHT angefasst.
 *
 *
 * WIE PHASE 7 HIER ANDOCKT
 * -------------------------------------
 * Über vier DOM-Ereignisse am Gehäuse (.vs-machine), nicht über Importe:
 *
 *   vs:round      vor dem Anlaufen. detail: {draw, bet}. ABBRECHBAR – die
 *                 Kasse bucht ab oder sagt ab.
 *   vs:reelrest   je Walze beim Stillstand. detail: {reel, cell, symbols}.
 *                 Phase 7 hängt den Walzenstopp-Klang daran.
 *   vs:result     nach dem Anzeigen. detail:
 *                 {grid, lines, scatter, factor, bet, win}. Die Kasse
 *                 verrechnet hier, die Risiko-Leiter hängt sich über das
 *                 dort gefeuerte vs:payout ein.
 *   vs:state      jeder Zustandswechsel. detail: {from, to}. Der Auto-Modus
 *                 liest daran ab, ob die Runde zustande kam.
 *
 * Alle vier steigen auf (bubbles), sind also auch am Dokument zu hören.
 *
 * Entgegengenommen wird vs:spin — „starte jetzt eine Runde", ohne detail,
 * nicht abbrechbar. Wirkung: genau ein startRound(), also DERSELBE Weg wie
 * beim Menschen; es gibt keinen zweiten Rundenweg und damit keine
 * Möglichkeit, die Abbuchung zu umgehen.
 */

import { drawIndex } from '@phomo17/video-slot/rng.js';
import { evaluate } from '@phomo17/video-slot/paytable.js';
import { Reel } from '@phomo17/video-slot/reel.js';
import { findNixieGroup } from '@phomo17/video-slot/nixie.js';
import { GridAnnouncer } from '@phomo17/video-slot/grid-announce.js';

/** Rasterpositionen je Walze (Anhang D). */
const LAP = 25;

/** Sichtbare Zeilen je Walze (Anhang D). */
const ROWS = 3;

/** Walzen (Anhang D). */
const REELS = 5;

/**
 * Die Zustände des Automaten.
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
 */
const TRANSITIONS = Object.freeze({
	[STATE.IDLE]: [STATE.SPINNING],
	[STATE.SPINNING]: [STATE.STOPPING],
	[STATE.STOPPING]: [STATE.EVALUATING],
	[STATE.EVALUATING]: [STATE.RESULT],
	[STATE.RESULT]: [STATE.SPINNING],
});

/**
 * Selbsttätiger Halt je Walze, in Sekunden ab Tastendruck.
 *
 * Teil A 3.3 nennt für drei Walzen 1,2/1,9/2,6 s (0,7 s Abstand); fünf Walzen
 * mit 0,7 s bräuchten 4,0 s. 0,6 s Abstand hält die Runde bei 3,6 s und damit
 * nahe am Gefühl des dreiwalzigen Geräts.
 */
const AUTO_STOP_S = Object.freeze([1.2, 1.8, 2.4, 3.0, 3.6]);

/**
 * Mindestabstand zwischen zwei Stillständen, in Sekunden.
 *
 * Mehrfach schnell hintereinander gedrücktes STOP könnte sonst eine spätere
 * Walze vor einer früheren zum Stehen bringen, weil der Auslauf je nach Lage
 * unterschiedlich lang ist. reel.planBrake() hängt in diesem Fall ganze
 * Umläufe an – die ändern die Landezelle nicht.
 */
const MIN_GAP_S = 0.1;

/** Voreingestellter Einsatz, falls keine Taste als gewählt markiert ist. */
const DEFAULT_BET = 1;

/**
 * Verdrahtet eine Drucktaste für Zeiger UND Tastatur.
 *
 * @param {?HTMLElement} element
 * @param {string} pressedClass Klasse für die gedrückte Kappe
 * @param {() => void} action
 * @returns {?() => void} Abmelde-Funktion, oder null, wenn element fehlt
 */
function wirePressButton(element, pressedClass, action) {
	if (element === null) {
		return null;
	}

	let consumeClick = false;

	const onPointerDown = (event) => {
		if (!event.isPrimary) {
			return;
		}
		element.classList.add(pressedClass);
		consumeClick = true;
		action();
	};
	const onClick = () => {
		if (consumeClick) {
			// Das war der Zeigerweg: pointerdown hat die Aktion schon
			// ausgelöst, das nachfolgende click wird verworfen.
			consumeClick = false;
			return;
		}
		// Kein vorheriges pointerdown: eine per Enter/Leertaste ausgelöste
		// Schaltfläche feuert click ohne pointerdown – das ist der
		// Tastaturweg.
		action();
	};
	const onRelease = () => {
		element.classList.remove(pressedClass);
	};

	element.addEventListener('pointerdown', onPointerDown);
	element.addEventListener('click', onClick);
	element.addEventListener('pointerup', onRelease);
	element.addEventListener('pointercancel', onRelease);
	element.addEventListener('pointerleave', onRelease);

	return () => {
		element.removeEventListener('pointerdown', onPointerDown);
		element.removeEventListener('click', onClick);
		element.removeEventListener('pointerup', onRelease);
		element.removeEventListener('pointercancel', onRelease);
		element.removeEventListener('pointerleave', onRelease);
		element.classList.remove(pressedClass);
	};
}

/**
 * Ein bedienbarer Automat.
 */
export class Machine {
	/**
	 * @param {HTMLElement} root ein .vs-machine
	 * @throws {Error} wenn das Gehäuse nicht dem Markup aus Phase 5/6 entspricht
	 */
	constructor(root) {
		const cabinet = root.querySelector('.vs-cabinet');
		if (cabinet === null) {
			throw new Error('Kein .vs-cabinet im Automaten gefunden.');
		}

		this.root = root;
		this.cabinet = cabinet;

		/** @type {Reel[]} */
		this.reels = [...cabinet.querySelectorAll('.vs-reel')].map((element) => new Reel(element));
		if (this.reels.length !== REELS) {
			throw new Error(`Der Automat braucht genau fünf Walzen, gefunden: ${this.reels.length}.`);
		}

		this.winDisplay = findNixieGroup(cabinet, 'gewinn');

		const announceElement = cabinet.querySelector('[data-vs-grid-announce]');
		if (announceElement === null) {
			throw new Error('Kein [data-vs-grid-announce] im Sichtfeld gefunden.');
		}
		this.gridAnnouncer = new GridAnnouncer(announceElement);

		this.startButton = cabinet.querySelector('.vs-start[data-vs-button="start"]');
		this.stopButton = cabinet.querySelector('.vs-btn[data-vs-button="stop"]');

		/** @type {string} */
		this.currentState = STATE.IDLE;
		/** Die Ziehung der laufenden Runde. Nur in startRound() geschrieben. */
		this.draw = null;
		/** Zeitpunkt des Tastendrucks, in Sekunden auf der Uhr der Zeichenschleife. */
		this.spinTime = 0;
		/** Kennung der laufenden Zeichenschleife, oder 0. */
		this.frame = 0;

		this.frameStep = (timestamp) => this.tickFrame(timestamp / 1000);

		this.disposeStart = wirePressButton(this.startButton, 'vs-start--pressed', () => this.startRound());
		this.disposeStop = wirePressButton(this.stopButton, 'vs-btn--pressed', () => this.stopNext());

		this.wireSpinRequest();

		// Erste Ansage beim Seitenaufbau, ohne Wartezeit: der Anfangsstand
		// des Sichtfelds, keine Änderungsmeldung.
		this.gridAnnouncer.showGrid(this.readGrid());
	}

	/** Der aktuelle Zustand. */
	get state() {
		return this.currentState;
	}

	/** Darf ein Tastendruck eine neue Runde starten? */
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
			console.error(`[video-slot] Unzulässiger Zustandswechsel: ${this.currentState} → ${next}`);
			return;
		}
		const from = this.currentState;
		this.currentState = next;
		this.emit('vs:state', { from, to: next });
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
	 * Phase 6 verrechnet nichts, aber der angezeigte Betrag ist Tabellenwert
	 * × Einsatz. Der Einsatz wird deshalb gelesen, die Tasten aber nicht
	 * verdrahtet: das Umschalten ist Phase 7. Bis dahin steht
	 * .vs-bet--selected fest auf 1, und sobald Phase 7 die Klasse umhängt,
	 * stimmt der Betrag ohne eine einzige Änderung an dieser Datei.
	 *
	 * @returns {number}
	 */
	readBet() {
		const chosen = this.cabinet.querySelector('.vs-bet--selected[data-vs-bet]');
		const value = Number.parseInt(chosen?.getAttribute('data-vs-bet') ?? '', 10);
		return Number.isInteger(value) && value > 0 ? value : DEFAULT_BET;
	}

	/**
	 * Liest den aktuell im Fenster sichtbaren Feldzustand.
	 *
	 * @returns {string[][]} drei Zeilen zu je fünf Symbolnamen
	 */
	readGrid() {
		const grid = [new Array(REELS), new Array(REELS), new Array(REELS)];
		for (let reel = 0; reel < REELS; reel++) {
			for (let row = 0; row < ROWS; row++) {
				grid[row][reel] = this.reels[reel].symbolAt(row);
			}
		}
		return grid;
	}

	/**
	 * Startet eine Runde. Wird von START gerufen.
	 *
	 * @returns {boolean} true, wenn die Runde zustande kam
	 */
	startRound() {
		if (!this.canPull) {
			return false;
		}

		// Der eine Würfelwurf. Fünf unabhängige Ziehungen, je gleichverteilt
		// über die 25 Rasterpositionen der eigenen Walze – genau das Modell,
		// aus dem die Zahlen in Anhang D gerechnet sind.
		const draw = Object.freeze([drawIndex(LAP), drawIndex(LAP), drawIndex(LAP), drawIndex(LAP), drawIndex(LAP)]);
		const bet = this.readBet();

		// Phase 7 bucht hier ab und kann die Runde absagen.
		if (this.emit('vs:round', { draw, bet }, true).defaultPrevented) {
			return false;
		}

		this.draw = draw;
		// Prüfsiegel: die Ziehung steht ab jetzt und vor dem ersten STOP am
		// Gehäuse. Siehe Dateikopf.
		this.root.dataset.vsRound = draw.join('-');

		this.clearResult();
		this.setState(STATE.SPINNING);

		// performance.now() und die Zeitstempel von requestAnimationFrame
		// zählen von derselben Nullstelle. Der Tastendruck ist damit exakt
		// der Nullpunkt für die 1,2/1,8/2,4/3,0/3,6 Sekunden.
		this.spinTime = globalThis.performance.now() / 1000;
		for (let i = 0; i < REELS; i++) {
			this.reels[i].start(this.spinTime, draw[i]);
		}

		this.startLoop();
		return true;
	}

	/**
	 * STOP: hält die erste noch laufende Walze an.
	 *
	 * Stehen bereits alle fünf oder läuft keine Runde, tut die Taste nichts.
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
	 * Ein Bild. Eine einzige Schleife für alle fünf Walzen — fünf getrennte
	 * Schleifen würden dieselbe Arbeit fünffach anmelden und könnten
	 * gegeneinander verrutschen.
	 *
	 * Auch die selbsttätigen Halte hängen hier und nicht an setTimeout: so
	 * gibt es genau eine Uhr und keinen Zeitgeber, der nach dem Rundenende
	 * noch feuert.
	 *
	 * @param {number} now Zeit in Sekunden
	 * @returns {void}
	 */
	tickFrame(now) {
		this.frame = 0;
		const elapsed = now - this.spinTime;

		for (let i = 0; i < REELS; i++) {
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
				this.emit('vs:reelrest', {
					reel: reel.number,
					cell: reel.restCell,
					symbols: Object.freeze([reel.symbolAt(0), reel.symbolAt(1), reel.symbolAt(2)]),
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

		// Gelesen wird, was im FENSTER STEHT – nicht, was gezogen wurde.
		// Siehe Dateikopf.
		const grid = this.readGrid();
		const result = evaluate(grid);
		const bet = this.readBet();
		const win = result.factor * bet;

		// Kontrollrechnung. Darf nie anschlagen; wenn doch, ist die Bewegung
		// falsch gelandet und nicht die Auswertung falsch.
		for (let i = 0; i < REELS; i++) {
			const landed = this.reels[i].restCell % LAP;
			if (landed !== this.draw[i]) {
				console.error(
					`[video-slot] Walze ${i + 1} steht auf Position ${landed}, gezogen war ${this.draw[i]}.`
				);
			}
		}

		if (this.winDisplay !== null) {
			this.winDisplay.show(win);
		}

		for (const line of result.lines) {
			for (const [row, reel] of line.cells) {
				this.reels[reel].markCell(row);
			}
			this.cabinet.querySelector(`[data-vs-line="${line.index}"]`)?.classList.add('vs-payline--win');
		}
		if (result.scatter !== null) {
			for (const [row, reel] of result.scatter.cells) {
				this.reels[reel].markCell(row);
			}
		}

		this.gridAnnouncer.showResult(grid, result, win);

		this.setState(STATE.RESULT);
		this.emit('vs:result', {
			grid,
			lines: result.lines,
			scatter: result.scatter,
			factor: result.factor,
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
		for (const payline of this.cabinet.querySelectorAll('.vs-payline--win')) {
			payline.classList.remove('vs-payline--win');
		}
		this.winDisplay?.show(0);
		this.gridAnnouncer.clear();
	}

	/**
	 * Nimmt vs:spin entgegen: eine Runde von außen anstoßen.
	 *
	 * Der ganze Vertrag ist eine Zeile Wirkung. Absichtlich KEINE eigene
	 * Prüfung, keine eigene Absage, kein eigenes Veto: startRound() prüft
	 * canPull selbst und feuert das abbrechbare vs:round wie immer. Damit
	 * läuft ein von außen ausgelöster Zug durch genau dieselben Sperren wie
	 * ein von Hand gedrückter.
	 *
	 * @returns {void}
	 */
	wireSpinRequest() {
		this.onSpinRequest = () => {
			this.startRound();
		};
		this.root.addEventListener('vs:spin', this.onSpinRequest);
	}

	/**
	 * Hält alles an und meldet alle Zuhörer ab.
	 *
	 * Wird beim Verlassen der Seite gerufen.
	 *
	 * @returns {void}
	 */
	destroy() {
		if (this.frame !== 0) {
			globalThis.cancelAnimationFrame(this.frame);
			this.frame = 0;
		}
		this.winDisplay?.destroy();
		this.gridAnnouncer.destroy();
		this.root.removeEventListener('vs:spin', this.onSpinRequest);

		// Der Zustand gehört zum laufenden Betrieb, nicht zum Gehäuse.
		delete this.root.dataset.vsRound;

		this.disposeStart?.();
		this.disposeStop?.();
	}
}

export default Machine;
