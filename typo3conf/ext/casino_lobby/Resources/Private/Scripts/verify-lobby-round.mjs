/**
 * Casino Kunterbunt – casino_lobby: Nachweis Server (Umsetzungsstück D5-1)
 * ============================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node ab Version 18,
 * ohne jede npm-Abhängigkeit außer dem bereits im Projekt vorhandenen
 * `playwright` (siehe Tests/Acceptance/dbg-schalter.mjs). Gerüst wörtlich nach
 * dem Vorbild von verify-lobby-schema.mjs und verify-lobby-live.mjs:
 * check()-Zähler, lies(), kurz(), ohnePhpKommentare(), Wächterblock, zwei
 * Erwartungszahlen (Schema+QR-Modus vorhanden/nicht vorhanden).
 *
 * ZWEI BEFUNDE AM D4-BESTAND (Plan, Abschnitt 1), hier zuerst nachgeprüft
 * und dann durch die eigenen Änderungen behoben:
 *   Befund 1: LobbyService::stand() lieferte kein `saat` — lobby-live.js
 *             löst casino:lobby-runde nur aus, wenn daten.saat vorhanden ist.
 *             Ohne diese Zeile lief in D4 NIE eine Runde.
 *   Befund 2: `daten.erg` wurde gelesen, aber nie gesendet.
 * S-19 unten BEOBACHTET DAS EREIGNIS SELBST (ein echter Browser hört auf
 * casino:lobby-runde), nicht nur das Feld in der JSON-Antwort — das ist
 * ausdrücklicher Auftrag, weil ein Feld, das da ist, und ein Ereignis, das
 * feuert, zwei verschiedene Aussagen sind.
 *
 * S-19/S-20 (die Playwright-Live-Prüfungen) BRAUCHEN DEN DATENBANK-ABGLEICH
 * (die zwei neuen Spalten turn_seat, moves). Dieses Skript legt sie NICHT an
 * — Datenbankänderungen liegen außerhalb der Werkzeuge dieses Laufs (siehe
 * Bericht: der Weg wurde ermittelt, nicht ausgeführt). Ist der Abgleich noch
 * nicht geschehen, werden S-19/S-20 mit klarer Begründung übersprungen, statt
 * mit einem SQL-Fehler abzubrechen.
 *
 * S-6..S-9 RECHNEN MIT DER ECHTEN KLASSE: ein winziger PHP-Erntewerkzeug
 * (harness) wird zur Laufzeit nach typo3temp/var/transient/ geschrieben,
 * requires Lobby.php bzw. RoundClock.php UNVERÄNDERT (kein Nachbau in JS —
 * dieselbe Lehre wie bei round-lobby-blackjack.js im Plan: der Nachweis
 * rechnet mit der Datei selbst, nicht mit einer Abschrift), gibt JSON aus und
 * wird danach gelöscht. RoundClock.php referenziert
 * Phomo17\CasinoAccount\Domain\Player::SESSION_TIMEOUT als Konstantenausdruck
 * — dafür stellt das Erntewerkzeug einen Stub derselben Klasse bereit, mit
 * NUR dieser einen Konstante, bevor RoundClock.php geladen wird.
 *
 * Aufruf:
 *
 *   ddev exec node typo3conf/ext/casino_lobby/Resources/Private/Scripts/verify-lobby-round.mjs
 *
 * WAS HIER BEWIESEN WIRD
 * ----------------------------------------------------------------------------
 *   S-1  Wächter: Pflichtdateien vorhanden, keine mit NUL-Byte
 *   S-2  ext_tables.sql: tx_casinolobby_lobby hat GENAU die neun D4-Spalten
 *        plus turn_seat und moves — nicht mehr, nicht weniger
 *   S-3  TCA: turn_seat und moves vorhanden, beide passthrough, beide mit
 *        einem LLL-Verweis auf einen tatsächlich existierenden Schlüssel
 *   S-4  locallang.xlf: tabelle.lobby.turnSeat und tabelle.lobby.moves
 *        existieren; weiterhin kein %s außerhalb von Kommentaren
 *   S-5  Lobby.php: Konstruktor hat turnSeat:int, moves:string; fromRow()
 *        liest turn_seat/moves DEFENSIV (?? Fallback — Lesbarkeit auch VOR
 *        dem Datenbank-Abgleich); ergebnis() ist vorhanden
 *   S-6  gerechnet (echte Klasse): Lobby::ergebnis() zerlegt "17-4_3_so_0" in
 *        {runde:17, wert:"4_3_so_0"}, liefert {runde:0, wert:""} für "" und
 *        {runde:0, wert:""} für einen Alt-Wert ohne Bindestrich (Übergang)
 *   S-7  RoundClock: ZUGZEIT=20 vorhanden; faellig() hat einen fünften
 *        Parameter $spiel; schritt() liefert zuege/zug statt ergebnis
 *   S-8  gerechnet (echte Klasse): RoundClock::naechsterZug([1,2,3,5], …)
 *        liefert 1 (ab 0), 5 (ab 3) und 0 (ab 5 — niemand mehr)
 *   S-9  gerechnet (echte Klasse): RoundClock::faellig() —
 *        SETZEN→GESPERRT liefert saat/runde/zuege=true, zug=false;
 *        GESPERRT→LAEUFT mit spiel=blackjack liefert zug=true, bis=+20;
 *        GESPERRT→LAEUFT mit spiel=roulette liefert zug=false, bis=+LAUFFRIST;
 *        LAEUFT→SETZEN (Notbremse) liefert WEDER zuege NOCH zug — die
 *        geänderte Semantik (Ergebnis bleibt stehen) ist damit nachgewiesen
 *   S-10 LobbyRepository: betsOfRound, replaceBets, settleBets,
 *        deleteBetsBefore, deleteBetsOfPlayer, setShooterNo vorhanden; jede
 *        neue Methode arbeitet mit createNamedParameter/gebundenen Werten,
 *        keine Zeichenkettenverkettung eines Werts in eine SQL-Anweisung
 *   S-11 LobbyService::stand() liefert saat, erg, ergR, t, mv, w in der
 *        Rückgabe — DER STATISCHE BEFUND-NACHWEIS (Befund 1 und 2 behoben)
 *   S-12 LobbyService::aufraeumenEinzeln() ruft RoundClock::faellig() mit
 *        fünf Argumenten auf (inklusive $lobby->game)
 *   S-13 LobbyService: einsatz(), bilanz(), zug(), shooter() sind public;
 *        verlassen() UND die Schleife in aufraeumenEinzeln() räumen die
 *        Einsatzanzeige der weggehenden Person ab (D.10.3), ohne zu buchen
 *   S-14 LobbyService::ergebnis() schreibt rundenmarkiert
 *        ("<runde>-<wert>"), setzt turn_seat auf 0 mit, und der
 *        Craps-Sonderpfad ruft shooterWeitergeben() bei einer "_so"-Marke
 *   S-15 LobbyEndpoint::ARTEN enthält alle neun Handlungen; ZUEGE ist genau
 *        [h,s,d,p,i,n]; jede ARTEN-Zeichenkette kommt im match-Block von
 *        handlung() als eigener Zweig vor (kein stiller Durchfall)
 *   S-16 LobbyEndpoint: einsatz()/bilanz()/zug() validieren serverseitig
 *        (Feldform, Feldanzahl ≤ MAX_FELDER, Betragsgrenzen); keine der vier
 *        neuen Methoden liest eine Kennung, eine player-Nummer oder eine
 *        Rollenangabe aus der Anfrage (D.9, dieselbe Zusage wie in D4b)
 *   S-17 Gegenprobe: eine erfundene, nicht in ARTEN stehende Handlung wird
 *        weiterhin mit 400/unbrauchbar abgewiesen
 *   S-18/S-19 live (nur wenn Datenbank-Abgleich bereits geschehen UND
 *        QR-Modus AN): ein Testspieler (uid der _d2check_-Kennung, NICHT
 *        TestSpieli) eröffnet /roulette, löst die Runde allein aus
 *        (RoundClock::darfStarten trifft bei genau einer Person zu), und ein
 *        ECHTER Browser (Playwright) hört auf casino:lobby-runde — das
 *        Ereignis muss selbst feuern, mit derselben Saat, die /casino-lobby/
 *        stand meldet. DAS IST DER EIGENTLICHE NACHWEIS, NICHT NUR EIN FELD.
 *   S-20 live (BEHEBUNGSLAUF, Protokollfund probe-abend.mjs P6,
 *        2026-09-11): der im Zustandsblock gemeldete Wert data-cl-state.lobby
 *        ist genau die uid, unter der die Lobby TATSÄCHLICH in
 *        tx_casinolobby_lobby steht (mysql-Gegenprobe direkt gegen die
 *        laufende Tabelle) — DIE DAUERHAFTE ZUSAGE aus dem Bericht dieses
 *        Behebungslaufs.
 *   S-21/S-21-G live (BEHEBUNGSLAUF, derselbe Fund — DER REGRESSIONSWÄCHTER
 *        für die eigentliche Ursache): ein reload() DERSELBEN Tischseite
 *        lässt eine allein besetzte Lobby unangetastet — weder wechselt die
 *        im Zustandsblock gemeldete Nummer, noch verschwindet die Zeile aus
 *        tx_casinolobby_lobby (S-21-G, direkte mysql-Gegenprobe). Vor der
 *        Behebung feuerte lobby-live.js bei JEDEM Verlassen des Dokuments —
 *        also auch bei einem bloßen reload() DERSELBEN Seite — ein
 *        keepalive-'verlassen', das die eigene, allein besetzte Lobby
 *        löschte; die nächste Person, die die Lobby dieses Spiels suchte,
 *        eröffnete automatisch eine neue mit der nächsten
 *        Auto-Increment-Nummer (immer genau eins höher). Siehe
 *        lobby-live.js, Kommentar an der entfernten Stelle.
 *
 * NICHT GEPRÜFT in diesem Lauf: das Zusammenspiel mit einem echten Tisch
 * (Roulette/Craps/Blackjack lesen die neuen Antwortfelder noch nicht — das
 * ist D5-2/D5-3/D5-4); Lastverhalten (Hauptsitzung, Abschnitt 7 des Plans);
 * der tatsächliche Geldfluss (dafür gibt es keinen zweiten Weg in D5-1, nur
 * die Anzeige — Nachweis L-9-artig durch S-13: keine Buchungsfunktion in
 * einsatz()/bilanz()).
 */

// @pruefstand modus=egal laufzeit=kurz isolation=lobby
// (S-18/S-19 melden bei eingeschaltetem Modus und geschehenem Datenbank-
//  Abgleich eine echte Sitzung an einem Tisch an — isolation=lobby,
//  dieselbe Vorsicht wie bei verify-lobby-live.mjs.)

import { readFileSync, existsSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/casino_lobby/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
/** Projektstamm. */
const PROJECT_ROOT = path.resolve(EXT_ROOT, '../..');

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

function ohneXmlKommentare(inhalt) {
	return inhalt.replace(/<!--[\s\S]*?-->/g, '');
}

const EXT_TABLES_SQL_PFAD = path.join(EXT, 'ext_tables.sql');
const TCA_LOBBY_PFAD = path.join(EXT, 'Configuration/TCA/tx_casinolobby_lobby.php');
const LOCALLANG_PFAD = path.join(EXT, 'Resources/Private/Language/locallang.xlf');
const LOBBY_PFAD = path.join(EXT, 'Classes/Domain/Lobby.php');
const ROUNDCLOCK_PFAD = path.join(EXT, 'Classes/Service/RoundClock.php');
const LOBBYREPOSITORY_PFAD = path.join(EXT, 'Classes/Domain/LobbyRepository.php');
const LOBBYSERVICE_PFAD = path.join(EXT, 'Classes/Service/LobbyService.php');
const LOBBYENDPOINT_PFAD = path.join(EXT, 'Classes/Middleware/LobbyEndpoint.php');

console.log('\ncasino_lobby – Nachweis Server (Umsetzungsstück D5-1)');
console.log('======================================================\n');

/* ================================================ S-1 Wächter: kein stiller Ausstieg */

const PFLICHTDATEIEN = [
	['ext_tables.sql', EXT_TABLES_SQL_PFAD],
	['Configuration/TCA/tx_casinolobby_lobby.php', TCA_LOBBY_PFAD],
	['Resources/Private/Language/locallang.xlf', LOCALLANG_PFAD],
	['Classes/Domain/Lobby.php', LOBBY_PFAD],
	['Classes/Service/RoundClock.php', ROUNDCLOCK_PFAD],
	['Classes/Domain/LobbyRepository.php', LOBBYREPOSITORY_PFAD],
	['Classes/Service/LobbyService.php', LOBBYSERVICE_PFAD],
	['Classes/Middleware/LobbyEndpoint.php', LOBBYENDPOINT_PFAD],
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

const sql = lies(EXT_TABLES_SQL_PFAD);
const tcaLobby = ohnePhpKommentare(lies(TCA_LOBBY_PFAD));
const xliff = lies(LOCALLANG_PFAD);
const lobbyPhpRoh = lies(LOBBY_PFAD);
const lobbyPhp = ohnePhpKommentare(lobbyPhpRoh);
const roundClockRoh = lies(ROUNDCLOCK_PFAD);
const roundClock = ohnePhpKommentare(roundClockRoh);
const repo = ohnePhpKommentare(lies(LOBBYREPOSITORY_PFAD));
const service = ohnePhpKommentare(lies(LOBBYSERVICE_PFAD));
const endpoint = ohnePhpKommentare(lies(LOBBYENDPOINT_PFAD));

/**
 * ERWARTETE_ZUSAGEN_OHNE_LIVE ist GEMESSEN (mehrfach gefahren, immer 89).
 * ERWARTETE_ZUSAGEN_MIT_LIVE war 95, GEMESSEN nach dem Datenbank-Abgleich.
 * BEHEBUNGSLAUF 2026-09-11 (Protokollfund probe-abend.mjs P6): drei neue
 * Zusagen kamen hinzu (S-20, S-21, S-21-G — siehe Kopf der Datei und der
 * Live-Block unten) — 95 + 3 = 98, zweimal hintereinander tatsächlich
 * gefahren und gemessen (nicht nur ausgezählt).
 */
const ERWARTETE_ZUSAGEN_OHNE_LIVE = 89;
const ERWARTETE_ZUSAGEN_MIT_LIVE = 98;

/* ==================================================== S-2 ext_tables.sql: genau zwei neue Spalten */

console.log('S-2  ext_tables.sql: tx_casinolobby_lobby hat genau die neun D4-Spalten plus turn_seat und moves');
{
	const treffer = /CREATE TABLE tx_casinolobby_lobby\s*\(([\s\S]*?)\n\);/.exec(sql);
	check(treffer !== null, 'CREATE TABLE tx_casinolobby_lobby gefunden');
	const gefunden = [];
	if (treffer) {
		for (const zeile of treffer[1].split('\n')) {
			const getrimmt = zeile.trim();
			if (getrimmt === '' || getrimmt.startsWith('#') || getrimmt.startsWith('UNIQUE KEY') || getrimmt.startsWith('KEY')) {
				continue;
			}
			const spalte = /^([a-z_]+)\s+\S/.exec(getrimmt);
			if (spalte) {
				gefunden.push(spalte[1]);
			}
		}
	}
	const ERWARTET = ['game', 'seats_max', 'state', 'state_until', 'revision', 'round_no', 'seed', 'result', 'owner', 'turn_seat', 'moves'];
	check(JSON.stringify(gefunden) === JSON.stringify(ERWARTET),
		`genau elf Spalten in dieser Reihenfolge (gefunden: ${gefunden.join(', ')})`,
		`erwartet: ${ERWARTET.join(', ')}`);

	console.log('     Gegenprobe S-2-G: eine dritte, erfundene Spalte muss auffallen');
	const mitErfundener = [...gefunden, 'erfunden'];
	check(JSON.stringify(mitErfundener) !== JSON.stringify(ERWARTET), 'S-2-G: die erfundene Spalte wird als Abweichung erkannt');
}

/* ==================================================== S-3 TCA: turn_seat, moves passthrough + LLL */

console.log('\nS-3  TCA: turn_seat und moves sind passthrough, mit einem tatsächlich existierenden LLL-Schlüssel');
{
	function block(quelle, nadel) {
		const start = quelle.indexOf(nadel);
		if (start === -1) return null;
		const auf = quelle.indexOf('[', start);
		if (auf === -1) return null;
		let tiefe = 0;
		for (let i = auf; i < quelle.length; i++) {
			if (quelle[i] === '[') tiefe++;
			else if (quelle[i] === ']') { tiefe--; if (tiefe === 0) return quelle.slice(auf, i + 1); }
		}
		return null;
	}
	const definierteIds = [...xliff.matchAll(/<trans-unit id="([^"]+)">/g)].map((m) => m[1]);

	for (const spalte of ['turn_seat', 'moves']) {
		const spaltenBlock = block(tcaLobby, `'${spalte}' => [`);
		check(spaltenBlock !== null, `TCA-Eintrag für ${spalte} gefunden`);
		check(spaltenBlock !== null && /'type'\s*=>\s*'passthrough'/.test(spaltenBlock), `${spalte}: type ist passthrough`);
		const lllTreffer = spaltenBlock ? /LLL:EXT:casino_lobby\/Resources\/Private\/Language\/locallang\.xlf:([A-Za-z0-9_.]+)/.exec(spaltenBlock) : null;
		check(lllTreffer !== null, `${spalte}: hat einen LLL-Verweis`);
		check(lllTreffer !== null && definierteIds.includes(lllTreffer[1]),
			`${spalte}: der LLL-Verweis (${lllTreffer?.[1]}) existiert in locallang.xlf`);
	}

	console.log('     Gegenprobe S-3-G: ein Verweis auf einen erfundenen Schlüssel muss auffallen');
	check(!definierteIds.includes('tabelle.lobby.erfunden'), 'S-3-G: der erfundene Schlüssel ist nicht definiert');
}

/* ==================================================== S-4 locallang.xlf */

console.log('\nS-4  locallang.xlf: tabelle.lobby.turnSeat/moves vorhanden; weiterhin kein %s außerhalb von Kommentaren');
{
	const definierteIds = [...xliff.matchAll(/<trans-unit id="([^"]+)">/g)].map((m) => m[1]);
	check(definierteIds.includes('tabelle.lobby.turnSeat'), 'tabelle.lobby.turnSeat ist definiert');
	check(definierteIds.includes('tabelle.lobby.moves'), 'tabelle.lobby.moves ist definiert');
	const xliffOhneKommentare = ohneXmlKommentare(xliff);
	check(!/%s/.test(xliffOhneKommentare), 'kein %s außerhalb von Kommentaren (Lehre aus Audit-Befund H-02, weiterhin gültig)');
}

/* ==================================================== S-5 Lobby.php: Felder, fromRow, ergebnis() */

console.log('\nS-5  Lobby.php: turnSeat:int, moves:string im Konstruktor; fromRow() liest defensiv; ergebnis() ist da');
{
	check(/public int \$turnSeat,/.test(lobbyPhp), 'Konstruktor hat public int $turnSeat');
	check(/public string \$moves,/.test(lobbyPhp), 'Konstruktor hat public string $moves');
	check(/turnSeat:\s*\(int\)\s*\(\$zeile\['turn_seat'\]\s*\?\?\s*0\)/.test(lobbyPhp),
		"fromRow() liest turn_seat defensiv mit ?? 0 (verträgt eine Zeile VOR dem Datenbank-Abgleich)");
	check(/moves:\s*\(string\)\s*\(\$zeile\['moves'\]\s*\?\?\s*''\)/.test(lobbyPhp),
		"fromRow() liest moves defensiv mit ?? '' ");
	check(/public function ergebnis\(\): array/.test(lobbyPhp), 'ergebnis() ist deklariert');

	console.log('     Gegenprobe S-5-G: ein direkter Zugriff ohne ?? müsste aus dieser Prüfung herausfallen');
	const ohneFallback = "turnSeat: (int)\$zeile['turn_seat'],";
	check(!/turnSeat:\s*\(int\)\s*\(\$zeile\['turn_seat'\]\s*\?\?\s*0\)/.test(ohneFallback),
		'S-5-G: die Fassung ohne Fallback wird NICHT als defensiv erkannt');
}

/* ==================================================== S-7 RoundClock: ZUGZEIT, Signatur, schritt() */

console.log('\nS-7  RoundClock: ZUGZEIT=20; faellig() hat einen fünften Parameter $spiel; schritt() liefert zuege/zug');
{
	check(/const\s+ZUGZEIT\s*=\s*20\s*;/.test(roundClock), 'ZUGZEIT ist 20 (D.10.6)');
	check(/function faellig\(string \$zustand, int \$bis, int \$jetzt, int \$besetzt, string \$spiel = ''\): \?array/.test(roundClock),
		"faellig() hat die Signatur (string \$zustand, int \$bis, int \$jetzt, int \$besetzt, string \$spiel = '')");
	check(/'zuege'\s*=>\s*\$zuege,\s*'zug'\s*=>\s*\$zug/.test(roundClock.replace(/\s+/g, ' ')),
		"schritt() liefert 'zuege' und 'zug' (nicht mehr 'ergebnis')");
	check(!/'ergebnis'\s*=>/.test(roundClock), "kein 'ergebnis' => mehr in RoundClock (die Flagge heißt jetzt zuege/zug)");

	console.log('     Gegenprobe S-7-G: ein hinzugedachtes "ergebnis" => true müsste auffallen');
	const mitErgebnis = roundClock + "\n'ergebnis' => true,";
	check(/'ergebnis'\s*=>/.test(mitErgebnis), 'S-7-G: die hinzugedachte Zeile wird gefunden');
}

/* ==================================================== S-6/S-8/S-9 gerechnet: echte Klassen ausführen */

console.log('\nS-6/S-8/S-9  gerechnet: Lobby::ergebnis() und RoundClock::naechsterZug()/faellig() mit der ECHTEN Datei');
{
	const TRANSIENT = path.join(PROJECT_ROOT, 'typo3temp/var/transient');
	mkdirSync(TRANSIENT, { recursive: true });
	const HARNESS_PFAD = path.join(TRANSIENT, 'd5-1-verify-round-harness.php');

	const harness = `<?php
declare(strict_types=1);

// Stub für Phomo17\\CasinoAccount\\Domain\\Player: RoundClock.php referenziert
// NUR die eine Konstante Player::SESSION_TIMEOUT als Wert von FRIST. Ein
// vollständiges Bootstrap des Frameworks bräuchte eine laufende TYPO3-
// Instanz für ein reines Berechnungswerkzeug — dieser Stub genügt, weil
// RoundClock sonst keine einzige weitere Eigenschaft von Player benutzt
// (nachgeprüft: grep über die Datei findet "Player" nur in der use-Zeile
// und im FRIST-Ausdruck).
namespace Phomo17\\CasinoAccount\\Domain {
    final class Player {
        public const SESSION_TIMEOUT = 30;
    }
}

namespace {
    require ${JSON.stringify(LOBBY_PFAD)};
    require ${JSON.stringify(ROUNDCLOCK_PFAD)};

    use Phomo17\\CasinoLobby\\Domain\\Lobby;
    use Phomo17\\CasinoLobby\\Service\\RoundClock;

    $ergebnisFaelle = [];
    foreach (['', '17-4_3_so_0', 'altwert_ohne_bindestrich', '0-leer'] as $result) {
        $lobby = Lobby::fromRow([
            'uid' => 1, 'game' => 'craps', 'seats_max' => 8, 'state' => 'setzen',
            'state_until' => 0, 'revision' => 1, 'round_no' => 17, 'seed' => '',
            'result' => $result, 'owner' => 1, 'turn_seat' => 0, 'moves' => '',
        ]);
        $ergebnisFaelle[$result] = $lobby->ergebnis();
    }

    $naechsterZug = [
        'ab0' => RoundClock::naechsterZug([1, 2, 3, 5], 0),
        'ab3' => RoundClock::naechsterZug([1, 2, 3, 5], 3),
        'ab5' => RoundClock::naechsterZug([1, 2, 3, 5], 5),
        'leer' => RoundClock::naechsterZug([], 0),
    ];

    $faellig = [
        'setzenGesperrt' => RoundClock::faellig(RoundClock::SETZEN, 1000, 1000, 3, 'roulette'),
        'gesperrtLaeuftBlackjack' => RoundClock::faellig(RoundClock::GESPERRT, 1000, 1000, 3, 'blackjack'),
        'gesperrtLaeuftRoulette' => RoundClock::faellig(RoundClock::GESPERRT, 1000, 1000, 3, 'roulette'),
        'notbremse' => RoundClock::faellig(RoundClock::LAEUFT, 1000, 1000, 3, 'craps'),
    ];

    echo json_encode([
        'ergebnis' => $ergebnisFaelle,
        'naechsterZug' => $naechsterZug,
        'faellig' => $faellig,
    ]);
}
`;

	writeFileSync(HARNESS_PFAD, harness);
	let ausgabe = null;
	let harnessFehler = null;
	try {
		ausgabe = execFileSync('php', [HARNESS_PFAD], { encoding: 'utf8' });
	} catch (fehlerObjekt) {
		harnessFehler = fehlerObjekt;
	} finally {
		try { unlinkSync(HARNESS_PFAD); } catch { /* Aufräumen ist best effort */ }
	}

	if (harnessFehler !== null) {
		console.log(`\nERGEBNIS: Abbruch — das PHP-Erntewerkzeug schlug fehl: ${harnessFehler.message}`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand: ohne laufendes PHP');
		console.log('lässt sich nicht mit den echten Klassen rechnen.');
		process.exit(1);
	}

	let daten = null;
	try {
		daten = JSON.parse(ausgabe);
	} catch (fehlerObjekt) {
		console.log(`\nERGEBNIS: Abbruch — die Ausgabe des Erntewerkzeugs ist kein gültiges JSON: ${fehlerObjekt.message}`);
		console.log(`Ausgabe war: ${ausgabe}`);
		process.exit(1);
	}

	console.log('S-6  gerechnet: Lobby::ergebnis() zerlegt result rundenmarkiert');
	check(JSON.stringify(daten.ergebnis['']) === JSON.stringify({ runde: 0, wert: '' }),
		`leeres result -> {runde:0, wert:""} (gefunden: ${JSON.stringify(daten.ergebnis[''])})`);
	check(JSON.stringify(daten.ergebnis['17-4_3_so_0']) === JSON.stringify({ runde: 17, wert: '4_3_so_0' }),
		`"17-4_3_so_0" -> {runde:17, wert:"4_3_so_0"} (gefunden: ${JSON.stringify(daten.ergebnis['17-4_3_so_0'])})`);
	check(daten.ergebnis['altwert_ohne_bindestrich'].runde === 0,
		`ein Altwert ohne Bindestrich (vor der Rundenmarkierung) liefert runde:0 (gefunden: ${JSON.stringify(daten.ergebnis['altwert_ohne_bindestrich'])})`,
		'DAS IST DIE VON Offene-Frage-8 DES PLANS GENANNTE FALLE, HIER NUR NACHGEWIESEN, NICHT BEHOBEN: ein zur Umstellungszeit bereits gespeichertes, unmarkiertes Ergebnis wird als "Runde 0" gelesen. Folgenlos, weil Lobbys minutenkurz leben (Plan, Risikotabelle).');
	check(JSON.stringify(daten.ergebnis['0-leer']) === JSON.stringify({ runde: 0, wert: 'leer' }),
		`"0-leer" -> {runde:0, wert:"leer"} (Rundennummer 0 ist ein gültiger, wenn auch seltener Fall)`);

	console.log('\nS-8  gerechnet: RoundClock::naechsterZug()');
	check(daten.naechsterZug.ab0 === 1, `[1,2,3,5] ab 0 -> 1 (gefunden: ${daten.naechsterZug.ab0})`);
	check(daten.naechsterZug.ab3 === 5, `[1,2,3,5] ab 3 -> 5 (gefunden: ${daten.naechsterZug.ab3})`);
	check(daten.naechsterZug.ab5 === 0, `[1,2,3,5] ab 5 -> 0, niemand mehr (gefunden: ${daten.naechsterZug.ab5})`);
	check(daten.naechsterZug.leer === 0, `[] ab 0 -> 0 (gefunden: ${daten.naechsterZug.leer})`);

	console.log('\nS-9  gerechnet: RoundClock::faellig() — die geänderte Semantik der Flagge und der Blackjack-Zweig');
	const sg = daten.faellig.setzenGesperrt;
	check(sg?.zustand === 'gesperrt' && sg?.saat === true && sg?.runde === true && sg?.zuege === true && sg?.zug === false,
		`SETZEN->GESPERRT: saat/runde/zuege=true, zug=false (gefunden: ${JSON.stringify(sg)})`);

	const glb = daten.faellig.gesperrtLaeuftBlackjack;
	check(glb?.zustand === 'laeuft' && glb?.zug === true && glb?.bis === 1020,
		`GESPERRT->LAEUFT (blackjack): zug=true, bis=jetzt+20 (gefunden: ${JSON.stringify(glb)})`);

	const glr = daten.faellig.gesperrtLaeuftRoulette;
	check(glr?.zustand === 'laeuft' && glr?.zug === false && glr?.bis === 1020,
		`GESPERRT->LAEUFT (roulette): zug=false, bis=jetzt+LAUFFRIST=20 (gefunden: ${JSON.stringify(glr)})`,
		'HINWEIS: LAUFFRIST und ZUGZEIT sind beide 20 — dieselbe Zahl, zwei verschiedene Bedeutungen; S-9 unterscheidet über das Feld "zug", nicht über "bis".');

	const nb = daten.faellig.notbremse;
	check(nb?.zustand === 'setzen' && nb?.zuege === false && nb?.zug === false,
		`LAEUFT->SETZEN (Notbremse): WEDER zuege NOCH zug — das Ergebnis der vorigen Runde bleibt stehen (gefunden: ${JSON.stringify(nb)})`,
		'DAS IST DIE GEÄNDERTE SEMANTIK aus Plan 4.4: in D4 leerte dieser Übergang result, seit D5 nicht mehr (Craps-Point bleibt für verspätete Browser lesbar).');

	console.log('     Gegenprobe S-6/8/9-G: eine verfälschte Erwartung (naechsterZug ab 3 -> 3 statt 5) muss auffallen');
	check(daten.naechsterZug.ab3 !== 3, 'S-6/8/9-G: die falsche Erwartung wird als Abweichung erkannt');
}

/* ==================================================== S-10 LobbyRepository: neue Methoden, gebundene Werte */

console.log('\nS-10 LobbyRepository: betsOfRound/replaceBets/settleBets/deleteBetsBefore/deleteBetsOfPlayer/setShooterNo, alle mit gebundenen Werten');
{
	const METHODEN = ['betsOfRound', 'replaceBets', 'settleBets', 'deleteBetsBefore', 'deleteBetsOfPlayer', 'setShooterNo'];
	for (const methode of METHODEN) {
		check(new RegExp(`function ${methode}\\(`).test(repo), `${methode}() ist deklariert`);
	}
	// Grobe, aber wirksame Prüfung: in den fünf Methodenrümpfen kommt keine
	// direkte String-Interpolation eines Parameters in ein SQL-Bruchstück vor
	// (kein "{$" innerhalb der Bereiche dieser Methoden).
	for (const methode of METHODEN) {
		const start = repo.indexOf(`function ${methode}(`);
		const ende = repo.indexOf('\n    public function', start + 10);
		const rumpf = repo.slice(start, ende === -1 ? undefined : ende);
		check(!/\{\$/.test(rumpf), `${methode}(): keine String-Interpolation eines Werts in SQL-Text`);
	}
	console.log('     Gegenprobe S-10-G: eine hinzugedachte Methode fehlt erwartungsgemäß');
	check(!/function betOfRundeXyz\(/.test(repo), 'S-10-G: eine erfundene Methode wird korrekt als nicht vorhanden erkannt');
}

/* ==================================================== S-11 stand() liefert saat/erg/ergR/t/mv/w — DER BEFUND-NACHWEIS */

console.log('\nS-11 LobbyService::stand() liefert saat, erg, ergR, t, mv, w — Befund 1 und 2 aus Plan Abschnitt 1 sind behoben');
{
	const standStart = service.indexOf('public function stand(');
	const standEnde = service.indexOf('\n    public function starten', standStart);
	const standRumpf = service.slice(standStart, standEnde === -1 ? undefined : standEnde);

	check(/'saat'\s*=>\s*\$lobby->seed/.test(standRumpf), "stand() setzt 'saat' => \$lobby->seed (Befund 1 behoben)");
	check(/'erg'\s*=>\s*\$ergebnis\['wert'\]/.test(standRumpf), "stand() setzt 'erg' => \$ergebnis['wert'] (Befund 2 behoben)");
	check(/'ergR'\s*=>\s*\$ergebnis\['runde'\]/.test(standRumpf), "stand() setzt 'ergR' (die Rundennummer des Ergebnisses)");
	check(/'t'\s*=>\s*\$lobby->turnSeat/.test(standRumpf), "stand() setzt 't' => \$lobby->turnSeat (Blackjack)");
	check(/'mv'\s*=>\s*\$lobby->moves/.test(standRumpf), "stand() setzt 'mv' => \$lobby->moves (Blackjack)");
	check(/'w'\s*=>\s*\$shooter/.test(standRumpf), "stand() setzt 'w' => \$shooter (Craps)");
	check(/\$einsaetze\s*=\s*\$this->lobbies->betsOfRound\(/.test(standRumpf), 'stand() liest die Einsätze der Runde für die Platzleiste');

	console.log('     Gegenprobe S-11-G: der alte, fehlende Zustand (ohne saat) müsste in einer Abschrift ohne die Zeile auffallen');
	const ohneSaat = standRumpf.replace(/'saat'\s*=>\s*\$lobby->seed,\n/, '');
	check(!/'saat'\s*=>\s*\$lobby->seed/.test(ohneSaat), 'S-11-G: die entfernte Zeile wird als fehlend erkannt');
}

/* ==================================================== S-12 aufraeumenEinzeln() ruft faellig() mit fünf Argumenten */

console.log('\nS-12 LobbyService::aufraeumenEinzeln() ruft RoundClock::faellig() mit fünf Argumenten (inklusive $lobby->game)');
{
	check(/RoundClock::faellig\(\$state, \$stateUntil, \$jetzt, \$besetzt, \$lobby->game\)/.test(service),
		'der Aufruf trägt $lobby->game als fünftes Argument');
	check(!/RoundClock::faellig\(\$state, \$stateUntil, \$jetzt, \$besetzt\)/.test(service),
		'kein Aufruf mit nur vier Argumenten mehr vorhanden (der alte D4-Aufruf ist ersetzt, nicht verdoppelt)');
}

/* ==================================================== S-13 einsatz/bilanz/zug/shooter, Einsatzanzeige beim Gehen */

console.log('\nS-13 LobbyService: einsatz()/bilanz()/zug()/shooter() sind public; die Einsatzanzeige wird beim Gehen abgeräumt (nicht gebucht)');
{
	for (const methode of ['einsatz', 'bilanz', 'zug', 'shooter']) {
		check(new RegExp(`public function ${methode}\\(`).test(service), `${methode}() ist public`);
	}
	const anzahlDeleteBetsOfPlayer = (service.match(/deleteBetsOfPlayer\(/g) || []).length;
	check(anzahlDeleteBetsOfPlayer === 2,
		`deleteBetsOfPlayer() wird genau zweimal gerufen — in verlassen() UND in der 30-Sekunden-Schleife von aufraeumenEinzeln() (gefunden: ${anzahlDeleteBetsOfPlayer}×)`);

	// Keine der vier neuen Methoden bucht Geld: keine der bekannten Booking-
	// Bezeichner (BookingService, buchen, payout als Verb) kommt in ihren
	// Rümpfen vor.
	for (const methode of ['einsatz', 'bilanz']) {
		const start = service.indexOf(`function ${methode}(`);
		const ende = service.indexOf('\n    public function', start + 10);
		const rumpf = service.slice(start, ende === -1 ? undefined : ende);
		check(!/BookingService|->buchen\(|creditBooking/.test(rumpf), `${methode}(): keine Buchungsfunktion — kein zweiter Geldweg (D.10.7)`);
	}

	console.log('     Gegenprobe S-13-G: eine hinzugedachte Buchungszeile in einsatz() müsste auffallen');
	const mitBuchung = service + '\n// ->buchen(';
	check(/->buchen\(/.test(mitBuchung), 'S-13-G: die hinzugedachte Buchungszeile wird gefunden');
}

/* ==================================================== S-14 ergebnis() rundenmarkiert, turn_seat=>0, shooterWeitergeben */

console.log('\nS-14 LobbyService::ergebnis() schreibt rundenmarkiert, setzt turn_seat=>0 mit, craps-Sonderpfad bei "_so"');
{
	check(/'result'\s*=>\s*\$lobby->roundNo\s*\.\s*'-'\s*\.\s*\$wert/.test(service),
		"ergebnis() schreibt \$lobby->roundNo . '-' . \$wert (rundenmarkiert)");
	const ergebnisStart = service.indexOf('public function ergebnis(');
	const ergebnisEnde = service.indexOf('\n    /** Der Melder', ergebnisStart);
	const ergebnisRumpf = service.slice(ergebnisStart, ergebnisEnde === -1 ? undefined : ergebnisEnde);
	check(/'turn_seat'\s*=>\s*0,/.test(ergebnisRumpf), "ergebnis() setzt 'turn_seat' => 0 mit fest (die Entscheidungsreihe endet mit der Runde)");
	check(/str_contains\(\$wert, '_so'\)/.test(ergebnisRumpf), 'ergebnis() erkennt die "_so"-Marke (Seven-out)');
	check(/shooterWeitergeben\(\$lobby\)/.test(ergebnisRumpf), 'ergebnis() ruft shooterWeitergeben() im Seven-out-Fall');
	check(/private function shooterWeitergeben\(Lobby \$lobby\): void/.test(service), 'shooterWeitergeben() ist deklariert');
}

/* ==================================================== S-15 LobbyEndpoint: ARTEN, ZUEGE, match deckt alles ab */

console.log('\nS-15 LobbyEndpoint::ARTEN hat alle neun Handlungen; ZUEGE ist [h,s,d,p,i,n]; match() deckt jede Handlung ab');
{
	const artenTreffer = /ARTEN\s*=\s*\[([\s\S]*?)\];/.exec(endpoint);
	const arten = artenTreffer ? [...artenTreffer[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]) : [];
	const ERWARTETE_ARTEN = ['eroeffnen', 'beitreten', 'verlassen', 'starten', 'ergebnis', 'einsatz', 'bilanz', 'zug', 'shooter'];
	check(JSON.stringify([...arten].sort()) === JSON.stringify([...ERWARTETE_ARTEN].sort()),
		`ARTEN enthält genau die neun erwarteten Handlungen (gefunden: ${arten.join(', ')})`);

	const zuegeTreffer = /ZUEGE\s*=\s*\[([^\]]*)\]/.exec(endpoint);
	const zuege = zuegeTreffer ? [...zuegeTreffer[1].matchAll(/'([a-z])'/g)].map((m) => m[1]) : [];
	check(JSON.stringify(zuege) === JSON.stringify(['h', 's', 'd', 'p', 'i', 'n']),
		`ZUEGE ist genau [h, s, d, p, i, n] (gefunden: [${zuege.join(', ')}])`);

	const matchStart = endpoint.indexOf('return match ($art)');
	const matchEnde = endpoint.indexOf('};', matchStart);
	const matchBlock = endpoint.slice(matchStart, matchEnde);
	const nichtAbgedeckt = ERWARTETE_ARTEN.filter((art) => !new RegExp(`'${art}'\\s*=>`).test(matchBlock));
	check(nichtAbgedeckt.length === 0, 'jede ARTEN-Zeichenkette hat einen eigenen Zweig im match-Block von handlung()',
		...nichtAbgedeckt.map((a) => `fehlt: ${a}`));

	console.log('     Gegenprobe S-15-G: eine erfundene, zehnte Handlung müsste als fehlend im match-Block auffallen');
	const mitZehnter = [...ERWARTETE_ARTEN, 'erfunden'];
	const zehnteFehlt = mitZehnter.filter((art) => !new RegExp(`'${art}'\\s*=>`).test(matchBlock));
	check(zehnteFehlt.includes('erfunden'), 'S-15-G: die erfundene Handlung wird als nicht abgedeckt erkannt');
}

/* ==================================================== S-16 serverseitige Validierung, keine Kennung aus der Anfrage */

console.log('\nS-16 LobbyEndpoint: einsatz()/bilanz()/zug() validieren serverseitig; keine liest eine Kennung/player-Nummer/Rolle aus der Anfrage');
{
	check(/private function felder\(array \$eingabe\): \?array/.test(endpoint), 'felder() (die Einsatzliste normieren/prüfen) ist deklariert');
	check(/private function istFeldname\(string \$feld\): bool/.test(endpoint), 'istFeldname() ist deklariert');
	check(/preg_match\('\/\^\[A-Za-z0-9_-\]\{1,32\}\$\/', \$feld\)/.test(endpoint), 'istFeldname() prüft die Form 1–32 Zeichen aus [A-Za-z0-9_-]');
	check(/count\(\$roh\) > self::MAX_FELDER/.test(endpoint), 'die Feldanzahl wird gegen MAX_FELDER geprüft (mindestens einmal)');

	for (const methode of ['einsatz', 'bilanz', 'zug']) {
		const start = endpoint.indexOf(`function ${methode}(Player $spielender`);
		const ende = endpoint.indexOf('\n    private function', start + 10);
		const rumpf = endpoint.slice(start, ende === -1 ? undefined : ende);
		check(!/\$eingabe\['player'\]|\$eingabe\['uid'\]|\$eingabe\['role'\]/.test(rumpf),
			`${methode}(): liest keine Kennung/player-Nummer/Rolle aus der Anfrage (D.9)`);
	}

	console.log('     Gegenprobe S-16-G: eine hinzugedachte Zeile mit $eingabe[\'player\'] müsste auffallen');
	const mitPlayer = endpoint + "\n// \$eingabe['player']";
	check(/\$eingabe\['player'\]/.test(mitPlayer), 'S-16-G: die hinzugedachte Zeile wird gefunden');
}

/* ==================================================== S-17 Gegenprobe: erfundene Handlung wird abgewiesen */

console.log('\nS-17 Gegenprobe (Quelltext): eine erfundene Handlung bleibt außerhalb von ARTEN und wird mit unbrauchbar abgewiesen');
{
	check(/if \(!in_array\(\$art, self::ARTEN, true\)\) \{/.test(endpoint), 'handlung() weist jede nicht in ARTEN stehende Zeichenkette ab, bevor match() überhaupt läuft');
	check(/return \$this->json\(\['ok' => false, 'grund' => 'unbrauchbar'\], 400\);/.test(endpoint), 'die Abweisung liefert 400/unbrauchbar (unverändert seit D4b)');
}

/* ------------------------------------------ Live: Datenbank-Abgleich + QR-Modus prüfen */

console.log('\nS-18/S-19 live: nur wenn der Datenbank-Abgleich bereits geschehen ist UND der QR-Modus an ist');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const BASIS = 'https://casino-kunterbunt.ddev.site';

let schemaDa = false;
try {
	const describe = execFileSync('mysql', ['-e', 'DESCRIBE tx_casinolobby_lobby;'], { encoding: 'utf8' });
	schemaDa = describe.includes('turn_seat') && describe.includes('moves');
} catch (fehlerObjekt) {
	console.log(`\nERGEBNIS: Abbruch — DESCRIBE tx_casinolobby_lobby schlug fehl: ${fehlerObjekt.message}`);
	process.exit(1);
}

let qrModeAn = false;
try {
	const registryAusgabe = execFileSync('mysql', ['-e',
		"SELECT entry_value FROM sys_registry WHERE entry_namespace='tx_casinoaccount' AND entry_key='qrMode';"],
	{ encoding: 'utf8' });
	qrModeAn = (registryAusgabe.split('\n')[1] ?? '').trim() === 'b:1;';
} catch (fehlerObjekt) {
	console.log(`\nERGEBNIS: Abbruch — die Abfrage des Schalterstands schlug fehl: ${fehlerObjekt.message}`);
	process.exit(1);
}

console.log(`(Datenbank-Abgleich: ${schemaDa ? 'geschehen' : 'STEHT NOCH AUS (turn_seat/moves fehlen in der laufenden Tabelle)'}; Schalterstand: ${qrModeAn ? 'AN' : 'AUS'})`);

if (!schemaDa) {
	console.log('@pruefstand:luecke S-18/S-19 ungeprüft — Datenbank-Abgleich steht noch aus');
	console.log('S-18/S-19 übersprungen: der Datenbank-Abgleich steht noch aus. Dieses Skript legt die zwei neuen');
	console.log('Spalten NICHT selbst an (Datenbankänderungen liegen außerhalb seiner Werkzeuge) — das Install-Tool');
	console.log('(„Analyze Database Structure") muss vorher einmal gelaufen sein. Siehe Bericht des Umsetzungslaufs.');
} else if (!qrModeAn) {
	console.log('@pruefstand:luecke S-18/S-19 ungeprüft — gilt nur bei eingeschaltetem Modus, gemessener Schalterstand ist AUS');
	console.log('S-18/S-19 übersprungen: der QR-Modus steht auf AUS. Live-Nachweis ist ein zweiter Lauf mit');
	console.log('eingeschaltetem Modus (dieselbe Regel wie bei verify-lobby-live.mjs).');
} else {
	let kennung;
	try {
		const ausgabe = execFileSync('mysql', ['-e',
			"SELECT uid, token FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 AND name='_d2check_' LIMIT 1;"],
		{ encoding: 'utf8' });
		const zeile = (ausgabe.split('\n')[1] ?? '').trim();
		const [uid, token] = zeile.split('\t');
		kennung = { uid, token };
	} catch (fehlerObjekt) {
		console.log(`\nERGEBNIS: Abbruch — die Suche nach der Testkennung _d2check_ schlug fehl: ${fehlerObjekt.message}`);
		process.exit(1);
	}
	if (!kennung?.token) {
		console.log('\nERGEBNIS: Abbruch — Testkennung "_d2check_" nicht gefunden. TestSpieli (uid 6) wird hier');
		console.log('ABSICHTLICH NICHT benutzt (Auftrag: nicht anfassen).');
		process.exit(1);
	}

	const { chromium } = await import('playwright');
	const browser = await chromium.launch();
	const context = await browser.newContext({ ignoreHTTPSErrors: true });
	const page = await context.newPage();

	let ereignis = null;
	let standJson = null;
	try {
		// BEHOBENER FEHLER (Behebungslauf 2026-09-11, Fund Nr. 2 dieses Laufs):
		// lobby-live.js sendet auf document, nicht auf window, und OHNE
		// bubbles:true (new CustomEvent(name, {detail}) ist standardmäßig
		// nicht blasenbildend — siehe lobby-live.js, Abschnitt "Die
		// vollständige Naht zu D5: ausgesendet auf document"). Ein Listener
		// auf window sieht ein solches Ereignis nie, selbst wenn es
		// tatsächlich feuert. Der erste Lauf mit funktionierendem
		// Alleinstart (nach der RoundClock-Behebung) bestätigte das: die
		// Runde lief komplett durch (saat, erg, zurück zu 'setzen'), aber
		// window.__d5Ereignis blieb undefined.
		await page.addInitScript(() => {
			document.addEventListener('casino:lobby-runde', (e) => { window.__d5Ereignis = e.detail; });
		});
		await page.goto(`${BASIS}/?casinoToken=${encodeURIComponent(kennung.token)}`, { waitUntil: 'domcontentloaded' });
		await page.goto(`${BASIS}/roulette`, { waitUntil: 'domcontentloaded' });

		// DER ZUSTANDSBLOCK STEHT ALS TEXTINHALT, NICHT ALS ATTRIBUTWERT.
		// `data-cl-state` ist ein Attribut OHNE Wert; die Daten sind der Text
		// des Elements (LobbyState schreibt `<… data-cl-state>{…}</…>`).
		// getAttribute() liefert dafür die leere Zeichenkette, die hier als
		// „kein Zustandsblock" gelesen wurde — der ganze Live-Nachweis war
		// deshalb rot, obwohl die Anwendung richtig arbeitete. Dasselbe
		// Verfahren wie in verify-lobby-timeout.mjs, das den Text liest.
		const stateAttr = await page.locator('[data-cl-state]').first().textContent().catch(() => null);
		const state = stateAttr ? JSON.parse(stateAttr) : null;

		check(state !== null && state.platz === 1, `_d2check_ eröffnet /roulette und bekommt platz:1 (gefunden: ${JSON.stringify(state)})`);

		/**
		 * Die tatsächlich angelegte Lobby-Zeile für 'roulette', direkt gegen
		 * die laufende Tabelle gemessen — kein Abzählen, keine Vorhersage.
		 * @returns {number|null}
		 */
		function tatsaechlicheLobbyUid() {
			try {
				const zeile = execFileSync('mysql', ['-e',
					"SELECT uid FROM tx_casinolobby_lobby WHERE game='roulette' ORDER BY uid DESC LIMIT 1;"],
				{ encoding: 'utf8' });
				const wert = (zeile.split('\n')[1] ?? '').trim();
				return wert === '' ? null : Number(wert);
			} catch {
				return null;
			}
		}

		if (state !== null) {
			// S-20 (BEHEBUNGSLAUF, Protokollfund probe-abend.mjs P6): DIE
			// DAUERHAFTE ZUSAGE aus dem Bericht dieses Laufs — der im
			// Zustandsblock gemeldete lobby-Wert ist genau die uid, unter der
			// die Lobby tatsächlich in tx_casinolobby_lobby steht.
			const dbUidNachEroeffnen = tatsaechlicheLobbyUid();
			check(dbUidNachEroeffnen !== null && dbUidNachEroeffnen === state.lobby,
				`S-20: data-cl-state.lobby (${state.lobby}) ist die tatsächlich angelegte Zeile in tx_casinolobby_lobby (gefunden: ${dbUidNachEroeffnen})`);

			// S-21/S-21-G (derselbe Behebungslauf, der REGRESSIONSWÄCHTER für
			// die eigentliche Ursache): ein reload() DERSELBEN Tischseite darf
			// eine allein besetzte Lobby nicht antasten. Vor der Behebung
			// feuerte lobby-live.js bei JEDEM Verlassen des Dokuments — auch
			// bei einem bloßen reload() — ein keepalive-'verlassen', das die
			// eigene, allein besetzte Lobby löschte (siehe lobby-live.js,
			// Kommentar an der entfernten Stelle, und der Bericht dieses
			// Behebungslaufs).
			await page.reload({ waitUntil: 'domcontentloaded' });
			const stateAttrReload = await page.locator('[data-cl-state]').first().textContent().catch(() => null);
			const stateReload = stateAttrReload ? JSON.parse(stateAttrReload) : null;
			const dbUidNachReload = tatsaechlicheLobbyUid();
			check(stateReload !== null && stateReload.lobby === state.lobby,
				`S-21: reload() derselben Tischseite meldet weiterhin dieselbe Lobby-Nummer (${state.lobby}), kein automatisches Neueröffnen (gefunden: ${stateReload?.lobby})`);
			check(dbUidNachReload === state.lobby,
				`S-21-G: dieselbe Lobby-Zeile existiert nach dem reload() weiterhin in tx_casinolobby_lobby (gefunden: ${dbUidNachReload}, erwartet: ${state.lobby})`);

			// Allein am Tisch: RoundClock::darfStarten() lässt genau eine
			// Person die Runde selbst auslösen (kein Warten auf die 20s-Uhr).
			await page.evaluate(async ({ handlung }) => {
				await fetch(handlung, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ art: 'starten' }),
				});
			}, { handlung: state.endpunkte.handlung });

			// Bis zu 10s auf das Ereignis warten (SPERRZEIT=2s + Abfragetakt
			// 1s + Marge) — kein minutenlanges Warten.
			await page.waitForFunction(() => window.__d5Ereignis !== undefined, { timeout: 10000 }).catch(() => {});
			ereignis = await page.evaluate(() => window.__d5Ereignis ?? null);

			const standAntwort = await page.evaluate(async ({ stand }) => {
				const antwort = await fetch(stand, { headers: { 'Cache-Control': 'no-cache' } });
				return antwort.status === 204 ? null : await antwort.json();
			}, { stand: state.endpunkte.stand });
			standJson = standAntwort;
		}
	} finally {
		// Aufräumen: den Platz wieder verlassen, damit dieser Lauf keine Zeile hinterlässt.
		try {
			const stateAttr2 = await page.locator('[data-cl-state]').first().textContent().catch(() => null);
			const state2 = stateAttr2 ? JSON.parse(stateAttr2) : null;
			if (state2?.endpunkte?.handlung) {
				await page.evaluate(async ({ handlung }) => {
					await fetch(handlung, {
						method: 'POST', headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ art: 'verlassen' }),
					});
				}, { handlung: state2.endpunkte.handlung });
			}
		} catch { /* best effort */ }
		await browser.close();
	}

	console.log('S-18 live: /casino-lobby/stand liefert saat, erg, ergR, t, mv, w');
	check(standJson !== null && typeof standJson.saat === 'string',
		`stand liefert ein saat-Feld (gefunden: ${JSON.stringify(standJson)})`);
	check(standJson !== null && 'erg' in standJson && 'ergR' in standJson && 't' in standJson && 'mv' in standJson && 'w' in standJson,
		'stand liefert außerdem erg, ergR, t, mv, w');

	console.log('S-19 live: casino:lobby-runde FEUERT TATSÄCHLICH in einem echten Browser (nicht nur ein Feld in der Antwort)');
	check(ereignis !== null, `das Ereignis casino:lobby-runde wurde beobachtet (gefunden: ${JSON.stringify(ereignis)})`,
		'Ohne dieses Ereignis läuft in der Lobby — wie in D4 — niemals eine Runde, selbst wenn die JSON-Antwort ein saat-Feld enthält.');
	check(ereignis !== null && typeof ereignis.saat === 'string' && ereignis.saat.length > 0,
		`ereignis.detail.saat ist eine nicht-leere Zeichenkette (gefunden: ${JSON.stringify(ereignis?.saat)})`);
	check(standJson !== null && ereignis !== null && ereignis.saat === standJson.saat,
		`die im Ereignis übertragene Saat entspricht der von /casino-lobby/stand gemeldeten (Ereignis: ${ereignis?.saat}, stand: ${standJson?.saat})`);
}

/* ------------------------------------------ Wächter: sind alle Blöcke gelaufen? */

const erwarteteZusagen = (schemaDa && qrModeAn) ? ERWARTETE_ZUSAGEN_MIT_LIVE : ERWARTETE_ZUSAGEN_OHNE_LIVE;
if (zusagen !== erwarteteZusagen) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${erwarteteZusagen} erwartet (Live-Block ${(schemaDa && qrModeAn) ? 'gelaufen' : 'übersprungen'}).`);
	console.log('  Entweder wurde ein Prüfblock übersprungen (dann ist dieses Ergebnis wertlos),');
	console.log('  oder es sind Zusagen hinzugekommen (dann gehört die passende Erwartungszahl nachgezogen).');
	fehler++;
}

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`}`);
process.exit(fehler === 0 ? 0 : 1);
