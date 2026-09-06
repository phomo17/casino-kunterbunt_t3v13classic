/**
 * FruitRisk – das Regelwerk als ausführbares Modul
 * =================================================
 *
 * Die Regeln aus CONCEPT.md C.14.7, zweimal benutzt: vom Spielkern im
 * Browser (ab Phase F4) und von
 * Resources/Private/Scripts/verify-payout.mjs. Dieselben Zahlen stehen
 * zusätzlich in Classes/Rules.php, weil PHP kein JavaScript importieren
 * kann; verify-payout.mjs vergleicht beide Tabellen Wert für Wert in beide
 * Richtungen.
 *
 * KEIN einziger import: Node kennt die Import-Map von TYPO3 nicht. Kein
 * DOM, kein deutscher Text — Text gehört in die Sprachdatei.
 *
 * Die Walzenbänder stehen NICHT hier. Sie sind eine Eigenschaft des
 * Geräts, nicht der Regeln, und kommen aus Classes/Rules.php: beim
 * Prüfskript als Text gelesen, im Browser ab Phase F4 als data-Attribut am
 * Gehäuse. So gibt es die Bänder genau einmal.
 *
 * ZWEI GEWINNWEGE, DIE SICH ADDIEREN (C.14.7):
 *   Weg 1  Feldzählung der drei kleinen Früchte, ohne Rücksicht auf Linien,
 *          je Frucht die Treppe 2->1, 3->2, 4->3, 5->4, ab 6->5. Höchstens
 *          15 je Runde.
 *   Weg 2  30 feste Linien, von links ab drei gleichen, lückenlos, für alle
 *          zwölf Symbole. Höchster Einzelwert 100.
 * Beide addieren sich, auch wenn dieselbe Frucht auf beiden trifft. Auf den
 * Rundengewinn gibt es KEINEN Deckel.
 */

/** Sichtbare Zeilen, von oben (0) nach unten (4). */
export const ROWS = 5;

/** Walzen, von links (1) nach rechts (6). */
export const REELS = 6;

/** Rasterpositionen je Walze (Classes/Rules.php::POSITIONS_PER_STRIP). */
export const LAP = 20;

/** Fester Einsatz einer Runde. */
export const STAKE = 10;

/** Ab so vielen gleichen zahlt eine Linie. */
export const MIN_CHAIN = 3;

/** Die drei kleinen Früchte des Feldwegs. */
export const SMALL_FRUITS = Object.freeze(['kirsche', 'zitrone', 'orange']);

/** Die neun Liniensymbole (Bandregel 3 gilt nur für sie). */
export const LINE_SYMBOLS = Object.freeze([
	'sieben', 'glocke', 'ananas', 'apfel', 'banane',
	'erdbeere', 'weintraube', 'melone', 'pflaume',
]);

/** Die Feldtreppe je kleiner Frucht. Ab FIELD_CAP_AT Stück ist bei 5 Schluss. */
export const FIELD_LADDER = Object.freeze({ 2: 1, 3: 2, 4: 3, 5: 4 });

/** Ab dieser Stückzahl gilt der Deckel. */
export const FIELD_CAP_AT = 6;

/** Der Deckelwert der Feldtreppe. */
export const FIELD_CAP_VALUE = 5;

/** Höchster Feldgewinn einer Runde: drei Früchte x Deckel. */
export const FIELD_MAX = 15;

/** Der höchste Wert, den EINE Linie haben darf. */
export const MAX_LINE_VALUE = 100;

/**
 * Die 30 festen Gewinnlinien, identisch zu Classes/Rules.php::LINES.
 * Je Linie sechs Zeilennummern, eine je Walze, von links nach rechts.
 * Erzeugungsregel: sechs Formen x fünf Verschiebungen, siehe Rules.php.
 */
export const LINES = Object.freeze([
	Object.freeze({ index: 1,  rows: Object.freeze([0, 0, 0, 0, 0, 0]) }),
	Object.freeze({ index: 2,  rows: Object.freeze([1, 1, 1, 1, 1, 1]) }),
	Object.freeze({ index: 3,  rows: Object.freeze([2, 2, 2, 2, 2, 2]) }),
	Object.freeze({ index: 4,  rows: Object.freeze([3, 3, 3, 3, 3, 3]) }),
	Object.freeze({ index: 5,  rows: Object.freeze([4, 4, 4, 4, 4, 4]) }),
	Object.freeze({ index: 6,  rows: Object.freeze([0, 1, 2, 2, 1, 0]) }),
	Object.freeze({ index: 7,  rows: Object.freeze([1, 2, 3, 3, 2, 1]) }),
	Object.freeze({ index: 8,  rows: Object.freeze([2, 3, 4, 4, 3, 2]) }),
	Object.freeze({ index: 9,  rows: Object.freeze([3, 4, 0, 0, 4, 3]) }),
	Object.freeze({ index: 10, rows: Object.freeze([4, 0, 1, 1, 0, 4]) }),
	Object.freeze({ index: 11, rows: Object.freeze([0, 4, 3, 3, 4, 0]) }),
	Object.freeze({ index: 12, rows: Object.freeze([1, 0, 4, 4, 0, 1]) }),
	Object.freeze({ index: 13, rows: Object.freeze([2, 1, 0, 0, 1, 2]) }),
	Object.freeze({ index: 14, rows: Object.freeze([3, 2, 1, 1, 2, 3]) }),
	Object.freeze({ index: 15, rows: Object.freeze([4, 3, 2, 2, 3, 4]) }),
	Object.freeze({ index: 16, rows: Object.freeze([0, 1, 0, 4, 0, 1]) }),
	Object.freeze({ index: 17, rows: Object.freeze([1, 2, 1, 0, 1, 2]) }),
	Object.freeze({ index: 18, rows: Object.freeze([2, 3, 2, 1, 2, 3]) }),
	Object.freeze({ index: 19, rows: Object.freeze([3, 4, 3, 2, 3, 4]) }),
	Object.freeze({ index: 20, rows: Object.freeze([4, 0, 4, 3, 4, 0]) }),
	Object.freeze({ index: 21, rows: Object.freeze([0, 4, 0, 1, 0, 4]) }),
	Object.freeze({ index: 22, rows: Object.freeze([1, 0, 1, 2, 1, 0]) }),
	Object.freeze({ index: 23, rows: Object.freeze([2, 1, 2, 3, 2, 1]) }),
	Object.freeze({ index: 24, rows: Object.freeze([3, 2, 3, 4, 3, 2]) }),
	Object.freeze({ index: 25, rows: Object.freeze([4, 3, 4, 0, 4, 3]) }),
	Object.freeze({ index: 26, rows: Object.freeze([0, 1, 2, 1, 0, 4]) }),
	Object.freeze({ index: 27, rows: Object.freeze([1, 2, 3, 2, 1, 0]) }),
	Object.freeze({ index: 28, rows: Object.freeze([2, 3, 4, 3, 2, 1]) }),
	Object.freeze({ index: 29, rows: Object.freeze([3, 4, 0, 4, 3, 2]) }),
	Object.freeze({ index: 30, rows: Object.freeze([4, 0, 1, 0, 4, 3]) }),
]);

/**
 * Gewinnwerte je Symbol und Kettenlänge, als absolute Kredite bei festem
 * Einsatz 10. Identisch zu Classes/Rules.php::PAYTABLE. Die Reihenfolge der
 * Schlüssel IST die Rangfolge von hoch nach niedrig.
 */
export const PAYTABLE = Object.freeze({
	sieben:     Object.freeze({ 3: 57, 4: 71, 5: 86, 6: 100 }),
	glocke:     Object.freeze({ 3: 51, 4: 64, 5: 77, 6:  90 }),
	ananas:     Object.freeze({ 3: 42, 4: 57, 5: 70, 6:  85 }),
	apfel:      Object.freeze({ 3: 37, 4: 52, 5: 64, 6:  79 }),
	banane:     Object.freeze({ 3: 34, 4: 47, 5: 58, 6:  71 }),
	erdbeere:   Object.freeze({ 3: 30, 4: 42, 5: 52, 6:  66 }),
	weintraube: Object.freeze({ 3: 27, 4: 37, 5: 48, 6:  60 }),
	melone:     Object.freeze({ 3: 25, 4: 34, 5: 44, 6:  54 }),
	pflaume:    Object.freeze({ 3: 21, 4: 30, 5: 39, 6:  51 }),
	orange:     Object.freeze({ 3: 20, 4: 27, 5: 36, 6:  47 }),
	zitrone:    Object.freeze({ 3: 18, 4: 25, 5: 32, 6:  44 }),
	kirsche:    Object.freeze({ 3: 16, 4: 21, 5: 30, 6:  42 }),
});

/** Abgeleitet statt abgeschrieben: die Schlüssel der Tabelle SIND die Symbole. */
export const SYMBOLS = Object.freeze(Object.keys(PAYTABLE));

/**
 * Der Gewinn einer einzelnen kleinen Frucht nach ihrer Stückzahl im Feld.
 *
 * @param {number} count
 * @returns {number}
 */
export function fieldStep(count) {
	if (count >= FIELD_CAP_AT) {
		return FIELD_CAP_VALUE;
	}
	return FIELD_LADDER[count] ?? 0;
}

/**
 * Wertet eine einzelne Gewinnlinie aus: das Symbol auf Walze 1 legt fest,
 * wonach gesucht wird; die Kette bricht am ersten Abweichler ab.
 *
 * @param {string[][]} grid Fünf Zeilen zu je sechs Symbolnamen.
 * @param {{index: number, rows: number[]}} line
 * @returns {{index: number, symbol: string, length: number, amount: number, cells: number[][]}|null}
 */
export function evaluateLine(grid, line) {
	const first = grid[line.rows[0]][0];

	let length = 1;
	while (length < REELS && grid[line.rows[length]][length] === first) {
		length++;
	}

	if (length < MIN_CHAIN) {
		return null;
	}

	const amount = PAYTABLE[first]?.[length] ?? 0;
	if (amount === 0) {
		return null;
	}

	const cells = [];
	for (let reel = 0; reel < length; reel++) {
		cells.push(Object.freeze([line.rows[reel], reel]));
	}

	return Object.freeze({ index: line.index, symbol: first, length, amount, cells: Object.freeze(cells) });
}

/**
 * Wertet den Feldweg aus: zählt jede der drei kleinen Früchte EINZELN im
 * ganzen Sichtfeld und addiert ihre Treppenwerte.
 *
 * @param {string[][]} grid
 * @returns {{amount: number, counts: Record<string, number>, parts: Record<string, number>}}
 */
export function evaluateField(grid) {
	const counts = {};
	const parts = {};
	for (const fruit of SMALL_FRUITS) {
		counts[fruit] = 0;
	}

	for (let row = 0; row < ROWS; row++) {
		for (let reel = 0; reel < REELS; reel++) {
			const symbol = grid[row][reel];
			if (symbol in counts) {
				counts[symbol]++;
			}
		}
	}

	let amount = 0;
	for (const fruit of SMALL_FRUITS) {
		parts[fruit] = fieldStep(counts[fruit]);
		amount += parts[fruit];
	}

	return Object.freeze({ amount, counts: Object.freeze(counts), parts: Object.freeze(parts) });
}

/**
 * Wertet ein vollständiges Sichtfeld aus: alle 30 Linien plus die
 * Feldzählung. `amount` ist die Summe beider Wege in Krediten — KEIN
 * Deckel, ein gekappter Gewinn wäre eine stille Lüge (C.14.7).
 *
 * @param {string[][]} grid Fünf Zeilen zu je sechs Symbolnamen.
 * @returns {{amount: number, lineAmount: number, fieldAmount: number, lines: object[], field: object}}
 */
export function evaluate(grid) {
	if (
		!Array.isArray(grid) || grid.length !== ROWS
		|| grid.some((row) => !Array.isArray(row) || row.length !== REELS)
	) {
		throw new TypeError('evaluate() erwartet fünf Zeilen zu je sechs Symbolnamen.');
	}

	const lines = [];
	let lineAmount = 0;

	for (const line of LINES) {
		const hit = evaluateLine(grid, line);
		if (hit !== null) {
			lines.push(hit);
			lineAmount += hit.amount;
		}
	}

	const field = evaluateField(grid);

	return Object.freeze({
		amount: lineAmount + field.amount,
		lineAmount,
		fieldAmount: field.amount,
		lines: Object.freeze(lines),
		field,
	});
}

export default evaluate;
