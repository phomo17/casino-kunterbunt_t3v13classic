/**
 * Craps – die Wettliste, ihre Quoten und ihre Grenzen (CONCEPT.md Anhang H)
 * ==========================================================================
 *
 * Zahlen und Tabellen, kein Zustand, keine Bewegung. Der Ablauf über mehrere
 * Würfe steht in wagers-craps.js, die Verrechnung in round-craps.js, die
 * Zeichnung in Classes/BetLayout.php.
 *
 * KEIN IMPORT, KEIN DOKUMENT
 * --------------------------
 * Node lädt diese Datei unmittelbar (die Prüfskripte rechnen mit IHR, nicht
 * mit einer Nachbildung — CONCEPT.md C.5.3). Kein import, kein document, kein
 * window, kein Math.random. Dieselbe Zusage wie dice-geometry.js.
 *
 * WARUM DIE AUSZAHLUNGEN BRÜCHE SIND
 * ----------------------------------
 * 7 : 6 ist als Kommazahl nie genau. Der rechnerische Quotennachweis
 * (verify-bets.mjs, B-9) muss aber exakt sein — er vergleicht Erwartungswerte
 * wie -7/495 mit Anhang H. Deshalb: {num, den} statt 1.1666.
 *
 * WIE ABGERUNDET WIRD, UND WAS DARAUS FOLGT
 * -----------------------------------------
 * payout() rundet ab (Math.floor), weil es keine halben Chips gibt und
 * Aufrunden dem Haus Geld abnähme, das Anhang H nicht vorsieht. Daraus folgt
 * eine Einheit je Wette: ein Einsatz, der KEIN Vielfaches von ratio.den ist,
 * verliert den Rest der Auszahlung. Anhang H sagt das für Place-Wetten
 * ausdrücklich („Vielfache von 5" bzw. „von 6"); für Odds gilt dasselbe aus
 * demselben Grund. Die Einheit ist deshalb immer ratio.den — eine Regel statt
 * einer zweiten Tabelle. Das Tuch nennt sie im erreichbaren Namen jedes
 * betroffenen Feldes, und wagers-craps.js sagt es an, sobald ein Einsatz sie
 * verfehlt. Verschwiegen wird nichts.
 *
 * WARUM matches() WIRFT
 * ---------------------
 * BetTable (table-bets.js) verlangt von jedem Feld entweder covers oder
 * matches. An diesem Tisch wird BetTable.settle() aber NIE gerufen: eine
 * Craps-Wette läuft über mehrere Würfe, ihr Ausgang ist aus einem einzelnen
 * Wurf nicht ablesbar (C.8.4). Die Auswertung liegt vollständig in
 * wagers-craps.js. Ein matches(), das „false" lieferte, wäre eine halbe
 * Wahrheit, die jede Wette stillschweigend verlöre; deshalb wirft es. Ein
 * Aufruf ist ein Programmierfehler und soll laut sein.
 *
 * DIE EINZIGE ABGELEITETE WETTE DES TISCHES: C & E
 * ------------------------------------------------
 * „Craps & Eleven" ist keine eigene Quote, sondern eine Aufteilung: der
 * Einsatz zählt je zur Hälfte für Any Craps (7 zu 1) und für die Elf
 * (15 zu 1). Beide Quoten stehen in Anhang H, also braucht diese Wette
 * KEINEN eigenen 500.000-Runden-Nachweis — nur die Rechnung, dass die
 * Aufteilung aufgeht (verify-bets.mjs, B-13).
 *
 * Auf den GANZEN Einsatz umgerechnet zahlt sie
 *   bei 2, 3 oder 12   die halbe Wette 8fach zurück  = 4 × Einsatz  →  3 zu 1
 *   bei der 11         die halbe Wette 16fach zurück = 8 × Einsatz  →  7 zu 1
 * Beide Ergebnisse sind für JEDEN ganzen Einsatz wieder ganzzahlig — 4s und
 * 8s sind ganze Zahlen, auch wenn s ungerade ist. Deshalb gibt es hier KEINE
 * Regel für ungerade Einsätze und keinen Rundungsverlust: die Halbierung ist
 * die Erklärung der Wette, kein Rechenschritt. stakeUnit() liefert
 * folgerichtig 1.
 *
 * Der Erwartungswert je 1 € ist
 *   4/36 · (+3) + 2/36 · (+7) + 30/36 · (−1) = (12 + 14 − 30)/36 = −1/9,
 * also 11,11 % Hausvorteil — genau die Zeile, die Anhang H für Any Craps
 * führt. B-9 rechnet ihn nach, W-15 ein zweites Mal am echten Zustandswerk.
 */

/* ----------------------------------------------------- Grenzen aus Anhang H */

/** Gesamteinsatz je Wurf über alle Felder AUSSER den Odds (Anhang H). */
export const ROUND_MAX = 300;

/** Höchsteinsatz einer Linienwette. Grundlage aller Odds-Obergrenzen. */
export const LINE_MAX = 100;

/** Die sechs Point-Zahlen, in der Reihenfolge des Tuchs. */
export const POINTS = Object.freeze([4, 5, 6, 8, 9, 10]);

/**
 * Die Staffel 3-4-5× (Anhang H): Odds höchstens dreimal die Linienwette bei
 * Point 4 oder 10, viermal bei 5 oder 9, fünfmal bei 6 oder 8. So ist die
 * mögliche Auszahlung bei jedem Point gleich hoch — sechsmal die Linienwette.
 */
export const ODDS_MULT = Object.freeze({ 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3 });

/* -------------------------------------------------- Auszahlungen als Brüche */

/** @returns {{num: number, den: number}} */
function bruch(num, den) {
	return Object.freeze({ num, den });
}

/**
 * Jede Auszahlung aus Anhang H, als exakter Bruch „num zu den".
 * Die Zahlen stehen ausgeschrieben da und werden nirgends gerechnet — sie
 * sind der Text der Tabelle, nicht ihr Ergebnis.
 */
export const RATIO = Object.freeze({
	/** Pass, Don't Pass, Come, Don't Come und ihre Point-Kästen: 1 : 1 */
	line: bruch(1, 1),
	/** Place 4/10 9:5, 5/9 7:5, 6/8 7:6 */
	place: Object.freeze({
		4: bruch(9, 5), 5: bruch(7, 5), 6: bruch(7, 6),
		8: bruch(7, 6), 9: bruch(7, 5), 10: bruch(9, 5),
	}),
	/** Odds hinter Pass/Come: 4/10 2:1, 5/9 3:2, 6/8 6:5 */
	oddsLight: Object.freeze({
		4: bruch(2, 1), 5: bruch(3, 2), 6: bruch(6, 5),
		8: bruch(6, 5), 9: bruch(3, 2), 10: bruch(2, 1),
	}),
	/** Odds hinter Don't Pass/Don't Come: 4/10 1:2, 5/9 2:3, 6/8 5:6 */
	oddsDark: Object.freeze({
		4: bruch(1, 2), 5: bruch(2, 3), 6: bruch(5, 6),
		8: bruch(5, 6), 9: bruch(2, 3), 10: bruch(1, 2),
	}),
	/** Hard 4/10 7:1, Hard 6/8 9:1 */
	hard: Object.freeze({ 4: bruch(7, 1), 6: bruch(9, 1), 8: bruch(9, 1), 10: bruch(7, 1) }),
	/** Field: 1:1, die 2 zahlt 2:1, die 12 zahlt 3:1 */
	fieldPlain: bruch(1, 1),
	fieldTwo: bruch(2, 1),
	fieldTwelve: bruch(3, 1),
	/** Die Einmalwetten der Mitte */
	anySeven: bruch(4, 1),
	anyCraps: bruch(7, 1),
	two: bruch(30, 1),
	three: bruch(15, 1),
	eleven: bruch(15, 1),
	twelve: bruch(30, 1),
	/*
	 * C & E, auf den ganzen Einsatz umgerechnet. NICHT 7:1 und 15:1 — das
	 * sind die Quoten der beiden HALBEN Einsätze. Wer die halbe Wette 8fach
	 * zurückbekommt, bekommt 4 × den ganzen Einsatz, also 3 zu 1; wer sie
	 * 16fach zurückbekommt, 8 × den ganzen Einsatz, also 7 zu 1.
	 */
	crapsElevenCraps: bruch(3, 1),
	crapsElevenEleven: bruch(7, 1),
});

/* --------------------------------------------------------------- Rechnungen */

/**
 * Der Gewinnanteil einer Wette, ohne den zurückgegebenen Einsatz.
 * Abgerundet — siehe Dateikopf.
 * @param {number} stake
 * @param {{num: number, den: number}} ratio
 * @returns {number}
 */
export function payout(stake, ratio) {
	if (!Number.isInteger(stake) || stake < 0 || !ratio) {
		return 0;
	}
	return Math.floor((stake * ratio.num) / ratio.den);
}

/**
 * Der Höchsteinsatz einer Odds-Wette nach der Staffel 3-4-5×.
 *
 * Hell (hinter Pass/Come): ODDS_MULT × Linienwette.
 * Dunkel (hinter Don't Pass/Don't Come): so viel, dass der mögliche GEWINN
 * ebenfalls sechsmal die Linienwette beträgt — 6 × Linie × den / num,
 * abgerundet. Das ergibt 12× bei 4/10, 9× bei 5/9 und 7,2× bei 6/8.
 *
 * @param {number} point
 * @param {number} lineStake
 * @param {boolean} dark
 * @returns {number} 0, wenn kein gültiger Point oder keine Linienwette
 */
export function oddsMax(point, lineStake, dark = false) {
	if (!POINTS.includes(point) || !Number.isInteger(lineStake) || lineStake < 1) {
		return 0;
	}
	if (!dark) {
		return ODDS_MULT[point] * lineStake;
	}
	const r = RATIO.oddsDark[point];
	return Math.floor((6 * lineStake * r.den) / r.num);
}

/**
 * Der Bruch, mit dem ein Feld gewinnt.
 *
 * @param {string} fieldId
 * @param {{sum?: number, point?: ?number}} [ctx] sum für das Field-Feld,
 *        point für die beiden Odds-Felder hinter der Linie (deren Quote hängt
 *        am Point, nicht an ihrer Kennung)
 * @returns {?{num: number, den: number}} null, wenn es die Kennung nicht gibt
 *          oder die Quote im gegebenen Zusammenhang nicht bestimmt ist
 */
export function ratioFor(fieldId, ctx = {}) {
	const sum = Number(ctx.sum ?? 0);
	const point = ctx.point ?? null;

	if (fieldId === 'pass' || fieldId === 'dont-pass' || fieldId === 'come' || fieldId === 'dont-come') {
		return RATIO.line;
	}
	if (/^come-\d+$/.test(fieldId) || /^dont-come-\d+$/.test(fieldId)) {
		return RATIO.line;
	}
	if (fieldId === 'pass-odds') {
		return point === null ? null : (RATIO.oddsLight[point] ?? null);
	}
	if (fieldId === 'dont-pass-odds') {
		return point === null ? null : (RATIO.oddsDark[point] ?? null);
	}
	const hell = /^come-odds-(\d+)$/.exec(fieldId);
	if (hell) {
		return RATIO.oddsLight[Number(hell[1])] ?? null;
	}
	const dunkel = /^dont-come-odds-(\d+)$/.exec(fieldId);
	if (dunkel) {
		return RATIO.oddsDark[Number(dunkel[1])] ?? null;
	}
	const platz = /^place-(\d+)$/.exec(fieldId);
	if (platz) {
		return RATIO.place[Number(platz[1])] ?? null;
	}
	if (fieldId === 'field') {
		if (sum === 2) {
			return RATIO.fieldTwo;
		}
		if (sum === 12) {
			return RATIO.fieldTwelve;
		}
		return RATIO.fieldPlain;
	}
	const hart = /^hard-(\d+)$/.exec(fieldId);
	if (hart) {
		return RATIO.hard[Number(hart[1])] ?? null;
	}
	if (fieldId === 'any-seven') {
		return RATIO.anySeven;
	}
	if (fieldId === 'any-craps') {
		return RATIO.anyCraps;
	}
	if (fieldId === 'two') {
		return RATIO.two;
	}
	if (fieldId === 'three') {
		return RATIO.three;
	}
	if (fieldId === 'eleven') {
		return RATIO.eleven;
	}
	if (fieldId === 'twelve') {
		return RATIO.twelve;
	}
	/*
	 * C & E ist wie „field" kontextabhängig: bei der 11 zahlt sie anders als
	 * bei 2, 3 oder 12. Ohne Zusammenhang (sum fehlt) liefert sie die
	 * Craps-Quote — dieselbe Wahl wie bei „field", das ohne sum seine
	 * Grundquote 1:1 liefert. So bekommt B-8 („jede Kennung liefert für jede
	 * Summe eine Quote") auch hier nie null.
	 */
	if (fieldId === 'craps-eleven') {
		return sum === 11 ? RATIO.crapsElevenEleven : RATIO.crapsElevenCraps;
	}
	return null;
}

/**
 * Die Einsatz-Einheit eines Feldes: unterhalb eines Vielfachen davon
 * verschenkt der Abrundungsschritt einen Teil der Auszahlung.
 * Immer der Nenner der Quote — siehe Dateikopf.
 * @param {string} fieldId
 * @param {?number} [point] nur für die beiden Odds-Felder hinter der Linie
 * @returns {number} 1, wenn jeder Betrag glatt aufgeht
 */
export function stakeUnit(fieldId, point = null) {
	const r = ratioFor(fieldId, { point });
	return r === null ? 1 : r.den;
}

/* ------------------------------------------------------------ Die Feldliste */

/** Die Ausnahme, die BetTable.settle() an diesem Tisch verbietet. */
function nieAusgewertet(id) {
	return () => {
		throw new Error(
			`bets-craps.js: BetTable.settle() darf an diesem Tisch nicht gerufen werden (Feld "${id}").`
			+ ' Eine Craps-Wette läuft über mehrere Würfe; ausgewertet wird ausschließlich in wagers-craps.js.'
		);
	};
}

/**
 * @param {string} id
 * @param {{num: number, den: number}} ratio nur für die Zahl in BetField.payout
 * @param {number} max
 * @param {{odds?: boolean, payoutHint?: number}} [opts]
 * @returns {object} eine BetField-Beschreibung für table-bets.js
 */
function feld(id, ratio, max, opts = {}) {
	return Object.freeze({
		id,
		// label bleibt die Kennung: der deutsche Name kommt aus der XLIFF-Datei
		// über data-ck-field-label im Markup (BetLayout.php/Felt.html), NICHT
		// von hier. In dieser Datei steht kein Anzeigetext.
		label: id,
		matches: nieAusgewertet(id),
		// BetField verlangt eine Zahl > 0. Gerechnet wird mit ihr NIRGENDS —
		// die Quote holt jeder über ratioFor(). Für die beiden Odds-Felder
		// hinter der Linie steht hier 1, weil ihre Quote erst mit dem Point
		// feststeht (payoutHint).
		payout: opts.payoutHint ?? (ratio.num / ratio.den),
		max,
		// Odds zählen NICHT in den Gesamteinsatz je Wurf (Anhang H).
		countsToRoundMax: opts.odds !== true,
	});
}

/**
 * Die 48 Felder des Tuchs.
 *
 *   4  Linienwetten            pass, dont-pass, come, dont-come
 *   2  Odds hinter der Linie   pass-odds, dont-pass-odds
 *  12  Come-/Don't-Come-Zahlen come-N, dont-come-N
 *  12  Odds dahinter           come-odds-N, dont-come-odds-N
 *   6  Place-Wetten            place-N
 *   1  Field                   field
 *   4  Hardways                hard-N
 *   6  Einmalwetten            any-seven, any-craps, two, three, eleven, twelve
 *   1  die abgeleitete Wette   craps-eleven  (C & E)
 *
 * Die LAGE auf dem Tuch steht NICHT hier, sondern in Classes/BetLayout.php:
 * sie ist eine Gestaltungsfrage dieses Hauses, keine Regel aus Anhang H.
 * (Beim Roulette war das anders — dort FOLGEN die Wetten aus der Anordnung.)
 */
export const FIELDS = Object.freeze([
	feld('pass', RATIO.line, LINE_MAX),
	feld('dont-pass', RATIO.line, LINE_MAX),
	feld('come', RATIO.line, LINE_MAX),
	feld('dont-come', RATIO.line, LINE_MAX),
	feld('pass-odds', RATIO.line, ODDS_MULT[6] * LINE_MAX, { odds: true, payoutHint: 1 }),
	feld('dont-pass-odds', RATIO.line, oddsMax(4, LINE_MAX, true), { odds: true, payoutHint: 1 }),
	...POINTS.map((n) => feld(`come-${n}`, RATIO.line, LINE_MAX)),
	...POINTS.map((n) => feld(`come-odds-${n}`, RATIO.oddsLight[n], oddsMax(n, LINE_MAX, false), { odds: true })),
	...POINTS.map((n) => feld(`dont-come-${n}`, RATIO.line, LINE_MAX)),
	...POINTS.map((n) => feld(`dont-come-odds-${n}`, RATIO.oddsDark[n], oddsMax(n, LINE_MAX, true), { odds: true })),
	...POINTS.map((n) => feld(`place-${n}`, RATIO.place[n], n === 6 || n === 8 ? 96 : 100)),
	feld('field', RATIO.fieldPlain, 100),
	...[4, 6, 8, 10].map((n) => feld(`hard-${n}`, RATIO.hard[n], 10)),
	feld('any-seven', RATIO.anySeven, 10),
	feld('any-craps', RATIO.anyCraps, 10),
	feld('two', RATIO.two, 10),
	feld('three', RATIO.three, 10),
	feld('eleven', RATIO.eleven, 10),
	feld('twelve', RATIO.twelve, 10),
	// C & E. Höchsteinsatz 10 € wie jede Wette ab 7:1 (Anhang H, C.8.4):
	// ihre höhere der beiden Quoten IST 7 zu 1.
	feld('craps-eleven', RATIO.crapsElevenCraps, 10),
]);

/** Feld zu einer Kennung, oder undefined. */
export function fieldById(id) {
	return FIELDS.find((f) => f.id === id);
}

export default FIELDS;
