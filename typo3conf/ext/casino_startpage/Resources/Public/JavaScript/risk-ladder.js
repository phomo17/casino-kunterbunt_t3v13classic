/**
 * Casino Kunterbunt – die geteilte Risiko-Leiter
 * ==============================================
 *
 * Das Spielwerk der Leiter, ohne jedes Gerät: das Blinken, die Wertung eines
 * Tastendrucks und die Verwaltung des offenen Gewinns samt Kappung.
 *
 * Einbindung in einer Automaten-Extension:
 *
 *   import { RiskLadder } from '@phomo17/casino-startpage/risk-ladder.js';
 *
 * Die Regeln stehen unverändert in CONCEPT.md 3.4: verdoppeln bei Treffer,
 * Totalverlust bei Fehlgriff, jederzeit aussteigen, kein Limit, kein Zeitlimit,
 * keine Kulanzspanne. Neu ist seit Ausbaustufe 2 nur die Schwierigkeitskurve
 * (Anhang B) — und dass diese Datei im Site Package liegt statt in einem Gerät
 * (B.6.2).
 *
 *
 * SIE KENNT KEIN EINZIGES GERÄT — UND ZWAR BAULICH
 * ------------------------------------------------
 * CONCEPT.md Teil A, Abschnitt 5, Grundsatz 2: das Site Package kennt keinen
 * einzelnen Automaten. Diese Datei hält deshalb KEINE Verweise auf das
 * Dokument: kein Element, kein Selektor, keine CSS-Klasse, kein Ereignisname,
 * kein Attribut. Sie KANN kein Gerät kennen, weil ihr nichts übergeben wird,
 * womit sie eines erreichen könnte. Das ist keine Selbstbeherrschung, sondern
 * eine Eigenschaft der Schnittstelle.
 *
 * Dieselbe Leiter bedient damit ein Gerät mit Hebel und eines ohne: welche
 * Taste welche Methode ruft, entscheidet allein das Gerät.
 *
 *
 * WAS DAS GERÄT ANMELDET
 * ----------------------
 * Beim Bau werden drei Funktionen übergeben. Mehr braucht die Leiter nicht, und
 * mehr darf sie auch nicht bekommen:
 *
 *   draw()           PFLICHT. Liefert 0 oder 1 — die Seite, mit der die nächste
 *                    Stufe beginnt. Das Gerät bringt seine eigene Zufallsquelle
 *                    mit. Hier wird KEINE zweite gebaut und niemals auf
 *                    Math.random() zurückgefallen; ein Gerät ohne sichere
 *                    Quelle soll stillstehen, nicht heimlich würfeln.
 *   paint(ansicht)   PFLICHT. Der einzige Weg an die Anzeige. Die Leiter reicht
 *                    eine Momentaufnahme herüber; welche Klassen, Attribute und
 *                    Anzeigen daraus werden, entscheidet das Gerät.
 *   notify(meldung)  freiwillig. Fachliche Meldungen. Das Gerät macht daraus
 *                    seine eigenen Ereignisse.
 *
 * Bedient wird über Methoden, nicht über Ereignisse:
 *
 *   offer(anspruch)  Ein Gewinn liegt vor. Die Leiter übernimmt ihn und geht ins
 *                    Angebot. Liefert true, wenn sie übernommen hat.
 *   start()          Die Leiter läuft an, Stufe 1.
 *   guess(seite)     'left' oder 'right'. Liefert 'hit', 'miss' oder null.
 *   collect()        Aussteigen und gutschreiben. Wirkt im Angebot wie in der
 *                    Leiter. Im Grundzustand wirkungslos.
 *   destroy()        Abräumen; ein offener Gewinn wird dabei GUTGESCHRIEBEN.
 *
 *
 * DIE MOMENTAUFNAHME — das Argument von paint()
 * ---------------------------------------------
 *   reason    warum gemalt wird, siehe Tabelle
 *   phase     'off' | 'offer' | 'ladder'
 *   level     0 außerhalb der Leiter, ab 1 in ihr, ohne Obergrenze
 *   win       der offene Gewinn
 *   lit       'left' | 'right' | 'none' — das Feld, das JETZT brennen soll
 *   sideMs    Periode je Seite; in der Leiter immer 200 (Sicherheitsgrenze)
 *   onMs      Trefferfenster
 *   darkMs    Dunkelzeit
 *
 *   reason      wann                        was das Gerät sinnvollerweise malt
 *   'init'      einmal, wenn es will        den Grundzustand
 *   'offer'     ein Gewinn liegt vor        Angebotsoptik, Stufe aus. Die
 *                                           GEWINN-Anzeige NICHT anfassen — die
 *                                           gehört zu diesem Zeitpunkt noch dem
 *                                           Spielkern des Geräts.
 *   'level'     jede neue Stufe             Stufe, offener Gewinn, Lichtfeld
 *   'lit'       Lichtwechsel in der Stufe   nur das Lichtfeld
 *   'settled'   Fehlgriff oder Ausstieg     nur den Gewinnbetrag: 0 nach einem
 *                                           Fehlgriff, der gutgeschriebene
 *                                           Betrag nach einem Ausstieg
 *   'end'       zurück im Grundzustand      alles aus; GEWINN nicht anfassen
 *
 * paint() MUSS SYNCHRON malen. Darauf beruht die Wertung, siehe unten. Wirft es,
 * wird der Fehler gemeldet und verschluckt — ein Gerät, das beim Malen
 * stolpert, darf die Zeichenschleife nicht anhalten. Dieselbe Haltung wie bei
 * den Zuhörern in credit.js.
 *
 *
 * DIE MELDUNGEN — das Argument von notify()
 * -----------------------------------------
 *   { type: 'start',   level, win }
 *   { type: 'hit',     level, win }        level und win sind schon die neuen
 *   { type: 'miss',    level, win: 0, lost }
 *   { type: 'collect', level, win }
 *   { type: 'end',     level: 0, win: 0 }
 *   { type: 'tick',    level, lit, on }    das gemalte Feld hat gewechselt
 *
 * Das ANGEBOT wird bewusst nicht gemeldet. Ob es überhaupt zustande kommt, ist
 * eine Frage des Geräts — an einem Automaten mit Auto-Modus entfällt die Leiter
 * (CONCEPT.md 3.5). Das Gerät fragt das vor dem Aufruf von offer() auf seine
 * eigene Art ab; eine abbrechbare Rückfrage in diese Datei zu legen, hieße, ihr
 * eine Vorstellung davon zu geben, was ein Auto-Modus ist.
 *
 *
 * DER TAKT — EINE UHR, KEIN ZEITGEBERSTAPEL
 * -----------------------------------------
 * Geblinkt wird über EINE requestAnimationFrame-Schleife. Kein setInterval, kein
 * setTimeout je Wechsel. In jedem Bild wird aus der VERGANGENEN ZEIT gerechnet,
 * welches Feld brennen muss:
 *
 *     verstrichen = jetzt − stufenbeginn
 *     fach        = floor(verstrichen / periode)     0, 1, 2, 3, …
 *     im Fach     = verstrichen − fach · periode
 *     Seite       = fach gerade ? Startseite : Gegenseite
 *     brennt      = im Fach < trefferfenster
 *
 * Damit kann nichts driften: es wird nicht aufaddiert, sondern jedes Bild neu
 * aus der Uhr abgeleitet. Ein verschlucktes Bild verschiebt nichts. Ein
 * verstecktes Browserfenster hält die Schleife an; kommt es zurück, rechnet
 * dasselbe Bild die richtige Lage aus — und drücken konnte in der Zwischenzeit
 * ohnehin niemand.
 *
 * paint() wird nur gerufen, wenn sich der gemalte Zustand WIRKLICH ändert: auf
 * jeder Stufe sind das zehn Änderungen je Sekunde. Deshalb kostet Stufe 5000
 * keinen Deut mehr als Stufe 1.
 *
 *
 * WAS GEWERTET WIRD: DAS GEMALTE FELD, NICHT DIE UHR
 * --------------------------------------------------
 * CONCEPT.md 3.4: „Maßgeblich ist der Zustand der LICHTFELDER in genau dem
 * Moment, in dem gedrückt wird." Gewertet wird deshalb this.lit — genau der
 * Wert, der zuletzt an paint() übergeben wurde, gesetzt in der Anweisung davor.
 *
 * Nach der Uhr zu werten würde dem Spieler bis zu ein Bild (rund 16 ms)
 * anlasten, das er nie sehen konnte. Bei 40 ms Trefferfenster wären das 40 %
 * Unfairness. Eine Kulanzspanne gibt es nicht, in keine Richtung.
 *
 * Deshalb die Zusage an paint(): synchron malen. Ein Gerät, das die
 * Momentaufnahme aufhebt und später malt, bricht die Wertung.
 *
 *
 * DER ANSPRUCH — WAS DIE LEITER VON IHM VERLANGT
 * ----------------------------------------------
 * Der offene Gewinn wird als „Anspruch" übergeben: ein Betrag, der erspielt,
 * aber noch nicht gutgeschrieben ist. Die Leiter verlangt genau drei Dinge und
 * weiß sonst nichts über ihn — insbesondere nicht, wo das Guthaben liegt:
 *
 *   anspruch.amount      Zahl. Die Leiter schreibt hier hinein (verdoppeln).
 *   anspruch.collect()   schreibt gut. Rückgabewert wird nicht abgewartet.
 *   anspruch.discard()   verwirft, ohne gutzuschreiben.
 *
 * Warum nicht abgewartet wird: collect() darf asynchron sein, muss aber bis
 * einschließlich der Gutschrift synchron laufen. Das Gerät sagt das zu; die
 * Leiter verlässt sich darauf, weil ein Ereigniszuhörer nicht warten kann.
 *
 *
 * DIE KAPPUNG DES OFFENEN GEWINNS
 * -------------------------------
 * Verdoppelt werden darf unbegrenzt (CONCEPT.md 3.4) — die STUFE zählt deshalb
 * ohne Grenze weiter. Der BETRAG dagegen sättigt bei 2^53−1, weil JavaScript
 * oberhalb davon nicht mehr exakt mit ganzen Zahlen rechnet. Gekappt wird also
 * eine Rechengenauigkeit, kein Spielrecht: auszahlbar ist ohnehin weniger, und
 * dafür ist der Anspruch zuständig, nicht die Leiter.
 *
 *
 * BEIM ABRÄUMEN WIRD GUTGESCHRIEBEN, NICHT VERWORFEN
 * --------------------------------------------------
 * destroy() schreibt einen offenen Gewinn GUT. Der Einsatz ist längst
 * abgebucht, der Gewinn war rechtmäßig erspielt, die Leiter ist eine
 * freiwillige Zugabe. Ihn wegen eines technischen Ereignisses zu verlieren, auf
 * das der Spieler nicht reagieren kann, wäre eine willkürliche Strafe.
 *
 * Doppelt gutschreiben kann das nicht: der Anspruch wird VOR dem Aufruf aus
 * this.claim genommen, und ein Anspruch, der zweimal eingelöst wird, muss sich
 * laut Vertrag selbst wehren.
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Was hier steht, sind
 * Entwicklermeldungen für die Browserkonsole.
 */

import { stepTiming } from '@phomo17/casino-startpage/risk-timing.js';
// PRÄFIX, NICHT RELATIV (Plan D3c, Dateikopf-Nachtrag): verify-risk-timing.mjs
// lädt diese Datei als data:-Modul (toModule()) — ein relativer Import
// scheitert von dort aus (nur file://-Adressen lösen ihn auf, siehe der
// Kopf von credit.js für den Gegenfall). Der Modulname wird dort wie
// risk-timing.js selbst auf die echte Datei umgeschrieben.
import { konto } from '@phomo17/casino-startpage/account-backend.js';

/** Grundzustand. Alle Tasten der Leiter sind wirkungslos. */
export const PHASE_OFF = 'off';

/** Ein Gewinn liegt vor, die Leiter wartet auf eine Entscheidung. */
export const PHASE_OFFER = 'offer';

/** Die Leiter läuft. */
export const PHASE_LADDER = 'ladder';

export const SIDE_LEFT = 'left';
export const SIDE_RIGHT = 'right';

/** Kein Feld brennt. */
export const SIDE_NONE = 'none';

/** Obergrenze des offenen Gewinns. Siehe Dateikopf, „DIE KAPPUNG". */
export const MAX_WIN = Number.MAX_SAFE_INTEGER;

/**
 * @param {'left'|'right'} side
 * @returns {'left'|'right'}
 */
function otherSide(side) {
	return side === SIDE_LEFT ? SIDE_RIGHT : SIDE_LEFT;
}

/**
 * Erfüllt das Objekt den Anspruchsvertrag aus dem Dateikopf?
 *
 * Geprüft wird die Form, nicht die Herkunft: die Leiter soll mit jedem Anspruch
 * arbeiten können, der sich so verhält, egal welche Extension ihn gebaut hat.
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
 * Eine Risiko-Leiter.
 */
export class RiskLadder {
	/**
	 * @param {{draw: function(): number,
	 *          paint: function(object): void,
	 *          notify?: function(object): void}} connection
	 * @throws {TypeError} wenn draw oder paint fehlen
	 */
	constructor({ draw, paint, notify } = {}) {
		if (typeof draw !== 'function') {
			throw new TypeError('RiskLadder braucht eine Funktion draw(), die 0 oder 1 liefert.');
		}
		if (typeof paint !== 'function') {
			throw new TypeError('RiskLadder braucht eine Funktion paint(ansicht).');
		}

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

		/** Welche Seite auf dieser Stufe zuerst brennt – je Stufe neu gezogen. */
		this.startSide = SIDE_LEFT;

		/** Beginn der Stufe auf der Uhr der Zeichenschleife, in Millisekunden. */
		this.levelStart = 0;

		/** Das zuletzt an paint() übergebene Lichtfeld. Die Wertungsgrundlage. */
		this.lit = SIDE_NONE;

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
			sideMs: this.sideMs,
			onMs: this.onMs,
			darkMs: this.sideMs - this.onMs,
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
			console.error('[casino] Ein Gerät hat beim Malen der Risiko-Leiter einen Fehler geworfen.', error);
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
			console.error('[casino] Ein Gerät hat bei einer Meldung der Risiko-Leiter einen Fehler geworfen.', error);
		}
	}

	/**
	 * Zieht die Startseite der nächsten Stufe.
	 *
	 * Je Stufe frisch gezogen und nicht festgelegt: sonst wäre die Leiter zu
	 * gewinnen, indem man unmittelbar nach jedem Treffer dieselbe Taste erneut
	 * drückt — die Stufe beginnt ja immer mit brennendem Feld.
	 *
	 * Eine Quelle, die etwas anderes als 0 oder 1 liefert, ist ein Fehler des
	 * Geräts und wird nicht überspielt: würde hier ersatzweise immer 'left'
	 * genommen, wäre die Leiter lautlos gewinnbar. Der Aufrufer zieht deshalb
	 * VOR jeder Zustandsänderung, damit ein solcher Wurf nichts zerstört.
	 *
	 * @returns {'left'|'right'}
	 * @throws {RangeError}
	 */
	drawSide() {
		const value = this.draw();
		if (value === 0) {
			return SIDE_LEFT;
		}
		if (value === 1) {
			return SIDE_RIGHT;
		}
		throw new RangeError(`draw() muss 0 oder 1 liefern, lieferte: ${String(value)}`);
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
			console.error('[casino] Ein zweiter Gewinn, während die Risiko-Leiter noch läuft.');
			return false;
		}
		if (!isUsableClaim(claim)) {
			return false;
		}

		this.claim = claim;
		// Der offene Gewinn ist ab jetzt Vermögen der Person (D.7: „ein Gewinn,
		// der weder ausgezahlt noch verspielt ist"). Er wird SOFORT gebucht —
		// D.7.1 verlangt genau diesen Schritt („gewinnt jemand 1, steht das
		// Gesamtvermögen um 1 höher"). Ohne diese Buchung wäre die Summe oben
		// auf der Seite so lange falsch, wie die Leiter läuft.
		this.syncWin(konto.istServer ? konto.angebot(claim.amount) : null);
		this.phase = PHASE_OFFER;
		this.level = 0;
		this.sideMs = 0;
		this.onMs = 0;
		this.lit = SIDE_NONE;
		this.render('offer');
		return true;
	}

	/**
	 * Die Leiter läuft an, Stufe 1.
	 *
	 * @returns {boolean} false, wenn gerade kein Angebot vorliegt
	 */
	start() {
		if (this.phase !== PHASE_OFFER) {
			return false;
		}

		const side = this.drawSide();
		this.phase = PHASE_LADDER;
		this.level = 1;
		this.beginLevel(side);
		this.startLoop();
		this.report({ type: 'start', level: this.level, win: this.win });
		return true;
	}

	/**
	 * Eine Risiko-Taste wurde gedrückt.
	 *
	 * Gewertet wird das zuletzt GEMALTE Feld, nicht die Uhr — siehe Dateikopf.
	 * Ist gerade keines an, ist das ein Fehlgriff: CONCEPT.md 3.4, „ein Druck in
	 * einem solchen Moment gilt als falsch". Deshalb ist 'none' auch kein
	 * zulässiger Tipp: sonst gewänne, wer im Dunkeln auf „dunkel" tippt.
	 *
	 * @param {'left'|'right'} side
	 * @returns {?('hit'|'miss')} null, wenn die Leiter gar nicht läuft
	 */
	guess(side) {
		if (this.phase !== PHASE_LADDER) {
			return null;
		}
		if (side !== SIDE_LEFT && side !== SIDE_RIGHT) {
			console.error(`[casino] guess() erwartet 'left' oder 'right', bekam: ${String(side)}`);
			return null;
		}
		if (this.lit === side) {
			this.hit();
			return 'hit';
		}
		this.miss();
		return 'miss';
	}

	/**
	 * Treffer: verdoppeln und eine Stufe höher von vorn beginnen.
	 *
	 * Ohne Pause, ohne Zwischenanzeige. CONCEPT.md 3.4: „ist der Gewinn
	 * verdoppelt und das Blinken beginnt von vorn — eine Stufe höher."
	 *
	 * Die Seite wird zuerst gezogen: siehe drawSide().
	 *
	 * OPTIMISTISCH VERDOPPELT, UNBEDINGT, IN BEIDEN ZWEIGEN (Behebungslauf
	 * 2026-09-11, Ursache des gemeldeten Geldfehlers): vorher wurde
	 * this.claim.amount im Servermodus GAR NICHT hier gesetzt, sondern erst
	 * Millisekunden später im .then() von syncWin(). Bis dahin lasen sowohl
	 * beginLevel()/render('level') als auch report() noch den ALTEN Betrag —
	 * die Anzeige hinkte dauerhaft eine Stufe hinterher. Schlimmer: drückte
	 * der Spieler ein zweites Mal, bevor die erste Buchung zurück war, las
	 * DIESER hit() ebenfalls noch current aus dem alten this.win und bucht
	 * nur current × (factor − 1) auf Basis des alten Betrags — aus
	 * 10 → 20 → 40 wurde 10 → 20 → 30, ein echter Geldverlust, nicht nur ein
	 * Anzeigefehler. Die Zeile unten läuft deshalb jetzt IMMER, bevor
	 * gebucht, die Stufe erhöht oder gemalt wird: ein zweiter, schneller
	 * hit() liest current bereits als den bereits verdoppelten Betrag.
	 *
	 * @returns {void}
	 */
	hit() {
		const side = this.drawSide();
		const current = this.win;
		this.claim.amount = current >= MAX_WIN / 2 ? MAX_WIN : current * 2;
		// Im Servermodus BESTÄTIGT bzw. KORRIGIERT der Server anschließend
		// diesen optimistischen Wert (D.7.2: „Der Server rechnet, ist die
		// alleinige Wahrheit"). Angezeigt wird zuletzt immer, was er
		// zurückgibt — deshalb sättigt der offene Gewinn dort bei
		// 999.999.999 statt bei 2^53-1 (Plan 9.5). syncWin() überschreibt
		// this.claim.amount und malt erneut (reason 'sync'), sobald die
		// Antwort da ist; bis dahin gilt der optimistische Wert oben. Im
		// lokalen Modus (kein Server) bleibt es bei genau diesem einen Wert.
		if (konto.istServer) {
			this.syncWin(konto.verdoppeln());
		}
		this.level += 1;
		this.beginLevel(side);
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
	 * Runde abgebucht (CONCEPT.md 3.4). discard() schreibt nichts und bucht
	 * nichts ab; es macht den Anspruch nur unbrauchbar.
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
		// D.7.1 („verliert er, fällt es um 4 und wird erneut geschrieben").
		if (konto.istServer) {
			void konto.verloren();
		}
		claim.discard();

		this.render('settled', 0);
		this.report({ type: 'miss', level, win: 0, lost });
		this.reset();
	}

	/**
	 * Aussteigen und gutschreiben. Wirkt im Angebot genauso wie in der Leiter —
	 * CONCEPT.md 3.4 sagt „steigt JEDERZEIT aus".
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
		// der Rückkehr erledigt, alles Weitere ist Nachlauf. Siehe Dateikopf.
		void claim?.collect();

		this.render('settled', amount);
		this.report({ type: 'collect', level, win: amount });
		this.reset();
		return amount;
	}

	/**
	 * Beginnt eine Stufe: neue Zeiten, neue Startseite, neue Uhr.
	 *
	 * Das erste Bild wird SOFORT gemalt, nicht erst im nächsten Frame: sonst
	 * entstünde nach jedem Treffer ein künstliches Dunkelfenster von bis zu
	 * einem Bild, in dem ein schneller zweiter Druck als Fehlgriff zählte.
	 *
	 * @param {'left'|'right'} side
	 * @returns {void}
	 */
	beginLevel(side) {
		const timing = stepTiming(this.level);
		this.sideMs = timing.sideMs;
		this.onMs = timing.onMs;
		this.startSide = side;
		this.levelStart = globalThis.performance.now();
		this.lit = this.litAt(this.levelStart);
		this.render('level');
	}

	/**
	 * Welches Feld muss zum Zeitpunkt now brennen?
	 *
	 * Rein aus der Uhr abgeleitet, nichts aufaddiert – siehe Dateikopf.
	 *
	 * @param {number} now Zeit in Millisekunden
	 * @returns {'left'|'right'|'none'}
	 */
	litAt(now) {
		if (this.sideMs <= 0) {
			return SIDE_NONE;
		}
		const elapsed = now - this.levelStart;
		if (!(elapsed >= 0)) {
			return SIDE_NONE;
		}
		const slot = Math.floor(elapsed / this.sideMs);
		const inSlot = elapsed - slot * this.sideMs;
		const side = slot % 2 === 0 ? this.startSide : otherSide(this.startSide);
		return inSlot < this.onMs ? side : SIDE_NONE;
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
			this.report({ type: 'tick', level: this.level, lit, on: lit !== SIDE_NONE });
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
		this.lit = SIDE_NONE;
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
		this.lit = SIDE_NONE;
		this.render('end');
	}
}

export default RiskLadder;
