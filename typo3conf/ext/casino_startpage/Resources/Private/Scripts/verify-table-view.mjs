/**
 * Casino Kunterbunt – Nachweis von Markup und Stylesheet des Spieltisches
 * =========================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/verify-table-view.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei der ersten Abweichung. Laufzeit
 * wenige Sekunden — alle Dateien werden als TEXT gelesen, ein Browser ist für
 * diese Fragen nicht nötig und wäre auch nicht genauer (dieselbe Haltung wie
 * verify-gattung.mjs und verify-table-chips.mjs).
 *
 * Geprüft werden ausschließlich die in Teilstück C1-D neu entstandenen oder
 * geänderten Dateien: Table/Controls.html, Table/BuyIn.html, Table/History.html,
 * Table/Status.html (Teilstück C1-C, hier nur mitgeprüft, weil V-2/V-10 auch
 * über sie laufen), Table/MusterCloth.html, CasinoTischMuster.html, table.css
 * und muster-tisch.js.
 *
 * Seit Phase C3, Teilstück C3e (Plan Abschnitt 4.28) kommt table-felt.js
 * dazu — die zweizeilige, rückwärtsverträgliche Erweiterung um
 * data-ck-field-label (Teilstück C3d, Abschnitt 4.18), die verhindert
 * werden soll, dass sie beim nächsten Umbau leise wieder verschwindet:
 *   V-11  der erreichbare Name eines Feldes kommt aus data-ck-field-label,
 *         BEVOR auf den sichtbaren Text zurückgefallen wird
 *   V-12  ein Chip wird in der Reihenfolge place() → onPlace() gelegt und bei
 *         Absage über takeBack() zurückgerollt — dieselbe Reihenfolge, auf
 *         die sich der Rundennachweis eines Tischspiels mit echter Physik
 *         verlassen kann
 *
 * Seit Phase C7, Umsetzungsstück C7c (rückwärtsverträgliche Erweiterung der
 * Setzfläche um Vertragswetten, CONCEPT.md Anhang H) kommt table-controls.js
 * dazu:
 *   V-13  data-text-frozen (Status.html) und die XLIFF-Kennung
 *         table.announce.frozen existieren, und table-felt.js wie
 *         table-controls.js lesen sie tatsächlich — kein Attribut ohne
 *         Leser und kein Leser ohne Attribut
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const EXT_ROOT = new URL('../../', import.meta.url);
const PAGEVIEW_PARTIALS = new URL('Private/PageView/Partials/Table/', EXT_ROOT);
const CONTENT_ELEMENTS = new URL('Private/ContentElements/', EXT_ROOT);
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
 * wird. Ohne das fände jede Prüfung ihre eigene Erklärung im Kommentar als
 * falschen Treffer — genau die Kommentare in diesem Projekt erklären ja meist
 * ausführlich, WARUM etwas NICHT so gemacht wird ("NIEMALS outline: none",
 * "kein role=\"radio\"", "ein <button type=\"button\">…"), und diese Prosa
 * würde sonst wie ein echtes Vorkommen aussehen.
 *
 * @param {string} html
 * @returns {string}
 */
function stripComments(html) {
	return html.replace(/<f:comment>[\s\S]*?<\/f:comment>/gi, '');
}

/**
 * Entfernt CSS-Blockkommentare aus dem Stylesheet, aus demselben Grund.
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

const controls = await read(new URL('Controls.html', PAGEVIEW_PARTIALS));
const buyin = await read(new URL('BuyIn.html', PAGEVIEW_PARTIALS));
const history = await read(new URL('History.html', PAGEVIEW_PARTIALS));
const status = await read(new URL('Status.html', PAGEVIEW_PARTIALS));
const musterCloth = await read(new URL('MusterCloth.html', PAGEVIEW_PARTIALS));
const contentElement = await read(new URL('CasinoTischMuster.html', CONTENT_ELEMENTS));
const css = stripCssComments(await readFile(fileURLToPath(new URL('table.css', CSS_DIR)), 'utf8'));
const musterTischJs = await readFile(fileURLToPath(new URL('muster-tisch.js', JS_DIR)), 'utf8');
const tableFeltJs = await readFile(fileURLToPath(new URL('table-felt.js', JS_DIR)), 'utf8');
const tableControlsJs = await readFile(fileURLToPath(new URL('table-controls.js', JS_DIR)), 'utf8');
const locallang = await readFile(fileURLToPath(new URL('locallang.xlf', LANG_DIR)), 'utf8');

/* ============================================================================
   V-1 — jedes Bedienteil hat einen Namen
   ============================================================================
   Ein Bedienteil ohne Namen bleibt hier NICHT unentdeckt: für jedes
   <button>/<input>/<a> wird geprüft, ob es sichtbaren Text im Element trägt,
   von einem <label> umschlossen ist, oder ein aria-label/aria-labelledby
   trägt. */

/**
 * Findet alle Vorkommen eines Tags samt seinem gesamten Inhalt (nicht gierig).
 * Für <input> (selbstschließend) wird nur das Öffnungstag zurückgegeben.
 * @param {string} html
 * @param {string} tag
 * @returns {Array<{full: string, attrs: string, content: string, index: number}>}
 */
function findTags(html, tag) {
	const found = [];
	const openRe = new RegExp(`<${tag}(\\s[^>]*)?/?>`, 'gi');
	let match;
	while ((match = openRe.exec(html)) !== null) {
		const attrs = match[1] ?? '';
		const selfClosing = /\/>\s*$/.test(match[0]);
		if (selfClosing || tag === 'input') {
			found.push({ full: match[0], attrs, content: '', index: match.index });
			continue;
		}
		const closeRe = new RegExp(`</${tag}>`, 'i');
		const rest = html.slice(openRe.lastIndex);
		const closeMatch = closeRe.exec(rest);
		const content = closeMatch ? rest.slice(0, closeMatch.index) : '';
		found.push({ full: match[0] + content + (closeMatch ? closeMatch[0] : ''), attrs, content, index: match.index });
	}
	return found;
}

/**
 * Alle <label>…</label>-Blöcke einer Datei — für den "im Label eingeschlossen"-Test.
 * @param {string} html
 * @returns {Array<{start: number, end: number}>}
 */
function findLabelRanges(html) {
	const ranges = [];
	const re = /<label\b[^>]*>/gi;
	let match;
	while ((match = re.exec(html)) !== null) {
		const closeIdx = html.indexOf('</label>', re.lastIndex);
		if (closeIdx !== -1) {
			ranges.push({ start: match.index, end: closeIdx + '</label>'.length });
		}
	}
	return ranges;
}

/**
 * Bleibt nach dem Entfernen von HTML-Tags noch Text übrig — oder erzeugt ein
 * <f:translate>/<f:render>-Aufruf beziehungsweise eine {Variable} zur
 * Laufzeit welchen? Diese Datei prüft die TEMPLATE-Quelle, nicht die
 * gerenderte Seite (dafür bräuchte es einen Browser); ein XLIFF-Verweis oder
 * eine eingesetzte Variable zählt deshalb als Name, wörtlicher Text genauso.
 * @param {string} content
 * @returns {boolean}
 */
function hasVisibleText(content) {
	if (/<f:translate\b/i.test(content) || /<f:render\b/i.test(content) || /\{[^{}]+\}/.test(content)) {
		return true;
	}
	const withoutTags = content.replace(/<[^>]+>/g, ' ');
	return withoutTags.replace(/\s+/g, '').length > 0;
}

/**
 * @param {string} html
 * @param {string} dateiname
 * @returns {void}
 */
function checkNamedControls(html, dateiname) {
	const labelRanges = findLabelRanges(html);
	const isInsideLabel = (index) => labelRanges.some((r) => index >= r.start && index < r.end);

	for (const tag of ['button', 'a']) {
		for (const el of findTags(html, tag)) {
			const named = hasVisibleText(el.content)
				|| /aria-label\s*=/.test(el.attrs)
				|| /aria-labelledby\s*=/.test(el.attrs);
			check(named, `${dateiname}: <${tag}${el.attrs.trim() ? ' ' + el.attrs.trim().slice(0, 40) + '…' : ''}> hat einen Namen`);
		}
	}
	for (const el of findTags(html, 'input')) {
		const named = isInsideLabel(el.index)
			|| /aria-label\s*=/.test(el.attrs)
			|| /aria-labelledby\s*=/.test(el.attrs);
		check(named, `${dateiname}: <input${el.attrs.trim() ? ' ' + el.attrs.trim().slice(0, 40) + '…' : ''}> hat einen Namen`);
	}
}

console.log('V-1 — jedes Bedienteil hat einen Namen');
checkNamedControls(controls, 'Controls.html');
checkNamedControls(buyin, 'BuyIn.html');
checkNamedControls(history, 'History.html');
checkNamedControls(status, 'Status.html');
checkNamedControls(musterCloth, 'MusterCloth.html');

/* ============================================================================
   V-2 — Live-Bereiche werden leer ausgeliefert
   ============================================================================ */

console.log('\nV-2 — Live-Bereiche werden leer ausgeliefert');

/**
 * @param {string} html
 * @param {string} dateiname
 * @returns {void}
 */
function checkEmptyLiveRegions(html, dateiname) {
	const re = /<([a-z0-9]+)([^>]*\b(?:role\s*=\s*"(?:status|alert)"|aria-live\s*=\s*"[^"]+")[^>]*)>/gi;
	let match;
	let none = true;
	while ((match = re.exec(html)) !== null) {
		none = false;
		const tag = match[1];
		const closeIdx = html.indexOf(`</${tag}>`, re.lastIndex);
		const content = closeIdx !== -1 ? html.slice(re.lastIndex, closeIdx) : '';
		check(!hasVisibleText(content), `${dateiname}: Live-Bereich <${tag}> wird leer ausgeliefert`);
	}
	if (none) {
		check(true, `${dateiname}: kein Live-Bereich in dieser Datei (nichts zu prüfen)`);
	}
}

checkEmptyLiveRegions(controls, 'Controls.html');
checkEmptyLiveRegions(buyin, 'BuyIn.html');
checkEmptyLiveRegions(history, 'History.html');
checkEmptyLiveRegions(status, 'Status.html');
checkEmptyLiveRegions(musterCloth, 'MusterCloth.html');

/* ============================================================================
   V-3 — die Chipwahl ist eine echte Radiogruppe
   ============================================================================ */

console.log('\nV-3 — die Chipwahl ist eine echte Radiogruppe');

const fieldsetMatches = [...controls.matchAll(/<fieldset\b[^>]*class="[^"]*ck-table__chips[^"]*"[^>]*>/gi)];
check(fieldsetMatches.length === 1, `genau ein <fieldset class="ck-table__chips"> in Controls.html (gefunden: ${fieldsetMatches.length})`);

if (fieldsetMatches.length === 1) {
	const start = fieldsetMatches[0].index;
	const end = controls.indexOf('</fieldset>', start);
	const block = controls.slice(start, end === -1 ? undefined : end);
	check(/<legend>/i.test(block), 'die Chipwahl trägt ein <legend>');
	// Die Vorlage enthält GENAU EIN <input type="radio">-Template, das
	// <f:for each="{chips}"> fünfmal rendert (einmal je Chipwert) — nicht
	// fünf ausgeschriebene Kopien.
	check(/<f:for\s+each="\{chips\}"/i.test(block), 'die Chipwahl steht in einem <f:for each="{chips}">');
	const radios = [...block.matchAll(/<input\b[^>]*type="radio"[^>]*>/gi)];
	check(radios.length === 1, `genau ein <input type="radio">-Template in der Schleife (gefunden: ${radios.length})`);
	const names = new Set(radios.map((r) => (r[0].match(/name="([^"]*)"/) ?? [, null])[1]));
	check(names.size === 1 && [...names][0] !== null, `das Radio-Template trägt einen festen name (gefunden: ${[...names].join(', ')})`);
}
check(!/role\s*=\s*"radio"/i.test(controls), 'Controls.html enthält kein role="radio"');
check(!/aria-pressed\s*=/i.test(controls), 'Controls.html enthält kein aria-pressed');

/* ============================================================================
   V-4 — Feldknöpfe und Chipsatz
   ============================================================================ */

console.log('\nV-4 — Feldknöpfe und Chipsatz');

const feldKnoepfe = [...musterCloth.matchAll(/<button\b([^>]*)data-ck-field="([^"]*)"([^>]*)>/gi)];
check(feldKnoepfe.length === 4, `vier [data-ck-field]-Knöpfe in MusterCloth.html (gefunden: ${feldKnoepfe.length})`);
for (const match of feldKnoepfe) {
	const attrs = match[1] + match[3];
	check(/type\s*=\s*"button"/.test(attrs), `Feld "${match[2]}" ist <button type="button">`);
}
const gefundeneFeldIds = feldKnoepfe.map((m) => m[2]).sort();
const erwarteteFeldIds = [...musterTischJs.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]).sort();
check(erwarteteFeldIds.length === 4, `muster-tisch.js definiert vier Felder (gefunden: ${erwarteteFeldIds.length})`);
check(JSON.stringify(gefundeneFeldIds) === JSON.stringify(erwarteteFeldIds),
	`die Feld-Kennungen stimmen überein: ${gefundeneFeldIds.join(', ')} === ${erwarteteFeldIds.join(', ')}`);

const chipSpriteIndex = contentElement.search(/<f:render\s+partial="Table\/ChipSprite"/);
const controlsRenderIndex = contentElement.search(/<f:render\s+partial="Table\/Controls"/);
check(chipSpriteIndex !== -1 && controlsRenderIndex !== -1 && chipSpriteIndex < controlsRenderIndex,
	'CasinoTischMuster.html rendert Table/ChipSprite vor Table/Controls (das einzige Partial mit <use href="#ck-chip-…">)');

/* ============================================================================
   V-5 — Fokus bleibt sichtbar
   ============================================================================ */

console.log('\nV-5 — Fokus bleibt sichtbar');

check(!/outline\s*:\s*(none|0)\b/i.test(css), 'table.css enthält kein outline: none / outline: 0');
/* .ck-table__buyin-input ist mit Umsetzungsstück Tf entfallen (totes CSS seit
   dem Betragsformular-Rückbau in Tb, kein Markup benutzte die Klasse mehr).
   .ck-table__button deckt die Chipkasse bereits ab: ihre Knöpfe tragen
   class="ck-table__button ck-table__button--chip" (siehe BuyIn.html). */
for (const klasse of ['.ck-table__button', '.ck-felt__field']) {
	const re = new RegExp(`\\${klasse}\\s*:focus-visible`);
	check(re.test(css), `${klasse}:focus-visible ist definiert`);
}
check(/\.ck-table__chip:has\(:focus-visible\)/.test(css), '.ck-table__chip:has(:focus-visible) ist definiert');

/* ============================================================================
   V-6 — Mindestgröße
   ============================================================================ */

console.log('\nV-6 — Mindestgröße mindestens 2,75rem');

/**
 * @param {string} selector exakter Selektortext, z. B. ".ck-table__button"
 * @returns {?string} der Regelrumpf, oder null
 */
function ruleBody(selector) {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(`(?:^|[,{}\\s])${escaped}\\s*\\{([^}]*)\\}`, 'm');
	const match = re.exec(css);
	return match ? match[1] : null;
}

/* .ck-table__buyin-input ebenfalls hier entfernt, dieselbe Begründung wie bei
   V-5 oben. */
for (const selector of ['.ck-table__button', '.ck-table__chip', '.ck-felt__field']) {
	const body = ruleBody(selector);
	check(body !== null, `${selector} hat eine eigene Regel in table.css`);
	if (body === null) {
		continue;
	}
	for (const eigenschaft of ['min-inline-size', 'min-block-size']) {
		const m = new RegExp(`${eigenschaft}\\s*:\\s*([\\d.]+)rem`).exec(body);
		check(m !== null && Number(m[1]) >= 2.75,
			`${selector}: ${eigenschaft} ist mindestens 2.75rem (gefunden: ${m ? m[1] + 'rem' : '—'})`);
	}
}

/* ============================================================================
   V-7 — Bewegungsdrosselung
   ============================================================================ */

console.log('\nV-7 — Bewegungsdrosselung');

const reducedMotionMatch = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/.exec(css);
check(reducedMotionMatch !== null, 'table.css enthält einen @media (prefers-reduced-motion: reduce)-Block');
if (reducedMotionMatch) {
	const block = reducedMotionMatch[1];
	for (const eigenschaft of ['animation-duration', 'animation-iteration-count', 'transition-duration']) {
		check(block.includes(eigenschaft), `der Block setzt ${eigenschaft}`);
	}
}

/* ============================================================================
   V-8 — Farbe ist nie die einzige Aussage
   ============================================================================ */

console.log('\nV-8 — Farbe ist nie die einzige Aussage');

const toneRules = [...css.matchAll(/\.ck-history__mark--([a-z]+)\s*\{([^}]*)\}/g)];
check(toneRules.length >= 5, `mindestens fünf --tone-Abwandlungen von .ck-history__mark (gefunden: ${toneRules.length})`);
for (const [, tone, body] of toneRules) {
	const nurFarbe = /^[\s\S]*background-color\s*:[^;]+;[\s\S]*$/.test(body)
		&& !/inline-size|block-size|border-width|content\s*:/.test(body);
	check(nurFarbe, `.ck-history__mark--${tone} setzt ausschließlich Farbwerte, keine Form`);
}
const hoverBody = ruleBody('.ck-felt__field:hover');
check(hoverBody !== null && /border-width/.test(hoverBody),
	'.ck-felt__field:hover ändert zusätzlich zur Farbe die Strichstärke');
const checkedBody = ruleBody('.ck-table__chip:has(:checked)');
check(checkedBody !== null && /border-width/.test(checkedBody),
	'.ck-table__chip:has(:checked) ändert zusätzlich zur Farbe die Umrandung');

/* ============================================================================
   V-9 — aria-disabled statt disabled an CASH OUT
   ============================================================================ */

console.log('\nV-9 — aria-disabled statt disabled an CASH OUT');

const cashoutMatch = /<button\b[^>]*data-ck-table-cashout[^>]*>/i.exec(buyin);
check(cashoutMatch !== null, 'CASH OUT-Knopf gefunden in BuyIn.html');
if (cashoutMatch) {
	check(/aria-disabled\s*=\s*"true"/.test(cashoutMatch[0]), 'CASH OUT trägt aria-disabled="true"');
	check(!/(?<!aria-)\bdisabled\b/.test(cashoutMatch[0]), 'CASH OUT trägt KEIN disabled');
}

/* ============================================================================
   V-10 — Überschriftenstufe
   ============================================================================ */

console.log('\nV-10 — Überschriftenstufe');

check(/<h2\b/i.test(history), 'History.html benutzt <h2>');
for (const [name, datei] of [
	['Controls.html', controls],
	['BuyIn.html', buyin],
	['History.html', history],
	['Status.html', status],
	['MusterCloth.html', musterCloth],
]) {
	check(!/<h1\b/i.test(datei), `${name} gibt keine <h1> aus`);
}

/* ============================================================================
   V-11 — der erreichbare Name eines Feldes kommt aus data-ck-field-label,
   BEVOR auf den sichtbaren Text zurückgefallen wird (Phase C3, Teilstück C3e)
   ============================================================================
   Statisch nachgewiesen, nicht am laufenden Browser: die Reihenfolge im
   QUELLTEXT entscheidet, welcher Zweig gewinnt (ein JavaScript-Ausdruck
   a ? b : c wertet a zuerst aus), und genau diese Reihenfolge lässt sich aus
   dem Text lesen, ohne ihn auszuführen. */

console.log('\nV-11 — Feldname: data-ck-field-label vor dem sichtbaren Text');

/**
 * Schneidet den Rumpf einer benannten Funktion heraus — Klammerzählung statt
 * eines gierigen Musters, damit verschachtelte { } (if, for, Vorlagenketten)
 * den Rumpf nicht vorzeitig abschneiden.
 * @param {string} source
 * @param {string} name
 * @returns {?string}
 */
function functionBody(source, name) {
	const kopf = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(source);
	if (!kopf) {
		return null;
	}
	let tiefe = 1;
	let i = kopf.index + kopf[0].length;
	const start = i;
	while (i < source.length && tiefe > 0) {
		if (source[i] === '{') {
			tiefe++;
		} else if (source[i] === '}') {
			tiefe--;
		}
		i++;
	}
	return tiefe === 0 ? source.slice(start, i - 1) : null;
}

/**
 * Die eigentliche Aussage: im Rumpf von collect() steht
 * getAttribute('data-ck-field-label') VOR el.textContent.trim() — der
 * ternäre Ausdruck greift also zuerst zum eigenen Namen und fällt erst danach
 * auf den sichtbaren Text zurück.
 * @param {string} source
 * @returns {boolean}
 */
function labelVorTextContent(source) {
	const rumpf = functionBody(source, 'collect');
	if (rumpf === null) {
		return false;
	}
	const labelIndex = rumpf.indexOf("getAttribute('data-ck-field-label')");
	const textIndex = rumpf.indexOf('textContent.trim()');
	return labelIndex !== -1 && textIndex !== -1 && labelIndex < textIndex;
}

check(labelVorTextContent(tableFeltJs),
	'collect(): getAttribute(\'data-ck-field-label\') steht vor textContent.trim()');

const nameFieldRumpf = functionBody(tableFeltJs, 'nameField');
check(nameFieldRumpf !== null && /labelOf\(fieldId\)/.test(nameFieldRumpf),
	'nameField() benutzt labelOf(fieldId) — denselben Namen, den collect() bevorzugt gesammelt hat');
const labelOfRumpf = functionBody(tableFeltJs, 'labelOf');
check(labelOfRumpf !== null && /etiketten\.get\(fieldId\)/.test(labelOfRumpf),
	'labelOf() liest aus derselben etiketten-Sammlung, die collect() befüllt');

console.log('     Gegenprobe (V-11-G): eine Fassung ohne das Attribut, und eine mit vertauschter Reihenfolge, werden beide erkannt');
const ohneAttribut = tableFeltJs.replace(
	/const eigenerName = el\.getAttribute\('data-ck-field-label'\);\s*\n\s*etiketten\.set\(fieldId, typeof eigenerName === 'string' && eigenerName !== ''\s*\n\s*\? eigenerName\s*\n\s*: el\.textContent\.trim\(\)\);/,
	"etiketten.set(fieldId, el.textContent.trim());"
);
check(ohneAttribut !== tableFeltJs, 'GEGENPROBE-VORBEREITUNG: die Ersetzung hat wirklich gegriffen (sonst prüfte die Gegenprobe sich selbst)');
check(!labelVorTextContent(ohneAttribut),
	'GEGENPROBE: eine Fassung ganz ohne data-ck-field-label wird als FALSCH erkannt');

const vertauscht = 'function collect() { etiketten.set(fieldId, el.textContent.trim() || el.getAttribute(\'data-ck-field-label\')); }';
check(!labelVorTextContent(vertauscht),
	'GEGENPROBE: eine erfundene Fassung mit vertauschter Reihenfolge (erst textContent, dann das Attribut) wird als FALSCH erkannt');

/* ============================================================================
   V-12 — ein Chip wird place() → onPlace() gelegt, bei Absage takeBack()
   (Phase C3, Teilstück C3e)
   ============================================================================ */

console.log('\nV-12 — Reihenfolge beim Legen: bets.place() → onPlace(), bei Absage bets.takeBack()');

/**
 * @param {string} source
 * @returns {{ok: boolean, placeAt: number, onPlaceAt: number, takeBackAt: number}}
 */
function legenReihenfolge(source) {
	const rumpf = functionBody(source, 'legen');
	if (rumpf === null) {
		return { ok: false, placeAt: -1, onPlaceAt: -1, takeBackAt: -1 };
	}
	const placeAt = rumpf.indexOf('bets.place(');
	const onPlaceAt = rumpf.indexOf('onPlace(');
	const takeBackAt = rumpf.indexOf('bets.takeBack(');
	const ok = placeAt !== -1 && onPlaceAt !== -1 && takeBackAt !== -1
		&& placeAt < onPlaceAt && onPlaceAt < takeBackAt;
	return { ok, placeAt, onPlaceAt, takeBackAt };
}

const echteReihenfolge = legenReihenfolge(tableFeltJs);
check(echteReihenfolge.ok,
	'legen(): bets.place() vor onPlace() vor bets.takeBack() — genau die Reihenfolge, auf die sich der Rundennachweis eines Tischspiels verlassen kann');

console.log('     Gegenprobe (V-12-G): vertauschte Reihenfolge und fehlendes Zurückrollen werden beide erkannt');
const vertauschteReihenfolge = 'async function legen(fieldId) { '
	+ 'const antwort = await onPlace(fieldId, value); '
	+ 'const versuch = bets.place(fieldId, value); '
	+ 'bets.takeBack(fieldId); }';
check(!legenReihenfolge(vertauschteReihenfolge).ok,
	'GEGENPROBE: onPlace() vor bets.place() wird als FALSCH erkannt');

const ohneZurueckrollen = 'async function legen(fieldId) { '
	+ 'const versuch = bets.place(fieldId, value); '
	+ 'const antwort = await onPlace(fieldId, value); }';
check(!legenReihenfolge(ohneZurueckrollen).ok,
	'GEGENPROBE: eine Fassung ohne bets.takeBack() im Ablehnungsfall wird als FALSCH erkannt');

/* ============================================================================
   V-13 — data-text-frozen: kein Attribut ohne Leser, kein Leser ohne Attribut
   (Phase C7, Umsetzungsstück C7c)
   ============================================================================ */

console.log('\nV-13 — data-text-frozen: Attribut, XLIFF-Kennung und beide Leser');

check(/data-text-frozen\s*=/.test(status), 'Status.html trägt data-text-frozen');
check(/<trans-unit\s+id="table\.announce\.frozen">/.test(locallang),
	'die XLIFF-Kennung table.announce.frozen existiert');
check(/texts\.frozen\b/.test(tableFeltJs), 'table-felt.js liest texts.frozen');
check(/dataset\.textFrozen\b/.test(tableControlsJs), 'table-controls.js liest dataset.textFrozen');

console.log('     Gegenprobe (V-13-G): eine Fassung ohne das Attribut wird als FALSCH erkannt');
const statusOhneFrozen = status.replace(/\s*data-text-frozen="[^"]*"/, '');
check(statusOhneFrozen !== status, 'GEGENPROBE-VORBEREITUNG: die Ersetzung hat wirklich gegriffen (sonst prüfte die Gegenprobe sich selbst)');
check(!/data-text-frozen\s*=/.test(statusOhneFrozen), 'GEGENPROBE: eine Fassung ganz ohne data-text-frozen wird als FALSCH erkannt');

console.log(failed
	? '\nERGEBNIS: Markup oder Stylesheet des Spieltisches stimmen NICHT.'
	: '\nERGEBNIS: jedes Bedienteil hat einen Namen, alle Live-Bereiche werden leer '
	+ 'ausgeliefert, die Chipwahl ist eine echte Radiogruppe, Feldknöpfe und Chipsatz '
	+ 'passen zusammen, der Fokus bleibt überall sichtbar, jedes Bedienteil ist '
	+ 'mindestens 2,75rem groß, die Bewegungsdrosselung greift, Farbe ist nirgends die '
	+ 'einzige Aussage, CASH OUT ist aria-disabled statt disabled, die '
	+ 'Überschriftenstufen stimmen, table-felt.js hält den Vertrag aus Teilstück C3d '
	+ '(data-ck-field-label, Reihenfolge beim Legen) ein, und data-text-frozen für '
	+ 'Vertragswetten hat Attribut, XLIFF-Kennung und beide Leser.');

process.exit(failed ? 1 : 0);
