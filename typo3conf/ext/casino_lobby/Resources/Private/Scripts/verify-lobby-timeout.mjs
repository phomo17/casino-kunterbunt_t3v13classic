// @pruefstand modus=an laufzeit=lang isolation=lobby
// Braucht den QR-Modus AN (ohne ihn bricht er sofort ab), rund 150 Sekunden,
// und je Prüfblock eine frische, leere Lobby.

/**
 * Casino Kunterbunt – casino_lobby: Messlauf 30-Sekunden-Frist (D4d)
 * ====================================================================
 *
 * DIES IST EIN MESSLAUF, KEIN PRÜFSKRIPT IM REIHENLAUF. Er dauert rund
 * 150 Sekunden (nicht 80, siehe Behebungsvermerk unten), weil er echte
 * Fristen abwartet und dabei — anders als die erste Fassung — JEDEN
 * Prüfblock mit einer FRISCHEN, isolierten Lobby aufsetzt. Er wird deshalb
 * NICHT vom Umsetzer gefahren, sondern von der Hauptsitzung — dieselbe
 * Sonderstellung, die verify-payout.mjs beim Blackjack hat (Plan
 * PLAN-d4-lobby-part-2.md, Abschnitt 4.33).
 *
 * BEHOBEN NACH EINEM FEHLGESCHLAGENEN LAUF — drei Ursachen, alle in der
 * CHOREOGRAFIE dieses Skripts, nicht im Produkt:
 *
 *   1. T-4 zählte den falschen Augenblick. Die erste Fassung rief vor der
 *      Zählung `seite('/roulette', {headers:B})` auf — das IST die
 *      Tischseite, und `LobbyTable::platzHolen()` eröffnet dort automatisch
 *      eine NEUE Lobby, wenn B (noch) keinen Platz hat und keine Lobby mehr
 *      besteht (D.10.3). Der Aufruf zählte also die Lobby, die er selbst
 *      gerade erzeugt hatte. BEHOBEN: der Auslöser für das Aufräumen ist
 *      jetzt GET /casino-lobby/uebersicht — dieser Weg räumt über
 *      `LobbyService::aufraeumen()` ebenfalls ALLE Lobbys des Spiels auf
 *      (LobbyEndpoint::uebersicht()), eröffnet aber selbst NIE eine Lobby.
 *      B muss dafür nicht einmal sitzen.
 *   2. T-3 und T-5 bauten auf derselben Sitzung A auf, die T-2 zuvor
 *      ABSICHTLICH verfallen ließ. Nach T-2 hat A keinen Platz mehr —
 *      jede weitere Prüfung, die stillschweigend voraussetzt, A sitze noch,
 *      bekommt zuverlässig {"weg":1} und kann nicht grün werden, ohne dass
 *      das Ergebnis wertlos wäre. BEHOBEN: jeder Prüfblock (T-2, T-3, T-4,
 *      T-5, T-6) eröffnet jetzt SEINE EIGENE, frische Lobby und räumt sie am
 *      Ende selbst wieder ab; zwischen den Blöcken steht die Datenbank
 *      nachweislich wieder auf null Zeilen (eigene Zusage je Übergang).
 *   3. T-3 nahm an, der Zustand 'laeuft' ließe sich einfach "abwarten" —
 *      tatsächlich schaltet KEIN Hintergrundlauf die Runde weiter; jeder
 *      Zustandswechsel läuft ausschließlich innerhalb von
 *      LobbyService::aufraeumenEinzeln(), ausgelöst durch eine tatsächliche
 *      Abfrage. Ohne aktives Weiterschalten blieb der gemessene Zustand
 *      "undefined" bzw. stehen bei 'gesperrt'. BEHOBEN: eine ZWEITE Sitzung
 *      B sitzt mit am Tisch (löst die Setzuhr aus, D.10.6) und fragt aktiv
 *      im Abstand von etwa 5 Sekunden ab, bis der Zustand nachweislich
 *      'laeuft' erreicht hat — A bleibt dabei die ganze Zeit stumm. Wird
 *      'laeuft' nicht binnen einer großzügigen Frist erreicht, BRICHT diese
 *      Prüfung mit einer roten Zusage und process.exit(1) ab (samt Aufräumen
 *      der bis dahin offenen Sitzungen) — sie täuscht keinen Erfolg vor.
 *      Der Prüfzeitpunkt selbst liegt bewusst VOR dem Ablauf von
 *      RoundClock::LAUFFRIST (20 s) seit Eintritt in 'laeuft': erst NACH
 *      LAUFFRIST räumt derselbe aufraeumenEinzeln()-Aufruf, der 'laeuft'
 *      wegen der Notbremse auf 'setzen' zurücksetzt, im GLEICHEN Durchlauf
 *      auch überfällige Plätze auf (RoundClock::fristLaeuft() wird mit dem
 *      SCHON AKTUALISIERTEN Zustand geprüft) — ein zu später Prüfzeitpunkt
 *      hätte also unabhängig von der eigentlichen Zusage zufällig rot oder
 *      grün werden können, je nachdem, wie viel Zeit seit dem Eintritt in
 *      'laeuft' bereits vergangen war. Mit reichlich Abstand zu diesem
 *      Rand (LAUFFRIST liegt bei den gemessenen Zeiten regelmäßig 15–20 s
 *      NACH dem hier gewählten Prüfzeitpunkt) ist das ausgeschlossen.
 *
 * ZUSÄTZLICH KORRIGIERT: T-6 prüfte in der ersten Fassung
 * tx_casinolobby_lobby.tstamp — diese Spalte wird von KEINEM der hier
 * durchlaufenen Schreibpfade je gesetzt (LobbyRepository::updateLobby()
 * und ::touchSeat() führen 'tstamp' nicht mit; nur insertLobby()/
 * insertSeat() tun es, einmalig bei der Eröffnung). Die Prüfung war damit
 * IMMER wahr, unabhängig davon, ob die Drosselung aus Entscheidung 4.0.3
 * tatsächlich funktioniert — ein stiller Blindgänger, kein Produktfehler
 * (die Drosselung selbst, LobbyService::stand(), schreibt korrekt
 * last_seen auf tx_casinolobby_seat). T-6 prüft jetzt diese Spalte direkt.
 *
 * VORAUSSETZUNG: QR-Modus AN, mindestens zwei nicht versteckte Spielende
 * (Name mit "test"/"check"), niemand spielt gerade an /roulette. NACH DEM
 * LAUF: QR-Modus bleibt UNVERÄNDERT (dieses Skript liest ihn nur, wie
 * verify-lobby-live.mjs und verify-lobby-endpoint.mjs) — welcher Stand nach
 * dem Lauf gilt, ist Sache dessen, der ihn gestartet hat.
 *
 * Aufruf:
 *
 *   ddev exec node typo3conf/ext/casino_lobby/Resources/Private/Scripts/verify-lobby-timeout.mjs
 *
 * WAS HIER BEWIESEN WIRD (Plan, Abschnitt 4.33; Choreografie nach obigem
 * Behebungsvermerk neu aufgesetzt, die fachlichen Zusagen unverändert)
 * ----------------------------------------------------------------------------
 *   T-1  Wächter
 *   T-2  A sitzt allein, hört auf zu fragen; nach 31 Sekunden löst ein
 *        Aufruf der Übersicht (durch eine ANDERE, nicht sitzende Sitzung)
 *        den Verfall aus: A hat keinen Platz mehr, die Lobby ist leer und
 *        damit gelöscht (D.10.3)
 *   T-4  die letzte Person verlässt AUSDRÜCKLICH den Tisch (eigene, frische
 *        Lobby); sie verschwindet sofort, ohne dass eine Frist ablaufen muss
 *   T-3  eine frische Lobby mit A UND B; B fragt aktiv ab, bis der Zustand
 *        nachweislich 'laeuft' erreicht — währenddessen bleibt A (seit
 *        Rundenbeginn über 30 Sekunden stumm) trotzdem an ihrem Platz: die
 *        Frist läuft in diesem Zustand nicht (Entscheidung 4.0.5)
 *   T-5  eine frische Lobby, ein Platz, der alle 5 Sekunden gefragt wird,
 *        verfällt NICHT — Gegenprobe zu T-2
 *   T-6  eine frische Lobby: zehn Abrufe in zehn Sekunden ändern
 *        tx_casinolobby_seat.last_seen höchstens zweimal (Entscheidung
 *        4.0.3) — NICHT tx_casinolobby_lobby.tstamp, siehe Vermerk oben
 *
 * Dieses Skript SCHREIBT (tritt Lobbys bei, verlässt sie wieder) — wie
 * verify-lobby-live.mjs weist es nach JEDEM Prüfblock nach, keine Zeile
 * hinterlassen zu haben, und meldet sich am Ende wieder ab.
 */

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(HIER, '../../..');

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
	return ok;
}

function warten(ms) {
	console.log(`     … warte ${(ms / 1000).toFixed(0)} s`);
	return new Promise((resolve) => { setTimeout(resolve, ms); });
}

/**
 * GEMESSEN in Umsetzungsstück D4d (Behebungslauf) — zweimal hintereinander
 * gefahren, beide Male dieselbe Zahl; Rückbauprobe mit einer absichtlich
 * falschen Zahl bestanden (dieselbe Bauart wie in den drei anderen
 * Prüfskripten dieser Extension).
 */
const ERWARTETE_ZUSAGEN = 12;

const LOBBY_ENDPOINT_PFAD = path.join(EXT, 'Classes/Middleware/LobbyEndpoint.php');
const ROUND_CLOCK_PFAD = path.join(EXT, 'Classes/Service/RoundClock.php');

console.log('\ncasino_lobby – Messlauf 30-Sekunden-Frist (Umsetzungsstück D4d)');
console.log('==================================================================\n');

for (const [name, pfad] of [
	['Classes/Middleware/LobbyEndpoint.php', LOBBY_ENDPOINT_PFAD],
	['Classes/Service/RoundClock.php', ROUND_CLOCK_PFAD],
]) {
	if (!existsSync(pfad)) {
		console.log(`\nERGEBNIS: Abbruch — ${name} existiert nicht.`);
		process.exit(1);
	}
}
console.log('T-1  Wächter');
check(true, 'Pflichtdateien vorhanden (kein eigener Zähler-Haken — ein Riegel, keine Zusage)');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const WEG1_BASIS = 'https://casino-kunterbunt.ddev.site';
const WEG2_BASIS = 'http://127.0.0.1';
const HOST_KOPFZEILE = 'casino-kunterbunt.ddev.site';
let benutzterWeg = null;

async function seite(pfadOderUrl, optionen = {}) {
	const pfad = pfadOderUrl.startsWith('http') ? new URL(pfadOderUrl).pathname + new URL(pfadOderUrl).search : pfadOderUrl;
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
				redirect: 'manual',
				...(rumpf !== undefined ? { body: rumpf } : {}),
			});
			const text = await antwort.text();
			if (benutzterWeg === null) {
				benutzterWeg = versuch.basis;
			}
			return { status: antwort.status, text };
		} catch (fehlerObjekt) {
			letzterFehler = fehlerObjekt;
		}
	}
	console.log(`\nERGEBNIS: Abbruch — weder ${WEG1_BASIS} noch ${WEG2_BASIS} erreichen die laufende Website: ${letzterFehler?.message}`);
	process.exit(1);
}
async function json(pfadOderUrl, optionen) {
	const antwort = await seite(pfadOderUrl, optionen);
	try {
		return JSON.parse(antwort.text);
	} catch {
		return null;
	}
}

let registryAusgabe;
try {
	registryAusgabe = execFileSync('mysql', ['-e',
		"SELECT entry_value FROM sys_registry WHERE entry_namespace='tx_casinoaccount' AND entry_key='qrMode';"],
		{ encoding: 'utf8' });
} catch (fehlerObjekt) {
	console.log(`\nERGEBNIS: Abbruch — die Abfrage des Schalterstands schlug fehl: ${fehlerObjekt.message}`);
	process.exit(1);
}
const qrModeAn = (registryAusgabe.split('\n')[1] ?? '').trim() === 'b:1;';
console.log(`(gemessener Schalterstand: ${qrModeAn ? 'AN' : 'AUS'})`);
if (!qrModeAn) {
	console.log('\nERGEBNIS: Abbruch — der QR-Modus steht auf AUS. Dieser Messlauf braucht ihn AN (siehe Dateikopf).');
	process.exit(1);
}

function zweiTestKennungen() {
	const ausgabe = execFileSync('mysql', ['-e',
		"SELECT uid, token FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 "
		+ "AND (name LIKE '%check%' OR name LIKE '%Check%' OR name LIKE '%test%' OR name LIKE '%Test%') "
		+ 'ORDER BY uid LIMIT 5;'], { encoding: 'utf8' });
	return ausgabe.split('\n').slice(1).map((z) => z.trim()).filter((z) => z !== '')
		.map((z) => { const [uid, token] = z.split('\t'); return { uid, token }; });
}
async function anmelden(token) {
	const headerZusatz = benutzterWeg === WEG2_BASIS ? { Host: HOST_KOPFZEILE } : {};
	const antwort = await fetch((benutzterWeg ?? WEG1_BASIS) + '/?casinoToken=' + encodeURIComponent(token), {
		redirect: 'manual', headers: headerZusatz,
	});
	const setCookieZeilen = typeof antwort.headers.getSetCookie === 'function' ? antwort.headers.getSetCookie() : [];
	return setCookieZeilen.map((z) => z.split(';')[0]).join('; ');
}
async function abmelden(keks) {
	return seite('/', { methode: 'POST', headers: { Cookie: keks, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'logintype=logout' });
}
function lobbyZeilen(spiel) {
	const ausgabe = execFileSync('mysql', ['-e', `SELECT COUNT(*) FROM tx_casinolobby_lobby WHERE game='${spiel}';`], { encoding: 'utf8' });
	return (ausgabe.split('\n')[1] ?? '').trim();
}
/** tx_casinolobby_seat.last_seen der (einzigen) Sitzung dieser Person — für T-6. */
function seatLastSeen(playerUid) {
	const ausgabe = execFileSync('mysql', ['-e', `SELECT last_seen FROM tx_casinolobby_seat WHERE player=${Number(playerUid)};`], { encoding: 'utf8' });
	return (ausgabe.split('\n')[1] ?? '').trim();
}

/** Öffnet über GET /roulette eine frische, neue Lobby für $cookie und liefert deren Zustandsblock. */
async function frischeLobby(cookie) {
	const antwort = await seite('/roulette', { headers: cookie });
	const zustand = JSON.parse(/data-cl-state>([^<]*)</.exec(antwort.text)?.[1] ?? 'null');
	return zustand;
}
async function verlassen(state, cookie) {
	return json(state.endpunkte.handlung, {
		methode: 'POST', headers: { ...cookie, 'Content-Type': 'application/json' },
		body: JSON.stringify({ art: 'verlassen' }),
	});
}

let kennungen;
try {
	kennungen = zweiTestKennungen();
} catch (fehlerObjekt) {
	console.log(`\nERGEBNIS: Abbruch — die Suche nach Test-Kennungen schlug fehl: ${fehlerObjekt.message}`);
	process.exit(1);
}
if (kennungen.length < 2) {
	console.log(`\nERGEBNIS: Abbruch — nur ${kennungen.length} passende(r) Testspieler(in) gefunden.`);
	process.exit(1);
}
if (lobbyZeilen('roulette') !== '0') {
	console.log('\nERGEBNIS: Abbruch — es besteht bereits eine Roulette-Lobby; dieser Messlauf braucht einen leeren Tisch.');
	process.exit(1);
}

await seite('/');
const keksA = await anmelden(kennungen[0].token);
const keksB = await anmelden(kennungen[1].token);
if (keksA === '' || keksB === '') {
	console.log('\nERGEBNIS: Abbruch — mindestens eine Anmeldung setzte kein Sitzungsplätzchen.');
	process.exit(1);
}
const A = { Cookie: keksA };
const B = { Cookie: keksB };
const uidA = kennungen[0].uid;

/** Meldet beide Sitzungen ab und beendet den Prozess — für den ehrlichen Abbruch in T-3. */
async function abbrechenMitAufraeumen(grund) {
	console.log(`\nERGEBNIS: Abbruch — ${grund}`);
	try {
		await abmelden(keksA);
		await abmelden(keksB);
	} catch { /* bestmögliches Aufräumen, kein zweiter Fehlschlag hier */ }
	process.exit(1);
}

/* ==================================================== T-2 Verfall nach 31 s (solo, Auslöser: Übersicht) */

console.log('\nT-2  A sitzt allein, hört auf zu fragen; nach 31 s löst die Übersicht (B, unbeteiligt) den Verfall aus');
{
	const stateA = await frischeLobby(A);
	if (stateA === null) {
		await abbrechenMitAufraeumen('A bekam keinen Zustandsblock (Vorbedingung nicht erfüllt).');
	}
	await warten(31000);
	// B sitzt hier NICHT — die Übersicht räumt über LobbyService::aufraeumen()
	// ALLE Lobbys von 'roulette' auf (LobbyEndpoint::uebersicht()), ohne
	// selbst je eine zu eröffnen. Das behebt den Fund aus dem ersten Lauf:
	// GET /roulette (die Tischseite) hätte hier B automatisch eine neue
	// Lobby eröffnet.
	await json('/casino-lobby/uebersicht?spiel=roulette', { headers: B });
	const standANach31s = await json(stateA.endpunkte.stand, { headers: A });
	check(standANach31s?.weg === 1, `A hat nach 31 s ohne Lebenszeichen keinen Platz mehr (Antwort: ${JSON.stringify(standANach31s)})`);
	check(lobbyZeilen('roulette') === '0', `die Lobby ist mit A auch gelöscht — sie war die letzte Sitzende (gefunden: ${lobbyZeilen('roulette')} Zeile(n))`);
}

/* ==================================================== T-4 explizites Verlassen (eigene, frische Lobby) */

console.log('\nT-4  eine frische Lobby: die letzte Person verlässt AUSDRÜCKLICH den Tisch — sie verschwindet sofort');
{
	const stateA = await frischeLobby(A);
	if (stateA === null) {
		await abbrechenMitAufraeumen('A bekam für T-4 keinen Zustandsblock.');
	}
	await verlassen(stateA, A);
	check(lobbyZeilen('roulette') === '0', `keine Roulette-Lobby bleibt bestehen, nachdem A ausdrücklich verlassen hat (gefunden: ${lobbyZeilen('roulette')})`);
}

/* ==================================================== T-3 kein Verfall während 'laeuft' (eigene, frische Lobby, A+B) */

console.log("\nT-3  eine frische Lobby mit A und B; B treibt den Zustand aktiv bis 'laeuft', A bleibt seit Rundenbeginn stumm");
{
	const start = Date.now();
	const stateA = await frischeLobby(A);
	if (stateA === null) {
		await abbrechenMitAufraeumen('A bekam für T-3 keinen Zustandsblock.');
	}
	const beitritt = await json(stateA.endpunkte.handlung, {
		methode: 'POST', headers: { ...B, 'Content-Type': 'application/json' },
		body: JSON.stringify({ art: 'beitreten', lobby: stateA.lobby }),
	});
	if (beitritt?.ok !== true) {
		await abbrechenMitAufraeumen(`B konnte für T-3 nicht beitreten (Antwort: ${JSON.stringify(beitritt)}).`);
	}
	// A schweigt ab hier vollständig — kein weiterer Aufruf mit A's Sitzung,
	// bis der abschließende Prüfpoll (ebenfalls über B) erfolgt ist.

	// B treibt den Zustand aktiv voran (setzen -[20s]-> gesperrt -[2s]-> läuft).
	// Nur eine tatsächliche Abfrage löst in aufraeumenEinzeln() einen
	// Zustandswechsel aus — "abwarten" allein bewegt nichts (der Fund aus
	// dem ersten Lauf).
	let standB = null;
	let erreichtNachSekunden = null;
	const ABBRUCH_NACH_MS = 50000;
	while (Date.now() - start < ABBRUCH_NACH_MS) {
		await warten(5000);
		standB = await json(stateA.endpunkte.stand, { headers: B });
		if (standB?.z === 'laeuft') {
			erreichtNachSekunden = (Date.now() - start) / 1000;
			break;
		}
	}
	if (erreichtNachSekunden === null) {
		check(false, `Zustand 'laeuft' wurde nicht innerhalb von ${ABBRUCH_NACH_MS / 1000} s erreicht (letzter Stand: ${JSON.stringify(standB)})`);
		await verlassen(stateA, A).catch(() => {});
		await verlassen(stateA, B).catch(() => {});
		await abbrechenMitAufraeumen("T-3 konnte den Zustand 'laeuft' nicht herstellen — die eigentliche Zusage (Frist läuft dort nicht) wäre unbeweisbar gewesen.");
	}
	check(true, `Zustand 'laeuft' erreicht nach ${erreichtNachSekunden.toFixed(1)} s (RoundClock::LAUFFRIST = 20 s ab hier, also gültig bis ca. ${(erreichtNachSekunden + 20).toFixed(1)} s)`);

	// A ist zu diesem Zeitpunkt bereits seit "erreichtNachSekunden" Sekunden
	// stumm. Der Prüfzeitpunkt liegt bei Sekunde 31 seit Rundenbeginn (D4b
	// zieht dieselbe 31-Sekunden-Marke wie T-2 heran) — UND bewusst deutlich
	// vor Ablauf von LAUFFRIST (siehe Behebungsvermerk im Dateikopf).
	const zielSekunde = 31;
	const nochZuWarten = (zielSekunde - erreichtNachSekunden) * 1000;
	if (nochZuWarten > 0) {
		await warten(nochZuWarten);
	}
	const standAmZiel = await json(stateA.endpunkte.stand, { headers: B });
	const gesamtStummSekunden = (Date.now() - start) / 1000;
	check(standAmZiel?.n === 2, `A sitzt nach ${gesamtStummSekunden.toFixed(1)} s Stille noch mit am Tisch, n=2 erwartet (Antwort: ${JSON.stringify(standAmZiel)})`);
	check(standAmZiel?.z === 'laeuft', `der Zustand ist zum Prüfzeitpunkt noch 'laeuft' — die Notbremse (LAUFFRIST) ist noch nicht fällig (gefunden: "${standAmZiel?.z}")`);

	// Aufräumen: beide verlassen, unabhängig vom Ausgang der Prüfung oben.
	await verlassen(stateA, A);
	await verlassen(stateA, B);
	check(lobbyZeilen('roulette') === '0', `keine Roulette-Lobby bleibt nach T-3 bestehen (gefunden: ${lobbyZeilen('roulette')})`);
}

/* ==================================================== T-5 Gegenprobe: alle 5 s gefragt, kein Verfall (eigene, frische Lobby) */

console.log('\nT-5  eine frische Lobby: ein Platz, der alle 5 Sekunden gefragt wird, verfällt NICHT (Gegenprobe zu T-2)');
{
	const stateA = await frischeLobby(A);
	if (stateA === null) {
		await abbrechenMitAufraeumen('A bekam für T-5 keinen Zustandsblock.');
	}
	let standA = null;
	for (let i = 0; i < 7; i++) {
		await warten(5000);
		standA = await json(stateA.endpunkte.stand, { headers: A });
	}
	check(standA?.weg !== 1, `A bleibt bei alle-5-Sekunden-Abrufen über 35 s hinweg an ihrem Platz (Antwort: ${JSON.stringify(standA)})`);
	await verlassen(stateA, A);
	check(lobbyZeilen('roulette') === '0', `keine Roulette-Lobby bleibt nach T-5 bestehen (gefunden: ${lobbyZeilen('roulette')})`);
}

/* ==================================================== T-6 last_seen höchstens alle 5 s geschrieben (eigene, frische Lobby) */

console.log('\nT-6  eine frische Lobby: zehn Abrufe in zehn Sekunden ändern tx_casinolobby_seat.last_seen höchstens zweimal');
{
	const stateA = await frischeLobby(A);
	if (stateA === null) {
		await abbrechenMitAufraeumen('A bekam für T-6 keinen Zustandsblock.');
	}
	const gesehen = new Set([seatLastSeen(uidA)]);
	for (let i = 0; i < 10; i++) {
		await json(stateA.endpunkte.stand, { headers: A });
		gesehen.add(seatLastSeen(uidA));
		await warten(1000);
	}
	check(gesehen.size <= 3, `last_seen ändert sich höchstens zweimal bei zehn Abrufen in zehn Sekunden (beobachtete unterschiedliche Werte: ${gesehen.size})`);
	await verlassen(stateA, A);
	check(lobbyZeilen('roulette') === '0', `keine Roulette-Lobby bleibt nach T-6 bestehen (gefunden: ${lobbyZeilen('roulette')})`);
}

/* ------------------------------------------------------------- Abmelden und Wächter */

const abA = await abmelden(keksA);
const abB = await abmelden(keksB);
console.log(`\n(Testsitzungen wieder abgemeldet: A ${abA.status === 200 || abA.status === 303 ? 'ja' : `NEIN (${abA.status})`}, B ${abB.status === 200 || abB.status === 303 ? 'ja' : `NEIN (${abB.status})`})`);

if (zusagen !== ERWARTETE_ZUSAGEN) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${ERWARTETE_ZUSAGEN} erwartet.`);
	console.log('  Entweder wurde ein Prüfblock übersprungen (dann ist dieses Ergebnis wertlos),');
	console.log('  oder es sind Zusagen hinzugekommen (dann gehört ERWARTETE_ZUSAGEN nachgezogen).');
	fehler++;
}

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`} (${zusagen} Zusagen)`);
process.exit(fehler === 0 ? 0 : 1);
