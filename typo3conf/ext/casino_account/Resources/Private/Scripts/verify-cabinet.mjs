/**
 * Casino Kunterbunt – casino_account: Hausprüfung (Geometrie/Trennung/Negativliste)
 * ====================================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node ab Version 18,
 * ohne jede npm-Abhängigkeit, rein lesend. Laufzeit unter einer Sekunde.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-cabinet.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt oder
 * der Wächterblock anschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan PLAN-teild-d1-konto-qr-part-3.md, Abschnitt 4.6.1;
 * Umsetzungsstück De)
 * -------------------------------------------------------------------------
 *   A-1   Kein ausgeschriebener Farbwert, außer den drei SVG-Symbolen und
 *         QrSvgRenderer.php (dort mit eigener, engerer Prüfung A-1b)
 *   A-1b  QrSvgRenderer.php trägt GENAU zwei Farbwerte: #000000 und #ffffff
 *   A-2   Jeder benutzte --ck-Token existiert in casino_startpage/tokens.css.
 *         Bis einschließlich D2b benutzte diese Extension KEINEN einzigen —
 *         seit D2c/D2d (Torseite, Kontenleiste) benutzt sie echte Tokens,
 *         und die Prüfung bestätigt das jetzt aktiv statt „keiner benutzt"
 *   A-3   Keine Datei von außen. Zwei enge, benannte Ausnahmen: der
 *         dokumentierte Platzhalter „https://<host>" im Kopfkommentar von
 *         PlayerUrlBuilder.php ist ein Datenwert (die Adresse auf dem
 *         QR-Code entsteht dort zur Laufzeit aus der Site-Verwaltung), keine
 *         Einbindung; und src="{…}" mit einem einzelnen Fluid-Ausdruck als
 *         Wert (z. B. src="{jsUrl}" in Gate/Index.html) ist ebenfalls kein
 *         eingebundenes Fremddokument, sondern ein zur Laufzeit über
 *         PathUtility berechneter Wert (seit D2d korrigiert)
 *   A-4   Trennung: casino_startpage kennt "casino_account" nicht — im CODE,
 *         nicht in Kommentaren. Ausnahme: die geteilte negativliste.mjs
 *   A-5   Kein Treffer der geteilten Negativliste und keins der Zeichen
 *         ©/™/® in irgendeiner Datei dieser Extension, README eingeschlossen
 *   A-6   Die Lizenzangaben widersprechen sich nicht
 *   A-7   Schlüssel, Composer-Name, Namensraum und Tabellenpräfix sind
 *         auseinander ableitbar
 *   A-8   Jede PHP-Datei unter Classes/ beginnt mit <?php,
 *         declare(strict_types=1) und einem zu ihrem Pfad passenden
 *         namespace (PSR-4)
 *   A-9   Das Kürzel-Präfix "ca-" wird eingehalten (Klassen, data-Attribute),
 *         außer den ausdrücklich geteilten Backend-Klassen (seit D2d auch
 *         btn-warning/callout/callout-warning). Ein eingebetteter
 *         Fluid-Ausdruck in einem class-Attribut wird vor dem Aufspalten
 *         neutralisiert, statt ihn fälschlich in Wortfetzen zu zerlegen
 *         (Korrektur seit D2d)
 *   A-10  Jede Datei unter Resources/Public/Icons/ hat viewBox="0 0 16 16",
 *         fill="currentColor", kein <text>, kein <image>
 *   A-11  Kein ext_tables.php; jede Datei dieser Extension liegt innerhalb
 *         von typo3conf/ext/casino_account/
 *   A-12  Kein echtes disabled im ausgelieferten HTML/JS; kein opacity ohne
 *         :not(:focus-visible) in backend.css ODER frontend.css (seit D2d
 *         auf beide Dateien erweitert), außer den drei benannten,
 *         fokuslosen Textzusätzen .ca-qrmode__seen/.ca-qrmode__hint/
 *         .ca-gate__hint
 *   A-13  Jede Beschriftung im HTML kommt aus der XLIFF-Datei oder ist eine
 *         Fluid-Variable — kein Fließtext zwischen > und < in den beiden
 *         Vorlagen
 *
 * WARUM A-3 EINE NAMENTLICHE AUSNAHME FÜR PlayerUrlBuilder.php BRAUCHT
 * -------------------------------------------------------------------------
 * Wie in den acht vorhandenen verify-cabinet.mjs (siehe deren A-3) wird ROH
 * gesucht, ohne Kommentare vorher zu entfernen — ein von außen geladenes Bild
 * oder Stylesheet wäre unabhängig davon ein Fund, ob die Zeile ein Kommentar
 * ist. Der Kopfkommentar von PlayerUrlBuilder.php erklärt die gebaute Adresse
 * mit dem Platzhalter "https://<host>/?casinoToken=<Kennung>" — ein
 * Erklärtext, kein eingebundenes Fremddokument. Die Ausnahme ist ENG: sie
 * neutralisiert ausschließlich die Zeichenkette "https://<host>" in GENAU
 * dieser einen Datei, nicht die Datei als Ganzes und keine andere Datei.
 *
 * WARUM A-4 IM CODE SUCHT, NICHT IN KOMMENTAREN
 * -------------------------------------------------------------------------
 * Dieselbe Begründung wie bei A-4 in den acht vorhandenen Geräte-Extensions:
 * ein Wortabgleich über Kommentare könnte "nennt die Extension" und "nennt
 * die Sache" nicht mehr unterscheiden. Der eigene Extension-Schlüssel wird
 * aus path.basename(EXT) ABGELEITET, nicht eingetragen.
 *
 * NICHT betroffen ist A-5: die Negativliste fremder Marken läuft über JEDE
 * Zeile, Kommentare eingeschlossen — das ist die rechtliche Prüfung
 * (CONCEPT.md B.3 Nr. 4, V.7 Nr. 5) und wird nicht angetastet.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NEGATIVLISTE, MINDESTLAENGE, musterFuer } from '../../../../casino_startpage/Resources/Private/Scripts/negativliste.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/casino_account/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
const SITE = path.join(EXT_ROOT, 'casino_startpage');
/** Der eigene Extension-Schlüssel, ABGELEITET aus dem Verzeichnisnamen. */
const EIGENER_SCHLUESSEL = path.basename(EXT);
/**
 * Diese Datei selbst — nur dafür, dass A-5 die drei Zeichen ©/™/® in DIESER
 * Datei unschädlich macht, bevor sie geprüft wird (sie muss die drei Zeichen
 * wörtlich enthalten, um überhaupt gegen sie prüfen zu können). Jede andere
 * Datei bleibt unangetastet. Dieselbe enge Selbstausnahme wie in den acht
 * vorhandenen verify-cabinet.mjs.
 *
 * NACHGETRAGEN (Behebungslauf nach dem Laufzeit-Audit vom 2026-09-10, Phase
 * D3): Abschnitt F hält die Behebung von K-01, K-02, K-03 und S-01 fest —
 * dieselben Fund-Kennungen wie im Audit-Bericht, damit ein Rückbau sich
 * direkt einer der dort beschriebenen Ursachen zuordnen lässt. Gerechnet
 * wird bei K-03 mit der echten WCAG-2.2-Kontrastformel aus den tatsächlichen
 * Hex-Werten in tokens.css, nicht mit abgeschriebenen Zahlen.
 *
 * NACHGETRAGEN (Behebungslauf nach dem Laufzeit-Audit vom 2026-09-10, Teil
 * 2, angemeldeter Zustand): dieselbe Bauart, F-N01/F-N03/F-N04/F-N05 halten
 * die Behebung von N-01, N-03/N-04 und N-05 fest. F-K01 wurde dabei an die
 * neue Struktur angepasst, nicht verdoppelt: .ca-bar__total selbst trägt
 * seither kein role="status" mehr, der Live-Bereich sitzt auf einem eigenen
 * Element (F-N01).
 */
const DIESE_DATEI = fileURLToPath(import.meta.url);

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

/** Alle Dateien unterhalb eines Verzeichnisses, rekursiv, sortiert. */
function alleDateien(wurzel) {
	const gefunden = [];
	const offen = [wurzel];
	while (offen.length > 0) {
		const verzeichnis = offen.pop();
		for (const name of readdirSync(verzeichnis).sort()) {
			const voll = path.join(verzeichnis, name);
			if (statSync(voll).isDirectory()) {
				offen.push(voll);
			} else {
				gefunden.push(voll);
			}
		}
	}
	return gefunden.sort();
}

/** Entfernt <f:comment>-Blöcke. */
function ohneFluidKommentare(inhalt) {
	return inhalt.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '');
}

/** Entfernt zusätzlich PHP/CSS/JS-Blockkommentare (/* … *\/). */
function ohneBlockKommentare(inhalt) {
	return ohneFluidKommentare(inhalt).replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Entfernt zusätzlich JS-Zeilenkommentare (// …) — für F-K01, dessen
 * eigener Kommentar in account-live.js selbst das Wort "firstChild" nennt. */
function ohneJsKommentare(inhalt) {
	return ohneBlockKommentare(inhalt).replace(/\/\/.*$/gm, '');
}

/**
 * Liefert den Inhalt des ERSTEN geschweiften Blocks nach `startIndex`,
 * korrekt geklammert (zählt { und }, nicht die erste "}" — dieselbe Bauart
 * wie methodenRumpf() in verify-gate.mjs/verify-auth.mjs). Für CSS-Blöcke
 * mit verschachtelten Regeln (@media { .klasse { … } }) reicht ein naiver
 * nicht-gieriger Regelausdruck nicht.
 *
 * @param {string} text
 * @param {number} startIndex
 * @returns {string} leer, wenn kein Block gefunden wurde
 */
function geklammerterBlock(text, startIndex) {
	if (startIndex === -1) {
		return '';
	}
	const auf = text.indexOf('{', startIndex);
	if (auf === -1) {
		return '';
	}
	let tiefe = 0;
	for (let i = auf; i < text.length; i++) {
		if (text[i] === '{') {
			tiefe += 1;
		} else if (text[i] === '}') {
			tiefe -= 1;
			if (tiefe === 0) {
				return text.slice(auf, i + 1);
			}
		}
	}
	return '';
}

/**
 * Ersetzt einen Fund durch ebenso viele Zeilenumbrüche, damit Zeilennummern
 * stimmen bleiben (dieselbe Bauart wie in den acht vorhandenen
 * verify-cabinet.mjs, A-4).
 */
function alsLeerzeilen(text) {
	return text.replace(/[^\n]/g, '');
}

/** Schneidet ALLE Kommentararten heraus: <f:comment>, Blockkommentare, //. */
function ohneAlleKommentare(inhalt) {
	return inhalt
		.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, alsLeerzeilen)
		.replace(/\/\*[\s\S]*?\*\//g, alsLeerzeilen)
		.replace(/\/\/.*$/gm, '');
}

/**
 * Die Dateien, die ausgeliefert werden oder TYPO3 konfigurieren. Prüfskripte,
 * README und LICENSE stehen bewusst nicht darin — reiner Fließtext bzw.
 * GPL-Boilerplate, wird nie ins Frontend/Backend gerendert (wortgleiche
 * Ausnahme wie bei den acht vorhandenen Extensions).
 */
const AUSGELIEFERT = alleDateien(EXT).filter((datei) => {
	const rel = path.relative(EXT, datei);
	if (rel.startsWith('Resources/Private/Scripts')) {
		return false;
	}
	return rel !== 'README.md' && rel !== 'LICENSE';
});

const ICONS = [
	'Resources/Public/Icons/Extension.svg',
	'Resources/Public/Icons/ModuleGroupCasino.svg',
	'Resources/Public/Icons/ModulePlayers.svg',
];
const QR_SVG_RENDERER = 'Classes/Qr/QrSvgRenderer.php';
const PLAYER_URL_BUILDER = 'Classes/Service/PlayerUrlBuilder.php';
const FRONTEND_CSS = 'Resources/Public/Css/frontend.css';
const OHNE_ICONS_UND_QR = AUSGELIEFERT.filter((datei) => {
	const rel = path.relative(EXT, datei);
	return !ICONS.includes(rel) && rel !== QR_SVG_RENDERER;
});

console.log('\ncasino_account – Hausprüfung (Geometrie/Trennung/Negativliste)');
console.log('================================================================\n');

/* ================================================ Wächter: kein stiller Ausstieg */

/*
 * DREI FEHLERKLASSEN, DREI RIEGEL — dieselbe Bauart wie in den vier übrigen
 * verify-*.mjs dieser Extension und in roulette/…/verify-felt.mjs
 * (Zeilen 346–401, 1675–1682), Vorlage dieses Projekts für einen Prüfstand,
 * der nicht stumm etwas überspringt.
 *
 * 1  EINE FEHLENDE DATEI führt zum sofortigen, LAUTEN Abbruch mit
 *    Rückgabewert 1 — nie zu einem übersprungenen Block.
 * 2  EIN NUL-BYTE in einer Pflichtdatei führt ebenso zum lauten Abbruch.
 * 3  EIN VERSCHWUNDENER PRÜFBLOCK würde nur die Anzahl der ausgegebenen
 *    Zusagen senken, ohne eine einzige davon rot zu machen — deshalb zählt
 *    check() jede Zusage, und am Ende wird die Zahl gegen ERWARTETE_ZUSAGEN
 *    gehalten.
 */
const PFLICHTDATEIEN = [
	['composer.json', path.join(EXT, 'composer.json')],
	['ext_emconf.php', path.join(EXT, 'ext_emconf.php')],
	['LICENSE', path.join(EXT, 'LICENSE')],
	['README.md', path.join(EXT, 'README.md')],
	['ext_tables.sql', path.join(EXT, 'ext_tables.sql')],
	['Classes/Qr/QrSvgRenderer.php', path.join(EXT, QR_SVG_RENDERER)],
	['Classes/Service/PlayerUrlBuilder.php', path.join(EXT, PLAYER_URL_BUILDER)],
	['Resources/Public/Css/backend.css', path.join(EXT, 'Resources/Public/Css/backend.css')],
	['Resources/Private/Templates/PlayerModule/Index.html', path.join(EXT, 'Resources/Private/Templates/PlayerModule/Index.html')],
	['Resources/Private/Templates/PlayerModule/Qr.html', path.join(EXT, 'Resources/Private/Templates/PlayerModule/Qr.html')],
	['casino_startpage/…/negativliste.mjs', path.join(SITE, 'Resources/Private/Scripts/negativliste.mjs')],
	['casino_startpage/…/tokens.css', path.join(SITE, 'Resources/Public/Css/tokens.css')],
	// NACHGETRAGEN (Behebungslauf nach D3-Audit, Abschnitt F): die drei
	// Dateien, in denen K-01/K-02/K-03/S-01 behoben wurden.
	['Resources/Private/Templates/AccountBar/Index.html', path.join(EXT, 'Resources/Private/Templates/AccountBar/Index.html')],
	['Resources/Public/JavaScript/account-live.js', path.join(EXT, 'Resources/Public/JavaScript/account-live.js')],
	['Classes/Middleware/AccountBar.php', path.join(EXT, 'Classes/Middleware/AccountBar.php')],
];

for (const [name, pfad] of PFLICHTDATEIEN) {
	if (!existsSync(pfad)) {
		console.log(`\nERGEBNIS: Abbruch — ${name} existiert nicht (${pfad}).`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
		process.exit(1);
	}
	if (readFileSync(pfad, 'utf8').includes('\0')) {
		console.log(`\nERGEBNIS: Abbruch — ${name} enthält ein NUL-Byte.`);
		console.log('Eine Textdatei mit NUL-Byte ist für viele Werkzeuge eine Binärdatei;');
		console.log('Suchen darin laufen ins Leere, ohne einen Fehler zu melden.');
		process.exit(1);
	}
}

/**
 * Die Anzahl der Zusagen, die ein vollständiger Lauf ausgibt. Sie wird
 * GEMESSEN, nicht geschätzt — zuletzt in Umsetzungsstück De auf 49 gemessen;
 * in Umsetzungsstück D2d erneut gefahren, abgelesen (57) und hier
 * nachgezogen (Rückbauprobe: ein check()-Aufruf testweise entfernt, Wächter
 * schlägt an, zurückgebaut, wieder grün) — die acht zusätzlichen check()-
 * Aufrufe stammen aus den fünf D2d-Erweiterungen von A-1/A-2/A-3/A-9/A-12
 * (neue Gegenproben, siehe die jeweiligen Blöcke).
 *
 * NACHGETRAGEN (Behebungslauf nach D3-Audit): Abschnitt F (F-K01 bis F-S01)
 * bringt 23 weitere check()-Aufrufe — gefahren und abgelesen (80), dieselbe
 * Rückbauprobe wie oben.
 *
 * NACHGETRAGEN (Behebungslauf nach dem Laufzeit-Audit vom 2026-09-10, Teil
 * 2): F-N01/F-N03/F-N04/F-N05 bringen 11 weitere check()-Aufrufe (F-K01
 * selbst bleibt bei derselben Anzahl — nur eine seiner Zusagen wurde an die
 * neue Struktur angepasst, keine hinzugefügt oder entfernt) — gefahren und
 * abgelesen (91), dieselbe Rückbauprobe wie oben.
 */
const ERWARTETE_ZUSAGEN = 91;

/* ============================================================= A-1 Farben */

console.log('A-1  Kein ausgeschriebener Farbwert (außer den drei Icons, QrSvgRenderer.php und der einen benannten Ausnahme in frontend.css)');
{
	const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
	const FUNKTION = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g;
	const treffer = [];
	for (const datei of OHNE_ICONS_UND_QR) {
		const rel = path.relative(EXT, datei);
		let inhalt = ohneBlockKommentare(lies(datei));
		if (rel === FRONTEND_CSS) {
			// ENGE, NAMENTLICHE AUSNAHME (seit Umsetzungsstück D2d): das
			// Eingabefeld der Torseite braucht ein echtes Weiß — tokens.css
			// definiert kein reines Weiß, und ein Eingabefeld in Papierfarbe
			// wäre von seiner Umgebung nicht mehr zu unterscheiden (siehe
			// Fußnote in frontend.css). Neutralisiert wird NUR der Wert
			// "#fff" in GENAU dieser Datei — jeder andere Hex-Wert in
			// frontend.css bleibt ein Fund (siehe Gegenprobe A-1-G2).
			inhalt = inhalt.replace(/#fff\b/gi, '');
		}
		for (const m of inhalt.matchAll(HEX)) {
			treffer.push(`${kurz(datei)}: ${m[0]}`);
		}
		for (const m of inhalt.matchAll(FUNKTION)) {
			treffer.push(`${kurz(datei)}: ${m[0]}…`);
		}
	}
	check(treffer.length === 0,
		`kein ausgeschriebener Farbwert in ${OHNE_ICONS_UND_QR.length} Dateien`
		+ ' (die drei SVG-Icons und QrSvgRenderer.php sind ausgenommen — sie'
		+ ' stehen außerhalb des Backend-Dokuments bzw. tragen die begründete'
		+ ' Kontrastausnahme des QR-Codes, siehe A-1b; dazu die eine benannte'
		+ ' Ausnahme "#fff" im Eingabefeld der Torseite, frontend.css)',
		...treffer);

	console.log('     Gegenprobe A-1-G: ein erfundener Wert in backend.css muss auffallen');
	const backendCss = ohneBlockKommentare(lies(path.join(EXT, 'Resources/Public/Css/backend.css')));
	const mitErfundenerFarbe = backendCss + '\n.ca-erfunden { color: #123456; }';
	check([...mitErfundenerFarbe.matchAll(HEX)].length === 1, 'A-1-G: #123456 wird als Fund erkannt');

	console.log('     Gegenprobe A-1-G2: der neutralisierte #fff in frontend.css darf keinen Fund mehr auslösen, ein zweiter, erfundener Wert in derselben Datei muss trotzdem auffallen');
	const frontendCssInhalt = ohneBlockKommentare(lies(path.join(EXT, FRONTEND_CSS)));
	const frontendCssNeutralisiert = frontendCssInhalt.replace(/#fff\b/gi, '');
	check([...frontendCssNeutralisiert.matchAll(HEX)].length === 0,
		'A-1-G2: #fff selbst löst nach der Neutralisierung keinen Fund mehr aus');
	const mitZweitemWert = frontendCssNeutralisiert + '\n.ca-erfunden2 { color: #654321; }';
	check([...mitZweitemWert.matchAll(HEX)].length === 1,
		'A-1-G2: ein zweiter, erfundener Farbwert in derselben Datei wird trotzdem gefunden');
}

/* =========================================================== A-1b QR-SVG-Farben */

console.log('\nA-1b QrSvgRenderer.php trägt genau zwei Farbwerte: #000000 und #ffffff');
{
	const inhalt = ohneBlockKommentare(lies(path.join(EXT, QR_SVG_RENDERER)));
	const HEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
	const gefunden = [...new Set([...inhalt.matchAll(HEX)].map((m) => m[0].toLowerCase()))];
	check(gefunden.length === 2 && gefunden.includes('#000000') && gefunden.includes('#ffffff'),
		`genau #000000 und #ffffff, kein dritter Wert (gefunden: ${gefunden.join(', ') || 'keiner'})`,
		...gefunden.filter((f) => f !== '#000000' && f !== '#ffffff').map((f) => `unerwartet: ${f}`));

	console.log('     Gegenprobe A-1b-G: ein hinzugedachtes #ff0000 muss auffallen');
	const mitDrittemWert = inhalt + '\n// #ff0000';
	const gegenprobe = [...new Set([...mitDrittemWert.matchAll(HEX)].map((m) => m[0].toLowerCase()))];
	check(gegenprobe.length === 3, 'A-1b-G: #ff0000 wird als dritter, unerwarteter Wert erkannt');
}

/* ============================================================= A-2 Tokens */

console.log('\nA-2  Alle benutzten Design-Tokens existieren in casino_startpage/…/tokens.css');
{
	const tokensCss = lies(path.join(SITE, 'Resources/Public/Css/tokens.css'));
	const definiert = new Set([...tokensCss.matchAll(/^\s*(--ck-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));
	const benutzt = new Map();
	for (const datei of AUSGELIEFERT) {
		for (const m of lies(datei).matchAll(/var\(\s*(--ck-[a-z0-9-]+)/g)) {
			if (!benutzt.has(m[1])) {
				benutzt.set(m[1], kurz(datei));
			}
		}
	}
	const unbekannt = [...benutzt].filter(([name]) => !definiert.has(name));
	check(unbekannt.length === 0,
		`${benutzt.size} benutzte Tokens, alle in casino_startpage/…/tokens.css definiert`
		+ ` (dort stehen ${definiert.size}). Bis einschließlich Umsetzungsstück D2b`
		+ ' benutzte diese Extension KEINEN einzigen Token — sie hatte kein eigenes'
		+ ' Frontend. Seit D2c/D2d bringt sie mit der Torseite und der Kontenleiste'
		+ ' ein eigenes Frontend mit und benutzt deshalb erstmals echte Tokens des'
		+ ' Hauses (das reine Backend-Modul bleibt weiterhin tokenlos, siehe'
		+ ' backend.css, Kopfkommentar).',
		...unbekannt.map(([name, datei]) => `${name} – benutzt in ${datei}`));
	check(benutzt.size > 0,
		`tatsächlich ${benutzt.size} Tokens benutzt — die Prüfung greift wirklich`
		+ ' und bestätigt aktiv, DASS Tokens benutzt werden, statt stillschweigend'
		+ ' "nichts zu tun" zu überspringen (bis D2b galt das Gegenteil: dort war'
		+ ' "null Tokens" die geprüfte, richtige Zusage)');

	console.log('     Gegenprobe A-2-G: ein erfundener Token muss auffallen');
	const erfunden = new Set([...benutzt.keys(), '--ck-gibt-es-nicht']);
	const gegenprobeUnbekannt = [...erfunden].filter((name) => !definiert.has(name));
	check(gegenprobeUnbekannt.length === 1 && gegenprobeUnbekannt[0] === '--ck-gibt-es-nicht',
		'A-2-G: --ck-gibt-es-nicht wird als unbekannt erkannt');
}

/* =========================================== A-3 Keine Datei von außen */

console.log('\nA-3  Keine Datei von außen');
{
	const treffer = [];
	for (const datei of AUSGELIEFERT) {
		const rel = path.relative(EXT, datei);
		const istIcon = ICONS.includes(rel);
		const istPlayerUrlBuilder = rel === PLAYER_URL_BUILDER;
		for (const zeile of lies(datei).split('\n')) {
			let gesaeubert = zeile
				.replace(/url\(#[^)]*\)/g, '')
				.replace(/href="#[^"]*"/g, '')
				// XML-/Fluid-Namensraum-Erklärungen sind keine Einbindung
				// einer fremden Datei, sondern eine feste, im Standard
				// vorgeschriebene Kennzeichnung (xmlns="http://www.w3.org/2000/svg",
				// xmlns:f="http://typo3.org/ns/…") — dieselbe Art Ausnahme wie
				// die bisherige Icon-Ausnahme, nur allgemein statt nur für
				// die drei Icons.
				.replace(/xmlns[:\w-]*="[^"]*"/g, '')
				// KORREKTUR EINER FALSCHEN ERKENNUNG (seit Umsetzungsstück
				// D2d): src="{jsUrl}" in Gate/Index.html ist KEINE fremde
				// Datei, sondern ein einzelner Fluid-Ausdruck. Sein
				// tatsächlicher Wert entsteht zur Laufzeit über
				// PathUtility::getPublicResourceWebPath('EXT:…') in
				// GatePage.php — also innerhalb der Extension, nicht als
				// literal eingebundene fremde Adresse im Quelltext. Neutra-
				// lisiert wird deshalb JEDES src="{…}" mit GENAU EINEM
				// Fluid-Ausdruck als Wert, in JEDER Datei — ein echtes
				// src="https://…" oder src="/irgendwas.js" bleibt davon
				// unberührt, weil sein Wert kein einzelner {…}-Ausdruck ist.
				.replace(/\bsrc="\{[^"{}]*\}"/g, '');
			if (istIcon) {
				gesaeubert = gesaeubert.replace('http://www.w3.org/2000/svg', '');
			}
			if (istPlayerUrlBuilder) {
				// ENGE Ausnahme (siehe Kopfkommentar): nur der Platzhalter
				// "https://<host>" aus dem erklärenden Kopfkommentar dieser
				// einen Datei, keine andere Zeichenfolge und keine andere
				// Datei.
				gesaeubert = gesaeubert.replace(/https:\/\/<host>[^\s]*/g, '');
			}
			for (const muster of [/@import/, /url\(/, /src=/, /https?:\/\//, /<img\b/, /@font-face/]) {
				if (muster.test(gesaeubert)) {
					treffer.push(`${kurz(datei)}: ${zeile.trim().slice(0, 110)}`);
					break;
				}
			}
		}
	}
	check(treffer.length === 0,
		'kein @import, kein url(…) auf eine Datei, kein src=, keine http-Adresse,'
		+ ' kein <img>, kein @font-face (Ausnahmen: der dokumentierte Platzhalter'
		+ ' "https://<host>" in PlayerUrlBuilder.php, siehe Kopfkommentar; und'
		+ ' src="{…}" mit einem einzelnen Fluid-Ausdruck als Wert, z. B.'
		+ ' src="{jsUrl}" in Gate/Index.html — sein Wert entsteht über'
		+ ' PathUtility::getPublicResourceWebPath(\'EXT:…\'), keine literal'
		+ ' eingebundene fremde Adresse)',
		...treffer);

	console.log('     Gegenprobe A-3-G: eine hinzugedachte externe Adresse muss auffallen, der Platzhalter nicht');
	const mitFremderAdresse = 'ein Test mit https://beispiel.example/bild.png mittendrin';
	check(/https?:\/\//.test(mitFremderAdresse), 'A-3-G: eine echte Adresse wird gefunden');
	const platzhalterAllein = 'https://<host>/?casinoToken=<Kennung>'.replace(/https:\/\/<host>[^\s]*/g, '');
	check(!/https?:\/\//.test(platzhalterAllein), 'A-3-G: der neutralisierte Platzhalter löst KEINEN Fund mehr aus');

	console.log('     Gegenprobe A-3-G2: src="{jsUrl}" darf keinen Fund mehr auslösen, ein echtes src="/pfad.js" weiterhin');
	const mitFluidSrc = '<script type="module" src="{jsUrl}"></script>'.replace(/\bsrc="\{[^"{}]*\}"/g, '');
	check(!/\bsrc=/.test(mitFluidSrc), 'A-3-G2: src="{jsUrl}" wird neutralisiert und löst keinen Fund mehr aus');
	const mitEchtemSrc = '<script src="/fremd.js"></script>'.replace(/\bsrc="\{[^"{}]*\}"/g, '');
	check(/\bsrc=/.test(mitEchtemSrc), 'A-3-G2: ein echtes src="/fremd.js" bleibt ein Fund');
}

/* ============================================================ A-4 Trennung */

console.log(`\nA-4  casino_startpage kennt "${EIGENER_SCHLUESSEL}" nicht (im Code)`);
{
	const roh = EIGENER_SCHLUESSEL;
	const kuerzel = roh.length <= 8 ? roh.slice(0, 2) : roh.split('_').map((t) => t.charAt(0)).join('');
	const NAMEN = [
		new RegExp(roh, 'i'),
		new RegExp(roh.replace(/_/g, '-'), 'i'),
		new RegExp(roh.replace(/_/g, ''), 'i'),
		new RegExp(roh.replace(/_/g, ' '), 'i'),
		new RegExp(roh.charAt(0).toUpperCase() + roh.slice(1)),
	];
	const PRAEFIX = new RegExp(`(^|[^-a-z])${kuerzel}-[a-z]`);
	// Enge Ausnahme für genau zwei Dateien:
	// - die geteilte Negativliste casino_startpage/…/negativliste.mjs muss
	//   als ausführbares JS-Array wörtlich gerätespezifische Handelsnamen
	//   enthalten (siehe deren Kopfkommentar) — das koppelt casino_startpage
	//   nicht an dieses Gerät, derselbe Schutzzweck wie A-5 selbst.
	// - casino_startpage/…/verify-account-backend.mjs (D3b, PLAN-d3-guthaben.md
	//   4.21) ist das Prüfwerkzeug DIESER Extension für die Umschaltstelle zum
	//   Konto — es muss testen können, dass account-backend.js selbst
	//   "casino_account" nicht kennt (A-8), und liest für A-9 lesend aus
	//   tx_casinoaccount_player/sys_registry. Ein Entwicklerwerkzeug, kein
	//   Bestandteil der ausgelieferten Website; das koppelt die SEITE nicht an
	//   casino_account, genau wie die Negativliste kein Gerät koppelt.
	// - casino_startpage/…/verify-account-ui.mjs (D3c, PLAN-d3-guthaben.md
	//   4.25) ist aus demselben Grund ausgenommen: U-6/U-7 lesen frontend.css,
	//   account-live.js und AccountBar/Index.html aus casino_account, um die
	//   dortige :has()-Regel und die Sperranzeige gegen das Markup und den
	//   Quelltext von casino_startpage abzugleichen; U-8 liest lesend aus
	//   tx_casinoaccount_player/sys_registry. Ebenfalls ein Entwicklerwerkzeug,
	//   kein Bestandteil der ausgelieferten Website.
	// - casino_startpage/…/verify-geo.mjs (2026-09-11) aus demselben Grund:
	//   seine lebenden GEO-Prüfungen fragen jede Frontend-Adresse ab, und bei
	//   eingeschaltetem QR-Modus antwortet dort die Torseite statt der Seite.
	//   Ohne die lesende Abfrage von sys_registry ginge das Skript allein wegen
	//   eines Schalterstands rot und sähe aus wie ein Rückschritt. Auch dies ein
	//   Entwicklerwerkzeug, kein Bestandteil der ausgelieferten Website — die
	//   SEITE bleibt entkoppelt, nur ihr Prüfwerkzeug weiß vom Schalter.
	// - casino_startpage/…/pruefstand.mjs (Phase D6) aus demselben Grund: der
	//   Reihenlauf des ganzen Hauses muss den Schalterstand selbst messen, um
	//   zu entscheiden, welche der gefundenen Prüfskripte in diesem Zustand
	//   überhaupt etwas beweisen — dieselbe lesende sys_registry-Abfrage wie
	//   bei den drei Werkzeugen davor. pruefstand.mjs findet seine Prüfskripte
	//   über ein Namensmuster (typo3conf/ext/*/Resources/Private/Scripts/
	//   verify-*.mjs) und führt KEINE Liste von Gerätenamen — auch dieses
	//   Werkzeug koppelt die SEITE nicht an ein Gerät oder an casino_account,
	//   nur sich selbst als Entwicklerwerkzeug.
	// Dieselbe Art Ausnahme wie in den acht vorhandenen verify-cabinet.mjs.
	const A4_AUSGENOMMEN = [
		path.join(SITE, 'Resources/Private/Scripts/negativliste.mjs'),
		path.join(SITE, 'Resources/Private/Scripts/verify-account-backend.mjs'),
		path.join(SITE, 'Resources/Private/Scripts/verify-account-ui.mjs'),
		path.join(SITE, 'Resources/Private/Scripts/verify-geo.mjs'),
		path.join(SITE, 'Resources/Private/Scripts/pruefstand.mjs'),
	];
	const treffer = [];
	for (const datei of alleDateien(SITE).filter((d) => !A4_AUSGENOMMEN.includes(d))) {
		const zeilen = ohneAlleKommentare(lies(datei)).split('\n');
		zeilen.forEach((zeile, n) => {
			if (NAMEN.some((m) => m.test(zeile)) || PRAEFIX.test(zeile)) {
				treffer.push(`${kurz(datei)}:${n + 1}: ${zeile.trim().slice(0, 110)}`);
			}
		});
	}
	check(treffer.length === 0,
		`keine einzige Nennung der Extension und kein ${kuerzel}-Präfix im CODE`
		+ ' des Site Packages (Kommentare dürfen das Modul benennen, sie koppeln'
		+ ' nichts)',
		...treffer);

	console.log('     Gegenprobe A-4-G: ein hinzugedachtes ca-Präfix in casino_startpage muss auffallen');
	const erfundeneZeile = 'element.classList.add("ca-erfunden");';
	check(PRAEFIX.test(erfundeneZeile), 'A-4-G: das erfundene ca-Präfix wird erkannt');
}

/* ========================================= A-5 Kein fremder Name */

console.log('\nA-5  Kein fremder Hersteller-, Modell- oder Spieltitel');
{
	// Struktureller Befund der Copyright-Prüfungen dieses Projekts: die
	// Prüfung, dass NEGATIVLISTE.length mindestens MINDESTLAENGE beträgt,
	// wird selbst GEPRÜFT und nicht nur ausgegeben — sonst liefe diese
	// Prüfung mit einer leeren oder halb geschriebenen Liste durch und
	// meldete fälschlich "bestanden".
	check(NEGATIVLISTE.length >= MINDESTLAENGE,
		`NEGATIVLISTE trägt mindestens ${MINDESTLAENGE} Einträge (tatsächlich`
		+ ` ${NEGATIVLISTE.length})`);

	const ALLE = alleDateien(EXT);
	const treffer = [];
	for (const datei of ALLE) {
		// KEIN Kommentar-Ausschnitt hier: A-5 ist die rechtliche Prüfung und
		// liest deshalb den vollen Text, Kommentare eingeschlossen — anders
		// als A-4, die eine reine Architekturfrage prüft. Ausnahme: in dieser
		// Datei selbst werden die drei Zeichen ©/™/® unschädlich gemacht
		// (siehe DIESE_DATEI oben) — sie muss sie wörtlich enthalten, um
		// überhaupt gegen sie prüfen zu können.
		const roh = lies(datei);
		const inhalt = datei === DIESE_DATEI ? roh.replace(/[©™®]/g, '·') : roh;
		const inhaltKlein = inhalt.toLowerCase();
		for (const name of NEGATIVLISTE) {
			if (musterFuer(name).test(inhaltKlein)) {
				treffer.push(`${kurz(datei)}: „${name}"`);
			}
		}
		for (const zeichen of ['©', '™', '®']) {
			if (inhalt.includes(zeichen)) {
				treffer.push(`${kurz(datei)}: Zeichen „${zeichen}"`);
			}
		}
	}
	check(treffer.length === 0,
		`kein Treffer der Negativliste (${NEGATIVLISTE.length} Namen, geteilt mit`
		+ ' den acht übrigen Extensions) und keins der drei Zeichen ©/™/® in'
		+ ' dieser Extension — README eingeschlossen',
		...treffer);

	console.log('     Gegenprobe A-5-G: dieselbe Prüfung (musterFuer) muss einen gelisteten Namen auch in Versalien und ohne Trennzeichen erkennen');
	// Der Testname wird zur LAUFZEIT aus NEGATIVLISTE gewählt, statt als
	// eigenes Zeichenkettenliteral in diese Datei geschrieben zu werden —
	// sonst geriete der geschützte Name selbst in den Quelltext dieser Datei
	// und A-5 schlüge gegen die eigene Gegenprobe an (dieselbe Bauart wie in
	// den acht vorhandenen verify-cabinet.mjs).
	const gegenprobeName = NEGATIVLISTE.find((name) => / /.test(name) && /^[A-Za-z ]+$/.test(name));
	const erfundeneZeile = `Dieser Testtext erwähnt versehentlich ${gegenprobeName.toUpperCase().replace(/ /g, '')} und ${NEGATIVLISTE[0]}.`.toLowerCase();
	const gegenprobeGefunden = NEGATIVLISTE.filter((name) => musterFuer(name).test(erfundeneZeile));
	check(gegenprobeGefunden.length >= 2,
		'A-5-G: sowohl der zusammengeschriebene Versalien-Name als auch der erste Listeneintrag werden erkannt',
		...gegenprobeGefunden);
}

/* ====================================== A-6 Widerspruchsfreie Lizenzangaben */

console.log('\nA-6  Die Lizenzangaben widersprechen sich nicht');
{
	const LIZENZ = 'AGPL-3.0-or-later';
	const AUTOR = 'Phomo17';
	const EMAIL = 'phomo17@users.noreply.github.com';

	const license = lies(path.join(EXT, 'LICENSE'));
	const composer = JSON.parse(lies(path.join(EXT, 'composer.json')));
	const emconf = lies(path.join(EXT, 'ext_emconf.php'));
	const readme = lies(path.join(EXT, 'README.md'));
	const blackjackLicense = lies(path.join(EXT_ROOT, 'blackjack/LICENSE'));

	check(license.includes('GNU AFFERO GENERAL PUBLIC LICENSE'),
		'LICENSE ist die AGPL-Fassung');
	check(license === blackjackLicense,
		'LICENSE ist zeichengleich mit typo3conf/ext/blackjack/LICENSE');
	check(composer.license === LIZENZ, `composer.json nennt ${LIZENZ} (gefunden: ${composer.license})`);
	check(emconf.includes(`'license' => '${LIZENZ}'`), `ext_emconf.php nennt ${LIZENZ}`);
	check(readme.includes(LIZENZ), `README.md nennt ${LIZENZ}`);

	check(composer.authors?.[0]?.name === AUTOR && composer.authors?.[0]?.email === EMAIL,
		`composer.json nennt Autor ${AUTOR} und die vereinbarte E-Mail`);
	check(emconf.includes(`'author' => '${AUTOR}'`) && emconf.includes(`'author_email' => '${EMAIL}'`),
		`ext_emconf.php nennt Autor ${AUTOR} und dieselbe E-Mail`);

	console.log('     Gegenprobe A-6-G: eine abweichende Lizenzangabe muss auffallen');
	const abweichend = 'MIT';
	check(abweichend !== LIZENZ, 'A-6-G: eine abweichende Lizenzangabe wird als Widerspruch erkannt');
}

/* ============================ A-7 Schlüssel/Composer/Namensraum/Tabellenpräfix */

console.log('\nA-7  Schlüssel, Composer-Name, Namensraum und Tabellenpräfix sind auseinander ableitbar');
{
	const STUDLY = EIGENER_SCHLUESSEL.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
	const ERWARTETER_COMPOSER_NAME = `phomo17/${EIGENER_SCHLUESSEL.replace(/_/g, '-')}`;
	const ERWARTETER_NAMESPACE = `Phomo17\\${STUDLY}\\`;
	const ERWARTETES_TABELLENPRAEFIX = `tx_${EIGENER_SCHLUESSEL.replace(/_/g, '')}_`;

	check(STUDLY === 'CasinoAccount', `abgeleiteter Namensraum-Teil ist CasinoAccount (gefunden: ${STUDLY})`);
	check(ERWARTETER_COMPOSER_NAME === 'phomo17/casino-account', `abgeleiteter Composer-Name ist phomo17/casino-account (gefunden: ${ERWARTETER_COMPOSER_NAME})`);
	check(ERWARTETES_TABELLENPRAEFIX === 'tx_casinoaccount_', `abgeleitetes Tabellenpräfix ist tx_casinoaccount_ (gefunden: ${ERWARTETES_TABELLENPRAEFIX})`);

	const composer = JSON.parse(lies(path.join(EXT, 'composer.json')));
	check(composer.name === ERWARTETER_COMPOSER_NAME, `composer.json.name === ${ERWARTETER_COMPOSER_NAME}`);
	check(Object.keys(composer.autoload?.psr4 ?? composer.autoload?.['psr-4'] ?? {}).includes(ERWARTETER_NAMESPACE),
		`composer.json.autoload["psr-4"] enthält ${ERWARTETER_NAMESPACE}`);

	const emconf = lies(path.join(EXT, 'ext_emconf.php'));
	check(emconf.includes(`'Phomo17\\\\CasinoAccount\\\\' => 'Classes/'`),
		'ext_emconf.php autoload.psr-4 nennt Phomo17\\CasinoAccount\\ => Classes/');

	const sql = lies(path.join(EXT, 'ext_tables.sql'));
	check(new RegExp(`CREATE TABLE ${ERWARTETES_TABELLENPRAEFIX}player\\b`).test(sql),
		`ext_tables.sql legt eine Tabelle mit dem Präfix ${ERWARTETES_TABELLENPRAEFIX} an`);
	check(existsSync(path.join(EXT, `Configuration/TCA/${ERWARTETES_TABELLENPRAEFIX}player.php`)),
		`die TCA-Datei trägt denselben Tabellennamen im Dateinamen`);

	console.log('     Gegenprobe A-7-G: ein Namensraum mit Tippfehler muss auffallen');
	const mitTippfehler = 'Phomo17\\CasinoAcount\\';
	check(mitTippfehler !== ERWARTETER_NAMESPACE, 'A-7-G: der Tippfehler weicht vom abgeleiteten Namensraum ab und wird erkannt');
}

/* ==================================================== A-8 Gehäuse-Vertrag PHP */

console.log('\nA-8  Jede PHP-Datei unter Classes/ beginnt mit <?php, declare(strict_types=1) und passendem namespace');
{
	const CLASSES = alleDateien(path.join(EXT, 'Classes')).filter((d) => d.endsWith('.php'));
	check(CLASSES.length > 0, `${CLASSES.length} PHP-Dateien unter Classes/ gefunden`);

	const treffer = [];
	for (const datei of CLASSES) {
		const relZuClasses = path.relative(path.join(EXT, 'Classes'), path.dirname(datei));
		const erwarteterNamensraum = 'Phomo17\\CasinoAccount'
			+ (relZuClasses === '' ? '' : '\\' + relZuClasses.split(path.sep).join('\\'));
		const inhalt = lies(datei);
		const kopf = inhalt.slice(0, 200);
		if (!kopf.trimStart().startsWith('<?php')) {
			treffer.push(`${kurz(datei)}: beginnt nicht mit <?php`);
			continue;
		}
		if (!inhalt.includes('declare(strict_types=1);')) {
			treffer.push(`${kurz(datei)}: kein declare(strict_types=1)`);
			continue;
		}
		if (!inhalt.includes(`namespace ${erwarteterNamensraum};`)) {
			treffer.push(`${kurz(datei)}: erwarteter namespace ${erwarteterNamensraum} nicht gefunden`);
		}
	}
	check(treffer.length === 0,
		`alle ${CLASSES.length} Dateien erfüllen <?php, declare(strict_types=1) und PSR-4-Namensraum`,
		...treffer);

	console.log('     Gegenprobe A-8-G: eine Datei ohne declare(strict_types=1) muss auffallen');
	const ohneDeclare = '<?php\n\nnamespace Phomo17\\CasinoAccount\\Service;\n';
	check(!ohneDeclare.includes('declare(strict_types=1);'), 'A-8-G: das fehlende declare wird erkannt');
}

/* ======================================================== A-9 Kürzel-Präfix */

console.log('\nA-9  Das Kürzel-Präfix "ca-" wird eingehalten');
{
	/**
	 * Geteilte Haken des Kern-Backends, die absichtlich KEIN ca-Präfix
	 * tragen — die Bootstrap-artigen Klassen, die jedes TYPO3-Backend-Modul
	 * benutzt (Bootstrap-Grundlage des Backends), plus die feste
	 * Fluid-Namensraum-Kennzeichnung auf <html>. Seit Umsetzungsstück D2d
	 * ergänzt um 'btn-warning', 'callout' und 'callout-warning' — dieselbe
	 * Sorte Bootstrap-Klasse wie die bereits vorhandenen 'btn-*'/'badge-*',
	 * benutzt vom Modul "QR-Modus" (QrModeModule/Index.html) für die
	 * Warnung vor dem Einschalten.
	 */
	const GETEILT = new Set([
		'btn', 'btn-default', 'btn-primary', 'btn-sm', 'btn-warning',
		'badge', 'badge-warning',
		'table', 'table-fit', 'table-striped', 'table-hover',
		'visually-hidden',
		'callout', 'callout-warning',
	]);
	const GETEILTE_ATTRIBUTE = new Set(['data-namespace-typo3-fluid']);
	/**
	 * ZWEITE, EBENSO ENG BENANNTE AUSNAHME (seit Umsetzungsstück D2d): nicht
	 * jedes eigene data-Attribut ist ein "ca-Haken" (ein Selektor, über den
	 * JavaScript ein Element FINDET — dafür gilt weiterhin ausnahmslos
	 * data-ca-*, z. B. data-ca-bar, data-ca-gate-scan). Zwei Muster tragen
	 * stattdessen NUTZLAST, keinen Selektor, und sind seit D2c/D2d bewusst
	 * OHNE ca- benannt:
	 *   data-message-*  auf dem Scan-Bereich der Torseite (Gate/Index.html):
	 *                    trägt den über XLIFF übersetzten Satz, den
	 *                    gate-scan.js anzeigt — dieselbe, bereits geprüfte
	 *                    Zusage wie verify-gate.mjs G-6 ("jeder angezeigte
	 *                    Satz kommt aus einem data-message-*"), das diese
	 *                    Schreibweise selbst voraussetzt und schon grün ist.
	 *   data-value       auf der Kontenleiste (AccountBar/Index.html): der
	 *                    rohe Zahlwert neben der formatierten Anzeige, für
	 *                    den Buchungsendpunkt aus D3 (siehe Kopfkommentar der
	 *                    Vorlage) — ein allgemeiner Nutzlast-Träger, kein
	 *                    Element-Selektor, deshalb dieselbe Kategorie wie
	 *                    data-message-*.
	 * Jedes andere, unpräfigierte data-Attribut bleibt ein Fund.
	 */
	const DATA_NUTZLAST = /^data-message-[a-z-]+$/;
	const treffer = [];
	for (const datei of AUSGELIEFERT) {
		const rel = path.relative(EXT, datei);
		if (!/\.(html|css|js|php)$/.test(rel)) {
			continue;
		}
		const inhalt = ohneBlockKommentare(lies(datei));
		for (const m of inhalt.matchAll(/\bclass="([^"]*)"/g)) {
			// KORREKTUR EINER FALSCHEN ERKENNUNG (seit Umsetzungsstück D2d):
			// ein eingebetteter Fluid-Inline-Ausdruck wie
			// {f:if(condition: on, then: 'on', else: 'off')} enthält selbst
			// Leerzeichen und Kommas. Ohne Neutralisierung zerlegte das
			// naive Aufspalten nach Leerzeichen so einen Ausdruck in
			// Wortfetzen ("condition:", "on,", "then:", …), die alle als
			// Fund ohne ca-Präfix gemeldet würden — ein Fehler der
			// Erkennung, keine echte Regelverletzung. Ein {…}-Ausdruck
			// liefert zur Laufzeit GENAU EIN Klassenwort (bzw. hängt an ein
			// vorangehendes Wort an, wie in "ca-qrmode__state--{f:if(…)}");
			// er wird deshalb vor dem Aufspalten durch einen
			// leerzeichenfreien Platzhalter ersetzt, der selbst kein
			// erlaubtes Präfix hätte, sodass das umgebende, statische Wort
			// weiterhin geprüft wird.
			const klassenwert = m[1].replace(/\{[^{}]*\}/g, 'X');
			for (const klasse of klassenwert.split(/\s+/).filter(Boolean)) {
				const erlaubt = klasse.startsWith('ca-') || GETEILT.has(klasse);
				if (!erlaubt) {
					treffer.push(`${kurz(datei)}: class="${klasse}"`);
				}
			}
		}
		// id/data-* werden NUR in .html/.js geprüft: in QrSvgRenderer.php
		// entsteht das id-Attribut aus PHP-String-Verkettung
		// ('id="' . $titleId . '"') — ein Regex auf dem PHP-QUELLTEXT fände
		// dort das Verkettungszeichen ' . ' statt des tatsächlichen Werts.
		// Dieselbe Stelle wird stattdessen unten gezielt geprüft
		// ($titleId selbst).
		if (/\.(html|js)$/.test(rel)) {
			for (const m of inhalt.matchAll(/\b(id|data-[a-z-]+)="([^"]*)"/g)) {
				const attr = m[1];
				if (attr === 'id') {
					if (m[2] !== '' && !m[2].startsWith('ca-')) {
						treffer.push(`${kurz(datei)}: id="${m[2]}"`);
					}
					continue;
				}
				if (!attr.startsWith('data-ca-')
					&& !GETEILTE_ATTRIBUTE.has(attr)
					&& !DATA_NUTZLAST.test(attr)
					&& attr !== 'data-value'
				) {
					treffer.push(`${kurz(datei)}: ${attr}="${m[2]}"`);
				}
			}
		}
	}

	// Das id-Attribut, das QrSvgRenderer.php per PHP-Verkettung ausgibt
	// ('id="' . $titleId . '"'), wird stattdessen an seiner Quelle geprüft:
	// dem Wert der Variablen $titleId.
	const qrSvgRenderer = ohneBlockKommentare(lies(path.join(EXT, QR_SVG_RENDERER)));
	const titleIdMatch = /\$titleId\s*=\s*'([^']+)'/.exec(qrSvgRenderer);
	if (titleIdMatch === null) {
		treffer.push(`${QR_SVG_RENDERER}: $titleId nicht gefunden`);
	} else if (!titleIdMatch[1].startsWith('ca-')) {
		treffer.push(`${QR_SVG_RENDERER}: $titleId = '${titleIdMatch[1]}' beginnt nicht mit ca-`);
	}

	check(treffer.length === 0,
		'jede eigene CSS-Klasse und jede eigene id beginnt mit ca-; jedes eigene'
		+ ' data-Attribut ist entweder ein ca-Haken (data-ca-*) oder einer der'
		+ ' beiden benannten Nutzlast-Träger (data-message-*, data-value) —'
		+ ' oder einer der ausdrücklich geteilten Backend-Haken (einschließlich'
		+ ' $titleId in QrSvgRenderer.php)',
		...treffer);

	console.log('     Gegenprobe A-9-G: eine Klasse "qr-image" ohne Präfix muss auffallen');
	const erlaubt = 'qr-image'.startsWith('ca-') || GETEILT.has('qr-image');
	check(!erlaubt, 'A-9-G: qr-image ohne ca-Präfix wird als Fund erkannt');

	console.log('     Gegenprobe A-9-G2: ein eingebetteter Fluid-Ausdruck darf keine Wortfetzen mehr erzeugen, eine echte Klasse ohne Präfix daneben bleibt sichtbar');
	const testWert = "qr-bad ca-y--{f:if(condition: on, then: 'on', else: 'off')}";
	const testKlassen = testWert.replace(/\{[^{}]*\}/g, 'X').split(/\s+/).filter(Boolean);
	check(testKlassen.length === 2 && testKlassen[0] === 'qr-bad' && testKlassen[1] === 'ca-y--X',
		'A-9-G2: der eingebettete Ausdruck wird zu einem einzigen Wort ohne Leerzeichen, "qr-bad" bleibt als echter Fund erkennbar',
		...testKlassen);

	console.log('     Gegenprobe A-9-G3: data-message-* und data-value dürfen nicht auffallen, ein erfundenes data-xy ohne Präfix weiterhin');
	check(DATA_NUTZLAST.test('data-message-camera-on'), 'A-9-G3: data-message-camera-on ist der benannte Nutzlast-Träger und wird NICHT gemeldet');
	check(!DATA_NUTZLAST.test('data-xy') && 'data-xy' !== 'data-value' && !'data-xy'.startsWith('data-ca-'),
		'A-9-G3: ein erfundenes data-xy ohne Präfix bleibt ein Fund');
}

/* ==================================================== A-10 Icon-Verträge */

console.log('\nA-10 Jede Datei unter Resources/Public/Icons/ hat viewBox="0 0 16 16", fill="currentColor", kein <text>, kein <image>');
{
	const treffer = [];
	for (const rel of ICONS) {
		const inhalt = lies(path.join(EXT, rel));
		if (!inhalt.includes('viewBox="0 0 16 16"')) {
			treffer.push(`${rel}: kein viewBox="0 0 16 16"`);
		}
		if (!inhalt.includes('fill="currentColor"')) {
			treffer.push(`${rel}: kein fill="currentColor"`);
		}
		if (/<text\b/.test(inhalt)) {
			treffer.push(`${rel}: enthält <text>`);
		}
		if (/<image\b/.test(inhalt)) {
			treffer.push(`${rel}: enthält <image>`);
		}
	}
	check(treffer.length === 0,
		`alle ${ICONS.length} Icons erfüllen den Backend-Symbol-Vertrag`,
		...treffer);

	console.log('     Gegenprobe A-10-G: ein hinzugedachtes <text> muss auffallen');
	const mitText = '<svg viewBox="0 0 16 16"><text>X</text></svg>';
	check(/<text\b/.test(mitText), 'A-10-G: <text> wird erkannt');
}

/* ==================================================== A-11 Keine Datei außerhalb */

console.log('\nA-11 Kein ext_tables.php; jede Datei dieser Extension liegt innerhalb ihres eigenen Verzeichnisses');
{
	check(!existsSync(path.join(EXT, 'ext_tables.php')),
		'ext_tables.php existiert nicht (Konfiguration liegt in Configuration/TCA/, '
		+ 'Configuration/Backend/Modules.php und Configuration/Icons.php)');

	function istInnerhalb(pfad) {
		const relativ = path.relative(EXT, pfad);
		return relativ !== '' && !relativ.startsWith('..') && !path.isAbsolute(relativ);
	}
	const ausserhalb = alleDateien(EXT).filter((d) => !istInnerhalb(d));
	check(ausserhalb.length === 0,
		`alle ${alleDateien(EXT).length} gefundenen Dateien liegen innerhalb von typo3conf/ext/casino_account/`,
		...ausserhalb.map(kurz));

	console.log('     Gegenprobe A-11-G: ein erfundener Pfad außerhalb muss auffallen');
	const erfundenerPfadAussen = path.join(EXT_ROOT, 'sonstwo', 'datei.php');
	check(!istInnerhalb(erfundenerPfadAussen), 'A-11-G: der erfundene Pfad wird als außerhalb erkannt');
}

/* ==================================================== A-12 Kein "disabled", kein opacity ohne Ausnahme */

console.log('\nA-12 Kein echtes "disabled" im HTML/JS; kein opacity ohne :not(:focus-visible) in einer der beiden Stylesheet-Dateien (drei benannte Ausnahmen)');
{
	const MUSTER = /(?<!aria-)\bdisabled\b/;
	const treffer = [];
	for (const datei of AUSGELIEFERT) {
		const rel = path.relative(EXT, datei);
		if (!/\.(html|js)$/.test(rel)) {
			continue;
		}
		if (MUSTER.test(ohneBlockKommentare(lies(datei)))) {
			treffer.push(kurz(datei));
		}
	}
	check(treffer.length === 0,
		'kein echtes disabled-Attribut/-Eigenschaft in HTML oder JavaScript'
		+ ' dieser Extension',
		...treffer);

	console.log('     Gegenprobe A-12-G1: ein eingefügtes disabled="disabled" muss auffallen');
	check(MUSTER.test('<button disabled="disabled">Test</button>'),
		'A-12-G1: ein echtes disabled wird erkannt');
	check(!MUSTER.test('<button aria-disabled="true">Test</button>'),
		'A-12-G1: aria-disabled selbst löst KEINEN Fehlalarm aus');

	/**
	 * Seit Umsetzungsstück D2d: die Regel "kein opacity ohne
	 * :not(:focus-visible)" gilt für BEDIENBARE Elemente — nicht für reine
	 * Textzusätze ohne eigenen Fokus (keine Schaltfläche, kein Verweis).
	 * Bis D2c gab es nur backend.css; seit D2c/D2d liefert diese Extension
	 * mit frontend.css ein zweites Stylesheet, für das dieselbe Regel gilt.
	 * Die Prüfung scannt DESHALB ab hier BEIDE ausgelieferten CSS-Dateien
	 * (nicht mehr nur backend.css fest eingetragen), und nimmt GENAU DIE
	 * DREI namentlich benannten Klassen aus — nicht die Dateien:
	 *   .ca-qrmode__seen, .ca-qrmode__hint  (backend.css, Modul "QR-Modus")
	 *   .ca-gate__hint                       (frontend.css, Torseite)
	 */
	const OPACITY_AUSGENOMMEN = new Set(['.ca-qrmode__seen', '.ca-qrmode__hint', '.ca-gate__hint']);
	const opacityOhneAusnahme = [];
	for (const datei of AUSGELIEFERT) {
		const rel = path.relative(EXT, datei);
		if (!rel.endsWith('.css')) {
			continue;
		}
		const inhalt = ohneBlockKommentare(lies(datei));
		for (const m of inhalt.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
			const selektor = m[1].trim();
			const regel = m[2];
			if (!/opacity\s*:/.test(regel) || regel.includes(':not(:focus-visible)')) {
				continue;
			}
			const selektorKlassen = selektor.split(',').map((s) => s.trim());
			if (selektorKlassen.length > 0 && selektorKlassen.every((s) => OPACITY_AUSGENOMMEN.has(s))) {
				continue;
			}
			opacityOhneAusnahme.push(`${kurz(datei)}: ${selektor} { ${regel.trim().slice(0, 60)} }`);
		}
	}
	check(opacityOhneAusnahme.length === 0,
		'kein opacity ohne :not(:focus-visible) in backend.css oder frontend.css,'
		+ ' außer den drei benannten, fokuslosen Textzusätzen'
		+ ` (${[...OPACITY_AUSGENOMMEN].join(', ')})`,
		...opacityOhneAusnahme);

	console.log('     Gegenprobe A-12-G2: ein opacity ohne :not(:focus-visible) auf einer NICHT ausgenommenen Klasse muss auffallen, dieselbe Regel auf einer ausgenommenen Klasse nicht');
	const erfundeneRegel = '.ca-erfunden { opacity: .5; }';
	const treffferGegenprobe = /opacity\s*:/.test(erfundeneRegel) && !erfundeneRegel.includes(':not(:focus-visible)');
	check(treffferGegenprobe && !OPACITY_AUSGENOMMEN.has('.ca-erfunden'),
		'A-12-G2: die erfundene Regel auf .ca-erfunden wird als Fund erkannt (keine benannte Ausnahme)');
	check(OPACITY_AUSGENOMMEN.has('.ca-gate__hint'),
		'A-12-G2: .ca-gate__hint ist eine der drei benannten Ausnahmen und würde NICHT gemeldet');
}

/* ==================================================== A-13 Nur XLIFF-Text oder Variable */

console.log('\nA-13 Jede Beschriftung im HTML kommt aus der XLIFF-Datei oder ist eine Fluid-Variable');
{
	const TEMPLATES = [
		path.join(EXT, 'Resources/Private/Templates/PlayerModule/Index.html'),
		path.join(EXT, 'Resources/Private/Templates/PlayerModule/Qr.html'),
	];
	const treffer = [];
	for (const datei of TEMPLATES) {
		const inhalt = ohneFluidKommentare(lies(datei));
		for (const m of inhalt.matchAll(/>([^<>]*)</g)) {
			const text = m[1].trim();
			if (text === '') {
				continue;
			}
			// Erlaubt: eine einzelne Fluid-Variable/-Ausdruck, z. B.
			// {player.name}, {row.total}, {url} — kein zusätzlicher
			// Fließtext daneben.
			if (/^\{[^{}]*\}$/.test(text)) {
				continue;
			}
			treffer.push(`${kurz(datei)}: „${text.slice(0, 80)}"`);
		}
	}
	check(treffer.length === 0,
		'kein Fließtext zwischen > und < in Index.html oder Qr.html, der nicht'
		+ ' aus f:translate oder einer Fluid-Variable stammt',
		...treffer);

	console.log('     Gegenprobe A-13-G: ein hart eingetragenes "Drucken" muss auffallen');
	const mitHartemText = '<button type="button">Drucken</button>';
	const treffferGegenprobe = [...mitHartemText.matchAll(/>([^<>]*)</g)]
		.map((m) => m[1].trim())
		.filter((t) => t !== '' && !/^\{[^{}]*\}$/.test(t));
	check(treffferGegenprobe.includes('Drucken'), 'A-13-G: das hart eingetragene "Drucken" wird gefunden');
}

/* ================================ F: Behobene Befunde, Audit nach D3 ================================ */

console.log('\nF    Behebungslauf nach dem Audit vom 2026-09-10 (Phase D3) — festgehaltene Zusagen für K-01, K-02, K-03, S-01');

const ACCOUNT_BAR_TEMPLATE = 'Resources/Private/Templates/AccountBar/Index.html';
const ACCOUNT_LIVE_JS = 'Resources/Public/JavaScript/account-live.js';
const ACCOUNT_BAR_PHP = 'Classes/Middleware/AccountBar.php';
const accountBarTemplateRoh = lies(path.join(EXT, ACCOUNT_BAR_TEMPLATE));
const accountLiveJsRoh = lies(path.join(EXT, ACCOUNT_LIVE_JS));
const accountBarPhpRoh = lies(path.join(EXT, ACCOUNT_BAR_PHP));
const frontendCssRoh = lies(path.join(EXT, FRONTEND_CSS));
const tokensCssFuerF = lies(path.join(SITE, 'Resources/Public/Css/tokens.css'));

/**
 * WCAG-2.2-Kontrastformel (relative Leuchtdichte, sRGB-Rücktransformation) —
 * dieselbe Rechnung, mit der der Audit-Bericht und tokens.css selbst ihre
 * Kontrastwerte belegen. Gerechnet wird aus ECHTEN, aus tokens.css gelesenen
 * Hex-Werten, nicht aus abgeschriebenen Zahlen.
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
 * @param {string} name
 * @returns {string} der Hex-Wert des Tokens, z. B. "#f0e6d2"
 */
function tokenHex(name) {
	const treffer = new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})\\b`).exec(tokensCssFuerF);
	if (treffer === null) {
		throw new Error(`Token ${name} nicht in tokens.css gefunden`);
	}
	return treffer[1];
}

console.log('\nF-K01 das Gesamtvermögen der Kontenleiste hat einen Namen (bar.total) und einen Live-Bereich — Audit-Befund K-01');
{
	// GEÄNDERT (Behebungslauf nach dem Laufzeit-Audit vom 2026-09-10, Teil 2,
	// Befund N-01): role="status" stand ursprünglich AUF .ca-bar__total
	// selbst — das sagte bei JEDER Buchung den vollständigen Satz neu an
	// (bis zu 1,5-mal pro Sekunde, endlos, auf /coin-pusher gemessen). Der
	// Live-Bereich sitzt jetzt auf einem EIGENEN, optisch verborgenen
	// Element ([data-ca-bar-announce]) — geprüft unten unter F-N01. F-K01
	// bleibt für den unveränderten Teil des Befunds zuständig: Name vor der
	// Zahl, eigener Zahlen-Anker, kein Rückbau auf firstChild.
	check(!/<span class="ca-bar__total"[^>]*role="status"/.test(accountBarTemplateRoh),
		'F-K01: .ca-bar__total trägt SEIT N-01 kein role="status" mehr (das hätte den Live-Bereich zurück auf die sichtbare Zahl gelegt)');
	check(/class="ca-bar__total-label ca-visually-hidden">\{labels\.total\}/.test(accountBarTemplateRoh),
		'F-K01: eine optisch verborgene Beschriftung {labels.total} steht vor der Zahl');
	check(/data-ca-bar-total-value=""/.test(accountBarTemplateRoh),
		'F-K01: die Zahl selbst steht in einem eigenen [data-ca-bar-total-value]-Anker');
	check(accountBarPhpRoh.includes("'total' => \$sL('bar.total')"),
		"F-K01: AccountBar::beschriftungen() liest bar.total und übergibt es als 'total'");
	const accountLiveJsOhneKommentare = ohneJsKommentare(accountLiveJsRoh);
	check(/data-ca-bar-total-value/.test(accountLiveJsOhneKommentare) && !/total\.firstChild/.test(accountLiveJsOhneKommentare),
		'F-K01: account-live.js schreibt IM CODE in [data-ca-bar-total-value], nicht mehr in total.firstChild '
		+ '(ein zusätzlicher Textknoten für die Beschriftung hätte firstChild verschoben; geprüft ohne'
		+ ' Kommentare, denn der erklärende Kommentar an dieser Stelle nennt "firstChild" selbst)');

	console.log('     Gegenprobe F-K01-G: ein Rückbau auf total.firstChild würde auffallen');
	const zurueckgebaut = accountLiveJsOhneKommentare.replace(
		"total.querySelector('[data-ca-bar-total-value]')", 'total.firstChild'
	);
	check(/total\.firstChild/.test(zurueckgebaut), 'F-K01-G: das nachgestellte firstChild wird erkannt');
}

console.log('\nF-K02 die Kontenleiste ist über einen eigenen, frühen Sprunglink erreichbar, nicht erst nach über 80 Tabulatorstationen — Audit-Befund K-02');
{
	check(/preg_replace_callback\(\s*'\/<body\\b\[\^>\]\*>\/i'/.test(accountBarPhpRoh),
		'F-K02: AccountBar::process() speist etwas unmittelbar nach dem öffnenden <body> ein');
	check(accountBarPhpRoh.includes('class="ca-bar__skiplink"'),
		'F-K02: eingespeist wird ein Verweis mit der Klasse ca-bar__skiplink');
	check(accountBarPhpRoh.includes('href="#ca-bar"'), 'F-K02: der Sprunglink zeigt auf #ca-bar');
	check(/id="ca-bar"/.test(accountBarTemplateRoh), 'F-K02: die Leiste selbst trägt id="ca-bar" — das Sprungziel existiert wirklich');
	check(frontendCssRoh.includes('.ca-bar__skiplink {') && frontendCssRoh.includes('.ca-bar__skiplink:focus-visible {'),
		'F-K02: frontend.css versteckt den Sprunglink optisch und zeigt ihn erst bei :focus-visible '
		+ '(dieselbe Bauart wie .ck-skiplink in casino_startpage)');
	check(accountBarPhpRoh.includes("\$sL('bar.skiplink')"), 'F-K02: die Beschriftung kommt aus bar.skiplink');

	console.log('     Gegenprobe F-K02-G: ein Sprungziel ohne passendes id="ca-bar" würde auffallen');
	const ohneId = accountBarTemplateRoh.replace('id="ca-bar"', '');
	check(!/id="ca-bar"/.test(ohneId), 'F-K02-G: das entfernte id="ca-bar" wird als fehlend erkannt');
}

console.log('\nF-K03 die Aufschrift der Kontenleiste bleibt bei 320/360 lesbar (≥ 4,5 : 1), der Messingverlauf weicht dort einem flachen Ton — Audit-Befund K-03');
{
	// geklammerterBlock() statt eines nicht-gierigen Regelausdrucks: zwischen
	// "@media (max-width: 40rem) {" und ".ca-bar {" steht ein erklärender
	// CSS-Kommentar (siehe frontend.css) — ein einfacher Regelausdruck ohne
	// Klammerzählung fände die verschachtelte Regel deshalb nicht zuverlässig.
	const mediaStart = frontendCssRoh.indexOf('@media (max-width: 40rem) {');
	check(mediaStart !== -1, 'F-K03: die @media(max-width: 40rem)-Regel für .ca-bar existiert');
	const mediaBlock = geklammerterBlock(frontendCssRoh, mediaStart);
	const mediaBlockOhneKommentare = ohneBlockKommentare(mediaBlock);
	check(/background:\s*var\(--ck-brass-200\)/.test(mediaBlockOhneKommentare),
		'F-K03: in dieser Ansicht steht ein flacher Ton (--ck-brass-200), nicht mehr der Verlauf --ck-brass-polish');
	check(!/--ck-brass-polish/.test(mediaBlockOhneKommentare),
		'F-K03: --ck-brass-polish kommt im CODE dieses Blocks nicht mehr vor (der erklärende Kommentar'
		+ ' darüber nennt den alten Verlauf namentlich — deshalb wird ohne Kommentare geprüft)');

	const textFarbe = tokenHex('--ck-wood-500');
	const hintergrundNeu = tokenHex('--ck-brass-200');
	const hintergrundAlt = tokenHex('--ck-brass-400'); // die dunkelste, vom Audit gemessene Stelle des alten Verlaufs
	const kontrastNeu = kontrastVerhaeltnis(textFarbe, hintergrundNeu);
	const kontrastAlt = kontrastVerhaeltnis(textFarbe, hintergrundAlt);
	check(kontrastNeu >= 4.5,
		`F-K03: --ck-wood-500 (${textFarbe}) auf --ck-brass-200 (${hintergrundNeu}) erreicht `
		+ `${kontrastNeu.toFixed(2)} : 1 — über den 4,5 : 1 für Text (gerechnet aus tokens.css, nicht geschätzt)`);

	console.log('     Gegenprobe F-K03-G: dieselbe Rechnung auf der alten, dunkelsten Verlaufsstelle muss unter 4,5 : 1 bleiben — der Audit maß dort 3,76 : 1');
	check(kontrastAlt < 4.5,
		`F-K03-G: --ck-wood-500 auf --ck-brass-400 (${hintergrundAlt}) liegt bei ${kontrastAlt.toFixed(2)} : 1 `
		+ '— die Rechnung erkennt den früheren Mangel tatsächlich als Mangel');
}

console.log('\nF-S01 die Sperranzeige verknüpft ihren Erklärungssatz über aria-describedby mit dem <dialog> — Audit-Befund S-01');
{
	const dialogTreffer = /<dialog\b[^>]*class="ca-lock"[^>]*>[\s\S]*?<\/dialog>/.exec(accountBarTemplateRoh);
	check(dialogTreffer !== null, 'F-S01: ein <dialog class="ca-lock"> steht in der Vorlage');
	const dialogBlock = dialogTreffer ? dialogTreffer[0] : '';
	check(/aria-describedby="ca-lock-text"/.test(dialogBlock), 'F-S01: das <dialog> trägt aria-describedby="ca-lock-text"');
	check(/id="ca-lock-text"/.test(dialogBlock), 'F-S01: eine id="ca-lock-text" existiert wirklich im selben Block');
	check(/<p class="ca-lock__text" id="ca-lock-text" data-ca-lock-text role="status">/.test(dialogBlock),
		'F-S01: id="ca-lock-text" sitzt auf genau dem Absatz, der den Erklärungssatz trägt (data-ca-lock-text)');

	console.log('     Gegenprobe F-S01-G: ein <dialog> ohne aria-describedby würde auffallen');
	const ohneDescribedby = dialogBlock.replace(' aria-describedby="ca-lock-text"', '');
	check(!/aria-describedby="ca-lock-text"/.test(ohneDescribedby), 'F-S01-G: das entfernte aria-describedby wird als fehlend erkannt');
}

console.log('\nF-N01 das Gesamtvermögen sagt sich nicht mehr bei jeder Buchung komplett neu an, sondern gedrosselt — Audit 2026-09-10, Teil 2, Befund N-01');
{
	check(/<span class="ca-visually-hidden" role="status" aria-atomic="true" data-ca-bar-announce="">/.test(accountBarTemplateRoh),
		'F-N01: ein EIGENER, optisch verborgener Live-Bereich [data-ca-bar-announce] trägt role="status" — getrennt von der sichtbaren Zahl');
	const accountLiveJsOhneKommentareN01 = ohneJsKommentare(accountLiveJsRoh);
	check(/function ansagePlanen\(/.test(accountLiveJsOhneKommentareN01) && /function ansageSchreiben\(/.test(accountLiveJsOhneKommentareN01),
		'F-N01: account-live.js trägt eine eigene Drosselung (ansagePlanen()/ansageSchreiben()), nicht nur einen ungedrosselten Direktaufruf');
	check(/ANSAGE_TAKT_MS/.test(accountLiveJsOhneKommentareN01),
		'F-N01: die Drosselung hat einen benannten Takt (ANSAGE_TAKT_MS), keine Zauberzahl ohne Namen');
	check(/stelle\.textContent = zahl\.format\(gesamt\);\s*\}\s*ansagePlanen\(gesamt\);/.test(accountLiveJsOhneKommentareN01),
		'F-N01: die SICHTBARE Zahl wird weiterhin ungedrosselt geschrieben, DANACH erst ansagePlanen() aufgerufen — beide Wege bleiben erhalten, nur die Ansage bündelt');

	console.log('     Gegenprobe F-N01-G: ein Rückbau auf einen direkten Ansage-Aufruf ohne Drosselung würde auffallen');
	const ohneDrosselung = accountLiveJsOhneKommentareN01.replace(/function ansagePlanen\([\s\S]*?\n\}/, '');
	check(!/function ansagePlanen\(/.test(ohneDrosselung), 'F-N01-G: die entfernte Drosselfunktion wird als fehlend erkannt');
}

console.log('\nF-N03 F-N04 unter 40rem ist Platz für die feste Kontenleiste reserviert (Fokus UND Fußzeile) — Audit 2026-09-10, Teil 2, Befund N-03/N-04');
{
	const frontendCssOhneKommentareN03 = ohneBlockKommentare(frontendCssRoh);
	check(/html:has\(\[data-ca-bar]\) \{\s*scroll-padding-block-end:\s*4rem;/.test(frontendCssOhneKommentareN03),
		'F-N03: html:has([data-ca-bar]) setzt scroll-padding-block-end: 4rem — wirkt auf JEDES automatische Hinrollen, Tab-Fokus wie Sprungziel');
	check(/body:has\(\[data-ca-bar]\) \{\s*padding-block-end:\s*4rem;/.test(frontendCssOhneKommentareN03),
		'F-N04: body:has([data-ca-bar]) reserviert denselben Wert (4rem) als Innenabstand, damit das Rollende die Fußzeile über die Leiste hebt');
	check(!/:has\([^)]*:has\(/.test(frontendCssOhneKommentareN03),
		'F-N03/F-N04: kein verschachteltes :has(…:has(…)) — die erste Fassung dieser Behebung schrieb genau das, ein UNGÜLTIGER Selektor, den der Browser wortlos verwirft (siehe Fußnote in frontend.css)');

	console.log('     Gegenprobe F-N03-G: die verworfene erste Fassung (verschachteltes :has()) wird als ungültig erkannt');
	const ungueltigeFassung = 'html:has(body:has([data-ca-bar])) { scroll-padding-block-end: 4rem; }';
	check(/:has\([^)]*:has\(/.test(ungueltigeFassung), 'F-N03-G: die nachgestellte, ungültige erste Fassung wird erkannt');
}

console.log('\nF-N05 der Sprunglink zur Kontenleiste bewegt den Fokus wirklich, nicht nur das URL-Fragment — Audit 2026-09-10, Teil 2, Befund N-05');
{
	check(accountBarTemplateRoh.includes('id="ca-bar" tabindex="-1"'),
		'F-N05: #ca-bar trägt tabindex="-1" — das Sprungziel wird beim Anspringen tatsächlich in den Fokus genommen');

	console.log('     Gegenprobe F-N05-G: dieselbe Suche ohne tabindex="-1" findet nichts');
	const ohneTabindexN05 = accountBarTemplateRoh.replace(' tabindex="-1"', '');
	check(!ohneTabindexN05.includes('id="ca-bar" tabindex="-1"'), 'F-N05-G: das entfernte tabindex="-1" wird als fehlend erkannt');
}

/* ------------------------------------------ Wächter: sind alle Blöcke gelaufen? */

if (ERWARTETE_ZUSAGEN > 0 && zusagen !== ERWARTETE_ZUSAGEN) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${ERWARTETE_ZUSAGEN} erwartet.`);
	console.log('  Entweder wurde ein Prüfblock übersprungen (dann ist dieses Ergebnis wertlos),');
	console.log('  oder es sind Zusagen hinzugekommen (dann gehört ERWARTETE_ZUSAGEN nachgezogen).');
	fehler++;
} else if (ERWARTETE_ZUSAGEN === 0) {
	console.log(`\n  (Wächter noch nicht scharf: ERWARTETE_ZUSAGEN steht auf 0. Tatsächlich`);
	console.log(`  ausgegebene Zusagen: ${zusagen}.)`);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. casino_account benutzt ausschließlich das'
	+ '\nErscheinungsbild des TYPO3-Backends (kein eigener Design-Token), lädt keine Datei'
	+ '\nvon außen (bis auf den dokumentierten Adress-Platzhalter in PlayerUrlBuilder.php),'
	+ '\ncasino_startpage kennt diese Extension nicht im Code, kein fremder Name und keins'
	+ '\nder drei Copyright-Zeichen kommt vor, die Lizenzangaben stimmen überein und der'
	+ '\nLizenztext ist zeichengleich mit blackjack/LICENSE, Schlüssel/Composer-Name/'
	+ '\nNamensraum/Tabellenpräfix sind auseinander ableitbar, jede PHP-Datei erfüllt'
	+ '\n<?php/declare(strict_types=1)/PSR-4-Namensraum, das Kürzel-Präfix ca- wird'
	+ '\neingehalten, alle drei Icons erfüllen den Backend-Symbol-Vertrag, es gibt kein'
	+ '\next_tables.php und keine Datei außerhalb der Extension, kein echtes disabled und'
	+ '\nkein ungesichertes opacity, und jede Beschriftung im HTML kommt aus der XLIFF-'
	+ '\nDatei oder ist eine Fluid-Variable.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
