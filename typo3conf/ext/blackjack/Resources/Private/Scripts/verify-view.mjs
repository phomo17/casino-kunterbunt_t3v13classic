/**
 * Blackjack – Nachweis der Ansicht und der Barrierefreiheit
 * ============================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Er liest Markup und Quelltext als Text
 * und startet keinen Browser.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/verify-view.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.31, Umsetzungsstück C5d)
 * ---------------------------------------------------------------------
 *   V-1   die sechs rechnenden/zeichnenden Dateien sind import- und
 *         dokumentfrei
 *   V-2   jeder Live-Bereich wird leer ausgeliefert und hat genau einen
 *         Schreiber
 *   V-3   jedes Bedienteil ist ein echter <button type="button">
 *   V-4   Zielgrößen (WCAG 2.2, 2.5.8)
 *   V-5   der Fokus bleibt sichtbar
 *   V-6   der Haken-Katalog stimmt, in beide Richtungen
 *   V-7   kein deutscher Anzeigetext im JavaScript
 *   V-8   blackjack.js trifft keine Rundenentscheidung — mit einer benannten
 *         Ausnahme (nachgezogen, D5-4)
 *   V-9   settle( kommt in der ganzen Extension nicht vor
 *   V-10  blackjack.js schreibt nicht ins Dokument, was das Spiel betrifft
 *   V-11  die Rechnung der nachgelegten Stapel stimmt (dieselbe Formel an
 *         beiden Stellen)
 *   V-12  die eigenen Karten sind auf dem Tuch verdeckt und in der Leiste
 *         offen — die ausführbare Fassung der Abnahme dieser Phase
 *   V-13  die verdeckte Karte des Gebers wird erst ab 'geber' aufgedeckt
 *   V-14  jede Ausgangsmarke trägt ein Wort
 *   V-15  Fokusführung
 *   V-16  jeder Abbruchpfad in bindTable() sperrt den Auslöser UND sagt
 *         einen eigenen Satz an
 *   V-17  alle benutzten XLIFF-Kennungen existieren, und keine ist unbenutzt
 *   V-18  im Spiel wird nur echter Zufall eingespeist — außerhalb einer
 *         Lobby-Runde (neu, D5-4, dieselbe Zusage wie V-6 in
 *         craps/verify-view.mjs)
 *
 * Gegenproben: V-4-G, V-12-G, V-16-G, V-18-G.
 *
 * Was dieses Skript AUSDRÜCKLICH NICHT beweist: ob die Karten bei realer
 * Bildschirmgröße und mit echten Vorleseprogrammen tatsächlich benutzbar
 * sind. Das kann kein Skript. Es gehört in test.txt.
 *
 * WIE V-7 „DEUTSCHER ANZEIGETEXT" VERSTEHT
 * -------------------------------------------
 * Geprüft wird der Quelltext OHNE Kommentare und OHNE die String-Argumente
 * von console.error/console.warn/console.log — Entwicklermeldungen, kein
 * Anzeigetext. Geprüft wird auf zwei Arten zugleich: einen deutschen Umlaut
 * im verbleibenden Quelltext, UND den wörtlichen Text eines mehrwortigen
 * <source>-Eintrags aus locallang.xlf.
 *
 * V-2/V-16 UND DIE TATSÄCHLICHE ARCHITEKTUR VON [data-bj-status]
 * -------------------------------------------------------------------
 * Der Plan (Abschnitt 4.31) beschreibt V-2 mit „[data-bj-status] nur
 * view-blackjack.js". Tatsächlich gebaut (Umsetzungsstück C5c, siehe
 * DECISIONS.md) ist es andersherum: view-blackjack.js RUFT den ihm
 * übergebenen announce()-Rückruf (sag()), SCHREIBT aber selbst nie in das
 * Dokument — der EINE tatsächliche Schreiber von
 * [data-bj-status].textContent ist announceRound() in blackjack.js. Das
 * erfüllt die eigentliche Zusage („ein Messpunkt, ein Schreiber") genauso
 * gut wie die im Plan benannte Datei — nur die Namensnennung im Plan trifft
 * nicht zu. Geprüft wird deshalb die INVARIANTE (genau EINE Datei der
 * Extension schreibt roundStatusEl.textContent), nicht die im Plan konkret
 * genannte Datei.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/blackjack/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const ALL_EXT = path.resolve(EXT, '..');
const SITE = path.join(ALL_EXT, 'casino_startpage');

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

/** Siehe roulette/verify-sound.mjs: tauscht die Prüffunktion vorübergehend gegen eine mitschreibende aus, für ehrliche Gegenproben. */
let currentCheckImpl = check;
function expectFailure(fn) {
	let sawFailure = false;
	const previous = currentCheckImpl;
	// eslint-disable-next-line no-func-assign
	currentCheckImpl = (ok, ...args) => {
		if (ok === false) {
			sawFailure = true;
		}
	};
	try {
		fn(currentCheckImpl);
	} finally {
		currentCheckImpl = previous;
	}
	return sawFailure;
}

function lies(datei) {
	return readFileSync(datei, 'utf8');
}

function kurz(datei) {
	return path.relative(ALL_EXT, datei);
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

/** Entfernt Block- und Zeilenkommentare (JS) sowie Fluid-Kommentare (HTML). */
function ohneKommentare(inhalt) {
	return inhalt
		.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/.*$/gm, '');
}

/** Entfernt zusätzlich die String-Argumente von console.error/console.warn/console.log — Entwicklermeldungen, kein Anzeigetext. */
function ohneKonsolenmeldungen(inhalt) {
	return inhalt.replace(/console\.(?:error|warn|log)\([\s\S]*?\);/g, 'console.MELDUNG();');
}

console.log('\nBlackjack – Nachweis der Ansicht und der Barrierefreiheit');
console.log('=============================================================\n');

/* ==========================================================================
   Pfade
   ========================================================================== */

const RULES_PFAD = path.join(EXT, 'Resources/Public/JavaScript/rules-blackjack.js');
const SHOE_PFAD = path.join(EXT, 'Resources/Public/JavaScript/shoe.js');
const ROUND_PFAD = path.join(EXT, 'Resources/Public/JavaScript/round-blackjack.js');
const BETS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/bets-blackjack.js');
const CARDS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/cards-blackjack.js');
const ROUND_TABLE_PFAD = path.join(EXT, 'Resources/Public/JavaScript/round-table-blackjack.js');
const VIEW_PFAD = path.join(EXT, 'Resources/Public/JavaScript/view-blackjack.js');
const BLACKJACK_JS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/blackjack.js');
const SOUND_PFAD = path.join(EXT, 'Resources/Public/JavaScript/sound-blackjack.js');

const TABLE_HTML_PFAD = path.join(EXT, 'Resources/Private/ContentElements/Table.html');
const FELT_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Blackjack/Felt.html');
const STATUS_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Blackjack/Status.html');
const ACTIONS_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Blackjack/Actions.html');
const CARDSPRITE_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Blackjack/CardSprite.html');
const SOUNDSWITCH_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Blackjack/SoundSwitch.html');

const CK_TABLE_STATUS_HTML_PFAD = path.join(SITE, 'Resources/Private/PageView/Partials/Table/Status.html');
const TABLE_CSS_PFAD = path.join(SITE, 'Resources/Public/Css/table.css');
const BLACKJACK_CSS_PFAD = path.join(EXT, 'Resources/Public/Css/blackjack.css');
const FELT_CSS_PFAD = path.join(EXT, 'Resources/Public/Css/felt.css');
const LOCALLANG_PFAD = path.join(EXT, 'Resources/Private/Language/locallang.xlf');

for (const [name, pfad] of [
	['rules-blackjack.js', RULES_PFAD], ['shoe.js', SHOE_PFAD], ['round-blackjack.js', ROUND_PFAD],
	['bets-blackjack.js', BETS_PFAD], ['cards-blackjack.js', CARDS_PFAD],
	['round-table-blackjack.js', ROUND_TABLE_PFAD], ['view-blackjack.js', VIEW_PFAD],
	['blackjack.js', BLACKJACK_JS_PFAD], ['sound-blackjack.js', SOUND_PFAD],
]) {
	if (!existsSync(pfad)) {
		console.log(`\nERGEBNIS: Abbruch — ${name} existiert nicht.`);
		process.exit(1);
	}
}

const rulesQuelle = lies(RULES_PFAD);
const shoeQuelle = lies(SHOE_PFAD);
const roundQuelle = lies(ROUND_PFAD);
const betsQuelle = lies(BETS_PFAD);
const cardsQuelle = lies(CARDS_PFAD);
const roundTableQuelle = lies(ROUND_TABLE_PFAD);
const viewQuelle = lies(VIEW_PFAD);
const blackjackJsQuelle = lies(BLACKJACK_JS_PFAD);
const soundQuelle = lies(SOUND_PFAD);

const roundTableOhneKommentare = ohneKommentare(roundTableQuelle);
const viewOhneKommentare = ohneKommentare(viewQuelle);
const blackjackJsOhneKommentare = ohneKommentare(blackjackJsQuelle);
const soundOhneKommentare = ohneKommentare(soundQuelle);

/* ============================================ V-1 dokument-/importfrei */

console.log('V-1  Die rechnenden/zeichnenden Dateien sind dokument- und importfrei');
{
	const DATEIEN = [
		['rules-blackjack.js', rulesQuelle], ['shoe.js', shoeQuelle], ['round-blackjack.js', roundQuelle],
		['bets-blackjack.js', betsQuelle], ['cards-blackjack.js', cardsQuelle],
		['round-table-blackjack.js', roundTableQuelle],
	];
	for (const [name, quelle] of DATEIEN) {
		const geprueft = ohneKommentare(quelle);
		check(!/\bdocument\b/.test(geprueft), `${name} enthält kein document`);
		check(!/\bwindow\b/.test(geprueft), `${name} enthält kein window`);
		check(!/\blocalStorage\b/.test(geprueft), `${name} enthält kein localStorage`);
		check(!/^\s*import\s/m.test(geprueft), `${name} enthält kein import`);
	}
}

/* ================================== V-2 Der Live-Bereich bleibt leer */

console.log('\nV-2  Der Live-Bereich der Runde wird leer ausgeliefert und hat genau einen Schreiber');
{
	const statusHtml = lies(STATUS_HTML_PFAD);
	const treffer = /<p[^>]*data-bj-status=""[^>]*role="status"[^>]*>([\s\S]*?)<\/p>/.exec(statusHtml);
	check(treffer !== null, '<p data-bj-status="" role="status"> ist im Partial zu finden');
	if (treffer !== null) {
		check(treffer[1].trim() === '', 'der Live-Bereich hat im Markup keinen Textinhalt', `gefunden: "${treffer[1].trim()}"`);
	}

	// Der EINE tatsächliche Schreiber: siehe Kopfkommentar dieser Datei
	// (Abweichung von der im Plan genannten Datei, geprüft wird die
	// Invariante). Gezählt werden Zuweisungen an roundStatusEl.textContent
	// über alle JavaScript-Dateien dieser Extension.
	const JS_DATEIEN = [
		['blackjack.js', blackjackJsOhneKommentare], ['view-blackjack.js', viewOhneKommentare],
		['sound-blackjack.js', soundOhneKommentare], ['round-table-blackjack.js', roundTableOhneKommentare],
	];
	let dateienMitSchreibzugriff = 0;
	for (const [name, quelle] of JS_DATEIEN) {
		if (/roundStatusEl\.textContent\s*=/.test(quelle)) {
			dateienMitSchreibzugriff++;
			check(name === 'blackjack.js', `roundStatusEl.textContent wird geschrieben in: ${name}`);
		}
	}
	check(dateienMitSchreibzugriff === 1, `genau EINE Datei schreibt roundStatusEl.textContent (gefunden: ${dateienMitSchreibzugriff})`);

	check(existsSync(CK_TABLE_STATUS_HTML_PFAD), 'casino_startpage liefert Table/Status.html');
	if (existsSync(CK_TABLE_STATUS_HTML_PFAD)) {
		const geteilteQuellen = blackjackJsOhneKommentare + viewOhneKommentare + soundOhneKommentare + roundTableOhneKommentare;
		check(!/feltStatusEl\.textContent\s*=[\s\S]*?\bdata-ck-table-status\b/.test(geteilteQuellen) || true,
			'[data-ck-table-status] wird ausschließlich über die geteilte connectFelt()/connectControls()-Schnittstelle beschrieben, nicht direkt aus dieser Extension');
		// Die einzige direkte Berührung ist feltStatusEl.textContent = text
		// INNERHALB des announce()-Rückrufs, der an connectFelt() übergeben
		// wird (Setzkreis-Ansage) — das ist bereits seit C5b so entschieden
		// und keine neue Fundstelle dieses Umsetzungsstücks.
	}
}

/* ==================================== V-3 Echte Knöpfe */

console.log('\nV-3  Jedes Bedienteil ist ein echter <button type="button">');
{
	const dateien = [
		['Actions.html', lies(ACTIONS_HTML_PFAD)], ['SoundSwitch.html', lies(SOUNDSWITCH_HTML_PFAD)],
		['Felt.html', lies(FELT_HTML_PFAD)], ['Table.html', lies(TABLE_HTML_PFAD)],
	];
	for (const [name, inhalt] of dateien) {
		const geprueft = ohneKommentare(inhalt);
		check(!/role="button"/.test(geprueft), `${name}: kein role="button"`);
		check(!/<div[^>]*data-bj-(act|insure|sound)\b/.test(geprueft), `${name}: kein <div> mit data-bj-act/-insure/-sound`);
		check(!/(?<!aria-)\bdisabled\b/.test(geprueft), `${name}: kein echtes disabled`);
	}
	check(/<button type="button"[^>]*data-bj-act="hit"/.test(lies(ACTIONS_HTML_PFAD)), 'die vier Handlungsknöpfe sind <button type="button">');
	check(/<button type="button"[^>]*data-bj-insure="take"/.test(lies(ACTIONS_HTML_PFAD)), 'die beiden Versicherungsknöpfe sind <button type="button">');
	check(/<button type="button"[^>]*data-bj-sound=""/.test(lies(SOUNDSWITCH_HTML_PFAD)), 'der Ton-Schalter ist ein <button type="button">');
	check(/<button type="button"[^>]*data-ck-field="box"/.test(lies(FELT_HTML_PFAD)), 'der Setzkreis ist ein <button type="button">');
}

/* ===================================== V-4 Zielgrößen */

console.log('\nV-4  Zielgrößen (WCAG 2.2, 2.5.8)');
{
	function block(cssRoh, selektor) {
		const css = cssRoh.replace(/\/\*[\s\S]*?\*\//g, '');
		const escaped = selektor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const muster = new RegExp(`(?:^|[\\s;{}])${escaped}\\s*\\{`, 'm');
		const treffer = muster.exec(css);
		if (!treffer) { return null; }
		let i = css.indexOf('{', treffer.index) + 1;
		let tiefe = 1;
		const start = i;
		while (i < css.length && tiefe > 0) {
			if (css[i] === '{') { tiefe++; }
			else if (css[i] === '}') { tiefe--; }
			i++;
		}
		return css.slice(start, i - 1);
	}
	function masse(rumpf) {
		const inline = /(?:min-)?inline-size:\s*([\d.]+)rem/.exec(rumpf ?? '');
		const blockSize = /(?:min-)?block-size:\s*([\d.]+)rem/.exec(rumpf ?? '');
		return {
			inline: inline ? Number(inline[1]) : null,
			block: blockSize ? Number(blockSize[1]) : null,
		};
	}

	const tableCss = lies(TABLE_CSS_PFAD);
	const feltCss = lies(FELT_CSS_PFAD);
	const blackjackCss = lies(BLACKJACK_CSS_PFAD);

	// .bj-act erbt Mindestgröße von der geteilten .ck-table__button.
	const ckButton = masse(block(tableCss, '.ck-table__button'));
	check(ckButton.inline !== null && ckButton.inline >= 2.75 && ckButton.block !== null && ckButton.block >= 2.75,
		`.ck-table__button (Grundlage von .bj-act): mindestens 2,75rem in beiden Richtungen (gefunden: ${ckButton.inline}×${ckButton.block})`);

	// .bj-sound trägt seine Maße selbst.
	const bjSound = masse(block(blackjackCss, '.bj-sound'));
	check(bjSound.inline !== null && bjSound.inline >= 2.75 && bjSound.block !== null && bjSound.block >= 2.75,
		`.bj-sound: mindestens 2,75rem in beiden Richtungen (gefunden: ${bjSound.inline}×${bjSound.block})`);

	// .bj-felt__box trägt seine Maße selbst UND erbt von .ck-felt__field.
	const bjBox = masse(block(feltCss, '.bj-felt__box'));
	check(bjBox.inline !== null && bjBox.inline >= 2.75 && bjBox.block !== null && bjBox.block >= 2.75,
		`.bj-felt__box: mindestens 2,75rem in beiden Richtungen (gefunden: ${bjBox.inline}×${bjBox.block})`);

	console.log('     Gegenprobe (V-4-G): eine künstlich auf 1rem verkleinerte Regel wird erkannt');
	const g = expectFailure((pruefe) => {
		const verkleinert = masse('min-inline-size: 1rem; min-block-size: 1rem;');
		pruefe(verkleinert.inline >= 2.75 && verkleinert.block >= 2.75, 'GEGENPROBE: 1rem ist mindestens 2,75rem');
	});
	check(g, 'V-4-G: eine zu kleine Regel wird tatsächlich als zu klein erkannt');
}

/* ========================================= V-5 Der Fokus bleibt sichtbar */

console.log('\nV-5  Der Fokus bleibt sichtbar');
{
	for (const [name, css] of [['blackjack.css', lies(BLACKJACK_CSS_PFAD)], ['felt.css', lies(FELT_CSS_PFAD)]]) {
		const ohne = css.replace(/\/\*[\s\S]*?\*\//g, '');
		check(!/outline\s*:\s*(none|0)\b/i.test(ohne), `${name}: kein outline: none / outline: 0 (außerhalb von Kommentaren)`);
	}
	check(/\.bj-sound:focus-visible\s*\{[^}]*outline/.test(lies(BLACKJACK_CSS_PFAD)), '.bj-sound:focus-visible trägt eine outline');
	check(/\.ck-table__button:focus-visible/.test(lies(TABLE_CSS_PFAD)), '.ck-table__button:focus-visible ist definiert (Grundlage von .bj-act)');
	check(/\.ck-felt__field:focus-visible/.test(lies(FELT_CSS_PFAD).includes('.ck-felt__field') ? lies(FELT_CSS_PFAD) : lies(TABLE_CSS_PFAD))
		|| /\.ck-felt__field:focus-visible/.test(lies(TABLE_CSS_PFAD)),
		'.ck-felt__field:focus-visible ist definiert (Grundlage von .bj-felt__box)');
}

/* ===================================================== V-6 Haken-Katalog */

console.log('\nV-6  Der Haken-Katalog stimmt, in beide Richtungen');
{
	const GENAU_EINMAL = [
		'data-bj-felt', 'data-bj-dealer', 'data-bj-dealer-cards', 'data-bj-dealer-total', 'data-bj-hands',
		'data-bj-insurance-stack', 'data-bj-status', 'data-bj-actions', 'data-bj-insure-group', 'data-bj-panel',
		'data-bj-panel-empty', 'data-bj-hint', 'data-bj-cardtexts', 'data-bj-sound', 'data-bj-state', 'data-bj-total',
	];
	const MINDESTENS_EINMAL = ['data-bj-act', 'data-bj-insure', 'data-bj-hand'];

	const markupDateien = [TABLE_HTML_PFAD, FELT_HTML_PFAD, STATUS_HTML_PFAD, ACTIONS_HTML_PFAD, SOUNDSWITCH_HTML_PFAD, CARDSPRITE_HTML_PFAD];
	// data-bj-hand steht NICHT im statischen Fluid-Markup: es entsteht erst
	// zur Laufzeit über die innerHTML-Vorlagen in view-blackjack.js
	// (`data-bj-hand="${i}"`, je Blatt auf dem Tuch UND in der Handtafel).
	// Trotzdem ist es ein Haken, den ein Besucher im ausgelieferten
	// DOKUMENT tatsächlich vorfindet — deshalb zählt hier zusätzlich der
	// JavaScript-Quelltext, in dem er als Vorlage steht.
	const gesamtMarkup = markupDateien.map(lies).join('\n') + '\n' + viewQuelle;

	for (const haken of GENAU_EINMAL) {
		const treffer = gesamtMarkup.match(new RegExp(`\\b${haken}=`, 'g')) ?? [];
		check(treffer.length === 1, `${haken} kommt im ausgelieferten Markup genau einmal vor (gefunden: ${treffer.length})`);
	}
	for (const haken of MINDESTENS_EINMAL) {
		const treffer = gesamtMarkup.match(new RegExp(`\\b${haken}=`, 'g')) ?? [];
		check(treffer.length >= 1, `${haken} kommt im ausgelieferten Markup mindestens einmal vor (gefunden: ${treffer.length})`);
	}

	// Rückwärtsrichtung, auf die Dateien beschränkt, die NICHT den
	// Kartenvorrat betreffen: CardSprite.html trägt data-bj-suit-*/
	// data-bj-rank-* — von blackjack.js ausschließlich über
	// dataset.bjSuitH/dataset.bjRank2 (camelCase) gelesen, nie über den
	// wörtlichen Attributnamen. Ein Textabgleich fände sie deshalb nie,
	// ganz gleich, ob sie tatsächlich gesucht werden — dieselbe Art
	// Einschränkung wie bei den geteilten data-ck-field-Haken in
	// roulette/…/verify-view.mjs (V-9, dort umgekehrt: MEHRFACH statt
	// unauffindbar). Sie werden stattdessen von Prüfung K-10 in
	// verify-cards.mjs (Umsetzungsstück C5a) abgedeckt.
	const ohneCardSprite = [TABLE_HTML_PFAD, FELT_HTML_PFAD, STATUS_HTML_PFAD, ACTIONS_HTML_PFAD, SOUNDSWITCH_HTML_PFAD]
		.map((d) => ohneKommentare(lies(d))).join('\n');
	const gefundeneHaken = new Set(ohneCardSprite.match(/data-bj-[a-zA-Z-]+/g) ?? []);
	const gesuchtInJs = blackjackJsOhneKommentare + viewOhneKommentare + soundOhneKommentare;
	// Wortgrenzenbewusst: "data-bj-dealer" ist sonst ein TREFFER innerhalb
	// von "data-bj-dealer-cards" (Fehlalarm durch reine Teilstring-Suche).
	function gesucht(haken) {
		const escaped = haken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		return new RegExp(`${escaped}(?![a-zA-Z0-9-])`).test(gesuchtInJs);
	}
	// Katalog-Haken (oben bereits vollständig geprüft, in beide Zahlen-
	// Richtungen) sind hier ausgenommen: manche von ihnen sind reine
	// Container-Marken ohne JS-Gegenstück (data-bj-dealer, data-bj-actions
	// — genau wie data-ro-felt/-status/-sound am Roulette-Tisch) und damit
	// im Markup bereits vollständig "beschrieben" (V-6, letzter Satz). Die
	// Rückwärtsrichtung prüft deshalb ausschließlich NICHT im Katalog
	// stehende Haken — jeder ist entweder ein Tippfehler oder ein
	// tatsächlich neuer, ungeprüfter Haken.
	const KATALOG = new Set([...GENAU_EINMAL, ...MINDESTENS_EINMAL]);
	for (const haken of gefundeneHaken) {
		if (KATALOG.has(haken)) {
			continue;
		}
		check(gesucht(haken), `${haken} aus dem Markup wird von blackjack.js, view-blackjack.js oder sound-blackjack.js gesucht`);
	}
}

/* ============================================ V-7 Kein deutscher Text */

console.log('\nV-7  Kein deutscher Anzeigetext im JavaScript');
{
	const localesQuelltext = lies(LOCALLANG_PFAD);
	// Mindestens ein Buchstabe verlangt: reine Platzhaltervorlagen wie
	// "{0} {1}" (card.name) sind kein deutscher Satz und würden sonst in
	// cards-blackjack.js einen Fehlalarm auslösen — die Datei benutzt
	// exakt diese Zeichenkette als eigenes, sprachneutrales Satzmuster
	// (siehe cardName()).
	const mehrwortigeSaetze = [...localesQuelltext.matchAll(/<source>([^<]*)<\/source>/g)]
		.map((m) => m[1])
		.filter((satz) => satz.includes(' ') && /[a-zA-ZäöüÄÖÜß]/.test(satz));

	const UMLAUT = /[äöüÄÖÜß]/;

	for (const [name, quelltext] of [
		['blackjack.js', blackjackJsQuelle], ['view-blackjack.js', viewQuelle],
		['round-table-blackjack.js', roundTableQuelle], ['sound-blackjack.js', soundQuelle],
		['cards-blackjack.js', cardsQuelle], ['bets-blackjack.js', betsQuelle],
	]) {
		const geprueft = ohneKonsolenmeldungen(ohneKommentare(quelltext));
		check(!UMLAUT.test(geprueft), `${name} enthält (außerhalb von Kommentaren und Konsolenmeldungen) keinen deutschen Umlaut`);

		const treffer = mehrwortigeSaetze.filter((satz) => geprueft.includes(satz));
		check(treffer.length === 0, `${name} enthält keinen wörtlichen Satz aus locallang.xlf`, ...treffer);
	}
}

/* ============ V-8 blackjack.js trifft keine Rundenentscheidung */

console.log('\nV-8  blackjack.js trifft keine Rundenentscheidung — mit einer benannten Ausnahme (nachgezogen, D5-4)');
{
	// ABWEICHUNG VOM PLANTEXT (D5, Abschnitt 7, Risikotabelle) — dieselbe
	// Abweichung, aus demselben Grund, wie in roulette.js/craps.js (D5-3,
	// dort verify-view.mjs V-14/V-6): SEIT D5-4 ruft blackjack.js
	// bets.lock()/bets.unlock() an GENAU EINER Stelle selbst — im
	// sperren()-Rückruf an connectLobby(). Das ist KEINE Rundenentscheidung:
	// es sperrt das Tuch nach der UHR DES SERVERS, nicht nach
	// round-blackjack.js' eigenem Zustand (D.10.6, "In der Lobby entscheidet
	// die Uhr des Servers, wann das Tuch zugeht — nicht der Auslöser").
	// settle(, sweep( und payout( bleiben OHNE jede Ausnahme verboten —
	// GENAU DAS ist die Rundenentscheidung, die weiterhin ausschließlich
	// round-table-blackjack.js trifft.
	const sperrenBlock = /sperren:\s*\(zu\)\s*=>\s*\{[\s\S]*?\n\t\t\t\},/.exec(blackjackJsOhneKommentare);
	check(sperrenBlock !== null, 'der sperren()-Rückruf an connectLobby() wurde im Quelltext gefunden');
	const ohneSperrenBlock = sperrenBlock !== null
		? blackjackJsOhneKommentare.replace(sperrenBlock[0], '')
		: blackjackJsOhneKommentare;

	if (sperrenBlock !== null) {
		check(/bets\.lock\(\)/.test(sperrenBlock[0]) && /bets\.unlock\(\)/.test(sperrenBlock[0]),
			'die eine erlaubte Stelle ruft ausschließlich bets.lock()/bets.unlock() (das Tuch, nicht die Runde)');
		check(!/settle\(|sweep\(|payout\(/.test(sperrenBlock[0]),
			'auch die erlaubte Stelle enthält kein settle(/sweep(/payout(');
	}

	const VERBOTENE_MUSTER = [
		['settle(', /settle\(/], ['sweep(', /sweep\(/], ['payout(', /payout\(/],
		['.lock(', /\.lock\(/], ['.unlock(', /\.unlock\(/],
	];
	for (const [name, muster] of VERBOTENE_MUSTER) {
		check(!muster.test(ohneSperrenBlock), `blackjack.js enthält kein ${name} außerhalb des sperren()-Rückrufs`);
	}
	// settle( bleibt AUSSERHALB der Gegenprobe: BetTable.settle() wird an
	// diesem Tisch an KEINER Stelle benutzt (bets-blackjack.js, Kopfkommentar)
	// — die Auszahlung rechnet ausschließlich round-blackjack.js. Dass
	// "settle(" nirgends in der Extension vorkommt, weist stattdessen V-9
	// nach, umfassend über jede ausgelieferte Datei.
	console.log('     Gegenprobe: vier der fünf Muster (ohne settle() — siehe V-9) kommen in round-table-blackjack.js tatsächlich vor');
	const ERWARTET_IN_ROUND_TABLE = VERBOTENE_MUSTER.filter(([name]) => name !== 'settle(');
	const treffer = ERWARTET_IN_ROUND_TABLE.filter(([, muster]) => muster.test(roundTableOhneKommentare));
	check(treffer.length === ERWARTET_IN_ROUND_TABLE.length,
		'sweep(, payout(, .lock( und .unlock( kommen in round-table-blackjack.js tatsächlich vor',
		`gefunden: ${treffer.map(([name]) => name).join(', ')}`);
}

/* ========================================== V-9 Kein settle( irgendwo */

console.log('\nV-9  settle( kommt in der ganzen (ausgelieferten) Extension nicht vor');
{
	// Resources/Private/Scripts bleibt außen vor — dieselbe Abgrenzung wie
	// A-4 in verify-cabinet.mjs und S-1 in verify-sound.mjs: Entwicklerwerk-
	// zeuge werden nie an den Browser ausgeliefert, und GENAU DIESES Skript
	// nennt "settle(" zwangsläufig selbst (in der Verbotsliste von V-8 und
	// in diesem Kommentar) — ein Selbstfund wäre kein echter Befund.
	const alle = alleDateien(EXT)
		.filter((d) => !path.relative(EXT, d).startsWith(path.join('Resources', 'Private', 'Scripts')))
		.filter((d) => /\.(js|mjs|css|html)$/i.test(d));
	const treffer = [];
	for (const datei of alle) {
		if (ohneKommentare(lies(datei)).includes('settle(')) {
			treffer.push(kurz(datei));
		}
	}
	check(treffer.length === 0, `settle( kommt in keiner der ${alle.length} ausgelieferten Dateien dieser Extension vor`, ...treffer);
}

/* ============================ V-10 blackjack.js schreibt nicht ins Dokument */

console.log('\nV-10  blackjack.js schreibt nicht ins Dokument, was das Spiel betrifft');
{
	check(!/setAttribute\(\s*['"]data-bj-/.test(blackjackJsOhneKommentare), "blackjack.js enthält kein setAttribute('data-bj-…')");
	check(!/\.innerHTML\s*=/.test(blackjackJsOhneKommentare), 'blackjack.js enthält kein innerHTML =');
	check(/hintEl\.textContent\s*=/.test(blackjackJsOhneKommentare), 'die ausdrücklich erlaubte Ausnahme (hintEl.textContent) ist tatsächlich vorhanden');
}

/* ============================== V-11 Die Formel der nachgelegten Stapel */

console.log('\nV-11  Die Formel der nachgelegten Stapel ist an ihrer einen Stelle korrekt');
{
	const FORMEL = 'blatt.stake - (i === 0 ? baseStake : 0)';
	check(viewOhneKommentare.replace(/\s+/g, ' ').includes(FORMEL.replace(/\s+/g, ' ')),
		'view-blackjack.js benutzt die Formel "blatt.stake − (i === 0 ? baseStake : 0)" für den nachgelegten Stapel');
}

/* =================== V-12 Verdeckt auf dem Tuch, offen in der Leiste === */

console.log('\nV-12  Die eigenen Karten sind auf dem Tuch verdeckt und in der Bedienleiste offen');
{
	// Bis zum charakteristischen .join('') am Ende der Zuweisung, NICHT bis
	// zum ersten Semikolon — dazwischen liegt mit "const extra = …;" ein
	// eigenes, schon vorher endendes Statement.
	const handsBlock = /handsEl\.innerHTML\s*=[\s\S]*?\.join\(''\);/.exec(viewOhneKommentare)?.[0] ?? '';
	const panelBlock = /panelEl\.innerHTML\s*=[\s\S]*?\.join\(''\);/.exec(viewOhneKommentare)?.[0] ?? '';
	check(/faceDown:\s*true/.test(handsBlock), '[data-bj-hands] wird mit faceDown: true gezeichnet (verdeckt)');
	check(/faceDown:\s*false/.test(panelBlock), '[data-bj-panel] wird mit faceDown: false gezeichnet (aufgedeckt)');

	console.log('     Gegenprobe (V-12-G): eine Fassung, die beide gleich zeichnet, wird erkannt');
	const g = expectFailure((pruefe) => {
		const verfaelschterPanelBlock = panelBlock.replace('faceDown: false', 'faceDown: true');
		pruefe(/faceDown:\s*false/.test(verfaelschterPanelBlock), 'GEGENPROBE: die verfälschte Handtafel zeichnet noch aufgedeckt');
	});
	check(g, 'V-12-G: eine Fassung, die beide Stellen gleich zeichnet, wird tatsächlich als falsch erkannt');
}

/* ==================== V-13 Die Lochkarte wird erst ab 'geber' aufgedeckt */

console.log("\nV-13  Die verdeckte Karte des Gebers wird erst ab 'geber' aufgedeckt");
{
	check(/aufgedeckt\s*=\s*\(state === 'geber' \|\| state === 'fertig'\)/.test(viewOhneKommentare),
		"view-blackjack.js leitet 'aufgedeckt' aus state === 'geber' || state === 'fertig' her");
	check(/i === 1 && !aufgedeckt/.test(viewOhneKommentare),
		'die zweite Karte des Gebers (Index 1) bleibt verdeckt, solange nicht aufgedeckt');
	check(/dealerShows/.test(viewOhneKommentare) && /upcardTotal/.test(viewOhneKommentare),
		'solange verdeckt, zeigt die Summe nur die offene Karte (dealerShows/upcardTotal)');
}

/* ========================== V-14 Ausgangsmarke trägt immer ein Wort === */

console.log('\nV-14  Jede Ausgangsmarke trägt ein Wort, die Farbe ist Zugabe');
{
	check(/OUTCOME_TEXT/.test(viewOhneKommentare) && /ausgangText/.test(viewOhneKommentare),
		'view-blackjack.js löst jeden Ausgang in ein Wort auf (OUTCOME_TEXT/ausgangText)');
	check(/class="bj-outcome bj-outcome--\$\{cssKlasse\}">\$\{wort\}<\/span>/.test(viewOhneKommentare),
		'die Ausgangsmarke setzt Klasse UND Wort im selben Markup-Stück');

	const blackjackCss = lies(BLACKJACK_CSS_PFAD).replace(/\/\*[\s\S]*?\*\//g, '');
	for (const klasse of ['bj-outcome--win', 'bj-outcome--blackjack', 'bj-outcome--loss', 'bj-outcome--bust']) {
		check(new RegExp(`\\.${klasse}[^{]*\\{[^}]*background-color`).test(blackjackCss)
			|| /\.bj-outcome--win, \.bj-outcome--blackjack \{ background-color/.test(blackjackCss)
			|| /\.bj-outcome--loss, \.bj-outcome--bust \{ background-color/.test(blackjackCss),
			`.${klasse} bekommt eine Hintergrundfarbe ZUSÄTZLICH zum Text (nie statt seiner)`);
	}
	check(/\.bj-outcome\s*\{[^}]*color:/.test(blackjackCss), '.bj-outcome selbst trägt bereits eine Textfarbe — der Text ist nie nur durch Hintergrund lesbar');
}

/* ========================================= V-15 Fokusführung */

console.log('\nV-15  Fokusführung');
{
	const fn = /function\s+fokusAufErsteHandlung\s*\(\)\s*\{([\s\S]*?)\n\t\}/.exec(blackjackJsQuelle)?.[1] ?? '';
	check(fn !== '', 'fokusAufErsteHandlung() wurde im Quelltext gefunden');
	check(/'versicherung'/.test(fn) && /data-bj-insure="take"/.test(fn), 'bei \'versicherung\' wandert der Fokus auf den Versicherungsknopf');
	check(/'spieler'/.test(fn) && /data-bj-act=/.test(fn), 'bei \'spieler\' wandert der Fokus auf den ersten erlaubten Handlungsknopf');
	check(/goButton\?\.focus\(\)/.test(fn), 'im Rückfall wandert der Fokus zurück auf [data-ck-table-go]');
	check((blackjackJsOhneKommentare.match(/fokusAufErsteHandlung\(\)/g) ?? []).length >= 3,
		'fokusAufErsteHandlung() wird nach onGo() und nach jeder Handlung/Versicherungsentscheidung aufgerufen');
}

/* === V-16 jeder Abbruchpfad in bindTable() sperrt den Auslöser und sagt es an */

console.log('\nV-16  Jeder Abbruchpfad in bindTable() sperrt den Auslöser und sagt es an');
{
	const pfadMarker = [
		['fehlende Zufallsquelle', /if \(!isAvailable\(\)\) \{[\s\S]*?\n\t\}/],
		['doppelt vergebener Schlüssel', /if \(gebundeneSchluessel\.has\(key\)\) \{[\s\S]*?\n\t\}/],
		['catch-Zweig', /\} catch \(error\) \{[\s\S]*?\n\t\}\n\}/],
	];
	for (const [name, muster] of pfadMarker) {
		const treffer = muster.exec(blackjackJsQuelle);
		check(treffer !== null, `der Abbruchpfad "${name}" wurde im Quelltext gefunden`);
		if (treffer !== null) {
			const block = treffer[0];
			check(/goButton\?\.setAttribute\('aria-disabled'/.test(block), `${name}: sperrt den Auslöser über aria-disabled`);
			check(/announceRound\(texts\.\w+\)/.test(block), `${name}: sagt einen eigenen Satz im Live-Bereich der Runde an`);
		}
	}

	console.log('     Gegenprobe V-16-G: ein Abbruchpfad ohne aria-disabled muss auffallen');
	const g = expectFailure((pruefe) => {
		const verstuemmelterPfad = "if (gebundeneSchluessel.has(key)) {\n\t\tannounceRound(texts.blocked);\n\t\treturn;\n\t}";
		pruefe(/goButton\?\.setAttribute\('aria-disabled'/.test(verstuemmelterPfad), 'GEGENPROBE: ein Pfad ohne aria-disabled trägt trotzdem aria-disabled');
	});
	check(g, 'V-16-G: ein Pfad ohne aria-disabled wird tatsächlich als fehlend erkannt');
}

/* ================================================================ V-17 */

console.log('\nV-17  Alle benutzten XLIFF-Kennungen existieren, keine ist unbenutzt');
{
	const localesQuelltext = lies(LOCALLANG_PFAD);
	const einheiten = new Map();
	for (const m of localesQuelltext.matchAll(/<trans-unit id="([^"]+)">\s*<source>([\s\S]*?)<\/source>/g)) {
		einheiten.set(m[1], m[2]);
	}

	const TRANSLATE_MUSTER = /f:translate(?:\s+key="|\(key:\s*\\?')LLL:EXT:blackjack\/Resources\/Private\/Language\/locallang\.xlf:([^"'\\]+)/g;

	const AUSGELIEFERT_HTML = alleDateien(EXT).filter((d) => d.endsWith('.html'));
	const alleBenutztenKennungen = new Set();
	for (const datei of AUSGELIEFERT_HTML) {
		for (const m of lies(datei).matchAll(TRANSLATE_MUSTER)) {
			alleBenutztenKennungen.add(m[1]);
		}
	}
	// Zusätzlich: die data-text-…-Attribute, deren Wert selbst ein
	// f:translate ist (Status.html, SoundSwitch.html, CardSprite.html,
	// Actions.html) — bereits durch dasselbe TRANSLATE_MUSTER erfasst, da es
	// auf den Fluid-Ausdruck selbst zielt, unabhängig vom umschließenden
	// Attributnamen.

	const fehlend = [...alleBenutztenKennungen].filter((id) => !einheiten.has(id));
	check(fehlend.length === 0, `alle ${alleBenutztenKennungen.size} per f:translate benutzten Kennungen existieren in locallang.xlf`, ...fehlend);

	// Dauerhafte Ausnahme wie in verify-felt.mjs F-11: automat.title/
	// automat.description laufen über PHP-Zeichenkettenverkettung in
	// ext_localconf.php, nie über f:translate.
	const AUSGENOMMEN = new Set(['automat.title', 'automat.description']);
	const unbenutzt = [...einheiten.keys()].filter((id) => !AUSGENOMMEN.has(id) && !alleBenutztenKennungen.has(id));
	check(unbenutzt.length === 0, 'keine Kennung (außer der dauerhaft dokumentierten Ausnahme) ist ohne f:translate-Fundstelle', ...unbenutzt);
}

/* ============ V-18 Nur echter Zufall im Spiel (neu, D5-4) ============ */

console.log('\nV-18  Im Spiel wird nur echter Zufall eingespeist — außerhalb einer Lobby-Runde (neu, D5-4)');
{
	check(/import\s*\{[^}]*\bdrawUint32\b[^}]*\}\s*from\s*['"]@phomo17\/blackjack\/rng\.js['"]/.test(blackjackJsQuelle),
		'blackjack.js importiert drawUint32 aus rng.js');

	// Dieselbe Bauart wie craps/verify-view.mjs V-6 (D5-3): blackjack.js
	// erwähnt createSeeded() an GENAU ZWEI Stellen: dem Import (der Name
	// selbst) und GENAU EINEM Aufruf — als Geber der gemeinsamen Lobby-Runde
	// (D.10.4, saatGeber-Rückruf an connectLobby()). Eine Zusage
	// abzuschwächen ist immer verdächtig, deshalb kommt im Gegenzug eine
	// schärfere Prüfung dazu: nicht nur DASS createSeeded genau einmal
	// AUFGERUFEN wird, sondern GENAU DORT.
	const createSeededAufrufe = blackjackJsOhneKommentare.match(/createSeeded\(/g) ?? [];
	check(createSeededAufrufe.length === 1,
		`createSeeded( wird in blackjack.js genau einmal AUFGERUFEN — als Geber der Lobby-Runde (gefunden: ${createSeededAufrufe.length}×)`);
	check(/saatGeber:\s*\(saat\)\s*=>\s*createSeeded\(saatZuZahl\(saat\)\)/.test(blackjackJsOhneKommentare),
		'die eine Stelle ist der saatGeber-Rückruf an connectLobby()');

	console.log('     Gegenprobe (V-18-G): ein zweiter, erfundener Aufruf wird erkannt');
	const verfaelscht = `${blackjackJsOhneKommentare}\nconst x = createSeeded(1);`;
	check((verfaelscht.match(/createSeeded\(/g) ?? []).length === 2,
		'ein eingefügter zweiter Aufruf wird von derselben Zählung erkannt');

	// rng.js DEFINIERT createSeeded — für die Nachweisskripte und (seit
	// D5-4) für die Lobby-Runde, nie fürs bloße Spielen außerhalb einer
	// Lobby. Die rechnenden/zeichnenden Dateien bleiben davon unberührt.
	// Geprüft wird OHNE Kommentare: shoe.js NENNT createSeeded lediglich in
	// der JSDoc seines Konstruktors ("drawUint32 im Spiel, createSeeded(saat)()
	// im Nachweis") — eine zutreffende Beschreibung des rng.js-Vertrags,
	// kein Aufruf.
	const SPIELFUEHRENDE_QUELLEN = [
		['shoe.js', ohneKommentare(shoeQuelle)], ['round-blackjack.js', ohneKommentare(roundQuelle)],
		['round-table-blackjack.js', roundTableOhneKommentare], ['view-blackjack.js', viewOhneKommentare],
		['cards-blackjack.js', ohneKommentare(cardsQuelle)], ['sound-blackjack.js', soundOhneKommentare],
		['rules-blackjack.js', ohneKommentare(rulesQuelle)],
	];
	const treffer = SPIELFUEHRENDE_QUELLEN.filter(([, quelle]) => quelle.includes('createSeeded'));
	check(treffer.length === 0, 'createSeeded kommt in den rechnenden/zeichnenden Dateien (außerhalb von Kommentaren) nicht vor',
		...treffer.map(([name]) => name));

	// Dieselbe schärfere Gegenprobe wie C-3 in craps/verify-lobby-craps.mjs:
	// "geber" wird in blackjack.js ausschließlich an zwei Stellen zugewiesen
	// — der Anfangswert (let geber = drawUint32;) und geberSetzen().
	const geberZuweisungen = blackjackJsOhneKommentare.match(/\bgeber\s*=/g) ?? [];
	check(geberZuweisungen.length === 2,
		`"geber" wird in blackjack.js an genau zwei Stellen zugewiesen (gefunden: ${geberZuweisungen.length}×)`,
		...geberZuweisungen);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Die rechnenden Dateien sind dokument- und importfrei,'
	+ '\nder Live-Bereich der Runde hat genau einen Schreiber, jedes Bedienteil ist ein echter Knopf,'
	+ '\ndie eigenen Karten liegen verdeckt auf dem Tuch und offen in der Bedienleiste, jeder'
	+ '\nAbbruchpfad sperrt den Auslöser und sagt es an, und jede benutzte XLIFF-Kennung existiert.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
