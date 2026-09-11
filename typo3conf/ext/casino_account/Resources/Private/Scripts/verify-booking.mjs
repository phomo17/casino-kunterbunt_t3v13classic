/**
 * Casino Kunterbunt – casino_account: Nachweis Buchungsendpunkt, statisch und
 * live (Umsetzungsstück D3a, PLAN-d3-guthaben.md)
 * ============================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node ab Version 18
 * (globales fetch), ohne jede npm-Abhängigkeit — dieselbe Bauart wie
 * verify-gate.mjs, das jüngste Skript des Hauses vor diesem hier.
 *
 * NUR UMSETZUNGSSTÜCK D3a WIRD HIER GEPRÜFT: die Serverseite. Der Browser
 * (account-backend.js, die austauschbare Rückseite von credit.js/
 * machine-credit.js, die Sperranzeige im Betrieb) kommt erst mit D3b/D3c —
 * bis dahin bedient sich der Endpunkt ausschließlich über `fetch` aus diesem
 * Skript, genau wie es ein künftiges Gerät später täte.
 *
 * DER SCHALTER WIRD GELESEN, NIE GESETZT (dieselbe Zusage wie in
 * verify-gate.mjs). B-6 bis B-14 laufen nur bei eingeschaltetem Modus, B-15
 * nur bei ausgeschaltetem — beide Zustände zusammen zeigt der Messlauf der
 * Hauptsitzung (Plan, Abschnitt 7.3), nicht ein einzelner Lauf dieses
 * Skripts.
 *
 * B-8 BIS B-13 VERÄNDERN ECHTE BETRÄGE ECHTER SPIELENDER (das Prüfkonto
 * `_d2check_`, admin, und einen aktiven Nicht-Admin für B-11). Das Skript
 * merkt sich den Ausgangsstand, bucht eine nachvollziehbare Folge und stellt
 * am Ende über `setzen` (Admin-Vorgang) exakt den Ausgangsstand wieder her —
 * und PRÜFT das, statt es nur zu behaupten. Gelingt die Wiederherstellung
 * nicht, meldet das Skript das laut mit dem konkreten Datensatz und dem
 * Rückgabewert 1 — ein Prüfstand, der Geld liegen lässt, ist selbst ein
 * Befund.
 *
 * Aufruf (Modus AUS oder AN, je nachdem, was gerade eingestellt ist):
 *
 *   ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-booking.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt, der
 * Wächterblock anschlägt, oder die Wiederherstellung des Ausgangsstands
 * fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan PLAN-d3-guthaben.md, Abschnitt 4.15)
 * -------------------------------------------------------------------------
 *   B-1  Wächter: Pflichtdateien da, kein NUL-Byte, Zusagen gezählt (kein
 *        eigener Haken — Riegel, keine Zusage)
 *   B-2  RequestMiddlewares.php meldet jetzt VIER Schichten unter 'frontend'
 *        an; 'booking' steht 'after' der Anmeldung und 'before' 'qr-gate'
 *        UND 'page-resolver'; jeder fremde Bezeichner existiert im Kern
 *   B-3  BookingEndpoint::process() beginnt mit der Schalterabfrage; in der
 *        ganzen Klasse steht kein Zugriff, der eine Spieler-Kennung aus der
 *        Anfrage liest (D.9)
 *   B-4  BookingService::rechnen() hat für jeden Vorgang aus ARTEN einen
 *        Zweig, NUR_ADMIN enthält genau aufladen/abbuchen/setzen, und kein
 *        Zweig kann einen Betrag unter 0 erzeugen (statische Durchrechnung
 *        aller Zweige mit Grenzwerten, gegen die aus der PHP-Datei gelesene
 *        Konstante MAX)
 *   B-5  ext_tables.sql und TCA sind deckungsgleich (booking_client, neue
 *        Tabelle), die Tabelle steht in der Datenbank mit genau diesen
 *        Spalten (SHOW COLUMNS)
 *   B-6  live: ohne Sitzung liefert /casino-konto/buchung 401 mit JSON,
 *        nicht die Torseite als HTML
 *   B-7  live: falsche Methode → 405, falscher Inhaltstyp → 415,
 *        unbrauchbarer Rumpf → 400
 *   B-8  live, mit echter Anmeldung: das Beispiel aus D.7.1 Schritt für
 *        Schritt — angebot 1, verdoppeln, verdoppeln, verloren — und nach
 *        jedem Schritt wird der Stand in der Datenbank nachgelesen:
 *        1 → 2 → 4 → 0, vier Schreibvorgänge
 *   B-9  live: dieselbe Buchung mit derselben Nummer noch einmal gesendet →
 *        doppelt:true, Beträge unverändert (Gegenprobe: ein anderer Kunde
 *        mit derselben Nummer wird NICHT als doppelt erkannt)
 *   B-10 live: ein Einwurf über den Kassenstand hinaus → ok:false,
 *        grund:'kasse_zu_gering', Rückgabewert 200, kein Betrag verändert;
 *        ein Einsatz über den Gerätekredit hinaus ebenso
 *   B-11 live: ein Nicht-Admin bekommt auf setzen/aufladen/abbuchen je
 *        ok:false, grund:'kein_admin', Beträge unverändert; ein Admin
 *        bekommt ok:true
 *   B-12 live: GET /casino-konto/stand liefert dieselben drei Zahlen wie die
 *        Datenbank, gesamt ist ihre Summe
 *   B-13 live: /casino-konto/feld nimmt einen Stand an, gibt ihn beim
 *        nächsten Seitenaufruf im Zustandsblock zurück, weist mehr als
 *        MAX_LAENGE ab und legt keine Buchungsnummer an
 *   B-14 live: eine ausgelieferte Seite enthält den Zustandsblock
 *        unmittelbar hinter <head…>, gültiges JSON, keine Kennung, kein
 *        Name; die Seite ist vollständig (</body>, </html>)
 *   B-15 live, Modus AUS: die drei Adressen liefern keine JSON-Antwort, und
 *        im HTML steht kein data-ca-state
 */

// @pruefstand modus=egal laufzeit=kurz
// (misst den Schalterstand selbst und hat für AUS und AN je eine eigene
//  Wächterzahl — ERWARTETE_ZUSAGEN / _AN. Läuft deshalb in BEIDEN Läufen.)

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/casino_account/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
/** Projektstamm */
const PROJEKT = path.resolve(EXT_ROOT, '../..');
/** typo3_src/ — der TYPO3-Kern dieser klassischen Installation */
const TYPO3_SRC = path.join(PROJEKT, 'typo3_src');

let fehler = 0;
let zusagen = 0;

function check(ok, text, ...zeilen) {
	zusagen++;
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

/** Entfernt PHP-Blockkommentare (/* … *\/). */
function ohneBlockKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Entfernt zusätzlich PHP-Zeilenkommentare (// …) — dieselbe Bauart wie verify-gate.mjs. */
function ohnePhpKommentare(inhalt) {
	return ohneBlockKommentare(inhalt).replace(/\/\/.*$/gm, '');
}

/**
 * Liefert den Rumpf einer Methode (den Text zwischen ihrer öffnenden und
 * ihrer passenden schließenden geschweiften Klammer) — dieselbe Bauart wie
 * methodenRumpf() in verify-gate.mjs/verify-auth.mjs.
 */
function methodenRumpf(quelle, name) {
	const kopf = new RegExp(`function\\s+${name}\\s*\\(`);
	const treffer = kopf.exec(quelle);
	if (!treffer) {
		return null;
	}
	let i = quelle.indexOf('(', treffer.index);
	let klammertiefe = 0;
	for (; i < quelle.length; i++) {
		if (quelle[i] === '(') klammertiefe++;
		else if (quelle[i] === ')') {
			klammertiefe--;
			if (klammertiefe === 0) {
				i++;
				break;
			}
		}
	}
	const auf = quelle.indexOf('{', i);
	if (auf === -1) {
		return null;
	}
	let geschweiftTiefe = 0;
	for (let j = auf; j < quelle.length; j++) {
		if (quelle[j] === '{') geschweiftTiefe++;
		else if (quelle[j] === '}') {
			geschweiftTiefe--;
			if (geschweiftTiefe === 0) {
				return quelle.slice(auf + 1, j);
			}
		}
	}
	return null;
}

const MIDDLEWARES_PFAD = path.join(EXT, 'Configuration/RequestMiddlewares.php');
const BOOKING_ENDPOINT_PFAD = path.join(EXT, 'Classes/Middleware/BookingEndpoint.php');
const BOOKING_SERVICE_PFAD = path.join(EXT, 'Classes/Service/BookingService.php');
const COINFIELD_REPOSITORY_PFAD = path.join(EXT, 'Classes/Domain/CoinFieldRepository.php');
const ACCOUNT_STATE_PFAD = path.join(EXT, 'Classes/Service/AccountState.php');
const EXT_TABLES_PFAD = path.join(EXT, 'ext_tables.sql');
const TCA_PLAYER_PFAD = path.join(EXT, 'Configuration/TCA/tx_casinoaccount_player.php');
const TCA_COINFIELD_PFAD = path.join(EXT, 'Configuration/TCA/tx_casinoaccount_coinfield.php');

const CORE_MIDDLEWARES_PFAD = path.join(TYPO3_SRC, 'typo3/sysext/frontend/Configuration/RequestMiddlewares.php');

console.log('\ncasino_account – Nachweis Buchungsendpunkt, statisch und live (Umsetzungsstück D3a)');
console.log('=====================================================================================\n');

/* ================================================ B-1 Wächter: kein stiller Ausstieg */

const PFLICHTDATEIEN = [
	['Configuration/RequestMiddlewares.php', MIDDLEWARES_PFAD],
	['Classes/Middleware/BookingEndpoint.php', BOOKING_ENDPOINT_PFAD],
	['Classes/Service/BookingService.php', BOOKING_SERVICE_PFAD],
	['Classes/Domain/CoinFieldRepository.php', COINFIELD_REPOSITORY_PFAD],
	['Classes/Service/AccountState.php', ACCOUNT_STATE_PFAD],
	['ext_tables.sql', EXT_TABLES_PFAD],
	['Configuration/TCA/tx_casinoaccount_player.php', TCA_PLAYER_PFAD],
	['Configuration/TCA/tx_casinoaccount_coinfield.php', TCA_COINFIELD_PFAD],
	['(Kern) typo3/sysext/frontend/Configuration/RequestMiddlewares.php', CORE_MIDDLEWARES_PFAD],
];

for (const [name, pfad] of PFLICHTDATEIEN) {
	if (!existsSync(pfad)) {
		console.log(`\nERGEBNIS: Abbruch — ${name} existiert nicht (${pfad}).`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
		process.exit(1);
	}
	if (readFileSync(pfad, 'utf8').includes('\0')) {
		console.log(`\nERGEBNIS: Abbruch — ${name} enthält ein NUL-Byte.`);
		process.exit(1);
	}
}

/**
 * GEMESSEN, nicht geschätzt (dieselbe Regel wie in verify-gate.mjs) — Lauf
 * vom 2026-09-10, Schalter über dbg-schalter.mjs umgelegt: AUS = 32, AN = 60.
 * Rückbauprobe gefahren: ein check()-Aufruf testweise entfernt (B-2, die
 * Vier-Einträge-Prüfung), Wächter schlug mit "59 Zusagen, 60 erwartet" an,
 * zurückgebaut, wieder grün.
 */
const ERWARTETE_ZUSAGEN = 32;
const ERWARTETE_ZUSAGEN_AN = 60;

const middlewaresRoh = lies(MIDDLEWARES_PFAD);
const middlewares = ohnePhpKommentare(middlewaresRoh);
const bookingEndpointRoh = lies(BOOKING_ENDPOINT_PFAD);
const bookingEndpoint = ohnePhpKommentare(bookingEndpointRoh);
const bookingServiceRoh = lies(BOOKING_SERVICE_PFAD);
const bookingService = ohnePhpKommentare(bookingServiceRoh);
const extTablesRoh = lies(EXT_TABLES_PFAD);
const tcaPlayerRoh = lies(TCA_PLAYER_PFAD);
const tcaCoinfieldRoh = lies(TCA_COINFIELD_PFAD);
const coreMiddlewares = lies(CORE_MIDDLEWARES_PFAD);

/* ==================================================== B-2 RequestMiddlewares.php */

console.log("B-2  RequestMiddlewares.php meldet jetzt VIER Schichten an; 'booking' liegt richtig, Kern-Bezeichner stimmen");
{
	const eintraege = (middlewares.match(/'casino_account\/[a-z-]+'\s*=>\s*\[/g) || []).length;
	check(eintraege === 4, `genau vier Einträge (gefunden: ${eintraege})`);

	const bookingBlockTreffer = /'casino_account\/booking'\s*=>\s*\[([\s\S]*?)\n\s*\],\n\s*'casino_account\/qr-gate'/.exec(middlewares);
	const bookingBlock = bookingBlockTreffer ? bookingBlockTreffer[1] : '';
	check(bookingBlock !== '', "der Eintrag 'casino_account/booking' steht unmittelbar VOR 'casino_account/qr-gate'");
	check(/'target'\s*=>\s*BookingEndpoint::class/.test(bookingBlock), "booking zielt auf BookingEndpoint::class");
	check(/'after'\s*=>\s*\[\s*'typo3\/cms-frontend\/authentication'/.test(bookingBlock),
		"booking steht 'after' typo3/cms-frontend/authentication");
	check(/'before'\s*=>\s*\[[^\]]*'casino_account\/qr-gate'/.test(bookingBlock),
		"booking steht (auch) 'before' casino_account/qr-gate");
	check(/'before'\s*=>\s*\[[^\]]*'typo3\/cms-frontend\/page-resolver'/.test(bookingBlock),
		"booking steht (auch) 'before' typo3/cms-frontend/page-resolver");

	const fremdeBezeichner = [...new Set(
		[...bookingBlock.matchAll(/'(typo3\/cms-[a-z0-9-]+\/[a-z0-9-]+)'/g)].map((m) => m[1])
	)];
	check(fremdeBezeichner.length > 0, `mindestens ein fremder Bezeichner wird zitiert (gefunden: ${fremdeBezeichner.length})`);
	const unbekannt = fremdeBezeichner.filter((id) => !coreMiddlewares.includes(`'${id}'`));
	check(unbekannt.length === 0,
		'jeder zitierte Bezeichner existiert wirklich im Kern',
		...unbekannt.map((id) => `unbekannt: ${id}`));

	console.log('     Gegenprobe B-2-G: ein erfundener Bezeichner wird als unbekannt erkannt');
	const erfunden = 'typo3/cms-frontend/authentification';
	check(!coreMiddlewares.includes(`'${erfunden}'`), 'B-2-G: der Tippfehler-Bezeichner ist im Kern nicht zu finden');
}

/* ==================================================== B-3 Schalterabfrage, keine Kennung aus der Anfrage */

console.log("\nB-3  BookingEndpoint::process() beginnt mit der Schalterabfrage; die Klasse liest nirgends eine Spieler-Kennung aus der Anfrage (D.9)");
{
	const processRumpf = (methodenRumpf(bookingEndpoint, 'process') || '').trim();
	check(processRumpf.startsWith('if (!$this->qrMode->isOn())'),
		'BookingEndpoint::process() beginnt mit if (!$this->qrMode->isOn())');

	const verboteneMuster = ['casinoToken', 'getQueryParams', "getAttribute('player')", 'getAttribute("player")'];
	const gefunden = verboteneMuster.filter((muster) => bookingEndpoint.includes(muster));
	check(gefunden.length === 0,
		'keine der verbotenen Fundstellen (casinoToken, getQueryParams, ein player-Attribut) kommt in der Klasse vor',
		...gefunden);

	check(bookingEndpoint.includes('angemeldeterSpielender()') && !/angemeldeterSpielender\([^)]+\)/.test(bookingEndpoint),
		'angemeldeterSpielender() wird ohne jedes Argument aufgerufen — es gibt keinen Weg, ihr eine Kennung von außen unterzuschieben');

	console.log('     Gegenprobe B-3-G: ein eingefügtes getQueryParams() wird gefunden');
	const verunreinigt = bookingEndpoint + "\n// \$request->getQueryParams()['casinoToken']";
	check(verunreinigt.includes('getQueryParams'), 'B-3-G: die eingefügte Fundstelle wird erkannt');
}

/* ==================================================== B-4 BookingService::rechnen() */

console.log('\nB-4  BookingService::rechnen() hat für jeden Vorgang aus ARTEN einen Zweig, NUR_ADMIN stimmt, und kein Zweig kann einen Betrag unter 0 erzeugen');
{
	const artenTreffer = /public const ARTEN = \[([\s\S]*?)\];/.exec(bookingService);
	const arten = artenTreffer
		? [...artenTreffer[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1])
		: [];
	check(arten.length > 0, `ARTEN wurde gelesen (gefunden: ${arten.length} Vorgänge)`);

	const rechnenRumpf = methodenRumpf(bookingService, 'rechnen') || '';
	const fehlendeZweige = arten.filter((art) => !rechnenRumpf.includes(`'${art}' =>`));
	check(fehlendeZweige.length === 0,
		'jeder Vorgang aus ARTEN hat einen eigenen match-Zweig in rechnen()',
		...fehlendeZweige.map((a) => `fehlt: ${a}`));

	const nurAdminTreffer = /public const NUR_ADMIN = \[([\s\S]*?)\];/.exec(bookingService);
	const nurAdmin = nurAdminTreffer
		? [...nurAdminTreffer[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1])
		: [];
	check(JSON.stringify([...nurAdmin].sort()) === JSON.stringify(['abbuchen', 'aufladen', 'setzen']),
		`NUR_ADMIN enthält genau aufladen/abbuchen/setzen (gefunden: ${nurAdmin.join(', ')})`);

	const maxTreffer = /public const MAX = (\d+);/.exec(bookingService);
	const MAX = maxTreffer ? Number(maxTreffer[1]) : NaN;
	check(Number.isFinite(MAX) && MAX > 0, `MAX wurde aus der PHP-Datei gelesen (gefunden: ${MAX})`);

	/**
	 * Ein JS-Nachbau derselben Verrechnung — nicht um rechnen() zu ersetzen,
	 * sondern um sie mit Grenzwerten durchzurechnen, ohne PHP starten zu
	 * müssen. Jeder Zweig entspricht Zeile für Zeile BookingService::rechnen().
	 */
	function rechnenJs(art, betrag, { kasse, geraet, gewinn }) {
		const fertig = (k, g, w, bewegt, gekappt) => ({ ok: true, kasse: k, geraet: g, gewinn: w, bewegt, gekappt });
		const fehlerR = (grund) => ({ ok: false, grund });
		switch (art) {
			case 'uebernahme': {
				const betragR = geraet + gewinn;
				const passt = Math.min(betragR, MAX - kasse);
				return fertig(kasse + passt, betragR - passt, 0, passt, passt < betragR);
			}
			case 'einwurf':
				if (betrag === null || betrag < 1) return fehlerR('betrag');
				if (kasse < betrag) return fehlerR('kasse_zu_gering');
				return fertig(kasse - betrag, geraet + betrag, gewinn, betrag, false);
			case 'auszahlung': {
				const wunsch = betrag ?? geraet;
				if (wunsch < 0 || wunsch > geraet) return fehlerR('geraet_zu_gering');
				const passt = Math.min(wunsch, MAX - kasse);
				return fertig(kasse + passt, geraet - passt, gewinn, passt, passt < wunsch);
			}
			case 'einsatz':
				if (betrag === null || betrag < 1) return fehlerR('betrag');
				if (geraet < betrag) return fehlerR('geraet_zu_gering');
				return fertig(kasse, geraet - betrag, gewinn, betrag, false);
			case 'gewinn': {
				if (betrag === null || betrag < 1) return fehlerR('betrag');
				const ausSpeicher = Math.min(gewinn, betrag);
				const passt = Math.min(betrag, MAX - geraet);
				return fertig(kasse, geraet + passt, gewinn - ausSpeicher, passt, passt < betrag);
			}
			case 'angebot': {
				if (betrag === null || betrag < 1) return fehlerR('betrag');
				const passt = Math.min(betrag, MAX - gewinn);
				return fertig(kasse, geraet, gewinn + passt, passt, passt < betrag);
			}
			case 'verdoppeln':
				if (gewinn < 1) return fehlerR('kein_gewinn');
				return fertig(kasse, geraet, Math.min(gewinn * 2, MAX), gewinn, gewinn * 2 > MAX);
			case 'verloren':
				return fertig(kasse, geraet, 0, gewinn, false);
			case 'aufladen': {
				if (betrag === null || betrag < 1) return fehlerR('betrag');
				const passt = Math.min(betrag, MAX - kasse);
				return fertig(kasse + passt, geraet, gewinn, passt, passt < betrag);
			}
			case 'abbuchen':
				if (betrag === null || betrag < 1) return fehlerR('betrag');
				if (kasse < betrag) return fehlerR('kasse_zu_gering');
				return fertig(kasse - betrag, geraet, gewinn, betrag, false);
			case 'setzen':
				if (betrag === null || betrag < 0 || betrag > MAX) return fehlerR('betrag');
				return fertig(Math.min(betrag, MAX), 0, 0, betrag, false);
			default:
				return fehlerR('unbekannte_art');
		}
	}

	const GRENZWERTE = [0, 1, 2, MAX - 1, MAX, 123456];
	const BETRAEGE = [null, -1, 0, 1, 2, MAX - 1, MAX, MAX + 1, 999];
	let geprueft = 0;
	let negativGefunden = [];
	for (const art of arten) {
		for (const kasse of GRENZWERTE) {
			for (const geraet of GRENZWERTE) {
				for (const gewinn of GRENZWERTE) {
					for (const betrag of BETRAEGE) {
						geprueft++;
						const ergebnis = rechnenJs(art, betrag, { kasse, geraet, gewinn });
						if (ergebnis.ok && (ergebnis.kasse < 0 || ergebnis.geraet < 0 || ergebnis.gewinn < 0)) {
							negativGefunden.push(`${art}(${betrag}) auf {${kasse},${geraet},${gewinn}} => {${ergebnis.kasse},${ergebnis.geraet},${ergebnis.gewinn}}`);
						}
					}
				}
			}
		}
	}
	check(negativGefunden.length === 0,
		`kein Zweig erzeugt einen Betrag unter 0 (${geprueft} Kombinationen durchgerechnet)`,
		...negativGefunden.slice(0, 5));

	console.log('     Gegenprobe B-4-G: eine absichtlich kaputte Rechnung (Abzug ohne Prüfung) wird als negativ erkannt');
	const kaputt = (kasse, betrag) => kasse - betrag; // ohne "kasse < betrag ? fehler : …"
	check(kaputt(5, 10) < 0, 'B-4-G: die ungeprüfte Rechnung wird als negativ erkannt (5 - 10 < 0)');
}

/* ==================================================== B-5 Schema: .sql/TCA deckungsgleich, Datenbank stimmt */

console.log('\nB-5  ext_tables.sql und TCA sind deckungsgleich (booking_client, tx_casinoaccount_coinfield); die Tabelle steht in der Datenbank mit genau diesen Spalten');
{
	check(/booking_client varchar\(32\)/.test(extTablesRoh), "ext_tables.sql: booking_client steht in tx_casinoaccount_player");
	check(/'booking_client'\s*=>\s*\[/.test(tcaPlayerRoh), "TCA: booking_client hat einen Eintrag in tx_casinoaccount_player.php");
	check(/CREATE TABLE tx_casinoaccount_coinfield/.test(extTablesRoh), "ext_tables.sql: tx_casinoaccount_coinfield ist angelegt");
	for (const spalte of ['player', 'store_key', 'payload']) {
		check(new RegExp(`'${spalte}'\\s*=>\\s*\\[`).test(tcaCoinfieldRoh), `TCA: ${spalte} hat einen Eintrag in tx_casinoaccount_coinfield.php`);
	}

	let spaltenRoh;
	try {
		spaltenRoh = execFileSync('mysql', ['-e', 'SHOW COLUMNS FROM tx_casinoaccount_coinfield;'], { encoding: 'utf8' });
	} catch (fehlerObjekt) {
		console.log(`\nERGEBNIS: Abbruch — SHOW COLUMNS schlug fehl: ${fehlerObjekt.message}`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
		process.exit(1);
	}
	const spalten = spaltenRoh.split('\n').slice(1).map((z) => z.split('\t')[0]).filter((z) => z !== '');
	const erwarteteSpalten = ['uid', 'pid', 'tstamp', 'crdate', 'player', 'store_key', 'payload'];
	const fehlendeSpalten = erwarteteSpalten.filter((s) => !spalten.includes(s));
	check(fehlendeSpalten.length === 0,
		`die Tabelle hat genau die erwarteten Spalten (gefunden: ${spalten.join(', ')})`,
		...fehlendeSpalten.map((s) => `fehlt: ${s}`));

	console.log('     Gegenprobe B-5-G: eine erfundene Spalte wird als fehlend erkannt');
	const mitErfundener = [...erwarteteSpalten, 'gibtsnicht'];
	check(mitErfundener.filter((s) => !spalten.includes(s)).includes('gibtsnicht'), 'B-5-G: die erfundene Spalte wird als fehlend erkannt');
}

/* ============================================== Live: Website erreichen, Zustand messen */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const WEG1_BASIS = 'https://casino-kunterbunt.ddev.site';
const WEG2_BASIS = 'http://127.0.0.1';
const HOST_KOPFZEILE = 'casino-kunterbunt.ddev.site';
let benutzterWeg = null;

async function seite(pfad, optionen = {}) {
	const methode = optionen.methode ?? 'GET';
	const zusatzHeader = optionen.headers ?? {};
	const rumpf = optionen.body;

	const versuche = [
		{ basis: WEG1_BASIS, headers: {} },
		{ basis: WEG2_BASIS, headers: { Host: HOST_KOPFZEILE } },
	];

	let letzterFehler = null;
	for (const versuch of versuche) {
		try {
			const antwort = await fetch(versuch.basis + pfad, {
				method: methode,
				headers: { ...versuch.headers, ...zusatzHeader },
				...(rumpf !== undefined ? { body: rumpf } : {}),
				redirect: optionen.redirect ?? 'follow',
			});
			const text = await antwort.text();
			if (benutzterWeg === null) {
				benutzterWeg = versuch.basis;
			}
			return { status: antwort.status, headers: antwort.headers, text };
		} catch (fehlerObjekt) {
			letzterFehler = fehlerObjekt;
		}
	}
	console.log(`\nERGEBNIS: Abbruch — weder ${WEG1_BASIS} noch ${WEG2_BASIS} (mit Host-Kopfzeile) erreichen die laufende Website: ${letzterFehler?.message}`);
	console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand — die Live-Prüfungen wurden NICHT übersprungen, sondern konnten nicht laufen.');
	process.exit(1);
}

let registryAusgabe;
try {
	registryAusgabe = execFileSync(
		'mysql',
		['-e', "SELECT entry_value FROM sys_registry WHERE entry_namespace='tx_casinoaccount' AND entry_key='qrMode';"],
		{ encoding: 'utf8' }
	);
} catch (fehlerObjekt) {
	console.log(`\nERGEBNIS: Abbruch — die Abfrage des Schalterstands schlug fehl: ${fehlerObjekt.message}`);
	console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
	process.exit(1);
}
const registryZeile = (registryAusgabe.split('\n')[1] ?? '').trim();
const qrModeAn = registryZeile === 'b:1;';
console.log(`\n(gemessener Schalterstand: ${qrModeAn ? 'AN' : 'AUS'}${registryZeile === '' ? ' — noch nie geschaltet' : ''})`);

/* ==================================================== B-6/B-7 live, nur AN: ohne Sitzung, falsche Methode/Inhaltstyp/Rumpf */

console.log(`\nB-6  live, nur bei eingeschaltetem Modus: ohne Sitzung liefert /casino-konto/buchung 401 mit JSON, nicht die Torseite als HTML`);
console.log('B-7  live, nur bei eingeschaltetem Modus: falsche Methode → 405, falscher Inhaltstyp → 415, unbrauchbarer Rumpf → 400');
if (qrModeAn) {
	const ohneSitzung = await seite('/casino-konto/buchung', {
		methode: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
	});
	let alsJson = null;
	try { alsJson = JSON.parse(ohneSitzung.text); } catch { /* bleibt null */ }
	check(ohneSitzung.status === 401 && alsJson?.ok === false && alsJson?.grund === 'keine_sitzung',
		`ohne Sitzung: 401 mit {ok:false, grund:'keine_sitzung'} (gefunden: ${ohneSitzung.status}, ${ohneSitzung.text.slice(0, 80)})`);
	check(!ohneSitzung.text.includes('ca-gate__form'), 'die Antwort ist NICHT die Torseite (kein ca-gate__form)');

	const standOhneSitzung = await seite('/casino-konto/stand');
	check(standOhneSitzung.status === 401, `auch /casino-konto/stand liefert 401 ohne Sitzung (gefunden: ${standOhneSitzung.status})`);

	console.log('     Gegenprobe B-6-G: die Torseiten-Erkennung an einer nachgestellten Torseiten-Antwort schlägt an');
	const nachgestellt = '<form class="ca-gate__form">…</form>';
	check(nachgestellt.includes('ca-gate__form'), 'B-6-G: die nachgestellte Torseiten-Antwort wird als Tor erkannt');
} else {
	console.log('     @pruefstand:luecke B-6 bis B-7 ungeprüft — gilt nur bei eingeschaltetem Modus, gemessener Schalterstand ist AUS');
	console.log('     (übersprungen: gilt nur bei eingeschaltetem Modus)');
}

/* ==================================================== B-8 bis B-13 live, nur AN + bestehende Anmeldung */

console.log('\nB-8  live, mit echter Anmeldung: das Beispiel aus D.7.1 — angebot 1, verdoppeln, verdoppeln, verloren — 1 → 2 → 4 → 0, vier Schreibvorgänge');
console.log('B-9  live: dieselbe Buchung mit derselben Nummer erneut gesendet → doppelt:true, unverändert (Gegenprobe: anderer Kunde, dieselbe Nummer → kein doppelt)');
console.log('B-10 live: Einwurf über die Kasse hinaus / Einsatz über den Gerätekredit hinaus → ok:false, 200, unverändert');
console.log('B-11 live: ein Nicht-Admin wird bei setzen/aufladen/abbuchen abgewiesen (kein_admin), unverändert; ein Admin darf');
console.log('B-12 live: GET /casino-konto/stand stimmt mit der Datenbank überein');
console.log('B-13 live: /casino-konto/feld schreibt und liest Speicherstände, weist zu lange/zu viele/falsch benannte ab, legt keine Buchungsnummer an');

if (qrModeAn) {
	function zeile(sql) {
		const ausgabe = execFileSync('mysql', ['-e', sql], { encoding: 'utf8' });
		return (ausgabe.split('\n')[1] ?? '').trim();
	}

	function adminTestKennung() {
		const eng = zeile(
			"SELECT token FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 AND is_admin=1 "
			+ "AND (name LIKE '%check%' OR name LIKE '%Check%') ORDER BY uid LIMIT 1;"
		);
		if (eng !== '') return eng;
		return zeile('SELECT token FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 AND is_admin=1 ORDER BY uid LIMIT 1;');
	}

	function nichtAdminTestKennung() {
		return zeile('SELECT token FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 AND is_admin=0 ORDER BY uid LIMIT 1;');
	}

	async function anmelden(token) {
		const headerZusatz = benutzterWeg === WEG2_BASIS ? { Host: HOST_KOPFZEILE } : {};
		const antwort = await fetch(benutzterWeg + '/?casinoToken=' + encodeURIComponent(token), {
			redirect: 'manual',
			headers: headerZusatz,
		});
		const setCookieZeilen = typeof antwort.headers.getSetCookie === 'function' ? antwort.headers.getSetCookie() : [];
		return setCookieZeilen.map((z) => z.split(';')[0]).join('; ');
	}

	async function abmelden(cookie) {
		return seite('/', { methode: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'logintype=logout' });
	}

	async function buchen(cookie, kunde, nummer, art, betrag) {
		const rumpf = { kunde, nummer };
		if (art !== undefined) rumpf.art = art;
		if (betrag !== undefined) rumpf.betrag = betrag;
		const antwort = await seite('/casino-konto/buchung', {
			methode: 'POST',
			headers: { Cookie: cookie, 'Content-Type': 'application/json' },
			body: JSON.stringify(rumpf),
		});
		let daten = null;
		try { daten = JSON.parse(antwort.text); } catch { /* bleibt null */ }
		return { status: antwort.status, daten };
	}

	let adminToken;
	let nichtAdminToken;
	try {
		adminToken = adminTestKennung();
		nichtAdminToken = nichtAdminTestKennung();
	} catch (fehlerObjekt) {
		console.log(`\nERGEBNIS: Abbruch — die Suche nach Testspielenden schlug fehl: ${fehlerObjekt.message}`);
		process.exit(1);
	}
	if (adminToken === '') {
		console.log('\nERGEBNIS: Abbruch — kein aktiver Admin-Spielender (hidden=0, deleted=0, is_admin=1) gefunden.');
		console.log('B-8 bis B-13 brauchen eine bestehende, anmeldbare Admin-Kennung. Das ist keine fehlgeschlagene Prüfung, sondern eine fehlende Testvoraussetzung.');
		process.exit(1);
	}
	if (nichtAdminToken === '') {
		console.log('\nERGEBNIS: Abbruch — kein aktiver Nicht-Admin-Spielender (hidden=0, deleted=0, is_admin=0) gefunden.');
		console.log('B-11 braucht eine bestehende, anmeldbare Nicht-Admin-Kennung. Das ist keine fehlgeschlagene Prüfung, sondern eine fehlende Testvoraussetzung.');
		process.exit(1);
	}

	const adminCookie = await anmelden(adminToken);
	const nichtAdminCookie = await anmelden(nichtAdminToken);
	if (adminCookie === '' || nichtAdminCookie === '') {
		console.log('\nERGEBNIS: Abbruch — die Anmeldung mit einer der beiden Kennungen setzte kein Sitzungsplätzchen.');
		process.exit(1);
	}

	// Ausgangsstand des Admin-Testkontos — WIRD am Ende exakt wiederhergestellt.
	// Gelesen über den Endpunkt selbst (ein ungültiger Betrag liefert ok:false,
	// aber den aktuellen Stand mit) — keine Kennung wird dafür in SQL geklebt.
	const standStart = await buchen(adminCookie, 'nieverwendet', 1, 'einwurf', 0); // 0 ist ungültig -> ok:false, liefert aber den Stand mit
	const kasseStart = standStart.daten?.kasse ?? null;
	const geraetStart = standStart.daten?.geraet ?? null;
	const gewinnStart = standStart.daten?.gewinn ?? null;
	if (kasseStart === null || geraetStart === null || gewinnStart === null) {
		console.log('\nERGEBNIS: Abbruch — der Ausgangsstand des Admin-Testkontos konnte nicht gelesen werden.');
		process.exit(1);
	}
	if (geraetStart !== 0 || gewinnStart !== 0) {
		console.log(`\nERGEBNIS: Abbruch — das Admin-Testkonto steht nicht im erwarteten Ruhezustand (Kasse ${kasseStart}, Gerät ${geraetStart}, Gewinn ${gewinnStart}).`);
		console.log('Erwartet: Gerät und Gewinn stehen auf 0, sonst kann "setzen" den Ausgangsstand am Ende nicht wiederherstellen — das ist keine fehlgeschlagene Prüfung, sondern eine fehlende Testvoraussetzung.');
		await abmelden(adminCookie);
		await abmelden(nichtAdminCookie);
		process.exit(1);
	}

	const kunde = 'verifybk' + Math.random().toString(16).slice(2, 10);
	let nr = 1;

	// --- B-8: das Beispiel aus D.7.1 ---
	{
		const einwurf = await buchen(adminCookie, kunde, nr++, 'einwurf', 10);
		check(einwurf.status === 200 && einwurf.daten?.ok === true && einwurf.daten?.geraet === 10,
			`Einwurf 10 gelingt, Gerätekredit steht auf 10 (gefunden: ${JSON.stringify(einwurf.daten)})`);

		const folge = [
			['angebot', 1, 1],
			['verdoppeln', undefined, 2],
			['verdoppeln', undefined, 4],
			['verloren', undefined, 0],
		];
		let schreibvorgaenge = 0;
		for (const [art, betrag, erwarteterGewinn] of folge) {
			const ergebnis = await buchen(adminCookie, kunde, nr++, art, betrag);
			schreibvorgaenge++;
			check(ergebnis.status === 200 && ergebnis.daten?.ok === true && ergebnis.daten?.gewinn === erwarteterGewinn,
				`${art}${betrag !== undefined ? ' ' + betrag : ''}: Gewinnspeicher steht auf ${erwarteterGewinn} (gefunden: ${JSON.stringify(ergebnis.daten)})`);
		}
		check(schreibvorgaenge === 4, `vier Schreibvorgänge für die Folge angebot→verdoppeln→verdoppeln→verloren (gefunden: ${schreibvorgaenge})`);
	}

	// --- B-9: doppelt gesendet ---
	{
		const letzteNummer = nr - 1; // 'verloren' oben
		const doppelt = await buchen(adminCookie, kunde, letzteNummer, 'verloren');
		check(doppelt.status === 200 && doppelt.daten?.doppelt === true && doppelt.daten?.bewegt === 0,
			`dieselbe Nummer erneut → doppelt:true, nichts bewegt (gefunden: ${JSON.stringify(doppelt.daten)})`);

		console.log('     Gegenprobe B-9-G: ein ANDERER Kunde mit derselben Nummer wird NICHT als doppelt erkannt');
		const andererKunde = 'verifybk' + Math.random().toString(16).slice(2, 10);
		const nichtDoppelt = await buchen(adminCookie, andererKunde, 1, 'einwurf', 1);
		check(nichtDoppelt.status === 200 && nichtDoppelt.daten?.ok === true && nichtDoppelt.daten?.doppelt === false,
			`B-9-G: anderer Kunde, dieselbe Nummer 1 → normal ausgeführt, nicht doppelt (gefunden: ${JSON.stringify(nichtDoppelt.daten)})`);
		// Rückgängig für den zweiten Kunden — derselbe Betrag zurückgebucht.
		await buchen(adminCookie, andererKunde, 2, 'auszahlung', 1);
	}

	// --- B-10: Grenzen ---
	{
		const standVorher = await buchen(adminCookie, kunde, nr++, 'einwurf', 0); // ungültig, liefert nur den Stand
		const kasseVorher = standVorher.daten?.kasse;
		const geraetVorher = standVorher.daten?.geraet;

		const zuVielEinwurf = await buchen(adminCookie, kunde, nr++, 'einwurf', kasseVorher + 1);
		check(zuVielEinwurf.status === 200 && zuVielEinwurf.daten?.ok === false && zuVielEinwurf.daten?.grund === 'kasse_zu_gering'
			&& zuVielEinwurf.daten?.kasse === kasseVorher,
			`Einwurf über den Kassenstand hinaus → ok:false, grund:'kasse_zu_gering', 200, unverändert (gefunden: ${JSON.stringify(zuVielEinwurf.daten)})`);

		const zuVielEinsatz = await buchen(adminCookie, kunde, nr++, 'einsatz', geraetVorher + 1);
		check(zuVielEinsatz.status === 200 && zuVielEinsatz.daten?.ok === false && zuVielEinsatz.daten?.grund === 'geraet_zu_gering'
			&& zuVielEinsatz.daten?.geraet === geraetVorher,
			`Einsatz über den Gerätekredit hinaus → ok:false, grund:'geraet_zu_gering', 200, unverändert (gefunden: ${JSON.stringify(zuVielEinsatz.daten)})`);
	}

	// --- B-11: nur Admins dürfen setzen/aufladen/abbuchen ---
	{
		const standVorNichtAdmin = await buchen(nichtAdminCookie, kunde + 'na', 1, 'einwurf', 0);
		const standVorher = { kasse: standVorNichtAdmin.daten?.kasse, geraet: standVorNichtAdmin.daten?.geraet, gewinn: standVorNichtAdmin.daten?.gewinn };

		let naNr = 2;
		for (const art of ['setzen', 'aufladen', 'abbuchen']) {
			const antwort = await buchen(nichtAdminCookie, kunde + 'na', naNr++, art, 1);
			check(antwort.status === 200 && antwort.daten?.ok === false && antwort.daten?.grund === 'kein_admin'
				&& antwort.daten?.kasse === standVorher.kasse && antwort.daten?.geraet === standVorher.geraet && antwort.daten?.gewinn === standVorher.gewinn,
				`Nicht-Admin, ${art} → ok:false, grund:'kein_admin', Beträge unverändert (gefunden: ${JSON.stringify(antwort.daten)})`);
		}

		const adminDarf = await buchen(adminCookie, kunde, nr++, 'aufladen', 1);
		check(adminDarf.status === 200 && adminDarf.daten?.ok === true,
			`Admin, aufladen 1 → ok:true (gefunden: ${JSON.stringify(adminDarf.daten)})`);
		// Sofort rückgängig, damit die Wiederherstellung am Ende sauber bleibt.
		await buchen(adminCookie, kunde, nr++, 'abbuchen', 1);
	}

	// --- B-12: GET /stand stimmt mit der Datenbank überein ---
	{
		const adminZeile = zeile("SELECT balance_cash, balance_machine, balance_win FROM tx_casinoaccount_player "
			+ "WHERE hidden=0 AND deleted=0 AND is_admin=1 AND (name LIKE '%check%' OR name LIKE '%Check%') ORDER BY uid LIMIT 1;");
		const [dbKasse, dbGeraet, dbGewinn] = adminZeile.split('\t').map(Number);
		const stand = await seite('/casino-konto/stand', { headers: { Cookie: adminCookie } });
		let standDaten = null;
		try { standDaten = JSON.parse(stand.text); } catch { /* bleibt null */ }
		check(stand.status === 200 && standDaten?.kasse === dbKasse && standDaten?.geraet === dbGeraet && standDaten?.gewinn === dbGewinn
			&& standDaten?.gesamt === dbKasse + dbGeraet + dbGewinn,
			`GET /casino-konto/stand stimmt mit der Datenbank überein, gesamt ist die Summe (gefunden: ${JSON.stringify(standDaten)}, DB: ${dbKasse}/${dbGeraet}/${dbGewinn})`);
	}

	// --- B-13: /casino-konto/feld ---
	{
		const schluesselA = '_verifybooking_a';
		const schluesselB = '_verifybooking_b';
		const schreiben = await seite('/casino-konto/feld', {
			methode: 'POST',
			headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
			body: JSON.stringify({ 'stände': { [schluesselA]: 'inhalt-a', [schluesselB]: 'inhalt-b' } }),
		});
		let schreibenDaten = null;
		try { schreibenDaten = JSON.parse(schreiben.text); } catch { /* bleibt null */ }
		check(schreiben.status === 200 && schreibenDaten?.ok === true, `zwei Speicherstände schreiben → ok:true (gefunden: ${JSON.stringify(schreibenDaten)})`);

		const seqVorher = zeile("SELECT booking_seq FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 AND is_admin=1 "
			+ "AND (name LIKE '%check%' OR name LIKE '%Check%') ORDER BY uid LIMIT 1;");

		const seiteMitZustand = await seite('/', { headers: { Cookie: adminCookie } });
		check(seiteMitZustand.text.includes(schluesselA) && seiteMitZustand.text.includes('inhalt-a')
			&& seiteMitZustand.text.includes(schluesselB) && seiteMitZustand.text.includes('inhalt-b'),
			'beide Speicherstände stehen beim nächsten Seitenaufruf im Zustandsblock (Schlüssel und Inhalt)');

		const seqNachher = zeile("SELECT booking_seq FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 AND is_admin=1 "
			+ "AND (name LIKE '%check%' OR name LIKE '%Check%') ORDER BY uid LIMIT 1;");
		check(seqVorher === seqNachher, `/casino-konto/feld legt KEINE Buchungsnummer an (booking_seq unverändert: ${seqVorher})`);

		const MAX_LAENGE = 65536;
		const zuLang = await seite('/casino-konto/feld', {
			methode: 'POST',
			headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
			body: JSON.stringify({ 'stände': { _verifybooking_c: 'x'.repeat(MAX_LAENGE + 1) } }),
		});
		let zuLangDaten = null;
		try { zuLangDaten = JSON.parse(zuLang.text); } catch { /* bleibt null */ }
		check(zuLang.status === 400 && zuLangDaten?.ok === false,
			`ein Stand über MAX_LAENGE hinaus wird abgewiesen (gefunden: ${zuLang.status}, ${JSON.stringify(zuLangDaten)})`);

		const zuVieleSchluessel = await seite('/casino-konto/feld', {
			methode: 'POST',
			headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
			body: JSON.stringify({ 'stände': { a: '1', b: '2', c: '3', d: '4', e: '5' } }),
		});
		let zuVieleDaten = null;
		try { zuVieleDaten = JSON.parse(zuVieleSchluessel.text); } catch { /* bleibt null */ }
		check(zuVieleSchluessel.status === 400 && zuVieleDaten?.ok === false,
			`mehr als vier Speicherstände in einem Aufruf werden abgewiesen (gefunden: ${zuVieleSchluessel.status}, ${JSON.stringify(zuVieleDaten)})`);

		console.log('     Gegenprobe B-13-G: ein Schlüssel mit Leerzeichen wird abgewiesen');
		const ungueltigerSchluessel = await seite('/casino-konto/feld', {
			methode: 'POST',
			headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
			body: JSON.stringify({ 'stände': { 'ungueltiger schluessel': '1' } }),
		});
		let ungueltigDaten = null;
		try { ungueltigDaten = JSON.parse(ungueltigerSchluessel.text); } catch { /* bleibt null */ }
		check(ungueltigerSchluessel.status === 400 && ungueltigDaten?.ok === false,
			`B-13-G: ein Schlüssel mit Leerzeichen wird abgewiesen (gefunden: ${ungueltigerSchluessel.status})`);

		// Aufräumen: beide Testspeicherstände wieder löschen (leerer Text = löschen).
		await seite('/casino-konto/feld', {
			methode: 'POST',
			headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
			body: JSON.stringify({ 'stände': { [schluesselA]: '', [schluesselB]: '' } }),
		});
		const nachAufraeumen = zeile(`SELECT COUNT(*) FROM tx_casinoaccount_coinfield WHERE store_key IN ('${schluesselA}', '${schluesselB}');`);
		check(nachAufraeumen === '0', `beide Testspeicherstände sind wieder gelöscht (gefunden: ${nachAufraeumen} verbleibend)`);
	}

	// --- Wiederherstellung: exakt der Ausgangsstand ---
	{
		const restore = await buchen(adminCookie, kunde, nr++, 'setzen', kasseStart);
		const stand = await seite('/casino-konto/stand', { headers: { Cookie: adminCookie } });
		let standDaten = null;
		try { standDaten = JSON.parse(stand.text); } catch { /* bleibt null */ }
		const wiederhergestellt = restore.daten?.ok === true
			&& standDaten?.kasse === kasseStart && standDaten?.geraet === 0 && standDaten?.gewinn === 0;
		check(wiederhergestellt,
			`Ausgangsstand wiederhergestellt: Kasse ${kasseStart}, Gerät 0, Gewinn 0 (gefunden: ${JSON.stringify(standDaten)})`,
			!wiederhergestellt ? `ACHTUNG: Admin-Testkonto (Kennung endet auf ${adminToken.slice(-6)}) steht NICHT mehr im Ausgangsstand!` : '');
		if (!wiederhergestellt) {
			fehler++; // zusätzlich zur normalen Zusagenzählung laut anschlagen
		}
	}

	await abmelden(adminCookie);
	await abmelden(nichtAdminCookie);
} else {
	console.log('     @pruefstand:luecke B-8 bis B-13 ungeprüft — gilt nur bei eingeschaltetem Modus und bestehender Anmeldung, gemessener Schalterstand ist AUS');
	console.log('     (übersprungen: gilt nur bei eingeschaltetem Modus und bestehender Anmeldung)');
}

/* ==================================================== B-14 live, nur AN: Zustandsblock vollständig */

console.log('\nB-14 live, nur bei eingeschaltetem Modus und bestehender Anmeldung: der Zustandsblock steht unmittelbar hinter <head…>, ist gültiges JSON, ohne Kennung/Name; die Seite ist vollständig');
if (qrModeAn) {
	function zeile(sql) {
		const ausgabe = execFileSync('mysql', ['-e', sql], { encoding: 'utf8' });
		return (ausgabe.split('\n')[1] ?? '').trim();
	}
	const token = zeile("SELECT token FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 AND is_admin=1 "
		+ "AND (name LIKE '%check%' OR name LIKE '%Check%') ORDER BY uid LIMIT 1;");
	const headerZusatz = benutzterWeg === WEG2_BASIS ? { Host: HOST_KOPFZEILE } : {};
	const anmeldung = await fetch(benutzterWeg + '/?casinoToken=' + encodeURIComponent(token), { redirect: 'manual', headers: headerZusatz });
	const cookie = (typeof anmeldung.headers.getSetCookie === 'function' ? anmeldung.headers.getSetCookie() : [])
		.map((z) => z.split(';')[0]).join('; ');

	const geladen = await seite('/', { headers: { Cookie: cookie } });
	const kopfTreffer = /<head\b[^>]*>\s*<script type="application\/json" data-ca-state>([\s\S]*?)<\/script>/.exec(geladen.text);
	check(kopfTreffer !== null, 'der Zustandsblock steht unmittelbar hinter <head…>');

	let zustand = null;
	if (kopfTreffer !== null) {
		try { zustand = JSON.parse(kopfTreffer[1]); } catch { /* bleibt null */ }
	}
	check(zustand !== null, 'der Zustandsblock ist gültiges JSON');
	check(zustand !== null && typeof zustand.kasse === 'number' && typeof zustand.gesamt === 'number'
		&& typeof zustand.endpunkte?.buchung === 'string',
		'der Zustandsblock trägt die erwarteten Felder (kasse, gesamt, endpunkte.buchung, …)');

	check(!geladen.text.includes(token), 'die eigene Kennung steht nirgends im Seitenquelltext (D.9)');
	const koerperVollstaendig = geladen.text.includes('</body>') && geladen.text.includes('</html>');
	check(geladen.status === 200 && koerperVollstaendig, 'die Seite ist vollständig (</body>, </html>)');

	console.log('     Gegenprobe B-14-G: eine bei data-ca-state abgeschnittene Textprobe wird als unvollständig erkannt');
	const abschnittsPunkt = geladen.text.indexOf('data-ca-state');
	const abgeschnitten = abschnittsPunkt === -1 ? geladen.text : geladen.text.slice(0, abschnittsPunkt);
	check(!abgeschnitten.includes('data-ca-state'), 'B-14-G: die abgeschnittene Textprobe enthält data-ca-state nachweislich nicht mehr');

	await seite('/', { methode: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'logintype=logout' });
} else {
	console.log('     @pruefstand:luecke B-14 ungeprüft — gilt nur bei eingeschaltetem Modus und bestehender Anmeldung, gemessener Schalterstand ist AUS');
	console.log('     (übersprungen: gilt nur bei eingeschaltetem Modus und bestehender Anmeldung)');
}

/* ==================================================== B-15 live, nur AUS: keine JSON-Antwort, kein data-ca-state */

console.log('\nB-15 live, nur bei ausgeschaltetem Modus: die drei Adressen liefern keine JSON-Antwort, im HTML steht kein data-ca-state');
if (!qrModeAn) {
	for (const pfad of ['/casino-konto/buchung', '/casino-konto/stand', '/casino-konto/feld']) {
		const antwort = await seite(pfad, pfad === '/casino-konto/stand' ? {} : { methode: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
		let alsJson = null;
		try { alsJson = JSON.parse(antwort.text); } catch { /* bleibt null — das ist hier erwünscht */ }
		check(alsJson === null, `${pfad} liefert bei ausgeschaltetem Modus KEINE JSON-Antwort (die Adresse existiert schlicht nicht)`);
	}

	const startseite = await seite('/');
	check(!startseite.text.includes('data-ca-state'), 'die Startseite enthält kein data-ca-state');

	console.log('     Gegenprobe B-15-G: eine nachgestellte JSON-Antwort wird als solche erkannt');
	let nachgestelltJson = null;
	try { nachgestelltJson = JSON.parse('{"ok":true}'); } catch { /* … */ }
	check(nachgestelltJson !== null, 'B-15-G: die nachgestellte JSON-Antwort wird als JSON erkannt');
} else {
	console.log('     @pruefstand:luecke B-15 ungeprüft — gilt nur bei ausgeschaltetem Modus, gemessener Schalterstand ist AN');
	console.log('     (übersprungen: gilt nur bei ausgeschaltetem Modus)');
}

/* ------------------------------------------ Wächter: sind alle Blöcke gelaufen? */

const erwarteteZusagen = qrModeAn ? ERWARTETE_ZUSAGEN_AN : ERWARTETE_ZUSAGEN;

if (erwarteteZusagen > 0 && zusagen !== erwarteteZusagen) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${erwarteteZusagen} erwartet (Schalter ${qrModeAn ? 'AN' : 'AUS'}).`);
	fehler++;
} else if (erwarteteZusagen === 0) {
	console.log(`\n  (Wächter noch nicht scharf: ERWARTETE_ZUSAGEN${qrModeAn ? '_AN' : ''} steht auf 0 und wird nach dem`);
	console.log(`  ersten vollständigen Lauf in diesem Zustand gemessen und eingetragen. Tatsächlich ausgegebene Zusagen: ${zusagen}.)`);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`}`);
if (fehler === 0) {
	console.log('Die Middleware-Kette meldet die vierte Schicht korrekt an, der Endpunkt liest nie eine Kennung aus der');
	console.log('Anfrage, die Verrechnung erzeugt keinen negativen Betrag, das Schema stimmt, und die laufende Website');
	console.log('verhält sich zum gemessenen Schalterstand genau so, wie D.7.2/D.9 es verlangen.');
}

process.exit(fehler === 0 ? 0 : 1);
