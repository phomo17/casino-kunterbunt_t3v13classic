/**
 * Reel Slot – Gewinntabelle und Auswertung
 * ========================================================
 *
 * DIE EINZIGE QUELLE DER SPIELREGELN.
 *
 * Dieselbe Datei wird zweimal benutzt:
 *   1. im Browser vom Spielkern (machine.js), um eine Runde auszuwerten,
 *   2. im Entwicklerwerkzeug Resources/Private/Scripts/verify-payout.mjs,
 *      das damit alle 8000 Kombinationen durchrechnet und die Quote von
 *      exakt 0,98000 nachweist.
 *
 * Das ist der Grund, warum der Nachweis überhaupt etwas wert ist: geprüft
 * wird nicht eine Nachbildung der Regeln, sondern die Regeln selbst.
 *
 * DESHALB HAT DIESE DATEI KEINEN EINZIGEN IMPORT. Sie darf niemals einen
 * bekommen: Node kennt die Import-Map von TYPO3 nicht und könnte einen
 * „bare specifier" wie '@phomo17/…' nicht auflösen. Reine Daten und eine
 * reine Funktion, kein DOM, kein Browser.
 *
 * Nicht hier drin: die Walzenbänder aus Anhang C. Die haben ihre eigene,
 * schon bestehende Quelle in Classes/Rules.php und stehen im Browser über
 * data-rs-strip im DOM (DECISIONS.md, Phase 5).
 *
 * Auch nicht hier drin: die gedruckte Fassung des Gewinnplans. Sie steht
 * ausgeschrieben im Gehäuse-SVG (Shell.html) — bedruckte Pappe hinter Glas
 * ist Gestaltung, kein Programmzustand (DECISIONS.md, Phase 5).
 * Wer eine Zeile ändert, muss beides ändern. Das ist gewollt: die gedruckte
 * Karte auf einem echten Gerät ist ebenfalls eine zweite, von Hand gesetzte
 * Wahrheit.
 */

/**
 * Platzhalter in einem Muster: passt auf jedes Symbol.
 *
 * Damit lassen sich die beiden positionsabhängigen Kirschen-Zeilen aus
 * CONCEPT.md Abschnitt 3.3 als ganz gewöhnliche Muster schreiben, statt als
 * Sonderfälle im Programmablauf.
 */
export const ANY = '*';

/**
 * Die neun Gewinnzeilen, ABSTEIGEND nach Wert sortiert.
 *
 * Die Reihenfolge ist Teil der Regel, nicht Geschmackssache: CONCEPT.md
 * Abschnitt 3.3 sagt „Es zählt immer nur die höchste zutreffende Zeile,
 * nicht die Summe mehrerer Zeilen". In einer absteigend sortierten Liste ist
 * das gleichbedeutend mit „der erste Treffer gewinnt". Deshalb sucht
 * evaluate() von oben und hört beim ersten Treffer auf.
 *
 * Die Werte sind Faktoren für Einsatz 1. Der ausgezahlte Betrag ist
 * Faktor × Einsatz (CONCEPT.md Abschnitt 3.3).
 *
 * @type {ReadonlyArray<{id: string, pattern: ReadonlyArray<string>, factor: number}>}
 */
export const PAYTABLE = Object.freeze([
	Object.freeze({ id: 'sieben3',  pattern: Object.freeze(['sieben',  'sieben',  'sieben']),  factor: 100 }),
	Object.freeze({ id: 'bar3',     pattern: Object.freeze(['bar',     'bar',     'bar']),     factor: 50 }),
	Object.freeze({ id: 'glocke3',  pattern: Object.freeze(['glocke',  'glocke',  'glocke']),  factor: 20 }),
	Object.freeze({ id: 'melone3',  pattern: Object.freeze(['melone',  'melone',  'melone']),  factor: 14 }),
	Object.freeze({ id: 'orange3',  pattern: Object.freeze(['orange',  'orange',  'orange']),  factor: 10 }),
	Object.freeze({ id: 'zitrone3', pattern: Object.freeze(['zitrone', 'zitrone', 'zitrone']), factor: 8 }),
	Object.freeze({ id: 'kirsche3', pattern: Object.freeze(['kirsche', 'kirsche', 'kirsche']), factor: 5 }),
	// Kirsche auf Walze 1 UND 2. Walze 3 ist gleichgültig — wäre dort auch
	// eine Kirsche, hätte schon die Zeile darüber getroffen.
	Object.freeze({ id: 'kirsche2', pattern: Object.freeze(['kirsche', 'kirsche', ANY]),       factor: 3 }),
	// Kirsche NUR auf Walze 1. Walze 2 und 3 sind gleichgültig — wäre auf
	// Walze 2 eine Kirsche, hätte schon die Zeile darüber getroffen.
	Object.freeze({ id: 'kirsche1', pattern: Object.freeze(['kirsche', ANY,       ANY]),       factor: 1 }),
]);

/**
 * Die sieben Symbolnamen, abgeleitet statt abgeschrieben.
 *
 * Jedes Symbol kommt in genau einer Dreier-Zeile vor, also enthält die
 * Musterliste alle sieben. Eine getippte zweite Liste könnte von der ersten
 * abweichen; eine abgeleitete kann das nicht.
 *
 * @type {ReadonlyArray<string>}
 */
export const SYMBOLS = Object.freeze([
	...new Set(PAYTABLE.flatMap((row) => row.pattern).filter((name) => name !== ANY)),
]);

/**
 * Passt ein Muster auf die drei sichtbaren Symbole?
 *
 * @param {ReadonlyArray<string>} pattern
 * @param {ReadonlyArray<string>} symbols
 * @returns {boolean}
 */
function matches(pattern, symbols) {
	for (let reel = 0; reel < 3; reel++) {
		if (pattern[reel] !== ANY && pattern[reel] !== symbols[reel]) {
			return false;
		}
	}
	return true;
}

/**
 * Wertet die drei Symbole auf der Gewinnlinie aus.
 *
 * @param {ReadonlyArray<string>} symbols genau drei Symbolnamen,
 *        von links nach rechts: Walze 1, Walze 2, Walze 3
 * @returns {?{id: string, factor: number, reels: ReadonlyArray<boolean>}}
 *          null, wenn keine Zeile trifft. Sonst die getroffene Zeile;
 *          "reels" sagt je Walze, ob sie am Treffer beteiligt ist — genau
 *          die Walzen, deren Musterfeld kein Platzhalter ist. Daraus setzt
 *          machine.js die Hervorhebung .rs-reel--win.
 * @throws {TypeError} bei allem, was keine drei Symbolnamen sind
 */
export function evaluate(symbols) {
	if (!Array.isArray(symbols) || symbols.length !== 3) {
		throw new TypeError('evaluate() erwartet genau drei Symbolnamen.');
	}

	for (const row of PAYTABLE) {
		if (matches(row.pattern, symbols)) {
			return Object.freeze({
				id: row.id,
				factor: row.factor,
				reels: Object.freeze(row.pattern.map((name) => name !== ANY)),
			});
		}
	}

	return null;
}

export default evaluate;
