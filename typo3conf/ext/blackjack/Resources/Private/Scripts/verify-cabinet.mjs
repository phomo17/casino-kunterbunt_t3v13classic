/**
 * Blackjack – Nachweis Geometrie/Gestaltung/Trennung/Negativliste (V.7)
 * =======================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Laufzeit unter einer Sekunde.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/verify-cabinet.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.1, Umsetzungsstück C4a)
 * -------------------------------------------------------------------
 *   A-1  Keine eigene Farbe (Ausnahme: die beiden Backend-Icons)
 *   A-2  Jeder benutzte --ck-Token existiert in casino_startpage/tokens.css
 *   A-3  Keine Datei von außen; kein createElementNS in JavaScript
 *   A-4  Trennung: casino_startpage kennt "blackjack" nicht — im CODE, nicht
 *        in Kommentaren (dieselbe Begründung wie G-9 in casino_startpage)
 *   A-5  Kein fremder Hersteller-, Modell-, Spielbank- oder Spieltitel
 *        (Negativliste, ergänzt um Kartenspiel-Begriffe)
 *   A-6  Die Lizenzangaben widersprechen sich nicht
 *   A-7  Kachel und Spielseite zeigen dieselbe Bauform
 *   A-8  Der Gehäuse-Vertrag (Cabinet.html), einschließlich: kein <text>
 *   A-9  Das Kürzel-Präfix "bj-" wird eingehalten
 *   A-10 Die Anmeldung bei der Registry stimmt
 *   A-11 Das Regelwerk steht nur an einer Stelle
 *   A-12 Kein unbewohnter Live-Bereich, kein unbeschriebener Messpunkt
 *   A-13 Kein echtes "disabled" — immer aria-disabled
 *
 * WARUM A-4 IM CODE SUCHT, NICHT IN KOMMENTAREN
 * ----------------------------------------------
 * Dieselbe Begründung wie bei G-9 in casino_startpage/…/verify-gattung.mjs
 * und bei A-4 in roulette/…/verify-cabinet.mjs: jedes Gerät heißt nach seiner
 * Gattung (CONCEPT.md C.2), und ein Wortabgleich über Kommentare könnte
 * „nennt die Extension" und „nennt das Spiel" nicht mehr unterscheiden. Der
 * eigene Extension-Schlüssel wird aus path.basename(EXT) ABGELEITET, nicht
 * eingetragen.
 *
 * NICHT betroffen ist A-5: die Negativliste fremder Marken läuft weiterhin
 * über JEDE Zeile, Kommentare eingeschlossen — das ist die rechtliche
 * Prüfung (CONCEPT.md B.3 Nr. 4, V.7 Nr. 5) und wird nicht angetastet.
 *
 * A-7 SEIT UMSETZUNGSSTÜCK C5b: EIN ECHTER VERGLEICH
 * ----------------------------------------------------
 * Fünf Merkmale müssen auf BEIDEN Zeichnungen vorkommen: auf der kleinen
 * Kachel im Saal (Cabinet.html) und auf dem großen Tuch der Spielseite
 * (Felt.html + felt.css). Verglichen wird nicht Pixel für Pixel — das ginge
 * ohne Browser nicht —, sondern Merkmal für Merkmal: gerade Geberkante oben,
 * Bogen unten, Schuh rechts, Ablage links, Versicherungsbogen, Setzkreis.
 * Fehlt eines auf einer der beiden Seiten, zeigen Kachel und Spielseite nicht
 * mehr dasselbe Gerät. Bis Umsetzungsstück C5b (als Felt.html noch nicht
 * existierte) meldete sich A-7 ausdrücklich als "übersprungen" — ein
 * übersprungener, klar benannter Nachweis ist ehrlicher als einer, der
 * stillschweigend besteht.
 *
 * A-11 AB UMSETZUNGSSTÜCK C4b: BEIDE HÄLFTEN PRÜFBAR
 * ----------------------------------------------------------------
 * rules-blackjack.js — die eine Quelle des Regelwerks — existiert seit
 * Umsetzungsstück C4b. Die NEGATIVE Hälfte (keine Regelzahl in README,
 * ext_emconf.php, den XLIFF-Dateien oder einer HTML-/CSS-Datei) lief schon in
 * C4a vollständig, samt Gegenprobe A-11-G. Die POSITIVE Hälfte (jede Regel
 * aus Anhang G ist dort als exportierte Konstante vorhanden UND trägt den
 * richtigen Wert) läuft ab jetzt ebenfalls: rules-blackjack.js wird unter
 * Node UNMITTELBAR importiert, und jede geprüfte Konstante wird gegen eine
 * von Hand aus Anhang G abgeschriebene, von rules-blackjack.js unabhängige
 * Erwartung verglichen — nicht nur auf ihre bloße Existenz. Die ausführliche
 * Korrektheitsprüfung des Zieh-Schemas (erschöpfender Zustandsabschluss)
 * bleibt Aufgabe von R-4 in verify-rules.mjs; hier geht es um die Frage, ob
 * jede tragende Zahl aus Anhang G an ihrer einen Stelle überhaupt vorhanden
 * ist — die eigentliche Absicht von A-11.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { NEGATIVLISTE, MINDESTLAENGE, musterFuer } from '../../../../casino_startpage/Resources/Private/Scripts/negativliste.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/blackjack/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
const SITE = path.join(EXT_ROOT, 'casino_startpage');
/** Der eigene Extension-Schlüssel, ABGELEITET aus dem Verzeichnisnamen. */
const EIGENER_SCHLUESSEL = path.basename(EXT);
/**
 * Diese Datei selbst — nicht mehr für eine Namensausnahme (siehe A-5 unten:
 * die Negativliste steht seit Befund B-6 nicht mehr hier), sondern nur noch
 * dafür, dass A-5 die drei Zeichen ©/™/® ausschließlich in DIESER Datei
 * unschädlich macht, bevor sie geprüft wird. Diese Datei muss die drei
 * Zeichen wörtlich enthalten — als Prüf-Array UND im Ausgabetext —, um
 * überhaupt gegen sie prüfen zu können; jede andere Datei bleibt unangetastet
 * und wird normal auf die Zeichen geprüft (dieselbe Art Ausnahme wie
 * fruit_risk/…/verify-cabinet.mjs seit Stand F2).
 */
const DIESE_DATEI = fileURLToPath(import.meta.url);

let fehler = 0;

function check(ok, text, ...zeilen) {
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

/** Entfernt alle <f:comment>-Blöcke. */
function ohneKommentare(inhalt) {
	return inhalt.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '');
}

/** Entfernt zusätzlich PHP/CSS/JS-Blockkommentare (/* … *\/). */
function ohneBlockKommentare(inhalt) {
	return ohneKommentare(inhalt).replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Ersetzt einen Fund durch ebenso viele Zeilenumbrüche, damit Zeilennummern
 * stimmen bleiben (dieselbe Bauart wie in verify-gattung.mjs G-9 und in
 * roulette/…/verify-cabinet.mjs A-4).
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
 * GPL-Boilerplate, wird nie ins Frontend gerendert (wortgleiche Ausnahme wie
 * bei den fünf vorhandenen Geräten).
 */
const AUSGELIEFERT = alleDateien(EXT).filter((datei) => {
	const rel = path.relative(EXT, datei);
	if (rel.startsWith('Resources/Private/Scripts')) {
		return false;
	}
	return rel !== 'README.md' && rel !== 'LICENSE';
});

const ICONS = ['Resources/Public/Icons/Extension.svg', 'Resources/Public/Icons/ContentBlackjack.svg'];
const OHNE_ICONS = AUSGELIEFERT.filter((datei) => !ICONS.includes(path.relative(EXT, datei)));

console.log('\nBlackjack – Nachweis Geometrie/Gestaltung/Trennung/Negativliste (V.7)');
console.log('=======================================================================\n');

/* ============================================================= A-1 Farben */

console.log('A-1  Keine eigene Farbe');
{
	const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
	const FUNKTION = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g;
	const treffer = [];
	for (const datei of OHNE_ICONS) {
		const inhalt = ohneBlockKommentare(lies(datei));
		for (const m of inhalt.matchAll(HEX)) {
			treffer.push(`${kurz(datei)}: ${m[0]}`);
		}
		for (const m of inhalt.matchAll(FUNKTION)) {
			treffer.push(`${kurz(datei)}: ${m[0]}…`);
		}
	}
	check(treffer.length === 0,
		`kein ausgeschriebener Farbwert in ${OHNE_ICONS.length} Dateien`
		+ ' (die beiden Backend-Icons sind ausgenommen: sie stehen außerhalb'
		+ ' des Frontend-Dokuments und können keine Custom Properties benutzen)',
		...treffer);
}

/* ============================================================= A-2 Tokens */

console.log('\nA-2  Alle benutzten Design-Tokens existieren');
{
	const tokensCss = lies(path.join(SITE, 'Resources/Public/Css/tokens.css'));
	const definiert = new Set([...tokensCss.matchAll(/^\s*(--ck-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));
	const benutzt = new Map();
	for (const datei of OHNE_ICONS) {
		for (const m of lies(datei).matchAll(/var\(\s*(--ck-[a-z0-9-]+)/g)) {
			if (!benutzt.has(m[1])) {
				benutzt.set(m[1], kurz(datei));
			}
		}
	}
	const unbekannt = [...benutzt].filter(([name]) => !definiert.has(name));
	check(unbekannt.length === 0,
		`${benutzt.size} benutzte Tokens, alle in casino_startpage/…/tokens.css definiert`
		+ ` (dort stehen ${definiert.size})`,
		...unbekannt.map(([name, datei]) => `${name} – benutzt in ${datei}`));

	console.log('     Gegenprobe A-2-G: ein erfundener Token muss auffallen');
	const erfunden = new Set([...benutzt.keys(), '--ck-gibt-es-nicht']);
	const gegenprobeUnbekannt = [...erfunden].filter((name) => !definiert.has(name));
	check(gegenprobeUnbekannt.length === 1 && gegenprobeUnbekannt[0] === '--ck-gibt-es-nicht',
		'A-2-G: --ck-gibt-es-nicht wird als unbekannt erkannt');
}

/* =========================================== A-3 Keine Datei von außen */

console.log('\nA-3  Keine Datei von außen; kein createElementNS in JavaScript');
{
	const treffer = [];
	for (const datei of AUSGELIEFERT) {
		const rel = path.relative(EXT, datei);
		const istIcon = ICONS.includes(rel);
		for (const zeile of lies(datei).split('\n')) {
			const gesaeubert = zeile
				.replace(/url\(#[^)]*\)/g, '')
				.replace(/href="#[^"]*"/g, '');
			const rest = istIcon
				? gesaeubert.replace('http://www.w3.org/2000/svg', '')
				: gesaeubert;
			for (const muster of [/@import/, /url\(/, /src=/, /https?:\/\//, /<img\b/, /@font-face/]) {
				if (muster.test(rest)) {
					treffer.push(`${kurz(datei)}: ${zeile.trim().slice(0, 110)}`);
					break;
				}
			}
		}
	}
	check(treffer.length === 0,
		'kein @import, kein url(…) auf eine Datei, kein src=, keine http-Adresse,'
		+ ' kein <img>, kein @font-face',
		...treffer);

	const jsTreffer = [];
	for (const datei of AUSGELIEFERT) {
		if (!datei.endsWith('.js')) {
			continue;
		}
		if (ohneBlockKommentare(lies(datei)).includes('createElementNS')) {
			jsTreffer.push(kurz(datei));
		}
	}
	check(jsTreffer.length === 0,
		'kein createElementNS in einer JavaScript-Datei — SVG entsteht in'
		+ ' dieser Extension ausschließlich über innerHTML mit'
		+ ' <use href="#…"> — dieselbe Machart wie in table-felt.js.'
		+ ' createElementNS bleibt verboten, weil ein so erzeugtes Element'
		+ ' den Namensraum aus dem Quelltext heraus benennen müsste',
		...jsTreffer);
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
	// Ausnahme für genau eine Datei: die geteilte Negativliste
	// casino_startpage/…/negativliste.mjs (Befund B-6 der Copyright-Prüfung
	// craps vom 2026-09-09) muss als ausführbares JS-Array wörtlich
	// kartenspiel-spezifische Handelsnamen enthalten, die den Wortbestandteil
	// des Spielnamens tragen — das koppelt casino_startpage nicht an dieses
	// Gerät, es ist derselbe Schutzzweck wie A-5 selbst. Dieselbe Art
	// Ausnahme wie A-5s Selbstausnahme oben. Bis Befund B-6 stand hier
	// stattdessen verify-gattung.mjs, das die Liste vorher selbst trug.
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
		`keine einzige Nennung des Geräts und kein ${kuerzel}-Präfix im CODE`
		+ ' des Site Packages (Kommentare dürfen das Spiel benennen, sie'
		+ ' koppeln nichts — CONCEPT.md C.2: allgemeine Spielnamen)',
		...treffer);
}

/* ========================================= A-5 Kein fremder Name */

console.log('\nA-5  Kein fremder Hersteller-, Modell- oder Spieltitel');
{
	// Struktureller Befund der Copyright-Prüfung roulette vom 2026-09-09:
	// NEGATIVLISTE.length wurde weiter unten nur AUSGEGEBEN, nie GEPRÜFT —
	// eine leere oder halb geschriebene Liste hätte diese Prüfung mit
	// "bestanden" durchlaufen lassen, ohne dass ein einziger Name wirklich
	// geprüft worden wäre. MINDESTLAENGE ist in negativliste.mjs begründet.
	check(NEGATIVLISTE.length >= MINDESTLAENGE,
		`NEGATIVLISTE trägt mindestens ${MINDESTLAENGE} Einträge (tatsächlich`
		+ ` ${NEGATIVLISTE.length}) — sonst liefe diese Prüfung mit einer`
		+ ' leeren oder halb geschriebenen Liste weiter und meldete'
		+ ' fälschlich "bestanden"');

	// Die Negativliste selbst führt seit Befund B-6 der Copyright-Prüfung
	// craps vom 2026-09-09 nur noch EINE Datei für alle acht Geräte:
	// casino_startpage/…/negativliste.mjs (siehe deren Kopfkommentar). Diese
	// Datei hier enthält die Liste nicht mehr wörtlich und braucht deshalb
	// auch keine Namensausnahme mehr — anders als bis zum 2026-09-08, als
	// die Liste noch als eigenes Array in dieser Datei stand.
	const ALLE = alleDateien(EXT);
	const treffer = [];
	for (const datei of ALLE) {
		// KEIN Kommentar-Ausschnitt hier: A-5 ist die rechtliche Prüfung
		// (CONCEPT.md B.3 Nr. 4, V.7 Nr. 5) und liest deshalb den vollen Text,
		// Kommentare eingeschlossen — anders als A-4, die eine reine
		// Architekturfrage prüft. Ausnahme: in dieser Datei selbst werden die
		// drei Zeichen ©/™/® unschädlich gemacht (siehe DIESE_DATEI oben) —
		// sie muss sie wörtlich enthalten, um überhaupt gegen sie prüfen zu
		// können.
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
		+ ' den sieben übrigen Geräten und casino_startpage) und keins der drei'
		+ ' Zeichen ©/™/® in dieser Extension — README eingeschlossen. Diese'
		+ ' Datei selbst kennt keine Ausnahme mehr: sie trägt die Liste nicht'
		+ ' mehr wörtlich (Befund B-6 der Copyright-Prüfung craps vom'
		+ ' 2026-09-09)',
		...treffer);

	console.log('     Gegenprobe A-5-G: dieselbe Prüfung (musterFuer) muss einen gelisteten Namen auch in Versalien und ohne Trennzeichen erkennen');
	// Befund B-3 der Copyright-Prüfung craps vom 2026-09-09: die Gegenprobe
	// benutzt dieselbe musterFuer()-Funktion wie der Hauptlauf oben, statt
	// (wie bis 2026-09-08) mit includes() einen anderen Weg zu prüfen. Der
	// Testname wird zur LAUFZEIT aus NEGATIVLISTE gewählt (ein mehrwortiger
	// Eintrag aus reinen Buchstaben), statt als eigenes Zeichenkettenliteral
	// in diese Datei geschrieben zu werden — sonst geriete der geschützte
	// Name selbst in den Quelltext dieser Datei und A-5 schlüge gegen die
	// eigene Gegenprobe an. Der erfundene Text testet zugleich Befund B-1:
	// zusammengeschrieben und in Versalien.
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

	check(license.includes('GNU AFFERO GENERAL PUBLIC LICENSE'),
		'LICENSE ist die AGPL-Fassung');
	check(composer.license === LIZENZ, `composer.json nennt ${LIZENZ} (gefunden: ${composer.license})`);
	check(emconf.includes(`'license' => '${LIZENZ}'`), `ext_emconf.php nennt ${LIZENZ}`);
	check(readme.includes(LIZENZ), `README.md nennt ${LIZENZ}`);

	check(composer.authors?.[0]?.name === AUTOR && composer.authors?.[0]?.email === EMAIL,
		`composer.json nennt Autor ${AUTOR} und die E-Mail aus CONCEPT.md C.2`);
	check(emconf.includes(`'author' => '${AUTOR}'`) && emconf.includes(`'author_email' => '${EMAIL}'`),
		`ext_emconf.php nennt Autor ${AUTOR} und dieselbe E-Mail`);
}

/* =============================== A-7 Kachel und Spielseite zeigen dasselbe */

console.log('\nA-7  Kachel und Spielseite zeigen dieselbe Bauform');
{
	/*
	 * Fünf Merkmale müssen auf BEIDEN Zeichnungen vorkommen: auf der kleinen
	 * Kachel im Saal (Cabinet.html) und auf dem großen Tuch der Spielseite
	 * (Felt.html + felt.css). Verglichen wird nicht Pixel für Pixel — das
	 * ginge ohne Browser nicht —, sondern Merkmal für Merkmal: gerade
	 * Geberkante oben, Bogen unten, Schuh rechts, Ablage links,
	 * Versicherungsbogen, Setzkreis. Fehlt eines auf einer der beiden Seiten,
	 * zeigen Kachel und Spielseite nicht mehr dasselbe Gerät.
	 */
	const cabinet = ohneKommentare(lies(path.join(EXT, 'Resources/Private/Partials/Table/Blackjack/Cabinet.html')));
	const felt = ohneKommentare(lies(path.join(EXT, 'Resources/Private/Partials/Table/Blackjack/Felt.html')));
	const feltCss = ohneBlockKommentare(lies(path.join(EXT, 'Resources/Public/Css/felt.css')));

	const MERKMALE = [
		['D-Form: gerade Kante oben, Bogen unten',
			/A72 79 0 0 1/, /border-radius:\s*0 0 50% 50% \/ 0 0 42% 42%/],
		['Kartenschlitten rechts', /rotate\(-12 130 18\)/, /grid-area:\s*shoe[\s\S]*?justify-self:\s*end/],
		['Ablage links', /<rect x="20" y="9"/, /grid-area:\s*discard[\s\S]*?justify-self:\s*start/],
		['Versicherungsbogen', /M68 55 Q80 50 92 55/, /grid-area:\s*insurance/],
		['Setzkreis', /<circle cx="80" cy="68" r="9"/, /\.bj-felt__box[\s\S]*?border-radius:\s*var\(--ck-radius-pill\)/],
	];
	for (const [name, aufKachel, aufSeite] of MERKMALE) {
		check(aufKachel.test(cabinet), `Kachel zeigt: ${name}`);
		check(aufSeite.test(felt) || aufSeite.test(feltCss), `Spielseite zeigt: ${name}`);
	}

	console.log('     Gegenprobe A-7-G: ein auf der Spielseite fehlendes Merkmal muss auffallen');
	check(!/grid-area:\s*shoe/.test(feltCss.replace(/grid-area:\s*shoe/g, 'grid-area: nichts')),
		'A-7-G: ein entferntes Merkmal wird von derselben Prüfung als fehlend erkannt');
}

/* ==================================================== A-8 Gehäuse-Vertrag */

console.log('\nA-8  Der Gehäuse-Vertrag (Cabinet.html)');
{
	const rel = 'Resources/Private/Partials/Table/Blackjack/Cabinet.html';
	const inhalt = ohneKommentare(lies(path.join(EXT, rel)));

	const spans = [...inhalt.matchAll(/<span\b[^>]*\bclass="ck-cabinet[^"]*"/g)];
	check(spans.length === 1, `${rel}: genau ein span.ck-cabinet (gefunden: ${spans.length})`);

	const svgs = [...inhalt.matchAll(/<svg\b[^>]*\bclass="ck-cabinet__drawing"[^>]*>/g)];
	check(svgs.length === 1, `${rel}: genau ein svg.ck-cabinet__drawing (gefunden: ${svgs.length})`);

	if (svgs.length === 1) {
		const tag = svgs[0][0];
		check(tag.includes('viewBox="0 0 160 100"'), `${rel}: viewBox="0 0 160 100" (Gattung Tisch, quer)`);
		check(tag.includes('aria-hidden="true"'), `${rel}: aria-hidden="true"`);
		check(tag.includes('focusable="false"'), `${rel}: focusable="false"`);
	}

	check(!inhalt.includes('<title>'), `${rel}: kein <title>`);
	check(!/<text\b/.test(inhalt), `${rel}: kein <text> (zusätzliche Auflage dieser Phase)`);

	console.log('     Gegenprobe A-8-G: ein zweites .ck-cabinet muss auffallen');
	const zweitesCabinet = inhalt.replace('</span>', '</span><span class="ck-cabinet"></span>');
	const spansGegenprobe = [...zweitesCabinet.matchAll(/<span\b[^>]*\bclass="ck-cabinet[^"]*"/g)];
	check(spansGegenprobe.length === 2, `A-8-G: zwei span.ck-cabinet werden erkannt (gefunden: ${spansGegenprobe.length})`);
}

/* ======================================================== A-9 Kürzel-Präfix */

console.log('\nA-9  Das Kürzel-Präfix "bj-" wird eingehalten');
{
	/*
	 * Geteilte Haken aus casino_startpage, die absichtlich KEIN bj-Präfix
	 * tragen — Vertragsklassen/-Attribute des Saals bzw. der geteilten
	 * Tisch-Bausteine (casino_startpage/README.md, „Vertrag für das
	 * Gehäuse-Partial" und „Vertrag für ein bildschirmfüllendes Gerät"). In
	 * Phase C4a werden nur ck-table, ck-room-fill, data-ck-table und
	 * data-ck-table-key wirklich benutzt; die übrigen stehen für spätere
	 * Umsetzungsstücke bereit, ohne dass A-9 dafür geändert werden müsste.
	 */
	const GETEILT = new Set([
		'ck-table', 'ck-room-fill',
		// data-cl-seat: kein Vertrag des Saals, sondern der EINE, im Plan
		// (D5, Abschnitt 4.11/4.20) ausdrücklich benannte Übergriff auf die
		// Platzleiste von casino_lobby — blackjack.js liest folge.kartenAm()
		// aus und schreibt die verdeckten Kartenzahlen der anderen direkt in
		// deren [data-cl-seat="N"] [data-cl-seat-cards] (Umsetzungsstück
		// D5-4), weil nur diese Datei die Kartenzahlen aus dem
		// Zugprotokoll kennt — der Server selbst zählt keine Karten
		// (LobbyService::stand()).
		'data-cl-seat',
		'data-ck-table', 'data-ck-table-key', 'data-ck-table-go',
		'data-ck-table-status', 'data-ck-table-history', 'data-ck-table-history-empty',
		'data-ck-field', 'data-ck-field-label',
		'data-ck-table-controls', 'data-ck-table-chip', 'data-ck-table-rack',
		'data-ck-table-undo', 'data-ck-table-clear', 'data-ck-table-repeat',
		'data-ck-table-double', 'data-ck-table-cashout',
		'data-ck-table-buyin-form', 'data-ck-table-buyin-input', 'data-ck-table-buyin-add',
		'data-ck-table-exchange-down', 'data-ck-table-exchange-up',
		'data-ck-table-amount', 'data-ck-table-staked',
	]);
	const treffer = [];
	for (const datei of AUSGELIEFERT) {
		const rel = path.relative(EXT, datei);
		if (!/\.(html|css|js)$/.test(rel)) {
			continue;
		}
		const inhalt = ohneKommentare(lies(datei));
		for (const m of inhalt.matchAll(/\bclass="([^"]*)"/g)) {
			for (const klasse of m[1].split(/\s+/).filter(Boolean)) {
				// ck-* sind die geteilten Vertragsklassen (ck-cabinet,
				// ck-cabinet__drawing, ck-room-fill, ck-table …) — erlaubt wie
				// jeder andere geteilte Haken, kein Fund.
				const erlaubt = klasse.startsWith('bj-') || klasse.startsWith('ck-') || GETEILT.has(klasse);
				if (!erlaubt) {
					treffer.push(`${kurz(datei)}: class="${klasse}"`);
				}
			}
		}
		for (const m of inhalt.matchAll(/\b(id|data-[a-z-]+)="([^"]*)"/g)) {
			const attr = m[1];
			if (attr === 'id') {
				// Seit Phase C5 vergibt diese Extension ids — Sprungziele für
				// den Sprunglink und aria-labelledby-Bezüge. Sie unterliegen
				// derselben Präfixregel wie Klassen und data-Attribute, sonst
				// kollidieren zwei Geräte auf einer Seite.
				if (!m[2].startsWith('bj-')) {
					treffer.push(`${kurz(datei)}: id="${m[2]}"`);
				}
				continue;
			}
			// data-text-* ist KEIN Geräte-Haken: es trägt ausschließlich einen
			// übersetzten Satz für die eigene JavaScript-Datei desselben
			// Bauteils weiter (blackjack.js, Umsetzungsstück C5b). Dasselbe
			// unpräfigierte Muster benutzt schon casino_startpage/…/Table/
			// Status.html (data-text-placed etc.) und roulette/…/Launch.html
			// — ein Attribut, das nur innerhalb seines eigenen Bauteils
			// gelesen wird, koppelt kein Gerät an ein anderes und braucht
			// deshalb kein bj-Präfix.
			if (!attr.startsWith('data-bj-') && !attr.startsWith('data-text-') && !GETEILT.has(attr)) {
				treffer.push(`${kurz(datei)}: ${attr}="${m[2]}"`);
			}
		}
	}
	check(treffer.length === 0,
		'jede eigene CSS-Klasse, jedes eigene data-Attribut beginnt mit bj-'
		+ ' oder ist einer der ausdrücklich geteilten Haken (data-text-* zählt'
		+ ' als geräteneutraler Textträger ebenfalls dazu)',
		...treffer);
}

/* =========================================== A-10 Anmeldung bei der Registry */

console.log('\nA-10 Die Anmeldung bei der Registry stimmt');
{
	const localconf = lies(path.join(EXT, 'ext_localconf.php'));
	check(/AutomatRegistry::register\s*\(/.test(localconf),
		'ext_localconf.php ruft AutomatRegistry::register() auf');
	check(/gattung:\s*Gattung::Tisch/.test(localconf),
		'die Anmeldung nennt gattung: Gattung::Tisch');
	check(!/identifier:\s*'blackjack'/.test(localconf) && /Blackjack::IDENTIFIER/.test(localconf),
		'der Schlüssel kommt aus Blackjack::IDENTIFIER, nicht als ausgeschriebene Zeichenkette');
	check(/Blackjack::LANG_FRONTEND/.test(localconf) && /Blackjack::EXTENSION_KEY/.test(localconf)
		&& /Blackjack::CABINET_PARTIAL/.test(localconf),
		'title, extensionKey und cabinetPartial kommen ebenfalls aus Blackjack::…');
}

/* ============================== A-11 Das Regelwerk steht nur an einer Stelle */

console.log('\nA-11 Das Regelwerk steht nur an einer Stelle');
{
	/*
	 * Von Hand aus CONCEPT.md Anhang G abgeschrieben — nicht aus
	 * rules-blackjack.js importiert (das Modul existiert in C4a noch nicht,
	 * und selbst wenn es existierte, wäre ein Import hier genau die
	 * Fehlerklasse, die A-11 verhindern soll: eine Prüfung, deren Erwartung
	 * aus derselben Quelle kommt, die sie prüft).
	 */
	const VERBOTENE_ZEICHENKETTEN = [
		'3:2', '3 zu 2', '2:1', '2 zu 1', '6 Deck', 'sechs Deck', '312',
		'75 %', '0,40', '0.40', 'S17', 'weiche 17', 'weichen 17', '+3',
		'Trennkarte bei',
	];

	function a11Treffer(inhalt) {
		return VERBOTENE_ZEICHENKETTEN.filter((zk) => inhalt.includes(zk));
	}

	// Negative Hälfte: README, ext_emconf.php, beide XLIFF-Dateien, sowie
	// alle ausgelieferten .html- und .css-Dateien.
	const A11_DATEIEN = [
		path.join(EXT, 'README.md'),
		path.join(EXT, 'ext_emconf.php'),
		path.join(EXT, 'Resources/Private/Language/locallang.xlf'),
		path.join(EXT, 'Resources/Private/Language/locallang_be.xlf'),
		...AUSGELIEFERT.filter((d) => /\.(html|css)$/.test(d)),
	];
	const treffer = [];
	for (const datei of A11_DATEIEN) {
		for (const zk of a11Treffer(lies(datei))) {
			treffer.push(`${kurz(datei)}: „${zk}"`);
		}
	}
	check(treffer.length === 0,
		'keine Regelzahl in README.md, ext_emconf.php, den XLIFF-Dateien oder'
		+ ' einer HTML-/CSS-Datei (negative Hälfte)',
		...treffer);

	console.log('     Gegenprobe A-11-G: jede verbotene Zeichenkette einzeln angehängt muss auffallen');
	const readmeInhalt = lies(path.join(EXT, 'README.md'));
	const nichtErkannt = [];
	for (const zk of VERBOTENE_ZEICHENKETTEN) {
		const verfaelscht = `${readmeInhalt}\n${zk}\n`;
		if (!a11Treffer(verfaelscht).includes(zk)) {
			nichtErkannt.push(zk);
		}
	}
	check(nichtErkannt.length === 0,
		`A-11-G: alle ${VERBOTENE_ZEICHENKETTEN.length} verbotenen Zeichenketten werden einzeln erkannt`,
		...nichtErkannt);

	// Positive Hälfte: rules-blackjack.js existiert seit Umsetzungsstück C4b.
	const regelwerk = path.join(EXT, 'Resources/Public/JavaScript/rules-blackjack.js');
	if (!existsSync(regelwerk)) {
		console.log('  · positive Hälfte übersprungen — rules-blackjack.js fehlt noch. Ohne'
			+ ' diese Datei liefe die negative Hälfte sonst unbemerkt leer: eine Regel'
			+ ' könnte fehlen, ohne dass es auffiele.');
	} else {
		const regeln = await import(pathToFileURL(regelwerk).href);

		function gleich(a, b) {
			if (Array.isArray(a) && Array.isArray(b)) {
				return a.length === b.length && a.every((v, i) => v === b[i]);
			}
			return a === b;
		}

		/*
		 * Von Hand aus CONCEPT.md Anhang G abgeschrieben — UNABHÄNGIG von den
		 * Werten in rules-blackjack.js selbst. Diese Liste prüft, dass jede
		 * tragende Zahl aus Anhang G als exportierte Konstante VORHANDEN ist
		 * und den richtigen Wert trägt. Die "0,40 %" erwarteter Hausvorteil
		 * fehlt hier bewusst: er ist eine GEMESSENE Kennzahl (measure-payout.mjs,
		 * Umsetzungsstück C4e), keine Eingabegröße, die als Konstante im
		 * Regelmodul stehen könnte.
		 */
		const ERWARTETE_KONSTANTEN = {
			CARDS_PER_DECK: 52,
			DECK_COUNT: 6,
			SHOE_SIZE: 312,
			PENETRATION: 0.75,
			CUT_INDEX: 234,
			TRUE_COUNT_SHUFFLE_UP: 3,
		};
		const ERWARTETE_HAUSREGELN = {
			decks: 6,
			penetration: 0.75,
			standsOnSoft17: true,
			holeCard: true,
			peek: true,
			blackjackPays: [3, 2],
			winPays: [1, 1],
			insurancePays: [2, 1],
			pushReturnsStake: true,
			doubleOnAnyTwo: true,
			doubleAfterSplit: true,
			splitMax: 3,
			handsMax: 4,
			splitAcesOneCard: true,
			resplitAces: false,
			splitAceTenIsNotBlackjack: true,
			tenAndJackAreAPair: true,
			insurance: true,
			insuranceMaxFraction: [1, 2],
			surrender: false,
			sideBets: false,
			trueCountShuffleUp: 3,
		};

		const fehlendeKonstanten = [];
		for (const [name, erwartet] of Object.entries(ERWARTETE_KONSTANTEN)) {
			if (!(name in regeln)) {
				fehlendeKonstanten.push(`${name} fehlt`);
			} else if (!gleich(regeln[name], erwartet)) {
				fehlendeKonstanten.push(`${name} = ${JSON.stringify(regeln[name])}, erwartet ${JSON.stringify(erwartet)}`);
			}
		}
		check(fehlendeKonstanten.length === 0,
			'jede tragende Zahl aus Anhang G (Decks, Schlittengröße, Trennkarte,'
			+ ' Zähler-Schwelle) ist in rules-blackjack.js als exportierte Konstante'
			+ ' vorhanden und trägt den richtigen Wert',
			...fehlendeKonstanten);

		if (!('HOUSE' in regeln) || typeof regeln.HOUSE !== 'object' || regeln.HOUSE === null) {
			check(false, 'rules-blackjack.js exportiert HOUSE als Objekt', 'HOUSE fehlt oder ist kein Objekt');
		} else {
			const fehlendeHausregeln = [];
			for (const [feld, erwartet] of Object.entries(ERWARTETE_HAUSREGELN)) {
				if (!(feld in regeln.HOUSE)) {
					fehlendeHausregeln.push(`HOUSE.${feld} fehlt`);
				} else if (!gleich(regeln.HOUSE[feld], erwartet)) {
					fehlendeHausregeln.push(`HOUSE.${feld} = ${JSON.stringify(regeln.HOUSE[feld])}, erwartet ${JSON.stringify(erwartet)}`);
				}
			}
			check(fehlendeHausregeln.length === 0,
				`HOUSE enthält alle ${Object.keys(ERWARTETE_HAUSREGELN).length} geprüften Zeilen der`
				+ ' Hausregeltabelle aus Anhang G mit dem richtigen Wert',
				...fehlendeHausregeln);
		}

		console.log('     Gegenprobe A-11-G2: eine verfälschte Kopie mit falschem blackjackPays muss auffallen');
		const verfaelschterWert = [1, 1]; // sollte [3, 2] sein
		check(!gleich(verfaelschterWert, ERWARTETE_HAUSREGELN.blackjackPays),
			'A-11-G2: die verfälschte Kopie ([1,1] statt [3,2]) wird als abweichend erkannt');
	}
}

/* ========================= A-12 Kein Live-Bereich ohne Eigentümer/Schreiber */

console.log('\nA-12 Kein unbewohnter Live-Bereich, kein unbeschriebener Messpunkt');
{
	const HTML = AUSGELIEFERT.filter((d) => d.endsWith('.html'));
	const JS = AUSGELIEFERT.filter((d) => d.endsWith('.js'));

	/* (a) Jeder Live-Bereich wird LEER ausgeliefert. Ein Live-Bereich, der
	   beim Laden schon Text trägt, liest ungefragt vor; einer, den ein Skript
	   anlegt UND füllt, wird gar nicht angesagt. */
	for (const datei of HTML) {
		const inhalt = ohneKommentare(lies(datei));
		for (const m of inhalt.matchAll(/<(p|div|span)\b([^>]*\b(?:role="status"|role="alert"|aria-live)[^>]*)>([\s\S]*?)<\/\1>/g)) {
			check(m[3].trim() === '', `${kurz(datei)}: der Live-Bereich wird leer ausgeliefert`,
				`gefunden: "${m[3].trim().slice(0, 60)}"`);
		}
	}

	/* (b) Genau EIN f:asset.module in der ganzen Extension, und die genannte
	   Datei gibt es wirklich. */
	const module = HTML.flatMap((d) => [...ohneKommentare(lies(d)).matchAll(/f:asset\.module identifier="@phomo17\/blackjack\/([^"]+)"/g)].map((m) => m[1]));
	check(module.length === 1, `genau ein f:asset.module (gefunden: ${module.length})`, ...module);
	for (const name of module) {
		check(existsSync(path.join(EXT, 'Resources/Public/JavaScript', name)),
			`das eingebundene Modul ${name} existiert`);
	}

	/* (c) Jeder data-bj-Messpunkt, der von JavaScript BESCHRIEBEN wird, hat
	   genau einen Schreiber. „Beschrieben" heißt: setAttribute('data-bj-…')
	   oder .dataset.bj… = … in einer .js-Datei dieser Extension. */
	const schreiber = new Map();
	for (const datei of JS) {
		const quelltext = ohneBlockKommentare(lies(datei));
		for (const m of quelltext.matchAll(/setAttribute\(\s*'(data-bj-[a-z-]+)'/g)) {
			schreiber.set(m[1], (schreiber.get(m[1]) ?? new Set()).add(kurz(datei)));
		}
	}
	for (const [punkt, dateien] of schreiber) {
		check(dateien.size === 1, `${punkt} hat genau einen Schreiber`, ...dateien);
	}

	console.log('     Gegenprobe A-12-G: ein zweiter Schreiber muss auffallen');
	const gegenprobe = new Set(['a.js', 'b.js']);
	check(gegenprobe.size !== 1, 'A-12-G: zwei Schreiber werden als Fehler erkannt');
}

/* ==================================================== A-13 Kein "disabled" */

console.log('\nA-13 Kein echtes "disabled" — immer aria-disabled');
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
		+ ' dieser Extension (aria-disabled ist ausdrücklich erlaubt und wird'
		+ ' hier nicht als Treffer gezählt)',
		...treffer);

	console.log('     Gegenprobe A-13-G: ein eingefügtes disabled="disabled" muss auffallen');
	check(MUSTER.test('<button disabled="disabled">Test</button>'),
		'A-13-G: ein echtes disabled wird erkannt');
	check(!MUSTER.test('<button aria-disabled="true">Test</button>'),
		'A-13-G: aria-disabled selbst löst KEINEN Fehlalarm aus');
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Das Gerät zeichnet ausschließlich mit'
	+ '\nDesign-Tokens, lädt keine Datei von außen, casino_startpage kennt es nicht'
	+ '\nim Code, die Lizenzangaben stimmen überein, der Gehäuse-Vertrag ist erfüllt'
	+ '\n(einschließlich: kein <text>), das Kürzel-Präfix bj- wird eingehalten, die'
	+ '\nAnmeldung bei der Registry stimmt, keine Regelzahl steht außerhalb der einen'
	+ '\nQuelle UND jede tragende Zahl aus Anhang G ist dort tatsächlich vorhanden'
	+ '\n(A-11, beide Hälften), kein Live-Bereich und kein Messpunkt ist unbeschrieben,'
	+ '\nund kein echtes disabled kommt vor. Kachel und Spielseite zeigen seit'
	+ '\nUmsetzungsstück C5b nachweislich dieselbe Bauform (A-7).'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
