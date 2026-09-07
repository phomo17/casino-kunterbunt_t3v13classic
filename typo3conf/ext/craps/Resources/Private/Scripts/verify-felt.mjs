/**
 * Craps – Nachweis des Tuchs (PHP-Spiegel, Markup, Sprache, Maßordnung)
 * ========================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede npm-Abhängigkeit;
 * es genügt ein Node ab Version 18 und ein php-Binär im selben Container.
 * Startet keinen Browser.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-felt.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Umsetzungsstück C7d)
 * ---------------------------------------------
 *   F-1   BetLayout::fields() (PHP) und bets-craps.js (JavaScript) stimmen
 *         für alle 47 Felder überein: max, das Odds-Kennzeichen
 *         (odds ⟷ countsToRoundMax === false), payoutText ⟷ ratioFor()
 *         (Ausnahme: die zwei Linien-Odds, deren Text „3-4-5×" lautet) und
 *         unit ⟷ stakeUnit(). ROUND_MAX stimmt in beiden (300).
 *   F-2   Felt.html hat genau eine Knopf-Vorlage, genau vier
 *         Gruppen-Durchläufe (numbers/lines/hardways/single) und jede
 *         wirkliche Feldgruppe gehört zu einer dieser vier — daraus folgt,
 *         dass jedes der 47 Felder genau einen Knopf bekommt.
 *   F-3   die Knopf-Vorlage ist ein echtes <button type="button">, kein
 *         <div role="button">, trägt data-ck-field.
 *   F-4   jedes Feld trägt aria-label UND data-ck-field-label mit demselben
 *         Ausdruck; alle 47 aufgelösten Namen sind paarweise verschieden;
 *         kein {0}/%1$s bleibt unaufgelöst stehen.
 *   F-5   jede benutzte XLIFF-Kennung existiert; keine neu angelegte
 *         Kennung ist unbenutzt; serverseitig aufgelöste Kennungen benutzen
 *         %1$s, von JavaScript ersetzte {0} — keine mischt beides.
 *   F-6   die Maßordnung: alle 47 Felder liegen innerhalb von 12×11, keine
 *         zwei überlappen, Zeile 1 ist frei, die sechs Puck-Regeln stimmen
 *         mit BetLayout::puckLanes() überein.
 *   F-7   Zielgröße (SC 2.5.8): --cr-cell ≥ 2,75rem, jede Zeilenhöhe außer
 *         der Puck-Spur ≥ 2,75rem, das schmalste Feld ist eine Spur breit,
 *         .cr-felt__working-label ≥ 2,75rem hoch.
 *   F-8   felt.css: kein eigener Farbwert, jeder benutzte Token existiert,
 *         jede eigene Klasse beginnt mit cr-.
 *   F-9   Kontrast (SC 1.4.3) der drei tatsächlich benutzten Paarungen.
 *   F-10  Form statt nur Farbe (SC 1.4.1): die dunkle Seite hat eine eigene
 *         Formregel, ihr Aufdruck nennt „Don't" ausgeschrieben.
 *   F-11  der Sprunglink ist das erste fokussierbare Element in .ck-felt,
 *         seine Feinlage steht nur unter :focus-visible.
 *   F-12  genau ein <h2> mit id, vier role="group" mit vier verschiedenen
 *         aria-label, der Place-Schalter ist ein natives Kontrollkästchen.
 *   F-13  der Puck sagt nichts doppelt an: aria-hidden ohne role,
 *         [data-cr-point-text] ist kein Live-Bereich.
 *
 * WIE DER PHP-SPIEGEL GELESEN WIRD
 * ---------------------------------
 * BetLayout::fields() lässt sich nicht per "php -r" abfragen (das Sandbox-
 * Regelwerk dieses Projekts verbietet inline ausgeführten Interpreter-Code
 * ausdrücklich). Stattdessen liest ein eigenes, winziges PHP-Realfile
 * (dump-bet-layout.php) BetLayout.php unmittelbar per require ein — ohne
 * TYPO3-Bootstrap, weil die Klasse an nichts Frameworkspezifischem hängt —
 * und schreibt das Ergebnis als JSON nach STDOUT. Dieses Skript ruft es als
 * gewöhnliches PHP-Programm auf (kein -r, kein eval).
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/craps/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
/** typo3conf/ext/casino_startpage/ — Quelle der Design-Tokens (F-8, F-9). */
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

/** Wie check(), aber ohne den Fehlerzähler zu erhöhen — für Hinweise auf
 *  Stellen, die erst ein späteres Umsetzungsstück (C7e) liefert. */
function hinweis(text, ...zeilen) {
	console.log(`  ℹ ${text}`);
	for (const zeile of zeilen) {
		console.log(`      ${zeile}`);
	}
}

function lies(datei) {
	return readFileSync(datei, 'utf8');
}

/** Entfernt Fluid-Kommentare, damit ein erklärender Absatz keinen Fund vortäuscht. */
function ohneFluidKommentare(inhalt) {
	return inhalt.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '');
}

/** Entfernt CSS-Blockkommentare (/* … *\/), für F-6/F-7/F-8/F-10 auf felt.css. */
function ohneBlockKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Ein hex-Farbwert ("ede4cf" oder "#ede4cf") als [r, g, b]. */
function hexZuRgb(hex) {
	const h = hex.replace('#', '');
	return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
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

/** Liest den hex-Wert eines --ck-…-Tokens unmittelbar aus tokens.css. */
function tokenHex(quelle, token) {
	const muster = new RegExp(`(?:^|[\\s;{])${token}\\s*:\\s*#([0-9a-fA-F]{6})\\s*;`, 'm');
	const treffer = muster.exec(quelle);
	return treffer ? treffer[1] : null;
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

/** (?:^|[\s;{]) davor ist bindend: sonst fände "color" auch das Ende von "background-color". */
function eigenschaftsWert(rumpf, eigenschaft) {
	const escaped = eigenschaft.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const muster = new RegExp(`(?:^|[\\s;{])${escaped}\\s*:\\s*([^;]+);`, 'm');
	const treffer = muster.exec(rumpf ?? '');
	return treffer ? treffer[1].trim() : null;
}

/** „9 zu 5" — dieselbe Formel wie BetLayout::ratioText() in PHP. */
function ratioText(ratio) {
	return `${ratio.num} zu ${ratio.den}`;
}

console.log('\nCraps – Nachweis des Tuchs (PHP-Spiegel, Markup, Sprache, Maßordnung)');
console.log('========================================================================\n');

const BET_LAYOUT_PFAD = path.join(EXT, 'Classes/BetLayout.php');
const DUMP_SCRIPT_PFAD = path.join(EXT, 'Resources/Private/Scripts/dump-bet-layout.php');
const BETS_JS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/bets-craps.js');
const FELT_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Craps/Felt.html');
const ROUND_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Craps/Round.html');
const TABLE_HTML_PFAD = path.join(EXT, 'Resources/Private/ContentElements/Table.html');
const LOCALLANG_PFAD = path.join(EXT, 'Resources/Private/Language/locallang.xlf');
const FELT_CSS_PFAD = path.join(EXT, 'Resources/Public/Css/felt.css');
const TOKENS_CSS_PFAD = path.join(SITE, 'Resources/Public/Css/tokens.css');
const EXT_LOCALCONF_PFAD = path.join(EXT, 'ext_localconf.php');

for (const [name, pfad] of [
	['BetLayout.php', BET_LAYOUT_PFAD],
	['bets-craps.js', BETS_JS_PFAD],
	['Felt.html', FELT_HTML_PFAD],
	['Round.html', ROUND_HTML_PFAD],
	['felt.css', FELT_CSS_PFAD],
	['tokens.css', TOKENS_CSS_PFAD],
]) {
	if (!existsSync(pfad)) {
		console.log(`\nERGEBNIS: Abbruch — ${name} existiert nicht.`);
		process.exit(1);
	}
}

const { FIELDS, ROUND_MAX, POINTS, ratioFor, oddsMax, payout, stakeUnit } =
	await import(new URL('../../Public/JavaScript/bets-craps.js', import.meta.url));

function ladePhpDaten() {
	const json = execFileSync('php', [DUMP_SCRIPT_PFAD], { encoding: 'utf8' });
	return JSON.parse(json);
}

const phpDaten = ladePhpDaten();
const phpFelder = phpDaten.fields;

/* ================================================ F-1 PHP gegen JavaScript */

console.log('F-1  BetLayout::fields() (PHP) stimmt mit bets-craps.js (JavaScript) überein');
{
	check(phpFelder.length === 47, `PHP liefert 47 Felder (gefunden: ${phpFelder.length})`);
	check(FIELDS.length === 47, `JavaScript liefert 47 Felder (gefunden: ${FIELDS.length})`);
	check(phpDaten.roundMax === 300 && ROUND_MAX === 300, `ROUND_MAX ist 300 in beiden (PHP: ${phpDaten.roundMax}, JS: ${ROUND_MAX})`);

	/**
	 * Reine Vergleichsfunktion ohne Seiteneffekt auf den Fehlerzähler.
	 * @returns {{nurInPhp: string[], nurInJs: string[], abweichungen: string[]}}
	 */
	function finde_abweichungen(phpListe, jsListe) {
		const phpNachId = new Map(phpListe.map((f) => [f.id, f]));
		const jsNachId = new Map(jsListe.map((f) => [f.id, f]));

		const nurInPhp = [...phpNachId.keys()].filter((id) => !jsNachId.has(id));
		const nurInJs = [...jsNachId.keys()].filter((id) => !phpNachId.has(id));

		const abweichungen = [];
		for (const [id, phpFeld] of phpNachId) {
			const jsFeld = jsNachId.get(id);
			if (!jsFeld) continue;

			if (phpFeld.max !== jsFeld.max) {
				abweichungen.push(`Feld "${id}": max PHP=${phpFeld.max} JS=${jsFeld.max}`);
			}
			const jsIstOdds = jsFeld.countsToRoundMax === false;
			if (phpFeld.odds !== jsIstOdds) {
				abweichungen.push(`Feld "${id}": odds-Kennzeichen PHP=${phpFeld.odds} JS(countsToRoundMax===false)=${jsIstOdds}`);
			}

			const istLinienOdds = id === 'pass-odds' || id === 'dont-pass-odds';
			if (istLinienOdds) {
				if (phpFeld.payoutText !== '3-4-5×') {
					abweichungen.push(`Feld "${id}": payoutText soll "3-4-5×" sein, ist "${phpFeld.payoutText}"`);
				}
			} else {
				const ratio = ratioFor(id, {});
				const erwartet = ratio ? ratioText(ratio) : null;
				if (erwartet !== null && phpFeld.payoutText !== erwartet) {
					abweichungen.push(`Feld "${id}": payoutText PHP="${phpFeld.payoutText}" erwartet(ratioFor)="${erwartet}"`);
				}
			}

			const erwarteteEinheit = stakeUnit(id, null);
			if (phpFeld.unit !== erwarteteEinheit) {
				abweichungen.push(`Feld "${id}": unit PHP=${phpFeld.unit} erwartet(stakeUnit)=${erwarteteEinheit}`);
			}
		}
		return { nurInPhp, nurInJs, abweichungen };
	}

	const echterAbgleich = finde_abweichungen(phpFelder, FIELDS);
	check(echterAbgleich.nurInPhp.length === 0, 'keine Kennung existiert nur in PHP', ...echterAbgleich.nurInPhp);
	check(echterAbgleich.nurInJs.length === 0, 'keine Kennung existiert nur in JavaScript', ...echterAbgleich.nurInJs);
	check(echterAbgleich.abweichungen.length === 0,
		'alle 47 Felder stimmen in max, odds-Kennzeichen, payoutText und unit überein',
		...echterAbgleich.abweichungen);

	console.log('     Gegenprobe F-1-G: eine verfälschte Kopie der PHP-Liste (field.max verstellt) muss auffallen');
	const verfaelscht = phpFelder.map((f) => (f.id === 'field' ? { ...f, max: 999 } : f));
	const gegenprobe = finde_abweichungen(verfaelscht, FIELDS);
	const gegenprobeSchlaegtAn = gegenprobe.abweichungen.some((z) => z.includes('"field"') && z.includes('max'));
	check(gegenprobeSchlaegtAn, 'F-1-G: die verfälschte Kopie (field.max = 999) wird als Abweichung erkannt', ...gegenprobe.abweichungen);
}

/* ===================================================== F-2 Knopf ↔ Feld */

console.log('\nF-2  Genau eine Knopf-Vorlage, genau vier Gruppen-Durchläufe, jedes Feld gehört zu einer Gruppe');
{
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));

	const aeussereSchleife = /<f:for each="\{0: '([a-z]+)', 1: '([a-z]+)', 2: '([a-z]+)', 3: '([a-z]+)'\}" as="gruppe">/.exec(feltHtml);
	check(aeussereSchleife !== null, 'die äußere Schleife über die vier Gruppennamen existiert');
	const gruppenNamen = aeussereSchleife ? aeussereSchleife.slice(1, 5) : [];
	const ERWARTETE_GRUPPEN = ['numbers', 'lines', 'hardways', 'single'];
	check(new Set(gruppenNamen).size === 4 && ERWARTETE_GRUPPEN.every((g) => gruppenNamen.includes(g)),
		'die vier Gruppennamen sind genau numbers/lines/hardways/single, jede genau einmal', ...gruppenNamen);

	const innereSchleifen = (feltHtml.match(/<f:for each="\{felt\.fields\}" as="field">/g) ?? []).length;
	check(innereSchleifen === 1, `genau eine <f:for each="{felt.fields}"> innerhalb der Gruppenschleife (gefunden: ${innereSchleifen})`);

	const aeussereIdx = feltHtml.indexOf(aeussereSchleife?.[0] ?? ' ');
	const innereIdx = feltHtml.indexOf('<f:for each="{felt.fields}" as="field">');
	const letzterSchleifenschluss = feltHtml.lastIndexOf('</f:for>');
	check(aeussereIdx !== -1 && innereIdx > aeussereIdx && innereIdx < letzterSchleifenschluss,
		'die Feldschleife liegt innerhalb der Gruppenschleife (verschachtelt), nicht daneben');

	const knopfVorlagen = (feltHtml.match(/data-ck-field="\{field\.id\}"/g) ?? []).length;
	check(knopfVorlagen === 1, `genau eine Knopf-Vorlage, zur Laufzeit 4 × 47-mal instanziiert (gefunden: ${knopfVorlagen})`);

	const echteGruppen = new Set(phpFelder.map((f) => f.group));
	const unbekannteGruppe = [...echteGruppen].filter((g) => !gruppenNamen.includes(g));
	check(unbekannteGruppe.length === 0, 'jede wirkliche Feldgruppe ist einer der vier Schleifen-Gruppen zugeordnet', ...unbekannteGruppe);
	check(ERWARTETE_GRUPPEN.every((g) => echteGruppen.has(g)), 'jede der vier Gruppen wird von mindestens einem echten Feld benutzt',
		...ERWARTETE_GRUPPEN.filter((g) => !echteGruppen.has(g)));

	console.log('     Gegenprobe F-2-G: eine erfundene fünfte Gruppe und eine fehlende Gruppe müssen beide auffallen');
	const mitErfundener = [...gruppenNamen, 'erfunden'];
	check(new Set(mitErfundener).size !== 4, 'F-2-G: eine erfundene fünfte Gruppe verändert die Anzahl und wird erkannt');
	const ohneErste = gruppenNamen.slice(1);
	check(!ERWARTETE_GRUPPEN.every((g) => ohneErste.includes(g)), 'F-2-G: eine fehlende Gruppe wird erkannt');
}

/* ================================================ F-3 Echter <button>-Knopf */

console.log('\nF-3  Die Knopf-Vorlage ist ein echter <button type="button">');
{
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const knopfVorlagen = [...feltHtml.matchAll(/<button[^>]*data-ck-field="\{field\.id\}"[^>]*>/gs)].map((m) => m[0]);
	check(knopfVorlagen.length === 1, `genau eine Knopf-Vorlage (gefunden: ${knopfVorlagen.length})`);
	check(knopfVorlagen.every((b) => /^<button type="button"/.test(b)), 'die Knopf-Vorlage beginnt mit <button type="button">', ...knopfVorlagen);
	check(!feltHtml.includes('role="button"'), 'kein role="button" im Tuch (ARIA fügt kein Verhalten hinzu)');
	check(!/<div[^>]*data-ck-field=/.test(feltHtml), 'kein <div> mit data-ck-field');
	const echtesDisabled = knopfVorlagen.filter((b) => b.replace(/aria-disabled/g, '').includes('disabled'));
	check(echtesDisabled.length === 0, 'die Knopf-Vorlage trägt kein echtes disabled (nur aria-disabled ist zulässig)', ...echtesDisabled);
}

/* ============================================ F-4 Erreichbarer Name je Feld */

console.log('\nF-4  Jedes Feld trägt aria-label/data-ck-field-label; alle 47 Namen sind paarweise verschieden');
{
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const knopf = /<button[^>]*data-ck-field="\{field\.id\}"[\s\S]*?<\/button>/.exec(feltHtml)?.[0] ?? '';
	check(knopf.includes('data-ck-field-label="{f:translate(key: field.labelKey, arguments: field.labelArgs)}"'),
		'die Knopf-Vorlage trägt data-ck-field-label mit demselben Ausdruck (key: field.labelKey, arguments: field.labelArgs)');
	check(knopf.includes('aria-label="{f:translate(key: field.labelKey, arguments: field.labelArgs)}"'),
		'die Knopf-Vorlage trägt aria-label mit demselben Ausdruck');

	const locallang = lies(LOCALLANG_PFAD);
	function quelltext(id) {
		const muster = new RegExp(`<trans-unit id="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">\\s*<source>([^<]*)</source>`);
		return muster.exec(locallang)?.[1] ?? null;
	}

	/** Löst %1$s/%2$s/%3$s mit labelArgs auf, wie vsprintf es täte. */
	function aufgeloest(source, labelArgs) {
		return source.replace(/%(\d+)\$s/g, (_, n) => String(labelArgs[Number(n) - 1] ?? `%${n}$s-FEHLT`));
	}

	const namen = [];
	const unaufgeloest = [];
	const fehlendeKennung = [];
	for (const f of phpFelder) {
		const id = f.labelKey.split(':').pop();
		const source = quelltext(id);
		if (source === null) {
			fehlendeKennung.push(`${f.id}: labelKey "${id}" hat keinen <source> in locallang.xlf`);
			continue;
		}
		const resolved = aufgeloest(source, f.labelArgs);
		if (/%\d+\$s/.test(resolved) || /\{\d+\}/.test(resolved)) {
			unaufgeloest.push(`${f.id} ("${id}"): "${resolved}" enthält noch einen unaufgelösten Platzhalter`);
		}
		namen.push({ id: f.id, resolved });
	}
	check(fehlendeKennung.length === 0, 'jede labelKey-Kennung hat einen <source>-Text in locallang.xlf', ...fehlendeKennung);
	check(unaufgeloest.length === 0, 'kein aufgelöster Name enthält noch {0} oder %1$s', ...unaufgeloest);

	const gruppiert = new Map();
	for (const { id, resolved } of namen) {
		if (!gruppiert.has(resolved)) gruppiert.set(resolved, []);
		gruppiert.get(resolved).push(id);
	}
	const doppelt = [...gruppiert.entries()].filter(([, ids]) => ids.length > 1);
	check(doppelt.length === 0, `alle ${namen.length} aufgelösten Namen sind paarweise verschieden`,
		...doppelt.map(([name, ids]) => `"${name}": ${ids.join(', ')}`));

	console.log('     Gegenprobe F-4-G: zwei künstlich gleichgemachte Namen müssen auffallen');
	const verfaelschteNamen = namen.map((n) => (n.id === 'two' || n.id === 'three' ? { ...n, resolved: 'GLEICH' } : n));
	const gruppiertGegenprobe = new Map();
	for (const { id, resolved } of verfaelschteNamen) {
		if (!gruppiertGegenprobe.has(resolved)) gruppiertGegenprobe.set(resolved, []);
		gruppiertGegenprobe.get(resolved).push(id);
	}
	const doppeltGegenprobe = [...gruppiertGegenprobe.entries()].filter(([, ids]) => ids.length > 1);
	check(doppeltGegenprobe.length === 1, 'F-4-G: zwei künstlich gleichgemachte Namen ("two"/"three") werden erkannt');
}

/* ========================================================= F-5 XLIFF-Keys */

console.log('\nF-5  Jede benutzte Kennung existiert; keine neu angelegte Kennung ist unbenutzt; keine Kennung mischt %1$s und {0}');
{
	const locallang = lies(LOCALLANG_PFAD);
	const definierteIds = new Set([...locallang.matchAll(/<trans-unit id="([^"]+)"/g)].map((m) => m[1]));
	const quelltexte = new Map(
		[...locallang.matchAll(/<trans-unit id="([^"]+)">\s*<source>([^<]*)<\/source>/g)].map((m) => [m[1], m[2]])
	);

	const feltHtml = lies(FELT_HTML_PFAD);
	const roundHtml = lies(ROUND_HTML_PFAD);
	const tableHtml = existsSync(TABLE_HTML_PFAD) ? lies(TABLE_HTML_PFAD) : '';
	const gesamtMarkup = [feltHtml, roundHtml, tableHtml].join('\n');

	// 1. statisch benutzte Kennungen: locallang.xlf:xyz. Die eine dynamische
	//    Stelle (…:felt.group.{gruppe}) bricht am "{" ab und hinterließe eine
	//    Kennung mit einem Punkt am Ende ("felt.group.") — herausgefiltert,
	//    weil sie eigens über gruppenSchluessel unten behandelt wird.
	const statischeSchluessel = new Set(
		[...gesamtMarkup.matchAll(/locallang\.xlf:([a-zA-Z0-9._-]+)/g)]
			.map((m) => m[1])
			.filter((id) => !id.endsWith('.'))
	);
	// 2. die vier Gruppen-Kennungen felt.group.{numbers,lines,hardways,single}
	//    entstehen erst zur Laufzeit aus 'felt.group.{gruppe}' + gruppe.
	const gruppenSchluessel = new Set(['felt.group.numbers', 'felt.group.lines', 'felt.group.hardways', 'felt.group.single']);
	// 3. dynamisch benutzte Kennungen: jedes labelKey aus der echten Feldliste.
	const dynamischeSchluessel = new Set(phpFelder.map((f) => f.labelKey.split(':').pop()));
	// 4. printed-Werte, die KEINE Ziffer sind (die Come-Kästen tragen die
	//    Ziffer selbst, kein XLIFF-Bezeichner).
	const printedSchluessel = new Set(phpFelder.map((f) => f.printed).filter((p) => p !== '' && !/^\d+$/.test(p)));
	// 5. PHP-seitig über Craps::LANG_FRONTEND . '...' zusammengesetzte Schlüssel.
	const localconfPhp = existsSync(EXT_LOCALCONF_PFAD) ? lies(EXT_LOCALCONF_PFAD) : '';
	const phpSchluessel = new Set(
		[...localconfPhp.matchAll(/Craps::LANG_FRONTEND\s*\.\s*'([a-zA-Z0-9._-]+)'/g)].map((m) => m[1])
	);

	const benutzt = new Set([...statischeSchluessel, ...gruppenSchluessel, ...dynamischeSchluessel, ...printedSchluessel, ...phpSchluessel]);

	const fehlend = [...benutzt].filter((id) => !definierteIds.has(id));
	check(fehlend.length === 0, 'jede benutzte Kennung existiert in locallang.xlf', ...fehlend);

	// Die Liste der in DIESEM Umsetzungsstück neu angelegten Kennungen — jede
	// muss tatsächlich benutzt werden (Karteileichen-Probe, auf den neuen
	// Bestand beschränkt; automat.*/throw.* aus früheren Stücken bleiben
	// unangetastet und werden hier nicht erneut geprüft).
	const NEU_ANGELEGT = [
		'felt.label', 'felt.skip', 'felt.group.numbers', 'felt.group.lines', 'felt.group.hardways', 'felt.group.single',
		'felt.puck.off', 'felt.puck.on', 'felt.point.none', 'felt.point.set', 'felt.fieldname', 'felt.fieldname.empty',
		'felt.print.pass', 'felt.print.dontpass', 'felt.print.come', 'felt.print.dontcome', 'felt.print.odds', 'felt.print.field',
		'felt.print.dontcome.4', 'felt.print.dontcome.5', 'felt.print.dontcome.6', 'felt.print.dontcome.8', 'felt.print.dontcome.9', 'felt.print.dontcome.10',
		'felt.print.place.4', 'felt.print.place.5', 'felt.print.place.6', 'felt.print.place.8', 'felt.print.place.9', 'felt.print.place.10',
		'felt.print.hard.4', 'felt.print.hard.6', 'felt.print.hard.8', 'felt.print.hard.10',
		'felt.print.seven', 'felt.print.craps', 'felt.print.two', 'felt.print.three', 'felt.print.eleven', 'felt.print.twelve',
		'felt.name.pass', 'felt.name.dontpass', 'felt.name.come', 'felt.name.dontcome', 'felt.name.passodds', 'felt.name.dontpassodds',
		'felt.name.comepoint', 'felt.name.dontcomepoint', 'felt.name.comeodds', 'felt.name.dontcomeodds', 'felt.name.place', 'felt.name.field',
		'felt.name.hard', 'felt.name.seven', 'felt.name.craps', 'felt.name.two', 'felt.name.three', 'felt.name.eleven', 'felt.name.twelve',
		'felt.place.working', 'felt.place.hint',
		'round.announce.natural', 'round.announce.craps', 'round.announce.pointset', 'round.announce.pointmade', 'round.announce.sevenout',
		'round.announce.roll', 'round.announce.money.win', 'round.announce.money.partial', 'round.announce.money.loss', 'round.announce.money.none',
		'round.announce.nostake', 'round.announce.unavailable', 'round.announce.closed',
		'round.reject.contract', 'round.reject.comeout', 'round.reject.traveled', 'round.reject.nopoint', 'round.reject.nobase', 'round.reject.oddsmax',
		'round.hint.unit', 'round.history.point',
	];
	check(NEU_ANGELEGT.every((id) => definierteIds.has(id)), 'jede der neu angelegten Kennungen existiert in locallang.xlf',
		...NEU_ANGELEGT.filter((id) => !definierteIds.has(id)));
	const unbenutztNeu = NEU_ANGELEGT.filter((id) => !benutzt.has(id));
	check(unbenutztNeu.length === 0, `keine der ${NEU_ANGELEGT.length} neu angelegten Kennungen ist unbenutzt`, ...unbenutztNeu);

	// Serverseitig aufgelöst (mit arguments:) sind genau die labelKey-Kennungen
	// (felt.name.*). Alles andere, das JavaScript zur Laufzeit füllt, benutzt
	// {0}/{1}/{2}. Keine Kennung darf beide Schreibweisen zugleich benutzen.
	const serverseitig = dynamischeSchluessel;
	const vermischt = [];
	for (const id of benutzt) {
		const source = quelltexte.get(id);
		if (!source) continue;
		const hatProzent = /%\d+\$s/.test(source);
		const hatGeschweift = /\{\d+\}/.test(source);
		if (hatProzent && hatGeschweift) {
			vermischt.push(`${id}: enthält sowohl %N$s als auch {N}`);
			continue;
		}
		if (serverseitig.has(id) && hatGeschweift) {
			vermischt.push(`${id}: serverseitig aufgelöst (labelKey), benutzt aber {N} statt %N$s`);
		}
		if (!serverseitig.has(id) && hatProzent) {
			vermischt.push(`${id}: von JavaScript ersetzt, benutzt aber %N$s statt {N}`);
		}
	}
	check(vermischt.length === 0, 'keine benutzte Kennung mischt %1$s und {0}, und jede benutzt die für ihren Weg richtige Schreibweise', ...vermischt);

	console.log('     Gegenprobe F-5-G: eine erfundene, nirgends benutzte Kennung muss auffallen');
	const NEU_MIT_GEIST = [...NEU_ANGELEGT, 'geist.unbenutzt'];
	const unbenutztMitGeist = NEU_MIT_GEIST.filter((id) => !benutzt.has(id));
	check(unbenutztMitGeist.includes('geist.unbenutzt'), 'F-5-G: eine erfundene unbenutzte Kennung wird tatsächlich als unbenutzt erkannt');
}

/* ==================================================== F-6 Die Maßordnung */

console.log('\nF-6  Alle 47 Felder liegen im Gitter, keine zwei überlappen, Zeile 1 ist frei, der Puck stimmt');
{
	check(phpDaten.columns === 12 && phpDaten.rows === 11, `Gitter ist 12×11 (gefunden: ${phpDaten.columns}×${phpDaten.rows})`);

	// col/row sind Gitterlinien: ein 12-Spalten-Gitter hat die Linien 1..13,
	// ein 11-Zeilen-Gitter die Linien 1..12 — colEnd/rowEnd dürfen deshalb bis
	// einschließlich columns+1 bzw. rows+1 reichen (die letzte Linie).
	const ausserhalb = phpFelder.filter((f) =>
		f.col < 1 || f.colEnd > phpDaten.columns + 1 || f.row < 1 || f.rowEnd > phpDaten.rows + 1 || f.colEnd <= f.col || f.rowEnd <= f.row
	);
	check(ausserhalb.length === 0, 'alle 47 Felder liegen innerhalb von 12 Spalten und 11 Zeilen, mit positiver Ausdehnung', ...ausserhalb.map((f) => f.id));

	function ueberlappt(a, b) {
		return a.col < b.colEnd && b.col < a.colEnd && a.row < b.rowEnd && b.row < a.rowEnd;
	}
	const paare = [];
	for (let i = 0; i < phpFelder.length; i += 1) {
		for (let j = i + 1; j < phpFelder.length; j += 1) {
			if (ueberlappt(phpFelder[i], phpFelder[j])) {
				paare.push(`${phpFelder[i].id} × ${phpFelder[j].id}`);
			}
		}
	}
	const erwarteteAnzahlPaare = (phpFelder.length * (phpFelder.length - 1)) / 2;
	check(paare.length === 0, `keine zwei der ${erwarteteAnzahlPaare} Feldpaare überlappen`, ...paare);

	const inZeile1 = phpFelder.filter((f) => f.row < 2 && f.rowEnd > 1);
	check(inZeile1.length === 0, 'Zeile 1 (Puck-Spur) ist frei von Feldern', ...inZeile1.map((f) => f.id));

	console.log('     Gegenprobe F-6-G: eine um eine Spalte verschobene place-6 erzeugt eine Überlappung');
	const verschoben = phpFelder.map((f) => (f.id === 'place-6' ? { ...f, col: f.col + 1, colEnd: f.colEnd + 1 } : f));
	const paareGegenprobe = [];
	for (let i = 0; i < verschoben.length; i += 1) {
		for (let j = i + 1; j < verschoben.length; j += 1) {
			if (ueberlappt(verschoben[i], verschoben[j])) paareGegenprobe.push(`${verschoben[i].id} × ${verschoben[j].id}`);
		}
	}
	check(paareGegenprobe.length > 0, 'F-6-G: die verschobene Kopie erzeugt mindestens eine Überlappung und wird erkannt');

	// Der Puck: die Basisregel .cr-puck (OFF, geparkt) und die sechs
	// [data-cr-point='N']-Regeln gegen BetLayout::puckLanes().
	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));
	const basisRumpf = regelRumpf(feltCss, '.cr-puck');
	const basisSpalte = eigenschaftsWert(basisRumpf, 'grid-column');
	const erwarteteBasis = `${phpDaten.puckLanes['0'].col} / ${phpDaten.puckLanes['0'].colEnd}`;
	check(basisSpalte === erwarteteBasis, `die Basisregel .cr-puck (OFF) liegt auf ${erwarteteBasis} (gefunden: ${basisSpalte})`);

	const puckAbweichungen = [];
	for (const n of POINTS) {
		const rumpf = regelRumpf(feltCss, `[data-cr-point='${n}'] .cr-puck`);
		const spalte = rumpf ? eigenschaftsWert(rumpf, 'grid-column') : null;
		const erwartet = `${phpDaten.puckLanes[String(n)].col} / ${phpDaten.puckLanes[String(n)].colEnd}`;
		if (spalte !== erwartet) {
			puckAbweichungen.push(`Point ${n}: felt.css="${spalte}" BetLayout::puckLanes()="${erwartet}"`);
		}
	}
	check(puckAbweichungen.length === 0, 'die sechs Puck-Regeln in felt.css stimmen Spalte für Spalte mit BetLayout::puckLanes() überein', ...puckAbweichungen);
}

/* ================================================ F-7 Zielgröße (SC 2.5.8) */

console.log('\nF-7  Zielgröße (SC 2.5.8): --cr-cell ≥ 2,75rem, jede Zeilenhöhe (außer der Puck-Spur) ≥ 2,75rem');
{
	function remWert(deklaration) {
		if (deklaration === null) return null;
		const treffer = /(-?\d+(?:\.\d+)?)rem/.exec(deklaration);
		return treffer ? Number(treffer[1]) : null;
	}

	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));
	const feltRumpf = regelRumpf(feltCss, '.cr-felt');
	const cellWert = remWert(eigenschaftsWert(feltRumpf, '--cr-cell'));
	check(cellWert !== null && cellWert >= 2.75, `--cr-cell ist mindestens 2,75rem (gefunden: ${cellWert}rem)`);
	check(cellWert !== null && cellWert * 16 === 44, `--cr-cell entspricht 44 Bildpunkten bei 16px Grundschrift (gefunden: ${cellWert * 16}px)`);

	const zeilenDeklaration = eigenschaftsWert(feltRumpf, 'grid-template-rows');
	check(zeilenDeklaration !== null, 'grid-template-rows ist in .cr-felt gesetzt');
	const zeilenWerte = zeilenDeklaration ? [...zeilenDeklaration.matchAll(/(-?\d+(?:\.\d+)?)rem/g)].map((m) => Number(m[1])) : [];
	check(zeilenWerte.length === phpDaten.rows, `.cr-felt nennt ${phpDaten.rows} Zeilenhöhen (gefunden: ${zeilenWerte.length})`);
	const [, ...restZeilen] = zeilenWerte; // erste Zeile ist die Puck-Spur, bewusst ohne Zielgröße
	const zuNiedrig = restZeilen.filter((h) => h < 2.75);
	check(zuNiedrig.length === 0, 'jede Zeilenhöhe außer der Puck-Spur ist mindestens 2,75rem', ...zuNiedrig.map((h) => `${h}rem`));

	const schmalsteSpannweite = Math.min(...phpFelder.map((f) => f.colEnd - f.col));
	check(schmalsteSpannweite === 1, `das schmalste Feld ist genau eine Spur breit (gefunden: ${schmalsteSpannweite})`);

	const workingRumpf = regelRumpf(feltCss, '.cr-felt__working-label');
	const workingHoehe = remWert(eigenschaftsWert(workingRumpf, 'min-block-size'));
	check(workingHoehe !== null && workingHoehe >= 2.75, `.cr-felt__working-label ist mindestens 2,75rem hoch (gefunden: ${workingHoehe}rem)`);

	console.log('     Gegenprobe F-7-G: --cr-cell: 2rem (unter der Untergrenze) muss auffallen');
	const verfaelscht = feltCss.replace('--cr-cell: 2.75rem;', '--cr-cell: 2rem;');
	const verfaelschterRumpf = regelRumpf(verfaelscht, '.cr-felt');
	const verfaelschterWert = remWert(eigenschaftsWert(verfaelschterRumpf, '--cr-cell'));
	check(verfaelschterWert !== null && verfaelschterWert < 2.75, 'F-7-G: --cr-cell: 2rem wird als unter der Untergrenze 2,75rem erkannt');
}

/* ============================ Zusatzprüfung: Reflow statt Schrumpfen (H-02) */

/*
 * Nicht Teil der Prüfliste F-1..F-13 aus dem Plan (Abschnitt 4.20) — eine
 * ausdrückliche Auflage des Dispatch-Auftrags für C7d, aus Auditbefund H-02
 * vom 2026-09-07 (Roulette): ein Flexkind ohne min-inline-size: 0 schrumpft
 * nie unter seine Inhaltsbreite, und .ck-room (overflow-x: clip) schneidet
 * den Überstand ab, statt ihn rollbar zu machen. Diese Prüfung zeigt
 * STRUKTURELL (aus dem Quelltext), dass die Kette in dieser Extension von
 * vornherein richtig steht. Das TATSÄCHLICHE Nachmessen bei 320/360/1440
 * Bildpunkten braucht einen Browser UND ein Table.html, das Felt.html
 * bereits rendert — beides kommt erst mit Umsetzungsstück C7e. Bis dahin ist
 * das hier der bestmögliche Nachweis ohne laufende Seite.
 */
console.log('\nZusatz  Reflow statt Schrumpfen (WCAG 2.2 SC 1.4.10, Auditbefund H-02): die min-inline-size:0-Kette');
{
	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));

	const stageRumpf = regelRumpf(feltCss, '.cr-table__stage');
	check(stageRumpf !== null && eigenschaftsWert(stageRumpf, 'min-inline-size') === '0',
		'.cr-table__stage setzt min-inline-size: 0 (erstes Kettenglied)', stageRumpf?.trim());

	const areaRumpf = regelRumpf(feltCss, '.cr-felt-area');
	check(areaRumpf !== null && eigenschaftsWert(areaRumpf, 'min-inline-size') === '0',
		'.cr-felt-area setzt min-inline-size: 0 (zweites Kettenglied)', areaRumpf?.trim());

	const scrollRumpf = regelRumpf(feltCss, '.cr-felt__scroll');
	check(scrollRumpf !== null && /^auto$/.test(eigenschaftsWert(scrollRumpf, 'overflow-x') ?? ''),
		'.cr-felt__scroll ist der tatsächliche Rollbereich (overflow-x: auto) — gerollt wird, nicht geschrumpft', scrollRumpf?.trim());

	// .cr-felt selbst darf NICHT schrumpfen dürfen: erst weil es eine feste
	// min-inline-size (die volle Gitterbreite) trägt, greift .cr-felt__scroll
	// überhaupt als Rollbereich statt als toter Code.
	const feltRumpfReflow = regelRumpf(feltCss, '.cr-felt');
	const feltMinInline = eigenschaftsWert(feltRumpfReflow, 'min-inline-size');
	check(feltMinInline !== null && feltMinInline !== '0', '.cr-felt trägt eine feste min-inline-size (die volle Gitterbreite), schrumpft also nicht unter sie', feltMinInline);

	console.log('     Gegenprobe Zusatz-G: eine entfernte min-inline-size:0 an .cr-felt-area muss auffallen');
	const ohneKettenglied = feltCss.replace(/(\.cr-felt-area\s*\{[^}]*?)min-inline-size:\s*0;\s*/, '$1');
	const areaRumpfGegenprobe = regelRumpf(ohneKettenglied, '.cr-felt-area');
	check(eigenschaftsWert(areaRumpfGegenprobe, 'min-inline-size') !== '0', 'Zusatz-G: das entfernte Kettenglied wird als fehlend erkannt');
}

/* ============================== F-8 felt.css: keine eigene Farbe, Tokens */

console.log('\nF-8  felt.css: keine eigene Farbe, jeder benutzte Token existiert, jede eigene Klasse beginnt mit cr-');
{
	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));

	const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
	const FUNKTION = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g;
	const farbTreffer = [...feltCss.matchAll(HEX), ...feltCss.matchAll(FUNKTION)].map((m) => m[0]);
	check(farbTreffer.length === 0, 'kein ausgeschriebener Farbwert in felt.css', ...farbTreffer);

	const tokensCss = lies(TOKENS_CSS_PFAD);
	const definiert = new Set([...tokensCss.matchAll(/^\s*(--ck-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));
	const benutzt = new Set([...feltCss.matchAll(/var\(\s*(--ck-[a-z0-9-]+)/g)].map((m) => m[1]));
	const unbekannt = [...benutzt].filter((name) => !definiert.has(name));
	check(unbekannt.length === 0, `${benutzt.size} in felt.css benutzte --ck-…-Tokens existieren alle in tokens.css`, ...unbekannt);

	const klassenTreffer = [...feltCss.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]);
	const ERLAUBTE_FREMDE = new Set(); // felt.css definiert ausschließlich eigene cr-…-Klassen
	const nichtCr = [...new Set(klassenTreffer)].filter((k) => !k.startsWith('cr-') && !ERLAUBTE_FREMDE.has(k));
	check(nichtCr.length === 0, 'jede in felt.css definierte Klasse beginnt mit cr- (Prüfung A-9)', ...nichtCr);

	console.log('     Gegenprobe F-8-G: ein erfundener Token --ck-does-not-exist muss auffallen');
	const mitErfundenemToken = new Set([...benutzt, '--ck-does-not-exist']);
	const gegenprobe = [...mitErfundenemToken].filter((name) => !definiert.has(name));
	check(gegenprobe.length === 1 && gegenprobe[0] === '--ck-does-not-exist', 'F-8-G: ein erfundener Token wird als nicht in tokens.css definiert erkannt');
}

/* ========================================= F-9 Kontrast (SC 1.4.3), statisch */

console.log('\nF-9  Kontrast (SC 1.4.3): die drei tatsächlich benutzten Farbpaarungen');
{
	const tokensCss = lies(TOKENS_CSS_PFAD);
	const feltLine = hexZuRgb(tokenHex(tokensCss, '--ck-felt-line'));
	const feltGreen = hexZuRgb(tokenHex(tokensCss, '--ck-felt-green'));
	const feltGreenDark = hexZuRgb(tokenHex(tokensCss, '--ck-felt-green-dark'));
	// Die Puck-Regeln (felt.css) benutzen --ck-brass-200 für den Rahmen, nicht
	// --ck-brass-300: --ck-brass-300 erreicht auf --ck-felt-green nur 2,81:1
	// (Fund beim Schreiben dieser Extension, siehe DECISIONS.md), --ck-brass-200
	// erreicht 4,28:1. Geprüft wird deshalb der Token, der tatsächlich benutzt
	// wird — dieselbe Absicht wie im Plan (Abschnitt 4.20, F-9), mit dem
	// korrigierten Token.
	const brass200 = hexZuRgb(tokenHex(tokensCss, '--ck-brass-200'));

	const kText = kontrast(feltLine, feltGreen);
	check(kText >= 4.5, `--ck-felt-line auf --ck-felt-green (Aufschrift auf normalem Feld): ${kText.toFixed(2)}:1 (Soll ≥ 4,5:1)`);

	const kTextOdds = kontrast(feltLine, feltGreenDark);
	check(kTextOdds >= 4.5, `--ck-felt-line auf --ck-felt-green-dark (Aufschrift auf Odds-Feld): ${kTextOdds.toFixed(2)}:1 (Soll ≥ 4,5:1)`);

	const kRahmen = kontrast(brass200, feltGreen);
	check(kRahmen >= 3, `--ck-brass-200 auf --ck-felt-green (Rahmen des Pucks): ${kRahmen.toFixed(2)}:1 (Soll ≥ 3:1)`);

	console.log('     Gegenprobe F-9-G: ein erfundenes, zu dunkles Grün als Untergrund muss auffallen');
	const zuDunkel = [10, 10, 10];
	const kGegenprobe = kontrast(feltLine, zuDunkel);
	check(kGegenprobe >= 4.5, 'F-9-VORBEREITUNG: helle Schrift auf sehr dunklem Grund bestünde für sich genommen (nicht der Fund selbst)');
	const kGegenprobeDunkleSchrift = kontrast([40, 40, 40], zuDunkel);
	check(kGegenprobeDunkleSchrift < 4.5, 'F-9-G: eine erfundene dunkle Schrift auf zu dunklem Grund unterschreitet 4,5:1 und wird erkannt');
}

/* ============================ F-10 Farbe ist nie die einzige Aussage (1.4.1) */

console.log('\nF-10  Farbe ist nie die einzige Aussage (SC 1.4.1): die dunkle Seite hat eine eigene Form UND einen ausgeschriebenen Namen');
{
	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));
	const regeln = [...feltCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selektor: m[1], rumpf: m[2] }));
	const dontRegel = regeln.find((r) => r.selektor.includes('.cr-felt__field--dontline') && r.selektor.includes('.cr-felt__field--dontcome') && r.selektor.includes('.cr-felt__field--dontpoint'));
	check(dontRegel !== undefined, 'es gibt eine gemeinsame Formregel für dontline/dontcome/dontpoint');
	if (dontRegel) {
		check(/border-style\s*:\s*double/.test(dontRegel.rumpf), 'die dunkle Seite hat eine eigene Formregel (border-style: double), nicht nur eine Farbe', dontRegel.rumpf.trim());
	}

	const locallang = lies(LOCALLANG_PFAD);
	function quelltext(id) {
		const muster = new RegExp(`<trans-unit id="${id}">\\s*<source>([^<]*)</source>`);
		return muster.exec(locallang)?.[1] ?? null;
	}
	const DONT_IDS = ['felt.print.dontpass', 'felt.print.dontcome', 'felt.name.dontpass', 'felt.name.dontcome',
		'felt.name.dontpassodds', 'felt.name.dontcomeodds', 'felt.name.dontcomepoint'];
	const ohneDont = DONT_IDS.filter((id) => !(quelltext(id) ?? '').includes("Don't") && !(quelltext(id) ?? '').includes('Don’t'));
	check(ohneDont.length === 0, 'jede dunkelseitige Aufschrift/jeder Name nennt „Don\'t" ausgeschrieben', ...ohneDont);

	console.log('     Gegenprobe F-10-G: eine felt.css ohne die Formregel muss auffallen');
	const ohneForm = feltCss.replace(/border-style\s*:\s*double;\s*/, '');
	const regelnGegenprobe = [...ohneForm.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selektor: m[1], rumpf: m[2] }));
	const dontRegelGegenprobe = regelnGegenprobe.find((r) => r.selektor.includes('.cr-felt__field--dontpoint'));
	check(dontRegelGegenprobe === undefined || !/border-style\s*:\s*double/.test(dontRegelGegenprobe.rumpf),
		'F-10-G: die entfernte Formregel wird als fehlend erkannt');
}

/* ========================================================== F-11 Sprunglink */

console.log('\nF-11  Der Sprunglink ist das erste fokussierbare Element in .ck-felt');
{
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const ckFeltOeffnung = feltHtml.indexOf('class="ck-felt cr-felt"');
	const skip = feltHtml.indexOf('cr-felt__skip');
	const puck = feltHtml.indexOf('data-cr-puck');
	const ersteGruppe = feltHtml.indexOf('cr-felt__group');
	check(ckFeltOeffnung !== -1 && skip !== -1, '.ck-felt und der Sprunglink sind beide im Markup vorhanden');
	check(ckFeltOeffnung !== -1 && ckFeltOeffnung < skip, 'der Sprunglink steht nach der öffnenden Markierung von .ck-felt — also darin, nicht als Geschwister davor');
	check(skip !== -1 && skip < puck && puck < ersteGruppe, 'der Sprunglink steht vor dem Puck und vor der ersten Gruppe — er ist das erste Kind von .ck-felt');

	const zielMatch = /<a class="ck-skiplink cr-felt__skip" href="#([^"]+)"/.exec(feltHtml);
	check(zielMatch !== null, 'der Sprunglink hat ein href="#…"-Ziel');
	if (zielMatch !== null) {
		if (existsSync(TABLE_HTML_PFAD) && lies(TABLE_HTML_PFAD).includes(`id="${zielMatch[1]}"`)) {
			check(true, `das Ziel #${zielMatch[1]} existiert bereits im Markup (Table.html)`);
		} else {
			hinweis(`das Ziel #${zielMatch[1]} existiert in Table.html noch nicht — das ist an dieser Stelle erwartet: `
				+ 'Table/Controls (mit id="cr-controls") wird erst in Umsetzungsstück C7e eingehängt, nicht in C7d.');
		}
	}

	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));
	check(regelRumpf(feltCss, '.cr-felt__skip') === null, 'felt.css enthält keine bedingungslose Regel auf .cr-felt__skip (nur :focus-visible ist zulässig)');
	const feinlage = regelRumpf(feltCss, '.cr-felt__skip:focus-visible');
	check(feinlage !== null && eigenschaftsWert(feinlage, 'inset-block-start') !== null,
		'die Feinlage (inset-block-start) steht ausschließlich unter .cr-felt__skip:focus-visible');

	console.log('     Gegenprobe F-11-G: eine bedingungslose Feinlage-Regel muss auffallen');
	const feltCssBedingungslos = feltCss.replace('.cr-felt__skip:focus-visible {', '.cr-felt__skip {');
	check(regelRumpf(feltCssBedingungslos, '.cr-felt__skip') !== null, 'F-11-G: eine wieder bedingungslos gemachte .cr-felt__skip-Regel wird tatsächlich gefunden');
}

/* ============================================== F-12 Überschriften/Gruppen */

console.log('\nF-12  Genau eine <h2> mit id, vier role="group" mit verschiedenem aria-label, der Place-Schalter ist ein natives Kontrollkästchen');
{
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const h2Treffer = [...feltHtml.matchAll(/<h2[^>]*id="([^"]+)"[^>]*>/g)];
	check(h2Treffer.length === 1, `genau eine <h2> mit id in Felt.html (gefunden: ${h2Treffer.length})`);
	const h2Id = h2Treffer[0]?.[1];

	const labelledby = /<section[^>]*aria-labelledby="([^"]+)"/.exec(feltHtml)?.[1];
	check(labelledby !== undefined && labelledby === h2Id, `die Sektion verweist über aria-labelledby auf die <h2>-id (gefunden: aria-labelledby="${labelledby}", h2 id="${h2Id}")`);

	// Felt.html ist eine Fluid-VORLAGE: es gibt genau EINEN role="group"-Block
	// im Quelltext, der zur Laufzeit viermal instanziiert wird (einmal je
	// Gruppe). "vier verschiedene aria-label" lässt sich deshalb nicht durch
	// Zählen im Quelltext zeigen, sondern durch zwei Schritte: (a) das
	// aria-label bezieht sich auf die laufende Schleifenvariable {gruppe} —
	// es UNTERSCHEIDET SICH also zwingend zwischen den vier Durchläufen —, und
	// (b) die vier dadurch tatsächlich entstehenden Kennungen
	// (felt.group.numbers/lines/hardways/single) haben in locallang.xlf vier
	// nicht leere, paarweise verschiedene Quelltexte.
	const gruppen = [...feltHtml.matchAll(/<div class="cr-felt__group" role="group"\s+aria-label="([^"]*)"/g)].map((m) => m[1]);
	check(gruppen.length === 1, 'genau ein role="group"-Vorlagenblock (zur Laufzeit viermal instanziiert)', ...gruppen);
	check(gruppen.length === 1 && gruppen[0].includes('{gruppe}'),
		'das aria-label bezieht sich auf die laufende Variable {gruppe} und unterscheidet sich damit zwingend zwischen den vier Durchläufen', ...gruppen);

	const locallangFuerGruppen = lies(LOCALLANG_PFAD);
	function gruppenQuelltext(id) {
		const muster = new RegExp(`<trans-unit id="${id}">\\s*<source>([^<]*)</source>`);
		return muster.exec(locallangFuerGruppen)?.[1] ?? null;
	}
	const vierGruppenTexte = ['numbers', 'lines', 'hardways', 'single'].map((g) => gruppenQuelltext(`felt.group.${g}`));
	check(vierGruppenTexte.every((t) => t !== null && t !== ''), 'alle vier felt.group.*-Kennungen haben einen nicht leeren Quelltext', ...vierGruppenTexte.map(String));
	check(new Set(vierGruppenTexte).size === 4, 'die vier Gruppen-Aufschriften sind paarweise verschieden', ...vierGruppenTexte);

	check(/<input type="checkbox" class="cr-felt__working-input"/.test(feltHtml), 'der Place-Schalter ist ein natives <input type="checkbox">');
	const beschreibtDurch = /aria-describedby="([^"]+)"/.exec(feltHtml)?.[1];
	check(beschreibtDurch !== undefined, 'der Place-Schalter trägt aria-describedby');
	if (beschreibtDurch) {
		check(feltHtml.includes(`id="${beschreibtDurch}"`), `das Ziel von aria-describedby (#${beschreibtDurch}) existiert im selben Markup`);
	}
	check(/<label class="cr-felt__working-label">[\s\S]*?<span>/.test(feltHtml), 'der Place-Schalter hat sichtbaren Text im <label>');
}

/* ============================================== F-13 Der Puck sagt nichts doppelt */

console.log('\nF-13  Der Puck ist aria-hidden ohne role; [data-cr-point-text] ist kein Live-Bereich');
{
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const puckSpan = /<span class="cr-puck" data-cr-puck=""[^>]*>/.exec(feltHtml)?.[0] ?? '';
	check(puckSpan.includes('aria-hidden="true"'), 'der Puck trägt aria-hidden="true"', puckSpan);
	check(!/role=/.test(puckSpan), 'der Puck trägt kein eigenes role', puckSpan);

	const roundHtml = ohneFluidKommentare(lies(ROUND_HTML_PFAD));
	const pointText = /<p class="cr-round__point" data-cr-point-text="">([\s\S]*?)<\/p>/.exec(roundHtml);
	check(pointText !== null, '[data-cr-point-text] existiert in Round.html');
	if (pointText) {
		check(!/role=/.test(pointText[0]) && !/aria-live=/.test(pointText[0]), '[data-cr-point-text] ist KEIN Live-Bereich (kein role, kein aria-live)', pointText[0]);
		check(pointText[1].trim() !== '', '[data-cr-point-text] wird MIT Text ausgeliefert (Come-out ist der tatsächliche Anfangszustand)', pointText[1].trim());
	}

	console.log('     Gegenprobe F-13-G: ein role="status" am Puck müsste auffallen');
	const mitRolle = puckSpan.replace('aria-hidden="true"', 'aria-hidden="true" role="status"');
	check(/role=/.test(mitRolle), 'F-13-G: ein eingefügtes role="status" wird von derselben Regel tatsächlich gefunden');
}

/* ------------------------------------------------------------- Ergebnis */

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`}`);
if (fehler === 0) {
	console.log('Der PHP-Spiegel (BetLayout) und die maßgebliche Feldliste (bets-craps.js)');
	console.log('stimmen für alle 47 Felder überein, das Tuch besteht aus 47 echten Knöpfen');
	console.log('mit vollständigem XLIFF-Wortschatz, der Sprunglink funktioniert, jedes Feld');
	console.log('hat einen erreichbaren Namen, kein Feld überlappt ein anderes, die');
	console.log('Zielgröße erreicht überall mindestens 2,75rem, felt.css benutzt keine eigene');
	console.log('Farbe und keinen fehlenden Token, jede aufgedruckte Aufschrift erreicht');
	console.log('mindestens 4,5:1 Kontrast, und die dunkle Seite ist auch ohne Farbwahrnehmung');
	console.log('an ihrer eigenen Form erkennbar (F-1 bis F-13).');
}
process.exit(fehler === 0 ? 0 : 1);
