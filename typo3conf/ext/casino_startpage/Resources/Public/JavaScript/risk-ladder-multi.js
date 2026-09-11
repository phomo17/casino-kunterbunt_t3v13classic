/**
 * Casino Kunterbunt – die geteilte Leiter mit beliebig vielen Tasten
 * ====================================================================
 *
 * Das Spielwerk einer Risiko-Leiter mit zwei ODER MEHR Seiten: das Blinken,
 * die Wertung eines Tastendrucks und die Verwaltung des offenen Gewinns samt
 * Kappung. Sie ist die Schwester von risk-ladder.js.
 *
 *
 * WARUM SIE NEBEN risk-ladder.js LIEGT UND DIESE UNBERÜHRT BLEIBT
 * -----------------------------------------------------------------
 * risk-ladder.js wird von mehreren Geräten benutzt.
 * Eine unangetastete Datei ist die stärkste Rückwärtskompatibilitätszusage,
 * die es gibt: wer nichts an ihr ändert, kann sie auch nicht versehentlich
 * für ein drittes Gerät verbiegen. Ein Gerät mit mehr als zwei Tasten
 * bekommt deshalb eine eigene, VERALLGEMEINERTE Leiter an die Seite gestellt,
 * statt die bestehende um Sonderfälle zu erweitern.
 *
 *
 * SIE KENNT KEIN EINZIGES GERÄT — UND ZWAR BAULICH
 * ------------------------------------------------
 * Genau wie risk-ladder.js hält diese Datei KEINE Verweise auf ein Dokument:
 * kein Element, kein Selektor, keine CSS-Klasse, kein Ereignisname, kein
 * Attribut, keine Taste mit Namen. Sie spricht ausschließlich von SEITEN MIT
 * NUMMERN (0 bis sides−1). Dass Nummer 2 „oben" heißt, weiß allein das
 * Gerät. Diese Datei KANN kein Gerät erreichen, weil ihr nichts übergeben
 * wird, womit sie eines erreichen könnte.
 *
 * Damit bedient dieselbe Leiter ein Paar, ein Kreuz aus vier Tasten und
 * jede spätere Anordnung — welche Taste welche Methode ruft, entscheidet
 * allein das Gerät.
 *
 *
 * WAS DAS GERÄT ANMELDET
 * ----------------------
 * Beim Bau werden Pflicht- und Bauform-Angaben übergeben:
 *
 *   draw(anzahl)     PFLICHT. Liefert eine ganze Zahl 0 bis anzahl−1 — die
 *                    Grundlage jeder Ziehung dieser Leiter (siehe shuffle()).
 *                    Das Gerät bringt seine eigene, kryptographische
 *                    Zufallsquelle mit. Hier wird KEINE zweite gebaut und
 *                    niemals auf Math.random() zurückgefallen: ein Gerät
 *                    ohne sichere Quelle soll stillstehen, nicht heimlich
 *                    würfeln.
 *   paint(ansicht)   PFLICHT. Der einzige Weg an die Anzeige, muss SYNCHRON
 *                    malen (siehe unten, „WAS GEWERTET WIRD").
 *   notify(meldung)  freiwillig. Fachliche Meldungen.
 *   sides            wie viele Seiten die Leiter hat (mindestens 2).
 *   factor           womit ein Treffer vervielfacht (mindestens 2, ganzzahlig).
 *   curve            welche Kurvenform aus risk-timing.js gilt.
 *   order            ORDER_PER_LEVEL (eine Reihenfolge je Stufe) oder
 *                    ORDER_PER_PASS (jeder Umlauf zieht neu).
 *   pause            ob nach jedem vollen Umlauf eine dunkle Pause liegt.
 *
 * Bedient wird über Methoden, nicht über Ereignisse — dieselben Namen wie
 * bei risk-ladder.js: offer(anspruch), start(), guess(seite), collect(),
 * destroy().
 *
 *
 * DIE MOMENTAUFNAHME — das Argument von paint()
 * ---------------------------------------------
 *   reason    warum gemalt wird (init/offer/level/lit/settled/end, siehe
 *             risk-ladder.js — dieselbe Bedeutung)
 *   phase     'off' | 'offer' | 'ladder'
 *   level     0 außerhalb der Leiter, ab 1 in ihr, ohne Obergrenze
 *   win       der offene Gewinn
 *   lit       das Feld, das JETZT brennen soll — eine ZAHL (NO_SIDE oder
 *             0 … sides−1), keine Zeichenkette: „links" und „oben" sind
 *             Geometrie und damit Gerätesache
 *   sides     die Seitenzahl dieser Leiter
 *   factor    der Vervielfacher
 *   sideMs    Periode je Seite; immer 200 (Sicherheitsgrenze)
 *   onMs      Trefferfenster
 *   darkMs    Dunkelzeit
 *   pauseMs   die Pause nach einem vollen Umlauf (0, wenn keine gebraucht wird)
 *   cycleMs   Dauer eines vollen Umlaufs, Pause eingerechnet
 *
 * Die REIHENFOLGE der Seiten wird ausdrücklich NICHT herausgereicht: ein
 * Gerät, das sie sähe, könnte die nächste Seite vorwegnehmen.
 *
 *
 * DIE MELDUNGEN — das Argument von notify()
 * -----------------------------------------
 *   { type: 'start',   level, win }
 *   { type: 'hit',     level, win }
 *   { type: 'miss',    level, win: 0, lost }
 *   { type: 'collect', level, win }
 *   { type: 'end',     level: 0, win: 0 }
 *   { type: 'tick',    level, lit, on, pass }   das gemalte Feld hat
 *             gewechselt; pass macht den Umlaufwechsel sichtbar.
 *
 *
 * DER ANSPRUCH — WAS DIE LEITER VON IHM VERLANGT
 * ----------------------------------------------
 * Wie bei risk-ladder.js: ein Betrag, der erspielt, aber noch nicht
 * gutgeschrieben ist. Verlangt werden genau drei Dinge — amount (Zahl,
 * beschreibbar), collect() (schreibt gut) und discard() (verwirft).
 *
 *
 * EINE UHR, KEIN ZEITGEBERSTAPEL
 * -------------------------------
 * Geblinkt wird über EINE requestAnimationFrame-Schleife, genau wie bei
 * risk-ladder.js. In jedem Bild wird aus der VERGANGENEN ZEIT gerechnet,
 * welche Seite brennen muss — nichts wird aufaddiert, ein verschlucktes
 * Bild verschiebt nichts, und ein verstecktes Browserfenster hält die
 * Schleife an, ohne dass beim Zurückkommen etwas nachgeholt werden müsste.
 *
 *
 * WAS GEWERTET WIRD: DAS GEMALTE FELD, NICHT DIE UHR
 * ----------------------------------------------------
 * Maßgeblich ist der Zustand des Lichtfelds in genau dem Moment, in dem
 * gedrückt wird. Gewertet wird deshalb this.lit — genau der Wert, der
 * zuletzt an paint() übergeben wurde. Nach der Uhr zu werten würde dem
 * Spieler bis zu ein Bild (rund 16 ms) anlasten, das er nie sehen konnte;
 * bei einem 40-ms-Fenster wären das 40 % Unfairness. Eine Kulanzspanne gibt
 * es nicht, in keine Richtung.
 *
 * ES KANN BAULICH IMMER NUR EINE SEITE BRENNEN: litAt() liefert genau einen
 * Wert, nie mehrere. Es gibt zu jedem Zeitpunkt genau einen berechneten
 * lit-Wert, nicht n unabhängige Zustände je Seite — ein zweites Lichtfeld
 * gleichzeitig ist mit dieser Bauform nicht darstellbar.
 *
 *
 * DIE KAPPUNG DES OFFENEN GEWINNS
 * -------------------------------
 * Vervielfacht werden darf unbegrenzt — die STUFE zählt deshalb ohne Grenze
 * weiter. Der BETRAG dagegen sättigt bei 2^53−1 (MAX_WIN), weil JavaScript
 * oberhalb davon nicht mehr exakt mit ganzen Zahlen rechnet. Gekappt wird
 * eine Rechengenauigkeit, kein Spielrecht.
 *
 *
 * BEIM ABRÄUMEN WIRD GUTGESCHRIEBEN, NICHT VERWORFEN
 * ----------------------------------------------------
 * destroy() schreibt einen offenen Gewinn GUT, aus demselben Grund wie bei
 * risk-ladder.js: der Einsatz ist längst abgebucht, der Gewinn war
 * rechtmäßig erspielt, und ihn wegen eines technischen Ereignisses zu
 * verlieren wäre eine willkürliche Strafe.
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Was hier steht, sind
 * Entwicklermeldungen für die Browserkonsole.
 */

import {
	CURVE_DEFAULT, CYCLE_MIN_MS, SIDES_MIN,
	cycleMs, normaliseSides, onMs, pauseMs, sideMs, stepTiming,
} from '@phomo17/casino-startpage/risk-timing.js';
// PRÄFIX, NICHT RELATIV (Plan D3c, Dateikopf-Nachtrag): verify-risk-timing.mjs
// lädt diese Datei als data:-Modul (toModule()) — ein relativer Import
// scheitert von dort aus. Der Modulname wird dort wie risk-timing.js selbst
// auf die echte Datei umgeschrieben.
import { konto } from '@phomo17/casino-startpage/account-backend.js';

export const PHASE_OFF = 'off';
export const PHASE_OFFER = 'offer';
export const PHASE_LADDER = 'ladder';

/** Keine Seite brennt. Eine Zahl, keine Zeichenkette: lit ist sonst ein Index. */
export const NO_SIDE = -1;

/**
 * Wie die Reihenfolge der Seiten zustande kommt.
 *
 *   level  EINE Reihenfolge je Stufe, in jedem Umlauf dieselbe. Bei zwei
 *          Seiten ist das genau das klassische Hin und Her: gezogen wird nur,
 *          womit die Stufe beginnt.
 *   pass   JEDER Umlauf zieht neu. Daraus kommt die Schwierigkeit einer Leiter
 *          mit vier Tasten: man kann keinen Rhythmus lernen.
 */
export const ORDER_PER_LEVEL = 'level';
export const ORDER_PER_PASS = 'pass';

/** Obergrenze des offenen Gewinns — eine Rechengenauigkeit, kein Spielrecht. */
export const MAX_WIN = Number.MAX_SAFE_INTEGER;

/**
 * Erfüllt das Objekt den Anspruchsvertrag aus dem Dateikopf?
 *
 * Geprüft wird die Form, nicht die Herkunft — dieselbe Prüfung wie in
 * risk-ladder.js.
 *
 * @param {*} claim
 * @returns {boolean}
 */
function isUsableClaim(claim) {
	if (claim === null || typeof claim !== 'object') {
		return false;
	}
	if (typeof claim.collect !== 'function' || typeof claim.discard !== 'function') {
		return false;
	}
	const amount = Number(claim.amount);
	return Number.isFinite(amount) && amount > 0;
}

/**
 * Eine Risiko-Leiter mit beliebig vielen Seiten.
 */
export class MultiRiskLadder {
	/**
	 * @param {{draw: function(number): number,
	 *          paint: function(object): void,
	 *          notify?: function(object): void,
	 *          sides?: number, factor?: number, curve?: string,
	 *          order?: string, pause?: boolean}} setup
	 * @throws {TypeError} wenn draw oder paint fehlen
	 * @throws {RangeError} wenn factor keine ganze Zahl ab 2 ist
	 */
	constructor({ draw, paint, notify, sides = SIDES_MIN, factor = 2,
		curve = CURVE_DEFAULT, order = ORDER_PER_LEVEL, pause = false } = {}) {
		if (typeof draw !== 'function') {
			throw new TypeError('MultiRiskLadder braucht eine Funktion draw(anzahl), die 0 bis anzahl-1 liefert.');
		}
		if (typeof paint !== 'function') {
			throw new TypeError('MultiRiskLadder braucht eine Funktion paint(ansicht).');
		}
		if (!Number.isInteger(factor) || factor < 2) {
			throw new RangeError(`Der Faktor muss eine ganze Zahl ab 2 sein, war: ${String(factor)}`);
		}
		this.sides = normaliseSides(sides);
		this.factor = factor;
		this.curve = curve;
		this.orderMode = order === ORDER_PER_PASS ? ORDER_PER_PASS : ORDER_PER_LEVEL;
		this.usesPause = pause === true;

		this.draw = draw;
		this.paint = paint;
		this.notify = typeof notify === 'function' ? notify : () => {};

		/** @type {'off'|'offer'|'ladder'} */
		this.phase = PHASE_OFF;

		/** Der offene Gewinn als Anspruch, oder null. */
		this.claim = null;

		/** Stufe. 0 außerhalb der Leiter, ab 1 in ihr, ohne Obergrenze. */
		this.level = 0;

		/** Zeiten der laufenden Stufe. 0 außerhalb der Leiter. */
		this.sideMs = 0;
		this.onMs = 0;
		this.pauseMs = 0;
		this.cycleMs = 0;

		/** Die gezogene Reihenfolge dieses Umlaufs, oder null. */
		this.order = null;

		/** Nummer des Umlaufs, zu dem this.order gehört. −1 vor dem ersten. */
		this.pass = -1;

		/** Beginn der Stufe auf der Uhr der Zeichenschleife, in Millisekunden. */
		this.levelStart = 0;

		/** Das zuletzt an paint() übergebene Lichtfeld. Die Wertungsgrundlage. */
		this.lit = NO_SIDE;

		/** Kennung der laufenden Zeichenschleife, oder 0. */
		this.frame = 0;

		this.frameStep = (timestamp) => this.tick(timestamp);
	}

	/**
	 * Der offene Gewinn als Zahl. 0, wenn keiner vorliegt.
	 *
	 * @returns {number}
	 */
	get win() {
		if (this.claim === null) {
			return 0;
		}
		const amount = Number(this.claim.amount);
		return Number.isFinite(amount) ? amount : 0;
	}

	/**
	 * Eine Momentaufnahme für das Gerät.
	 *
	 * @param {string} [reason]
	 * @param {number} [win] überschreibt den abgeleiteten Betrag; nur 'settled'
	 *                       braucht das, weil der Anspruch dann schon weg ist
	 * @returns {Readonly<object>}
	 */
	view(reason = 'init', win = this.win) {
		return Object.freeze({
			reason,
			phase: this.phase,
			level: this.level,
			win,
			lit: this.lit,
			sides: this.sides,
			factor: this.factor,
			sideMs: this.sideMs,
			onMs: this.onMs,
			darkMs: this.sideMs - this.onMs,
			pauseMs: this.pauseMs,
			cycleMs: this.cycleMs,
		});
	}

	/**
	 * Lässt das Gerät malen. Ein Fehler dort darf die Leiter nicht mitreißen.
	 *
	 * @param {string} reason
	 * @param {number} [win]
	 * @returns {void}
	 */
	render(reason, win = this.win) {
		try {
			this.paint(this.view(reason, win));
		} catch (error) {
			console.error('[casino] Ein Gerät hat beim Malen der Mehrtasten-Leiter einen Fehler geworfen.', error);
		}
	}

	/**
	 * Meldet dem Gerät eine Tatsache. Ein Fehler dort darf die Leiter nicht
	 * mitreißen — gleiche Haltung wie bei den Zuhörern in credit.js.
	 *
	 * @param {object} message
	 * @returns {void}
	 */
	report(message) {
		try {
			this.notify(Object.freeze(message));
		} catch (error) {
			console.error('[casino] Ein Gerät hat bei einer Meldung der Mehrtasten-Leiter einen Fehler geworfen.', error);
		}
	}

	/**
	 * Zieht eine vollständige Reihenfolge aller Seiten (Fisher-Yates).
	 *
	 * Fisher-Yates heißt: von hinten nach vorn wird jede Stelle mit einer
	 * zufällig gezogenen Stelle davor getauscht. Jede der n! Reihenfolgen ist
	 * damit gleich wahrscheinlich — anders als bei „einfach n-mal ziehen und
	 * Doppelte verwerfen", was je Durchlauf verschieden lange dauerte.
	 *
	 * Gezogen wird ausschließlich über die Quelle des GERÄTS. Hier wird keine
	 * zweite gebaut und niemals auf Math.random() zurückgefallen: ein Gerät
	 * ohne sichere Quelle soll stillstehen, nicht heimlich würfeln.
	 *
	 * @returns {number[]}
	 */
	shuffle() {
		const order = Array.from({ length: this.sides }, (_, index) => index);
		for (let i = order.length - 1; i > 0; i--) {
			const j = this.drawIndex(i + 1);
			[order[i], order[j]] = [order[j], order[i]];
		}
		return order;
	}

	/**
	 * Eine Ziehung mit Prüfung. Eine Quelle, die etwas anderes liefert als eine
	 * ganze Zahl von 0 bis bound-1, ist ein Fehler des Geräts und wird NICHT
	 * überspielt: würde hier ersatzweise 0 genommen, wäre die Leiter lautlos
	 * gewinnbar.
	 *
	 * @param {number} bound
	 * @returns {number}
	 * @throws {RangeError}
	 */
	drawIndex(bound) {
		const value = this.draw(bound);
		if (!Number.isInteger(value) || value < 0 || value >= bound) {
			throw new RangeError(`draw(${bound}) muss 0 bis ${bound - 1} liefern, lieferte: ${String(value)}`);
		}
		return value;
	}

	/**
	 * Die Reihenfolge für einen Umlauf.
	 *
	 * Bei ORDER_PER_LEVEL wird sie einmal je Stufe gezogen und danach nur noch
	 * durchgereicht; bei ORDER_PER_PASS zieht jeder neue Umlauf neu.
	 *
	 * @param {number} pass
	 * @returns {number[]}
	 */
	orderFor(pass) {
		if (this.order !== null && (this.pass === pass || this.orderMode === ORDER_PER_LEVEL)) {
			this.pass = pass;
			return this.order;
		}
		this.order = this.shuffle();
		this.pass = pass;
		return this.order;
	}

	/**
	 * Ein Gewinn liegt vor. Übernimmt ihn die Leiter?
	 *
	 * @param {{amount: number, collect: function, discard: function}} claim
	 * @returns {boolean} false heißt: nicht übernommen, das Gerät zahlt selbst aus
	 */
	offer(claim) {
		if (this.phase !== PHASE_OFF) {
			// Kann nicht vorkommen: solange eine Leiter läuft, kommt keine Runde
			// zustande. Wenn doch, ist etwas grundsätzlich falsch.
			console.error('[casino] Ein zweiter Gewinn, während die Mehrtasten-Leiter noch läuft.');
			return false;
		}
		if (!isUsableClaim(claim)) {
			return false;
		}

		this.claim = claim;
		// Der offene Gewinn ist ab jetzt Vermögen der Person (D.7: „ein Gewinn,
		// der weder ausgezahlt noch verspielt ist"). Er wird SOFORT gebucht —
		// D.7.1 verlangt genau diesen Schritt. Ohne diese Buchung wäre die
		// Summe oben auf der Seite so lange falsch, wie die Leiter läuft.
		this.syncWin(konto.istServer ? konto.angebot(claim.amount) : null);
		this.phase = PHASE_OFFER;
		this.level = 0;
		this.sideMs = 0;
		this.onMs = 0;
		this.pauseMs = 0;
		this.cycleMs = 0;
		this.order = null;
		this.pass = -1;
		this.lit = NO_SIDE;
		this.render('offer');
		return true;
	}

	/**
	 * Die Leiter läuft an, Stufe 1.
	 *
	 * Anders als bei risk-ladder.js wird beginLevel() OHNE Argument gerufen:
	 * die Reihenfolge zieht die Stufe selbst, es gibt keine vorab gezogene
	 * Startseite.
	 *
	 * @returns {boolean} false, wenn gerade kein Angebot vorliegt
	 */
	start() {
		if (this.phase !== PHASE_OFFER) {
			return false;
		}

		this.phase = PHASE_LADDER;
		this.level = 1;
		this.beginLevel();
		this.startLoop();
		this.report({ type: 'start', level: this.level, win: this.win });
		return true;
	}

	/**
	 * Eine Taste wurde gedrückt.
	 *
	 * Gewertet wird das zuletzt GEMALTE Feld, nicht die Uhr — siehe Dateikopf.
	 * Ist gerade keine Seite an, ist das ein Fehlgriff: ein Druck in einem
	 * solchen Moment gilt als falsch. Deshalb ist NO_SIDE auch kein
	 * zulässiger Tipp: sonst gewänne, wer im Dunkeln auf „dunkel" tippt.
	 *
	 * @param {number} side
	 * @returns {?('hit'|'miss')} null, wenn die Leiter gar nicht läuft
	 */
	guess(side) {
		if (this.phase !== PHASE_LADDER) { return null; }
		if (!Number.isInteger(side) || side < 0 || side >= this.sides) {
			console.error(`[casino] guess() erwartet 0 bis ${this.sides - 1}, bekam: ${String(side)}`);
			return null;
		}
		if (this.lit === side) { this.hit(); return 'hit'; }
		this.miss();
		return 'miss';
	}

	/**
	 * Treffer: mit dem Faktor vervielfachen und eine Stufe höher von vorn
	 * beginnen.
	 *
	 * OPTIMISTISCH VERVIELFACHT, UNBEDINGT, IN BEIDEN ZWEIGEN (Behebungslauf
	 * 2026-09-11, dieselbe Ursache wie in risk-ladder.js hit(), siehe dort
	 * für die ausführliche Begründung): this.claim.amount wird jetzt IMMER
	 * zuerst gesetzt, bevor gebucht, die Stufe erhöht oder gemalt wird.
	 * Vorher stand im Servermodus bis zur Serverantwort noch der ALTE Betrag
	 * in this.claim.amount — die Anzeige der neuen Stufe hinkte hinterher,
	 * und ein zweiter, schneller hit() vor Eintreffen der ersten Antwort las
	 * ebenfalls noch den alten current und buchte auf dessen Basis zu wenig
	 * (aus 10 → 20 → 40 wurde 10 → 20 → 30). Ein zweiter, schneller hit()
	 * liest current jetzt bereits als den bereits vervielfachten Betrag.
	 */
	hit() {
		const current = this.win;
		this.claim.amount = current >= MAX_WIN / this.factor ? MAX_WIN : current * this.factor;
		if (konto.istServer) {
			// Der Server kennt nur den Vorgang 'verdoppeln' (fest ×2, D.7.2,
			// BookingService::rechnen()) — diese Leiter läuft aber mit JEDEM
			// Faktor ab 2 (siehe Bauform-Anmeldung im Dateikopf, "factor"). Ein
			// bloßer konto.verdoppeln()-Aufruf wäre nur für factor === 2
			// richtig und würde bei größeren Faktoren dauerhaft zu wenig
			// gutschreiben. Der additive Vorgang 'angebot' bucht
			// stattdessen den UNTERSCHIEDSBETRAG (aktueller Gewinn ×
			// (factor − 1), auf Basis des noch UNVERVIELFACHTEN current oben)
			// und erreicht damit rechnerisch dasselbe Ergebnis wie eine
			// Vervielfachung um factor — mit derselben Kappung bei MAX und
			// ohne Admin-Beschränkung. Für factor === 2 ist das identisch zu
			// konto.verdoppeln() (Abweichung vom wörtlichen Plantext 4.22, dort
			// nur am Beispiel von risk-ladder.js gezeigt — siehe Umsetzungsbericht).
			// syncWin() überschreibt this.claim.amount und malt erneut (reason
			// 'sync'), sobald die Antwort da ist; bis dahin gilt der
			// optimistische Wert oben.
			this.syncWin(konto.angebot(current * (this.factor - 1)));
		}
		this.level += 1;
		this.beginLevel();
		this.report({ type: 'hit', level: this.level, win: this.win });
	}

	/**
	 * Übernimmt den vom Server bestätigten offenen Gewinn.
	 *
	 * Warum nicht einfach await: offer() und hit() sind synchron und müssen es
	 * bleiben — hit() setzt im selben Atemzug die neue Stufe und startet das
	 * Blinkwerk, und ein await mitten darin verschöbe die Zeitmessung der
	 * Leiter. Die Sicherheitsgrenze von 200 ms je Seite (B.6.1) hängt daran.
	 * Deshalb läuft die Buchung nebenher, und wenn die Antwort da ist, wird der
	 * angezeigte Betrag angeglichen und neu gemalt.
	 *
	 * @param {?Promise<object>} versprechen
	 * @returns {void}
	 */
	syncWin(versprechen) {
		if (versprechen === null) {
			return;
		}
		void versprechen.then((antwort) => {
			if (this.claim === null || antwort?.ok !== true) {
				return;
			}
			this.claim.amount = antwort.gewinn;
			this.render('sync');
		});
	}

	/**
	 * Fehlgriff: der gesamte Gewinn ist weg.
	 *
	 * Das Guthaben bleibt unverändert — der Einsatz war schon beim Auslösen der
	 * Runde abgebucht. discard() schreibt nichts und bucht nichts ab; es macht
	 * den Anspruch nur unbrauchbar.
	 *
	 * @returns {void}
	 */
	miss() {
		const lost = this.win;
		const level = this.level;
		const claim = this.claim;

		// Erst aus der Hand geben, dann verwerfen: ab hier ist der offene Gewinn
		// 0, und genau das soll das Gerät malen.
		this.claim = null;
		// Der Gewinnspeicher ist leer. Vierter Schreibvorgang im Beispiel aus
		// D.7.1 (übertragen auf die Mehrtasten-Leiter).
		if (konto.istServer) {
			void konto.verloren();
		}
		claim.discard();

		this.render('settled', 0);
		this.report({ type: 'miss', level, win: 0, lost });
		this.reset();
	}

	/**
	 * Aussteigen und gutschreiben. Wirkt im Angebot genauso wie in der Leiter.
	 *
	 * @returns {?number} der gutgeschriebene Betrag, oder null im Grundzustand
	 */
	collect() {
		if (this.phase === PHASE_OFF) {
			return null;
		}

		const amount = this.win;
		const level = this.level;
		const claim = this.claim;
		this.claim = null;

		// void, weil auf das Versprechen niemand wartet: die Gutschrift ist mit
		// der Rückkehr erledigt, alles Weitere ist Nachlauf.
		void claim?.collect();

		this.render('settled', amount);
		this.report({ type: 'collect', level, win: amount });
		this.reset();
		return amount;
	}

	/**
	 * Beginnt eine Stufe: neue Zeiten, neue Uhr, neue Reihenfolge.
	 *
	 * Das erste Bild wird SOFORT gemalt, nicht erst im nächsten Frame: sonst
	 * entstünde nach jedem Treffer ein künstliches Dunkelfenster von bis zu
	 * einem Bild, in dem ein schneller zweiter Druck als Fehlgriff zählte.
	 *
	 * @returns {void}
	 */
	beginLevel() {
		const timing = stepTiming(this.level, this.curve);
		this.sideMs = timing.sideMs;
		this.onMs = timing.onMs;
		this.pauseMs = this.usesPause ? pauseMs(this.level, this.curve) : 0;
		this.cycleMs = cycleMs(this.level, { sides: this.sides, curve: this.curve, pause: this.usesPause });
		this.order = null;
		this.pass = -1;
		this.levelStart = globalThis.performance.now();
		this.lit = this.litAt(this.levelStart);
		this.render('level');
	}

	/**
	 * Welche Seite muss zum Zeitpunkt now brennen?
	 *
	 * Rein aus der Uhr abgeleitet, nichts aufaddiert. Ein verschlucktes Bild
	 * verschiebt nichts; ein verstecktes Fenster hält die Schleife an, und beim
	 * Zurückkommen rechnet dasselbe Bild die richtige Lage aus.
	 *
	 * ES KANN BAULICH IMMER NUR EINE SEITE BRENNEN: diese Funktion liefert
	 * genau einen Wert, und das Gerät bekommt nichts anderes zu sehen.
	 *
	 * @param {number} now Zeit in Millisekunden
	 * @returns {number} NO_SIDE oder 0 … sides−1
	 */
	litAt(now) {
		if (this.sideMs <= 0 || this.cycleMs <= 0) { return NO_SIDE; }
		const elapsed = now - this.levelStart;
		if (!(elapsed >= 0)) { return NO_SIDE; }
		const pass = Math.floor(elapsed / this.cycleMs);
		const inCycle = elapsed - pass * this.cycleMs;
		const slot = Math.floor(inCycle / this.sideMs);
		if (slot >= this.sides) { return NO_SIDE; }        // die Pause nach dem Umlauf
		const inSlot = inCycle - slot * this.sideMs;
		if (inSlot >= this.onMs) { return NO_SIDE; }       // Dunkelzeit innerhalb der Seite
		return this.orderFor(pass)[slot];
	}

	/** Startet die Zeichenschleife, falls sie nicht schon läuft. */
	startLoop() {
		if (this.frame === 0) {
			this.frame = globalThis.requestAnimationFrame(this.frameStep);
		}
	}

	/** Hält die Zeichenschleife an. */
	stopLoop() {
		if (this.frame !== 0) {
			globalThis.cancelAnimationFrame(this.frame);
			this.frame = 0;
		}
	}

	/**
	 * Ein Bild.
	 *
	 * Anders als bei risk-ladder.js trägt die tick-Meldung zusätzlich pass:
	 * die Nummer des Umlaufs, in dem dieses Bild liegt. Damit kann ein Gerät
	 * (und ein Prüfskript) den Umlaufwechsel sehen, ohne die Uhr selbst
	 * mitzuführen. Berechnet wird pass unabhängig von orderFor(): während der
	 * Pause nach einem Umlauf wird orderFor() nicht gerufen (es gibt in
	 * diesem Fenster keine Seite zu ermitteln), der Umlauf ist aber trotzdem
	 * schon der nächste.
	 *
	 * @param {number} now Zeit in Millisekunden
	 * @returns {void}
	 */
	tick(now) {
		this.frame = 0;
		if (this.phase !== PHASE_LADDER) {
			return;
		}

		const lit = this.litAt(now);
		if (lit !== this.lit) {
			// Diese beiden Anweisungen gehören zusammen: gewertet wird genau der
			// Wert, der hier gemalt wird. Siehe Dateikopf.
			this.lit = lit;
			this.render('lit');
			const pass = this.cycleMs > 0
				? Math.floor((now - this.levelStart) / this.cycleMs)
				: 0;
			this.report({ type: 'tick', level: this.level, lit, on: lit !== NO_SIDE, pass });
		}

		this.frame = globalThis.requestAnimationFrame(this.frameStep);
	}

	/**
	 * Zurück in den Grundzustand – nach Gewinn wie nach Verlust derselbe Weg.
	 *
	 * @returns {void}
	 */
	reset() {
		this.stopLoop();
		this.phase = PHASE_OFF;
		this.claim = null;
		this.level = 0;
		this.sideMs = 0;
		this.onMs = 0;
		this.pauseMs = 0;
		this.cycleMs = 0;
		this.order = null;
		this.pass = -1;
		this.lit = NO_SIDE;
		this.render('end');
		this.report({ type: 'end', level: 0, win: 0 });
	}

	/**
	 * Räumt ab und schreibt einen offenen Gewinn gut.
	 *
	 * Gemeldet wird dabei NICHTS: das Gerät räumt in derselben Bewegung seine
	 * eigenen Zuhörer ab, und eine Meldung in eine sterbende Seite ist Lärm.
	 * Gemalt wird trotzdem, damit ein aus dem Vor-/Zurück-Zwischenspeicher
	 * zurückkehrendes Gehäuse nicht mit brennenden Lichtfeldern dasteht.
	 *
	 * @returns {void}
	 */
	destroy() {
		if (this.claim !== null) {
			const claim = this.claim;
			this.claim = null;
			void claim.collect();
		}

		this.stopLoop();
		this.phase = PHASE_OFF;
		this.level = 0;
		this.sideMs = 0;
		this.onMs = 0;
		this.pauseMs = 0;
		this.cycleMs = 0;
		this.order = null;
		this.pass = -1;
		this.lit = NO_SIDE;
		this.render('end');
	}
}

export default MultiRiskLadder;
