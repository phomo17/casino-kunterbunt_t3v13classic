/**
 * Reel Slot – Nachweis der Auszahlungsquote
 * =========================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Rechnet alle
 * 20 × 20 × 20 = 8000 Kombinationen vollständig durch und weist die Zahlen aus
 * CONCEPT.md, Anhang C (Teil B, Abschnitt B.13) nach: die neun Gewinnzeilen,
 * die Trefferhäufigkeit 0,40850, die Quote von exakt 0,98000 und die in
 * Phase 2 zusätzlich verlangte streng fallende Häufigkeit der
 * Dreierkombinationen.
 *
 * Aufruf (nur lesend, ändert nichts):
 *
 *   ddev exec node typo3conf/ext/reel_slot/Resources/Private/Scripts/verify-payout.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1 bei der ersten Abweichung. Damit ist
 * der Nachweis auch maschinell prüfbar und nicht nur ansehnlich.
 *
 *
 * WARUM DIESES SKRIPT ÜBERHAUPT ETWAS BEWEIST
 * -------------------------------------------
 * Weil es keine Nachbildung der Regeln benutzt, sondern die Regeln selbst:
 * paytable.js ist dieselbe Datei, mit der der Browser spielt. Eine zweite,
 * eigens für die Prüfung geschriebene Auswertung könnte richtig rechnen,
 * während das Spiel falsch zahlt — dann wäre der Nachweis wertlos. Genau
 * deshalb hat paytable.js keinen einzigen Import: Node kennt die Import-Map
 * von TYPO3 nicht und könnte einen Namen wie '@phomo17/…' nicht auflösen.
 *
 * Die Walzenbänder kommen aus Classes/Rules.php, der einen Quelle, aus der
 * auch das Markup gebaut wird (MachineProcessor → data-rs-strip → reel.js).
 * Gelesen wird die Datei als TEXT, nicht ausgeführt: kein PHP, kein
 * Unterprozess, keine TYPO3-Umgebung. Vier unabhängige Prüfungen weiter unten
 * schließen aus, dass ein Fehlgriff beim Einlesen unbemerkt bleibt.
 *
 *
 * WARUM GANZZAHLIG GERECHNET WIRD
 * -------------------------------
 * Ein Vergleich zweier Kommazahlen auf Gleichheit ist in jeder Sprache eine
 * Falle. Deshalb wird nicht die Quote verglichen, sondern die Auszahlungssumme
 * in Einsatz-Einheiten: Σ (Kombinationen × Faktor). 0,98000 bei 8000
 * Kombinationen ist die ganze Zahl 7840, 0,40850 ist die ganze Zahl 3268.
 * Kommazahlen entstehen erst in der Ausgabe.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { PAYTABLE, SYMBOLS, evaluate } from '../../Public/JavaScript/paytable.js';

const here = dirname(fileURLToPath(import.meta.url));
const RULES_PHP = resolve(here, '../../../Classes/Rules.php');

const LAP = 20;
const TOTAL = LAP ** 3;

/**
 * Die nachzuweisenden Zahlen aus CONCEPT.md, Anhang C (Teil B, B.13).
 *
 * "combinations" ist die Zahl der Kombinationen, "units" ihr Beitrag zur
 * Auszahlung in Einsatz-Einheiten, also combinations × Faktor. Beides ganze
 * Zahlen — hier wird nichts gerundet und nichts verglichen, was rundet.
 */
const EXPECTED_ROWS = [
	{ id: 'sieben3', combinations: 2, units: 200 },
	{ id: 'bar3', combinations: 4, units: 200 },
	{ id: 'glocke3', combinations: 6, units: 120 },
	{ id: 'melone3', combinations: 8, units: 112 },
	{ id: 'orange3', combinations: 12, units: 120 },
	{ id: 'zitrone3', combinations: 36, units: 288 },
	{ id: 'kirsche3', combinations: 360, units: 1800 },
	{ id: 'kirsche2', combinations: 1080, units: 3240 },
	{ id: 'kirsche1', combinations: 1760, units: 1760 },
];

const EXPECTED_HITS = 3268;
const EXPECTED_BLANKS = 4732;
const EXPECTED_UNITS = 7840;

/** Symbolzahlen je Walze aus Anhang C. */
const EXPECTED_COUNTS = [
	{ kirsche: 8, zitrone: 3, orange: 2, melone: 2, glocke: 2, bar: 2, sieben: 1 },
	{ kirsche: 9, zitrone: 3, orange: 3, melone: 2, glocke: 1, bar: 1, sieben: 1 },
	{ kirsche: 5, zitrone: 4, orange: 2, melone: 2, glocke: 3, bar: 2, sieben: 2 },
];

let failed = false;

/**
 * @param {boolean} condition
 * @param {string} message
 * @returns {void}
 */
function check(condition, message) {
	if (condition) {
		console.log(`  OK      ${message}`);
		return;
	}
	failed = true;
	console.log(`  FEHLER  ${message}`);
}

/**
 * Liest die drei Walzenbänder aus Classes/Rules.php – als Text, ohne PHP.
 *
 * Vorgehen: den Block der Konstanten STRIPS ausschneiden, darin die innersten
 * eckigen Klammern suchen (das sind genau die drei Walzen, denn tiefer
 * verschachtelt wird dort nicht), und aus jeder die einfach zitierten Wörter
 * ziehen. Die Kommentarzeilen „// Walze 1" enthalten weder Klammern noch
 * Anführungszeichen und stören deshalb nicht.
 *
 * @returns {Promise<string[][]>}
 */
async function readStrips() {
	const source = await readFile(RULES_PHP, 'utf8');
	const block = source.match(/public const STRIPS\s*=\s*\[([\s\S]*?)\n\s*\];/);
	if (block === null) {
		throw new Error(`In ${RULES_PHP} ist keine Konstante STRIPS zu finden.`);
	}

	const strips = [];
	for (const inner of block[1].matchAll(/\[([^[\]]*)\]/g)) {
		strips.push([...inner[1].matchAll(/'([^']+)'/g)].map((match) => match[1]));
	}
	return strips;
}

/**
 * Die vier unabhängigen Prüfungen, die einen Fehlgriff beim Einlesen
 * ausschließen. Sie sind zugleich der Schutz gegen einen Tippfehler in
 * Anhang C selbst.
 *
 * @param {string[][]} strips
 * @returns {void}
 */
function checkStrips(strips) {
	console.log('\nWalzenbänder (Quelle: Classes/Rules.php, als Text gelesen)');

	check(strips.length === 3, `drei Walzenbänder gefunden (${strips.length})`);
	if (strips.length !== 3) {
		return;
	}

	for (let reel = 0; reel < 3; reel++) {
		const strip = strips[reel];
		check(strip.length === LAP, `Walze ${reel + 1}: ${strip.length} Rasterpositionen (erwartet ${LAP})`);

		const unknown = strip.filter((name) => !SYMBOLS.includes(name));
		check(unknown.length === 0, `Walze ${reel + 1}: nur bekannte Symbolnamen`
			+ (unknown.length === 0 ? '' : ` – unbekannt: ${[...new Set(unknown)].join(', ')}`));

		// Symbolzahlen je Walze (Anhang C, Tabelle „Symbolzahlen je Walze").
		const counted = {};
		for (const name of strip) {
			counted[name] = (counted[name] ?? 0) + 1;
		}
		const expected = EXPECTED_COUNTS[reel];
		const wrong = Object.keys(expected).filter((name) => (counted[name] ?? 0) !== expected[name]);
		check(wrong.length === 0, `Walze ${reel + 1}: Symbolzahlen wie in Anhang C`
			+ (wrong.length === 0 ? '' : ` – abweichend: ${wrong.join(', ')}`));

		// „Auf keiner Walze stehen zwei gleiche Symbole nebeneinander – auch
		// nicht über den Übergang von Position 20 zu Position 1."
		const neighbours = strip.filter((name, i) => name === strip[(i + 1) % strip.length]);
		check(neighbours.length === 0, `Walze ${reel + 1}: keine zwei gleichen Symbole nebeneinander`);
	}
}

/**
 * Zählt alle 8000 Kombinationen aus – mit derselben Auswertung, mit der der
 * Browser spielt.
 *
 * @param {string[][]} strips
 * @returns {{counts: Map<string, number>, hits: number, units: number}}
 */
function enumerate(strips) {
	const counts = new Map(PAYTABLE.map((row) => [row.id, 0]));
	let hits = 0;
	let units = 0;

	for (const first of strips[0]) {
		for (const second of strips[1]) {
			for (const third of strips[2]) {
				const row = evaluate([first, second, third]);
				if (row === null) {
					continue;
				}
				counts.set(row.id, counts.get(row.id) + 1);
				hits++;
				units += row.factor;
			}
		}
	}

	return { counts, hits, units };
}

/**
 * @param {number} value
 * @returns {string} Anteil an 8000, fünf Nachkommastellen, deutsches Komma
 */
function share(value) {
	return (value / TOTAL).toFixed(5).replace('.', ',');
}

/**
 * @param {{counts: Map<string, number>, hits: number, units: number}} result
 * @returns {void}
 */
function report(result) {
	console.log('\nAlle 8000 Kombinationen, ausgezählt mit paytable.js');
	console.log('  Zeile      Kombinationen  Wahrscheinlichkeit  Beitrag zur Quote');

	for (const expected of EXPECTED_ROWS) {
		const row = PAYTABLE.find((candidate) => candidate.id === expected.id);
		const combinations = result.counts.get(expected.id) ?? 0;
		const units = combinations * row.factor;
		console.log(
			`  ${expected.id.padEnd(10)} ${String(combinations).padStart(13)}`
			+ `  ${share(combinations).padStart(18)}  ${share(units).padStart(17)}`
		);
	}

	const blanks = TOTAL - result.hits;
	console.log(
		`  ${'kein Gewinn'.padEnd(10)} ${String(blanks).padStart(13)}`
		+ `  ${share(blanks).padStart(18)}  ${share(0).padStart(17)}`
	);
	console.log(
		`  ${'Summe'.padEnd(10)} ${String(TOTAL).padStart(13)}`
		+ `  ${share(TOTAL).padStart(18)}  ${share(result.units).padStart(17)}`
	);

	console.log('\nAbgleich mit Anhang C (ganzzahlig, keine Kommazahlen im Vergleich)');
	for (const expected of EXPECTED_ROWS) {
		const row = PAYTABLE.find((candidate) => candidate.id === expected.id);
		const combinations = result.counts.get(expected.id) ?? 0;
		check(
			combinations === expected.combinations && combinations * row.factor === expected.units,
			`${expected.id}: ${combinations} Kombinationen (erwartet ${expected.combinations}), `
			+ `${combinations * row.factor} Einheiten (erwartet ${expected.units})`
		);
	}

	check(result.hits === EXPECTED_HITS, `Treffer gesamt: ${result.hits} (erwartet ${EXPECTED_HITS})`);
	check(blanks === EXPECTED_BLANKS, `kein Gewinn: ${blanks} (erwartet ${EXPECTED_BLANKS})`);
	check(result.units === EXPECTED_UNITS,
		`Auszahlung: ${result.units} von ${TOTAL} Einheiten (erwartet ${EXPECTED_UNITS})`);

	// Zusatzbedingung aus Anhang C / Phase 2: je höher der Gewinnwert einer
	// Dreierkombination, desto seltener darf sie vorkommen. Die Kirsche bleibt
	// hier außen vor – ihre Dreierzeile ist nicht die einzige Kirschen-Zeile
	// und deshalb nicht Teil dieser Rangfolge (CONCEPT.md, Anhang C).
	console.log('\nZusatzbedingung: Dreierkombinationen streng fallend nach Gewinnwert');
	const descendingOrder = ['zitrone3', 'orange3', 'melone3', 'glocke3', 'bar3', 'sieben3'];
	let strictlyDescending = true;
	for (let i = 0; i < descendingOrder.length - 1; i++) {
		const current = result.counts.get(descendingOrder[i]) ?? 0;
		const next = result.counts.get(descendingOrder[i + 1]) ?? 0;
		if (!(current > next)) {
			strictlyDescending = false;
		}
	}
	check(strictlyDescending, 'Zitrone > Orange > Melone > Glocke > BAR > Sieben: '
		+ descendingOrder.map((id) => `${id}=${result.counts.get(id) ?? 0}`).join(' > '));

	console.log(`\n  Trefferhäufigkeit  ${share(result.hits)}  =  ${result.hits} / ${TOTAL}`);
	console.log(`  Auszahlungsquote   ${share(result.units)}  =  ${result.units} / ${TOTAL}`);
	console.log(`  Jackpot            1 zu ${TOTAL / (result.counts.get('sieben3') || 1)}`);
}

const strips = await readStrips();
checkStrips(strips);

if (failed) {
	console.log('\nAbgebrochen: die Walzenbänder stimmen nicht mit Anhang C überein.');
	process.exit(1);
}

report(enumerate(strips));

console.log(failed
	? '\nERGEBNIS: mindestens eine Kennzahl weicht von Anhang C ab.'
	: '\nERGEBNIS: alle Kennzahlen aus Anhang C nachgewiesen.');

process.exit(failed ? 1 : 0);
