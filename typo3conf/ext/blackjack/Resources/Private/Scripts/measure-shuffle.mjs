/**
 * Blackjack – Messlauf Mischgleichverteilung (M-C4-1)
 * ======================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Der ERSTE der beiden
 * langen Messläufe aus CONCEPT.md C.5.4. Er wird von diesem Umsetzungsstück
 * GEBAUT, aber NICHT in voller Länge gefahren — lange Läufe gehören nicht in
 * einen Agentenlauf; die Hauptsitzung führt ihn in vollem Umfang aus und
 * trägt das Ergebnis in README.md und MEMORY.md nach (Plan Abschnitt 7).
 *
 * Aufruf, mit den in C.5.4 verlangten Vorgaben:
 *
 *   ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/measure-shuffle.mjs \
 *       --shuffles=1000000 --seed=20260906
 *
 * Ohne Angabe: --shuffles=1000000, --seed=1. Ein kleinerer Umfang wird
 * angenommen, aber im Bericht ausdrücklich als „UNTER DEM GEFORDERTEN UMFANG"
 * gekennzeichnet — C.5.4 verlangt für den abschließenden Nachweis mindestens
 * 1.000.000 Mischungen. Rückgabewert 0, wenn der Test besteht; 1 sonst.
 *
 * WAS GEMESSEN WIRD — GENAU DIE GRÖSSE, AUF DIE SICH DIE ZUSAGE BEZIEHT
 * -------------------------------------------------------------------------
 * C.5.4: „Verteilung der Position EINER MARKIERTEN KARTE über alle 312
 * Plätze". Markiert wird die Karte, die vor dem Mischen an Stelle 0 liegt
 * (die Bauart von Shoe.shuffle() legt sie eindeutig fest — hier als
 * Karten-IDENTITÄT 0 in einem einfachen Zahlenfeld [0..311] nachgebildet,
 * damit dieses Skript ohne die Klasse Shoe auskommt und ausschließlich mit
 * der öffentlichen, für sich geprüften Funktion shuffleInPlace() rechnet).
 * Nach jeder Mischung wird ihre neue Position gezählt. Das ergibt 312
 * Fächer; chiSquareUniform() aus stats.mjs liefert χ², 311 Freiheitsgrade
 * und den p-Wert. BESTANDEN BEI p > 0,01.
 *
 * ZUSÄTZLICH, WEIL ES IM SELBEN DURCHGANG NICHTS KOSTET: die vollständige
 * 312×312-Matrix (jede Karte über jeden Platz) wird als DIAGNOSE ausgewiesen,
 * NICHT als Prüfgröße — 312 gleichzeitige Tests brauchen eine angepasste
 * Schranke (Bonferroni: 0,01 / 312), und die Zusage aus C.5.4 bezieht sich
 * auf einen EINZIGEN Test. Berichtet werden der schlechteste der 312
 * p-Werte und ob er die Bonferroni-Schranke unterschreitet. Eine Schieflage,
 * die die eine markierte Karte zufällig nicht zeigt, fällt damit trotzdem
 * auf — ohne dass die eigentliche Zusage uminterpretiert würde.
 *
 * DIE TOLERANZ RICHTET SICH NACH DER TATSÄCHLICHEN STICHPROBE
 * -----------------------------------------------------------------
 * Bestanden ist der Chi-Quadrat-Test bei p > 0,01 — das ist eine feste
 * Schranke auf einer WAHRSCHEINLICHKEIT, nicht auf einer schwankenden
 * Messgröße, und deshalb unabhängig vom Stichprobenumfang gültig (anders als
 * measure-payout.mjs, wo die Zusage eine PROZENTZAHL ist und die Toleranz
 * deshalb an der empirischen Streuung der tatsächlichen Stichprobe hängen
 * muss — Plan Abschnitt 4, Festlegung 5). Trotzdem berichtet dieses Skript
 * zusätzlich die größte Einzelabweichung in absoluten Zahlen UND in
 * Vielfachen der Standardabweichung (chiSquareUniform() liefert das mit),
 * damit ein Mensch die Schieflage auch ohne den p-Wert einschätzen kann.
 *
 * DER EINGEBAUTE SELBSTTEST — ZWEI TEILE, BEIDE VOR DEM EIGENTLICHEN LAUF
 * ----------------------------------------------------------------------------
 * (1) stats.mjs prüft sich gegen ihre von Hand abgeschriebenen
 *     Referenzwerte. Schlägt das fehl, BRICHT DIESER LAUF AB: eine Messung
 *     mit falscher Statistik soll gar nicht erst laufen (C.5.4).
 * (2) DIE GEGENPROBE ZUM MISCHEN: derselbe Test läuft über 100.000
 *     Mischungen gegen eine in diesem Skript selbst geschriebene NAIVE
 *     Fassung (Schranke n statt i+1). Er MUSS DURCHFALLEN. Besteht er, ist
 *     der Test zu schwach, und dieses Skript meldet genau das und gibt 1
 *     zurück — OHNE diese Gegenprobe wäre ein grüner Hauptlauf nichts wert:
 *     eine Prüfung, die nie fehlschlagen kann, ist keine.
 *
 * DER ZUFALLSGEBER IST createSeeded(seed), NIE drawUint32 — ein Nachweis muss
 * auf jeder Maschine dieselbe Zahl liefern (C.5.2/C.5.3).
 *
 * WAS PASSIERT, WENN DER TEST DURCHFÄLLT. C.5.4 ist eindeutig: nachgebessert
 * wird das VERFAHREN, niemals der Zufallsgenerator verbogen und niemals ein
 * Ergebnis nachträglich verschoben. Zuerst wird geprüft, ob die Gegenprobe
 * tatsächlich rot ist (sonst liegt der Fehler in der Verdrahtung dieses
 * Messlaufs, nicht im Mischen); danach verify-shoe.mjs (S-4, S-10) —- ein
 * bestandenes S-10 schließt den einzigen realistischen Fehler bereits aus,
 * weshalb ein Durchfallen hier zuerst auf den Zufallsgeber oder die Zählung
 * deutet, nicht auf das Mischen selbst.
 */

import { shuffleInPlace, drawIndex } from '../../Public/JavaScript/shoe.js';
import { createSeeded } from '../../Public/JavaScript/rng.js';
import { chiSquareUniform, selbsttest } from './stats.mjs';
import * as rules from '../../Public/JavaScript/rules-blackjack.js';

/* ================================================== Kommandozeile ======= */

function parseArgs(argv) {
	const werte = { shuffles: 1000000, seed: 1 };
	for (const arg of argv) {
		const treffer = /^--(shuffles|seed)=(-?\d+)$/.exec(arg);
		if (treffer) {
			werte[treffer[1]] = Number(treffer[2]);
		}
	}
	return werte;
}

const { shuffles: ANZAHL, seed: SAAT } = parseArgs(process.argv.slice(2));

console.log('\nBlackjack – Messlauf Mischgleichverteilung (M-C4-1)');
console.log('======================================================\n');

/* ============================================ Selbsttest, Teil 1: stats = */

console.log('Selbsttest 1/2: stats.mjs gegen von Hand abgeschriebene Referenzwerte');
if (!selbsttest((ok, text) => console.log(`  ${ok ? '✓' : '✗'} ${text}`))) {
	console.error('\nABBRUCH: der Selbsttest von stats.mjs ist fehlgeschlagen. Eine Messung mit'
		+ ' falscher Statistik soll gar nicht erst laufen (CONCEPT.md C.5.4).');
	process.exit(1);
}
console.log('  → bestanden.\n');

/* ==================================== Naive Fassung, nur für die Gegenprobe */

/**
 * Dieselbe Fisher-Yates-Struktur wie shuffleInPlace() in shoe.js, aber mit
 * dem verbreitetsten Mischfehler überhaupt: die Schranke ist bei JEDEM
 * Schritt n (die volle Länge), nicht i+1. Existiert AUSSCHLIESSLICH für die
 * Gegenprobe unten und wird NIE im echten Spiel benutzt.
 */
function shuffleNaiv(cards, random) {
	const n = cards.length;
	for (let i = n - 1; i > 0; i--) {
		const j = drawIndex(random, n); // FALSCH: n statt i+1
		const zwischen = cards[i];
		cards[i] = cards[j];
		cards[j] = zwischen;
	}
	return cards;
}

/**
 * Misst, IM SELBEN DURCHGANG, die volle 312×312-Matrix (jede Karten-Identität
 * über jeden Platz) für `lauf` Mischungen der übergebenen Mischfunktion. Die
 * Verteilung der EINEN markierten Karte (Identität 0) — die eigentliche
 * Prüfgröße aus C.5.4 — ist danach schlicht Zeile 0 dieser Matrix: kein
 * zweiter Lauf, keine zweite Saat, keine zusätzlichen Kosten (Plan
 * Abschnitt 4.3: „weil es im selben Durchgang nichts kostet").
 *
 * @param {(cards: number[], random: function(): number) => number[]} mischfunktion
 * @param {number} lauf Anzahl der Mischungen
 * @param {function(): number} random
 * @param {boolean} [fortschritt] ob Fortschrittsmeldungen ausgegeben werden
 * @returns {{matrix: number[][], dauerMs: number}}
 */
function messen(mischfunktion, lauf, random, fortschritt = false) {
	const matrix = Array.from({ length: rules.SHOE_SIZE }, () => new Array(rules.SHOE_SIZE).fill(0));
	const basis = Array.from({ length: rules.SHOE_SIZE }, (_, i) => i);
	const schritt = Math.max(1, Math.floor(lauf / 20));
	const start = Date.now();
	for (let n = 0; n < lauf; n++) {
		const cards = mischfunktion(basis.slice(), random);
		for (let platz = 0; platz < cards.length; platz++) {
			matrix[cards[platz]][platz]++;
		}
		if (fortschritt && (n + 1) % schritt === 0) {
			console.log(`  … ${(((n + 1) / lauf) * 100).toFixed(0)} % (${(n + 1).toLocaleString('de-DE')} / ${lauf.toLocaleString('de-DE')})`);
		}
	}
	return { matrix, dauerMs: Date.now() - start };
}

/**
 * Die schlanke Fassung für die Gegenprobe: nur die Position der markierten
 * Karte (Identität 0) wird gezählt, keine volle Matrix — die Gegenprobe
 * braucht ausdrücklich „denselben Test", nicht die zusätzliche Diagnose.
 *
 * @returns {{counts: number[], dauerMs: number}}
 */
function messenMarkierteKarte(mischfunktion, lauf, random) {
	const counts = new Array(rules.SHOE_SIZE).fill(0);
	const basis = Array.from({ length: rules.SHOE_SIZE }, (_, i) => i);
	const start = Date.now();
	for (let n = 0; n < lauf; n++) {
		const cards = mischfunktion(basis.slice(), random);
		counts[cards.indexOf(0)]++;
	}
	return { counts, dauerMs: Date.now() - start };
}

/* ======================================= Selbsttest, Teil 2: Gegenprobe = */

console.log('Selbsttest 2/2: Gegenprobe — die naive Fassung MUSS über 100.000 Mischungen durchfallen');
const NAIV_ANZAHL = 100000;
const naivErgebnis = messenMarkierteKarte(shuffleNaiv, NAIV_ANZAHL, createSeeded(SAAT + 900000));
const naivChi = chiSquareUniform(naivErgebnis.counts);
console.log(`  χ²=${naivChi.chi2.toFixed(1)}, df=${naivChi.df}, p=${naivChi.p.toExponential(3)}`
	+ ` (${(naivErgebnis.dauerMs / 1000).toFixed(1)} s)`);
if (naivChi.p > 0.01) {
	console.error('\nABBRUCH: die Gegenprobe (naive Fassung, Schranke n statt i+1) hätte'
		+ ' DURCHFALLEN müssen und ist stattdessen bestanden. Der Test ist damit zu'
		+ ' schwach, um eine Schieflage überhaupt zu erkennen — ein grüner Hauptlauf'
		+ ' wäre nichts wert.');
	process.exit(1);
}
console.log('  → wie erwartet DURCHGEFALLEN (die naive Fassung wird erkannt).\n');

/* ==================================================== Der eigentliche Lauf */

if (ANZAHL < 1000000) {
	console.log(`ACHTUNG: --shuffles=${ANZAHL} liegt UNTER DEM GEFORDERTEN UMFANG von`
		+ ' 1.000.000 Mischungen aus CONCEPT.md C.5.4. Dieser Lauf ist eine Kurzprobe,'
		+ ' kein abschließender Nachweis.\n');
}

console.log(`Hauptlauf: ${ANZAHL.toLocaleString('de-DE')} Mischungen, Saat ${SAAT}, echte shuffleInPlace()`);
const random = createSeeded(SAAT);
const { matrix, dauerMs } = messen(shuffleInPlace, ANZAHL, random, ANZAHL >= 100000);
const counts = matrix[0]; // die markierte Karte: Identität 0, Zeile 0 der Matrix
const ergebnis = chiSquareUniform(counts);

console.log('\nErgebnis der markierten Karte über alle 312 Plätze:');
console.log(`  Umfang            ${ANZAHL.toLocaleString('de-DE')} Mischungen`);
console.log(`  Saat              ${SAAT}`);
console.log(`  χ²                ${ergebnis.chi2.toFixed(3)}`);
console.log(`  Freiheitsgrade    ${ergebnis.df}`);
console.log(`  p-Wert            ${ergebnis.p.toFixed(4)}`);
console.log(`  größte Abweichung Platz ${ergebnis.maxDeviation.index}: ${ergebnis.maxDeviation.absolute.toFixed(2)}`
	+ ` (${ergebnis.maxDeviation.sigmas.toFixed(2)} σ)`);
console.log(`  Laufzeit          ${(dauerMs / 1000).toFixed(1)} s`);

const bestanden = ergebnis.p > 0.01;
console.log(`\n  → ${bestanden ? 'BESTANDEN' : 'DURCHGEFALLEN'} (Schranke: p > 0,01)`);

/* ================================ Diagnose: die volle 312×312-Matrix ==== */

console.log('\nDiagnose (keine Prüfgröße): die volle 312×312-Matrix, jede Karte über jeden Platz'
	+ ' — aus demselben Durchgang wie oben, keine zweite Mischreihe');
{
	let schlechtesterP = 1;
	let schlechtesteKarte = -1;
	for (let karte = 0; karte < rules.SHOE_SIZE; karte++) {
		const teilergebnis = chiSquareUniform(matrix[karte]);
		if (teilergebnis.p < schlechtesterP) {
			schlechtesterP = teilergebnis.p;
			schlechtesteKarte = karte;
		}
	}
	const bonferroniSchranke = 0.01 / rules.SHOE_SIZE;
	const auffaellig = schlechtesterP < bonferroniSchranke;
	console.log(`  schlechtester p-Wert     ${schlechtesterP.toExponential(3)} (Karte ${schlechtesteKarte})`);
	console.log(`  Bonferroni-Schranke      ${bonferroniSchranke.toExponential(3)} (0,01 / ${rules.SHOE_SIZE})`);
	console.log(`  → ${auffaellig ? 'AUFFÄLLIG — unterschreitet die Bonferroni-Schranke' : 'unauffällig'}`);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(bestanden
	? '\nERGEBNIS: bestanden. Die Gegenprobe ist wie erwartet durchgefallen, der'
	+ ' Hauptlauf mit der echten shuffleInPlace() ist bestanden.'
	: '\nERGEBNIS: DURCHGEFALLEN. Nachbessern (siehe Kopfkommentar dieser Datei) —'
	+ ' niemals den Zufallsgenerator verbiegen, niemals ein Ergebnis nachträglich verschieben.');

process.exit(bestanden ? 0 : 1);
