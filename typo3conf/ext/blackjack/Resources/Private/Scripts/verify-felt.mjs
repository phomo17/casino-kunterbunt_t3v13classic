/**
 * Blackjack – Nachweis des Tuchs (Umsetzungsstück C5b)
 * =======================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Startet keinen Browser, ändert keine
 * Datei, braucht keine laufende TYPO3-Instanz.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/verify-felt.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.15, Umsetzungsstück C5b)
 * -------------------------------------------------------------------
 *   F-1  Genau ein Setzfeld, und es erfüllt den Vertrag
 *   F-2  bets-blackjack.js ist import- und dokumentfrei und regelfrei
 *   F-3  Die Feldliste stimmt gegen das echte Regelwerk
 *   F-4  Der Sprunglink stimmt
 *   F-5  Die sechs Bereiche liegen richtig
 *   F-6  Keine eigene Farbe, alle Tokens vorhanden, keine Regelzahl
 *   F-7  Zielgrößen
 *   F-8  Der erreichbare Name beginnt mit dem sichtbaren Text
 *   F-9  Bewegungsdrosselung
 *   F-10 Table.html ist vollständig verdrahtet
 *   F-11 Alle benutzten XLIFF-Kennungen existieren
 *   F-12 Der Hinweissatz trägt seine Zahlen als Platzhalter
 *
 * ABWEICHUNG BEI F-11 (siehe DECISIONS.md)
 * -----------------------------------------
 * Der Plan verlangt zusätzlich zur Vorwärtsrichtung ("jede in Felt.html und
 * Table.html benutzte Kennung existiert") eine Rückwärtsrichtung ("keine
 * Kennung ist unbenutzt"), beispielhaft am Fund von table.pending. Die
 * Rückwärtsprüfung sucht deshalb über ALLE ausgelieferten .html-Dateien
 * dieser Extension (nicht nur Felt.html/Table.html).
 *
 * Zum Stand C5b war die befristete Ausnahme der neun Karten-Kennungen
 * (card.name, card.facedown, card.suit.*, card.rank.*) hier eingetragen, weil
 * sie erst ab Umsetzungsstück C5c als data-Attribute in CardSprite.html
 * verdrahtet werden. Seit C5c ist das geschehen (siehe dessen
 * Kopfkommentar) — die befristete Ausnahme ist deshalb ERSATZLOS entfernt.
 * Verbleibend: automat.title/automat.description (dauerhaft, siehe unten)
 * und die scharfe Erfassung von table.pending.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/blackjack/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
const SITE = path.join(EXT_ROOT, 'casino_startpage');

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

/** Entfernt Block- und Zeilenkommentare (CSS/JS) sowie Fluid-Kommentare (HTML). */
function ohneKommentare(inhalt) {
	return inhalt
		.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/.*$/gm, '');
}

/** Die Dateien, die ausgeliefert werden oder TYPO3 konfigurieren (wie in verify-cabinet.mjs). */
const AUSGELIEFERT = alleDateien(EXT).filter((datei) => {
	const rel = path.relative(EXT, datei);
	if (rel.startsWith('Resources/Private/Scripts')) {
		return false;
	}
	return rel !== 'README.md' && rel !== 'LICENSE';
});

console.log('\nBlackjack – Nachweis des Tuchs (Umsetzungsstück C5b)');
console.log('=======================================================\n');

const FELT_PARTIAL_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Blackjack/Felt.html');
const FELT_CSS_PFAD = path.join(EXT, 'Resources/Public/Css/felt.css');
const BLACKJACK_CSS_PFAD = path.join(EXT, 'Resources/Public/Css/blackjack.css');
const TABLE_HTML_PFAD = path.join(EXT, 'Resources/Private/ContentElements/Table.html');
const BETS_JS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/bets-blackjack.js');
const RULES_PFAD = path.join(EXT, 'Resources/Public/JavaScript/rules-blackjack.js');
const LOCALLANG_PFAD = path.join(EXT, 'Resources/Private/Language/locallang.xlf');
const TOKENS_PFAD = path.join(SITE, 'Resources/Public/Css/tokens.css');
const TABLE_BETS_SITE_PFAD = path.join(SITE, 'Resources/Public/JavaScript/table-bets.js');

const feltQuelltext = lies(FELT_PARTIAL_PFAD);
const feltCssQuelltext = lies(FELT_CSS_PFAD);
const blackjackCssQuelltext = lies(BLACKJACK_CSS_PFAD);
const tableHtmlQuelltext = lies(TABLE_HTML_PFAD);
const betsJsQuelltext = lies(BETS_JS_PFAD);
const localesQuelltext = lies(LOCALLANG_PFAD);
const tokensQuelltext = lies(TOKENS_PFAD);

const regeln = await import(pathToFileURL(RULES_PFAD).href);
const bets = await import(pathToFileURL(BETS_JS_PFAD).href);
const { BetTable } = await import(pathToFileURL(TABLE_BETS_SITE_PFAD).href);

/* ================================================================= F-1 */

console.log('F-1  Genau ein Setzfeld, und es erfüllt den Vertrag');
{
	const ohneKomm = ohneKommentare(feltQuelltext);
	const felder = [...ohneKomm.matchAll(/<button\b[^>]*data-ck-field="([^"]*)"[^>]*>([\s\S]*?)<\/button>/g)];
	check(felder.length === 1, `genau ein [data-ck-field] (gefunden: ${felder.length})`);

	if (felder.length === 1) {
		const [, fieldId, innerer] = felder[0];
		const ganzesTag = felder[0][0];
		check(fieldId === bets.BOX_FIELD_ID, `der Feldwert ist BOX_FIELD_ID ("${bets.BOX_FIELD_ID}", gefunden: "${fieldId}")`);
		check(/<button\s+type="button"/.test(ganzesTag), 'es ist ein <button type="button">');
		// Der sichtbare Text kann als Literal ODER als <f:translate>-ViewHelper
		// vorliegen — im Fluid-Quelltext gibt es dann keinen literalen
		// Text-Knoten, sondern nur den ViewHelper-Aufruf, der ihn erst zur
		// Laufzeit einsetzt.
		const literalerText = innerer.replace(/<[^>]*>/g, '').trim();
		const hatUebersetztenText = /<f:translate\b/.test(innerer);
		check(literalerText !== '' || hatUebersetztenText, 'trägt sichtbaren Text (Literal oder f:translate)');
		check(/data-text-fieldname="[^"]+"/.test(ganzesTag), 'trägt data-text-fieldname');
		check(/data-text-fieldname-empty="[^"]+"/.test(ganzesTag), 'trägt data-text-fieldname-empty');
	}
}

/* ================================================================= F-2 */

console.log('\nF-2  bets-blackjack.js ist import- und dokumentfrei und regelfrei');
{
	const ohneKomm = ohneKommentare(betsJsQuelltext);
	check(!/\bimport\s/.test(ohneKomm), 'kein import');
	check(!/\bdocument\b/.test(ohneKomm), 'kein document');

	const zahlenfolgen = [...ohneKomm.matchAll(/\b\d{2,}\b/g)].map((m) => m[0]);
	check(zahlenfolgen.length === 0,
		'keine zwei- oder mehrstellige Ziffernfolge außerhalb von Kommentaren (eine Regelzahl gehört ausschließlich in rules-blackjack.js)',
		...zahlenfolgen);
}

/* ================================================================= F-3 */

console.log('\nF-3  Die Feldliste stimmt gegen das echte Regelwerk');
{
	const fields = bets.buildFields(regeln);
	check(Array.isArray(fields) && fields.length === 1, `buildFields(rules) liefert genau ein Feld (gefunden: ${fields.length})`);
	if (fields.length === 1) {
		check(fields[0].max === regeln.BET_MAX, `das Feld trägt max === rules.BET_MAX (${regeln.BET_MAX}, gefunden: ${fields[0].max})`);
	}
	const gefundenerRoundMax = bets.roundMax(regeln);
	check(gefundenerRoundMax === regeln.BET_MAX, `roundMax(rules) === rules.BET_MAX (gefunden: ${gefundenerRoundMax})`);

	let wurfBeimAnlegen = null;
	try {
		new BetTable({ fields, roundMax: gefundenerRoundMax }); // eslint-disable-line no-new
	} catch (error) {
		wurfBeimAnlegen = error;
	}
	check(wurfBeimAnlegen === null, 'new BetTable({ fields, roundMax }) nimmt die Feldliste ohne Wurf entgegen',
		String(wurfBeimAnlegen));
}

/* ================================================================= F-4 */

console.log('\nF-4  Der Sprunglink stimmt');
{
	const ohneKomm = ohneKommentare(feltQuelltext);
	const feltStart = ohneKomm.indexOf('class="ck-felt');
	check(feltStart !== -1, 'es gibt ein Element mit class="ck-felt …"');
	if (feltStart !== -1) {
		// Das erste Kind-Tag NACH dem öffnenden .ck-felt-Tag.
		const nachFeltOeffnung = ohneKomm.slice(ohneKomm.indexOf('>', feltStart) + 1);
		const ersterTagMatch = nachFeltOeffnung.match(/<([a-zA-Z0-9:]+)\b[^>]*>/);
		check(ersterTagMatch !== null && ersterTagMatch[1] === 'a',
			'das erste Kind-Element von .ck-felt ist ein <a>', ersterTagMatch?.[0] ?? '(keins gefunden)');
		if (ersterTagMatch) {
			const tag = ersterTagMatch[0];
			check(/class="ck-skiplink\b/.test(tag), 'es trägt class="ck-skiplink …"', tag);
			check(/href="#bj-controls"/.test(tag), 'es zeigt auf href="#bj-controls"', tag);
		}
	}

	const tableOhneKomm = ohneKommentare(tableHtmlQuelltext);
	check(/id="bj-controls"[^>]*tabindex="-1"|tabindex="-1"[^>]*id="bj-controls"/.test(tableOhneKomm),
		'Table.html enthält ein Element mit id="bj-controls" und tabindex="-1"');
}

/* ================================================================= F-5 */

console.log('\nF-5  Die sechs Bereiche liegen richtig');
{
	const ohneBlockKomm = feltCssQuelltext.replace(/\/\*[\s\S]*?\*\//g, '');
	const areasMatch = ohneBlockKomm.match(/grid-template-areas:\s*([\s\S]*?);/);
	check(areasMatch !== null, 'felt.css definiert grid-template-areas');
	if (areasMatch) {
		const areasText = areasMatch[1];
		for (const bereich of ['dealer', 'shoe', 'discard', 'insurance', 'seat']) {
			check(new RegExp(`\\b${bereich}\\b`).test(areasText), `grid-template-areas nennt den Bereich "${bereich}"`);
		}
	}

	const ohneKomm = ohneKommentare(feltQuelltext);
	const KLASSEN = {
		dealer: 'bj-felt__dealer',
		shoe: 'bj-felt__shoe',
		discard: 'bj-felt__discard',
		insurance: 'bj-felt__insurance',
		seat: 'bj-felt__seat',
	};
	for (const [bereich, klasse] of Object.entries(KLASSEN)) {
		const treffer = [...ohneKomm.matchAll(new RegExp(`class="${klasse}"`, 'g'))];
		check(treffer.length === 1, `Felt.html enthält genau ein Element class="${klasse}" (Bereich ${bereich}, gefunden: ${treffer.length})`);
	}
}

/* ================================================================= F-6 */

console.log('\nF-6  Keine eigene Farbe, alle Tokens vorhanden, keine Regelzahl');
{
	const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
	const FUNKTION = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g;
	const geprueft = [
		[FELT_PARTIAL_PFAD, feltQuelltext],
		[FELT_CSS_PFAD, feltCssQuelltext],
		[BLACKJACK_CSS_PFAD, blackjackCssQuelltext],
	];
	const farbTreffer = [];
	for (const [pfad, inhalt] of geprueft) {
		const ohneKomm = ohneKommentare(inhalt);
		for (const m of ohneKomm.matchAll(HEX)) {
			farbTreffer.push(`${kurz(pfad)}: ${m[0]}`);
		}
		for (const m of ohneKomm.matchAll(FUNKTION)) {
			farbTreffer.push(`${kurz(pfad)}: ${m[0]}…`);
		}
	}
	check(farbTreffer.length === 0, 'kein ausgeschriebener Farbwert in Felt.html, felt.css oder blackjack.css', ...farbTreffer);

	const definiert = new Set([...tokensQuelltext.matchAll(/^\s*(--ck-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));
	const benutzt = new Set();
	for (const [, inhalt] of geprueft) {
		for (const m of inhalt.matchAll(/var\(\s*(--ck-[a-z0-9-]+)/g)) {
			benutzt.add(m[1]);
		}
	}
	const unbekannt = [...benutzt].filter((name) => !definiert.has(name));
	check(unbekannt.length === 0, `${benutzt.size} benutzte Tokens, alle in tokens.css definiert`, ...unbekannt);

	const VERBOTENE_ZEICHENKETTEN = [
		'3:2', '3 zu 2', '2:1', '2 zu 1', '6 Deck', 'sechs Deck', '312',
		'75 %', '0,40', '0.40', 'S17', 'weiche 17', 'weichen 17', '+3',
		'Trennkarte bei',
	];
	const regelTreffer = [];
	for (const [pfad, inhalt] of geprueft) {
		for (const zk of VERBOTENE_ZEICHENKETTEN) {
			if (inhalt.includes(zk)) {
				regelTreffer.push(`${kurz(pfad)}: „${zk}"`);
			}
		}
	}
	check(regelTreffer.length === 0, 'keine der 15 verbotenen Zeichenketten in Felt.html, felt.css oder blackjack.css', ...regelTreffer);
}

/* ================================================================= F-7 */

console.log('\nF-7  Zielgrößen');
{
	/**
	 * Liest alle Regelblöcke einer CSS-Datei mit ihren Deklarationen und
	 * prüft, ob min-inline-size UND min-block-size gemeinsam unter 2.75rem
	 * liegen. Der WERT wird gelesen, nicht nur das Vorhandensein beider
	 * Eigenschaften gezählt (DECISIONS.md 2026-09-05, F-7 nachgeschärft).
	 */
	function remWert(deklaration, eigenschaft) {
		const m = deklaration.match(new RegExp(`${eigenschaft}\\s*:\\s*([0-9.]+)rem`));
		return m ? parseFloat(m[1]) : null;
	}

	function unterschreitungen(cssInhalt) {
		const treffer = [];
		const ohneBlockKomm = cssInhalt.replace(/\/\*[\s\S]*?\*\//g, '');
		for (const m of ohneBlockKomm.matchAll(/\{([^}]*)\}/g)) {
			const deklaration = m[1];
			const inlineSize = remWert(deklaration, 'min-inline-size');
			const blockSize = remWert(deklaration, 'min-block-size');
			if (inlineSize !== null && blockSize !== null && inlineSize < 2.75 && blockSize < 2.75) {
				treffer.push(`min-inline-size: ${inlineSize}rem, min-block-size: ${blockSize}rem`);
			}
		}
		return treffer;
	}

	const treffer = [...unterschreitungen(feltCssQuelltext), ...unterschreitungen(blackjackCssQuelltext)];
	check(treffer.length === 0,
		'keine Regel in felt.css/blackjack.css setzt min-inline-size UND min-block-size gemeinsam unter 2,75rem',
		...treffer);

	console.log('     Gegenprobe F-7-G: eine erfundene Regel mit 2rem/2rem muss auffallen');
	const erfundeneRegel = '.erfunden { min-inline-size: 2rem; min-block-size: 2rem; }';
	check(unterschreitungen(erfundeneRegel).length === 1, 'F-7-G: die erfundene Regel wird als Unterschreitung erkannt');
}

/* ================================================================= F-8 */

console.log('\nF-8  Der erreichbare Name beginnt mit dem sichtbaren Text');
{
	const einheiten = new Map();
	for (const m of localesQuelltext.matchAll(/<trans-unit id="([^"]+)">\s*<source>([\s\S]*?)<\/source>/g)) {
		einheiten.set(m[1], m[2]);
	}
	for (const id of ['felt.box.name', 'felt.box.name.empty']) {
		const wert = einheiten.get(id) ?? '';
		check(wert.startsWith('{0}'), `${id} beginnt mit {0} (gefunden: "${wert.slice(0, 20)}…")`);
	}
}

/* ================================================================= F-9 */

console.log('\nF-9  Bewegungsdrosselung');
{
	const CSS_DATEIEN = AUSGELIEFERT.filter((d) => d.endsWith('.css'));
	const treffer = [];
	for (const datei of CSS_DATEIEN) {
		const inhalt = lies(datei);
		const benutztBewegung = /\banimation\s*:/.test(inhalt) || /\btransition\s*:/.test(inhalt);
		if (benutztBewegung && !/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(inhalt)) {
			treffer.push(kurz(datei));
		}
	}
	check(treffer.length === 0,
		'jede .css-Datei mit animation: oder transition: enthält auch einen @media (prefers-reduced-motion: reduce)-Block',
		...treffer);
}

/* ================================================================ F-10 */

console.log('\nF-10 Table.html ist vollständig verdrahtet');
{
	const ohneKomm = ohneKommentare(tableHtmlQuelltext);
	for (const partial of ['Table/ChipSprite', 'Table/Blackjack/CardSprite', 'Table/Status', 'Table/Blackjack/Felt', 'Table/Controls', 'Table/History']) {
		check(new RegExp(`partial="${partial.replace('/', '\\/')}"`).test(ohneKomm), `rendert das Partial ${partial}`);
	}

	const controlsAufruf = ohneKomm.match(/<f:render partial="Table\/Controls"[^>]*\/>/);
	check(controlsAufruf !== null, 'ruft Table/Controls auf');
	if (controlsAufruf) {
		check(/go:\s*'[^']*\{f:translate/.test(controlsAufruf[0]) || /go:\s*'\S+'/.test(controlsAufruf[0]),
			'Table/Controls wird mit einer nicht leeren go-Beschriftung aufgerufen', controlsAufruf[0]);
	}

	for (const asset of ['EXT:blackjack/Resources/Public/Css/blackjack.css', 'EXT:blackjack/Resources/Public/Css/felt.css',
		'EXT:blackjack/Resources/Public/Css/cards.css', 'EXT:casino_startpage/Resources/Public/Css/table.css']) {
		check(ohneKomm.includes(asset), `bindet ${asset} ein`);
	}
}

/* ================================================================ F-11 */

console.log('\nF-11 Alle benutzten XLIFF-Kennungen existieren');
{
	const einheiten = new Map();
	for (const m of localesQuelltext.matchAll(/<trans-unit id="([^"]+)">\s*<source>([\s\S]*?)<\/source>/g)) {
		einheiten.set(m[1], m[2]);
	}

	/*
	 * Eine Kennung wird auf zwei Arten benutzt: als eigener ViewHelper-Tag
	 * (<f:translate key="LLL:EXT:…" />, doppelte Anführungszeichen) oder als
	 * Fluid-Ausdruck innerhalb eines anderen Attributs
	 * ({f:translate(key: 'LLL:EXT:…')}, einfache Anführungszeichen). Beide
	 * Formen werden erfasst.
	 */
	// Drei Schreibweisen kommen im Bestand vor: der eigene Tag mit doppelten
	// Anführungszeichen, der Fluid-Ausdruck mit einfachen Anführungszeichen
	// innerhalb eines anderen Attributs, und derselbe Ausdruck ein weiteres
	// Mal verschachtelt (dann mit rückwärtsgeschütztem \' — z. B. in Table.html,
	// wo {go} als Fluid-Ausdruck innerhalb von "arguments" übergeben wird).
	const TRANSLATE_MUSTER = /f:translate(?:\s+key="|\(key:\s*\\?')LLL:EXT:blackjack\/Resources\/Private\/Language\/locallang\.xlf:([^"'\\]+)/g;

	// Vorwärtsrichtung: jede in Felt.html und Table.html per f:translate
	// genannte Kennung dieser Extension existiert in locallang.xlf.
	const benutzteKennungen = new Set();
	for (const quelle of [feltQuelltext, tableHtmlQuelltext]) {
		for (const m of quelle.matchAll(TRANSLATE_MUSTER)) {
			benutzteKennungen.add(m[1]);
		}
	}
	const fehlend = [...benutzteKennungen].filter((id) => !einheiten.has(id));
	check(fehlend.length === 0,
		`alle ${benutzteKennungen.size} in Felt.html/Table.html benutzten Kennungen existieren in locallang.xlf`,
		...fehlend);

	// Rückwärtsrichtung: keine Kennung ist unbenutzt — gesucht über ALLE
	// ausgelieferten .html-Dateien der Extension. Die befristete Ausnahme
	// der neun Karten-Kennungen (Stand C5b) ist seit C5c entfernt, weil
	// CardSprite.html sie jetzt selbst über f:translate benutzt (siehe
	// Kopfkommentar dieser Datei). Einzige verbleibende, DAUERHAFTE
	// Ausnahme: automat.title/automat.description werden nicht über
	// f:translate, sondern über PHP-Zeichenkettenverkettung in
	// ext_localconf.php benutzt (Blackjack::LANG_FRONTEND . 'automat.title'),
	// seit Umsetzungsstück C4a unverändert und außerhalb des Umfangs dieser
	// Datei.
	const AUSGENOMMEN = new Set(['automat.title', 'automat.description']);
	const alleBenutztenKennungenImHtml = new Set();
	for (const datei of AUSGELIEFERT.filter((d) => d.endsWith('.html'))) {
		for (const m of lies(datei).matchAll(TRANSLATE_MUSTER)) {
			alleBenutztenKennungenImHtml.add(m[1]);
		}
	}
	const unbenutzt = [...einheiten.keys()].filter((id) => !AUSGENOMMEN.has(id) && !alleBenutztenKennungenImHtml.has(id));
	check(unbenutzt.length === 0,
		'keine Kennung (außer den befristet bzw. dauerhaft dokumentierten Ausnahmen) ist ohne f:translate-Fundstelle in dieser Extension — insbesondere ist table.pending nicht mehr vorhanden',
		...unbenutzt);
	check(!einheiten.has('table.pending'), 'table.pending wurde entfernt');
}

/* ================================================================ F-12 */

console.log('\nF-12 Der Hinweissatz trägt seine Zahlen als Platzhalter');
{
	const einheiten = new Map();
	for (const m of localesQuelltext.matchAll(/<trans-unit id="([^"]+)">\s*<source>([\s\S]*?)<\/source>/g)) {
		einheiten.set(m[1], m[2]);
	}
	const hint = einheiten.get('hint.stake') ?? '';
	check(hint.includes('{0}') && hint.includes('{1}'), 'hint.stake enthält {0} und {1}', hint);

	// Platzhalter {0}/{1} selbst entfernen, dann nach verbleibenden Ziffern
	// suchen — was übrig bleibt, wäre eine ausgeschriebene, eigene Ziffernfolge.
	const ohnePlatzhalter = hint.replace(/\{\d+\}/g, '');
	const verbleibendeZiffern = [...ohnePlatzhalter.matchAll(/\d/g)];
	check(verbleibendeZiffern.length === 0,
		'hint.stake enthält außer den Platzhaltern {0}/{1} keine eigene Ziffernfolge',
		...verbleibendeZiffern.map((m) => m[0]));
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Das Tuch trägt genau ein Setzfeld,'
	+ '\nbets-blackjack.js ist import-, dokument- und regelfrei, die Feldliste'
	+ '\nstimmt gegen das echte Regelwerk, der Sprunglink steht richtig, die sechs'
	+ '\nBereiche liegen an der richtigen Stelle, keine eigene Farbe und keine'
	+ '\nRegelzahl kommen vor, die Zielgrößen sind eingehalten, der erreichbare'
	+ '\nName beginnt mit dem sichtbaren Text, die Bewegungsdrosselung ist'
	+ '\nvollständig, Table.html ist vollständig verdrahtet, und jede XLIFF-'
	+ '\nKennung existiert und wird benutzt.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
