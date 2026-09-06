/**
 * Roulette – Nachweis der Ansicht und der Barrierefreiheit
 * ==========================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Er liest Markup und Quelltext als Text
 * und startet keinen Browser (Playwright ist im Container vorhanden, die
 * Browser-Binärdateien fehlen — bekannter offener Punkt seit Phase 8).
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-view.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.19, Teilstücke C3d und C3e)
 * ---------------------------------------------------------------------
 *   V-1   keine Winkelfunktion, auch nicht in der Ansicht — seit C3d
 *         ausgeweitet auf round-roulette.js, seit C3e auf sound-roulette.js
 *   V-2   der Live-Bereich wird leer ausgeliefert
 *   V-3   der Auslöser ist ein echter Knopf
 *   V-4   gesperrt heißt aria-disabled, nicht disabled
 *   V-5   Mindestgröße des Auslösers (WCAG 2.2, 2.5.8)
 *   V-6   der Fokus bleibt sichtbar
 *   V-7   Bewegungsdrosselung, samt Ergebnisgleichheit zum gezeichneten Weg
 *   V-8   Farbe ist nie die einzige Aussage im Verlaufsstreifen
 *   V-9   der Haken-Katalog stimmt, in beide Richtungen — seit C3d um die
 *         Messpunkte des Tuchs und der Runde erweitert, seit C3e um
 *         data-ro-sound (Container-Marke des Ton-Schalters)
 *   V-10  kein deutscher Anzeigetext im JavaScript — seit C3d ausgeweitet
 *         auf round-roulette.js, seit C3e auf sound-roulette.js
 *   V-11  die Zeichenschleife hält an
 *   V-12  der Rundenablauf wird vollständig durchlaufen — prüft seit C3d
 *         round-roulette.js statt roulette.js, weil die Rundenlogik dorthin
 *         gezogen wurde
 *   V-13  jeder data-ro-*-Messpunkt, der von JavaScript BESCHRIEBEN wird,
 *         hat genau einen Schreiber (neu in C3d) — seit C3e auch
 *         data-ro-sound-on und data-ro-sound-sustained (sound-roulette.js)
 *   V-14  roulette.js trifft keine Rundenentscheidung mehr — settle(,
 *         sweep(, payout( und .lock()/.unlock() liegen ausschließlich in
 *         round-roulette.js (neu in C3d)
 *   V-15  jeder Abbruchpfad in bindTable() sperrt den Auslöser über
 *         aria-disabled und sagt es im Live-Bereich der Runde an (Behebung
 *         Review C3, M5)
 *
 * WIE V-10 „DEUTSCHER ANZEIGETEXT" VERSTEHT
 * -------------------------------------------
 * Geprüft wird der Quelltext OHNE Kommentare und OHNE die String-Argumente
 * von console.error/console.warn/console.log — das sind Entwicklermeldungen
 * für die Konsole, kein Anzeigetext, und der Rest dieses Projekts schreibt
 * solche Meldungen ebenfalls auf Deutsch (siehe z. B. table-felt.js). Geprüft
 * wird auf zwei Arten zugleich: einen deutschen Umlaut (ä ö ü Ä Ö Ü ß) im
 * verbleibenden Quelltext, UND den wörtlichen Text eines mehrwortigen
 * <source>-Eintrags aus locallang.xlf. Einzelne kurze Wörter (z. B. „Rot")
 * werden NICHT einzeln abgeglichen — sie kämen zu häufig zufällig in
 * Bezeichnern vor (bereits „root") und wären kein tragfähiger Nachweis.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/roulette/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const ALL_EXT = path.resolve(EXT, '..');

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

/** Entfernt Block- und Zeilenkommentare (CSS/JS) sowie Fluid-Kommentare (HTML). */
function ohneKommentare(inhalt) {
	return inhalt
		.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/.*$/gm, '');
}

/** Entfernt die String-Argumente von console.error/console.warn/console.log — Entwicklermeldungen, kein Anzeigetext. */
function ohneKonsolenmeldungen(inhalt) {
	return inhalt.replace(/console\.(?:error|warn|log)\([\s\S]*?\);/g, 'console.MELDUNG();');
}

console.log('\nRoulette – Nachweis der Ansicht und der Barrierefreiheit');
console.log('==========================================================\n');

const WHEEL_VIEW_PFAD = path.join(EXT, 'Resources/Public/JavaScript/wheel-view.js');
const ROULETTE_PFAD = path.join(EXT, 'Resources/Public/JavaScript/roulette.js');
// Neu seit Teilstück C3d: die dokument- und importfreie Rundenlogik. V-1,
// V-10 und V-12 rechnen ab hier mit dieser Datei statt mit roulette.js, weil
// die Rundenlogik dorthin gezogen wurde (siehe deren Kopfkommentar).
const ROUND_ROULETTE_PFAD = path.join(EXT, 'Resources/Public/JavaScript/round-roulette.js');
// Seit Teilstück C3e: die Klangzuordnung. V-1, V-9, V-10 und V-13 rechnen ab
// hier auch mit dieser Datei — sie sucht data-ro-sound per querySelector und
// schreibt data-ro-sound-on/-sustained.
const SOUND_ROULETTE_PFAD = path.join(EXT, 'Resources/Public/JavaScript/sound-roulette.js');
const WHEEL_CSS_PFAD = path.join(EXT, 'Resources/Public/Css/wheel.css');
const TABLE_HTML_PFAD = path.join(EXT, 'Resources/Private/ContentElements/Table.html');
const WHEEL_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Roulette/Wheel.html');
// Seit Teilstück C3b/C3c roulette-eigenes Markup mit eigenen data-ro-*-Haken
// (das Tuch und die Rundenansage); seit C3d werden hier zusätzlich die
// data-ck-field/-label-Haken je Feld gesucht (V-9).
const FELT_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Roulette/Felt.html');
const ROULETTE_STATUS_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Roulette/Status.html');
// Seit Teilstück C3e: der Ton-Schalter. data-ro-sound ist eine reine
// Container-Marke (wie data-ro-felt/-status), gesucht von sound-roulette.js.
const SOUND_SWITCH_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Roulette/SoundSwitch.html');
// Seit Teilstück C3b entfällt das eigene Auslöser-Partial (Launch.html): der
// Rundenauslöser [data-ck-table-go] lebt jetzt in der GETEILTEN Bedienleiste
// des Site Packages (Table/Controls.html), die Table.html mit einer nicht
// leeren "go"-Beschriftung aufruft.
const CONTROLS_HTML_PFAD = path.join(ALL_EXT, 'casino_startpage/Resources/Private/PageView/Partials/Table/Controls.html');
const STATUS_HTML_PFAD = path.join(ALL_EXT, 'casino_startpage/Resources/Private/PageView/Partials/Table/Status.html');
const HISTORY_HTML_PFAD = path.join(ALL_EXT, 'casino_startpage/Resources/Private/PageView/Partials/Table/History.html');
const LOCALLANG_PFAD = path.join(EXT, 'Resources/Private/Language/locallang.xlf');
// Seit Teilstück C3c lebt auch die STYLE-Definition des Auslösers nicht mehr
// in wheel.css: .ro-launch__button ist mit dem entfallenen Launch.html
// ersatzlos entfernt worden (Plan Abschnitt 4.13). Der Knopf trägt seither
// .ck-table__button--go aus der geteilten Bedienleiste, deren Regeln in
// casino_startpage/…/table.css stehen — dort prüfen V-5/V-6 seither.
const TABLE_CSS_PFAD = path.join(ALL_EXT, 'casino_startpage/Resources/Public/Css/table.css');

for (const [name, pfad] of [
	['wheel-view.js', WHEEL_VIEW_PFAD],
	['roulette.js', ROULETTE_PFAD],
	['round-roulette.js', ROUND_ROULETTE_PFAD],
	['sound-roulette.js', SOUND_ROULETTE_PFAD],
]) {
	if (!existsSync(pfad)) {
		console.log(`\nERGEBNIS: Abbruch — ${name} existiert nicht.`);
		process.exit(1);
	}
}

const wheelViewQuelltext = lies(WHEEL_VIEW_PFAD);
const rouletteQuelltext = lies(ROULETTE_PFAD);
const roundRouletteQuelltext = lies(ROUND_ROULETTE_PFAD);
const soundRouletteQuelltext = lies(SOUND_ROULETTE_PFAD);
const wheelViewOhneKommentare = ohneKommentare(wheelViewQuelltext);
const rouletteOhneKommentare = ohneKommentare(rouletteQuelltext);
const roundRouletteOhneKommentare = ohneKommentare(roundRouletteQuelltext);
const soundRouletteOhneKommentare = ohneKommentare(soundRouletteQuelltext);

/* ============================================ V-1 Keine Winkelfunktion */

console.log('V-1  Keine Winkelfunktion, auch nicht in der Ansicht');
{
	// Seit Teilstück C3e (Plan Abschnitt 4.19: "V-1 … wird auf
	// round-roulette.js und sound-roulette.js ausgeweitet") auch die
	// Klangzuordnung: Tonhöhen entstehen dort aus Geschwindigkeiten, nicht aus
	// einem Winkel.
	const VERBOTEN = ['Math.sin', 'Math.cos', 'Math.tan', 'Math.asin', 'Math.acos', 'Math.atan', 'Math.atan2', 'Math.hypot'];
	for (const [name, quelltext] of [
		['wheel-view.js', wheelViewOhneKommentare],
		['roulette.js', rouletteOhneKommentare],
		['round-roulette.js', roundRouletteOhneKommentare],
		['sound-roulette.js', soundRouletteOhneKommentare],
	]) {
		for (const funktion of VERBOTEN) {
			check(!quelltext.includes(funktion), `${name} enthält kein ${funktion}`);
		}
	}
}

/* ================================== V-2 Der Live-Bereich bleibt leer */

console.log('\nV-2  Table.html rendert Table/Status, dessen Live-Bereich leer bleibt');
{
	const tableHtml = lies(TABLE_HTML_PFAD);
	check(/<f:render partial="Table\/Status"/.test(tableHtml), 'Table.html rendert das Partial Table/Status');

	check(existsSync(STATUS_HTML_PFAD), 'casino_startpage liefert Table/Status.html');
	if (existsSync(STATUS_HTML_PFAD)) {
		const statusHtml = lies(STATUS_HTML_PFAD);
		const treffer = /<p[^>]*data-ck-table-status[^>]*role="status"[^>]*>([\s\S]*?)<\/p>/.exec(statusHtml);
		check(treffer !== null, '<p data-ck-table-status role="status"> ist im Partial zu finden');
		if (treffer !== null) {
			check(treffer[1].trim() === '', 'der Live-Bereich hat im Markup keinen Textinhalt', `gefunden: "${treffer[1].trim()}"`);
		}
	}
}

/* ==================================== V-3 Der Auslöser ist ein Knopf */

console.log('\nV-3  Der Auslöser ist ein echter Knopf');
{
	// Seit C3b lebt der Auslöser in der geteilten Bedienleiste
	// (Table/Controls.html), nicht mehr im entfallenen Launch.html.
	const controlsHtml = lies(CONTROLS_HTML_PFAD);
	const controlsHtmlOhneKommentare = ohneKommentare(controlsHtml);
	check(/<button type="button" class="ck-table__button ck-table__button--go" data-ck-table-go="">/.test(controlsHtml),
		'[data-ck-table-go] ist ein <button type="button">');
	check(!/role="button"/.test(controlsHtmlOhneKommentare), 'kein role="button" im Partial (außerhalb von Kommentaren)');
	check(!/<div[^>]*data-ck-table-go/.test(controlsHtmlOhneKommentare), 'kein <div> mit data-ck-table-go');
	check(!/data-ck-table-go="[^"]*aria-label/.test(controlsHtmlOhneKommentare)
		&& !/<button[^>]*data-ck-table-go[^>]*aria-label/.test(controlsHtmlOhneKommentare),
		'kein aria-label am Auslöser, das den sichtbaren Knopftext überschreiben würde');
}

/* ============================ V-4 aria-disabled statt disabled */

console.log('\nV-4  Gesperrt heißt aria-disabled, nicht disabled');
{
	check(/setAttribute\(\s*['"]aria-disabled['"]/.test(rouletteOhneKommentare),
		'roulette.js setzt aria-disabled per setAttribute()');
	check(!/\.disabled\s*=/.test(rouletteOhneKommentare),
		'roulette.js setzt niemals .disabled =');
}

/* ===================================== V-5 Mindestgröße des Auslösers */

console.log('\nV-5  Mindestgröße des Auslösers (WCAG 2.2, 2.5.8)');
{
	// [data-ck-table-go] trägt class="ck-table__button ck-table__button--go"
	// (siehe V-3) — die Mindestgröße steht auf der Basisklasse
	// .ck-table__button in table.css, .ck-table__button--go liefert nur die
	// rote Bakelit-Farbe dazu.
	const css = lies(TABLE_CSS_PFAD);
	const block = /\.ck-table__button\s*\{([^}]*)\}/.exec(css);
	check(block !== null, '.ck-table__button ist in casino_startpage/…/table.css definiert');
	if (block !== null) {
		const inline = /min-inline-size:\s*([\d.]+)rem/.exec(block[1]);
		const blockSize = /min-block-size:\s*([\d.]+)rem/.exec(block[1]);
		check(inline !== null && Number(inline[1]) >= 2.75, 'min-inline-size ist mindestens 2.75rem');
		check(blockSize !== null && Number(blockSize[1]) >= 2.75, 'min-block-size ist mindestens 2.75rem');
	}
}

/* ========================================= V-6 Der Fokus bleibt sichtbar */

console.log('\nV-6  Der Fokus bleibt sichtbar');
{
	const wheelCss = lies(WHEEL_CSS_PFAD);
	const wheelCssOhneKommentare = ohneKommentare(wheelCss);
	check(!/outline\s*:\s*(none|0)\b/i.test(wheelCssOhneKommentare),
		'wheel.css enthält kein outline: none / outline: 0 (außerhalb von Kommentaren)');

	// Derselbe Ortswechsel wie in V-5: der Fokusrahmen des Auslösers steht
	// seit Teilstück C3c auf .ck-table__button in table.css, nicht mehr auf
	// dem entfallenen .ro-launch__button in wheel.css.
	const tableCss = lies(TABLE_CSS_PFAD);
	const tableCssOhneKommentare = ohneKommentare(tableCss);
	check(!/outline\s*:\s*(none|0)\b/i.test(tableCssOhneKommentare),
		'table.css enthält kein outline: none / outline: 0 (außerhalb von Kommentaren)');
	check(/\.ck-table__button:focus-visible/.test(tableCss), '.ck-table__button:focus-visible ist definiert');
}

/* ============================================= V-7 Bewegungsdrosselung */

console.log('\nV-7  Bewegungsdrosselung');
{
	check(/prefers-reduced-motion/.test(wheelViewOhneKommentare), 'wheel-view.js enthält den Zweig prefers-reduced-motion');
	check(/runToRest\(\)/.test(wheelViewOhneKommentare), 'wheel-view.js ruft dort runToRest() auf');
	const css = lies(WHEEL_CSS_PFAD);
	check(/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css), 'wheel.css enthält den @media-Block');
}

console.log('\n     Ergänzend: der gedrosselte Weg liefert dasselbe Ergebnis wie der gezeichnete');
{
	const { Wheel } = await import(new URL('../../Public/JavaScript/wheel-physics.js', import.meta.url));
	const { createSeeded } = await import(new URL('../../Public/JavaScript/rng.js', import.meta.url));

	let abweichungen = 0;
	for (let seed = 1; seed <= 200; seed++) {
		const gedrosselt = new Wheel({ random: createSeeded(seed) });
		gedrosselt.launch();
		gedrosselt.runToRest();

		const gezeichnet = new Wheel({ random: createSeeded(seed) });
		gezeichnet.launch();
		while (gezeichnet.phase !== 'liegt') {
			gezeichnet.step();
		}

		if (JSON.stringify(gedrosselt.snapshot()) !== JSON.stringify(gezeichnet.snapshot())) {
			abweichungen++;
		}
	}
	check(abweichungen === 0, '200 Läufe: runToRest() und wiederholtes step() liefern dieselbe Momentaufnahme',
		`abweichende Läufe: ${abweichungen}`);
}

/* ============================ V-8 Farbe ist nie die einzige Aussage */

console.log('\nV-8  Farbe ist nie die einzige Aussage im Verlaufsstreifen');
{
	const pushStelle = rouletteOhneKommentare.indexOf('history.push(');
	check(pushStelle !== -1, 'roulette.js ruft history.push() auf');
	if (pushStelle !== -1) {
		const endeStelle = rouletteOhneKommentare.indexOf('});', pushStelle);
		const block = rouletteOhneKommentare.slice(pushStelle, endeStelle === -1 ? undefined : endeStelle + 3);
		check(/\btext:/.test(block), 'der Aufruf setzt ein text-Feld');
		check(/\btone:/.test(block), 'der Aufruf setzt zusätzlich ein tone-Feld (nie tone allein)');
	}
	check((rouletteOhneKommentare.match(/history\.push\(/g) ?? []).length === 1,
		'history.push() kommt genau einmal vor, damit V-8 den einzigen Aufruf vollständig erfasst');
}

/* ===================================================== V-9 Haken-Katalog */

console.log('\nV-9  Der Haken-Katalog stimmt, in beide Richtungen');
{
	// data-ro-launch-box entfällt seit C3b mit Launch.html. Seit Teilstück
	// C3d kommen die Messpunkte des Tuchs und der Runde dazu: data-ro-felt
	// und data-ro-status (je einmal, Container-Marken, die roulette.js per
	// querySelector sucht) sowie data-ro-state/-result/-colour/-total (je
	// einmal, Messpunkte am Wurzelelement, die roulette.js SCHREIBT — siehe
	// V-13). data-ck-field und data-ck-field-label kommen je Feld MEHRFACH
	// vor (159 bzw. bis zu 159 Mal) und werden deshalb getrennt behandelt.
	// Seit Teilstück C3e kommt data-ro-sound dazu: dieselbe Bauart wie
	// data-ro-felt/-status — eine Container-Marke im ausgelieferten Markup,
	// gesucht von sound-roulette.js. data-ro-sound-on und
	// data-ro-sound-sustained stehen dagegen NIE im ausgelieferten Markup
	// (sie entstehen erst, wenn sound-roulette.js sie schreibt) und gehören
	// deshalb nicht in diesen Katalog, sondern in V-13.
	const HAKEN_EINZEL = [
		'data-ro-wheel', 'data-ro-head', 'data-ro-ball',
		'data-ck-table-go', 'data-ck-table-status', 'data-ck-table-history',
		'data-ro-felt', 'data-ro-status', 'data-ro-sound',
		'data-ro-state', 'data-ro-result', 'data-ro-colour', 'data-ro-total',
	];
	/** Kommen je Feld vor (159 Felder), deshalb "mindestens einmal" statt "genau einmal". */
	const HAKEN_MEHRFACH = ['data-ck-field', 'data-ck-field-label'];

	const markupDateien = [
		TABLE_HTML_PFAD, WHEEL_HTML_PFAD, FELT_HTML_PFAD, ROULETTE_STATUS_HTML_PFAD, SOUND_SWITCH_HTML_PFAD,
		CONTROLS_HTML_PFAD, STATUS_HTML_PFAD, HISTORY_HTML_PFAD,
	].filter(existsSync);
	const gesamtMarkup = markupDateien.map(lies).join('\n');

	for (const haken of HAKEN_EINZEL) {
		const treffer = gesamtMarkup.match(new RegExp(`\\b${haken}=`, 'g')) ?? [];
		check(treffer.length === 1, `${haken} kommt im ausgelieferten Markup genau einmal vor (gefunden: ${treffer.length})`);
	}
	for (const haken of HAKEN_MEHRFACH) {
		const treffer = gesamtMarkup.match(new RegExp(`\\b${haken}=`, 'g')) ?? [];
		check(treffer.length >= 1, `${haken} kommt im ausgelieferten Markup mindestens einmal vor (gefunden: ${treffer.length})`);
	}

	// Umgekehrt: jeder data-ro-*-Haken im roulette-eigenen Markup (Table.html,
	// Wheel.html, Felt.html, die roulette-eigene Table/Roulette/Status.html,
	// seit C3e auch SoundSwitch.html) wird von wheel-view.js, roulette.js oder
	// (seit C3e) sound-roulette.js auch gesucht.
	// round-roulette.js bleibt hier ABSICHTLICH außen vor: die Datei ist
	// dokumentfrei (siehe deren Kopfkommentar) und sucht keinen einzigen
	// data-Haken. Table/Controls.html gehört ebenfalls NICHT dazu — das ist
	// geteiltes Markup des Site Packages, kein roulette-eigenes.
	// ohneKommentare() zuerst, sonst zählt ein erklärender <f:comment>-
	// Absatz, der zufällig "data-ro-…" als Wort enthält, als Haken mit.
	const roMarkup = ohneKommentare(
		[TABLE_HTML_PFAD, WHEEL_HTML_PFAD, FELT_HTML_PFAD, ROULETTE_STATUS_HTML_PFAD, SOUND_SWITCH_HTML_PFAD]
			.filter(existsSync).map(lies).join('\n')
	);
	const gefundeneRoHaken = new Set((roMarkup.match(/data-ro-[a-zA-Z-]+/g) ?? []));
	const gesuchtInJs = wheelViewOhneKommentare + rouletteOhneKommentare + soundRouletteOhneKommentare;
	for (const haken of gefundeneRoHaken) {
		check(gesuchtInJs.includes(haken), `${haken} aus dem Markup wird von wheel-view.js, roulette.js oder sound-roulette.js gesucht`);
	}
}

/* ============================================ V-10 Kein deutscher Text */

console.log('\nV-10  Kein deutscher Anzeigetext im JavaScript');
{
	const localesQuelltext = lies(LOCALLANG_PFAD);
	const mehrwortigeSaetze = [...localesQuelltext.matchAll(/<source>([^<]*)<\/source>/g)]
		.map((m) => m[1])
		.filter((satz) => satz.includes(' '));

	const UMLAUT = /[äöüÄÖÜß]/;

	// Seit Teilstück C3e auch die Klangzuordnung (Plan Abschnitt 4.19).
	for (const [name, quelltext] of [
		['wheel-view.js', wheelViewQuelltext],
		['roulette.js', rouletteQuelltext],
		['round-roulette.js', roundRouletteQuelltext],
		['sound-roulette.js', soundRouletteQuelltext],
	]) {
		const geprueft = ohneKonsolenmeldungen(ohneKommentare(quelltext));
		check(!UMLAUT.test(geprueft), `${name} enthält (außerhalb von Kommentaren und Konsolenmeldungen) keinen deutschen Umlaut`);

		const treffer = mehrwortigeSaetze.filter((satz) => geprueft.includes(satz));
		check(treffer.length === 0, `${name} enthält keinen wörtlichen Satz aus locallang.xlf`, ...treffer);
	}
}

/* ========================================== V-11 Die Schleife hält an */

console.log('\nV-11  Die Zeichenschleife hält an');
{
	check(/visibilitychange/.test(wheelViewOhneKommentare), 'wheel-view.js enthält visibilitychange');
	check(/carryMs\s*=\s*0/.test(wheelViewOhneKommentare), 'wheel-view.js setzt den Zeitübertrag im hidden-Fall auf 0');
	check(/MAX_CATCHUP_STEPS/.test(wheelViewOhneKommentare), 'wheel-view.js begrenzt das Nachholen auf MAX_CATCHUP_STEPS');
}

/* =============================== V-12 Der Rundenablauf läuft vollständig */

console.log('\nV-12  Der Rundenablauf wird vollständig durchlaufen');
{
	// Seit Teilstück C3d liegt die Rundenlogik in round-roulette.js
	// (RouletteRound.start()/settleAt()), nicht mehr in roulette.js — siehe
	// V-14 weiter unten, die genau das Gegenstück dieser Prüfung ist.
	const AUFRUFE = ['round.lock(', 'round.run(', 'round.resolve(', 'round.pay(', 'round.finish('];
	for (const aufruf of AUFRUFE) {
		const anzahl = (roundRouletteOhneKommentare.match(new RegExp(aufruf.replace('(', '\\('), 'g')) ?? []).length;
		check(anzahl === 1, `${aufruf}) kommt in round-roulette.js genau einmal vor (gefunden: ${anzahl})`);
	}
}

/* =========================== V-13 Ein Schreiber je Messpunkt (neu, C3d) */

console.log('\nV-13  Jeder data-ro-*-Messpunkt hat genau einen Schreiber');
{
	// Über alle JavaScript-Dateien DIESER Extension hinweg — seit Teilstück
	// C3e auch sound-roulette.js.
	const JS_DATEIEN_DER_EXTENSION = [
		['roulette.js', ROULETTE_PFAD],
		['round-roulette.js', ROUND_ROULETTE_PFAD],
		['wheel-view.js', WHEEL_VIEW_PFAD],
		['sound-roulette.js', SOUND_ROULETTE_PFAD],
		['wheel-physics.js', path.join(EXT, 'Resources/Public/JavaScript/wheel-physics.js')],
		['wheel-geometry.js', path.join(EXT, 'Resources/Public/JavaScript/wheel-geometry.js')],
		['bets-roulette.js', path.join(EXT, 'Resources/Public/JavaScript/bets-roulette.js')],
		['rng.js', path.join(EXT, 'Resources/Public/JavaScript/rng.js')],
	].filter(([, pfad]) => existsSync(pfad));

	const quellenOhneKommentare = new Map(
		JS_DATEIEN_DER_EXTENSION.map(([name, pfad]) => [name, ohneKommentare(lies(pfad))])
	);

	/**
	 * Nur Messpunkte, die tatsächlich von JavaScript BESCHRIEBEN werden.
	 * data-ro-felt, data-ro-status und data-ro-sound sind reine
	 * Container-Marken, die per querySelector GELESEN werden — sie haben
	 * keinen Schreiber und gehören deshalb nicht in diese Liste.
	 * data-ro-sound-on und data-ro-sound-sustained (seit C3e, sound-roulette.js)
	 * dagegen sind echte Messpunkte wie data-ro-state — ohne eigenes Vorkommen
	 * im Markup, ausschließlich von JavaScript beschrieben.
	 */
	const MESSPUNKTE_MIT_SCHREIBER = [
		'data-ro-state', 'data-ro-result', 'data-ro-colour', 'data-ro-total',
		'data-ro-sound-on', 'data-ro-sound-sustained',
	];

	/** @param {Map<string,string>} quellen @param {string} messpunkt @returns {number} */
	function zaehleSchreiber(quellen, messpunkt) {
		const camel = messpunkt.replace(/^data-/, '').replace(/-([a-z])/g, (_, buchstabe) => buchstabe.toUpperCase());
		const muster = new RegExp(`setAttribute\\(\\s*['"]${messpunkt}['"]|\\.dataset\\.${camel}\\s*=`, 'g');
		let treffer = 0;
		for (const quelltext of quellen.values()) {
			treffer += (quelltext.match(muster) ?? []).length;
		}
		return treffer;
	}

	for (const messpunkt of MESSPUNKTE_MIT_SCHREIBER) {
		const anzahl = zaehleSchreiber(quellenOhneKommentare, messpunkt);
		check(anzahl === 1, `${messpunkt} wird von genau einer Stelle geschrieben (gefunden: ${anzahl})`);
	}

	console.log('     Gegenprobe (V-13-G): eine erfundene zweite Schreibstelle wird erkannt');
	const verfaelscht = new Map(quellenOhneKommentare);
	verfaelscht.set('roulette.js', `${quellenOhneKommentare.get('roulette.js')}\nfoo.setAttribute('data-ro-state', 'x');`);
	const anzahlVerfaelscht = zaehleSchreiber(verfaelscht, 'data-ro-state');
	check(anzahlVerfaelscht === 2,
		'eine im Prüfskript ergänzte zweite Schreibstelle für data-ro-state wird als zwei gezählt (und hätte die Prüfung oben rot gemacht)',
		`gezählt: ${anzahlVerfaelscht}`);
}

/* ============ V-14 roulette.js trifft keine Rundenentscheidung (neu, C3d) */

console.log('\nV-14  roulette.js enthält keine Rundenlogik mehr');
{
	// Diese fünf Schritte liegen ausschließlich in round-roulette.js
	// (Abschnitt 4.16 des Plans) — roulette.js darf keinen davon selbst rufen.
	const VERBOTENE_MUSTER = [
		['settle(', /settle\(/],
		['sweep(', /sweep\(/],
		['payout(', /payout\(/],
		['.lock(', /\.lock\(/],
		['.unlock(', /\.unlock\(/],
	];
	for (const [name, muster] of VERBOTENE_MUSTER) {
		check(!muster.test(rouletteOhneKommentare), `roulette.js enthält kein ${name}`);
	}

	console.log('     Gegenprobe (V-14-G): dasselbe Muster schlägt in round-roulette.js an — dort liegt die Rundenlogik');
	const treffer = VERBOTENE_MUSTER.filter(([, muster]) => muster.test(roundRouletteOhneKommentare));
	check(treffer.length === VERBOTENE_MUSTER.length,
		'alle fünf Muster kommen in round-roulette.js tatsächlich vor — die Prüfung trifft also wirklich zu und ist nicht bloß eine leere Bedingung',
		`gefunden: ${treffer.map(([name]) => name).join(', ')}`);
}

/* === V-15 jeder Abbruchpfad in bindTable() sperrt den Auslöser (M5) === */

console.log('\nV-15  Jeder Abbruchpfad in bindTable() sperrt den Auslöser und sagt es an');
{
	// Behebung Review C3, M5: bindTable() hat drei Abbruchpfade, die einen
	// bereits gerenderten Tisch unbenutzbar zurücklassen können —
	// !isAvailable() (fehlende Zufallsquelle), der neue Schlüssel-schon-
	// vergeben-Pfad und der catch-Zweig. Statischer Nachweis, kein
	// Kontrollfluss-Parser: jeder der drei Pfade enthält im Quelltext sowohl
	// "goButton.setAttribute('aria-disabled'" als auch einen
	// announceRound()-Aufruf.
	const pfadMarker = [
		['!isAvailable()', /if \(!isAvailable\(\)\) \{[\s\S]*?\n\t\}/],
		['Schlüssel bereits vergeben', /if \(gebundeneSchluessel\.has\(key\)\) \{[\s\S]*?\n\t\}/],
		['catch-Zweig', /\} catch \(error\) \{[\s\S]*?\n\t\}\n\}/],
	];
	for (const [name, muster] of pfadMarker) {
		const treffer = muster.exec(rouletteQuelltext);
		check(treffer !== null, `der Abbruchpfad "${name}" wurde im Quelltext gefunden`);
		if (treffer !== null) {
			const block = treffer[0];
			check(/goButton\.setAttribute\('aria-disabled'/.test(block), `${name}: sperrt den Auslöser über aria-disabled`);
			check(/announceRound\(texts\.\w+\)/.test(block), `${name}: sagt einen eigenen Satz im Live-Bereich der Runde an`);
		}
	}

	console.log('     Gegenprobe V-15-G: ein Abbruchpfad ohne aria-disabled muss auffallen');
	const verstuemmelterPfad = 'if (gebundeneSchluessel.has(key)) {\n\t\tannounceRound(texts.unavailable);\n\t\treturn;\n\t}';
	check(!/goButton\.setAttribute\('aria-disabled'/.test(verstuemmelterPfad),
		'V-15-G: ein Pfad ohne aria-disabled wird von derselben Prüfung tatsächlich als fehlend erkannt');
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Die Ansicht rechnet keinen Sinus, der Live-Bereich'
	+ '\nbleibt leer, der Auslöser ist ein echter Knopf, und der Rundenablauf läuft vollständig durch.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
