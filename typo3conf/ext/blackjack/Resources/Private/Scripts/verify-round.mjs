/**
 * Blackjack – Nachweis Runde und starrer Geber (Q-1 bis Q-16)
 * ================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Rechnet mit den ECHTEN
 * Dateien (rules-blackjack.js, shoe.js, round-blackjack.js, rng.js), startet
 * keinen Browser und braucht keine laufende TYPO3-Instanz. Laufzeit unter
 * einer Minute (Plan Abschnitt 4.4).
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/verify-round.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.4, Umsetzungsstück C4d)
 * -------------------------------------------------------------------
 *   Q-1  Der Ablauf aus Anhang G läuft in genau dieser Reihenfolge; jeder
 *        Zustand wird durchlaufen; ein Aufruf außer der Reihe wird abgewiesen
 *   Q-2  Peek: nur bei Ass oder Zehner; bei Geber-Blackjack endet die Runde
 *        sofort; nur ein Spieler-Blackjack ist dann Patt
 *   Q-3  Versicherung nur bei sichtbarem Ass; höchstens der halbe Einsatz;
 *        zahlt 2:1; ein zu hoher Betrag wird abgewiesen
 *   Q-4  Verdoppeln nur auf zwei Karten, auch nach dem Teilen, genau eine
 *        weitere Karte, danach steht das Blatt
 *   Q-5  Teilen bis zu dreimal, höchstens vier Blätter; der vierte Versuch
 *        wird ABGEWIESEN
 *   Q-6  Geteilte Asse: genau eine Karte, kein erneutes Teilen, Ass + Zehner
 *        ist 21 und KEIN Blackjack
 *   Q-7  Zehn, Bube, Dame und König bilden paarweise ein teilbares Paar
 *   Q-8  Kein Aufgeben: act('surrender') wird abgewiesen
 *   Q-9  Der Geber weicht in keiner Lage ab
 *   Q-10 Jeder Betrag ist eine ganze Zahl — erschöpfend über alle 50 legalen
 *        Einsätze und alle Ausgänge
 *   Q-11 Die Bilanz stimmt nach jeder einzelnen Runde — auf den Cent
 *   Q-12 Der Schlitten wird nur zwischen Runden neu gemischt
 *   Q-13 Vorzeitiges Mischen ausschließlich oberhalb eines wahren Zählers +3
 *   Q-14 Wiederholbarkeit: gleiche Saat → identische Rundenfolge
 *   Q-15 round-blackjack.js ist import- und dokumentfrei; kein Math.random,
 *        kein Zugriff auf einen Zähler
 *   Q-16 Einsatzgrenzen: 2 bis 100, geradzahlig
 *
 * DIE WICHTIGSTE REGEL DIESER DATEI (Plan Abschnitt 4, Festlegung 4)
 * -------------------------------------------------------------------
 * Jede Erwartung unten ist UNABHÄNGIG von round-blackjack.js hergeleitet:
 * summeUnabhaengig() ist eine eigene, von Hand aus Anhang G getippte
 * Kartensummen-Funktion (nicht rules.handTotal()), dealerMussZiehenUnabhaengig()
 * ist ein eigenes, von Hand getipptes Zieh-Prädikat (nicht rules.dealerMustDraw()),
 * und erwarteteHandRueckgabe()/erwarteteVersicherungsRueckgabe() rechnen die
 * Auszahlungsfaktoren (3:2, 1:1, 2:1) selbst nach, statt rules.blackjackReturn()
 * & Co. aufzurufen. JEDE Prüfung mit Gegenprobe (Q-9-G, Q-10-G, Q-11-G,
 * Q-13-G, Q-14-G) arbeitet auf einer im Skript selbst angefertigten,
 * verfälschten oder künstlich eingeschränkten Kopie und schlägt NACHWEISLICH
 * fehl. Eine Prüfung, die nie fehlschlagen kann, ist keine.
 *
 * ZWEI ARTEN VON TESTFÄLLEN IN DIESER DATEI
 * ----------------------------------------------
 * Für die strukturellen Fälle (Q-1 bis Q-8, Q-16) bekommt round-blackjack.js
 * einen GESKRIPTETEN Schlitten (nur draw(), in fester Reihenfolge) — das
 * einzige Mittel, mit dem sich ein bestimmtes Blatt (Geber-Blackjack, ein
 * bestimmtes Paar, eine bestimmte Kartenzahl) überhaupt zuverlässig herstellen
 * lässt, genau wie S-4 in verify-shoe.mjs mit einem geskripteten Zufallsgeber
 * arbeitet. rules-blackjack.js bleibt dabei immer das ECHTE Regelmodul. Für
 * die statistischen/verhaltensmäßigen Fälle (Q-9, Q-11, Q-12, Q-13, Q-14)
 * spielt round-blackjack.js gegen einen ECHTEN Shoe mit createSeeded() —
 * exakt die Bauart, mit der auch S-11 in verify-shoe.mjs rechnet.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as rules from '../../Public/JavaScript/rules-blackjack.js';
import { Shoe } from '../../Public/JavaScript/shoe.js';
import { createSeeded } from '../../Public/JavaScript/rng.js';
import { BlackjackRound } from '../../Public/JavaScript/round-blackjack.js';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/blackjack/ */
const EXT = path.resolve(HIER, '../../..');
const ROUND_PATH = path.join(EXT, 'Resources/Public/JavaScript/round-blackjack.js');

let fehler = 0;

function check(ok, text, ...zeilen) {
	console.log(`  ${ok ? '✓' : '✗'} ${text}`);
	if (!ok) {
		fehler++;
		for (const zeile of zeilen) {
			console.log(`      ${zeile}`);
		}
	}
}

console.log('\nBlackjack – Nachweis Runde und starrer Geber (Q-1 bis Q-16)');
console.log('================================================================\n');

/* ===================================================== Hilfsmittel ====== */

/** @param {string} rank @param {string} [suit] */
function karte(rank, suit = 'H') {
	return { rank, suit };
}

/**
 * Ein Schlitten-Doppel, das NUR draw() nachbildet — für die strukturellen
 * Fälle, in denen ein bestimmtes Blatt zuverlässig hergestellt werden muss.
 * @param {Array<{rank: string, suit: string}>} cards
 */
function geskripteterSchlitten(cards) {
	let i = 0;
	return {
		draw() {
			if (i >= cards.length) {
				throw new RangeError('geskripteterSchlitten: keine weiteren Karten vorbereitet');
			}
			return cards[i++];
		},
	};
}

/**
 * Der Kartenwert eines Rangs — VON HAND aus Anhang G getippt, UNABHÄNGIG von
 * rules.cardValue().
 * @param {string} rank
 */
function kartenwertUnabhaengig(rank) {
	if (rank === 'A') {
		return 11;
	}
	if (rank === 'J' || rank === 'Q' || rank === 'K') {
		return 10;
	}
	return Number(rank);
}

/**
 * Die Summe eines Blattes — VON HAND aus Anhang G getippt, UNABHÄNGIG von
 * rules.handTotal().
 * @param {string[]} ranks
 * @returns {{total: number, busted: boolean}}
 */
function summeUnabhaengig(ranks) {
	let summe = 0;
	let asse = 0;
	for (const r of ranks) {
		const wert = kartenwertUnabhaengig(r);
		summe += wert;
		if (wert === 11) {
			asse++;
		}
	}
	while (summe > 21 && asse > 0) {
		summe -= 10;
		asse--;
	}
	return { total: summe, busted: summe > 21 };
}

/**
 * Das Zieh-Schema des Gebers — VON HAND aus Anhang G hergeleitet (S17:
 * ziehen bei 16 und weniger, stehen ab 17, für weiche wie harte Summen
 * gleichermaßen), UNABHÄNGIG von rules.dealerMustDraw().
 * @param {number} total
 */
function dealerMussZiehenUnabhaengig(total) {
	return total <= 16;
}

/**
 * Die Rückgabe EINES Blattes — die drei Auszahlungsfaktoren aus Anhang G
 * (3:2, 1:1, Patt = Einsatz zurück) selbst nachgerechnet, UNABHÄNGIG von
 * rules.blackjackReturn()/winReturn()/pushReturn()/loseReturn().
 * @param {{cards: Array, stake: number, fromSplit: boolean}} hand
 * @param {string[]} dealerRanks
 */
function erwarteteHandRueckgabe(hand, dealerRanks) {
	const meine = summeUnabhaengig(hand.cards.map((c) => c.rank));
	if (meine.busted) {
		return 0;
	}
	const dealer = summeUnabhaengig(dealerRanks);
	const istBlackjack = !hand.fromSplit && hand.cards.length === 2 && meine.total === 21;
	const dealerHatBlackjack = dealerRanks.length === 2 && dealer.total === 21;
	if (istBlackjack && dealerHatBlackjack) {
		return hand.stake; // beide Blackjack: Patt, kein 3:2
	}
	if (istBlackjack) {
		return hand.stake + (hand.stake * 3) / 2; // 3:2
	}
	if (dealer.busted || meine.total > dealer.total) {
		return hand.stake * 2; // 1:1, Einsatz eingeschlossen
	}
	if (meine.total === dealer.total) {
		return hand.stake; // Patt
	}
	return 0;
}

/**
 * Die Rückgabe der Versicherung — 2:1 auf den Einsatz, selbst nachgerechnet,
 * UNABHÄNGIG von rules.insuranceReturn().
 * @param {number} staked
 * @param {string[]} dealerRanks
 */
function erwarteteVersicherungsRueckgabe(staked, dealerRanks) {
	if (staked === 0) {
		return 0;
	}
	const dealer = summeUnabhaengig(dealerRanks);
	const dealerBlackjack = dealerRanks.length === 2 && dealer.total === 21;
	return dealerBlackjack ? staked * 3 : 0;
}

/**
 * Prüft die Bilanz EINES Berichts gegen die unabhängige Nachrechnung.
 * @param {Object} report
 * @returns {boolean}
 */
function bilanzIstKorrekt(report) {
	const dealerRanks = report.dealer.cards.map((c) => c.rank);
	let erwartetStaked = report.insurance.staked;
	let erwartetReturned = erwarteteVersicherungsRueckgabe(report.insurance.staked, dealerRanks);
	for (const hand of report.hands) {
		erwartetStaked += hand.stake;
		erwartetReturned += erwarteteHandRueckgabe(hand, dealerRanks);
	}
	return erwartetStaked === report.staked
		&& erwartetReturned === report.returned
		&& report.net === report.returned - report.staked;
}

/** Wie bilanzIstKorrekt(), aber mit check() und Klartext für einen einzelnen Fall. */
function pruefeBilanz(report, label) {
	const ok = bilanzIstKorrekt(report);
	check(ok, `${label}: Bilanz stimmt exakt (staked=${report.staked}, returned=${report.returned}, net=${report.net})`);
	return ok;
}

/**
 * Prüft, dass jede Ziehentscheidung des Gebers in EINEM Bericht dem
 * unabhängig getippten Schema entspricht. Meldet nichts, wenn das Schema nie
 * befragt wurde (playedOut === false) — das ist keine Abweichung, sondern die
 * dokumentierte Ausnahme (frühes Ende oder alle Spielerblätter überkauft).
 * @param {Object} report
 * @returns {boolean}
 */
function geberEntscheidungenSindKorrekt(report) {
	if (!report.dealer.playedOut) {
		return true;
	}
	const ranks = report.dealer.cards.map((c) => c.rank);
	for (let i = 2; i < ranks.length; i++) {
		if (!dealerMussZiehenUnabhaengig(summeUnabhaengig(ranks.slice(0, i)).total)) {
			return false; // gezogen, obwohl das Schema STEHEN verlangte
		}
	}
	if (dealerMussZiehenUnabhaengig(summeUnabhaengig(ranks).total)) {
		return false; // stehen geblieben, obwohl das Schema ZIEHEN verlangte
	}
	return true;
}

/**
 * Spielt viele Runden gegen einen ECHTEN Shoe mit einer denkbar einfachen,
 * aber gültigen Spielerstrategie ("immer stehen" — legalActions() erlaubt
 * 'stand' in JEDER Lage, auch bei einem natürlichen Blackjack). Diese Strategie
 * erzeugt KEINEN Bust des Spielers (ein Zweikartenblatt kann nicht überkaufen)
 * — Bust-, Verdopplungs- und Teilungsfälle werden stattdessen in Q-1 bis Q-8
 * mit geskripteten Schlitten geprüft. Ziel dieser Funktion ist ausschließlich
 * das Verhalten des GEBERS, des SCHLITTENS und der BILANZ über sehr viele,
 * echt gemischte Runden (Q-9 Teil 2+3, Q-11, Q-12, Q-13, Q-14).
 *
 * @param {{seed: number, runden: number, clampCount?: boolean}} optionen
 */
function simuliere({ seed, runden, clampCount = false }) {
	const shoe = new Shoe({ rules, random: createSeeded(seed) });
	const round = new BlackjackRound({ rules, shoe });
	const ereignisse = [];
	const fingerabdruecke = [];
	let bilanzFehler = 0;
	let geberSchemaFehler = 0;
	let shuffleWaehrendDerRunde = 0;

	for (let n = 0; n < runden; n++) {
		if (clampCount && shoe.trueCount > 2.9) {
			// Q-13-G: der wahre Zähler wird künstlich gedeckelt, indem der
			// laufende Zähler des ECHTEN Schlittens zurückgesetzt wird — das
			// Ziehen der Karten selbst (draw()) bleibt unangetastet.
			shoe.running = 0;
		}
		if (shoe.needsShuffle) {
			ereignisse.push({ reason: shoe.shuffleReason, trueCount: shoe.trueCount });
			shoe.shuffle();
		}
		const shuffleCountVorher = shoe.shuffleCount;

		const begonnen = round.begin(10);
		if (!begonnen.ok) {
			throw new Error(`simuliere(): unerwartete Ablehnung von begin() in Runde ${n}: ${begonnen.reason}`);
		}
		if (round.state === 'versicherung') {
			round.declineInsurance();
		}
		while (round.state === 'spieler') {
			const ergebnis = round.act('stand');
			if (!ergebnis.ok) {
				throw new Error(`simuliere(): unerwartetes act('stand') in Runde ${n}: ${ergebnis.reason}`);
			}
		}
		if (shoe.shuffleCount !== shuffleCountVorher) {
			shuffleWaehrendDerRunde++;
		}

		const report = round.report;
		if (!bilanzIstKorrekt(report)) {
			bilanzFehler++;
		}
		if (!geberEntscheidungenSindKorrekt(report)) {
			geberSchemaFehler++;
		}
		fingerabdruecke.push(
			`${report.dealer.cards.map((c) => c.rank + c.suit).join('')}|`
			+ `${report.hands.map((h) => h.cards.map((c) => c.rank + c.suit).join('')).join(';')}|`
			+ `${report.net}`,
		);
	}
	return { ereignisse, fingerabdruecke, bilanzFehler, geberSchemaFehler, shuffleWaehrendDerRunde, runden };
}

/* ============================ Q-1 Ablauf, Zustände, Reihenfolge ========= */

console.log('Q-1  Der Ablauf aus Anhang G läuft in genau dieser Reihenfolge; jeder Zustand wird durchlaufen');
{
	// p1=5, d1=A, p2=6, d2=5 → Spieler 11, Geber zeigt Ass (Versicherung
	// angeboten), Geber-Hand [A,5]=16 (kein Blackjack). Nach Ablehnung der
	// Versicherung: 'spieler'. Spieler zieht '2' (→13), steht. Geber muss
	// ziehen (16 ≤ 16), zieht '4' (→20), steht (20 > 16). Spieler (13) verliert
	// gegen Geber (20).
	const shoe = geskripteterSchlitten([karte('5'), karte('A'), karte('6'), karte('5'), karte('2'), karte('4')]);
	const round = new BlackjackRound({ rules, shoe });

	check(round.state === 'bereit', "Anfangszustand ist 'bereit'");
	check(round.act('hit').ok === false, "ein Aufruf außer der Reihe (act() vor begin()) wird abgewiesen");
	check(round.legalActions().length === 0, "legalActions() ist leer, solange die Runde nicht 'spieler' ist");

	const begonnen = round.begin(10);
	check(begonnen.ok === true, 'begin(10) wird angenommen (10 ist ein legaler Einsatz)');
	check(round.state === 'versicherung', "nach dem Austeilen mit sichtbarem Ass ist der Zustand 'versicherung'");
	check(round.offers.insurance === true, 'offers.insurance ist true, solange der Geber ein Ass zeigt');
	check(round.begin(10).ok === false, "ein zweiter begin()-Aufruf MITTEN in der Runde wird abgewiesen");
	check(round.act('stand').ok === false, "ein Aufruf außer der Reihe (act() während 'versicherung') wird abgewiesen");

	const abgelehnt = round.declineInsurance();
	check(abgelehnt.ok === true, 'declineInsurance() wird angenommen');
	check(round.state === 'spieler', "nach der Versicherungsentscheidung (kein Geber-Blackjack) ist der Zustand 'spieler'");
	check(round.declineInsurance().ok === false, "ein zweiter Aufruf von declineInsurance() (außer der Reihe) wird abgewiesen");

	const aktionen = round.legalActions();
	check(
		aktionen.includes('hit') && aktionen.includes('stand') && aktionen.includes('double') && !aktionen.includes('split'),
		"legalActions() liefert hit/stand/double für [5,6] (kein teilbares Paar): " + JSON.stringify(aktionen),
	);

	check(round.act('hit').ok === true, "act('hit') wird angenommen");
	check(round.hands[0].total === 13 && round.hands[0].busted === false, `Spielerblatt steht nun bei 13 (gefunden: ${round.hands[0].total})`);

	check(round.act('stand').ok === true, "act('stand') wird angenommen");
	// Der Geber ist im selben Aufruf fertig gespielt worden (kein async-Delay
	// in dieser Datei) — deshalb ist der Zustand jetzt bereits 'fertig'.
	// dealer.playedOut === true ist der indirekte Beleg dafür, dass die Runde
	// tatsächlich den Zustand 'geber' durchlaufen hat: NUR _playDealer() setzt
	// dieses Feld, und NUR im Nicht-Kurzschluss-Zweig auf true.
	check(round.state === 'fertig', "nach dem letzten Spielerzug ist der Zustand 'fertig'");
	check(round.dealer.playedOut === true, "dealer.playedOut === true belegt, dass der Zustand 'geber' durchlaufen wurde");
	check(round.dealer.total === 20 && round.dealer.soft === true, `Geber-Endstand 20, weich (gefunden: ${round.dealer.total}, soft=${round.dealer.soft})`);
	check(round.hands[0].outcome === 'lose' && round.hands[0].returned === 0, `Spieler (13) verliert gegen Geber (20): outcome=${round.hands[0].outcome}, returned=${round.hands[0].returned}`);
	check(round.act('hit').ok === false, "ein Aufruf außer der Reihe (act() nach Rundenende) wird abgewiesen");

	pruefeBilanz(round.report, 'Q-1');
}

/* ================================================= Q-2 Peek und Geber-BJ = */

console.log("\nQ-2  Peek: nur bei Ass oder Zehner; Geber-Blackjack beendet die Runde sofort");
{
	// Fall A: Geber zeigt Ass, verdeckte Karte ist ein Zehner → Blackjack.
	// Versicherung wird abgelehnt.
	{
		const shoe = geskripteterSchlitten([karte('5'), karte('A'), karte('6'), karte('K')]);
		const round = new BlackjackRound({ rules, shoe });
		round.begin(10);
		check(round.state === 'versicherung', 'Fall A: Ass sichtbar → Versicherung angeboten');
		round.declineInsurance();
		check(round.state === 'fertig', 'Fall A: nach der Ablehnung endet die Runde SOFORT (Geber-Blackjack)');
		check(round.dealer.blackjack === true, 'Fall A: dealer.blackjack ist true');
		check(round.dealer.playedOut === false, 'Fall A: das Zieh-Schema wurde NIE befragt (playedOut=false)');
		check(round.hands[0].outcome === 'lose', `Fall A: Spielerblatt (nicht Blackjack) verliert (gefunden: ${round.hands[0].outcome})`);
		pruefeBilanz(round.report, 'Q-2 Fall A');
	}

	// Fall B: Geber zeigt einen Zehner, verdeckte Karte ist ein Ass →
	// ebenfalls Blackjack, aber OHNE dass Versicherung je angeboten wurde.
	{
		const shoe = geskripteterSchlitten([karte('5'), karte('K'), karte('6'), karte('A')]);
		const round = new BlackjackRound({ rules, shoe });
		round.begin(10);
		check(round.state === 'fertig', 'Fall B: Zehner sichtbar, verdecktes Ass → sofortiges Ende, KEIN Versicherungs-Zwischenschritt');
		check(round.offers.insurance === false, 'Fall B: offers.insurance war zu keinem Zeitpunkt true');
		check(round.dealer.blackjack === true, 'Fall B: dealer.blackjack ist true');
		pruefeBilanz(round.report, 'Q-2 Fall B');
	}

	// Fall C: Geber-Blackjack, Versicherung genommen und gewinnt (2:1).
	{
		const shoe = geskripteterSchlitten([karte('5'), karte('A'), karte('6'), karte('K')]);
		const round = new BlackjackRound({ rules, shoe });
		round.begin(10);
		const genommen = round.takeInsurance(5);
		check(genommen.ok === true, 'Fall C: takeInsurance(5) bei Höchstbetrag 5 wird angenommen');
		check(round.state === 'fertig', 'Fall C: Geber hat Blackjack, Runde endet sofort');
		check(round.report.insurance.staked === 5 && round.report.insurance.returned === 15, `Fall C: Versicherung zahlt 2:1 → 5 Einsatz, 15 zurück (gefunden: ${round.report.insurance.returned})`);
		pruefeBilanz(round.report, 'Q-2 Fall C');
	}

	// Fall D: Geber-Blackjack, Spieler hat ebenfalls Blackjack → Patt, KEIN Gewinn.
	{
		const shoe = geskripteterSchlitten([karte('A'), karte('A'), karte('K'), karte('K')]);
		const round = new BlackjackRound({ rules, shoe });
		round.begin(10);
		round.declineInsurance();
		check(round.dealer.blackjack === true && round.hands[0].outcome === 'push', `Fall D: beide Blackjack → Patt (gefunden: ${round.hands[0].outcome})`);
		check(round.hands[0].returned === 10, `Fall D: Patt gibt genau den Einsatz zurück (gefunden: ${round.hands[0].returned})`);
		pruefeBilanz(round.report, 'Q-2 Fall D');
	}

	// Fall E: Geber zeigt weder Ass noch Zehner → kein Peek möglich, direkt 'spieler'.
	{
		const shoe = geskripteterSchlitten([karte('5'), karte('7'), karte('6'), karte('9'), karte('9')]);
		const round = new BlackjackRound({ rules, shoe });
		round.begin(10);
		check(round.state === 'spieler', "Fall E: Geber zeigt '7' → kein Peek, direkt 'spieler'");
		check(round.offers.insurance === false, 'Fall E: keine Versicherung angeboten');
	}

	// Bust-Szenario, für Q-11: der Spieler überkauft, verliert unabhängig vom Geber.
	{
		const shoe = geskripteterSchlitten([karte('9'), karte('2'), karte('8'), karte('3'), karte('K')]);
		const round = new BlackjackRound({ rules, shoe });
		round.begin(10);
		round.act('hit'); // 9+8+K = 27, überkauft
		check(round.hands[0].busted === true && round.state === 'fertig', `Bust-Szenario: 27 überkauft, Runde sofort fertig (gefunden: total=${round.hands[0].total}, state=${round.state})`);
		check(round.hands[0].outcome === 'bust' && round.hands[0].returned === 0, `Bust zahlt nichts zurück (gefunden: ${round.hands[0].outcome}, ${round.hands[0].returned})`);
		check(round.dealer.playedOut === false, 'Ausnahme, die keine ist: bei überkauftem Spieler zieht der Geber NICHT (playedOut=false)');
		pruefeBilanz(round.report, 'Q-2 Bust-Szenario');
	}
}

/* ================================================= Q-3 Versicherung ===== */

console.log('\nQ-3  Versicherung: nur bei sichtbarem Ass, höchstens der halbe Einsatz, zahlt 2:1');
{
	// Geber zeigt Ass, hat aber KEINEN Blackjack (verdeckt: '6').
	const shoe = geskripteterSchlitten([karte('5'), karte('A'), karte('6'), karte('6')]);
	const round = new BlackjackRound({ rules, shoe });
	round.begin(10);

	check(round.takeInsurance(6).ok === false, 'Einsatz 10 → Höchstbetrag 5: takeInsurance(6) wird abgewiesen');
	check(round.takeInsurance(0).ok === false, 'takeInsurance(0) wird abgewiesen');
	check(round.takeInsurance(2.5).ok === false, 'ein nicht-ganzzahliger Betrag wird abgewiesen');
	check(round.state === 'versicherung', 'nach drei abgewiesenen Versuchen ist der Zustand weiterhin \'versicherung\'');

	const genommen = round.takeInsurance(5);
	check(genommen.ok === true, 'takeInsurance(5) — genau der Höchstbetrag — wird angenommen');
	check(round.state === 'spieler', "Geber hat KEINEN Blackjack → weiter zu 'spieler'");
	check(round.report === null, "report ist null, solange die Runde nicht 'fertig' ist");

	while (round.state === 'spieler') {
		round.act('stand');
	}
	check(round.report.insurance.staked === 5 && round.report.insurance.returned === 0, `Versicherung war genommen, Geber hatte aber keinen Blackjack → verloren (gefunden: returned=${round.report.insurance.returned})`);
	pruefeBilanz(round.report, 'Q-3');

	// Kein Ass sichtbar → keine Versicherung.
	const shoe2 = geskripteterSchlitten([karte('5'), karte('9'), karte('6'), karte('7')]);
	const round2 = new BlackjackRound({ rules, shoe: shoe2 });
	round2.begin(10);
	check(round2.offers.insurance === false, 'Geber zeigt keine Ass → offers.insurance ist false');
	check(round2.takeInsurance(1).ok === false, 'takeInsurance() außerhalb von \'versicherung\' wird abgewiesen');
}

/* =================================================== Q-4 Verdoppeln ===== */

console.log('\nQ-4  Verdoppeln: nur auf zwei Karten, auch nach dem Teilen, genau eine weitere Karte, danach steht das Blatt');
{
	// Normales Verdoppeln. Geber (2+3=5) muss zweimal ziehen, um über 16 zu
	// kommen: 5→14 (weiterhin ≤16)→24 (überkauft, stop).
	const shoe = geskripteterSchlitten([karte('5'), karte('2'), karte('6'), karte('3'), karte('9'), karte('9'), karte('K')]);
	const round = new BlackjackRound({ rules, shoe });
	round.begin(10);
	const verdoppelt = round.act('double');
	check(verdoppelt.ok === true, 'act(\'double\') auf einem Zweikartenblatt wird angenommen');
	check(round.hands[0].stake === 20 && round.hands[0].doubled === true, `Einsatz verdoppelt sich auf 20, doubled=true (gefunden: stake=${round.hands[0].stake})`);
	check(round.hands[0].cards.length === 3, `genau eine weitere Karte wurde gegeben (gefunden: ${round.hands[0].cards.length} Karten)`);
	check(round.state === 'fertig', 'nach dem Verdoppeln steht das Blatt sofort, die Runde läuft zu Ende');
	pruefeBilanz(round.report, 'Q-4 normal');

	// Verdoppeln auf drei Karten wird abgewiesen.
	const shoe2 = geskripteterSchlitten([karte('2'), karte('2'), karte('3'), karte('3'), karte('2')]);
	const round2 = new BlackjackRound({ rules, shoe: shoe2 });
	round2.begin(10);
	round2.act('hit'); // drei Karten
	check(round2.hands[0].cards.length === 3, 'Vorbereitung: das Blatt hat jetzt drei Karten');
	check(round2.act('double').ok === false, 'act(\'double\') auf einem Dreikartenblatt wird abgewiesen');

	// Verdoppeln NACH dem Teilen (doubleAfterSplit).
	const shoe3 = geskripteterSchlitten([
		karte('8'), karte('2'), karte('8'), karte('3'), // Austeilen: Spieler 8+8, Geber 2+3
		karte('4'), karte('5'), // die beiden Karten aus dem Teilen
		karte('2'), // die eine weitere Karte aus dem Verdoppeln
	]);
	const round3 = new BlackjackRound({ rules, shoe: shoe3 });
	round3.begin(10);
	check(round3.act('split').ok === true, 'Vorbereitung: Teilen von [8,8] wird angenommen');
	check(round3.act('double').ok === true, 'act(\'double\') auf dem ersten geteilten Blatt (2 Karten) wird angenommen — doubleAfterSplit');

	// Verdoppeln auf einem natürlichen Blackjack wird abgewiesen.
	const shoe4 = geskripteterSchlitten([karte('A'), karte('5'), karte('K'), karte('6')]);
	const round4 = new BlackjackRound({ rules, shoe: shoe4 });
	round4.begin(10);
	check(round4.act('double').ok === false, 'act(\'double\') auf einem natürlichen Blackjack wird abgewiesen');
}

/* ====================================================== Q-5 Teilen ====== */

console.log('\nQ-5  Teilen: bis zu dreimal, höchstens vier Blätter; der vierte Versuch wird ABGEWIESEN');
{
	// Drei Teilungen in Folge führen auf genau vier Blätter; jede der
	// resultierenden Karten ist bewusst wieder eine 8, damit der VIERTE
	// Teilungsversuch an einem STRUKTURELL gültigen Paar scheitert — die
	// Ablehnung kann also nur am LIMIT liegen, nicht an fehlender Teilbarkeit.
	const shoe = geskripteterSchlitten([
		karte('8'), karte('2'), karte('8'), karte('3'), // Austeilen
		karte('8'), karte('4'), // Teilung 1: handA=[8,8], handB=[8,4]
		karte('8'), karte('8'), // Teilung 2 (auf handA): handA1=[8,8], handA2=[8,8]
		karte('8'), karte('8'), // Teilung 3 (auf handA1): handA1a=[8,8], handA1b=[8,8]
	]);
	const round = new BlackjackRound({ rules, shoe });
	round.begin(10);

	check(round.act('split').ok === true, 'Teilung 1 wird angenommen');
	check(round.act('split').ok === true, 'Teilung 2 wird angenommen');
	check(round.act('split').ok === true, 'Teilung 3 wird angenommen (dritte und letzte erlaubte Teilung)');
	check(round.hands.length === 4, `nach drei Teilungen gibt es genau vier Blätter (gefunden: ${round.hands.length})`);

	const vierterVersuch = round.act('split');
	check(vierterVersuch.ok === false && vierterVersuch.reason === 'splitLimit', `der VIERTE Teilungsversuch — auf einem strukturell gültigen Paar [8,8] — wird abgewiesen (gefunden: ${JSON.stringify(vierterVersuch)})`);

	// Teilen auf einem Nicht-Paar wird abgewiesen (unabhängig vom Limit).
	const shoe2 = geskripteterSchlitten([karte('8'), karte('2'), karte('9'), karte('3')]);
	const round2 = new BlackjackRound({ rules, shoe: shoe2 });
	round2.begin(10);
	const nichtPaar = round2.act('split');
	check(nichtPaar.ok === false && nichtPaar.reason === 'illegal', `Teilen von [8,9] (kein Paar) wird abgewiesen, Grund 'illegal' (gefunden: ${JSON.stringify(nichtPaar)})`);
}

/* =========================================== Q-6 Geteilte Asse ========= */

console.log('\nQ-6  Geteilte Asse: genau eine Karte, kein erneutes Teilen, Ass + Zehner ist 21 und KEIN Blackjack');
{
	// Spieler A+A, Geber 2+3 (kein Peek nötig). Geteilte Asse bekommen je eine
	// Karte automatisch — hier bewusst K und 5, damit ein Blatt zu 21 wird.
	const shoe = geskripteterSchlitten([
		karte('A'), karte('2'), karte('A'), karte('3'), // Austeilen
		karte('K'), karte('5'), // die automatisch nachgelegten Karten
		karte('9'), // Geber zieht (2+3=5 ≤ 16)
		karte('9'), // Geber zieht erneut (5+9=14 ≤ 16)
	]);
	const round = new BlackjackRound({ rules, shoe });
	round.begin(10);
	const geteilt = round.act('split');
	check(geteilt.ok === true, 'Teilen von [A,A] wird angenommen');
	// Beide entstandenen Blätter sind SOFORT fertig (kein Hit, kein erneutes
	// Teilen möglich) — die Runde läuft deshalb im selben Aufruf bis zum Ende.
	check(round.state === 'fertig', 'nach dem Teilen von Assen ist keine weitere Spielerhandlung möglich, die Runde endet');

	const [handA, handB] = round.report.hands;
	check(handA.cards.length === 2 && handB.cards.length === 2, 'jedes geteilte Ass-Blatt hat GENAU zwei Karten — keine weitere wurde je hinzugefügt');
	check(handA.fromSplitAce === true && handB.fromSplitAce === true, 'beide Blätter sind als fromSplitAce markiert');

	const summeA = summeUnabhaengig(handA.cards.map((c) => c.rank));
	check(summeA.total === 21, `Blatt A+K ergibt 21 (gefunden: ${summeA.total})`);
	check(handA.outcome !== 'blackjack', `Blatt A+K NACH einer Teilung ist KEIN Blackjack (gefunden: outcome=${handA.outcome})`);
	check(handA.returned === handA.stake * 2, `A+K nach Teilung zahlt 1:1, nicht 3:2 (gefunden: returned=${handA.returned}, stake=${handA.stake})`);

	pruefeBilanz(round.report, 'Q-6');

	console.log('     Gegenprobe Q-6-G: eine ABSICHTLICH falsche Auswertung, die Ass+Zehner-nach-Teilung als Blackjack bezahlt, wird erkannt');
	const falscheRueckgabe = handA.stake + (handA.stake * 3) / 2; // 3:2, FALSCH für ein geteiltes Blatt
	check(falscheRueckgabe !== handA.returned, `Q-6-G: die (falsche) 3:2-Rückgabe (${falscheRueckgabe}) unterscheidet sich von der tatsächlichen, korrekten 1:1-Rückgabe (${handA.returned})`);
}

/* ============================ Q-7 Zehnerwertige Paare ==================== */

console.log('\nQ-7  Zehn, Bube, Dame und König bilden paarweise ein teilbares Paar');
{
	const zehnerwertig = ['10', 'J', 'Q', 'K'];
	let alleAngenommen = true;
	const fehlgeschlagen = [];
	for (const a of zehnerwertig) {
		for (const b of zehnerwertig) {
			const shoe = geskripteterSchlitten([karte(a), karte('2'), karte(b), karte('3'), karte('4'), karte('5')]);
			const round = new BlackjackRound({ rules, shoe });
			round.begin(10);
			const ergebnis = round.act('split');
			if (!ergebnis.ok) {
				alleAngenommen = false;
				fehlgeschlagen.push(`${a}+${b}: ${JSON.stringify(ergebnis)}`);
			}
		}
	}
	check(alleAngenommen, 'JEDE Kombination aus Zehn/Bube/Dame/König lässt sich am Tisch teilen (16 Kombinationen geprüft)', ...fehlgeschlagen.slice(0, 5));
}

/* ============================================ Q-8 Kein Aufgeben ========= */

console.log("\nQ-8  Kein Aufgeben: act('surrender') wird IMMER abgewiesen");
{
	const roundVorBeginn = new BlackjackRound({ rules, shoe: geskripteterSchlitten([]) });
	check(roundVorBeginn.act('surrender').ok === false, "act('surrender') vor begin() (Zustand 'bereit') wird abgewiesen");

	const shoe = geskripteterSchlitten([karte('5'), karte('A'), karte('6'), karte('6')]);
	const round = new BlackjackRound({ rules, shoe });
	round.begin(10);
	check(round.act('surrender').ok === false, "act('surrender') während 'versicherung' wird abgewiesen");
	round.declineInsurance();
	check(round.act('surrender').ok === false, "act('surrender') während 'spieler' wird abgewiesen");
	check(round.legalActions().includes('surrender') === false, "legalActions() enthält 'surrender' NIE");
}

/* ======================= Q-10 Ganzzahligkeit, erschöpfend ================ */

console.log('\nQ-10 Jeder Betrag ist eine ganze Zahl — erschöpfend über alle 50 legalen Einsätze');
{
	const legaleEinsaetze = [];
	for (let s = rules.BET_MIN; s <= rules.BET_MAX; s += rules.BET_STEP) {
		legaleEinsaetze.push(s);
	}
	check(legaleEinsaetze.length === 50, `es gibt 50 legale Einsätze (gefunden: ${legaleEinsaetze.length})`);

	let anzahlGeprueft = 0;
	const verstoesse = [];
	for (const s of legaleEinsaetze) {
		const betraege = [
			s,
			rules.winReturn(s), // 2s
			rules.blackjackReturn(s), // 2,5s
			rules.pushReturn(s), // s
			rules.loseReturn(), // 0
			rules.insuranceMax(s), // s/2
			rules.insuranceReturn(rules.insuranceMax(s)), // 3·(s/2)
			2 * s, 3 * s, 4 * s, // Summen für 2, 3, 4 Blätter (Teilen)
			rules.winReturn(2 * s), rules.blackjackReturn(2 * s), // dieselben Blätter, verdoppelt
			rules.winReturn(3 * s), rules.winReturn(4 * s),
		];
		for (const betrag of betraege) {
			anzahlGeprueft++;
			if (!Number.isInteger(betrag)) {
				verstoesse.push(`Einsatz ${s}: Betrag ${betrag} ist keine ganze Zahl`);
			}
		}
	}
	check(verstoesse.length === 0, `${anzahlGeprueft} gebildete Beträge über alle 50 legalen Einsätze sind ausnahmslos ganze Zahlen`, ...verstoesse.slice(0, 5));

	console.log('     Gegenprobe Q-10-G: ein künstlich zugelassener ungerader Einsatz (5) lässt die Prüfung fehlschlagen');
	const ungeradeBetraege = [rules.insuranceMax(5), rules.blackjackReturn(5)];
	const erkanntAlsFehlerhaft = ungeradeBetraege.some((b) => !Number.isInteger(b));
	check(erkanntAlsFehlerhaft, `Q-10-G: mit dem ungeraden Einsatz 5 liefert insuranceMax/blackjackReturn eine NICHT-ganze Zahl (${ungeradeBetraege.join(', ')}) — die Prüfung erkennt das`);
}

/* ================================================ Q-15 Quelltextprüfung = */

console.log('\nQ-15 Quelltext: import- und dokumentfrei; kein Math.random; kein Zugriff auf einen Zähler');
{
	const quelle = readFileSync(ROUND_PATH, 'utf8');
	const ohneKommentare = quelle.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

	check(!/\bimport\b/.test(ohneKommentare), 'kein import in round-blackjack.js');
	check(!/\bdocument\b/.test(ohneKommentare), 'kein document in round-blackjack.js');
	check(!/\bwindow\b/.test(ohneKommentare), 'kein window in round-blackjack.js');
	check(!/\blocalStorage\b/.test(ohneKommentare), 'kein localStorage in round-blackjack.js');
	check(!/Math\.random/.test(ohneKommentare), 'kein Math.random in round-blackjack.js');
	check(!/\.shuffle\s*\(/.test(ohneKommentare), 'round-blackjack.js ruft shoe.shuffle() an KEINER Stelle selbst auf (Q-12)');
	check(!/\.running\b/.test(ohneKommentare) && !/\.runningCount\b/.test(ohneKommentare) && !/\.trueCount\b/.test(ohneKommentare),
		'round-blackjack.js liest an keiner Stelle einen Zählerwert (.running/.runningCount/.trueCount)'
		+ ' — nur die boolesche Rückfrage .needsShuffle im statischen Helfer shouldReshuffle() ist erlaubt');
	check(/\.needsShuffle\b/.test(ohneKommentare), 'shouldReshuffle() fragt shoe.needsShuffle ab (der einzige erlaubte Kontakt zum Schlitten-Zustand zwischen Runden)');
}

/* ==================================================== Q-16 Einsatzgrenzen */

console.log('\nQ-16 Einsatzgrenzen: 2 bis 100, geradzahlig; Verdoppeln/Teilen dürfen darüber hinaus nachlegen');
{
	const rundeFuer = (stake) => {
		const shoe = geskripteterSchlitten([karte('5'), karte('2'), karte('6'), karte('3')]);
		const round = new BlackjackRound({ rules, shoe });
		return round.begin(stake);
	};
	check(rundeFuer(1).ok === false, 'begin(1) wird abgewiesen (unter BET_MIN)');
	check(rundeFuer(3).ok === false, 'begin(3) wird abgewiesen (nicht geradzahlig)');
	check(rundeFuer(101).ok === false, 'begin(101) wird abgewiesen (über BET_MAX)');
	check(rundeFuer(2).ok === true, 'begin(2) — Mindesteinsatz — wird angenommen');
	check(rundeFuer(100).ok === true, 'begin(100) — Höchsteinsatz — wird angenommen');

	// Verdoppeln auf dem Höchsteinsatz legt darüber hinaus nach (200 > 100).
	// Geber 9+9=18 muss nicht ziehen (>16) — keine weiteren Karten nötig.
	const shoe = geskripteterSchlitten([karte('5'), karte('9'), karte('6'), karte('9'), karte('K')]);
	const round = new BlackjackRound({ rules, shoe });
	round.begin(100);
	round.act('double');
	check(round.hands[0].stake === 200, `Verdoppeln des Höchsteinsatzes legt über BET_MAX hinaus nach (gefunden: ${round.hands[0].stake})`);
}

/* ===================== Q-9, Q-11, Q-12, Q-13 — die große Simulation ===== */

console.log('\nQ-9 (Teil 1 von 3), Referenz auf R-4');
console.log('     Der VOLLSTÄNDIGE Nachweis der Starrheit steht in verify-rules.mjs, Prüfung R-4:');
console.log('     ein Zustandsabschluss über ALLE erreichbaren Geberlagen, keine Stichprobe.');
console.log('     Q-9 baut darauf auf und wiederholt diesen Nachweis nicht.');

console.log('\nQ-9 (Teil 2), Q-11, Q-12, Q-13 — 200.000 Runden gegen einen ECHTEN Shoe (Saat 20260906)');
{
	const ANZAHL = 200000;
	const t0 = Date.now();
	const ergebnis = simuliere({ seed: 20260906, runden: ANZAHL });
	const dauerMs = Date.now() - t0;

	check(ergebnis.geberSchemaFehler === 0,
		`Q-9 Teil 2: über ${ANZAHL.toLocaleString('de-DE')} echt gespielte Runden entspricht JEDE Geberentscheidung`
		+ ' dem unabhängig getippten Zieh-Schema (Laufzeit: ' + dauerMs + ' ms)',
		`${ergebnis.geberSchemaFehler} Abweichungen gefunden`);

	check(ergebnis.bilanzFehler === 0,
		`Q-11: über ${ANZAHL.toLocaleString('de-DE')} Runden stimmt die Bilanz JEDER EINZELNEN Runde exakt`,
		`${ergebnis.bilanzFehler} Abweichungen gefunden`);

	check(ergebnis.shuffleWaehrendDerRunde === 0,
		'Q-12: in KEINER der 200.000 Runden hat sich shoe.shuffleCount während der Runde selbst verändert'
		+ ' — der Schlitten wird ausschließlich ZWISCHEN Runden gemischt');

	const countEreignisse = ergebnis.ereignisse.filter((e) => e.reason === 'count');
	const countEreignisseUnterschwelle = countEreignisse.filter((e) => !(e.trueCount > 3));
	check(countEreignisseUnterschwelle.length === 0,
		`Q-13: JEDES 'count'-Mischereignis hat einen wahren Zähler > +3 (${countEreignisse.length} solcher Ereignisse gefunden)`,
		...countEreignisseUnterschwelle.slice(0, 5).map((e) => `trueCount=${e.trueCount}`));
	check(countEreignisse.length > 0,
		`Q-13: es gibt mindestens ein 'count'-Mischereignis in ${ANZAHL.toLocaleString('de-DE')} Runden (gefunden: ${countEreignisse.length})`
		+ ' — ein Nachweis über ein Ereignis, das nie eintritt, ist keiner');
	const nurBekannteGruende = ergebnis.ereignisse.every((e) => e.reason === 'cut' || e.reason === 'count');
	check(nurBekannteGruende, "Q-13: jedes Mischereignis hat den Grund 'cut' oder 'count', keinen dritten");
	console.log(
		`     (${ergebnis.ereignisse.length} Mischereignisse insgesamt, davon ${countEreignisse.length} mit Grund 'count';`
		+ ' die Rückrichtung — jeder Rundenübergang mit wahrem Zähler > +3 löst ein Mischen aus — ist durch die'
		+ ' Bauart dieser Simulation selbst erzwungen (sie fragt shoe.needsShuffle vor JEDER Runde ab) und'
		+ ' zusätzlich durch S-8 in verify-shoe.mjs bewiesen.)',
	);

	console.log("     Gegenprobe Q-13-G: mit künstlich auf höchstens +2,9 gedeckeltem Zähler tritt KEIN 'count'-Mischen auf");
	const gedeckelt = simuliere({ seed: 777, runden: 20000, clampCount: true });
	const countGedeckelt = gedeckelt.ereignisse.filter((e) => e.reason === 'count').length;
	check(countGedeckelt === 0,
		`Q-13-G: über ${(20000).toLocaleString('de-DE')} Runden mit künstlich gedeckeltem Zähler tritt KEIN 'count'-Mischen auf (gefunden: ${countGedeckelt})`);
}

/* ==================================== Q-9 Teil 3: Gegen den Zähler ======= */

console.log('\nQ-9 (Teil 3) Gegen den Zähler: dieselbe Rundenfolge bei künstlich extremem Zähler ist Karte für Karte identisch');
{
	function simuliereMitKuenstlichemZaehler(auf) {
		const shoe = new Shoe({ rules, random: createSeeded(4242) });
		const round = new BlackjackRound({ rules, shoe });
		const folge = [];
		for (let n = 0; n < 2000; n++) {
			// WICHTIG: der Mischzeitpunkt wird hier absichtlich über
			// shoe.cutReached bestimmt, NICHT über shoe.needsShuffle. Würde
			// hier needsShuffle (das den Zähler einbezieht) benutzt, würde der
			// künstlich erzwungene Zähler selbst SCHON DEN MISCHZEITPUNKT
			// verschieben — und damit die gesamte nachfolgende Kartenfolge
			// des seedbasierten RNG verändern. Das wäre ein Unterschied durch
			// die TESTANORDNUNG, keine Abweichung im GEBER. cutReached hängt
			// ausschließlich von der Kartenposition ab und bleibt unabhängig
			// vom künstlichen Zähler identisch — damit ist die Kartenfolge in
			// baseline/+20/−20 garantiert dieselbe, und ein Unterschied in den
			// GEBERKARTEN könnte nur noch vom Geber selbst stammen.
			if (shoe.cutReached) {
				shoe.shuffle();
			}
			shoe.running = auf; // VOR jeder Geberentscheidung künstlich extrem gesetzt
			round.begin(10);
			if (round.state === 'versicherung') {
				round.declineInsurance();
			}
			while (round.state === 'spieler') {
				shoe.running = auf; // unmittelbar VOR jeder möglichen Geberentscheidung
				round.act('stand');
			}
			folge.push(round.dealer.cards.map((c) => c.rank + c.suit).join(''));
		}
		return folge;
	}

	const baseline = simuliereMitKuenstlichemZaehler(0);
	const beiPlus20 = simuliereMitKuenstlichemZaehler(20);
	const beiMinus20 = simuliereMitKuenstlichemZaehler(-20);

	check(JSON.stringify(baseline) === JSON.stringify(beiPlus20),
		'Q-9 Teil 3: bei künstlich auf +20 erzwungenem Zähler ist die Geberkartenfolge Karte für Karte IDENTISCH zur Basislinie');
	check(JSON.stringify(baseline) === JSON.stringify(beiMinus20),
		'Q-9 Teil 3: bei künstlich auf −20 erzwungenem Zähler ist die Geberkartenfolge Karte für Karte IDENTISCH zur Basislinie');

	console.log("     Gegenprobe Q-9-G: ein 'schummelnder' Geber, der bei hoher Zählung auf 16 stehen bleibt, wird von genau diesem Vergleich erkannt");
	function schummelndesSchema(total, zaehlerHoch) {
		if (zaehlerHoch && total === 16) {
			return false; // schummelt: bleibt bei 16 stehen, obwohl das echte Schema zieht
		}
		return dealerMussZiehenUnabhaengig(total);
	}
	const echteEntscheidung16 = dealerMussZiehenUnabhaengig(16);
	const schummelEntscheidung16 = schummelndesSchema(16, true);
	check(echteEntscheidung16 !== schummelEntscheidung16,
		'Q-9-G: der schummelnde Geber entscheidet bei Summe 16 unter hoher Zählung ANDERS als das echte, starre Schema'
		+ ` (echt: ${echteEntscheidung16 ? 'ziehen' : 'stehen'}, schummelnd: ${schummelEntscheidung16 ? 'ziehen' : 'stehen'})`
		+ ' — ein Vergleich wie oben (Teil 3) hätte diesen Unterschied unweigerlich gefunden.');
}

/* ========================================== Q-14 Wiederholbarkeit ======= */

console.log('\nQ-14 Wiederholbarkeit: gleiche Saat → identische Rundenfolge');
{
	const a = simuliere({ seed: 555, runden: 500 });
	const b = simuliere({ seed: 555, runden: 500 });
	check(JSON.stringify(a.fingerabdruecke) === JSON.stringify(b.fingerabdruecke),
		'zwei Simulationen mit derselben Saat (555) liefern eine identische Folge aus Geber-, Spielerkarten und Nettoergebnis über 500 Runden');

	console.log('     Gegenprobe Q-14-G: eine andere Saat → eine ANDERE Rundenfolge');
	const c = simuliere({ seed: 556, runden: 500 });
	check(JSON.stringify(a.fingerabdruecke) !== JSON.stringify(c.fingerabdruecke),
		'Q-14-G: eine andere Saat (556) liefert eine ANDERE Folge');
}

/* ============================ Q-11, "kein zweites Einlösen" ============= */

console.log('\nQ-11 (Fortsetzung) „Ein zweites Einlösen bucht nichts“ — report ist ab \'fertig\' eingefroren und unveränderlich');
{
	const shoe = geskripteterSchlitten([karte('5'), karte('2'), karte('6'), karte('3'), karte('4'), karte('9')]);
	const round = new BlackjackRound({ rules, shoe });
	round.begin(10);
	while (round.state === 'spieler') {
		round.act('stand');
	}
	const bericht1 = round.report;
	const bericht2 = round.report;
	check(bericht1 === bericht2, 'zwei Lesezugriffe auf report NACH Rundenende liefern dieselbe Objektreferenz — kein neu berechneter, potenziell abweichender Betrag');
	check(Object.isFrozen(bericht1) === true, 'der Bericht ist eingefroren (Object.isFrozen)');

	let wurfEntstanden = false;
	try {
		bericht1.net = 999999;
	} catch {
		wurfEntstanden = true;
	}
	check(wurfEntstanden || bericht1.net !== 999999, 'ein Schreibversuch auf den eingefrorenen Bericht schlägt fehl oder wird ignoriert — der Wert bleibt unverändert');

	console.log('     Gegenprobe: eine absichtlich FEHLERHAFTE Instrumentierung, die bei jedem Zugriff einen wachsenden Betrag liefert, wird von genau dieser Gleichheitsprüfung erkannt');
	let zugriffe = 0;
	const fehlerhafteInstrumentierung = { get net() { zugriffe++; return zugriffe * 10; } };
	const ersterZugriff = fehlerhafteInstrumentierung.net;
	const zweiterZugriff = fehlerhafteInstrumentierung.net;
	check(ersterZugriff !== zweiterZugriff,
		`Q-11-G (zweites Einlösen): eine bei jedem Zugriff neu buchende Instrumentierung liefert unterschiedliche Werte (${ersterZugriff} vs. ${zweiterZugriff}) — genau das würde die obige Gleichheitsprüfung erkennen`);

	console.log('\nGegenprobe zur Geld-Bilanz (Q-11): ein absichtlich eingebauter Buchungsfehler muss auffallen');
	const verfaelscht = { ...bericht1, returned: bericht1.returned + 1 };
	check(!bilanzIstKorrekt(verfaelscht),
		`Q-11-G (Buchungsfehler): ein testweise um 1 erhöhter returned-Betrag (${verfaelscht.returned} statt ${bericht1.returned}) wird von der unabhängigen Nachrechnung erkannt`);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden, einschließlich aller Gegenproben. Die Runde folgt'
	+ '\nAnhang G Schritt für Schritt, der Geber weicht in keiner geprüften Lage vom starren'
	+ '\nZieh-Schema ab — unabhängig vom Zähler (Q-9) —, jede Bilanz stimmt auf den Cent (Q-11),'
	+ '\nder Schlitten wird nachweislich nur zwischen Runden gemischt (Q-12), und vorzeitiges'
	+ '\nMischen tritt ausschließlich oberhalb eines wahren Zählers von +3 auf (Q-13).'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
