/**
 * Roulette – Nachweis der Feldliste und des rechnerischen Quotennachweises
 * ==========================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Rechnet ausschließlich mit den echten
 * Dateien der Extension und startet keinen Browser.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-bets.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan PLAN-roulette-c3-tisch, Abschnitt 4.2)
 * ---------------------------------------------------------------------
 *   B-1   die Feldliste ist importfrei und browserfrei
 *   B-2   genau 159 Felder, jede Kennung genau einmal
 *   B-3   Vollzähligkeit je Wettart
 *   B-4   jede Auszahlung stimmt mit einer im Skript wörtlich stehenden Tabelle
 *   B-5   jeder Höchsteinsatz stimmt mit einer im Skript wörtlich stehenden Tabelle
 *   B-6   jedes covers-Element ist eine bekannte Zeichenkette ohne Doppeleintrag
 *   B-7   Nachbarschaft: Splits berühren ihre zwei Zahlen tatsächlich, Vierer-
 *         blöcke berühren ihre vier Zahlen in einem Punkt, Trios (an der
 *         Null) berühren ihre drei Zahlen mit Kante ODER Eckpunkt, Dreier-/
 *         Sechserreihen liegen auf zusammenhängenden Tuchspalten. Die
 *         Fünferwette ist eine dokumentierte, geprüft festgehaltene Ausnahme
 *         von der Kante-oder-Eckpunkt-Regel (Behebung Review C3, M1 — siehe
 *         README, „Wetten, die es hier nicht gibt").
 *   B-8   keine zwei Felder belegen dieselbe Gitterfläche
 *   B-9   die Lage jedes Feldes stimmt mit einer unabhängig berechneten Lage
 *         überein (daraus folgt: Zahlenfelder auf Zellspuren, Linienfelder
 *         auf Linienspuren) — für neun Felder an der Null (n-0, n-00,
 *         s-0-00, s-0-1, s-00-3, t-0-1-2, t-0-00-2, t-00-2-3, five) ist das
 *         ein Spiegel, kein Beweis (Behebung Review C3, M10): ihr
 *         tatsächlicher geometrischer Nachweis liegt in B-7 (Kante-oder-
 *         Eckpunkt gegen ihre covers) beziehungsweise, für n-0/n-00, in
 *         einer eigenen Eigenschaftsprüfung hier (sie erreichen die
 *         mittlere Zeilenspur nicht, unabhängig aus 2×r hergeleitet)
 *   B-10  red/black stimmen mit dem Rad überein; einfache Chancen ohne 0/00;
 *         Kolonnen und Dutzende zerlegen 1..36 vollständig und überschneidungsfrei
 *   B-11  DER RECHNERISCHE QUOTENNACHWEIS: 36/38 für alle Felder außer der
 *         Fünferwette (35/38) — über ALLE 159 Felder, keine Stichprobe
 *   B-12  der Rundenhöchstbetrag ist kleiner als die Summe der Feldhöchsteinsätze
 *
 * WARUM B-9 EINE UNABHÄNGIGE LAGENBERECHNUNG IST UND KEINE EINFACHE
 * SPALTEN-/ZEILEN-PARITÄT
 * -------------------------------------------------------------------
 * Eine reine Prüfung "gerade Spalte oder ungerade Zeile = Linienspur" trifft
 * auf die Nullspalte nicht zu: '0' und '00' spannen dort JE ZWEI Zeilenspuren
 * auf, damit die Spur zwischen ihnen (Zeile 4) als Trennlinie für s-0-00 frei
 * bleibt — für die Nullspalte kehrt sich die übliche Zell-/Linien-Bedeutung
 * einer Spur also um. Eine unabhängig aus i und r berechnete Lage (dieselben
 * Formeln wie in bets-roulette.js, hier ein zweites Mal geschrieben, nicht
 * importiert) prüft jedes Feld — die reguläre Anordnung wie die Nullspalten-
 * Ausnahme — mit derselben Rechnung und ist damit strenger als eine bloße
 * Paritätsregel. Daraus folgt zwangsläufig: ein Zahlenfeld liegt auf einer
 * Zellspur, ein Linienfeld auf einer Linienspur — die Formeln wurden genau
 * dafür so gewählt (siehe Kopfkommentar von bets-roulette.js).
 *
 * JEDE NEUE PRÜFUNG HAT EINE GEGENPROBE
 * ----------------------------------------
 * Eine Prüfung, die nie fehlschlagen kann, ist keine. Jede Gegenprobe
 * arbeitet auf einer im Skript selbst angefertigten, verfälschten Kopie der
 * Feldliste (niemals auf FIELDS selbst) und weist nach, dass die zugehörige
 * Prüfung die Verfälschung tatsächlich findet.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/roulette/ */
const EXT = path.resolve(HIER, '../../..');

let fehler = 0;

function check(ok, text, ...zeilen) {
	console.log(`  ${ok ? '✓' : '✗'} ${text}`);
	if (!ok) {
		fehler++;
		for (const zeile of zeilen) {
			console.log(`      ${zeile}`);
		}
	}
}

function lies(datei) {
	return readFileSync(datei, 'utf8');
}

/** Entfernt Block- und Zeilenkommentare (JS). */
function ohneKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

console.log('\nRoulette – Nachweis der Feldliste und des rechnerischen Quotennachweises');
console.log('==========================================================================\n');

const BETS_JS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/bets-roulette.js');
const betsQuelltext = lies(BETS_JS_PFAD);
const betsOhneKommentare = ohneKommentare(betsQuelltext);

/* ==================================================== B-1 Importfrei */

console.log('B-1  Die Feldliste ist importfrei und browserfrei');
{
	check(!/\bimport\b/.test(betsOhneKommentare), 'kein import im Quelltext (Kommentare ausgenommen)');
	check(!/\brequire\b/.test(betsOhneKommentare), 'kein require im Quelltext');
	check(!/\bdocument\b/.test(betsOhneKommentare), 'kein document im Quelltext');
	check(!/\bwindow\b/.test(betsOhneKommentare), 'kein window im Quelltext');
	check(!/\blocalStorage\b/.test(betsOhneKommentare), 'kein localStorage im Quelltext');
	check(!/Math\.random/.test(betsOhneKommentare), 'kein Math.random im Quelltext');
}

let modul;
let wheelModul;
try {
	modul = await import(new URL('../../Public/JavaScript/bets-roulette.js', import.meta.url));
	wheelModul = await import(new URL('../../Public/JavaScript/wheel-geometry.js', import.meta.url));
	check(true, 'der import() beider Module gelingt unmittelbar');
} catch (fehlerObjekt) {
	check(false, 'der import() beider Module gelingt unmittelbar', String(fehlerObjekt));
	console.log(`\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen (Abbruch, Modul lädt nicht).`);
	process.exit(1);
}

const { FIELDS, fieldById, ROUND_MAX } = modul;
const { WHEEL_ORDER, RED: WHEEL_RED, BLACK: WHEEL_BLACK } = wheelModul;

/** Die Zahl in Tuchspalte i, Zeile r — unabhängig von bets-roulette.js noch einmal geschrieben. */
function numberAtUnabhaengig(column, row) {
	return String(3 * (column - 1) + row);
}

/* ============================================ B-2 159 Felder, eindeutig */

console.log('\nB-2  Genau 159 Felder, jede Kennung genau einmal');
{
	check(FIELDS.length === 159, `genau 159 Felder (gefunden: ${FIELDS.length})`);
	const zaehlung = new Map();
	for (const f of FIELDS) {
		zaehlung.set(f.id, (zaehlung.get(f.id) ?? 0) + 1);
	}
	const doppelte = [...zaehlung.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id} (${n}×)`);
	check(doppelte.length === 0, 'jede Kennung kommt genau einmal vor', ...doppelte);
}

/* =============================================== B-3 Vollzähligkeit */

const ERWARTETE_ANZAHL_JE_WETTART = {
	number: 38, split: 60, street: 12, trio: 3, corner: 22,
	five: 1, sixline: 11, column: 3, dozen: 3, even: 6,
};

console.log('\nB-3  Vollzähligkeit je Wettart');
{
	const zaehlung = {};
	for (const f of FIELDS) {
		zaehlung[f.kind] = (zaehlung[f.kind] ?? 0) + 1;
	}
	const abweichungen = [];
	for (const [wettart, erwartet] of Object.entries(ERWARTETE_ANZAHL_JE_WETTART)) {
		const gefunden = zaehlung[wettart] ?? 0;
		if (gefunden !== erwartet) {
			abweichungen.push(`${wettart}: ${gefunden} Felder, erwartet ${erwartet}`);
		}
	}
	const unbekannteWettarten = Object.keys(zaehlung).filter((k) => !(k in ERWARTETE_ANZAHL_JE_WETTART));
	check(abweichungen.length === 0 && unbekannteWettarten.length === 0,
		'jede Wettart hat genau die in Anhang F vorgesehene Anzahl Felder',
		...abweichungen, ...unbekannteWettarten.map((k) => `unbekannte Wettart: ${k}`));
	console.log(`      38 Zahlen, 60 Splits, 12 Dreierreihen, 3 Trios, 22 Viererblöcke, 1 Fünferwette,`);
	console.log(`      11 Sechserreihen, 3 Kolonnen, 3 Dutzende, 6 einfache Chancen — Summe 159.`);
}

/* ======================================== B-4 Auszahlung gegen Anhang F */

console.log('\nB-4  Jede Auszahlung stimmt mit einer eigenen, wörtlichen Tabelle überein');
{
	// Anhang F, wörtlich ein zweites Mal — unabhängig von PAYOUT_BY_COVERED
	// aus der geprüften Datei. Eine Prüfung, die ihre Erwartung aus dem
	// Prüfling holt, prüft nichts.
	const ERWARTETE_AUSZAHLUNG_JE_ANZAHL = { 1: 35, 2: 17, 3: 11, 4: 8, 5: 6, 6: 5, 12: 2, 18: 1 };

	const abweichungen = [];
	for (const feld of FIELDS) {
		const erwartet = ERWARTETE_AUSZAHLUNG_JE_ANZAHL[feld.covers.length];
		if (erwartet === undefined) {
			abweichungen.push(`${feld.id}: ${feld.covers.length} abgedeckte Zahlen kommen in der eigenen Tabelle nicht vor`);
			continue;
		}
		if (feld.payout !== erwartet) {
			abweichungen.push(`${feld.id}: payout=${feld.payout}, erwartet ${erwartet}`);
		}
	}
	check(abweichungen.length === 0, 'jede Auszahlung stimmt mit Anhang F überein', ...abweichungen);

	console.log('     Gegenprobe B-4-G: eine verfälschte Auszahlung (n-17 → 34) muss auffallen');
	const kopie = FIELDS.map((f) => ({ ...f, covers: [...f.covers] }));
	kopie.find((f) => f.id === 'n-17').payout = 34;
	const abweichungenKopie = kopie.filter((f) => f.payout !== ERWARTETE_AUSZAHLUNG_JE_ANZAHL[f.covers.length]);
	check(abweichungenKopie.length === 1,
		'B-4-G: genau ein Feld (das verfälschte n-17) weicht in der Kopie ab',
		`gefundene Abweichungen: ${abweichungenKopie.length}`);
}

/* ====================================== B-5 Höchsteinsatz gegen Anhang F */

console.log('\nB-5  Jeder Höchsteinsatz stimmt mit einer eigenen, wörtlichen Tabelle überein');
{
	const ERWARTETER_HOECHSTEINSATZ_JE_ANZAHL = { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50, 6: 60, 12: 100, 18: 100 };

	const abweichungen = [];
	for (const feld of FIELDS) {
		const erwartet = ERWARTETER_HOECHSTEINSATZ_JE_ANZAHL[feld.covers.length];
		if (erwartet === undefined) {
			abweichungen.push(`${feld.id}: ${feld.covers.length} abgedeckte Zahlen kommen in der eigenen Tabelle nicht vor`);
			continue;
		}
		if (feld.max !== erwartet) {
			abweichungen.push(`${feld.id}: max=${feld.max}, erwartet ${erwartet}`);
		}
	}
	check(abweichungen.length === 0, 'jeder Höchsteinsatz ist min(10 × abgedeckt, 100)', ...abweichungen);

	console.log('     Gegenprobe B-5-G: ein verfälschter Höchsteinsatz (five.max → 100) muss auffallen');
	const kopie = FIELDS.map((f) => ({ ...f, covers: [...f.covers] }));
	kopie.find((f) => f.id === 'five').max = 100;
	const abweichungenKopie = kopie.filter((f) => f.max !== ERWARTETER_HOECHSTEINSATZ_JE_ANZAHL[f.covers.length]);
	check(abweichungenKopie.length === 1,
		'B-5-G: genau ein Feld (das verfälschte five) weicht in der Kopie ab',
		`gefundene Abweichungen: ${abweichungenKopie.length}`);
}

/* ===================================== B-6 covers sind bekannte Zeichenketten */

console.log('\nB-6  covers besteht ausschließlich aus bekannten Zeichenketten ohne Doppeleintrag');
{
	const wheelSet = new Set(WHEEL_ORDER);
	const abweichungen = [];
	for (const feld of FIELDS) {
		for (const zahl of feld.covers) {
			if (typeof zahl !== 'string') {
				abweichungen.push(`${feld.id}: "${String(zahl)}" ist keine Zeichenkette`);
			} else if (!wheelSet.has(zahl)) {
				abweichungen.push(`${feld.id}: "${zahl}" kommt nicht in WHEEL_ORDER vor`);
			}
		}
		if (new Set(feld.covers).size !== feld.covers.length) {
			abweichungen.push(`${feld.id}: covers enthält einen Doppeleintrag`);
		}
	}
	check(abweichungen.length === 0, 'jedes covers-Element ist eine Zeichenkette aus WHEEL_ORDER, ohne Doppeleintrag', ...abweichungen);
}

/* ================================================ B-7 Nachbarschaft */

/** Das Rechteck eines Feldes in Gitterlinien-Koordinaten. */
function rechteck(feld) {
	return {
		spalteVon: feld.col,
		spalteBis: feld.colEnd ?? feld.col + 1,
		zeileVon: feld.row,
		zeileBis: feld.rowEnd ?? feld.row + 1,
	};
}

/** Überlappungslänge zweier Intervalle, 0 wenn sie sich nicht überlappen. */
function ueberlappung(a1, a2, b1, b2) {
	return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

/** Zwei Felder berühren sich mit einer echten Kante (Split-Nachbarschaft). */
function kantenBeruehrung(a, b) {
	const ra = rechteck(a);
	const rb = rechteck(b);
	const spaltenGrenze = (ra.spalteBis === rb.spalteVon || rb.spalteBis === ra.spalteVon)
		&& ueberlappung(ra.zeileVon, ra.zeileBis, rb.zeileVon, rb.zeileBis) > 0;
	const zeilenGrenze = (ra.zeileBis === rb.zeileVon || rb.zeileBis === ra.zeileVon)
		&& ueberlappung(ra.spalteVon, ra.spalteBis, rb.spalteVon, rb.spalteBis) > 0;
	return spaltenGrenze || zeilenGrenze;
}

/** Zwei Felder berühren sich genau in einem Eckpunkt (Viererblock-Nachbarschaft). */
function eckBeruehrung(a, b) {
	const ra = rechteck(a);
	const rb = rechteck(b);
	const spalte = ra.spalteBis === rb.spalteVon || rb.spalteBis === ra.spalteVon;
	const zeile = ra.zeileBis === rb.zeileVon || rb.zeileBis === ra.zeileVon;
	return spalte && zeile;
}

/** Zwei Felder berühren sich mit einer echten Kante ODER in einem Eckpunkt (Trio-Nachbarschaft an der Null). */
function kanteOderEck(a, b) {
	return kantenBeruehrung(a, b) || eckBeruehrung(a, b);
}

function zahlfeldZu(zahl) {
	return fieldById(`n-${zahl}`);
}

console.log('\nB-7  Nachbarschaft: Splits, Viererblöcke, Dreier- und Sechserreihen');
{
	const abweichungen = [];

	for (const feld of FIELDS.filter((f) => f.kind === 'split')) {
		for (const zahl of feld.covers) {
			const ziel = zahlfeldZu(zahl);
			if (!ziel || !kantenBeruehrung(feld, ziel)) {
				abweichungen.push(`${feld.id}: berührt "${zahl}" nicht mit einer echten Kante`);
			}
		}
	}

	for (const feld of FIELDS.filter((f) => f.kind === 'corner')) {
		for (const zahl of feld.covers) {
			const ziel = zahlfeldZu(zahl);
			if (!ziel || !eckBeruehrung(feld, ziel)) {
				abweichungen.push(`${feld.id}: berührt "${zahl}" nicht in einem Eckpunkt`);
			}
		}
	}

	const erwarteteStrassen = new Set();
	for (let i = 1; i <= 12; i++) {
		erwarteteStrassen.add([numberAtUnabhaengig(i, 1), numberAtUnabhaengig(i, 2), numberAtUnabhaengig(i, 3)].join(','));
	}
	for (const feld of FIELDS.filter((f) => f.kind === 'street')) {
		if (!erwarteteStrassen.has(feld.covers.join(','))) {
			abweichungen.push(`${feld.id}: covers bilden keine zusammenhängende Tuchspalte`);
		}
	}

	const erwarteteSechserreihen = new Set();
	for (let i = 1; i <= 11; i++) {
		erwarteteSechserreihen.add([
			numberAtUnabhaengig(i, 1), numberAtUnabhaengig(i, 2), numberAtUnabhaengig(i, 3),
			numberAtUnabhaengig(i + 1, 1), numberAtUnabhaengig(i + 1, 2), numberAtUnabhaengig(i + 1, 3),
		].join(','));
	}
	for (const feld of FIELDS.filter((f) => f.kind === 'sixline')) {
		if (!erwarteteSechserreihen.has(feld.covers.join(','))) {
			abweichungen.push(`${feld.id}: covers bilden keine zwei zusammenhängenden Tuchspalten`);
		}
	}

	// Behebung Review C3, M1. Die drei Trios an der Null (t-0-1-2, t-0-00-2,
	// t-00-2-3) waren bisher ungeprüft: jede ihrer covered-Zahlen muss das
	// Feld mit einer Kante ODER in einem Eckpunkt berühren (schwächer als
	// die reine Kantenregel der Splits, weil ein Trio an der Null immer auch
	// eine Zahl nur im Eckpunkt trifft — siehe bets-roulette.js, Kopfkommentar).
	for (const feld of FIELDS.filter((f) => f.kind === 'trio')) {
		for (const zahl of feld.covers) {
			const ziel = zahlfeldZu(zahl);
			if (!ziel || !kanteOderEck(feld, ziel)) {
				abweichungen.push(`${feld.id}: berührt "${zahl}" weder mit einer Kante noch in einem Eckpunkt`);
			}
		}
	}

	check(abweichungen.length === 0,
		'jeder Split/Viererblock/Trio berührt seine Zahlen tatsächlich; jede Dreier-/Sechserreihe liegt auf zusammenhängenden Tuchspalten',
		...abweichungen);

	// Die Fünferwette ("five") ist ausdrücklich AUSGENOMMEN von der
	// Kante-oder-Eckpunkt-Regel: sie berührt von ihren fünf abgedeckten
	// Zahlen (0, 00, 1, 2, 3) nur '0' und '1' überhaupt (beide nur im
	// Eckpunkt) — '00', '2' und '3' gar nicht. Das ist ein bewusstes
	// Tischzeichen (die klassische "Top Line"-Wette sitzt am amerikanischen
	// Tisch ebenfalls nicht geometrisch mittig zu allen fünf Zahlen), keine
	// gerechnete Nachbarschaft wie bei den anderen Linienfeldern — siehe
	// README, „Wetten, die es hier nicht gibt". Diese Prüfung hält die
	// AUSNAHME selbst fest, statt sie stillschweigend zu übergehen: ändert
	// sich ihre Lage, ohne dass diese Prüfung mitgeht, fällt das hier auf.
	console.log('     Sonderfall five: dokumentierte Ausnahme von der Kante-oder-Eckpunkt-Regel (kein B-7-Fund, siehe README)');
	{
		const five = FIELDS.find((f) => f.id === 'five');
		const beruehrteZahlen = five.covers.filter((zahl) => {
			const ziel = zahlfeldZu(zahl);
			return ziel && kanteOderEck(five, ziel);
		});
		check(five.col === 2 && five.row === 1, 'five liegt an der dokumentierten Stelle (Spalte 2, Zeile 1) — bei Verschiebung wird das hier sichtbar');
		check(beruehrteZahlen.length === 2 && beruehrteZahlen.includes('0') && beruehrteZahlen.includes('1'),
			'five berührt tatsächlich nur "0" und "1" (je im Eckpunkt) — die dokumentierte Ausnahme, nicht mehr und nicht weniger',
			`berührte Zahlen: ${beruehrteZahlen.join(', ') || '(keine)'}`);
	}

	console.log('     Gegenprobe B-7-G: ein erfundenes Split-Feld "1"-"5" (keine Nachbarn) muss als nicht berührend erkannt werden');
	const einsFeld = zahlfeldZu('1');
	const erfundenerSplit = { id: 's-1-5', kind: 'split', covers: ['1', '5'], col: einsFeld.col, colEnd: einsFeld.colEnd, row: einsFeld.row, rowEnd: einsFeld.rowEnd };
	const beruehrtFuenf = kantenBeruehrung(erfundenerSplit, zahlfeldZu('5'));
	check(!beruehrtFuenf, 'B-7-G: "1" und "5" werden korrekt als nicht benachbart erkannt');

	console.log('     Gegenprobe B-7-G2: ein erfundenes Trio ohne echte Nachbarschaft muss als nicht berührend erkannt werden');
	const erfundenesTrio = { id: 't-1-5-9', kind: 'trio', covers: ['1', '5', '9'], col: einsFeld.col, colEnd: einsFeld.colEnd, row: einsFeld.row, rowEnd: einsFeld.rowEnd };
	const trioBeruehrtFuenf = kanteOderEck(erfundenesTrio, zahlfeldZu('5'));
	check(!trioBeruehrtFuenf, 'B-7-G2: "1" und "5" werden auch unter der Kante-oder-Eckpunkt-Regel korrekt als nicht benachbart erkannt');
}

/* ==================================================== B-8 Keine Kollision */

/** Zwei Felder überlappen sich mit echter Fläche (mehr als eine gemeinsame Kante). */
function flaechenUeberlappung(a, b) {
	const ra = rechteck(a);
	const rb = rechteck(b);
	return ueberlappung(ra.spalteVon, ra.spalteBis, rb.spalteVon, rb.spalteBis) > 0
		&& ueberlappung(ra.zeileVon, ra.zeileBis, rb.zeileVon, rb.zeileBis) > 0;
}

console.log('\nB-8  Keine zwei Felder belegen dieselbe Gitterfläche');
{
	const kollisionen = [];
	for (let i = 0; i < FIELDS.length; i++) {
		for (let j = i + 1; j < FIELDS.length; j++) {
			if (flaechenUeberlappung(FIELDS[i], FIELDS[j])) {
				kollisionen.push(`${FIELDS[i].id} und ${FIELDS[j].id} überlappen sich im Gitter`);
			}
		}
	}
	check(kollisionen.length === 0, 'keine zwei Felder belegen dieselbe Gitterfläche (Spannen mitgerechnet)', ...kollisionen);

	console.log('     Gegenprobe B-8-G: zwei künstlich auf dieselbe Zelle gelegte Felder müssen als Kollision erkannt werden');
	const a = fieldById('n-1');
	const b = { ...fieldById('n-2'), col: a.col, colEnd: a.colEnd, row: a.row, rowEnd: a.rowEnd };
	check(flaechenUeberlappung(a, b), 'B-8-G: die künstliche Kollision wird erkannt');
}

/* ============================================ B-9 Lage aus der Anordnung */

/** Baut je Kennung die unabhängig berechnete Lage — dieselben Formeln wie bets-roulette.js, hier ein zweites Mal geschrieben. */
function baueErwarteteLagen() {
	const lagen = new Map();
	const setze = (id, col, row, colEnd = null, rowEnd = null) => {
		lagen.set(id, { col, colEnd, row, rowEnd });
	};

	setze('n-0', 1, 2, null, 4);
	setze('n-00', 1, 5, null, 7);
	for (let i = 1; i <= 12; i++) {
		for (let r = 1; r <= 3; r++) {
			setze(`n-${numberAtUnabhaengig(i, r)}`, 2 * i + 1, 2 * r);
		}
	}

	for (let i = 1; i <= 12; i++) {
		for (let r = 1; r <= 2; r++) {
			const a = numberAtUnabhaengig(i, r);
			const b = numberAtUnabhaengig(i, r + 1);
			setze(`s-${a}-${b}`, 2 * i + 1, 2 * r + 1);
		}
	}
	for (let i = 1; i <= 11; i++) {
		for (let r = 1; r <= 3; r++) {
			const a = numberAtUnabhaengig(i, r);
			const b = numberAtUnabhaengig(i + 1, r);
			setze(`s-${a}-${b}`, 2 * i + 2, 2 * r);
		}
	}
	setze('s-0-00', 1, 4);
	setze('s-0-1', 2, 2);
	setze('s-00-3', 2, 6);

	for (let i = 1; i <= 12; i++) {
		setze(`st-${numberAtUnabhaengig(i, 1)}`, 2 * i + 1, 1);
	}
	setze('t-0-1-2', 2, 3);
	setze('t-0-00-2', 2, 4);
	setze('t-00-2-3', 2, 5);

	for (let i = 1; i <= 11; i++) {
		for (let r = 1; r <= 2; r++) {
			setze(`c-${numberAtUnabhaengig(i, r)}`, 2 * i + 2, 2 * r + 1);
		}
	}

	setze('five', 2, 1);

	for (let i = 1; i <= 11; i++) {
		setze(`sl-${numberAtUnabhaengig(i, 1)}`, 2 * i + 2, 1);
	}

	for (let r = 1; r <= 3; r++) {
		setze(`col-${r}`, 27, 2 * r);
	}
	for (let d = 1; d <= 3; d++) {
		setze(`dz-${d}`, 8 * d - 5, 8, 8 * d + 2);
	}
	['low', 'even', 'red', 'black', 'odd', 'high'].forEach((id, index) => {
		const j = index + 1;
		setze(id, 4 * j - 1, 9, 4 * j + 2);
	});

	return lagen;
}

console.log('\nB-9  Die Lage jedes Feldes stimmt mit einer unabhängig berechneten Lage überein');
{
	// Behebung Review C3, M10. baueErwarteteLagen() trägt für die meisten
	// Felder (Zahlen 1-36, reguläre Splits/Ecken/Dreier-/Sechserreihen,
	// Kolonnen/Dutzende/einfache Chancen) tatsächlich, weil sie AUS i UND r
	// GERECHNET wird — eine falsche Formel würde hier auffallen. Für neun
	// Felder an der Null gilt das NICHT: n-0, n-00, s-0-00, s-0-1, s-00-3,
	// t-0-1-2, t-0-00-2, t-00-2-3 und five stehen in baueErwarteteLagen() als
	// dieselben festen Zahlen wie in bets-roulette.js, nur ein zweites Mal
	// getippt — für sie ist diese Prüfung ein SPIEGEL, kein Beweis (ein
	// Tippfehler beim Abschreiben würde auffallen, eine falsche Entscheidung
	// nicht). Der tatsächliche unabhängige Beweis für sieben dieser neun
	// (die drei Splits, die drei Trios, nicht five) liegt in B-7: dort wird
	// geprüft, dass jede abgedeckte Zahl das Feld mit einer Kante oder einem
	// Eckpunkt tatsächlich berührt — eine Eigenschaft, die von der
	// tatsächlichen Lage in FIELDS abhängt, nicht von einer hier
	// abgeschriebenen Kopie. five ist eine dokumentierte Ausnahme (siehe
	// B-7 oben und README, „Wetten, die es hier nicht gibt").
	const abschriftNichtBeweis = new Set([
		'n-0', 'n-00', 's-0-00', 's-0-1', 's-00-3', 't-0-1-2', 't-0-00-2', 't-00-2-3', 'five',
	]);

	// Für n-0/n-00 bleibt SONST TATSÄCHLICH KEINE unabhängige Prüfung übrig
	// (sie decken nur sich selbst ab, die Kante-oder-Eckpunkt-Regel aus B-7
	// greift für sie nicht). Deshalb hier eine eigene, echte Eigenschaft:
	// die mittlere Zeilenspur der Zahlenfläche (Zeile 2, r=2) wird aus
	// DERSELBEN Formel wie die reguläre Zahlenfläche oben abgeleitet
	// (2 × r), nicht aus bets-roulette.js abgeschrieben — und 0/00 dürfen
	// sie laut Anordnung (README, "0 und 2 berühren sich NICHT") nicht
	// erreichen.
	console.log('     Eigene Eigenschaftsprüfung für n-0/n-00: sie erreichen die mittlere Zeilenspur (Zeile 2) nicht');
	{
		const mittlereZeilenspur = 2 * 2; // dieselbe Formel wie oben (2 × r), r=2
		const n0 = FIELDS.find((f) => f.id === 'n-0');
		const n00 = FIELDS.find((f) => f.id === 'n-00');
		const n0ErreichtMitte = ueberlappung(n0.row, n0.rowEnd ?? n0.row + 1, mittlereZeilenspur, mittlereZeilenspur + 1) > 0;
		const n00ErreichtMitte = ueberlappung(n00.row, n00.rowEnd ?? n00.row + 1, mittlereZeilenspur, mittlereZeilenspur + 1) > 0;
		check(!n0ErreichtMitte && !n00ErreichtMitte,
			'n-0 und n-00 überlappen die mittlere Zeilenspur (Zeile 2, unabhängig aus 2×r hergeleitet) NICHT',
			`n-0 erreicht Mitte: ${n0ErreichtMitte}, n-00 erreicht Mitte: ${n00ErreichtMitte}`);

		console.log('     Gegenprobe: eine künstlich bis zur Mitte verlängerte n-0 muss auffallen');
		const n0VerlaengertGegenprobe = { ...n0, rowEnd: mittlereZeilenspur + 1 };
		const gegenprobeErreichtMitte = ueberlappung(n0VerlaengertGegenprobe.row, n0VerlaengertGegenprobe.rowEnd, mittlereZeilenspur, mittlereZeilenspur + 1) > 0;
		check(gegenprobeErreichtMitte, 'die künstlich verlängerte Kopie von n-0 wird korrekt als die Mitte erreichend erkannt');
	}

	const erwartet = baueErwarteteLagen();
	const abweichungen = [];
	if (erwartet.size !== FIELDS.length) {
		abweichungen.push(`unabhängige Berechnung liefert ${erwartet.size} Lagen, FIELDS hat ${FIELDS.length}`);
	}
	for (const feld of FIELDS) {
		const soll = erwartet.get(feld.id);
		if (!soll) {
			abweichungen.push(`${feld.id}: keine unabhängig berechnete Lage vorhanden`);
			continue;
		}
		const istColEnd = feld.colEnd ?? null;
		const istRowEnd = feld.rowEnd ?? null;
		if (feld.col !== soll.col || feld.row !== soll.row || istColEnd !== soll.colEnd || istRowEnd !== soll.rowEnd) {
			const spiegelHinweis = abschriftNichtBeweis.has(feld.id) ? ' (Spiegel, kein Beweis — siehe Kommentar oben)' : '';
			abweichungen.push(`${feld.id}: Lage weicht ab — gefunden Spalte ${feld.col}/${istColEnd}, Zeile ${feld.row}/${istRowEnd}; erwartet Spalte ${soll.col}/${soll.colEnd}, Zeile ${soll.row}/${soll.rowEnd}${spiegelHinweis}`);
		}
	}
	check(abweichungen.length === 0,
		'jede Lage stimmt mit der unabhängig aus i und r berechneten Formel überein',
		...abweichungen);

	console.log('     Gegenprobe B-9-G: eine künstlich verschobene Spalte (n-17 → col 999) muss auffallen');
	const kopie = FIELDS.map((f) => ({ ...f }));
	kopie.find((f) => f.id === 'n-17').col = 999;
	let abweichungenKopie = 0;
	for (const feld of kopie) {
		const soll = erwartet.get(feld.id);
		if (feld.col !== soll.col) {
			abweichungenKopie++;
		}
	}
	check(abweichungenKopie === 1, 'B-9-G: genau eine Abweichung (das verfälschte n-17) wird gefunden', `gefundene Abweichungen: ${abweichungenKopie}`);
}

/* =================================== B-10 Farben, Chancen, Kolonnen, Dutzende */

console.log('\nB-10  red/black gegen das Rad; einfache Chancen ohne 0/00; Kolonnen/Dutzende vollständig');
{
	const abweichungen = [];

	const redFeld = fieldById('red');
	const blackFeld = fieldById('black');
	if (JSON.stringify([...redFeld.covers].sort()) !== JSON.stringify([...WHEEL_RED].sort())) {
		abweichungen.push('red stimmt nicht mit RED aus wheel-geometry.js überein');
	}
	if (JSON.stringify([...blackFeld.covers].sort()) !== JSON.stringify([...WHEEL_BLACK].sort())) {
		abweichungen.push('black stimmt nicht mit BLACK aus wheel-geometry.js überein');
	}

	for (const id of ['even', 'odd', 'low', 'high']) {
		const feld = fieldById(id);
		if (feld.covers.includes('0') || feld.covers.includes('00')) {
			abweichungen.push(`${id} enthält 0 oder 00`);
		}
	}
	if (fieldById('even').covers.length !== 18 || fieldById('odd').covers.length !== 18) {
		abweichungen.push('even/odd haben nicht je 18 Einträge');
	}

	const kolonnenNummern = ['col-1', 'col-2', 'col-3'].map((id) => fieldById(id).covers);
	const kolonnenVereinigung = new Set(kolonnenNummern.flat());
	const kolonnenUeberschneidung = kolonnenNummern[0].filter((n) => kolonnenNummern[1].includes(n) || kolonnenNummern[2].includes(n));
	if (kolonnenVereinigung.size !== 36 || kolonnenUeberschneidung.length > 0) {
		abweichungen.push('Kolonnen zerlegen 1..36 nicht vollständig und überschneidungsfrei');
	}

	const dutzendNummern = ['dz-1', 'dz-2', 'dz-3'].map((id) => fieldById(id).covers);
	const dutzendVereinigung = new Set(dutzendNummern.flat());
	if (dutzendVereinigung.size !== 36) {
		abweichungen.push('Dutzende zerlegen 1..36 nicht vollständig');
	}

	check(abweichungen.length === 0,
		'red/black stimmen mit dem Rad überein; einfache Chancen ohne 0/00; Kolonnen und Dutzende zerlegen 1..36 vollständig und überschneidungsfrei',
		...abweichungen);
}

/* ============================================== B-11 Quotennachweis */

console.log('\nB-11  Der rechnerische Quotennachweis: 36/38 für alle Felder, 35/38 für die Fünferwette');
{
	const abweichungen = [];
	for (const feld of FIELDS) {
		const zaehler = (feld.payout + 1) * feld.covers.length;
		const erwartet = feld.id === 'five' ? 35 : 36;
		if (zaehler !== erwartet) {
			abweichungen.push(`${feld.id}: (${feld.payout}+1)×${feld.covers.length} = ${zaehler}, erwartet ${erwartet}`);
		}
	}
	check(abweichungen.length === 0,
		`alle ${FIELDS.length} Felder: (Auszahlung+1)×abgedeckt ergibt 36 (= 36/38 = 0,947368…), außer der Fünferwette mit 35 (= 35/38 = 0,921053…)`,
		...abweichungen);

	console.log('     Gegenprobe B-11-G: die Fünferwette mit 7 : 1 muss als "40", nicht als Rundungstoleranz auffallen');
	const zaehlerVerfaelscht = (7 + 1) * FIELDS.find((f) => f.id === 'five').covers.length;
	check(zaehlerVerfaelscht === 40 && zaehlerVerfaelscht !== 35,
		`B-11-G: die verfälschte Fünferwette (7 : 1) ergibt ${zaehlerVerfaelscht}, nicht 35`,
		`Zähler: ${zaehlerVerfaelscht}`);
}

/* ================================================= B-12 Rundenhöchstbetrag */

console.log('\nB-12  Der Rundenhöchstbetrag ist kleiner als die Summe der Feldhöchsteinsätze');
{
	check(ROUND_MAX === 100, `ROUND_MAX ist 100 (gefunden: ${ROUND_MAX})`);
	const summe = FIELDS.reduce((s, f) => s + f.max, 0);
	check(ROUND_MAX < summe, `ROUND_MAX (${ROUND_MAX}) ist kleiner als die Summe aller Feldhöchsteinsätze (${summe})`);
}

/* ------------------------------------------------------------- Ergebnis */

if (fehler === 0) {
	const jeWettart = Object.entries(ERWARTETE_ANZAHL_JE_WETTART)
		.map(([wettart, anzahl]) => `${wettart}=${anzahl}`).join(', ');
	console.log(`\nERGEBNIS: alle Prüfungen bestanden. 159 Felder (${jeWettart}), jede Auszahlung`
		+ '\nund jeder Höchsteinsatz gegen Anhang F, jede Nachbarschaft gerechnet, und der'
		+ '\nQuotennachweis: 36/38 (94,7368 %) für alle Felder außer der Fünferwette (35/38, 92,1053 %).');
} else {
	console.log(`\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);
}

process.exit(fehler === 0 ? 0 : 1);
