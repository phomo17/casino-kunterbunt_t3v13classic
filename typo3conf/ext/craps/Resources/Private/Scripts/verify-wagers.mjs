/**
 * Craps – Nachweis des Wettzustands über mehrere Würfe (Umsetzungsstück C7b)
 * =============================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Rechnet ausschließlich mit den echten
 * Dateien der Extension und startet keinen Browser.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-wagers.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan PLAN-craps-c7, Umsetzungsstück C7b, Abschnitt 4.4)
 * --------------------------------------------------------------------------------
 *   W-1   wagers-craps.js ist import- und dokumentfrei
 *   W-2   Come-out: alle 36 Paare, Pass/Don't Pass, Bar 12, Point-Aufstellung
 *   W-3   der Point wird zur Vertragswette (contracts() nennt NUR pass)
 *   W-4   Point-Phase: Point macht, Sieben verliert, sonst bleibt liegen
 *   W-5   Come wandert auf seine Zahl und gewinnt/verliert wie eine Linie
 *   W-6   Don't Come spiegelbildlich, mit Patt bei der 12
 *   W-7   Odds folgen ihrer Grundwette, nie allein
 *   W-8   Place-Wetten ruhen beim Come-out, sind im Point schaltbar
 *   W-9   Field löst sich in jedem Wurf auf, mit den drei Quoten
 *   W-10  Hardways über mehrere Würfe (Pasch vor der einfachen Zahl und der 7)
 *   W-11  die sieben Einmalwetten und Field lösen sich NIE als 'stay' auf
 *   W-12  erschöpfende Probe: 48 Felder × 7 Zustände × 36 Paare, je ein Urteil
 *   W-13  Bilanzprobe: total/payout stimmen mit der Summe der Einzelurteile
 *   W-14  mayPlace() erteilt jede der sechs Absagen genau dort, wo sie hingehört
 *   W-15  DER QUOTENNACHWEIS AM ECHTEN ZUSTANDSWERK: derselbe Erwartungswert
 *         wie in verify-bets.mjs (B-9), hier aber nicht aus einer Formel,
 *         sondern aus den tatsächlichen Urteilen von CrapsWagers.resolve()
 *         für alle 36 Paare in jedem erreichbaren Zustand
 *
 * WARUM MIT BigInt-BRÜCHEN GERECHNET WIRD (W-15), NICHT MIT KOMMAZAHLEN
 * -----------------------------------------------------------------------
 * Dieselbe Begründung wie in verify-bets.mjs: 7:6 ist als Kommazahl nie
 * exakt, und ein Erwartungswert wie −1/66 endet als Kommazahl auf "ungefähr".
 * Jede Größe in W-15 ist ein Bruch aus zwei BigInt ({n, d}), gekürzt nach
 * jeder Rechnung.
 *
 * WIE W-15 RECHNET, OHNE EINE REGEL NACHZUBAUEN
 * -------------------------------------------------
 * Jede Wettart hat einen kleinen, abzählbaren Zustandsraum. Für Felder, die
 * in EINEM Schritt entweder gewinnen, verlieren oder liegen bleiben (Odds,
 * Place, Hardways, die Come-/Don't-Come-Zahlenkästen, Field, die sechs
 * Einmalwetten), setzt evAbsorbierendesFeld() den Zustand vor JEDEM der 36
 * Paare über restore() zurück, liest aus dem tatsächlichen resolve()-Urteil
 * ab, ob gewonnen oder verloren wurde, und löst die klassische Gleichung
 * einer absorbierenden Kette mit Selbstschleife exakt auf:
 *
 *     EV = (wegeGewinn·gewinnBruch + wegeVerlust·(−1)) / (wegeGewinn+wegeVerlust)
 *
 * Für Pass/Don't Pass (Come-out geht in einen Point über) und für die erste
 * Auflösung von Come/Don't Come (die entweder sofort entscheidet oder auf
 * eine Zahl wandert) braucht es einen zweiten Schritt: die sechs
 * Point-Erwartungswerte werden ZUERST mit derselben Funktion berechnet, und
 * die Come-out-Kette benutzt sie als bekannten Folgewert, sobald resolve()
 * selbst 'stay' (Pass/Don't Pass) bzw. 'move' (Come/Don't Come) meldet.
 * Nirgends wird eine Wahrscheinlichkeit oder eine Quote ein zweites Mal von
 * Hand hingeschrieben — jede Zahl kommt aus einem echten resolve()-Aufruf.
 *
 * JEDE NEUE PRÜFUNG HAT EINE GEGENPROBE
 * ----------------------------------------
 * Eine Prüfung, die nie fehlschlagen kann, ist keine. Jede Gegenprobe
 * arbeitet auf einer im Skript selbst angefertigten, verfälschten Kopie oder
 * einer eigens gerechneten Alternative — niemals auf dem echten Zustandswerk.
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

console.log('\nCraps – Nachweis des Wettzustands über mehrere Würfe (Umsetzungsstück C7b)');
console.log('=============================================================================\n');

const BETS_JS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/bets-craps.js');
const WAGERS_JS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/wagers-craps.js');

for (const pfad of [BETS_JS_PFAD, WAGERS_JS_PFAD]) {
	if (!existsSync(pfad)) {
		console.log(`\nERGEBNIS: Abbruch — ${kurz(pfad)} existiert nicht.`);
		process.exit(1);
	}
}

console.log(`Geprüfte Datei: ${kurz(WAGERS_JS_PFAD)}`);
console.log(`Mitgeladen:     ${kurz(BETS_JS_PFAD)}\n`);

/* ==================================================== W-1 Importfrei */

console.log('W-1  wagers-craps.js ist import- und dokumentfrei');
{
	const quelltext = lies(WAGERS_JS_PFAD);
	const ohneKomm = ohneKommentare(quelltext);
	check(!/\bimport\b/.test(ohneKomm), 'kein import im Quelltext (Kommentare ausgenommen)');
	check(!/\brequire\b/.test(ohneKomm), 'kein require im Quelltext');
	check(!/\bdocument\b/.test(ohneKomm), 'kein document im Quelltext');
	check(!/\bwindow\b/.test(ohneKomm), 'kein window im Quelltext');

	console.log('     Gegenprobe W-1-G: eine eingefügte import-Zeile muss auffallen');
	const verfaelscht = `import { x } from 'y.js';\n${ohneKomm}`;
	check(/\bimport\b/.test(verfaelscht), 'W-1-G: die eingefügte import-Zeile wird von derselben Prüfung erkannt');
}

/* Die Module werden erst NACH W-1 geladen — W-1 prüft den Quelltext, nicht
 * das geladene Modul. */

const CRAPS_JS_DIR = pathToFileURL(`${path.join(EXT, 'Resources/Public/JavaScript')}${path.sep}`);

let betsModul;
let wagersModul;
try {
	betsModul = await import(new URL('bets-craps.js', CRAPS_JS_DIR).href);
	wagersModul = await import(new URL('wagers-craps.js', CRAPS_JS_DIR).href);
	check(true, 'der import() beider Module gelingt unmittelbar');
} catch (fehlerObjekt) {
	check(false, 'der import() beider Module gelingt unmittelbar', String(fehlerObjekt));
	console.log(`\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen (Abbruch, Modul lädt nicht).`);
	process.exit(1);
}

const { ratioFor, oddsMax, payout, POINTS, RATIO } = betsModul;
const { CrapsWagers } = wagersModul;

/** Eine einzige Instanz für das ganze Skript; restore() setzt sie vor jedem Wurf zurück. */
const wagers = new CrapsWagers({ ratioFor, oddsMax, payout });

/** Alle 36 gleich wahrscheinlichen Würfelpaare. */
function alleWuerfe() {
	const wuerfe = [];
	for (let a = 1; a <= 6; a++) {
		for (let b = 1; b <= 6; b++) {
			wuerfe.push({ sum: a + b, faces: [a, b], hart: a === b });
		}
	}
	return wuerfe;
}
const WUERFE = Object.freeze(alleWuerfe());

/** Der Feld-Eintrag eines Urteils, oder eine geworfene Ausnahme, wenn er fehlt. */
function urteilVon(ergebnis, fieldId) {
	const eintrag = ergebnis.fields.find((f) => f.fieldId === fieldId);
	if (!eintrag) {
		throw new Error(`urteilVon: kein Urteil für "${fieldId}" in ${JSON.stringify(ergebnis.fields.map((f) => f.fieldId))}`);
	}
	return eintrag;
}

/* ============================================ W-2 Come-out, alle 36 Paare */

console.log('\nW-2  Come-out: alle 36 Paare, Pass/Don\'t Pass, Bar 12, Point-Aufstellung');
{
	const abweichungen = [];
	for (const { sum, faces } of WUERFE) {
		wagers.restore({ point: null });
		const ergebnis = wagers.resolve({ sum, faces, stakes: { pass: 10, 'dont-pass': 10 } });
		const pass = urteilVon(ergebnis, 'pass');
		const dontPass = urteilVon(ergebnis, 'dont-pass');

		if (sum === 7 || sum === 11) {
			if (pass.outcome !== 'win' || pass.returned !== 20) { abweichungen.push(`Summe ${sum}: pass=${pass.outcome}/${pass.returned}, erwartet win/20`); }
			if (dontPass.outcome !== 'loss') { abweichungen.push(`Summe ${sum}: dont-pass=${dontPass.outcome}, erwartet loss`); }
		} else if (sum === 2 || sum === 3) {
			if (pass.outcome !== 'loss') { abweichungen.push(`Summe ${sum}: pass=${pass.outcome}, erwartet loss`); }
			if (dontPass.outcome !== 'win' || dontPass.returned !== 20) { abweichungen.push(`Summe ${sum}: dont-pass=${dontPass.outcome}/${dontPass.returned}, erwartet win/20`); }
		} else if (sum === 12) {
			if (pass.outcome !== 'loss') { abweichungen.push(`Summe 12: pass=${pass.outcome}, erwartet loss`); }
			if (dontPass.outcome !== 'push' || dontPass.returned !== 10) { abweichungen.push(`Summe 12: dont-pass=${dontPass.outcome}/${dontPass.returned}, erwartet push/10 (Bar 12)`); }
		} else {
			if (pass.outcome !== 'stay' || dontPass.outcome !== 'stay') { abweichungen.push(`Summe ${sum}: pass=${pass.outcome}, dont-pass=${dontPass.outcome}, erwartet beide stay`); }
			if (ergebnis.event !== 'point-set' || ergebnis.point !== sum) { abweichungen.push(`Summe ${sum}: event=${ergebnis.event}/point=${ergebnis.point}, erwartet point-set/${sum}`); }
		}
	}
	check(abweichungen.length === 0, 'alle 36 Paare stimmen mit den Come-out-Regeln überein', ...abweichungen);

	console.log('     Gegenprobe W-2-G: vertauschtes 2/12-Verhalten weicht vom tatsächlichen ab');
	wagers.restore({ point: null });
	const summe2 = wagers.resolve({ sum: 2, faces: [1, 1], stakes: { 'dont-pass': 10 } });
	const dontPassBei2 = urteilVon(summe2, 'dont-pass');
	check(dontPassBei2.outcome === 'win', 'W-2-G: bei Summe 2 gewinnt dont-pass tatsächlich (nicht push, wie ein vertauschtes Verhalten behaupten würde)');
}

/* ================================= W-3 Der Point wird zur Vertragswette */

console.log('\nW-3  Der Point wird zur Vertragswette: contracts() nennt NUR pass, nicht dont-pass');
{
	wagers.restore({ point: null });
	const vorPoint = wagers.contracts({ pass: 20, 'dont-pass': 15 });
	check(vorPoint.length === 0, 'vor dem Point liefert contracts() nichts', `gefunden: ${JSON.stringify(vorPoint)}`);

	const ergebnis = wagers.resolve({ sum: 6, faces: [3, 3], stakes: { pass: 20, 'dont-pass': 15 } });
	check(ergebnis.event === 'point-set' && ergebnis.point === 6, 'der Point 6 steht nach diesem Wurf');

	const nachPoint = wagers.contracts({ pass: 20, 'dont-pass': 15 });
	check(
		nachPoint.length === 1 && nachPoint[0][0] === 'pass' && nachPoint[0][1] === 20,
		'nach point-set liefert contracts() genau ["pass", 20] und NICHT dont-pass',
		`gefunden: ${JSON.stringify(nachPoint)}`,
	);

	console.log('     Gegenprobe W-3-G: Point 0 (niemals ein echter Point) bleibt trotzdem über !== null erkannt');
	const wagersKopie = new CrapsWagers({ ratioFor, oddsMax, payout });
	wagersKopie.restore({ point: 0 });
	const mitPointNull = wagersKopie.contracts({ pass: 5 });
	check(
		mitPointNull.length === 1 && mitPointNull[0][0] === 'pass',
		'W-3-G: contracts() prüft ausdrücklich "!== null", nicht auf Wahrheitswert — Point 0 zählt als stehender Point',
	);
}

/* ============================================== W-4 Point-Phase */

console.log('\nW-4  Point-Phase: Point macht Pass, Sieben verliert (seven-out), sonst bleibt liegen');
{
	const abweichungen = [];
	for (const p of POINTS) {
		for (const { sum, faces } of WUERFE) {
			wagers.restore({ point: p });
			const ergebnis = wagers.resolve({ sum, faces, stakes: { pass: 10 } });
			const pass = urteilVon(ergebnis, 'pass');
			if (sum === p) {
				if (pass.outcome !== 'win' || ergebnis.point !== null || ergebnis.event !== 'point-made') {
					abweichungen.push(`Point ${p}, Summe ${sum}: pass=${pass.outcome}, point=${ergebnis.point}, event=${ergebnis.event}, erwartet win/null/point-made`);
				}
			} else if (sum === 7) {
				if (pass.outcome !== 'loss' || ergebnis.event !== 'seven-out') {
					abweichungen.push(`Point ${p}, Summe 7: pass=${pass.outcome}, event=${ergebnis.event}, erwartet loss/seven-out`);
				}
			} else {
				if (pass.outcome !== 'stay' || ergebnis.point !== p) {
					abweichungen.push(`Point ${p}, Summe ${sum}: pass=${pass.outcome}, point=${ergebnis.point}, erwartet stay/${p}`);
				}
			}
		}
	}
	check(abweichungen.length === 0, 'für alle sechs Points und alle 36 Paare stimmt die Point-Phase', ...abweichungen);
}

/* ==================================================== W-5 Come wandert */

console.log('\nW-5  Come wandert auf seine Zahl und gewinnt/verliert wie eine Linie');
{
	// Wurf 9: genau ein move von come nach come-9, cleared enthält come NICHT
	wagers.restore({ point: 6 });
	const wurf9 = wagers.resolve({ sum: 9, faces: [4, 5], stakes: { come: 10 } });
	const come9 = urteilVon(wurf9, 'come');
	check(come9.outcome === 'move' && come9.movedTo === 'come-9', `Wurf 9 im Point 6: come wandert nach come-9 (gefunden: ${come9.outcome}/${come9.movedTo})`);
	check(wurf9.moves.length === 1 && wurf9.moves[0].from === 'come' && wurf9.moves[0].to === 'come-9', 'genau ein move-Eintrag von come nach come-9');
	check(!wurf9.cleared.includes('come'), 'cleared enthält "come" NICHT (die Chips bleiben liegen, sie werden nur umgehängt)');

	// Wurf 7: come (noch nicht gewandert) gewinnt, UND pass verliert im selben Wurf
	wagers.restore({ point: 6 });
	const wurf7 = wagers.resolve({ sum: 7, faces: [3, 4], stakes: { pass: 20, come: 10 } });
	check(urteilVon(wurf7, 'come').outcome === 'win', 'Wurf 7 im Point 6: come (noch auf dem Feld "come") gewinnt');
	check(urteilVon(wurf7, 'pass').outcome === 'loss', 'im selben Wurf verliert pass (seven-out)');

	// Wurf 3: come verliert
	wagers.restore({ point: 6 });
	const wurf3 = wagers.resolve({ sum: 3, faces: [1, 2], stakes: { come: 10 } });
	check(urteilVon(wurf3, 'come').outcome === 'loss', 'Wurf 3 im Point 6: come verliert');

	// Danach: come-9 gewinnt 1:1
	wagers.restore({ point: 6 });
	const wurfAufCome9 = wagers.resolve({ sum: 9, faces: [6, 3], stakes: { 'come-9': 10 } });
	const urteilCome9 = urteilVon(wurfAufCome9, 'come-9');
	check(urteilCome9.outcome === 'win' && urteilCome9.payout === 10, `come-9 gewinnt 1:1 auf die 9 (gefunden: ${urteilCome9.outcome}/${urteilCome9.payout})`);

	console.log('     Gegenprobe W-5-G: eine falsch gebildete Kennung ("come-09") wird von derselben Prüfung erkannt');
	check(come9.movedTo !== 'come-09', 'W-5-G: das tatsächliche Ziel "come-9" ist NICHT die falsch gepolsterte Kennung "come-09"');
}

/* ============================================ W-6 Don't Come spiegelbildlich */

console.log("\nW-6  Don't Come spiegelbildlich, mit Patt bei der 12 und Gewinn bei der 7 auf der gewanderten Zahl");
{
	wagers.restore({ point: 6 });
	const beiSieben = wagers.resolve({ sum: 7, faces: [3, 4], stakes: { 'dont-come': 10 } });
	check(urteilVon(beiSieben, 'dont-come').outcome === 'loss', 'Don\'t Come verliert bei der 7 (solange noch nicht gewandert)');

	wagers.restore({ point: 6 });
	const beiZwei = wagers.resolve({ sum: 2, faces: [1, 1], stakes: { 'dont-come': 10 } });
	check(urteilVon(beiZwei, 'dont-come').outcome === 'win', 'Don\'t Come gewinnt bei der 2');

	wagers.restore({ point: 6 });
	const beiDrei = wagers.resolve({ sum: 3, faces: [1, 2], stakes: { 'dont-come': 10 } });
	check(urteilVon(beiDrei, 'dont-come').outcome === 'win', 'Don\'t Come gewinnt bei der 3');

	wagers.restore({ point: 6 });
	const beiZwoelf = wagers.resolve({ sum: 12, faces: [6, 6], stakes: { 'dont-come': 10 } });
	const urteilZwoelf = urteilVon(beiZwoelf, 'dont-come');
	check(urteilZwoelf.outcome === 'push' && urteilZwoelf.returned === 10, `Don't Come bei der 12: Patt, Einsatz zurück (gefunden: ${urteilZwoelf.outcome}/${urteilZwoelf.returned})`);

	wagers.restore({ point: 6 });
	const wandertNach5 = wagers.resolve({ sum: 5, faces: [2, 3], stakes: { 'dont-come': 10 } });
	const urteilWandert = urteilVon(wandertNach5, 'dont-come');
	check(urteilWandert.outcome === 'move' && urteilWandert.movedTo === 'dont-come-5', `Don't Come wandert auf eine Punktzahl (gefunden: ${urteilWandert.outcome}/${urteilWandert.movedTo})`);

	wagers.restore({ point: 6 });
	const gewandertGewinntBeiSieben = wagers.resolve({ sum: 7, faces: [3, 4], stakes: { 'dont-come-5': 10 } });
	const urteilGewandert = urteilVon(gewandertGewinntBeiSieben, 'dont-come-5');
	check(urteilGewandert.outcome === 'win' && urteilGewandert.payout === 10, `dont-come-5 gewinnt bei der 7 (gefunden: ${urteilGewandert.outcome}/${urteilGewandert.payout})`);

	wagers.restore({ point: 6 });
	const gewandertVerliertAufZahl = wagers.resolve({ sum: 5, faces: [2, 3], stakes: { 'dont-come-5': 10 } });
	check(urteilVon(gewandertVerliertAufZahl, 'dont-come-5').outcome === 'loss', 'dont-come-5 verliert, sobald die 5 selbst fällt');
}

/* ======================================= W-7 Odds folgen ihrer Grundwette */

console.log('\nW-7  Odds folgen ihrer Grundwette und nie allein — hell wie dunkel, an der Linie und an einer Come-Zahl');
{
	const abweichungen = [];
	for (const p of POINTS) {
		for (const { sum, faces } of WUERFE) {
			wagers.restore({ point: p });
			const stakes = {
				pass: 10, 'pass-odds': 20, 'dont-pass': 10, 'dont-pass-odds': 20,
				[`come-${p}`]: 10, [`come-odds-${p}`]: 20, [`dont-come-${p}`]: 10, [`dont-come-odds-${p}`]: 20,
			};
			const ergebnis = wagers.resolve({ sum, faces, stakes });

			const passU = urteilVon(ergebnis, 'pass');
			const passOddsU = urteilVon(ergebnis, 'pass-odds');
			if (passU.outcome !== passOddsU.outcome) {
				abweichungen.push(`Point ${p}, Summe ${sum}: pass=${passU.outcome} aber pass-odds=${passOddsU.outcome} (müssen gleich sein)`);
			} else if (passU.outcome === 'win' && passOddsU.payout !== payout(20, RATIO.oddsLight[p])) {
				abweichungen.push(`Point ${p}: pass-odds zahlt ${passOddsU.payout}, erwartet ${payout(20, RATIO.oddsLight[p])} (2:1/3:2/6:5 aus Anhang H)`);
			}

			const dontPassU = urteilVon(ergebnis, 'dont-pass');
			const dontPassOddsU = urteilVon(ergebnis, 'dont-pass-odds');
			if (dontPassU.outcome !== dontPassOddsU.outcome) {
				abweichungen.push(`Point ${p}, Summe ${sum}: dont-pass=${dontPassU.outcome} aber dont-pass-odds=${dontPassOddsU.outcome} (müssen gleich sein)`);
			} else if (dontPassU.outcome === 'win' && dontPassOddsU.payout !== payout(20, RATIO.oddsDark[p])) {
				abweichungen.push(`Point ${p}: dont-pass-odds zahlt ${dontPassOddsU.payout}, erwartet ${payout(20, RATIO.oddsDark[p])} (1:2/2:3/5:6 aus Anhang H)`);
			}

			const comeNU = urteilVon(ergebnis, `come-${p}`);
			const comeOddsU = urteilVon(ergebnis, `come-odds-${p}`);
			if (comeNU.outcome !== comeOddsU.outcome) {
				abweichungen.push(`Point ${p}, Summe ${sum}: come-${p}=${comeNU.outcome} aber come-odds-${p}=${comeOddsU.outcome} (müssen gleich sein)`);
			}

			const dontComeNU = urteilVon(ergebnis, `dont-come-${p}`);
			const dontComeOddsU = urteilVon(ergebnis, `dont-come-odds-${p}`);
			if (dontComeNU.outcome !== dontComeOddsU.outcome) {
				abweichungen.push(`Point ${p}, Summe ${sum}: dont-come-${p}=${dontComeNU.outcome} aber dont-come-odds-${p}=${dontComeOddsU.outcome} (müssen gleich sein)`);
			}
		}
	}
	check(abweichungen.length === 0, 'Odds gewinnen und verlieren in jedem der 6×36 Fälle genau dann, wenn ihre Grundwette es tut, mit der Quote aus Anhang H', ...abweichungen);

	console.log('     Gegenprobe W-7-G: Pass-Odds mit der Linienquote 1:1 statt 2:1 bei Point 4 zahlt zu wenig');
	const falscheZahlung = payout(20, RATIO.line);
	const richtigeZahlung = payout(20, RATIO.oddsLight[4]);
	check(falscheZahlung !== richtigeZahlung, `W-7-G: 1:1 (${falscheZahlung}) weicht von der tatsächlichen Quote 2:1 (${richtigeZahlung}) ab`);
}

/* =============================================== W-8 Place-Wetten */

console.log('\nW-8  Place-Wetten ruhen beim Come-out, sind im Point über placeWorking schaltbar');
{
	const abweichungen = [];
	for (const n of POINTS) {
		// Come-out: immer stay, unabhängig vom Schalter.
		for (const arbeitet of [true, false]) {
			for (const { sum, faces } of WUERFE) {
				wagers.restore({ point: null });
				const ergebnis = wagers.resolve({ sum, faces, stakes: { [`place-${n}`]: 30 }, placeWorking: arbeitet });
				if (urteilVon(ergebnis, `place-${n}`).outcome !== 'stay') {
					abweichungen.push(`place-${n} im Come-out (placeWorking=${arbeitet}), Summe ${sum}: erwartet stay`);
				}
			}
		}
		// Im Point, placeWorking true: Zahl gewinnt, 7 verliert, sonst stay.
		for (const { sum, faces } of WUERFE) {
			wagers.restore({ point: 4 === n ? 6 : 4 }); // ein beliebiger stehender Point, unabhängig von n
			const ergebnis = wagers.resolve({ sum, faces, stakes: { [`place-${n}`]: 30 }, placeWorking: true });
			const u = urteilVon(ergebnis, `place-${n}`);
			if (sum === n) {
				if (u.outcome !== 'win' || u.payout !== payout(30, RATIO.place[n])) {
					abweichungen.push(`place-${n} arbeitend, Summe ${sum}: ${u.outcome}/${u.payout}, erwartet win/${payout(30, RATIO.place[n])}`);
				}
			} else if (sum === 7) {
				if (u.outcome !== 'loss') { abweichungen.push(`place-${n} arbeitend, Summe 7: ${u.outcome}, erwartet loss`); }
			} else if (u.outcome !== 'stay') {
				abweichungen.push(`place-${n} arbeitend, Summe ${sum}: ${u.outcome}, erwartet stay`);
			}
		}
		// Im Point, placeWorking false: immer stay, auch bei der 7.
		wagers.restore({ point: 6 });
		const beiSiebenAus = wagers.resolve({ sum: 7, faces: [3, 4], stakes: { [`place-${n}`]: 30 }, placeWorking: false });
		if (urteilVon(beiSiebenAus, `place-${n}`).outcome !== 'stay') {
			abweichungen.push(`place-${n} abgeschaltet, Summe 7: erwartet stay (die Wette darf nicht verlieren, solange sie ruht)`);
		}
	}
	check(abweichungen.length === 0, 'Place-Wetten ruhen beim Come-out immer und folgen im Point genau dem Schalter placeWorking', ...abweichungen);

	console.log('     Gegenprobe W-8-G: eine Abrechnung beim Come-out würde place-6 auf der 6 gewinnen lassen — das tatsächliche Urteil ist stay');
	wagers.restore({ point: null });
	const gegenprobe = wagers.resolve({ sum: 6, faces: [3, 3], stakes: { 'place-6': 30 } });
	check(urteilVon(gegenprobe, 'place-6').outcome === 'stay', 'W-8-G: place-6 bleibt beim Come-out auf der 6 liegen, statt abzurechnen');
}

/* =========================================================== W-9 Field */

console.log('\nW-9  Field löst sich in jedem Wurf auf, mit den drei Quoten aus Anhang H');
{
	const abweichungen = [];
	const GEWINNSUMMEN = { 2: RATIO.fieldTwo, 3: RATIO.fieldPlain, 4: RATIO.fieldPlain, 9: RATIO.fieldPlain, 10: RATIO.fieldPlain, 11: RATIO.fieldPlain, 12: RATIO.fieldTwelve };
	for (const { sum, faces } of WUERFE) {
		wagers.restore({ point: null });
		const ergebnis = wagers.resolve({ sum, faces, stakes: { field: 10 } });
		const u = urteilVon(ergebnis, 'field');
		if (GEWINNSUMMEN[sum]) {
			const erwarteterGewinn = payout(10, GEWINNSUMMEN[sum]);
			if (u.outcome !== 'win' || u.payout !== erwarteterGewinn) {
				abweichungen.push(`field bei Summe ${sum}: ${u.outcome}/${u.payout}, erwartet win/${erwarteterGewinn}`);
			}
		} else if (u.outcome !== 'loss') {
			abweichungen.push(`field bei Summe ${sum}: ${u.outcome}, erwartet loss`);
		}
		if (u.outcome === 'stay') { abweichungen.push(`field bei Summe ${sum}: 'stay' ist bei Field nicht erlaubt`); }
	}
	check(abweichungen.length === 0, 'Field zahlt 2:1 bei 2, 3:1 bei 12, 1:1 bei 3/4/9/10/11, verliert sonst, und bleibt nie liegen', ...abweichungen);

	console.log('     Gegenprobe W-9-G: eine Kopie, die die 5 gewinnen lässt, weicht vom tatsächlichen Urteil ab');
	wagers.restore({ point: null });
	const beiFuenf = wagers.resolve({ sum: 5, faces: [2, 3], stakes: { field: 10 } });
	check(urteilVon(beiFuenf, 'field').outcome === 'loss', 'W-9-G: field verliert bei der 5 tatsächlich — eine Kopie, die sie gewinnen ließe, würde hier auffallen');
}

/* ==================================================== W-10 Hardways */

console.log('\nW-10  Hardways über mehrere Würfe: Pasch gewinnt, die einfache Zahl und die 7 verlieren, sonst bleibt liegen');
{
	const abweichungen = [];
	for (const n of [4, 6, 8, 10]) {
		for (const { sum, faces, hart } of WUERFE) {
			wagers.restore({ point: 6 });
			const ergebnis = wagers.resolve({ sum, faces, stakes: { [`hard-${n}`]: 10 } });
			const u = urteilVon(ergebnis, `hard-${n}`);
			if (sum === n && hart) {
				if (u.outcome !== 'win' || u.payout !== payout(10, RATIO.hard[n])) {
					abweichungen.push(`hard-${n} bei Pasch ${faces}: ${u.outcome}/${u.payout}, erwartet win/${payout(10, RATIO.hard[n])}`);
				}
			} else if (sum === n || sum === 7) {
				if (u.outcome !== 'loss') { abweichungen.push(`hard-${n} bei ${faces} (Summe ${sum}): ${u.outcome}, erwartet loss`); }
			} else if (u.outcome !== 'stay') {
				abweichungen.push(`hard-${n} bei ${faces} (Summe ${sum}): ${u.outcome}, erwartet stay`);
			}
		}
	}
	check(abweichungen.length === 0, 'Hard 4/6/8/10 gewinnen nur auf dem Pasch, verlieren auf der einfachen Zahl und der 7, bleiben sonst liegen', ...abweichungen);

	console.log('     Gegenprobe W-10-G: 4+2 (Summe 6, kein Pasch) gewinnt tatsächlich nicht');
	wagers.restore({ point: 6 });
	const leichteSechs = wagers.resolve({ sum: 6, faces: [4, 2], stakes: { 'hard-6': 10 } });
	check(urteilVon(leichteSechs, 'hard-6').outcome === 'loss', 'W-10-G: hard-6 verliert bei der leichten 6 (4+2) — eine Kopie, die sie gewinnen ließe, würde hier auffallen');
}

/* =============================================== W-11 Einmalwetten */

console.log('\nW-11  Die sieben Einmalwetten und Field lösen sich in JEDEM Wurf auf, nie als \'stay\'');
{
	const IDS = ['any-seven', 'any-craps', 'two', 'three', 'eleven', 'twelve', 'craps-eleven', 'field'];
	const abweichungen = [];
	for (const id of IDS) {
		for (const { sum, faces } of WUERFE) {
			wagers.restore({ point: null });
			const ergebnis = wagers.resolve({ sum, faces, stakes: { [id]: 10 } });
			const u = urteilVon(ergebnis, id);
			if (u.outcome !== 'win' && u.outcome !== 'loss') {
				abweichungen.push(`${id} bei Summe ${sum}: ${u.outcome}, erwartet win oder loss, nie stay`);
			}
		}
	}
	check(abweichungen.length === 0, 'über alle 36 Paare gibt es für keine der acht Einwurfwetten ein \'stay\'', ...abweichungen);
}

/* ==================================================== W-12 Erschöpfende Probe */

console.log('\nW-12  Erschöpfende Probe: alle 48 Felder gleichzeitig, 7 Zustände × 36 Paare = 12 096 Urteile');
{
	const ERLAUBTE_URTEILE = new Set(['win', 'loss', 'push', 'stay', 'move']);
	const alleFieldIds = betsModul.FIELDS.map((f) => f.id);
	const stakesAlle = Object.fromEntries(alleFieldIds.map((id) => [id, 1]));
	const ZUSTAENDE = [null, ...POINTS];

	let geprueft = 0;
	const abweichungen = [];
	for (const zustand of ZUSTAENDE) {
		for (const { sum, faces } of WUERFE) {
			wagers.restore({ point: zustand });
			const ergebnis = wagers.resolve({ sum, faces, stakes: stakesAlle });
			geprueft++;

			if (ergebnis.fields.length !== 48) {
				abweichungen.push(`Zustand ${zustand}, Summe ${sum}: ${ergebnis.fields.length} Urteile statt 48`);
				continue;
			}
			const gefundeneIds = new Set(ergebnis.fields.map((f) => f.fieldId));
			if (gefundeneIds.size !== 48) {
				abweichungen.push(`Zustand ${zustand}, Summe ${sum}: ${gefundeneIds.size} verschiedene Kennungen statt 48 (ein Feld hat mehr als ein Urteil bekommen)`);
			}
			for (const id of alleFieldIds) {
				if (!gefundeneIds.has(id)) { abweichungen.push(`Zustand ${zustand}, Summe ${sum}: "${id}" hat KEIN Urteil bekommen`); }
			}
			for (const f of ergebnis.fields) {
				if (!ERLAUBTE_URTEILE.has(f.outcome)) { abweichungen.push(`Zustand ${zustand}, Summe ${sum}, ${f.fieldId}: unbekanntes Urteil "${f.outcome}"`); }
			}
		}
	}
	check(geprueft === 7 * 36, `7 Zustände × 36 Paare = ${7 * 36} Würfe geprüft (gefunden: ${geprueft})`);
	check(abweichungen.length === 0, 'in allen 12 096 Fällen bekommt jedes der 48 Felder genau ein Urteil aus den fünf erlaubten Wörtern', ...abweichungen.slice(0, 20));

	console.log('     Gegenprobe W-12-G: ein aus der Feldliste entferntes Feld fällt als "ohne Urteil" auf');
	const stakesOhneField = { ...stakesAlle };
	delete stakesOhneField.field;
	wagers.restore({ point: null });
	const ohneField = wagers.resolve({ sum: 2, faces: [1, 1], stakes: stakesOhneField });
	check(!ohneField.fields.some((f) => f.fieldId === 'field'), 'W-12-G: ohne Einsatz auf "field" gibt es dafür auch kein Urteil — derselbe Vollständigkeitscheck würde das melden');
}

/* ==================================================== W-13 Bilanzprobe */

console.log('\nW-13  Bilanzprobe: total/payout stimmen mit der Summe der Einzelurteile, Geld entsteht nicht und verschwindet nicht');
{
	const alleFieldIds = betsModul.FIELDS.map((f) => f.id);
	const stakesAlle = Object.fromEntries(alleFieldIds.map((id) => [id, 6])); // 6, damit auch Place 6/8 glatt aufgeht
	const ZUSTAENDE = [null, ...POINTS];

	const abweichungen = [];
	for (const zustand of ZUSTAENDE) {
		for (const { sum, faces } of WUERFE) {
			wagers.restore({ point: zustand });
			const ergebnis = wagers.resolve({ sum, faces, stakes: stakesAlle });

			let total2 = 0;
			let payout2 = 0;
			for (const f of ergebnis.fields) {
				if (f.outcome === 'win' || f.outcome === 'loss' || f.outcome === 'push') {
					total2 += f.staked;
					payout2 += f.returned;
				}
				if (f.outcome === 'win' && f.returned !== f.staked + f.payout) {
					abweichungen.push(`${f.fieldId}: returned=${f.returned} ≠ staked(${f.staked})+payout(${f.payout})`);
				}
				if (f.outcome === 'loss' && f.returned !== 0) { abweichungen.push(`${f.fieldId}: loss mit returned=${f.returned}, erwartet 0`); }
				if (f.outcome === 'push' && f.returned !== f.staked) { abweichungen.push(`${f.fieldId}: push mit returned=${f.returned}, erwartet staked=${f.staked}`); }
				if ((f.outcome === 'stay' || f.outcome === 'move') && f.returned !== 0) { abweichungen.push(`${f.fieldId}: ${f.outcome} mit returned=${f.returned}, erwartet 0 (die Chips liegen noch)`); }
			}
			if (total2 !== ergebnis.total) { abweichungen.push(`Zustand ${zustand}, Summe ${sum}: total=${ergebnis.total}, selbst aufsummiert ${total2}`); }
			if (payout2 !== ergebnis.payout) { abweichungen.push(`Zustand ${zustand}, Summe ${sum}: payout=${ergebnis.payout}, selbst aufsummiert ${payout2}`); }
			if (ergebnis.payout > ergebnis.total + 100 * ergebnis.fields.length) {
				// Grobe, aber scharfe obere Schranke: keine Auszahlung kann das
				// Hundertfache jedes einzelnen Einsatzes je Feld überschreiten
				// (die höchste Quote im Haus ist 30:1, bei 6 € Einsatz also 180 €
				// Gewinn — weit unter 100 × 6 × 48). Ein Verstoß hieße, dass Geld
				// aus dem Nichts entstanden ist.
				abweichungen.push(`Zustand ${zustand}, Summe ${sum}: payout ${ergebnis.payout} überschreitet die grobe obere Schranke — Geld aus dem Nichts?`);
			}
		}
	}
	check(abweichungen.length === 0, 'in allen 12 096 Fällen ist die Bilanz exakt: total/payout stimmen mit den Einzelurteilen, kein Geld entsteht oder verschwindet', ...abweichungen.slice(0, 20));

	console.log('     Gegenprobe W-13-G: returned=0 bei einem push verletzt die Gleichung push→returned===staked');
	const verfaelschtesUrteil = { fieldId: 'dont-pass', staked: 10, outcome: 'push', payout: 0, returned: 0, movedTo: null };
	check(verfaelschtesUrteil.returned !== verfaelschtesUrteil.staked, 'W-13-G: returned=0 bei push weicht von staked=10 ab — genau das würde dieselbe Prüfung melden');
}

/* ==================================================== W-14 mayPlace() */

console.log('\nW-14  mayPlace() erteilt jede der sechs Absagen genau dort, wo sie hingehört, mit Gegenprobe je Absage');
{
	const abweichungen = [];

	// contract: Pass/Don't Pass im Point.
	wagers.restore({ point: 6 });
	for (const id of ['pass', 'dont-pass']) {
		const r = wagers.mayPlace(id, 10, {});
		if (r.ok !== false || r.reason !== 'contract') { abweichungen.push(`${id} im Point: erwartet {ok:false, reason:'contract'}, gefunden ${JSON.stringify(r)}`); }
	}
	wagers.restore({ point: null });
	for (const id of ['pass', 'dont-pass']) {
		const erlaubt = wagers.mayPlace(id, 10, {});
		if (erlaubt.ok !== true) { abweichungen.push(`Gegenprobe contract: ${id} beim Come-out sollte erlaubt sein, gefunden ${JSON.stringify(erlaubt)}`); }
	}

	// comeout: Come/Don't Come ohne Point.
	wagers.restore({ point: null });
	for (const id of ['come', 'dont-come']) {
		const r = wagers.mayPlace(id, 10, {});
		if (r.ok !== false || r.reason !== 'comeout') { abweichungen.push(`${id} beim Come-out: erwartet {ok:false, reason:'comeout'}, gefunden ${JSON.stringify(r)}`); }
	}
	wagers.restore({ point: 6 });
	for (const id of ['come', 'dont-come']) {
		const erlaubt = wagers.mayPlace(id, 10, {});
		if (erlaubt.ok !== true) { abweichungen.push(`Gegenprobe comeout: ${id} im Point sollte erlaubt sein, gefunden ${JSON.stringify(erlaubt)}`); }
	}

	// traveled: jeder der 12 Zahlenkästen, immer.
	wagers.restore({ point: 6 });
	for (const n of POINTS) {
		for (const id of [`come-${n}`, `dont-come-${n}`]) {
			const r = wagers.mayPlace(id, 10, {});
			if (r.ok !== false || r.reason !== 'traveled') { abweichungen.push(`${id}: erwartet {ok:false, reason:'traveled'}, gefunden ${JSON.stringify(r)}`); }
		}
	}

	// nopoint: Linien-Odds ohne Point.
	wagers.restore({ point: null });
	for (const id of ['pass-odds', 'dont-pass-odds']) {
		const r = wagers.mayPlace(id, 10, { pass: 50, 'dont-pass': 50 });
		if (r.ok !== false || r.reason !== 'nopoint') { abweichungen.push(`${id} ohne Point: erwartet {ok:false, reason:'nopoint'}, gefunden ${JSON.stringify(r)}`); }
	}
	wagers.restore({ point: 6 });
	for (const id of ['pass-odds', 'dont-pass-odds']) {
		const basis = id === 'pass-odds' ? 'pass' : 'dont-pass';
		const erlaubt = wagers.mayPlace(id, 10, { [basis]: 50 });
		if (erlaubt.ok !== true) { abweichungen.push(`Gegenprobe nopoint: ${id} mit Point und Grundwette sollte erlaubt sein, gefunden ${JSON.stringify(erlaubt)}`); }
	}

	// nobase: Odds ohne Grundwette, alle 14 Fälle.
	wagers.restore({ point: 6 });
	const NOBASE_FAELLE = [
		['pass-odds', {}],
		['dont-pass-odds', {}],
		...POINTS.map((n) => [`come-odds-${n}`, {}]),
		...POINTS.map((n) => [`dont-come-odds-${n}`, {}]),
	];
	check(NOBASE_FAELLE.length === 14, `14 nobase-Fälle vorgesehen (gefunden: ${NOBASE_FAELLE.length})`);
	for (const [id, stakes] of NOBASE_FAELLE) {
		const r = wagers.mayPlace(id, 10, stakes);
		if (r.ok !== false || r.reason !== 'nobase') { abweichungen.push(`${id} ohne Grundwette: erwartet {ok:false, reason:'nobase'}, gefunden ${JSON.stringify(r)}`); }
	}
	{
		const erlaubtPass = wagers.mayPlace('pass-odds', 10, { pass: 50 });
		if (erlaubtPass.ok !== true) { abweichungen.push(`Gegenprobe nobase: pass-odds MIT pass=50 sollte erlaubt sein, gefunden ${JSON.stringify(erlaubtPass)}`); }
		const erlaubtComeOdds = wagers.mayPlace('come-odds-6', 10, { 'come-6': 50 });
		if (erlaubtComeOdds.ok !== true) { abweichungen.push(`Gegenprobe nobase: come-odds-6 MIT come-6=50 sollte erlaubt sein, gefunden ${JSON.stringify(erlaubtComeOdds)}`); }
	}

	// oddsmax: ein Cent (1 €) über der Staffel.
	wagers.restore({ point: 4 });
	const grenze4 = oddsMax(4, 100, false);
	const zuViel = wagers.mayPlace('pass-odds', 1, { pass: 100, 'pass-odds': grenze4 });
	if (zuViel.ok !== false || zuViel.reason !== 'oddsmax' || zuViel.limit !== grenze4) {
		abweichungen.push(`pass-odds einen Euro über der Staffel: erwartet {ok:false, reason:'oddsmax', limit:${grenze4}}, gefunden ${JSON.stringify(zuViel)}`);
	}
	const genauAmLimit = wagers.mayPlace('pass-odds', 1, { pass: 100, 'pass-odds': grenze4 - 1 });
	if (genauAmLimit.ok !== true) { abweichungen.push(`Gegenprobe oddsmax: genau am Limit sollte erlaubt sein, gefunden ${JSON.stringify(genauAmLimit)}`); }

	// unit-Hinweis: erscheint genau dann, wenn der neue Einsatz kein Vielfaches des Nenners ist.
	wagers.restore({ point: 6 });
	const mitHinweis = wagers.mayPlace('place-6', 2, { 'place-6': 5 }); // 5+2=7, kein Vielfaches von 6
	if (mitHinweis.ok !== true || mitHinweis.hint !== 'unit' || mitHinweis.unit !== 6) {
		abweichungen.push(`place-6 auf 7 €: erwartet {ok:true, hint:'unit', unit:6}, gefunden ${JSON.stringify(mitHinweis)}`);
	}
	const ohneHinweis = wagers.mayPlace('place-6', 1, { 'place-6': 5 }); // 5+1=6, Vielfaches von 6
	if (ohneHinweis.ok !== true || ohneHinweis.hint !== undefined) {
		abweichungen.push(`place-6 auf 6 €: erwartet {ok:true} ohne hint, gefunden ${JSON.stringify(ohneHinweis)}`);
	}

	check(abweichungen.length === 0,
		'contract, comeout, traveled, nopoint, nobase, oddsmax erscheinen genau dort, wo sie hingehören, und der erlaubte Gegenfall gelingt jeweils; der unit-Hinweis erscheint genau bei einem Einsatz, der kein Vielfaches der Einheit ist',
		...abweichungen);
}

/* ============================================================ BigInt-Bruchrechnung (W-15) */

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

function plus(a, b) {
	return kuerze(a.n * b.d + b.n * a.d, a.d * b.d);
}

/** Ein Bruch geteilt durch eine ganze Zahl. */
function durch(a, n) {
	return kuerze(a.n, a.d * BigInt(n));
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

/**
 * Erwartungswert je Einheit Einsatz eines Feldes, das in JEDEM Wurf entweder
 * gewinnt, verliert oder (Selbstschleife im selben Zustand) liegen bleibt —
 * berechnet NICHT aus einer Formel, sondern aus den tatsächlichen Urteilen
 * von CrapsWagers.resolve() für alle 36 Würfelpaare.
 *
 * Gilt für: Odds (an einem festen Point), Come-/Don't-Come-Zahlenkästen,
 * Place-Wetten, Hardways, Field und die sieben Einmalwetten (bei Letzteren
 * gibt es kein 'stay', jeder Wurf löst auf).
 *
 * @param {string} fieldId
 * @param {number} stakeUnit  so gewählt, dass Math.floor beim Runden nicht
 *        eingreift — immer der Nenner der zugehörigen Quote
 * @param {?number} restorePoint der Point, mit dem VOR jedem der 36 Würfe
 *        zurückgesetzt wird (null = Come-out, für Felder, die vorher nicht
 *        prüfen, ist der Wert beliebig, solange er der Aufgabe entspricht)
 * @returns {{n: bigint, d: bigint}}
 */
function evAbsorbierendesFeld(fieldId, stakeUnit, restorePoint) {
	let summeGewinn = bruch(0);
	let wegeGewinn = 0;
	let wegeVerlust = 0;
	for (const { sum, faces } of WUERFE) {
		wagers.restore({ point: restorePoint });
		const ergebnis = wagers.resolve({ sum, faces, stakes: { [fieldId]: stakeUnit } });
		const eintrag = urteilVon(ergebnis, fieldId);
		if (eintrag.outcome === 'win') {
			summeGewinn = plus(summeGewinn, bruch(eintrag.payout, stakeUnit));
			wegeGewinn++;
		} else if (eintrag.outcome === 'loss') {
			wegeVerlust++;
		} else if (eintrag.outcome !== 'stay') {
			throw new Error(`evAbsorbierendesFeld(${fieldId}): unerwartetes Urteil "${eintrag.outcome}" — diese Funktion gilt nur für Felder ohne push/move`);
		}
	}
	const wege = wegeGewinn + wegeVerlust;
	if (wege === 0) {
		throw new Error(`evAbsorbierendesFeld(${fieldId}): kein einziger der 36 Würfe löst auf`);
	}
	// EV = (wegeGewinn·gewinnBruch − wegeVerlust·1) / (wegeGewinn+wegeVerlust);
	// summeGewinn ist bereits Σ der einzelnen Gewinnbrüche über wegeGewinn Würfe.
	return durch(plus(summeGewinn, bruch(-wegeVerlust)), wege);
}

/**
 * Erwartungswert von Pass/Don't Pass ab dem Come-out: löst zuerst die sechs
 * Point-Erwartungswerte über evAbsorbierendesFeld(), dann die Come-out-Kette,
 * die bei 'stay' (= ein neuer Point steht) auf den passenden Folgewert
 * übergeht — ergebnis.point verrät, welcher.
 * @param {'pass'|'dont-pass'} fieldId
 * @returns {{n: bigint, d: bigint}}
 */
function evLinieAmZustandswerk(fieldId) {
	const folgewerteProPoint = new Map();
	for (const p of POINTS) {
		folgewerteProPoint.set(p, evAbsorbierendesFeld(fieldId, 1, p));
	}
	let summe = bruch(0);
	for (const { sum, faces } of WUERFE) {
		wagers.restore({ point: null });
		const ergebnis = wagers.resolve({ sum, faces, stakes: { [fieldId]: 1 } });
		const eintrag = urteilVon(ergebnis, fieldId);
		let beitrag;
		if (eintrag.outcome === 'win') { beitrag = bruch(eintrag.payout, 1); }
		else if (eintrag.outcome === 'loss') { beitrag = bruch(-1, 1); }
		else if (eintrag.outcome === 'push') { beitrag = bruch(0, 1); }
		else if (eintrag.outcome === 'stay') {
			if (ergebnis.point === null || !folgewerteProPoint.has(ergebnis.point)) {
				throw new Error(`evLinieAmZustandswerk(${fieldId}): kein bekannter Folgewert für Point ${ergebnis.point}`);
			}
			beitrag = folgewerteProPoint.get(ergebnis.point);
		} else {
			throw new Error(`evLinieAmZustandswerk(${fieldId}): unerwartetes Urteil "${eintrag.outcome}"`);
		}
		summe = plus(summe, beitrag);
	}
	return durch(summe, 36);
}

/**
 * Erwartungswert von Come/Don't Come: löst zuerst die sechs
 * Come-Zahl-Erwartungswerte (come-N bzw. dont-come-N), dann die erste
 * Auflösung, die bei 'move' auf den Folgewert der Zielkennung übergeht.
 * @param {'come'|'dont-come'} fieldId
 * @returns {{n: bigint, d: bigint}}
 */
function evComeAmZustandswerk(fieldId) {
	const praefix = fieldId === 'dont-come' ? 'dont-come-' : 'come-';
	const folgewerteProZiel = new Map();
	for (const n of POINTS) {
		const zielId = `${praefix}${n}`;
		folgewerteProZiel.set(zielId, evAbsorbierendesFeld(zielId, 1, 6));
	}
	let summe = bruch(0);
	for (const { sum, faces } of WUERFE) {
		// Ein beliebiger stehender Point (6): come/dont-come prüfen ihn nur auf
		// "!== null", nicht auf seinen Wert — siehe wagers-craps.js.
		wagers.restore({ point: 6 });
		const ergebnis = wagers.resolve({ sum, faces, stakes: { [fieldId]: 1 } });
		const eintrag = urteilVon(ergebnis, fieldId);
		let beitrag;
		if (eintrag.outcome === 'win') { beitrag = bruch(eintrag.payout, 1); }
		else if (eintrag.outcome === 'loss') { beitrag = bruch(-1, 1); }
		else if (eintrag.outcome === 'push') { beitrag = bruch(0, 1); } // Bar 12, nur bei dont-come
		else if (eintrag.outcome === 'move') {
			if (!folgewerteProZiel.has(eintrag.movedTo)) {
				throw new Error(`evComeAmZustandswerk(${fieldId}): kein bekannter Folgewert für Ziel "${eintrag.movedTo}"`);
			}
			beitrag = folgewerteProZiel.get(eintrag.movedTo);
		} else {
			throw new Error(`evComeAmZustandswerk(${fieldId}): unerwartetes Urteil "${eintrag.outcome}"`);
		}
		summe = plus(summe, beitrag);
	}
	return durch(summe, 36);
}

/* =============== W-15 Der Quotennachweis am echten Zustandswerk =============== */

console.log('\nW-15  Der Quotennachweis am echten Zustandswerk (dieselbe Tabelle wie B-9, hier aus resolve() selbst hergeleitet)');
{
	// Dieselbe wörtliche Erwartungstabelle aus Anhang H wie in verify-bets.mjs (B-9).
	const GRUPPEN = [
		{ name: 'Pass Line, Come', erwartet: bruch(-7, 495), prozent: 1.41, werte: [evLinieAmZustandswerk('pass'), evComeAmZustandswerk('come')] },
		{ name: "Don't Pass, Don't Come", erwartet: bruch(-3, 220), prozent: 1.36, werte: [evLinieAmZustandswerk('dont-pass'), evComeAmZustandswerk('dont-come')] },
		{ name: 'Place 4, Place 10', erwartet: bruch(-1, 15), prozent: 6.67, werte: [4, 10].map((n) => evAbsorbierendesFeld(`place-${n}`, RATIO.place[n].den, 6)) },
		{ name: 'Place 5, Place 9', erwartet: bruch(-1, 25), prozent: 4.00, werte: [5, 9].map((n) => evAbsorbierendesFeld(`place-${n}`, RATIO.place[n].den, 6)) },
		{ name: 'Place 6, Place 8', erwartet: bruch(-1, 66), prozent: 1.52, werte: [6, 8].map((n) => evAbsorbierendesFeld(`place-${n}`, RATIO.place[n].den, 6)) },
		{ name: 'Field', erwartet: bruch(-1, 36), prozent: 2.78, werte: [evAbsorbierendesFeld('field', 1, null)] },
		{ name: 'Hard 4, Hard 10', erwartet: bruch(-1, 9), prozent: 11.11, werte: [4, 10].map((n) => evAbsorbierendesFeld(`hard-${n}`, 1, 6)) },
		{ name: 'Hard 6, Hard 8', erwartet: bruch(-1, 11), prozent: 9.09, werte: [6, 8].map((n) => evAbsorbierendesFeld(`hard-${n}`, 1, 6)) },
		{ name: 'Any Seven', erwartet: bruch(-1, 6), prozent: 16.67, werte: [evAbsorbierendesFeld('any-seven', 1, null)] },
		{ name: 'Any Craps', erwartet: bruch(-1, 9), prozent: 11.11, werte: [evAbsorbierendesFeld('any-craps', 1, null)] },
		{ name: 'Die 2, Die 12', erwartet: bruch(-5, 36), prozent: 13.89, werte: [evAbsorbierendesFeld('two', 1, null), evAbsorbierendesFeld('twelve', 1, null)] },
		{ name: 'Die 3, Die 11', erwartet: bruch(-1, 9), prozent: 11.11, werte: [evAbsorbierendesFeld('three', 1, null), evAbsorbierendesFeld('eleven', 1, null)] },
		// Abgeleitet, wie in verify-bets.mjs (B-9): keine eigene Zeile aus
		// Anhang H, sondern dieselbe −1/9 wie Any Craps, hier am echten
		// Zustandswerk hergeleitet statt aus einer Formel.
		{ name: 'Craps & Eleven', erwartet: bruch(-1, 9), prozent: 11.11, werte: [evAbsorbierendesFeld('craps-eleven', 1, null)] },
	];

	const abweichungen = [];
	for (const gruppe of GRUPPEN) {
		for (const ev of gruppe.werte) {
			if (!gleich(ev, gruppe.erwartet)) {
				abweichungen.push(`${gruppe.name}: am Zustandswerk hergeleitet ${alsText(ev)}, erwartet ${alsText(gruppe.erwartet)}`);
			}
			const prozent = alsProzent(ev);
			if (prozent !== gruppe.prozent) {
				abweichungen.push(`${gruppe.name}: ${prozent} % weicht von Anhang H (${gruppe.prozent} %) ab`);
			}
		}
	}

	// Die Odds-Zeile: alle zwölf Odds-Erwartungswerte sind exakt 0, auch am
	// echten Zustandswerk — hell und dunkel, an der Linie und an einer Come-Zahl.
	for (const p of POINTS) {
		const passOdds = evAbsorbierendesFeld('pass-odds', RATIO.oddsLight[p].den, p);
		const dontPassOdds = evAbsorbierendesFeld('dont-pass-odds', RATIO.oddsDark[p].den, p);
		const comeOdds = evAbsorbierendesFeld(`come-odds-${p}`, RATIO.oddsLight[p].den, 6);
		const dontComeOdds = evAbsorbierendesFeld(`dont-come-odds-${p}`, RATIO.oddsDark[p].den, 6);
		for (const [name, wert] of [['pass-odds', passOdds], ['dont-pass-odds', dontPassOdds], [`come-odds-${p}`, comeOdds], [`dont-come-odds-${p}`, dontComeOdds]]) {
			if (!gleich(wert, bruch(0))) { abweichungen.push(`Odds ${name} bei Point ${p}: ${alsText(wert)}, erwartet 0/1`); }
		}
	}

	check(abweichungen.length === 0,
		'jede der 14 Zeilen (13 aus Anhang H plus die eine abgeleitete Craps & Eleven) stimmt mit dem am echten Zustandswerk hergeleiteten Erwartungswert überein, als Bruch UND als gerundeter Prozentwert',
		...abweichungen);

	console.log("     Gegenprobe W-15-G: Don't Pass, die bei der 12 verlöre statt Patt zu stehen, weicht von −3/220 ab");
	{
		// Dieselbe Come-out-Kette, aber mit der 12 als 'loss' statt 'push' — eine
		// im Skript selbst gerechnete Abweichung, nicht das echte Zustandswerk.
		const folgewerteProPoint = new Map();
		for (const p of POINTS) {
			folgewerteProPoint.set(p, evAbsorbierendesFeld('dont-pass', 1, p));
		}
		let summeVerfaelscht = bruch(0);
		for (const { sum, faces } of WUERFE) {
			wagers.restore({ point: null });
			const ergebnis = wagers.resolve({ sum, faces, stakes: { 'dont-pass': 1 } });
			const eintrag = urteilVon(ergebnis, 'dont-pass');
			let beitrag;
			if (sum === 12) {
				// Verfälschung: 12 als Verlust statt als Patt.
				beitrag = bruch(-1, 1);
			} else if (eintrag.outcome === 'win') { beitrag = bruch(eintrag.payout, 1); }
			else if (eintrag.outcome === 'loss') { beitrag = bruch(-1, 1); }
			else if (eintrag.outcome === 'stay') { beitrag = folgewerteProPoint.get(ergebnis.point); }
			else { beitrag = bruch(0, 1); }
			summeVerfaelscht = plus(summeVerfaelscht, beitrag);
		}
		const evVerfaelscht = durch(summeVerfaelscht, 36);
		check(!gleich(evVerfaelscht, bruch(-3, 220)), `W-15-G: die verfälschte Rechnung (12 verliert statt Patt) ergibt ${alsText(evVerfaelscht)}, nicht −3/220 — dieselbe Prüfung würde das erkennen`);
	}
}

/* ------------------------------------------------------------- Ergebnis */

if (fehler === 0) {
	console.log('\nERGEBNIS: alle Prüfungen bestanden. Come-out, Point und Seven-out laufen für alle'
		+ '\n36 Würfelpaare regelrecht, Come/Don\'t Come wandern korrekt auf ihre Zahl, Odds'
		+ '\nfolgen ihrer Grundwette ohne Ausnahme, Place-Wetten ruhen beim Come-out und sind'
		+ '\nim Point schaltbar, Hardways und Einmalwetten lösen sich zuverlässig auf, die'
		+ '\nerschöpfende Probe über 48 Felder × 7 Zustände × 36 Paare bleibt bilanzrein, und'
		+ '\nder Quotennachweis stimmt am ECHTEN Zustandswerk exakt mit Anhang H überein —'
		+ '\ndieselbe Tabelle wie B-9, hier aus CrapsWagers.resolve() selbst hergeleitet.');
} else {
	console.log(`\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);
}

process.exit(fehler === 0 ? 0 : 1);
