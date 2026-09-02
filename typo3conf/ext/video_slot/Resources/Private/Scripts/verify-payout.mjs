/**
 * Video Slot – Nachweis der Auszahlungsquote
 * ===========================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Zählt alle
 * 25⁵ = 9.765.625 Walzenstellungen vollständig aus und weist die Zahlen aus
 * CONCEPT.md, Anhang D nach: den Beitrag jeder der fünf Gewinnlinien, den
 * Scatter-Anteil, die Gesamtquote von 97,993 %, die Trefferhäufigkeit je
 * Linie und je Runde sowie die streng fallende Häufigkeit der Kombinationen
 * nach Gewinnwert.
 *
 * Aufruf (nur lesend, ändert nichts):
 *
 *   ddev exec node typo3conf/ext/video_slot/Resources/Private/Scripts/verify-payout.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1 bei der ersten Abweichung.
 *
 *
 * WARUM DIESES SKRIPT ÜBERHAUPT ETWAS BEWEIST
 * --------------------------------------------
 * Weil es keine Nachbildung der Regeln benutzt, sondern die Regeln selbst:
 * paytable.js ist dieselbe Datei, mit der der Browser spielt. Eine zweite,
 * eigens für die Prüfung geschriebene Auswertung könnte richtig rechnen,
 * während das Spiel falsch zahlt – dann wäre der Nachweis wertlos. Genau
 * deshalb hat paytable.js keinen einzigen import: Node kennt die Import-Map
 * von TYPO3 nicht und könnte einen Namen wie '@phomo17/…' nicht auflösen.
 *
 * Die Walzenbänder kommen aus Classes/Rules.php, der einen Quelle, aus der
 * auch das Markup gebaut wird (CabinetProcessor → data-vs-strip → reel.js).
 * Gelesen wird die Datei als TEXT, nicht ausgeführt: kein PHP, kein
 * Unterprozess, keine TYPO3-Umgebung. Dieselbe Bauform wie
 * reel_slot/Resources/Private/Scripts/verify-payout.mjs.
 *
 *
 * WARUM GANZZAHLIG GERECHNET WIRD
 * ---------------------------------
 * Ein Vergleich zweier Kommazahlen auf Gleichheit ist in jeder Sprache eine
 * Falle. Deshalb wird nicht die Quote verglichen, sondern die
 * Auszahlungssumme in Einsatz-Einheiten. Kommazahlen entstehen erst in der
 * Ausgabe.
 *
 *
 * WAS AUSGEZÄHLT WIRD
 * ---------------------
 * 25⁵ = 9.765.625 gleich wahrscheinliche Stellungen. Je Walze und
 * Stopposition werden die drei sichtbaren Symbole EINMAL ausgerechnet
 * (5 × 25 = 125 kleine Felder) statt 9.765.625 × 15-mal denselben Modulo:
 *
 *   oben  = strip[(i − 1 + LAP) % LAP]
 *   mitte = strip[i]
 *   unten = strip[(i + 1) % LAP]
 *
 * Dieselbe Zuordnung benutzen reel.js und der CabinetProcessor. Sie ist die
 * Nahtstelle des ganzen Geräts: stimmt sie hier nicht, beweist das Skript
 * etwas anderes, als gespielt wird.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { LAP, LINES, PAYTABLE, REELS, ROWS, SCATTER, SYMBOLS, evaluate }
	from '../../Public/JavaScript/paytable.js';

const here = dirname(fileURLToPath(import.meta.url));
const RULES_PHP = resolve(here, '../../../Classes/Rules.php');

const TOTAL = LAP ** REELS;
const BAND_MIN = 0.970;
const BAND_MAX = 0.990;

/** Symbolzahlen je Walze, aus Anhang D / CONCEPT.md abgezählt. */
const EXPECTED_COUNTS = [
	{ sieben: 1, glocke: 2, weintraube: 2, melone: 2, pflaume: 3, orange: 4, zitrone: 5, kirsche: 5, scatter: 1 },
	{ sieben: 1, glocke: 1, weintraube: 2, melone: 3, pflaume: 3, orange: 4, zitrone: 5, kirsche: 5, scatter: 1 },
	{ sieben: 1, glocke: 2, weintraube: 2, melone: 3, pflaume: 3, orange: 4, zitrone: 4, kirsche: 5, scatter: 1 },
	{ sieben: 1, glocke: 2, weintraube: 3, melone: 3, pflaume: 3, orange: 4, zitrone: 4, kirsche: 4, scatter: 1 },
	{ sieben: 2, glocke: 2, weintraube: 2, melone: 3, pflaume: 3, orange: 4, zitrone: 4, kirsche: 4, scatter: 1 },
];

/**
 * Die vollständige Auszählung je Gewinnlinie (Anhang D, 4.2.4). "combinations"
 * ist die Zahl der Stellungen, "units" ihr Beitrag zur Auszahlung EINER
 * Linie in Einsatz-Einheiten (combinations × Faktor).
 */
const EXPECTED_LINE_ROWS = [
	{ symbol: 'sieben', length: 3, combinations: 600, units: 18000 },
	{ symbol: 'sieben', length: 4, combinations: 23, units: 4140 },
	{ symbol: 'sieben', length: 5, combinations: 2, units: 1800 },
	{ symbol: 'glocke', length: 3, combinations: 2300, units: 41400 },
	{ symbol: 'glocke', length: 4, combinations: 184, units: 18400 },
	{ symbol: 'glocke', length: 5, combinations: 16, units: 8000 },
	{ symbol: 'weintraube', length: 3, combinations: 4400, units: 52800 },
	{ symbol: 'weintraube', length: 4, combinations: 552, units: 33120 },
	{ symbol: 'weintraube', length: 5, combinations: 48, units: 14400 },
	{ symbol: 'melone', length: 3, combinations: 9900, units: 89100 },
	{ symbol: 'melone', length: 4, combinations: 1188, units: 47520 },
	{ symbol: 'melone', length: 5, combinations: 162, units: 32400 },
	{ symbol: 'pflaume', length: 3, combinations: 14850, units: 103950 },
	{ symbol: 'pflaume', length: 4, combinations: 1782, units: 53460 },
	{ symbol: 'pflaume', length: 5, combinations: 243, units: 29160 },
	{ symbol: 'orange', length: 3, combinations: 33600, units: 168000 },
	{ symbol: 'orange', length: 4, combinations: 5376, units: 96768 },
	{ symbol: 'orange', length: 5, combinations: 1024, units: 76800 },
	{ symbol: 'zitrone', length: 3, combinations: 52500, units: 157500 },
	{ symbol: 'zitrone', length: 4, combinations: 8400, units: 100800 },
	{ symbol: 'zitrone', length: 5, combinations: 1600, units: 80000 },
	{ symbol: 'kirsche', length: 2, combinations: 312500, units: 312500 },
	{ symbol: 'kirsche', length: 3, combinations: 65625, units: 131250 },
	{ symbol: 'kirsche', length: 4, combinations: 10500, units: 84000 },
	{ symbol: 'kirsche', length: 5, combinations: 2000, units: 60000 },
];

const EXPECTED_LINE_HITS = 529375;
const EXPECTED_LINE_UNITS = 1815268;

/** Die vollständige Auszählung des Scatters (Anhang D, 4.2.5). */
const EXPECTED_SCATTER_ROWS = [
	{ count: 3, combinations: 130680, units: 392040 },
	{ count: 4, combinations: 8910, units: 89100 },
	{ count: 5, combinations: 243, units: 12150 },
];

const EXPECTED_SCATTER_HITS = 139833;
const EXPECTED_SCATTER_UNITS = 493290;
const EXPECTED_TOTAL_UNITS = 9569630;
const EXPECTED_JACKPOT_COMBINATIONS = 10;

/**
 * Die acht Liniensymbole (ohne Scatter), von der niedrigsten zur höchsten
 * Wertigkeit. Kombinationszahlen streng fallend nach Gewinnwert (Anhang D,
 * 4.2.8): je wertvoller das Symbol, desto seltener die Kombination – die
 * Prüfung unten verlangt deshalb schlicht "jeder Nachbar größer als sein
 * Nachfolger".
 */
const ASCENDING_BY_VALUE = ['kirsche', 'zitrone', 'orange', 'pflaume', 'melone', 'weintraube', 'glocke', 'sieben'];

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
 * Liest die fünf Walzenbänder aus Classes/Rules.php – als Text, ohne PHP.
 *
 * Vorgehen: den Block der Konstanten STRIPS ausschneiden, darin die
 * innersten eckigen Klammern suchen (das sind genau die fünf Walzen, denn
 * tiefer verschachtelt wird dort nicht), und aus jeder die einfach
 * zitierten Wörter ziehen. Die Kommentarzeilen "// Walze 1 — …" enthalten
 * weder Klammern noch Anführungszeichen und stören deshalb nicht.
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
 * Liest Classes/Rules.php::DEFAULT_POSITIONS – als Text, ohne PHP.
 *
 * @returns {Promise<number[]>}
 */
async function readDefaultPositions() {
	const source = await readFile(RULES_PHP, 'utf8');
	const block = source.match(/public const DEFAULT_POSITIONS\s*=\s*\[([^\]]*)\];/);
	if (block === null) {
		throw new Error(`In ${RULES_PHP} ist keine Konstante DEFAULT_POSITIONS zu finden.`);
	}
	return [...block[1].matchAll(/\d+/g)].map((match) => Number(match[0]));
}

/**
 * Liest Classes/Rules.php::DEFAULT_GRID – als Text, ohne PHP.
 *
 * @returns {Promise<string[][]>}
 */
async function readDefaultGrid() {
	const source = await readFile(RULES_PHP, 'utf8');
	const block = source.match(/public const DEFAULT_GRID\s*=\s*\[([\s\S]*?)\n\s*\];/);
	if (block === null) {
		throw new Error(`In ${RULES_PHP} ist keine Konstante DEFAULT_GRID zu finden.`);
	}
	return [...block[1].matchAll(/\d+\s*=>\s*\[([^\]]*)\]/g)]
		.map((row) => [...row[1].matchAll(/'([^']+)'/g)].map((match) => match[1]));
}

/**
 * Liest Classes/Rules.php::PAYTABLE – als Text, ohne PHP.
 *
 * @returns {Promise<Record<string, Record<number, number|null>>>}
 */
async function readPhpPaytable() {
	const source = await readFile(RULES_PHP, 'utf8');
	const block = source.match(/public const PAYTABLE\s*=\s*\[([\s\S]*?)\n\s*\];/);
	if (block === null) {
		throw new Error(`In ${RULES_PHP} ist keine Konstante PAYTABLE zu finden.`);
	}

	const table = {};
	for (const row of block[1].matchAll(/'([a-z]+)'\s*=>\s*\[([^\]]*)\]/g)) {
		const symbol = row[1];
		const values = {};
		for (const entry of row[2].matchAll(/(\d+)\s*=>\s*(null|\d+)/g)) {
			values[Number(entry[1])] = entry[2] === 'null' ? null : Number(entry[2]);
		}
		table[symbol] = values;
	}
	return table;
}

/**
 * P-1…P-6: die vier baulichen Regeln je Band plus Bandgröße und
 * Symbolnamen. Bricht die Auszählung ab, wenn eine dieser Prüfungen
 * fehlschlägt – eine Auszählung falscher Bänder liefert nur eine
 * überzeugend aussehende falsche Zahl.
 *
 * @param {string[][]} strips
 * @returns {void}
 */
function checkStrips(strips) {
	console.log('\nP-1…P-6  Die fünf Walzenbänder (Quelle: Classes/Rules.php, als Text gelesen)');

	check(strips.length === REELS, `P-1  fünf Walzenbänder gefunden (${strips.length})`);
	if (strips.length !== REELS) {
		return;
	}

	for (let reel = 0; reel < REELS; reel++) {
		const strip = strips[reel];

		check(strip.length === LAP, `P-1  Walze ${reel + 1}: ${strip.length} Rasterpositionen (erwartet ${LAP})`);

		const unknown = strip.filter((name) => !SYMBOLS.includes(name));
		check(unknown.length === 0, `P-2  Walze ${reel + 1}: nur bekannte Symbolnamen`
			+ (unknown.length === 0 ? '' : ` – unbekannt: ${[...new Set(unknown)].join(', ')}`));

		const counted = {};
		for (const name of strip) {
			counted[name] = (counted[name] ?? 0) + 1;
		}
		const expected = EXPECTED_COUNTS[reel];
		const wrong = Object.keys(expected).filter((name) => (counted[name] ?? 0) !== expected[name]);
		check(wrong.length === 0, `P-3  Walze ${reel + 1}: Symbolzahlen wie erwartet`
			+ (wrong.length === 0 ? '' : ` – abweichend: ${wrong.join(', ')}`));

		const neighbours = strip.filter((name, i) => name === strip[(i + 1) % strip.length]);
		check(neighbours.length === 0, `P-4  Walze ${reel + 1}: keine zwei gleichen Symbole nebeneinander`
			+ ' (Rundumschluss eingeschlossen)');

		const scatterCount = strip.filter((name) => name === SCATTER).length;
		check(scatterCount === 1, `P-5  Walze ${reel + 1}: genau ein Scatter (${scatterCount})`);

		const ranked = SYMBOLS.filter((name) => name !== SCATTER);
		let strictlyIncreasing = true;
		for (let i = 0; i < ranked.length - 1; i++) {
			if (!((counted[ranked[i]] ?? 0) <= (counted[ranked[i + 1]] ?? 0))) {
				strictlyIncreasing = false;
			}
		}
		check(strictlyIncreasing, `P-6  Walze ${reel + 1}: Symbolzahlen wachsen entlang der Rangfolge`);
	}
}

/**
 * P-7: Classes/Rules.php::PAYTABLE ≡ paytable.js::PAYTABLE, Wert für Wert,
 * in beide Richtungen.
 *
 * @param {Record<string, Record<number, number|null>>} phpTable
 * @returns {void}
 */
function checkPaytableParity(phpTable) {
	console.log('\nP-7  Rules::PAYTABLE ≡ paytable.js PAYTABLE, Wert für Wert');

	const abweichungen = [];
	for (const symbol of SYMBOLS) {
		for (const length of [2, 3, 4, 5]) {
			const phpValue = phpTable[symbol]?.[length] ?? null;
			const jsValue = PAYTABLE[symbol]?.[length] ?? null;
			if (phpValue !== jsValue) {
				abweichungen.push(`${symbol}[${length}]: PHP=${phpValue} JS=${jsValue}`);
			}
		}
	}
	check(abweichungen.length === 0, 'beide Tabellen stimmen überein', ...abweichungen);
}

/**
 * P-8: DEFAULT_POSITIONS in 0…22, und Position i−1/i/i+1 jeder Walze ergibt
 * von oben nach unten genau die Spalte dieser Walze aus DEFAULT_GRID.
 *
 * @param {string[][]} strips
 * @param {number[]} positions
 * @param {string[][]} grid
 * @returns {void}
 */
function checkDefaultGridOnStrips(strips, positions, grid) {
	console.log('\nP-8  DEFAULT_POSITIONS liegt auf dem Band und ergibt DEFAULT_GRID');

	check(positions.length === REELS, `DEFAULT_POSITIONS nennt ${positions.length} Werte (erwartet ${REELS})`);
	check(grid.length === ROWS && grid.every((row) => row.length === REELS),
		`DEFAULT_GRID ist ${ROWS} × ${REELS}`);

	const abweichungen = [];
	for (let reel = 0; reel < REELS; reel++) {
		const position = positions[reel];
		if (position < 0 || position > LAP - 3) {
			abweichungen.push(`Walze ${reel + 1}: Position ${position} liegt nicht in 0…${LAP - 3}`);
			continue;
		}
		for (let row = 0; row < ROWS; row++) {
			const strip = strips[reel];
			const symbolOnStrip = strip[(position - 1 + row + LAP) % LAP];
			const symbolInGrid = grid[row]?.[reel];
			if (symbolOnStrip !== symbolInGrid) {
				abweichungen.push(
					`Walze ${reel + 1}, Zeile ${row}: Band zeigt „${symbolOnStrip}", `
					+ `DEFAULT_GRID nennt „${symbolInGrid}"`
				);
			}
		}
	}
	check(abweichungen.length === 0, 'jede Walze zeigt an ihrer DEFAULT_POSITIONS-Position genau die Spalte aus'
		+ ' DEFAULT_GRID', ...abweichungen);
}

/**
 * Zählt alle 9.765.625 Walzenstellungen vollständig aus – mit derselben
 * Auswertung, mit der der Browser spielt.
 *
 * @param {string[][]} strips
 * @returns {{
 *   singleLineCounts: Map<string, Map<number, {combinations: number, units: number}>>,
 *   lineHitsByIndex: number[],
 *   lineHitsTotal: number,
 *   lineUnitsTotal: number,
 *   scatterCounts: Map<number, number>,
 *   scatterHits: number,
 *   scatterUnits: number,
 *   totalUnits: number,
 *   blanks: number,
 *   jackpotCombinations: number,
 * }}
 */
function enumerate(strips) {
	/** Je Walze und Stopposition die drei sichtbaren Symbole EINMAL ausrechnen. */
	const columns = strips.map((strip) => {
		const rows = [];
		for (let position = 0; position < LAP; position++) {
			rows.push([
				strip[(position - 1 + LAP) % LAP],
				strip[position],
				strip[(position + 1) % LAP],
			]);
		}
		return rows;
	});

	// Anhang D, 4.2.4 zählt JE LINIE aus – Satz 4.2.2 sagt voraus, dass alle
	// fünf Linien denselben Beitrag liefern. Gebucht wird deshalb nur die
	// EINE erste Linie (Index 1); P-11 bestätigt anschließend empirisch, dass
	// lineHitsByIndex für alle fünf Linien gleich ist.
	const singleLineCounts = new Map(
		SYMBOLS.map((symbol) => [symbol, new Map([[2, { combinations: 0, units: 0 }], [3, { combinations: 0, units: 0 }],
			[4, { combinations: 0, units: 0 }], [5, { combinations: 0, units: 0 }]])])
	);
	const lineHitsByIndex = new Array(LINES.length).fill(0);
	let lineHitsTotal = 0;
	let lineUnitsTotal = 0;

	const scatterCounts = new Map([[3, 0], [4, 0], [5, 0]]);
	let scatterHits = 0;
	let scatterUnits = 0;

	let totalUnits = 0;
	let blanks = 0;
	let jackpotCombinations = 0;

	const grid = [new Array(REELS), new Array(REELS), new Array(REELS)];

	function setReel(reel, column) {
		grid[0][reel] = column[0];
		grid[1][reel] = column[1];
		grid[2][reel] = column[2];
	}

	for (let p0 = 0; p0 < LAP; p0++) {
		setReel(0, columns[0][p0]);
		for (let p1 = 0; p1 < LAP; p1++) {
			setReel(1, columns[1][p1]);
			for (let p2 = 0; p2 < LAP; p2++) {
				setReel(2, columns[2][p2]);
				for (let p3 = 0; p3 < LAP; p3++) {
					setReel(3, columns[3][p3]);
					for (let p4 = 0; p4 < LAP; p4++) {
						setReel(4, columns[4][p4]);

						const result = evaluate(grid);

						if (result.factor === 0) {
							blanks++;
						}
						totalUnits += result.factor;

						for (const hit of result.lines) {
							lineHitsByIndex[hit.index - 1]++;
							lineHitsTotal++;
							lineUnitsTotal += hit.factor;
							if (hit.index === 1) {
								const bucket = singleLineCounts.get(hit.symbol).get(hit.length);
								bucket.combinations++;
								bucket.units += hit.factor;
							}
							if (hit.symbol === 'sieben' && hit.length === REELS) {
								jackpotCombinations++;
							}
						}

						if (result.scatter !== null) {
							scatterHits++;
							scatterUnits += result.scatter.factor;
							scatterCounts.set(
								result.scatter.count,
								(scatterCounts.get(result.scatter.count) ?? 0) + 1
							);
						}
					}
				}
			}
		}
	}

	return {
		singleLineCounts, lineHitsByIndex, lineHitsTotal, lineUnitsTotal,
		scatterCounts, scatterHits, scatterUnits,
		totalUnits, blanks, jackpotCombinations,
	};
}

/**
 * @param {number} value
 * @returns {string} Anteil an TOTAL, fünf Nachkommastellen, deutsches Komma
 */
function share(value) {
	return (value / TOTAL).toFixed(5).replace('.', ',');
}

/**
 * @param {ReturnType<typeof enumerate>} result
 * @returns {void}
 */
function report(result) {
	console.log(`\nVollständige Auszählung aller ${TOTAL.toLocaleString('de-DE')} Walzenstellungen`);

	console.log('\nBeitrag je Gewinnlinie (Anhang D, 4.2.4) – ausgezählt an der ersten Linie,');
	console.log('P-11 bestätigt anschließend, dass alle fünf Linien gleich oft treffen');
	console.log('  Symbol      Länge  Kombinationen  Einheiten');
	for (const expected of EXPECTED_LINE_ROWS) {
		const bucket = result.singleLineCounts.get(expected.symbol).get(expected.length);
		console.log(
			`  ${expected.symbol.padEnd(10)}  ${String(expected.length).padStart(4)}`
			+ `  ${String(bucket.combinations).padStart(13)}  ${String(bucket.units).padStart(9)}`
		);
	}

	console.log('\nAbgleich mit Anhang D (ganzzahlig, keine Kommazahlen im Vergleich)');
	for (const expected of EXPECTED_LINE_ROWS) {
		const bucket = result.singleLineCounts.get(expected.symbol).get(expected.length);
		check(
			bucket.combinations === expected.combinations && bucket.units === expected.units,
			`P-10  ${expected.symbol} × ${expected.length}: ${bucket.combinations} Kombinationen `
			+ `(erwartet ${expected.combinations}), ${bucket.units} Einheiten (erwartet ${expected.units})`
		);
	}

	check(result.lineHitsByIndex[0] === EXPECTED_LINE_HITS,
		`P-13  Trefferzahl je Linie: ${result.lineHitsByIndex[0]} (erwartet ${EXPECTED_LINE_HITS})`);
	const singleLineUnits = [...result.singleLineCounts.values()]
		.flatMap((byLength) => [...byLength.values()])
		.reduce((sum, bucket) => sum + bucket.units, 0);
	check(singleLineUnits === EXPECTED_LINE_UNITS,
		`P-13  Beitrag je Linie: ${singleLineUnits} (erwartet ${EXPECTED_LINE_UNITS})`);

	console.log('\nP-11  Alle fünf Linien liefern denselben Beitrag');
	check(result.lineHitsByIndex.every((count) => count === result.lineHitsByIndex[0]),
		`jede der fünf Linien trifft gleich oft: ${result.lineHitsByIndex.join(', ')}`);

	console.log('\nScatter-Verteilung (Anhang D, 4.2.5)');
	console.log('  Anzahl  Kombinationen  Einheiten');
	for (const expected of EXPECTED_SCATTER_ROWS) {
		const combinations = result.scatterCounts.get(expected.count) ?? 0;
		const units = combinations * PAYTABLE[SCATTER][expected.count];
		console.log(`  ${String(expected.count).padStart(6)}  ${String(combinations).padStart(13)}  ${String(units).padStart(9)}`);
		check(
			combinations === expected.combinations && units === expected.units,
			`P-12  Scatter × ${expected.count}: ${combinations} Kombinationen (erwartet ${expected.combinations}), `
			+ `${units} Einheiten (erwartet ${expected.units})`
		);
	}
	check(result.scatterHits === EXPECTED_SCATTER_HITS,
		`P-12  Scatter-Trefferzahl: ${result.scatterHits} (erwartet ${EXPECTED_SCATTER_HITS})`);
	check(result.scatterUnits === EXPECTED_SCATTER_UNITS,
		`P-12  Scatter-Anteil: ${result.scatterUnits} (erwartet ${EXPECTED_SCATTER_UNITS})`);

	check(result.totalUnits === EXPECTED_TOTAL_UNITS,
		`P-13  Gesamteinheiten: ${result.totalUnits} (erwartet ${EXPECTED_TOTAL_UNITS})`);

	const quote = result.totalUnits / TOTAL;
	check(quote >= BAND_MIN && quote <= BAND_MAX,
		`P-14  Auszahlungsquote ${quote.toFixed(6).replace('.', ',')} liegt im Band `
		+ `${BAND_MIN.toFixed(3).replace('.', ',')}–${BAND_MAX.toFixed(3).replace('.', ',')}`);

	console.log('\nP-15  Kombinationszahlen streng fallend nach Gewinnwert, je Kettenlänge');
	for (const length of [3, 4, 5]) {
		let strictlyDescending = true;
		const values = ASCENDING_BY_VALUE.map((symbol) => result.singleLineCounts.get(symbol).get(length).combinations);
		for (let i = 0; i < values.length - 1; i++) {
			if (!(values[i] > values[i + 1])) {
				strictlyDescending = false;
			}
		}
		check(strictlyDescending, `Länge ${length}: ${ASCENDING_BY_VALUE.join(' > ')} → `
			+ values.join(' > '));
	}

	check(result.jackpotCombinations === EXPECTED_JACKPOT_COMBINATIONS,
		`P-16  Stellungen mit fünf Sieben auf einer Linie: ${result.jackpotCombinations} `
		+ `(erwartet ${EXPECTED_JACKPOT_COMBINATIONS})`);

	console.log('\nKennzahlen (Anhang D „Nachzuweisen")');
	console.log(`  Stellungen                    ${TOTAL.toLocaleString('de-DE')}`);
	console.log(`  Auszahlung                    ${result.totalUnits.toLocaleString('de-DE')} Einheiten`);
	console.log(`  Auszahlungsquote               ${quote.toFixed(6).replace('.', ',')}`);
	console.log(`  Beitrag je Linie                ${share(singleLineUnits)}`);
	console.log(`  Beitrag aller fünf Linien       ${share(result.lineUnitsTotal)}`);
	console.log(`  Scatter-Anteil                  ${share(result.scatterUnits)}`);
	console.log(`  Trefferhäufigkeit je Linie       ${share(result.lineHitsByIndex[0])}`);
	console.log(`  Trefferhäufigkeit Scatter        ${share(result.scatterHits)}`);
	console.log(`  Runden ohne Gewinn               ${share(result.blanks)}  (${result.blanks.toLocaleString('de-DE')})`);
	console.log(`  Trefferhäufigkeit je Runde       ${share(TOTAL - result.blanks)}`);
	console.log(`  Jackpot                         1 zu ${(TOTAL / result.jackpotCombinations).toLocaleString('de-DE')}`);
}

const strips = await readStrips();
checkStrips(strips);

const phpTable = await readPhpPaytable();
checkPaytableParity(phpTable);

const positions = await readDefaultPositions();
const grid = await readDefaultGrid();
checkDefaultGridOnStrips(strips, positions, grid);

if (failed) {
	console.log('\nAbgebrochen: die Bänder, die Gewinntabelle oder die Grundstellung stimmen nicht.');
	process.exit(1);
}

report(enumerate(strips));

console.log(failed
	? '\nERGEBNIS: mindestens eine Kennzahl weicht von Anhang D ab.'
	: '\nERGEBNIS: alle Kennzahlen aus Anhang D nachgewiesen.');

process.exit(failed ? 1 : 0);
