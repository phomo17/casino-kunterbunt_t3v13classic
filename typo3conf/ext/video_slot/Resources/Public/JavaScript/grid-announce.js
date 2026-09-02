/**
 * Video Slot – der Live-Bereich des Sichtfelds
 * =============================================================
 *
 * Vier Satzmuster für genau einen Live-Bereich: den bereits in Grid.html
 * ausgelieferten `[data-vs-grid-announce]` (role="status"). Kein neuer
 * Live-Bereich entsteht hier — das Ergebnis reist durch den Bereich des
 * Sichtfelds, der seit Phase 6d im Markup steht (DECISIONS.md, Anhang der
 * Phase-6-Planung, Kandidat 7). Die Zahl der `role="status"`-Bereiche am
 * Gehäuse bleibt damit bei sieben.
 *
 * Die vier Satzmuster und die neun Symbolnamen stehen als data-Attribute
 * an genau diesem Element (Grid.html) — dieselbe Bauform wie das
 * Meldungsschild und die Nixie-Ansagen: Attribute werden von Hilfsmitteln
 * nicht vorgelesen, der Live-Bereich bleibt still, bis sein Textinhalt sich
 * ändert.
 *
 * Ein Satz je Runde, nicht fünfzehn Bruchstücke: erst der Feldzustand Walze
 * für Walze (showGrid), dann Betrag und getroffene Linien (showResult).
 * clear() räumt den Bereich beim Rundenstart ab, damit während des Laufs
 * keine veraltete Behauptung dasteht und es bei genau einer Ansage je Runde
 * bleibt.
 *
 * Satzzeichen (", " innerhalb einer Walze, "; " zwischen den Walzen)
 * entstehen hier in JavaScript, nicht in der Sprachdatei — Satzzeichen sind
 * keine Übersetzung (dieselbe Begründung wie beim Gedankenstrich im
 * CabinetProcessor).
 *
 * Entprellt wird nach demselben Muster wie nixie.js/bank.js: die erste
 * Ansage beim Seitenaufbau geht ohne Wartezeit hinaus (Anfangsstand, keine
 * Änderungsmeldung), jede weitere frühestens nach ANNOUNCE_MS.
 */

/** Ruhezeit vor einer Ansage, in Millisekunden. Dieselbe wie an den übrigen
 *  entprellten Ansagen dieses Automaten. */
const ANNOUNCE_MS = 700;

/** Die neun Symbolnamen, für die Namen aus data-vs-name-* gelesen werden. */
const SYMBOLS = Object.freeze([
	'sieben', 'glocke', 'weintraube', 'melone', 'pflaume',
	'orange', 'zitrone', 'kirsche', 'scatter',
]);

/**
 * Der Live-Bereich des Sichtfelds.
 */
export class GridAnnouncer {
	/**
	 * @param {HTMLElement} element das [data-vs-grid-announce]
	 */
	constructor(element) {
		this.element = element;

		/** @type {Record<string, string>} Symbolname → Anzeigename. */
		this.names = {};
		for (const symbol of SYMBOLS) {
			this.names[symbol] = element.dataset[`vsName${symbol.charAt(0).toUpperCase()}${symbol.slice(1)}`] ?? symbol;
		}

		this.templateGrid = element.dataset.vsTextGrid ?? '';
		this.templateWin = element.dataset.vsTextWin ?? '';
		this.templateWinscatter = element.dataset.vsTextWinscatter ?? '';
		this.templateScatteronly = element.dataset.vsTextScatteronly ?? '';
		this.templateBlank = element.dataset.vsTextBlank ?? '';

		/** Laufender Ansage-Zeitgeber, oder 0. */
		this.announceTimer = 0;

		/** Wurde schon einmal angesagt? Die erste Ansage wartet nicht. */
		this.announced = false;
	}

	/**
	 * Baut die Aufzählung der sichtbaren Symbole: innerhalb einer Walze mit
	 * ", ", zwischen den Walzen mit "; ".
	 *
	 * @param {string[][]} grid drei Zeilen zu je fünf Symbolnamen
	 * @returns {string}
	 */
	describeGrid(grid) {
		const reels = [];
		for (let reel = 0; reel < 5; reel++) {
			const column = [];
			for (let row = 0; row < 3; row++) {
				column.push(this.names[grid[row][reel]] ?? grid[row][reel]);
			}
			reels.push(column.join(', '));
		}
		return reels.join('; ');
	}

	/**
	 * Sagt den bloßen Feldzustand an, ohne Ergebnis.
	 *
	 * @param {string[][]} grid
	 * @returns {void}
	 */
	showGrid(grid) {
		this.announce(this.templateGrid.replace('{0}', this.describeGrid(grid)));
	}

	/**
	 * Sagt Feldzustand und Ergebnis einer ausgewerteten Runde an.
	 *
	 * @param {string[][]} grid
	 * @param {{lines: ReadonlyArray<{index: number}>, scatter: ?{count: number}}} result
	 * @param {number} win Gewinnbetrag
	 * @returns {void}
	 */
	showResult(grid, result, win) {
		const description = this.describeGrid(grid);
		const lineNumbers = result.lines.map((line) => String(line.index)).join(', ');

		let text;
		if (result.lines.length > 0 && result.scatter !== null) {
			text = this.templateWinscatter
				.replace('{0}', description)
				.replace('{1}', String(win))
				.replace('{2}', lineNumbers)
				.replace('{3}', String(result.scatter.count));
		} else if (result.lines.length > 0) {
			text = this.templateWin
				.replace('{0}', description)
				.replace('{1}', String(win))
				.replace('{2}', lineNumbers);
		} else if (result.scatter !== null) {
			text = this.templateScatteronly
				.replace('{0}', description)
				.replace('{1}', String(win))
				.replace('{2}', String(result.scatter.count));
		} else {
			text = this.templateBlank.replace('{0}', description);
		}

		this.announce(text);
	}

	/**
	 * Leert die Ansage. Beim Rundenstart gerufen: ein leerer Text sagt
	 * nichts an, so bleibt es bei genau einer Ansage je Runde, und während
	 * des Laufs steht keine veraltete Behauptung da.
	 *
	 * @returns {void}
	 */
	clear() {
		this.announce('');
	}

	/**
	 * Schreibt in den Live-Bereich — entprellt, dasselbe Muster wie
	 * nixie.js/bank.js.
	 *
	 * @param {string} text
	 * @returns {void}
	 */
	announce(text) {
		if (this.element.textContent === text) {
			return;
		}

		this.clearAnnounceTimer();

		if (!this.announced) {
			this.announced = true;
			this.element.textContent = text;
			return;
		}

		this.announceTimer = globalThis.setTimeout(() => {
			this.announceTimer = 0;
			this.element.textContent = text;
		}, ANNOUNCE_MS);
	}

	/** @returns {void} */
	clearAnnounceTimer() {
		if (this.announceTimer !== 0) {
			globalThis.clearTimeout(this.announceTimer);
			this.announceTimer = 0;
		}
	}

	/**
	 * Räumt Zeitgeber und Text ab. Wird beim Verlassen der Seite gerufen.
	 *
	 * @returns {void}
	 */
	destroy() {
		this.clearAnnounceTimer();
		this.element.textContent = '';
	}
}

export default GridAnnouncer;
