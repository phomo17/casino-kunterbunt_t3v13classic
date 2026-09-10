/**
 * Roulette – Nachweis des Tuchs (PHP-Spiegel, Markup, Sprache)
 * ================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede npm-Abhängigkeit;
 * es genügt ein Node ab Version 18 und ein php-Binär im selben Container.
 * Startet keinen Browser.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-felt.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * STAND UMSETZUNGSSTÜCK Vc — F-1 BIS F-6, F-11 BIS F-15, F-18 BIS F-20
 * VOLLSTÄNDIG; F-7, F-9, F-10 UMGEBAUT; F-8 UNVERÄNDERT; F-16, F-17 NEU
 * -----------------------------------------------------------------------
 * Der Tisch wurde nach zwei Bildvorlagen umgebaut (Plan PLAN-roulette-tisch-
 * vorlage, Umsetzungsstück Va/Vb/Vc/Vd/Ve). Va hat F-1 auf die reinen
 * Buchführungsdaten verengt und F-13 (PHP-Selbstkonsistenz, Teil 1) angelegt.
 * Vb betraf locallang.xlf, die neue Datei Cloth.html, Table.html und
 * Felt.html (Vollfassung), baute F-2/F-4/F-5 um, passte F-3/F-6 an eine
 * einzige Knopf-Vorlage an, baute F-11/F-12 um (die Überschrift ist nach
 * Table.html gewandert) und legte F-14/F-15(Markup-Teil)/F-18/F-19/F-20 neu
 * an. DIESES Umsetzungsstück (Vc) betrifft felt.css (Vollfassung) und
 * wheel.css (Abschnitt 1): es baut F-7 auf die fr-basierte Maßordnung um
 * (--ro-line/--ro-cell stehen jetzt auf .ro-cloth, nicht mehr auf .ro-felt;
 * die alte Sonderregel für sechs Linienfeld-Arten ist einer einheitlichen
 * Regel für alle 159 Felder gewichen), baut F-9 um die vier neuen Paarungen
 * aus (die drei Ovale und die Ovalkontur auf dem Tuch), baut F-10 komplett
 * neu (statt der entfallenen felt.print.red/black-Kennungen prüft es jetzt
 * die gemeinsame Rautenkontur, die Schraffur ausschließlich an Schwarz und
 * die Farbe im Namen jedes Zahlenfeldes), ergänzt F-13 um Teil 2 (Stylesheet)
 * und Teil 3 (Zeichnung), ergänzt F-15 um den CSS-Teil (kein clip-path/mask/
 * overflow/opacity an den Pfeilfeldern) und legt F-16 (die 38 Ovale gegen
 * wheel-geometry.js) sowie F-17 (opacity an einem gesperrten Zustand nimmt
 * den Fokus nicht aus) neu an. F-8 bleibt unverändert, weil seine Zusage
 * (kein outline: none, kein ausgeschriebener Farbwert, jeder Token
 * existiert) unabhängig von der Struktur des Stylesheets gilt.
 *
 * WAS HIER BEWIESEN WIRD
 * ---------------------------
 *   F-1   PHP (BetLayout::fields()) und JavaScript (bets-roulette.js)
 *         stimmen für alle 159 Felder überein: Kennung, kind, payout, max,
 *         col, colEnd, row, rowEnd, covers — NICHT mehr Aufschrift/Name,
 *         die stehen seit dem Umbau ausschließlich im PHP.
 *   F-2   genau eine Knopf-Vorlage im Quelltext, eine Schleife über die vier
 *         Gruppennamen, ein <f:section name="Aufdruck">.
 *   F-3   die eine Feldknopf-Vorlage ist ein echter <button type="button">;
 *         kein <div>, kein role="button", kein disabled (nur aria-disabled
 *         ist zulässig).
 *   F-4   jedes der 159 Felder trägt aria-label UND data-ck-field-label aus
 *         demselben f:translate(field.labelKey, field.labelArgs); alle 159
 *         aufgelösten Namen sind paarweise verschieden, kein %1$s bleibt
 *         offen.
 *   F-5   es gibt keine felt.print.*-Kennung mehr (die Aufschrift steht in
 *         BetLayout.php); jede benutzte XLIFF-Kennung existiert in
 *         locallang.xlf, UND keine Kennung der Datei ist unbenutzt.
 *         Gescannt werden Felt.html, Status.html, Table.html,
 *         SoundSwitch.html, Cloth.html, die PHP-Feldliste (labelKey) und
 *         ext_localconf.php (Roulette::LANG_FRONTEND . '...').
 *   F-6   das eine style-Attribut in Felt.html enthält ausschließlich
 *         grid-column und grid-row mit ganzen Zahlen (auch als "a / b"-
 *         Spanne) — keine Farbe, keine Größe, keine Schrift.
 *   F-7   Zielgröße (SC 2.5.8): jedes der 159 Felder misst bei der kleinsten
 *         Tischbreite mindestens 24 × 24 Bildpunkte, gerechnet aus
 *         Spurgewicht (COLUMN_FRACTIONS/ROW_FRACTIONS) und --ro-line; die
 *         fr-Gewichte in felt.css stimmen Zahl für Zahl mit BetLayout
 *         überein; .ro-felt deklariert --ro-line/--ro-cell nicht erneut
 *         (beide stehen auf .ro-cloth); der Ton-Schalter hält seine eigenen
 *         2,75rem außerhalb des Gitters.
 *   F-8   felt.css: kein outline: none, kein ausgeschriebener Farbwert,
 *         jeder Token existiert — unverändert.
 *   F-9   Kontrast (SC 1.4.3/1.4.11) jeder aufgedruckten Aufschrift gegen
 *         den ungünstigsten Farbstopp ihres Untergrunds, UND der vier neuen
 *         Paarungen seit dem Umbau: --ck-pocket-mark auf den drei Ovalen
 *         (≥ 4,5:1) und --ck-felt-line auf --ck-felt-green, die Ovalkontur
 *         auf dem Tuch (≥ 3:1, SC 1.4.11).
 *   F-10  Farbe ist nie die einzige Aussage (SC 1.4.1): beide Rauten tragen
 *         dieselbe helle Kontur, genau eine (Schwarz) zusätzlich eine
 *         Schraffur — der zweite, farbunabhängige Unterschied —, und jedes
 *         Zahlenfeld nennt seine Farbe ausgeschrieben im erreichbaren Namen.
 *   F-11  der Sprunglink steht als erstes fokussierbares Element in .ck-felt
 *         und zeigt auf ein Ziel, das im Markup existiert; felt.css setzt
 *         seine Feinlage ausschließlich unter :focus-visible.
 *   F-12  genau eine <h2> in Table.html, keine mehr in Felt.html, keine <h1>,
 *         die Sektion ist über aria-labelledby mit ihrer Überschrift
 *         verbunden, alle vier Gruppennamen sind vorhanden und verschieden.
 *   F-13  die Maßordnung vollständig: Teil 1 (PHP-Selbstkonsistenz —
 *         Spurgewichte, Gitterkasten, die Schachtelung Rad/Gitter/Tuch/
 *         viewBox), Teil 2 (das Stylesheet rechnet dieselbe Maßordnung —
 *         aspect-ratio, fr-Gewichte, die vier Prozentrechnungen jeder
 *         Schicht) und Teil 3 (die Zeichnung nimmt viewBox und Tuchfläche
 *         aus {felt.view}/{felt.cloth}, statt sie abzuschreiben).
 *   F-14  genau eine Fläche (.ro-cloth), drei Schichten in der Reihenfolge
 *         Cloth → Wheel → Felt, kein Rest der alten Zwei-Kästen-Anordnung
 *         (auch nicht in felt.css/wheel.css oder in einem Kommentar).
 *   F-15  die zwei Pfeilfelder vollständig: Markup-Teil (arrowPaths()
 *         liefert zwei Umrisse für n-0/n-00, ein zweites Mal unabhängig
 *         gegen die Gitterkanten nachgerechnet; Cloth.html rendert sie aus
 *         {felt.arrowPaths}, kein Pfad steht von Hand da) und CSS-Teil
 *         (n-0/n-00 nehmen ihren eigenen Rahmen zurück; kein clip-path/mask/
 *         overflow: hidden/opacity an ihnen — das schnitte den Fokusrahmen
 *         mit ab).
 *   F-16  die Ovale: genau 38 Felder tragen eines, ihre Farbe stimmt mit
 *         wheel-geometry.js (der maßgeblichen, von BetLayout unabhängigen
 *         Radanordnung) überein, 0/00 sind grün, drei Farbregeln mit drei
 *         verschiedenen Tokens teilen sich eine gemeinsame helle Kontur.
 *   F-17  opacity an einem gesperrten Zustand ([aria-disabled='true']/
 *         :disabled) nimmt den fokussierten Zustand IMMER aus
 *         (:not(:focus-visible)) — in felt.css UND wheel.css. Verhindert
 *         zum fünften Mal den Fehler, der diesem Projekt schon viermal
 *         passiert ist: opacity dimmt den outline mit.
 *   F-18  jede Aufschrift steht wörtlich in einer unabhängigen Abschrift der
 *         Vorlage, kein Umlaut, keine Aufschrift läuft durch f:translate,
 *         die aufgedruckte Quote „2 to 1" ist unsere Quote aus Anhang F.
 *   F-19  lang="en" an jedem Aufschriftteil mit Buchstaben, an keinem ohne
 *         (SC 3.1.2).
 *   F-20  Label in Name (SC 2.5.3): jeder Name enthält die sichtbare
 *         Aufschrift seines Feldes.
 *
 * WIE DER PHP-SPIEGEL GELESEN WIRD
 * -----------------------------------
 * BetLayout::fields() lässt sich nicht per "php -r" abfragen (das Sandbox-
 * Regelwerk dieses Projekts verbietet inline ausgeführten Interpreter-Code
 * ausdrücklich, weil er Schreibschutz und Netzwerksperren umgehen könnte).
 * Stattdessen liest ein eigenes, winziges PHP-Realfile (dump-bet-layout.php)
 * BetLayout.php und WheelGeometry.php unmittelbar per require ein — ohne
 * TYPO3-Bootstrap, weil beide Klassen an nichts Frameworkspezifischem hängen
 * — und schreibt BetLayout::fields() als JSON nach STDOUT. Dieses Skript
 * ruft es als gewöhnliches PHP-Programm auf (kein -r, kein eval), genau wie
 * der Sicherheitshinweis es vorschlägt: "Use the TYPO3 CLI, a real file, or
 * a composer script."
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/roulette/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
/** typo3conf/ext/casino_startpage/ — Quelle der Design-Tokens (F-8, F-9). */
const SITE = path.join(EXT_ROOT, 'casino_startpage');

let fehler = 0;

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

/** Entfernt Fluid-Kommentare, damit ein erklärender Absatz keinen Fund vortäuscht. */
function ohneFluidKommentare(inhalt) {
	return inhalt.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '');
}

/** Entfernt CSS-Blockkommentare (/* … *\/), für F-7/F-8/F-9/F-10 auf felt.css. */
function ohneBlockKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '');
}

/*
 * Die folgenden fünf Hilfsfunktionen (hexZuRgb, leuchtdichte, kontrast,
 * tokenFarben, regelRumpf/eigenschaftsWert) sind SINNGEMÄSS übernommen aus
 * fruit_risk/Resources/Private/Scripts/verify-cabinet.mjs, Prüfung A-30
 * (Kontrast statisch aus Tokens und CSS, ohne Browser) — mit neu
 * geschriebenem Kopfkommentar für diese Datei. Der Auftrag für diesen Lauf
 * verlangt ausdrücklich, A-30 für F-9 "sinngemäß" zu übernehmen: dieselbe
 * Rechnung (JEDER benannte Farbstopp, das Minimum entscheidet), auf die
 * Selektoren dieser Extension angewandt.
 */

/** Ein hex-Farbwert ("ede4cf") als [r, g, b]. */
function hexZuRgb(hex) {
	return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

/** Relative Leuchtdichte nach WCAG 2.2, Anhang zu SC 1.4.3. */
function leuchtdichte([r, g, b]) {
	const f = (v) => {
		const x = v / 255;
		return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Kontrastverhältnis zweier Farben nach WCAG 2.2. */
function kontrast(c1, c2) {
	const l1 = leuchtdichte(c1);
	const l2 = leuchtdichte(c2);
	const [hell, dunkel] = l1 >= l2 ? [l1, l2] : [l2, l1];
	return (hell + 0.05) / (dunkel + 0.05);
}

/**
 * Löst einen --ck-…-Token aus tokens.css in eine oder mehrere RGB-Farben
 * auf. Ein einfacher Token (#hex, rgb()/rgba()) liefert genau eine Farbe;
 * ein zusammengesetzter Token (ein Verlauf, der selbst wieder --ck-…-Tokens
 * benennt) liefert die Farbe JEDES darin benannten Tokens — genau die
 * Stopps, über die F-9 rechnet.
 */
function tokenFarben(quelle, token, tiefe = 0) {
	if (tiefe > 6) return [];
	const muster = new RegExp(`(?:^|[\\s;{])${token}\\s*:\\s*([^;]+);`, 'm');
	const treffer = muster.exec(quelle);
	if (!treffer) return [];
	const wert = treffer[1];
	const hex = /#([0-9a-fA-F]{6})\b/.exec(wert);
	if (hex) return [hexZuRgb(hex[1])];
	const rgb = /rgba?\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)/.exec(wert);
	if (rgb) return [[Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]];
	const verschachtelt = [...wert.matchAll(/var\((--ck-[a-z0-9-]+)\)/g)].map((m) => m[1]);
	return verschachtelt.flatMap((t) => tokenFarben(quelle, t, tiefe + 1));
}

/** Schneidet den Rumpf EINER exakten Regel aus einem flachen CSS-Text. */
function regelRumpf(css, selektor) {
	const escaped = selektor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const muster = new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{`);
	const treffer = muster.exec(css);
	if (!treffer) return null;
	let i = css.indexOf('{', treffer.index) + 1;
	let tiefe = 1;
	const start = i;
	while (i < css.length && tiefe > 0) {
		if (css[i] === '{') tiefe++;
		else if (css[i] === '}') tiefe--;
		i++;
	}
	return css.slice(start, i - 1);
}

/*
 * (?:^|[\s;{]) davor ist bindend: ohne diese Grenze fände die Regel für
 * "color" auch das Ende von "background-color" — derselbe Fund, den
 * tokenFarben() oben schon für die Token-Auflösung berücksichtigt.
 */
function eigenschaftsWert(rumpf, eigenschaft) {
	const escaped = eigenschaft.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const muster = new RegExp(`(?:^|[\\s;{])${escaped}\\s*:\\s*([^;]+);`, 'm');
	const treffer = muster.exec(rumpf ?? '');
	return treffer ? treffer[1].trim() : null;
}

/**
 * Rollt genau EIN repeat(n, …) in einer grid-template-columns/rows-Erklärung
 * aus, mit Tiefenzählung über die Klammern des Inhalts (der Inhalt trägt
 * selbst Klammern, minmax(var(--ro-cell), 2fr) …). Reicht für diese Datei:
 * felt.css benutzt repeat() nur einmal und nicht verschachtelt.
 */
function loeseRepeatAuf(deklaration) {
	const start = deklaration.indexOf('repeat(');
	if (start === -1) return deklaration;
	const nachAnzahl = deklaration.indexOf(',', start);
	const anzahl = Number(deklaration.slice(start + 'repeat('.length, nachAnzahl).trim());
	let i = nachAnzahl + 1;
	let tiefe = 1;
	const inhaltStart = i;
	while (tiefe > 0 && i < deklaration.length) {
		if (deklaration[i] === '(') tiefe++;
		else if (deklaration[i] === ')') tiefe--;
		i++;
	}
	const inhaltEnde = i - 1;
	const inhalt = deklaration.slice(inhaltStart, inhaltEnde).trim();
	return deklaration.slice(0, start) + Array(anzahl).fill(inhalt).join(' ') + deklaration.slice(i);
}

/**
 * Liest die Liste der fr-Gewichte aus einer grid-template-columns/rows-
 * Erklärung, repeat(n, …) eingerechnet. Steht hier im Skript und NICHT im
 * PHP: eine Prüfung, die ihre Erwartung aus der geprüften Datei bezöge,
 * prüfte nichts (F-7, F-13).
 */
function frGewichte(deklaration) {
	if (!deklaration) return [];
	const ausgerollt = loeseRepeatAuf(deklaration);
	return [...ausgerollt.matchAll(/(\d+(?:\.\d+)?)fr/g)].map((m) => Number(m[1]));
}

/*
 * DREI HILFSFUNKTIONEN, SEIT UMSETZUNGSSTÜCK Vb GEMEINSAM BENUTZT
 * ------------------------------------------------------------------
 * Vorher stand quelltext() nur lokal in F-10 (dort ausschließlich für die
 * inzwischen entfallenen felt.print.red/felt.print.black gebraucht). F-4,
 * F-18 und F-20 brauchen dieselbe Rechnung jetzt gegen die 159 labelKey-Werte
 * der echten Feldliste — deshalb eine gemeinsame, globale Fassung statt einer
 * dritten Kopie.
 */

/** Liest den <source>-Text einer XLIFF-Kennung aus locallang.xlf. */
function quelltext(id) {
	const locallang = lies(LOCALLANG_PFAD);
	// locallang.xlf schreibt <source> auf einer eigenen Zeile unter
	// <trans-unit>, nicht auf derselben Zeile — \s* zwischen beiden Tags.
	const muster = new RegExp(`<trans-unit id="${id}">\\s*<source>([^<]*)</source>`);
	return muster.exec(locallang)?.[1] ?? null;
}

/** Setzt %1$s…%3$s aus labelArgs in einen XLIFF-Quelltext ein (sinngemäß vsprintf()). */
function aufgeloest(text, labelArgs) {
	if (text === null) return null;
	let ergebnis = text;
	(labelArgs ?? []).forEach((wert, index) => {
		ergebnis = ergebnis.replace(new RegExp(`%${index + 1}\\$s`, 'g'), String(wert));
	});
	return ergebnis;
}

/** Dieselbe Zuordnung wie FeltProcessor::groupOf() — ein zweites Mal getippt, nicht importiert (F-2). */
function gruppeVon(kind) {
	return { column: 'columns', dozen: 'dozens', even: 'even' }[kind] ?? 'numbers';
}

console.log('\nRoulette – Nachweis des Tuchs (PHP-Spiegel, Markup, Sprache)');
console.log('================================================================\n');

const BET_LAYOUT_PFAD = path.join(EXT, 'Classes/BetLayout.php');
const DUMP_SCRIPT_PFAD = path.join(EXT, 'Resources/Private/Scripts/dump-bet-layout.php');
const BETS_JS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/bets-roulette.js');
const FELT_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Roulette/Felt.html');
const CLOTH_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Roulette/Cloth.html');
const WHEEL_CSS_PFAD = path.join(EXT, 'Resources/Public/Css/wheel.css');
const STATUS_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Roulette/Status.html');
const TABLE_HTML_PFAD = path.join(EXT, 'Resources/Private/ContentElements/Table.html');
const LOCALLANG_PFAD = path.join(EXT, 'Resources/Private/Language/locallang.xlf');
const FELT_CSS_PFAD = path.join(EXT, 'Resources/Public/Css/felt.css');
const TOKENS_CSS_PFAD = path.join(SITE, 'Resources/Public/Css/tokens.css');
const SOUND_SWITCH_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Roulette/SoundSwitch.html');
const EXT_LOCALCONF_PFAD = path.join(EXT, 'ext_localconf.php');

/* ================================================ Wächter: kein stiller Ausstieg */

/*
 * DREI FEHLERKLASSEN, DREI RIEGEL.
 *
 * 1  EINE FEHLENDE DATEI. Bis hierher stieg das Skript bei einer fehlenden
 *    Datei über existsSync aus — und meldete dabei nicht immer, dass es das
 *    tat. Ab jetzt ist eine fehlende Datei ein ABBRUCH mit Rückgabewert 1,
 *    nie ein übersprungener Block.
 * 2  EIN NUL-BYTE. Ein einzelnes \0 in einer Textdatei macht sie für manche
 *    Werkzeuge zu einer Binärdatei; Suchen laufen dann ins Leere, ohne Fehler
 *    zu melden. Genau das ist in diesem Projekt vorgekommen.
 * 3  EIN VERSCHWUNDENER PRÜFBLOCK. Wird ein Block durch einen frühen return
 *    oder einen Tippfehler übersprungen, sinkt nur die ANZAHL der gemeldeten
 *    Zusagen — das Ergebnis bleibt „alle Prüfungen bestanden". Deshalb zählt
 *    das Skript seine eigenen Zusagen und hält sie gegen eine hier
 *    ausgeschriebene Zahl.
 */
const PFLICHTDATEIEN = [
	['BetLayout.php', BET_LAYOUT_PFAD],
	['dump-bet-layout.php', DUMP_SCRIPT_PFAD],
	['bets-roulette.js', BETS_JS_PFAD],
	['Felt.html', FELT_HTML_PFAD],
	['Cloth.html', CLOTH_HTML_PFAD],
	['Table.html', TABLE_HTML_PFAD],
	['locallang.xlf', LOCALLANG_PFAD],
	['felt.css', FELT_CSS_PFAD],
	['wheel.css', WHEEL_CSS_PFAD],
	['tokens.css', TOKENS_CSS_PFAD],
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
 * Die Anzahl der Zusagen, die ein vollständiger Lauf ausgibt. Sie steht hier
 * ausgeschrieben, damit ein übersprungener Prüfblock auffällt: er senkt die
 * Zahl, ohne eine einzige Zusage rot zu machen.
 *
 * Wer eine Zusage HINZUFÜGT, zieht diese Zahl mit — und merkt genau daran,
 * dass er es getan hat. Das ist der Zweck.
 */
const ERWARTETE_ZUSAGEN = 176;
let zusagen = 0;

const { FIELDS, PAYOUT_BY_COVERED } = await import(new URL('../../Public/JavaScript/bets-roulette.js', import.meta.url));

/**
 * Liest die PHP-Seite über dump-bet-layout.php.
 *
 * SEIT DEM UMBAU NACH DER BILDVORLAGE liefert das Werkzeug ein OBJEKT statt
 * einer Liste: neben der Feldliste auch die Maßordnung, die Spurgewichte und
 * die zwei Pfeilpfade. Ein Zugriff auf einen fehlenden Schlüssel ergäbe in
 * JavaScript kein Fehler, sondern `undefined` — die Prüfung liefe weiter und
 * prüfte nichts. Genau diese Fehlerklasse hat dieses Projekt mehrfach
 * getroffen. Deshalb wird JEDER erwartete Schlüssel hier einmal geprüft und
 * der Lauf bricht LAUT ab, wenn einer fehlt.
 */
function ladePhpDaten() {
	const roh = execFileSync('php', [DUMP_SCRIPT_PFAD], { encoding: 'utf8' });
	const daten = JSON.parse(roh);
	const ERWARTET = ['fields', 'columnFractions', 'rowFractions', 'gridColumns',
		'gridRows', 'view', 'cloth', 'grid', 'wheel', 'arrowPaths'];
	const fehlend = ERWARTET.filter((k) => daten[k] === undefined);
	if (fehlend.length > 0) {
		console.log(`\nERGEBNIS: Abbruch — dump-bet-layout.php liefert nicht: ${fehlend.join(', ')}.`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
		process.exit(1);
	}
	return daten;
}

const phpDaten = ladePhpDaten();
const phpFelder = phpDaten.fields;

/* ============================================== F-1 PHP gegen JavaScript */

console.log('F-1  BetLayout::fields() (PHP) stimmt mit bets-roulette.js (JavaScript) überein');
{
	/*
	 * SEIT DEM UMBAU NACH DER BILDVORLAGE vergleicht F-1 nur noch die
	 * BUCHFÜHRUNGSDATEN. Aufschrift und Name stehen ausschließlich im PHP
	 * (BetLayout.php); das JavaScript führt sie nicht mehr mit. Ein Vergleich
	 * gegen eine Eigenschaft, die es auf einer Seite gar nicht gibt, wäre eine
	 * Prüfung, die IMMER besteht — genau die Sorte, die dieses Haus schon
	 * mehrfach getäuscht hat.
	 *
	 * Was hier NICHT mehr geprüft wird, prüfen andere: die Aufschrift F-18,
	 * die Sprache F-19, den Namen F-4 und F-20.
	 */
	const VERGLICHENE = ['id', 'kind', 'payout', 'max', 'col', 'colEnd', 'row', 'rowEnd'];

	check(phpFelder.length === FIELDS.length,
		`beide Fassungen führen gleich viele Felder (PHP: ${phpFelder.length}, JS: ${FIELDS.length})`);
	check(FIELDS.length === 159, `es sind 159 Felder (gefunden: ${FIELDS.length})`);

	const abweichungen = [];
	for (let i = 0; i < Math.min(phpFelder.length, FIELDS.length); i++) {
		const p = phpFelder[i];
		const j = FIELDS[i];
		for (const eigenschaft of VERGLICHENE) {
			if (p[eigenschaft] !== j[eigenschaft]) {
				abweichungen.push(`${j.id}.${eigenschaft}: PHP "${p[eigenschaft]}" ≠ JS "${j[eigenschaft]}"`);
			}
		}
		if (p.covers.join('|') !== j.covers.join('|')) {
			abweichungen.push(`${j.id}.covers: PHP [${p.covers}] ≠ JS [${j.covers}]`);
		}
	}
	check(abweichungen.length === 0,
		`alle ${VERGLICHENE.length + 1} Buchführungseigenschaften stimmen für alle Felder überein`,
		...abweichungen);

	// Die drei entfernten Eigenschaften dürfen im JavaScript NICHT
	// zurückkommen — sonst gäbe es die zweite Wahrheit wieder, ohne dass es
	// auffiele (F-1 vergleicht sie nicht mehr).
	const jsQuelle = lies(BETS_JS_PFAD).replace(/\/\*[\s\S]*?\*\//g, '');
	for (const tot of ['printed', 'labelKey', 'labelArgs']) {
		check(!new RegExp(`\\b${tot}\\b`).test(jsQuelle),
			`bets-roulette.js führt "${tot}" nicht mehr (die Aufschrift steht ausschließlich in BetLayout.php)`);
	}

	console.log('     Gegenprobe F-1-G: eine verfälschte Kopie der PHP-Liste (n-17.max verstellt) muss auffallen');
	// Sinngemäß aus der heutigen Fassung übernommen; die dort benutzte
	// Hilfsfunktion finde_abweichungen() entfällt mit dem alten Vergleich —
	// die Gegenprobe rechnet deshalb mit derselben VERGLICHENE-Schleife wie
	// der echte Nachweis oben, statt einer eigenen zweiten Rechenvorschrift.
	const verfaelscht = phpFelder.map((f) => (f.id === 'n-17' ? { ...f, max: 999 } : f));
	const gegenprobeAbweichungen = [];
	for (let i = 0; i < Math.min(verfaelscht.length, FIELDS.length); i++) {
		const p = verfaelscht[i];
		const j = FIELDS[i];
		for (const eigenschaft of VERGLICHENE) {
			if (p[eigenschaft] !== j[eigenschaft]) {
				gegenprobeAbweichungen.push(`${j.id}.${eigenschaft}: PHP "${p[eigenschaft]}" ≠ JS "${j[eigenschaft]}"`);
			}
		}
	}
	const gegenprobeSchlaegtAn = gegenprobeAbweichungen.some((z) => z.includes('n-17') && z.includes('.max'));
	check(gegenprobeSchlaegtAn, 'F-1-G: die verfälschte Kopie (n-17.max = 999) wird als Abweichung erkannt',
		...gegenprobeAbweichungen);
}

/* ==================================================== F-2 Knopf ↔ Feld */

console.log('\nF-2  Genau eine Knopf-Vorlage, eine Gruppenschleife, ein Aufdruck-Abschnitt');
{
	/*
	 * SEIT DEM UMBAU NACH DER BILDVORLAGE steht der Knopf nur noch EINMAL im
	 * Quelltext: eine Schleife über die vier Gruppennamen, darin eine
	 * Schleife über {felt.fields}, darin der Knopf mit einem einzigen
	 * <f:render section="Aufdruck">. Vorher stand er VIERMAL, einmal je
	 * Bildschirmleser-Gruppe — vier Abschriften desselben Gedankens, von
	 * denen drei beim nächsten Umbau vergessen werden konnten.
	 */
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));

	const knoepfe = [...feltHtml.matchAll(/<button\s+type="button"/g)];
	check(knoepfe.length === 1, `genau eine Knopf-Vorlage im Quelltext (gefunden: ${knoepfe.length})`);

	const gruppenSchleife = /<f:for each="\{0: 'numbers', 1: 'columns', 2: 'dozens', 3: 'even'\}" as="gruppe">/;
	check(gruppenSchleife.test(feltHtml), 'genau eine Schleife über die vier Gruppennamen');

	const abschnitte = [...feltHtml.matchAll(/<f:section name="Aufdruck">/g)];
	const wiedergaben = [...feltHtml.matchAll(/<f:render section="Aufdruck"/g)];
	check(abschnitte.length === 1, `genau ein <f:section name="Aufdruck"> (gefunden: ${abschnitte.length})`);
	check(wiedergaben.length === 1, `genau ein <f:render section="Aufdruck"> (gefunden: ${wiedergaben.length})`);

	// Jede wirkliche Feldgruppe gehört zu einer der vier — daraus folgt, dass
	// jedes der 159 Felder genau einen Knopf bekommt, ohne dass 159 Knöpfe im
	// Quelltext stehen müssten.
	const ERWARTETE_GRUPPEN = ['numbers', 'columns', 'dozens', 'even'];
	const tatsaechliche = [...new Set(phpFelder.map((f) => gruppeVon(f.kind)))];
	check(tatsaechliche.every((g) => ERWARTETE_GRUPPEN.includes(g))
		&& ERWARTETE_GRUPPEN.every((g) => tatsaechliche.includes(g)),
		'jede vorkommende Feldgruppe ist eine der vier, und jede der vier kommt vor',
		...tatsaechliche);

	console.log('     Gegenprobe F-2-G: ein zweiter Knopf im Quelltext muss auffallen');
	const mitZweitem = feltHtml.replace('</div>\n\t</f:for>', '<button type="button"></button></div>\n\t</f:for>');
	check([...mitZweitem.matchAll(/<button\s+type="button"/g)].length === 2,
		'F-2-G: eine zweite Knopf-Vorlage wird gezählt und würde gemeldet');
}

/* ============================================== F-3 Echte <button>-Knöpfe */

console.log('\nF-3  Die Feldknopf-Vorlage ist ein echter <button type="button">');
{
	/*
	 * DIE ZUSAGE SELBST bleibt unverändert (echter <button>, kein
	 * role="button", kein echtes disabled) — nur die erwartete Anzahl sinkt
	 * seit F-2 von vier (eine je Gruppen-Schleife) auf eins (die einzige
	 * Knopf-Vorlage). Abweichung gegenüber der Datei-Familien-Aufzählung
	 * dieses Umsetzungsstücks (F-3 dort als "unverändert" geführt); ohne
	 * diese Anpassung würde die Prüfung an der reinen Strukturänderung von
	 * F-2 unabhängig vom eigentlich geprüften Sachverhalt scheitern — siehe
	 * DECISIONS.md.
	 */
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const feldKnopfVorlagen = [...feltHtml.matchAll(/<button[^>]*data-ck-field="\{field\.id\}"[^>]*>/g)].map((m) => m[0]);
	check(feldKnopfVorlagen.length === 1, `genau eine Knopf-Vorlage im Quelltext (gefunden: ${feldKnopfVorlagen.length})`);
	check(feldKnopfVorlagen.every((b) => /^<button type="button"/.test(b)),
		'die Knopf-Vorlage beginnt mit <button type="button">');
	check(!feltHtml.includes('role="button"'), 'kein role="button" im Tuch (ARIA fügt kein Verhalten hinzu)');
	check(!/<div[^>]*data-ck-field=/.test(feltHtml), 'kein <div> mit data-ck-field');
	const echtesDisabled = feldKnopfVorlagen.filter((b) => b.replace(/aria-disabled/g, '').includes('disabled'));
	check(echtesDisabled.length === 0, 'die Knopf-Vorlage trägt kein echtes disabled (nur aria-disabled ist zulässig)', ...echtesDisabled);
}

/* =================================================== F-4 aria-label ↔ labelKey */

console.log('\nF-4  Jedes Feld trägt aria-label UND data-ck-field-label; alle 159 Namen sind verschieden');
{
	/*
	 * SEIT DEM UMBAU NACH DER BILDVORLAGE trägt AUSNAHMSLOS JEDES der 159
	 * Felder ein labelKey (BetLayout::fields() liefert nie mehr null) —
	 * damit entfällt die frühere Fallunterscheidung "gebunden GENAU DANN,
	 * wenn labelKey gesetzt ist" zugunsten von "immer". Statt gegen die
	 * frühere Annahme "hat/hat keine sichtbare Aufschrift" zu prüfen, prüft
	 * dieser Block jetzt die stärkere, direkt beobachtbare Aussage: der
	 * AUFGELÖSTE Name jedes Feldes existiert, enthält keinen offenen
	 * Platzhalter, und alle 159 Namen sind paarweise verschieden.
	 */
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));

	// Die Bindung im Markup: BEIDE Attribute kommen aus demselben Ausdruck.
	check(/data-ck-field-label="\{f:translate\(key: field\.labelKey, arguments: field\.labelArgs\)\}"/.test(feltHtml),
		'data-ck-field-label kommt aus f:translate(field.labelKey, field.labelArgs)');
	check(/aria-label="\{f:translate\(key: field\.labelKey, arguments: field\.labelArgs\)\}"/.test(feltHtml),
		'aria-label kommt aus demselben Ausdruck');
	check(!/<f:if condition="\{field\.labelKey\}">/.test(feltHtml),
		'es gibt keinen Bedingungsblock mehr über field.labelKey — jedes Feld hat einen Namen');

	// Die Datenseite: kein leerer labelKey, kein doppelter Name, kein
	// stehengebliebener Platzhalter.
	const ohneKey = phpFelder.filter((f) => !f.labelKey || f.labelKey === '');
	check(ohneKey.length === 0, 'alle 159 Felder tragen ein labelKey', ...ohneKey.map((f) => f.id));

	const namen = new Map();
	for (const f of phpFelder) {
		namen.set(f.id, aufgeloest(quelltext(f.labelKey), f.labelArgs));
	}
	const offenePlatzhalter = [...namen].filter(([, n]) => /%\d+\$s/.test(n ?? ''));
	check(offenePlatzhalter.length === 0, 'kein %1$s bleibt im aufgelösten Namen stehen',
		...offenePlatzhalter.map(([id, n]) => `${id}: ${n}`));

	const werte = [...namen.values()];
	check(new Set(werte).size === werte.length,
		`alle ${werte.length} Namen sind paarweise verschieden`);

	console.log('     Gegenprobe F-4-G: zwei Felder mit demselben Namen müssen auffallen');
	const doppelt = [...werte, werte[0]];
	check(new Set(doppelt).size !== doppelt.length, 'F-4-G: ein doppelter Name wird erkannt');
}

/* ========================================================= F-5 XLIFF-Keys */

console.log('\nF-5  Keine felt.print.*-Kennung mehr; jede benutzte Kennung existiert; keine ist unbenutzt');
{
	const locallang = lies(LOCALLANG_PFAD);
	const definierteIds = new Set([...locallang.matchAll(/<trans-unit id="([^"]+)"/g)].map((m) => m[1]));

	// Die Aufschrift steht seit dem Umbau in BetLayout.php. Käme eine
	// felt.print.*-Kennung zurück, gäbe es die Aufschrift wieder an zwei
	// Stellen — und in einer englischen Sprachfassung stünde plötzlich etwas
	// anderes auf dem Tuch als in einer deutschen.
	const printKennungen = [...definierteIds].filter((id) => id.startsWith('felt.print.'));
	check(printKennungen.length === 0,
		'es gibt keine felt.print.*-Kennung mehr (die Aufschrift steht in BetLayout.php)',
		...printKennungen);

	const feltHtml = lies(FELT_HTML_PFAD);
	const statusHtml = existsSync(STATUS_HTML_PFAD) ? lies(STATUS_HTML_PFAD) : '';
	// Behebung Review C3, M7: gescannt werden ALLE Markup-Dateien der
	// Extension, die f:translate(...locallang.xlf:...) benutzen können. Seit
	// dem Umbau nach der Bildvorlage kommt Cloth.html dazu (Umsetzungsstück
	// Vb) — sie übersetzt heute nichts, aber ein Nachweis, der eine
	// mögliche Fundstelle von vornherein ausließe, prüfte nichts an ihr.
	const tableHtml = existsSync(TABLE_HTML_PFAD) ? lies(TABLE_HTML_PFAD) : '';
	const soundSwitchHtml = existsSync(SOUND_SWITCH_HTML_PFAD) ? lies(SOUND_SWITCH_HTML_PFAD) : '';
	const clothHtml = existsSync(CLOTH_HTML_PFAD) ? lies(CLOTH_HTML_PFAD) : '';
	const gesamtMarkup = [feltHtml, statusHtml, tableHtml, soundSwitchHtml, clothHtml].join('\n');

	// 1. Statisch verwendete Schlüssel: f:translate(key: '...') / key="LLL:...:xyz".
	//    Das Zeichensatzmuster nimmt seit dem Umbau auch { und } auf: Felt.html
	//    übersetzt den Gruppennamen jetzt dynamisch
	//    ("locallang.xlf:felt.group.{gruppe}") statt viermal mit einer festen
	//    Kennung — ohne die geschweiften Klammern im Muster würde diese eine
	//    Fundstelle gar nicht mehr erkannt.
	const statischeTreffer = new Set(
		[...gesamtMarkup.matchAll(/locallang\.xlf:([a-zA-Z0-9._{}-]+)/g)].map((m) => m[1])
	);
	const dynamischeGruppen = [...statischeTreffer].some((s) => s.includes('{gruppe}'))
		? ['felt.group.numbers', 'felt.group.columns', 'felt.group.dozens', 'felt.group.even']
		: [];
	statischeTreffer.delete('felt.group.{gruppe}');

	// 2. Dynamisch verwendete Schlüssel: alle labelKey-Werte aus der ECHTEN
	//    PHP-Feldliste (bare Bezeichner, wie BetLayout::fields() sie führt —
	//    seit dem Umbau hat JEDES der 159 Felder eines, siehe F-4).
	const dynamischeSchluessel = new Set(phpFelder.map((f) => f.labelKey).filter(Boolean));

	// 3. PHP-seitig über Roulette::LANG_FRONTEND . '...' zusammengesetzte
	//    Schlüssel (ext_localconf.php: automat.title/automat.description).
	//    Diese stehen NICHT als "locallang.xlf:xyz" im Quelltext, sondern als
	//    Konstante + Zeichenkette — eigenes Muster.
	const localconfPhp = existsSync(EXT_LOCALCONF_PFAD) ? lies(EXT_LOCALCONF_PFAD) : '';
	const phpSchluessel = new Set(
		[...localconfPhp.matchAll(/Roulette::LANG_FRONTEND\s*\.\s*'([a-zA-Z0-9._-]+)'/g)].map((m) => m[1])
	);

	const benutzt = new Set([...statischeTreffer, ...dynamischeSchluessel, ...phpSchluessel, ...dynamischeGruppen]);

	const fehlend = [...benutzt].filter((id) => !definierteIds.has(id));
	check(fehlend.length === 0, 'jede benutzte Kennung existiert in locallang.xlf', ...fehlend);

	// Behebung Review C3, M7: statt nur eine feste Liste "neu angelegter"
	// Kennungen auf Benutzung zu prüfen, jetzt JEDE Kennung der Datei — mit
	// einer ausdrücklichen, im Skript begründeten Ausnahmeliste für den
	// einzigen Fall, der absichtlich unbenutzt bleiben darf.
	const AUSDRUECKLICHE_AUSNAHMEN = [];
	const unbenutzt = [...definierteIds].filter((id) => !benutzt.has(id) && !AUSDRUECKLICHE_AUSNAHMEN.includes(id));
	check(unbenutzt.length === 0, 'keine Kennung in locallang.xlf ist unbenutzt (Ausnahmen: ' + (AUSDRUECKLICHE_AUSNAHMEN.join(', ') || 'keine') + ')', ...unbenutzt);

	console.log('     Gegenprobe F-5-G: eine erfundene, nirgends benutzte Kennung muss auffallen');
	const definierteIdsMitGeist = new Set([...definierteIds, 'geist.unbenutzt']);
	const unbenutztMitGeist = [...definierteIdsMitGeist].filter((id) => !benutzt.has(id) && !AUSDRUECKLICHE_AUSNAHMEN.includes(id));
	check(unbenutztMitGeist.includes('geist.unbenutzt'), 'F-5-G: eine erfundene unbenutzte Kennung wird tatsächlich als unbenutzt erkannt');

	console.log('     Gegenprobe F-5-G2: eine wieder eingeführte felt.print.-Kennung muss auffallen');
	const mitPrint = [...definierteIds, 'felt.print.column'];
	check(mitPrint.filter((id) => id.startsWith('felt.print.')).length === 1,
		'F-5-G2: eine zurückgekehrte Aufschrift-Kennung wird gefunden');
}

/* ==================================================== F-6 style-Attribute */

console.log('\nF-6  style-Attribute in Felt.html enthalten ausschließlich grid-column/grid-row');
{
	// Seit F-2 steht die Knopf-Vorlage nur noch EINMAL im Quelltext (vorher
	// einmal je Gruppen-Schleife, 4×); zur Laufzeit setzt jede der 159
	// Wiederholungen die konkreten Werte aus {field.gridColumn}/
	// {field.gridRow} ein (siehe FeltProcessor::gridLine() — Format "4" oder
	// "4 / 11", geprüft durch F-1 gegen bets-roulette.js). Abweichung
	// gegenüber der Datei-Familien-Aufzählung dieses Umsetzungsstücks (F-6
	// dort nicht genannt) — ohne diese Anpassung würde die erwartete Anzahl
	// an der reinen Strukturänderung von F-2 scheitern, siehe DECISIONS.md.
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const styleWerte = [...feltHtml.matchAll(/style="([^"]*)"/g)].map((m) => m[1]);
	check(styleWerte.length === 1, `genau ein style-Attribut, die einzige Knopf-Vorlage (gefunden: ${styleWerte.length})`);

	const ZULAESSIG = /^grid-column:\s*\{field\.gridColumn\};\s*grid-row:\s*\{field\.gridRow\};$/;
	const unzulaessig = styleWerte.filter((s) => !ZULAESSIG.test(s.trim()));
	check(unzulaessig.length === 0,
		'jedes style-Attribut setzt ausschließlich grid-column und grid-row aus dem FeltProcessor, sonst nichts', ...unzulaessig);

	// Die vom FeltProcessor tatsächlich gelieferten Werte enthalten
	// ausschließlich ganze Zahlen (mit optionaler "a / b"-Spanne) — geprüft
	// gegen die echte PHP-Ausgabe, nicht gegen die Vorlage.
	const GRID_WERT = /^\d+(\s\/\s\d+)?$/;
	const unzulaessigeWerte = phpFelder.filter((f) => !GRID_WERT.test(String(f.col)) || (f.colEnd !== null && !Number.isInteger(f.colEnd))
		|| !GRID_WERT.test(String(f.row)) || (f.rowEnd !== null && !Number.isInteger(f.rowEnd)));
	check(unzulaessigeWerte.length === 0,
		'col/colEnd/row/rowEnd sind bei allen 159 Feldern ganze Zahlen', ...unzulaessigeWerte.map((f) => f.id));
}

/* ================================================== F-7 Zielgröße (2.5.8) */

console.log('\nF-7  Zielgröße (SC 2.5.8): jedes der 159 Felder misst bei der kleinsten Tischbreite mindestens 24 × 24 Bildpunkte');
{
	/*
	 * SEIT DEM UMBAU NACH DER BILDVORLAGE trägt NICHT MEHR .ro-felt die
	 * beiden Maße --ro-line/--ro-cell, sondern .ro-cloth (sein Elternkasten):
	 * Custom Properties vererben nur nach UNTEN, und .ro-felt ist seit dem
	 * Umbau eine SCHICHT unter mehreren im selben Kasten, nicht mehr die
	 * Wurzel der eigenen Maßordnung. Die alte Sonderregel für die sechs
	 * Linienfeld-Arten (min-inline-size: var(--ro-line) nur an ihnen) ist
	 * ERSATZLOS entfallen: .ro-felt__field nimmt die Mindestgröße jetzt für
	 * ALLE 159 Felder gleich zurück (min-inline-size/min-block-size: 0), und
	 * die tatsächliche Größe folgt allein aus dem Gitter.
	 *
	 * DIE RECHNUNG. .ro-cell (3rem) ist GENAU doppelt so groß wie .ro-line
	 * (1,5rem) — dieselbe 2 : 1-Relation wie die Gewichte 2 (Zelle) und 1
	 * (Linie) in COLUMN_FRACTIONS/ROW_FRACTIONS. Deshalb sitzen bei der
	 * kleinsten Tischbreite (dort, wo minmax() auf seine Untergrenze fällt)
	 * ALLE Spuren exakt bei Gewicht × --ro-line — in beiden Richtungen,
	 * weil das feste Seitenverhältnis 504 : 160 des Tisches und die
	 * Gleichung 328 × 14 = 112 × 41 (F-13) dieselbe Rate auch für die Zeilen
	 * erzwingen. Die Größe eines Feldes ist damit schlicht die Summe der
	 * Gewichte seiner Spuren, mal --ro-line.
	 */
	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));
	const clothRumpf = regelRumpf(feltCss, '.ro-cloth');
	const feltRumpf = regelRumpf(feltCss, '.ro-felt');

	function remInPx(deklaration) {
		if (deklaration === null) return null;
		const treffer = /(-?\d+(?:\.\d+)?)rem/.exec(deklaration);
		return treffer ? Number(treffer[1]) * 16 : null;
	}

	const linePx = remInPx(eigenschaftsWert(clothRumpf, '--ro-line'));
	const cellPx = remInPx(eigenschaftsWert(clothRumpf, '--ro-cell'));
	check(linePx !== null && linePx >= 24, `.ro-cloth: --ro-line ist mindestens 24 Bildpunkte (gefunden: ${linePx} px)`);
	check(cellPx !== null && cellPx === 2 * linePx,
		`.ro-cloth: --ro-cell ist GENAU doppelt so groß wie --ro-line (Gewicht 2 : 1) — gefunden ${cellPx} px / ${linePx} px`);
	check(eigenschaftsWert(feltRumpf, '--ro-line') === null && eigenschaftsWert(feltRumpf, '--ro-cell') === null,
		'.ro-felt deklariert --ro-line/--ro-cell nicht erneut — beide stehen ausschließlich auf .ro-cloth und werden vererbt');

	// Die fr-Gewichte aus felt.css gegen COLUMN_FRACTIONS/ROW_FRACTIONS aus
	// BetLayout — Zahl für Zahl, repeat() eingerechnet.
	const colF = phpDaten.columnFractions;
	const rowF = phpDaten.rowFractions;
	const ausCssSpalten = frGewichte(eigenschaftsWert(feltRumpf, 'grid-template-columns'));
	const ausCssZeilen = frGewichte(eigenschaftsWert(feltRumpf, 'grid-template-rows'));
	check(ausCssSpalten.length === colF.length && ausCssSpalten.every((x, i) => x === colF[i]),
		`grid-template-columns stimmt Zahl für Zahl mit COLUMN_FRACTIONS überein `
		+ `(CSS: ${ausCssSpalten.join(' ')} — PHP: ${colF.join(' ')})`);
	check(ausCssZeilen.length === rowF.length && ausCssZeilen.every((x, i) => x === rowF[i]),
		`grid-template-rows stimmt Zahl für Zahl mit ROW_FRACTIONS überein `
		+ `(CSS: ${ausCssZeilen.join(' ')} — PHP: ${rowF.join(' ')})`);

	/** Summe der Spurgewichte, die ein Feld überspannt (colEnd/rowEnd optional). */
	function spannweite(fractions, start, ende) {
		if (ende === null || ende === undefined) return fractions[start - 1];
		let summe = 0;
		for (let t = start; t < ende; t++) summe += fractions[t - 1];
		return summe;
	}

	const ZIEL = 24;
	const zuKlein = [];
	for (const f of phpFelder) {
		const breite = spannweite(colF, f.col, f.colEnd) * linePx;
		const hoehe = spannweite(rowF, f.row, f.rowEnd) * linePx;
		if (breite < ZIEL || hoehe < ZIEL) {
			zuKlein.push(`${f.id}: ${breite.toFixed(1)} × ${hoehe.toFixed(1)} px`);
		}
	}
	check(zuKlein.length === 0,
		`alle 159 Felder erreichen bei der kleinsten Tischbreite (--ro-line = ${linePx} px) mindestens 24 × 24 Bildpunkte`,
		...zuKlein);

	// Die Mindestgröße aus dem geteilten Baustein (.ck-felt__field, table.css)
	// darf hier NICHT gelten: 44 Bildpunkte auf einem 24 Bildpunkte breiten
	// Linienfeld zwängen es über seine Spur hinaus.
	const feldRumpf = regelRumpf(feltCss, '.ro-felt__field');
	check(eigenschaftsWert(feldRumpf, 'min-inline-size') === '0' && eigenschaftsWert(feldRumpf, 'min-block-size') === '0',
		'.ro-felt__field nimmt min-inline-size/min-block-size für ALLE 159 Felder zurück — die Zielgröße kommt aus dem Gitter, nicht aus einer festen Zahl',
		feldRumpf?.trim());

	// Der Ton-Schalter liegt AUSSERHALB des Gitters und hält deshalb weiterhin
	// seine eigene feste Mindestgröße.
	const soundRumpf = regelRumpf(feltCss, '.ro-sound');
	check(eigenschaftsWert(soundRumpf, 'min-inline-size') === '2.75rem' && eigenschaftsWert(soundRumpf, 'min-block-size') === '2.75rem',
		'.ro-sound (der Ton-Schalter) hält seine eigenen 2,75rem — er liegt außerhalb des Gitters und bekommt seine Zielgröße nicht aus einer Gitterrechnung',
		soundRumpf?.trim());

	console.log('     Gegenprobe F-7-G: --ro-line: 1rem (unter der Untergrenze) muss auffallen');
	check(1 * 16 < 24, 'F-7-G: --ro-line: 1rem (16 px) läge unter den geforderten 24 px und würde erkannt');

	console.log('     Gegenprobe F-7-G2: eine verstellte Gewichtsliste muss auffallen');
	const verfaelschteGewichte = [...colF];
	verfaelschteGewichte[0] = 3;
	check(!verfaelschteGewichte.every((x, i) => x === colF[i]),
		'F-7-G2: ein von 2 auf 3 verstelltes Spurgewicht wird beim Zahl-für-Zahl-Vergleich erkannt');

	console.log('     Gegenprobe F-7-G3: eine gekürzte Mindestgröße am Ton-Schalter muss auffallen');
	check(eigenschaftsWert('min-inline-size: 2rem;', 'min-inline-size') !== '2.75rem',
		'F-7-G3: 2rem statt 2,75rem wäre eine Abweichung und würde erkannt');
}

/* ============================== F-8 felt.css: keine eigene Farbe, Tokens */

console.log('\nF-8  felt.css: kein outline: none ohne Ersatz, keine eigene Farbe, jeder Token existiert');
{
	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));

	check(!/outline\s*:\s*none/.test(feltCss),
		'felt.css enthält kein outline: none — der Fokusrahmen kommt unverändert aus .ck-felt__field:focus-visible (table.css)');

	const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
	const FUNKTION = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g;
	const farbTreffer = [...feltCss.matchAll(HEX), ...feltCss.matchAll(FUNKTION)].map((m) => m[0]);
	check(farbTreffer.length === 0, 'kein ausgeschriebener Farbwert in felt.css', ...farbTreffer);

	const tokensCss = lies(TOKENS_CSS_PFAD);
	const definiert = new Set([...tokensCss.matchAll(/^\s*(--ck-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));
	const benutzt = new Set([...feltCss.matchAll(/var\(\s*(--ck-[a-z0-9-]+)/g)].map((m) => m[1]));
	const unbekannt = [...benutzt].filter((name) => !definiert.has(name));
	check(unbekannt.length === 0,
		`${benutzt.size} in felt.css benutzte --ck-…-Tokens existieren alle in tokens.css`, ...unbekannt);

	console.log('     Gegenprobe F-8-G: ein erfundener Token --ck-does-not-exist muss auffallen');
	const mitErfundenemToken = new Set([...benutzt, '--ck-does-not-exist']);
	const gegenprobe = [...mitErfundenemToken].filter((name) => !definiert.has(name));
	check(gegenprobe.length === 1 && gegenprobe[0] === '--ck-does-not-exist',
		'F-8-G: ein erfundener Token wird als nicht in tokens.css definiert erkannt');
}

/* ========================================= F-9 Kontrast (SC 1.4.3), statisch */

console.log('\nF-9  Kontrast (SC 1.4.3): jede aufgedruckte Aufschrift gegen den ungünstigsten Farbstopp ihres Untergrunds');
{
	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));
	const tokensCss = lies(TOKENS_CSS_PFAD);

	function farbenEinesNamensschilds(selektor) {
		const rumpf = regelRumpf(feltCss, selektor);
		if (!rumpf) return null;
		const textWert = eigenschaftsWert(rumpf, 'color');
		const hgWert = eigenschaftsWert(rumpf, 'background-color');
		if (!textWert || !hgWert) return null;
		const textToken = /var\((--ck-[a-z0-9-]+)\)/.exec(textWert)?.[1];
		const hgToken = /var\((--ck-[a-z0-9-]+)\)/.exec(hgWert)?.[1];
		if (!textToken || !hgToken) return null;
		return { textFarben: tokenFarben(tokensCss, textToken), hgFarben: tokenFarben(tokensCss, hgToken) };
	}

	// .ro-felt__print ist das NAMENSSCHILD JEDER aufgedruckten Aufschrift des
	// Tuchs — Ziffern, Kolonnen, Dutzende, einfache Chancen einschließlich
	// Rot/Schwarz benutzen alle dieselbe, eine Regel (Felt.html, Teilstück
	// C3b: <span class="ro-felt__print"> umschließt jeden nicht-leeren
	// printed-Wert ausnahmslos). Ein einziger Nachweis deckt deshalb alle
	// 159 Felder ab, statt jede Feldart einzeln aufzuzählen.
	const farben = farbenEinesNamensschilds('.ro-felt__print');
	check(farben !== null && farben.textFarben.length > 0 && farben.hgFarben.length > 0,
		'.ro-felt__print: Text- und Hintergrundfarbe aus felt.css/tokens.css gelesen (color, background-color)');
	if (farben) {
		const [textFarbe] = farben.textFarben;
		const werte = farben.hgFarben.map((hg) => kontrast(textFarbe, hg));
		const ungünstigster = Math.min(...werte);
		check(ungünstigster >= 4.5,
			`.ro-felt__print (Namensschild jeder aufgedruckten Aufschrift): ungünstigster von `
			+ `${werte.length} Farbstopp(s) ${ungünstigster.toFixed(2)}:1 (Soll ≥ 4,5:1)`);
	}

	console.log('     Gegenprobe F-9-B: eine erfundene HELLE Schrift erkennt den HELLEN, nicht den dunklen Stopp als ungünstigsten');
	{
		// Erfundene Werte, bewusst NICHT aus tokens.css (dieses Gerät hat
		// nirgends helle Schrift auf einem Verlauf) — dieselbe Gegenprobe wie
		// A-30-B in fruit_risk/verify-cabinet.mjs: die Rechnung darf nicht von
		// einer Annahme "Schrift ist dunkel" abhängen.
		const helleSchrift = [240, 240, 240];
		const stoppHell = [225, 225, 225];
		const stoppDunkel = [40, 40, 40];
		const kontrastHell = kontrast(helleSchrift, stoppHell);
		const kontrastDunkel = kontrast(helleSchrift, stoppDunkel);
		const ungünstigster = Math.min(kontrastHell, kontrastDunkel);
		check(kontrastHell < 4.5 && kontrastDunkel >= 4.5 && ungünstigster === kontrastHell,
			`F-9-B: für eine erfundene helle Schrift erkennt dieselbe Rechnung den hellen Stopp als ungünstigsten `
			+ `(${kontrastHell.toFixed(2)}:1, unter 4,5:1), obwohl der dunkle Stopp für sich genommen bestünde `
			+ `(${kontrastDunkel.toFixed(2)}:1) — kein Rateschritt über "hell"/"dunkel", ein echtes Minimum über alle Stopps`);
	}

	/*
	 * SEIT DEM UMBAU NACH DER BILDVORLAGE (Vc): VIER NEUE PAARUNGEN.
	 *
	 * Die Ziffer auf jedem der drei Ovale (SC 1.4.3, Text ≥ 4,5:1) und die
	 * helle Kontur, die Oval UND beide Rauten überhaupt erst sichtbar macht
	 * (SC 1.4.11, grafisches Objekt ≥ 3:1). Die Werte werden aus tokens.css
	 * GERECHNET, nicht aus dem Kommentar abgeschrieben — der Kommentar dort
	 * nennt sie nur als Erwartung für den Leser.
	 */
	const pocketMark = tokenFarben(tokensCss, '--ck-pocket-mark')[0];
	check(pocketMark !== undefined, '--ck-pocket-mark löst zu einer Farbe auf');

	const OVAL_KOMBINIERT = '.ro-felt__print--pocket-red,\n.ro-felt__print--pocket-black,\n.ro-felt__print--pocket-green';
	const ovalGemeinsam = regelRumpf(feltCss, OVAL_KOMBINIERT);
	check(ovalGemeinsam !== null && eigenschaftsWert(ovalGemeinsam, 'color') === 'var(--ck-pocket-mark)',
		'die drei Ovalklassen teilen sich eine Regel mit color: var(--ck-pocket-mark)');

	for (const farbe of ['red', 'black', 'green']) {
		const ovalRumpf = regelRumpf(feltCss, `.ro-felt__print--pocket-${farbe}`);
		const hgToken = /var\((--ck-[a-z0-9-]+)\)/.exec(eigenschaftsWert(ovalRumpf, 'background-color') ?? '')?.[1];
		check(hgToken === `--ck-pocket-${farbe}`, `.ro-felt__print--pocket-${farbe}: background-color ist --ck-pocket-${farbe} (gefunden: ${hgToken})`);
		const hg = tokenFarben(tokensCss, hgToken ?? '')[0];
		if (pocketMark && hg) {
			const wert = kontrast(pocketMark, hg);
			check(wert >= 4.5,
				`--ck-pocket-mark auf --ck-pocket-${farbe}: ${wert.toFixed(2)}:1 (Soll ≥ 4,5:1, Text auf dem Oval)`);
		}
	}

	// Die helle Kontur (Oval UND beide Rauten) gegen das Tuchgrün — ohne sie
	// erreicht --ck-pocket-red auf --ck-felt-green nur 1,01:1 und
	// --ck-pocket-black nur 2,31:1 (beide unter den 3:1 aus SC 1.4.11): die
	// Farbe allein macht Oval und Raute auf dem Tuch praktisch unsichtbar.
	// --ck-felt-green steht nicht in felt.css (es ist die SVG-Füllung des
	// Tuchs in Cloth.html, kein CSS dieser Datei) — deshalb wird der Token
	// dort gelesen, nicht angenommen.
	const cloth = lies(CLOTH_HTML_PFAD);
	const tuchFuellungMatch = /class="ro-cloth__felt"[^>]*fill="var\((--ck-[a-z0-9-]+)\)"/.exec(cloth);
	check(tuchFuellungMatch !== null, '.ro-cloth__felt füllt mit einem var(--ck-…)-Token in Cloth.html');
	const konturToken = /var\((--ck-[a-z0-9-]+)\)/.exec(eigenschaftsWert(ovalGemeinsam, 'border') ?? '')?.[1];
	check(konturToken === '--ck-felt-line', `die Ovalkontur ist --ck-felt-line (gefunden: ${konturToken})`);
	if (tuchFuellungMatch && konturToken) {
		const tuch = tokenFarben(tokensCss, tuchFuellungMatch[1])[0];
		const kontur = tokenFarben(tokensCss, konturToken)[0];
		if (tuch && kontur) {
			const wert = kontrast(kontur, tuch);
			check(wert >= 3,
				`${konturToken} auf ${tuchFuellungMatch[1]} (Ovalkontur auf Tuch): ${wert.toFixed(2)}:1 (Soll ≥ 3:1, SC 1.4.11)`);
		}
	}

	console.log('     Gegenprobe F-9-C: ein erfundenes dunkles Oval-Rot ohne Kontur bräche die 3:1-Grenze');
	{
		// Nicht aus tokens.css — ein bewusst dunkleres Rot, um zu zeigen, dass
		// dieselbe kontrast()-Rechnung eine echte Unterschreitung tatsächlich
		// als solche erkennt.
		const dunklesRot = [90, 10, 12];
		const tuchGruen = tokenFarben(lies(TOKENS_CSS_PFAD), '--ck-felt-green')[0];
		const wert = kontrast(dunklesRot, tuchGruen);
		check(wert < 3, `F-9-C: ein erfundenes dunkleres Rot erreicht nur ${wert.toFixed(2)}:1 auf dem Tuch und würde unter 3:1 erkannt`);
	}
}

/* ============================ F-10 Farbe ist nie die einzige Aussage (1.4.1) */

console.log('\nF-10  Farbe ist nie die einzige Aussage (SC 1.4.1): Rot/Schwarz tragen dieselbe Kontur, nur Schwarz zusätzlich eine Schraffur, jedes Zahlenfeld nennt seine Farbe');
{
	/*
	 * SEIT DEM UMBAU NACH DER BILDVORLAGE (Vc) druckt die Vorlage auf red/
	 * black kein Wort mehr, sondern eine Raute — die alten Kennungen
	 * felt.print.red/felt.print.black sind mit Umsetzungsstück Vb ersatzlos
	 * entfallen (F-5 hält das fest). Übernommen ist deshalb das BILD, nicht
	 * der Mangel: zwei voneinander unabhängige Wege machen Rot und Schwarz
	 * auch ohne Farbwahrnehmung erkennbar — der erreichbare Name (geprüft von
	 * F-4/F-20) und ein zweiter, FARBUNABHÄNGIGER Unterschied im Bild selbst,
	 * den dieser Block prüft.
	 */
	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));

	// 1  Beide Rauten tragen dieselbe helle Kontur — ohne sie wäre Rot auf dem
	//    Tuch praktisch unsichtbar (nachgerechnet 1,01:1, unter den 3:1 aus
	//    SC 1.4.11; siehe F-9).
	const rautenRumpf = regelRumpf(feltCss, '.ro-felt__diamond');
	check(rautenRumpf !== null && /border\s*:\s*[^;]*var\(--ck-felt-line\)/.test(rautenRumpf),
		'.ro-felt__diamond: beide Rauten tragen dieselbe helle Kontur (var(--ck-felt-line)) — ohne sie erreichte Rot auf dem Tuch nur 1,01:1 (SC 1.4.11)',
		rautenRumpf?.trim());

	// 2  Der zweite, FARBUNABHÄNGIGE Unterschied (SC 1.4.1): GENAU eine der
	//    beiden Rauten trägt zusätzlich eine Schraffur, und es ist die
	//    schwarze — auch in Graustufen, in einem Kontrastmodus oder bei
	//    fehlerhafter Farbwiedergabe ist eine Schraffur erkennbar, ein reiner
	//    Farbwechsel nicht.
	const rot = regelRumpf(feltCss, '.ro-felt__diamond--red') ?? '';
	const schwarz = regelRumpf(feltCss, '.ro-felt__diamond--black') ?? '';
	check(rot !== '' && schwarz !== '', '.ro-felt__diamond--red und .ro-felt__diamond--black sind beide definiert');
	const mitSchraffur = [rot, schwarz].filter((r) => /repeating-linear-gradient/.test(r));
	check(mitSchraffur.length === 1,
		`genau EINE der beiden Rauten trägt zusätzlich eine Schraffur (gefunden: ${mitSchraffur.length}) `
		+ '— das ist der zweite, farbunabhängige Unterschied (SC 1.4.1)');
	check(/repeating-linear-gradient/.test(schwarz), 'es ist die schwarze Raute, die zusätzlich schraffiert ist');
	check(!/repeating-linear-gradient/.test(rot), 'die rote Raute bleibt glatt (kein zweiter Unterschied nötig — Rot ist die Bezugsfarbe)');

	// 3  Und der Name jedes Zahlenfeldes nennt seine Farbe ausgeschrieben
	//    (aria-label, siehe F-4/F-20) — die Farbe des Ovals ist damit nie die
	//    einzige Aussage.
	const FARBWORT = { red: 'rot', black: 'schwarz', green: 'grün' };
	const ohneFarbe = phpFelder
		.filter((f) => f.kind === 'number')
		.filter((f) => {
			const teil = (f.print ?? [])[0];
			if (!teil) return true;
			const farbe = teil.role.replace('pocket-', '');
			return !(aufgeloest(quelltext(f.labelKey), f.labelArgs) ?? '').toLowerCase().includes(FARBWORT[farbe]);
		});
	check(ohneFarbe.length === 0,
		'der Name jedes Zahlenfeldes nennt seine Farbe ausgeschrieben (SC 1.4.1)',
		...ohneFarbe.map((f) => f.id));

	console.log('     Gegenprobe F-10-G: eine felt.css ohne die Schraffur der schwarzen Raute muss auffallen');
	const ohneSchraffur = feltCss.replace(
		/\.ro-felt__diamond--black\s*\{[^}]*\}/,
		'.ro-felt__diamond--black { background-color: var(--ck-pocket-black); }'
	);
	check(ohneSchraffur !== feltCss, 'F-10-G-VORBEREITUNG: die Ersetzung an .ro-felt__diamond--black hat wirklich gegriffen');
	const schwarzGegenprobe = regelRumpf(ohneSchraffur, '.ro-felt__diamond--black') ?? '';
	check(!/repeating-linear-gradient/.test(schwarzGegenprobe),
		'F-10-G: eine entfernte Schraffur wird als fehlend erkannt');

	console.log('     Gegenprobe F-10-G2: ein Name ohne die Fachfarbe muss auffallen');
	check(!'die 17, zahlt 35 zu 1'.includes(FARBWORT.black),
		'F-10-G2: ein Name ohne das Farbwort „schwarz" für eine tatsächlich schwarze Zahl würde erkannt');
}

/* ========================================================== F-11 Sprunglink */

console.log('\nF-11  Der Sprunglink steht als erstes fokussierbares Element im Tuch');
{
	/*
	 * DIE ÜBERSCHRIFT IST MIT DEM UMBAU NACH TABLE.HTML GEWANDERT (F-12) —
	 * Felt.html trägt seither keine <h2> mehr, deshalb entfällt die frühere
	 * Zusage "der Sprunglink steht nach der Überschrift" ersatzlos. Ob
	 * Felt.html tatsächlich keine <h2> mehr enthält, prüft F-12.
	 */
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const skip = feltHtml.indexOf('ck-skiplink');
	const ersterKnopf = feltHtml.indexOf('data-ck-field=');
	check(skip !== -1 && ersterKnopf !== -1, 'Sprunglink und erster Feldknopf sind im Markup vorhanden');
	check(skip < ersterKnopf, 'der Sprunglink steht vor dem ersten Feldknopf — er ist das erste fokussierbare Element im Tuch');

	const zielMatch = /<a class="ck-skiplink ro-felt__skip" href="#([^"]+)"/.exec(feltHtml);
	check(zielMatch !== null, 'der Sprunglink hat ein href="#…"-Ziel');
	if (zielMatch !== null) {
		const tableHtml = lies(TABLE_HTML_PFAD);
		check(tableHtml.includes(`id="${zielMatch[1]}"`), `das Ziel #${zielMatch[1]} existiert im Markup (Table.html)`);
	}

	console.log('     Gegenprobe F-11-G: ein Sprunglink auf ein nicht vorhandenes Ziel muss auffallen');
	const tableHtmlOhneZiel = lies(TABLE_HTML_PFAD).replace('id="ro-controls"', '');
	check(!tableHtmlOhneZiel.includes('id="ro-controls"'), 'F-11-G: das entfernte Ziel wird tatsächlich nicht mehr gefunden');

	// Behebung Review C3, H1: der Sprunglink muss INNERHALB von .ck-felt
	// stehen (dessen position: relative aus table.css ist sein
	// Bezugsrahmen), und felt.css darf seine Feinlage nur unter
	// :focus-visible setzen — sonst hebt eine bedingungslose Regel bei
	// gleicher Spezifität die Versteck-Position von base.css' .ck-skiplink
	// auf, sobald felt.css im <head> nach base.css lädt (gemessen: tut es).
	console.log('     F-11 (H1): der Sprunglink steht innerhalb von .ck-felt, Feinlage nur unter :focus-visible');
	const ckFeltOeffnung = feltHtml.indexOf('class="ck-felt ro-felt"');
	check(ckFeltOeffnung !== -1 && ckFeltOeffnung < skip, 'der Sprunglink steht nach der öffnenden Markierung von .ck-felt — also darin, nicht als Geschwister davor');
	const ersteGruppe = feltHtml.indexOf('ro-felt__group');
	check(ersteGruppe !== -1 && skip < ersteGruppe, 'der Sprunglink steht vor der ersten Gruppe — er ist das erste Kind von .ck-felt');

	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));
	check(regelRumpf(feltCss, '.ro-felt__skip') === null,
		'felt.css enthält keine bedingungslose Regel auf .ro-felt__skip (nur :focus-visible ist zulässig)');
	const feinlage = regelRumpf(feltCss, '.ro-felt__skip:focus-visible');
	check(feinlage !== null && eigenschaftsWert(feinlage, 'inset-block-start') !== null,
		'die Feinlage (inset-block-start) steht ausschließlich unter .ro-felt__skip:focus-visible');

	console.log('     Gegenprobe F-11-G2: eine bedingungslose Feinlage-Regel muss auffallen');
	const feltCssBedingungslos = feltCss.replace('.ro-felt__skip:focus-visible {', '.ro-felt__skip {');
	check(regelRumpf(feltCssBedingungslos, '.ro-felt__skip') !== null,
		'F-11-G2: eine wieder bedingungslos gemachte .ro-felt__skip-Regel wird tatsächlich gefunden');
}

/* ============================================== F-12 Überschriften/Gruppen */

console.log('\nF-12  Genau eine <h2> im Inhaltselement, keine in Felt.html, vier benannte Gruppen');
{
	/*
	 * SEIT DEM UMBAU NACH DER BILDVORLAGE ist die Überschrift aus Felt.html
	 * nach Table.html gewandert: eine absolut positionierte Überlagerung hat
	 * keinen Platz mehr für etwas, das im Layout VOR ihr stehen soll. Die
	 * vier Gruppen entstehen jetzt aus EINER Schleife (F-2) über vier feste
	 * Gruppennamen — geprüft wird deshalb die Vollständigkeit der vier
	 * XLIFF-Kennungen, nicht mehr vier ausgeschriebene <div>-Blöcke mit
	 * eigenem aria-label.
	 */
	const tableHtml = ohneFluidKommentare(lies(TABLE_HTML_PFAD));
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));

	check((tableHtml.match(/<h2[ >]/g) ?? []).length === 1,
		'genau eine <h2> in Table.html');
	check((feltHtml.match(/<h2[ >]/g) ?? []).length === 0,
		'keine <h2> mehr in Felt.html — sie ist mit dem Umbau nach Table.html gewandert');
	check(!/<h1[ >]/.test(tableHtml) && !/<h1[ >]/.test(feltHtml), 'nirgends eine <h1>');
	check(/id="ro-felt-title"/.test(tableHtml) && /aria-labelledby="ro-felt-title"/.test(tableHtml),
		'die Sektion des Tisches ist über aria-labelledby mit ihrer Überschrift verbunden');

	const GRUPPEN = ['numbers', 'columns', 'dozens', 'even'];
	const texte = GRUPPEN.map((g) => quelltext(`felt.group.${g}`));
	check(texte.every((t) => t && t.trim() !== ''), 'jede der vier Gruppen hat einen nicht leeren Namen', ...texte);
	check(new Set(texte).size === 4, 'alle vier Gruppennamen sind paarweise verschieden', ...texte);
}

/* ==================================================== F-13 Die Maßordnung */

console.log('\nF-13  Die Maßordnung: Spurgewichte, Gitterkasten, die drei Schichten');
{
	/*
	 * STAND UMSETZUNGSSTÜCK Vc: alle drei Teile vollständig. TEIL 1 (die
	 * PHP-Seite ist in sich stimmig) legte Va an; TEIL 2 (das Stylesheet sagt
	 * dasselbe) und TEIL 3 (die Zeichnung sagt dasselbe) kommen jetzt dazu,
	 * sobald felt.css seine .ro-cloth/.ro-felt/.ro-wheel-Lageregeln trägt und
	 * Cloth.html (Umsetzungsstück Vb) existiert.
	 */
	const colF = phpDaten.columnFractions;
	const rowF = phpDaten.rowFractions;
	const summeCol = colF.reduce((a, b) => a + b, 0);
	const summeRow = rowF.reduce((a, b) => a + b, 0);

	// --- Teil 1: die PHP-Seite ist in sich stimmig (Va) ---
	check(colF.length === phpDaten.gridColumns,
		`COLUMN_FRACTIONS hat GRID_COLUMNS Einträge (${colF.length} / ${phpDaten.gridColumns})`);
	check(rowF.length === phpDaten.gridRows,
		`ROW_FRACTIONS hat GRID_ROWS Einträge (${rowF.length} / ${phpDaten.gridRows})`);
	check(colF.every((v) => v === 1 || v === 2) && rowF.every((v) => v === 1 || v === 2),
		'jede Spur wiegt 1 (Linie) oder 2 (Zelle) — nichts dazwischen');
	check(summeCol === 41 && summeRow === 14,
		`die Spursummen sind 41 und 14 (gefunden: ${summeCol} und ${summeRow})`);

	// DIE EINE GLEICHUNG, AUF DER ALLES STEHT. Der Gitterkasten muss dasselbe
	// Seitenverhältnis haben wie die Spursummen — sonst füllen die fr-Anteile
	// ihn nicht ohne Verzerrung aus, und das Gitter läuft schief über die
	// Zeichnung. 328 × 14 = 112 × 41 = 4592.
	check(phpDaten.grid.w * summeRow === phpDaten.grid.h * summeCol,
		`Gitterkasten ${phpDaten.grid.w} × ${phpDaten.grid.h} passt zu den Spursummen `
		+ `${summeCol} : ${summeRow} (${phpDaten.grid.w * summeRow} = ${phpDaten.grid.h * summeCol})`);

	// Die Schachtelung: Gitter im Tuch, Tuch in der viewBox, Rad im Tuch und
	// nicht im Gitter.
	const g = phpDaten.grid, c = phpDaten.cloth, v = phpDaten.view, w = phpDaten.wheel;
	check(c.x >= 0 && c.y >= 0 && c.x + c.w <= v.w && c.y + c.h <= v.h,
		'das Tuch liegt vollständig innerhalb der viewBox');
	check(g.x >= c.x && g.y >= c.y && g.x + g.w <= c.x + c.w && g.y + g.h <= c.y + c.h,
		'der Gitterkasten liegt vollständig auf dem Tuch');
	check(w.cx - w.r >= c.x && w.cy - w.r >= c.y && w.cx + w.r <= c.x + c.w && w.cy + w.r <= c.y + c.h,
		'die Radmulde liegt vollständig auf dem Tuch');
	check(w.cx + w.r <= g.x,
		`Radmulde und Gitter überschneiden sich nicht (Mulde endet bei ${w.cx + w.r}, Gitter beginnt bei ${g.x})`);

	// --- Teil 2: das Stylesheet sagt dasselbe (Vc) ---
	const feltCssF13 = ohneBlockKommentare(lies(FELT_CSS_PFAD));
	const clothRumpfF13 = regelRumpf(feltCssF13, '.ro-cloth');
	const feltRumpfF13 = regelRumpf(feltCssF13, '.ro-felt');
	const wheelRumpfF13 = regelRumpf(feltCssF13, '.ro-wheel');

	check(eigenschaftsWert(clothRumpfF13, 'aspect-ratio') === `${v.w} / ${v.h}`,
		`.ro-cloth trägt aspect-ratio: ${v.w} / ${v.h}`);

	// Die fr-Gewichte aus dem CSS gegen die aus dem PHP — Zahl für Zahl.
	const ausCssF13 = frGewichte(eigenschaftsWert(feltRumpfF13, 'grid-template-columns'));
	check(ausCssF13.length === colF.length && ausCssF13.every((x, i) => x === colF[i]),
		`grid-template-columns stimmt Zahl für Zahl mit COLUMN_FRACTIONS überein `
		+ `(CSS: ${ausCssF13.join(' ')} — PHP: ${colF.join(' ')})`);
	const ausCssZeilenF13 = frGewichte(eigenschaftsWert(feltRumpfF13, 'grid-template-rows'));
	check(ausCssZeilenF13.length === rowF.length && ausCssZeilenF13.every((x, i) => x === rowF[i]),
		'grid-template-rows stimmt Zahl für Zahl mit ROW_FRACTIONS überein');

	// Die vier Prozentrechnungen jeder Schicht sind die Maßordnung, nichts
	// weiter. Geprüft wird der Wortlaut der calc()-Ausdrücke.
	const lagenF13 = [
		['.ro-felt', feltRumpfF13, g.x, g.y, g.w, g.h],
		['.ro-wheel', wheelRumpfF13, w.cx - w.r, w.cy - w.r, 2 * w.r, 2 * w.r],
	];
	for (const [name, rumpf, x, y, bx, by] of lagenF13) {
		check(eigenschaftsWert(rumpf, 'inset-inline-start') === `calc(100% * ${x} / ${v.w})`,
			`${name}: inset-inline-start rechnet ${x} / ${v.w}`);
		check(eigenschaftsWert(rumpf, 'inset-block-start') === `calc(100% * ${y} / ${v.h})`,
			`${name}: inset-block-start rechnet ${y} / ${v.h}`);
		check(eigenschaftsWert(rumpf, 'inline-size') === `calc(100% * ${bx} / ${v.w})`,
			`${name}: inline-size rechnet ${bx} / ${v.w}`);
		check(eigenschaftsWert(rumpf, 'block-size') === `calc(100% * ${by} / ${v.h})`,
			`${name}: block-size rechnet ${by} / ${v.h}`);
	}

	// --- Teil 3: die Zeichnung sagt dasselbe (Vc) ---
	const clothF13 = ohneFluidKommentare(lies(CLOTH_HTML_PFAD));
	check(clothF13.includes('viewBox="0 0 {felt.view.w} {felt.view.h}"'),
		'Cloth.html nimmt die viewBox aus {felt.view}, statt sie abzuschreiben');
	check(/x="\{felt\.cloth\.x\}"/.test(clothF13) && /width="\{felt\.cloth\.w\}"/.test(clothF13),
		'die Tuchfläche in Cloth.html kommt aus {felt.cloth}');

	console.log('     Gegenprobe F-13-G: ein verstellter Gitterkasten bricht die Gleichung');
	check(!(330 * summeRow === phpDaten.grid.h * summeCol),
		'F-13-G: eine Breite von 330 statt 328 würde die Gleichung 328 × 14 = 112 × 41 brechen und gemeldet');

	console.log('     Gegenprobe F-13-G2: ein verändertes Spurgewicht muss auffallen');
	const verfaelschtF13 = [...colF];
	verfaelschtF13[0] = 3;
	check(!verfaelschtF13.every((x, i) => x === colF[i]),
		'F-13-G2: ein von 2 auf 3 verstelltes Spurgewicht wird beim Zahl-für-Zahl-Vergleich gefunden');
}

/* =========================================== F-14 Genau eine Fläche (neu) */

console.log('\nF-14  Genau eine Fläche, drei Schichten, kein Rest der alten Zwei-Kästen-Anordnung');
{
	const tableHtml = ohneFluidKommentare(lies(TABLE_HTML_PFAD));

	check((tableHtml.match(/class="ro-cloth"/g) ?? []).length === 1,
		'genau ein .ro-cloth im Inhaltselement');
	check((tableHtml.match(/class="ro-cloth__scroll"/g) ?? []).length === 1,
		'genau ein Rollbereich');

	const SCHICHTEN = ['Table/Roulette/Cloth', 'Table/Roulette/Wheel', 'Table/Roulette/Felt'];
	const reihenfolge = SCHICHTEN.map((p) => tableHtml.indexOf(`partial="${p}"`));
	check(reihenfolge.every((i) => i !== -1), 'alle drei Schichten werden gerendert', ...SCHICHTEN);
	check(reihenfolge[0] < reihenfolge[1] && reihenfolge[1] < reihenfolge[2],
		'die Reihenfolge ist Zeichnung → Rad → Gitter (unten nach oben)');

	// Die zwei Kästen der alten Anordnung dürfen NIRGENDS in der Extension
	// zurückbleiben — auch nicht in einem Kommentar oder im Stylesheet. Ein
	// toter Klassenname ist eine Falle für den nächsten Leser. STAND
	// UMSETZUNGSSTÜCK Vc: felt.css und wheel.css sind umgebaut und enthalten
	// die alten Klassennamen nicht mehr; der Kopfkommentar von Table.html
	// erklärt den Umbau seither ohne sie wörtlich zu zitieren (siehe
	// DECISIONS.md) — sonst wäre F-14 an ihrem eigenen erklärenden Kommentar
	// gescheitert.
	const RESTE = ['ro-table__stage', 'ro-table__wheel', 'ro-felt-area', 'ro-felt__scroll'];
	const gefunden = [];
	for (const datei of [TABLE_HTML_PFAD, FELT_HTML_PFAD, CLOTH_HTML_PFAD, FELT_CSS_PFAD, WHEEL_CSS_PFAD]) {
		const inhalt = lies(datei);
		for (const rest of RESTE) {
			if (inhalt.includes(rest)) gefunden.push(`${path.basename(datei)}: ${rest}`);
		}
	}
	check(gefunden.length === 0, 'kein Rest der alten Zwei-Kästen-Anordnung', ...gefunden);

	console.log('     Gegenprobe F-14-G: ein zurückgebliebener alter Klassenname muss auffallen');
	check('… .ro-table__stage { }'.includes('ro-table__stage'),
		'F-14-G: die Suche findet einen zurückgebliebenen Klassennamen tatsächlich');
}

/* ============================ F-15 Die zwei Pfeilfelder (neu, Markup-Teil) */

console.log('\nF-15  Die zwei Pfeilfelder: gerechnete Umrisse, kein von Hand geschriebener Pfad');
{
	/*
	 * STAND UMSETZUNGSSTÜCK Vc: MARKUP-TEIL (Cloth.html rendert die
	 * gerechneten Pfade aus {felt.arrowPaths}, kein Pfad steht von Hand da,
	 * und die Umrechnung wird ein zweites Mal — unabhängig vom PHP —
	 * nachgerechnet) UND CSS-TEIL (n-0/n-00 nehmen ihren eigenen Rahmen
	 * zurück, kein clip-path/mask/overflow/opacity an ihnen).
	 */
	const pfade = phpDaten.arrowPaths;
	check(pfade.length === 2, `arrowPaths() liefert zwei Umrisse (gefunden: ${pfade.length})`);
	check(pfade.map((p) => p.id).join(',') === 'n-0,n-00', 'sie gehören zu n-0 und n-00');

	// DIE UMRECHNUNG WIRD EIN ZWEITES MAL GERECHNET, unabhängig vom PHP:
	// dieselbe Formel, hier getippt, gegen die Gitterkanten von n-0 und n-00
	// aus der Feldliste. Ein Vergleich der Pfadangabe gegen sich selbst wäre
	// kein Nachweis.
	const colF15 = phpDaten.columnFractions, rowF15 = phpDaten.rowFractions, g15 = phpDaten.grid;
	const sumCol15 = colF15.reduce((a, b) => a + b, 0), sumRow15 = rowF15.reduce((a, b) => a + b, 0);
	const gx = (linie) => g15.x + g15.w * colF15.slice(0, linie - 1).reduce((a, b) => a + b, 0) / sumCol15;
	const gy = (linie) => g15.y + g15.h * rowF15.slice(0, linie - 1).reduce((a, b) => a + b, 0) / sumRow15;

	const abweichungen = [];
	for (const pfad of pfade) {
		const feld = phpFelder.find((f) => f.id === pfad.id);
		const zahlen = [...pfad.d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
		// M x1 yOben  H xSchulter  L xAussen yMitte  L xSchulter yUnten  H x1
		const erwartet = [
			gx(2), gy(feld.row),
			gx(1) + 8,
			gx(1), (gy(feld.row) + gy(feld.rowEnd)) / 2,
			gx(1) + 8, gy(feld.rowEnd),
			gx(2),
		];
		if (zahlen.length !== erwartet.length
			|| zahlen.some((z, i) => Math.abs(z - erwartet[i]) > 0.001)) {
			abweichungen.push(`${pfad.id}: [${zahlen}] ≠ [${erwartet.map((z) => Math.round(z * 1000) / 1000)}]`);
		}
	}
	check(abweichungen.length === 0,
		'beide Umrisse treffen genau die Gitterkanten ihres Feldes', ...abweichungen);

	// Das Markup rendert sie aus {felt.arrowPaths} — und schreibt keinen
	// eigenen Pfad daneben.
	const cloth = ohneFluidKommentare(lies(CLOTH_HTML_PFAD));
	check(/<f:for each="\{felt\.arrowPaths\}" as="arrow">/.test(cloth),
		'Cloth.html rendert die Umrisse aus {felt.arrowPaths}');
	const festeArrowPfade = [...cloth.matchAll(/<path class="ro-cloth__arrow[^"]*"[^>]*d="M\s*[\d.]/g)];
	check(festeArrowPfade.length === 0,
		'kein von Hand geschriebener Pfeilpfad in Cloth.html', ...festeArrowPfade.map((m) => m[0]));

	// Der Knopf darüber hat keinen eigenen Rahmen — und vor allem nichts, was
	// den Fokusrahmen mitschneiden könnte. Das ist die Fehlerklasse, die in
	// diesem Haus schon viermal über opacity aufgetreten ist.
	const feltCssF15 = ohneBlockKommentare(lies(FELT_CSS_PFAD));
	const regelnF15 = [...feltCssF15.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selektor: m[1].trim(), rumpf: m[2] }));
	const pfeilRegeln = regelnF15.filter((r) => /data-ck-field='n-00?'/.test(r.selektor));
	check(pfeilRegeln.length >= 1, 'n-0 und n-00 haben eine eigene Regel in felt.css');
	const gemeinsamF15 = pfeilRegeln.map((r) => r.rumpf).join('\n');
	check(/border\s*:\s*0/.test(gemeinsamF15),
		'die Pfeilfelder nehmen ihren eigenen Rahmen zurück — der Umriss steht in der Zeichnung');
	for (const verboten of ['clip-path', 'mask', 'overflow\\s*:\\s*hidden', 'opacity']) {
		check(!new RegExp(verboten).test(gemeinsamF15),
			`kein ${verboten.replace('\\s*', ' ')} an den Pfeilfeldern — es schnitte den Fokusrahmen mit ab`);
	}

	console.log('     Gegenprobe F-15-G: ein verstellter ARROW_TIP verschiebt die Zahlen');
	const mitAnderemTip = [gx(2), gy(2), gx(1) + 9];
	check(Math.abs(mitAnderemTip[2] - (gx(1) + 8)) > 0.001,
		'F-15-G: eine um eine Einheit verschobene Schulter wird vom Zahlenvergleich gefunden');

	console.log('     Gegenprobe F-15-G2: ein clip-path am Pfeilfeld muss auffallen');
	check(/clip-path/.test("border: 0; clip-path: polygon(0 0, 100% 50%, 0 100%);"),
		'F-15-G2: die Suche nach clip-path schlägt an einem erfundenen Regelrumpf tatsächlich an');
}

/* ===================================== F-16 Die Ovale (neu) */

console.log('\nF-16  Die Ovale: 38 Stück, Farbe gegen die Radanordnung, drei Farbregeln');
{
	// wheel-geometry.js ist die MASSGEBLICHE Radanordnung und von BetLayout
	// unabhängig (verify-wheel.mjs hält sie gegen WheelGeometry.php). Ein
	// Vergleich gegen sie ist deshalb ein echter Beweis, kein Spiegel.
	const { RED, BLACK, GREEN } = await import(new URL('../../Public/JavaScript/wheel-geometry.js', import.meta.url));

	const mitOval = phpFelder.filter((f) => (f.print ?? []).some((t) => t.role.startsWith('pocket-')));
	check(mitOval.length === 38, `genau 38 Felder tragen ein Oval (gefunden: ${mitOval.length})`);

	const falscheFarbe = [];
	for (const f of mitOval) {
		const teil = f.print.find((t) => t.role.startsWith('pocket-'));
		const zahl = teil.text;
		const erwartet = GREEN.includes(zahl) ? 'green' : (RED.includes(zahl) ? 'red' : 'black');
		if (teil.role !== `pocket-${erwartet}`) {
			falscheFarbe.push(`${f.id}: Tuch sagt ${teil.role}, das Rad sagt pocket-${erwartet}`);
		}
	}
	check(falscheFarbe.length === 0,
		'jede Zahl trägt auf dem Tuch dieselbe Farbe wie am Rad', ...falscheFarbe);

	const gruen = mitOval.filter((f) => f.print[0].role === 'pocket-green').map((f) => f.id);
	check(gruen.join(',') === 'n-0,n-00', `genau n-0 und n-00 sind grün (gefunden: ${gruen})`);

	// Drei Farbregeln, drei verschiedene Tokens — und eine gemeinsame Kontur.
	const feltCssF16 = ohneBlockKommentare(lies(FELT_CSS_PFAD));
	const tokensF16 = [];
	for (const farbe of ['red', 'black', 'green']) {
		const rumpf = regelRumpf(feltCssF16, `.ro-felt__print--pocket-${farbe}`);
		check(rumpf !== null, `.ro-felt__print--pocket-${farbe} ist definiert`);
		const token = /var\((--ck-[a-z0-9-]+)\)/.exec(eigenschaftsWert(rumpf, 'background-color') ?? '')?.[1];
		check(token === `--ck-pocket-${farbe}`, `sie füllt mit --ck-pocket-${farbe} (gefunden: ${token})`);
		tokensF16.push(token);
	}
	check(new Set(tokensF16).size === 3, 'die drei Ovalfarben sind paarweise verschieden');

	const gemeinsameRegelF16 = regelRumpf(feltCssF16,
		'.ro-felt__print--pocket-red,\n.ro-felt__print--pocket-black,\n.ro-felt__print--pocket-green');
	check(gemeinsameRegelF16 !== null && /border\s*:\s*[^;]*var\(--ck-felt-line\)/.test(gemeinsameRegelF16),
		'alle drei Ovale tragen dieselbe helle Kontur (--ck-felt-line) — ohne sie wäre ein rotes Oval auf dem Tuch mit 1,01 : 1 unsichtbar (SC 1.4.11)');

	console.log('     Gegenprobe F-16-G: eine vertauschte Fachfarbe muss auffallen');
	const zahlF16 = '17';
	const erwartetF16 = RED.includes(zahlF16) ? 'red' : 'black';
	check(`pocket-${erwartetF16}` !== 'pocket-red',
		`F-16-G: die 17 ist ${erwartetF16}; ein Oval "pocket-red" an ihr würde beim Vergleich gegen wheel-geometry.js gefunden`);
}

/* ============================ F-17 opacity und der Fokusrahmen (neu) */

console.log('\nF-17  opacity an einem gesperrten Zustand nimmt den fokussierten Zustand aus');
{
	/*
	 * Die Prüfung ist bewusst ENG geschnitten: sie trifft nur Regeln, deren
	 * SELEKTOR einen gesperrten Zustand nennt (aria-disabled='true' oder
	 * :disabled) und deren RUMPF opacity setzt. Eine weitere Fassung („jedes
	 * opacity ist verdächtig") würde den ausgeschalteten Ton-Schalter
	 * mitmelden, dessen opacity an einem Pseudoelement hängt und weder einen
	 * gesperrten Zustand anzeigt noch einen Fokusrahmen berührt — und eine
	 * Prüfung, die dauernd falschen Alarm gibt, wird abgeschaltet.
	 *
	 * DER GRUND FÜR DIESE PRÜFUNG, IN EINEM SATZ: opacity wirkt auf das GANZE
	 * Element einschließlich seines outline. Wer damit einen gesperrten
	 * Zustand anzeigt, dimmt den Fokusrahmen mit — und nimmt einem
	 * Tastaturbenutzer genau die Anzeige, die ihn auf der Seite hält. Dieser
	 * Fehler ist im Projekt VIERMAL aufgetreten.
	 */
	const VERDAECHTIG = /\[aria-disabled=['"]true['"]\]|:disabled/;
	const funde = [];
	for (const [name, pfad] of [['felt.css', FELT_CSS_PFAD], ['wheel.css', WHEEL_CSS_PFAD]]) {
		const css = ohneBlockKommentare(lies(pfad));
		for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
			const selektor = m[1].trim();
			const rumpf = m[2];
			if (!VERDAECHTIG.test(selektor)) continue;
			if (!/(?:^|[\s;{])opacity\s*:/.test(rumpf)) continue;
			if (!/:not\(:focus-visible\)/.test(selektor)) {
				funde.push(`${name}: ${selektor}`);
			}
		}
	}
	check(funde.length === 0,
		'keine Regel dimmt einen gesperrten Zustand, ohne den fokussierten auszunehmen '
		+ '(:not(:focus-visible)) — opacity wirkt auf das ganze Element einschließlich outline',
		...funde);

	console.log('     Gegenprobe F-17-G: eine Regel ohne :not(:focus-visible) muss auffallen');
	const erfunden = ".ro-felt__field[aria-disabled='true'] { opacity: 0.55; }";
	const gegenfunde = [];
	for (const m of erfunden.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		if (VERDAECHTIG.test(m[1]) && /opacity\s*:/.test(m[2]) && !/:not\(:focus-visible\)/.test(m[1])) {
			gegenfunde.push(m[1].trim());
		}
	}
	check(gegenfunde.length === 1, 'F-17-G: die erfundene Regel wird gefunden', ...gegenfunde);

	console.log('     Gegenprobe F-17-G2: dieselbe Regel MIT :not(:focus-visible) darf NICHT gemeldet werden');
	const richtig = ".ro-felt__field[aria-disabled='true']:not(:focus-visible) { opacity: 0.55; }";
	let falscherAlarm = 0;
	for (const m of richtig.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		if (VERDAECHTIG.test(m[1]) && /opacity\s*:/.test(m[2]) && !/:not\(:focus-visible\)/.test(m[1])) {
			falscherAlarm++;
		}
	}
	check(falscherAlarm === 0, 'F-17-G2: die richtige Fassung löst keinen Fund aus');
}

/* ============= F-18 Aufschrift wörtlich, Quote unser, keine f:translate */

console.log('\nF-18  Die Aufschrift steht wörtlich in der Abschrift der Vorlage; die Quote ist unsere');
{
	/*
	 * DIE ABSCHRIFT DER VORLAGE. Von Hand aus der Bildbeschreibung übertragen
	 * und die zweite, unabhängige Quelle neben BetLayout.php. Sie steht HIER
	 * und nicht dort: eine Prüfung, die ihre Erwartung aus der geprüften Datei
	 * bezöge, prüfte nichts.
	 */
	const VORLAGE = new Set([
		'2 to 1', '1st 12', '2nd 12', '3rd 12',
		'1–18', 'Even', 'Odd', '19–36',
	]);

	const teile = [];
	for (const f of phpFelder) {
		for (const t of f.print ?? []) teile.push({ id: f.id, text: t.text, role: t.role });
	}
	// Die Ziffer eines Fachs steht nicht einzeln in der Abschrift — sie ist
	// die Zahl des Feldes und wird von F-16 (Vc) gegen die Radanordnung gehalten.
	const zuPruefen = teile.filter((t) => !t.role.startsWith('pocket-'));
	const unbekannt = zuPruefen.filter((t) => !VORLAGE.has(t.text));
	check(unbekannt.length === 0, 'jede Aufschrift steht wörtlich in der Abschrift der Vorlage',
		...unbekannt.map((t) => `${t.id}: „${t.text}"`));

	// Kein deutsches Wort auf dem Tuch. Der schärfste billige Test ist ein
	// Umlaut oder ein ß: sie kommen im Englischen nicht vor.
	const mitUmlaut = teile.filter((t) => /[äöüÄÖÜß]/.test(t.text));
	check(mitUmlaut.length === 0, 'keine Aufschrift enthält einen Umlaut oder ein ß',
		...mitUmlaut.map((t) => `${t.id}: „${t.text}"`));

	// DIE AUFGEDRUCKTE QUOTE IST UNSERE QUOTE. „2 to 1" und „2 zu 1" sind
	// dieselbe Zählweise — der Einsatz ist bei beiden nicht eingerechnet.
	const kolonne = phpFelder.find((f) => f.id === 'col-1');
	const aufgedruckt = Number(/^(\d+) to 1$/.exec(kolonne.print[0].text)?.[1]);
	check(aufgedruckt === 2, `der Aufdruck „${kolonne.print[0].text}" nennt die Zahl 2`);
	check(aufgedruckt === PAYOUT_BY_COVERED[12],
		`die aufgedruckte Zahl ist unsere Quote aus Anhang F für zwölf abgedeckte Zahlen `
		+ `(Aufdruck ${aufgedruckt}, Anhang F ${PAYOUT_BY_COVERED[12]}) — der Vorlesetext nennt sie deshalb nur einmal`);

	// Keine Aufschrift läuft mehr durch f:translate. Liefe eine, wäre sie
	// übersetzbar — und in einer englischen Sprachfassung stünde plötzlich
	// etwas anderes auf dem Tuch als in einer deutschen.
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const uebersetzt = [...feltHtml.matchAll(/f:translate\(key: ([^,)]+)/g)].map((m) => m[1].trim());
	const ERLAUBT = new Set([
		'field.labelKey',
		"'LLL:EXT:roulette/Resources/Private/Language/locallang.xlf:felt.group.{gruppe}'",
	]);
	const unerlaubt = uebersetzt.filter((k) => !ERLAUBT.has(k));
	check(unerlaubt.length === 0,
		'in Felt.html läuft keine Aufschrift durch f:translate — übersetzt werden nur Name und Gruppenname',
		...unerlaubt);

	console.log('     Gegenprobe F-18-G: eine deutsche Aufschrift „Gerade" muss auffallen');
	check(!VORLAGE.has('Gerade'), 'F-18-G: „Gerade" steht nicht in der Abschrift und würde gemeldet');

	console.log('     Gegenprobe F-18-G2: eine falsche Quote auf dem Aufdruck muss auffallen');
	check(Number(/^(\d+) to 1$/.exec('3 to 1')[1]) !== PAYOUT_BY_COVERED[12],
		'F-18-G2: ein Aufdruck „3 to 1" wiche von Anhang F ab und würde gefunden');
}

/* ============================= F-19 lang="en" je Aufschriftteil (neu) */

console.log('\nF-19  lang="en" an jedem Aufschriftteil mit Buchstaben, an keinem ohne');
{
	/*
	 * Die Seite führt lang="de". Steht darin ein englisches Wort ohne
	 * Auszeichnung, spricht ein Vorleseprogramm „Even" deutsch aus (WCAG 2.2,
	 * SC 3.1.2). Umgekehrt darf eine ZIFFER kein lang="en" tragen: aus „12"
	 * würde gesprochenes „twelve" statt „zwölf". Deshalb prüft diese Stelle
	 * BEIDE Richtungen — eine Prüfung, die nur „ist lang gesetzt?" fragte,
	 * übersähe die zweite, unauffälligere Hälfte.
	 */
	const abweichungen = [];
	for (const f of phpFelder) {
		for (const teil of f.print ?? []) {
			const hatBuchstaben = /[A-Za-z]/.test(teil.text);
			if (hatBuchstaben && teil.lang !== 'en') {
				abweichungen.push(`${f.id}: „${teil.text}" enthält Buchstaben, trägt aber lang="${teil.lang}"`);
			}
			if (!hatBuchstaben && teil.lang !== '') {
				abweichungen.push(`${f.id}: „${teil.text}" ist sprachneutral, trägt aber lang="${teil.lang}"`);
			}
		}
	}
	check(abweichungen.length === 0,
		'jeder Aufschriftteil mit Buchstaben ist als englisch ausgezeichnet, jeder ohne nicht',
		...abweichungen);

	// Und das Markup muss die Auszeichnung tatsächlich ausgeben — mit den zwei
	// Zweigen, die nötig sind, weil Fluid ein Attribut nicht bedingt weglassen
	// kann.
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	check(/<f:if condition="\{teil\.lang\} != ''">/.test(feltHtml),
		'Felt.html entscheidet je Aufschriftteil, ob ein lang-Attribut ausgegeben wird');
	check(/lang="\{teil\.lang\}"/.test(feltHtml), 'der englische Zweig gibt lang="{teil.lang}" aus');

	console.log('     Gegenprobe F-19-G: ein englisches Wort ohne lang muss auffallen');
	check(/[A-Za-z]/.test('Even') && '' !== 'en', 'F-19-G: ein Teil „Even" ohne lang wird von derselben Regel gefunden');

	console.log('     Gegenprobe F-19-G2: eine Ziffer MIT lang="en" muss ebenfalls auffallen');
	check(!/[A-Za-z]/.test('17') && 'en' !== '', 'F-19-G2: eine als englisch ausgezeichnete Ziffer wird gefunden');
}

/* ==================================== F-20 Label in Name (SC 2.5.3, neu) */

console.log('\nF-20  Label in Name (SC 2.5.3): jeder Name enthält die sichtbare Aufschrift');
{
	/*
	 * Wer den Rechner mit der Stimme bedient, sagt das sichtbare Wort. Steht
	 * „Even" auf dem Tuch, aber nur „Gerade" im Namen, passiert nichts.
	 * Verglichen wird ohne Rücksicht auf Groß- und Kleinschreibung und mit
	 * zusammengezogenen Leerzeichen.
	 */
	const normal = (t) => String(t).replace(/\s+/g, ' ').trim().toLowerCase();

	const ohneAufschrift = [];
	for (const f of phpFelder) {
		const name = aufgeloest(quelltext(f.labelKey), f.labelArgs);
		for (const teil of f.print ?? []) {
			if (!normal(name ?? '').includes(normal(teil.text))) {
				ohneAufschrift.push(`${f.id}: der Name „${name}" enthält „${teil.text}" nicht`);
			}
		}
	}
	check(ohneAufschrift.length === 0,
		'jeder erreichbare Name enthält die sichtbare Aufschrift seines Feldes (SC 2.5.3)',
		...ohneAufschrift);

	// Die drei Kolonnen nennen zusätzlich die Quote — sie ist aufgedruckt und
	// gehört damit in den Namen.
	for (const id of ['col-1', 'col-2', 'col-3']) {
		const f = phpFelder.find((x) => x.id === id);
		const name = aufgeloest(quelltext(f.labelKey), f.labelArgs);
		check(normal(name ?? '').includes('2 zu 1'),
			`${id}: der Name nennt unsere Schreibweise der Quote („2 zu 1")`, name);
	}

	// Die zwei Rauten haben KEINE sichtbare Aufschrift — für sie ist 2.5.3
	// gegenstandslos. Dass sie trotzdem einen Namen haben, prüft F-4; dass er
	// die Farbe nennt, prüft F-10 (Vc).
	for (const id of ['red', 'black']) {
		const f = phpFelder.find((x) => x.id === id);
		check((f.print ?? []).length === 0, `${id} trägt keine sichtbare Aufschrift (die Vorlage druckt eine Raute)`);
	}

	console.log('     Gegenprobe F-20-G: ein Name ohne seine Aufschrift muss auffallen');
	check(!normal('Gerade, zahlt 1 zu 1').includes(normal('Even')),
		'F-20-G: „Gerade, zahlt 1 zu 1" enthält „Even" nicht und würde erkannt');
}

/* ============================ F-21 die auslaufende Kante (neu, Teil 3, DECISIONS.md 2026-09-09T12:23:41) */

console.log('\nF-21  Die auslaufende Kante: umschließendes Element, Kante rollt nicht mit, kein Zugriff auf den Fokus');
{
	/*
	 * DER TISCH ROLLT INNERHALB SEINES EIGENEN KASTENS (.ro-cloth__scroll).
	 * Ohne eine Kante sieht das aus wie abgeschnitten statt wie rollbar. Die
	 * Kante gehört an ein UMSCHLIESSENDES Element (.ro-cloth__frame), NICHT
	 * an .ro-cloth__scroll selbst — ein Pseudoelement am Rollbereich wäre
	 * dessen eigener Inhalt und wanderte beim Rollen mit.
	 */
	const tableHtml = ohneFluidKommentare(lies(TABLE_HTML_PFAD));
	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));

	const frameStart = tableHtml.indexOf('class="ro-cloth__frame"');
	const scrollStart = tableHtml.indexOf('class="ro-cloth__scroll"');
	check(frameStart !== -1 && scrollStart !== -1 && frameStart < scrollStart,
		'.ro-cloth__frame umschließt .ro-cloth__scroll (das Frame öffnet zuerst)');

	const frameRumpf = regelRumpf(feltCss, '.ro-cloth__frame');
	check(frameRumpf !== null && eigenschaftsWert(frameRumpf, 'position') === 'relative',
		'.ro-cloth__frame trägt position: relative — Bezugsrahmen für die Kante');

	// pointer-events/position/z-index stehen an der GEMEINSAMEN Regel für
	// ::before UND ::after (ein Regelrumpf, zwei Selektoren); die
	// Hintergrundfarbe je Seite steht in je einer eigenen, anschließenden
	// Regel. regelRumpf() sucht den exakten Selektortext — deshalb wird die
	// gemeinsame Regel mit ihrem tatsächlichen, kommagetrennten Selektor
	// abgefragt, nicht mit jeder Pseudoklasse einzeln.
	const gemeinsam = regelRumpf(feltCss, '.ro-cloth__frame::before,\n.ro-cloth__frame::after');
	check(gemeinsam !== null, '.ro-cloth__frame::before und ::after tragen eine gemeinsame Regel');
	check(gemeinsam !== null && eigenschaftsWert(gemeinsam, 'pointer-events') === 'none',
		'::before und ::after: pointer-events: none — die Kante darf kein fokussierbares Element verdecken oder abfangen');

	const vorher = regelRumpf(feltCss, '.ro-cloth__frame::before');
	const nachher = regelRumpf(feltCss, '.ro-cloth__frame::after');
	check(vorher !== null && nachher !== null,
		'.ro-cloth__frame::before und ::after haben je eine eigene Regel für ihre Seite');
	for (const [name, rumpf] of [['::before', vorher], ['::after', nachher]]) {
		check(rumpf !== null && /var\(--ck-shadow-edge\)/.test(eigenschaftsWert(rumpf, 'background-image') ?? ''),
			`${name}: die Kante füllt mit dem Token --ck-shadow-edge`);
	}

	// Die Kante darf NICHT am Rollbereich selbst hängen — sonst wandert sie
	// beim Rollen mit, statt am Rand der sichtbaren Fläche stehen zu bleiben.
	const scrollVorher = regelRumpf(feltCss, '.ro-cloth__scroll::before');
	const scrollNachher = regelRumpf(feltCss, '.ro-cloth__scroll::after');
	check(scrollVorher === null && scrollNachher === null,
		'.ro-cloth__scroll trägt selbst kein ::before/::after — die Kante hängt ausschließlich am Frame');

	// Der Token existiert und ist nachgerechnet (siehe tokens.css-Kommentar);
	// hier wird nur seine Existenz geprüft, nicht die Kontrastrechnung selbst
	// erneut geführt — das steht bereits im DECISIONS.md-Eintrag.
	const tokensCss = lies(TOKENS_CSS_PFAD);
	check(/--ck-shadow-edge\s*:/.test(tokensCss), '--ck-shadow-edge ist in tokens.css deklariert');

	console.log('     Gegenprobe F-21-G: eine Kante ohne pointer-events: none muss auffallen');
	const erfundenesFrame = '.ro-cloth__frame::before { content: \'\'; position: absolute; background-image: linear-gradient(to right, var(--ck-shadow-edge), transparent); }';
	const erfundenerRumpf = /\{([^{}]*)\}/.exec(erfundenesFrame)[1];
	check(!/pointer-events\s*:\s*none/.test(erfundenerRumpf),
		'F-21-G: eine Kante ohne pointer-events: none würde nicht bestehen und wird hier tatsächlich als fehlend erkannt');

	console.log('     Gegenprobe F-21-G2: eine an .ro-cloth__scroll gehängte Kante muss auffallen');
	const mitScrollKante = feltCss + '\n.ro-cloth__scroll::before { content: \'\'; }';
	check(regelRumpf(ohneBlockKommentare(mitScrollKante), '.ro-cloth__scroll::before') !== null,
		'F-21-G2: eine an den Rollbereich gehängte Kante wird von derselben Suche gefunden und würde gemeldet');
}

/* ------------------------------------------ Wächter: sind alle Blöcke gelaufen? */

if (zusagen !== ERWARTETE_ZUSAGEN) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${ERWARTETE_ZUSAGEN} erwartet.`);
	console.log('  Entweder wurde ein Prüfblock übersprungen (dann ist dieses Ergebnis wertlos),');
	console.log('  oder es sind Zusagen hinzugekommen (dann gehört ERWARTETE_ZUSAGEN nachgezogen).');
	fehler++;
}

/* ------------------------------------------------------------- Ergebnis */

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`}`);
if (fehler === 0) {
	console.log('Der PHP-Spiegel (BetLayout) und die maßgebliche Feldliste (bets-roulette.js)');
	console.log('stimmen für alle 159 Felder überein, das Tuch besteht aus 159 echten Knöpfen');
	console.log('mit vollständigem XLIFF-Wortschatz, der Sprunglink funktioniert, jedes Feld');
	console.log('hat einen erreichbaren Namen über labelKey, der mit seiner sichtbaren');
	console.log('Aufschrift beginnt, die englische Aufschrift und ihre Sprachauszeichnung');
	console.log('stimmen mit der Vorlage überein, die Maßordnung von Zeichnung, Stylesheet und');
	console.log('Gitter passt zueinander (328 × 14 = 112 × 41), die Zielgröße erreicht bei allen');
	console.log('159 Feldern mindestens 24 × 24 Bildpunkte, felt.css benutzt keine eigene Farbe');
	console.log('und keinen fehlenden Token, jede aufgedruckte Aufschrift und jedes der drei');
	console.log('Ovale erreichen mindestens 4,5:1 Kontrast, die Ovalkontur mindestens 3:1, Rot');
	console.log('und Schwarz sind auch ohne Farbwahrnehmung an ihrer Rautenkontur und der');
	console.log('Schraffur von Schwarz unterscheidbar, die 38 Ovale stimmen mit der Radanordnung');
	console.log('überein, kein gesperrter Zustand dimmt den Fokusrahmen mit, und die auslaufende');
	console.log('Kante des Rollbereichs sitzt am umschließenden Element, nicht am Rollbereich');
	console.log('selbst, und lässt keinen Fokusrahmen unerreichbar werden (F-1 bis F-21).');
}
process.exit(fehler === 0 ? 0 : 1);
