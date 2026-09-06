/**
 * Blackjack – Ausdruck des Regelwerks aus der einen Quelle
 * ===========================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Druckt Kartenwerte,
 * Hi-Lo-Marken, die vollständige Hausregeltabelle, das Zieh-Schema des
 * Gebers und die Einsätze/Auszahlungen aus — ausschließlich gelesen aus
 * Resources/Public/JavaScript/rules-blackjack.js, DER EINEN QUELLE. Dieses
 * Skript ist der Grund, warum die README keine einzige Regelzahl wiederholen
 * muss: wer die Regeln sehen will, ruft dieses Skript auf.
 *
 * Das Zieh-Schema wird nicht als abgeschriebener Text ausgegeben, sondern
 * als BERECHNETE Tabelle über alle erreichbaren Geberlagen — mit derselben
 * Zustandsabschluss-Methode, die verify-rules.mjs für Prüfung R-4 benutzt
 * (dort unabhängig gegengeprüft; hier dient sie nur der Anzeige).
 *
 * Aufruf (nur lesend, ändert keine Datei, prüft nichts — es zeigt):
 *
 *   ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/dump-rules.mjs
 *
 * Rückgabewert immer 0.
 */

import * as regeln from '../../Public/JavaScript/rules-blackjack.js';

/** Deutsche Zahlschreibweise: Komma als Dezimaltrennzeichen. */
function de(zahl, nachkommastellen = 0) {
	return zahl.toLocaleString('de-DE', {
		minimumFractionDigits: nachkommastellen,
		maximumFractionDigits: nachkommastellen,
	});
}

function ueberschrift(text) {
	console.log(`\n${text}`);
	console.log('-'.repeat(text.length));
}

console.log('Blackjack – Das Regelwerk aus rules-blackjack.js');
console.log('===================================================');
console.log('(Diese Ausgabe kommt AUSSCHLIESSLICH aus der einen Quelle. Es gibt keine');
console.log('zweite Abschrift dieser Zahlen im Projekt — Prüfung A-11 in verify-cabinet.mjs');
console.log('setzt das durch.)');

/* --------------------------------------------------------- Kartenwerte -- */

ueberschrift('Kartenwerte je Rang');
for (const rang of regeln.RANKS) {
	console.log(`  ${rang.padStart(2)}  →  ${de(regeln.cardValue(rang))}`);
}
console.log('  Ein Ass zählt 1 statt 11, sobald 11 das Blatt über 21 treiben würde');
console.log('  (dann heißt das Blatt „weich").');

/* ------------------------------------------------------------ Hi-Lo ----- */

ueberschrift('Hi-Lo-Marke je Rang (Zähler des Hauses, C.7.3)');
let summeUeberSchlitten = 0;
for (const rang of regeln.RANKS) {
	const marke = regeln.hiLoTag(rang);
	// 6 Decks × 4 Farben = 24 Karten je Rang im vollen Schlitten.
	summeUeberSchlitten += marke * 24;
	console.log(`  ${rang.padStart(2)}  →  ${marke > 0 ? '+' : ''}${marke}`);
}
console.log(`  Summe über den vollen Schlitten (${de(regeln.SHOE_SIZE)} Karten): ${de(summeUeberSchlitten)}`);
console.log(`  Vorzeitiges Mischen ausschließlich oberhalb eines wahren Zählers von +${de(regeln.TRUE_COUNT_SHUFFLE_UP)}.`);

/* ------------------------------------------------------- Hausregeln ----- */

ueberschrift('Hausregeltabelle (Anhang G)');
const zeilen = [
	['Decks', de(regeln.HOUSE.decks)],
	['Kartenzahl im Schlitten', de(regeln.SHOE_SIZE)],
	['Trennkarte', `bei ${de(regeln.HOUSE.penetration * 100, 0)} % Durchdringung, ab Karte ${de(regeln.CUT_INDEX)}`],
	['Geber auf weicher 17', regeln.HOUSE.standsOnSoft17 ? 'steht (S17)' : 'zieht (H17)'],
	['Verdeckte Karte', regeln.HOUSE.holeCard ? 'ja' : 'nein'],
	['Sofortige Prüfung auf Blackjack', regeln.HOUSE.peek ? 'ja' : 'nein'],
	['Blackjack zahlt', `${de(regeln.HOUSE.blackjackPays[0])}:${de(regeln.HOUSE.blackjackPays[1])}`],
	['Gewinnende Hand zahlt', `${de(regeln.HOUSE.winPays[0])}:${de(regeln.HOUSE.winPays[1])}`],
	['Gleichstand', regeln.HOUSE.pushReturnsStake ? 'Patt, Einsatz zurück' : 'Einsatz verloren'],
	['Verdoppeln', regeln.HOUSE.doubleOnAnyTwo ? 'auf jedes Blatt aus zwei Karten' : 'nicht erlaubt'],
	['Verdoppeln nach Teilen', regeln.HOUSE.doubleAfterSplit ? 'erlaubt' : 'nicht erlaubt'],
	['Teilen', `bis zu ${de(regeln.HOUSE.splitMax)}-mal, höchstens ${de(regeln.HOUSE.handsMax)} Blätter`],
	['Geteilte Asse', regeln.HOUSE.splitAcesOneCard ? 'genau eine Karte' : 'wie jedes andere Blatt'],
	['Erneutes Teilen von Assen', regeln.HOUSE.resplitAces ? 'erlaubt' : 'nicht erlaubt'],
	['Ass + Zehner nach Teilen', regeln.HOUSE.splitAceTenIsNotBlackjack ? '21, kein Blackjack (zahlt 1:1)' : 'Blackjack'],
	['Zehn und Bube', regeln.HOUSE.tenAndJackAreAPair ? 'gelten als teilbares Paar' : 'kein Paar'],
	['Versicherung', regeln.HOUSE.insurance ? 'ja' : 'nein'],
	['Versicherung zahlt', `${de(regeln.HOUSE.insurancePays[0])}:${de(regeln.HOUSE.insurancePays[1])}`],
	['Versicherung, Höchstbetrag', `${de(regeln.HOUSE.insuranceMaxFraction[0])}/${de(regeln.HOUSE.insuranceMaxFraction[1])} des Einsatzes`],
	['Aufgeben (Surrender)', regeln.HOUSE.surrender ? 'erlaubt' : 'nein'],
	['Seitenwetten', regeln.HOUSE.sideBets ? 'ja' : 'keine'],
];
const breite = Math.max(...zeilen.map(([label]) => label.length));
for (const [label, wert] of zeilen) {
	console.log(`  ${label.padEnd(breite)}  ${wert}`);
}

/* ------------------------------------------------------- Zieh-Schema ---- */

ueberschrift('Zieh-Schema des Gebers — berechnet über alle erreichbaren Geberlagen');
console.log('  (Zustandsabschluss: Startzustände sind die 13 möglichen ersten Karten;');
console.log('  von jedem Zustand, in dem gezogen wird, wird über alle 13 Ränge verzweigt,');
console.log('  bis kein neuer Zustand mehr entsteht — dieselbe Methode wie Prüfung R-4.)');

const gesehen = new Map();
const warteschlange = [];
for (const rang of regeln.RANKS) {
	const hand = [rang];
	const stand = regeln.handTotal(hand);
	const schluessel = `${stand.total}|${stand.soft}`;
	if (!gesehen.has(schluessel)) {
		gesehen.set(schluessel, hand);
		warteschlange.push(hand);
	}
}
for (let i = 0; i < warteschlange.length; i++) {
	const hand = warteschlange[i];
	const stand = regeln.handTotal(hand);
	if (regeln.dealerMustDraw(stand)) {
		for (const rang of regeln.RANKS) {
			const naechsteHand = [...hand, rang];
			const naechsterStand = regeln.handTotal(naechsteHand);
			const schluessel = `${naechsterStand.total}|${naechsterStand.soft}`;
			if (!gesehen.has(schluessel)) {
				gesehen.set(schluessel, naechsteHand);
				warteschlange.push(naechsteHand);
			}
		}
	}
}

const zustaende = [...gesehen.entries()]
	.map(([, hand]) => regeln.handTotal(hand))
	.sort((a, b) => (a.soft === b.soft ? a.total - b.total : Number(a.soft) - Number(b.soft)));

console.log(`\n  ${de(zustaende.length)} erreichbare Geberlagen:\n`);
console.log('  Summe   Art     Entscheidung');
for (const stand of zustaende) {
	const art = stand.busted ? 'über 21' : stand.soft ? 'weich' : 'hart';
	const entscheidung = stand.busted ? 'überkauft — Runde vorbei' : regeln.dealerMustDraw(stand) ? 'ziehen' : 'stehen';
	console.log(`  ${de(stand.total).padStart(5)}   ${art.padEnd(7)} ${entscheidung}`);
}

/* --------------------------------------------------------- Einsätze ----- */

ueberschrift('Einsätze und Auszahlungen');
console.log(`  Mindesteinsatz          ${de(regeln.BET_MIN)}`);
console.log(`  Höchsteinsatz           ${de(regeln.BET_MAX)}`);
console.log(`  Schrittweite            ${de(regeln.BET_STEP)}`);
console.log('  (Mindesteinsatz und Schrittweite weichen bewusst vom Wortlaut aus Anhang G');
console.log('  ab — siehe der Kopfkommentar von rules-blackjack.js und DECISIONS.md.)');

const beispielEinsatz = 10;
console.log(`\n  Beispiel für einen Einsatz von ${de(beispielEinsatz)}:`);
console.log(`    Blackjack zahlt       ${de(regeln.blackjackReturn(beispielEinsatz), 1)}  (Einsatz + 3/2)`);
console.log(`    Gewonnene Hand zahlt  ${de(regeln.winReturn(beispielEinsatz))}  (Einsatz + 1/1)`);
console.log(`    Patt gibt zurück      ${de(regeln.pushReturn(beispielEinsatz))}`);
console.log(`    Verlorene Hand gibt   ${de(regeln.loseReturn())}`);
console.log(`    Höchste Versicherung  ${de(regeln.insuranceMax(beispielEinsatz))}`);
console.log(`    … zahlt bei Treffer   ${de(regeln.insuranceReturn(regeln.insuranceMax(beispielEinsatz)))}`);

console.log('\nEnde der Ausgabe.\n');
process.exit(0);
