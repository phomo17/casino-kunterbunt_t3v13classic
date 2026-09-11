/**
 * Casino Kunterbunt – Nachweis der Chipkasse am Tischrand (Teilstück Tb)
 * ========================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/verify-table-buyin.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei der ersten Abweichung. Laufzeit
 * eine Sekunde — alle Dateien werden als TEXT gelesen, ein Browser ist für
 * diese Fragen nicht nötig (dieselbe Haltung wie verify-table-view.mjs,
 * verify-table-chips.mjs und verify-gattung.mjs).
 *
 *
 * WAS HIER BEWIESEN WIRD (Ansage des Auftraggebers vom 2026-09-07: je
 * Chipsorte ein eigener Kauf- und Rückgabeweg, statt eines Betrags, den das
 * Haus selbsttätig zerlegt — CONCEPT.md C.4.1)
 * ----------------------------------------------------------------------------
 *  B-1  Das Betragsformular ist restlos entfernt: kein <form>, kein
 *       <input type="number">, keiner seiner drei data-Haken.
 *  B-2  Genau EIN <fieldset class="ck-table__chipbank"> mit <legend>, und die
 *       Chipreihen stehen als EINE Vorlage in einem <f:for each="{chips}">
 *       (nicht als fünf ausgeschriebene Kopien).
 *  B-3  Jede Chipreihe trägt genau einen Kauf-Knopf (data-ck-table-chip-buy)
 *       und genau einen Rückgabe-Knopf (data-ck-table-chip-sell), beide
 *       <button type="button">.
 *  B-4  Beim Ausliefern trägt der Rückgabeknopf aria-disabled="true" (jede
 *       Sorte ist beim Betreten des Tisches leer); der Kaufknopf trägt es
 *       NICHT (er wird nie gesperrt, siehe Plan 4.5/4.7).
 *  B-5  „Label in Name" (WCAG 2.2 SC 2.5.3): der sichtbare Text steht VOR der
 *       nur für Hilfsmittel bestimmten Ergänzung, nicht als aria-label davor
 *       — genau der Fehler von Auditbefund H7-02.
 *  B-6  Controls.html reicht {chips} an Table/BuyIn durch, zusätzlich zu den
 *       schon bestehenden {splittable}/{mergeable} (Rückwärtsverträglichkeit).
 *  B-7  Die acht Kennungen des alten Betragsformulars sind aus der XLIFF-Datei
 *       verschwunden, table.buyin.nocash bleibt bestehen, und die neun neuen
 *       Kennungen der Chipkasse existieren.
 *  B-8  Controls.html trägt die vier neuen data-message-*-Attribute und keins
 *       der beiden entfallenen (data-message-invalid, data-message-buyin-done)
 *       mehr.
 *  B-9  table-controls.js kennt keinen der drei alten Haken und keinen der
 *       beiden entfallenen Texte (invalid, buyinDone) mehr.
 *  B-10 onChipBuy()/onChipSell() rufen bank.buyChip(value)/bank.sellChip(value)
 *       und melden bei Erfolg den NEUEN BESTAND (Wert, Stückzahl, Buy-in) statt
 *       nur die Handlung — Auflage aus Auditbefund M7-01 vom 2026-09-07 — und
 *       bei jedem Fehlschlag die richtige Absage.
 *  B-11 An- und Abmeldung der Klick-Ereignisse ist symmetrisch, und refresh()
 *       sperrt/entsperrt jeden Rückgabeknopf nach bank.rack.countOf(value).
 *  B-12 table.css definiert alle neuen Klassen der Chipkasse; die Ausblendung
 *       des gesperrten Rückgabeknopfs nimmt den Fokusrahmen NICHT mit
 *       (:not(:focus-visible) an der opacity-Regel); die versteckte Ergänzung
 *       benutzt dieselbe Technik wie .ck-credit__announce (kein display: none,
 *       kein visibility: hidden); und der Chip-Knopf unterschreitet die
 *       Mindestgröße aus V-6 nicht.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const EXT_ROOT = new URL('../../', import.meta.url);
const PAGEVIEW_PARTIALS = new URL('Private/PageView/Partials/Table/', EXT_ROOT);
const CSS_DIR = new URL('Public/Css/', EXT_ROOT);
const JS_DIR = new URL('Public/JavaScript/', EXT_ROOT);
const LANG_DIR = new URL('Private/Language/', EXT_ROOT);

let failed = false;

/**
 * @param {boolean} condition
 * @param {string} label
 * @returns {void}
 */
function check(condition, label) {
	if (!condition) {
		failed = true;
	}
	console.log(`${condition ? '  ok  ' : '  FEHLER  '}${label}`);
}

/**
 * Entfernt <f:comment>…</f:comment>-Blöcke, bevor irgendein Muster gesucht
 * wird — wörtlich aus verify-table-view.mjs übernommen, aus demselben Grund:
 * die Kommentare dieses Projekts erklären ausführlich, WARUM etwas NICHT so
 * gemacht wird, und diese Prosa würde sonst wie ein echtes Vorkommen aussehen.
 * @param {string} html
 * @returns {string}
 */
function stripComments(html) {
	return html.replace(/<f:comment>[\s\S]*?<\/f:comment>/gi, '');
}

/**
 * @param {string} css
 * @returns {string}
 */
function stripCssComments(css) {
	return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * @param {URL} url
 * @returns {Promise<string>}
 */
async function read(url) {
	return stripComments(await readFile(fileURLToPath(url), 'utf8'));
}

const buyin = await read(new URL('BuyIn.html', PAGEVIEW_PARTIALS));
const controls = await read(new URL('Controls.html', PAGEVIEW_PARTIALS));
const css = stripCssComments(await readFile(fileURLToPath(new URL('table.css', CSS_DIR)), 'utf8'));
const tableControlsJs = await readFile(fileURLToPath(new URL('table-controls.js', JS_DIR)), 'utf8');
const locallang = await readFile(fileURLToPath(new URL('locallang.xlf', LANG_DIR)), 'utf8');

/* ============================================================================
   B-1 — das Betragsformular ist restlos entfernt
   ============================================================================ */

console.log('B-1 — das Betragsformular ist restlos entfernt');

check(!/<form\b/i.test(buyin), 'BuyIn.html enthält kein <form> mehr');
check(!/<input\b/i.test(buyin), 'BuyIn.html enthält kein <input> mehr');
for (const haken of ['data-ck-table-buyin-form', 'data-ck-table-buyin-input', 'data-ck-table-buyin-add']) {
	check(!buyin.includes(haken), `BuyIn.html enthält ${haken} nicht mehr`);
	check(!tableControlsJs.includes(haken), `table-controls.js enthält ${haken} nicht mehr`);
}

/* ============================================================================
   B-2 — eine Chipkasse als Vorlage, nicht als fünf Kopien
   ============================================================================ */

console.log('\nB-2 — eine Chipkasse als Vorlage, nicht als fünf Kopien');

const chipbankMatches = [...buyin.matchAll(/<fieldset\b[^>]*class="[^"]*ck-table__chipbank[^"]*"[^>]*>/gi)];
check(chipbankMatches.length === 1, `genau ein <fieldset class="ck-table__chipbank"> in BuyIn.html (gefunden: ${chipbankMatches.length})`);

let chipbankBlock = '';
if (chipbankMatches.length === 1) {
	const start = chipbankMatches[0].index;
	const end = buyin.indexOf('</fieldset>', start);
	chipbankBlock = buyin.slice(start, end === -1 ? undefined : end);
	check(/<legend>/i.test(chipbankBlock), 'die Chipkasse trägt ein <legend>');
	check(/<f:for\s+each="\{chips\}"/i.test(chipbankBlock), 'die Chipreihe steht in einem <f:for each="{chips}">');
	const buyButtonTemplates = [...chipbankBlock.matchAll(/data-ck-table-chip-buy="\{chip\.value\}"/g)];
	const sellButtonTemplates = [...chipbankBlock.matchAll(/data-ck-table-chip-sell="\{chip\.value\}"/g)];
	check(buyButtonTemplates.length === 1, `genau EIN Kauf-Knopf-Template in der Schleife (gefunden: ${buyButtonTemplates.length})`);
	check(sellButtonTemplates.length === 1, `genau EIN Rückgabe-Knopf-Template in der Schleife (gefunden: ${sellButtonTemplates.length})`);
}

/* ============================================================================
   B-3 — je Chipsorte ein Kauf- und ein Rückgabe-Knopf, beide echte Knöpfe
   ============================================================================ */

console.log('\nB-3 — je Chipsorte ein Kauf- und ein Rückgabe-Knopf');

const buyButtonMatch = /<button\b([^>]*)data-ck-table-chip-buy="\{chip\.value\}"([^>]*)>/i.exec(chipbankBlock);
check(buyButtonMatch !== null, 'der Kauf-Knopf existiert');
if (buyButtonMatch) {
	check(/type\s*=\s*"button"/.test(buyButtonMatch[1] + buyButtonMatch[2]), 'der Kauf-Knopf ist <button type="button">');
}
const sellButtonMatch = /<button\b([^>]*)data-ck-table-chip-sell="\{chip\.value\}"([^>]*)>/i.exec(chipbankBlock);
check(sellButtonMatch !== null, 'der Rückgabe-Knopf existiert');
if (sellButtonMatch) {
	check(/type\s*=\s*"button"/.test(sellButtonMatch[1] + sellButtonMatch[2]), 'der Rückgabe-Knopf ist <button type="button">');
}

/* ============================================================================
   B-4 — Rückgabe beginnt gesperrt, Kauf nie
   ============================================================================ */

console.log('\nB-4 — Rückgabe beginnt gesperrt, Kauf nie');

if (sellButtonMatch) {
	check(/aria-disabled\s*=\s*"true"/.test(sellButtonMatch[1] + sellButtonMatch[2]),
		'der Rückgabe-Knopf trägt beim Ausliefern aria-disabled="true" (jede Sorte ist beim Betreten leer)');
	check(!/\bdisabled\b/.test((sellButtonMatch[1] + sellButtonMatch[2]).replace(/aria-disabled/g, '')),
		'der Rückgabe-Knopf trägt KEIN echtes disabled (sonst verlöre er seine Tabstation)');
}
if (buyButtonMatch) {
	check(!/aria-disabled/.test(buyButtonMatch[1] + buyButtonMatch[2]),
		'der Kauf-Knopf trägt kein aria-disabled (die Kasse wird hier bewusst nicht geprüft)');
}

/* ============================================================================
   B-5 — Label in Name (WCAG 2.2 SC 2.5.3)
   ============================================================================ */

console.log('\nB-5 — Label in Name: der sichtbare Text beginnt den erreichbaren Namen');

/**
 * Zerlegt einen Knopf in seinen sichtbaren Anteil (vor .ck-table__hidden-detail)
 * und seine versteckte Ergänzung.
 * @param {string} selector wörtlicher data-Haken, z. B. "data-ck-table-chip-buy"
 * @returns {?{visible: string, hiddenSpanIndex: number}}
 */
function splitButton(selector) {
	const openRe = new RegExp(`<button\\b[^>]*${selector}="\\{chip\\.value\\}"[^>]*>`, 'i');
	const openMatch = openRe.exec(chipbankBlock);
	if (!openMatch) {
		return null;
	}
	const closeIdx = chipbankBlock.indexOf('</button>', openMatch.index);
	const content = chipbankBlock.slice(openMatch.index + openMatch[0].length, closeIdx === -1 ? undefined : closeIdx);
	const hiddenSpanIndex = content.search(/<span\b[^>]*class="[^"]*ck-table__hidden-detail[^"]*"/i);
	return { visible: content.slice(0, hiddenSpanIndex === -1 ? content.length : hiddenSpanIndex), hiddenSpanIndex };
}

for (const [selector, name, match] of [
	['data-ck-table-chip-buy', 'Kauf', buyButtonMatch],
	['data-ck-table-chip-sell', 'Rückgabe', sellButtonMatch],
]) {
	const split = splitButton(selector);
	check(split !== null && split.hiddenSpanIndex !== -1,
		`der ${name}-Knopf trägt die versteckte Ergänzung als eigenes <span class="ck-table__hidden-detail">`);
	check(split !== null && /<f:translate\b/i.test(split.visible),
		`der ${name}-Knopf hat sichtbaren Text VOR der versteckten Ergänzung`);
	check(match !== null && !/aria-label\s*=/.test(match[1] + match[2]),
		`der ${name}-Knopf trägt selbst kein aria-label (die Ergänzung steht im sichtbaren Baum, nicht davor)`);
}

/* ============================================================================
   B-6 — Controls.html reicht {chips} an Table/BuyIn durch
   ============================================================================ */

console.log('\nB-6 — Controls.html reicht {chips} an Table/BuyIn durch');

const renderMatch = /<f:render\s+partial="Table\/BuyIn"\s+arguments="\{([^}]*)\}"\s*\/>/i.exec(controls);
check(renderMatch !== null, 'Controls.html rendert Table/BuyIn mit arguments="{…}"');
if (renderMatch) {
	const args = renderMatch[1];
	for (const name of ['chips', 'splittable', 'mergeable']) {
		check(new RegExp(`\\b${name}\\s*:\\s*${name}\\b`).test(args), `arguments enthält ${name}: ${name}`);
	}
}

/* ============================================================================
   B-7 — XLIFF: acht alte Kennungen weg, table.buyin.nocash bleibt, neun neue da
   ============================================================================ */

console.log('\nB-7 — XLIFF-Kennungen: acht alte weg, neun neue da');

for (const id of [
	'table.buyin.legend', 'table.buyin.add.25', 'table.buyin.add.100', 'table.buyin.add.500',
	'table.buyin.label', 'table.buyin.apply', 'table.buyin.invalid', 'table.buyin.done',
]) {
	check(!locallang.includes(`id="${id}"`), `die Kennung ${id} existiert nicht mehr`);
}
check(locallang.includes('id="table.buyin.nocash"'), 'die Kennung table.buyin.nocash bleibt bestehen');
for (const id of [
	'table.chipbank.legend', 'table.chip.buy', 'table.chip.sell',
	'table.chip.buy.detail', 'table.chip.sell.detail',
	'table.chip.buy.done', 'table.chip.sell.done', 'table.chip.sell.none', 'table.chip.full',
]) {
	check(locallang.includes(`id="${id}"`), `die neue Kennung ${id} existiert`);
}

/* ============================================================================
   B-8 — Controls.html: die neuen data-message-*-Attribute, die alten weg
   ============================================================================ */

console.log('\nB-8 — Controls.html: neue data-message-*-Attribute, alte entfernt');

for (const [attr, id] of [
	['data-message-chip-buy-done', 'table.chip.buy.done'],
	['data-message-chip-sell-done', 'table.chip.sell.done'],
	['data-message-chip-sell-none', 'table.chip.sell.none'],
	['data-message-chip-full', 'table.chip.full'],
]) {
	const re = new RegExp(`${attr}="\\{f:translate\\(key: '[^']*:${id.replace(/\./g, '\\.')}'\\)\\}"`);
	check(re.test(controls), `Controls.html trägt ${attr}, zeigt auf ${id}`);
}
check(!controls.includes('data-message-invalid'), 'Controls.html trägt data-message-invalid nicht mehr');
check(!controls.includes('data-message-buyin-done'), 'Controls.html trägt data-message-buyin-done nicht mehr');

/* ============================================================================
   B-9 — table-controls.js kennt die alten Haken und Texte nicht mehr
   ============================================================================ */

console.log('\nB-9 — table-controls.js kennt die alten Haken und Texte nicht mehr');

check(!/\binvalid\s*:/.test(tableControlsJs), 'table-controls.js definiert texts.invalid nicht mehr');
check(!/\bbuyinDone\s*:/.test(tableControlsJs), 'table-controls.js definiert texts.buyinDone nicht mehr');
check(!tableControlsJs.includes('doBuyIn'), 'table-controls.js enthält keine Funktion doBuyIn mehr');
check(!tableControlsJs.includes('onBuyinSubmit'), 'table-controls.js enthält keinen Handler onBuyinSubmit mehr');
check(!tableControlsJs.includes('onBuyinAdd'), 'table-controls.js enthält keinen Handler onBuyinAdd mehr');
check(tableControlsJs.includes('chipBuyButtons'), 'table-controls.js sucht chipBuyButtons über [data-ck-table-chip-buy]');
check(tableControlsJs.includes('chipSellButtons'), 'table-controls.js sucht chipSellButtons über [data-ck-table-chip-sell]');

/* ============================================================================
   B-10 — onChipBuy()/onChipSell() rufen die Bank und melden den neuen Bestand
   ============================================================================ */

console.log('\nB-10 — onChipBuy()/onChipSell() rufen die Bank und melden den neuen Bestand');

const onChipBuyMatch = /async function onChipBuy\(event\) \{([\s\S]*?)\n\t\}/.exec(tableControlsJs);
check(onChipBuyMatch !== null, 'onChipBuy() existiert');
if (onChipBuyMatch) {
	const body = onChipBuyMatch[1];
	check(/bank\.buyChip\(value\)/.test(body), 'onChipBuy() ruft bank.buyChip(value)');
	check(/texts\.chipBuyDone,\s*\[value,\s*result\.count,\s*result\.amount\]/.test(body),
		'die Erfolgsansage nennt Wert, neue Stückzahl UND neuen Buy-in — den Bestand, nicht nur die Handlung (Audit M7-01)');
	check(/result\.reason === 'nocash'/.test(body) && /result\.reason === 'full'/.test(body),
		"onChipBuy() beantwortet sowohl 'nocash' als auch 'full'");
}

const onChipSellMatch = /async function onChipSell\(event\) \{([\s\S]*?)\n\t\}/.exec(tableControlsJs);
check(onChipSellMatch !== null, 'onChipSell() existiert');
if (onChipSellMatch) {
	const body = onChipSellMatch[1];
	check(/bank\.sellChip\(value\)/.test(body), 'onChipSell() ruft bank.sellChip(value)');
	check(/texts\.chipSellDone,\s*\[value,\s*result\.count,\s*result\.amount\]/.test(body),
		'die Erfolgsansage nennt Wert, neue Stückzahl UND neuen Buy-in — den Bestand, nicht nur die Handlung (Audit M7-01)');
	check(/result\.reason === 'nochip'/.test(body) && /result\.reason === 'full'/.test(body),
		"onChipSell() beantwortet sowohl 'nochip' als auch 'full'");
}

/* ============================================================================
   B-11 — symmetrische An-/Abmeldung, refresh() sperrt nach Bestand
   ============================================================================ */

console.log('\nB-11 — symmetrische An-/Abmeldung, refresh() sperrt nach Bestand');

for (const [handler, hook] of [['onChipBuy', 'chipBuyButtons'], ['onChipSell', 'chipSellButtons']]) {
	const addCount = (tableControlsJs.match(new RegExp(`${hook}\\)[\\s\\S]{0,120}?addEventListener\\('click', ${handler}\\)`, 'g')) ?? []).length;
	const removeCount = (tableControlsJs.match(new RegExp(`${hook}\\)[\\s\\S]{0,120}?removeEventListener\\('click', ${handler}\\)`, 'g')) ?? []).length;
	check(addCount === 1, `for (const button of ${hook}) meldet ${handler} genau einmal an (gefunden: ${addCount})`);
	check(removeCount === 1, `for (const button of ${hook}) meldet ${handler} genau einmal ab (gefunden: ${removeCount})`);
}
const refreshMatch = /function refresh\(\) \{([\s\S]*?)\n\t\}/.exec(tableControlsJs);
check(refreshMatch !== null, 'refresh() existiert');
if (refreshMatch) {
	const body = refreshMatch[1];
	check(/for \(const button of chipSellButtons\)/.test(body), 'refresh() geht die Rückgabeknöpfe durch');
	check(/bank\.rack\.countOf\(value\) <= 0/.test(body) && /setAttribute\('aria-disabled', 'true'\)/.test(body),
		'refresh() sperrt einen Rückgabeknopf, sobald der Bestand dieser Sorte 0 ist');
	check(/removeAttribute\('aria-disabled'\)/.test(body),
		'refresh() entsperrt einen Rückgabeknopf wieder, sobald wieder Bestand da ist');
}

/* ============================================================================
   B-12 — table.css: die neuen Klassen, der Fokusrahmen bleibt sichtbar
   ============================================================================ */

console.log('\nB-12 — table.css: die neuen Klassen der Chipkasse, Fokusrahmen bleibt sichtbar');

for (const klasse of [
	'.ck-table__chipbank', '.ck-table__chipbank-row', '.ck-table__chipbank-chip',
	'.ck-table__chipbank-name', '.ck-table__chipbank-count',
	'.ck-table__button--chip', '.ck-table__hidden-detail',
]) {
	const escaped = klasse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	check(new RegExp(`${escaped}\\s*\\{`).test(css), `${klasse} ist in table.css definiert`);
}

const AUSNAHME_SELEKTOR = ".ck-table__button--chip[aria-disabled='true']:not(:focus-visible)";
const OHNE_AUSNAHME_SELEKTOR = ".ck-table__button--chip[aria-disabled='true']";
check(css.includes(`${AUSNAHME_SELEKTOR} {`),
	"die Ausblendung des gesperrten Rückgabeknopfs gilt AUSDRÜCKLICH NICHT für :focus-visible (Auditbefund H7-01)");
console.log('     Gegenprobe (B-12-G): eine Fassung ohne :not(:focus-visible) muss auffallen');
const ohneAusnahme = css.replace(`${AUSNAHME_SELEKTOR} {`, `${OHNE_AUSNAHME_SELEKTOR} {`);
check(ohneAusnahme !== css, 'GEGENPROBE-VORBEREITUNG: die Ersetzung hat wirklich gegriffen (sonst prüfte die Gegenprobe sich selbst)');
check(!ohneAusnahme.includes(`${AUSNAHME_SELEKTOR} {`),
	'GEGENPROBE: eine Fassung ohne :not(:focus-visible) wird als FALSCH erkannt (die geprüfte Bedingung oben griffe dort nicht mehr)');

function ruleBody(selector) {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(`(?:^|[,{}\\s])${escaped}\\s*\\{([^}]*)\\}`, 'm');
	const match = re.exec(css);
	return match ? match[1] : null;
}

const hiddenDetailBody = ruleBody('.ck-table__hidden-detail');
check(hiddenDetailBody !== null
	&& !/display\s*:\s*none/.test(hiddenDetailBody)
	&& !/visibility\s*:\s*hidden/.test(hiddenDetailBody)
	&& /position\s*:\s*absolute/.test(hiddenDetailBody),
	'.ck-table__hidden-detail benutzt dieselbe Technik wie .ck-credit__announce (kein display: none, kein visibility: hidden)');

const chipButtonBody = ruleBody('.ck-table__button--chip');
check(chipButtonBody !== null
	&& !/min-inline-size/.test(chipButtonBody)
	&& !/min-block-size/.test(chipButtonBody),
	'.ck-table__button--chip unterschreitet die von .ck-table__button geerbte Mindestgröße nicht (setzt sie gar nicht erst neu)');

/* ============================================================================
   Ergebnis
   ============================================================================ */

console.log(failed
	? '\nFEHLGESCHLAGEN — mindestens eine Prüfung ist rot.'
	: '\nERGEBNIS: das Betragsformular ist restlos entfernt, die Chipkasse kauft und '
		+ 'gibt Chips einzeln zurück, jeder Knopf hat einen Namen, der beim sichtbaren '
		+ 'Text beginnt, die Meldungstexte sind vollständig verdrahtet, und der '
		+ 'Fokusrahmen des gesperrten Rückgabeknopfs bleibt sichtbar.');

process.exit(failed ? 1 : 0);
