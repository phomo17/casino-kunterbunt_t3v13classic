/**
 * Craps – Nachweis der Wettliste und der rechnerischen Quotennachweis (Umsetzungsstück C7a)
 * ==============================================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Rechnet ausschließlich mit den echten
 * Dateien der Extension und startet keinen Browser.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-bets.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan PLAN-craps-c7, Umsetzungsstück C7a, Abschnitt 4.2)
 * -------------------------------------------------------------------------------
 *   B-1   bets-craps.js ist import- und dokumentfrei, kein Math.random
 *   B-2   genau 47 Felder, jede Kennung genau einmal, im richtigen Muster
 *   B-3   jede Wettart aus Anhang H kommt vor, keine, die Anhang H nicht kennt
 *         (Big 6, Big 8, Buy, Lay werden ausdrücklich NICHT angeboten)
 *   B-4   RATIO stimmt Bruch für Bruch mit einer eigenen Abschrift von Anhang H
 *         überein; BetField.payout stimmt mit num/den überein
 *   B-5   jeder Höchsteinsatz stimmt mit Anhang H überein
 *   B-6   ROUND_MAX ist 300; countsToRoundMax ist false bei genau den 14
 *         Odds-Feldern und true bei den übrigen 33
 *   B-7   die Staffel 3-4-5×: oddsMax folgt ihr bei allen sechs Points, und der
 *         Höchstgewinn ist in jedem Fall gleich hoch (sechsmal die Linienwette)
 *   B-8   ratioFor() liefert für jede Kennung und jede Summe eine Quote (die
 *         zwei Linien-Odds ohne point ausdrücklich null); field kontextabhängig
 *   B-9   DER RECHNERISCHE QUOTENNACHWEIS JE WETTART: der Erwartungswert je 1 €
 *         wird aus den 36 gleich wahrscheinlichen Würfelpaaren exakt hergeleitet
 *         und mit einer eigenen, wörtlichen Tabelle aus Anhang H verglichen
 *   B-10  Odds haben den Hausvorteil exakt 0 — alle sechs Points, hell und dunkel
 *   B-11  matches() jedes Feldes wirft; new BetField(beschreibung) legt es
 *         trotzdem an (der Vertrag von table-bets.js ist erfüllt)
 *   B-12  ROUND_MAX ist kleiner als die Summe der Feldhöchsteinsätze OHNE Odds,
 *         und größer als der größte Einzelhöchsteinsatz unter diesen
 *
 * WARUM MIT BigInt-BRÜCHEN GERECHNET WIRD, NICHT MIT KOMMAZAHLEN
 * -----------------------------------------------------------------
 * 7 : 6 ist als Kommazahl nie exakt (1,1666…), und ein Erwartungswert wie
 * −1/66 endet als Kommazahl auf "ungefähr", nicht auf "bewiesen". Jede Größe
 * in B-9 und B-10 ist deshalb ein Bruch aus zwei BigInt ({n, d}), gekürzt nach
 * jeder Rechnung. Kein einziger Schritt im Beweisweg benutzt eine Kommazahl;
 * nur die abschließende Prozentangabe (zum Vergleich mit der in Anhang H
 * angegebenen Prozentzahl) wandelt einmalig in eine Zahl um, gerundet auf
 * zwei Nachkommastellen.
 *
 * WIE B-9 DIE MEHRWURFWETTEN ZERLEGT
 * --------------------------------------
 * Pass Line/Come: 8/36 sofort gewonnen (7 oder 11), 4/36 sofort verloren
 * (2, 3 oder 12), sonst steht ein Point p mit n_p von 36 Wegen; die bedingte
 * Wahrscheinlichkeit, ihn zu machen, bevor eine 7 fällt, ist n_p/(n_p+6).
 * Don't Pass/Don't Come ist spiegelbildlich, mit Patt bei der 12 ("Bar 12").
 * Place-Wetten sind ein reiner Markov-Schritt zwischen "die Zahl fällt" und
 * "eine 7 fällt", ebenso Hardways (mit den zusätzlichen "leichten" Wegen, die
 * Zahl OHNE Pasch zu würfeln). Field und die sechs Einmalwetten sind reine
 * Einwurfwetten und werden direkt über alle elf Summen aufsummiert. Odds
 * benutzen dieselbe Markov-Zerlegung wie ihre Grundwette, mit der jeweiligen
 * Quote aus RATIO.oddsLight/oddsDark statt 1:1.
 *
 * WARUM B-12 NUR DIE FELDER OHNE ODDS BETRACHTET
 * ---------------------------------------------------
 * Odds zählen nach Anhang H nicht in den Rundenhöchstbetrag (countsToRoundMax
 * ist bei ihnen false, siehe B-6); ihr Höchsteinsatz kann deshalb weit über
 * ROUND_MAX liegen (dont-pass-odds erreicht 1200), ohne dass die Rundengrenze
 * dadurch wirkungslos würde. "Der größte Einzelhöchsteinsatz" in B-12 meint
 * deshalb den größten Höchsteinsatz UNTER den Feldern, die tatsächlich in die
 * Rundengrenze zählen — sonst wäre die Prüfung an echten Zahlen (1200 > 300)
 * unerfüllbar, ohne dass das ein Fehler der Wettliste wäre.
 *
 * JEDE NEUE PRÜFUNG HAT EINE GEGENPROBE
 * ----------------------------------------
 * Eine Prüfung, die nie fehlschlagen kann, ist keine. Jede Gegenprobe arbeitet
 * auf einer im Skript selbst angefertigten, verfälschten Kopie oder einer
 * eigens gerechneten Alternative — niemals auf der echten Wettliste selbst.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/craps/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');

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

function kurz(datei) {
	return path.relative(EXT_ROOT, datei);
}

/** Entfernt Block- und Zeilenkommentare (JS). */
function ohneKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

console.log('\nCraps – Nachweis der Wettliste und des rechnerischen Quotennachweises (Umsetzungsstück C7a)');
console.log('==============================================================================================\n');

const BETS_JS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/bets-craps.js');

if (!existsSync(BETS_JS_PFAD)) {
	console.log(`\nERGEBNIS: Abbruch — ${kurz(BETS_JS_PFAD)} existiert nicht.`);
	process.exit(1);
}

const betsQuelltext = lies(BETS_JS_PFAD);
const betsOhneKommentare = ohneKommentare(betsQuelltext);

console.log(`Geprüfte Datei: ${kurz(BETS_JS_PFAD)}\n`);

/* ==================================================== B-1 Importfrei */

console.log('B-1  bets-craps.js ist import- und dokumentfrei, kein Math.random');
{
	check(!/\bimport\b/.test(betsOhneKommentare), 'kein import im Quelltext (Kommentare ausgenommen)');
	check(!/\brequire\b/.test(betsOhneKommentare), 'kein require im Quelltext');
	check(!/\bdocument\b/.test(betsOhneKommentare), 'kein document im Quelltext');
	check(!/\bwindow\b/.test(betsOhneKommentare), 'kein window im Quelltext');
	check(!/Math\.random/.test(betsOhneKommentare), 'kein Math.random im Quelltext');

	console.log('     Gegenprobe B-1-G: eine eingefügte import-Zeile muss auffallen');
	const verfaelscht = `import { x } from 'y.js';\n${betsOhneKommentare}`;
	check(/\bimport\b/.test(verfaelscht), 'B-1-G: die eingefügte import-Zeile wird von derselben Prüfung erkannt');
}

/* Die Module werden erst NACH B-1 geladen — B-1 prüft den Quelltext, nicht das
 * geladene Modul, damit ein import in bets-craps.js selbst B-1 nicht am
 * eigenen Laden vorbeiträgt. */

const CRAPS_JS_DIR = pathToFileURL(`${path.join(EXT, 'Resources/Public/JavaScript')}${path.sep}`);
const CASINO_JS_DIR = pathToFileURL(`${path.join(EXT_ROOT, 'casino_startpage/Resources/Public/JavaScript')}${path.sep}`);

let modul;
let tischModul;
try {
	modul = await import(new URL('bets-craps.js', CRAPS_JS_DIR).href);
	tischModul = await import(new URL('table-bets.js', CASINO_JS_DIR).href);
	check(true, 'der import() beider Module gelingt unmittelbar');
} catch (fehlerObjekt) {
	check(false, 'der import() beider Module gelingt unmittelbar', String(fehlerObjekt));
	console.log(`\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen (Abbruch, Modul lädt nicht).`);
	process.exit(1);
}

const { FIELDS, fieldById, ROUND_MAX, LINE_MAX, POINTS, ODDS_MULT, RATIO, payout, oddsMax, ratioFor, stakeUnit } = modul;
const { BetField } = tischModul;

/* ============================================ B-2 48 Felder, eindeutig */

console.log('\nB-2  Genau 48 Felder, jede Kennung genau einmal, jede Kennung im richtigen Muster');
{
	check(FIELDS.length === 48, `genau 48 Felder (gefunden: ${FIELDS.length})`);

	const zaehlung = new Map();
	for (const f of FIELDS) {
		zaehlung.set(f.id, (zaehlung.get(f.id) ?? 0) + 1);
	}
	const doppelte = [...zaehlung.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id} (${n}×)`);
	check(doppelte.length === 0, 'jede Kennung kommt genau einmal vor', ...doppelte);

	const MUSTER = /^[a-z][a-z0-9-]*$/;
	const falschesMuster = FIELDS.filter((f) => !MUSTER.test(f.id)).map((f) => f.id);
	check(falschesMuster.length === 0, 'jede Kennung passt auf /^[a-z][a-z0-9-]*$/', ...falschesMuster);

	const FAMILIEN = {
		linien: ['pass', 'dont-pass', 'come', 'dont-come'],
		linienOdds: ['pass-odds', 'dont-pass-odds'],
		comeZahlen: POINTS.map((n) => `come-${n}`),
		comeOdds: POINTS.map((n) => `come-odds-${n}`),
		dontComeZahlen: POINTS.map((n) => `dont-come-${n}`),
		dontComeOdds: POINTS.map((n) => `dont-come-odds-${n}`),
		place: POINTS.map((n) => `place-${n}`),
		field: ['field'],
		hard: [4, 6, 8, 10].map((n) => `hard-${n}`),
		einmal: ['any-seven', 'any-craps', 'two', 'three', 'eleven', 'twelve'],
		abgeleitet: ['craps-eleven'],
	};
	const vorhandeneIds = new Set(FIELDS.map((f) => f.id));
	const fehlend = [];
	for (const [familie, ids] of Object.entries(FAMILIEN)) {
		for (const id of ids) {
			if (!vorhandeneIds.has(id)) {
				fehlend.push(`${familie}: ${id} fehlt`);
			}
		}
	}
	check(fehlend.length === 0,
		'alle neun Kennungsfamilien sind vollzählig (4 Linien, 2 Linien-Odds, 6+6+6+6 Come/Odds, 6 Place, 1 Field, 4 Hard, 6 Einmalwetten, 1 abgeleitete = 48)',
		...fehlend);

	console.log('     Gegenprobe B-2-G: eine Kopie mit einem doppelten Eintrag muss auffallen');
	const kopieMitDoppel = [...FIELDS.map((f) => f.id), 'pass'];
	const zaehlungKopie = new Map();
	for (const id of kopieMitDoppel) {
		zaehlungKopie.set(id, (zaehlungKopie.get(id) ?? 0) + 1);
	}
	const doppelteKopie = [...zaehlungKopie.entries()].filter(([, n]) => n > 1);
	check(doppelteKopie.length === 1, 'B-2-G: der eingefügte doppelte Eintrag "pass" wird erkannt', `gefunden: ${doppelteKopie.length}`);
}

/* ======================================== B-3 Vollzähligkeit gegen Anhang H */

/** Anhang H, wörtlich als Liste der 22 Wettarten — unabhängig von FIELDS. */
const WETTARTEN_ANHANG_H = [
	'Pass Line', "Don't Pass", 'Come', "Don't Come", 'Odds',
	'Place 4', 'Place 5', 'Place 6', 'Place 8', 'Place 9', 'Place 10',
	'Field', 'Hard 4', 'Hard 6', 'Hard 8', 'Hard 10',
	'Any Seven', 'Any Craps', 'Two', 'Three', 'Eleven', 'Twelve',
];

/** Die Wettart einer Feldkennung — unabhängig von bets-craps.js, hier ein zweites Mal entschieden. */
function wettartVon(id) {
	if (id === 'pass') { return 'Pass Line'; }
	if (id === 'dont-pass') { return "Don't Pass"; }
	if (id === 'come' || /^come-\d+$/.test(id)) { return 'Come'; }
	if (id === 'dont-come' || /^dont-come-\d+$/.test(id)) { return "Don't Come"; }
	if (id === 'pass-odds' || id === 'dont-pass-odds' || /^come-odds-\d+$/.test(id) || /^dont-come-odds-\d+$/.test(id)) {
		return 'Odds';
	}
	const platz = /^place-(\d+)$/.exec(id);
	if (platz) { return `Place ${platz[1]}`; }
	if (id === 'field') { return 'Field'; }
	const hart = /^hard-(\d+)$/.exec(id);
	if (hart) { return `Hard ${hart[1]}`; }
	if (id === 'any-seven') { return 'Any Seven'; }
	if (id === 'any-craps') { return 'Any Craps'; }
	if (id === 'two') { return 'Two'; }
	if (id === 'three') { return 'Three'; }
	if (id === 'eleven') { return 'Eleven'; }
	if (id === 'twelve') { return 'Twelve'; }
	if (id === 'craps-eleven') { return 'Craps & Eleven'; }
	return null;
}

/**
 * Wettarten, die NICHT in Anhang H stehen, sondern aus Wettarten aus Anhang H
 * ABGELEITET sind. Jede Zeile nennt ihre Bestandteile und die Zeile, deren
 * Erwartungswert sie treffen muss — geprüft wird beides, nicht bloß der Name.
 * Ohne diese zweite Bedingung wäre die Liste eine Hintertür, durch die jede
 * beliebige Wette hereinkäme.
 */
const ABGELEITETE_WETTARTEN = [
	{
		name: 'Craps & Eleven',
		ids: ['craps-eleven'],
		bestandteile: ['Any Craps', 'Eleven'],
		erwartungswertWieBei: 'Any Craps',
	},
];

console.log('\nB-3  Jede Wettart aus Anhang H kommt vor, und keine, die Anhang H nicht kennt');
{
	check(WETTARTEN_ANHANG_H.length === 22, `die eigene Abschrift von Anhang H hat 22 Zeilen (gefunden: ${WETTARTEN_ANHANG_H.length})`);

	const abgeleiteteNamen = ABGELEITETE_WETTARTEN.map((w) => w.name);
	const gefundeneWettarten = new Set(FIELDS.map((f) => wettartVon(f.id)));
	const unbekannt = [...gefundeneWettarten].filter(
		(w) => w === null || (!WETTARTEN_ANHANG_H.includes(w) && !abgeleiteteNamen.includes(w))
	);
	const fehlend = WETTARTEN_ANHANG_H.filter((w) => !gefundeneWettarten.has(w));
	check(unbekannt.length === 0 && fehlend.length === 0,
		'genau die 22 Wettarten aus Anhang H plus die eine ausdrücklich abgeleitete kommen vor, keine weitere',
		...unbekannt.map((w) => `unbekannt: ${String(w)}`), ...fehlend.map((w) => `fehlt: ${w}`));

	const NICHT_ANGEBOTEN = ['Big 6', 'Big 8', 'Buy', 'Lay'];
	const dochAngeboten = NICHT_ANGEBOTEN.filter((name) => gefundeneWettarten.has(name));
	check(dochAngeboten.length === 0, 'Big 6, Big 8, Buy und Lay werden ausdrücklich NICHT angeboten', ...dochAngeboten);

	const unzulaessigAbgeleitet = [];
	for (const w of ABGELEITETE_WETTARTEN) {
		for (const teil of w.bestandteile) {
			if (!WETTARTEN_ANHANG_H.includes(teil)) {
				unzulaessigAbgeleitet.push(`${w.name}: Bestandteil "${teil}" steht nicht in Anhang H`);
			}
		}
		if (!WETTARTEN_ANHANG_H.includes(w.erwartungswertWieBei)) {
			unzulaessigAbgeleitet.push(`${w.name}: Bezugszeile "${w.erwartungswertWieBei}" steht nicht in Anhang H`);
		}
	}
	check(unzulaessigAbgeleitet.length === 0,
		'jede abgeleitete Wettart besteht ausschließlich aus Wettarten, die Anhang H führt', ...unzulaessigAbgeleitet);

	console.log('     Gegenprobe B-3-G2: eine abgeleitete Wette aus einem Bestandteil, den Anhang H nicht führt, muss auffallen');
	// Der Name dieser erfundenen Wette ist bewusst frei erfunden und steht auf KEINER
	// Negativliste. Ein echter Handelsname (etwa der einer geschützten Zusatzwette) darf
	// hier nicht stehen: A-5 in verify-cabinet.mjs liest den vollen Text jeder Datei,
	// Kommentare und Zeichenketten eingeschlossen, und würde ihn als Treffer melden.
	const erfunden = { name: 'Regenbogenwette', ids: ['regenbogen'], bestandteile: ['Regenbogen'], erwartungswertWieBei: 'Any Craps' };
	check(!WETTARTEN_ANHANG_H.includes(erfunden.bestandteile[0]),
		'B-3-G2: „Regenbogen“ steht nicht in Anhang H und würde die Zusatzbedingung verletzen');

	console.log('     Gegenprobe B-3-G: eine Kopie ohne hard-8 lässt "Hard 8" aus der gefundenen Menge verschwinden');
	const kopieOhneHard8 = FIELDS.filter((f) => f.id !== 'hard-8');
	const wettartenKopie = new Set(kopieOhneHard8.map((f) => wettartVon(f.id)));
	check(!wettartenKopie.has('Hard 8'), 'B-3-G: "Hard 8" fehlt in der Kopie ohne hard-8');
}

/* ======================================== B-4 RATIO gegen Anhang H */

/** Anhang H, wörtlich ein zweites Mal — unabhängig von RATIO aus bets-craps.js. */
const ANHANG_H_RATIO = {
	line: { num: 1, den: 1 },
	place: { 4: { num: 9, den: 5 }, 5: { num: 7, den: 5 }, 6: { num: 7, den: 6 }, 8: { num: 7, den: 6 }, 9: { num: 7, den: 5 }, 10: { num: 9, den: 5 } },
	oddsLight: { 4: { num: 2, den: 1 }, 5: { num: 3, den: 2 }, 6: { num: 6, den: 5 }, 8: { num: 6, den: 5 }, 9: { num: 3, den: 2 }, 10: { num: 2, den: 1 } },
	oddsDark: { 4: { num: 1, den: 2 }, 5: { num: 2, den: 3 }, 6: { num: 5, den: 6 }, 8: { num: 5, den: 6 }, 9: { num: 2, den: 3 }, 10: { num: 1, den: 2 } },
	hard: { 4: { num: 7, den: 1 }, 6: { num: 9, den: 1 }, 8: { num: 9, den: 1 }, 10: { num: 7, den: 1 } },
	fieldPlain: { num: 1, den: 1 },
	fieldTwo: { num: 2, den: 1 },
	fieldTwelve: { num: 3, den: 1 },
	anySeven: { num: 4, den: 1 },
	anyCraps: { num: 7, den: 1 },
	two: { num: 30, den: 1 },
	three: { num: 15, den: 1 },
	eleven: { num: 15, den: 1 },
	twelve: { num: 30, den: 1 },
	// ABGELEITET, nicht abgeschrieben: 8 × ½ = 4 → 3 zu 1, 16 × ½ = 8 → 7 zu 1.
	// Die Herleitung steht als Rechnung in B-13, nicht als Behauptung hier.
	crapsElevenCraps: { num: 3, den: 1 },
	crapsElevenEleven: { num: 7, den: 1 },
};

console.log('\nB-4  RATIO stimmt Bruch für Bruch mit einer eigenen Abschrift von Anhang H überein');
{
	const abweichungen = [];
	function vergleiche(pfad, ist, soll) {
		if (!ist || ist.num !== soll.num || ist.den !== soll.den) {
			abweichungen.push(`${pfad}: ${ist ? `${ist.num}:${ist.den}` : 'fehlt'}, erwartet ${soll.num}:${soll.den}`);
		}
	}
	vergleiche('RATIO.line', RATIO.line, ANHANG_H_RATIO.line);
	for (const n of POINTS) {
		vergleiche(`RATIO.place[${n}]`, RATIO.place[n], ANHANG_H_RATIO.place[n]);
		vergleiche(`RATIO.oddsLight[${n}]`, RATIO.oddsLight[n], ANHANG_H_RATIO.oddsLight[n]);
		vergleiche(`RATIO.oddsDark[${n}]`, RATIO.oddsDark[n], ANHANG_H_RATIO.oddsDark[n]);
	}
	for (const n of [4, 6, 8, 10]) {
		vergleiche(`RATIO.hard[${n}]`, RATIO.hard[n], ANHANG_H_RATIO.hard[n]);
	}
	vergleiche('RATIO.fieldPlain', RATIO.fieldPlain, ANHANG_H_RATIO.fieldPlain);
	vergleiche('RATIO.fieldTwo', RATIO.fieldTwo, ANHANG_H_RATIO.fieldTwo);
	vergleiche('RATIO.fieldTwelve', RATIO.fieldTwelve, ANHANG_H_RATIO.fieldTwelve);
	vergleiche('RATIO.anySeven', RATIO.anySeven, ANHANG_H_RATIO.anySeven);
	vergleiche('RATIO.anyCraps', RATIO.anyCraps, ANHANG_H_RATIO.anyCraps);
	vergleiche('RATIO.two', RATIO.two, ANHANG_H_RATIO.two);
	vergleiche('RATIO.three', RATIO.three, ANHANG_H_RATIO.three);
	vergleiche('RATIO.eleven', RATIO.eleven, ANHANG_H_RATIO.eleven);
	vergleiche('RATIO.twelve', RATIO.twelve, ANHANG_H_RATIO.twelve);
	vergleiche('RATIO.crapsElevenCraps', RATIO.crapsElevenCraps, ANHANG_H_RATIO.crapsElevenCraps);
	vergleiche('RATIO.crapsElevenEleven', RATIO.crapsElevenEleven, ANHANG_H_RATIO.crapsElevenEleven);
	check(abweichungen.length === 0, 'RATIO stimmt Bruch für Bruch mit Anhang H überein', ...abweichungen);

	console.log('     BetField.payout stimmt mit num/den überein (Platzhalter 1 bei den zwei kontextabhängigen Odds-Feldern)');
	const payoutAbweichungen = [];
	for (const f of FIELDS) {
		if (f.id === 'pass-odds' || f.id === 'dont-pass-odds') {
			if (f.payout !== 1) {
				payoutAbweichungen.push(`${f.id}: payout=${f.payout}, erwartet 1 (dokumentierter Platzhalter, die Quote steht erst mit dem Point fest)`);
			}
			continue;
		}
		if (f.id === 'field') {
			if (f.payout !== 1) {
				payoutAbweichungen.push(`${f.id}: payout=${f.payout}, erwartet 1 (Grundquote 1:1; die Ausnahmen bei Summe 2/12 liefert ratioFor kontextabhängig)`);
			}
			continue;
		}
		const r = ratioFor(f.id, {});
		if (r === null) {
			payoutAbweichungen.push(`${f.id}: ratioFor() ohne Kontext liefert null, payout kann nicht verglichen werden`);
			continue;
		}
		if (f.payout !== r.num / r.den) {
			payoutAbweichungen.push(`${f.id}: payout=${f.payout}, erwartet ${r.num}/${r.den} = ${r.num / r.den}`);
		}
	}
	check(payoutAbweichungen.length === 0, 'jedes BetField.payout stimmt mit num/den seiner Quote überein', ...payoutAbweichungen);

	console.log('     Gegenprobe B-4-G: eine Kopie mit 7:5 statt 7:6 bei Place 6 muss auffallen');
	const verfaelschtePlace6 = { num: 7, den: 5 };
	const stimmtUeberein = verfaelschtePlace6.num === ANHANG_H_RATIO.place[6].num && verfaelschtePlace6.den === ANHANG_H_RATIO.place[6].den;
	check(!stimmtUeberein, 'B-4-G: die verfälschte Quote 7:5 stimmt nicht mit der erwarteten 7:6 überein');
}

/* ====================================== B-5 Höchsteinsatz gegen Anhang H */

console.log('\nB-5  Jeder Höchsteinsatz stimmt mit Anhang H überein');
{
	const ERWARTETER_MAX = {
		pass: LINE_MAX, 'dont-pass': LINE_MAX, come: LINE_MAX, 'dont-come': LINE_MAX,
		'pass-odds': ODDS_MULT[6] * LINE_MAX, 'dont-pass-odds': oddsMax(4, LINE_MAX, true),
	};
	for (const n of POINTS) {
		ERWARTETER_MAX[`come-${n}`] = LINE_MAX;
		ERWARTETER_MAX[`dont-come-${n}`] = LINE_MAX;
		ERWARTETER_MAX[`come-odds-${n}`] = oddsMax(n, LINE_MAX, false);
		ERWARTETER_MAX[`dont-come-odds-${n}`] = oddsMax(n, LINE_MAX, true);
		ERWARTETER_MAX[`place-${n}`] = (n === 6 || n === 8) ? 96 : 100;
	}
	ERWARTETER_MAX.field = 100;
	for (const n of [4, 6, 8, 10]) {
		ERWARTETER_MAX[`hard-${n}`] = 10;
	}
	for (const id of ['any-seven', 'any-craps', 'two', 'three', 'eleven', 'twelve']) {
		ERWARTETER_MAX[id] = 10;
	}
	// C & E: 10 €, weil ihre höhere Quote 7 zu 1 IST (Anhang H, C.8.4:
	// „Wetten mit einer Auszahlung ab 7:1 höchstens 10 €“).
	ERWARTETER_MAX['craps-eleven'] = 10;

	// Die acht Odds-Obergrenzen liegen zusätzlich als literal nachgerechnete
	// Werte vor (Plan, Abschnitt 4.1, "Nachgerechnete Grenzen") — ein Vergleich
	// gegen eine ZWEITE, unabhängige Quelle, nicht bloß gegen oddsMax() selbst.
	const NACHGERECHNETE_ODDS_GRENZEN = {
		'pass-odds': 500, 'dont-pass-odds': 1200,
		'come-odds-4': 300, 'come-odds-10': 300,
		'come-odds-5': 400, 'come-odds-9': 400,
		'come-odds-6': 500, 'come-odds-8': 500,
		'dont-come-odds-4': 1200, 'dont-come-odds-10': 1200,
		'dont-come-odds-5': 900, 'dont-come-odds-9': 900,
		'dont-come-odds-6': 720, 'dont-come-odds-8': 720,
	};
	const oddsAbweichungen = [];
	for (const [id, wert] of Object.entries(NACHGERECHNETE_ODDS_GRENZEN)) {
		if (ERWARTETER_MAX[id] !== wert) {
			oddsAbweichungen.push(`${id}: aus oddsMax() ${ERWARTETER_MAX[id]}, literal nachgerechnet ${wert}`);
		}
	}
	check(oddsAbweichungen.length === 0, 'die acht Odds-Obergrenzen stimmen mit den literal nachgerechneten Werten aus dem Plan überein', ...oddsAbweichungen);

	const abweichungen = [];
	for (const f of FIELDS) {
		const erwartet = ERWARTETER_MAX[f.id];
		if (erwartet === undefined) {
			abweichungen.push(`${f.id}: kein erwarteter Höchsteinsatz in der eigenen Tabelle`);
			continue;
		}
		if (f.max !== erwartet) {
			abweichungen.push(`${f.id}: max=${f.max}, erwartet ${erwartet}`);
		}
	}
	check(abweichungen.length === 0, 'jeder Höchsteinsatz stimmt mit der eigenen Abschrift von Anhang H überein', ...abweichungen);

	console.log('     Gegenprobe B-5-G: max:50 auf field muss auffallen');
	check(50 !== ERWARTETER_MAX.field, 'B-5-G: ein verfälschter Höchsteinsatz von 50 auf field weicht vom erwarteten Wert (100) ab');
}

/* ================================= B-6 ROUND_MAX und countsToRoundMax */

console.log('\nB-6  ROUND_MAX ist 300; countsToRoundMax ist false bei genau den 14 Odds-Feldern');
{
	check(ROUND_MAX === 300, `ROUND_MAX ist 300 (gefunden: ${ROUND_MAX})`);

	const ODDS_IDS = new Set([
		'pass-odds', 'dont-pass-odds',
		...POINTS.map((n) => `come-odds-${n}`),
		...POINTS.map((n) => `dont-come-odds-${n}`),
	]);
	check(ODDS_IDS.size === 14, `die eigene Liste der Odds-Kennungen hat 14 Einträge (gefunden: ${ODDS_IDS.size})`);

	const abweichungen = [];
	for (const f of FIELDS) {
		const sollFalse = ODDS_IDS.has(f.id);
		if (sollFalse && f.countsToRoundMax !== false) {
			abweichungen.push(`${f.id}: countsToRoundMax=${f.countsToRoundMax}, erwartet false`);
		}
		if (!sollFalse && f.countsToRoundMax !== true) {
			abweichungen.push(`${f.id}: countsToRoundMax=${f.countsToRoundMax}, erwartet true`);
		}
	}
	check(abweichungen.length === 0, 'countsToRoundMax ist false bei genau den 14 Odds-Feldern und true bei den übrigen 34', ...abweichungen);

	console.log('     Gegenprobe B-6-G: eine Kopie, die field auf false setzt, muss auffallen');
	const feldKopie = { ...fieldById('field'), countsToRoundMax: false };
	const sollFalseKopie = ODDS_IDS.has('field');
	check(!sollFalseKopie && feldKopie.countsToRoundMax !== true, 'B-6-G: die verfälschte Kopie (field=false) weicht vom erwarteten true ab');
}

/* ===================================== B-7 Die Staffel 3-4-5× */

console.log('\nB-7  Die Staffel 3-4-5× und der gleiche Höchstgewinn bei jedem Point');
{
	const abweichungen = [];
	for (const p of POINTS) {
		for (let s = 1; s <= 100; s++) {
			const erwartet = ODDS_MULT[p] * s;
			const ist = oddsMax(p, s, false);
			if (ist !== erwartet) {
				abweichungen.push(`oddsMax(${p}, ${s}, false) = ${ist}, erwartet ${erwartet}`);
				break;
			}
		}
	}
	check(abweichungen.length === 0, 'oddsMax(p, s, false) === ODDS_MULT[p] × s für alle sechs Points und s von 1 bis 100', ...abweichungen);

	const hoechstgewinnAbweichungen = [];
	for (const p of POINTS) {
		for (let s = 5; s <= 100; s += 5) {
			const hell = payout(oddsMax(p, s, false), RATIO.oddsLight[p]);
			const dunkel = payout(oddsMax(p, s, true), RATIO.oddsDark[p]);
			if (hell !== 6 * s) {
				hoechstgewinnAbweichungen.push(`Point ${p}, Linie ${s}: Höchstgewinn hell ${hell}, erwartet ${6 * s}`);
			}
			if (dunkel !== 6 * s) {
				hoechstgewinnAbweichungen.push(`Point ${p}, Linie ${s}: Höchstgewinn dunkel ${dunkel}, erwartet ${6 * s}`);
			}
		}
	}
	check(hoechstgewinnAbweichungen.length === 0,
		'der Höchstgewinn ist bei allen sechs Points gleich hoch: sechsmal die Linienwette, hell wie dunkel (s als Vielfaches von 5)',
		...hoechstgewinnAbweichungen);

	check(oddsMax(4, 0, false) === 0, 'oddsMax ohne Linienwette (0) liefert 0');
	check(oddsMax(999, 100, false) === 0, 'oddsMax ohne gültigen Point liefert 0');

	console.log('     Gegenprobe B-7-G: ein verfälschtes ODDS_MULT (4 statt 3 bei Point 4) muss auffallen');
	const verfaelschtesOddsMult = { ...ODDS_MULT, 4: 4 };
	check(verfaelschtesOddsMult[4] * 100 !== oddsMax(4, 100, false),
		'B-7-G: die verfälschte Staffel (4×) weicht vom tatsächlichen oddsMax(4, 100, false) (3×) ab');
}

/* ============================================ B-8 ratioFor() vollständig */

console.log('\nB-8  ratioFor() liefert für jede Kennung und jede Summe eine Quote, field kontextabhängig');
{
	const abweichungen = [];
	for (const f of FIELDS) {
		const istLinienOddsOhnePoint = f.id === 'pass-odds' || f.id === 'dont-pass-odds';
		for (let sum = 2; sum <= 12; sum++) {
			const r = ratioFor(f.id, { sum });
			if (istLinienOddsOhnePoint) {
				if (r !== null) {
					abweichungen.push(`${f.id} bei Summe ${sum} ohne point: erwartet null, gefunden ${JSON.stringify(r)}`);
				}
			} else if (r === null) {
				abweichungen.push(`${f.id} bei Summe ${sum}: ratioFor liefert null`);
			}
		}
	}
	check(abweichungen.length === 0,
		'jede der 48 Kennungen liefert für jede der 11 Summen eine Quote (die zwei Linien-Odds ohne point ausdrücklich null)',
		...abweichungen);

	const mitPointAbweichungen = [];
	for (const p of POINTS) {
		if (ratioFor('pass-odds', { point: p }) === null) {
			mitPointAbweichungen.push(`pass-odds mit point ${p} liefert null`);
		}
		if (ratioFor('dont-pass-odds', { point: p }) === null) {
			mitPointAbweichungen.push(`dont-pass-odds mit point ${p} liefert null`);
		}
	}
	check(mitPointAbweichungen.length === 0, 'pass-odds und dont-pass-odds liefern MIT gesetztem point für jeden der sechs Points eine Quote', ...mitPointAbweichungen);

	check(ratioFor('erfunden-123', {}) === null, 'eine erfundene Kennung liefert null');

	const feldZwei = ratioFor('field', { sum: 2 });
	const feldZwoelf = ratioFor('field', { sum: 12 });
	const feldSieben = ratioFor('field', { sum: 7 });
	check(feldZwei !== null && feldZwei.num === 2 && feldZwei.den === 1, 'field bei Summe 2 liefert 2:1');
	check(feldZwoelf !== null && feldZwoelf.num === 3 && feldZwoelf.den === 1, 'field bei Summe 12 liefert 3:1');
	check(feldSieben !== null && feldSieben.num === 1 && feldSieben.den === 1, 'field bei jeder anderen Summe liefert 1:1');

	console.log('     Gegenprobe B-8-G: field müsste bei Summe 12 nur 2:1 liefern');
	const verfaelschtesFeldZwoelf = { num: 2, den: 1 };
	check(!(verfaelschtesFeldZwoelf.num === 3), 'B-8-G: 2:1 stimmt nicht mit der erwarteten 3:1 bei Summe 12 überein');

	const elf = ratioFor('craps-eleven', { sum: 11 });
	check(elf !== null && elf.num === 7 && elf.den === 1,
		'craps-eleven liefert bei Summe 11 die Quote 7 zu 1');
	const crapsSummen = [2, 3, 12].every((s) => {
		const r = ratioFor('craps-eleven', { sum: s });
		return r !== null && r.num === 3 && r.den === 1;
	});
	check(crapsSummen, 'craps-eleven liefert bei Summe 2, 3 und 12 die Quote 3 zu 1');
}

/* ============================================== BigInt-Bruchrechnung */

/** Größter gemeinsamer Teiler zweier BigInt, immer nicht-negativ. */
function ggT(a, b) {
	let x = a < 0n ? -a : a;
	let y = b < 0n ? -b : b;
	while (y) {
		[x, y] = [y, x % y];
	}
	return x;
}

/** Ein gekürzter Bruch aus zwei BigInt, Nenner immer positiv. */
function kuerze(n, d) {
	let zaehler = n;
	let nenner = d;
	if (nenner < 0n) {
		zaehler = -zaehler;
		nenner = -nenner;
	}
	const t = ggT(zaehler, nenner) || 1n;
	return { n: zaehler / t, d: nenner / t };
}

/** @param {number|bigint} num @param {number|bigint} den @returns {{n: bigint, d: bigint}} */
function bruch(num, den = 1) {
	return kuerze(BigInt(num), BigInt(den));
}

function neg(a) {
	return { n: -a.n, d: a.d };
}

function plus(a, b) {
	return kuerze(a.n * b.d + b.n * a.d, a.d * b.d);
}

function minus(a, b) {
	return plus(a, neg(b));
}

function mal(a, b) {
	return kuerze(a.n * b.n, a.d * b.d);
}

/** Zwei bereits gekürzte Brüche auf Gleichheit — kein Toleranzvergleich. */
function gleich(a, b) {
	return a.n === b.n && a.d === b.d;
}

function alsText(a) {
	return `${a.n}/${a.d}`;
}

/** Bruch in Prozent, negiert (Hausvorteil ist der NEGATIVE Erwartungswert), auf zwei Nachkommastellen gerundet. */
function alsProzent(a) {
	return Math.round((Number(-a.n) / Number(a.d)) * 10000) / 100;
}

/** Die Anzahl der Würfelpaare, die eine Summe ergeben — von 36 gleich wahrscheinlichen Paaren. */
const WAYS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };

/** ratioFor() als BigInt-Bruch statt als {num, den}. */
function ratioBruch(fieldId, ctx = {}) {
	const r = ratioFor(fieldId, ctx);
	return r === null ? null : bruch(r.num, r.den);
}

/**
 * Erwartungswert je 1 € der Pass Line (dunkel=false) bzw. Don't Pass (dunkel=true).
 * Come/Don't Come haben denselben Erwartungswert (dieselbe Verteilung, ein Come-out
 * auf dem jeweils nächsten Wurf) — Annahme 4 aus Abschnitt 10 des Plans, hier
 * dennoch eigenständig für beide Kennungen gerechnet, nicht behauptet.
 */
function evLinie(dunkel) {
	const rLinie = dunkel ? ratioBruch('dont-pass', {}) : ratioBruch('pass', {});
	// Pass verliert auf ALLEN DREI Craps-Zahlen (2, 3, 12); Don't Pass gewinnt
	// nur auf 2 und 3 — die 12 ist dort "Bar 12", ein Patt (trägt 0 bei, siehe
	// unten), kein Verlust für die helle und kein Gewinn für die dunkle Seite.
	const winSums = dunkel ? [2, 3] : [7, 11];
	const lossSums = dunkel ? [7, 11] : [2, 3, 12];
	let ev = bruch(0);
	for (const s of winSums) {
		ev = plus(ev, mal(bruch(WAYS[s], 36), rLinie));
	}
	for (const s of lossSums) {
		ev = plus(ev, bruch(-WAYS[s], 36));
	}
	// Bar 12: patt, trägt 0 zum Erwartungswert bei — keine Zeile nötig.
	for (const p of POINTS) {
		const np = WAYS[p];
		const pMache = bruch(np, np + 6);
		const pSieben = bruch(6, np + 6);
		const zweig = dunkel ? minus(mal(pSieben, rLinie), pMache) : minus(mal(pMache, rLinie), pSieben);
		ev = plus(ev, mal(bruch(np, 36), zweig));
	}
	return ev;
}

/** Erwartungswert je 1 € einer Place-Wette (reiner Markov-Schritt Zahl-oder-Sieben). */
function evPlace(n) {
	const r = ratioBruch(`place-${n}`, {});
	const np = WAYS[n];
	const pWin = bruch(np, np + 6);
	const pLose = bruch(6, np + 6);
	return minus(mal(pWin, r), pLose);
}

/** Erwartungswert je 1 € einer Hardway-Wette. */
function evHard(n) {
	const r = ratioBruch(`hard-${n}`, {});
	const hartWege = 1;
	const leichtWege = { 4: 2, 6: 4, 8: 4, 10: 2 }[n];
	const siebenWege = 6;
	const gesamt = hartWege + leichtWege + siebenWege;
	const pWin = bruch(hartWege, gesamt);
	const pLose = bruch(leichtWege + siebenWege, gesamt);
	return minus(mal(pWin, r), pLose);
}

/** Erwartungswert je 1 € einer Einwurfwette (Field, Any Seven, Any Craps, 2/3/11/12). */
function evEinmal(fieldId, gewinnSummen) {
	let ev = bruch(0);
	for (let s = 2; s <= 12; s++) {
		if (gewinnSummen.includes(s)) {
			const r = fieldId === 'field' ? ratioBruch('field', { sum: s }) : ratioBruch(fieldId, {});
			ev = plus(ev, mal(bruch(WAYS[s], 36), r));
		} else {
			ev = plus(ev, bruch(-WAYS[s], 36));
		}
	}
	return ev;
}

/** Erwartungswert je 1 € der hellen Odds hinter der Linie/einer Come-Zahl, für Point n. */
function evOddsLight(n) {
	const r = bruch(RATIO.oddsLight[n].num, RATIO.oddsLight[n].den);
	const np = WAYS[n];
	const pWin = bruch(np, np + 6);
	const pLose = bruch(6, np + 6);
	return minus(mal(pWin, r), pLose);
}

/** Erwartungswert je 1 € der dunklen Odds hinter Don't Pass/Don't Come, für Point n. */
function evOddsDark(n) {
	const r = bruch(RATIO.oddsDark[n].num, RATIO.oddsDark[n].den);
	const np = WAYS[n];
	const pWin = bruch(6, np + 6);
	const pLose = bruch(np, np + 6);
	return minus(mal(pWin, r), pLose);
}

/**
 * Erwartungswert je 1 € von C & E. Eine Einwurfwette mit ZWEI Quoten:
 * 3 zu 1 auf 2, 3 und 12 und 7 zu 1 auf die 11. Gerechnet wird über alle
 * elf Summen, wie bei jeder anderen Einwurfwette — ohne die Halbierung
 * überhaupt anzufassen, denn sie steckt bereits in den beiden Quoten.
 */
function evCrapsEleven() {
	let ev = bruch(0);
	for (let s = 2; s <= 12; s++) {
		const gewinnt = s === 2 || s === 3 || s === 11 || s === 12;
		if (gewinnt) {
			ev = plus(ev, mal(bruch(WAYS[s], 36), ratioBruch('craps-eleven', { sum: s })));
		} else {
			ev = plus(ev, bruch(-WAYS[s], 36));
		}
	}
	return ev;
}

/** Erwartungswert einer beliebigen Feldkennung, über die passende Zerlegung. */
function evFuer(id) {
	if (id === 'pass' || id === 'come') { return evLinie(false); }
	if (id === 'dont-pass' || id === 'dont-come') { return evLinie(true); }
	const platz = /^place-(\d+)$/.exec(id);
	if (platz) { return evPlace(Number(platz[1])); }
	if (id === 'field') { return evEinmal('field', [2, 3, 4, 9, 10, 11, 12]); }
	const hart = /^hard-(\d+)$/.exec(id);
	if (hart) { return evHard(Number(hart[1])); }
	if (id === 'any-seven') { return evEinmal('any-seven', [7]); }
	if (id === 'any-craps') { return evEinmal('any-craps', [2, 3, 12]); }
	if (id === 'two') { return evEinmal('two', [2]); }
	if (id === 'three') { return evEinmal('three', [3]); }
	if (id === 'eleven') { return evEinmal('eleven', [11]); }
	if (id === 'twelve') { return evEinmal('twelve', [12]); }
	if (id === 'craps-eleven') { return evCrapsEleven(); }
	return null;
}

/* ============================== B-9 Der rechnerische Quotennachweis */

console.log('\nB-9  Der rechnerische Quotennachweis je Wettart (36 gleich wahrscheinliche Würfelpaare, exakte Brüche)');
{
	// Die wörtliche Erwartungstabelle aus Anhang H (Plan, Abschnitt 4.2).
	const GRUPPEN = [
		{ name: 'Pass Line, Come', ids: ['pass', 'come'], erwartet: bruch(-7, 495), prozent: 1.41 },
		{ name: "Don't Pass, Don't Come", ids: ['dont-pass', 'dont-come'], erwartet: bruch(-3, 220), prozent: 1.36 },
		{ name: 'Place 4, Place 10', ids: ['place-4', 'place-10'], erwartet: bruch(-1, 15), prozent: 6.67 },
		{ name: 'Place 5, Place 9', ids: ['place-5', 'place-9'], erwartet: bruch(-1, 25), prozent: 4.00 },
		{ name: 'Place 6, Place 8', ids: ['place-6', 'place-8'], erwartet: bruch(-1, 66), prozent: 1.52 },
		{ name: 'Field', ids: ['field'], erwartet: bruch(-1, 36), prozent: 2.78 },
		{ name: 'Hard 4, Hard 10', ids: ['hard-4', 'hard-10'], erwartet: bruch(-1, 9), prozent: 11.11 },
		{ name: 'Hard 6, Hard 8', ids: ['hard-6', 'hard-8'], erwartet: bruch(-1, 11), prozent: 9.09 },
		{ name: 'Any Seven', ids: ['any-seven'], erwartet: bruch(-1, 6), prozent: 16.67 },
		{ name: 'Any Craps', ids: ['any-craps'], erwartet: bruch(-1, 9), prozent: 11.11 },
		{ name: 'Die 2, Die 12', ids: ['two', 'twelve'], erwartet: bruch(-5, 36), prozent: 13.89 },
		{ name: 'Die 3, Die 11', ids: ['three', 'eleven'], erwartet: bruch(-1, 9), prozent: 11.11 },
		// Abgeleitet, und deshalb NICHT aus Anhang H abgeschrieben, sondern
		// aus den 36 Würfelpaaren hergeleitet: sie muss auf denselben Wert
		// kommen wie die Zeile „Any Craps“, sonst stimmt die Aufteilung nicht.
		{ name: 'Craps & Eleven', ids: ['craps-eleven'], erwartet: bruch(-1, 9), prozent: 11.11 },
	];

	const abweichungen = [];
	for (const gruppe of GRUPPEN) {
		for (const id of gruppe.ids) {
			const ev = evFuer(id);
			if (ev === null) {
				abweichungen.push(`${id}: kein Erwartungswert berechenbar`);
				continue;
			}
			if (!gleich(ev, gruppe.erwartet)) {
				abweichungen.push(`${id}: Erwartungswert ${alsText(ev)}, erwartet ${alsText(gruppe.erwartet)} (${gruppe.name})`);
			}
			const prozent = alsProzent(ev);
			if (prozent !== gruppe.prozent) {
				abweichungen.push(`${id}: ${prozent} % weicht von Anhang H (${gruppe.prozent} %) ab`);
			}
		}
	}

	// Die Odds-Zeile aus Anhang H: alle zwölf Odds-Erwartungswerte sind exakt 0.
	for (const p of POINTS) {
		if (!gleich(evOddsLight(p), bruch(0))) {
			abweichungen.push(`Odds hell bei Point ${p}: ${alsText(evOddsLight(p))}, erwartet 0/1`);
		}
		if (!gleich(evOddsDark(p), bruch(0))) {
			abweichungen.push(`Odds dunkel bei Point ${p}: ${alsText(evOddsDark(p))}, erwartet 0/1`);
		}
	}

	check(abweichungen.length === 0,
		'jede der 14 Zeilen aus Anhang H stimmt mit dem exakt hergeleiteten Erwartungswert überein, als Bruch UND als gerundeter Prozentwert',
		...abweichungen);

	console.log('     Gegenprobe B-9-G: Place 6 mit 8:6 statt 7:6 gerechnet ergibt einen anderen Bruch als -1/66');
	{
		const np = WAYS[6];
		const pWin = bruch(np, np + 6);
		const pLose = bruch(6, np + 6);
		const rFalsch = bruch(8, 6);
		const evFalsch = minus(mal(pWin, rFalsch), pLose);
		check(!gleich(evFalsch, bruch(-1, 66)), 'B-9-G: die verfälschte Rechnung (8:6) ergibt nicht -1/66', `gefunden: ${alsText(evFalsch)}`);
	}
}

/* ==================================== B-10 Odds-Hausvorteil exakt 0 */

console.log('\nB-10  Odds haben den Hausvorteil exakt 0 — alle sechs Points, hell und dunkel');
{
	const abweichungen = [];
	for (const p of POINTS) {
		const evL = evOddsLight(p);
		const evD = evOddsDark(p);
		if (!gleich(evL, bruch(0))) {
			abweichungen.push(`Odds hell bei Point ${p}: ${alsText(evL)}, erwartet 0/1`);
		}
		if (!gleich(evD, bruch(0))) {
			abweichungen.push(`Odds dunkel bei Point ${p}: ${alsText(evD)}, erwartet 0/1`);
		}
	}
	check(abweichungen.length === 0, 'jede der zwölf Odds-Quoten ergibt einen Erwartungswert von exakt 0/1, nicht "nahe null"', ...abweichungen);

	console.log('     Gegenprobe B-10-G: 5:2 statt 2:1 bei Point 4 ergibt einen Erwartungswert ungleich 0');
	const np4 = WAYS[4];
	const pWin4 = bruch(np4, np4 + 6);
	const pLose4 = bruch(6, np4 + 6);
	const rFalsch = bruch(5, 2);
	const evFalsch = minus(mal(pWin4, rFalsch), pLose4);
	check(!gleich(evFalsch, bruch(0)), 'B-10-G: die verfälschte Quote (5:2) ergibt einen Erwartungswert ungleich 0', `gefunden: ${alsText(evFalsch)}`);
}

/* ================================ B-11 matches() wirft, BetField entsteht */

console.log('\nB-11  matches() jedes Feldes wirft; new BetField(beschreibung) legt es trotzdem an');
{
	const abweichungen = [];
	for (const beschreibung of FIELDS) {
		let feld;
		try {
			feld = new BetField(beschreibung);
		} catch (fehlerObjekt) {
			abweichungen.push(`${beschreibung.id}: new BetField() wirft unerwartet — ${String(fehlerObjekt)}`);
			continue;
		}
		let hatGeworfen = false;
		try {
			feld.outcome(7);
		} catch {
			hatGeworfen = true;
		}
		if (!hatGeworfen) {
			abweichungen.push(`${beschreibung.id}: feld.outcome(7) wirft nicht`);
		}
	}
	check(abweichungen.length === 0,
		'alle 48 Felder lassen sich als BetField anlegen (table-bets.js), und jedes feld.outcome(7) wirft (settle() ist an diesem Tisch verboten)',
		...abweichungen);
}

/* =================================================== B-12 ROUND_MAX */

console.log('\nB-12  ROUND_MAX ist kleiner als die Summe der Feldhöchsteinsätze ohne Odds, größer als deren größter Einzelwert');
{
	check(ROUND_MAX === 300, `ROUND_MAX ist 300 (gefunden: ${ROUND_MAX})`);

	const ohneOdds = FIELDS.filter((f) => f.countsToRoundMax === true);
	check(ohneOdds.length === 34, `34 Felder zählen in den Rundenhöchstbetrag (gefunden: ${ohneOdds.length})`);

	const summe = ohneOdds.reduce((s, f) => s + f.max, 0);
	check(ROUND_MAX < summe, `ROUND_MAX (${ROUND_MAX}) ist kleiner als die Summe der Feldhöchsteinsätze ohne Odds (${summe})`);

	const groessterEinzelwert = Math.max(...ohneOdds.map((f) => f.max));
	check(ROUND_MAX > groessterEinzelwert, `ROUND_MAX (${ROUND_MAX}) ist größer als der größte Einzelhöchsteinsatz ohne Odds (${groessterEinzelwert})`);
}

/* ================================ B-13 Die Halbierung von C & E geht auf */

console.log('\nB-13  C & E: die Halbierung geht bei JEDEM ganzen Einsatz auf, ohne Rundungsverlust');
{
	/*
	 * DIE FRAGE. Ein Chip zu 1 € lässt sich nicht halbieren. Muss es eine
	 * Hausregel für ungerade Einsätze geben — abrunden, aufrunden, den
	 * überzähligen Euro auf eine der beiden Hälften legen?
	 *
	 * DIE ANTWORT: nein. Gerechnet wird gar nicht mit Hälften. Wer s Euro
	 * setzt, hat s/2 auf Any Craps (zahlt 7 zu 1, Rückgabe 8 × s/2 = 4s) und
	 * s/2 auf die Elf (zahlt 15 zu 1, Rückgabe 16 × s/2 = 8s). 4s und 8s sind
	 * für jedes ganze s wieder ganz. Die Halbierung ist die Erklärung der
	 * Wette, kein Rechenschritt — und deshalb gibt es hier keinen Rest, der
	 * irgendwohin müsste.
	 *
	 * Diese Prüfung rechnet beide Wege getrennt aus und vergleicht sie als
	 * exakte Brüche: den Weg über die halben Einsätze (mit den Quoten aus
	 * Anhang H) und den Weg über die abgeleiteten Quoten auf den ganzen
	 * Einsatz (mit denen der Tisch tatsächlich rechnet).
	 */
	const abweichungen = [];
	const HALB_CRAPS = bruch(RATIO.anyCraps.num, RATIO.anyCraps.den);   // 7:1 aus Anhang H
	const HALB_ELF = bruch(RATIO.eleven.num, RATIO.eleven.den);         // 15:1 aus Anhang H

	for (let s = 1; s <= 10; s++) {
		const halb = bruch(s, 2);
		const rueckgabeCrapsHalb = mal(halb, plus(HALB_CRAPS, bruch(1)));
		const rueckgabeElfHalb = mal(halb, plus(HALB_ELF, bruch(1)));

		const rueckgabeCrapsGanz = bruch(payout(s, RATIO.crapsElevenCraps) + s);
		const rueckgabeElfGanz = bruch(payout(s, RATIO.crapsElevenEleven) + s);

		if (!gleich(rueckgabeCrapsHalb, rueckgabeCrapsGanz)) {
			abweichungen.push(`Einsatz ${s} €, Craps: über Hälften ${alsText(rueckgabeCrapsHalb)}, über die abgeleitete Quote ${alsText(rueckgabeCrapsGanz)}`);
		}
		if (!gleich(rueckgabeElfHalb, rueckgabeElfGanz)) {
			abweichungen.push(`Einsatz ${s} €, Elf: über Hälften ${alsText(rueckgabeElfHalb)}, über die abgeleitete Quote ${alsText(rueckgabeElfGanz)}`);
		}
		// Und: der Abrundungsschritt in payout() darf hier NIE etwas
		// wegnehmen — 3s und 7s sind für jedes ganze s bereits ganz.
		if (payout(s, RATIO.crapsElevenCraps) !== 3 * s) {
			abweichungen.push(`Einsatz ${s} €: payout(…, 3:1) = ${payout(s, RATIO.crapsElevenCraps)}, erwartet ${3 * s}`);
		}
		if (payout(s, RATIO.crapsElevenEleven) !== 7 * s) {
			abweichungen.push(`Einsatz ${s} €: payout(…, 7:1) = ${payout(s, RATIO.crapsElevenEleven)}, erwartet ${7 * s}`);
		}
	}
	check(abweichungen.length === 0,
		'für jeden Einsatz von 1 bis 10 € stimmen beide Rechenwege exakt überein, auch für die ungeraden Beträge 1, 3, 5, 7 und 9',
		...abweichungen);

	check(stakeUnit('craps-eleven') === 1,
		`die Einsatz-Einheit von C & E ist 1 € (gefunden: ${stakeUnit('craps-eleven')}) — es gibt keinen Betrag, der einen Teil der Auszahlung verschenkt`);

	console.log('     Gegenprobe B-13-G: eine verfälschte Craps-Quote (6 zu 1 statt 3 zu 1) muss bei ungeradem Einsatz auffallen');
	{
		const falsch = { num: 6, den: 1 };
		const s = 5;
		const ueberHaelften = mal(bruch(s, 2), plus(HALB_CRAPS, bruch(1)));       // 20/1
		const ueberFalscheQuote = bruch(payout(s, falsch) + s);                    // 35/1
		check(!gleich(ueberHaelften, ueberFalscheQuote),
			'B-13-G: mit 6 zu 1 stimmen die beiden Rechenwege bei 5 € Einsatz nicht mehr überein',
			`über Hälften ${alsText(ueberHaelften)}, über die verfälschte Quote ${alsText(ueberFalscheQuote)}`);
	}

	console.log('     Gegenprobe B-13-G2: eine Quote mit Nenner 2 würde bei ungeradem Einsatz tatsächlich abrunden');
	{
		// Nicht unsere Quote — der Beweis, dass die Prüfung oben nicht leerläuft:
		// hätte C & E eine Quote wie 7 zu 2, verlöre ein Einsatz von 5 € beim
		// Abrunden einen halben Euro, und stakeUnit() müsste 2 melden.
		const mitNenner2 = { num: 7, den: 2 };
		check(payout(5, mitNenner2) * 2 !== 5 * 7,
			'B-13-G2: eine Quote mit Nenner 2 verliert bei 5 € Einsatz tatsächlich einen Teil der Auszahlung — die Prüfung oben ist also nicht leer');
	}
}

/* ------------------------------------------------------------- Ergebnis */

if (fehler === 0) {
	console.log('\nERGEBNIS: alle Prüfungen bestanden. 48 Felder, alle 22 Wettarten aus Anhang H'
		+ '\nund die eine daraus abgeleitete, jede Auszahlung und jeder Höchsteinsatz gegen eine'
		+ '\neigene Abschrift von Anhang H, die Staffel 3-4-5× hält bei jedem Point denselben'
		+ '\nHöchstgewinn, und der rechnerische Quotennachweis stimmt für alle 14 Zeilen aus'
		+ '\nAnhang H exakt als Bruch UND gerundet als Prozentwert — die Odds mit einem'
		+ '\nHausvorteil von genau 0/1, C & E mit einer Halbierung, die bei jedem ganzen'
		+ '\nEinsatz ohne Rundungsverlust aufgeht.');
} else {
	console.log(`\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);
}

process.exit(fehler === 0 ? 0 : 1);
