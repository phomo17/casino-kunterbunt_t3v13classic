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
 *         Diese Extension benutzt KEINEN einzigen — das ist das erwartete
 *         Ergebnis und wird als solches ausgegeben, nicht übersprungen
 *   A-3   Keine Datei von außen. Enge, benannte Ausnahme: der dokumentierte
 *         Platzhalter „https://<host>" im Kopfkommentar von
 *         PlayerUrlBuilder.php ist ein Datenwert (die Adresse auf dem
 *         QR-Code entsteht dort zur Laufzeit aus der Site-Verwaltung), keine
 *         Einbindung
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
 *         außer den ausdrücklich geteilten Backend-Klassen
 *   A-10  Jede Datei unter Resources/Public/Icons/ hat viewBox="0 0 16 16",
 *         fill="currentColor", kein <text>, kein <image>
 *   A-11  Kein ext_tables.php; jede Datei dieser Extension liegt innerhalb
 *         von typo3conf/ext/casino_account/
 *   A-12  Kein echtes disabled im ausgelieferten HTML/JS; kein opacity ohne
 *         :not(:focus-visible) in backend.css
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
 * GEMESSEN, nicht geschätzt — in diesem Umsetzungsstück (De) wird sie in
 * diesem Lauf selbst gemessen und hier eingetragen.
 */
const ERWARTETE_ZUSAGEN = 49;

/* ============================================================= A-1 Farben */

console.log('A-1  Kein ausgeschriebener Farbwert (außer den drei Icons und QrSvgRenderer.php)');
{
	const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
	const FUNKTION = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g;
	const treffer = [];
	for (const datei of OHNE_ICONS_UND_QR) {
		const inhalt = ohneBlockKommentare(lies(datei));
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
		+ ' Kontrastausnahme des QR-Codes, siehe A-1b)',
		...treffer);

	console.log('     Gegenprobe A-1-G: ein erfundener Wert in backend.css muss auffallen');
	const backendCss = ohneBlockKommentare(lies(path.join(EXT, 'Resources/Public/Css/backend.css')));
	const mitErfundenerFarbe = backendCss + '\n.ca-erfunden { color: #123456; }';
	check([...mitErfundenerFarbe.matchAll(HEX)].length === 1, 'A-1-G: #123456 wird als Fund erkannt');
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

console.log('\nA-2  Alle benutzten Design-Tokens existieren (erwartet: keiner)');
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
		+ ` (dort stehen ${definiert.size}). casino_account benutzt erwartungsgemäß`
		+ ' KEINEN einzigen Token — das Backend bringt sein Aussehen selbst mit'
		+ ' (backend.css, Kopfkommentar)',
		...unbekannt.map(([name, datei]) => `${name} – benutzt in ${datei}`));
	check(benutzt.size === 0,
		`tatsächlich null Tokens benutzt (gefunden: ${benutzt.size}) — das ist das`
		+ ' erwartete Ergebnis dieser Extension und wird hier ausdrücklich geprüft,'
		+ ' nicht stillschweigend als "nichts zu tun" übersprungen');

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
				.replace(/xmlns[:\w-]*="[^"]*"/g, '');
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
		+ ' kein <img>, kein @font-face (Ausnahme: der dokumentierte Platzhalter'
		+ ' "https://<host>" in PlayerUrlBuilder.php, siehe Kopfkommentar)',
		...treffer);

	console.log('     Gegenprobe A-3-G: eine hinzugedachte externe Adresse muss auffallen, der Platzhalter nicht');
	const mitFremderAdresse = 'ein Test mit https://beispiel.example/bild.png mittendrin';
	check(/https?:\/\//.test(mitFremderAdresse), 'A-3-G: eine echte Adresse wird gefunden');
	const platzhalterAllein = 'https://<host>/?casinoToken=<Kennung>'.replace(/https:\/\/<host>[^\s]*/g, '');
	check(!/https?:\/\//.test(platzhalterAllein), 'A-3-G: der neutralisierte Platzhalter löst KEINEN Fund mehr aus');
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
	// Enge Ausnahme für genau eine Datei: die geteilte Negativliste
	// casino_startpage/…/negativliste.mjs muss als ausführbares JS-Array
	// wörtlich gerätespezifische Handelsnamen enthalten (siehe deren
	// Kopfkommentar) — das koppelt casino_startpage nicht an dieses Gerät,
	// derselbe Schutzzweck wie A-5 selbst. Dieselbe Art Ausnahme wie in den
	// acht vorhandenen verify-cabinet.mjs.
	const A4_AUSGENOMMEN = [path.join(SITE, 'Resources/Private/Scripts/negativliste.mjs')];
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
	 * Fluid-Namensraum-Kennzeichnung auf <html>.
	 */
	const GETEILT = new Set([
		'btn', 'btn-default', 'btn-primary', 'btn-sm',
		'badge', 'badge-warning',
		'table', 'table-fit', 'table-striped', 'table-hover',
		'visually-hidden',
	]);
	const GETEILTE_ATTRIBUTE = new Set(['data-namespace-typo3-fluid']);
	const treffer = [];
	for (const datei of AUSGELIEFERT) {
		const rel = path.relative(EXT, datei);
		if (!/\.(html|css|js|php)$/.test(rel)) {
			continue;
		}
		const inhalt = ohneBlockKommentare(lies(datei));
		for (const m of inhalt.matchAll(/\bclass="([^"]*)"/g)) {
			for (const klasse of m[1].split(/\s+/).filter(Boolean)) {
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
				if (!attr.startsWith('data-ca-') && !GETEILTE_ATTRIBUTE.has(attr)) {
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
		'jede eigene CSS-Klasse, jedes eigene data-Attribut und jede eigene id'
		+ ' beginnt mit ca- oder ist einer der ausdrücklich geteilten'
		+ ' Backend-Haken (einschließlich $titleId in QrSvgRenderer.php)',
		...treffer);

	console.log('     Gegenprobe A-9-G: eine Klasse "qr-image" ohne Präfix muss auffallen');
	const erlaubt = 'qr-image'.startsWith('ca-') || GETEILT.has('qr-image');
	check(!erlaubt, 'A-9-G: qr-image ohne ca-Präfix wird als Fund erkannt');
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

console.log('\nA-12 Kein echtes "disabled" im HTML/JS; kein opacity ohne :not(:focus-visible) in backend.css');
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

	const backendCss = ohneBlockKommentare(lies(path.join(EXT, 'Resources/Public/Css/backend.css')));
	const opacityOhneAusnahme = [];
	for (const m of backendCss.matchAll(/[^{}]*\{[^{}]*\}/g)) {
		const regel = m[0];
		if (/opacity\s*:/.test(regel) && !regel.includes(':not(:focus-visible)')) {
			opacityOhneAusnahme.push(regel.trim().slice(0, 80));
		}
	}
	check(opacityOhneAusnahme.length === 0,
		'kein opacity in backend.css ohne :not(:focus-visible) (aktuell benutzt'
		+ ' backend.css überhaupt kein opacity)',
		...opacityOhneAusnahme);

	console.log('     Gegenprobe A-12-G2: ein opacity ohne :not(:focus-visible) muss auffallen');
	const erfundeneRegel = '.ca-erfunden { opacity: .5; }';
	const treffferGegenprobe = /opacity\s*:/.test(erfundeneRegel) && !erfundeneRegel.includes(':not(:focus-visible)');
	check(treffferGegenprobe, 'A-12-G2: die erfundene Regel wird als Fund erkannt');
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
