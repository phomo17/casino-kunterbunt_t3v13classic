/**
 * Roulette – Nachweis Geometrie/Gestaltung/Trennung/Negativliste (V.7)
 * =====================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Laufzeit unter einer Sekunde.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-cabinet.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.27)
 * ---------------------------------------------
 *   A-1  Keine eigene Farbe (Ausnahme: die beiden Backend-Icons)
 *   A-2  Jeder benutzte --ck-Token existiert in casino_startpage/tokens.css
 *   A-3  Keine Datei von außen; kein createElementNS in JavaScript
 *   A-4  Trennung: casino_startpage koppelt sich nicht an dieses Gerät —
 *        geprüft im CODE, nicht in Kommentaren (dieselbe Begründung wie G-9)
 *   A-5  Kein fremder Hersteller-, Modell- oder Spieltitel (Negativliste)
 *   A-6  Die Lizenzangaben widersprechen sich nicht
 *   A-7  Kachel und Spielseite zeigen dieselbe Bauform
 *   A-8  Der Gehäuse-Vertrag (Cabinet.html)
 *   A-9  Das Kürzel-Präfix "ro-" wird eingehalten
 *   A-10 Die Anmeldung bei der Registry stimmt
 *
 * WARUM A-4 IM CODE SUCHT, NICHT IN KOMMENTAREN
 * ----------------------------------------------
 * Dieselbe Begründung wie bei G-9 in casino_startpage/…/verify-gattung.mjs:
 * ab Phase C2 heißt jedes Gerät nach seiner Gattung (CONCEPT.md C.2), und ein
 * Wortabgleich über Kommentare könnte „nennt die Extension" und „nennt das
 * Spiel" nicht mehr unterscheiden. Der eigene Extension-Schlüssel wird aus
 * path.basename(EXT) ABGELEITET, nicht eingetragen — dieselbe Bauart wie die
 * GERAETE_EXTENSIONS-Ermittlung im Site Package.
 *
 * NICHT betroffen ist A-5: die Negativliste fremder Marken läuft weiterhin
 * über JEDE Zeile, Kommentare eingeschlossen — das ist die rechtliche
 * Prüfung (CONCEPT.md B.3 Nr. 4, V.7 Nr. 5) und wird nicht angetastet.
 *
 * WARUM A-5 KOMMENTARE MITLIEST UND A-4 NICHT
 * ---------------------------------------------
 * Zwei verschiedene Fragen, zwei verschiedene Reichweiten. A-4 ist eine
 * Architekturfrage — koppelt sich casino_startpage an dieses Gerät? —, und
 * eine Kopplung lebt im CODE (Pfad, Bezeichner, CSS-Klasse, data-Attribut),
 * nie in einem erklärenden Kommentar. A-5 dagegen ist die rechtliche Prüfung:
 * Ein öffentliches Repository liefert die Quelldateien vollständig mit aus,
 * Kommentare eingeschlossen — der Unterschied zwischen Kommentar und
 * sichtbarem Text verschwindet damit für V.7 Nr. 5. Genau daran ist die
 * erste vollständige Copyright-Prüfung am 2026-09-02 fündig geworden: sechs
 * von sieben Funden lagen in Fluid-Kommentaren. Bis zur Behebung von Befund
 * B-1 (Copyright-Prüfung vom 2026-09-04) schnitt A-5 hier trotz dieser
 * Aussage per ohneKommentare() genau diese Dateiklasse heraus — eine
 * Prüfung, die ihre eigenen Fundstellen ausblendet, ist schlimmer als
 * keine.
 *
 * STAND TEILSTÜCK C2-A: Table.html und Wheel.html (die Spielseite und das
 * große Rad) entstehen erst in Teilstück C2-B. A-7 vergleicht deshalb noch
 * nichts gegen die Spielseite und wird als "übersprungen" gemeldet, bis
 * Wheel.html existiert — ein übersprungener, klar benannter Nachweis ist
 * ehrlicher als einer, der stillschweigend besteht.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NEGATIVLISTE, MINDESTLAENGE, musterFuer } from '../../../../casino_startpage/Resources/Private/Scripts/negativliste.mjs';

/*
 * FIELDS aus bets-roulette.js — die maßgebliche Feldliste des Tuchs (Phase
 * C3, Anhang F). A-7 rechnet damit seit Teilstück C3c nach, dass die
 * Spielseite dieselbe Tuch-Bauform zeigt wie die Kachel: zwölf Tuchspalten
 * (eine Dreierreihe je Tuchspalte, kind === 'street'), drei Zeilen (eine
 * Kolonnenwette je Zeile, kind === 'column') und eine vorhandene Nullspalte
 * (die Felder n-0 und n-00).
 */
const { FIELDS } = await import('../../Public/JavaScript/bets-roulette.js');

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/roulette/ */
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
 * stimmen bleiben (dieselbe Bauart wie in verify-gattung.mjs G-9).
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
 * bei den drei vorhandenen Geräten).
 */
const AUSGELIEFERT = alleDateien(EXT).filter((datei) => {
	const rel = path.relative(EXT, datei);
	if (rel.startsWith('Resources/Private/Scripts')) {
		return false;
	}
	return rel !== 'README.md' && rel !== 'LICENSE';
});

const ICONS = ['Resources/Public/Icons/Extension.svg', 'Resources/Public/Icons/ContentRoulette.svg'];
const OHNE_ICONS = AUSGELIEFERT.filter((datei) => !ICONS.includes(path.relative(EXT, datei)));

console.log('\nRoulette – Nachweis Geometrie/Gestaltung/Trennung/Negativliste (V.7)');
console.log('=====================================================================\n');

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
		'kein createElementNS in einer JavaScript-Datei — wo SVG aus JavaScript'
		+ ' entstehen müsste, wäre innerHTML der richtige Weg; in dieser'
		+ ' Extension entsteht überhaupt kein SVG aus JavaScript',
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
	// roulette-spezifische Handelsnamen enthalten, die den Wortbestandteil
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
	// auch keine Selbstausnahme mehr — anders als bis zum 2026-09-08, als
	// die Liste noch als eigenes Array in dieser Datei stand.
	const ALLE = alleDateien(EXT);
	const treffer = [];
	for (const datei of ALLE) {
		// KEIN Kommentar-Ausschnitt hier: A-5 ist die rechtliche Prüfung
		// (CONCEPT.md B.3 Nr. 4, V.7 Nr. 5) und liest deshalb den vollen Text,
		// Kommentare eingeschlossen — anders als A-4, die eine reine
		// Architekturfrage prueft (siehe Kopfkommentar dieser Datei oben unter
		// "WARUM A-4 IM CODE SUCHT, NICHT IN KOMMENTAREN"). Bis zur Behebung
		// von Befund B-1 (Copyright-Prüfung vom 2026-09-04) stand hier
		// ohneKommentare(lies(datei)) und schnitt damit genau die
		// Fluid-Kommentare heraus, in denen am 2026-09-02 sechs von sieben
		// Funden der ersten Copyright-Prüfung lagen. Weitere Ausnahme: in
		// dieser Datei selbst werden die drei Zeichen ©/™/® unschädlich
		// gemacht (siehe DIESE_DATEI oben) — sie muss sie wörtlich enthalten,
		// um überhaupt gegen sie prüfen zu können.
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
	// Befund B-3 der Copyright-Prüfung craps vom 2026-09-09: diese sechs
	// Skripte hatten zu ihrer Negativliste bislang GAR KEINE Gegenprobe. Die
	// Gegenprobe benutzt dieselbe musterFuer()-Funktion wie der Hauptlauf
	// oben. Der Testname wird zur LAUFZEIT aus NEGATIVLISTE gewählt (ein
	// mehrwortiger Eintrag aus reinen Buchstaben), statt als eigenes
	// Zeichenkettenliteral in diese Datei geschrieben zu werden — sonst
	// geriete der geschützte Name selbst in den Quelltext dieser Datei und
	// A-5 schlüge gegen die eigene Gegenprobe an. Der erfundene Text testet
	// zugleich Befund B-1: zusammengeschrieben und in Versalien.
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
	const wheelPartial = path.join(EXT, 'Resources/Private/Partials/Table/Roulette/Wheel.html');
	if (!existsSync(wheelPartial)) {
		console.log('  · übersprungen — Wheel.html existiert noch nicht (entsteht in Teilstück C2-B)');
	} else {
		const cabinet = ohneKommentare(lies(path.join(EXT, 'Resources/Private/Partials/Table/Roulette/Cabinet.html')));
		const wheel = ohneKommentare(lies(wheelPartial));
		for (const klasse of ['pocket--red', 'pocket--black', 'pocket--green']) {
			check(cabinet.includes(klasse) && wheel.includes(klasse),
				`beide Zeichnungen benutzen ${klasse}`);
		}
		check(/rotate\(/.test(cabinet) && /rotate\(/.test(wheel),
			'beide Zeichnungen benutzen ausschließlich gedrehte Kopien (transform="rotate(…)")');
	}

	/*
	 * SEIT TEILSTÜCK C3c: dieselbe Prüfung für das TUCH. Die Kachel zeigt das
	 * Zahlenfeld als Zeichen (eine gleichmäßige Strichschar), die Spielseite
	 * rechnet dieselbe Bauform aus BetLayout::fields() (über die maßgebliche
	 * Feldliste FIELDS, oben importiert). Verglichen wird nicht die Anzahl der
	 * Felder (159 sind auf einer 15rem breiten Kachel nicht zu unterscheiden),
	 * sondern die STRUKTUR: zwölf Tuchspalten, drei Zeilen, eine Nullspalte.
	 *   - zwölf Tuchspalten  ↔  genau zwölf Dreierreihen (kind === 'street'),
	 *     denn jede Tuchspalte hat genau eine
	 *   - drei Zeilen        ↔  genau drei Kolonnenwetten (kind === 'column'),
	 *     denn jede Zeile hat genau eine
	 *   - Nullspalte         ↔  die Felder n-0 UND n-00 existieren
	 * In der Kachel gezählt als Strichschar: elf Spaltentrennlinien (also
	 * zwölf Spalten), zwei Zeilentrennlinien (also drei Zeilen), und eine
	 * eigene Trennlinie zur Nullspalte.
	 */
	const cabinetTuch = ohneKommentare(lies(path.join(EXT, 'Resources/Private/Partials/Table/Roulette/Cabinet.html')));

	function tuchZaehlungKachel(markup) {
		return {
			spaltenLinien: (markup.match(/class="ro-tile__col-line"/g) ?? []).length,
			zeilenLinien: (markup.match(/class="ro-tile__row-line"/g) ?? []).length,
			nullLinie: (markup.match(/class="ro-tile__null-line"/g) ?? []).length,
		};
	}

	const kachelZaehlung = tuchZaehlungKachel(cabinetTuch);
	check(kachelZaehlung.spaltenLinien === 11, `Kachel: elf Spaltentrennlinien = zwölf Tuchspalten (gefunden: ${kachelZaehlung.spaltenLinien})`);
	check(kachelZaehlung.zeilenLinien === 2, `Kachel: zwei Zeilentrennlinien = drei Zeilen (gefunden: ${kachelZaehlung.zeilenLinien})`);
	check(kachelZaehlung.nullLinie === 1, `Kachel: die Nullspalte ist vorhanden (eine eigene Trennlinie, gefunden: ${kachelZaehlung.nullLinie})`);

	const spielseiteStreets = FIELDS.filter((f) => f.kind === 'street').length;
	const spielseiteColumns = FIELDS.filter((f) => f.kind === 'column').length;
	const spielseiteNullspalte = FIELDS.some((f) => f.id === 'n-0') && FIELDS.some((f) => f.id === 'n-00');
	check(spielseiteStreets === 12, `Spielseite (BetLayout): zwölf Dreierreihen = zwölf Tuchspalten (gefunden: ${spielseiteStreets})`);
	check(spielseiteColumns === 3, `Spielseite (BetLayout): drei Kolonnenwetten = drei Zeilen (gefunden: ${spielseiteColumns})`);
	check(spielseiteNullspalte, 'Spielseite (BetLayout): die Nullspalte ist vorhanden (n-0 und n-00 existieren)');

	console.log('     Gegenprobe A-7-G: eine Kachel mit elf statt zwölf Spalten muss auffallen');
	const kachelMitElfSpalten = cabinetTuch.replace(/<line class="ro-tile__col-line"[^>]*\/>\s*$/m, '');
	const gegenprobeZaehlung = tuchZaehlungKachel(kachelMitElfSpalten);
	check(gegenprobeZaehlung.spaltenLinien === 10, `A-7-G: eine entfernte Spaltentrennlinie wird erkannt (verbleibend: ${gegenprobeZaehlung.spaltenLinien}, entspräche elf statt zwölf Tuchspalten)`);
}

/* ==================================================== A-8 Gehäuse-Vertrag */

console.log('\nA-8  Der Gehäuse-Vertrag (Cabinet.html)');
{
	const rel = 'Resources/Private/Partials/Table/Roulette/Cabinet.html';
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
}

/* ======================================================== A-9 Kürzel-Präfix */

console.log('\nA-9  Das Kürzel-Präfix "ro-" wird eingehalten');
{
	/*
	 * Geteilte Haken aus casino_startpage, die absichtlich KEIN ro-Präfix
	 * tragen — sie gehören den geteilten Tisch-Bausteinen aus Phase C1 und
	 * werden hier unverändert mitbenutzt (Plan Abschnitt 4.1c, A-9-Zeile).
	 */
	const GETEILT = new Set([
		'ck-table', 'ck-room-fill',
		'data-ck-table', 'data-ck-table-key', 'data-ck-table-go',
		'data-ck-table-status', 'data-ck-table-history', 'data-ck-table-history-empty',
		// Seit Teilstück C3b: der Vertrag für das Tuch eines Spiels
		// (casino_startpage/README.md, "Vertrag für das Tuch eines Spiels").
		// table-felt.js sucht [data-ck-field] geräteübergreifend, genau wie
		// beim Mustertisch (ck-felt/ck-felt__field, MusterCloth.html) — kein
		// ro-Präfix, weil dieser Haken keinem einzelnen Gerät gehört. Dasselbe
		// gilt für data-ck-field-label, die rückwärtsverträgliche Erweiterung
		// desselben Vertrags (Felder ohne sichtbare Aufschrift, Teilstück C3d).
		'data-ck-field', 'data-ck-field-label',
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
				// ck-cabinet__drawing, ck-room-fill …) — erlaubt wie jeder
				// andere geteilte Haken, kein Fund.
				const erlaubt = klasse.startsWith('ro-') || klasse.startsWith('ck-') || GETEILT.has(klasse);
				if (!erlaubt) {
					treffer.push(`${kurz(datei)}: class="${klasse}"`);
				}
			}
		}
		for (const m of inhalt.matchAll(/\b(id|data-[a-z-]+)="([^"]*)"/g)) {
			const attr = m[1];
			if (attr === 'id') {
				continue; // in dieser Extension werden keine ids vergeben
			}
			// data-text-* ist KEIN Geräte-Haken: es trägt ausschließlich einen
			// übersetzten Satz für die eigene JavaScript-Datei desselben
			// Bauteils weiter (Table/Roulette/Launch.html, Plan Abschnitt
			// 4.19/4.31 V-10). Dasselbe unpräfigierte Muster benutzt schon
			// casino_startpage/…/Table/Status.html (data-text-placed etc.) —
			// ein Attribut, das nur innerhalb seines eigenen Bauteils gelesen
			// wird, koppelt kein Gerät an ein anderes und braucht deshalb
			// kein ro-Präfix.
			if (!attr.startsWith('data-ro-') && !attr.startsWith('data-text-') && !GETEILT.has(attr)) {
				treffer.push(`${kurz(datei)}: ${attr}="${m[2]}"`);
			}
		}
	}
	check(treffer.length === 0,
		'jede eigene CSS-Klasse, jedes eigene data-Attribut beginnt mit ro-'
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
	check(!/identifier:\s*'roulette'/.test(localconf) && /Roulette::IDENTIFIER/.test(localconf),
		'der Schlüssel kommt aus Roulette::IDENTIFIER, nicht als ausgeschriebene Zeichenkette');
	check(/Roulette::LANG_FRONTEND/.test(localconf) && /Roulette::EXTENSION_KEY/.test(localconf)
		&& /Roulette::CABINET_PARTIAL/.test(localconf),
		'title, extensionKey und cabinetPartial kommen ebenfalls aus Roulette::…');
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Das Gerät zeichnet ausschließlich mit'
	+ '\nDesign-Tokens, lädt keine Datei von außen, casino_startpage kennt es nicht'
	+ '\nim Code, die Lizenzangaben stimmen überein, der Gehäuse-Vertrag ist erfüllt,'
	+ '\ndas Kürzel-Präfix ro- wird eingehalten, und die Anmeldung bei der Registry'
	+ '\nstimmt.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
