/**
 * Video Slot – das Regelwerk als ausführbares Modul
 * ==================================================
 *
 * Die EINZIGE Quelle der Spielregeln, zweimal benutzt: vom Browser (Spielkern
 * ab Phase 6) und von Resources/Private/Scripts/verify-payout.mjs. Dieselben
 * Zahlen stehen zusätzlich in Classes/Rules.php (PHP kann kein JavaScript
 * importieren); verify-payout.mjs vergleicht beide Tabellen Wert für Wert.
 *
 * KEIN einziger import: Node kennt die Import-Map von TYPO3 nicht und könnte
 * einen Namen wie '@phomo17/…' nicht auflösen. Kein DOM, kein deutscher Text
 * – Text gehört in die Sprachdatei, nicht hierher.
 *
 * Anhang D (CONCEPT.md):
 *   - fünf feste Gewinnlinien, alle immer aktiv, Gleiche von links;
 *   - die Kirsche zahlt schon ab zwei gleichen, alle anderen erst ab drei;
 *   - der Scatter zählt unabhängig von den Linien, überall im Feld, ab drei;
 *   - der Scatter ist KEIN Liniensymbol – ihn zusätzlich als Linienkette zu
 *     werten hieße, ihn zweimal zu bezahlen.
 */

/** Sichtbare Zeilen, von oben (0) nach unten (2). */
export const ROWS = 3;

/** Walzen, von links (1) nach rechts (5). */
export const REELS = 5;

/** Rasterpositionen je Walze (Classes/Rules.php::POSITIONS_PER_STRIP). */
export const LAP = 25;

/** Das Symbol, das unabhängig von den Linien zahlt. */
export const SCATTER = 'scatter';

/** So oft muss der Scatter im Feld liegen, damit er zahlt. */
export const SCATTER_MIN = 3;

/** Das Symbol, dem schon zwei gleiche genügen. */
export const SHORT_CHAIN = 'kirsche';

/**
 * Die fünf festen Gewinnlinien aus Anhang D. Je Linie fünf Zeilennummern,
 * eine je Walze, von links nach rechts. Alle fünf sind immer aktiv.
 */
export const LINES = Object.freeze([
	Object.freeze({ index: 1, rows: Object.freeze([1, 1, 1, 1, 1]) }),
	Object.freeze({ index: 2, rows: Object.freeze([0, 0, 0, 0, 0]) }),
	Object.freeze({ index: 3, rows: Object.freeze([2, 2, 2, 2, 2]) }),
	Object.freeze({ index: 4, rows: Object.freeze([0, 0, 1, 2, 2]) }),
	Object.freeze({ index: 5, rows: Object.freeze([2, 2, 1, 0, 0]) }),
]);

/**
 * Gewinnwerte je Symbol und Kettenlänge, bezogen auf Einsatz 1. Identisch zu
 * Classes/Rules.php::PAYTABLE – dort mit den ebenfalls dauerhaft leeren
 * Länge-2-Einträgen der übrigen Symbole, hier ohne sie, weil evaluateLine()
 * nie nach einer nicht vorgesehenen Länge fragt.
 */
export const PAYTABLE = Object.freeze({
	sieben:     Object.freeze({ 3: 30, 4: 180, 5: 900 }),
	glocke:     Object.freeze({ 3: 18, 4: 100, 5: 500 }),
	weintraube: Object.freeze({ 3: 12, 4:  60, 5: 300 }),
	melone:     Object.freeze({ 3:  9, 4:  40, 5: 200 }),
	pflaume:    Object.freeze({ 3:  7, 4:  30, 5: 120 }),
	orange:     Object.freeze({ 3:  5, 4:  18, 5:  75 }),
	zitrone:    Object.freeze({ 3:  3, 4:  12, 5:  50 }),
	kirsche:    Object.freeze({ 2:  1, 3:   2, 4:   8, 5: 30 }),
	scatter:    Object.freeze({ 3:  3, 4:  10, 5:  50 }),
});

/** Abgeleitet statt abgeschrieben: die Schlüssel der Tabelle SIND die Symbole. */
export const SYMBOLS = Object.freeze(Object.keys(PAYTABLE));

/**
 * Ab welcher Kettenlänge ein Symbol überhaupt zahlt.
 *
 * @param {string} symbol
 * @returns {number}
 */
export function minChain(symbol) {
	return symbol === SHORT_CHAIN ? 2 : 3;
}

/**
 * Wertet eine einzelne Gewinnlinie aus: das erste Symbol (Walze 1) legt fest,
 * wonach gesucht wird; die Kette bricht am ersten Abweichler ab.
 *
 * @param {string[][]} grid Drei Zeilen zu je fünf Symbolnamen.
 * @param {{index: number, rows: number[]}} line
 * @returns {{index: number, symbol: string, length: number, factor: number, cells: number[][]}|null}
 */
export function evaluateLine(grid, line) {
	const first = grid[line.rows[0]][0];
	if (first === SCATTER) {
		return null; // Scatter ist kein Liniensymbol.
	}

	let length = 1;
	while (length < REELS && grid[line.rows[length]][length] === first) {
		length++;
	}

	if (length < minChain(first)) {
		return null;
	}

	const factor = PAYTABLE[first]?.[length] ?? 0;
	if (factor === 0) {
		return null;
	}

	const cells = [];
	for (let reel = 0; reel < length; reel++) {
		cells.push(Object.freeze([line.rows[reel], reel]));
	}

	return Object.freeze({ index: line.index, symbol: first, length, factor, cells: Object.freeze(cells) });
}

/**
 * Wertet den Scatter aus: zählt alle Vorkommen im ganzen Feld, unabhängig von
 * Zeile oder Linie.
 *
 * @param {string[][]} grid
 * @returns {{count: number, factor: number, cells: number[][]}|null}
 */
export function evaluateScatter(grid) {
	const cells = [];
	for (let row = 0; row < ROWS; row++) {
		for (let reel = 0; reel < REELS; reel++) {
			if (grid[row][reel] === SCATTER) {
				cells.push(Object.freeze([row, reel]));
			}
		}
	}

	if (cells.length < SCATTER_MIN) {
		return null;
	}

	const factor = PAYTABLE[SCATTER][Math.min(cells.length, REELS)] ?? 0;
	return factor === 0 ? null : Object.freeze({ count: cells.length, factor, cells: Object.freeze(cells) });
}

/**
 * Wertet ein vollständiges Sichtfeld aus: alle fünf Linien plus den Scatter.
 * `factor` ist die Summe aller Faktoren; der Betrag ist `factor × Einsatz`.
 * Weil der Einsatz laut Anhang D für alle fünf Linien ZUSAMMEN gilt, rechnet
 * der Scatter mit derselben Multiplikation wie die Linien.
 *
 * @param {string[][]} grid Drei Zeilen zu je fünf Symbolnamen.
 * @returns {{factor: number, lines: object[], scatter: object|null}}
 */
export function evaluate(grid) {
	if (
		!Array.isArray(grid) || grid.length !== ROWS
		|| grid.some((row) => !Array.isArray(row) || row.length !== REELS)
	) {
		throw new TypeError('evaluate() erwartet drei Zeilen zu je fünf Symbolnamen.');
	}

	const lines = [];
	let factor = 0;

	for (const line of LINES) {
		const hit = evaluateLine(grid, line);
		if (hit !== null) {
			lines.push(hit);
			factor += hit.factor;
		}
	}

	const scatter = evaluateScatter(grid);
	if (scatter !== null) {
		factor += scatter.factor;
	}

	return Object.freeze({ factor, lines: Object.freeze(lines), scatter });
}

export default evaluate;
