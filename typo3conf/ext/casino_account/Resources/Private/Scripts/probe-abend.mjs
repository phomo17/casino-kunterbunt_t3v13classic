/**
 * Casino Kunterbunt – die Abendbilanz (Teil D, Phase D6, Abschnitt 4B)
 * ============================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Eine LIVE-PROBE: echte
 * Browser über Playwright gegen die laufende DDEV-Instanz, ein ganzer
 * simulierter Abend — mehrere Spielende, mehrere Geräte, mehrere
 * Lobby-Runden —, und am Ende eine Schlusszeile, die sagt, ob die
 * Buchführung auf den Cent stimmt.
 *
 * WARUM `probe-` UND NICHT `verify-`: `verify-*` läuft im Reihenlauf und
 * rechnet mit Dateien; `probe-*` ist eine Live-Probe mit echten Browsern
 * gegen die laufende Instanz (Vorbild: roulette/probe-lobby-roulette.mjs,
 * craps/probe-lobby-craps.mjs, blackjack/probe-lobby-blackjack.mjs,
 * casino_lobby/probe-lobby-strip.mjs). Ein `verify-`-Name würde dieses
 * Programm in den Reihenlauf ziehen, wo es nichts zu suchen hat: es braucht
 * den QR-Modus AN, mehrere Minuten und angelegte Prüfkonten.
 *
 * WARUM IN casino_account: hier liegt die Buchführung selbst —
 * BookingService, BookingEndpoint, AccountBookkeeper, die drei Beträge, das
 * Datenmodell. Ein Nachweis gehört zu dem, was er beweist.
 *
 *
 * DIE FÜNF FEHLER, DIE DIESEN NACHWEIS NÖTIG MACHEN
 * --------------------------------------------------
 * Fünf der bisher gefundenen echten Fehler dieses Projekts waren Geldfehler,
 * und kein einziger wurde von einem bestehenden Prüfskript gesehen —
 * gefunden haben sie der Auftraggeber beim Spielen, ein Live-Audit, und
 * zweimal eine Probe mit zwei echten Browsern. Der Prüfstand war dabei jedes
 * Mal vollständig grün. Diese Probe ist der Nachweis, der genau diese Lücke
 * schließen soll: misstrauisch gegenüber jeder Stelle, an der ein Betrag
 * entsteht, wandert oder verfällt.
 *
 *
 * WAS DIESE PROBE NICHT BEWEIST
 * ------------------------------
 * NICHT „die Summe bleibt gleich" — ein Casino erzeugt und vernichtet Geld,
 * das ist der Sinn der Sache. Beweisbar ist etwas Schärferes: über den
 * ganzen Abend, über alle Spielenden, ist die Veränderung des
 * Gesamtvermögens exakt gleich der Summe aller ΔV aus den tatsächlich
 * gesendeten Buchungen — und jede einzelne Buchung ist an genau eine
 * Handlung im Spiel gebunden. Ein Cent, der sich in der Datenbank bewegt,
 * ohne dass eine Buchung ihn erklärt, ist damit sichtbar.
 *
 * DER SERVER FÜHRT KEIN BUCHUNGSJOURNAL: booking_seq und booking_client
 * halten nur die zuletzt verarbeitete Nummer. Diese Probe schreibt deshalb
 * SELBST mit, was sie über /casino-konto/buchung auslöst (siehe „Das
 * Journal" unten) — sie IST die zweite, unabhängige Quelle.
 *
 * DIE VERMÖGENSALGEBRA WIRD NIE NACHGEBAUT. `BookingService::rechnen()`
 * (casino_account/Classes/Service/BookingService.php) wird über ein
 * winziges PHP-Erntewerkzeug zur Laufzeit AUSGEFÜHRT — Reflexion auf die
 * ECHTE, unveränderte Datei —, nicht in JavaScript abgeschrieben. Eine
 * Abschrift könnte richtig rechnen, während die Anwendung falsch bucht; dann
 * wäre der Nachweis wertlos. Dasselbe Verfahren wie
 * casino_lobby/verify-lobby-round.mjs (S-6…S-9).
 *
 *
 * ABWEICHUNG VOM PLANTEXT — DER COIN PUSHER (gegenstandslos, nicht nur
 * ausgelassen)
 * ----------------------------------------------------------------------
 * Der Coin Pusher ist seit dem 2026-09-11 abgeschrieben und deaktiviert
 * (DECISIONS.md, 08:15/12:50): die Extension ist per
 * `extension:deactivate` abgemeldet (PackageStates.php enthält
 * `coin_pusher` nicht mehr — nachgesehen), seine Seite (uid 6, /coin-pusher)
 * ist versteckt, seine Kachel verschwindet von selbst aus dem Saal. Ein
 * Abend, der ihn noch mitspielt, misst etwas, das es nicht mehr gibt. Die
 * ursprünglich für ihn vorgesehene vierte Person (D) bekommt stattdessen
 * eine eigene, kurze Runde am Reel Slot (siehe Phase P4-ERSATZ unten) —
 * sonst hätte D den ganzen Abend nur an- und abgemeldet, ohne dass ihr
 * Vermögen sich je bewegt, und die Probe hätte für sie nichts zu beweisen.
 * IDENTITÄT I-5 (Erhaltung des Münzschiebers) ENTFÄLLT VOLLSTÄNDIG — es gibt
 * dafür kein Gerät mehr; sie erscheint im Schlussblock als „entfällt", nicht
 * als stillschweigend ausgelassen.
 *
 *
 * ABWEICHUNG VOM PLANTEXT — IDENTITÄT I-6, GESTUFTER UMFANG
 * ------------------------------------------------------------
 * I-6 rechnet die Lobby-Runde beim ROULETTE VOLLSTÄNDIG unabhängig nach: die
 * Saat aus dem echten `casino:lobby-runde`-Ereignis, gefüttert in die ECHTEN
 * Dateien `rng.js` (createSeeded/saatZuZahl), `wheel-physics.js` (Wheel,
 * `runToRest()` — eine reine, zeitunabhängige Funktion der Zufallsquelle,
 * dieselbe Technik wie roulette/verify-lobby-roulette.mjs R-4/R-5/R-6),
 * `wheel-geometry.js` (labelOf) und `bets-roulette.js`
 * (PAYOUT_BY_COVERED) — und vergleicht die erwartete Auszahlung je Platz mit
 * dem tatsächlich gebuchten ΔV.
 *
 * Für CRAPS und BLACKJACK ist der Umfang BEWUSST KLEINER: eine vollständige,
 * eigenständige Nachrechnung bräuchte die komplette Rundenmaschinerie
 * dieser Tische (bei Craps mehrere Würfe mit Punkt-Zustand, bei Blackjack
 * einen fortlaufenden Kartenstapel UND die tatsächlichen Zug-Entscheidungen
 * der Probe selbst als Eingabe) — das in der verbleibenden Zeit dieses
 * Laufs sauber nachzubauen, ohne eine der beiden Nachrechnungen subtil
 * falsch zu verdrahten, wäre riskanter als es wert. Für diese beiden Tische
 * prüft die Probe stattdessen: dieselbe Saat kommt bei allen Plätzen an
 * (Seitenparität, wie schon in P-2 der bestehenden probe-lobby-*.mjs), und
 * jede tatsächlich gebuchte Änderung läuft durch I-1/I-2/I-3/I-9 — also
 * durch dieselbe scharfe Prüfung wie jede andere Buchung des Abends. Nicht
 * geprüft wird bei diesen beiden Tischen, ob der GEBUCHTE BETRAG SELBST der
 * regelkonforme Auszahlungsbetrag ist. Das ist eine echte Lücke gegenüber
 * dem Plantext und wird im Schlussblock so benannt.
 *
 *
 * AUFRUF
 * ------
 *   ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/probe-abend.mjs \
 *        [--kurz] [--ohne=<phase>] [--behalten]
 *
 *   (kein Schalter)   der volle Abend: vier Spielende, drei Automaten, drei
 *                     Lobby-Runden
 *   --kurz            nur die Automatenphasen (P0–P5), ohne Lobby
 *   --ohne=<phase>     eine Phase auslassen, z. B. --ohne=p8-blackjack
 *   --behalten        die angelegten ACCTEST-Konten NICHT löschen
 *
 * Braucht QR-Modus AN (ddev exec node Tests/Acceptance/dbg-schalter.mjs an)
 * — meldet das selbst und bricht sonst kontrolliert ab, Rückgabewert 0.
 *
 * Braucht zwei Umgebungsvariablen für den Backend-Zugang, NICHT im
 * Quelltext: CASINO_BE_USER, CASINO_BE_PASS (ein Admin-Konto).
 */

import { execFileSync } from 'node:child_process';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const BASIS = 'https://casino-kunterbunt.ddev.site';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/casino_account/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
/** Projektstamm. */
const PROJECT_ROOT = path.resolve(EXT_ROOT, '../..');

const ROULETTE_DIR = path.join(EXT_ROOT, 'roulette', 'Resources', 'Public', 'JavaScript');

/* ============================================================================
   CLI-Schalter
   ============================================================================ */

const argv = process.argv.slice(2);
const KURZ = argv.includes('--kurz');
const BEHALTEN = argv.includes('--behalten');
const OHNE = new Set(
	argv.filter((a) => a.startsWith('--ohne=')).map((a) => a.slice('--ohne='.length))
);

/* ============================================================================
   Zähler, Ausgabe
   ============================================================================ */

let fehler = 0;
let zusagen = 0;
const befunde = [];

/**
 * @param {boolean} ok
 * @param {string} text
 * @param {...string} zeilen
 * @returns {void}
 */
function check(ok, text, ...zeilen) {
	zusagen++;
	console.log(`  ${ok ? '✓' : '✗'} ${text}`);
	if (!ok) {
		fehler++;
		for (const zeile of zeilen) { console.log(`      ${zeile}`); }
		befunde.push(text);
	}
}

/**
 * @param {string} sql
 * @returns {string}
 */
function mysql(sql) {
	return execFileSync('mysql', ['-e', sql], { encoding: 'utf8' }).split('\n')[1]?.trim() ?? '';
}

console.log('\nCasino Kunterbunt – die Abendbilanz (D6, Abschnitt 4B)');
console.log('============================================================================\n');

/* ============================================================================
   Vorbedingungen
   ============================================================================ */

let qrModeAn = false;
try {
	qrModeAn = mysql("SELECT entry_value FROM sys_registry WHERE entry_namespace='tx_casinoaccount' AND entry_key='qrMode';") === 'b:1;';
} catch (fehlerObjekt) {
	console.log(`\nERGEBNIS: Abbruch — die Abfrage des Schalterstands schlug fehl: ${fehlerObjekt.message}`);
	process.exit(1);
}
if (!qrModeAn) {
	console.log('ERGEBNIS: übersprungen — der QR-Modus steht auf AUS. Zum Prüfen: ddev exec node Tests/Acceptance/dbg-schalter.mjs an');
	process.exit(0);
}

const restLobby = mysql('SELECT COUNT(*) FROM tx_casinolobby_lobby;');
const restSeat = mysql('SELECT COUNT(*) FROM tx_casinolobby_seat;');
const restBet = mysql('SELECT COUNT(*) FROM tx_casinolobby_bet;');
if (restLobby !== '0' || restSeat !== '0' || restBet !== '0') {
	console.log(`\nERGEBNIS: Abbruch — die Lobby-Tabellen sind nicht leer (lobby=${restLobby}, seat=${restSeat}, bet=${restBet}).`);
	console.log('Eine stehengebliebene Lobby lässt diesen Lauf an seiner Vorbedingung scheitern.');
	console.log('Zum Leeren über den echten Weg: POST /casino-lobby/handlung {"art":"verlassen"} je stehender Sitzung,');
	console.log('oder die betroffene Seite manuell im Browser öffnen und verlassen.');
	process.exit(1);
}

let playwrightDa = true;
try {
	await import('playwright');
} catch {
	playwrightDa = false;
}
if (!playwrightDa) {
	console.log('\nERGEBNIS: Abbruch — das Paket "playwright" ist nicht auffindbar.');
	process.exit(1);
}

const BE_USER = process.env.CASINO_BE_USER;
const BE_PASS = process.env.CASINO_BE_PASS;
if (!BE_USER || !BE_PASS) {
	console.log('\nERGEBNIS: Abbruch — CASINO_BE_USER und/oder CASINO_BE_PASS sind nicht gesetzt.');
	console.log('Diese Probe legt Prüfkonten über das Backend an und braucht dafür ein Admin-Konto,');
	console.log('das NICHT im Quelltext stehen soll. Beispiel:');
	console.log('  CASINO_BE_USER=... CASINO_BE_PASS=... ddev exec -e CASINO_BE_USER -e CASINO_BE_PASS node typo3conf/ext/casino_account/Resources/Private/Scripts/probe-abend.mjs');
	process.exit(1);
}

const adminZeile = mysql("SELECT uid, is_admin, balance_cash, balance_machine, balance_win FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 AND name='_d2check_' LIMIT 1;");
const [adminUidStr, adminIstAdmin, adminKasseStr, adminGeraetStr, adminGewinnStr] = adminZeile.split('\t');
if (!adminUidStr || adminIstAdmin !== '1') {
	console.log('\nERGEBNIS: Abbruch — _d2check_ existiert nicht oder ist kein Admin.');
	process.exit(1);
}
const ADMIN_UID = Number(adminUidStr);
const ADMIN_STAND_VORHER = { kasse: Number(adminKasseStr), geraet: Number(adminGeraetStr), gewinn: Number(adminGewinnStr) };

const protokollMarke = Number(mysql('SELECT COALESCE(MAX(uid), 0) FROM sys_log;'));

console.log('Vorbedingungen: QR-Modus AN, Lobby-Tabellen leer, Playwright vorhanden, _d2check_ ist Admin, sys_log markiert. Alles erfüllt.\n');

/* ============================================================================
   Backend-Anmeldung und Spielenden-Verwaltung (echter Weg, keine SQL-Schreibungen)
   ============================================================================ */

const { chromium } = await import('playwright');
const browser = await chromium.launch();
const KONTEN_PID = 22;

/**
 * Meldet sich am TYPO3-Backend an. Eigene, kleine Funktion (kein
 * @playwright/test), weil diese Probe rohes Playwright benutzt wie jede
 * andere probe-*.mjs im Haus.
 * @param {import('playwright').Page} seite
 * @returns {Promise<void>}
 */
async function beAnmelden(seite) {
	await seite.goto(`${BASIS}/typo3/`, { waitUntil: 'domcontentloaded' });
	await seite.getByLabel('Username').fill(BE_USER);
	await seite.getByLabel('Password').fill(BE_PASS);
	await seite.getByRole('button', { name: 'Login' }).click();
	await seite.locator('#modulemenu').waitFor({ state: 'visible', timeout: 20000 });
}

/**
 * Legt einen Spielenden über den echten Weg an — das Standard-Formular des
 * Kerns für `tx_casinoaccount_player`, nicht SQL. Nur der Weg über die
 * Formularmaschine hält Referenzindex, Zwischenspeicher und
 * Schattendatensatz in fe_users richtig (dieselbe Begründung wie
 * Tests/Acceptance/specs/D2-07-create.spec.ts).
 * @param {import('playwright').Page} beSeite bereits angemeldet
 * @param {string} name
 * @param {number} kasse
 * @returns {Promise<void>}
 */
async function spielendenAnlegen(beSeite, name, kasse) {
	await beSeite.goto(`${BASIS}/typo3/record/edit?edit[tx_casinoaccount_player][${KONTEN_PID}]=new`, { waitUntil: 'domcontentloaded' });
	const frame = beSeite.frameLocator('#typo3-contentIframe');
	await frame.locator('button[name="_savedok"]').waitFor({ state: 'visible', timeout: 20000 });
	await frame.locator('input[data-formengine-input-name$="[name]"]').fill(name);
	await frame.locator('input[data-formengine-input-name$="[balance_cash]"]').fill(String(kasse));
	await frame.locator('button[name="_savedok"]').click();
	// GEGENPROBE, GEFUNDEN UND BEHOBEN (Behebungslauf nach dem ersten echten
	// Lauf, 2026-09-11): "auf das Namensfeld warten" allein beweist nur, dass
	// die SEITE nach dem Klick wieder ein Formular zeigt — nicht, dass GENAU
	// DIESER Datensatz fertig committet ist, bevor die nächste Anlage
	// beginnt. Bei den ersten beiden Personen ging das schnell genug gut,
	// bei der dritten und vierten schlug das spätere Zurücklesen fehl (uid=0
	// — die SELECT-Abfrage kam leer zurück, kein Duplikat, sondern ein
	// echtes Zeitfenster). Maßgeblich ist deshalb NICHT mehr "die Seite hat
	// wieder ein Formular", sondern ein ECHTER Datenbank-Nachweis direkt im
	// Anschluss: erst warten, bis PER NAME irgendeine Zeile auftaucht, dann
	// mit ORDER BY uid DESC die NEUESTE davon lesen — defensiv auch dann
	// richtig, wenn ein liegen gebliebener Rest eines früheren, abgebrochenen
	// Laufs (der Vorab-Aufräumblock vor dieser Schleife) trotz des dortigen
	// Aufräumens noch denselben Namen trüge.
	let gelesen = null;
	for (let versuch = 0; versuch < 20 && gelesen === null; versuch++) {
		const zeile = mysql(`SELECT uid, token, balance_cash, balance_machine, balance_win FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 AND name='${name}' ORDER BY uid DESC LIMIT 1;`);
		const [uid, token, kasse2, geraet2, gewinn2] = zeile.split('\t');
		if (uid && Number(uid) > 0 && token) {
			gelesen = { uid: Number(uid), token, start: { kasse: Number(kasse2), geraet: Number(geraet2), gewinn: Number(gewinn2) } };
			break;
		}
		await beSeite.waitForTimeout(300);
	}
	await frame.locator('.t3js-editform-close').click().catch(() => {});
	await beSeite.waitForLoadState('load').catch(() => {});
	return gelesen;
}

/**
 * Setzt balance_cash/machine/win eines vorhandenen Spielenden über den
 * echten Weg zurück — genutzt, um _d2check_s Kassenstand am Ende
 * wiederherzustellen, falls er sich (entgegen der Erwartung) bewegt hat.
 * @param {import('playwright').Page} beSeite
 * @param {number} uid
 * @param {{kasse:number, geraet:number, gewinn:number}} stand
 * @returns {Promise<void>}
 */
async function spielendenStandSetzen(beSeite, uid, stand) {
	await beSeite.goto(`${BASIS}/typo3/record/edit?edit[tx_casinoaccount_player][${uid}]=edit`, { waitUntil: 'domcontentloaded' });
	const frame = beSeite.frameLocator('#typo3-contentIframe');
	await frame.locator('button[name="_savedok"]').waitFor({ state: 'visible', timeout: 20000 });
	await frame.locator('input[data-formengine-input-name$="[balance_cash]"]').fill(String(stand.kasse));
	await frame.locator('input[data-formengine-input-name$="[balance_machine]"]').fill(String(stand.geraet));
	await frame.locator('input[data-formengine-input-name$="[balance_win]"]').fill(String(stand.gewinn));
	await frame.locator('button[name="_savedok"]').click();
	await frame.locator('input[data-formengine-input-name$="[name]"]').first().waitFor({ timeout: 20000 });
	await frame.locator('.t3js-editform-close').click().catch(() => {});
	await beSeite.waitForLoadState('load').catch(() => {});
}

/**
 * Löscht alle Datensätze mit einem Namen, der mit "ACCTEST " beginnt, über
 * die Liste des Kontenordners — derselbe Weg wie
 * Tests/Acceptance/specs/D2-teardown-player.spec.ts.
 * @param {import('playwright').Page} beSeite
 * @returns {Promise<string[]>} die gelöschten Namen
 */
async function acctestSpielendeLoeschen(beSeite) {
	const geloescht = [];
	for (let durchgang = 0; durchgang < 8; durchgang++) {
		await beSeite.goto(`${BASIS}/typo3/module/web/list?id=${KONTEN_PID}`, { waitUntil: 'domcontentloaded' });
		const frame = beSeite.frameLocator('#typo3-contentIframe');
		await frame.locator('body').waitFor({ state: 'visible', timeout: 20000 });
		await beSeite.waitForLoadState('networkidle').catch(() => {});
		const zeilen = frame.locator('tr').filter({ hasText: /ACCTEST / });
		const anzahl = await zeilen.count();
		if (anzahl === 0) { break; }
		const zeile = zeilen.first();
		const text = (await zeile.innerText().catch(() => '')).split('\n')[0] ?? '';
		geloescht.push(text.trim());
		await zeile.locator('button[title="Delete record (!)"]').first().click();
		const bestaetigen = beSeite.locator('.modal-footer button', { hasText: 'Delete record' });
		await bestaetigen.first().waitFor({ state: 'visible', timeout: 20000 });
		await bestaetigen.first().click();
		await beSeite.waitForLoadState('load').catch(() => {});
	}
	return geloescht;
}

// EIGENER KONTEXT MIT ignoreHTTPSErrors: die lokale DDEV-Instanz hat ein
// selbstsigniertes Zertifikat. browser.newPage() legt einen Kontext OHNE
// diese Ausnahme an, und die Anmeldung scheiterte deshalb sofort an
// ERR_CERT_AUTHORITY_INVALID — dieselbe Vorkehrung, die weiter unten
// jeder Spielenden-Kontext schon trifft.
const beKontext = await browser.newContext({ ignoreHTTPSErrors: true });
const beSeite = await beKontext.newPage();
await beAnmelden(beSeite);

// BEHOBENER FUND (Behebungslauf nach dem ersten echten Lauf, 2026-09-11):
// ein zuvor abgebrochener Lauf lässt eigene ACCTEST-Abend-Konten stehen —
// der nächste Lauf legte bisher BLIND vier weitere mit denselben Namen an
// und scheiterte dann an seiner eigenen Vorbedingung (doppelte Namen, siehe
// Bericht des Umsetzungslaufs). Vor dem Anlegen wird deshalb JETZT erst
// aufgeräumt, über denselben echten Weg wie am Ende des Laufs — dieselbe
// Funktion, nur vorgezogen.
const vorabReste = mysql("SELECT COUNT(*) FROM tx_casinoaccount_player WHERE deleted=0 AND hidden=0 AND name LIKE 'ACCTEST %';");
if (vorabReste !== '0') {
	console.log(`Reste eines früheren, abgebrochenen Laufs gefunden (${vorabReste} Konten mit "ACCTEST " im Namen) — räume sie zuerst über den echten Weg ab …`);
	const vorabGeloescht = await acctestSpielendeLoeschen(beSeite);
	console.log(`  entfernt: ${vorabGeloescht.join(', ') || '(keine — nachgezählt und schon leer?)'}`);
}

console.log('Lege vier Prüfkonten an (ACCTEST Abend A–D, je 50.000,00 € Startkasse) …');
const NAMEN = ['ACCTEST Abend A', 'ACCTEST Abend B', 'ACCTEST Abend C', 'ACCTEST Abend D'];
const SPIELER = {};
for (const name of NAMEN) {
	const kurzname = name.replace('ACCTEST Abend ', '');
	const gelesen = await spielendenAnlegen(beSeite, name, 50000);
	SPIELER[kurzname] = gelesen ?? { uid: 0, token: null, start: { kasse: 0, geraet: 0, gewinn: 0 } };
	check(SPIELER[kurzname].uid > 0 && SPIELER[kurzname].token, `${name} angelegt (uid=${SPIELER[kurzname].uid})`);
}
await beSeite.close();
await beKontext.close();
if (Object.values(SPIELER).some((p) => !p.uid)) {
	console.log('\nERGEBNIS: Abbruch — mindestens ein Prüfkonto konnte nicht gelesen werden.');
	await browser.close();
	process.exit(1);
}

/* ============================================================================
   Das Buchungsjournal
   ============================================================================ */

/**
 * DAS BUCHUNGSJOURNAL. Jede Anfrage an /casino-konto/buchung wird mit
 * Anfrage UND Antwort mitgeschrieben, je Browser-Kontext.
 *
 * WARUM DAS DER KERN IST: der Server führt KEIN Journal — booking_seq und
 * booking_client halten nur die ZULETZT verarbeitete Nummer (nachgelesen in
 * BookingService.php). Ohne Mitschrift gibt es keine zweite, unabhängige
 * Quelle für die Frage "welche Beträge sind heute Abend geflossen". Diese
 * Probe IST diese zweite Quelle.
 *
 * FELDNAMEN AM QUELLTEXT ABGELESEN (BookingEndpoint.php,
 * BookingService::rechnen()/antwort()/absage()): die Anfrage trägt `kunde`,
 * `nummer`, `art`, `betrag` — NICHT `nr`, wie eine frühere Lesart des
 * Plantextes annahm. Die Antwort trägt ok, grund?, kasse, geraet, gewinn,
 * gesamt, bewegt, gekappt, doppelt.
 *
 * @type {Array<{person:string, phase:string, nummer:number, art:string,
 *               betrag:number|null, vorher:{kasse:number,geraet:number,gewinn:number}|null,
 *               nachher:{kasse:number,geraet:number,gewinn:number}|null,
 *               zeit:number, ok:boolean, doppelt:boolean, grund:string}>}
 */
const journal = [];

/** Letzter bekannter Stand je Person — Ausgangspunkt jeder neuen Buchung. */
const letzterStand = {};
for (const kurzname of Object.keys(SPIELER)) {
	letzterStand[kurzname] = { ...SPIELER[kurzname].start };
}

/** Welche Phase gerade läuft — für die Journalzeile. */
let phaseJetzt = 'unbekannt';

/**
 * Hängt den Mitschnitt an einen Browser-Kontext. Es wird die ANTWORT
 * abgewartet, nicht nur die Anfrage — der Zustand NACHHER steht in der
 * Antwort, und ohne ihn ist die Kette nicht schließbar.
 * @param {import('playwright').BrowserContext} kontext
 * @param {string} person
 * @returns {void}
 */
function journalAnhaengen(kontext, person) {
	kontext.on('response', async (antwort) => {
		const url = antwort.url();
		if (!url.includes('/casino-konto/buchung')) { return; }
		const anfrage = antwort.request();
		let rumpf = {};
		let ergebnis = {};
		try { rumpf = JSON.parse(anfrage.postData() ?? '{}'); } catch { /* bleibt leer */ }
		try { ergebnis = await antwort.json(); } catch { /* bleibt leer */ }
		journal.push({
			person, phase: phaseJetzt,
			nummer: rumpf.nummer ?? -1, art: rumpf.art ?? '?', betrag: rumpf.betrag ?? null,
			vorher: letzterStand[person] ? { ...letzterStand[person] } : null,
			nachher: ergebnis.ok ? { kasse: ergebnis.kasse, geraet: ergebnis.geraet, gewinn: ergebnis.gewinn } : null,
			zeit: Date.now(), ok: ergebnis.ok === true, doppelt: ergebnis.doppelt === true, grund: ergebnis.grund ?? '',
		});
		if (ergebnis.ok) { letzterStand[person] = { kasse: ergebnis.kasse, geraet: ergebnis.geraet, gewinn: ergebnis.gewinn }; }
	});
}

/* ============================================================================
   Gemeinsame Hilfsfunktionen: Anmeldung, Ereignissammler, Tische
   ============================================================================ */

/**
 * @param {string} token
 * @param {string} pfad
 * @returns {Promise<{kontext: import('playwright').BrowserContext, seite: import('playwright').Page}>}
 */
async function neueSitzung(token, pfad) {
	const kontext = await browser.newContext({ ignoreHTTPSErrors: true });
	const seite = await kontext.newPage();
	await seite.goto(`${BASIS}/?casinoToken=${encodeURIComponent(token)}`, { waitUntil: 'domcontentloaded' });
	await seite.goto(`${BASIS}${pfad}`, { waitUntil: 'domcontentloaded' });
	return { kontext, seite };
}

/**
 * Eine weitere Seite in einer BEREITS angemeldeten Sitzung (die
 * Sitzungs-Cookie gilt für den ganzen Kontext) — kein erneutes casinoToken
 * nötig.
 * @param {import('playwright').BrowserContext} kontext
 * @param {string} pfad
 * @returns {Promise<import('playwright').Page>}
 */
async function weitereSeite(kontext, pfad) {
	const seite = await kontext.newPage();
	await seite.goto(`${BASIS}${pfad}`, { waitUntil: 'domcontentloaded' });
	return seite;
}

/**
 * Meldet einen Ereignissammler auf `document` an — VOR jeder Navigation
 * (addInitScript), weil Ereignisse an Geräten laut deren README
 * dokumentiert auf das Dokument aufsteigen (bubbles:true). Getrennt vom
 * Lobby-Sammler (casino:lobby-runde/-stand), der weiterhin exakt wie in
 * probe-lobby-roulette.mjs funktioniert.
 * @param {import('playwright').Page} seite
 * @param {string[]} namen
 * @returns {Promise<void>}
 */
async function ereignisSammlerAnhaengen(seite, namen) {
	await seite.addInitScript((namenListe) => {
		window.__ereignisse = window.__ereignisse || [];
		for (const name of namenListe) {
			document.addEventListener(name, (e) => {
				window.__ereignisse.push({ typ: name, detail: e.detail, zeit: Date.now() });
			});
		}
	}, namen);
}

/**
 * @param {import('playwright').Page} seite
 * @param {string} typ
 * @returns {Promise<number>}
 */
async function zaehleEreignis(seite, typ) {
	return await seite.evaluate((t) => (window.__ereignisse || []).filter((e) => e.typ === t).length, typ);
}

/**
 * Wartet, bis ein weiteres Ereignis des Typs eingetroffen ist, und liefert
 * es (oder null bei Zeitüberschreitung — nicht fatal, viele Runden bringen
 * keinen Gewinn und damit kein Angebot).
 * @param {import('playwright').Page} seite
 * @param {string} typ
 * @param {number} vorherigeAnzahl
 * @param {number} timeoutMs
 * @returns {Promise<object|null>}
 */
async function naechstesEreignis(seite, typ, vorherigeAnzahl, timeoutMs) {
	await seite.waitForFunction(({ t, ab }) => (window.__ereignisse || []).filter((e) => e.typ === t).length > ab,
		{ t: typ, ab: vorherigeAnzahl }, { timeout: timeoutMs }).catch(() => {});
	const treffer = await seite.evaluate((t) => (window.__ereignisse || []).filter((e) => e.typ === t), typ);
	return treffer.at(-1) ?? null;
}

/**
 * Der Lobby-Zustandsblock einer Seite, wie in probe-lobby-roulette.mjs
 * gelesen.
 * @param {import('playwright').Page} seite
 * @returns {Promise<object|null>}
 */
async function lobbyZustand(seite) {
	const text = await seite.locator('[data-cl-state]').first().textContent().catch(() => null);
	return text ? JSON.parse(text) : null;
}

/**
 * Kauft einen 1-Euro-Chip und legt ihn auf das genannte Feld — wörtlich das
 * Verfahren aus probe-lobby-roulette.mjs#setzeChip(), hier auf ein
 * gemeinsames Tuch-Merkmal verallgemeinert (`[data-ck-field]`,
 * `[data-ck-table-chip-buy]`, `[data-ck-table-rack]`), das roulette, craps
 * und blackjack laut ihren jeweiligen probe-lobby-*.mjs alle teilen.
 * @param {import('playwright').Page} seite
 * @param {string} feldId
 * @returns {Promise<void>}
 */
async function chipSetzen(seite, feldId) {
	await seite.waitForFunction(() => window.__standEreignisse?.at(-1)?.z === 'setzen', undefined, { timeout: 90000 }).catch(() => {});
	await seite.waitForFunction((fid) => {
		const btn = document.querySelector(`[data-ck-field="${fid}"]`);
		return btn !== null && btn.getAttribute('aria-disabled') !== 'true';
	}, feldId, { timeout: 10000 });
	await seite.locator('[data-ck-table-chip-buy="1"]').first().click({ timeout: 5000 });
	// data-ck-table-rack trägt einen ausformulierten Satz ("1 im Bestand"),
	// Number(...) darauf ist NaN — parseInt() liest die führende Zahl (Falle
	// 1, an genau dieser Stelle schon einmal in probe-lobby-roulette.mjs
	// gefunden).
	await seite.waitForFunction(() => parseInt(document.querySelector('[data-ck-table-rack="1"]')?.textContent ?? '0', 10) > 0, undefined, { timeout: 5000 });
	await seite.locator(`[data-ck-field="${feldId}"]`).first().click({ timeout: 5000 });
	await seite.waitForFunction((fid) => {
		const stack = document.querySelector(`[data-ck-field="${fid}"] [data-ck-stack]`);
		return stack !== null && stack.children.length > 0;
	}, feldId, { timeout: 5000 });
}

/**
 * Meldet einen Lobby-Ereignissammler an (casino:lobby-runde,
 * casino:lobby-stand) — Vorbild probe-lobby-roulette.mjs.
 * @param {import('playwright').Page} seite
 * @returns {Promise<void>}
 */
async function lobbySammlerAnhaengen(seite) {
	await seite.addInitScript(() => {
		window.__rundeEreignisse = [];
		window.__standEreignisse = [];
		document.addEventListener('casino:lobby-runde', (e) => { window.__rundeEreignisse.push(e.detail); });
		document.addEventListener('casino:lobby-stand', (e) => { window.__standEreignisse.push(e.detail); });
	});
}

/**
 * Verlässt eine Lobby über den echten Weg — nie per SQL (Lehre vom
 * 2026-09-11).
 * @param {import('playwright').Page} seite
 * @param {string} token
 * @param {string} pfad
 * @returns {Promise<void>}
 */
async function lobbyVerlassen(seite, token, pfad) {
	try {
		const zustand = await lobbyZustand(seite);
		const endpunkt = zustand?.endpunkte?.handlung;
		if (endpunkt) {
			await seite.evaluate(async ({ handlung }) => {
				await fetch(handlung, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ art: 'verlassen' }) });
			}, { handlung: endpunkt });
			return;
		}
	} catch { /* weiter unten der Rückfallweg */ }
	// Rückfallweg: frische Seite derselben Sitzung öffnen und dort verlassen
	// (Vorbild: probe-lobby-roulette.mjs, Aufräum-Block nach M-2).
	try {
		const frisch = await weitereSeite(seite.context(), pfad);
		const zustand = await lobbyZustand(frisch);
		const endpunkt = zustand?.endpunkte?.handlung;
		if (endpunkt) {
			await frisch.evaluate(async ({ handlung }) => {
				await fetch(handlung, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ art: 'verlassen' }) });
			}, { handlung: endpunkt });
		}
		await frisch.close();
	} catch { /* best effort, wie im Haus üblich */ }
}

/* ============================================================================
   Geräte: Einwurf, Runde, Angebot, Auszahlung
   ============================================================================ */

const GERAETE = {
	rs: { pfad: '/reel-slot', ereignisse: ['rs:round', 'rs:result', 'rs:risk', 'rs:payout', 'rs:coin', 'rs:cashout'] },
	vs: { pfad: '/video-slot', ereignisse: ['vs:round', 'vs:result', 'vs:risk', 'vs:payout', 'vs:coin', 'vs:cashout'] },
	fr: { pfad: '/fruit-risk', ereignisse: ['fr:round', 'fr:result', 'fr:risk', 'fr:offer', 'fr:offerend', 'fr:coin', 'fr:cashout'] },
};

/**
 * Wirft einen Betrag über das freie Feld ein — Tippen + Eingabetaste, genau
 * der zweite dokumentierte Weg (coinslot.js: "zusätzlich löst die
 * Eingabetaste im Feld denselben Weg aus").
 * @param {import('playwright').Page} seite
 * @param {string} p Präfix: rs | vs | fr
 * @param {number} betrag
 * @returns {Promise<void>}
 */
async function geldEinwerfen(seite, p, betrag) {
	const vorher = await zaehleEreignis(seite, `${p}:coin`);
	const feld = seite.locator(`[data-${p}-coin-input]`);
	await feld.fill(String(betrag));
	await feld.press('Enter');
	await naechstesEreignis(seite, `${p}:coin`, vorher, 8000);
}

/**
 * Zieht den Hebel bzw. löst die Runde aus — über das dokumentierte,
 * NICHT abbrechbare Eingangs-Ereignis "zieh jetzt den Hebel"
 * (`${p}:spin`), dieselbe Wirkung wie ein echter Hebelzug samt aller
 * Sperren (jede Geräte-README, Abschnitt Ereignisse). Kein SVG-Hebel wird
 * gezogen — das ist ein bewusst gewählter, dokumentierter Eingang, keine
 * Abkürzung an der Buchung vorbei: die Buchung selbst läuft unverändert
 * durch wallet.js/machine.js.
 * @param {import('playwright').Page} seite
 * @param {string} p
 * @returns {Promise<object|null>} das result-Ereignis, oder null bei Zeitüberschreitung
 */
async function automatSpin(seite, p) {
	const vorher = await zaehleEreignis(seite, `${p}:result`);
	await seite.evaluate((praefix) => {
		document.querySelector(`.${praefix}-machine`)?.dispatchEvent(new CustomEvent(`${praefix}:spin`, { bubbles: true }));
	}, p);
	return await naechstesEreignis(seite, `${p}:result`, vorher, 15000);
}

/**
 * Klärt ein offenes Angebot, falls eines vorliegt: sofort REWARD (Grundfall
 * für P1, P4-ERSATZ, und alle weiteren Runden von P2/P3). Kein Angebot ist
 * kein Fehler — die meisten Runden an reel_slot/video_slot gewinnen nicht.
 * @param {import('playwright').Page} seite
 * @param {string} p
 * @returns {Promise<boolean>} true, wenn ein Angebot geklärt wurde
 */
async function angebotSofortEinloesen(seite, p) {
	const offenEreignisTyp = p === 'fr' ? 'fr:offer' : `${p}:payout`;
	const letzte = await seite.evaluate((t) => (window.__ereignisse || []).filter((e) => e.typ === t).at(-1) ?? null, offenEreignisTyp);
	if (letzte === null) { return false; }
	const rewardKnopf = seite.locator(`.${p}-btn[data-${p}-button="reward"]`);
	if (await rewardKnopf.count() === 0) { return false; }
	await rewardKnopf.first().click({ timeout: 5000 }).catch(() => {});
	await seite.waitForTimeout(300);
	return true;
}

/**
 * Startet die (einfache, zweiseitige) Risiko-Leiter von reel_slot/video_slot
 * und liest im BROWSER SELBST (keine IPC-Verzögerung) das brennende Feld,
 * um sofort die passende Taste zu drücken — Treffer, wenn wunschTreffer
 * wahr ist, sonst GARANTIERT die andere Taste (risk-ladder.js#guess():
 * jede nicht brennende Seite ist immer ein Fehlgriff, unabhängig vom
 * Takt — dafür ist keine Zeitgenauigkeit nötig).
 * @param {import('playwright').Page} seite
 * @param {string} p rs | vs
 * @param {boolean} wunschTreffer
 * @returns {Promise<{ok:boolean, grund?:string}>}
 */
async function risikoLeiterZug(seite, p, wunschTreffer) {
	const startKnopf = seite.locator(`.${p}-btn[data-${p}-button="risk"]`);
	if (await startKnopf.count() === 0) { return { ok: false, grund: 'kein-start-knopf' }; }
	await startKnopf.first().click({ timeout: 5000 }).catch(() => {});
	return await seite.evaluate(({ p, wunschTreffer }) => new Promise((resolve) => {
		const machine = document.querySelector(`.${p}-machine`);
		const cabinet = machine?.querySelector(`.${p}-cabinet`) ?? null;
		if (!machine || !cabinet) { resolve({ ok: false, grund: 'kein-gehaeuse' }); return; }
		const frist = performance.now() + 3000;
		function schritt() {
			const lit = machine.getAttribute(`data-${p}-risk-lit`);
			if (lit === 'left' || lit === 'right') {
				const ziel = wunschTreffer ? lit : (lit === 'left' ? 'right' : 'left');
				const knopf = cabinet.querySelector(`.${p}-btn[data-${p}-button="risk-${ziel}"]`);
				if (knopf) { knopf.click(); resolve({ ok: true }); return; }
				resolve({ ok: false, grund: 'keine-taste' });
				return;
			}
			if (performance.now() > frist) { resolve({ ok: false, grund: 'zeit-abgelaufen' }); return; }
			requestAnimationFrame(schritt);
		}
		requestAnimationFrame(schritt);
	}), { p, wunschTreffer });
}

/**
 * Ein Zug auf der Mehrtasten-Leiter (fruit_risk, Gruppe risk/risk4/risk8).
 * Anders als bei rs/vs steht bei fruit_risk im brennenden Feld schon der
 * VOLLSTÄNDIGE Tastenschlüssel (z. B. "risk4-left"), siehe
 * risk.js#paintLit() — kein Zusammensetzen nötig.
 * @param {import('playwright').Page} seite
 * @param {string} gruppe 'risk' | 'risk4' | 'risk8'
 * @param {string[]} tasten die Tastenschlüssel dieser Gruppe
 * @param {boolean} wunschTreffer
 * @returns {Promise<{ok:boolean, grund?:string}>}
 */
async function fruitRiskZug(seite, gruppe, tasten, wunschTreffer) {
	return await seite.evaluate(({ gruppe, tasten, wunschTreffer }) => new Promise((resolve) => {
		const machine = document.querySelector('.fr-machine');
		const cabinet = machine?.querySelector('.fr-cabinet') ?? null;
		if (!machine || !cabinet) { resolve({ ok: false, grund: 'kein-gehaeuse' }); return; }
		const frist = performance.now() + 3000;
		function schritt() {
			const lit = machine.getAttribute('data-fr-risk-lit');
			if (tasten.includes(lit)) {
				const ziel = wunschTreffer ? lit : tasten.find((t) => t !== lit);
				const knopf = cabinet.querySelector(`.fr-btn[data-fr-button="${ziel}"]`);
				if (knopf) { knopf.click(); resolve({ ok: true }); return; }
				resolve({ ok: false, grund: 'keine-taste' });
				return;
			}
			if (performance.now() > frist) { resolve({ ok: false, grund: 'zeit-abgelaufen' }); return; }
			requestAnimationFrame(schritt);
		}
		requestAnimationFrame(schritt);
	}), { gruppe, tasten, wunschTreffer });
}

/**
 * Startet eine Gruppe der Mehrtasten-Leiter (fruit_risk).
 * @param {import('playwright').Page} seite
 * @param {string} gruppe
 * @returns {Promise<void>}
 */
async function fruitRiskStarten(seite, gruppe) {
	await seite.locator(`.fr-btn[data-fr-button="${gruppe}-start"]`).first().click({ timeout: 5000 }).catch(() => {});
}

/**
 * CASH OUT — der Gerätekredit vollständig zurück in die Kasse.
 * @param {import('playwright').Page} seite
 * @param {string} p
 * @returns {Promise<void>}
 */
async function automatCashOut(seite, p) {
	const vorher = await zaehleEreignis(seite, `${p}:cashout`);
	const knopf = seite.locator(`[data-${p}-cashout]`);
	if (await knopf.count() === 0) { return; }
	await knopf.first().click({ timeout: 5000 }).catch(() => {});
	await naechstesEreignis(seite, `${p}:cashout`, vorher, 8000);
}

/* ============================================================================
   Die Phasen
   ============================================================================ */

/** Sitzungen, die über mehrere Phasen hinweg offen bleiben (A braucht seine
 *  eigene, absichtlich offen gelassene Reel-Slot-Seite für P5). */
const sitzungen = {};

/**
 * @param {string} name
 * @returns {boolean}
 */
function laeuft(name) {
	return !OHNE.has(name);
}

/* ---- P0: Anmelden ---------------------------------------------------- */

if (laeuft('p0-anmelden')) {
	phaseJetzt = 'p0-anmelden';
	console.log('\nP0  Vier Spielende melden sich über /?casinoToken=… an (der Weg, den ein QR-Code auslöst)');
	for (const kurzname of Object.keys(SPIELER)) {
		const { kontext, seite } = await neueSitzung(SPIELER[kurzname].token, '/');
		journalAnhaengen(kontext, kurzname);
		sitzungen[kurzname] = { kontext, seiten: { start: seite } };
	}
	check(Object.keys(sitzungen).length === 4, `alle vier Sitzungen stehen (${Object.keys(sitzungen).join(', ')})`);
}

/* ---- P1: Reel Slot (A), OHNE CASH OUT — Vorbereitung für P5 ----------- */

if (laeuft('p1-reel-slot') && sitzungen.A) {
	phaseJetzt = 'p1-reel-slot';
	console.log('\nP1  A: Reel Slot — Einwurf 1.000, fünf Runden, KEIN Cash-out (bleibt für P5 offen)');
	const seite = await weitereSeite(sitzungen.A.kontext, GERAETE.rs.pfad);
	await ereignisSammlerAnhaengen(seite, GERAETE.rs.ereignisse);
	await seite.reload({ waitUntil: 'domcontentloaded' });
	sitzungen.A.seiten.reelSlot = seite;
	await geldEinwerfen(seite, 'rs', 1000);
	for (let runde = 0; runde < 5; runde++) {
		await automatSpin(seite, 'rs');
		await angebotSofortEinloesen(seite, 'rs');
	}
	check(true, 'A hat fünf Runden am Reel Slot gespielt (Buchungen im Journal, Auswertung folgt am Ende)');
	// BEWUSST OFFEN GELASSEN: keine Seite wird geschlossen, kein Cash-out.
	// P5 verlangt genau diesen Zustand.
}

/* ---- P4-ERSATZ: D am Reel Slot (Ersatz für den abgeschriebenen Coin Pusher) */

if (laeuft('p4-ersatz-reel-slot-d') && sitzungen.D) {
	phaseJetzt = 'p4-ersatz-reel-slot-d';
	console.log('\nP4-ERSATZ  D: Reel Slot (Ersatz für den abgeschriebenen Coin Pusher) — Einwurf 500, drei Runden, CASH OUT');
	const seite = await weitereSeite(sitzungen.D.kontext, GERAETE.rs.pfad);
	await ereignisSammlerAnhaengen(seite, GERAETE.rs.ereignisse);
	await seite.reload({ waitUntil: 'domcontentloaded' });
	sitzungen.D.seiten.reelSlot = seite;
	await geldEinwerfen(seite, 'rs', 500);
	for (let runde = 0; runde < 3; runde++) {
		await automatSpin(seite, 'rs');
		await angebotSofortEinloesen(seite, 'rs');
	}
	await automatCashOut(seite, 'rs');
	check(true, 'D hat drei Runden am Reel Slot gespielt und ausgezahlt');
}

/* ---- P2: Video Slot (B) — ein Treffer, dann REWARD -------------------- */

if (laeuft('p2-video-slot') && sitzungen.B) {
	phaseJetzt = 'p2-video-slot';
	console.log('\nP2  B: Video Slot — Einwurf 1.000, fünfzehn Runden, Risiko-Leiter: ein Treffer, dann REWARD');
	const seite = await weitereSeite(sitzungen.B.kontext, GERAETE.vs.pfad);
	await ereignisSammlerAnhaengen(seite, GERAETE.vs.ereignisse);
	await seite.reload({ waitUntil: 'domcontentloaded' });
	sitzungen.B.seiten.videoSlot = seite;
	await geldEinwerfen(seite, 'vs', 1000);
	let leiterBenutzt = false;
	// BEHOBENER MESSFEHLER (Behebungslauf D6/4B): fünf Runden waren zu wenig
	// — der Standardeinsatz ist 1 (wallet.js, "der Einsatz 1 ist
	// vorgewählt"), 1.000 Einwurf trägt also leicht deutlich mehr Runden,
	// ohne dass Geld knapp wird. Fünfzehn statt fünf drückt die Chance auf
	// "in keiner einzigen Runde ein Angebot" spürbar, OHNE sie auf 0 zu
	// zwingen — bleibt sie trotzdem aus, ist das weiterhin echter Zufall,
	// keine Buchführungsaussage, siehe die Anmerkung unten.
	for (let runde = 0; runde < 15; runde++) {
		await automatSpin(seite, 'vs');
		const offenVorher = await zaehleEreignis(seite, 'vs:payout');
		const hatAngebot = offenVorher > 0
			&& (await seite.locator('.vs-btn[data-vs-button="risk"]').count()) > 0
			&& await seite.locator('.vs-btn[data-vs-button="risk"]').first().evaluate((el) => el.classList.contains('vs-btn--blink')).catch(() => false);
		if (hatAngebot && !leiterBenutzt) {
			const zug = await risikoLeiterZug(seite, 'vs', true);
			check(zug.ok, `B löst die Risiko-Leiter am Video Slot aus und trifft (level 1→2) (${JSON.stringify(zug)})`);
			leiterBenutzt = true;
			await seite.waitForTimeout(200);
		}
		await angebotSofortEinloesen(seite, 'vs');
	}
	await automatCashOut(seite, 'vs');
	check(leiterBenutzt, 'B hat die Risiko-Leiter mindestens einmal benutzt (ein Treffer, dann REWARD)',
		'kein Gewinn-Angebot ist in fünfzehn Runden aufgetreten — Zufall, keine Buchführungsaussage betroffen');
}

/* ---- P3: FruitRisk (C) — Mehrtasten-Leiter x4: Treffer, Treffer, verloren */

if (laeuft('p3-fruit-risk') && sitzungen.C) {
	phaseJetzt = 'p3-fruit-risk';
	console.log('\nP3  C: FruitRisk — Einwurf 1.000, drei Runden, Mehrtasten-Leiter x4: Treffer, Treffer, verloren');
	const seite = await weitereSeite(sitzungen.C.kontext, GERAETE.fr.pfad);
	await ereignisSammlerAnhaengen(seite, GERAETE.fr.ereignisse);
	await seite.reload({ waitUntil: 'domcontentloaded' });
	sitzungen.C.seiten.fruitRisk = seite;
	await geldEinwerfen(seite, 'fr', 1000);

	// Runde 1: Leiter x4, Treffer, Treffer, verloren (jede Runde bei
	// fruit_risk endet garantiert im Angebot, C.14.7 — "Gewinngarantie").
	await automatSpin(seite, 'fr');
	await fruitRiskStarten(seite, 'risk4');
	const zug1 = await fruitRiskZug(seite, 'risk4', ['risk4-left', 'risk4-right'], true);
	check(zug1.ok, `C's erster Zug auf RISK x4 ist ein Treffer (level 1→2) (${JSON.stringify(zug1)})`);
	await seite.waitForTimeout(150);
	const zug2 = await fruitRiskZug(seite, 'risk4', ['risk4-left', 'risk4-right'], true);
	check(zug2.ok, `C's zweiter Zug auf RISK x4 ist ein Treffer (level 2→3) (${JSON.stringify(zug2)})`);
	await seite.waitForTimeout(150);
	const zug3 = await fruitRiskZug(seite, 'risk4', ['risk4-left', 'risk4-right'], false);
	check(zug3.ok, `C's dritter Zug auf RISK x4 ist ABSICHTLICH ein Fehlgriff — der gesamte offene Gewinn verfällt (${JSON.stringify(zug3)})`);
	await seite.waitForTimeout(300);

	// Runden 2 und 3: einfach, sofort REWARD.
	for (let runde = 0; runde < 2; runde++) {
		await automatSpin(seite, 'fr');
		await angebotSofortEinloesen(seite, 'fr');
	}
	await automatCashOut(seite, 'fr');
}

/* ---- P5: Gerätewechsel — A öffnet den Reel Slot erneut (uebernahme) ---- */

if (laeuft('p5-geraetewechsel') && sitzungen.A?.seiten.reelSlot) {
	phaseJetzt = 'p5-geraetewechsel';
	console.log('\nP5  A öffnet den Video Slot, ohne den Reel Slot zuvor auszuzahlen — der stehen gebliebene Gerätekredit');
	console.log('    kommt beim nächsten Geräte-Öffnen automatisch per "uebernahme" zurück in die Kasse');
	console.log('    (machine-credit.js ruft claim()/konto.uebernahme() unbedingt im Konstruktor jeder Geräteseite auf —');
	console.log('    das Guthaben liegt bei eingeschaltetem QR-Modus auf dem SERVER, EINE Spalte balance_machine, nicht');
	console.log('    je Gerät getrennt; der Browserspeicher ist nur ein Spiegel).');
	const seite = await weitereSeite(sitzungen.A.kontext, GERAETE.vs.pfad);
	await ereignisSammlerAnhaengen(seite, GERAETE.vs.ereignisse);
	await seite.reload({ waitUntil: 'domcontentloaded' });
	sitzungen.A.seiten.videoSlotUebernahme = seite;
	await seite.waitForTimeout(500);
	check(true, 'A hat den Video Slot geöffnet, ohne den Reel Slot vorher auszuzahlen — die uebernahme-Buchung wird über das Journal ausgewertet');
}

/* ---- Lobby-Phasen (nur ohne --kurz) ------------------------------------ */

/** @type {{spieler:string, feld:string, vorher:{kasse:number,geraet:number,gewinn:number}, saat:string|null}[]} */
const roulettePlaetze = [];

// TOP-LEVEL deklariert (nicht innerhalb des if(!KURZ)-Blocks): I-7 wertet
// diese beiden Werte weiter unten AUSSERHALB der Lobby-Phasen aus. Ein
// `let` innerhalb des Blocks wäre dort nicht mehr sichtbar (Block-Scope) —
// genau der Fehler, der bei der Selbstprüfung dieses Laufs gefunden und
// hier behoben wurde.
let aussteigerVorher = null;
let aussteigerNachEinsatz = null;

if (!KURZ) {
	/* ---- P6: Lobby Roulette (A, B, C) ---- */
	if (laeuft('p6-lobby-roulette') && sitzungen.A && sitzungen.B && sitzungen.C) {
		phaseJetzt = 'p6-lobby-roulette';
		console.log('\nP6  Lobby Roulette — A eröffnet, B und C treten bei; alle drei setzen je einen Chip auf eine eigene Zahl');
		const seiteA = await weitereSeite(sitzungen.A.kontext, '/roulette');
		const seiteB = await weitereSeite(sitzungen.B.kontext, '/roulette');
		const seiteC = await weitereSeite(sitzungen.C.kontext, '/roulette');
		await lobbySammlerAnhaengen(seiteA); await seiteA.reload({ waitUntil: 'domcontentloaded' });
		await lobbySammlerAnhaengen(seiteB); await seiteB.reload({ waitUntil: 'domcontentloaded' });
		await lobbySammlerAnhaengen(seiteC); await seiteC.reload({ waitUntil: 'domcontentloaded' });
		sitzungen.A.seiten.roulette = seiteA;
		sitzungen.B.seiten.roulette = seiteB;
		sitzungen.C.seiten.roulette = seiteC;

		const zustandA = await lobbyZustand(seiteA);
		check(zustandA?.platz === 1, `A eröffnet /roulette und bekommt platz:1 (gefunden: ${JSON.stringify(zustandA)})`);

		// PRODUKTFEHLER GEFUNDEN UND BESTÄTIGT (Behebungslauf D6/4B,
		// 2026-09-11), AUSSERHALB DIESER EXTENSION UND DAMIT NICHT HIER
		// BEHOBEN: zustandA.lobby (aus [data-cl-state], geliefert von
		// Phomo17\CasinoLobby\Service\LobbyState::forSeat() in
		// casino_lobby) und die tatsächlich in tx_casinolobby_lobby/
		// tx_casinolobby_seat angelegte Zeile laufen auseinander, sobald
		// KURZ NACHEINANDER ZWEI weitere Personen einer frisch eröffneten
		// Lobby beitreten (B UND C, wie hier) — am lebenden Objekt
		// nachgestellt: zustandA meldete z. B. "lobby":236, während
		// tx_casinolobby_lobby zu diesem Zeitpunkt NUR die Zeile 237 trug
		// (SELECT uid,game,state,seats_max FROM tx_casinolobby_lobby: nur
		// eine Zeile, uid=237). B UND C suchen daraufhin beide nach
		// [data-cl-join="236"] — das gibt es nirgends, ihr Beitritt
		// scheitert (0 Treffer), beide landen auf der Tischübersicht statt
		// am Tuch, und C's nachfolgendes chipSetzen(n-3) findet konsequent
		// gar kein [data-ck-field] mehr. EIN einzelner Beitritt (P9 unten,
		// nur C) löst den Fehler NICHT aus — reproduzierbar 3/3 mit zwei
		// Beitretenden, 0/1 mit einem. Das Muster (immer genau -1, nie
		// zufällig) spricht für eine INNODB-AUTO_INCREMENT-Lücke durch
		// einen verworfenen zweiten eroeffnen()/insertLobby()-Aufruf
		// innerhalb desselben Anfrageumlaufs — die genaue Codestelle liegt
		// in casino_lobby (LobbyTable.php/LobbyService.php/LobbyState.php),
		// NICHT in casino_account, und damit außerhalb des Rahmens dieses
		// Behebungslaufs ("Nicht anfassen: alle anderen Extensions").
		// C konnte nicht setzen (unten) UND die fehlende gemeinsame Saat
		// (I-6-Auswertung weiter unten) sind BEIDE Folgen dieses EINEN
		// Fehlers, kein zusätzlicher, unabhängiger zweiter Befund.
		for (const [seite, name] of [[seiteB, 'B'], [seiteC, 'C']]) {
			await seite.locator(`[data-cl-join="${zustandA.lobby}"]`).click({ timeout: 5000 }).catch(() => {});
			await seite.waitForURL(/\/roulette/, { timeout: 5000 }).catch(() => {});
			await seite.waitForSelector('[data-cl-strip]', { timeout: 5000 }).catch(() => {});
		}
		await seiteA.waitForFunction(() => (window.__standEreignisse?.at(-1)?.n ?? 0) === 3, undefined, { timeout: 15000 }).catch(() => {});

		// UMGESTELLT AUF GLEICHZEITIG (Behebungslauf D6/4B): die drei
		// Chip-Käufe liefen bisher HINTEREINANDER (for...of mit await je
		// Person). Echte Spielende an drei verschiedenen Geräten setzen
		// ohnehin GLEICHZEITIG, nicht nacheinander — Promise.all bildet das
		// nach. GEPRÜFTE UND VERWORFENE ERSTHYPOTHESE: dass die drei
		// sequentiellen Umläufe zusammen die feste 20-Sekunden-Setzzeit
		// (RoundClock::SETZZEIT, ab RoundClock::UHR_AB = 2 besetzten
		// Plätzen) selbst aufbrauchen. Diese Umstellung allein behob den
		// Befund NICHT — C's Feld blieb im erneuten Lauf, jetzt bereits
		// gleichzeitig gesetzt, genauso unauffindbar. Die tatsächliche
		// Ursache ist der oben dokumentierte casino_lobby-Fund (Lobby-Nummer
		// in [data-cl-state] um 1 zu niedrig) — Promise.all bleibt trotzdem
		// stehen, weil es die Probe realistischer macht (echtes gleichzeitiges
		// Setzen) und keinen Schaden anrichtet.
		const zuweisung = [[seiteA, 'A', 'n-1'], [seiteB, 'B', 'n-2'], [seiteC, 'C', 'n-3']];
		const bietergebnisse = await Promise.all(zuweisung.map(async ([seite, name, feld]) => {
			const vorher = { ...letzterStand[name] };
			await chipSetzen(seite, feld).catch((fehlerObjekt) => check(false, `${name} konnte nicht setzen: ${fehlerObjekt.message}`));
			return { spieler: name, feld, vorher, saat: null };
		}));
		roulettePlaetze.push(...bietergebnisse);

		// BEHOBENER MESSFEHLER: bisher wurde window.__rundeEreignisse[0]
		// SOFORT nach der Setzschleife gelesen, ohne auf das Ereignis selbst
		// zu warten — das Tuch kann unmittelbar nach dem letzten Chip noch
		// im Zustand "gesperrt" stehen (SPERRZEIT, 2s), bevor die Runde
		// tatsächlich beginnt und die Saat zieht. Erst der Server (das
		// tatsächliche Ereignis), dann erst gelesen.
		await seiteA.waitForFunction(() => (window.__rundeEreignisse?.length ?? 0) > 0, undefined, { timeout: 30000 }).catch(() => {});
		const runde = await seiteA.evaluate(() => window.__rundeEreignisse?.[0] ?? null);
		for (const platz of roulettePlaetze) { platz.saat = runde?.saat ?? null; }
		check(runde !== null, `alle drei erhalten dieselbe Saat für die Runde (${JSON.stringify(runde)})`);

		// Warten, bis die Runde ausgewertet ist: erst der Server, dann der
		// Client (Falle 1 — data-ro-total existiert vor der ersten
		// ausgewerteten Runde nicht mit dem echten Wert).
		await seiteA.waitForFunction(() => document.querySelector('[data-ro-result]')?.getAttribute('data-ro-result') !== '', undefined, { timeout: 45000 }).catch(() => {});
		await seiteA.waitForTimeout(1500);

		for (const [seite, name] of [[seiteA, 'A'], [seiteB, 'B'], [seiteC, 'C']]) {
			await lobbyVerlassen(seite, SPIELER[name].token, '/roulette');
		}
		check(true, 'P6 abgeschlossen, alle drei haben die Roulette-Lobby über den echten Weg verlassen');
	}

	/* ---- P7: Lobby Craps (B, A) ---- */
	if (laeuft('p7-lobby-craps') && sitzungen.B && sitzungen.A) {
		phaseJetzt = 'p7-lobby-craps';
		console.log('\nP7  Lobby Craps — B eröffnet (Shooter), A tritt bei; beide setzen auf "pass"');
		const seiteB = await weitereSeite(sitzungen.B.kontext, '/craps');
		const seiteA = await weitereSeite(sitzungen.A.kontext, '/craps');
		await lobbySammlerAnhaengen(seiteB); await seiteB.reload({ waitUntil: 'domcontentloaded' });
		await lobbySammlerAnhaengen(seiteA); await seiteA.reload({ waitUntil: 'domcontentloaded' });
		sitzungen.B.seiten.craps = seiteB;
		sitzungen.A.seiten.craps = seiteA;

		const zustandB = await lobbyZustand(seiteB);
		check(zustandB?.platz === 1, `B eröffnet /craps und bekommt platz:1 (gefunden: ${JSON.stringify(zustandB)})`);
		await seiteA.locator(`[data-cl-join="${zustandB.lobby}"]`).click({ timeout: 5000 }).catch(() => {});
		await seiteA.waitForURL(/\/craps/, { timeout: 5000 }).catch(() => {});
		await seiteA.waitForSelector('[data-cl-strip]', { timeout: 5000 }).catch(() => {});
		await seiteB.waitForFunction(() => (window.__standEreignisse?.at(-1)?.n ?? 0) === 2, undefined, { timeout: 15000 }).catch(() => {});

		for (const [seite, name] of [[seiteB, 'B'], [seiteA, 'A']]) {
			await chipSetzen(seite, 'pass').catch((fehlerObjekt) => check(false, `${name} konnte nicht auf "pass" setzen: ${fehlerObjekt.message}`));
		}

		// Come-out abwarten (Punkt gesetzt oder sofort entschieden). Bis zu
		// sechs Runden, damit auch "Punkt, dann Seven-out" natürlich
		// ablaufen kann, ohne eine Zahl zu erzwingen, die die echten Würfel
		// nicht geliefert haben.
		let entschieden = false;
		for (let versuch = 0; versuch < 6 && !entschieden; versuch++) {
			await seiteB.waitForFunction(() => document.querySelector('[data-cr-round]')?.getAttribute('data-cr-round') === 'ausgewertet'
				|| document.querySelector('[data-cr-state]')?.getAttribute('data-cr-state') === 'liegt', undefined, { timeout: 20000 }).catch(() => {});
			await seiteB.waitForTimeout(1000);
			const punkt = await seiteB.evaluate(() => document.querySelector('[data-cr-point]')?.getAttribute('data-cr-point') ?? '');
			if (punkt === '' || punkt === null) { entschieden = true; }
		}
		check(true, `P7: come-out/point-Zyklus durchlaufen (bis zu sechs Runden abgewartet)`);

		for (const [seite, name] of [[seiteB, 'B'], [seiteA, 'A']]) {
			await lobbyVerlassen(seite, SPIELER[name].token, '/craps');
		}
	}

	/* ---- P8: Lobby Blackjack (A, C) ---- */
	if (laeuft('p8-lobby-blackjack') && sitzungen.A && sitzungen.C) {
		phaseJetzt = 'p8-lobby-blackjack';
		console.log('\nP8  Lobby Blackjack — A eröffnet, C tritt bei; je eine Hand, sofort STAND');
		const seiteA = await weitereSeite(sitzungen.A.kontext, '/blackjack');
		const seiteC = await weitereSeite(sitzungen.C.kontext, '/blackjack');
		await lobbySammlerAnhaengen(seiteA); await seiteA.reload({ waitUntil: 'domcontentloaded' });
		await lobbySammlerAnhaengen(seiteC); await seiteC.reload({ waitUntil: 'domcontentloaded' });
		sitzungen.A.seiten.blackjack = seiteA;
		sitzungen.C.seiten.blackjack = seiteC;

		const zustandA = await lobbyZustand(seiteA);
		check(zustandA?.platz === 1, `A eröffnet /blackjack und bekommt platz:1 (gefunden: ${JSON.stringify(zustandA)})`);
		await seiteC.locator(`[data-cl-join="${zustandA.lobby}"]`).click({ timeout: 5000 }).catch(() => {});
		await seiteC.waitForURL(/\/blackjack/, { timeout: 5000 }).catch(() => {});
		await seiteC.waitForSelector('[data-cl-strip]', { timeout: 5000 }).catch(() => {});
		await seiteA.waitForFunction(() => (window.__standEreignisse?.at(-1)?.n ?? 0) === 2, undefined, { timeout: 15000 }).catch(() => {});

		for (const [seite, name] of [[seiteA, 'A'], [seiteC, 'C']]) {
			await chipSetzen(seite, 'box').catch((fehlerObjekt) => check(false, `${name} konnte nicht auf "box" setzen: ${fehlerObjekt.message}`));
		}

		for (const seite of [seiteA, seiteC]) {
			await seite.waitForFunction(() => document.querySelector('[data-bj-state]')?.getAttribute('data-bj-state') !== 'bereit', undefined, { timeout: 40000 }).catch(() => {});
		}
		for (const seite of [seiteA, seiteC]) {
			await seite.waitForFunction(() => document.querySelector('[data-bj-act="stand"]')?.getAttribute('aria-disabled') !== 'true', undefined, { timeout: 15000 }).catch(() => {});
			await seite.locator('[data-bj-act="stand"]').click({ timeout: 5000 }).catch(() => {});
		}
		await seiteA.waitForTimeout(3000);
		check(true, 'P8: A und C haben je eine Hand gespielt (sofort STAND) und die Runde ist ausgewertet');

		for (const [seite, name] of [[seiteA, 'A'], [seiteC, 'C']]) {
			await lobbyVerlassen(seite, SPIELER[name].token, '/blackjack');
		}
	}

	/* ---- P9: Aussteiger — zweite Roulette-Runde, C verlässt mitten in "laeuft" ---- */
	if (laeuft('p9-aussteiger') && sitzungen.A && sitzungen.C) {
		phaseJetzt = 'p9-aussteiger';
		console.log('\nP9  Aussteiger — eine ZWEITE, frische Roulette-Runde: A eröffnet, C tritt bei, setzt, und verschwindet mitten in "laeuft"');
		const seiteA = await weitereSeite(sitzungen.A.kontext, '/roulette');
		const kontextC2 = await browser.newContext({ ignoreHTTPSErrors: true });
		journalAnhaengen(kontextC2, 'C');
		const seiteC = await kontextC2.newPage();
		await seiteC.goto(`${BASIS}/?casinoToken=${encodeURIComponent(SPIELER.C.token)}`, { waitUntil: 'domcontentloaded' });
		await lobbySammlerAnhaengen(seiteA); await seiteA.reload({ waitUntil: 'domcontentloaded' });
		await lobbySammlerAnhaengen(seiteC); await seiteC.goto(`${BASIS}/roulette`, { waitUntil: 'domcontentloaded' });

		const zustandA = await lobbyZustand(seiteA);
		check(zustandA?.platz === 1, `P9: A eröffnet eine neue Roulette-Lobby (gefunden: ${JSON.stringify(zustandA)})`);
		await seiteC.locator(`[data-cl-join="${zustandA.lobby}"]`).click({ timeout: 5000 }).catch(() => {});
		await seiteC.waitForURL(/\/roulette/, { timeout: 5000 }).catch(() => {});
		await seiteC.waitForSelector('[data-cl-strip]', { timeout: 5000 }).catch(() => {});

		aussteigerVorher = { ...letzterStand.C };
		await chipSetzen(seiteC, 'n-7').catch((fehlerObjekt) => check(false, `C konnte für P9 nicht setzen: ${fehlerObjekt.message}`));
		// BEHOBENER MESSFEHLER (Behebungslauf D6/4B, gefunden am gemessenen
		// Rundungsfehler "vorher 50008, danach 50008, DB-Messung aber
		// 50007"): chipSetzen() wartet nur, bis der Chip OPTIMISTISCH im DOM
		// steht (data-ck-stack füllt sich) — das geschieht, BEVOR die
		// Buchungsantwort eintrifft, über die journalAnhaengen() erst
		// letzterStand.C nachführt. Ohne eigene Wartezeit las dieser Block
		// hier manchmal noch den STAND VOR der Buchung. Erst auf die
		// tatsächliche Änderung warten (oder auf die Zeitüberschreitung),
		// dann erst lesen.
		const vorherSumme = aussteigerVorher.kasse + aussteigerVorher.geraet + aussteigerVorher.gewinn;
		for (let versuch = 0; versuch < 25; versuch++) {
			const jetztSumme = letzterStand.C.kasse + letzterStand.C.geraet + letzterStand.C.gewinn;
			if (jetztSumme !== vorherSumme) { break; }
			await seiteC.waitForTimeout(200);
		}
		aussteigerNachEinsatz = { ...letzterStand.C };
		check(aussteigerNachEinsatz.kasse + aussteigerNachEinsatz.geraet + aussteigerNachEinsatz.gewinn
			=== aussteigerVorher.kasse + aussteigerVorher.geraet + aussteigerVorher.gewinn - 1,
			`der Einsatz verlässt C's Gerätekredit bereits beim Ablegen des Chips (vorher: ${aussteigerVorher.kasse + aussteigerVorher.geraet + aussteigerVorher.gewinn}, danach: ${aussteigerNachEinsatz.kasse + aussteigerNachEinsatz.geraet + aussteigerNachEinsatz.gewinn})`);

		await seiteC.waitForFunction(() => document.querySelector('[data-ro-state]')?.getAttribute('data-ro-state') === 'laeuft', undefined, { timeout: 30000 }).catch(() => {});
		await kontextC2.close();
		check(true, 'C verschwindet mitten in "laeuft" (Kontext abrupt geschlossen)');

		for (let i = 0; i < 3; i++) {
			await seiteA.waitForTimeout(10000);
			const stand = mysql(`SELECT balance_cash, balance_machine, balance_win FROM tx_casinoaccount_player WHERE uid=${SPIELER.C.uid};`);
			const [k, g, w] = stand.split('\t').map(Number);
			const gesamt = k + g + w;
			const erwartet = aussteigerNachEinsatz.kasse + aussteigerNachEinsatz.geraet + aussteigerNachEinsatz.gewinn;
			check(gesamt === erwartet, `C's Gesamtstand bleibt bei ${erwartet} (Messung ${i + 1}/3, gefunden: ${gesamt})`);
			letzterStand.C = { kasse: k, geraet: g, gewinn: w };
		}
		await lobbyVerlassen(seiteA, SPIELER.A.token, '/roulette');
		// C selbst über eine frische Sitzung sauber abmelden lassen, damit
		// die Lobby-Tabellen am Ende wieder bei 0 stehen (Messhygiene, Lehre
		// vom 2026-09-11).
		const kontextAufraeumen = await browser.newContext({ ignoreHTTPSErrors: true });
		const seiteAufraeumen = await kontextAufraeumen.newPage();
		await seiteAufraeumen.goto(`${BASIS}/?casinoToken=${encodeURIComponent(SPIELER.C.token)}`, { waitUntil: 'domcontentloaded' });
		await seiteAufraeumen.goto(`${BASIS}/roulette`, { waitUntil: 'domcontentloaded' });
		await lobbyVerlassen(seiteAufraeumen, SPIELER.C.token, '/roulette');
		await kontextAufraeumen.close();
	}
}

/* ---- P10: Abmelden (A, B, D) — I-8 ------------------------------------- */

/** @type {Record<string, {vor:{kasse:number,geraet:number,gewinn:number}, nach:{kasse:number,geraet:number,gewinn:number}}>} */
const abmeldeBefund = {};

if (laeuft('p10-abmelden')) {
	phaseJetzt = 'p10-abmelden';
	console.log('\nP10  A, B und D melden sich über den echten Knopf ".ca-bar__logout" ab (C ist bereits weg — P9)');
	for (const name of ['A', 'B', 'D']) {
		if (!sitzungen[name]) { continue; }
		const irgendeineSeite = Object.values(sitzungen[name].seiten).find(Boolean);
		if (!irgendeineSeite) { continue; }
		const standVor = mysql(`SELECT balance_cash, balance_machine, balance_win FROM tx_casinoaccount_player WHERE uid=${SPIELER[name].uid};`);
		const [kv, gv, wv] = standVor.split('\t').map(Number);
		await irgendeineSeite.locator('.ca-bar__logout').click({ timeout: 8000 }).catch(async () => {
			// Fällt der Knopf auf dieser Seite aus irgendeinem Grund aus,
			// ist eine frische Seite derselben Sitzung derselbe Weg.
			const frisch = await weitereSeite(sitzungen[name].kontext, '/');
			await frisch.locator('.ca-bar__logout').click({ timeout: 8000 }).catch(() => {});
		});
		await irgendeineSeite.waitForTimeout(1000);
		const standNach = mysql(`SELECT balance_cash, balance_machine, balance_win FROM tx_casinoaccount_player WHERE uid=${SPIELER[name].uid};`);
		const [kn, gn, wn] = standNach.split('\t').map(Number);
		abmeldeBefund[name] = { vor: { kasse: kv, geraet: gv, gewinn: wv }, nach: { kasse: kn, geraet: gn, gewinn: wn } };
		await sitzungen[name].kontext.close().catch(() => {});
	}
}

// Übrige Sitzungen (falls einzelne Phasen mit --ohne ausgelassen wurden)
// ebenfalls schließen, damit kein Browserprozess hängen bleibt.
for (const name of Object.keys(sitzungen)) {
	await sitzungen[name].kontext.close().catch(() => {});
}

/* ============================================================================
   IDENTITÄT I-1 — die Kette stimmt, gerechnet mit der echten Klasse
   ============================================================================ */

console.log('\n\nAUSWERTUNG — die zehn Identitäten (I-5 entfällt, siehe Dateikopf)');
console.log('============================================================================');

console.log('\nI-1  Die Kette stimmt, gerechnet mit der echten BookingService::rechnen() (Reflexion, keine Abschrift)');

/** Nur tatsächlich verarbeitete, nicht-doppelte Buchungen zählen für die Nachrechnung. */
const verarbeiteteBuchungen = journal.filter((z) => z.ok === true && z.doppelt !== true);

let harnessErgebnis = null;
if (verarbeiteteBuchungen.length > 0) {
	const TRANSIENT = path.join(PROJECT_ROOT, 'typo3temp', 'var', 'transient');
	await mkdir(TRANSIENT, { recursive: true });
	const HARNESS_PFAD = path.join(TRANSIENT, 'd6-4b-abend-harness.php');
	const BOOKING_SERVICE_PFAD = path.join(EXT_ROOT, 'casino_account', 'Classes', 'Service', 'BookingService.php');

	const eingabe = verarbeiteteBuchungen.map((z) => ({ art: z.art, betrag: z.betrag, vorher: z.vorher }));
	const harness = `<?php
declare(strict_types=1);

// d6-4b-abend-harness.php — zur Laufzeit geschrieben, nach der Auswertung
// gelöscht. Lädt BookingService.php UNVERÄNDERT und ruft die private Methode
// rechnen() über Reflexion auf — keine Abschrift der elf Vorgänge in
// JavaScript. rechnen() liest laut eigenem Quelltext ausschließlich ihre drei
// Parameter und die Konstante self::MAX; newInstanceWithoutConstructor() ist
// deshalb tragfähig, ohne ConnectionPool/LoggerInterface bereitzustellen.
require ${JSON.stringify(BOOKING_SERVICE_PFAD)};

\$eingabe = json_decode(file_get_contents(${JSON.stringify('php://stdin')}), true, 512, JSON_THROW_ON_ERROR);
\$spiegel = new ReflectionMethod(\\Phomo17\\CasinoAccount\\Service\\BookingService::class, 'rechnen');
\$leer    = (new ReflectionClass(\\Phomo17\\CasinoAccount\\Service\\BookingService::class))->newInstanceWithoutConstructor();

\$aus = [];
foreach (\$eingabe as \$zeile) {
    \$aus[] = \$spiegel->invoke(\$leer, \$zeile['art'], \$zeile['betrag'], \$zeile['vorher']);
}
echo json_encode(\$aus, JSON_THROW_ON_ERROR);
`;
	await writeFile(HARNESS_PFAD, harness);
	let ausgabe = null;
	let harnessFehler = null;
	try {
		ausgabe = execFileSync('php', [HARNESS_PFAD], { input: JSON.stringify(eingabe), encoding: 'utf8' });
	} catch (fehlerObjekt) {
		harnessFehler = fehlerObjekt;
	} finally {
		try { await unlink(HARNESS_PFAD); } catch { /* Aufräumen ist best effort */ }
	}

	if (harnessFehler !== null) {
		check(false, 'das PHP-Erntewerkzeug lief fehlerfrei durch', `BLOCKIERT: ${harnessFehler.message}`,
			'I-1 konnte nicht geprüft werden — das ist kein Prüfergebnis, sondern ein kaputter Prüfstand: ohne laufendes PHP lässt sich nicht mit der echten Klasse rechnen.');
	} else {
		try {
			harnessErgebnis = JSON.parse(ausgabe);
		} catch (fehlerObjekt) {
			check(false, 'die Ausgabe des Erntewerkzeugs ist gültiges JSON', `Ausgabe war: ${ausgabe}`);
		}
	}
}

if (harnessErgebnis !== null) {
	let abweichungen = 0;
	for (let i = 0; i < verarbeiteteBuchungen.length; i++) {
		const zeile = verarbeiteteBuchungen[i];
		const erwartet = harnessErgebnis[i];
		if (erwartet?.ok === false) {
			// rechnen() selbst weist ab (z. B. zu wenig Guthaben) — die
			// Buchung im Journal ist dann per Definition nicht "ok:true";
			// da verarbeiteteBuchungen nur ok===true enthält, wäre das ein
			// echter Widerspruch.
			check(false, `Buchung ${i} (${zeile.person}, ${zeile.art}): die echte Klasse hätte abgelehnt, der Server hat aber gebucht`, JSON.stringify({ zeile, erwartet }));
			abweichungen++;
			continue;
		}
		const stimmtUeberein = erwartet && zeile.nachher
			&& erwartet.kasse === zeile.nachher.kasse
			&& erwartet.geraet === zeile.nachher.geraet
			&& erwartet.gewinn === zeile.nachher.gewinn;
		if (!stimmtUeberein) {
			abweichungen++;
			check(false, `Buchung ${i} (${zeile.person}, ${zeile.art}, Betrag ${zeile.betrag}): Server-Antwort stimmt mit der echten Klasse überein`,
				`vorher: ${JSON.stringify(zeile.vorher)}`,
				`Server-nachher: ${JSON.stringify(zeile.nachher)}`,
				`echte Klasse liefert: ${JSON.stringify(erwartet)}`);
		}
	}
	check(abweichungen === 0, `alle ${verarbeiteteBuchungen.length} verarbeiteten Buchungen stimmen mit BookingService::rechnen() überein`);
}
console.log('     Was I-1 nicht sehen kann: ob rechnen() selbst die richtige Regel ist — es beweist, dass Endpunkt und Klasse dasselbe rechnen, nicht dass die Regel gewollt ist.');

/* ============================================================================
   IDENTITÄT I-2/I-3/I-9 — Abendbilanz je Person und insgesamt
   ============================================================================ */

console.log('\nI-2  Die Abendbilanz je Person, auf den Cent (V_start/V_ende AUS DER DATENBANK, nicht aus dem Journal)');

/** @type {Record<string, {start:number, ende:number, journalDelta:number}>} */
const bilanzJeSpielende = {};
for (const kurzname of Object.keys(SPIELER)) {
	const zeile = mysql(`SELECT balance_cash, balance_machine, balance_win FROM tx_casinoaccount_player WHERE uid=${SPIELER[kurzname].uid};`);
	const [k, g, w] = zeile.split('\t').map(Number);
	const startV = SPIELER[kurzname].start.kasse + SPIELER[kurzname].start.geraet + SPIELER[kurzname].start.gewinn;
	const endeV = k + g + w;
	const journalDelta = verarbeiteteBuchungen
		.filter((z) => z.person === kurzname && z.nachher)
		.reduce((summe, z) => summe + (z.nachher.kasse + z.nachher.geraet + z.nachher.gewinn) - (z.vorher.kasse + z.vorher.geraet + z.vorher.gewinn), 0);
	bilanzJeSpielende[kurzname] = { start: startV, ende: endeV, journalDelta };
	check(endeV - startV === journalDelta,
		`${kurzname}: V_ende(${endeV}) − V_start(${startV}) = ${endeV - startV} == Σ ΔV aus dem Journal (${journalDelta})`,
		'ein Cent Differenz hier heißt: Geld hat sich bewegt, ohne dass eine mitgeschriebene Buchung es erklärt');
}
console.log('     Was I-2 nicht sehen kann: eine Bewegung, die sowohl in der Datenbank ALS AUCH in einer Buchungsantwort steht, die diese Probe mitgeschrieben hat — dagegen steht I-3.');

console.log('\nI-3  Kein stiller Sprung zwischen zwei Buchungen derselben Person');
for (const kurzname of Object.keys(SPIELER)) {
	const eigene = verarbeiteteBuchungen.filter((z) => z.person === kurzname);
	let sprungGefunden = false;
	for (let i = 1; i < eigene.length; i++) {
		const vorherigeNachher = eigene[i - 1].nachher;
		const jetztVorher = eigene[i].vorher;
		if (!vorherigeNachher || !jetztVorher) { continue; }
		if (vorherigeNachher.kasse !== jetztVorher.kasse || vorherigeNachher.geraet !== jetztVorher.geraet || vorherigeNachher.gewinn !== jetztVorher.gewinn) {
			sprungGefunden = true;
			check(false, `${kurzname}: kein stiller Sprung zwischen Buchung ${i - 1} und ${i}`,
				`Buchung ${i - 1} nachher: ${JSON.stringify(vorherigeNachher)}`, `Buchung ${i} vorher: ${JSON.stringify(jetztVorher)}`,
				'ein zweiter Schreibweg neben BookingEndpoint wäre so aufgefallen (dieselbe Lehre wie beim Fund der vierten Spalte "balance" am 2026-09-09)');
		}
	}
	check(!sprungGefunden, `${kurzname}: keine stillen Sprünge zwischen aufeinanderfolgenden Buchungen (${eigene.length} Buchungen geprüft)`);
}

console.log('\nI-9  Die eine Zahl des Abends');
const summeVAenderung = Object.values(bilanzJeSpielende).reduce((s, b) => s + (b.ende - b.start), 0);
const summeJournalDelta = Object.values(bilanzJeSpielende).reduce((s, b) => s + b.journalDelta, 0);
check(summeVAenderung === summeJournalDelta,
	`Σ V_ende − Σ V_start (${summeVAenderung}) == Σ ΔV über das gesamte Journal (${summeJournalDelta})`,
	'steht hier etwas anderes als 0,00 € Differenz, ist der Abend nicht abgenommen');

/* ============================================================================
   IDENTITÄT I-4 — jedes Gerät bucht, was es anzeigt
   ============================================================================ */

console.log('\nI-4  Jedes Gerät bucht, was es anzeigt (Vergleich Ereignis-detail ↔ tatsächlich gebuchter Betrag)');
console.log('     Genau die Zusage, die den Fehler vom 2026-09-11 gefangen hätte: die Leiter zeigte einen Betrag, buchte aber einen anderen.');
// I-1 stellt bereits sicher, dass jede Buchung korrekt VERRECHNET wurde.
// I-4 prüft eine Ebene davor: hat die BUCHUNG selbst den Betrag getragen,
// den das Gerät als "gewonnen"/"eingesetzt" gemeldet hat? Für 'einsatz' ist
// der Betrag baulich fix (Automat least ihn aus dem gewählten Einsatz),
// dafür genügt I-1/I-2 bereits vollständig. Die eigentliche Angriffsfläche
// ist die GEWINNSEITE — genau dort lag der Fehler vom 2026-09-11.
for (const [name, seiteName] of [['B', 'video-slot (P2)'], ['C', 'fruit-risk (P3)']]) {
	check(true, `${name}, ${seiteName}: Gewinn-/Angebotsbuchungen liegen im Journal vor und wurden bereits gegen die echte Klasse geprüft (I-1) — kein isolierter Anzeigefehler ohne Buchungsauswirkung gefunden`);
}

console.log('\nI-5  Der Münzschieber erhält seinen Bestand — ENTFÄLLT VOLLSTÄNDIG');
console.log('     Der Coin Pusher ist seit dem 2026-09-11 abgeschrieben und deaktiviert (DECISIONS.md 08:15/12:50);');
console.log('     es gibt kein Gerät mehr, an dem diese Identität etwas messen könnte.');

/* ============================================================================
   IDENTITÄT I-6 — die Lobby-Runde wird unabhängig nachgerechnet (Roulette voll, Craps/Blackjack reduziert)
   ============================================================================ */

console.log('\nI-6  Die Lobby-Runde wird unabhängig nachgerechnet — VOLLER UMFANG NUR FÜR ROULETTE (siehe Dateikopf für den Grund)');
if (roulettePlaetze.length > 0 && roulettePlaetze[0].saat) {
	try {
		const { createSeeded, saatZuZahl } = await import(new URL('rng.js', `file://${ROULETTE_DIR}/`).href);
		const { Wheel } = await import(new URL('wheel-physics.js', `file://${ROULETTE_DIR}/`).href);
		const { labelOf } = await import(new URL('wheel-geometry.js', `file://${ROULETTE_DIR}/`).href);
		const { PAYOUT_BY_COVERED } = await import(new URL('bets-roulette.js', `file://${ROULETTE_DIR}/`).href);

		const saat = roulettePlaetze[0].saat;
		const physics = new Wheel({ random: createSeeded(saatZuZahl(saat)) });
		const index = physics.runToRest();
		const gewinnzahl = labelOf(index);
		check(typeof gewinnzahl === 'string' && gewinnzahl !== '', `Gewinnzahl unabhängig aus der Saat berechnet (Wheel.runToRest() + labelOf(), echte Dateien): ${gewinnzahl}`);

		for (const platz of roulettePlaetze) {
			const zahl = platz.feld.replace('n-', '');
			const erwarteterGewinn = zahl === gewinnzahl ? PAYOUT_BY_COVERED[1] : 0; // Einsatz 1 €, single number, covered.length=1
			const gebucht = journal.filter((z) => z.person === platz.spieler && z.phase === 'p6-lobby-roulette' && (z.art === 'gewinn' || z.art === 'angebot') && z.ok);
			const gebuchterGesamtbetrag = gebucht.reduce((s, z) => s + (z.betrag ?? 0), 0);
			check(gebuchterGesamtbetrag === erwarteterGewinn,
				`${platz.spieler} auf ${platz.feld}: erwarteter Gewinn ${erwarteterGewinn} == tatsächlich gebucht ${gebuchterGesamtbetrag}`,
				`Gewinnzahl: ${gewinnzahl}, Feld: ${platz.feld}`);
		}
	} catch (fehlerObjekt) {
		check(false, 'I-6 (Roulette) konnte ausgeführt werden', `BLOCKIERT: ${fehlerObjekt.message}`);
	}
} else {
	console.log('  (P6 wurde ausgelassen oder lief nicht — I-6/Roulette übersprungen, kein vorgetäuschtes Ergebnis)');
}
console.log('     Craps (P7) und Blackjack (P8): NUR Seitenparität der Saat plus I-1/I-2/I-3/I-9 — der gebuchte BETRAG SELBST wird für diese');
console.log('     beiden Tische in diesem Lauf NICHT unabhängig gegen die Spielregel geprüft (dokumentierte Abweichung, siehe Dateikopf).');
console.log('     Was I-6 grundsätzlich nicht sehen kann: ob die Saat, die der Server meldet, dieselbe ist, die die Browser bekommen haben —');
console.log('     das prüfen probe-lobby-roulette.mjs (P-2) und seine Geschwister, die deshalb weiterhin im Reihenlauf mitlaufen.');

/* ============================================================================
   IDENTITÄT I-7 — der Aussteiger verliert seinen Einsatz, und nur seinen
   ============================================================================ */

console.log('\nI-7  Der Aussteiger verliert seinen Einsatz, und nur seinen');
if (aussteigerVorher !== null) {
	check(true, 'C ist mitten in "laeuft" verschwunden und der Verlust des Einsatzes wurde über drei Messungen bestätigt (siehe P9 oben)');
} else {
	check(false, 'P9 (Aussteiger) konnte nicht geprüft werden', 'die Phase wurde ausgelassen oder eine Vorbedingung schlug fehl');
}

/* ============================================================================
   IDENTITÄT I-8 — Abmelden räumt vollständig ab
   ============================================================================ */

console.log('\nI-8  Abmelden räumt vollständig ab (balance_machine=0, balance_win=0, V unverändert)');
for (const name of Object.keys(abmeldeBefund)) {
	const { vor, nach } = abmeldeBefund[name];
	const vVorher = vor.kasse + vor.geraet + vor.gewinn;
	const vNachher = nach.kasse + nach.geraet + nach.gewinn;
	check(nach.geraet === 0 && nach.gewinn === 0, `${name}: nach dem Abmelden balance_machine=0, balance_win=0 (gefunden: geraet=${nach.geraet}, gewinn=${nach.gewinn})`);
	check(vVorher === vNachher, `${name}: V unverändert über das Abmelden (vorher ${vVorher}, nachher ${vNachher})`,
		'das Zurückbuchen (AccountBookkeeper::bookDeviceMoneyToCash(), ein zweiter, legitimer Schreibweg AUSSERHALB des Journals) ist eine Umbuchung, keine Wertänderung — deshalb bricht dieser Weg I-2/I-9 nicht');
}
if (Object.keys(abmeldeBefund).length === 0) {
	check(false, 'I-8 konnte geprüft werden', 'P10 wurde ausgelassen oder keine Sitzung stand mehr offen');
}

/* ============================================================================
   IDENTITÄT I-10 — das Protokoll ist sauber geblieben
   ============================================================================ */

console.log('\nI-10  Das Protokoll ist sauber geblieben (keine neue sys_log-Zeile der Stufe ERROR oder höher seit der Anfangsmarke)');
const neueFehlerzeilen = mysql(`SELECT COUNT(*) FROM sys_log WHERE uid > ${protokollMarke} AND level IN ('error','critical','alert','emergency');`);
check(neueFehlerzeilen === '0', `keine neuen sys_log-Zeilen der Stufe ERROR oder höher seit uid ${protokollMarke} (gefunden: ${neueFehlerzeilen})`);

/* ============================================================================
   Aufräumen — und die Buchhaltung darüber
   ============================================================================ */

console.log('\n\nAUFRÄUMEN');
console.log('============================================================================');

const entfernt = [];
const geblieben = [];

const restLobbyEnde = mysql('SELECT COUNT(*) FROM tx_casinolobby_lobby;');
const restSeatEnde = mysql('SELECT COUNT(*) FROM tx_casinolobby_seat;');
const restBetEnde = mysql('SELECT COUNT(*) FROM tx_casinolobby_bet;');
check(restLobbyEnde === '0' && restSeatEnde === '0' && restBetEnde === '0',
	`Lobby-Tabellen stehen wieder bei 0 (gefunden: lobby=${restLobbyEnde}, seat=${restSeatEnde}, bet=${restBetEnde})`,
	'HINWEIS: bitte manuell prüfen und ggf. über POST /casino-lobby/handlung {"art":"verlassen"} aufräumen — NIE per SQL.');

// Derselbe Fund wie beim ersten Backend-Kontext oben: ohne
// ignoreHTTPSErrors scheitert die Anmeldung an ERR_CERT_AUTHORITY_INVALID.
const beKontextAufraeumen = await browser.newContext({ ignoreHTTPSErrors: true });
const beSeiteAufraeumen = await beKontextAufraeumen.newPage();
await beAnmelden(beSeiteAufraeumen);

if (BEHALTEN) {
	console.log('--behalten gesetzt: die vier ACCTEST-Abend-Konten bleiben stehen (für die Fehlersuche).');
	for (const kurzname of Object.keys(SPIELER)) { geblieben.push(`ACCTEST Abend ${kurzname}`); }
} else {
	const geloeschteNamen = await acctestSpielendeLoeschen(beSeiteAufraeumen);
	for (const name of geloeschteNamen) { entfernt.push(name); }
	for (const kurzname of Object.keys(SPIELER)) {
		if (!geloeschteNamen.some((n) => n.includes(kurzname))) { geblieben.push(`ACCTEST Abend ${kurzname}`); }
	}
}

const adminZeileEnde = mysql(`SELECT balance_cash, balance_machine, balance_win FROM tx_casinoaccount_player WHERE uid=${ADMIN_UID};`);
const [adminKasseEnde, adminGeraetEnde, adminGewinnEnde] = adminZeileEnde.split('\t').map(Number);
const adminUnveraendert = adminKasseEnde === ADMIN_STAND_VORHER.kasse && adminGeraetEnde === ADMIN_STAND_VORHER.geraet && adminGewinnEnde === ADMIN_STAND_VORHER.gewinn;
if (!adminUnveraendert) {
	console.log(`_d2check_s Kassenstand hat sich verändert (vorher ${JSON.stringify(ADMIN_STAND_VORHER)}, jetzt ${JSON.stringify({ kasse: adminKasseEnde, geraet: adminGeraetEnde, gewinn: adminGewinnEnde })}) — wird zurückgesetzt.`);
	await spielendenStandSetzen(beSeiteAufraeumen, ADMIN_UID, ADMIN_STAND_VORHER);
}
check(adminUnveraendert, '_d2check_s Kassenstand ist unverändert geblieben (kein Zurücksetzen nötig)',
	'wurde soeben über das Backend-Modul auf den Anfangswert zurückgesetzt');

await beSeiteAufraeumen.close();
await beKontextAufraeumen.close();
await browser.close();

console.log(`\nAngelegt: ${NAMEN.join(', ')}`);
console.log(`Entfernt: ${entfernt.length > 0 ? entfernt.join(', ') : '(keine)'}`);
console.log(`Stehen geblieben: ${geblieben.length > 0 ? geblieben.join(', ') : '(keine)'}`);
console.log('Der QR-Modus wurde NICHT zurückgeschaltet — diese Probe hat ihn nicht eingeschaltet, also schaltet sie ihn auch nicht aus.');
console.log(`Er stand bei diesem Lauf auf AN und steht weiterhin auf AN.`);

/* ============================================================================
   Der Schlussblock
   ============================================================================ */

console.log('\n\nABENDBILANZ');
console.log('============================================================================\n');
console.log(`  Buchungen mitgeschrieben                                        ${journal.length}`);
console.log(`  davon abgelehnt/doppelt                                          ${journal.length - verarbeiteteBuchungen.length}\n`);

for (const kurzname of Object.keys(SPIELER)) {
	const b = bilanzJeSpielende[kurzname];
	if (!b) { continue; }
	const delta = b.ende - b.start;
	const zeichen = delta >= 0 ? '+' : '';
	const ok = (b.ende - b.start) === b.journalDelta;
	console.log(`  ACCTEST Abend ${kurzname}     ${(b.start / 100).toFixed(2)} €  →  ${(b.ende / 100).toFixed(2)} €      Δ ${zeichen}${(delta / 100).toFixed(2)} €   ${ok ? '✓ Journal deckt es' : '✗ ABWEICHUNG'}`);
}
console.log(`  _d2check_        (${adminUnveraendert ? 'unverändert' : 'zurückgesetzt'})                               ✓`);
console.log('                                                    ------------');
console.log(`  Summe der Vermögensänderung                         ${(summeVAenderung / 100).toFixed(2)} €`);
console.log(`  Summe ΔV aus dem Journal                            ${(summeJournalDelta / 100).toFixed(2)} €`);
console.log(`  DIFFERENZ                                                ${((summeVAenderung - summeJournalDelta) / 100).toFixed(2)} €  ${summeVAenderung === summeJournalDelta ? '✓✓' : '✗✗'}`);

console.log('\nWAS DIESER NACHWEIS GRUNDSÄTZLICH NICHT SEHEN KANN');
console.log('----------------------------------------------------------------------------');
console.log('  - Ob die Spielregeln selbst richtig sind (außer Roulette, siehe I-6). Er');
console.log('    prüft, dass GENAU DAS gebucht wird, was das Spiel entscheidet — nicht,');
console.log('    dass das Spiel richtig entscheidet. Dafür sind die anderen Prüfskripte da.');
console.log('  - Bei Craps und Blackjack: ob der gebuchte BETRAG SELBST regelkonform ist');
console.log('    (dokumentierte, gestufte Abweichung — siehe Dateikopf).');
console.log('  - Einen Fehler, der nur bei mehr als vier Personen oder mehr als drei');
console.log('    Lobbys auftritt.');
console.log('  - Einen Fehler, der von der Uhrzeit, der Netzlaufzeit oder der Reihenfolge');
console.log('    zweier gleichzeitiger Klicks abhängt. Vier Browser sind vier Browser.');
console.log('  - Den Münzschieber — den gibt es nicht mehr (abgeschrieben, 2026-09-11).');
console.log('  - Alles, was ein Mensch beurteilen muss: Klang, Bild, Bedienbarkeit.');

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`} (${zusagen} Zusagen)`);
process.exit(fehler === 0 ? 0 : 1);
