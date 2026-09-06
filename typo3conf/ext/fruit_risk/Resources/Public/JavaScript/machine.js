/**
 * FruitRisk – Zustandsmaschine und Rundenablauf
 * ================================================
 *
 * Die eine Stelle, an der der Automat weiß, was gerade los ist. Der
 * sichtbare Zustand des Gehäuses wird ausschließlich aus ihr abgeleitet, nie
 * parallel gepflegt (CONCEPT.md Teil A Abschnitt 5, Grundsatz 8).
 *
 *
 * WARUM NEU GEBAUT UND NICHT KOPIERT (C.14.13)
 * -----------------------------------------------
 * Anderer Rundenablauf (jede Runde endet im Angebot), zwei Gewinnwege statt
 * einem, sechs Walzen zu fünf Reihen, kein Scatter, kein Einsatz zu lesen.
 *
 *
 * DER ABLAUF EINER RUNDE
 * -----------------------
 *   1. START gedrückt → startRound().
 *   2. IN DIESEM MOMENT wird gewürfelt — sechsmal unabhängig, je
 *      gleichverteilt über die 20 Bandpositionen der eigenen Walze.
 *   3. Abbrechbares fr:round ({draw, stake}) — wallet.js löst ein offenes
 *      Angebot ein, prüft die Deckung und bucht ab oder sagt ab.
 *   4. data-fr-round trägt die Ziehung: das Prüfsiegel steht VOR dem ersten
 *      STOP von außen ablesbar am Gehäuse.
 *   5. Die Walzen laufen an.
 *   6. Selbsttätiger Halt ab 1,2 / 1,7 / 2,2 / 2,7 / 3,2 / 3,7 s ab
 *      Tastendruck.
 *   7. STOP hält die erste noch laufende Walze an.
 *   8. Stehen alle sechs, wird ausgewertet (finishRound()), und die Runde
 *      endet im ANGEBOT.
 *
 *
 * WARUM DER DRUCKZEITPUNKT DAS ERGEBNIS NICHT ÄNDERN KANN
 * -------------------------------------------------------
 * Drei bauliche Sperren, nicht eine Absichtserklärung:
 *
 *  1. Gewürfelt wird ausschließlich in startRound(). Es gibt in dieser Datei
 *     genau einen Aufruf von drawIndex(). stopNext() kennt this.draw nicht
 *     und fasst es nicht an.
 *  2. Reel.requestStop() nimmt kein Ziel entgegen (siehe reel.js). Eine
 *     Walze kann ihren Zielindex nach start() nicht mehr ändern; STOP
 *     entscheidet allein über den Zeitpunkt der Bremse, nie über deren Ende.
 *  3. Die Ziehung steht ab dem Tastendruck als data-fr-round am Gehäuse. Sie
 *     ist damit VOR dem ersten STOP von außen ablesbar und danach
 *     nachprüfbar.
 *
 *
 * WARUM DIE AUSWERTUNG IMMER ZU DEN SICHTBAREN SYMBOLEN PASST
 * -----------------------------------------------------------
 * Ausgewertet wird NICHT die Ziehung, sondern das, was im Fenster STEHT:
 * reel.symbolAt(row) liest den Namen aus derselben Symbolliste, aus der auch
 * das Band gebaut ist (data-fr-strip), an derselben Zelle, die als
 * --fr-reel-pos im DOM steht. Sichtbares und Bewertetes sind damit dieselbe
 * Zahl, nicht zwei Zahlen, die übereinstimmen sollen.
 *
 * KEINE „KONTROLLRECHNUNG" IN finishRound() (Behebungslauf REVIEW-fruitrisk-f4.md
 * [H3]): Eine frühere Fassung verglich dort restCell % LAP mit draw[i]. Das
 * sieht wie eine unabhängige Gegenprobe aus, ist aber keine: restCellFor()
 * (reel.js) ist so gebaut, dass ihr Ergebnis modulo LAP immer wieder genau
 * targetIndex ergibt — und targetIndex ist wortwörtlich draw[i]
 * (start(now, draw[i])). Verglichen wurde also ein Wert mit sich selbst; die
 * Prüfung konnte bei JEDER denkbaren Fehlfunktion nie anschlagen. Auch der
 * naheliegende Ersatz „den zuletzt GEMALTEN Wert (reel.painted) gegen
 * restCell vergleichen" ist keine unabhängige Gegenprobe: tick() schreibt im
 * Moment des Stillstands `this.paint(this.restCell)` — painted bekommt also
 * per Zuweisung exakt restCell, aus derselben Codezeile, nicht aus einer
 * zweiten Quelle. Eine WIRKLICH unabhängige Kontrollrechnung müsste die
 * Bremsphysik aus reel.js ein zweites Mal nachrechnen — genau die Art
 * „dritte Stelle mit derselben Wahrheit", die dieser Datei laut Kopf
 * ausdrücklich verboten ist (siehe „F4 RECHNET NICHT NEU" unten, sinngemäß
 * auch für die Bewegung). Die Prüfung wurde deshalb ersatzlos gestrichen,
 * statt durch eine zweite, ebenso wirkungslose Fassung ersetzt zu werden.
 *
 *
 * F4 RECHNET NICHT NEU
 * ---------------------
 * evaluate() ist die ausführbare Zweitschrift von Classes/Rules.php aus
 * Phase F3 und beherrscht beide Gewinnwege (Linien und Feldzählung). Eine
 * dritte Stelle mit derselben Wahrheit wäre genau der Fehler, den Phase F3
 * vermieden hat. markHits() wertet deshalb auch nichts ein zweites Mal aus —
 * sie sucht nur die Lage von Symbolen, die evaluate() bereits als zahlend
 * gemeldet hat.
 *
 *
 * DER EREIGNIS- UND MESSPUNKTVERTRAG (README.md)
 * ------------------------------------------------
 * Diese Datei spricht mit den übrigen Modulen ausschließlich über
 * DOM-Ereignisse am Gehäuse (.fr-machine), nicht über Importe:
 *
 *   fr:round      vor dem Anlaufen. detail: {draw, stake}. ABBRECHBAR — die
 *                 Kasse (wallet.js) bucht ab oder sagt ab.
 *   fr:reelrest   je Walze beim Stillstand. detail: {reel, cell, symbols}.
 *   fr:result     nach dem Anzeigen. detail: {grid, lines, field,
 *                 lineAmount, fieldAmount, stake, win}. wallet.js
 *                 verrechnet hier und bietet den Gewinn über das
 *                 abbrechbare fr:offer an.
 *   fr:state      jeder Zustandswechsel. detail: {from, to}.
 *
 * Alle vier steigen auf (bubbles), sind also auch am Dokument zu hören.
 *
 * Entgegengenommen wird fr:spin — „starte jetzt eine Runde", ohne detail,
 * nicht abbrechbar. Wirkung: genau ein startRound(), also DERSELBE Weg wie
 * beim Menschen; es gibt keinen zweiten Rundenweg und damit keine
 * Möglichkeit, die Abbuchung zu umgehen. Eine künftige Phase F5 (Auto-Modus)
 * ist der einzige vorgesehene Absender.
 *
 * fr:offerend wird von wallet.js gesendet (REWARD, START, Verlassen der
 * Seite; ab einer künftigen Phase F5 zusätzlich von risk.js), sobald ein
 * offenes Angebot erledigt ist. Diese Datei hört mit (wireOfferEnd()) und
 * geht dann in den Ruhezustand — außer START hat inzwischen schon die
 * nächste Runde begonnen; ein zweiter Wechsel nach IDLE wäre dann ein
 * unmöglicher Zustand und wird deshalb übergangen.
 *
 * KEIN ZUSTAND „RESULT": An diesem Gerät endet JEDE Runde im Angebot
 * (C.14.5), es gibt also keinen Zustand „ausgewertet, nichts weiter mehr".
 * OFFER IST der Ruhezustand nach einer Runde.
 *
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Die Meldungen kommen aus
 * der Sprachdatei über die Tafel (message.js) und die Ansage im Sichtfeld
 * (grid-announce.js).
 */

import { drawIndex } from '@phomo17/fruit-risk/rng.js';
import { evaluate, LAP, ROWS, REELS, STAKE, SMALL_FRUITS } from '@phomo17/fruit-risk/paytable.js';
import { Reel } from '@phomo17/fruit-risk/reel.js';
import { findNixieGroup } from '@phomo17/fruit-risk/nixie.js';
import { NixieCounter } from '@phomo17/fruit-risk/counter.js';
import { GridAnnouncer } from '@phomo17/fruit-risk/grid-announce.js';
import { wirePressButton } from '@phomo17/fruit-risk/press.js';

/**
 * Die Zustände des Automaten.
 *
 * Kein „result": an diesem Gerät endet JEDE Runde im Angebot (C.14.5), es
 * gibt also keinen Zustand „ausgewertet, nichts weiter". „offer" IST der
 * Ruhezustand nach einer Runde.
 */
export const STATE = Object.freeze({
	IDLE: 'idle',
	SPINNING: 'spinning',
	STOPPING: 'stopping',
	EVALUATING: 'evaluating',
	OFFER: 'offer',
});

/**
 * Erlaubte Übergänge. Ein nicht aufgeführter ist ein Programmfehler und wird
 * laut gemeldet, statt still einen unmöglichen Zustand herzustellen.
 */
const TRANSITIONS = Object.freeze({
	[STATE.IDLE]: [STATE.SPINNING],
	[STATE.SPINNING]: [STATE.STOPPING],
	[STATE.STOPPING]: [STATE.EVALUATING],
	[STATE.EVALUATING]: [STATE.OFFER],
	[STATE.OFFER]: [STATE.SPINNING, STATE.IDLE],
});

/**
 * Selbsttätiger Halt je Walze, in Sekunden ab Tastendruck.
 *
 * Das vorhandene Fünf-Walzen-Gerät hält alle 0,6 s; sechs Walzen kämen damit
 * auf 4,2 s und die Runde fühlte sich zäh an. 0,5 s hält sie bei 3,7 s und
 * lässt die Walzen trotzdem hörbar NACHEINANDER zur Ruhe kommen (C.14.5).
 */
const AUTO_STOP_S = Object.freeze([1.2, 1.7, 2.2, 2.7, 3.2, 3.7]);

/** Mindestabstand zwischen zwei Stillständen, in Sekunden. */
const MIN_GAP_S = 0.1;

/**
 * Ein bedienbarer Automat.
 */
export class Machine {
	/**
	 * @param {HTMLElement} root ein .fr-machine
	 * @param {import('./announce.js').LiveRegion} gridRegion der Bereich „grid"
	 * @throws {Error} wenn das Gehäuse nicht dem Markup aus Phase F4 entspricht
	 */
	constructor(root, gridRegion) {
		const cabinet = root.querySelector('.fr-cabinet');
		if (cabinet === null) {
			throw new Error('Kein .fr-cabinet im Automaten gefunden.');
		}
		this.root = root;
		this.cabinet = cabinet;

		/** @type {Reel[]} */
		this.reels = [...cabinet.querySelectorAll('.fr-reel')].map((el) => new Reel(el));
		if (this.reels.length !== REELS) {
			throw new Error(`Der Automat braucht genau sechs Walzen, gefunden: ${this.reels.length}.`);
		}
		// Behebungslauf REVIEW-fruitrisk-f4.md [L1]: this.reels[reel.slot - 1]
		// (commandStop()) und this.reels[i - 1] (tickFrame(), AUTO_STOP_S[i])
		// setzen stillschweigend voraus, dass die Dokumentreihenfolge und
		// data-fr-reel übereinstimmen — slot kommt aus dem Markup-Attribut,
		// der Feldindex aus der Reihenfolge im DOM. Träfe das je nicht zu,
		// liefen Auto-Stopp-Zeiten und Reihenfolgesicherung gegen die falsche
		// Nachbarin, ohne dass etwas meldet. Einmal geprüft, dann geworfen —
		// dieselbe Behandlung wie die Walzenzahl oben.
		if (!this.reels.every((reel, index) => reel.slot === index)) {
			throw new Error('Die Walzen stehen nicht in der Reihenfolge ihrer data-fr-reel-Nummern im Markup.');
		}

		const winGroup = findNixieGroup(cabinet, 'gewinn');
		this.winCounter = winGroup === null ? null : new NixieCounter(winGroup);
		this.gridAnnouncer = new GridAnnouncer(gridRegion);

		this.startButton = cabinet.querySelector('.fr-btn[data-fr-button="start"]');
		this.stopButton = cabinet.querySelector('.fr-btn[data-fr-button="stop"]');

		/** @type {string} */
		this.currentState = STATE.IDLE;
		/** Die Ziehung der laufenden Runde. Nur in startRound() geschrieben. */
		this.draw = null;
		/** Zeitpunkt des Tastendrucks, in Sekunden auf der Uhr der Zeichenschleife. */
		this.spinTime = 0;
		/** Kennung der laufenden Zeichenschleife, oder 0. */
		this.frame = 0;

		this.frameStep = (timestamp) => this.tickFrame(timestamp / 1000);

		this.disposeStart = wirePressButton(this.startButton, 'fr-btn--pressed',
			() => { this.startRound(); });
		this.disposeStop = wirePressButton(this.stopButton, 'fr-btn--pressed',
			() => { this.stopNext(); });

		this.wireSpinRequest();
		this.wireOfferEnd();

		this.root.dataset.frState = this.currentState;

		// KEINE Ansage beim Seitenaufbau (Abnahmetest, Befund „zwei
		// Live-Bereiche füllen sich beim Laden von selbst"): der Bereich
		// "grid" wird leer ausgeliefert und bleibt es, bis wirklich eine
		// Runde ausgewertet ist (C.14.12) — showResult() unten meldet dann
		// den ersten echten Satz. Vormals rief der Konstruktor hier
		// gridAnnouncer.showGrid(this.readGrid()) auf und sagte damit den
		// Anfangsstand des Sichtfelds an, bevor irgendjemand etwas bedient
		// hatte.
	}

	/** Der aktuelle Zustand. */
	get state() {
		return this.currentState;
	}

	/** Darf ein Tastendruck eine neue Runde starten? */
	get canSpin() {
		return this.currentState === STATE.IDLE || this.currentState === STATE.OFFER;
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
			console.error(`[fruit-risk] Unzulässiger Zustandswechsel: ${this.currentState} → ${next}`);
			return;
		}
		const from = this.currentState;
		this.currentState = next;
		this.root.dataset.frState = next;
		this.emit('fr:state', { from, to: next });
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
		// Object.freeze() wie überall in diesem Automaten (README.md, „Der
		// Ereignis- und Messpunktvertrag"): ein Zuhörer, der das detail
		// verändert, verändert es für alle nachfolgenden Zuhörer.
		const event = new CustomEvent(name, { detail: Object.freeze(detail), cancelable, bubbles: true });
		this.root.dispatchEvent(event);
		return event;
	}

	/**
	 * Liest den aktuell im Fenster sichtbaren Feldzustand.
	 *
	 * @returns {string[][]} fünf Zeilen zu je sechs Symbolnamen
	 */
	readGrid() {
		const grid = [];
		for (let row = 0; row < ROWS; row++) {
			grid.push(Array.from({ length: REELS }, (_, reel) => this.reels[reel].symbolAt(row)));
		}
		return grid;
	}

	/**
	 * Startet eine Runde.
	 *
	 * @returns {boolean} true, wenn die Runde zustande kam
	 */
	startRound() {
		if (!this.canSpin) {
			return false;
		}

		// DER EINE WÜRFELWURF. Sechs unabhängige Ziehungen, je gleichverteilt
		// über die 20 Bandpositionen — genau das Modell, aus dem die
		// Auszählung in Phase F3 gerechnet ist.
		const draw = Object.freeze(Array.from({ length: REELS }, () => drawIndex(LAP)));

		// Die Kasse löst hier ein offenes Angebot ein, prüft die Deckung und
		// bucht ab — oder sagt die Runde ab.
		if (this.emit('fr:round', { draw, stake: STAKE }, true).defaultPrevented) {
			return false;
		}

		this.draw = draw;
		this.root.dataset.frRound = draw.join('-');   // Prüfsiegel, siehe Kopf

		this.clearResult();
		this.setState(STATE.SPINNING);

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
	 * Stehen bereits alle sechs oder läuft keine Runde, tut die Taste nichts.
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
	 * Ein Bild. Eine einzige Schleife für alle sechs Walzen — sechs getrennte
	 * Schleifen würden dieselbe Arbeit sechsfach anmelden und könnten
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
				this.emit('fr:reelrest', {
					reel: reel.number,
					cell: reel.restCell,
					symbols: Object.freeze(Array.from({ length: ROWS }, (_, row) => reel.symbolAt(row))),
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
	 * Wertet aus, zeigt an, hebt hervor — und geht ins Angebot.
	 *
	 * @returns {void}
	 */
	finishRound() {
		this.setState(STATE.EVALUATING);

		// Gelesen wird, was im FENSTER STEHT — nicht, was gezogen wurde.
		const grid = this.readGrid();

		// F4 RECHNET NICHT NEU. evaluate() ist die ausführbare Zweitschrift
		// von Classes/Rules.php aus Phase F3 und beherrscht beide Gewinnwege.
		// Eine dritte Stelle mit derselben Wahrheit wäre genau der Fehler,
		// den F3 vermieden hat.
		const result = evaluate(grid);

		this.winCounter?.ramp(result.amount);
		this.root.dataset.frWin = String(result.amount);
		this.markHits(grid, result);
		this.gridAnnouncer.showResult(grid, result);

		this.setState(STATE.OFFER);
		this.emit('fr:result', {
			grid,
			lines: result.lines,
			field: result.field,
			lineAmount: result.lineAmount,
			fieldAmount: result.fieldAmount,
			stake: STAKE,
			win: result.amount,
		});
	}

	/**
	 * Hebt die Treffer hervor: die Zellen jeder getroffenen Linie, die Linie
	 * selbst, und die Zellen der Früchte, die im Feldweg gezahlt haben.
	 *
	 * WARUM DAS KEINE ZWEITE AUSWERTUNG IST: gesucht wird nur die LAGE von
	 * Symbolen, die evaluate() bereits als zahlend gemeldet hat. Es wird
	 * keine Regel ein zweites Mal angewandt und kein Betrag ein zweites Mal
	 * gerechnet.
	 *
	 * @param {string[][]} grid
	 * @param {object} result
	 * @returns {void}
	 */
	markHits(grid, result) {
		for (const line of result.lines) {
			for (const [row, reel] of line.cells) {
				this.reels[reel].markCell(row);
			}
			this.cabinet.querySelector(`[data-fr-line="${line.index}"]`)
				?.classList.add('fr-payline--win');
		}

		for (const fruit of SMALL_FRUITS) {
			if ((result.field.parts[fruit] ?? 0) === 0) {
				continue;
			}
			for (let row = 0; row < ROWS; row++) {
				for (let reel = 0; reel < REELS; reel++) {
					if (grid[row][reel] === fruit) {
						this.reels[reel].markCell(row);
					}
				}
			}
		}
	}

	/** Räumt die Anzeige des vorigen Ergebnisses ab. */
	clearResult() {
		for (const reel of this.reels) {
			reel.clearWin();
		}
		for (const payline of this.cabinet.querySelectorAll('.fr-payline--win')) {
			payline.classList.remove('fr-payline--win');
		}
		this.winCounter?.snap(0);
		this.root.dataset.frWin = '0';
		this.gridAnnouncer.clear();
	}

	/**
	 * Nimmt fr:spin entgegen: eine Runde von außen anstoßen (eine künftige
	 * Phase F5, Auto-Modus). Absichtlich OHNE eigene Prüfung und ohne
	 * eigenes Veto — startRound() prüft selbst und feuert das abbrechbare
	 * fr:round wie immer. Ein von außen ausgelöster Zug läuft damit durch
	 * genau dieselben Sperren wie ein von Hand gedrückter; es gibt keinen
	 * zweiten Rundenweg und damit keine Möglichkeit, die Abbuchung zu
	 * umgehen.
	 *
	 * @returns {void}
	 */
	wireSpinRequest() {
		this.onSpinRequest = () => {
			this.startRound();
		};
		this.root.addEventListener('fr:spin', this.onSpinRequest);
	}

	/**
	 * Nimmt fr:offerend entgegen: das Angebot ist erledigt.
	 *
	 * Gesendet wird es von wallet.js (REWARD, START, Verlassen der Seite)
	 * und ab einer künftigen Phase F5 zusätzlich von risk.js (Leiter
	 * ausgestiegen oder verloren). Steht der Automat nicht mehr im Angebot —
	 * weil START bereits die nächste Runde begonnen hat —, wird es
	 * ÜBERGANGEN: der Wechsel nach „spinning" ist dann schon geschehen, und
	 * ein zweiter Wechsel nach „idle" wäre ein unmöglicher Zustand.
	 *
	 * @returns {void}
	 */
	wireOfferEnd() {
		this.onOfferEnd = () => {
			if (this.currentState === STATE.OFFER) {
				this.setState(STATE.IDLE);
			}
		};
		this.root.addEventListener('fr:offerend', this.onOfferEnd);
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
		this.winCounter?.destroy();
		this.root.removeEventListener('fr:spin', this.onSpinRequest);
		this.root.removeEventListener('fr:offerend', this.onOfferEnd);
		this.disposeStart?.();
		this.disposeStop?.();

		// Behebungslauf REVIEW-fruitrisk-f4.md [L2]: ohne diesen Aufruf blieb
		// die Treffer-Hervorhebung der letzten Runde (Zellen, Gewinnlinie)
		// nach dem Vor-/Zurück-Zwischenspeicher im Sichtfeld stehen, obwohl
		// der Zustand des laufenden Betriebs (data-fr-state, data-fr-win)
		// bereits weggeräumt war. clearResult() ist bereits gegen fehlende
		// Elemente robust.
		this.clearResult();

		// Der Zustand gehört zum laufenden Betrieb, nicht zum Gehäuse.
		delete this.root.dataset.frRound;
		delete this.root.dataset.frState;
		delete this.root.dataset.frWin;
	}
}

export default Machine;
