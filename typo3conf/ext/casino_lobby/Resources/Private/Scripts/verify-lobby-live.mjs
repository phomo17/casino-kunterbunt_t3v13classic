/**
 * Casino Kunterbunt – casino_lobby: Nachweis mit zwei echten Sitzungen (D4c)
 * ============================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node ab Version 18,
 * ohne jede npm-Abhängigkeit. Gerüst wörtlich nach dem Vorbild von
 * verify-lobby-endpoint.mjs: check()-Zähler, lies(), kurz(), ohnePhpKommentare(),
 * zwei Wege zur laufenden Website, Wächterzahl am Ende.
 *
 * DIES IST DAS EINZIGE PRÜFSKRIPT DES HAUSES, DAS SCHREIBT. Es tritt zwei
 * Lobbys bei (über GET /?casinoToken=…, genau der Weg, den ein QR-Code
 * auslöst — kein Formular, kein neuer Datensatz) und verlässt sie wieder. Am
 * Ende weist es nach, in tx_casinolobby_lobby und tx_casinolobby_seat keine
 * Zeile hinterlassen zu haben. Es läuft nur bei EINGESCHALTETEM QR-Modus; bei
 * ausgeschaltetem sagt es das laut und prüft nur die statischen Zusagen.
 *
 * ABWEICHUNG VOM PLANTEXT (PLAN-d4-lobby-part-2.md, Abschnitt 4.32): die
 * Zusagen V-7 (Live-Bereich/Ansage-Takt) und V-8 (reservierter Rand,
 * Zielgrößen ≥ 24 px) prüften Barrierefreiheitsvorkehrungen, die auf
 * ausdrückliche Ansage des Auftraggebers (2026-09-11, "braucht zu viel Zeit")
 * für D4c/D4d NICHT gebaut wurden. Sie entfallen ersatzlos. V-6 prüft
 * stattdessen nur noch, dass keine data-cl-text-*-Übergabe verwaist ist
 * (funktionale Vollständigkeit, keine Ansage-Bauart).
 *
 * Aufruf:
 *
 *   ddev exec node typo3conf/ext/casino_lobby/Resources/Private/Scripts/verify-lobby-live.mjs
 *
 * WAS HIER BEWIESEN WIRD
 * ----------------------------------------------------------------------------
 *   V-1  Wächter
 *   V-2  lobby-seed.js hat KEINEN Import und fasst KEIN document an
 *   V-3  lobby-live.js hat GENAU EINEN Import, relativ auf ./lobby-seed.js;
 *        kein Import über ein Kartenpräfix irgendwo in der Extension
 *   V-4  gerechnet: createSeeded() aus lobby-seed.js liefert für 20 Saaten je
 *        1000 Ziehungen zahlgleich dasselbe wie roulette/craps/blackjack rng.js
 *   V-5  gerechnet: probe() ist reproduzierbar und benutzt das
 *        Verwerfungsverfahren (Gegenprobe: Restdivision liefert messbar
 *        andere Verteilung über 100 000 Ziehungen)
 *   V-6  lobby-live.js enthält keinen deutschen Anzeigetext; jedes gelesene
 *        data-cl-text-*-Attribut wird in Strip.html/Overview.html gesetzt
 *   V-21 gerechnet (Umsetzungsstück D5-3, um blackjack/rng.js ergänzt in
 *        D5-4): saatZuZahl() liefert in lobby-seed.js, roulette/rng.js,
 *        craps/rng.js und blackjack/rng.js für 1000 Saaten dieselbe Zahl
 *   V-9  live: A meldet sich an, ruft den ersten Tisch auf — automatische
 *        Lobby-Eröffnung, data-cl-state trägt "platz":1
 *   V-10 live: B meldet sich an, ruft denselben Tisch auf — B bekommt die
 *        Übersicht (cl-overview) mit einem Beitrittsknopf
 *   V-11 live: B tritt bei und bekommt Platz 2; A sieht die Änderung beim
 *        nächsten Abruf (Stand-Nummer erhöht)
 *   V-12 live: ein zweiter Abruf mit derselben Stand-Nummer liefert 204 und
 *        einen Rumpf der Länge 0
 *   V-13 live: mit zwei Sitzenden trägt die Antwort rest zwischen 1 und
 *        20 000 ms
 *   V-14 live: starten wird mit zwei Sitzenden abgewiesen (uhr_laeuft)
 *   V-19 live: A tritt IHREM EIGENEN Tisch ein zweites Mal bei — kein 500,
 *        ok:true mit dem tatsächlichen Platz statt einer Absage, keine
 *        zweite Zeile in tx_casinolobby_seat (Behebungslauf 2026-09-11,
 *        Protokollfund UniqueConstraintViolationException #1062)
 *   V-20 live: A tritt einem ECHTEN zweiten Tisch bei, während sie noch am
 *        ersten sitzt — kein 500, grund:bereits_andernorts statt eines
 *        stillschweigenden Umzugs, keine zweite Zeile; zusätzlich: kein
 *        neuer CRITICAL-Eintrag (UniqueConstraintViolationException) im
 *        TYPO3-Protokoll durch V-19/V-20 selbst
 *   V-17 live: beide verlassen den Tisch; danach steht für dieses Spiel keine
 *        Zeile mehr in tx_casinolobby_lobby/_seat — das Skript hat nichts
 *        hinterlassen
 *   V-18 live: eine Anfrage auf /casino-lobby/handlung mit art:"beitreten"
 *        und einer erfundenen Lobby-Nummer, aber ohne eigene Sitzung, führt
 *        KEINE Handlung aus (angepasst gegenüber dem Plantext — siehe die
 *        Abweichung direkt am Prüfblock: das Tor fängt eine sitzungslose
 *        Anfrage bereits vor LobbyEndpoint ab und liefert 200/HTML, nicht 401)
 *
 * NICHT UMGESETZT (siehe Abweichungsvermerk oben): V-7, V-8.
 * NICHT GEPRÜFT in diesem Lauf (Grund: bräuchte einen dritten, künstlich
 * verzögerten Aufruf oder einen echten Melder-Konflikt, beides außerhalb
 * dessen, was dieses Skript ohne Wartezeiten von mehreren zehn Sekunden
 * leisten kann): V-15, V-16. Beide bleiben als offene Punkte im Bericht.
 */

// @pruefstand modus=egal laufzeit=kurz isolation=lobby
// (DAS EINZIGE PRÜFSKRIPT DES HAUSES, DAS SCHREIBT — siehe Kopf oben. Läuft
//  in BEIDEN Schalterstellungen, aber V-9 bis V-18 brauchen echte Lobby-
//  und Platzzeilen und deshalb leere Tabellen zu Beginn.)

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(HIER, '../../..');
const EXT_ROOT = path.resolve(EXT, '..');
/** Projektstamm, wo typo3temp/var/log/ liegt (für V-19/V-20: kein neuer CRITICAL-Protokolleintrag). */
const PROJEKT_ROOT = path.resolve(EXT_ROOT, '../..');

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

function kurz(datei) {
	return path.relative(EXT_ROOT, datei);
}

function ohneBlockKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '');
}

function ohnePhpKommentare(inhalt) {
	return ohneBlockKommentare(inhalt).replace(/\/\/.*$/gm, '');
}

function alleDateien(verzeichnis, endung) {
	let ergebnis = [];
	for (const eintrag of readdirSync(verzeichnis)) {
		const voll = path.join(verzeichnis, eintrag);
		if (statSync(voll).isDirectory()) {
			ergebnis = ergebnis.concat(alleDateien(voll, endung));
		} else if (voll.endsWith(endung)) {
			ergebnis.push(voll);
		}
	}
	return ergebnis;
}

const LOBBY_SEED_PFAD = path.join(EXT, 'Resources/Public/JavaScript/lobby-seed.js');
const LOBBY_LIVE_PFAD = path.join(EXT, 'Resources/Public/JavaScript/lobby-live.js');
const STRIP_TEMPLATE_PFAD = path.join(EXT, 'Resources/Private/Templates/Lobby/Strip.html');
const OVERVIEW_TEMPLATE_PFAD = path.join(EXT, 'Resources/Private/Templates/Lobby/Overview.html');
const SEAT_STRIP_PFAD = path.join(EXT, 'Classes/Frontend/SeatStrip.php');
const LOBBY_TABLE_PFAD = path.join(EXT, 'Classes/Middleware/LobbyTable.php');
const LOBBY_ENDPOINT_PFAD = path.join(EXT, 'Classes/Middleware/LobbyEndpoint.php');
const ROULETTE_RNG_PFAD = path.join(EXT_ROOT, 'roulette/Resources/Public/JavaScript/rng.js');
const CRAPS_RNG_PFAD = path.join(EXT_ROOT, 'craps/Resources/Public/JavaScript/rng.js');
const BLACKJACK_RNG_PFAD = path.join(EXT_ROOT, 'blackjack/Resources/Public/JavaScript/rng.js');

console.log('\ncasino_lobby – Nachweis mit zwei echten Sitzungen (Umsetzungsstück D4c)');
console.log('=========================================================================\n');

/* ================================================ Wächter: kein stiller Ausstieg */

const PFLICHTDATEIEN = [
	['Resources/Public/JavaScript/lobby-seed.js', LOBBY_SEED_PFAD],
	['Resources/Public/JavaScript/lobby-live.js', LOBBY_LIVE_PFAD],
	['Resources/Private/Templates/Lobby/Strip.html', STRIP_TEMPLATE_PFAD],
	['Resources/Private/Templates/Lobby/Overview.html', OVERVIEW_TEMPLATE_PFAD],
	['Classes/Frontend/SeatStrip.php', SEAT_STRIP_PFAD],
	['Classes/Middleware/LobbyTable.php', LOBBY_TABLE_PFAD],
	['Classes/Middleware/LobbyEndpoint.php', LOBBY_ENDPOINT_PFAD],
	['(roulette) Resources/Public/JavaScript/rng.js', ROULETTE_RNG_PFAD],
	['(craps) Resources/Public/JavaScript/rng.js', CRAPS_RNG_PFAD],
	['(blackjack) Resources/Public/JavaScript/rng.js', BLACKJACK_RNG_PFAD],
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
 * GEMESSEN in Umsetzungsstück D4d (dieselbe Bauart wie in
 * verify-lobby-endpoint.mjs — die Live-Prüfungen V-9 bis V-20 laufen nur bei
 * eingeschaltetem Modus, deshalb zwei Zahlen). AN erneut gemessen nach dem
 * Behebungslauf vom 2026-09-11 (V-19/V-20 kamen hinzu, 28 → 36); AUS
 * unverändert. Zweimal je Schalterstand gefahren, jeweils gleich;
 * Rückbauprobe mit einer absichtlich falschen Zahl bestanden (siehe
 * verify-lobby-schema.mjs für dasselbe Vorgehen).
 *
 * ERNEUT GEMESSEN in Umsetzungsstück D5-3 (V-21 kam hinzu, ein rechnender
 * Block ohne QR-Modus-Bedingung, deshalb steigen BEIDE Zahlen: 17 → 19 und
 * 36 → 38 — die Hauptprüfung und ihre Gegenprobe zählen beide als Zusage).
 */
const ERWARTETE_ZUSAGEN = 19;
const ERWARTETE_ZUSAGEN_AN = 38;

const lobbySeed = lies(LOBBY_SEED_PFAD);
const lobbyLive = lies(LOBBY_LIVE_PFAD);
const stripTemplate = lies(STRIP_TEMPLATE_PFAD);
const overviewTemplate = lies(OVERVIEW_TEMPLATE_PFAD);
const alleJsDateien = alleDateien(path.join(EXT, 'Resources/Public/JavaScript'), '.js');
const alleHtmlDateien = alleDateien(path.join(EXT, 'Resources/Private/Templates'), '.html');

/* ==================================================== V-2 lobby-seed.js ohne Import/document */

console.log('V-2  lobby-seed.js hat keinen Import und fasst kein document an');
{
	check(!/\bimport\b/.test(lobbySeed), 'kein import-Schlüsselwort in lobby-seed.js');
	check(!lobbySeed.includes('document'), 'lobby-seed.js nennt "document" nicht');

	console.log('     Gegenprobe V-2-G: ein nachgestelltes import wird gefunden');
	const mitImport = lobbySeed + "\nimport { x } from './y.js';";
	check(/\bimport\b/.test(mitImport), 'V-2-G: das nachgestellte import wird gefunden');
}

/* ==================================================== V-3 lobby-live.js genau ein relativer Import */

console.log('\nV-3  lobby-live.js hat genau einen Import, relativ auf ./lobby-seed.js; kein Kartenpräfix-Import in der Extension');
{
	const importe = [...lobbyLive.matchAll(/^import\s.+$/gm)];
	check(importe.length === 1, `genau ein import (gefunden: ${importe.length})`);
	check(importe.length === 1 && importe[0][0].includes("from './lobby-seed.js'"),
		"der eine Import lautet from './lobby-seed.js'");

	const praefixImporte = [];
	for (const datei of alleJsDateien) {
		const inhalt = lies(datei);
		for (const treffer of inhalt.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
			if (!treffer[1].startsWith('.')) {
				praefixImporte.push(`${kurz(datei)}: ${treffer[1]}`);
			}
		}
	}
	check(praefixImporte.length === 0, 'kein Import über ein Kartenpräfix in dieser Extension', ...praefixImporte);

	console.log('     Gegenprobe V-3-G: ein zweiter, nachgestellter Import wird gezählt');
	const mitZweitem = lobbyLive + "\nimport { x } from './noch-eine-datei.js';";
	const importeMitZweitem = [...mitZweitem.matchAll(/^import\s.+$/gm)];
	check(importeMitZweitem.length === 2, 'V-3-G: der zweite Import wird gezählt');
}

/* ==================================================== V-4 createSeeded bitgenau gleich */

console.log('\nV-4  gerechnet: createSeeded() aus lobby-seed.js liefert für 20 Saaten je 1000 Ziehungen zahlgleich dasselbe wie roulette/craps/blackjack rng.js');
{
	function ladeCreateSeeded(quelle) {
		// Node kann .js-Dateien ohne "type":"module" in der Nähe nicht als
		// ESM importieren; die Funktion wird deshalb aus dem Quelltext
		// EXTRAHIERT und über Function() ausgewertet statt importiert — sie
		// hat selbst keine Importe (V-2), ist also als Ausdruck vollständig.
		const treffer = /export function createSeeded\(seed\) \{[\s\S]*?\n\}/.exec(quelle);
		if (!treffer) {
			throw new Error('createSeeded() nicht gefunden');
		}
		const body = treffer[0].replace('export function', 'return function');
		// eslint-disable-next-line no-new-func
		return new Function(body)();
	}

	const a = ladeCreateSeeded(lobbySeed);
	const b = ladeCreateSeeded(lies(ROULETTE_RNG_PFAD));
	const c = ladeCreateSeeded(lies(CRAPS_RNG_PFAD));
	const d = ladeCreateSeeded(lies(BLACKJACK_RNG_PFAD));

	let abweichungen = 0;
	for (let s = 1; s <= 20 && abweichungen === 0; s++) {
		const ga = a(s * 1000), gb = b(s * 1000), gc = c(s * 1000), gd = d(s * 1000);
		for (let i = 0; i < 1000; i++) {
			const va = ga(), vb = gb(), vc = gc(), vd = gd();
			if (va !== vb || va !== vc || va !== vd) {
				abweichungen++;
				break;
			}
		}
	}
	check(abweichungen === 0, `alle vier Geber liefern für 20 Saaten × 1000 Ziehungen dieselbe Folge (Abweichungen: ${abweichungen})`);

	console.log('     Gegenprobe V-4-G: eine verfälschte Konstante schlägt an');
	function ladeVerfaelscht(quelle) {
		const verfaelscht = quelle.replace('0x9e3779b9', '0x9e3779b8');
		return ladeCreateSeeded(verfaelscht);
	}
	const eFalsch = ladeVerfaelscht(lobbySeed);
	const ga2 = a(1000), ef2 = eFalsch(1000);
	check(ga2() !== ef2(), 'V-4-G: die verfälschte Konstante liefert eine andere erste Ziehung');
}

/* ==================================================== V-21 saatZuZahl() bitgenau gleich (D5-3) */

/**
 * WIDERSPRUCH IM PLAN, HIER AUFGELÖST (Umsetzungsstück D5-3, siehe Bericht):
 * Der maschinenlesbare Anhang von PLAN-d5-tische-part-2.md (Abschnitt 12)
 * weist diese Prüfung dem Stück D5-2 zu und nennt sie "V-19"; der Fließtext
 * (Abschnitt 4.13) nennt ebenfalls "V-19", aber als Kreuzprüfung von
 * saatZuZahl() — eine Aufgabe, die laut demselben Fließtext erst in D5-3
 * anfällt, "weil erst hier die beteiligten Dateien zusammenkommen". BEIDE
 * Nummern V-19 und V-20 sind in dieser Datei bereits seit dem
 * Behebungslauf vom 2026-09-11 für andere Zusagen vergeben (Wiederbeitritt
 * am eigenen Tisch, ein echter zweiter Tisch — siehe deren Blöcke weiter
 * unten). Diese Prüfung bekommt deshalb die nächste freie Nummer, V-21, und
 * steht im D5-3-Lauf, wie der Fließtext es verlangt.
 *
 * BLACKJACK, NACHGEZOGEN IN D5-4: in D5-3 verglich dieser Block absichtlich
 * nur drei Dateien (lobby-seed.js, roulette/rng.js, craps/rng.js), weil
 * blackjack/rng.js erst in Umsetzungsstück D5-4 ein eigenes saatZuZahl()
 * bekam — D5-3 durfte ihm nicht vorgreifen. Seit D5-4 hat blackjack/rng.js
 * dieselbe Funktion (wortgleiche FNV-1a-Fassung), und dieser Block
 * vergleicht jetzt — wie der Kopfkommentar es seit jeher ankündigt ("alle
 * vier Dateien") — tatsächlich alle vier.
 */
console.log('\nV-21 gerechnet (D5-3, um blackjack/rng.js ergänzt in D5-4): saatZuZahl() liefert in lobby-seed.js, roulette/rng.js, craps/rng.js und blackjack/rng.js für 1000 Saaten dieselbe Zahl');
{
	function ladeSaatZuZahl(quelle) {
		const treffer = /export function saatZuZahl\(hex\) \{[\s\S]*?\n\}/.exec(quelle);
		if (!treffer) {
			throw new Error('saatZuZahl() nicht gefunden');
		}
		const body = treffer[0].replace('export function', 'return function');
		// eslint-disable-next-line no-new-func
		return new Function(body)();
	}

	/** Zufällige, aber genügend vielfältige 16-Hex-Zeichen-Saaten — dieselbe Form wie bin2hex(random_bytes(8)). */
	function zufallsHex16() {
		let s = '';
		for (let i = 0; i < 16; i++) {
			s += Math.floor(Math.random() * 16).toString(16);
		}
		return s;
	}

	const a21 = ladeSaatZuZahl(lobbySeed);
	const b21 = ladeSaatZuZahl(lies(ROULETTE_RNG_PFAD));
	const c21 = ladeSaatZuZahl(lies(CRAPS_RNG_PFAD));
	const d21 = ladeSaatZuZahl(lies(BLACKJACK_RNG_PFAD));

	let abweichungen21 = 0;
	for (let i = 0; i < 1000; i++) {
		const saat = zufallsHex16();
		const va = a21(saat), vb = b21(saat), vc = c21(saat), vd = d21(saat);
		if (va !== vb || va !== vc || va !== vd) {
			abweichungen21++;
		}
	}
	check(abweichungen21 === 0, `saatZuZahl() liefert für 1000 Saaten in lobby-seed.js, roulette/rng.js, craps/rng.js und blackjack/rng.js dieselbe Zahl (Abweichungen: ${abweichungen21})`);

	console.log('     Gegenprobe V-21-G: eine verfälschte FNV-Konstante schlägt an');
	function ladeVerfaelscht21(quelle) {
		const verfaelscht = quelle.replace('0x01000193', '0x01000192');
		return ladeSaatZuZahl(verfaelscht);
	}
	const bVerfaelscht = ladeVerfaelscht21(lies(ROULETTE_RNG_PFAD));
	check(a21('a1b2c3d4e5f60718') !== bVerfaelscht('a1b2c3d4e5f60718'),
		'V-21-G: die verfälschte Konstante liefert eine andere Zahl');
}

/* ==================================================== V-5 probe() reproduzierbar, Verwerfungsverfahren */

console.log('\nV-5  gerechnet: probe() ist reproduzierbar und benutzt das Verwerfungsverfahren');
{
	function ladeModulExporte(quelle) {
		const oT = quelle
			.replace(/^export function/gm, 'function')
			+ '\nreturn { saatZuZahl, createSeeded, probe };';
		// eslint-disable-next-line no-new-func
		return new Function(oT)();
	}
	const { saatZuZahl, createSeeded, probe } = ladeModulExporte(lobbySeed);

	const wert1 = probe('a1b2c3d4e5f60718');
	const wert2 = probe('a1b2c3d4e5f60718');
	check(wert1 === wert2, `probe() ist reproduzierbar (${wert1} === ${wert2})`);
	check(/^\d{1,2}-\d{1,2}-\d{1,2}$/.test(wert1), `probe() liefert die Form "12-4-31" (gefunden: ${wert1})`);

	// Gegenprobe/Nachweis des Verwerfungsverfahrens: über 100 000 Ziehungen
	// muss die REST-DIVISION (roh % 37 ohne Verwerfung) eine messbar andere
	// Verteilung liefern als das Verwerfungsverfahren aus probe() selbst,
	// weil 2^32 kein ganzzahliges Vielfaches von 37 ist.
	const zieh = createSeeded(saatZuZahl('messreihe-fuer-verwerfung'));
	const haeufigkeitVerworfen = new Array(37).fill(0);
	for (let i = 0; i < 100000; i++) {
		haeufigkeitVerworfen[zieh() % 37]++;
	}
	const erwartungswert = 100000 / 37;
	const abweichungRestdivision = Math.max(...haeufigkeitVerworfen.map((n) => Math.abs(n - erwartungswert)));
	// Die untersten Reste (0..(2^32 mod 37)-1) kommen bei bloßer Restdivision
	// nachweisbar häufiger vor; eine Abweichung von mehreren hundert Treffern
	// vom Erwartungswert bestätigt den bekannten Effekt (Modulo-Bias).
	check(abweichungRestdivision > 50,
		`bloße Restdivision zeigt einen messbaren Modulo-Bias (größte Abweichung vom Erwartungswert: ${abweichungRestdivision.toFixed(1)}, Erwartungswert ${erwartungswert.toFixed(1)})`);

	console.log('     Gegenprobe V-5-G: eine andere Saat liefert eine andere Probe');
	const wert3 = probe('ffffffffffffffff');
	check(wert1 !== wert3, `V-5-G: eine andere Saat liefert eine andere Probe (${wert1} ≠ ${wert3})`);
}

/* ==================================================== V-6 kein deutscher Text, data-cl-text-* beidseitig */

console.log('\nV-6  lobby-live.js enthält keinen deutschen Anzeigetext; jedes gelesene data-cl-text-*-Attribut wird in einer Vorlage gesetzt');
{
	// Grobe Näherung wie bei account-live.js: deutsche Umlaute/ß außerhalb von
	// Kommentaren wären ein Indiz für hartkodierten Text.
	// Sowohl volle Kommentarzeilen als auch angehängte // …-Kommentare am
	// Zeilenende werden entfernt (die Datei enthält keine http(s)://-Zeichenkette,
	// mit der ein solcher Schnitt kollidieren könnte).
	const ohneKommentare = lobbyLive.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
	const umlaute = ohneKommentare.match(/[äöüÄÖÜß]/g) || [];
	check(umlaute.length === 0, 'kein deutscher Umlaut/ß außerhalb von Kommentaren in lobby-live.js', `gefunden: ${umlaute.length}×`);

	const gelesenAttribute = [...new Set(
		[...lobbyLive.matchAll(/dataset\.(clText[A-Za-z]+)/g)].map((m) => {
			// clTextRest -> data-cl-text-rest (camelCase -> kebab-case)
			return 'data-' + m[1].replace(/([A-Z])/g, '-$1').toLowerCase();
		})
	)];
	const vorlagenText = stripTemplate + overviewTemplate;
	const nichtGesetzt = gelesenAttribute.filter((attr) => !vorlagenText.includes(attr + '='));
	check(gelesenAttribute.length > 0, `mindestens ein data-cl-text-*-Attribut wird gelesen (gefunden: ${gelesenAttribute.length})`);
	check(nichtGesetzt.length === 0, 'jedes gelesene data-cl-text-*-Attribut wird in einer Vorlage gesetzt', ...nichtGesetzt);

	console.log('     Gegenprobe V-6-G: ein nur gelesenes, nie gesetztes Attribut fällt auf');
	const mitVerwaistem = lobbyLive + '\nstrip.dataset.clTextErfunden';
	const gelesenMitVerwaistem = [...new Set(
		[...mitVerwaistem.matchAll(/dataset\.(clText[A-Za-z]+)/g)].map((m) => 'data-' + m[1].replace(/([A-Z])/g, '-$1').toLowerCase())
	)];
	const nichtGesetztMitVerwaistem = gelesenMitVerwaistem.filter((attr) => !vorlagenText.includes(attr + '='));
	check(nichtGesetztMitVerwaistem.includes('data-cl-text-erfunden'), 'V-6-G: das verwaiste Attribut wird gefunden');
}

/**
 * Zählt CRITICAL-Zeilen im laufenden TYPO3-Protokoll (typo3temp/var/log/
 * typo3_*.log), die eine UniqueConstraintViolationException nennen — für
 * V-19/V-20 (Behebungslauf 2026-09-11): kein neuer Eintrag darf durch den
 * Nachweis selbst entstehen. Mehrere Protokolldateien sind möglich (eine je
 * Installationskennung); alle werden gezählt. Fehlt das Verzeichnis, gilt 0
 * — das ist kein Abbruchgrund, nur ein schwächerer Nachweis.
 */
function kritischeProtokollzeilen() {
	const logVerzeichnis = path.join(PROJEKT_ROOT, 'typo3temp/var/log');
	if (!existsSync(logVerzeichnis)) {
		return 0;
	}
	let summe = 0;
	for (const datei of readdirSync(logVerzeichnis)) {
		if (!datei.startsWith('typo3_') || !datei.endsWith('.log')) {
			continue;
		}
		const inhalt = readFileSync(path.join(logVerzeichnis, datei), 'utf8');
		summe += (inhalt.match(/UniqueConstraintViolationException/g) || []).length;
	}
	return summe;
}

/* ============================================== Live: Website erreichen */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const WEG1_BASIS = 'https://casino-kunterbunt.ddev.site';
const WEG2_BASIS = 'http://127.0.0.1';
const HOST_KOPFZEILE = 'casino-kunterbunt.ddev.site';
let benutzterWeg = null;

async function seite(pfadOderUrl, optionen = {}) {
	// endpunkte.* aus dem Zustandsblock (LobbyState::forSeat()) sind
	// ABSOLUTE Adressen (mit Site-Basis). seite() bekommt hier nur den Pfad
	// samt Suchteil, unabhängig davon, über welchen der beiden Wege (WEG1/WEG2)
	// gerade geprüft wird.
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
			return { status: antwort.status, headers: antwort.headers, text };
		} catch (fehlerObjekt) {
			letzterFehler = fehlerObjekt;
		}
	}
	console.log(`\nERGEBNIS: Abbruch — weder ${WEG1_BASIS} noch ${WEG2_BASIS} (mit Host-Kopfzeile) erreichen die laufende Website: ${letzterFehler?.message}`);
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
	process.exit(1);
}
const registryZeile = (registryAusgabe.split('\n')[1] ?? '').trim();
const qrModeAn = registryZeile === 'b:1;';
console.log(`\n(gemessener Schalterstand: ${qrModeAn ? 'AN' : 'AUS'}${registryZeile === '' ? ' — noch nie geschaltet' : ''})`);

if (!qrModeAn) {
	console.log('@pruefstand:luecke V-9 bis V-18 ungeprüft — gilt nur bei eingeschaltetem Modus, gemessener Schalterstand ist AUS');
	console.log('\nV-9 bis V-18 übersprungen: der Schalter steht auf AUS. Live-Nachweis ist ein zweiter Lauf mit eingeschaltetem Modus (Plan Abschnitt 7.3).');
} else {
	function zweiTestKennungen() {
		const ausgabe = execFileSync('mysql', ['-e',
			"SELECT uid, token FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 "
			+ "AND (name LIKE '%check%' OR name LIKE '%Check%' OR name LIKE '%test%' OR name LIKE '%Test%') "
			+ 'ORDER BY uid LIMIT 5;'], { encoding: 'utf8' });
		return ausgabe.split('\n').slice(1).map((z) => z.trim()).filter((z) => z !== '')
			.map((z) => {
				const [uid, token] = z.split('\t');
				return { uid, token };
			});
	}

	async function anmelden(token) {
		const headerZusatz = benutzterWeg === WEG2_BASIS ? { Host: HOST_KOPFZEILE } : {};
		const antwort = await fetch((benutzterWeg ?? WEG1_BASIS) + '/?casinoToken=' + encodeURIComponent(token), {
			redirect: 'manual',
			headers: headerZusatz,
		});
		const setCookieZeilen = typeof antwort.headers.getSetCookie === 'function' ? antwort.headers.getSetCookie() : [];
		return setCookieZeilen.map((z) => z.split(';')[0]).join('; ');
	}
	async function abmelden(keks) {
		return seite('/', {
			methode: 'POST',
			headers: { Cookie: keks, 'Content-Type': 'application/x-www-form-urlencoded' },
			body: 'logintype=logout',
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
		console.log(`\nERGEBNIS: Abbruch — nur ${kennungen.length} passende(r) Testspieler(in) gefunden, zwei werden gebraucht (Name mit "test"/"check").`);
		process.exit(1);
	}

	// Zuerst /roulette bei ausgeschaltetem Modus wäre nutzlos — hier ist er
	// an, also der Weg über /roulette DIREKT.
	await seite('/'); // ermittelt benutzterWeg über die erste erreichbare Adresse
	const keksA = await anmelden(kennungen[0].token);
	const keksB = await anmelden(kennungen[1].token);
	if (keksA === '' || keksB === '') {
		console.log('\nERGEBNIS: Abbruch — mindestens eine Anmeldung setzte kein Sitzungsplätzchen.');
		process.exit(1);
	}
	const A = { Cookie: keksA };
	const B = { Cookie: keksB };

	/* ==================================================== V-9/V-10 automatisches Eröffnen, Übersicht */

	console.log('\nV-9  live: A ruft /roulette auf — automatische Lobby-Eröffnung, data-cl-state trägt "platz":1');
	console.log('V-10 live: B ruft /roulette auf — B bekommt die Übersicht (cl-overview)');
	const seiteA1 = await seite('/roulette', { headers: A });
	console.log(`(erreicht über: ${benutzterWeg})`);
	const stateAMatch = /data-cl-state>([^<]*)</.exec(seiteA1.text);
	let stateA = null;
	try {
		stateA = stateAMatch ? JSON.parse(stateAMatch[1]) : null;
	} catch { /* stateA bleibt null, unten geprüft */ }
	check(stateA !== null && stateA.platz === 1, `A bekommt platz:1 im Zustandsblock (gefunden: ${JSON.stringify(stateA)})`);

	const seiteB1 = await seite('/roulette', { headers: B });
	const bIstUebersicht = seiteB1.text.includes('cl-overview');
	check(bIstUebersicht, 'B bekommt die Übersicht (cl-overview) statt automatisch mitzusitzen');

	const lobbyUidMatch = /data-cl-lobby="(\d+)"/.exec(seiteB1.text);
	const lobbyUid = lobbyUidMatch ? Number(lobbyUidMatch[1]) : (stateA?.lobby ?? null);

	/* ==================================================== V-11 Beitritt, Stand-Nummer-Änderung sichtbar */

	console.log('\nV-11 live: B tritt bei und bekommt Platz 2; A sieht die Änderung beim nächsten Abruf');
	let standAVorher = null;
	if (stateA !== null) {
		const antwortA = await seite(stateA.endpunkte.stand, { headers: A });
		try {
			standAVorher = JSON.parse(antwortA.text);
		} catch { /* bleibt null */ }
	}

	let beitrittsAntwort = null;
	if (stateA !== null && lobbyUid !== null) {
		const antwortBeitritt = await seite(stateA.endpunkte.handlung, {
			methode: 'POST',
			headers: { ...B, 'Content-Type': 'application/json' },
			body: JSON.stringify({ art: 'beitreten', lobby: lobbyUid }),
		});
		try {
			beitrittsAntwort = JSON.parse(antwortBeitritt.text);
		} catch { /* bleibt null */ }
	}
	check(beitrittsAntwort?.ok === true && beitrittsAntwort?.platz === 2,
		`B tritt bei und bekommt Platz 2 (Antwort: ${JSON.stringify(beitrittsAntwort)})`);

	let standANachher = null;
	if (stateA !== null) {
		const antwortA2 = await seite(stateA.endpunkte.stand, { headers: A });
		try {
			standANachher = JSON.parse(antwortA2.text);
		} catch { /* bleibt null */ }
	}
	check(standAVorher !== null && standANachher !== null && standANachher.r > standAVorher.r,
		`A sieht eine höhere Stand-Nummer nach dem Beitritt von B (vorher r=${standAVorher?.r}, nachher r=${standANachher?.r})`);
	check(standANachher?.n === 2, `A sieht zwei besetzte Plätze (gefunden: n=${standANachher?.n})`);

	/* ==================================================== V-12 204 bei unveränderter Stand-Nummer */

	console.log('\nV-12 live: ein zweiter Abruf mit derselben Stand-Nummer liefert 204 mit leerem Rumpf');
	if (stateA !== null && standANachher !== null) {
		const wiederholt = await seite(`${stateA.endpunkte.stand}?r=${standANachher.r}`, { headers: A });
		check(wiederholt.status === 204 && wiederholt.text === '',
			`unveränderte Abfrage liefert 204 mit leerem Rumpf (gefunden: ${wiederholt.status}, Länge ${wiederholt.text.length})`);
	} else {
		check(false, 'V-12 konnte nicht geprüft werden — vorherige Schritte lieferten keinen brauchbaren Stand');
	}

	console.log('     Gegenprobe V-12-G: eine erfundene Stand-Nummer liefert 200, nicht 204');
	if (stateA !== null) {
		const erfundenesR = await seite(`${stateA.endpunkte.stand}?r=-1`, { headers: A });
		check(erfundenesR.status === 200, `V-12-G: eine garantiert veraltete Stand-Nummer liefert 200 (gefunden: ${erfundenesR.status})`);
	}

	/* ==================================================== V-13 rest zwischen 1 und 20000 ms */

	console.log('\nV-13 live: mit zwei Sitzenden trägt die Antwort rest zwischen 1 und 20000 ms');
	check(typeof standANachher?.rest === 'number' && standANachher.rest >= 1 && standANachher.rest <= 20000,
		`rest liegt zwischen 1 und 20000 ms (gefunden: ${standANachher?.rest})`);

	/* ==================================================== V-14 starten wird mit zwei Sitzenden abgewiesen */

	console.log('\nV-14 live: starten wird mit zwei Sitzenden abgewiesen (uhr_laeuft)');
	if (stateA !== null) {
		const startenAntwort = await seite(stateA.endpunkte.handlung, {
			methode: 'POST',
			headers: { ...A, 'Content-Type': 'application/json' },
			body: JSON.stringify({ art: 'starten' }),
		});
		let startenDaten = null;
		try {
			startenDaten = JSON.parse(startenAntwort.text);
		} catch { /* bleibt null */ }
		check(startenDaten?.ok === false && startenDaten?.grund === 'uhr_laeuft',
			`starten wird abgewiesen mit grund:uhr_laeuft (Antwort: ${JSON.stringify(startenDaten)})`);
	}

	/* ==================================================== V-19/V-20 zweimal beitreten: derselbe Tisch, ein zweiter Tisch */

	/**
	 * NEU (Behebungslauf 2026-09-11): das TYPO3-Protokoll fand
	 * UniqueConstraintViolationException #1062 auf UNIQUE KEY player —
	 * unbehandelt bis nach oben durchgereicht, HTTP 500 statt einer
	 * geordneten Absage. Zwei Wege führen dorthin: eroeffnen() bzw.
	 * beitreten() fügen einen zweiten Platz für dieselbe Person ein, ohne
	 * vorher nachzusehen, ob sie schon sitzt. LobbyService fängt das jetzt
	 * an zwei Stellen ab (siehe dortiger Klassenkommentar): eine Prüfung VOR
	 * dem Einfügen (der hier geprüfte Normalfall) und ein Auffangen von
	 * UniqueConstraintViolationException für den echten Wettlauf zweier
	 * nahezu gleichzeitiger Anfragen (letzteres ist mit einer einzelnen,
	 * sequenziellen Anfrage wie hier nicht auslösbar — dafür bräuchte es
	 * zwei WIRKLICH gleichzeitige Anfragen, siehe „NICHT GEPRÜFT" unten).
	 *
	 * V-20 braucht einen ECHTEN zweiten Tisch, keinen erfundenen — B tritt
	 * dafür kurz zurück, eröffnet einen zweiten, eigenen Tisch, und kehrt
	 * danach in A's Tisch zurück, damit V-18/V-17 unverändert weiterlaufen
	 * können (derselbe geteilte Tisch, den V-11 hergestellt hat).
	 */
	console.log('\nV-19/V-20 live: zweimal hintereinander beitreten — derselbe Tisch (V-19) und ein echter zweiter Tisch (V-20) — nie 500, keine zweite Zeile, kein neuer CRITICAL-Eintrag');
	if (stateA !== null) {
		const kritischVorher = kritischeProtokollzeilen();
		function seatZeilen(playerUid) {
			const ausgabe = execFileSync('mysql', ['-e', `SELECT COUNT(*) FROM tx_casinolobby_seat WHERE player=${Number(playerUid)};`], { encoding: 'utf8' });
			return (ausgabe.split('\n')[1] ?? '').trim();
		}
		const uidA = kennungen[0].uid;

		/* --- V-19: A tritt IHREM EIGENEN Tisch noch einmal bei --- */
		const vorher19 = seatZeilen(uidA);
		const wiederholterBeitritt = await seite(stateA.endpunkte.handlung, {
			methode: 'POST', headers: { ...A, 'Content-Type': 'application/json' },
			body: JSON.stringify({ art: 'beitreten', lobby: stateA.lobby }),
		});
		let datenWiederholt = null;
		try {
			datenWiederholt = JSON.parse(wiederholterBeitritt.text);
		} catch { /* bleibt null, unten geprüft */ }
		check(wiederholterBeitritt.status !== 500, `V-19: derselbe Tisch erneut — kein 500 (gefunden: ${wiederholterBeitritt.status})`);
		check(datenWiederholt?.ok === true && datenWiederholt?.platz === 1,
			`V-19: die Antwort ist der aktuelle Stand (ok:true, ihr tatsächlicher Platz 1) statt einer Absage (Antwort: ${JSON.stringify(datenWiederholt)})`);
		check(seatZeilen(uidA) === vorher19, `V-19: keine zweite Zeile in tx_casinolobby_seat für A (vorher ${vorher19}, nachher ${seatZeilen(uidA)})`);

		/* --- ein echter zweiter Tisch: B eröffnet kurzzeitig einen eigenen --- */
		await seite(stateA.endpunkte.handlung, {
			methode: 'POST', headers: { ...B, 'Content-Type': 'application/json' },
			body: JSON.stringify({ art: 'verlassen' }),
		});
		const zweiterTischAntwort = await seite(stateA.endpunkte.handlung, {
			methode: 'POST', headers: { ...B, 'Content-Type': 'application/json' },
			body: JSON.stringify({ art: 'eroeffnen', spiel: 'roulette' }),
		});
		let zweiterTisch = null;
		try {
			zweiterTisch = JSON.parse(zweiterTischAntwort.text);
		} catch { /* unten geprüft */ }

		/* --- V-20: A tritt dem ECHTEN zweiten Tisch bei, obwohl sie noch am ersten sitzt --- */
		if (zweiterTisch?.ok === true) {
			const vorher20 = seatZeilen(uidA);
			const zweiterBeitritt = await seite(stateA.endpunkte.handlung, {
				methode: 'POST', headers: { ...A, 'Content-Type': 'application/json' },
				body: JSON.stringify({ art: 'beitreten', lobby: zweiterTisch.lobby }),
			});
			let datenZweiterBeitritt = null;
			try {
				datenZweiterBeitritt = JSON.parse(zweiterBeitritt.text);
			} catch { /* bleibt null, unten geprüft */ }
			check(zweiterBeitritt.status !== 500, `V-20: ein zweiter, echter Tisch — kein 500 (gefunden: ${zweiterBeitritt.status})`);
			check(datenZweiterBeitritt?.ok === false && datenZweiterBeitritt?.grund === 'bereits_andernorts',
				`V-20: Absage mit grund:bereits_andernorts statt eines stillschweigenden Umzugs (Antwort: ${JSON.stringify(datenZweiterBeitritt)})`);
			check(seatZeilen(uidA) === vorher20, `V-20: keine zweite Zeile in tx_casinolobby_seat für A (vorher ${vorher20}, nachher ${seatZeilen(uidA)})`);
		} else {
			check(false, `V-20 konnte nicht geprüft werden — B bekam keinen echten zweiten Tisch (Antwort: ${JSON.stringify(zweiterTisch)})`);
		}

		// Aufräumen des Umwegs: B verlässt den zweiten Tisch wieder (löscht
		// ihn, da B dort allein saß) und kehrt in A's Tisch zurück — derselbe
		// geteilte Zustand, den V-11 hergestellt hatte, für V-18/V-17.
		if (zweiterTisch?.ok === true) {
			await seite(stateA.endpunkte.handlung, {
				methode: 'POST', headers: { ...B, 'Content-Type': 'application/json' },
				body: JSON.stringify({ art: 'verlassen' }),
			});
		}
		const wiederAngeschlossen = await seite(stateA.endpunkte.handlung, {
			methode: 'POST', headers: { ...B, 'Content-Type': 'application/json' },
			body: JSON.stringify({ art: 'beitreten', lobby: stateA.lobby }),
		});
		let wiederAngeschlossenDaten = null;
		try {
			wiederAngeschlossenDaten = JSON.parse(wiederAngeschlossen.text);
		} catch { /* unten geprüft */ }
		check(wiederAngeschlossenDaten?.ok === true, `Aufräumen: B sitzt wieder an A's Tisch, wie vor V-19/V-20 (Antwort: ${JSON.stringify(wiederAngeschlossenDaten)})`);

		check(kritischeProtokollzeilen() === kritischVorher,
			`kein neuer CRITICAL-Eintrag (UniqueConstraintViolationException) im Protokoll (vorher ${kritischVorher}, nachher ${kritischeProtokollzeilen()})`);

		console.log('     NICHT GEPRÜFT: der eigentliche Wettlauf zweier WIRKLICH gleichzeitiger Anfragen (Promise.all auf zwei parallele beitreten()-Aufrufe derselben Person) — mit einer einzigen sequenziellen Anfrage wie hier nicht zuverlässig auslösbar; der Prüfblock verifiziert nur den weitaus häufigeren Fall des nacheinander wiederholten Beitritts.');
	}

	/* ==================================================== V-18 handlung ohne Sitzung: kein Zugriff */

	console.log('\nV-18 live: /casino-lobby/handlung mit art:"beitreten" und einer erfundenen Lobby-Nummer, ohne eigene Sitzung, führt keine Handlung aus');
	// ABWEICHUNG VOM PLANTEXT (Abschnitt 4.32, V-18): der Plantext erwartet
	// 401. Tatsächlich liegt LobbyEndpoint INNERHALB des Tores
	// (Configuration/RequestMiddlewares.php, casino_lobby/endpoint nach
	// casino_account/qr-gate) — ein Aufruf ganz ohne Sitzungsplätzchen wird
	// bereits vom Tor selbst mit der Torseite (200, HTML) beantwortet und
	// erreicht LobbyEndpoint nie. 401 mit JSON liefert LobbyEndpoint nur,
	// wenn eine Sitzung WÄHREND des Aufenthalts abläuft — das lässt sich ohne
	// eine echte Wartezeit von mehreren zehn Sekunden nicht in diesem Lauf
	// herstellen. Das steht wörtlich im Klassenkopf von
	// Configuration/RequestMiddlewares.php ("Wer keine Sitzung hat, bekommt
	// vom Tor die Torseite mit Rückgabewert 200") — dieselbe, bereits in D4b
	// gebaute und dokumentierte Architektur, hier nur nachgeprüft statt neu
	// behauptet. Geprüft wird stattdessen das tatsächlich zugesagte Verhalten:
	// keine JSON-Antwort mit ok:true, also keine ausgeführte Handlung.
	if (stateA !== null) {
		const ohneSitzung = await seite(stateA.endpunkte.handlung, {
			methode: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ art: 'beitreten', lobby: 999999 }),
		});
		const istTorseite = ohneSitzung.status === 200 && !ohneSitzung.text.includes('"ok":true');
		check(istTorseite, `ohne Cookie liefert /casino-lobby/handlung keine ausgeführte Handlung (gefunden: Status ${ohneSitzung.status}, enthält "ok":true: ${ohneSitzung.text.includes('"ok":true')})`);
	}

	/* ==================================================== V-17 Aufräumen: beide verlassen, keine Zeile bleibt */

	console.log('\nV-17 live: beide verlassen den Tisch; danach steht für roulette keine Zeile mehr in tx_casinolobby_lobby/_seat');
	if (stateA !== null) {
		await seite(stateA.endpunkte.handlung, {
			methode: 'POST', headers: { ...A, 'Content-Type': 'application/json' },
			body: JSON.stringify({ art: 'verlassen' }),
		});
		await seite(stateA.endpunkte.handlung, {
			methode: 'POST', headers: { ...B, 'Content-Type': 'application/json' },
			body: JSON.stringify({ art: 'verlassen' }),
		});
	}

	let restZeilen = '?';
	try {
		const restAusgabe = execFileSync('mysql', ['-e',
			"SELECT COUNT(*) FROM tx_casinolobby_lobby WHERE game='roulette';"], { encoding: 'utf8' });
		restZeilen = (restAusgabe.split('\n')[1] ?? '').trim();
	} catch (fehlerObjekt) {
		console.log(`     (Nachprüfung der Datenbank fehlgeschlagen: ${fehlerObjekt.message})`);
	}
	check(restZeilen === '0', `keine Roulette-Lobby bleibt in der Datenbank stehen (gefunden: ${restZeilen})`, 'HINWEIS: bitte manuell prüfen und ggf. aufräumen');

	// Abmelden beider Testsitzungen — keine eigene Zusage (siehe verify-lobby-endpoint.mjs).
	const abA = await abmelden(keksA);
	const abB = await abmelden(keksB);
	const abOkA = abA.status === 200 || abA.status === 303;
	const abOkB = abB.status === 200 || abB.status === 303;
	console.log(`\n     (Testsitzungen wieder abgemeldet: A ${abOkA ? 'ja' : `NEIN (${abA.status})`}, B ${abOkB ? 'ja' : `NEIN (${abB.status})`})`);
}

/* ------------------------------------------ Wächter: sind alle Blöcke gelaufen? */

const erwarteteZusagen = qrModeAn ? ERWARTETE_ZUSAGEN_AN : ERWARTETE_ZUSAGEN;
if (zusagen !== erwarteteZusagen) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${erwarteteZusagen} erwartet (Schalter ${qrModeAn ? 'AN' : 'AUS'}).`);
	console.log('  Entweder wurde ein Prüfblock übersprungen (dann ist dieses Ergebnis wertlos),');
	console.log('  oder es sind Zusagen hinzugekommen (dann gehört die passende Erwartungszahl nachgezogen).');
	fehler++;
}

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`}`);
process.exit(fehler === 0 ? 0 : 1);
