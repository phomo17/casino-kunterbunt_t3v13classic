/**
 * Roulette – die Feldliste des Tuchs (Anhang F)
 * ==============================================
 *
 * Diese Datei ist die MASSGEBLICHE Fassung der Feldliste: sie beschreibt
 * jede der 159 Wetten, die sich auf dem Tuch legen lassen — mit Kennung,
 * abgedeckten Zahlen, Auszahlungsverhältnis, Höchsteinsatz und Lage im
 * Gitter. Der geteilte Baustein table-bets.js (Phase C1) macht daraus die
 * Buchführung; er kennt kein Spiel und bekommt genau diese Liste übergeben.
 * Classes/BetLayout.php ist ein geprüfter PHP-Spiegel dieser Datei
 * (verify-felt.mjs, Prüfung F-1); diese hier bleibt die eine Quelle.
 *
 * KEIN IMPORT, KEIN DOKUMENT
 * --------------------------
 * Kein import, kein document, kein window, kein Math.random. Genau wie
 * wheel-geometry.js wird diese Datei von den Prüfskripten unmittelbar unter
 * Node geladen — Node kennt die Import-Map von TYPO3 nicht. Der Nachweis
 * (verify-bets.mjs) rechnet mit DIESER Datei, nicht mit einer Nachbildung.
 *
 * WARUM DIE ABGEDECKTEN ZAHLEN ZEICHENKETTEN SIND
 * ------------------------------------------------
 * wheel-geometry.js liefert jede Fachbeschriftung als Zeichenkette ('0',
 * '00', '17'), weil '00' keine Zahl ist. table-bets.js vergleicht mit ===
 * und lässt Zeichenketten ausdrücklich zu. Deshalb sind ALLE covers-
 * Einträge Zeichenketten — durchgehend, ohne Ausnahme.
 *
 * WAS HIER STEHT — UND WAS SEIT DEM UMBAU NACH DER BILDVORLAGE NICHT MEHR
 * ------------------------------------------------------------------------
 * Diese Datei führt, was die BUCHFÜHRUNG braucht: Kennung, Art, abgedeckte
 * Zahlen, Auszahlung, Höchsteinsatz und die Lage im Gitter. Was gezeichnet
 * und vorgelesen wird — die englische Aufschrift, das farbige Oval, die
 * Raute, der deutsche Name —, steht ausschließlich in Classes/BetLayout.php.
 * Bis zum Umbau standen die drei Eigenschaften printed, labelKey und
 * labelArgs auch hier; gelesen hat sie im Browser nie eine Zeile. Sie waren
 * ein toter Zwilling, den der Nachweis F-1 mitpflegen musste. Dieselbe
 * Aufteilung wie am Würfeltisch.
 *
 * DIE ANORDNUNG DES TUCHS, AUS DER ALLES FOLGT
 * ----------------------------------------------
 * Zwölf Tuchspalten i = 1…12, drei Zeilen r = 1…3. Tuchspalte i trägt die
 * Zahlen 3i−2 (Zeile 1), 3i−1 (Zeile 2), 3i (Zeile 3). Zeile 1 ist damit
 * Kolonne 1 (1, 4, …, 34), Zeile 3 Kolonne 3 (3, 6, …, 36). Links davon die
 * Nullspalte: '0' liegt an Zeile 1 an, '00' an Zeile 3 — beide reichen mit
 * ihrer eigenen, doppelt so hohen Fläche bis an die mittlere Zeile 2 heran,
 * ohne sie zu erreichen (0 und 2 berühren sich in diesem Bild NICHT; die
 * Deckung 0+00+2 bleibt über die Dreierwette t-0-00-2 erreichbar).
 *
 *   Spalte:   0/00   1    4    7   10   13   16   19   22   25   28   31   34
 *             ┌──┐  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐
 *   Zeile 1   │  │  │ 1│ │ 4│ │ 7│ │10│ │13│ │16│ │19│ │22│ │25│ │28│ │31│ │34│
 *             │0 │  ├──┤ ├──┤ ├──┤ ├──┤ ├──┤ ├──┤ ├──┤ ├──┤ ├──┤ ├──┤ ├──┤ ├──┤
 *   Zeile 2   │  │  │ 2│ │ 5│ │ 8│ │11│ │14│ │17│ │20│ │23│ │26│ │29│ │32│ │35│
 *             ├──┤  ├──┤ ├──┤ ├──┤ ├──┤ ├──┤ ├──┤ ├──┤ ├──┤ ├──┤ ├──┤ ├──┤ ├──┤
 *   Zeile 3   │00│  │ 3│ │ 6│ │ 9│ │12│ │15│ │18│ │21│ │24│ │27│ │30│ │33│ │36│
 *             └──┘  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘
 *
 * Aus genau dieser Anordnung ergeben sich die Nachbarschaften, und aus den
 * Nachbarschaften die Splits, Ecken und Sechserreihen — sie werden GERECHNET,
 * nicht abgeschrieben (siehe die sieben Schleifen in buildFields()).
 *
 * DIE LAGE IST EIN DATUM, KEIN GESTALTUNGSBESCHLUSS
 * ---------------------------------------------------
 * col/colEnd/row/rowEnd sind CSS-Grid-Linien (grid-column / grid-row) auf
 * einem Gitter mit 27 Spalten- und 9 Zeilenspuren (siehe felt.css, Phase
 * C3c). Sie stehen hier und nicht erst im PHP, weil die Lage eines Feldes
 * seine Bedeutung IST: ein Viererblock ist der Punkt, an dem sich vier
 * Zahlen berühren. Stünde die Lage nur im PHP, könnte kein Nachweis mehr
 * prüfen, dass ein Linienfeld tatsächlich zwischen genau den Zahlen liegt,
 * die es abdeckt (siehe verify-bets.mjs, Prüfung B-7 und B-9).
 */

/** Gesamteinsatz je Runde über ALLE Felder (Anhang F). */
export const ROUND_MAX = 100;

/** Höchsteinsatz je Feld (Anhang F): min(10 € × abgedeckte Zahlen, 100 €). */
export function fieldMax(coveredCount) {
	if (!Number.isInteger(coveredCount) || coveredCount < 1) {
		throw new RangeError(`fieldMax() erwartet eine ganze Zahl ab 1, bekam: ${String(coveredCount)}`);
	}
	return Math.min(10 * coveredCount, ROUND_MAX);
}

/**
 * Auszahlungsverhältnis je Anzahl abgedeckter Zahlen (Anhang F).
 * 5 abgedeckte Zahlen gibt es NUR bei der Fünferwette; sie zahlt 6 : 1 und
 * ist damit die einzige Wette des Spiels mit 92,11 % statt 94,74 %.
 */
export const PAYOUT_BY_COVERED = Object.freeze({ 1: 35, 2: 17, 3: 11, 4: 8, 5: 6, 6: 5, 12: 2, 18: 1 });

/** Die roten Zahlen (Anhang F) — ein zweites Mal geschrieben, nicht importiert (diese Datei bleibt importfrei). verify-bets.mjs (B-10) gleicht sie gegen wheel-geometry.js ab. */
const RED = Object.freeze([
	'1', '3', '5', '7', '9', '12', '14', '16', '18',
	'19', '21', '23', '25', '27', '30', '32', '34', '36',
]);

/** Die schwarzen Zahlen (Anhang F) — dieselbe Machart wie RED. */
const BLACK = Object.freeze([
	'2', '4', '6', '8', '10', '11', '13', '15', '17',
	'20', '22', '24', '26', '28', '29', '31', '33', '35',
]);

/** Die Zahl in Tuchspalte i, Zeile r (Anhang F: 3(i-1)+r). */
function numberAt(column, row) {
	return String(3 * (column - 1) + row);
}

/** Die zwölf Zahlen einer Kolonne (Zeile row), Tuchspalte 1…12. */
function columnNumbers(row) {
	const zahlen = [];
	for (let column = 1; column <= 12; column++) {
		zahlen.push(numberAt(column, row));
	}
	return zahlen;
}

/** Baut die vollständige Feldliste. Wird EINMAL beim Laden gerufen. */
function buildFields() {
	const felder = [];
	const push = (id, kind, covers, opts = {}) => {
		const payout = PAYOUT_BY_COVERED[covers.length];
		if (payout === undefined) {
			throw new RangeError(`Feld "${id}": ${covers.length} abgedeckte Zahlen sind in Anhang F nicht vorgesehen.`);
		}
		felder.push(Object.freeze({
			id,
			kind,                       // 'number'|'split'|'street'|'trio'|'corner'
			                            // |'five'|'sixline'|'column'|'dozen'|'even'
			covers: Object.freeze([...covers]),
			payout,
			max: fieldMax(covers.length),
			col: opts.col,              // CSS-Grid-Spaltenlinie (Anfang)
			colEnd: opts.colEnd ?? null,
			row: opts.row,              // CSS-Grid-Zeilenlinie (Anfang)
			rowEnd: opts.rowEnd ?? null,
		}));
	};

	// 1  Die beiden grünen Fächer und die 36 Zahlen  → 38 Felder
	push('n-0', 'number', ['0'], { col: 1, row: 2, rowEnd: 4 });
	push('n-00', 'number', ['00'], { col: 1, row: 5, rowEnd: 7 });
	for (let i = 1; i <= 12; i++) {
		for (let r = 1; r <= 3; r++) {
			const zahl = numberAt(i, r);
			push(`n-${zahl}`, 'number', [zahl], { col: 2 * i + 1, row: 2 * r });
		}
	}

	// 2  Splits: 24 senkrecht, 33 waagerecht, 3 an der Null → 60 Felder
	for (let i = 1; i <= 12; i++) {
		for (let r = 1; r <= 2; r++) {
			const a = numberAt(i, r);
			const b = numberAt(i, r + 1);
			push(`s-${a}-${b}`, 'split', [a, b], {
				col: 2 * i + 1, row: 2 * r + 1,
			});
		}
	}
	for (let i = 1; i <= 11; i++) {
		for (let r = 1; r <= 3; r++) {
			const a = numberAt(i, r);
			const b = numberAt(i + 1, r);
			push(`s-${a}-${b}`, 'split', [a, b], {
				col: 2 * i + 2, row: 2 * r,
			});
		}
	}
	push('s-0-00', 'split', ['0', '00'], { col: 1, row: 4 });
	push('s-0-1', 'split', ['0', '1'], { col: 2, row: 2 });
	push('s-00-3', 'split', ['00', '3'], { col: 2, row: 6 });

	// 3  Dreierreihen 12 + Trios 3 → 15 Felder
	for (let i = 1; i <= 12; i++) {
		const covers = [numberAt(i, 1), numberAt(i, 2), numberAt(i, 3)];
		push(`st-${covers[0]}`, 'street', covers, {
			col: 2 * i + 1, row: 1,
		});
	}
	push('t-0-1-2', 'trio', ['0', '1', '2'], { col: 2, row: 3 });
	push('t-0-00-2', 'trio', ['0', '00', '2'], { col: 2, row: 4 });
	push('t-00-2-3', 'trio', ['00', '2', '3'], { col: 2, row: 5 });

	// 4  Viererblöcke → 22 Felder
	for (let i = 1; i <= 11; i++) {
		for (let r = 1; r <= 2; r++) {
			const covers = [numberAt(i, r), numberAt(i, r + 1), numberAt(i + 1, r), numberAt(i + 1, r + 1)];
			push(`c-${numberAt(i, r)}`, 'corner', covers, {
				col: 2 * i + 2, row: 2 * r + 1,
			});
		}
	}

	// 5  Fünferwette → 1 Feld. Dokumentierte Ausnahme von der Nachbarschafts-
	// regel (Behebung Review C3, M1): die Lage (Spalte 2, Zeile 1) berührt
	// von den fünf abgedeckten Zahlen nur '0' und '1' (je im Eckpunkt); '00',
	// '2' und '3' berührt sie gar nicht. Bewusstes Tischzeichen — siehe
	// README, „Wetten, die es hier nicht gibt". verify-bets.mjs, Prüfung B-7,
	// hält diese Ausnahme fest (Lage UND die genau zwei berührten Zahlen),
	// statt sie stillschweigend zu übergehen.
	push('five', 'five', ['0', '00', '1', '2', '3'], {
		col: 2, row: 1,
	});

	// 6  Sechserreihen → 11 Felder
	for (let i = 1; i <= 11; i++) {
		const covers = [
			numberAt(i, 1), numberAt(i, 2), numberAt(i, 3),
			numberAt(i + 1, 1), numberAt(i + 1, 2), numberAt(i + 1, 3),
		];
		push(`sl-${covers[0]}`, 'sixline', covers, {
			col: 2 * i + 2, row: 1,
		});
	}

	// 7  Kolonnen 3, Dutzende 3, einfache Chancen 6 → 12 Felder
	for (let r = 1; r <= 3; r++) {
		const covers = columnNumbers(r);
		push(`col-${r}`, 'column', covers, {
			col: 27, row: 2 * r,
		});
	}
	for (let d = 1; d <= 3; d++) {
		const covers = [];
		for (let n = 12 * (d - 1) + 1; n <= 12 * d; n++) {
			covers.push(String(n));
		}
		push(`dz-${d}`, 'dozen', covers, {
			col: 8 * d - 5, colEnd: 8 * d + 2, row: 8,
		});
	}
	const EINFACHE_CHANCEN = [
		{ id: 'low', covers: Array.from({ length: 18 }, (_, k) => String(k + 1)) },
		{ id: 'even', covers: Array.from({ length: 18 }, (_, k) => String(2 * (k + 1))) },
		{ id: 'red', covers: RED },
		{ id: 'black', covers: BLACK },
		{ id: 'odd', covers: Array.from({ length: 18 }, (_, k) => String(2 * k + 1)) },
		{ id: 'high', covers: Array.from({ length: 18 }, (_, k) => String(k + 19)) },
	];
	EINFACHE_CHANCEN.forEach((chance, index) => {
		const j = index + 1;
		push(chance.id, 'even', chance.covers, {
			col: 4 * j - 1, colEnd: 4 * j + 2, row: 9,
		});
	});

	return Object.freeze(felder);
}

/** Die 159 Felder des amerikanischen Tuchs. */
export const FIELDS = buildFields();

/** Feld zu einer Kennung, oder undefined. */
export function fieldById(id) {
	return FIELDS.find((f) => f.id === id);
}
