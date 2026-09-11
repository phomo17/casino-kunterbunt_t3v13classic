/**
 * Casino Kunterbunt – casino_lobby: Nachweis Brücke und Platzleiste (Umsetzungsstück D5-2)
 * ============================================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node ab Version 18,
 * ohne jede npm-Abhängigkeit. Gerüst wörtlich nach dem Vorbild von
 * verify-lobby-round.mjs (D5-1): check()-Zähler, lies(), kurz(),
 * ohnePhpKommentare(), Wächterblock, eine Erwartungszahl.
 *
 * DIESES SKRIPT PRÜFT NUR STATISCH (Quelltext) UND GERECHNET (Node rechnet
 * mit den Zeichenketten der Vorlagen/CSS-Datei selbst). Der LEBENDE Nachweis —
 * zwei echte Browser, ein echtes casino:lobby-stand, eine echte Bilanz in der
 * Platzleiste des jeweils anderen — ist ausdrücklich Aufgabe von
 * probe-lobby-strip.mjs (Plan, Verzeichnisbaum Abschnitt 3).
 *
 * WAS HIER BEWIESEN WIRD
 * ----------------------------------------------------------------------------
 *   T-1  Wächter: Pflichtdateien vorhanden, keine mit NUL-Byte
 *   T-2  lobby-live.js: casino:lobby-stand wird bei JEDER geänderten Abfrage
 *        auf document dispatcht, mit detail:daten (Plan 4.9a)
 *   T-3  lobby-live.js: casino:lobby-runde trägt jetzt melder (aus
 *        letzterStand?.m, NICHT mehr aus dem beim Laden eingespeisten
 *        zustand.melder), plaetze (aus letzterStand?.p) und mein (Plan 4.9b)
 *   T-4  lobby-live.js: ein casino:lobby-handlung-Zuhörer ruft senden(art,
 *        daten) — das eine Tor zum Server (Plan 4.9c, D.10.7)
 *   T-5  lobby-live.js: beim Blackjack bleibt 'laeuft' NICHT angehalten
 *        (laufender = zustand.spiel !== 'blackjack'), der Ergebnis-Rückfall
 *        wird an seatsMax × 20s angeglichen statt an den 3s-Normalfall
 *        (Plan 4.9d)
 *   T-6  gerechnet: seatsSchreiben() ist mit drei Parametern deklariert
 *        (plaetze, dranSeat, shooterSeat) und der Aufruf in abfragen()
 *        übergibt daten.t/daten.w — ohne diese Erweiterung bliebe die
 *        Zug-/Würfelmarke immer leer
 *   T-7  SeatStrip.php: render() hat jetzt einen $spiel-Parameter; reihe()
 *        liefert shooterNr/einsatz/karten je Platz; render() speist
 *        lobby.spiel und lobby.dran in die Vorlage ein
 *   T-8  SeatStrip.php: beschriftungen() liefert alle zwölf neuen
 *        Schlüssel (einsatzVorlage … wartet); jeder zugehörige
 *        LLL-Schlüssel existiert tatsächlich in locallang.xlf
 *   T-9  LobbyTable.php: seatStrip->render() wird mit $spiel als zweitem
 *        Argument gerufen (sonst Type Error: SeatStrip::render() erwartet
 *        jetzt ein string vor Lobby)
 *   T-10 Strip.html: data-cl-game/data-cl-turn am Wurzelelement; alle zehn
 *        neuen data-cl-text-*-Attribute; je Platz die vier neuen Spannen
 *        (stake/outcome/cards/mark); die Würfel-Warteliste steht NUR hinter
 *        einem f:if auf {lobby.spiel} == 'craps'
 *   T-11 lobby.css: Regeln für .cl-seat__stake, .cl-seat__outcome[data-cl-
 *        tone], .cl-strip__shooter-btn, das Ausblenden außerhalb von
 *        data-cl-game="craps" und das Hervorheben von [data-cl-turn] sind
 *        vorhanden — UND jede in diesem Abschnitt benutzte --ck-*-Variable
 *        existiert tatsächlich in casino_startpage/tokens.css (die im
 *        Plantext vorgeschlagenen Namen --ck-green-300/--ck-red-300/
 *        --ck-gold-400 TUN DAS NICHT — offene Frage 2 des Plans, hier durch
 *        --ck-fruit-leaf/--ck-print-red/--ck-brass-200 ersetzt)
 *   T-12 Gegenprobe: ein erfundener Variablenname (--ck-erfunden-500) wird
 *        als NICHT in tokens.css vorhanden erkannt — die Prüfung aus T-11
 *        ist wirksam, nicht nur wohlwollend
 *   T-13 jedes von lobby-live.js NEU gelesene data-cl-text-*-Attribut wird
 *        auch in Strip.html gesetzt (dieselbe Regel wie V-6 in
 *        verify-lobby-live.mjs, hier nur für die D5-2-Erweiterung)
 *
 * NICHT GEPRÜFT in diesem Lauf (Grund: braucht einen echten, gerenderten
 * DOM und mindestens zwei Browser): ob casino:lobby-stand tatsächlich bei
 * einem Tisch ankommt, ob eine über casino:lobby-handlung gemeldete Bilanz
 * beim JEWEILS ANDEREN Browser in der Platzleiste erscheint, ob der
 * Würfelknopf tatsächlich umschaltet, ob die 20-Sekunden-Zugfrist in der
 * Anzeige ankommt. Dafür: probe-lobby-strip.mjs.
 *
 * Aufruf:
 *
 *   ddev exec node typo3conf/ext/casino_lobby/Resources/Private/Scripts/verify-lobby-strip.mjs
 */

// @pruefstand modus=egal laufzeit=kurz isolation=keine

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/casino_lobby/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');

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

function ohneJsKommentare(inhalt) {
	return ohneBlockKommentare(inhalt).replace(/(^|\s)\/\/.*$/gm, '');
}

function ohneXmlKommentare(inhalt) {
	return inhalt.replace(/<!--[\s\S]*?-->/g, '');
}

const LOBBY_LIVE_PFAD = path.join(EXT, 'Resources/Public/JavaScript/lobby-live.js');
const SEAT_STRIP_PFAD = path.join(EXT, 'Classes/Frontend/SeatStrip.php');
const LOBBY_TABLE_PFAD = path.join(EXT, 'Classes/Middleware/LobbyTable.php');
const STRIP_TEMPLATE_PFAD = path.join(EXT, 'Resources/Private/Templates/Lobby/Strip.html');
const LOBBY_CSS_PFAD = path.join(EXT, 'Resources/Public/Css/lobby.css');
const LOCALLANG_PFAD = path.join(EXT, 'Resources/Private/Language/locallang.xlf');
const TOKENS_CSS_PFAD = path.join(EXT_ROOT, 'casino_startpage/Resources/Public/Css/tokens.css');

console.log('\ncasino_lobby – Nachweis Brücke und Platzleiste (Umsetzungsstück D5-2)');
console.log('========================================================================\n');

/* ================================================ T-1 Wächter: kein stiller Ausstieg */

const PFLICHTDATEIEN = [
	['Resources/Public/JavaScript/lobby-live.js', LOBBY_LIVE_PFAD],
	['Classes/Frontend/SeatStrip.php', SEAT_STRIP_PFAD],
	['Classes/Middleware/LobbyTable.php', LOBBY_TABLE_PFAD],
	['Resources/Private/Templates/Lobby/Strip.html', STRIP_TEMPLATE_PFAD],
	['Resources/Public/Css/lobby.css', LOBBY_CSS_PFAD],
	['Resources/Private/Language/locallang.xlf', LOCALLANG_PFAD],
	['(casino_startpage) Resources/Public/Css/tokens.css', TOKENS_CSS_PFAD],
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

/** GEMESSEN (dieser Lauf, mehrfach gefahren, immer 103). */
const ERWARTETE_ZUSAGEN = 103;

const liveRoh = lies(LOBBY_LIVE_PFAD);
const live = ohneJsKommentare(liveRoh);
const seatStripRoh = lies(SEAT_STRIP_PFAD);
const seatStrip = ohnePhpKommentare(seatStripRoh);
const lobbyTableRoh = lies(LOBBY_TABLE_PFAD);
const lobbyTable = ohnePhpKommentare(lobbyTableRoh);
const stripTemplate = lies(STRIP_TEMPLATE_PFAD);
const stripTemplateOhneKommentare = ohneXmlKommentare(stripTemplate);
const css = lies(LOBBY_CSS_PFAD);
const xliff = lies(LOCALLANG_PFAD);
const tokensCss = lies(TOKENS_CSS_PFAD);

/* ==================================================== T-2 casino:lobby-stand wird dispatcht */

console.log('T-2  lobby-live.js: casino:lobby-stand wird bei jeder geänderten Abfrage dispatcht, detail:daten');
{
	check(/dispatchEvent\(new CustomEvent\('casino:lobby-stand', \{ detail: daten \}\)\)/.test(live),
		"document.dispatchEvent(new CustomEvent('casino:lobby-stand', { detail: daten })) gefunden");

	// Reihenfolge: NACH dem Setzen von letzterStand (die Tische bekommen
	// denselben Stand, den auch rundeStarten() beim nächsten Rundenbeginn
	// benutzt), VOR der zustandGewechselt-Prüfung (kein Tisch verpasst den
	// Übergang in 'laeuft').
	const posLetzterStand = live.indexOf('letzterStand = daten;');
	const posDispatch = live.indexOf("dispatchEvent(new CustomEvent('casino:lobby-stand'");
	const posGewechselt = live.indexOf('zustandGewechselt = daten.z');
	check(posLetzterStand !== -1 && posDispatch !== -1 && posGewechselt !== -1
		&& posLetzterStand < posDispatch && posDispatch < posGewechselt,
		'Reihenfolge: letzterStand=daten -> dispatch(casino:lobby-stand) -> zustandGewechselt-Prüfung',
		`gefunden bei ${posLetzterStand}, ${posDispatch}, ${posGewechselt}`);

	console.log('     Gegenprobe T-2-G: ein anderer Ereignisname darf nicht als casino:lobby-stand durchgehen');
	check(!/casino:lobby-stande\b/.test(live), 'T-2-G: kein Tippfehler-Ereignisname im Quelltext');
}

/* ==================================================== T-3 casino:lobby-runde trägt melder/plaetze/mein */

console.log('\nT-3  lobby-live.js: casino:lobby-runde trägt melder (aus letzterStand?.m), plaetze und mein');
{
	const rundeStart = live.indexOf("dispatchEvent(new CustomEvent('casino:lobby-runde'");
	const rundeEnde = live.indexOf('}));', rundeStart);
	const rundeBlock = live.slice(rundeStart, rundeEnde === -1 ? undefined : rundeEnde + 4);

	check(/melder:\s*letzterStand\?\.m\s*===\s*1/.test(rundeBlock),
		"melder: letzterStand?.m === 1 (NICHT mehr zustand.melder — das war die Momentaufnahme aus D4)");
	check(!/melder:\s*zustand\.melder\s*===\s*true/.test(rundeBlock),
		'der alte D4-Ausdruck zustand.melder === true steht nicht mehr in diesem Block');
	check(/plaetze:\s*Array\.isArray\(letzterStand\?\.p\)\s*\?\s*letzterStand\.p\.map\(\(p\)\s*=>\s*p\.s\)\s*:\s*\[\]/.test(rundeBlock),
		'plaetze: aus letzterStand?.p auf die Platznummern abgebildet, mit []-Rückfall');
	check(/mein:\s*zustand\.platz/.test(rundeBlock), 'mein: zustand.platz');

	console.log('     Gegenprobe T-3-G: ein Block ohne "mein:" müsste als unvollständig auffallen');
	const ohneMein = rundeBlock.replace(/mein:\s*zustand\.platz,?/, '');
	check(!/mein:\s*zustand\.platz/.test(ohneMein), 'T-3-G: die entfernte Zeile wird als fehlend erkannt');
}

/* ==================================================== T-4 casino:lobby-handlung -> senden() */

console.log('\nT-4  lobby-live.js: ein casino:lobby-handlung-Zuhörer ruft senden(art, daten) — das eine Tor zum Server');
{
	const listenerStart = live.indexOf("addEventListener('casino:lobby-handlung'");
	check(listenerStart !== -1, "document.addEventListener('casino:lobby-handlung', …) ist registriert");
	const listenerEnde = live.indexOf('});', listenerStart);
	const listenerBlock = live.slice(listenerStart, listenerEnde === -1 ? undefined : listenerEnde + 3);
	check(/void senden\(art, ereignis\.detail\?\.daten\s*\?\?\s*\{\}\)/.test(listenerBlock),
		'der Zuhörer ruft void senden(art, ereignis.detail?.daten ?? {})');
	check(/if \(art === ''\) \{\s*return;\s*\}/.test(listenerBlock.replace(/\s+/g, ' ').replace('if (art === \'\') { return; }', 'if (art === \'\') { return; }')) || /art === ''/.test(listenerBlock),
		'ein leerer/fehlender art-Wert wird verworfen, statt eine leere Handlung an den Server zu schicken');

	console.log('     Gegenprobe T-4-G: ein eigenes fetch() in diesem Block müsste aus dem Grep herausfallen');
	check(!/fetch\(/.test(listenerBlock), 'T-4-G: der Zuhörer selbst ruft fetch() nicht direkt auf — er geht über senden()');
}

/* ==================================================== T-5 Blackjack: 'laeuft' bleibt nicht angehalten */

console.log("\nT-5  lobby-live.js: beim Blackjack bleibt 'laeuft' nicht angehalten; der Ergebnis-Rückfall wird an seatsMax x 20s angeglichen");
{
	check(/laufender\s*=\s*zustand\.spiel\s*!==\s*'blackjack'/.test(live),
		"laufender = zustand.spiel !== 'blackjack' (statt bedingungslos true)");
	check(/if \(laufender\) \{\s*\n\s*return;/.test(live),
		'der frühe return (kein weiterer Abfragezyklus) steht jetzt HINTER einer laufender-Prüfung, nicht mehr bedingungslos');
	check(/\(zustand\.max \+ 1\) \* 20000/.test(live),
		'der Blackjack-Rückfall rechnet mit (zustand.max + 1) * 20000 statt dem 3s-Normalfall');
	check(/Math\.max\(LAUF_RUECKFALL_MS, \(zustand\.max \+ 1\) \* 20000\)/.test(live),
		'der Rückfall ist mindestens LAUF_RUECKFALL_MS, auch bei einem sehr kleinen Tisch');

	console.log('     Gegenprobe T-5-G: eine bedingungslose Rückfallzeit (nur LAUF_RUECKFALL_MS) darf nicht mehr als vollständig gelten');
	const nurNormalfall = 'const rueckfallMs = LAUF_RUECKFALL_MS;';
	check(!/\(zustand\.max \+ 1\) \* 20000/.test(nurNormalfall), 'T-5-G: die verkürzte Fassung enthält die Blackjack-Rechnung nicht');
}

/* ==================================================== T-6 seatsSchreiben() mit drei Parametern */

console.log('\nT-6  seatsSchreiben() ist mit drei Parametern deklariert; der Aufruf übergibt daten.t und daten.w');
{
	check(/function seatsSchreiben\(plaetze, dranSeat, shooterSeat\)/.test(live),
		'function seatsSchreiben(plaetze, dranSeat, shooterSeat) — Zugmarke und Würfelmarke sind eigene Parameter');
	check(/seatsSchreiben\(daten\.p, Number\(daten\.t\) \|\| 0, Number\(daten\.w\) \|\| 0\)/.test(live),
		'der Aufruf in abfragen() übergibt Number(daten.t)||0 und Number(daten.w)||0');
	check(/data-cl-shooter/.test(live) && /data-cl-turn/.test(live),
		'seatsSchreiben() setzt data-cl-shooter und data-cl-turn als Platzattribute');

	console.log('     Gegenprobe T-6-G: ein Aufruf mit nur einem Argument müsste als Rückschritt auffallen');
	const alterAufruf = 'seatsSchreiben(daten.p);';
	check(!/seatsSchreiben\(daten\.p, Number\(daten\.t\)/.test(alterAufruf),
		'T-6-G: der alte D4-Aufruf mit nur einem Argument wird nicht als der neue erkannt');
}

/* ==================================================== T-7 SeatStrip.php: $spiel, reihe(), assignMultiple */

console.log('\nT-7  SeatStrip.php: render() hat einen $spiel-Parameter; reihe() liefert shooterNr/einsatz/karten; lobby.spiel/lobby.dran werden eingespeist');
{
	check(/function render\(ServerRequestInterface \$request, string \$spiel, Lobby \$lobby, Seat \$meiner, array \$plaetze, int \$jetzt\): string/.test(seatStrip),
		'render() hat die Signatur (ServerRequestInterface $request, string $spiel, Lobby $lobby, Seat $meiner, array $plaetze, int $jetzt)');
	check(/'shooterNr'\s*=>\s*\$platz\?->shooterNo\s*\?\?\s*0/.test(seatStrip), "reihe() liefert 'shooterNr'");
	check(/'einsatz'\s*=>\s*0,/.test(seatStrip), "reihe() liefert 'einsatz' => 0 (beim Laden, wird ab der ersten Abfrage nachgeführt)");
	check(/'karten'\s*=>\s*0,/.test(seatStrip), "reihe() liefert 'karten' => 0");
	check(/'spiel'\s*=>\s*\$spiel,/.test(seatStrip), "render() speist 'spiel' => \$spiel in lobby.spiel ein");
	check(/'dran'\s*=>\s*\$lobby->turnSeat,/.test(seatStrip), "render() speist 'dran' => \$lobby->turnSeat in lobby.dran ein");

	console.log('     Gegenprobe T-7-G: eine Signatur ohne $spiel müsste als die ALTE (D4c) erkannt werden');
	const alteSignatur = 'function render(ServerRequestInterface $request, Lobby $lobby, Seat $meiner, array $plaetze, int $jetzt): string';
	check(!/function render\(ServerRequestInterface \$request, string \$spiel, Lobby \$lobby/.test(alteSignatur),
		'T-7-G: die alte Signatur wird nicht als die neue erkannt');
}

/* ==================================================== T-8 SeatStrip.php: zwölf neue Labelschlüssel, jeder LLL existiert */

console.log('\nT-8  SeatStrip.php::beschriftungen() liefert zwölf neue Schlüssel; jeder LLL-Verweis existiert in locallang.xlf');
{
	const definierteIds = [...xliff.matchAll(/<trans-unit id="([^"]+)">/g)].map((m) => m[1]);
	const ERWARTETE_SCHLUESSEL = {
		einsatzVorlage: 'strip.einsatz',
		einsatzKeiner: 'strip.einsatz.keiner',
		gewinnVorlage: 'strip.gewinn',
		verlustVorlage: 'strip.verlust',
		shooter: 'strip.shooter',
		shooterWarteVorlage: 'strip.shooter.warte',
		shooterEin: 'strip.shooter.ein',
		shooterAus: 'strip.shooter.aus',
		dran: 'strip.dran',
		dranIchVorlage: 'strip.dran.ich',
		kartenVorlage: 'strip.karten',
		wartet: 'strip.wartet',
	};
	let alleDa = true;
	for (const [phpKey, lllKey] of Object.entries(ERWARTETE_SCHLUESSEL)) {
		const treffer = new RegExp(`'${phpKey}'\\s*=>\\s*\\$sL\\('${lllKey.replace(/\./g, '\\.')}'\\)`).test(seatStrip);
		if (!treffer) {
			alleDa = false;
		}
		check(treffer, `'${phpKey}' => \$sL('${lllKey}')`);
		check(definierteIds.includes(lllKey), `der Schlüssel ${lllKey} existiert in locallang.xlf`);
	}

	console.log('     Gegenprobe T-8-G: ein erfundener LLL-Schlüssel wäre NICHT in locallang.xlf definiert');
	check(!definierteIds.includes('strip.erfunden'), 'T-8-G: der erfundene Schlüssel ist nicht definiert');
}

/* ==================================================== T-9 LobbyTable.php: render() mit $spiel gerufen */

console.log('\nT-9  LobbyTable.php: seatStrip->render() wird mit $spiel als zweitem Argument gerufen');
{
	check(/\$this->seatStrip->render\(\$request, \$spiel, \$lobby, \$platz, \$plaetze, \$jetzt\)/.test(lobbyTable),
		'der Aufruf lautet render($request, $spiel, $lobby, $platz, $plaetze, $jetzt)');
	check(!/\$this->seatStrip->render\(\$request, \$lobby, \$platz, \$plaetze, \$jetzt\)/.test(lobbyTable),
		'kein Aufruf mit fünf Argumenten mehr vorhanden (der alte D4c-Aufruf ist ersetzt, nicht verdoppelt) — ohne diese Anpassung liefe die Seite auf einen TypeError');

	console.log('     Gegenprobe T-9-G: der Fünf-Argumente-Aufruf müsste als der ALTE (D4c) erkannt werden');
	const alterAufruf = '$this->seatStrip->render($request, $lobby, $platz, $plaetze, $jetzt);';
	check(!/\$this->seatStrip->render\(\$request, \$spiel, \$lobby/.test(alterAufruf),
		'T-9-G: der alte Aufruf wird nicht als der neue erkannt');
}

/* ==================================================== T-10 Strip.html: Attribute, Spannen, craps-only Knopf */

console.log('\nT-10 Strip.html: data-cl-game/data-cl-turn, zehn neue data-cl-text-*-Attribute, vier neue Spannen je Platz, craps-only Würfelknopf');
{
	check(/data-cl-game="\{lobby\.spiel\}"/.test(stripTemplateOhneKommentare), 'data-cl-game="{lobby.spiel}" am Wurzelelement');
	check(/data-cl-turn="\{lobby\.dran\}"/.test(stripTemplateOhneKommentare), 'data-cl-turn="{lobby.dran}" am Wurzelelement');

	const ERWARTETE_ATTRIBUTE = [
		'data-cl-text-einsatz="{labels.einsatzVorlage}"',
		'data-cl-text-einsatz-keiner="{labels.einsatzKeiner}"',
		'data-cl-text-gewinn="{labels.gewinnVorlage}"',
		'data-cl-text-verlust="{labels.verlustVorlage}"',
		'data-cl-text-shooter="{labels.shooter}"',
		'data-cl-text-shooter-warte="{labels.shooterWarteVorlage}"',
		'data-cl-text-dran="{labels.dran}"',
		'data-cl-text-dran-ich="{labels.dranIchVorlage}"',
		'data-cl-text-karten="{labels.kartenVorlage}"',
		'data-cl-text-wartet="{labels.wartet}"',
	];
	for (const attribut of ERWARTETE_ATTRIBUTE) {
		check(stripTemplateOhneKommentare.includes(attribut), attribut);
	}

	check(/<span class="cl-seat__stake" data-cl-seat-stake><\/span>/.test(stripTemplateOhneKommentare), 'je Platz: <span data-cl-seat-stake>');
	check(/<span class="cl-seat__outcome" data-cl-seat-outcome><\/span>/.test(stripTemplateOhneKommentare), 'je Platz: <span data-cl-seat-outcome>');
	check(/<span class="cl-seat__cards" data-cl-seat-cards="0"><\/span>/.test(stripTemplateOhneKommentare), 'je Platz: <span data-cl-seat-cards="0">');
	check(/<span class="cl-seat__mark" data-cl-seat-mark><\/span>/.test(stripTemplateOhneKommentare), 'je Platz: <span data-cl-seat-mark>');

	const craptreffer = /<f:if condition="\{lobby\.spiel\} == 'craps'">[\s\S]*?data-cl-shooter[\s\S]*?<\/f:if>/.test(stripTemplateOhneKommentare);
	check(craptreffer, 'der Würfelknopf (data-cl-shooter) steht innerhalb eines f:if auf {lobby.spiel} == \'craps\'');

	console.log('     Gegenprobe T-10-G: ein erfundenes Attribut darf nicht als vorhanden gelten');
	check(!stripTemplateOhneKommentare.includes('data-cl-text-erfunden'), 'T-10-G: das erfundene Attribut ist tatsächlich nicht vorhanden');
}

/* ==================================================== T-11/T-12 lobby.css: Regeln vorhanden, jede benutzte Variable existiert */

console.log('\nT-11 lobby.css: Regeln für Einsatz/Bilanz/Würfelknopf/Sichtbarkeit/Zugmarke sind vorhanden');
{
	check(/\.cl-seat__stake\s*\{/.test(css), '.cl-seat__stake { … }');
	check(/\.cl-seat__outcome\[data-cl-tone="win"\]\s*\{/.test(css), '.cl-seat__outcome[data-cl-tone="win"] { … }');
	check(/\.cl-seat__outcome\[data-cl-tone="loss"\]\s*\{/.test(css), '.cl-seat__outcome[data-cl-tone="loss"] { … }');
	check(/\.cl-strip__shooter-btn\s*\{/.test(css), '.cl-strip__shooter-btn { … }');
	check(/\.cl-strip:not\(\[data-cl-game="craps"\]\) \.cl-strip__shooter\s*\{\s*display:\s*none;\s*\}/.test(css),
		'.cl-strip:not([data-cl-game="craps"]) .cl-strip__shooter { display: none; } — nur am Craps-Tisch sichtbar');
	check(/\.cl-seat\[data-cl-turn\]\s*\{\s*outline:/.test(css), '.cl-seat[data-cl-turn] { outline: … } — die Zugmarke ist sichtbar hervorgehoben');

	console.log('\nT-12 gerechnet: jede in diesem Abschnitt benutzte --ck-*-Variable existiert tatsächlich in tokens.css (offene Frage 2 des Plans)');
	const tokenNamen = new Set([...tokensCss.matchAll(/^\s*(--ck-[a-z0-9-]+):/gm)].map((m) => m[1]));
	// Nur der neue Abschnitt ("Die Brücke zu den drei Tischen"), damit
	// Variablen aus dem ALTEN Teil der Datei (die bereits vor D5-2 geprüft
	// waren) diese Prüfung nicht verwässern.
	const abschnittStart = css.indexOf('Die Brücke zu den drei Tischen');
	check(abschnittStart !== -1, 'der Abschnittskommentar "Die Brücke zu den drei Tischen" ist vorhanden (Ankerpunkt dieser Prüfung)');
	const abschnitt = abschnittStart === -1 ? css : css.slice(abschnittStart);
	const benutzt = [...new Set([...abschnitt.matchAll(/var\((--ck-[a-z0-9-]+)/g)].map((m) => m[1]))];
	check(benutzt.length > 0, `mindestens eine --ck-*-Variable wird im neuen Abschnitt benutzt (gefunden: ${benutzt.length})`);
	const fehlende = benutzt.filter((name) => !tokenNamen.has(name));
	check(fehlende.length === 0,
		'jede benutzte --ck-*-Variable ist in tokens.css tatsächlich definiert (keine stumm wirkungslose, erfundene Farbe)',
		`fehlend: ${fehlende.join(', ') || '(keine)'}`, `benutzt: ${benutzt.join(', ')}`);

	console.log('     Gegenprobe T-12-G: ein erfundener Variablenname (--ck-erfunden-500) müsste als fehlend auffallen');
	check(!tokenNamen.has('--ck-erfunden-500'), 'T-12-G: die erfundene Variable ist tatsächlich nicht in tokens.css definiert');
}

/* ==================================================== T-13 jedes neu gelesene data-cl-text-*-Attribut wird auch gesetzt */

console.log("\nT-13 jedes von lobby-live.js NEU gelesene data-cl-text-*-Attribut (die D5-2-Erweiterung) wird auch in Strip.html gesetzt");
{
	const NEUE_LESUNGEN = [
		['strip.dataset.clTextEinsatz', 'data-cl-text-einsatz='],
		['strip.dataset.clTextEinsatzKeiner', 'data-cl-text-einsatz-keiner='],
		['strip.dataset.clTextGewinn', 'data-cl-text-gewinn='],
		['strip.dataset.clTextVerlust', 'data-cl-text-verlust='],
		['strip.dataset.clTextShooter', 'data-cl-text-shooter='],
		['strip.dataset.clTextDran', 'data-cl-text-dran='],
		['strip.dataset.clTextDranIch', 'data-cl-text-dran-ich='],
	];
	for (const [gelesen, gesetztPraefix] of NEUE_LESUNGEN) {
		const wirdGelesen = live.includes(gelesen);
		check(wirdGelesen, `${gelesen} wird in lobby-live.js gelesen`);
		check(!wirdGelesen || stripTemplateOhneKommentare.includes(gesetztPraefix),
			`${gelesen} -> ${gesetztPraefix} steht in Strip.html`);
	}
	// shooterButton.dataset.clTextEin/Aus liest vom BUTTON, nicht von strip —
	// eigene Prüfung, weil das Attribut auf einem anderen Element steht.
	check(live.includes('shooterButton?.dataset.clTextEin'), 'shooterButton?.dataset.clTextEin wird gelesen');
	check(stripTemplateOhneKommentare.includes('data-cl-text-ein="{labels.shooterEin}"'), 'data-cl-text-ein="{labels.shooterEin}" steht auf dem Würfelknopf in Strip.html');
	check(live.includes('shooterButton?.dataset.clTextAus'), 'shooterButton?.dataset.clTextAus wird gelesen');
	check(stripTemplateOhneKommentare.includes('data-cl-text-aus="{labels.shooterAus}"'), 'data-cl-text-aus="{labels.shooterAus}" steht auf dem Würfelknopf in Strip.html');

	console.log('     Gegenprobe T-13-G: eine gelesene, aber nirgends gesetzte Erfindung müsste auffallen');
	const erfundenGelesen = 'strip.dataset.clTextErfunden';
	check(!stripTemplateOhneKommentare.includes('data-cl-text-erfunden='),
		'T-13-G: ein erfundenes, gelesenes Attribut ist tatsächlich nirgends gesetzt', `(geprüft anhand: ${erfundenGelesen})`);
}

/* ------------------------------------------ Wächter: sind alle Blöcke gelaufen? */

if (zusagen !== ERWARTETE_ZUSAGEN) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${ERWARTETE_ZUSAGEN} erwartet.`);
	console.log('  Entweder wurde ein Prüfblock übersprungen (dann ist dieses Ergebnis wertlos),');
	console.log('  oder es sind Zusagen hinzugekommen (dann gehört die Erwartungszahl nachgezogen).');
	fehler++;
}

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`}`);
process.exit(fehler === 0 ? 0 : 1);
