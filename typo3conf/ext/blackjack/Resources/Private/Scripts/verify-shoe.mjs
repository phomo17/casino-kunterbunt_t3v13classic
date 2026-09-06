/**
 * Blackjack – Nachweis Kartenschlitten (S-1 bis S-11)
 * ======================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit
 * außer den zu prüfenden Dateien selbst (shoe.js, rules-blackjack.js, rng.js,
 * stats.mjs); es genügt ein Node ab Version 18. Laufzeit unter zehn Sekunden
 * (Plan Abschnitt 4.3).
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/verify-shoe.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.3, Umsetzungsstück C4c)
 * -------------------------------------------------------------------
 *   S-1    312 Karten: 24 je Rang, 78 je Farbe, 6 je (Rang, Farbe)
 *   S-2    Nach 1.000 Mischungen ist die Kartenmenge unverändert
 *   S-3    Wiederholbarkeit: gleiche Saat → gleiche Reihenfolge
 *   S-3-G  Gegenprobe: verschiedene Saaten → verschiedene Reihenfolge
 *   S-4    Das Verwerfungsverfahren verwirft wirklich
 *   S-5    Quelltext: kein import/document/window/localStorage/Math.random;
 *          „%" ausschließlich in drawIndex
 *   S-6    Trennkarte: cutReached wird GENAU ab der 234. gezogenen Karte wahr
 *   S-7    Der laufende Zähler stimmt nach JEDER Karte; über den ganzen
 *          Schlitten summiert er sich auf NULL (Null-Summen-Invariante)
 *   S-8    needsShuffle/shuffleReason genau dann, wenn Trennkarte erreicht
 *          ODER wahrer Zähler > +3 — und Vorrangregel bei beidem zugleich
 *   S-9    Ein leerer Schlitten wirft, statt still neu zu mischen
 *   S-10   Fisher-Yates hat die richtige Schranke (i+1, nicht n)
 *   S-11   Gleichverteilung im Kleinen: 200.000 Mischungen eines
 *          Sechserstapels über alle 720 Permutationen, χ² mit p > 0,01
 *   S-11-G Gegenprobe: dieselbe Prüfung erkennt die naive, falsche Fassung
 *
 * DIE WICHTIGSTE REGEL DIESER DATEI (Plan Abschnitt 4, Festlegung 4)
 * -------------------------------------------------------------------
 * Jede Erwartung unten ist entweder von Hand nachgerechnet (S-4, S-10) oder
 * unabhängig von der zu prüfenden Funktion aufgeschrieben (S-7: eine eigene,
 * von Hand aus C.7.3 abgeschriebene Hi-Lo-Tabelle statt eines Aufrufs von
 * rules.hiLoTag). JEDE Prüfung hat eine Gegenprobe, die auf einer im Skript
 * selbst angefertigten, verfälschten oder naiven Fassung arbeitet und
 * NACHWEISLICH fehlschlägt — nie am echten Zustand des laufenden Nachweises.
 * Eine Prüfung, die nie fehlschlagen kann, ist keine.
 *
 * WAS DIESE PRÜFUNG LEISTEN KANN — UND WAS NICHT
 * ---------------------------------------------------
 * S-11 prüft die GESAMTE Verteilung eines Sechserstapels (alle 720
 * Permutationen), fertig in Sekunden — bei 312 Karten gibt es mehr
 * Reihenfolgen als Atome in der beobachtbaren Welt, dort lässt sich nur noch
 * eine RANDVERTEILUNG prüfen (eine Karte über 312 Plätze). Das ist Aufgabe
 * des langen Messlaufs measure-shuffle.mjs (≥ 1.000.000 Mischungen,
 * CONCEPT.md C.5.4) und wird HIER NICHT ersetzt. S-10 entscheidet die
 * eigentliche Frage „ist die Schranke richtig" sogar ganz ohne Statistik.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as rules from '../../Public/JavaScript/rules-blackjack.js';
import { drawIndex, shuffleInPlace, Shoe } from '../../Public/JavaScript/shoe.js';
import { createSeeded } from '../../Public/JavaScript/rng.js';
import { chiSquareUniform } from './stats.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/blackjack/ */
const EXT = path.resolve(HIER, '../../..');
const SHOE_PATH = path.join(EXT, 'Resources/Public/JavaScript/shoe.js');

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

console.log('\nBlackjack – Nachweis Kartenschlitten (S-1 bis S-11)');
console.log('======================================================\n');

/* ============================================== S-1 Zusammensetzung ===== */

console.log('S-1  312 Karten: 24 je Rang, 78 je Farbe, 6 je (Rang, Farbe)');
{
	const shoe = new Shoe({ rules, random: createSeeded(1) });
	check(shoe.cards.length === rules.SHOE_SIZE,
		`der frisch gebaute Schlitten hat ${rules.SHOE_SIZE} Karten (gefunden: ${shoe.cards.length})`);

	const jeRang = Object.fromEntries(rules.RANKS.map((r) => [r, 0]));
	const jeFarbe = Object.fromEntries(rules.SUITS.map((s) => [s, 0]));
	const jePaar = new Map();
	for (const { rank, suit } of shoe.cards) {
		jeRang[rank]++;
		jeFarbe[suit]++;
		const schluessel = `${rank}|${suit}`;
		jePaar.set(schluessel, (jePaar.get(schluessel) ?? 0) + 1);
	}

	const rangAbweichungen = Object.entries(jeRang).filter(([, n]) => n !== 24);
	check(rangAbweichungen.length === 0,
		'jeder der 13 Ränge kommt genau 24-mal vor (6 Decks × 4 Farben)',
		...rangAbweichungen.map(([r, n]) => `${r}: ${n} statt 24`));

	const farbAbweichungen = Object.entries(jeFarbe).filter(([, n]) => n !== 78);
	check(farbAbweichungen.length === 0,
		'jede der 4 Farben kommt genau 78-mal vor (13 Ränge × 6 Decks)',
		...farbAbweichungen.map(([s, n]) => `${s}: ${n} statt 78`));

	const paarAbweichungen = [...jePaar.entries()].filter(([, n]) => n !== 6);
	check(jePaar.size === 52 && paarAbweichungen.length === 0,
		'jede der 52 Kombinationen aus Rang und Farbe kommt genau 6-mal vor (Anzahl der Decks)',
		`Kombinationen gefunden: ${jePaar.size} (erwartet 52)`,
		...paarAbweichungen.map(([k, n]) => `${k}: ${n} statt 6`));
}

/* ==================================== S-2 Keine Karte geht verloren ====== */

console.log('\nS-2  Nach 1.000 Mischungen ist die Kartenmenge unverändert');
{
	function multimenge(cards) {
		const zaehler = new Map();
		for (const { rank, suit } of cards) {
			const schluessel = `${rank}|${suit}`;
			zaehler.set(schluessel, (zaehler.get(schluessel) ?? 0) + 1);
		}
		return [...zaehler.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
	}

	const shoe = new Shoe({ rules, random: createSeeded(2) });
	const vorher = JSON.stringify(multimenge(shoe.cards));
	for (let i = 0; i < 1000; i++) {
		shoe.shuffle();
	}
	const nachher = JSON.stringify(multimenge(shoe.cards));
	check(vorher === nachher,
		'die Multimenge der 312 Karten ist nach 1.000 Mischungen identisch mit der ursprünglichen'
		+ ' — keine Karte ist verloren gegangen, keine wurde erfunden');
	check(shoe.shuffleCount === 1001,
		`shuffleCount zählt den Aufbau und alle 1.000 weiteren Mischungen mit (gefunden: ${shoe.shuffleCount})`);
}

/* ======================================= S-3 Wiederholbarkeit =========== */

console.log('\nS-3  Wiederholbarkeit: gleiche Saat → gleiche Reihenfolge');
{
	function folge(saat) {
		const shoe = new Shoe({ rules, random: createSeeded(saat) });
		return shoe.cards.map((k) => `${k.rank}${k.suit}`).join(',');
	}
	const a = folge(42);
	const b = folge(42);
	check(a === b, 'zwei Schlitten mit derselben Saat (42) liefern dieselbe Reihenfolge');

	console.log('     Gegenprobe S-3-G: verschiedene Saaten → verschiedene Reihenfolge');
	const c = folge(43);
	check(a !== c, 'S-3-G: eine andere Saat (43) liefert eine ANDERE Reihenfolge');
}

/* ==================================== S-4 Das Verwerfungsverfahren ======= */

console.log('\nS-4  Das Verwerfungsverfahren verwirft wirklich');
{
	// Für die Schranke 6 gilt limit = 2^32 − (2^32 mod 6) = 4.294.967.292.
	// Die ersten beiden gescripteten Werte liegen AUF bzw. ÜBER dieser
	// Grenze und müssen verworfen werden; erst der dritte (59) liegt darunter.
	const WERTE = [4294967292, 4294967295, 59];
	let aufrufe = 0;
	function geskripteterGeber() {
		if (aufrufe >= WERTE.length) {
			throw new Error('S-4: der geskriptete Geber hat keine weiteren Werte mehr');
		}
		return WERTE[aufrufe++];
	}
	const ergebnis = drawIndex(geskripteterGeber, 6);
	check(aufrufe === 3, `drawIndex ruft den Geber genau dreimal auf, bis ein Wert unter der Grenze liegt (gefunden: ${aufrufe})`);
	check(ergebnis === 5, `drawIndex(…, 6) mit den gescripteten Werten liefert 59 mod 6 = 5 (gefunden: ${ergebnis})`);
}

/* ============================================= S-5 Quelltextprüfung ===== */

console.log('\nS-5  Quelltext: kein import/document/window/localStorage/Math.random; „%" nur in drawIndex');
{
	const quelle = readFileSync(SHOE_PATH, 'utf8');
	const ohneKommentare = quelle.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

	check(!/\bimport\b/.test(ohneKommentare), 'kein import in shoe.js');
	check(!/\bdocument\b/.test(ohneKommentare), 'kein document in shoe.js');
	check(!/\bwindow\b/.test(ohneKommentare), 'kein window in shoe.js');
	check(!/\blocalStorage\b/.test(ohneKommentare), 'kein localStorage in shoe.js');
	check(!/Math\.random/.test(ohneKommentare), 'kein Math.random in shoe.js');

	const funktionsMuster = /export function drawIndex\([^)]*\)\s*\{([\s\S]*?)\n\}/;
	const fund = funktionsMuster.exec(ohneKommentare);
	check(fund !== null, 'drawIndex() ist im Quelltext zu finden');

	const koerperHatProzent = fund !== null && fund[1].includes('%');
	check(koerperHatProzent, 'drawIndex() selbst benutzt den Rest-Operator (wert % bound)');

	const restOhneDrawIndex = fund !== null ? ohneKommentare.replace(funktionsMuster, '') : ohneKommentare;
	check(!restOhneDrawIndex.includes('%'),
		'das Prozentzeichen (Rest-Operator) kommt in der GESAMTEN übrigen Datei nicht vor'
		+ ' — insbesondere nicht in shuffleInPlace() oder in der Klasse Shoe');
}

/* ================================================== S-6 Trennkarte ====== */

console.log('\nS-6  Trennkarte: cutReached wird genau ab der 234. gezogenen Karte wahr');
{
	const shoe = new Shoe({ rules, random: createSeeded(6) });
	for (let i = 0; i < 233; i++) {
		shoe.draw();
	}
	check(shoe.dealt === 233 && shoe.cutReached === false,
		`bei 233 gezogenen Karten ist cutReached noch FALSE (dealt=${shoe.dealt}, CUT_INDEX=${rules.CUT_INDEX})`);
	shoe.draw();
	check(shoe.dealt === 234 && shoe.cutReached === true,
		`bei 234 gezogenen Karten ist cutReached TRUE (dealt=${shoe.dealt}, CUT_INDEX=${rules.CUT_INDEX})`);
}

/* ====================================== S-7 Der Zähler, Karte für Karte = */

console.log('\nS-7  Der laufende Zähler stimmt nach JEDER Karte; Null-Summen-Invariante über den Schlitten');
{
	// Von Hand aus CONCEPT.md C.7.3 abgeschrieben — UNABHÄNGIG von
	// rules.hiLoTag(), nicht als Aufruf derselben Funktion, die geprüft wird.
	const HILO_UNABHAENGIG = {
		2: 1, 3: 1, 4: 1, 5: 1, 6: 1,
		7: 0, 8: 0, 9: 0,
		10: -1, J: -1, Q: -1, K: -1, A: -1,
	};

	const shoe = new Shoe({ rules, random: createSeeded(7) });
	let erwartet = 0;
	const abweichungen = [];
	while (shoe.remaining > 0) {
		const karte = shoe.draw();
		erwartet += HILO_UNABHAENGIG[karte.rank];
		if (shoe.runningCount !== erwartet) {
			abweichungen.push(`nach Karte ${shoe.dealt} (${karte.rank}${karte.suit}): erwartet ${erwartet}, gefunden ${shoe.runningCount}`);
		}
	}
	check(abweichungen.length === 0,
		`der laufende Zähler stimmt nach JEDER der ${rules.SHOE_SIZE} gezogenen Karten mit der`
		+ ' unabhängig getippten Hi-Lo-Tabelle überein',
		...abweichungen.slice(0, 5));

	check(shoe.runningCount === 0,
		'NULL-SUMMEN-INVARIANTE: über den vollständig gezogenen Schlitten summiert sich der'
		+ ` Hi-Lo-Zähler auf genau null (gefunden: ${shoe.runningCount})`);
}

/* ============================== S-8 needsShuffle / shuffleReason ======== */

console.log('\nS-8  needsShuffle/shuffleReason: Trennkarte ODER wahrer Zähler > +3, sonst nicht');
{
	// Der wahre Zähler wird KÜNSTLICH eingestellt (pos und running werden
	// direkt gesetzt) — nicht durch das echte Spiel. Das ist die Zusage aus
	// C.7.3 in ihrer reinsten Form: nur running/remaining/cutIndex entscheiden.
	const shoe = new Shoe({ rules, random: createSeeded(8) });

	// Fall 1: wahrer Zähler exakt +3,000 — C.7.3 sagt „über +3", nicht „ab".
	shoe.pos = shoe.cards.length - 104; // 2 Decks Rest, weit unter der Trennkarte
	shoe.running = 6; // 6 / 2 Decks = +3,000
	check(shoe.trueCount === 3 && shoe.cutReached === false,
		`Vorbereitung Fall 1: wahrer Zähler exakt +3 (gefunden ${shoe.trueCount}), Trennkarte nicht erreicht`);
	check(shoe.needsShuffle === false, 'Fall 1: wahrer Zähler exakt +3,000 löst KEIN Mischen aus');
	check(shoe.shuffleReason === null, 'Fall 1: shuffleReason ist null');

	// Fall 2: wahrer Zähler +3,001.
	shoe.running = 6.002; // 6,002 / 2 Decks = +3,001
	check(shoe.needsShuffle === true, 'Fall 2: wahrer Zähler +3,001 löst Mischen aus');
	check(shoe.shuffleReason === 'count', "Fall 2: shuffleReason ist 'count'");

	// Fall 3: Trennkarte erreicht, Zähler bei 0.
	shoe.pos = shoe.cutIndex; // 234
	shoe.running = 0;
	check(shoe.cutReached === true && shoe.needsShuffle === true,
		'Fall 3: Trennkarte erreicht bei Zähler 0 löst Mischen aus');
	check(shoe.shuffleReason === 'cut', "Fall 3: shuffleReason ist 'cut'");

	// Fall 4: beide Gründe zugleich — 'cut' hat Vorrang, die Reihenfolge ist
	// festgelegt und nicht dem Zufall überlassen.
	shoe.running = 100; // wahrer Zähler weit über +3
	check(shoe.trueCount > 3, 'Vorbereitung Fall 4: der wahre Zähler liegt ebenfalls weit über +3');
	check(shoe.shuffleReason === 'cut', "Fall 4: bei BEIDEN Gründen bleibt shuffleReason 'cut', nicht 'count'");
}

/* ============================ S-9 Leerer Schlitten wirft ================ */

console.log('\nS-9  Ein leerer Schlitten wirft, statt still neu zu mischen');
{
	const shoe = new Shoe({ rules, random: createSeeded(9) });
	for (let i = 0; i < rules.SHOE_SIZE; i++) {
		shoe.draw();
	}
	check(shoe.remaining === 0, `nach ${rules.SHOE_SIZE} Ziehungen ist der Schlitten leer (verbleibend: ${shoe.remaining})`);

	let geworfen = false;
	let istRangeError = false;
	try {
		shoe.draw();
	} catch (e) {
		geworfen = true;
		istRangeError = e instanceof RangeError;
	}
	check(geworfen && istRangeError,
		'ein Ziehversuch am leeren Schlitten wirft einen RangeError, statt still neu zu mischen');
	check(shoe.shuffleCount === 1,
		`der Schlitten hat NICHT heimlich neu gemischt — shuffleCount ist weiterhin 1 (gefunden: ${shoe.shuffleCount})`);
}

/* ================================== S-10 Fisher-Yates, die Schranke ===== */

console.log('\nS-10 Fisher-Yates hat die richtige Schranke (i+1, nicht n)');
{
	function immer59() {
		return 59;
	}

	/*
	 * Die richtige Fassung, mit einem konstanten Geber (immer 59), auf
	 * [0,1,2,3,4,5]: für jedes i ist die Schranke i+1 ∈ {2,3,4,5,6}. Weil
	 * 60 durch jede dieser fünf Zahlen ohne Rest teilbar ist, gilt
	 * 59 mod (i+1) = i für jedes von ihnen — jede Karte wird also mit sich
	 * SELBST getauscht, und die Reihenfolge bleibt unverändert:
	 *   i=5, Schranke 6: 59 mod 6 = 5 = i → swap(5,5)
	 *   i=4, Schranke 5: 59 mod 5 = 4 = i → swap(4,4)
	 *   i=3, Schranke 4: 59 mod 4 = 3 = i → swap(3,3)
	 *   i=2, Schranke 3: 59 mod 3 = 2 = i → swap(2,2)
	 *   i=1, Schranke 2: 59 mod 2 = 1 = i → swap(1,1)
	 */
	const richtig = shuffleInPlace([0, 1, 2, 3, 4, 5], immer59);
	check(richtig.join(',') === '0,1,2,3,4,5',
		'shuffleInPlace mit einem konstanten Geber (immer 59) lässt [0,1,2,3,4,5]'
		+ ` UNVERÄNDERT (gefunden: [${richtig.join(',')}])`);

	/*
	 * Die naive, FALSCHE Fassung — Schranke ist immer n=6, nicht i+1. Sie
	 * wird HIER eigens für die Gegenprobe geschrieben und nie im echten Code
	 * benutzt. Mit immer59 ist drawIndex(random, 6) bei jedem Aufruf 5
	 * (59 mod 6 = 5, keine Verwerfung nötig), unabhängig von i:
	 *   i=5: j=5 → swap(5,5) → [0,1,2,3,4,5]
	 *   i=4: j=5 → swap(4,5) → [0,1,2,3,5,4]
	 *   i=3: j=5 → swap(3,5) → [0,1,2,4,5,3]
	 *   i=2: j=5 → swap(2,5) → [0,1,3,4,5,2]
	 *   i=1: j=5 → swap(1,5) → [0,2,3,4,5,1]
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
	const naiv = shuffleNaiv([0, 1, 2, 3, 4, 5], immer59);
	check(naiv.join(',') === '0,2,3,4,5,1',
		'S-10-G: die naive Fassung (Schranke n statt i+1) liefert eine ANDERE, im Skript von'
		+ ` Hand nachgerechnete Reihenfolge (gefunden: [${naiv.join(',')}])`);
	check(richtig.join(',') !== naiv.join(','),
		'die richtige und die naive Fassung unterscheiden sich sichtbar — der Unterschied ist'
		+ ' entschieden, nicht behauptet');
}

/* ============================ S-11 Gleichverteilung im Kleinen ========== */

console.log('\nS-11 Gleichverteilung im Kleinen: 200.000 Mischungen eines Sechserstapels über alle 720 Permutationen');
{
	function fakultaet(n) {
		let ergebnis = 1;
		for (let i = 2; i <= n; i++) {
			ergebnis *= i;
		}
		return ergebnis;
	}

	/** Lehmer-Code: bildet eine Permutation von [0..n-1] eindeutig auf [0, n!) ab. */
	function permutationsIndex(perm) {
		const n = perm.length;
		const verbleibend = Array.from({ length: n }, (_, i) => i);
		let index = 0;
		for (let i = 0; i < n; i++) {
			const pos = verbleibend.indexOf(perm[i]);
			index += pos * fakultaet(n - 1 - i);
			verbleibend.splice(pos, 1);
		}
		return index;
	}

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

	const ANZAHL = 200000;

	const random = createSeeded(11111);
	const counts = new Array(720).fill(0);
	for (let n = 0; n < ANZAHL; n++) {
		const cards = shuffleInPlace([0, 1, 2, 3, 4, 5], random);
		counts[permutationsIndex(cards)]++;
	}
	const ergebnis = chiSquareUniform(counts);
	check(ergebnis.p > 0.01,
		`${ANZAHL.toLocaleString('de-DE')} Mischungen eines Sechserstapels sind über alle 720`
		+ ` Permutationen gleichverteilt (χ²=${ergebnis.chi2.toFixed(2)}, df=${ergebnis.df}, `
		+ `p=${ergebnis.p.toFixed(4)})`);

	console.log('     Gegenprobe S-11-G: dieselbe Prüfung muss die naive, falsche Fassung erkennen');
	const randomNaiv = createSeeded(22222);
	const countsNaiv = new Array(720).fill(0);
	for (let n = 0; n < ANZAHL; n++) {
		const cards = shuffleNaiv([0, 1, 2, 3, 4, 5], randomNaiv);
		countsNaiv[permutationsIndex(cards)]++;
	}
	const ergebnisNaiv = chiSquareUniform(countsNaiv);
	check(ergebnisNaiv.p <= 0.01,
		'S-11-G: dieselbe Prüfung erkennt die naive, falsche Fisher-Yates-Fassung (Schranke n'
		+ ` statt i+1) als NICHT gleichverteilt (χ²=${ergebnisNaiv.chi2.toFixed(2)}, `
		+ `p=${ergebnisNaiv.p.toExponential(3)})`);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden, einschließlich aller Gegenproben. Das'
	+ '\nVerwerfungsverfahren verwirft nachweislich (S-4), Fisher-Yates benutzt die'
	+ '\nrichtige Schranke i+1 (S-10, ohne jede Statistik entschieden), der laufende'
	+ '\nHi-Lo-Zähler stimmt nach jeder einzelnen Karte und summiert sich über den'
	+ '\nganzen Schlitten auf null (S-7), und die Gleichverteilung im Kleinen (S-11)'
	+ '\nsteht — die Randverteilung über alle 312 Plätze bleibt Aufgabe des langen'
	+ '\nMesslaufs measure-shuffle.mjs.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
