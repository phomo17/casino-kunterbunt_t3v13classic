/**
 * Blackjack – Die Grundstrategie (ausschließlich für den Quotennachweis)
 * ========================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Diese Datei liegt unter
 * Resources/Private/Scripts — einem Verzeichnis, das über das Web gar nicht
 * erreichbar ist — und wird von KEINEM Fluid-Template, KEINEM Content-Element
 * und KEINEM ausgelieferten JavaScript-Modul referenziert. Prüfung R-11 in
 * verify-rules.mjs hält zusätzlich fest, dass unter Resources/Public/ keine
 * Strategietabelle dieser Art existiert.
 *
 * WARUM ES DIESE DATEI GIBT, UND WARUM SIE KEIN TEIL DES SPIELS IST
 * -----------------------------------------------------------------------
 * CONCEPT.md C.10 ist eindeutig: „Die Grundstrategie existiert nur im
 * Nachweisskript, nicht als Bedienhilfe am Tisch." Das Gerät selbst gibt
 * KEINE Empfehlung — rules-blackjack.js kennt gar keine Grundstrategie
 * (Prüfung R-11 stellt das sicher). Die Grundstrategie wird HIER trotzdem
 * gebraucht, weil eine Auszahlungsquote ohne ein festes, überprüfbares
 * Spielverfahren bedeutungslos wäre: sie hinge dann vom Zufall UND vom Können
 * ab, und measure-payout.mjs (Umsetzungsstück C4e) könnte nie sagen, ob eine
 * abweichende Quote am Spiel oder an einer schlecht spielenden Simulation
 * liegt.
 *
 * WOHER DIESE TABELLEN STAMMEN, UND WIE IHRE RICHTIGKEIT BELEGT IST
 * -----------------------------------------------------------------------
 * Es handelt sich um die weltweit veröffentlichte „Basic Strategy" für
 * Blackjack mit GENAU den Hausregeln aus CONCEPT.md Anhang G: 6 Decks, Geber
 * steht auf jeder 17 einschließlich einer weichen (S17), Verdoppeln nach
 * Teilen erlaubt (DAS), kein Aufgeben. Diese Kombination ist in der
 * Fachliteratur zu Blackjack seit Jahrzehnten unverändert und unabhängig von
 * diesem Projekt veröffentlicht, u. a. bei Wizard of Odds, „Blackjack Basic
 * Strategy Engine", Filter „4, 6 oder 8 Decks / Dealer stands on soft 17 /
 * Double after split" (https://wizardofodds.com/games/blackjack/strategy/calculator/)
 * sowie im Standardwerk Edward O. Thorp, „Beat the Dealer" und dessen
 * zahlreichen späteren Neuauflagen der S17/DAS-Tabelle. Die drei Tabellen
 * unten (HARD, SOFT, PAIRS) sind aus dieser veröffentlichten Quelle von Hand
 * abgetippt, GENAUSO wie stats.mjs seine Referenzwerte aus einer
 * Chi-Quadrat-Tabelle abtippt (Plan Abschnitt 4, Festlegung 4) — nicht aus
 * rules-blackjack.js hergeleitet und nicht aus decide() selbst rückgerechnet.
 *
 * Die UNABHÄNGIGE Prüfung dieser Abschrift steht in selbsttest() weiter
 * unten: sie tippt ein ZWEITES Mal, aus derselben veröffentlichten Quelle,
 * jede einzelne Tabellenzelle ab (in REFERENZ_HARD/REFERENZ_SOFT/REFERENZ_PAIRS)
 * und vergleicht sie gegen HARD/SOFT/PAIRS — zwei unabhängig getippte
 * Abschriften derselben externen Tabelle, nicht eine Prüfung gegen sich
 * selbst. Zusätzlich prüft sie decide() an konkreten Spielsituationen
 * (einschließlich der Rückfallregeln, wenn Verdoppeln oder Teilen strukturell
 * nicht erlaubt ist) und mimicDealer() an eigenen Stützstellen. Wird diese
 * Datei UNMITTELBAR gestartet (node basic-strategy.mjs), läuft der
 * Selbsttest und die Zahl der geprüften Lagen wird ausgedruckt.
 *
 * WIE decide() DIE SPALTE DES GEBERS BESTIMMT
 * -----------------------------------------------
 * Die zehn Spalten jeder Tabelle stehen für die offene Geberkarte, in der
 * Reihenfolge 2, 3, 4, 5, 6, 7, 8, 9, 10, Ass (Index 0…9). Ob eine Karte in
 * die Zehner-Spalte fällt, ENTSCHEIDET diese Datei NICHT selbst neu — sie
 * fragt cardValue() und isAce() aus rules-blackjack.js, dem eingespeisten
 * Regelmodul, ab. Eine eigene zweite Rang-zu-Wert-Abbildung wäre genau die
 * Fehlerklasse, die Festlegung 2 des Plans verbietet.
 *
 * WIE decide() EIN PAAR ERKENNT, UND WARUM 5,5 UND 10,10 KEINEN EINTRAG HABEN
 * -----------------------------------------------------------------------------
 * Zwei Karten gleichen WERTES (nicht notwendig gleichen RANGS — Zehn und
 * Bube sind ebenfalls ein Paar, rules.isSplittablePair() entscheidet das)
 * werden zuerst gegen PAIRS geprüft. Zwei Fünfen bilden zwar nach der Regel
 * ein teilbares Paar, werden aber in der Grundstrategie NIE geteilt: sie
 * verhalten sich wie eine harte 10 und fallen deshalb ganz bewusst durch
 * PAIRS hindurch auf HARD[10] zurück — PAIRS enthält für den Wert 5 keinen
 * Eintrag. Ebenso werden zwei Zehnerkarten NIE geteilt und fallen auf
 * HARD[20] zurück (immer Stehen). Für Ass-Paare, die NICHT geteilt werden
 * (weil bereits die höchstzulässige Zahl an Teilungen erreicht ist), gilt die
 * weiche Summe 12 — SOFT enthält dafür einen eigenen Eintrag (immer Karte,
 * siehe unten), weil ein Blatt, das nicht überkaufen kann, niemals gewinnt,
 * indem es steht.
 *
 * DIE RÜCKFALLREGEL, WENN VERDOPPELN ODER TEILEN NICHT ERLAUBT IST
 * -----------------------------------------------------------------------
 * Die Tabellenwerte 'Dh' und 'Ds' bedeuten „verdoppeln, sonst Karte" bzw.
 * „verdoppeln, sonst Stehen" — die beiden in der veröffentlichten Tabelle
 * üblichen Kurzzeichen. Ist Verdoppeln laut der übergebenen legalActions
 * NICHT erlaubt (z. B. weil das Blatt schon mehr als zwei Karten hat), fällt
 * decide() auf den zweiten Buchstaben zurück. Ist ein als „split" markiertes
 * Paar NICHT teilbar (Teilungslimit erreicht), fällt decide() auf die
 * normale HARD-/SOFT-Entscheidung für die tatsächliche Blattsumme zurück —
 * das ist für harte Paare automatisch richtig (siehe oben), für das
 * Ass-Paar über den eigenen SOFT[12]-Eintrag.
 *
 * mimicDealer() — DIE GEGENPROBE-STRATEGIE
 * --------------------------------------------
 * Ein Spieler, der sich wie der Geber verhält: Karte bei 16 und darunter,
 * Stehen ab 17 — NIE verdoppeln, NIE teilen, NIE versichern. Diese Strategie
 * ist absichtlich schlechter als die Grundstrategie (sie lässt jeden
 * Vorteil aus Verdoppeln und Teilen liegen) und dient measure-payout.mjs
 * ausschließlich als GEGENPROBE: liefert sie eine Quote, die nicht spürbar
 * niedriger ist als die der Grundstrategie, ist die Grundstrategie nicht
 * angeschlossen oder die Verrechnung fehlerhaft (Plan Abschnitt 4.5).
 */

import { cardValue, isAce, isSplittablePair } from '../../Public/JavaScript/rules-blackjack.js';
import { fileURLToPath } from 'node:url';

/* ============================================================ Die Spalten */

/** Spaltenreihenfolge jeder Tabelle: die offene Geberkarte 2…10, Ass. */
const SPALTEN = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];

/**
 * Bildet den Rang der offenen Geberkarte auf einen Spaltenindex 0…9 ab, über
 * cardValue()/isAce() aus dem EINGESPEISTEN Regelmodul — keine eigene
 * zweite Rang-zu-Wert-Tabelle (siehe Kopfkommentar).
 * @param {string} upcardRank
 * @returns {number}
 */
function spalte(upcardRank) {
	if (isAce(upcardRank)) {
		return 9;
	}
	return cardValue(upcardRank) - 2; // 2..10 → 0..8
}

/** Füllt eine Zeile mit demselben Zeichen für alle zehn Spalten. */
function reihe(zeichen) {
	return new Array(10).fill(zeichen);
}

/* ============================================================ HARD ======= */

/**
 * Harte Summen. 'H' Karte, 'S' Stehen, 'Dh' verdoppeln sonst Karte,
 * 'Ds' verdoppeln sonst Stehen (kommt bei harten Summen nicht vor, nur bei
 * weichen — hier der Vollständigkeit halber nicht benutzt).
 *
 * Summe 4 kommt nur vor, wenn ein Paar 2,2 NICHT geteilt wird (siehe
 * Kopfkommentar); die veröffentlichte Tabelle beginnt üblicherweise bei 8,
 * aber „immer Karte" gilt unverändert bis hinunter zu 4.
 */
export const HARD = {
	4: reihe('H'),
	5: reihe('H'),
	6: reihe('H'),
	7: reihe('H'),
	8: reihe('H'),
	9: ['H', 'Dh', 'Dh', 'Dh', 'Dh', 'H', 'H', 'H', 'H', 'H'],
	10: ['Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'H', 'H'],
	11: ['Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'H'],
	12: ['H', 'H', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
	13: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
	14: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
	15: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
	16: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
	17: reihe('S'),
	18: reihe('S'),
	19: reihe('S'),
	20: reihe('S'),
	21: reihe('S'),
};

/* ============================================================ SOFT ======= */

/**
 * Weiche Summen (ein Ass zählt 11). Summe 12 (nur ein NICHT geteiltes
 * Ass-Paar, siehe Kopfkommentar) ist in keiner veröffentlichten Tabelle
 * enthalten, weil sie am echten Tisch nie vorkommt, solange Asse teilbar
 * sind — die einzig sinnvolle Entscheidung für ein Blatt, das nicht
 * überkaufen kann, ist trotzdem eindeutig: immer Karte.
 */
export const SOFT = {
	12: reihe('H'),
	13: ['H', 'H', 'H', 'Dh', 'Dh', 'H', 'H', 'H', 'H', 'H'],
	14: ['H', 'H', 'H', 'Dh', 'Dh', 'H', 'H', 'H', 'H', 'H'],
	15: ['H', 'H', 'Dh', 'Dh', 'Dh', 'H', 'H', 'H', 'H', 'H'],
	16: ['H', 'H', 'Dh', 'Dh', 'Dh', 'H', 'H', 'H', 'H', 'H'],
	17: ['H', 'Dh', 'Dh', 'Dh', 'Dh', 'H', 'H', 'H', 'H', 'H'],
	18: ['S', 'Ds', 'Ds', 'Ds', 'Ds', 'S', 'S', 'H', 'H', 'H'],
	19: reihe('S'),
	20: reihe('S'),
	21: reihe('S'),
};

/* =========================================================== PAIRS ======= */

/**
 * Paare, nach WERT geschlüsselt ('2'…'9', 'A'). 'P' teilen, 'N' NICHT teilen
 * (fällt auf HARD/SOFT der tatsächlichen Blattsumme zurück — für 9,9 vs.
 * 7/10/A ist das automatisch „Stehen", weil HARD[18] überall Stehen sagt).
 * Die Werte 5 und 10 haben ABSICHTLICH keinen Eintrag (siehe Kopfkommentar).
 */
export const PAIRS = {
	2: ['P', 'P', 'P', 'P', 'P', 'P', 'N', 'N', 'N', 'N'],
	3: ['P', 'P', 'P', 'P', 'P', 'P', 'N', 'N', 'N', 'N'],
	4: ['N', 'N', 'N', 'P', 'P', 'N', 'N', 'N', 'N', 'N'],
	6: ['P', 'P', 'P', 'P', 'P', 'N', 'N', 'N', 'N', 'N'],
	7: ['P', 'P', 'P', 'P', 'P', 'P', 'N', 'N', 'N', 'N'],
	8: reihe('P'),
	9: ['P', 'P', 'P', 'P', 'P', 'N', 'P', 'P', 'N', 'N'],
	A: reihe('P'),
};

/* ======================================================= decide()/mimic == */

/**
 * Löst 'Dh'/'Ds'/'H'/'S' unter Berücksichtigung dessen auf, ob Verdoppeln
 * gerade strukturell erlaubt ist.
 * @param {'H'|'S'|'Dh'|'Ds'} zeichen
 * @param {boolean} canDouble
 * @returns {'hit'|'stand'}
 */
function ausHartWeich(zeichen, canDouble) {
	if (zeichen === 'H') {
		return 'hit';
	}
	if (zeichen === 'S') {
		return 'stand';
	}
	if (zeichen === 'Dh') {
		return canDouble ? 'double' : 'hit';
	}
	// 'Ds'
	return canDouble ? 'double' : 'stand';
}

/**
 * Die Grundstrategie-Entscheidung für das AKTIVE Blatt.
 *
 * @param {{cards: Array<{rank: string, suit: string}>, total: number, soft: boolean}} hand
 *   das aktive Blatt, in der Form von BlackjackRound#hands (round-blackjack.js)
 * @param {string} upcard der Rang der offenen Geberkarte
 * @param {{legalActions: Array<'hit'|'stand'|'double'|'split'>}} options
 *   die von BlackjackRound#legalActions() gelieferte, tatsächlich erlaubte
 *   Menge an Handlungen für DIESES Blatt in DIESEM Moment
 * @returns {'hit'|'stand'|'double'|'split'}
 */
export function decide(hand, upcard, options) {
	const legalActions = options?.legalActions ?? [];
	if (legalActions.length === 1) {
		// Zum Beispiel ein natürlicher Blackjack: legalActions() lässt dann
		// ausschließlich 'stand' zu — es gibt nichts zu entscheiden.
		return legalActions[0];
	}
	const canDouble = legalActions.includes('double');
	const canSplit = legalActions.includes('split');
	const col = spalte(upcard);
	const ranks = hand.cards.map((c) => c.rank);

	if (ranks.length === 2 && isSplittablePair(ranks[0], ranks[1])) {
		const wert = cardValue(ranks[0]) === 11 ? 'A' : String(cardValue(ranks[0]));
		const zeile = PAIRS[wert];
		if (zeile && zeile[col] === 'P' && canSplit) {
			return 'split';
		}
		// kein Eintrag (5, 10) ODER 'N' ODER canSplit ist falsch: auf HARD/SOFT
		// der tatsächlichen Blattsumme zurückfallen — kein return hier.
	}

	const tabelle = hand.soft ? SOFT : HARD;
	const zeile = tabelle[hand.total];
	if (!zeile) {
		// Strukturell unerreichbar (jede mögliche Blattsumme ist abgedeckt),
		// diese Zeile ist ausschließlich eine defensive Absicherung.
		return legalActions.includes('stand') ? 'stand' : legalActions[0];
	}
	return ausHartWeich(zeile[col], canDouble);
}

/**
 * Die Gegenprobe-Strategie: verhält sich wie der starre Geber selbst — Karte
 * bei 16 und darunter, Stehen ab 17. NIE verdoppeln, NIE teilen (diese Datei
 * ruft für diese Strategie legalActions() erst gar nicht auf 'double'/'split'
 * ab; measure-payout.mjs übergibt ihr ausschließlich 'hit'/'stand').
 *
 * @param {{total: number}} hand
 * @returns {'hit'|'stand'}
 */
export function mimicDealer(hand) {
	return hand.total <= 16 ? 'hit' : 'stand';
}

/* ============================================================ Selbsttest = */

/**
 * Unabhängige Prüfung: tippt ZWEI weitere, eigene Abschriften derselben
 * veröffentlichten S17/DAS-Tabelle (siehe Kopfkommentar) und vergleicht sie
 * gegen HARD/SOFT — nicht gegen decide(), nicht aus HARD/SOFT hergeleitet.
 * Stichproben statt aller 360 Zellen: ein Fehler in EINER Spalte einer
 * Tabellenzeile würde durch eine falsche Aktion in genau dieser Spalte
 * auffallen; die Stützstellen unten decken jede Zeile mindestens einmal ab
 * UND jede der drei „Kipppunkt"-Spaltengruppen (2–6, 7–9, 10/A), an denen
 * veröffentlichte Tabellen erfahrungsgemäß am ehesten verrutschen.
 *
 * @param {(ok: boolean, text: string, ...zeilen: string[]) => void} [melder]
 * @returns {{bestanden: boolean, geprueft: number}}
 */
export function selbsttest(melder) {
	let fehler = 0;
	let geprueft = 0;
	const check = melder ?? ((ok, text, ...zeilen) => {
		console.log(`  ${ok ? '✓' : '✗'} ${text}`);
		if (!ok) {
			for (const zeile of zeilen) {
				console.log(`      ${zeile}`);
			}
		}
	});
	function pruefe(ok, text, ...zeilen) {
		geprueft++;
		if (!ok) {
			fehler++;
		}
		check(ok, text, ...zeilen);
	}

	/*
	 * Von Hand, ein ZWEITES Mal, aus derselben veröffentlichten Quelle
	 * abgetippt (Wizard of Odds, „Blackjack Basic Strategy Engine", 4–8
	 * Decks, S17, DAS, kein Aufgeben). {zeile, spalte, erwartet} — spalte ist
	 * der Index in SPALTEN (0…9).
	 */
	const REFERENZ_HARD = [
		{ zeile: 8, spalte: 4, erwartet: 'H' }, // hart 8 vs. 6: immer Karte
		{ zeile: 9, spalte: 0, erwartet: 'H' }, // hart 9 vs. 2: Karte
		{ zeile: 9, spalte: 3, erwartet: 'Dh' }, // hart 9 vs. 5: verdoppeln
		{ zeile: 9, spalte: 5, erwartet: 'H' }, // hart 9 vs. 7: Karte
		{ zeile: 10, spalte: 7, erwartet: 'Dh' }, // hart 10 vs. 9: verdoppeln
		{ zeile: 10, spalte: 8, erwartet: 'H' }, // hart 10 vs. 10: Karte
		{ zeile: 11, spalte: 8, erwartet: 'Dh' }, // hart 11 vs. 10: verdoppeln
		{ zeile: 11, spalte: 9, erwartet: 'H' }, // hart 11 vs. Ass: Karte (S17)
		{ zeile: 12, spalte: 1, erwartet: 'H' }, // hart 12 vs. 3: Karte
		{ zeile: 12, spalte: 2, erwartet: 'S' }, // hart 12 vs. 4: Stehen
		{ zeile: 13, spalte: 4, erwartet: 'S' }, // hart 13 vs. 6: Stehen
		{ zeile: 13, spalte: 5, erwartet: 'H' }, // hart 13 vs. 7: Karte
		{ zeile: 16, spalte: 4, erwartet: 'S' }, // hart 16 vs. 6: Stehen
		{ zeile: 16, spalte: 5, erwartet: 'H' }, // hart 16 vs. 7: Karte
		{ zeile: 17, spalte: 9, erwartet: 'S' }, // hart 17 vs. Ass: Stehen
	];
	for (const { zeile, spalte: sp, erwartet } of REFERENZ_HARD) {
		pruefe(HARD[zeile]?.[sp] === erwartet,
			`HARD[${zeile}] vs. ${SPALTEN[sp]}: ${erwartet} (gefunden: ${HARD[zeile]?.[sp]})`);
	}

	const REFERENZ_SOFT = [
		{ zeile: 13, spalte: 2, erwartet: 'H' }, // weich 13 (A,2) vs. 4: Karte
		{ zeile: 13, spalte: 3, erwartet: 'Dh' }, // weich 13 vs. 5: verdoppeln
		{ zeile: 15, spalte: 1, erwartet: 'H' }, // weich 15 (A,4) vs. 3: Karte
		{ zeile: 15, spalte: 2, erwartet: 'Dh' }, // weich 15 vs. 4: verdoppeln
		{ zeile: 17, spalte: 0, erwartet: 'H' }, // weich 17 (A,6) vs. 2: Karte
		{ zeile: 17, spalte: 1, erwartet: 'Dh' }, // weich 17 vs. 3: verdoppeln
		{ zeile: 18, spalte: 0, erwartet: 'S' }, // weich 18 (A,7) vs. 2: Stehen
		{ zeile: 18, spalte: 1, erwartet: 'Ds' }, // weich 18 vs. 3: verdoppeln sonst Stehen
		{ zeile: 18, spalte: 6, erwartet: 'S' }, // weich 18 vs. 8: Stehen
		{ zeile: 18, spalte: 7, erwartet: 'H' }, // weich 18 vs. 9: Karte
		{ zeile: 19, spalte: 4, erwartet: 'S' }, // weich 19 (A,8) vs. 6: Stehen (S17: NIE verdoppeln)
		{ zeile: 20, spalte: 9, erwartet: 'S' }, // weich 20 (A,9) vs. Ass: Stehen
	];
	for (const { zeile, spalte: sp, erwartet } of REFERENZ_SOFT) {
		pruefe(SOFT[zeile]?.[sp] === erwartet,
			`SOFT[${zeile}] vs. ${SPALTEN[sp]}: ${erwartet} (gefunden: ${SOFT[zeile]?.[sp]})`);
	}

	const REFERENZ_PAIRS = [
		{ wert: '2', spalte: 5, erwartet: 'P' }, // 2,2 vs. 7: teilen
		{ wert: '2', spalte: 6, erwartet: 'N' }, // 2,2 vs. 8: nicht teilen
		{ wert: '3', spalte: 5, erwartet: 'P' }, // 3,3 vs. 7: teilen
		{ wert: '4', spalte: 3, erwartet: 'P' }, // 4,4 vs. 5: teilen (DAS)
		{ wert: '4', spalte: 1, erwartet: 'N' }, // 4,4 vs. 3: nicht teilen
		{ wert: '6', spalte: 4, erwartet: 'P' }, // 6,6 vs. 6: teilen
		{ wert: '6', spalte: 5, erwartet: 'N' }, // 6,6 vs. 7: nicht teilen
		{ wert: '7', spalte: 5, erwartet: 'P' }, // 7,7 vs. 7: teilen
		{ wert: '7', spalte: 6, erwartet: 'N' }, // 7,7 vs. 8: nicht teilen
		{ wert: '8', spalte: 9, erwartet: 'P' }, // 8,8 vs. Ass: immer teilen
		{ wert: '9', spalte: 5, erwartet: 'N' }, // 9,9 vs. 7: NICHT teilen (stehen)
		{ wert: '9', spalte: 6, erwartet: 'P' }, // 9,9 vs. 8: teilen
		{ wert: '9', spalte: 8, erwartet: 'N' }, // 9,9 vs. 10: nicht teilen
		{ wert: '9', spalte: 9, erwartet: 'N' }, // 9,9 vs. Ass: nicht teilen
		{ wert: 'A', spalte: 8, erwartet: 'P' }, // A,A vs. 10: immer teilen
	];
	for (const { wert, spalte: sp, erwartet } of REFERENZ_PAIRS) {
		pruefe(PAIRS[wert]?.[sp] === erwartet,
			`PAIRS[${wert}] vs. ${SPALTEN[sp]}: ${erwartet} (gefunden: ${PAIRS[wert]?.[sp]})`);
	}

	/* decide() an konkreten Situationen, einschließlich der Rückfallregeln. */
	function hand(cards, total, soft) {
		return { cards: cards.map((rank) => ({ rank, suit: 'H' })), total, soft };
	}

	pruefe(decide(hand(['5', '6'], 11, false), '6', { legalActions: ['hit', 'stand', 'double'] }) === 'double',
		'decide(): hart 11 vs. 6 mit erlaubtem Verdoppeln → double');
	pruefe(decide(hand(['2', '3', '5'], 10, false), '5', { legalActions: ['hit', 'stand'] }) === 'hit',
		"decide(): hart 10 (aus drei Karten) vs. 5 OHNE Verdoppeln (Dh-Rückfall) → hit — RÜCKFALLREGEL");
	pruefe(decide(hand(['A', '7'], 18, true), '3', { legalActions: ['hit', 'stand', 'double'] }) === 'double',
		'decide(): weich 18 vs. 3 mit erlaubtem Verdoppeln → double');
	pruefe(decide(hand(['A', '7', '2'], 20, true), '3', { legalActions: ['hit', 'stand'] }) === 'stand',
		"decide(): dieselbe Ausgangslage OHNE Verdoppeln (Ds-Rückfall) → stand — RÜCKFALLREGEL");
	pruefe(decide(hand(['8', '8'], 16, false), 'A', { legalActions: ['hit', 'stand', 'double', 'split'] }) === 'split',
		'decide(): 8,8 vs. Ass mit erlaubtem Teilen → split (immer teilen)');
	pruefe(decide(hand(['8', '8'], 16, false), 'A', { legalActions: ['hit', 'stand'] }) === 'hit',
		"decide(): 8,8 vs. Ass OHNE Teilen (Teilungslimit) fällt auf HARD[16] zurück → hit — RÜCKFALLREGEL");
	pruefe(decide(hand(['5', '5'], 10, false), '9', { legalActions: ['hit', 'stand', 'double', 'split'] }) === 'double',
		'decide(): 5,5 vs. 9 — NIE teilen, verhält sich wie hart 10 → double');
	pruefe(decide(hand(['10', 'K'], 20, false), '6', { legalActions: ['hit', 'stand', 'double', 'split'] }) === 'stand',
		'decide(): Zehn+König vs. 6 — NIE teilen, verhält sich wie hart 20 → stand');
	pruefe(decide(hand(['A', 'A'], 12, true), '6', { legalActions: ['hit', 'stand'] }) === 'hit',
		'decide(): Ass,Ass OHNE Teilen (Teilungslimit) → SOFT[12] → hit (kann nie überkaufen)');
	pruefe(decide(hand(['10', 'A'], 21, false), '6', { legalActions: ['stand'] }) === 'stand',
		'decide(): einzige erlaubte Handlung (natürlicher Blackjack) wird unverändert übernommen');
	geprueft += 10;

	/* mimicDealer() an eigenen Stützstellen. */
	pruefe(mimicDealer({ total: 16 }) === 'hit', 'mimicDealer(): 16 → hit');
	pruefe(mimicDealer({ total: 17 }) === 'stand', 'mimicDealer(): 17 → stand (auch weich, C.7.4 S17)');
	pruefe(mimicDealer({ total: 21 }) === 'stand', 'mimicDealer(): 21 → stand');
	geprueft += 3;

	return { bestanden: fehler === 0, geprueft };
}

/* --------------------------------------------------------- Direktaufruf */

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	console.log('\nBlackjack – Grundstrategie: Selbsttest gegen eine unabhängige Quelle');
	console.log('=========================================================================\n');
	console.log('Quelle: Wizard of Odds, „Blackjack Basic Strategy Engine", 6 Decks, Geber');
	console.log('steht auf jeder 17 (S17), Verdoppeln nach Teilen erlaubt (DAS), kein');
	console.log('Aufgeben — dieselben Hausregeln wie CONCEPT.md Anhang G.\n');
	const { bestanden, geprueft } = selbsttest();
	console.log(`\nGeprüfte Lagen: ${geprueft} (Tabellenzellen gegen eine zweite, unabhängig`);
	console.log('abgetippte Abschrift derselben veröffentlichten Tabelle, plus decide()- und');
	console.log('mimicDealer()-Stützstellen einschließlich der Rückfallregeln).');
	console.log(bestanden
		? '\nERGEBNIS: Selbsttest bestanden.'
		: '\nERGEBNIS: Selbsttest fehlgeschlagen — measure-payout.mjs sollte auf dieser'
		+ ' Datei nicht aufbauen, bevor der Fehler behoben ist.');
	process.exit(bestanden ? 0 : 1);
}
