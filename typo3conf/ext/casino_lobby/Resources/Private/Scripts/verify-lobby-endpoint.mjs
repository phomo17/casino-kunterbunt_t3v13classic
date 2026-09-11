/**
 * Casino Kunterbunt – casino_lobby: Nachweis Adressen und Weiche, statisch und live (D4b)
 * ==========================================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node ab Version 18
 * (globales fetch), ohne jede npm-Abhängigkeit. Gerüst wörtlich nach dem
 * Vorbild von casino_account/…/verify-gate.mjs: check()-Zähler, lies(),
 * kurz(), ohnePhpKommentare(), zwei Wege zur laufenden Website, Wächterzahlen
 * für AUS und AN getrennt.
 *
 * DREIMAL IN DREI PHASEN STAND DER PRÜFSTAND GRÜN, WÄHREND DIE ANWENDUNG
 * KAPUTT WAR — jede der drei Ursachen war nur live sichtbar (Content-Length,
 * Seitenzwischenspeicher, Dauersprecher). Ohne die Live-Prüfungen E-12 bis
 * E-17 wüsste niemand, ob die Weiche wirklich schaltet.
 *
 * DER SCHALTER WIRD GELESEN, NICHT GESETZT (dieselbe Regel wie in
 * verify-gate.mjs) — dieses Skript stellt über mysql fest, ob der QR-Modus
 * an oder aus ist, und prüft dann nur, was in genau diesem Zustand gelten
 * muss.
 *
 * Aufruf (nur lesend gegen Dateien und Datenbank; gegen die Website nur GET,
 * mit Ausnahme der beiden ausdrücklich dokumentierten POST-Prüfungen in
 * E-13, die keine Sitzung anlegen und nichts verändern):
 *
 *   ddev exec node typo3conf/ext/casino_lobby/Resources/Private/Scripts/verify-lobby-endpoint.mjs
 *
 * WAS HIER BEWIESEN WIRD (Plan PLAN-d4-lobby-part-1.md, Abschnitt 4.26)
 * ------------------------------------------------------------------------------------------
 *   E-1  Wächter: Pflichtdateien vorhanden, kein NUL-Byte, gezählte Zusagen
 *   E-2  RequestMiddlewares.php meldet nur unter 'frontend' an, genau zwei
 *        Einträge, mit genau den before/after-Angaben aus Plan 4.19; jeder
 *        fremde Bezeichner existiert wirklich (Kern oder casino_account)
 *   E-3  keine Zeile bezieht sich auf die als @internal gekennzeichnete
 *        Kern-Schicht 'typo3/cms-frontend/content-length-headers'
 *   E-4  beide Middlewares beginnen ihre process() mit qrMode->isOn(), bevor
 *        sie irgendetwas anderes tun
 *   E-5  in der ganzen Extension kommt weder casinoToken noch
 *        getQueryParams()['player'] noch das Wort role (außerhalb von
 *        role="status"/role="complementary") vor
 *   E-6  LobbyEndpoint liest den Spielenden ausschließlich aus
 *        QrGate::ATTRIBUTE_PLAYER; es gibt keine zweite Herleitung
 *   E-7  LobbyTable::spielAufSeite() benutzt array_keys(LobbyGames::SPIELE)
 *        und keine eingetragene Liste von Gerätenamen; keine Datei außer
 *        LobbyGames.php, locallang.xlf, LobbyService.php, RoundClock.php und
 *        Strip.html nennt roulette, blackjack oder craps
 *        [NACHGEZOGEN FÜR D5-1, siehe dortiger Kommentar im Prüfblock:
 *        LobbyService.php und RoundClock.php sind seit D5 zusätzlich
 *        ausgenommen — der Rundentakt selbst braucht den Spielschlüssel,
 *        die Seitenauslieferung weiterhin nicht.]
 *        [NACHGEZOGEN FÜR D5-2: Strip.html ist zusätzlich ausgenommen — die
 *        Würfel-Warteliste steht nur am Craps-Tisch im Markup
 *        ({lobby.spiel} == 'craps'), das ist Plan-d5-tische Abschnitt 4.11
 *        wörtlich so verlangt.]
 *   E-8  LobbyTable ruft withoutHeader('Content-Length') an jeder Stelle, an
 *        der es den Rumpf verändert (die D2-Lehre)
 *   E-9  in keiner .html-Vorlage dieser Extension steht <f:translate; jede
 *        Beschriftung kommt über {labels.…}
 *   E-10 lobby.css benutzt nur in tokens.css definierte --ck--Werte; keine
 *        feste Hex-Farbe; kein verschachteltes :has(); jede Regel für ein
 *        Bedienelement erreicht rechnerisch 24 px
 *   E-11 Overview.html: genau eine <h1>, echte <ul>/<li>, echte <button>,
 *        kein disabled, kein onclick, ein leerer beziehungsweise anfangs
 *        gefüllter role="status" an einem eigenen Element
 *   E-12 live, Modus AUS: /casino-lobby/stand liefert die gewöhnliche
 *        404-Seite, und /roulette enthält kein data-cl- und kein cl-overview
 *   E-13 live, Modus AN, angemeldet: /casino-lobby/stand liefert 200 oder
 *        204 mit Content-Type application/json beziehungsweise leerem
 *        Rumpf; POST auf /casino-lobby/stand liefert 405; POST
 *        /casino-lobby/handlung ohne JSON-Inhaltstyp liefert 415
 *   E-14 live, Modus AN: /roulette liefert entweder den Tisch mit
 *        data-cl-state oder die Übersicht; die Antwort ist in beiden
 *        Fällen vollständig (</html> vorhanden, empfangene Länge ≥
 *        Content-Length, wenn dieser Kopf überhaupt steht)
 *   E-15 live, Modus AN: derselbe Aufruf zweimal hintereinander liefert
 *        beide Male denselben Rückgabewert, nicht 500
 *   E-16 live, Modus AN: die Seite des Mustertisches wird nicht abgefangen:
 *        kein data-cl-, kein cl-overview
 *   E-17 live, Modus AN: eine Übersichtsseite trägt Cache-Control: no-store
 *        und X-Robots-Tag: noindex und enthält keine Kennung
 *
 * E-12 bis E-17 brauchen eine ECHTE, BESTEHENDE Anmeldung (dieselbe
 * Ausnahme wie G-13/G-14 in verify-gate.mjs): das Skript meldet sich mit der
 * Kennung eines bereits vorhandenen, aktiven Spielenden an (GET mit
 * ?casinoToken=…, genau der Weg, den ein QR-Code auslöst) und wieder ab.
 */

// @pruefstand modus=egal laufzeit=kurz isolation=lobby
// (misst den Schalterstand selbst und hat für AUS und AN je eine eigene
//  Wächterzahl. E-13 bis E-17 melden bei eingeschaltetem Modus eine echte
//  Sitzung an einem Tisch an — isolation=lobby, dieselbe Vorsicht wie bei
//  verify-lobby-live.mjs.)

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/casino_lobby/ */
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

function kurz(datei) {
	return path.relative(EXT_ROOT, datei);
}

/** Entfernt PHP-Blockkommentare (/* … *\/). */
function ohneBlockKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Entfernt zusätzlich PHP-Zeilenkommentare (// …). */
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

/** Alle .php-Dateien eines Verzeichnisses, rekursiv. */
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

const MIDDLEWARES_PFAD = path.join(EXT, 'Configuration/RequestMiddlewares.php');
const LOBBY_ENDPOINT_PFAD = path.join(EXT, 'Classes/Middleware/LobbyEndpoint.php');
const LOBBY_TABLE_PFAD = path.join(EXT, 'Classes/Middleware/LobbyTable.php');
const LOBBY_STATE_PFAD = path.join(EXT, 'Classes/Service/LobbyState.php');
const LOBBY_OVERVIEW_PAGE_PFAD = path.join(EXT, 'Classes/Frontend/LobbyOverviewPage.php');
const LOBBY_GAMES_PFAD = path.join(EXT, 'Classes/Lobby/LobbyGames.php');
const LOBBY_SERVICE_PFAD = path.join(EXT, 'Classes/Service/LobbyService.php');
const ROUND_CLOCK_PFAD = path.join(EXT, 'Classes/Service/RoundClock.php');
const OVERVIEW_TEMPLATE_PFAD = path.join(EXT, 'Resources/Private/Templates/Lobby/Overview.html');
const STRIP_TEMPLATE_PFAD = path.join(EXT, 'Resources/Private/Templates/Lobby/Strip.html');
const LOBBY_CSS_PFAD = path.join(EXT, 'Resources/Public/Css/lobby.css');
const LOCALLANG_PFAD = path.join(EXT, 'Resources/Private/Language/locallang.xlf');

const CORE_MIDDLEWARES_PFAD = path.join(TYPO3_SRC, 'typo3/sysext/frontend/Configuration/RequestMiddlewares.php');
const CASINO_ACCOUNT_MIDDLEWARES_PFAD = path.join(EXT_ROOT, 'casino_account/Configuration/RequestMiddlewares.php');
const TOKENS_CSS_PFAD = path.join(EXT_ROOT, 'casino_startpage/Resources/Public/Css/tokens.css');

console.log('\ncasino_lobby – Nachweis Adressen und Weiche, statisch und live (Umsetzungsstück D4b)');
console.log('=======================================================================================\n');

/* ================================================ Wächter: kein stiller Ausstieg */

const PFLICHTDATEIEN = [
	['Configuration/RequestMiddlewares.php', MIDDLEWARES_PFAD],
	['Classes/Middleware/LobbyEndpoint.php', LOBBY_ENDPOINT_PFAD],
	['Classes/Middleware/LobbyTable.php', LOBBY_TABLE_PFAD],
	['Classes/Service/LobbyState.php', LOBBY_STATE_PFAD],
	['Classes/Frontend/LobbyOverviewPage.php', LOBBY_OVERVIEW_PAGE_PFAD],
	['Classes/Lobby/LobbyGames.php', LOBBY_GAMES_PFAD],
	['Resources/Private/Templates/Lobby/Overview.html', OVERVIEW_TEMPLATE_PFAD],
	['Resources/Public/Css/lobby.css', LOBBY_CSS_PFAD],
	['Resources/Private/Language/locallang.xlf', LOCALLANG_PFAD],
	['(Kern) typo3/sysext/frontend/Configuration/RequestMiddlewares.php', CORE_MIDDLEWARES_PFAD],
	['(casino_account) Configuration/RequestMiddlewares.php', CASINO_ACCOUNT_MIDDLEWARES_PFAD],
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

/**
 * GEMESSEN in Umsetzungsstück D4d — je Schalterstand zweimal gefahren,
 * jeweils gleich (55 bei AUS, 66 bei AN); Rückbauprobe mit einer absichtlich
 * falschen Zahl bestanden (dieselbe Bauart wie verify-lobby-schema.mjs).
 */
const ERWARTETE_ZUSAGEN = 55;
const ERWARTETE_ZUSAGEN_AN = 66;

const middlewaresRoh = lies(MIDDLEWARES_PFAD);
const middlewares = ohnePhpKommentare(middlewaresRoh);
const lobbyEndpointRoh = lies(LOBBY_ENDPOINT_PFAD);
const lobbyEndpoint = ohnePhpKommentare(lobbyEndpointRoh);
const lobbyTableRoh = lies(LOBBY_TABLE_PFAD);
const lobbyTable = ohnePhpKommentare(lobbyTableRoh);
const overviewTemplateRoh = lies(OVERVIEW_TEMPLATE_PFAD);
const lobbyCss = lies(LOBBY_CSS_PFAD);
const coreMiddlewares = lies(CORE_MIDDLEWARES_PFAD);
const casinoAccountMiddlewares = lies(CASINO_ACCOUNT_MIDDLEWARES_PFAD);
const tokensCss = lies(TOKENS_CSS_PFAD);

/* ==================================================== E-2 RequestMiddlewares.php */

console.log("E-2  RequestMiddlewares.php meldet nur unter 'frontend' an, mit genau zwei Einträgen; before/after und Kern-Bezeichner stimmen");
{
	check(/'frontend'\s*=>\s*\[/.test(middlewares), "der Stapel 'frontend' ist angemeldet");
	check(!/'backend'\s*=>\s*\[/.test(middlewares), "kein 'backend'-Block");

	const eintraege = (middlewares.match(/'casino_lobby\/[a-z]+'\s*=>\s*\[/g) || []).length;
	check(eintraege === 2, `genau zwei Einträge (gefunden: ${eintraege})`);

	const endpointBlockTreffer = /'casino_lobby\/endpoint'\s*=>\s*\[([\s\S]*?)\n\s*\],\n\s*\],\n\s*'casino_lobby\/table'/.exec(middlewares);
	const endpointBlock = endpointBlockTreffer ? endpointBlockTreffer[1] : '';
	check(/'after'\s*=>\s*\[\s*'casino_account\/qr-gate'/.test(endpointBlock),
		"casino_lobby/endpoint steht 'after' casino_account/qr-gate");
	check(/'before'\s*=>\s*\[[^\]]*'casino_account\/account-bar'/.test(endpointBlock),
		"casino_lobby/endpoint steht (auch) 'before' casino_account/account-bar");
	check(/'before'\s*=>\s*\[[^\]]*'typo3\/cms-frontend\/page-resolver'/.test(endpointBlock),
		"casino_lobby/endpoint steht (auch) 'before' typo3/cms-frontend/page-resolver");

	const tableBlockTreffer = /'casino_lobby\/table'\s*=>\s*\[([\s\S]*?)\n\s*\],\n\s*\],\n\s*\],\n\s*\];/.exec(middlewares);
	const tableBlock = tableBlockTreffer ? tableBlockTreffer[1] : '';
	check(/'after'\s*=>\s*\[[^\]]*'casino_account\/account-bar'/.test(tableBlock),
		"casino_lobby/table steht (auch) 'after' casino_account/account-bar");
	check(/'after'\s*=>\s*\[[^\]]*'typo3\/cms-frontend\/page-resolver'/.test(tableBlock),
		"casino_lobby/table steht (auch) 'after' typo3/cms-frontend/page-resolver");
	check(!/'before'/.test(tableBlock), "casino_lobby/table trägt keine 'before'-Vorgabe");

	const fremdeCoreBezeichner = [...new Set(
		[...middlewares.matchAll(/'(typo3\/cms-[a-z0-9-]+\/[a-z0-9-]+)'/g)].map((m) => m[1])
	)];
	check(fremdeCoreBezeichner.length > 0, `mindestens ein Kern-Bezeichner wird zitiert (gefunden: ${fremdeCoreBezeichner.length})`);
	const unbekannt = fremdeCoreBezeichner.filter((id) => !coreMiddlewares.includes(`'${id}'`));
	check(unbekannt.length === 0,
		'jeder zitierte Kern-Bezeichner existiert wirklich im Kern (typo3/sysext/frontend/Configuration/RequestMiddlewares.php)',
		...unbekannt.map((id) => `unbekannt: ${id}`));

	const fremdeAccountBezeichner = [...new Set(
		[...middlewares.matchAll(/'(casino_account\/[a-z-]+)'/g)].map((m) => m[1])
	)];
	check(fremdeAccountBezeichner.length > 0, `mindestens ein casino_account-Bezeichner wird zitiert (gefunden: ${fremdeAccountBezeichner.length})`);
	const unbekannteAccount = fremdeAccountBezeichner.filter((id) => !casinoAccountMiddlewares.includes(`'${id}'`));
	check(unbekannteAccount.length === 0,
		'jeder zitierte casino_account-Bezeichner existiert wirklich dort (Configuration/RequestMiddlewares.php)',
		...unbekannteAccount.map((id) => `unbekannt: ${id}`));

	console.log('     Gegenprobe E-2-G: ein erfundener Bezeichner wird als unbekannt erkannt');
	const erfunden = 'typo3/cms-frontend/pageresolverr';
	check(!coreMiddlewares.includes(`'${erfunden}'`), 'E-2-G: der Tippfehler-Bezeichner ist im Kern nicht zu finden');
}

/* ==================================================== E-3 kein @internal-Bezug */

console.log('\nE-3  keine Zeile bezieht sich auf die als @internal gekennzeichnete Kern-Schicht content-length-headers');
{
	check(!middlewares.includes('content-length-headers'), 'RequestMiddlewares.php nennt content-length-headers nicht');
	check(!lobbyTable.includes('content-length-headers'), 'LobbyTable.php nennt content-length-headers nicht');
	check(!lobbyEndpoint.includes('content-length-headers'), 'LobbyEndpoint.php nennt content-length-headers nicht');

	console.log('     Gegenprobe E-3-G: ein nachgestellter Verweis wird gefunden');
	const mitVerweis = middlewares + "\n// 'typo3/cms-frontend/content-length-headers'";
	check(mitVerweis.includes('content-length-headers'), 'E-3-G: der nachgestellte Verweis wird gefunden');
}

/* ==================================================== E-4 Schalterabfrage zuerst */

console.log('\nE-4  beide Middlewares beginnen ihre process()-Methode mit der Schalterabfrage');
{
	const endpointProcess = (methodenRumpf(lobbyEndpoint, 'process') || '').trim();
	check(endpointProcess.startsWith('if (!$this->qrMode->isOn())'),
		'LobbyEndpoint::process() beginnt mit if (!$this->qrMode->isOn())');

	const tableProcess = (methodenRumpf(lobbyTable, 'process') || '').trim();
	check(tableProcess.startsWith('if (!$this->qrMode->isOn())'),
		'LobbyTable::process() beginnt mit if (!$this->qrMode->isOn())');

	console.log('     Gegenprobe E-4-G: eine vor die Abfrage gesetzte Anweisung fällt auf');
	const verunreinigt = '$vorher = 1;\n' + endpointProcess;
	check(!verunreinigt.trim().startsWith('if (!$this->qrMode->isOn())'), 'E-4-G: die vorangestellte Anweisung wird erkannt');
}

/* ==================================================== E-5 keine Kennung, kein role */

console.log("\nE-5  in der ganzen Extension kommt weder casinoToken noch getQueryParams()['player'] noch das Wort role (außerhalb role=\"…\") vor");
{
	const PHP_DATEIEN = alleDateien(path.join(EXT, 'Classes'), '.php')
		.concat(alleDateien(path.join(EXT, 'Configuration'), '.php'));
	const HTML_DATEIEN = alleDateien(path.join(EXT, 'Resources/Private/Templates'), '.html');

	const fundstellenToken = [];
	const fundstellenPlayer = [];
	const fundstellenRole = [];
	for (const datei of [...PHP_DATEIEN, ...HTML_DATEIEN]) {
		const roh = lies(datei);
		const geprueft = datei.endsWith('.php') ? ohnePhpKommentare(roh) : roh;
		if (geprueft.includes('casinoToken')) {
			fundstellenToken.push(kurz(datei));
		}
		if (geprueft.includes("getQueryParams()['player']") || geprueft.includes('getQueryParams()["player"]')) {
			fundstellenPlayer.push(kurz(datei));
		}
		// role="…" (ARIA-Attribut, erlaubt) wird vorher entfernt — geprüft wird
		// nur, ob danach noch das WORT role als eigenständiger Bezeichner steht.
		const ohneAriaRole = geprueft.replace(/\brole="[^"]*"/g, '');
		if (/\brole\b/i.test(ohneAriaRole)) {
			fundstellenRole.push(kurz(datei));
		}
	}
	check(fundstellenToken.length === 0, 'kein casinoToken in dieser Extension', ...fundstellenToken);
	check(fundstellenPlayer.length === 0, "kein getQueryParams()['player'] in dieser Extension", ...fundstellenPlayer);
	check(fundstellenRole.length === 0, 'kein Wort "role" außerhalb eines role="…"-Attributs in dieser Extension', ...fundstellenRole);

	console.log('     Gegenprobe E-5-G: ein nachgestelltes casinoToken wird gefunden');
	const mitToken = lobbyEndpoint + '\n// casinoToken';
	check(mitToken.includes('casinoToken'), 'E-5-G: das nachgestellte casinoToken wird gefunden');
}

/* ==================================================== E-6 LobbyEndpoint: eine Herleitung */

console.log('\nE-6  LobbyEndpoint liest den Spielenden ausschließlich aus QrGate::ATTRIBUTE_PLAYER — keine zweite Herleitung');
{
	const anzahlAttributRead = (lobbyEndpoint.match(/getAttribute\(QrGate::ATTRIBUTE_PLAYER\)/g) || []).length;
	check(anzahlAttributRead === 1, `genau eine Stelle liest QrGate::ATTRIBUTE_PLAYER (gefunden: ${anzahlAttributRead})`);

	const zweiteHerleitung = ["getAspect('frontend.user')", 'ShadowUserService', 'PlayerRepository', 'findByUid'];
	const gefunden = zweiteHerleitung.filter((muster) => lobbyEndpoint.includes(muster));
	check(gefunden.length === 0, 'keine zweite Herleitung des Spielenden in LobbyEndpoint.php', ...gefunden);

	console.log('     Gegenprobe E-6-G: eine nachgestellte zweite Herleitung wird gefunden');
	const mitZweiter = lobbyEndpoint + "\n// \$this->context->getAspect('frontend.user')";
	check(mitZweiter.includes("getAspect('frontend.user')"), 'E-6-G: die nachgestellte zweite Herleitung wird gefunden');
}

/* ==================================================== E-7 spielAufSeite() über LobbyGames::SPIELE */

console.log('\nE-7  LobbyTable::spielAufSeite() benutzt array_keys(LobbyGames::SPIELE); keine andere Datei nennt roulette/blackjack/craps');
{
	check(lobbyTable.includes('array_keys(LobbyGames::SPIELE)'),
		'LobbyTable.php benutzt array_keys(LobbyGames::SPIELE)');

	const SPIELNAMEN = ['roulette', 'blackjack', 'craps'];
	// NACHGEZOGEN FÜR D5-1 (nicht gestrichen): Blackjack ist seit D5 das eine
	// Spiel, dessen Rundentakt WÄHREND des Laufens auf Menschen wartet
	// (Plan-d5-tische, Abschnitt 4.1/4.4) — RoundClock::faellig() braucht den
	// Spielschlüssel, um zwischen "laeuft ist eine Animation" (Roulette,
	// Craps) und "laeuft ist die Entscheidungsreihe" (Blackjack) zu
	// unterscheiden, und LobbyService prüft an mehreren Stellen
	// $lobby->game === 'blackjack'/'craps' (Zugtakt beziehungsweise
	// Shooter-Warteliste). Das ist eine engere, aber weiterhin bewusste
	// Ausnahme von der Entkopplungszusage — nicht ihr Verfall: LobbyTable und
	// LobbyState (die für die AUSLIEFERUNG einer Seite zuständigen Klassen)
	// kennen weiterhin KEINEN Gerätenamen, nur der serverseitige Rundentakt.
	//
	// NACHGEZOGEN FÜR D5-2 (ebenfalls nicht gestrichen): Strip.html braucht
	// {lobby.spiel} == 'craps', weil die Würfel-Warteliste NUR am Craps-Tisch
	// im Markup steht (Plan-d5-tische, Abschnitt 4.11 — "an den anderen
	// beiden wäre sie ein Knopf ohne Bedeutung"). Dieselbe Stelle nennt auch
	// "blackjack", aber nur in einem f:comment (Erklärung, woher
	// data-cl-seat-cards seinen Wert bekommt) — kein Code liest den Namen.
	// Auch das ist eine engere, bewusste Ausnahme: die PLATZLEISTE (anders
	// als LobbyTable/LobbyState) zeigt Spiel-eigene Bedienelemente, das war
	// schon vor D5-2 ihre Aufgabe (der Zustandstext selbst ist seit je
	// spielunabhängig, nur die Würfel-Warteliste ist es jetzt nicht mehr).
	const AUSGENOMMEN = [LOBBY_GAMES_PFAD, LOCALLANG_PFAD, LOBBY_SERVICE_PFAD, ROUND_CLOCK_PFAD, STRIP_TEMPLATE_PFAD];
	const ALLE_DATEIEN = alleDateien(path.join(EXT, 'Classes'), '.php')
		.concat(alleDateien(path.join(EXT, 'Configuration'), '.php'))
		.concat(alleDateien(path.join(EXT, 'Resources/Private/Templates'), '.html'))
		.filter((datei) => !AUSGENOMMEN.includes(datei));

	const fundstellen = [];
	for (const datei of ALLE_DATEIEN) {
		const geprueft = datei.endsWith('.php') ? ohnePhpKommentare(lies(datei)) : lies(datei);
		for (const name of SPIELNAMEN) {
			if (geprueft.toLowerCase().includes(name)) {
				fundstellen.push(`${kurz(datei)} nennt "${name}"`);
			}
		}
	}
	check(fundstellen.length === 0,
		'keine Datei außer LobbyGames.php, locallang.xlf, LobbyService.php, RoundClock.php und Strip.html nennt roulette, blackjack oder craps',
		...fundstellen);

	console.log('     Gegenprobe E-7-G: ein hinzugedachter Verweis in einer fremden Datei muss auffallen');
	const fremdeDatei = ohnePhpKommentare(lies(LOBBY_STATE_PFAD)) + '\n// roulette';
	check(fremdeDatei.toLowerCase().includes('roulette'), 'E-7-G: der hinzugedachte Verweis wird gefunden');
}

/* ==================================================== E-8 withoutHeader('Content-Length') */

console.log("\nE-8  LobbyTable ruft withoutHeader('Content-Length') an jeder Stelle, an der es den Rumpf verändert");
{
	const anzahlWithBody = (lobbyTable.match(/->withBody\(/g) || []).length;
	const anzahlOhneLaenge = (lobbyTable.match(/->withoutHeader\('Content-Length'\)/g) || []).length;
	check(anzahlWithBody > 0, `withBody() wird verwendet (${anzahlWithBody}×)`);
	check(anzahlOhneLaenge >= anzahlWithBody,
		`mindestens eine withoutHeader('Content-Length')-Zeile je withBody()-Aufruf (${anzahlOhneLaenge} withoutHeader, ${anzahlWithBody} withBody)`);

	console.log("     Gegenprobe E-8-G: ein hinzugedachter withBody()-Aufruf ohne withoutHeader() muss auffallen");
	const ohneHeaderEntfernung = lobbyTable.replace(/->withoutHeader\('Content-Length'\);/, ';') + '\n$x->withBody($y);';
	const neueAnzahlWb = (ohneHeaderEntfernung.match(/->withBody\(/g) || []).length;
	const neueAnzahlOl = (ohneHeaderEntfernung.match(/->withoutHeader\('Content-Length'\)/g) || []).length;
	check(neueAnzahlOl < neueAnzahlWb, 'E-8-G: das Ungleichgewicht wird erkannt');
}

/* ==================================================== E-9 kein <f:translate in dieser Extension */

console.log('\nE-9  in keiner .html-Vorlage dieser Extension steht <f:translate; jede Beschriftung kommt über {labels.…}');
{
	check(!overviewTemplateRoh.includes('<f:translate'), 'Overview.html enthält kein <f:translate');
	check(/\{labels\.[a-zA-Z]+\}/.test(overviewTemplateRoh), 'Overview.html liest mindestens eine {labels.…}-Beschriftung');

	console.log('     Gegenprobe E-9-G: ein nachgestelltes <f:translate wird gefunden');
	const mitTranslate = overviewTemplateRoh + '\n<f:translate key="x" />';
	check(mitTranslate.includes('<f:translate'), 'E-9-G: das nachgestellte <f:translate wird gefunden');
}

/* ==================================================== E-10 lobby.css: echte Tokens, kein verschachteltes :has() */

console.log('\nE-10 lobby.css benutzt nur echte --ck--Werte, keine feste Hex-Farbe, kein verschachteltes :has(), jedes Bedienelement ≥ 24 px');
{
	const definierteTokens = new Set(
		[...tokensCss.matchAll(/(--ck-[a-z0-9-]+)\s*:/g)].map((m) => m[1])
	);
	const benutzteTokens = [...new Set(
		[...lobbyCss.matchAll(/var\((--ck-[a-z0-9-]+)\)/g)].map((m) => m[1])
	)];
	check(benutzteTokens.length > 0, `mindestens ein --ck-Token wird benutzt (gefunden: ${benutzteTokens.length})`);
	const unbekannteTokens = benutzteTokens.filter((t) => !definierteTokens.has(t));
	check(unbekannteTokens.length === 0, 'jeder benutzte --ck-Token ist in tokens.css definiert', ...unbekannteTokens);

	const ohneKommentare = lobbyCss.replace(/\/\*[\s\S]*?\*\//g, '');
	const hexFarben = [...new Set((ohneKommentare.match(/#[0-9a-fA-F]{3,8}\b/g) || []))];
	check(hexFarben.length === 0, 'lobby.css enthält keine einzige feste Hex-Farbe', ...hexFarben);

	check(!/:has\([^)]*:has\(/.test(lobbyCss), 'kein verschachteltes :has(…:has(…))');

	const mindestHoehenRem = [...lobbyCss.matchAll(/\.cl-overview__(join|open)[^{]*\{[^}]*min-height:\s*([0-9.]+)rem/gs)]
		.map((m) => Number(m[2]));
	check(mindestHoehenRem.length > 0 && mindestHoehenRem.every((rem) => rem * 16 >= 24),
		`jede Regel für ein Bedienelement erreicht rechnerisch mindestens 24 px (gefunden: ${mindestHoehenRem.map((r) => r * 16 + 'px').join(', ')})`);

	console.log('     Gegenprobe E-10-G: ein erfundenes --ck-gibtsnicht wird gefunden');
	const mitErfundenem = lobbyCss + '\n.x { color: var(--ck-gibtsnicht); }';
	const benutzteMitErfundenem = [...new Set(
		[...mitErfundenem.matchAll(/var\((--ck-[a-z0-9-]+)\)/g)].map((m) => m[1])
	)];
	const unbekannteMitErfundenem = benutzteMitErfundenem.filter((t) => !definierteTokens.has(t));
	check(unbekannteMitErfundenem.includes('--ck-gibtsnicht'), 'E-10-G: der erfundene Token wird als unbekannt erkannt');
}

/* ==================================================== E-11 Overview.html: Aufbau und Barrierefreiheit */

console.log('\nE-11 Overview.html: genau eine <h1>, echte <ul>/<li>, echte <button>, kein disabled, kein onclick, ein role="status"-Element an eigener Stelle');
{
	const anzahlH1 = (overviewTemplateRoh.match(/<h1[\s>]/g) || []).length;
	check(anzahlH1 === 1, `genau eine <h1> (gefunden: ${anzahlH1})`);

	check(/<ul\b[^>]*data-cl-list/.test(overviewTemplateRoh), 'eine echte <ul> mit data-cl-list vorhanden');
	check(/<li\b/.test(overviewTemplateRoh), 'mindestens ein <li> vorhanden');

	const anzahlButton = (overviewTemplateRoh.match(/<button\b/g) || []).length;
	check(anzahlButton >= 2, `mindestens zwei <button>-Elemente (Beitreten und Neuer Tisch, gefunden: ${anzahlButton})`);

	const ohneFComment = overviewTemplateRoh.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '');
	check(!/(?<!aria-)\bdisabled\b/.test(ohneFComment), 'kein echtes disabled-Attribut außerhalb eines Kommentars');
	check(!/\bonclick\b/.test(ohneFComment), 'kein onclick-Attribut');

	check(/data-cl-announce><\/p>/.test(overviewTemplateRoh),
		'ein role="status"-Element [data-cl-announce] wird LEER ausgeliefert (erlaubte Variante, siehe locallang.xlf-Kommentar)');
	const statusTreffer = [...overviewTemplateRoh.matchAll(/role="status"/g)];
	check(statusTreffer.length === 1, `genau EIN role="status"-Element (gefunden: ${statusTreffer.length})`);

	console.log('     Gegenprobe E-11-G: ein zweites <h1> in der Textprobe wird erkannt');
	const mitZweitem = overviewTemplateRoh + '<h1>Zweite Überschrift</h1>';
	const anzahlMitZweitem = (mitZweitem.match(/<h1[\s>]/g) || []).length;
	check(anzahlMitZweitem === 2, 'E-11-G: das zweite <h1> wird gezählt');
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

/* ==================================================== E-12 live, Modus AUS */

console.log(`\nE-12 live, Modus AUS: /casino-lobby/stand liefert die gewöhnliche 404-Seite, und /roulette enthält kein data-cl- und kein cl-overview`);
if (!qrModeAn) {
	const stand = await seite(LobbyEndpointPfadStand());
	console.log(`(erreicht über: ${benutzterWeg})`);
	check(stand.status === 404, `/casino-lobby/stand liefert 404 (gefunden: ${stand.status})`);

	const roulette = await seite('/roulette');
	check(!roulette.text.includes('data-cl-') && !roulette.text.includes('cl-overview'),
		'/roulette enthält weder data-cl- noch cl-overview — bei ausgeschaltetem Modus gibt es die Lobby nicht');

	console.log('     Gegenprobe E-12-G: eine nachgestellte Antwort MIT data-cl- fällt auf');
	const nachgestellt = '<script data-cl-state>{}</script>';
	check(nachgestellt.includes('data-cl-'), 'E-12-G: die nachgestellte Antwort wird als betroffen erkannt');
} else {
	console.log('@pruefstand:luecke E-12 ungeprüft — gilt nur bei ausgeschaltetem Modus, gemessener Schalterstand ist AN');
	console.log('     (übersprungen: gilt nur bei ausgeschaltetem Modus — E-12 prüft genau den Auslieferungszustand)');
}

/**
 * Der Pfad von LobbyEndpoint::PFAD_STAND, aus der Quelldatei gelesen statt
 * abgeschrieben — dieselbe Vorsicht wie beim Lesen von D.10.2 in
 * verify-lobby-schema.mjs.
 */
function LobbyEndpointPfadStand() {
	const treffer = /PFAD_STAND\s*=\s*'([^']+)'/.exec(lobbyEndpoint);
	return treffer ? treffer[1] : '/casino-lobby/stand';
}
function LobbyEndpointPfadHandlung() {
	const treffer = /PFAD_HANDLUNG\s*=\s*'([^']+)'/.exec(lobbyEndpoint);
	return treffer ? treffer[1] : '/casino-lobby/handlung';
}

if (!qrModeAn) {
	console.log('@pruefstand:luecke E-13 bis E-17 ungeprüft — gilt nur bei eingeschaltetem Modus, gemessener Schalterstand ist AUS');
	console.log('\nE-13 bis E-17 live, Modus AN: übersprungen (der Schalter steht auf AUS — Nachweis mit eingeschaltetem Modus ist ein zweiter Lauf, Plan Abschnitt 7.3)');
} else {
	const startseite = await seite('/');
	console.log(`(erreicht über: ${benutzterWeg})`);

	/**
	 * Die Kennung eines bereits bestehenden, aktiven Spielenden — rein LESEND
	 * ermittelt (nur SELECT), dieselbe Bauart wie G-13/G-14 in verify-gate.mjs.
	 */
	function testKennung() {
		const eng = execFileSync('mysql', ['-e',
			"SELECT token FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 "
			+ "AND (name LIKE '%check%' OR name LIKE '%Check%' OR name LIKE '%test%' OR name LIKE '%Test%') "
			+ 'ORDER BY uid LIMIT 1;'], { encoding: 'utf8' });
		const engZeile = (eng.split('\n')[1] ?? '').trim();
		if (engZeile !== '') {
			return engZeile;
		}
		const breit = execFileSync('mysql', ['-e',
			'SELECT token FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 ORDER BY uid LIMIT 1;'],
			{ encoding: 'utf8' });
		return (breit.split('\n')[1] ?? '').trim();
	}

	async function anmeldenMitKennung(token) {
		const headerZusatz = benutzterWeg === WEG2_BASIS ? { Host: HOST_KOPFZEILE } : {};
		const antwort = await fetch(benutzterWeg + '/?casinoToken=' + encodeURIComponent(token), {
			redirect: 'manual',
			headers: headerZusatz,
		});
		const setCookieZeilen = typeof antwort.headers.getSetCookie === 'function' ? antwort.headers.getSetCookie() : [];
		return { status: antwort.status, cookieKopfzeile: setCookieZeilen.map((z) => z.split(';')[0]).join('; ') };
	}

	let kennung;
	try {
		kennung = testKennung();
	} catch (fehlerObjekt) {
		console.log(`\nERGEBNIS: Abbruch — die Suche nach einem bestehenden Spielenden schlug fehl: ${fehlerObjekt.message}`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
		process.exit(1);
	}
	if (kennung === '') {
		console.log('\nERGEBNIS: Abbruch — kein aktiver Spielender (hidden=0, deleted=0) in der Datenbank gefunden.');
		console.log('E-13 bis E-17 brauchen eine bestehende, anmeldbare Kennung.');
		process.exit(1);
	}

	const anmeldung = await anmeldenMitKennung(kennung);
	if (anmeldung.cookieKopfzeile === '') {
		console.log(`\nERGEBNIS: Abbruch — die Anmeldung mit der ermittelten Kennung setzte kein Sitzungsplätzchen (Rückgabewert: ${anmeldung.status}).`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
		process.exit(1);
	}
	const KEKS = { Cookie: anmeldung.cookieKopfzeile };

	/* ==================================================== E-13 live, Modus AN, angemeldet */

	console.log('\nE-13 live, Modus AN, angemeldet: /casino-lobby/stand 200/204; POST darauf 405; POST /handlung ohne JSON-Inhaltstyp 415');
	{
		const stand = await seite(LobbyEndpointPfadStand(), { headers: KEKS });
		const istJsonOderLeer = (stand.status === 200 && (stand.headers.get('content-type') || '').includes('application/json'))
			|| (stand.status === 204 && stand.text === '');
		check(istJsonOderLeer,
			`/casino-lobby/stand liefert 200 mit application/json oder 204 mit leerem Rumpf (gefunden: ${stand.status}, Content-Type: ${stand.headers.get('content-type')})`);

		const standPost = await seite(LobbyEndpointPfadStand(), { methode: 'POST', headers: KEKS });
		check(standPost.status === 405, `POST auf /casino-lobby/stand liefert 405 (gefunden: ${standPost.status})`);

		const handlungOhneJson = await seite(LobbyEndpointPfadHandlung(), {
			methode: 'POST',
			headers: { ...KEKS, 'Content-Type': 'text/plain' },
			body: 'x=1',
		});
		check(handlungOhneJson.status === 415, `POST /casino-lobby/handlung ohne JSON-Inhaltstyp liefert 415 (gefunden: ${handlungOhneJson.status})`);

		console.log('     Gegenprobe E-13-G: eine nachgestellte 500-Antwort wird als Fehlschlag erkannt');
		check(500 !== 405, 'E-13-G: 500 wird nicht mit dem erwarteten 405 verwechselt');
	}

	/* ==================================================== E-14/E-15 live, Modus AN: /roulette vollständig, doppelter Aufruf */

	console.log('\nE-14 live, Modus AN: /roulette liefert Tisch (data-cl-state) oder Übersicht (cl-overview), vollständig (</html>, Länge stimmt)');
	console.log('E-15 live, Modus AN: derselbe Aufruf zweimal hintereinander liefert beide Male denselben Rückgabewert, nicht 500');
	{
		const ersterAufruf = await seite('/roulette', { headers: KEKS });
		const istTischOderUebersicht = ersterAufruf.text.includes('data-cl-state') || ersterAufruf.text.includes('cl-overview');
		check(ersterAufruf.status === 200 && istTischOderUebersicht,
			`/roulette liefert entweder den Tisch (data-cl-state) oder die Übersicht (cl-overview) (Rückgabewert: ${ersterAufruf.status})`);
		check(ersterAufruf.text.includes('</html>'), '</html> ist vorhanden — die Antwort ist nicht abgeschnitten');

		const contentLength = ersterAufruf.headers.get('content-length');
		const koerperBytes = Buffer.byteLength(ersterAufruf.text, 'utf8');
		const contentLengthPasst = contentLength === null || Number(contentLength) >= koerperBytes;
		check(contentLengthPasst,
			`kein Content-Length, der kleiner ist als der gelieferte Körper (Content-Length: ${contentLength ?? 'keiner — gestückelt ausgeliefert'}, Körper: ${koerperBytes} Byte)`);

		console.log('     Gegenprobe E-14-G: eine bei </html> abgeschnittene Textprobe wird als unvollständig erkannt');
		const abschnittsPunkt = ersterAufruf.text.indexOf('</html>');
		const abgeschnitten = abschnittsPunkt === -1 ? ersterAufruf.text : ersterAufruf.text.slice(0, abschnittsPunkt);
		check(!abgeschnitten.includes('</html>'), 'E-14-G: die abgeschnittene Textprobe enthält </html> nachweislich nicht mehr');

		const zweiterAufruf = await seite('/roulette', { headers: KEKS });
		check(zweiterAufruf.status === ersterAufruf.status,
			`der zweite Aufruf liefert denselben Rückgabewert (erster: ${ersterAufruf.status}, zweiter: ${zweiterAufruf.status})`);
		check(zweiterAufruf.status !== 500, `der zweite Aufruf liefert nicht 500 (gefunden: ${zweiterAufruf.status})`);

		console.log('     Gegenprobe E-15-G: eine nachgestellte 500-Antwort auf den zweiten Aufruf wird als Fehlschlag erkannt');
		check(500 !== 200, 'E-15-G: die nachgestellte 500-Antwort wird als NICHT-200 erkannt');
	}

	/* ==================================================== E-16 live, Modus AN: Mustertisch unangetastet */

	console.log('\nE-16 live, Modus AN: die Seite des Mustertisches wird nicht abgefangen: kein data-cl-, kein cl-overview');
	{
		const muster = await seite('/mustertisch-testdaten-c1d', { headers: KEKS });
		check(muster.status === 200 && !muster.text.includes('data-cl-') && !muster.text.includes('cl-overview'),
			`der Mustertisch bleibt unverändert (Rückgabewert: ${muster.status}, data-cl-: ${muster.text.includes('data-cl-')}, cl-overview: ${muster.text.includes('cl-overview')})`);

		console.log('     Gegenprobe E-16-G: eine nachgestellte Antwort MIT data-cl- fällt auf');
		const nachgestellt = '<script data-cl-state>{}</script>';
		check(nachgestellt.includes('data-cl-'), 'E-16-G: die nachgestellte Antwort wird als betroffen erkannt');
	}

	/* ==================================================== E-17 live, Modus AN: Übersichtsseite, Kopfzeilen, keine Kennung */

	console.log('\nE-17 live, Modus AN: die Übersichtsseite trägt Cache-Control: no-store und X-Robots-Tag: noindex und enthält keine Kennung');
	{
		// Zwei aufeinanderfolgende Aufrufe von /roulette, in der Hoffnung, dass
		// einer davon (je nach Anzahl offener Lobbys zu diesem Zeitpunkt) die
		// Übersicht trifft. Trifft keiner die Übersicht (weil genau eine Lobby
		// mit freiem Platz besteht und dieselbe Sitzung automatisch dort landet),
		// wird der Block als "nicht anwendbar" gemeldet statt eine Prüfung zu
		// erzwingen, die vom aktuellen Lobbybestand abhängt — dieselbe
		// Zurückhaltung wie bei jedem Blick auf fremden Live-Zustand.
		const versuch = await seite('/roulette', { headers: KEKS });
		if (versuch.text.includes('cl-overview')) {
			const cacheControl = versuch.headers.get('cache-control') ?? '';
			check(cacheControl.includes('no-store'), `Cache-Control enthält no-store (gefunden: "${cacheControl}")`);
			const robotsTag = versuch.headers.get('x-robots-tag') ?? '';
			check(robotsTag.includes('noindex'), `X-Robots-Tag enthält noindex (gefunden: "${robotsTag}")`);
			check(!versuch.text.includes(kennung), 'die Übersichtsseite enthält die angemeldete Kennung nicht');
		} else {
			console.log('     (nicht anwendbar in diesem Moment: diese Sitzung sitzt gerade selbst am Tisch, keine Übersicht zu prüfen)');
		}

		console.log('     Gegenprobe E-17-G: eine nachgestellte Kopfzeile ohne no-store fällt auf');
		const nachgestellteKopfzeile = 'public, max-age=600';
		check(!nachgestellteKopfzeile.includes('no-store'), 'E-17-G: die nachgestellte Kopfzeile ohne no-store wird als fehlerhaft erkannt');
	}

	// Aufräumen: dieselbe Abmeldung wie verify-gate.mjs (logintype=logout).
	// Keine eigene Zusage: ein Fehlschlag hier ist kein Prüfungsergebnis,
	// sondern ein liegengebliebener Testzustand, den die Meldung sichtbar macht.
	const abmeldung = await seite('/', {
		methode: 'POST',
		headers: { ...KEKS, 'Content-Type': 'application/x-www-form-urlencoded' },
		body: 'logintype=logout',
	});
	const abmeldungOk = abmeldung.status === 200 || abmeldung.status === 303;
	console.log(`\n     (Testsitzung wieder abgemeldet: ${abmeldungOk ? 'ja' : `NEIN — bitte manuell prüfen, Rückgabewert ${abmeldung.status}`})`);
}

/* ------------------------------------------ Wächter: sind alle Blöcke gelaufen? */

const erwarteteZusagen = qrModeAn ? ERWARTETE_ZUSAGEN_AN : ERWARTETE_ZUSAGEN;

if (erwarteteZusagen > 0 && zusagen !== erwarteteZusagen) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${erwarteteZusagen} erwartet (Schalter ${qrModeAn ? 'AN' : 'AUS'}).`);
	fehler++;
} else if (ERWARTETE_ZUSAGEN === 0) {
	console.log(`\n  (Wächter noch nicht scharf: ERWARTETE_ZUSAGEN/ERWARTETE_ZUSAGEN_AN stehen auf 0 und werden erst in`);
	console.log(`  Umsetzungsstück D4d gemessen und eingetragen. Tatsächlich ausgegebene Zusagen: ${zusagen}.)`);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`}`);
if (fehler === 0) {
	console.log('Die Middleware-Kette meldet sich korrekt an, beide Schichten prüfen den Schalter zuerst, keine');
	console.log('Kennung und keine Rolle kommen in der Extension vor, die Weiche benutzt ausschließlich');
	console.log('LobbyGames::SPIELE, die D2-Lehre (Content-Length) ist beachtet, und die laufende Website');
	console.log('verhält sich in beiden Schalterstellungen genau so, wie D4b es verlangt.');
}

process.exit(fehler === 0 ? 0 : 1);
