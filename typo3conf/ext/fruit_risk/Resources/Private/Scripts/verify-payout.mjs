/**
 * FruitRisk – Nachweis der Auszahlungsmathematik
 * =================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website; ändert keine Datei.
 * Prüft Classes/Rules.php gegen die sieben Bandregeln, die Gewinntabelle,
 * die 30 Gewinnlinien und — im vollen Lauf — gegen die vollständige
 * Auszählung aller 20⁶ = 64.000.000 Walzenstellungen (CONCEPT.md C.14.7,
 * C.14.8; PLAN-fruitrisk-f3-mathematik, Teil 1, Abschnitt 4a.0).
 *
 *
 * AUSFÜHRUNG
 * ----------
 *   ddev exec node typo3conf/ext/fruit_risk/Resources/Private/Scripts/verify-payout.mjs --schnell
 *   ddev exec node typo3conf/ext/fruit_risk/Resources/Private/Scripts/verify-payout.mjs
 *
 * `--schnell` (unter einer Sekunde): alle Struktur- und Tabellenprüfungen
 * (P-1…P-10), die geschlossene Form der Quote und der exakten
 * Feldverteilung (P-11) sowie der Markup-Abgleich der Grundstellung
 * (P-17) — nichts davon braucht die volle Auszählung. Ein Agentenlauf darf
 * diese Betriebsart jederzeit selbst starten.
 *
 * Ohne Schalter: zusätzlich P-12…P-16 und P-18, die alle die VOLLSTÄNDIGE
 * Auszählung aller 64.000.000 Stellungen brauchen. Erwartete Laufzeit:
 * unter einer Minute bis wenige Minuten (Obergrenze aus C.14.8: zehn
 * Minuten). DIESER LAUF GEHÖRT DER HAUPTSITZUNG (Messlauf F3-M2) — ein
 * Agentenlauf startet ihn nicht selbst, siehe Auftrag.
 *
 * Rückgabewert 0, wenn alles stimmt; 1 bei mindestens einer Abweichung.
 *
 *
 * WAS EIN FEHLSCHLAG BEDEUTET
 * ----------------------------
 * Mit einer PLATZHALTER-Bandbelegung (Stufe 0 aus tune-strips.mjs, vor
 * Messlauf F3-M1) sind P-1…P-10 und P-17 grün erwartet (das sind reine
 * Bauform- und Tabellenprüfungen), P-12…P-16 dagegen ROT — die Quote und
 * die Verteilung sind das, was die Suche erst noch finden muss. Das ist
 * der Zustand nach Umsetzungsstück F3a; siehe DECISIONS.md.
 *
 *   - P-12 rot (Auszählung ≠ geschlossene Form): ein Rechenfehler in einem
 *     der beiden Wege, nicht in den Bändern — der Fehler liegt im Skript.
 *   - P-13 rot (Stellungen ohne Gewinn > 0): dann muss P-4 ebenfalls rot
 *     sein — sonst ist die Gewinngarantie falsch angewandt, ein Denkfehler
 *     im Skript, nicht im Entwurf.
 *   - P-14/P-15/P-16 rot: der Entwurf trägt noch nicht. Zurück zu
 *     tune-strips.mjs mit einer veränderten Stellschraube (siehe dessen
 *     Kopfkommentar), dann die Bänder erneut übernehmen, dann diesen
 *     Nachweis erneut fahren. Diese Schleife ist eingeplant.
 *   - P-18 rot (ein Paar Symbol/Länge kommt nie vor): Bandregel 7 ist
 *     irgendwo verletzt; P-6 hätte das vorher fangen müssen.
 *
 *
 * WARUM DIESES SKRIPT ÜBERHAUPT ETWAS BEWEIST
 * --------------------------------------------
 * Es benutzt KEINE Nachbildung der Regeln, sondern die Regeln selbst:
 * paytable.js ist dieselbe Datei, mit der ab Phase F4 der Browser spielt.
 * Eine eigens für die Prüfung geschriebene zweite Auswertung könnte
 * richtig rechnen, während das Spiel falsch zahlt — dann wäre der Nachweis
 * wertlos. Genau deshalb hat paytable.js keinen einzigen `import`: Node
 * kennt die Import-Map von TYPO3 nicht und könnte einen Namen wie
 * `@phomo17/…` nicht auflösen.
 *
 * Die Walzenbänder kommen aus Classes/Rules.php, gelesen als TEXT, nicht
 * ausgeführt: kein PHP, kein Unterprozess, keine TYPO3-Umgebung. Dieselbe
 * Bauform wie video_slot/Resources/Private/Scripts/verify-payout.mjs.
 *
 *
 * WARUM GANZZAHLIG GERECHNET WIRD
 * ---------------------------------
 * Verglichen werden nie Kommazahlen, sondern Summen in Krediten
 * (Auszahlung in Krediten gegen TOTAL × STAKE × Grenze). Kommazahlen
 * entstehen erst in der Ausgabe, mit deutschem Komma.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
	FIELD_CAP_AT, FIELD_CAP_VALUE, FIELD_LADDER, FIELD_MAX, LAP, LINES, LINE_SYMBOLS,
	MAX_LINE_VALUE, MIN_CHAIN, PAYTABLE, REELS, ROWS, SMALL_FRUITS,
	STAKE, SYMBOLS, evaluate,
} from '../../Public/JavaScript/paytable.js';

const here = dirname(fileURLToPath(import.meta.url));
const RULES_PHP = resolve(here, '../../../Classes/Rules.php');
const GRID_HTML = resolve(here, '../Partials/Automat/FruitRisk/Machine/Grid.html');
const CABINET_HTML = resolve(here, '../Partials/Automat/FruitRisk/Cabinet.html');
const README_MD = resolve(here, '../../../README.md');

const TOTAL = LAP ** REELS;
const QUOTE_BAND_MIN = 0.950;
const QUOTE_BAND_MAX = 0.995;
const ROUND_BALANCE_TOLERANCE = 0.10;
const GUARANTEED_REELS = [0, 1, 2, 3];
const FREE_REELS = [4, 5];

const schnell = process.argv.includes('--schnell');
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

// ---------------------------------------------------------------------
// Rules.php als TEXT lesen — kein PHP, kein Unterprozess.
// ---------------------------------------------------------------------

/** @returns {Promise<string>} */
async function readRulesSource() {
	return readFile(RULES_PHP, 'utf8');
}

/**
 * Schneidet den Inhalt EINER `public const NAME = [ … ];`-Konstante aus.
 * Funktioniert nur bei Konstanten, deren schließende Klammer allein auf
 * ihrer eigenen Zeile steht (so, wie Rules.php sie durchgängig schreibt).
 *
 * @param {string} source
 * @param {string} name
 * @returns {string}
 */
function extractBlock(source, name) {
	// Das Ende ist ein "]" unmittelbar gefolgt von ";" (ggf. mit
	// Leerraum dazwischen) — NICHT "ein Zeilenumbruch vor der
	// schließenden Klammer", denn einzeilige Konstanten wie
	// GUARANTEED_REELS oder SMALL_FRUITS haben keinen solchen Umbruch.
	// Verschachtelte Klammern (LINES, PAYTABLE, STRIPS, DEFAULT_GRID)
	// stören nicht: ihre inneren ']' stehen immer vor einem Komma, nie
	// vor einem Semikolon, sodass die nicht-gierige Suche zuverlässig
	// erst bei der ECHTEN äußeren schließenden Klammer stoppt.
	const match = source.match(new RegExp(`public const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*;`));
	if (match === null) {
		throw new Error(`In ${RULES_PHP} ist keine Konstante ${name} zu finden.`);
	}
	return match[1];
}

/**
 * @param {string} source
 * @param {string} name
 * @returns {number}
 */
function extractScalar(source, name) {
	const match = source.match(new RegExp(`public const ${name}\\s*=\\s*(\\d+);`));
	if (match === null) {
		throw new Error(`In ${RULES_PHP} ist keine skalare Konstante ${name} zu finden.`);
	}
	return Number(match[1]);
}

/**
 * @param {string} source
 * @param {string} name
 * @returns {string[]}
 */
function extractStringList(source, name) {
	return [...extractBlock(source, name).matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/**
 * @param {string} source
 * @param {string} name
 * @returns {number[]}
 */
function extractIntList(source, name) {
	return [...extractBlock(source, name).matchAll(/-?\d+/g)].map((m) => Number(m[0]));
}

/**
 * @param {string} source
 * @param {string} name
 * @returns {Record<number, number>}
 */
function extractIntMap(source, name) {
	const map = {};
	for (const m of extractBlock(source, name).matchAll(/(\d+)\s*=>\s*(\d+)/g)) {
		map[Number(m[1])] = Number(m[2]);
	}
	return map;
}

/**
 * STRIPS und DEFAULT_GRID teilen sich dieselbe Form: `INDEX => ['a', …],`.
 *
 * @param {string} source
 * @param {string} name
 * @returns {string[][]}
 */
function extractIndexedStringLists(source, name) {
	const result = [];
	for (const m of extractBlock(source, name).matchAll(/(\d+)\s*=>\s*\[([^\]]*)\]/g)) {
		result[Number(m[1])] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
	}
	return result;
}

/**
 * @param {string} source
 * @returns {{index: number, rows: number[]}[]}
 */
function extractLines(source) {
	const lines = [];
	for (const m of extractBlock(source, 'LINES').matchAll(/(\d+)\s*=>\s*\[([^\]]*)\]/g)) {
		lines.push({ index: Number(m[1]), rows: [...m[2].matchAll(/\d+/g)].map((x) => Number(x[0])) });
	}
	return lines;
}

/**
 * @param {string} source
 * @returns {Record<string, Record<number, number>>}
 */
function extractPaytable(source) {
	const table = {};
	for (const m of extractBlock(source, 'PAYTABLE').matchAll(/'([a-zäöüß]+)'\s*=>\s*\[([^\]]*)\]/g)) {
		const values = {};
		for (const e of m[2].matchAll(/(\d+)\s*=>\s*(\d+)/g)) {
			values[Number(e[1])] = Number(e[2]);
		}
		table[m[1]] = values;
	}
	return table;
}

// ---------------------------------------------------------------------
// Grid.html / Cabinet.html als TEXT lesen (P-17).
// ---------------------------------------------------------------------

/**
 * Liest die 30 `<use href="#PRÄFIX-symbol" …>`-Verweise einer Datei, in
 * Dokumentreihenfolge — die IST Zeile-für-Zeile-Reihenfolge, weil beide
 * Zeichnungen zeilenweise von oben nach unten, je Zeile von links nach
 * rechts geschrieben sind (siehe Kopfkommentare der beiden Dateien).
 *
 * @param {string} path
 * @param {string} prefix
 * @returns {Promise<string[]>}
 */
async function readUseSymbols(path, prefix) {
	const source = await readFile(path, 'utf8');
	const pattern = new RegExp(`use href="#${prefix}-([a-zäöüß]+)"`, 'g');
	return [...source.matchAll(pattern)].map((m) => m[1]);
}

/**
 * @param {string[]} flat 30 Einträge, zeilenweise.
 * @returns {string[][]} ROWS × REELS
 */
function toGrid(flat) {
	const grid = [];
	for (let row = 0; row < ROWS; row++) {
		grid.push(flat.slice(row * REELS, row * REELS + REELS));
	}
	return grid;
}

// ---------------------------------------------------------------------
// P-1…P-7: die sieben Bandregeln (sechs aus C.14.8, plus die selbst
// gesetzte siebte). EINZIGE Zuordnungstabelle Regel → P-Nummer (STAND
// F3-Behebungslauf, REVIEW-fruitrisk-f3.md [L1] — vorher stand in
// Rules.php "P-1 bis P-6" und hier "P-1…P-6", während tatsächlich jede der
// sieben Regeln eine eigene Prüfung P-1…P-7 hat; Rules.php verweist jetzt
// nur noch hierher, statt die Zuordnung ein zweites Mal zu behaupten):
//
//   Bandregel 1 (genau 20 Positionen je Walze)                    → P-1
//   Bandregel 2 (keine gleichen Nachbarn, Rundumschluss)           → P-2
//   Bandregel 3 (Liniensymbol-Mindestabstand 5)                    → P-3
//   Bandregel 4 (Fruchtgarantie/-verbot je Fenster)                → P-4
//   Bandregel 6 (Symbolzahlen wachsen entlang der Rangfolge)       → P-5
//   Bandregel 7 (selbst gesetzt: alle zwölf Symbole je Band)       → P-6
//   Bandregel 5 (Position 0…4 ≡ DEFAULT_GRID-Spalte)               → P-7
//
// P-1 prüft zusätzlich die reine Bandgröße/Symbolnamen (keine eigene
// Bandregel, aber Voraussetzung für alle folgenden).
// ---------------------------------------------------------------------

/**
 * @param {string[][]} strips
 * @returns {void}
 */
function checkStripsStructure(strips) {
	console.log('\nP-1  Sechs Walzenbänder zu genau 20 Positionen, nur bekannte Symbolnamen');
	check(strips.length === REELS, `${strips.length} Walzenbänder gefunden (erwartet ${REELS})`);
	for (let reel = 0; reel < REELS; reel++) {
		const strip = strips[reel] ?? [];
		check(strip.length === LAP, `Walze ${reel + 1}: ${strip.length} Positionen (erwartet ${LAP})`);
		const unknown = strip.filter((s) => !SYMBOLS.includes(s));
		check(unknown.length === 0, `Walze ${reel + 1}: nur bekannte Symbolnamen`
			+ (unknown.length === 0 ? '' : ` — unbekannt: ${[...new Set(unknown)].join(', ')}`));
	}
}

/**
 * @param {string[][]} strips
 * @returns {void}
 */
function checkNoAdjacentDuplicates(strips) {
	console.log('\nP-2  Bandregel 2: keine zwei gleichen Symbole nebeneinander (Rundumschluss eingeschlossen)');
	for (let reel = 0; reel < REELS; reel++) {
		const strip = strips[reel];
		const clashes = [];
		for (let p = 0; p < LAP; p++) {
			if (strip[p] === strip[(p + 1) % LAP]) {
				clashes.push(`${p}/${(p + 1) % LAP}`);
			}
		}
		check(clashes.length === 0, `Walze ${reel + 1}: keine Nachbarkollision`
			+ (clashes.length === 0 ? '' : ` — bei ${clashes.join(', ')}`));
	}
}

/**
 * Echte, modulare Ringdistanz von `from` nach `to` (siehe dieselbe Formel
 * in tune-strips.mjs — beide Werkzeuge müssen hier übereinstimmen).
 *
 * @param {number} from
 * @param {number} to
 * @returns {number}
 */
function ringDistance(from, to) {
	return (to - from + LAP) % LAP;
}

/**
 * @param {string[][]} strips
 * @returns {void}
 */
function checkLineSymbolSpacing(strips) {
	console.log('\nP-3  Bandregel 3: je Liniensymbol mindestens vier fremde Positionen zwischen zwei gleichen'
		+ ' (die drei kleinen Früchte sind ausgenommen)');
	for (let reel = 0; reel < REELS; reel++) {
		const strip = strips[reel];
		const violations = [];
		for (const symbol of LINE_SYMBOLS) {
			const positions = [];
			for (let p = 0; p < LAP; p++) {
				if (strip[p] === symbol) {
					positions.push(p);
				}
			}
			for (let i = 0; i < positions.length; i++) {
				const next = positions[(i + 1) % positions.length];
				const gap = positions.length > 1 ? ringDistance(positions[i], next) : LAP;
				if (gap < 5) {
					violations.push(`${symbol} bei ${positions[i]}→${next} (${gap})`);
				}
			}
		}
		check(violations.length === 0, `Walze ${reel + 1}: alle Abstände ≥ 5`
			+ (violations.length === 0 ? '' : ` — verletzt: ${violations.join(', ')}`));
	}
}

/**
 * STAND F3-Behebungslauf (REVIEW-fruitrisk-f3.md [M4]): `guaranteedReels`
 * und `freeReels` kommen jetzt als Parameter aus Rules.php selbst (siehe
 * Aufrufstelle) statt aus den Skript-Konstanten `GUARANTEED_REELS`/
 * `FREE_REELS` oben — diese bleiben nur noch als eigene, zusätzliche
 * Konzeptprüfung stehen (Zeile „GUARANTEED_REELS in Rules.php ist …"), sind
 * aber keine Datenquelle mehr für P-4.
 *
 * @param {string[][]} strips
 * @param {number[]} guaranteedReels
 * @param {number[]} freeReels
 * @returns {void}
 */
function checkGuarantee(strips, guaranteedReels, freeReels) {
	console.log('\nP-4  Bandregel 4: die vier garantierten Walzen zeigen in JEDEM Fenster mindestens eine kleine'
		+ ' Frucht; die beiden freien Walzen haben mindestens ein Fenster ohne');
	for (const reel of guaranteedReels) {
		const strip = strips[reel];
		const emptyWindows = [];
		for (let p = 0; p < LAP; p++) {
			let hasFruit = false;
			for (let r = 0; r < ROWS; r++) {
				if (SMALL_FRUITS.includes(strip[(p + r) % LAP])) {
					hasFruit = true;
				}
			}
			if (!hasFruit) {
				emptyWindows.push(p);
			}
		}
		check(emptyWindows.length === 0, `Walze ${reel + 1} (garantiert): jedes Fenster hat eine kleine Frucht`
			+ (emptyWindows.length === 0 ? '' : ` — Fenster ohne: ${emptyWindows.join(', ')}`));
	}
	for (const reel of freeReels) {
		const strip = strips[reel];
		let hasEmptyWindow = false;
		for (let p = 0; p < LAP; p++) {
			let hasFruit = false;
			for (let r = 0; r < ROWS; r++) {
				if (SMALL_FRUITS.includes(strip[(p + r) % LAP])) {
					hasFruit = true;
				}
			}
			if (!hasFruit) {
				hasEmptyWindow = true;
			}
		}
		check(hasEmptyWindow, `Walze ${reel + 1} (frei): hat mindestens ein Fenster ohne kleine Frucht`);
	}
}

/**
 * Bandregel 6 gilt für die neun Liniensymbole in ihrer Rangfolge (siehe
 * LINE_SYMBOLS). Die drei kleinen Früchte sind ausgenommen — wie schon von
 * Bandregel 3 — weil sie eine eigene Mechanik (Feldtreppe) und eine eigene
 * bauliche Vorgabe (Bandregel 4, Entwurfsregel 2: Leitfrucht) haben, statt
 * eines vom gedruckten Rang abgeleiteten Seltenheitswerts (Entscheidung
 * aus F3a, siehe DECISIONS.md).
 *
 * @param {string[][]} strips
 * @returns {void}
 */
function checkLineSymbolRank(strips) {
	console.log('\nP-5  Bandregel 6: die Anzahlen der neun Liniensymbole wachsen entlang ihrer Rangfolge'
		+ ' (je wertvoller, desto seltener)');
	for (let reel = 0; reel < REELS; reel++) {
		const counts = {};
		for (const symbol of strips[reel]) {
			counts[symbol] = (counts[symbol] ?? 0) + 1;
		}
		const violations = [];
		for (let i = 0; i < LINE_SYMBOLS.length - 1; i++) {
			const a = LINE_SYMBOLS[i];
			const b = LINE_SYMBOLS[i + 1];
			if ((counts[a] ?? 0) > (counts[b] ?? 0)) {
				violations.push(`${a}(${counts[a] ?? 0}) > ${b}(${counts[b] ?? 0})`);
			}
		}
		check(violations.length === 0, `Walze ${reel + 1}: nicht fallend`
			+ (violations.length === 0 ? '' : ` — verletzt: ${violations.join(', ')}`));
	}
}

/**
 * @param {string[][]} strips
 * @returns {void}
 */
function checkCompleteness(strips) {
	console.log('\nP-6  Bandregel 7 (selbst gesetzt): jedes der zwölf Symbole liegt mindestens einmal auf jedem Band');
	for (let reel = 0; reel < REELS; reel++) {
		const present = new Set(strips[reel]);
		const missing = SYMBOLS.filter((s) => !present.has(s));
		check(missing.length === 0, `Walze ${reel + 1}: alle zwölf Symbole vertreten`
			+ (missing.length === 0 ? '' : ` — fehlen: ${missing.join(', ')}`));
	}
}

/**
 * @param {string[][]} strips
 * @param {number[]} positions
 * @param {string[][]} grid
 * @returns {void}
 */
function checkDefaultGridOnStrips(strips, positions, grid) {
	console.log('\nP-7  Bandregel 5: Position 0…4 jeder Walze ergibt von oben nach unten die Spalte dieser Walze'
		+ ' aus DEFAULT_GRID');
	check(positions.length === REELS, `DEFAULT_POSITIONS nennt ${positions.length} Werte (erwartet ${REELS})`);
	check(grid.length === ROWS && grid.every((row) => (row ?? []).length === REELS),
		`DEFAULT_GRID ist ${ROWS} × ${REELS}`);

	const abweichungen = [];
	for (let reel = 0; reel < REELS; reel++) {
		const position = positions[reel] ?? 0;
		for (let row = 0; row < ROWS; row++) {
			const symbolOnStrip = strips[reel]?.[(position + row) % LAP];
			const symbolInGrid = grid[row]?.[reel];
			if (symbolOnStrip !== symbolInGrid) {
				abweichungen.push(`Walze ${reel + 1}, Zeile ${row}: Band zeigt „${symbolOnStrip}", `
					+ `DEFAULT_GRID nennt „${symbolInGrid}"`);
			}
		}
	}
	check(abweichungen.length === 0, 'jede Walze zeigt an Position 0…4 genau die Spalte aus DEFAULT_GRID'
		+ (abweichungen.length === 0 ? '' : ` — ${abweichungen.join('; ')}`));
}

// ---------------------------------------------------------------------
// P-8: Rules.php ≡ paytable.js, in beide Richtungen.
// ---------------------------------------------------------------------

/**
 * @param {{
 *   symbols: string[], smallFruits: string[], lineSymbols: string[],
 *   lines: {index: number, rows: number[]}[], paytable: Record<string, Record<number, number>>,
 *   fieldLadder: Record<number, number>, rows: number, reels: number, lap: number,
 *   stake: number, minChain: number, maxLineValue: number,
 *   fieldCapAt: number, fieldMax: number, chainLengths: number[],
 * }} php
 * @returns {void}
 */
function checkParity(php) {
	console.log('\nP-8  Rules::… ≡ paytable.js, Wert für Wert, in beide Richtungen');

	const diffs = [];
	if (php.symbols.length !== SYMBOLS.length || php.symbols.some((s, i) => s !== SYMBOLS[i])) {
		diffs.push(`SYMBOLS: PHP=[${php.symbols.join(',')}] JS=[${SYMBOLS.join(',')}]`);
	}
	if (php.smallFruits.length !== SMALL_FRUITS.length || php.smallFruits.some((s, i) => s !== SMALL_FRUITS[i])) {
		diffs.push(`SMALL_FRUITS: PHP=[${php.smallFruits.join(',')}] JS=[${SMALL_FRUITS.join(',')}]`);
	}
	if (php.lineSymbols.length !== LINE_SYMBOLS.length || php.lineSymbols.some((s, i) => s !== LINE_SYMBOLS[i])) {
		diffs.push(`LINE_SYMBOLS: PHP=[${php.lineSymbols.join(',')}] JS=[${LINE_SYMBOLS.join(',')}]`);
	}
	check(diffs.length === 0, 'SYMBOLS, SMALL_FRUITS, LINE_SYMBOLS (samt Reihenfolge) stimmen überein'
		+ (diffs.length === 0 ? '' : ` — ${diffs.join('; ')}`));

	// STAND F3-Behebungslauf (REVIEW-fruitrisk-f3.md [M3]): FIELD_CAP_AT und
	// FIELD_MAX kamen bisher NICHT vor — genau die Stelle, an der Rules.php
	// und paytable.js strukturell verschieden aufgebaut sind (die Feldtreppe
	// steht in Rules::FIELD_LADDER mit dem Deckel als Schlüssel 6, in
	// paytable.js getrennt als FIELD_LADDER ohne Schlüssel 6 plus eigenes
	// FIELD_CAP_VALUE). CHAIN_LENGTHS gibt es in paytable.js nicht als
	// eigene Konstante — es evaluate() leitet die Kettenlängen implizit aus
	// MIN_CHAIN..REELS ab; genau dieser abgeleitete Bereich ist hier die
	// JS-Seite des Vergleichs.
	const jsChainLengths = Array.from({ length: REELS - MIN_CHAIN + 1 }, (_, i) => MIN_CHAIN + i);

	const scalarDiffs = [];
	const scalars = [
		['ROWS', php.rows, ROWS], ['REELS', php.reels, REELS], ['POSITIONS_PER_STRIP', php.lap, LAP],
		['STAKE', php.stake, STAKE], ['MIN_CHAIN', php.minChain, MIN_CHAIN],
		['MAX_LINE_VALUE', php.maxLineValue, MAX_LINE_VALUE],
		['FIELD_CAP_AT', php.fieldCapAt, FIELD_CAP_AT], ['FIELD_MAX', php.fieldMax, FIELD_MAX],
	];
	for (const [name, phpValue, jsValue] of scalars) {
		if (phpValue !== jsValue) {
			scalarDiffs.push(`${name}: PHP=${phpValue} JS=${jsValue}`);
		}
	}
	check(scalarDiffs.length === 0, 'ROWS, REELS, POSITIONS_PER_STRIP/LAP, STAKE, MIN_CHAIN, MAX_LINE_VALUE,'
		+ ' FIELD_CAP_AT, FIELD_MAX stimmen überein'
		+ (scalarDiffs.length === 0 ? '' : ` — ${scalarDiffs.join('; ')}`));

	check(php.chainLengths.length === jsChainLengths.length
		&& php.chainLengths.every((v, i) => v === jsChainLengths[i]),
		`CHAIN_LENGTHS stimmt mit dem aus MIN_CHAIN..REELS abgeleiteten Bereich überein`
		+ ` (PHP=[${php.chainLengths.join(',')}] abgeleitet=[${jsChainLengths.join(',')}])`);

	check(php.fieldCapAt === FIELD_CAP_AT && php.fieldLadder[php.fieldCapAt] === FIELD_CAP_VALUE,
		`Rules::FIELD_LADDER[FIELD_CAP_AT] (Deckelwert, PHP=${php.fieldLadder[php.fieldCapAt]})`
		+ ` stimmt mit paytable.js FIELD_CAP_VALUE (${FIELD_CAP_VALUE}) überein`);

	// STAND F3-Behebungslauf (REVIEW-fruitrisk-f3.md [M3]): vorher lief diese
	// Schleife nur über die JS-Symbolliste — ein zusätzlicher Schlüssel auf
	// der PHP-Seite wäre nicht aufgefallen. Jetzt über die VEREINIGUNG beider
	// Schlüsselmengen, echt in beide Richtungen.
	const paytableDiffs = [];
	const paytableSymbolUnion = [...new Set([...SYMBOLS, ...Object.keys(php.paytable)])];
	for (const symbol of paytableSymbolUnion) {
		for (const length of jsChainLengths) {
			const phpValue = php.paytable[symbol]?.[length];
			const jsValue = PAYTABLE[symbol]?.[length];
			if (phpValue !== jsValue) {
				paytableDiffs.push(`${symbol}[${length}]: PHP=${phpValue} JS=${jsValue}`);
			}
		}
	}
	check(paytableDiffs.length === 0, 'PAYTABLE stimmt Wert für Wert überein, über die Vereinigung beider'
		+ ' Schlüsselmengen' + (paytableDiffs.length === 0 ? '' : ` — ${paytableDiffs.join('; ')}`));

	const ladderDiffs = [];
	for (const count of [2, 3, 4, 5]) {
		if ((php.fieldLadder[count] ?? null) !== (FIELD_LADDER[count] ?? null)) {
			ladderDiffs.push(`${count}: PHP=${php.fieldLadder[count]} JS=${FIELD_LADDER[count]}`);
		}
	}
	check(ladderDiffs.length === 0, 'FIELD_LADDER stimmt überein'
		+ (ladderDiffs.length === 0 ? '' : ` — ${ladderDiffs.join('; ')}`));

	const lineDiffs = [];
	if (php.lines.length !== LINES.length) {
		lineDiffs.push(`Anzahl: PHP=${php.lines.length} JS=${LINES.length}`);
	} else {
		for (let i = 0; i < LINES.length; i++) {
			const phpLine = php.lines[i];
			const jsLine = LINES[i];
			if (phpLine.index !== jsLine.index || phpLine.rows.join(',') !== jsLine.rows.join(',')) {
				lineDiffs.push(`Linie ${jsLine.index}: PHP=[${phpLine?.rows?.join(',')}] JS=[${jsLine.rows.join(',')}]`);
			}
		}
	}
	check(lineDiffs.length === 0, 'LINES stimmt überein'
		+ (lineDiffs.length === 0 ? '' : ` — ${lineDiffs.join('; ')}`));
}

// ---------------------------------------------------------------------
// P-9: Form der Gewinntabelle. P-10: Form der 30 Linien.
// ---------------------------------------------------------------------

function checkPaytableForm() {
	console.log('\nP-9  Form der Gewinntabelle: je Kettenlänge streng fallend entlang der Rangfolge, je Symbol nicht'
		+ ' fallend mit wachsender Länge, Höchstwert genau 100 bei sieben×6, kleinster Wert > 3');

	for (const length of [3, 4, 5, 6]) {
		let strictlyDescending = true;
		for (let i = 0; i < SYMBOLS.length - 1; i++) {
			if (!(PAYTABLE[SYMBOLS[i]][length] > PAYTABLE[SYMBOLS[i + 1]][length])) {
				strictlyDescending = false;
			}
		}
		check(strictlyDescending, `Länge ${length}: streng fallend entlang SYMBOLS`);
	}

	for (const symbol of SYMBOLS) {
		let nonDecreasing = true;
		for (let length = 3; length < 6; length++) {
			if (!(PAYTABLE[symbol][length] <= PAYTABLE[symbol][length + 1])) {
				nonDecreasing = false;
			}
		}
		check(nonDecreasing, `${symbol}: nicht fallend mit wachsender Kettenlänge`);
	}

	check(PAYTABLE.sieben[6] === MAX_LINE_VALUE, `Höchstwert genau ${MAX_LINE_VALUE} bei sieben×6 `
		+ `(tatsächlich ${PAYTABLE.sieben[6]})`);

	const smallestValue = Math.min(...SYMBOLS.map((s) => PAYTABLE[s][MIN_CHAIN]));
	check(smallestValue > 3, `kleinster Wert bei Kettenlänge ${MIN_CHAIN} ist ${smallestValue} (> 3, Entwurfsregel 1)`);
}

function checkLinesForm() {
	console.log('\nP-10  Form der 30 Linien: paarweise verschieden, Zeilen in 0…4, jedes der dreißig Felder liegt'
		+ ' auf genau sechs Linien (Ausgewogenheit)');

	check(LINES.length === 30, `30 Linien vorhanden (${LINES.length})`);

	const signatures = new Set();
	let allRowsValid = true;
	for (const line of LINES) {
		if (line.rows.length !== REELS || line.rows.some((r) => r < 0 || r >= ROWS)) {
			allRowsValid = false;
		}
		signatures.add(line.rows.join(','));
	}
	check(allRowsValid, `jede Linie nennt ${REELS} Zeilen in 0…${ROWS - 1}`);
	check(signatures.size === LINES.length, `alle ${LINES.length} Linien sind paarweise verschieden `
		+ `(${signatures.size} verschiedene Führungen)`);

	const cellHits = new Map();
	for (const line of LINES) {
		for (let reel = 0; reel < REELS; reel++) {
			const key = `${line.rows[reel]},${reel}`;
			cellHits.set(key, (cellHits.get(key) ?? 0) + 1);
		}
	}
	const uneven = [...cellHits.entries()].filter(([, count]) => count !== 6);
	check(cellHits.size === ROWS * REELS && uneven.length === 0,
		`jedes der ${ROWS * REELS} Felder liegt auf genau sechs Linien`
		+ (uneven.length === 0 ? '' : ` — abweichend: ${uneven.map(([k, c]) => `${k}:${c}`).join(', ')}`));
}

// ---------------------------------------------------------------------
// P-11: geschlossene Form (Folgerung 1 und 2) — exakt, Millisekunden.
// ---------------------------------------------------------------------

/**
 * @param {string[][]} strips
 * @returns {{lineExpected: number, fieldExpected: number, quote: number, byAmount: Map<number, number>}}
 */
function closedForm(strips) {
	const q = strips.map((strip) => {
		const counts = new Map();
		for (const symbol of strip) {
			counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
		}
		const m = {};
		for (const symbol of SYMBOLS) {
			m[symbol] = (counts.get(symbol) ?? 0) / LAP;
		}
		return m;
	});

	let perLine = 0;
	for (const symbol of SYMBOLS) {
		let runningProduct = 1;
		for (let length = 1; length <= REELS; length++) {
			runningProduct *= q[length - 1][symbol];
			if (length < MIN_CHAIN) {
				continue;
			}
			const value = PAYTABLE[symbol]?.[length] ?? 0;
			if (value === 0) {
				continue;
			}
			if (length === REELS) {
				perLine += value * runningProduct;
			} else {
				perLine += value * runningProduct * (1 - q[length][symbol]);
			}
		}
	}
	const lineExpected = LINES.length * perLine;

	let joint = new Map([['0,0,0', 1]]);
	for (const strip of strips) {
		const reelDist = new Map();
		for (let p = 0; p < LAP; p++) {
			let k = 0;
			let z = 0;
			let o = 0;
			for (let r = 0; r < ROWS; r++) {
				const symbol = strip[(p + r) % LAP];
				if (symbol === 'kirsche') k++;
				else if (symbol === 'zitrone') z++;
				else if (symbol === 'orange') o++;
			}
			const key = `${k},${z},${o}`;
			reelDist.set(key, (reelDist.get(key) ?? 0) + 1);
		}
		const next = new Map();
		for (const [key, weight] of joint) {
			const [k0, z0, o0] = key.split(',').map(Number);
			for (const [rkey, rweight] of reelDist) {
				const [dk, dz, dOrange] = rkey.split(',').map(Number);
				const nkey = `${k0 + dk},${z0 + dz},${o0 + dOrange}`;
				next.set(nkey, (next.get(nkey) ?? 0) + weight * rweight);
			}
		}
		joint = next;
	}

	function fieldLadderValue(count) {
		if (count >= FIELD_CAP_AT) {
			return FIELD_CAP_VALUE;
		}
		return FIELD_LADDER[count] ?? 0;
	}

	const byAmount = new Map();
	let fieldExpectedSum = 0;
	for (const [key, weight] of joint) {
		const [k, z, o] = key.split(',').map(Number);
		const amount = fieldLadderValue(k) + fieldLadderValue(z) + fieldLadderValue(o);
		byAmount.set(amount, (byAmount.get(amount) ?? 0) + weight);
		fieldExpectedSum += amount * weight;
	}
	const fieldExpected = fieldExpectedSum / TOTAL;

	return { lineExpected, fieldExpected, quote: (lineExpected + fieldExpected) / STAKE, byAmount };
}

function formatPercent(value) {
	return `${(value * 100).toFixed(4).replace('.', ',')} %`;
}

/**
 * @param {string[][]} strips
 * @returns {ReturnType<typeof closedForm>}
 */
function checkClosedForm(strips) {
	console.log('\nP-11  Geschlossene Form (Folgerung 1 und 2, exakt, Millisekunden): Beitrag des Linienwegs und'
		+ ' der Feldzählung, erwartete Quote, P(Feld=1/2/3)');
	const result = closedForm(strips);
	const p1 = (result.byAmount.get(1) ?? 0) / TOTAL;
	const p2 = (result.byAmount.get(2) ?? 0) / TOTAL;
	const p3 = (result.byAmount.get(3) ?? 0) / TOTAL;
	console.log(`  Beitrag Linien (30×E[eine Linie]) ${result.lineExpected.toFixed(6).replace('.', ',')} Kredite`);
	console.log(`  Beitrag Feldzählung (exakt)        ${result.fieldExpected.toFixed(6).replace('.', ',')} Kredite`);
	console.log(`  Erwartete Quote (geschlossene Form) ${formatPercent(result.quote)}`);
	console.log(`  P(Feld=1)=${formatPercent(p1)}  P(Feld=2)=${formatPercent(p2)}  P(Feld=3)=${formatPercent(p3)}`);
	check(Number.isFinite(result.quote), 'geschlossene Form berechnet (keine Division durch null, kein NaN)');
	return result;
}

// ---------------------------------------------------------------------
// P-17: Grid.html / Cabinet.html ≡ DEFAULT_GRID.
// ---------------------------------------------------------------------

/**
 * @param {string[][]} defaultGrid
 * @param {string[][]} strips
 * @param {number[]} defaultPositions
 * @returns {Promise<void>}
 */
async function checkMarkupMatchesDefaultGrid(defaultGrid, strips, defaultPositions) {
	console.log('\nP-17  Machine/Grid.html (Bänder) und Automat/FruitRisk/Cabinet.html zeigen Feld für Feld genau'
		+ ' Rules::DEFAULT_GRID');

	/*
	 * STAND F4a: Grid.html trägt die Grundstellung nicht mehr im Klartext,
	 * sondern als Band (data-fr-strip) und Startlage (--fr-reel-pos). Beide
	 * kommen aus Rules::STRIPS und Rules::DEFAULT_POSITIONS über den
	 * CabinetProcessor. readUseSymbols() fände in Grid.html seit F4a keine
	 * dreißig literalen use-Verweise mehr, sondern EINEN Platzhalter
	 * href="#fr-sym-{cell.symbol}" innerhalb der Zellschleife — eine
	 * Zählung wie vor F4a ist an dieser Datei nicht mehr möglich. Geprüft
	 * wird deshalb die RECHNUNG, die das Markup zur Laufzeit ausführt:
	 * Fenster(Band, Startlage) ≡ DEFAULT_GRID. Die Saal-Miniatur bleibt
	 * unverändert literal und wird weiterhin wortgleich gelesen.
	 */
	const gridSource = await readFile(GRID_HTML, 'utf8');
	check(/data-fr-strip="\{reel\.symbolList\}"/.test(gridSource),
		'Grid.html holt die Bandfolge aus {machine.reels} (data-fr-strip="{reel.symbolList}")');
	check(/--fr-reel-pos:\s*\{reel\.defaultPosition\}/.test(gridSource),
		'Grid.html holt die Startlage aus {machine.reels} (--fr-reel-pos: {reel.defaultPosition})');
	check(/href="#fr-sym-\{cell\.symbol\}"/.test(gridSource),
		'Grid.html tippt kein Symbol mehr ab — jedes use kommt aus {cell.symbol}');

	const fensterGrid = [];
	for (let row = 0; row < ROWS; row++) {
		const zeile = [];
		for (let reel = 0; reel < REELS; reel++) {
			zeile.push(strips[reel]?.[(defaultPositions[reel] + row) % LAP]);
		}
		fensterGrid.push(zeile);
	}

	const cabinetFlat = await readUseSymbols(CABINET_HTML, 'fr-mini');
	const cabinetGrid = toGrid(cabinetFlat);
	check(cabinetFlat.length === ROWS * REELS,
		`Cabinet.html (Saal-Miniatur) nennt ${cabinetFlat.length} Symbole (erwartet ${ROWS * REELS})`);

	const gridDiffs = [];
	const cabinetDiffs = [];
	for (let row = 0; row < ROWS; row++) {
		for (let reel = 0; reel < REELS; reel++) {
			const expected = defaultGrid[row]?.[reel];
			if (fensterGrid[row]?.[reel] !== expected) {
				gridDiffs.push(`Zeile ${row}, Walze ${reel + 1}: Band „${fensterGrid[row]?.[reel]}", `
					+ `DEFAULT_GRID „${expected}"`);
			}
			if (cabinetGrid[row]?.[reel] !== expected) {
				cabinetDiffs.push(`Zeile ${row}, Walze ${reel + 1}: Cabinet.html „${cabinetGrid[row]?.[reel]}", `
					+ `DEFAULT_GRID „${expected}"`);
			}
		}
	}
	check(gridDiffs.length === 0, 'Fenster(Band, Startlage) ≡ DEFAULT_GRID'
		+ (gridDiffs.length === 0 ? '' : ` — ${gridDiffs.join('; ')}`));
	check(cabinetDiffs.length === 0, 'Cabinet.html (Saal-Miniatur) ≡ DEFAULT_GRID'
		+ (cabinetDiffs.length === 0 ? '' : ` — ${cabinetDiffs.join('; ')}`));

	// STAND F3-Behebungslauf (REVIEW-fruitrisk-f3.md [M5]): Rules.php und
	// Grid.html versprechen ausdrücklich, der Gewinnwert der Grundstellung
	// werde "von verify-payout.mjs berechnet und in der README genannt" —
	// vorher gab es dafür keine Stelle, evaluate() lief nur innerhalb von
	// enumerateAll(). Diese Ausgabe löst das Versprechen ein.
	const defaultGridResult = evaluate(defaultGrid);
	console.log(`  Gewinnwert der Grundstellung (evaluate(DEFAULT_GRID)): Rundengewinn ${defaultGridResult.amount}`
		+ ` (Linien ${defaultGridResult.lineAmount} + Feld ${defaultGridResult.fieldAmount})`);
}

// ---------------------------------------------------------------------
// P-19: Platzhalterwarnung in README.md (F3d fügt den geprüften Abschnitt
// hinzu; bis dahin ist die Datei ggf. noch ohne die Zeichenfolge — dann
// ist P-19 gegenstandslos, keine Warnung).
// ---------------------------------------------------------------------

/**
 * @returns {Promise<void>}
 */
async function checkReadmePlaceholder() {
	let source;
	try {
		source = await readFile(README_MD, 'utf8');
	} catch {
		return;
	}
	// STAND F3-Behebungslauf (fünfter Durchgang): der Platzhalter ist seit
	// dem Behebungslauf nicht mehr nur die eine, feste Zeichenfolge
	// „≪aus F3-M2≫" — README.md trägt nach den neuen Bändern/der neuen
	// Gewinntabelle den allgemeineren „≪aus vollem Lauf≫" für dieselbe
	// Rolle. Beide werden erkannt, künftige Platzhalter nach demselben
	// Muster (≪…≫) ebenfalls.
	const platzhalterTreffer = [...source.matchAll(/≪[^≫]*≫/g)].map((m) => m[0]);
	if (platzhalterTreffer.length > 0) {
		console.log(`\nP-19  WARNUNG: README.md enthält noch ${platzhalterTreffer.length} Platzhalter `
			+ `(${[...new Set(platzhalterTreffer)].join(', ')}) — nach dem vollen Lauf mit den gemessenen`
			+ ' Kennzahlen ersetzen. Keine harte Prüfung, siehe Plan Abschnitt 4b.11.');
	}
}

// ---------------------------------------------------------------------
// Vollständige Auszählung (P-12…P-16, P-18) — NUR ohne --schnell.
// ---------------------------------------------------------------------

/**
 * Zählt alle 20⁶ Stellungen vollständig aus, mit derselben `evaluate()`,
 * mit der ab Phase F4 der Browser spielt. Je Walze und Position werden die
 * fünf sichtbaren Symbole EINMAL vorberechnet (6 × 20 = 120 kleine Felder)
 * statt 64.000.000-mal denselben Modulo zu wiederholen.
 *
 * @param {string[][]} strips
 * @returns {{
 *   totalUnits: number, blanks: number, maxAmount: number, maxAmountCount: number,
 *   amountCounts: Map<number, number>, lineHitsByIndex: number[], lineUnitsTotal: number,
 *   fieldUnitsTotal: number, symbolLengthCounts: Map<string, number>,
 * }}
 */
function enumerateAll(strips) {
	const columns = strips.map((strip) => {
		const windows = [];
		for (let position = 0; position < LAP; position++) {
			const window = [];
			for (let row = 0; row < ROWS; row++) {
				window.push(strip[(position + row) % LAP]);
			}
			windows.push(window);
		}
		return windows;
	});

	const grid = [];
	for (let row = 0; row < ROWS; row++) {
		grid.push(new Array(REELS));
	}

	let totalUnits = 0;
	let blanks = 0;
	// STAND F3-Behebungslauf (REVIEW-fruitrisk-f3.md [L7]): -1 statt 0 — bei 0
	// würde die erste gewinnlose Stellung fälschlich als "neuer Höchstgewinn"
	// durchgehen (0 > 0 ist falsch, aber 0 === 0 träfe sofort zu). Solange
	// P-13 grün ist (null gewinnlose Stellungen), ist das folgenlos; -1 macht
	// es auch dann richtig, wenn P-13 einmal rot wäre.
	let maxAmount = -1;
	let maxAmountCount = 0;
	const amountCounts = new Map();
	const lineHitsByIndex = new Array(LINES.length).fill(0);
	let lineUnitsTotal = 0;
	let fieldUnitsTotal = 0;
	const symbolLengthCounts = new Map();

	function setReel(reel, window) {
		for (let row = 0; row < ROWS; row++) {
			grid[row][reel] = window[row];
		}
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
						for (let p5 = 0; p5 < LAP; p5++) {
							setReel(5, columns[5][p5]);

							const result = evaluate(grid);

							totalUnits += result.amount;
							if (result.amount === 0) {
								blanks++;
							}
							if (result.amount > maxAmount) {
								maxAmount = result.amount;
								maxAmountCount = 1;
							} else if (result.amount === maxAmount) {
								maxAmountCount++;
							}
							amountCounts.set(result.amount, (amountCounts.get(result.amount) ?? 0) + 1);

							lineUnitsTotal += result.lineAmount;
							fieldUnitsTotal += result.fieldAmount;
							for (const hit of result.lines) {
								lineHitsByIndex[hit.index - 1]++;
								const key = `${hit.symbol}:${hit.length}`;
								symbolLengthCounts.set(key, (symbolLengthCounts.get(key) ?? 0) + 1);
							}
						}
					}
				}
			}
		}
	}

	return {
		totalUnits, blanks, maxAmount, maxAmountCount, amountCounts,
		lineHitsByIndex, lineUnitsTotal, fieldUnitsTotal, symbolLengthCounts,
	};
}

/**
 * @param {ReturnType<typeof enumerateAll>} result
 * @param {ReturnType<typeof closedForm>} closed
 * @returns {void}
 */
function reportFullEnumeration(result, closed) {
	console.log(`\nVollständige Auszählung aller ${TOTAL.toLocaleString('de-DE')} Stellungen`);

	console.log('\nP-12  Auszählung ≡ geschlossene Form (auf die Krediteinheit, zwei unabhängige Herleitungen)');
	const closedTotalUnits = Math.round((closed.lineExpected + closed.fieldExpected) * TOTAL);
	check(Math.abs(result.totalUnits - closedTotalUnits) <= 1,
		`Auszählung ${result.totalUnits.toLocaleString('de-DE')} Einheiten, geschlossene Form `
		+ `${closedTotalUnits.toLocaleString('de-DE')} Einheiten`);

	console.log('\nP-13  Null Stellungen ohne Gewinn (Gewinngarantie, Satz 2)');
	check(result.blanks === 0, `Stellungen ohne Gewinn: ${result.blanks.toLocaleString('de-DE')}`);

	console.log('\nP-14  Auszahlungsquote im Band 95,0 %…99,5 % (ganzzahlig verglichen)');
	const minUnits = Math.ceil(TOTAL * STAKE * QUOTE_BAND_MIN);
	const maxUnits = Math.floor(TOTAL * STAKE * QUOTE_BAND_MAX);
	const quote = result.totalUnits / (TOTAL * STAKE);
	check(result.totalUnits >= minUnits && result.totalUnits <= maxUnits,
		`Auszahlung ${result.totalUnits.toLocaleString('de-DE')} Einheiten, Band `
		+ `${minUnits.toLocaleString('de-DE')}…${maxUnits.toLocaleString('de-DE')} `
		+ `(Quote ${formatPercent(quote)})`);

	console.log('\nP-15  P(Runde=1), P(Runde=2), P(Runde=3) untereinander auf ±10 % relativ gleich'
		+ ' (ganzzahlige Stellungszahlen verglichen)');
	const c1 = result.amountCounts.get(1) ?? 0;
	const c2 = result.amountCounts.get(2) ?? 0;
	const c3 = result.amountCounts.get(3) ?? 0;
	const trio = [c1, c2, c3];
	const maxTrio = Math.max(...trio);
	const minTrio = Math.min(...trio);
	// STAND F3-Behebungslauf (REVIEW-fruitrisk-f3.md [L8]): "* 10" auf beiden
	// Seiten hatte die Überschrift "ganzzahlige Stellungszahlen verglichen"
	// nicht eingelöst — ROUND_BALANCE_TOLERANCE ist 0,10 (Gleitkomma), also
	// blieb maxTrio * ROUND_BALANCE_TOLERANCE * 10 selbst eine Gleitkomma-
	// rechnung (für 5.161.962 kommt z. B. 5.161.962,000000001 heraus). Mit
	// "* 100" links und "* 10" rechts ist ROUND_BALANCE_TOLERANCE (= 10/100)
	// vollständig herausgekürzt — beide Seiten sind jetzt echte Ganzzahlen.
	check(maxTrio > 0 && (maxTrio - minTrio) * 100 <= maxTrio * 10,
		`Stellungen: Runde=1 → ${c1.toLocaleString('de-DE')}, Runde=2 → ${c2.toLocaleString('de-DE')}, `
		+ `Runde=3 → ${c3.toLocaleString('de-DE')}`);

	console.log('\nP-16  P(Runde=10) ist echt kleiner als jede der drei kleinsten Rundengewinne');
	const c10 = result.amountCounts.get(10) ?? 0;
	// STAND F3-Behebungslauf (REVIEW-fruitrisk-f3.md [M2]): "|| minTrio === 0"
	// ließ diese Prüfung ausgerechnet im schlimmsten Fall grün werden — wenn
	// einer der drei kleinsten Rundengewinne GAR NICHT auftritt. Der leere
	// Fall ist ein Fehlschlag, keine Ausnahme; P-15 rot zu lassen wäre kein
	// Ersatz für eine Prüfung, die sich selbst richtig verhält.
	check(minTrio > 0 && c10 < minTrio, `Stellungen mit Rundengewinn 10: ${c10.toLocaleString('de-DE')} `
		+ `(kleinster unter 1/2/3: ${minTrio.toLocaleString('de-DE')})`);

	console.log('\nP-18  Jedes Paar (Symbol, Kettenlänge) kommt mindestens einmal vor');
	const missingPairs = [];
	for (const symbol of SYMBOLS) {
		for (const length of [3, 4, 5, 6]) {
			if ((result.symbolLengthCounts.get(`${symbol}:${length}`) ?? 0) === 0) {
				missingPairs.push(`${symbol}×${length}`);
			}
		}
	}
	check(missingPairs.length === 0, 'alle 48 Paare (Symbol, Kettenlänge) treten mindestens einmal auf'
		+ (missingPairs.length === 0 ? '' : ` — fehlen: ${missingPairs.join(', ')}`));

	console.log('\nKennzahlen (C.14.8 „Nachzuweisen")');
	console.log(`  Stellungen                       ${TOTAL.toLocaleString('de-DE')}`);
	console.log(`  Auszahlung                       ${result.totalUnits.toLocaleString('de-DE')} Kredite`);
	console.log(`  Auszahlungsquote                  ${formatPercent(quote)}`);
	console.log(`  Rundenhöchstgewinn                ${result.maxAmount} (${result.maxAmountCount.toLocaleString('de-DE')}× )`);
	console.log(`  Beitrag Linien (ausgezählt)        ${result.lineUnitsTotal.toLocaleString('de-DE')} Kredite`);
	console.log(`  Beitrag Feldzählung (ausgezählt)   ${result.fieldUnitsTotal.toLocaleString('de-DE')} Kredite`);
	console.log(`  Trefferhäufigkeit je Runde         ${formatPercent((TOTAL - result.blanks) / TOTAL)}`);
	console.log('  Die zwanzig häufigsten Rundengewinne:');
	const sortedByFrequency = [...result.amountCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
	for (const [amount, count] of sortedByFrequency) {
		console.log(`    Gewinn ${String(amount).padStart(4)}  →  ${count.toLocaleString('de-DE')} Stellungen`
			+ ` (${formatPercent(count / TOTAL)})`);
	}
}

// ---------------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------------

const source = await readRulesSource();

const strips = extractIndexedStringLists(source, 'STRIPS');
const defaultGrid = extractIndexedStringLists(source, 'DEFAULT_GRID');
const defaultPositions = extractIntList(source, 'DEFAULT_POSITIONS');
const guaranteedReels = extractIntList(source, 'GUARANTEED_REELS');
const phpSymbols = extractStringList(source, 'SYMBOLS');
const phpSmallFruits = extractStringList(source, 'SMALL_FRUITS');
const phpLineSymbols = extractStringList(source, 'LINE_SYMBOLS');
const phpLines = extractLines(source);
const phpPaytable = extractPaytable(source);
const phpFieldLadder = extractIntMap(source, 'FIELD_LADDER');
const phpRows = extractScalar(source, 'ROWS');
const phpReels = extractScalar(source, 'REELS');
const phpLap = extractScalar(source, 'POSITIONS_PER_STRIP');
const phpStake = extractScalar(source, 'STAKE');
const phpMinChain = extractScalar(source, 'MIN_CHAIN');
const phpMaxLineValue = extractScalar(source, 'MAX_LINE_VALUE');
const phpFieldCapAt = extractScalar(source, 'FIELD_CAP_AT');
const phpFieldMax = extractScalar(source, 'FIELD_MAX');
const phpChainLengths = extractIntList(source, 'CHAIN_LENGTHS');

// STAND F3-Behebungslauf (REVIEW-fruitrisk-f3.md [M4]): GUARANTEED_REELS/
// FREE_REELS oben (Skript-Konstanten) sind KEINE Datenquelle mehr für P-4 —
// P-4 bekommt ab jetzt die aus Rules.php GELESENE Liste. Der Vergleich
// unten gegen die Skript-Konstante bleibt als eigene, zusätzliche
// Konzeptprüfung stehen ("GUARANTEED_REELS ist wirklich [0,1,2,3]"), aber
// getrennt von der Datenquelle — ändert sich GUARANTEED_REELS in Rules.php
// künftig, prüft P-4 trotzdem die WIRKLICHE Liste, statt zwei sich
// widersprechende Wahrheiten gleichzeitig zu benutzen.
const freeReelsFromPhp = [...Array(REELS).keys()].filter((r) => !guaranteedReels.includes(r));

check(guaranteedReels.join(',') === GUARANTEED_REELS.join(','),
	`GUARANTEED_REELS in Rules.php ist [${guaranteedReels.join(',')}] (erwartet [${GUARANTEED_REELS.join(',')}])`
	+ ' — zusätzliche Konzeptprüfung, nicht die Datenquelle für P-4');

checkStripsStructure(strips);
checkNoAdjacentDuplicates(strips);
checkLineSymbolSpacing(strips);
checkGuarantee(strips, guaranteedReels, freeReelsFromPhp);
checkLineSymbolRank(strips);
checkCompleteness(strips);
checkDefaultGridOnStrips(strips, defaultPositions, defaultGrid);

checkParity({
	symbols: phpSymbols, smallFruits: phpSmallFruits, lineSymbols: phpLineSymbols,
	lines: phpLines, paytable: phpPaytable, fieldLadder: phpFieldLadder,
	rows: phpRows, reels: phpReels, lap: phpLap, stake: phpStake,
	minChain: phpMinChain, maxLineValue: phpMaxLineValue,
	fieldCapAt: phpFieldCapAt, fieldMax: phpFieldMax, chainLengths: phpChainLengths,
});

checkPaytableForm();
checkLinesForm();

const closed = checkClosedForm(strips);

await checkMarkupMatchesDefaultGrid(defaultGrid, strips, defaultPositions);
await checkReadmePlaceholder();

if (!schnell) {
	reportFullEnumeration(enumerateAll(strips), closed);
}

console.log(failed
	? '\nERGEBNIS: mindestens eine Prüfung ist rot — siehe FEHLER-Zeilen oben.'
	: schnell
		? '\nERGEBNIS: alle Schnellprüfungen grün (P-1…P-11, P-17). Quote und Verteilung (P-12…P-16, P-18)'
			+ ' sind ungeprüft — dafür ist der volle Lauf ohne --schnell da.'
		: '\nERGEBNIS: alle Prüfungen grün, einschließlich der vollständigen Auszählung.');

process.exit(failed ? 1 : 0);
