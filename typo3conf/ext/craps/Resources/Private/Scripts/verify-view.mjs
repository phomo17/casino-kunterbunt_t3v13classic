/**
 * Craps – Nachweis der Ansicht und der Barrierefreiheit (C6d, erweitert C7e)
 * ==============================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Er liest Markup und Quelltext als Text
 * und startet keinen Browser.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-view.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.44 [C6d] und 4.25 [C7e])
 * ---------------------------------------------------------------------
 *   V-1   genau ein f:asset.module, und es ist craps.js
 *   V-2   (erweitert, Te) jeder Live-Bereich leer, jeder Messpunkt genau ein
 *         Schreiber; die Ruhelage-Eigenschaften ausschließlich dice-view.js,
 *         --cr-hx, --cr-hy und data-cr-hand ausschließlich throw-input.js
 *   V-3   die sechs rechnenden Dateien sind import- und dokumentfrei
 *   V-4   jedes Bedienteil ist ein natives Element
 *   V-5   Zielgrößen und Fokus
 *   V-6   im Spiel wird nur echter Zufall eingespeist
 *   V-7   kein deutscher Anzeigetext im JavaScript
 *   V-8   craps.js rechnet nicht und entscheidet nichts
 *   V-9   die Bewegungsdrosselung ist gebaut
 *   V-10  die Zeichenschleife hört auf visibilitychange und räumt ab
 *   V-11  alle benutzten XLIFF-Kennungen gibt es, keine ist unbenutzt, Platzhalterregel
 *   V-12  jeder Abbruchpfad sperrt den Auslöser UND sagt einen eigenen Satz an
 *   V-13  die Ansage nennt beide Augenzahlen UND die Summe
 *   V-14  die Drehmatrix wird aus dem Vektor geschrieben, nicht aus einem Winkel
 *   V-15  craps.js rechnet keine Quote und wertet keine Wette aus (neu, C7e)
 *   V-16  der pagehide-Weg entsteht nicht doppelt (neu, C7e)
 *   V-17  der Auslöser wird nachgeführt, sobald sich der Einsatz ändert (neu, C7e)
 *   V-18  genau ein Rundenauslöser auf der Seite (neu, C7e)
 *   V-19  kein deutscher Anzeigetext im neuen JavaScript (neu, C7e)
 *   V-20  die Bewegungsdrosselung gilt auch für die Runde (neu, C7e)
 *
 * WIE V-7 „DEUTSCHER ANZEIGETEXT" VERSTEHT
 * -------------------------------------------
 * Geprüft wird der Quelltext OHNE Kommentare und OHNE die String-Argumente
 * von console.error/console.warn/console.log — das sind Entwicklermeldungen
 * für die Konsole, kein Anzeigetext (dieselbe Regel wie beim anderen Tisch).
 * Geprüft wird auf zwei Arten zugleich: einen deutschen Umlaut im
 * verbleibenden Quelltext, UND den wörtlichen Text eines mehrwortigen
 * <source>-Eintrags aus locallang.xlf. V-19 wendet dieselbe Regel auf die
 * drei neuen, rechnenden Dateien und auf craps.js insgesamt an.
 *
 * WARUM V-1 BIS V-14 NICHT ÜBERALL WÖRTLICH GLEICH GEBLIEBEN SIND
 * -----------------------------------------------------------------
 * Umsetzungsstück C7e ersetzt craps.js vollständig (Plan-Abschnitt 4.22).
 * Der Wurfteil ist INHALTLICH unverändert, aber zwei Namen sind es nicht:
 * das frühere Hüllwort sperre(an) ist einem unmittelbaren
 * goButton.setAttribute('aria-disabled', …) an jeder Abbruchstelle plus
 * einer laufenden zeichneAusloeser() gewichen, und die frühere Funktion
 * wirf(setup) ist in onGo()/onThrowFromInput() aufgegangen, die jetzt über
 * CrapsRound (round-craps.js) werfen statt unmittelbar über die Ansicht. V-12
 * und V-13 sind an diese — vom Plan selbst vorgegebene — Umbenennung
 * angepasst; was sie BEWEISEN (jeder Abbruch sperrt und sagt an; die Ansage
 * nennt beide Augenzahlen und die Summe), ist unverändert.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/craps/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');

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

/** Entfernt Block- und Zeilenkommentare (CSS/JS) sowie Fluid-Kommentare (HTML). */
function ohneKommentare(inhalt) {
	return inhalt
		.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/.*$/gm, '');
}

/**
 * Entfernt die String-Argumente von console.error/console.warn/console.log
 * UND von throw new Error(…) — Entwicklermeldungen für die Konsole bzw. für
 * einen catch-Zweig, der sie an console.error weiterreicht, kein Anzeigetext
 * (dieselbe Regel wie beim anderen Tisch, hier um throw new Error(…)
 * erweitert, weil craps.js dort seinen einzigen Verdrahtungsfehler meldet).
 */
function ohneEntwicklermeldungen(inhalt) {
	return inhalt
		.replace(/console\.(?:error|warn|log)\([\s\S]*?\);/g, 'console.MELDUNG();')
		.replace(/throw new Error\([\s\S]*?\);/g, 'throw new Error();');
}

console.log('\nCraps – Nachweis der Ansicht und der Barrierefreiheit (C6d, erweitert C7e)');
console.log('==============================================================================\n');

const RNG_PFAD = path.join(EXT, 'Resources/Public/JavaScript/rng.js');
const GEOMETRY_PFAD = path.join(EXT, 'Resources/Public/JavaScript/dice-geometry.js');
const PHYSICS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/dice-physics.js');
const DICE_VIEW_PFAD = path.join(EXT, 'Resources/Public/JavaScript/dice-view.js');
const THROW_INPUT_PFAD = path.join(EXT, 'Resources/Public/JavaScript/throw-input.js');
const CRAPS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/craps.js');
const BETS_CRAPS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/bets-craps.js');
const WAGERS_CRAPS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/wagers-craps.js');
const ROUND_CRAPS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/round-craps.js');
const TRAY_CSS_PFAD = path.join(EXT, 'Resources/Public/Css/tray.css');
const FELT_CSS_PFAD = path.join(EXT, 'Resources/Public/Css/felt.css');
const TABLE_CSS_PFAD = path.join(EXT_ROOT, 'casino_startpage/Resources/Public/Css/table.css');
const TABLE_HTML_PFAD = path.join(EXT, 'Resources/Private/ContentElements/Table.html');
const CLOTH_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Craps/Cloth.html');
const DICE_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Craps/Dice.html');
const DICESPRITE_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Craps/DiceSprite.html');
const STATUS_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Craps/Status.html');
const THROW_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Craps/Throw.html');
const FELT_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Craps/Felt.html');
const ROUND_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Craps/Round.html');
const LOCALLANG_PFAD = path.join(EXT, 'Resources/Private/Language/locallang.xlf');

for (const [name, pfad] of [
	['rng.js', RNG_PFAD], ['dice-geometry.js', GEOMETRY_PFAD], ['dice-physics.js', PHYSICS_PFAD],
	['dice-view.js', DICE_VIEW_PFAD], ['throw-input.js', THROW_INPUT_PFAD], ['craps.js', CRAPS_PFAD],
	['bets-craps.js', BETS_CRAPS_PFAD], ['wagers-craps.js', WAGERS_CRAPS_PFAD], ['round-craps.js', ROUND_CRAPS_PFAD],
	['Table.html', TABLE_HTML_PFAD], ['Cloth.html', CLOTH_HTML_PFAD], ['Dice.html', DICE_HTML_PFAD], ['Status.html', STATUS_HTML_PFAD],
	['Throw.html', THROW_HTML_PFAD], ['Felt.html', FELT_HTML_PFAD], ['Round.html', ROUND_HTML_PFAD],
]) {
	if (!existsSync(pfad)) {
		console.log(`\nERGEBNIS: Abbruch — ${name} existiert nicht.`);
		process.exit(1);
	}
}

const rngQuelltext = lies(RNG_PFAD);
const geometryQuelltext = lies(GEOMETRY_PFAD);
const physicsQuelltext = lies(PHYSICS_PFAD);
const diceViewQuelltext = lies(DICE_VIEW_PFAD);
const throwInputQuelltext = lies(THROW_INPUT_PFAD);
const crapsQuelltext = lies(CRAPS_PFAD);
const betsCrapsQuelltext = lies(BETS_CRAPS_PFAD);
const wagersCrapsQuelltext = lies(WAGERS_CRAPS_PFAD);
const roundCrapsQuelltext = lies(ROUND_CRAPS_PFAD);

const diceViewOhneKommentare = ohneKommentare(diceViewQuelltext);
const throwInputOhneKommentare = ohneKommentare(throwInputQuelltext);
const crapsOhneKommentare = ohneKommentare(crapsQuelltext);
const betsCrapsOhneKommentare = ohneKommentare(betsCrapsQuelltext);
const wagersCrapsOhneKommentare = ohneKommentare(wagersCrapsQuelltext);
const roundCrapsOhneKommentare = ohneKommentare(roundCrapsQuelltext);

const tableHtml = lies(TABLE_HTML_PFAD);
const tableHtmlOhneKommentare = ohneKommentare(tableHtml);
const clothHtml = lies(CLOTH_HTML_PFAD);
const diceHtml = lies(DICE_HTML_PFAD);
const throwHtml = lies(THROW_HTML_PFAD);
const throwHtmlOhneKommentare = ohneKommentare(throwHtml);
const statusHtml = lies(STATUS_HTML_PFAD);
const feltHtml = lies(FELT_HTML_PFAD);
const roundHtml = lies(ROUND_HTML_PFAD);

/* ============================================== V-1 Genau ein f:asset.module */

console.log('V-1  Genau ein f:asset.module, und es ist craps.js');
{
	const HTML_DATEIEN = [TABLE_HTML_PFAD, CLOTH_HTML_PFAD, DICE_HTML_PFAD, DICESPRITE_HTML_PFAD, STATUS_HTML_PFAD, THROW_HTML_PFAD, FELT_HTML_PFAD, ROUND_HTML_PFAD];
	const treffer = HTML_DATEIEN.flatMap((d) => [...ohneKommentare(lies(d)).matchAll(/<f:asset\.module identifier="([^"]+)"/g)].map((m) => m[1]));
	check(treffer.length === 1, `genau ein f:asset.module (gefunden: ${treffer.length})`, ...treffer);
	check(treffer[0] === '@phomo17/craps/craps.js', `das eine Modul ist @phomo17/craps/craps.js (gefunden: ${treffer[0] ?? 'keins'})`);
}

/* ========================================= V-2 Live-Bereich leer, ein Schreiber */

console.log('\nV-2  Jeder Live-Bereich leer, jeder Messpunkt genau ein Schreiber');
{
	// (a) [data-cr-status] wird leer ausgeliefert.
	const statusMatch = /<p[^>]*data-cr-status[^>]*role="status"[^>]*>([\s\S]*?)<\/p>/.exec(ohneKommentare(statusHtml));
	check(statusMatch !== null, 'Status.html: <p data-cr-status role="status"> gefunden');
	if (statusMatch !== null) {
		check(statusMatch[1].trim() === '', 'der Live-Bereich hat im Markup keinen Textinhalt',
			`gefunden: "${statusMatch[1].trim().slice(0, 60)}"`);
	}
	check(/<f:render partial="Table\/Craps\/Status"/.test(tableHtml), 'Table.html rendert Table/Craps/Status');

	// (b) [data-cr-status] wird NUR von craps.js beschrieben (textContent =).
	const statusSchreiber = [];
	for (const [name, quelltext] of [['dice-view.js', diceViewOhneKommentare], ['throw-input.js', throwInputOhneKommentare], ['craps.js', crapsOhneKommentare]]) {
		if (/statusEl\.textContent\s*=/.test(quelltext)) {
			statusSchreiber.push(name);
		}
	}
	check(statusSchreiber.length === 1 && statusSchreiber[0] === 'craps.js',
		'[data-cr-status] wird ausschließlich von craps.js beschrieben', ...statusSchreiber);

	// (c) jedes data-cr-* am Wurzelelement wird nur von craps.js gesetzt.
	// Seit C7e um data-cr-round, data-cr-point und data-cr-total erweitert, und
	// die Kandidatenliste um die drei neuen, rechnenden Dateien — sie dürfen
	// KEINEN dieser Messpunkte setzen, denn sie fassen kein DOM an.
	const SCHREIBER_KANDIDATEN = [
		['dice-view.js', diceViewOhneKommentare], ['throw-input.js', throwInputOhneKommentare], ['craps.js', crapsOhneKommentare],
		['bets-craps.js', betsCrapsOhneKommentare], ['wagers-craps.js', wagersCrapsOhneKommentare], ['round-craps.js', roundCrapsOhneKommentare],
	];
	const WURZEL_MESSPUNKTE = ['data-cr-state', 'data-cr-die-a', 'data-cr-die-b', 'data-cr-sum', 'data-cr-valid', 'data-cr-throws', 'data-cr-round', 'data-cr-point', 'data-cr-total'];
	for (const punkt of WURZEL_MESSPUNKTE) {
		const schreiber = [];
		for (const [name, quelltext] of SCHREIBER_KANDIDATEN) {
			if (new RegExp(`setAttribute\\(\\s*['"]${punkt}['"]`).test(quelltext)) {
				schreiber.push(name);
			}
		}
		check(schreiber.length === 1 && schreiber[0] === 'craps.js', `${punkt} wird ausschließlich von craps.js gesetzt`, ...schreiber);
	}

	// (e) bets-craps.js, wagers-craps.js und round-craps.js fassen KEIN DOM an
	// — weder setAttribute( noch textContent = kommt in ihnen überhaupt vor.
	for (const [name, quelltext] of [['bets-craps.js', betsCrapsOhneKommentare], ['wagers-craps.js', wagersCrapsOhneKommentare], ['round-craps.js', roundCrapsOhneKommentare]]) {
		check(!/setAttribute\(/.test(quelltext), `${name} enthält kein setAttribute(`);
		check(!/\.textContent\s*=/.test(quelltext), `${name} enthält kein .textContent =`);
	}

	// (f) [data-cr-point-text] (Table/Craps/Round.html) hat genau einen
	// Schreiber: craps.js (pointEl.textContent =).
	{
		const schreiber = [];
		for (const [name, quelltext] of SCHREIBER_KANDIDATEN) {
			if (/pointEl\.textContent\s*=/.test(quelltext)) {
				schreiber.push(name);
			}
		}
		check(schreiber.length === 1 && schreiber[0] === 'craps.js', '[data-cr-point-text] wird ausschließlich von craps.js beschrieben', ...schreiber);
	}

	// (g) [data-ck-table-status] (geteilter Ansagebereich) wird von craps.js
	// NUR im announce-Rückruf an connectFelt() beschrieben — nicht an einer
	// eigenen Entscheidungsstelle. Geprüft wird: sharedStatusEl.textContent =
	// kommt in craps.js GENAU EINMAL vor, und diese eine Stelle liegt
	// innerhalb des announce-Blocks von connectFelt().
	{
		const alleTreffer = [...crapsOhneKommentare.matchAll(/sharedStatusEl\.textContent\s*=/g)];
		check(alleTreffer.length === 1, `[data-ck-table-status] hat in craps.js genau eine Schreibstelle (gefunden: ${alleTreffer.length})`);
		const announceBlock = /announce:\s*\(text\)\s*=>\s*\{[\s\S]*?\n\t{3}\},/.exec(crapsQuelltext);
		check(announceBlock !== null, 'der announce-Rückruf an connectFelt() wurde im Quelltext gefunden');
		if (announceBlock !== null && alleTreffer.length === 1) {
			check(/sharedStatusEl\.textContent\s*=/.test(announceBlock[0]),
				'die einzige Schreibstelle von [data-ck-table-status] liegt innerhalb des announce-Rückrufs');
		}
	}

	// (d) --cr-* an den Würfelgruppen: ZWEI GETRENNTE MENGEN, je genau ein
	// Schreiber (erweitert, Te — vorher schrieb throw-input.js gar kein
	// --cr-*, seit den plastischen Würfeln führt es den Handversatz über
	// --cr-hx/--cr-hy statt über eine Inline-transform-Eigenschaft).
	// dice-view.js bleibt der EINZIGE Schreiber der Ruhelage-Eigenschaften.
	const CR_PROPERTIES = ['--cr-x', '--cr-y', '--cr-h', '--cr-m11', '--cr-m12', '--cr-m21', '--cr-m22', '--cr-sx', '--cr-sy'];
	for (const prop of CR_PROPERTIES) {
		const schreiber = [];
		for (const [name, quelltext] of [['dice-view.js', diceViewOhneKommentare], ['throw-input.js', throwInputOhneKommentare], ['craps.js', crapsOhneKommentare]]) {
			if (quelltext.includes(`setProperty('${prop}'`)) {
				schreiber.push(name);
			}
		}
		check(schreiber.length === 1 && schreiber[0] === 'dice-view.js', `${prop} wird ausschließlich von dice-view.js geschrieben`, ...schreiber);
	}

	// throw-input.js ist der EINZIGE Schreiber des Handversatzes --cr-hx/--cr-hy
	// und des Schalters data-cr-hand (Prüfung V-2, zweite Zusage). Keine der
	// beiden Mengen überschneidet sich mit der anderen.
	const CR_HAND_PROPERTIES = ['--cr-hx', '--cr-hy'];
	for (const prop of CR_HAND_PROPERTIES) {
		const schreiber = [];
		for (const [name, quelltext] of [['dice-view.js', diceViewOhneKommentare], ['throw-input.js', throwInputOhneKommentare], ['craps.js', crapsOhneKommentare]]) {
			if (quelltext.includes(`setProperty('${prop}'`)) {
				schreiber.push(name);
			}
		}
		check(schreiber.length === 1 && schreiber[0] === 'throw-input.js', `${prop} wird ausschließlich von throw-input.js geschrieben`, ...schreiber);
	}
	check(!CR_HAND_PROPERTIES.some((prop) => diceViewOhneKommentare.includes(`setProperty('${prop}'`)),
		'dice-view.js schreibt keine der beiden Handversatz-Eigenschaften');
	check(!CR_PROPERTIES.some((prop) => throwInputOhneKommentare.includes(`setProperty('${prop}'`)),
		'throw-input.js schreibt keine der Ruhelage-Eigenschaften');

	const handAttributSchreiber = [];
	for (const [name, quelltext] of [['dice-view.js', diceViewOhneKommentare], ['throw-input.js', throwInputOhneKommentare], ['craps.js', crapsOhneKommentare]]) {
		if (/(?:set|remove)Attribute\(\s*'data-cr-hand'/.test(quelltext)) {
			handAttributSchreiber.push(name);
		}
	}
	check(handAttributSchreiber.length === 1 && handAttributSchreiber[0] === 'throw-input.js',
		'data-cr-hand wird ausschließlich von throw-input.js gesetzt und entfernt', ...handAttributSchreiber);

	console.log('     Gegenprobe V-2-G: eine erfundene zweite Schreibstelle für --cr-x muss auffallen');
	const verfaelscht = `${throwInputOhneKommentare}\nfoo.style.setProperty('--cr-x', '1');`;
	const schreiberGegenprobe = [];
	for (const [name, quelltext] of [['dice-view.js', diceViewOhneKommentare], ['throw-input.js', verfaelscht]]) {
		if (quelltext.includes("setProperty('--cr-x'")) {
			schreiberGegenprobe.push(name);
		}
	}
	check(schreiberGegenprobe.length === 2, 'V-2-G: eine ergänzte zweite Schreibstelle für --cr-x wird als zwei gezählt');
}

/* ====================================== V-3 Die drei rechnenden Dateien */

console.log('\nV-3  Die sechs rechnenden Dateien sind import- und dokumentfrei');
{
	// Kommentare zuerst heraus: die Kopfkommentare nennen "document"/"window"
	// selbst als PROSA (die Liste dessen, was verboten ist) — geprüft wird der
	// tatsächlich ausführbare Quelltext. Seit C7e um bets-craps.js,
	// wagers-craps.js und round-craps.js erweitert (Prüfungen B-1/W-1/R-1 in
	// den jeweils eigenen Nachweisen decken dasselbe bereits ab — hier steht
	// es zusätzlich im Zusammenhang mit den übrigen import- und dokumentfreien
	// Dateien dieser Extension).
	for (const [name, quelltext] of [
		['rng.js', rngQuelltext], ['dice-geometry.js', geometryQuelltext], ['dice-physics.js', physicsQuelltext],
		['bets-craps.js', betsCrapsQuelltext], ['wagers-craps.js', wagersCrapsQuelltext], ['round-craps.js', roundCrapsQuelltext],
	]) {
		const ohneKommentareGeprueft = ohneKommentare(quelltext);
		check(!/^\s*import /m.test(quelltext), `${name}: kein import`);
		check(!/\bdocument\b/.test(ohneKommentareGeprueft), `${name}: kein document (außerhalb von Kommentaren)`);
		check(!/\bwindow\b/.test(ohneKommentareGeprueft), `${name}: kein window (außerhalb von Kommentaren)`);
	}
}

/* ======================================= V-4 Jedes Bedienteil ist nativ */

console.log('\nV-4  Jedes Bedienteil ist ein natives Element');
{
	check(/<button class="ck-table__button ck-table__button--go" type="button" data-ck-table-go=""/.test(throwHtml),
		'[data-ck-table-go] ist ein <button type="button">');
	check(/<fieldset[^>]*>[\s\S]*?<legend>/.test(throwHtml), 'die Modewahl liegt in einem <fieldset> mit <legend>');
	const radios = [...throwHtml.matchAll(/<input class="ck-table__chip-input" type="radio" name="cr-mode"/g)];
	check(radios.length === 2, `genau zwei <input type="radio" name="cr-mode"> (gefunden: ${radios.length})`);
	const rangeMatch = /<input class="cr-throw__slider" id="(cr-power)" data-cr-power="" type="range"/.exec(throwHtml);
	check(rangeMatch !== null, 'die Wurfkraft-Schiene ist ein <input type="range">');
	check(/<label class="ck-table__buyin-label" for="cr-power">/.test(throwHtml),
		'<label for="cr-power"> zeigt auf die id der Schiene');
	check(!/role="button"/.test(throwHtmlOhneKommentare), 'kein role="button" im Partial (außerhalb von Kommentaren)');
	check(!/<div[^>]*data-ck-table-go/.test(throwHtmlOhneKommentare), 'kein <div> mit data-ck-table-go');

	console.log('     Gegenprobe V-4-G: ein role="button" im Partial müsste auffallen');
	const verfaelscht = `${throwHtmlOhneKommentare}\n<div role="button" data-ck-table-go=""></div>`;
	check(/role="button"/.test(verfaelscht), 'V-4-G: ein eingefügtes role="button" wird von derselben Prüfung als vorhanden erkannt');
}

/* ============================================= V-5 Zielgrößen und Fokus */

console.log('\nV-5  Zielgrößen und Fokus');
{
	const trayCss = lies(TRAY_CSS_PFAD);
	const tableCss = lies(TABLE_CSS_PFAD);
	const trayCssOhneKommentare = ohneKommentare(trayCss);
	const tableCssOhneKommentare = ohneKommentare(tableCss);

	check(!/outline\s*:\s*(none|0)\b/i.test(trayCssOhneKommentare), 'tray.css enthält kein outline: none / outline: 0');

	const sliderBlock = /\.cr-throw__slider\s*\{([^}]*)\}/.exec(trayCss);
	check(sliderBlock !== null, '.cr-throw__slider ist in tray.css definiert');
	if (sliderBlock !== null) {
		const blockSize = /block-size:\s*([\d.]+)rem/.exec(sliderBlock[1]);
		check(blockSize !== null && Number(blockSize[1]) >= 2.75, 'die Schiene hat mindestens 2.75rem block-size');
	}
	check(/\.cr-throw__slider:focus-visible\s*\{[^}]*outline[^}]*outline-offset/.test(trayCss),
		'.cr-throw__slider:focus-visible setzt outline und outline-offset');

	const buttonBlock = /\.ck-table__button\s*\{([^}]*)\}/.exec(tableCss);
	check(buttonBlock !== null, '.ck-table__button ist in casino_startpage/…/table.css definiert');
	if (buttonBlock !== null) {
		const inline = /min-inline-size:\s*([\d.]+)rem/.exec(buttonBlock[1]);
		const blockSize = /min-block-size:\s*([\d.]+)rem/.exec(buttonBlock[1]);
		check(inline !== null && Number(inline[1]) >= 2.75, 'der Auslöser hat min-inline-size ≥ 2.75rem');
		check(blockSize !== null && Number(blockSize[1]) >= 2.75, 'der Auslöser hat min-block-size ≥ 2.75rem');
	}
	check(!/outline\s*:\s*(none|0)\b/i.test(tableCssOhneKommentare), 'table.css enthält kein outline: none / outline: 0');
	check(/\.ck-table__button:focus-visible/.test(tableCss), '.ck-table__button:focus-visible ist definiert');
	check(/\.ck-table__chip:has\(:focus-visible\)/.test(tableCss), '.ck-table__chip:has(:focus-visible) ist definiert (Fokus der Modewahl)');

	// NEU IN UMSETZUNGSSTÜCK Ue: eine ausdrückliche Gegenprobe, dass DAS TUCH
	// selbst keine feste Mindestgröße mehr trägt.
	//
	// ANMERKUNG DES UMSETZERS: der Plantext zu Ue (Abschnitt 4.23) beschreibt
	// diese Stelle als „SEIT UMSETZUNGSSTÜCK Ub geändert" und unterstellt, V-5
	// habe vorher `.cr-felt__field` mit `min-inline-size: 2.75rem` geprüft.
	// Das trifft auf DIESE Datei nicht zu — V-5 prüfte hier zu keinem
	// Zeitpunkt `.cr-felt__field`, nur `.cr-throw__slider` und
	// `.ck-table__button` (siehe oben). Bereits in Umsetzungsstück Ub
	// festgestellt und dort als „Kleinstfund 6" unbehoben liegen gelassen,
	// weil außerhalb von dessen Dateiumfang (DECISIONS.md). Die ZUSAGE selbst
	// ist trotzdem richtig und gehört hierher (SC 2.5.8): die tatsächliche
	// Zielgröße rechnet verify-felt.mjs F-7 feldweise nach; diese Zeile ist
	// die dazu passende Gegenprobe an der Stelle, an der ein Leser eine feste
	// Mindestgröße für Wettfelder am ehesten erwarten würde.
	const feltCssV5 = lies(FELT_CSS_PFAD);
	check(!/\.cr-felt__field\b[^}]*min-inline-size:\s*2\.75rem/.test(feltCssV5),
		'die Wettfelder tragen keine feste Mindestgröße mehr (die Zielgröße rechnet verify-felt.mjs F-7 feldweise nach)');
}

/* ========================================= V-6 Nur echter Zufall im Spiel */

console.log('\nV-6  Im Spiel wird nur echter Zufall eingespeist — außerhalb einer Lobby-Runde (nachgezogen, D5-3)');
{
	check(/import\s*\{[^}]*\bdrawUint32\b[^}]*\}\s*from\s*['"]@phomo17\/craps\/rng\.js['"]/.test(crapsQuelltext),
		'craps.js importiert drawUint32 aus rng.js');

	// ABWEICHUNG VOM PLANTEXT (D5, Abschnitt 7, Risikotabelle): SEIT D5-3
	// erwähnt craps.js createSeeded() an GENAU ZWEI Stellen: dem Import (der
	// Name selbst) und GENAU EINEM Aufruf — als Geber der gemeinsamen
	// Lobby-Runde (D.10.4, saatGeber-Rückruf an connectLobby()). Eine Zusage
	// abzuschwächen ist immer verdächtig, deshalb kommt im Gegenzug eine
	// schärfere Prüfung dazu: nicht nur DASS createSeeded genau einmal
	// AUFGERUFEN wird, sondern GENAU DORT — und zusätzlich C-3 in
	// verify-lobby-craps.mjs, die nachweist, dass "geber" an genau zwei
	// Stellen zugewiesen wird (Anfangswert drawUint32 und geberSetzen).
	// Solange keine Lobby-Runde läuft, speist new DiceTable() unverändert
	// ausschließlich drawUint32 ein.
	const createSeededAufrufe = crapsOhneKommentare.match(/createSeeded\(/g) ?? [];
	check(createSeededAufrufe.length === 1,
		`createSeeded( wird in craps.js genau einmal AUFGERUFEN — als Geber der Lobby-Runde (gefunden: ${createSeededAufrufe.length}×)`);
	check(/saatGeber:\s*\(saat\)\s*=>\s*createSeeded\(saatZuZahl\(saat\)\)/.test(crapsOhneKommentare),
		'die eine Stelle ist der saatGeber-Rückruf an connectLobby()');

	console.log('     Gegenprobe: ein zweiter, erfundener Aufruf wird erkannt');
	const verfaelscht = `${crapsOhneKommentare}\nconst x = createSeeded(1);`;
	check((verfaelscht.match(/createSeeded\(/g) ?? []).length === 2,
		'ein eingefügter zweiter Aufruf wird von derselben Zählung erkannt');

	// rng.js DEFINIERT createSeeded — für die Nachweisskripte und (seit D5-3)
	// für die Lobby-Runde, nie fürs bloße Zuschauen/Selbst-werfen außerhalb
	// einer Lobby. dice-view.js und throw-input.js bleiben davon
	// unberührt — dieselbe Unterscheidung wie V-6 sie schon immer trifft
	// ("im SPIEL wird nur echter Zufall eingespeist").
	const SPIELFUEHRENDE_JS = [DICE_VIEW_PFAD, THROW_INPUT_PFAD];
	const treffer = SPIELFUEHRENDE_JS.filter((pfad) => lies(pfad).includes('createSeeded'));
	check(treffer.length === 0, 'createSeeded kommt in dice-view.js und throw-input.js nicht vor', ...treffer.map(kurz));
}

/* ======================================== V-7 Kein deutscher Anzeigetext */

console.log('\nV-7  Kein deutscher Anzeigetext im JavaScript');
{
	const localesQuelltext = lies(LOCALLANG_PFAD);
	const mehrwortigeSaetze = [...localesQuelltext.matchAll(/<source>([^<]*)<\/source>/g)]
		.map((m) => m[1])
		.filter((satz) => satz.includes(' '));

	const UMLAUT = /[äöüÄÖÜß]/;

	for (const [name, quelltext] of [
		['dice-view.js', diceViewQuelltext],
		['throw-input.js', throwInputQuelltext],
		['craps.js', crapsQuelltext],
	]) {
		const geprueft = ohneEntwicklermeldungen(ohneKommentare(quelltext));
		check(!UMLAUT.test(geprueft), `${name} enthält (außerhalb von Kommentaren und Konsolenmeldungen) keinen deutschen Umlaut`);

		const treffer = mehrwortigeSaetze.filter((satz) => geprueft.includes(satz));
		check(treffer.length === 0, `${name} enthält keinen wörtlichen Satz aus locallang.xlf`, ...treffer);
	}
}

/* =============================== V-8 craps.js rechnet und entscheidet nicht */

console.log('\nV-8  craps.js rechnet nicht und entscheidet nichts');
{
	const ohneErlaubteMathAufrufe = crapsOhneKommentare
		.replace(/Math\.round\(/g, '')
		.replace(/Math\.min\(/g, '')
		.replace(/Math\.max\(/g, '');
	check(!/Math\./.test(ohneErlaubteMathAufrufe), 'craps.js enthält kein Math. außer Math.round/min/max');
	check(!/\btipFaces\(/.test(crapsOhneKommentare), 'craps.js ruft tipFaces( nicht auf');
	check(!/\bhuegel\(/.test(crapsOhneKommentare), 'craps.js ruft huegel( nicht auf');
	check(!/\bzieheGanzzahl\(/.test(crapsOhneKommentare), 'craps.js ruft zieheGanzzahl( nicht auf');

	const PHYSIKKONSTANTEN = [
		'GRAVITY', 'AIR_DRAG', 'BOUNCE_KEEP', 'BOUNCE_MIN', 'LAND_KEEP',
		'ROLL_FRICTION_LIN', 'ROLL_FRICTION_QUAD', 'TIP_KEEP', 'FALLBACK_KEEP',
		'WALL_KEEP', 'PYRAMID_SPREAD', 'PYRAMID_SPIN', 'COLLIDE_KEEP',
		'COLLIDE_RADIUS', 'SPIN_FRICTION', 'REST_SPEED_SQ', 'HILL_PEAK',
		'TIP_ARC', 'INERTIA', 'DIAG_HALF', 'MAX_STEPS', 'MAX_CATCHUP_STEPS',
	];
	const treffer = PHYSIKKONSTANTEN.filter((name) => crapsOhneKommentare.includes(name));
	check(treffer.length === 0, 'craps.js nennt keine der Physikkonstanten', ...treffer);
}

/* ================================================= V-9 Bewegungsdrosselung */

console.log('\nV-9  Die Bewegungsdrosselung ist gebaut');
{
	check(/matchMedia/.test(diceViewOhneKommentare), 'dice-view.js enthält matchMedia');
	check(/prefers-reduced-motion/.test(diceViewOhneKommentare), 'dice-view.js enthält den Zweig prefers-reduced-motion');
	// NICHT table.runToRest() (ohne Argument): DiceTable.runToRest() nimmt
	// selbst kein setup an und würde bei "Bewegung reduzieren" IMMER einen
	// vollständig gezogenen Wurf werfen, egal was der Spieler gerade geworfen
	// hat — ein eigener Fund vor Auslieferung (DECISIONS.md 2026-09-07 10:23).
	// dice-view.js bildet den gedrosselten Weg deshalb selbst nach: table.roll(setup)
	// gefolgt von einer table.step()-Schleife bis zum Stillstand.
	check(/table\.roll\(setup\)/.test(diceViewOhneKommentare), 'dice-view.js ruft im gedrosselten Zweig table.roll(setup) mit dem übergebenen setup auf');
	check(!/runToRest\(/.test(diceViewOhneKommentare), 'dice-view.js ruft NICHT table.runToRest() auf (das setup ginge sonst verloren)');
	const trayCss = lies(TRAY_CSS_PFAD);
	check(/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(trayCss), 'tray.css enthält den @media-Block');
}

/* ===================== V-10 Zeichenschleife hört auf visibilitychange, räumt ab */

console.log('\nV-10  Die Zeichenschleife hört auf visibilitychange und räumt ab');
{
	check(/addEventListener\(\s*'visibilitychange'/.test(diceViewOhneKommentare), 'dice-view.js meldet visibilitychange an');
	check(/removeEventListener\(\s*'visibilitychange'/.test(diceViewOhneKommentare), 'dice-view.js meldet visibilitychange in destroy() wieder ab');
	check(/addEventListener\(\s*'pagehide'/.test(crapsOhneKommentare), 'craps.js meldet pagehide an');
	check(/input\??\.destroy\(\)/.test(crapsOhneKommentare) && /view\??\.destroy\(\)/.test(crapsOhneKommentare),
		'craps.js ruft dort input.destroy() und view.destroy() auf');
}

/* ============================================== V-11 XLIFF-Kennungen stimmen */

console.log('\nV-11  Alle benutzten XLIFF-Kennungen gibt es, und keine ist unbenutzt');
{
	const localesQuelltext = lies(LOCALLANG_PFAD);
	const definiert = new Set([...localesQuelltext.matchAll(/<trans-unit id="([^"]+)"/g)].map((m) => m[1]));

	// Zwei Schreibweisen kommen vor: die Tag-Form <f:translate key="…"> (Throw.html,
	// Table.html, Felt.html) und die eingebettete Ausdrucksform
	// {f:translate(key: '…')} (Status.html, Round.html, Felt.html, data-text-*).
	// Beide werden erfasst. Seit C7e um Felt.html und Round.html erweitert.
	const HTML_ALLER_PARTIALS = [tableHtml, clothHtml, diceHtml, statusHtml, throwHtml, feltHtml, roundHtml].join('\n');
	const benutztInHtml = new Set([...HTML_ALLER_PARTIALS.matchAll(/key[:=]\s*['"]LLL:EXT:craps\/Resources\/Private\/Language\/locallang\.xlf:([a-zA-Z0-9_.{}]+)['"]/g)].map((m) => m[1]));

	// Felt.html löst eine Kennung dynamisch auf ({field.labelKey}, aufgerufen
	// über field.labelKey selbst, das keine "LLL:EXT:…"-Zeichenkette im
	// Quelltext bildet) — das erscheint hier als LITERALE Zeichenkette mit
	// geschweiften Klammern und ist keine Karteileiche, sondern die einzige
	// Stelle, an der F-5 (verify-felt.mjs) statt dieser Prüfung greift: F-5
	// vergleicht die AUFGELÖSTEN Kennungen aus BetLayout.php gegen
	// locallang.xlf. Diese Prüfung hier zieht solche dynamischen Ausdrücke ab,
	// statt sie fälschlich als "unbekannt" zu meldem.
	//
	// SEIT DEM UMBAU NACH DER BILDVORLAGE (2026-09-08): {field.printed} gibt
	// es nicht mehr — die Aufschrift läuft seither gar nicht mehr durch
	// f:translate (Vorbemerkung E des Plans, Prüfung F-24). Übrig bleibt genau
	// EIN dynamischer Ausdruck: die Gruppenüberschrift felt.group.{gruppe}.
	const dynamisch = [...benutztInHtml].filter((id) => id.includes('{'));
	const statisch = new Set([...benutztInHtml].filter((id) => !id.includes('{')));

	const unbekannt = [...statisch].filter((id) => !definiert.has(id));
	check(unbekannt.length === 0, `${statisch.size} in den Partials statisch benutzte Kennungen existieren alle in locallang.xlf`, ...unbekannt);
	check(dynamisch.length === 1 && dynamisch.every((id) => id.startsWith('felt.')),
		'genau der eine dynamisch aufgelöste Ausdruck aus Felt.html (felt.group.{gruppe}) wurde erkannt und nicht als Karteileiche gewertet',
		...dynamisch);

	const NEUE_KENNUNGEN = [
		'throw.mode.legend', 'throw.mode.watch', 'throw.mode.watch.hint', 'throw.mode.shoot',
		'throw.mode.shoot.hint', 'throw.power.label', 'throw.button', 'throw.hint',
		'throw.announce.picked', 'throw.announce.rolling', 'throw.announce.result',
		'throw.announce.short', 'throw.announce.blocked', 'throw.announce.norandom', 'throw.announce.power',
		// Seit C7e (Umsetzungsstück C7d/C7e): Tuch, Runde, Ansagen, Absagen.
		// Seit dem Umbau nach der Bildvorlage (2026-09-08, Ub): die dreißig
		// felt.print.*- und die zwei felt.puck.*-Kennungen sind entfallen —
		// die Aufschrift steht seither als Klartext in BetLayout.php und läuft
		// nicht mehr durch f:translate (Vorbemerkung E des Plans).
		'felt.label', 'felt.skip', 'felt.group.numbers', 'felt.group.lines', 'felt.group.hardways', 'felt.group.single',
		'felt.point.none', 'felt.point.set', 'felt.fieldname', 'felt.fieldname.empty',
		'felt.name.pass', 'felt.name.dontpass', 'felt.name.come', 'felt.name.dontcome', 'felt.name.passodds', 'felt.name.dontpassodds',
		'felt.name.comepoint', 'felt.name.dontcomepoint', 'felt.name.comeodds', 'felt.name.dontcomeodds', 'felt.name.place', 'felt.name.place.word',
		'felt.name.field', 'felt.name.hard', 'felt.name.seven', 'felt.name.craps', 'felt.name.two', 'felt.name.three', 'felt.name.eleven',
		'felt.name.twelve', 'felt.name.crapseleven',
		'felt.place.working', 'felt.place.hint',
		'round.announce.natural', 'round.announce.craps', 'round.announce.pointset', 'round.announce.pointmade', 'round.announce.sevenout', 'round.announce.roll',
		'round.announce.money.win', 'round.announce.money.partial', 'round.announce.money.loss', 'round.announce.money.none',
		'round.announce.nostake', 'round.announce.unavailable', 'round.announce.closed',
		'round.reject.contract', 'round.reject.comeout', 'round.reject.traveled', 'round.reject.nopoint', 'round.reject.nobase', 'round.reject.oddsmax',
		'round.hint.unit', 'round.history.point',
	];
	for (const id of NEUE_KENNUNGEN) {
		check(definiert.has(id), `locallang.xlf definiert ${id}`);
	}
	// "Nicht literal per f:translate benutzt" gilt seit C7e für drei Gruppen,
	// jede aus einem eigenen Grund:
	//   - throw.announce.*             reisen als data-text-* (Status.html)
	//   - felt.fieldname(.empty)       reisen als data-text-* (Felt.html)
	//   - round.*                      reisen als data-text-* (Round.html)
	//   - felt.name.*, felt.group.*    werden NIE literal geschrieben, sondern
	//                                  über field.labelKey bzw. {gruppe}
	//                                  dynamisch aufgelöst — das prüft F-5 in
	//                                  verify-felt.mjs, nicht diese Stelle.
	const UEBER_DATA_ATTRIBUT_ODER_DYNAMISCH = (id) => id.startsWith('throw.announce.') || id.startsWith('round.')
		|| id === 'felt.fieldname' || id === 'felt.fieldname.empty'
		|| id.startsWith('felt.name.') || id.startsWith('felt.group.');
	const unbenutzt = NEUE_KENNUNGEN.filter((id) => !statisch.has(id) && !UEBER_DATA_ATTRIBUT_ODER_DYNAMISCH(id));
	check(unbenutzt.length === 0, 'jede neue, weder als data-text-* noch dynamisch (F-5) transportierte Kennung wird in einem Partial per f:translate benutzt', ...unbenutzt);

	// Die throw.announce.*-Kennungen reisen als data-text-*-Attribute an
	// [data-cr-status] (Status.html) statt über f:translate direkt.
	const dataTextAttribute = new Set([...statusHtml.matchAll(/data-text-([a-z]+)="/g)].map((m) => m[1]));
	const ANNOUNCE_ATTRIBUTE = ['picked', 'rolling', 'result', 'short', 'blocked', 'norandom', 'power'];
	for (const attr of ANNOUNCE_ATTRIBUTE) {
		check(dataTextAttribute.has(attr), `Status.html trägt data-text-${attr}`);
	}

	// Dieselbe Prüfung für Round.html — die rund 20 round.*-Kennungen aus C7e.
	const roundDataTextAttribute = new Set([...roundHtml.matchAll(/data-text-([a-z]+)="/g)].map((m) => m[1]));
	const ROUND_ATTRIBUTE = [
		'pointnone', 'pointset', 'natural', 'craps', 'pointsetroll', 'pointmade', 'sevenout', 'roll',
		'moneywin', 'moneypartial', 'moneyloss', 'moneynone', 'nostake', 'unavailable', 'closed',
		'contract', 'comeout', 'traveled', 'nopoint', 'nobase', 'oddsmax', 'unit', 'historypoint',
	];
	for (const attr of ROUND_ATTRIBUTE) {
		check(roundDataTextAttribute.has(attr), `Round.html trägt data-text-${attr}`);
	}

	// Die Platzhalterregel (README.md / Plan-Abschnitt 4.17): eine Kennung, die
	// SERVERSEITIG über f:translate(arguments:) aufgelöst wird, benutzt %1$s;
	// eine Kennung, die JAVASCRIPT zur Laufzeit ersetzt, benutzt {0}. KEINE
	// Kennung mischt beide Schreibweisen im selben <source> — das würde einen
	// stets unaufgelösten Platzhalter im ausgelieferten HTML hinterlassen.
	let platzhalterMischungen = 0;
	for (const [, id, quelle] of localesQuelltext.matchAll(/<trans-unit id="([^"]+)">\s*<source>([^<]*)<\/source>/g)) {
		if (/\{\d+\}/.test(quelle) && /%\d+\$s/.test(quelle)) {
			platzhalterMischungen++;
			check(false, `${id} mischt {n} und %n$s in einem Text`, quelle);
		}
	}
	check(platzhalterMischungen === 0, 'keine der Kennungen in locallang.xlf mischt {n}- und %n$s-Platzhalter im selben Text');

	console.log('     Gegenprobe V-11-G: ein Text mit beiden Platzhalterarten wird erkannt');
	const gemischterText = 'Odds hier höchstens {0} Euro, Quote %1$s';
	check(/\{\d+\}/.test(gemischterText) && /%\d+\$s/.test(gemischterText), 'V-11-G: die Mischung wird von derselben Prüfung erkannt');
}

/* ============= V-12 Jeder Abbruchpfad sperrt den Auslöser und sagt es an */

console.log('\nV-12  Jeder Abbruchpfad sperrt den Auslöser und sagt einen eigenen Satz an');
{
	// Seit C7e gibt es kein sperre()-Hüllwort mehr: der Auslöser wird an jedem
	// frühen Abbruch UNMITTELBAR über goButton.setAttribute('aria-disabled', …)
	// gesperrt, und im laufenden Betrieb führt zeichneAusloeser() den Zustand
	// (Prüfung V-17) — das ist eine bewusste Vereinfachung des Umsetzungsstücks
	// C7e (ein Schreiber statt eines Hüllworts über mehrere Aufrufstellen),
	// keine Lockerung: jeder hier geprüfte frühe Abbruch sperrt weiterhin und
	// sagt weiterhin einen eigenen Satz an.

	// (1) !isAvailable() — vor jeder Verdrahtung, früher Rücksprung.
	const isAvailableBlock = /if \(!isAvailable\(\)\) \{[\s\S]*?\n\t\}/.exec(crapsQuelltext);
	check(isAvailableBlock !== null, 'der Abbruchpfad "!isAvailable()" wurde im Quelltext gefunden');
	if (isAvailableBlock !== null) {
		check(/goButton\.setAttribute\('aria-disabled', 'true'\)/.test(isAvailableBlock[0]), '!isAvailable(): sperrt den Auslöser über aria-disabled');
		check(/sag\(texts\.\w+\)/.test(isAvailableBlock[0]), '!isAvailable(): sagt einen eigenen Satz im Live-Bereich an');
	}

	// (2) ein fehlender oder auf dieser Seite bereits vergebener Tisch-Schlüssel
	// — seit C7e neu (mehrere Tische auf einer Seite, Prüfung V-2 an anderer
	// Stelle deckt die Eindeutigkeit selbst nicht ab, hier geht es nur um den
	// Abbruchpfad).
	const keyBlock = /if \(typeof key !== 'string'[\s\S]*?\n\t\}/.exec(crapsQuelltext);
	check(keyBlock !== null, 'der Abbruchpfad "Tisch-Schlüssel fehlt oder ist doppelt vergeben" wurde im Quelltext gefunden');
	if (keyBlock !== null) {
		check(/goButton\.setAttribute\('aria-disabled', 'true'\)/.test(keyBlock[0]), 'Schlüssel-Abbruch: sperrt den Auslöser über aria-disabled');
		check(/sag\(texts\.\w+\)/.test(keyBlock[0]), 'Schlüssel-Abbruch: sagt einen eigenen Satz an');
	}

	// (3) der catch-Zweig (u. a. "connectDice() liefert ok: false").
	const catchBlock = /\} catch \(error\) \{[\s\S]*?\n\t\}/.exec(crapsQuelltext);
	check(catchBlock !== null, 'der catch-Zweig (u. a. "connectDice() liefert ok: false") wurde gefunden');
	if (catchBlock !== null) {
		check(/goButton\.setAttribute\('aria-disabled', 'true'\)/.test(catchBlock[0]), 'catch-Zweig: sperrt den Auslöser über aria-disabled');
		check(/sag\(texts\.\w+\)/.test(catchBlock[0]), 'catch-Zweig: sagt einen eigenen Satz an');
		check(/view\.ok === false/.test(crapsQuelltext), 'der Fall connectDice() ok:false wirft in den catch-Zweig hinein');
	}

	// (4) "ein Wurf läuft schon" — seit C7e in onGo(): kein zweiter Wurf wird
	// ausgelöst, und es wird angesagt. Das SPERREN selbst besorgt in diesem
	// Fall bereits zeichneAusloeser() (aufgerufen aus onThrowStart(), geprüft
	// in V-17) — dieser Zweig muss nur verhindern, dass tatsächlich ein
	// zweiter Wurf losgeht.
	const onGoBlock = /function onGo\(\) \{[\s\S]*?\n\t\}/.exec(crapsQuelltext);
	check(onGoBlock !== null, 'die Funktion onGo() wurde im Quelltext gefunden');
	if (onGoBlock !== null) {
		const laeuftSchonBlock = /if \(table\.phase === 'rollt'\) \{[\s\S]*?\n\t\t\t\}/.exec(onGoBlock[0]);
		check(laeuftSchonBlock !== null, 'der Abbruchpfad "ein Wurf läuft schon" wurde in onGo() gefunden');
		if (laeuftSchonBlock !== null) {
			check(/sag\(texts\.\w+\)/.test(laeuftSchonBlock[0]), '"läuft schon": sagt einen eigenen Satz an');
			check(!/game\.(start|rethrow)\(/.test(laeuftSchonBlock[0]), '"läuft schon": löst KEINEN weiteren Wurf aus');
		}
	}

	console.log('     Gegenprobe V-12-G: ein Abbruchpfad ohne aria-disabled muss auffallen');
	const verstuemmelterPfad = "if (!isAvailable()) {\n\t\tsag(texts.norandom);\n\t\treturn;\n\t}";
	check(!/goButton\.setAttribute\('aria-disabled', 'true'\)/.test(verstuemmelterPfad),
		'V-12-G: ein Pfad ohne aria-disabled wird von derselben Prüfung tatsächlich als fehlend erkannt');
}

/* =========================== V-13 Ansage nennt Augenzahlen UND Summe */

console.log('\nV-13  Die Ansage nennt beide Augenzahlen UND die Summe');
{
	// Seit C7e sagt NICHT MEHR throw.announce.result den rohen Wurf an —
	// dessen Satz ist mit der Runde verschmolzen: ereignisSatz() (craps.js)
	// wählt je nach Ereignis eine der sechs round.announce.*-Kennungen und
	// füllt sie mit genau denselben drei Werten (Auge 1, Auge 2, Summe), die
	// vorher throw.announce.result allein trug. throw.announce.result bleibt
	// als Kennung bestehen (Status.html liefert data-text-result weiterhin),
	// wird von craps.js aber nicht mehr gefüllt — das prüft V-11 (keine
	// Karteileiche, weil der Text noch im Markup transportiert wird).
	const localesQuelltext = lies(LOCALLANG_PFAD);
	const DREISTELLIGE_ANSAGEN = ['round.announce.natural', 'round.announce.craps', 'round.announce.pointset', 'round.announce.pointmade', 'round.announce.sevenout', 'round.announce.roll'];
	for (const id of DREISTELLIGE_ANSAGEN) {
		const treffer = new RegExp(`<trans-unit id="${id.replace(/\./g, '\\.')}">\\s*<source>([^<]*)</source>`).exec(localesQuelltext);
		check(treffer !== null, `${id} existiert`);
		if (treffer !== null) {
			check(treffer[1].includes('{0}') && treffer[1].includes('{1}') && treffer[1].includes('{2}'),
				`${id} enthält {0}, {1} und {2}`, treffer[1]);
		}
	}
	const ereignisSatzBlock = /function ereignisSatz\(report\) \{[\s\S]*?\n\t\}/.exec(crapsQuelltext);
	check(ereignisSatzBlock !== null, 'die Funktion ereignisSatz() wurde im Quelltext gefunden');
	if (ereignisSatzBlock !== null) {
		check(/const werte = \[report\.faces\[0\], report\.faces\[1\], report\.sum\]/.test(ereignisSatzBlock[0]),
			'ereignisSatz() liest werte aus report.faces[0], report.faces[1] und report.sum');
		check(/fuelle\(\{/.test(ereignisSatzBlock[0]) && /,\s*werte\)/.test(ereignisSatzBlock[0]),
			'ereignisSatz() füllt eine der sechs Ansagen mit genau diesen werte');
	}
}

/* ============================= V-14 Drehmatrix aus dem Vektor, kein Winkel */

console.log('\nV-14  Die Drehmatrix wird aus dem Vektor geschrieben, nicht aus einem Winkel');
{
	for (const prop of ['--cr-m11', '--cr-m12', '--cr-m21', '--cr-m22']) {
		check(diceViewOhneKommentare.includes(`setProperty('${prop}'`), `dice-view.js setzt ${prop}`);
	}
	check(!/Math\.atan/.test(diceViewOhneKommentare), 'dice-view.js enthält kein Math.atan');
	check(!/\bdeg\b/.test(diceViewOhneKommentare), 'dice-view.js enthält kein "deg"');
	check(!/rotate\(/.test(diceViewOhneKommentare), 'dice-view.js enthält kein rotate(');
	const trayCss = lies(TRAY_CSS_PFAD);
	check(/matrix\(/.test(trayCss), 'tray.css benutzt matrix(');
}

/* ================= V-15 craps.js rechnet keine Quote, wertet keine Wette aus */

console.log('\nV-15  craps.js rechnet keine Quote und wertet keine Wette aus (neu, C7e)');
{
	const VERBOTENE_ZEICHENKETTEN = ['RATIO', 'ODDS_MULT', 'stakeUnit', '9 zu 5', '7 zu 6', 'Math.floor'];
	const gefunden = VERBOTENE_ZEICHENKETTEN.filter((z) => crapsOhneKommentare.includes(z));
	check(gefunden.length === 0, 'craps.js enthält keine dieser Quoten-Zeichenketten', ...gefunden);

	// Keine der elf Summen (2…12) als unmittelbarer Vergleich — das ist Sache
	// von wagers-craps.js. sum === n taucht in craps.js nirgends auf.
	const summenVergleiche = [];
	for (let n = 2; n <= 12; n++) {
		if (new RegExp(`sum\\s*===\\s*${n}\\b`).test(crapsOhneKommentare)) {
			summenVergleiche.push(n);
		}
	}
	check(summenVergleiche.length === 0, 'craps.js vergleicht an keiner Stelle eine Wurfsumme unmittelbar (sum === n)', ...summenVergleiche.map(String));

	console.log('     Gegenprobe V-15-G: eine eingefügte Zeile "if (sum === 7)" wird erkannt');
	const verfaelscht = `${crapsOhneKommentare}\nif (sum === 7) { /* … */ }`;
	check(/sum\s*===\s*7\b/.test(verfaelscht), 'V-15-G: die eingefügte Summenprüfung wird von derselben Prüfung erkannt');
}

/* =========================== V-16 pagehide entsteht nicht doppelt */

console.log('\nV-16  Der pagehide-Weg entsteht nicht doppelt (neu, C7e)');
{
	const pagehideAufrufe = [...crapsOhneKommentare.matchAll(/addEventListener\(\s*'pagehide'/g)];
	check(pagehideAufrufe.length === 1, `craps.js meldet genau einen pagehide-Zuhörer an (gefunden: ${pagehideAufrufe.length})`);

	const pagehideHandlerBlock = /pagehideHandler = \(\) => \{[\s\S]*?\n\t\t\};/.exec(crapsQuelltext);
	check(pagehideHandlerBlock !== null, 'der Rumpf von pagehideHandler wurde im Quelltext gefunden');
	if (pagehideHandlerBlock !== null) {
		check(!/bank\.close\(/.test(pagehideHandlerBlock[0]), 'pagehideHandler ruft KEIN bank.close() auf (das tut table-controls.js)');
		check(!/felt\?\.destroy\(|felt\.destroy\(/.test(pagehideHandlerBlock[0]), 'pagehideHandler ruft KEIN felt.destroy() auf (das tut table-controls.js)');
		check(/input\??\.destroy\(\)/.test(pagehideHandlerBlock[0]) && /view\??\.destroy\(\)/.test(pagehideHandlerBlock[0]),
			'pagehideHandler ruft input.destroy() und view.destroy() auf');
	}

	console.log('     Gegenprobe V-16-G: eine eingefügte Zeile "void bank.close();" wird erkannt');
	const verfaelscht = `${pagehideHandlerBlock?.[0] ?? ''}\nvoid bank.close();`;
	check(/bank\.close\(/.test(verfaelscht), 'V-16-G: das eingefügte bank.close() wird von derselben Prüfung erkannt');
}

/* ============ V-17 Der Auslöser wird nachgeführt, sobald sich der Einsatz ändert */

console.log('\nV-17  Der Auslöser wird nachgeführt, sobald sich der Einsatz ändert (neu, C7e)');
{
	// Dieselbe Prüfung, die am Kartentisch gefehlt hat (DECISIONS.md,
	// 2026-09-06): zeichneAusloeser() muss aus allen vier Stellen gerufen
	// werden, nicht nur bei einem Zustandswechsel.
	const FUNKTIONEN = ['onState', 'onRefresh', 'onPlace', 'onTakeBack'];
	for (const name of FUNKTIONEN) {
		const block = new RegExp(`(?:async )?function ${name}\\([\\s\\S]*?\\n\\t\\}`).exec(crapsQuelltext);
		check(block !== null, `die Funktion ${name}() wurde im Quelltext gefunden`);
		if (block !== null) {
			check(/zeichneAusloeser\(\)/.test(block[0]), `${name}() ruft zeichneAusloeser() auf`);
		}
	}

	console.log('     Gegenprobe V-17-G: eine Kopie ohne den Aufruf in onPlace() wird erkannt');
	const onPlaceBlock = /async function onPlace\([\s\S]*?\n\t\}/.exec(crapsQuelltext);
	const verfaelscht = (onPlaceBlock?.[0] ?? '').replace('zeichneAusloeser();', '');
	check(!/zeichneAusloeser\(\)/.test(verfaelscht), 'V-17-G: die entfernte Zeile fällt derselben Prüfung tatsächlich auf');
}

/* ==================== V-18 Genau ein Rundenauslöser auf der Seite */

console.log('\nV-18  Genau ein Rundenauslöser auf der Seite (neu, C7e)');
{
	check(/<f:render partial="Table\/Controls" arguments="\{chips: chips, splittable: splittable, mergeable: mergeable\}" \/>/.test(tableHtml),
		'Table.html rendert Table/Controls OHNE go:-Argument');
	check(!/<f:render partial="Table\/Controls"[^>]*\bgo:/.test(tableHtml), 'Table.html übergibt kein go:-Argument an Table/Controls');

	const HTML_DIESER_EXTENSION = [tableHtml, clothHtml, diceHtml, lies(DICESPRITE_HTML_PFAD), statusHtml, throwHtml, feltHtml, roundHtml].join('\n');
	const goTreffer = [...HTML_DIESER_EXTENSION.matchAll(/data-ck-table-go=/g)];
	check(goTreffer.length === 1, `data-ck-table-go steht genau einmal im Markup dieser Extension (gefunden: ${goTreffer.length})`);
	check(/data-ck-table-go=/.test(throwHtml), 'die eine Stelle liegt in Throw.html');

	console.log('     Gegenprobe V-18-G: eine Kopie mit go:-Argument wird erkannt');
	const verfaelscht = tableHtml.replace(
		'<f:render partial="Table/Controls" arguments="{chips: chips, splittable: splittable, mergeable: mergeable}" />',
		"<f:render partial=\"Table/Controls\" arguments=\"{chips: chips, splittable: splittable, mergeable: mergeable, go: 'Würfeln'}\" />"
	);
	check(/<f:render partial="Table\/Controls"[^>]*\bgo:/.test(verfaelscht), 'V-18-G: das eingefügte go:-Argument wird von derselben Prüfung erkannt');
}

/* ================== V-19 Kein deutscher Anzeigetext im neuen JavaScript */

console.log('\nV-19  Kein deutscher Anzeigetext im neuen JavaScript (neu, C7e)');
{
	// craps.js insgesamt läuft bereits vollständig durch V-7 (dieselbe Regel).
	// Hier die drei Dateien, die V-7 noch nicht kennt.
	const localesQuelltext = lies(LOCALLANG_PFAD);
	const mehrwortigeSaetze = [...localesQuelltext.matchAll(/<source>([^<]*)<\/source>/g)]
		.map((m) => m[1])
		.filter((satz) => satz.includes(' '));
	const UMLAUT = /[äöüÄÖÜß]/;

	for (const [name, quelltext] of [
		['bets-craps.js', betsCrapsQuelltext],
		['wagers-craps.js', wagersCrapsQuelltext],
		['round-craps.js', roundCrapsQuelltext],
	]) {
		const geprueft = ohneEntwicklermeldungen(ohneKommentare(quelltext));
		check(!UMLAUT.test(geprueft), `${name} enthält (außerhalb von Kommentaren und Konsolenmeldungen) keinen deutschen Umlaut`);
		const treffer = mehrwortigeSaetze.filter((satz) => geprueft.includes(satz));
		check(treffer.length === 0, `${name} enthält keinen wörtlichen Satz aus locallang.xlf`, ...treffer);
	}
}

/* ============ V-20 Die Bewegungsdrosselung gilt auch für die Runde */

console.log('\nV-20  Die Bewegungsdrosselung gilt auch für die Runde (neu, C7e)');
{
	check(/reducedMotionActive\(\)\s*\?\s*0\s*:\s*SETTLE_DELAY_MS/.test(crapsOhneKommentare),
		'craps.js setzt settleDelayMs auf 0, wenn prefers-reduced-motion: reduce greift');

	const feltCss = lies(FELT_CSS_PFAD);
	const reducedBlock = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/.exec(feltCss);
	check(reducedBlock !== null, 'felt.css enthält einen @media (prefers-reduced-motion: reduce)-Block');
	if (reducedBlock !== null) {
		check(/\.cr-puck\s*\{[\s\S]*?transition:\s*none/.test(reducedBlock[0]),
			'der Block schaltet die Übergangsanimation des Pucks (.cr-puck) ab');
	}
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Genau ein Modul wird eingebunden, jeder'
	+ '\nLive-Bereich bleibt leer, jeder Messpunkt hat genau einen Schreiber, die sechs'
	+ '\nrechnenden Dateien bleiben import- und dokumentfrei, jedes Bedienteil ist'
	+ '\nnativ, die Zielgrößen und Fokusrahmen stimmen, im Spiel wird nur echter'
	+ '\nZufall eingespeist, craps.js rechnet nichts und entscheidet nichts, die'
	+ '\nBewegungsdrosselung ist gebaut (auch für die Runde), die Zeichenschleife hält'
	+ '\nan und räumt ab, alle XLIFF-Kennungen stimmen samt Platzhalterregel, jeder'
	+ '\nAbbruchpfad sperrt und sagt es an, die Ansage nennt beide Augenzahlen und die'
	+ '\nSumme, die Drehmatrix entsteht aus dem Vektor, craps.js rechnet keine Quote und'
	+ '\nwertet keine Wette aus, der pagehide-Weg entsteht nicht doppelt, der Auslöser'
	+ '\nwird bei jeder Einsatzänderung nachgeführt, und genau ein Rundenauslöser steht'
	+ '\nauf der Seite.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
