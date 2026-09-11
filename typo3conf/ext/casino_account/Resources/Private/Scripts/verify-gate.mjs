// @pruefstand modus=egal laufzeit=kurz
// (misst den Schalterstand selbst und hat für AUS und AN je eine eigene
//  Wächterzahl — ERWARTETE_ZUSAGEN / _AN. Läuft deshalb in BEIDEN Läufen.)

/**
 * Casino Kunterbunt – casino_account: Nachweis Tor, statisch und live (D2c)
 * ============================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node ab Version 18
 * (globales fetch), ohne jede npm-Abhängigkeit. Laufzeit unter zehn Sekunden.
 *
 * G-8 bis G-14 fragen zusätzlich die LAUFENDE Website und die LAUFENDE
 * Datenbank ab. Für die Datenbank per `mysql` (dieselbe Bauart wie A-9/A-10
 * in verify-auth.mjs und S-9 in verify-schema.mjs: nur SELECT, nie eine
 * ändernde Anweisung — auch die Suche nach einem Testspieler für G-13/G-14
 * liest nur, sie legt keinen an). Für die Website per `fetch` — G-8 bis G-12
 * REIN LESEND (GET), kein Aufruf sendet eine Anmeldung oder ein Abmelden ab.
 *
 * AUSNAHME, NACHGETRAGEN ALS D2d-NACHBESSERUNG: G-13/G-14 brauchen eine
 * ECHTE, BESTEHENDE Anmeldung — ohne sie ist die Kontenleiste (AccountBar)
 * nie im Merkmal ATTRIBUTE_PLAYER sichtbar, und genau die beiden dort
 * behobenen Fehler (abgeschnittene Antwort, HTTP 500 aus dem
 * Seitenzwischenspeicher) treten nur bei einer bestehenden Anmeldung auf.
 * G-13/G-14 melden sich deshalb selbst mit der Kennung eines bereits
 * vorhandenen, aktiven Spielenden an (GET mit ?casinoToken=…, GENAU der Weg,
 * den ein QR-Code auslöst — kein Formular, kein neuer Datensatz) und melden
 * sich am Ende wieder ab. Beides läuft NUR, wenn der Schalter beim Start des
 * Skripts bereits AN war — dieses Skript legt ihn nicht selbst um.
 *
 * DER SCHALTER WIRD GELESEN, NICHT GESETZT. Das Skript stellt zuerst über
 * mysql fest, ob der QR-Modus gerade an oder aus ist, sagt es laut, und
 * prüft dann NUR die Zusagen, die in genau diesem Zustand gelten müssen. Ein
 * Prüfskript, das den Schalter selbst umlegt, wäre nicht mehr „rein lesend"
 * und könnte einen laufenden Abend stören. Der Nachweis „beide Zustände" ist
 * ein Lauf der Hauptsitzung (Plan, Abschnitt 7.3).
 *
 * ZWEI WEGE ZUR LAUFENDEN WEBSITE, MIT LAUTEM ABBRUCH: zuerst
 * https://casino-kunterbunt.ddev.site/ (im Container gültig), dann
 * http://127.0.0.1/ mit der Kopfzeile Host: casino-kunterbunt.ddev.site.
 * Trägt keiner der beiden Wege, bricht das Skript mit Rückgabewert 1 ab und
 * sagt warum — es überspringt die Live-Prüfungen NICHT. Für Weg 1 wird
 * NODE_TLS_REJECT_UNAUTHORIZED=0 gesetzt: das Zertifikat ist ein lokales
 * DDEV-Zertifikat, und dies ist ein Entwicklerwerkzeug, das ausschließlich
 * die eigene Anlage befragt.
 *
 * Aufruf (nur lesend, ändert keine Datei und keinen Datenbankwert):
 *
 *   ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-gate.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt oder
 * der Wächterblock anschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan PLAN-d2-qr-modus, Teil 2, Abschnitt 4.27,
 * Umsetzungsstück D2c)
 * -------------------------------------------------------------------------
 *   G-1  Wächterblock: Pflichtdateien vorhanden, kein NUL-Byte, gezählte
 *        Zusagen (kein eigener Haken — Riegel, keine Zusage)
 *   G-2  RequestMiddlewares.php meldet nur unter 'frontend' an, mit genau
 *        VIER Einträgen (seit Umsetzungsstück D3a vollständig — siehe Kopf
 *        der Datei selbst: bis einschließlich D2d fehlte 'booking', weil
 *        BookingEndpoint.php noch nicht existierte); qr-login steht before
 *        der Anmeldung, booking after ihr und before qr-gate UND
 *        page-resolver, qr-gate after booking und before account-bar UND
 *        page-resolver, account-bar after qr-gate und before page-resolver;
 *        jeder genannte fremde Bezeichner existiert wirklich im Kern
 *        (gelesen, nicht abgeschrieben)
 *   G-3  jede der beiden Anmelde-Middlewares beginnt ihre process()-Methode
 *        mit der Schalterabfrage; keine tut vorher etwas anderes als lesen.
 *        AccountBar.php prüft den Schalter bewusst NICHT selbst — sie liegt
 *        hinter QrGate und sieht das Merkmal ATTRIBUTE_PLAYER ohnehin nur
 *        dann, wenn der Modus an UND jemand angemeldet ist (siehe
 *        AccountBar.php, Klassenkopf) — deshalb bleibt sie hier außen vor.
 *   G-4  die Ausnahmeliste wird aus der Site-Konfiguration abgeleitet: in
 *        QrGate steht getConfiguration()['routes'] und keine Zeichenkette
 *        robots.txt, llms.txt oder favicon
 *   G-5  die Torseiten-Vorlage enthält genau eine <h1>, ein label[for] zu
 *        einem Feld mit derselben id, ein role="status"-Element, das leer
 *        ausgeliefert wird, kein disabled, kein onclick, keinen deutschen
 *        Fließtext
 *   G-6  gate-scan.js hat kein import, kein innerHTML, keinen deutschen
 *        Text; jeder angezeigte Satz kommt aus einem data-message-*, und
 *        jedes dort benutzte Attribut wird in der Vorlage auch gesetzt
 *        (beide Richtungen)
 *   G-7  frontend.css benutzt nur --ck--Werte, die in
 *        casino_startpage/…/tokens.css wirklich definiert sind; die einzige
 *        feste Farbe ist #fff im Eingabefeld (namentliche Ausnahme)
 *   G-8  live: eine Anfrage auf / verhält sich passend zum gemessenen
 *        Schalterstand
 *   G-9  live/gelesen: bei eingeschaltetem Modus trägt die Torseite
 *        Cache-Control: no-store; gelesen (nicht behauptet): SetCookieService
 *        des Kerns setzt HttpOnly fest auf true und SameSite(FE) in der
 *        Vorgabe auf 'lax' — die eigentliche Plätzchen-Kopfzeile aus einem
 *        echten Anmeldelauf misst die Hauptsitzung (Plan, Abschnitt 7.3);
 *        dieses Skript sendet bewusst keine Anmeldung ab
 *   G-10 live, nur bei eingeschaltetem Modus: vier weitere Adressen liefern
 *        alle die Torseite — auch die erfundene und auch die Sitemap
 *   G-11 live: robots.txt und llms.txt liefern in BEIDEN Zuständen ihren Text
 *   G-12 live, nur bei eingeschaltetem Modus: eine erfundene 43-Zeichen-
 *        Kennung in der Adresse führt nicht zu einer Anmeldung, und die
 *        Antwort enthält sie nirgends
 *   G-13 live, nur bei eingeschaltetem Modus UND bestehender Anmeldung
 *        (D2d-Nachbesserung, fängt den Content-Length-Fehler): die
 *        ausgelieferte Seite enthält </body>, </html> und data-ca-bar, und
 *        die empfangene Länge stimmt mit dem gelieferten Körper überein
 *        (kein Content-Length, der kleiner ist als der Körper)
 *   G-14 live, nur bei eingeschaltetem Modus UND bestehender Anmeldung
 *        (D2d-Nachbesserung, fängt den Seitenzwischenspeicher-Fehler):
 *        derselbe Aufruf zweimal hintereinander liefert beide Male 200,
 *        nicht 500
 *   G-15 live, nur bei eingeschaltetem Modus (Behebungslauf nach dem
 *        Laufzeit-Audit vom 2026-09-10, Befund T-01): .ca-gate__room bleibt
 *        bei 320/360/390/412 Bildpunkten innerhalb des Fensters — gerechnet
 *        aus den live gelesenen Werten von frontend.css/tokens.css, nicht
 *        aus der bloßen Feststellung, dass die border-box-Regel dasteht
 *   G-16 live, nur bei eingeschaltetem Modus (Befund T-02): der Fokusrahmen
 *        der Torseite erreicht auf --ck-paper-100 mindestens 3 : 1 —
 *        gerechnet aus den live gelesenen Farbwerten
 *   G-17 live, nur bei eingeschaltetem Modus (Befund T-03): eine
 *        fehlgeschlagene Anmeldung hängt die Fehlermeldung über
 *        aria-describedby UND aria-invalid an das Eingabefeld
 *   G-18 live (Behebungslauf nach dem Laufzeit-Audit vom 2026-09-10, Teil 2,
 *        Befund N-06): robots.txt nennt die Sitemap:-Zeile NUR bei
 *        ausgeschaltetem Modus — Entscheidung (b) im Klassenkopf von
 *        QrGate.php
 *
 * NACHGETRAGEN UND WIEDER ZURÜCKGENOMMEN (Behebungslauf nach dem
 * Laufzeit-Audit vom 2026-09-10, Teil 2, Befund N-07): eine erste Fassung
 * ließ G-8/G-10/G-12/G-17 bei eingeschaltetem Modus 401 statt 200 erwarten.
 * Das ist zurückgenommen — QrGate::process() liefert wieder 200, aus zwei
 * Gründen, ausführlich in dessen Klassenkopf (ein 401 ohne WWW-Authenticate
 * ist unvollständig, und die Torseite ist kein Fehlerzustand). G-8/G-10/
 * G-12/G-17 prüfen deshalb wieder auf 200 — G-10 prüft dabei AUSDRÜCKLICH
 * weiterhin auch /sitemap.xml (die Adresse bleibt hinter dem Tor,
 * unverändert, siehe AUSDRÜCKLICH NICHT AUSGENOMMEN in QrGate.php). Der
 * damit weiterhin offene Soft-404 (N-07) ist als kosmetisch eingestuft
 * (noindex/X-Robots-Tag auf jeder Torantwort) — siehe Klassenkopf von
 * QrGate.php für die vollständige Begründung.
 *
 * ERWARTETE_ZUSAGEN wurde in Umsetzungsstück D2d gemessen und eingetragen —
 * genau wie in verify-qrmode.mjs und verify-auth.mjs. GEMESSEN BEI
 * AUSGESCHALTETEM MODUS (dem Auslieferungszustand): G-9/G-10/G-12/G-13/G-14
 * geben dann WENIGER Zusagen aus als bei eingeschaltetem Modus (derselbe,
 * bereits vorher bestehende Unterschied wie bei G-8/G-10/G-12 — ein Zweig,
 * der übersprungen wird, ruft check() gar nicht erst auf). Ein Lauf bei
 * eingeschaltetem Modus zeigt deshalb einen ANDEREN Wächter-Zählerstand;
 * das ist erwartet und keine Panne des Prüfstands — entscheidend ist dann
 * allein, ob ERGEBNIS „alle Prüfungen bestanden" meldet.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
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

function kurz(datei) {
	return path.relative(PROJEKT, datei);
}

/** Entfernt PHP-Blockkommentare (/* … *\/). */
function ohneBlockKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Entfernt zusätzlich PHP-Zeilenkommentare (// …). */
function ohnePhpKommentare(inhalt) {
	return ohneBlockKommentare(inhalt).replace(/\/\/.*$/gm, '');
}

/** Entfernt JavaScript-Kommentare (Block und Zeile) — dieselbe Bauart wie ohnePhpKommentare(). */
function ohneJsKommentare(inhalt) {
	return ohneBlockKommentare(inhalt).replace(/\/\/.*$/gm, '');
}

/**
 * Liefert den Rumpf einer Methode (den Text zwischen ihrer öffnenden und
 * ihrer passenden schließenden geschweiften Klammer) — dieselbe Bauart wie
 * methodenRumpf() in verify-auth.mjs.
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

/** kebab-case -> camelCase, für den Abgleich data-message-xy <-> dataset.messageXy. */
function kebabZuCamel(kebab) {
	return kebab.replace(/-([a-z])/g, (_, buchstabe) => buchstabe.toUpperCase());
}

/** camelCase -> kebab-case, die Umkehrung von kebabZuCamel(). */
function camelZuKebab(camel) {
	return camel.replace(/([A-Z])/g, '-$1').toLowerCase();
}

const MIDDLEWARES_PFAD = path.join(EXT, 'Configuration/RequestMiddlewares.php');
const QR_TOKEN_LOGIN_PFAD = path.join(EXT, 'Classes/Middleware/QrTokenLogin.php');
const QR_GATE_PFAD = path.join(EXT, 'Classes/Middleware/QrGate.php');
const GATE_PAGE_PFAD = path.join(EXT, 'Classes/Frontend/GatePage.php');
const GATE_TEMPLATE_PFAD = path.join(EXT, 'Resources/Private/Templates/Gate/Index.html');
const LOCALLANG_PFAD = path.join(EXT, 'Resources/Private/Language/locallang.xlf');
const FRONTEND_CSS_PFAD = path.join(EXT, 'Resources/Public/Css/frontend.css');
const GATE_JS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/gate-scan.js');

const CORE_MIDDLEWARES_PFAD = path.join(TYPO3_SRC, 'typo3/sysext/frontend/Configuration/RequestMiddlewares.php');
const CORE_SETCOOKIE_PFAD = path.join(TYPO3_SRC, 'typo3/sysext/core/Classes/Http/SetCookieService.php');
const CORE_DEFAULTCONF_PFAD = path.join(TYPO3_SRC, 'typo3/sysext/core/Configuration/DefaultConfiguration.php');
const TOKENS_CSS_PFAD = path.join(EXT_ROOT, 'casino_startpage/Resources/Public/Css/tokens.css');

console.log('\ncasino_account – Nachweis Tor, statisch und live (Umsetzungsstück D2c)');
console.log('=========================================================================\n');

/* ================================================ Wächter: kein stiller Ausstieg */

const PFLICHTDATEIEN = [
	['Configuration/RequestMiddlewares.php', MIDDLEWARES_PFAD],
	['Classes/Middleware/QrTokenLogin.php', QR_TOKEN_LOGIN_PFAD],
	['Classes/Middleware/QrGate.php', QR_GATE_PFAD],
	['Classes/Frontend/GatePage.php', GATE_PAGE_PFAD],
	['Resources/Private/Templates/Gate/Index.html', GATE_TEMPLATE_PFAD],
	['Resources/Private/Language/locallang.xlf', LOCALLANG_PFAD],
	['Resources/Public/Css/frontend.css', FRONTEND_CSS_PFAD],
	['Resources/Public/JavaScript/gate-scan.js', GATE_JS_PFAD],
	['(Kern) typo3/sysext/frontend/Configuration/RequestMiddlewares.php', CORE_MIDDLEWARES_PFAD],
	['(Kern) typo3/sysext/core/Classes/Http/SetCookieService.php', CORE_SETCOOKIE_PFAD],
	['(Kern) typo3/sysext/core/Configuration/DefaultConfiguration.php', CORE_DEFAULTCONF_PFAD],
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
 * GEMESSEN, nicht geschätzt — in Umsetzungsstück D2d gefahren, abgelesen (46,
 * nach der Erweiterung von G-2 auf drei Middleware-Einträge) und hier
 * eingetragen (Rückbauprobe: ein check()-Aufruf testweise entfernt, Wächter
 * schlägt an, zurückgebaut, wieder grün).
 *
 * NACHGETRAGEN (Behebungslauf nach dem Laufzeit-Audit vom 2026-09-10, Teil
 * 2, Befund N-06): G-18 läuft auch bei ausgeschaltetem Modus (+2) — bei
 * ausgeschaltetem Schalter am Ende dieses Behebungslaufs gefahren und
 * abgelesen, dieselbe Rückbauprobe wie oben.
 */
const ERWARTETE_ZUSAGEN = 48;

/**
 * NACHTRAG 2026-09-10: Der Wächter braucht ZWEI Zahlen, nicht eine.
 *
 * Bei eingeschaltetem Modus laufen zusätzlich die Live-Blöcke G-10, G-12,
 * G-13 und G-14, die bei ausgeschaltetem Modus als „übersprungen" ausgewiesen
 * werden. Sie geben 17 weitere Zusagen aus. Stünde hier nur die eine Zahl,
 * schlüge der Wächter bei JEDEM Lauf im eingeschalteten Zustand an — und
 * genau dieser Lauf ist der einzige, in dem die wichtigsten Zusagen der Phase
 * überhaupt geprüft werden. Ein Prüfstand, der im entscheidenden Zustand
 * grundsätzlich rot meldet, ist kein Prüfstand.
 *
 * Beide Zahlen sind gemessen, nicht geschätzt: AUS = 46, AN = 63 (Lauf vom
 * 2026-09-10, Schalter über das Backend-Modul umgelegt).
 *
 * NACHGETRAGEN (Behebungslauf nach D3-Audit): G-15/G-16/G-17 bringen 15
 * weitere check()-Aufrufe im AN-Zustand (sie brauchen die Torseite und
 * damit den eingeschalteten Modus; im AUS-Zustand werden alle drei
 * übersprungen, ERWARTETE_ZUSAGEN bleibt deshalb bei 46) — gefahren und
 * abgelesen (78), dieselbe Rückbauprobe wie oben.
 *
 * NACHGETRAGEN (Behebungslauf nach dem Laufzeit-Audit vom 2026-09-10, Teil
 * 2): G-18 (N-06) läuft in BEIDEN Zuständen (+2 Zusagen dort und dort — ein
 * Zweig pro Zustand plus die eine gemeinsame Gegenprobe, macht ERWARTETE_
 * ZUSAGEN künftig 48, siehe unten). G-19 (N-03/N-04), G-20 (N-05) und G-21
 * (N-01) laufen NUR bei eingeschaltetem Modus (+5, +2, +6 Zusagen — G-19
 * trägt zwei Gegenproben, G-19-G1 und G-19-G2, nicht nur eine) — gefahren
 * und abgelesen (91), dieselbe Rückbauprobe wie oben.
 *
 * NACHGETRAGEN UND WIEDER ZURÜCKGENOMMEN (Behebungslauf nach dem
 * Laufzeit-Audit vom 2026-09-10, Teil 2, Befund N-07): G-8/G-10/G-12/G-17
 * erwarteten zwischenzeitlich 401 statt 200 — zurückgenommen (Begründung im
 * Klassenkopf von QrGate.php). Das ändert an dieser Stelle nichts an der
 * ANZAHL der Zusagen, nur an ihrem erwarteten Statuscode.
 */
const ERWARTETE_ZUSAGEN_AN = 91;

const middlewaresRoh = lies(MIDDLEWARES_PFAD);
const middlewares = ohnePhpKommentare(middlewaresRoh);
const qrTokenLoginRoh = lies(QR_TOKEN_LOGIN_PFAD);
const qrTokenLogin = ohnePhpKommentare(qrTokenLoginRoh);
const qrGateRoh = lies(QR_GATE_PFAD);
const qrGate = ohnePhpKommentare(qrGateRoh);
const gatePageRoh = lies(GATE_PAGE_PFAD);
const gateTemplateRoh = lies(GATE_TEMPLATE_PFAD);
const frontendCss = lies(FRONTEND_CSS_PFAD);
const gateJsRoh = lies(GATE_JS_PFAD);
const gateJs = ohneJsKommentare(gateJsRoh);
const coreMiddlewares = lies(CORE_MIDDLEWARES_PFAD);
const coreSetCookie = lies(CORE_SETCOOKIE_PFAD);
const coreDefaultConf = lies(CORE_DEFAULTCONF_PFAD);
const tokensCss = lies(TOKENS_CSS_PFAD);

/* ==================================================== G-2 RequestMiddlewares.php */

console.log("G-2  RequestMiddlewares.php meldet nur unter 'frontend' an, mit genau vier Einträgen; Reihenfolge und Kern-Bezeichner stimmen");
{
	check(/'frontend'\s*=>\s*\[/.test(middlewares), "der Stapel 'frontend' ist angemeldet");
	check(!/'backend'\s*=>\s*\[/.test(middlewares), "kein 'backend'-Block (der QR-Modus darf das Backend nie aussperren)");

	const eintraege = (middlewares.match(/'casino_account\/[a-z-]+'\s*=>\s*\[/g) || []).length;
	check(eintraege === 4,
		`genau vier Einträge — die vierte Schicht booking kam mit Umsetzungsstück`
		+ ` D3a hinzu, sobald BookingEndpoint.php existierte (gefunden: ${eintraege})`);

	const loginBlockTreffer = /'casino_account\/qr-login'\s*=>\s*\[([\s\S]*?)\n\s*\],\n\s*'casino_account\/booking'/.exec(middlewares);
	const loginBlock = loginBlockTreffer ? loginBlockTreffer[1] : '';
	check(/'before'\s*=>\s*\[\s*'typo3\/cms-frontend\/authentication'/.test(loginBlock),
		"qr-login steht 'before' typo3/cms-frontend/authentication");

	const gateBlockTreffer = /'casino_account\/qr-gate'\s*=>\s*\[([\s\S]*?)\n\s*\],\n\s*'casino_account\/account-bar'/.exec(middlewares);
	const gateBlock = gateBlockTreffer ? gateBlockTreffer[1] : '';
	check(/'after'\s*=>\s*\[\s*'typo3\/cms-frontend\/authentication'/.test(gateBlock),
		"qr-gate steht 'after' typo3/cms-frontend/authentication");
	check(/'before'\s*=>\s*\[\s*'casino_account\/account-bar'/.test(gateBlock),
		"qr-gate steht 'before' casino_account/account-bar");
	check(/'before'\s*=>\s*\[[^\]]*'typo3\/cms-frontend\/page-resolver'/.test(gateBlock),
		"qr-gate steht (auch) 'before' typo3/cms-frontend/page-resolver");

	const barBlockTreffer = /'casino_account\/account-bar'\s*=>\s*\[([\s\S]*?)\n\s*\],\n\s*\],/.exec(middlewares);
	const barBlock = barBlockTreffer ? barBlockTreffer[1] : '';
	check(/'after'\s*=>\s*\[\s*'casino_account\/qr-gate'/.test(barBlock),
		"account-bar steht 'after' casino_account/qr-gate");
	check(/'before'\s*=>\s*\[\s*'typo3\/cms-frontend\/page-resolver'/.test(barBlock),
		"account-bar steht 'before' typo3/cms-frontend/page-resolver");

	const fremdeBezeichner = [...new Set(
		[...middlewares.matchAll(/'(typo3\/cms-[a-z0-9-]+\/[a-z0-9-]+)'/g)].map((m) => m[1])
	)];
	check(fremdeBezeichner.length > 0, `mindestens ein fremder Bezeichner wird zitiert (gefunden: ${fremdeBezeichner.length})`);
	const unbekannt = fremdeBezeichner.filter((id) => !coreMiddlewares.includes(`'${id}'`));
	check(unbekannt.length === 0,
		'jeder zitierte Bezeichner existiert wirklich im Kern (typo3/sysext/frontend/Configuration/RequestMiddlewares.php)',
		...unbekannt.map((id) => `unbekannt: ${id}`));

	console.log('     Gegenprobe G-2-G: ein erfundener Bezeichner wird als unbekannt erkannt');
	const erfunden = 'typo3/cms-frontend/authentification';
	check(!coreMiddlewares.includes(`'${erfunden}'`), 'G-2-G: der Tippfehler-Bezeichner ist im Kern nicht zu finden');
}

/* ==================================================== G-3 Schalterabfrage zuerst */

console.log('\nG-3  jede der beiden Middlewares beginnt ihre process()-Methode mit der Schalterabfrage');
{
	const loginProcess = (methodenRumpf(qrTokenLogin, 'process') || '').trim();
	check(loginProcess.startsWith('if (!$this->qrMode->isOn())'),
		'QrTokenLogin::process() beginnt mit if (!$this->qrMode->isOn())');

	const gateProcess = (methodenRumpf(qrGate, 'process') || '').trim();
	check(gateProcess.startsWith('if (!$this->qrMode->isOn()'),
		'QrGate::process() beginnt mit if (!$this->qrMode->isOn()');

	console.log('     Gegenprobe G-3-G: eine vor die Abfrage gesetzte Anweisung fällt auf');
	const verunreinigt = '$vorher = 1;\n' + loginProcess;
	check(!verunreinigt.trim().startsWith('if (!$this->qrMode->isOn())'), 'G-3-G: die vorangestellte Anweisung wird erkannt');
}

/* ==================================================== G-4 Ausnahmeliste abgeleitet */

console.log("\nG-4  die Ausnahmeliste wird aus der Site-Konfiguration abgeleitet (keine feste Liste robots.txt/llms.txt/favicon)");
{
	check(qrGate.includes("getConfiguration()['routes']"), "QrGate liest getConfiguration()['routes']");
	const KONSTANTEN = ['robots.txt', 'llms.txt', 'favicon'];
	const gefunden = KONSTANTEN.filter((wort) => qrGate.includes(wort));
	check(gefunden.length === 0,
		'keine der drei Zeichenketten robots.txt/llms.txt/favicon kommt fest codiert in QrGate.php vor',
		...gefunden);

	console.log('     Gegenprobe G-4-G: eine eingetragene feste Liste wird gefunden');
	const mitFesterListe = qrGate + "\n// 'robots.txt' fest eingetragen";
	check(KONSTANTEN.some((wort) => mitFesterListe.includes(wort)), 'G-4-G: die eingefügte feste Liste wird gefunden');
}

/* ==================================================== G-5 Torseiten-Vorlage */

console.log('\nG-5  die Torseiten-Vorlage enthält genau eine <h1>, label[for]<->id, ein leeres role="status", kein disabled, kein onclick, keinen deutschen Fließtext');
{
	const anzahlH1 = (gateTemplateRoh.match(/<h1[\s>]/g) || []).length;
	check(anzahlH1 === 1, `genau eine <h1> (gefunden: ${anzahlH1})`);

	const forTreffer = /for="([^"]+)"/.exec(gateTemplateRoh);
	const forWert = forTreffer ? forTreffer[1] : null;
	check(forWert !== null && gateTemplateRoh.includes(`id="${forWert}"`),
		`label[for] zeigt auf ein wirklich vorhandenes id (gefunden: ${forWert})`);

	check(/<p class="ca-gate__status" data-ca-gate-status="" role="status"><\/p>/.test(gateTemplateRoh),
		'ein role="status"-Element wird leer ausgeliefert');

	const ohneFComment = gateTemplateRoh.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '');
	check(!/(?<!aria-)\bdisabled\b/.test(ohneFComment), 'kein echtes disabled-Attribut außerhalb eines Kommentars');
	check(!/\bonclick\b/.test(ohneFComment), 'kein onclick-Attribut');

	const textKnoten = [...ohneFComment.matchAll(/>([^<{}]+)</g)].map((m) => m[1].trim()).filter((t) => t !== '');
	check(textKnoten.length === 0,
		'kein Text zwischen > und < außerhalb von f:comment und {…}-Ausdrücken',
		...textKnoten.map((t) => `gefunden: "${t}"`));

	console.log('     Gegenprobe G-5-G: ein zweites <h1> in der Textprobe wird erkannt');
	const mitZweitem = gateTemplateRoh + '<h1>Zweite Überschrift</h1>';
	const anzahlMitZweitem = (mitZweitem.match(/<h1[\s>]/g) || []).length;
	check(anzahlMitZweitem === 2, 'G-5-G: das zweite <h1> wird gezählt');
}

/* ==================================================== G-6 gate-scan.js */

console.log('\nG-6  gate-scan.js: kein import, kein innerHTML, kein deutscher Text; data-message-* stimmt in beide Richtungen mit der Vorlage überein');
{
	check(!/\bimport\b/.test(gateJs), 'kein import-Schlüsselwort');
	check(!/innerHTML/.test(gateJs), 'kein innerHTML');

	const stringLiterale = [...gateJs.matchAll(/'([^'\\]|\\.)*'|"([^"\\]|\\.)*"/g)].map((m) => m[0]);
	const mitLeerzeichen = stringLiterale.filter((s) => / /.test(s.slice(1, -1)));
	check(mitLeerzeichen.length === 0,
		'keine Zeichenkette im Skript enthält ein Leerzeichen (also keinen sichtbaren deutschen Satz)',
		...mitLeerzeichen);

	const jsGenutzt = new Set(
		[...gateJs.matchAll(/dataset\.(message[A-Za-z]+)/g)].map((m) => 'data-' + camelZuKebab(m[1]))
	);
	const templateGesetzt = new Set(
		[...gateTemplateRoh.matchAll(/data-message-([a-z-]+)=/g)].map((m) => 'data-message-' + m[1])
	);
	const nurImJs = [...jsGenutzt].filter((a) => !templateGesetzt.has(a));
	const nurInVorlage = [...templateGesetzt].filter((a) => !jsGenutzt.has(a));
	check(nurImJs.length === 0, 'jedes in gate-scan.js gelesene data-message-* ist in der Vorlage auch gesetzt', ...nurImJs);
	check(nurInVorlage.length === 0, 'jedes in der Vorlage gesetzte data-message-* wird in gate-scan.js auch gelesen', ...nurInVorlage);

	console.log('     Gegenprobe G-6-G: ein erfundenes data-message-xy wird als in der Vorlage fehlend erkannt');
	const jsGenutztMitErfundenem = new Set([...jsGenutzt, 'data-message-xy']);
	const erfundenFehlt = [...jsGenutztMitErfundenem].filter((a) => !templateGesetzt.has(a));
	check(erfundenFehlt.includes('data-message-xy'), 'G-6-G: das erfundene Attribut wird als fehlend erkannt');
}

/* ==================================================== G-7 frontend.css nur echte --ck-Werte */

console.log('\nG-7  frontend.css benutzt nur --ck--Werte, die in tokens.css wirklich definiert sind; einzige feste Farbe ist #fff');
{
	const definierteTokens = new Set(
		[...tokensCss.matchAll(/(--ck-[a-z0-9-]+)\s*:/g)].map((m) => m[1])
	);
	const benutzteTokens = [...new Set(
		[...frontendCss.matchAll(/var\((--ck-[a-z0-9-]+)\)/g)].map((m) => m[1])
	)];
	check(benutzteTokens.length > 0, `mindestens ein --ck-Token wird benutzt (gefunden: ${benutzteTokens.length})`);
	const unbekannteTokens = benutzteTokens.filter((t) => !definierteTokens.has(t));
	check(unbekannteTokens.length === 0,
		'jeder benutzte --ck-Token ist in tokens.css definiert',
		...unbekannteTokens);

	const ohneKommentare = frontendCss.replace(/\/\*[\s\S]*?\*\//g, '');
	const hexFarben = [...new Set((ohneKommentare.match(/#[0-9a-fA-F]{3,8}\b/g) || []))];
	const unerlaubteHex = hexFarben.filter((f) => f.toLowerCase() !== '#fff');
	check(unerlaubteHex.length === 0,
		'die einzige feste Farbe in frontend.css ist #fff',
		...unerlaubteHex);

	console.log('     Gegenprobe G-7-G: ein erfundenes --ck-gibtsnicht wird gefunden');
	const mitErfundenem = frontendCss + '\n.x { color: var(--ck-gibtsnicht); }';
	const benutzteMitErfundenem = [...new Set(
		[...mitErfundenem.matchAll(/var\((--ck-[a-z0-9-]+)\)/g)].map((m) => m[1])
	)];
	const unbekannteMitErfundenem = benutzteMitErfundenem.filter((t) => !definierteTokens.has(t));
	check(unbekannteMitErfundenem.includes('--ck-gibtsnicht'), 'G-7-G: der erfundene Token wird als unbekannt erkannt');
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
	// Nur für G-13/G-14 gebraucht (die Abmeldung am Ende): ein POST-Rumpf,
	// z. B. 'logintype=logout'. Bei GET bleibt body unbenutzt (undefined).
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

const startseite = await seite('/');
console.log(`(erreicht über: ${benutzterWeg})`);

/* ==================================================== G-8 live: Verhalten passend zum Zustand */

console.log(`\nG-8  live: eine Anfrage auf / verhält sich passend zum gemessenen Schalterstand (${qrModeAn ? 'AN' : 'AUS'})`);
{
	// 200 in BEIDEN Zuständen: die Torseite ist kein Fehlerzustand, sondern
	// der beabsichtigte Inhalt für einen nicht angemeldeten Gast — eine
	// zwischenzeitliche Fassung erwartete hier 401, zurückgenommen
	// (Begründung im Klassenkopf von QrGate.php, Befund N-07).
	check(startseite.status === 200, `Rückgabewert 200 (gefunden: ${startseite.status})`);

	if (qrModeAn) {
		check(startseite.text.includes('ca-gate__form'), 'im Körper steht ca-gate__form');
		check(startseite.text.includes('noindex,nofollow') || startseite.text.includes('noindex, nofollow'),
			'die Antwort trägt <meta name="robots" content="noindex,nofollow">');
		check(!startseite.text.includes('ck-room'), 'kein ck-room (der normale Saal wird nicht gerendert)');
	} else {
		check(startseite.text.includes('ck-room'), 'im Körper steht ck-room (der normale Saal)');
		check(!startseite.text.includes('ca-gate__form'), 'kein ca-gate__form (kein Tor bei ausgeschaltetem Modus)');
	}

	console.log('     Gegenprobe G-8-G: die jeweils andere Erwartung wird gegen dieselbe Antwort geprüft und muss fehlschlagen');
	if (qrModeAn) {
		check(!startseite.text.includes('ck-room'), 'G-8-G: „ck-room wäre da" ist FALSCH für die AN-Antwort — die Prüfung schlägt also zu Recht an, wenn man sie fälschlich erwartet');
	} else {
		check(!startseite.text.includes('ca-gate__form'), 'G-8-G: „ca-gate__form wäre da" ist FALSCH für die AUS-Antwort — die Prüfung schlägt also zu Recht an, wenn man sie fälschlich erwartet');
	}
}

/* ==================================================== G-9 Kopfzeilen: no-store live, HttpOnly/SameSite gelesen */

console.log('\nG-9  Kopfzeilen: bei eingeschaltetem Modus trägt die Torseite Cache-Control: no-store (live); HttpOnly/SameSite(FE)=lax werden im Kern GELESEN, nicht behauptet — die Plätzchen-Kopfzeile selbst misst die Hauptsitzung (Abschnitt 7.3)');
{
	if (qrModeAn) {
		const cacheControl = startseite.headers.get('cache-control') ?? '';
		check(cacheControl.includes('no-store'), `Cache-Control enthält no-store (gefunden: "${cacheControl}")`);
	} else {
		console.log('@pruefstand:luecke G-9 (Cache-Control: no-store) ungeprüft — gilt nur bei eingeschaltetem Modus, gemessener Schalterstand ist AUS');
		console.log('     (übersprungen: gilt nur bei eingeschaltetem Modus — die Startseite ist dann keine Torseite)');
	}

	check(/,\s*true,\s*false,\s*\$cookieSameSite/.test(coreSetCookie) || /new Cookie\(/.test(coreSetCookie),
		'SetCookieService.php baut das Sitzungsplätzchen mit einem fest verdrahteten httpOnly-Wert');
	check(/\$cookieSameSite\s*=\s*\$this->sanitizeSameSiteCookieValue/.test(coreSetCookie),
		'SetCookieService.php liest cookieSameSite über sanitizeSameSiteCookieValue()');
	// Die Datei kennt den Schlüssel 'FE' mehrfach (u. a. verschachtelt unter
	// SYS.session.FE). Gesucht wird deshalb gezielt der OBERSTE Block — er
	// steht mit genau vier Leerzeichen eingerückt ("    'FE' => [") — und erst
	// ab dort nach cookieSameSite.
	const obersterFeBlock = /\n {4}'FE'\s*=>\s*\[/.exec(coreDefaultConf);
	const feAbschnitt = obersterFeBlock ? coreDefaultConf.slice(obersterFeBlock.index, obersterFeBlock.index + 4000) : '';
	const feSameSiteTreffer = /'cookieSameSite'\s*=>\s*'([a-z]+)'/.exec(feAbschnitt);
	check(feSameSiteTreffer !== null && feSameSiteTreffer[1] === 'lax',
		`die Vorgabe für FE.cookieSameSite ist 'lax' (gefunden: ${feSameSiteTreffer ? feSameSiteTreffer[1] : 'nicht gefunden'})`);

	console.log('     Gegenprobe G-9-G: ein fehlendes HttpOnly in einer nachgestellten Kopfzeile schlägt an');
	const nachgestellteKopfzeile = 'sessionCookie=abc; Path=/; SameSite=Lax';
	check(!/HttpOnly/i.test(nachgestellteKopfzeile), 'G-9-G: die nachgestellte Kopfzeile ohne HttpOnly wird als fehlerhaft erkannt');
}

/* ==================================================== G-10 live, nur AN: vier weitere Adressen */

console.log('\nG-10 live, nur bei eingeschaltetem Modus: vier weitere Adressen liefern alle die Torseite');
if (qrModeAn) {
	const ADRESSEN = ['/reel-slot', '/craps', '/gibtesnicht', '/sitemap.xml'];
	for (const adresse of ADRESSEN) {
		const antwort = await seite(adresse);
		// 200 — gilt auch für /sitemap.xml (Entscheidung N-06: sitemap.xml
		// bleibt hinter dem Tor und bekommt DIESELBE 200-Antwort wie jede
		// andere gesperrte Adresse; 401 wurde geprüft und zurückgenommen,
		// siehe QrGate.php-Klassenkopf).
		check(antwort.status === 200 && antwort.text.includes('ca-gate__form'),
			`${adresse} liefert die Torseite (Rückgabewert: ${antwort.status})`);
	}

	console.log('     Gegenprobe G-10-G: eine Adresse, die in der Textprobe eine Seite statt des Tores liefert, wird bemerkt');
	const nachgestellteSeite = '<div class="ck-room">…</div>';
	check(!nachgestellteSeite.includes('ca-gate__form'), 'G-10-G: die nachgestellte Seiten-Antwort wird als NICHT-Tor erkannt');
} else {
	console.log('@pruefstand:luecke G-10 ungeprüft — gilt nur bei eingeschaltetem Modus, gemessener Schalterstand ist AUS');
	console.log('     (übersprungen: gilt nur bei eingeschaltetem Modus)');
}

/* ==================================================== G-11 live: robots.txt/llms.txt in beiden Zuständen */

console.log('\nG-11 live: robots.txt und llms.txt liefern in BEIDEN Zuständen ihren Text (die abgeleitete Ausnahme wirkt)');
{
	const robots = await seite('/robots.txt');
	check(robots.status === 200 && robots.text.includes('User-agent:') && !robots.text.includes('ca-gate'),
		`robots.txt liefert seinen Text, kein Tor (Rückgabewert: ${robots.status})`);

	const llms = await seite('/llms.txt');
	check(llms.status === 200 && llms.text.includes('Casino Kunterbunt') && !llms.text.includes('ca-gate'),
		`llms.txt liefert seinen Text, kein Tor (Rückgabewert: ${llms.status})`);

	console.log('     Gegenprobe G-11-G: eine Antwort mit ca-gate in der Textprobe fällt auf');
	const nachgestellt = '<html class="ca-gate">…</html>';
	check(nachgestellt.includes('ca-gate'), 'G-11-G: die nachgestellte Tor-Antwort wird erkannt');
}

/* ==================================================== G-18 live: robots.txt ohne Sitemap-Zeile bei eingeschaltetem Modus */

console.log(`\nG-18 live: robots.txt nennt die Sitemap:-Zeile NUR bei ausgeschaltetem Modus — Audit-Befund N-06, Entscheidung (b) im Klassenkopf von QrGate.php (gemessener Zustand: ${qrModeAn ? 'AN' : 'AUS'})`);
{
	const robots = await seite('/robots.txt');
	if (qrModeAn) {
		check(!/^Sitemap:/m.test(robots.text),
			'G-18: bei eingeschaltetem Modus fehlt die Sitemap:-Zeile — kein Bot wird auf eine Adresse verwiesen, '
			+ 'die hinter dem Tor liegt (sitemap.xml bleibt ABSICHTLICH gesperrt, siehe QrGate.php-Klassenkopf)');
	} else {
		check(/^Sitemap: https:\/\/[^\s]+\/sitemap\.xml$/m.test(robots.text),
			'G-18: bei ausgeschaltetem Modus steht die Sitemap:-Zeile unverändert da (dieselbe Adresse wie in config.yaml)');
	}

	console.log('     Gegenprobe G-18-G: eine robots.txt-Antwort MIT Sitemap-Zeile fällt bei eingeschaltetem Modus auf');
	const nachgestellteRobotsAn = 'User-agent: *\nAllow: /\n\nSitemap: https://example/sitemap.xml\n';
	check(/^Sitemap:/m.test(nachgestellteRobotsAn),
		'G-18-G: die nachgestellte robots.txt MIT Sitemap-Zeile wird als „hätte gefiltert werden müssen" erkannt');
}

/* ==================================================== G-12 live, nur AN: erfundene Kennung leckt nirgends */

console.log('\nG-12 live, nur bei eingeschaltetem Modus: eine erfundene 43-Zeichen-Kennung in der Adresse führt nicht zu einer Anmeldung, und die Antwort enthält sie nirgends');
if (qrModeAn) {
	const erfundeneKennung = 'x'.repeat(43);
	const antwort = await seite('/?casinoToken=' + erfundeneKennung);
	// 200 (401 geprüft und zurückgenommen, siehe QrGate.php-Klassenkopf).
	check(antwort.status === 200 && antwort.text.includes('ca-gate__form'),
		`die Antwort ist weiterhin die Torseite (Rückgabewert: ${antwort.status})`);
	check(!antwort.text.includes(erfundeneKennung), 'die erfundene Kennung steht nirgends im Text der Antwort');
	let kopfzeilenText = '';
	for (const [name, wert] of antwort.headers.entries()) {
		kopfzeilenText += `${name}: ${wert}\n`;
	}
	check(!kopfzeilenText.includes(erfundeneKennung), 'die erfundene Kennung steht in keiner Kopfzeile der Antwort');

	console.log('     Gegenprobe G-12-G: die Suche nach der Kennung wird gegen eine nachgestellte Antwort geprüft, die sie enthält');
	const nachgestellteAntwort = '<input value="' + erfundeneKennung + '">';
	check(nachgestellteAntwort.includes(erfundeneKennung), 'G-12-G: die nachgestellte, leckende Antwort wird erkannt');
} else {
	console.log('@pruefstand:luecke G-12 ungeprüft — gilt nur bei eingeschaltetem Modus, gemessener Schalterstand ist AUS');
	console.log('     (übersprungen: gilt nur bei eingeschaltetem Modus — ohne Anmeldung gibt es hier nichts zu leaken)');
}

/* ==================================================== G-13/G-14 live, nur AN + bestehende Anmeldung: Kontenleiste vollständig, Seitenzwischenspeicher */

console.log('\nG-13 live, nur bei eingeschaltetem Modus und bestehender Anmeldung: die ausgelieferte Seite ist vollständig (</body>, </html>, data-ca-bar) und die Länge stimmt');
console.log('G-14 live, nur bei eingeschaltetem Modus und bestehender Anmeldung: derselbe Aufruf zweimal hintereinander liefert beide Male 200 (Seitenzwischenspeicher)');
if (qrModeAn) {
	/**
	 * Die Kennung eines bereits bestehenden, aktiven Spielenden — rein
	 * LESEND ermittelt (nur SELECT), dieselbe Bauart wie G-9/Q-9/Q-10. Zuerst
	 * ein Name, der erkennbar ein Testspieler ist; sonst irgendein aktiver
	 * Spielender (login/touch() ändert nur last_seen, keine Beträge — siehe
	 * AccountBookkeeper::touch()).
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

	/**
	 * Die echte Anmeldung — GENAU der Weg, den ein QR-Code auslöst (D.4.2,
	 * D.6.1 Weg 1): ein GET mit ?casinoToken=… meldet über AllowUrlTokenLogin
	 * an, ganz ohne Formular und ohne Anfragezeichen. redirect: 'manual', weil
	 * ein automatisch verfolgter Redirect die Set-Cookie-Kopfzeile der
	 * Zwischenantwort verschluckt — genau die Kopfzeile, die hier gebraucht
	 * wird.
	 */
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
		console.log('G-13/G-14 brauchen eine bestehende, anmeldbare Kennung. Das ist keine fehlgeschlagene Prüfung, sondern eine fehlende Testvoraussetzung.');
		process.exit(1);
	}

	const anmeldung = await anmeldenMitKennung(kennung);
	if (anmeldung.cookieKopfzeile === '') {
		console.log(`\nERGEBNIS: Abbruch — die Anmeldung mit der ermittelten Kennung setzte kein Sitzungsplätzchen (Rückgabewert: ${anmeldung.status}).`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
		process.exit(1);
	}

	const ersterAufruf = await seite('/', { headers: { Cookie: anmeldung.cookieKopfzeile } });

	const koerperVollstaendig = ersterAufruf.text.includes('</body>')
		&& ersterAufruf.text.includes('</html>')
		&& ersterAufruf.text.includes('data-ca-bar');
	check(ersterAufruf.status === 200 && koerperVollstaendig,
		`die angemeldete Seite ist vollständig: </body>, </html> und data-ca-bar sind alle drei enthalten (Rückgabewert: ${ersterAufruf.status})`,
		`</body>: ${ersterAufruf.text.includes('</body>')}, </html>: ${ersterAufruf.text.includes('</html>')}, data-ca-bar: ${ersterAufruf.text.includes('data-ca-bar')}`);

	console.log('     Gegenprobe G-13-G1: eine bei data-ca-bar abgeschnittene Textprobe wird als unvollständig erkannt');
	const abschnittsPunkt = ersterAufruf.text.indexOf('data-ca-bar');
	const abgeschnitten = abschnittsPunkt === -1 ? ersterAufruf.text : ersterAufruf.text.slice(0, abschnittsPunkt);
	check(!abgeschnitten.includes('data-ca-bar'), 'G-13-G1: die abgeschnittene Textprobe enthält data-ca-bar nachweislich nicht mehr');

	console.log('\nG-20 live, nur bei eingeschaltetem Modus und bestehender Anmeldung: der Sprunglink bewegt den Fokus wirklich (Audit-Befund N-05) — dieselbe Sitzung wie G-13/G-14, keine zweite Anmeldung nötig');
	check(ersterAufruf.text.includes('id="ca-bar" tabindex="-1"'),
		'G-20: #ca-bar trägt tabindex="-1" — das Sprungziel wird beim Anspringen tatsächlich fokussiert, nicht nur per URL-Fragment markiert');

	console.log('     Gegenprobe G-20-G: dieselbe Suche ohne tabindex="-1" findet nichts');
	const ohneTabindex = ersterAufruf.text.replace(' tabindex="-1"', '');
	check(!ohneTabindex.includes('id="ca-bar" tabindex="-1"'), 'G-20-G: das entfernte tabindex="-1" wird als fehlend erkannt');

	console.log('\nG-21 live, nur bei eingeschaltetem Modus und bestehender Anmeldung: die Ansage des Gesamtvermögens hängt nicht mehr an der sichtbaren Zahl (Audit-Befund N-01)');
	const totalTagTreffer = /<span class="ca-bar__total" data-ca-bar-total="" data-value="[^"]*">/.exec(ersterAufruf.text);
	check(totalTagTreffer !== null && !totalTagTreffer[0].includes('role="status"'),
		'G-21: .ca-bar__total trägt KEIN role="status" mehr (das hätte K-01s Live-Bereich zurückgebaut)',
		`gefundenes Element: ${totalTagTreffer?.[0] ?? 'keins'}`);
	check(ersterAufruf.text.includes('<span class="ca-visually-hidden" role="status" aria-atomic="true" data-ca-bar-announce="">'),
		'G-21: ein EIGENER, optisch verborgener Live-Bereich [data-ca-bar-announce] trägt jetzt role="status" — getrennt von der sichtbaren Zahl');
	check(/<span class="ca-visually-hidden" role="status" aria-atomic="true" data-ca-bar-announce="">[^<]*(?:Kredite|<\/span>)/.test(ersterAufruf.text),
		'G-21: der Live-Bereich ist serverseitig schon mit dem echten Anfangssatz gefüllt (nicht leer, wie es K-01 für die sichtbare Zahl verlangt)');

	console.log('     Gegenprobe G-21-G: ein Rückbau auf role="status" bei .ca-bar__total würde auffallen');
	const zurueckgebautTotal = ersterAufruf.text.replace(
		'<span class="ca-bar__total" data-ca-bar-total="" data-value="',
		'<span class="ca-bar__total" role="status" data-ca-bar-total="" data-value="'
	);
	const totalTagZurueckgebaut = /<span class="ca-bar__total"[^>]*data-value="[^"]*">/.exec(zurueckgebautTotal);
	check(totalTagZurueckgebaut !== null && totalTagZurueckgebaut[0].includes('role="status"'),
		'G-21-G: der nachgestellte Rückbau auf role="status" bei .ca-bar__total wird erkannt');

	const contentLength = ersterAufruf.headers.get('content-length');
	const koerperBytes = Buffer.byteLength(ersterAufruf.text, 'utf8');
	const contentLengthPasst = contentLength === null || Number(contentLength) >= koerperBytes;
	check(contentLengthPasst,
		`kein Content-Length, der kleiner ist als der gelieferte Körper (Content-Length: ${contentLength ?? 'keiner — gestückelt ausgeliefert'}, Körper: ${koerperBytes} Byte)`);

	console.log('     Gegenprobe G-13-G2: eine nachgestellte, zu kleine Content-Length-Kopfzeile wird als kleiner erkannt');
	const nachgestellteZuKleineLaenge = koerperBytes - 10;
	check(nachgestellteZuKleineLaenge < koerperBytes, 'G-13-G2: die nachgestellte, zu kleine Content-Length wird als kleiner als der Körper erkannt');

	const zweiterAufruf = await seite('/', { headers: { Cookie: anmeldung.cookieKopfzeile } });
	check(zweiterAufruf.status === 200,
		`derselbe Aufruf ein zweites Mal (die Seite liegt jetzt im Seitenzwischenspeicher) liefert ebenfalls 200, nicht 500 (gefunden: ${zweiterAufruf.status})`);

	console.log('     Gegenprobe G-14-G: eine nachgestellte 500-Antwort auf den zweiten Aufruf wird als Fehlschlag erkannt');
	const nachgestellterFehlercode = 500;
	check(nachgestellterFehlercode !== 200, 'G-14-G: die nachgestellte 500-Antwort wird als NICHT-200 erkannt');

	// Aufräumen: dieselbe Abmeldung wie die Kontenleiste selbst auslöst
	// (logintype=logout, kein Anfragezeichen nötig — siehe AccountBar/Index.html).
	// Keine eigene Zusage: ein Fehlschlag hier ist kein Prüfungsergebnis,
	// sondern ein liegengebliebener Testzustand, den die Meldung sichtbar macht.
	const abmeldung = await seite('/', {
		methode: 'POST',
		headers: { Cookie: anmeldung.cookieKopfzeile, 'Content-Type': 'application/x-www-form-urlencoded' },
		body: 'logintype=logout',
	});
	// fetch() OHNE redirect: 'manual' folgt dem 303 automatisch — die
	// gefolgte Anfrage landet auf der jetzt wieder abgemeldeten Startseite,
	// die bei eingeschaltetem Modus die Torseite mit 200 liefert (401 wurde
	// zwischenzeitlich geprüft und zurückgenommen, siehe
	// QrGate.php-Klassenkopf, Befund N-07).
	const abmeldungOk = abmeldung.status === 200 || abmeldung.status === 303;
	console.log(`     (Testsitzung wieder abgemeldet: ${abmeldungOk ? 'ja' : `NEIN — bitte manuell prüfen, Rückgabewert ${abmeldung.status}`})`);
} else {
	console.log('@pruefstand:luecke G-13/G-14 ungeprüft — gilt nur bei eingeschaltetem Modus und bestehender Anmeldung, gemessener Schalterstand ist AUS');
	console.log('     (übersprungen: gilt nur bei eingeschaltetem Modus und bestehender Anmeldung)');
}

/* ==================================================== G-15/G-16/G-17 live, nur AN: Behebungslauf nach dem D3-Audit */

/**
 * WCAG-2.2-Kontrastformel (relative Leuchtdichte, sRGB-Rücktransformation) —
 * dieselbe Rechnung wie im Audit-Bericht selbst.
 *
 * @param {string} hex
 * @returns {number}
 */
function relativeLuminanz(hex) {
	const werte = hex.replace('#', '').match(/.{2}/g).map((teil) => parseInt(teil, 16) / 255);
	const [r, g, b] = werte.map((kanal) => (kanal <= 0.03928 ? kanal / 12.92 : ((kanal + 0.055) / 1.055) ** 2.4));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * @param {string} hexA
 * @param {string} hexB
 * @returns {number}
 */
function kontrastVerhaeltnis(hexA, hexB) {
	const lA = relativeLuminanz(hexA);
	const lB = relativeLuminanz(hexB);
	const [hell, dunkel] = lA >= lB ? [lA, lB] : [lB, lA];
	return (hell + 0.05) / (dunkel + 0.05);
}

/**
 * @param {string} css
 * @param {string} name
 * @returns {string}
 */
function tokenHexAus(css, name) {
	const treffer = new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})\\b`).exec(css);
	if (treffer === null) {
		throw new Error(`Token ${name} nicht gefunden`);
	}
	return treffer[1];
}

/**
 * @param {string} css
 * @param {string} remName
 * @returns {number} der rem-Wert als Zahl, z. B. 2.5 für "2.5rem"
 */
function tokenRemAus(css, remName) {
	const treffer = new RegExp(`${remName}\\s*:\\s*([0-9.]+)rem\\b`).exec(css);
	if (treffer === null) {
		throw new Error(`Token ${remName} nicht als rem-Wert gefunden`);
	}
	return Number(treffer[1]);
}

console.log('\nG-15 live, nur bei eingeschaltetem Modus: die Torseite rollt bei 320-412 Bildpunkten nicht mehr waagerecht (Audit-Befund T-01) — gerechnet aus den tatsächlich ausgelieferten Werten von frontend.css und tokens.css');
if (qrModeAn) {
	const lebendesFrontendCss = (await seite('/typo3conf/ext/casino_account/Resources/Public/Css/frontend.css')).text;
	check(/\*\s*,\s*\*::before\s*,\s*\*::after\s*\{\s*box-sizing:\s*border-box;/.test(lebendesFrontendCss),
		'die live ausgelieferte frontend.css trägt die universelle box-sizing: border-box-Regel');

	const lebendesTokensCss = (await seite('/typo3conf/ext/casino_startpage/Resources/Public/Css/tokens.css')).text;
	const REM_PX = 16; // Browser-Standardgröße, von keinem Stylesheet dieses Hauses überschrieben (kein Fund in G-7)
	const spacePadding = tokenRemAus(lebendesTokensCss, '--ck-space-5') * REM_PX; // .ca-gate__room padding, je Seite

	for (const breite of [320, 360, 390, 412]) {
		const vwWert = breite * 0.92;
		const deklarierteBreite = Math.min(34 * REM_PX, vwWert); // width: min(34rem, 92vw)
		const effektivBorderBox = deklarierteBreite; // border-box: die deklarierte Breite IST die Gesamtbreite
		const effektivContentBox = deklarierteBreite + 2 * spacePadding; // content-box: Innenabstand kommt oben drauf

		check(effektivBorderBox <= breite,
			`bei ${breite}px Fensterbreite bleibt .ca-gate__room mit box-sizing: border-box innerhalb des Fensters `
			+ `(${effektivBorderBox.toFixed(1)}px deklarierte Breite ≤ ${breite}px, gerechnet aus den live gelesenen `
			+ `Werten width: min(34rem, 92vw) und --ck-space-5)`);

		if (breite === 320) {
			console.log(`     Gegenprobe G-15-G: dieselbe Rechnung OHNE border-box (content-box, der frühere Zustand) muss bei ${breite}px überstehen — der Audit maß dort 374px`);
			check(effektivContentBox > breite,
				`G-15-G: ohne border-box wäre .ca-gate__room ${effektivContentBox.toFixed(1)}px breit — mehr als die `
				+ `${breite}px des Fensters (die Rechnung erkennt den früheren Mangel tatsächlich als Mangel)`);
		}
	}
} else {
	console.log('@pruefstand:luecke G-15 ungeprüft — gilt nur bei eingeschaltetem Modus, gemessener Schalterstand ist AUS');
	console.log('     (übersprungen: gilt nur bei eingeschaltetem Modus — ohne Tor gibt es keine .ca-gate__room)');
}

console.log('\nG-16 live, nur bei eingeschaltetem Modus: der Fokusrahmen der Torseite erreicht auf dem Papier mindestens 3 : 1 (Audit-Befund T-02) — gerechnet aus den tatsächlich ausgelieferten Farbwerten');
if (qrModeAn) {
	const lebendesFrontendCss = (await seite('/typo3conf/ext/casino_account/Resources/Public/Css/frontend.css')).text;
	const lebendesTokensCss = (await seite('/typo3conf/ext/casino_startpage/Resources/Public/Css/tokens.css')).text;

	const fokusRegel = /\.ca-gate :is\(input, button, \[href]\):focus-visible \{\s*outline:\s*3px solid var\((--ck-[a-z0-9-]+)\)/.exec(lebendesFrontendCss);
	check(fokusRegel !== null, 'die Fokusregel der Torseite existiert und benutzt einen --ck-Token');

	const fokusToken = fokusRegel ? fokusRegel[1] : null;
	check(fokusToken === '--ck-print-ink',
		`die Fokusfarbe der Torseite ist --ck-print-ink (gefunden: ${fokusToken ?? 'keine'}) — dieselbe Druckfarbe wie`
		+ ' der Fließtext der Torseite, nicht mehr --ck-neon-gold');

	if (fokusToken !== null) {
		const fokusHex = tokenHexAus(lebendesTokensCss, fokusToken);
		const papierHex = tokenHexAus(lebendesTokensCss, '--ck-paper-100');
		const kontrast = kontrastVerhaeltnis(fokusHex, papierHex);
		check(kontrast >= 3.0,
			`${fokusToken} (${fokusHex}) auf --ck-paper-100 (${papierHex}) erreicht ${kontrast.toFixed(2)} : 1 —`
			+ ' über den 3 : 1 aus SC 1.4.11, gerechnet aus den live gelesenen Farbwerten');

		console.log('     Gegenprobe G-16-G: dieselbe Rechnung mit der alten Farbe --ck-neon-gold muss unter 3 : 1 bleiben — der Audit maß dort 1,26 : 1');
		const altHex = tokenHexAus(lebendesTokensCss, '--ck-neon-gold');
		const altKontrast = kontrastVerhaeltnis(altHex, papierHex);
		check(altKontrast < 3.0,
			`G-16-G: --ck-neon-gold (${altHex}) auf --ck-paper-100 liegt bei ${altKontrast.toFixed(2)} : 1 — die`
			+ ' Rechnung erkennt den früheren Mangel tatsächlich als Mangel');
	}
} else {
	console.log('@pruefstand:luecke G-16 ungeprüft — gilt nur bei eingeschaltetem Modus, gemessener Schalterstand ist AUS');
	console.log('     (übersprungen: gilt nur bei eingeschaltetem Modus — ohne Tor gibt es keinen Fokusrahmen zu messen)');
}

console.log('\nG-17 live, nur bei eingeschaltetem Modus: eine fehlgeschlagene Anmeldung hängt die Fehlermeldung über aria-describedby an das Eingabefeld (Audit-Befund T-03)');
if (qrModeAn) {
	const erfundeneKennung = 'y'.repeat(43);
	const fehlerhafteAntwort = await seite('/?casinoToken=' + erfundeneKennung);
	// 200 (401 geprüft und zurückgenommen, siehe QrGate.php-Klassenkopf).
	check(fehlerhafteAntwort.status === 200 && fehlerhafteAntwort.text.includes('ca-gate__form'),
		`die Antwort ist die Torseite mit Fehlermeldung (Rückgabewert: ${fehlerhafteAntwort.status})`);
	check(fehlerhafteAntwort.text.includes('id="ca-gate-error"'),
		'der Fehlerabsatz trägt id="ca-gate-error"');
	check(fehlerhafteAntwort.text.includes('aria-describedby="ca-gate-hint ca-gate-error"'),
		'das Eingabefeld verweist über aria-describedby auf BEIDE Absätze: den Hinweis UND den Fehler');
	check(fehlerhafteAntwort.text.includes('aria-invalid="true"'),
		'das Eingabefeld trägt aria-invalid="true"');

	console.log('     Gegenprobe G-17-G: dieselbe Suche in der Antwort OHNE Fehler (gültiger Aufruf von /) darf aria-invalid nicht finden');
	check(!startseite.text.includes('aria-invalid="true"'),
		'G-17-G: die fehlerfreie Antwort trägt kein aria-invalid="true" — die Prüfung unterscheidet tatsächlich zwischen beiden Fällen');
} else {
	console.log('@pruefstand:luecke G-17 ungeprüft — gilt nur bei eingeschaltetem Modus, gemessener Schalterstand ist AUS');
	console.log('     (übersprungen: gilt nur bei eingeschaltetem Modus — ohne Tor gibt es keine Fehlermeldung zu prüfen)');
}

console.log('\nG-19 live, nur bei eingeschaltetem Modus: unter 40rem ist Platz für die feste Kontenleiste reserviert — Audit-Befund N-03/N-04 (Teil 2), gegen die tatsächlich ausgelieferte frontend.css geprüft');
if (qrModeAn) {
	const lebendesFrontendCssN03 = (await seite('/typo3conf/ext/casino_account/Resources/Public/Css/frontend.css')).text;
	const ohneKommentareN03 = ohneBlockKommentare(lebendesFrontendCssN03);

	/**
	 * WAS DIESES SKRIPT PRÜFEN KANN UND WAS NICHT: ohne einen echten
	 * Browser kann dieses Skript nicht selbst tabulieren und
	 * elementFromPoint() befragen — anders als beim Behebungslauf selbst
	 * (dort per Playwright gemessen: vorher Überdeckung 1,000 an sieben
	 * Bedienteilen und der Fußzeile bei 360×740, nachher 0 an denselben
	 * Stellen, siehe Bericht). Was dieses Skript SEHR WOHL beweisen kann,
	 * rein rechnerisch: dass body/html DENSELBEN Wert reservieren, den die
	 * Leiste tatsächlich hoch ist — 64px = 4rem, an der laufenden Seite
	 * per getBoundingClientRect() bei 360 Bildpunkten gemessen (nicht
	 * geschätzt). padding-block-end ist ein reiner Längenwert, unabhängig
	 * von Schriftmetriken — im Unterschied zur Höhe der Leiste selbst lässt
	 * sich DIESER Wert ohne Browser eindeutig aus dem CSS-Text lesen.
	 *
	 * DIE LEKTION AUS DIESEM BEHEBUNGSLAUF SELBST: die erste Fassung schrieb
	 * html:has(body:has([data-ca-bar])) — ein verschachteltes :has(:has())
	 * ist ein UNGÜLTIGER Selektor (die Spezifikation verbietet :has() im
	 * Argument von :has()), und ein Regelblock mit ungültigem Selektor wird
	 * von JEDEM Browser wortlos verworfen — kein Konsolenfehler, keine
	 * Warnung, nur getComputedStyle(html).scrollPaddingBlockEnd, das bei
	 * "auto" blieb. Nur die Nachmessung per echtem Tab-Schritt (siehe oben)
	 * hat das aufgedeckt, nicht das bloße Lesen der Regel. Die dritte
	 * Prüfung hier bewahrt genau diese Lektion.
	 */
	check(/@media \(max-width: 40rem\) \{[\s\S]*html:has\(\[data-ca-bar]\) \{\s*scroll-padding-block-end:\s*4rem;/.test(ohneKommentareN03),
		'G-19: html:has([data-ca-bar]) setzt scroll-padding-block-end: 4rem innerhalb derselben Breite, in der .ca-bar fest am unteren Rand steht');
	check(/body:has\(\[data-ca-bar]\) \{\s*padding-block-end:\s*4rem;/.test(ohneKommentareN03),
		'G-19: body:has([data-ca-bar]) reserviert denselben Wert (4rem) als Innenabstand — dieselbe Zahl wie die tatsächlich gemessene Höhe der Leiste (360×64px)');
	check(!/:has\([^)]*:has\(/.test(ohneKommentareN03),
		'G-19: kein verschachteltes :has(…:has(…)) irgendwo in der Datei — genau der Fehler, der die erste Fassung dieser Behebung wortlos wirkungslos machte');

	console.log('     Gegenprobe G-19-G: dieselbe Suche gegen den ALTEN Stand (ohne padding/scroll-padding) darf nicht anschlagen, UND die verworfene, ungültige erste Fassung muss als ungültig erkannt werden');
	const alterStand = ohneKommentareN03.replace(/html:has\(\[data-ca-bar]\) \{\s*scroll-padding-block-end:\s*4rem;\s*\}\s*body:has\(\[data-ca-bar]\) \{\s*padding-block-end:\s*4rem;\s*\}/, '');
	check(!/scroll-padding-block-end:\s*4rem/.test(alterStand),
		'G-19-G1: im nachgestellten alten Stand fehlt scroll-padding-block-end — die Prüfung unterscheidet tatsächlich zwischen beiden Ständen');
	const ungueltigeErsteFassung = 'html:has(body:has([data-ca-bar])) { scroll-padding-block-end: 4rem; }';
	check(/:has\([^)]*:has\(/.test(ungueltigeErsteFassung),
		'G-19-G2: die verworfene erste Fassung (verschachteltes :has()) wird von derselben Prüfung als ungültig erkannt');
} else {
	console.log('@pruefstand:luecke G-19 ungeprüft — gilt nur bei eingeschaltetem Modus, gemessener Schalterstand ist AUS');
	console.log('     (übersprungen: gilt nur bei eingeschaltetem Modus — ohne Kontenleiste gibt es nichts zu verdecken)');
}

/* ------------------------------------------ Wächter: sind alle Blöcke gelaufen? */

const erwarteteZusagen = qrModeAn ? ERWARTETE_ZUSAGEN_AN : ERWARTETE_ZUSAGEN;

if (erwarteteZusagen > 0 && zusagen !== erwarteteZusagen) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${erwarteteZusagen} erwartet (Schalter ${qrModeAn ? 'AN' : 'AUS'}).`);
	fehler++;
} else if (ERWARTETE_ZUSAGEN === 0) {
	console.log(`\n  (Wächter noch nicht scharf: ERWARTETE_ZUSAGEN steht auf 0 und wird erst in`);
	console.log(`  Umsetzungsstück D2d gemessen und eingetragen. Tatsächlich ausgegebene Zusagen: ${zusagen}.)`);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`}`);
if (fehler === 0) {
	console.log('Die Middleware-Kette meldet sich korrekt an (Reihenfolge, Bezeichner aus dem Kern belegt),');
	console.log('beide Schichten prüfen den Schalter zuerst, die Ausnahmeliste ist von der Site-Konfiguration');
	console.log('abgeleitet, die Torseite ist barrierearm aufgebaut, gate-scan.js trägt keinen deutschen Text');
	console.log('und stimmt mit der Vorlage überein, frontend.css benutzt nur echte Design-Tokens, und die');
	console.log('laufende Website verhält sich zum gemessenen Schalterstand genau so, wie D.9 es verlangt.');
}

process.exit(fehler === 0 ? 0 : 1);
