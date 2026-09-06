/**
 * FruitRisk – der Live-Bereich des Sichtfelds
 * ==============================================
 *
 * Der Satz, den ein Bildschirmleser nach jeder Runde hört. Er benutzt den
 * bereits ausgelieferten Live-Bereich „grid" (announce.js) — KEIN neuer wird
 * angelegt (CONCEPT.md C.14.12).
 *
 * EIN SATZ JE RUNDE, NICHT DREISSIG BRUCHSTÜCKE
 * -------------------------------------------------
 * Erst der Feldzustand, dann Betrag, getroffene Linien und die Feldzählung.
 * clear() räumt den Bereich beim Rundenstart ab, damit während des Laufs
 * keine veraltete Behauptung dasteht.
 *
 * DIE FELDZÄHLUNG NENNT NUR, WAS WIRKLICH ZAHLT
 * ---------------------------------------------------
 * Alle drei kleinen Früchte zu nennen, auch wenn eine mit null Treffern
 * dabei ist, hieße, eine Null vorzulesen. describeField() lässt Nullen weg.
 *
 * SATZZEICHEN SIND KEINE ÜBERSETZUNG
 * --------------------------------------
 * ", " innerhalb einer Walze, "; " zwischen den Walzen, und die Aufzählung
 * der getroffenen Linien entstehen hier in JavaScript, nicht in der
 * Sprachdatei — dieselbe Begründung wie beim Gedankenstrich im
 * CabinetProcessor.
 *
 * GRENZE, EHRLICH BENANNT: „und" ist ein deutsches Wort in einer
 * JavaScript-Datei. Es steht als einzige Ausnahme in CONJUNCTION unten. Käme
 * je eine zweite Sprache dazu, gehörte diese eine Konstante nach
 * locallang.xlf.
 *
 * SYMBOLS, ROWS UND REELS KOMMEN AUS paytable.js (Behebungslauf
 * REVIEW-fruitrisk-f4.md [M7]): paytable.js exportiert die zwölf Symbolnamen
 * (als Schlüssel von PAYTABLE), ROWS und REELS bereits; diese Datei schrieb
 * sie bislang ein zweites Mal auf (die Namensliste hier) beziehungsweise ein
 * drittes Mal (die Literale 6 und 5 in describeGrid()). paytable.js hat
 * selbst keinen Import und wird unter Node genauso geladen wie diese Datei
 * (verify-credit.mjs, Block M).
 */

import { SYMBOLS, ROWS, REELS } from '@phomo17/fruit-risk/paytable.js';

/**
 * Das einzige deutsche Wort in dieser Datei — siehe Dateikopf, „GRENZE,
 * EHRLICH BENANNT".
 */
const CONJUNCTION = ' und ';

/**
 * Verbindet eine Liste von Zahlen zu einer gesprochenen Aufzählung:
 * [3, 7, 12] → "3, 7 und 12".
 *
 * @param {number[]} numbers
 * @returns {string}
 */
function joinNumbers(numbers) {
	if (numbers.length === 0) {
		return '';
	}
	if (numbers.length === 1) {
		return String(numbers[0]);
	}
	const head = numbers.slice(0, -1).join(', ');
	const tail = numbers[numbers.length - 1];
	return `${head}${CONJUNCTION}${tail}`;
}

export class GridAnnouncer {
	/**
	 * @param {import('./announce.js').LiveRegion} region der Bereich „grid"
	 */
	constructor(region) {
		this.region = region;
		const data = region.data;

		/** @type {Record<string, string>} Symbolname → Anzeigename. */
		this.names = {};
		for (const symbol of SYMBOLS) {
			const key = `frName${symbol.charAt(0).toUpperCase()}${symbol.slice(1)}`;
			this.names[symbol] = data[key] ?? symbol;
		}

		this.templateGrid = data.frTextGrid ?? '';
		this.templateResult = data.frTextResult ?? '';
		this.templateResultField = data.frTextResultfield ?? '';
		// Behebungslauf REVIEW-fruitrisk-f4.md [M5]: eine dritte Fassung für
		// den Fall, dass Linien gezahlt haben, aber KEINE der drei kleinen
		// Früchte im Feld zweimal vorkommt — describeField() liefert dann ''.
		// Ohne diese Fassung endete der Satz mit „Im Feld: ." (siehe unten,
		// showResult()).
		this.templateResultLinesOnly = data.frTextResultlinesonly ?? '';
		this.templateFieldPart = data.frTextFieldpart ?? '';
	}

	/**
	 * Baut die Aufzählung der dreißig sichtbaren Symbole: innerhalb einer
	 * Walze mit ", ", zwischen den Walzen mit "; ". Gelesen wird
	 * spaltenweise — so, wie ein Mensch ein Walzengerät liest.
	 *
	 * @param {string[][]} grid fünf Zeilen zu je sechs Symbolnamen
	 * @returns {string}
	 */
	describeGrid(grid) {
		const reels = [];
		for (let reel = 0; reel < REELS; reel++) {
			const column = [];
			for (let row = 0; row < ROWS; row++) {
				column.push(this.names[grid[row][reel]] ?? grid[row][reel]);
			}
			reels.push(column.join(', '));
		}
		return reels.join('; ');
	}

	/**
	 * Die Feldzählung als Text — nur die Früchte, die WIRKLICH zahlen. Alle
	 * drei zu nennen hieße, eine Null vorzulesen.
	 *
	 * @param {{counts: Record<string, number>, parts: Record<string, number>}} field
	 * @returns {string}
	 */
	describeField(field) {
		return Object.entries(field.parts)
			.filter(([, amount]) => amount > 0)
			.map(([fruit]) => this.templateFieldPart
				.replace('{0}', String(field.counts[fruit]))
				.replace('{1}', this.names[fruit] ?? fruit))
			.join(', ');
	}

	/**
	 * Feldzustand und Ergebnis einer ausgewerteten Runde — EIN Satz.
	 *
	 * DREI FASSUNGEN, NICHT ZWEI (Behebungslauf REVIEW-fruitrisk-f4.md [M5]):
	 * neben „nur Feldzählung" (keine Linie hat gezahlt) und „Linien plus
	 * Feldzählung" gibt es den Fall, dass Linien gezahlt haben, aber
	 * describeField() '' liefert — keine der drei kleinen Früchte kommt im
	 * Sichtfeld mehrfach vor. Der Feldteil wird deshalb NUR angehängt, wenn
	 * dort wirklich Text steht; sonst kommt die dritte Fassung ohne
	 * Feldsatzstück zum Zug, statt mit „Im Feld: ." zu enden.
	 *
	 * @param {string[][]} grid
	 * @param {{amount: number, lines: ReadonlyArray<{index: number}>, field: object}} result
	 * @returns {void}
	 */
	showResult(grid, result) {
		const description = this.describeGrid(grid);
		const fieldText = this.describeField(result.field);

		let text;
		if (result.lines.length === 0) {
			text = this.templateResultField
				.replace('{0}', description)
				.replace('{1}', String(result.amount))
				.replace('{2}', fieldText);
		} else if (fieldText === '') {
			text = this.templateResultLinesOnly
				.replace('{0}', description)
				.replace('{1}', String(result.amount))
				.replace('{2}', joinNumbers(result.lines.map((line) => line.index)));
		} else {
			text = this.templateResult
				.replace('{0}', description)
				.replace('{1}', String(result.amount))
				.replace('{2}', joinNumbers(result.lines.map((line) => line.index)))
				.replace('{3}', fieldText);
		}

		this.region.say(text);
	}

	/** Beim Rundenstart: der Bereich wird geleert (C.14.12). */
	clear() {
		this.region.clear();
	}
}

export default GridAnnouncer;
