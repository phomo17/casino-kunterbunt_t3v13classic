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
 * WAS HIER BEWIESEN WIRD (seit dem Umbau nach der Bildvorlage, 2026-09-08:
 * Umsetzungsstücke Ua/Ub)
 * ---------------------------------------------
 *   F-1   BetLayout::fields() (PHP) und bets-craps.js (JavaScript) stimmen
 *         für alle 48 Felder überein: max, das Odds-Kennzeichen
 *         (odds ⟷ countsToRoundMax === false), payoutText ⟷ ratioFor()
 *         (Ausnahme: die zwei Linien-Odds, deren Text „3-4-5×" lautet) und
 *         unit ⟷ stakeUnit(). ROUND_MAX stimmt in beiden (300).
 *   F-2   Felt.html hat genau eine Knopf-Vorlage, genau vier
 *         Gruppen-Durchläufe (numbers/lines/hardways/single) und jede
 *         wirkliche Feldgruppe gehört zu einer dieser vier — daraus folgt,
 *         dass jedes der 48 Felder genau einen Knopf bekommt.
 *   F-3   die Knopf-Vorlage ist ein echtes <button type="button">, kein
 *         <div role="button">, trägt data-ck-field.
 *   F-4   jedes Feld trägt aria-label UND data-ck-field-label mit demselben
 *         Ausdruck; alle 48 aufgelösten Namen sind paarweise verschieden;
 *         kein {0}/%1$s bleibt unaufgelöst stehen.
 *   F-5   (umgebaut, Ub) seit dem Umbau gibt es KEINE felt.print.*- und
 *         keine felt.puck.*-Kennung mehr (die Aufschrift steht in
 *         BetLayout.php); jede benutzte XLIFF-Kennung existiert; keine neu
 *         angelegte Kennung ist unbenutzt; serverseitig aufgelöste
 *         Kennungen benutzen %1$s, von JavaScript ersetzte {0}.
 *   F-6   (umgebaut, Ub) die Maßordnung nach der Bildvorlage: alle 48 Felder
 *         UND die zwei Schenkel liegen innerhalb von 96×11, keine zwei
 *         überlappen, Zeile 1 ist frei, die sieben Puck-Regeln stimmen mit
 *         BetLayout::puckLanes() überein, kein Feld der rechten Sektion
 *         beginnt links von Spur 58, kein Feld der Mittensektion liegt
 *         außerhalb 40…58, POINTS und POINTS_ON_CLOTH führen dieselben
 *         sechs Zahlen.
 *   F-7   (umgebaut, Ub) Zielgröße (SC 2.5.8): JEDES der 48 Felder UND beide
 *         Schenkel messen bei der kleinsten Tischbreite mindestens
 *         24 × 24 Bildpunkte, gerechnet aus Spurzahl/--cr-track und
 *         fr-Anteil/ROW_FRACTIONS — nicht mehr an einer Spurbreite
 *         abgelesen. Zusätzlich (seit Ue wiederhergestellt): der
 *         Place-Wetten-Schalter .cr-felt__working-label bleibt bei seinen
 *         eigenen 2,75 rem.
 *   F-8   felt.css: kein eigener Farbwert, jeder benutzte Token existiert,
 *         jede eigene Klasse beginnt mit cr-.
 *   F-9   Kontrast (SC 1.4.3) der tatsächlich benutzten Paarungen,
 *         einschließlich der drei neuen (Gelb, Haarlinie, Rot).
 *   F-10  (umgebaut, Ub) Form statt nur Farbe (SC 1.4.1): die dunkle Seite
 *         hat eine eigene Formregel, ihre Aufschrift (in der Feldliste, seit
 *         Ub nicht mehr in locallang.xlf) nennt „Don't" ausgeschrieben.
 *   F-11  der Sprunglink ist das erste fokussierbare Element in .ck-felt,
 *         seine Feinlage steht nur unter :focus-visible.
 *   F-12  genau ein <h2> mit id, vier role="group" mit vier verschiedenen
 *         aria-label, der Place-Schalter ist ein natives Kontrollkästchen.
 *   F-13  (erweitert, Ub) der Puck sagt nichts doppelt an: aria-hidden ohne
 *         role, [data-cr-point-text] ist kein Live-Bereich; der Puck trägt
 *         lang="en" für seine englische Aufschrift OFF/ON.
 *   F-14  (erweitert, Ub) der Spiegel der linken Seitensektion ist
 *         vollständig und rechnerisch richtig: mirrorCol/mirrorColEnd
 *         stimmen für alle 38 gespiegelten Felder, die Mittensektion bleibt
 *         ungespiegelt; es gibt genau EINE <f:section name="Aufdruck"> und
 *         genau ZWEI <f:render section="Aufdruck">.
 *   F-15  (umgebaut, Ub) der englische Aufdruck („N FOR 1") ist unsere
 *         Auszahlung aus Anhang H, GERECHNET über BetLayout::forOne() und
 *         gegen ratioFor() gehalten; genau die zehn Felder der Mittensektion
 *         tragen einen Zahlenaufdruck; die zwei Kreise des FIELD stimmen mit
 *         ihren Quoten.
 *   F-16  der Spiegel ist keine Falle: aria-hidden, kein <button>, kein <a>,
 *         kein tabindex, kein data-ck-field, pointer-events: none.
 *   F-17  (neu, Ub) die zwei Schenkel der L-förmigen Linienwetten liegen
 *         genau dort, wo BetLayout::legLanes() sie hinlegt; der Fokusrahmen
 *         umfasst Band und Schenkel gemeinsam, ohne opacity/clip-path/mask/
 *         overflow: hidden.
 *   F-18  (neu, Ub; scharf seit Uc) die drei geschwungenen Linien der
 *         Vorlage (BetLayout::bandPaths()) treffen genau die Gitterkanten;
 *         Cloth.html rendert sie seit Uc aus {felt.bandPaths}.
 *   F-19  (neu, Ub) die Ecke, in der ein anderes Haus BIG 6 / BIG 8 druckt,
 *         bleibt leer.
 *   F-20  (neu, Ub) die gedruckten Würfelbilder (BetLayout::PIPS) zeigen die
 *         Zahl ihres Feldes; Hardways und die zwei Bar-Felder zeigen einen
 *         Pasch.
 *   F-21  (neu, Ub) genau place-6 und place-9 stehen schräg (SIX/NINE).
 *   F-22  (neu, Ub) jede englische Aufschrift trägt lang="en"; reine Ziffern
 *         tragen keines (WCAG 2.2 SC 3.1.2).
 *   F-23  (neu, Ub) Label in Name (SC 2.5.3): jeder Name enthält die
 *         sichtbare englische Aufschrift, und wo eine Zahl gedruckt ist,
 *         beide Zählweisen.
 *   F-24  (neu, Ub) jede Aufschrift steht wörtlich in einer unabhängigen
 *         Abschrift der Vorlage; kein deutsches Wort/kein Umlaut gerät auf
 *         das Tuch; keine Aufschrift läuft mehr durch f:translate.
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
const CLOTH_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Craps/Cloth.html');
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
	check(phpFelder.length === 48, `PHP liefert 48 Felder (gefunden: ${phpFelder.length})`);
	check(FIELDS.length === 48, `JavaScript liefert 48 Felder (gefunden: ${FIELDS.length})`);
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
		'alle 48 Felder stimmen in max, odds-Kennzeichen, payoutText und unit überein',
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

	/*
	 * Seit Umsetzungsstück Tc gibt es EIN weiteres <f:for each="{felt.fields}">
	 * im Markup: der gespiegelte, nicht bedienbare Block VOR der Gruppen-
	 * schleife (.cr-felt__mirror). Er trägt <span>, kein <button>, und darf
	 * hier nicht als fünfter Gruppendurchlauf oder als zweite Feldschleife
	 * INNERHALB der Gruppenschleife mitgezählt werden — deshalb wird ab hier
	 * ausschließlich im Text NACH dem Beginn der äußeren Schleife gesucht.
	 */
	const aeussereIdxVorab = feltHtml.indexOf(aeussereSchleife?.[0] ?? '\0');
	const nachAeusserer = aeussereIdxVorab === -1 ? '' : feltHtml.slice(aeussereIdxVorab);
	const innereSchleifen = (nachAeusserer.match(/<f:for each="\{felt\.fields\}" as="field">/g) ?? []).length;
	check(innereSchleifen === 1, `genau eine <f:for each="{felt.fields}"> innerhalb der Gruppenschleife (gefunden: ${innereSchleifen})`);

	const aeussereIdx = aeussereIdxVorab;
	const innereIdx = feltHtml.indexOf('<f:for each="{felt.fields}" as="field">', aeussereIdx === -1 ? 0 : aeussereIdx);
	const letzterSchleifenschluss = feltHtml.lastIndexOf('</f:for>');
	check(aeussereIdx !== -1 && innereIdx > aeussereIdx && innereIdx < letzterSchleifenschluss,
		'die Feldschleife liegt innerhalb der Gruppenschleife (verschachtelt), nicht daneben');

	const gesamtSchleifen = (feltHtml.match(/<f:for each="\{felt\.fields\}" as="field">/g) ?? []).length;
	check(gesamtSchleifen === 2, `genau eine weitere <f:for each="{felt.fields}"> VOR der Gruppenschleife, für den gespiegelten Block (gefunden insgesamt: ${gesamtSchleifen})`);

	const knopfVorlagen = (feltHtml.match(/data-ck-field="\{field\.id\}"/g) ?? []).length;
	check(knopfVorlagen === 1, `genau eine Knopf-Vorlage, zur Laufzeit 4 × 48-mal instanziiert (gefunden: ${knopfVorlagen})`);

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

console.log('\nF-4  Jedes Feld trägt aria-label/data-ck-field-label; alle 48 Namen sind paarweise verschieden');
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

console.log('\nF-5  Jede benutzte Kennung existiert; keine neu angelegte Kennung ist unbenutzt; keine felt.print.*/felt.puck.*-Kennung ist übriggeblieben');
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
	//    SEIT DEM UMBAU (2026-09-08) gibt es KEINE "printed"-Kennungen mehr —
	//    die Aufschrift ist Klartext in BetLayout.php (field.print), kein
	//    XLIFF-Bezeichner. Ein Sammeltopf dafür entfällt hier ersatzlos.
	const dynamischeSchluessel = new Set(phpFelder.map((f) => f.labelKey.split(':').pop()));
	// 4. PHP-seitig über Craps::LANG_FRONTEND . '...' zusammengesetzte Schlüssel.
	const localconfPhp = existsSync(EXT_LOCALCONF_PFAD) ? lies(EXT_LOCALCONF_PFAD) : '';
	const phpSchluessel = new Set(
		[...localconfPhp.matchAll(/Craps::LANG_FRONTEND\s*\.\s*'([a-zA-Z0-9._-]+)'/g)].map((m) => m[1])
	);

	const benutzt = new Set([...statischeSchluessel, ...gruppenSchluessel, ...dynamischeSchluessel, ...phpSchluessel]);

	const fehlend = [...benutzt].filter((id) => !definierteIds.has(id));
	check(fehlend.length === 0, 'jede benutzte Kennung existiert in locallang.xlf', ...fehlend);

	// Die Liste der in DIESEM Umsetzungsstück neu angelegten Kennungen — jede
	// muss tatsächlich benutzt werden (Karteileichen-Probe, auf den neuen
	// Bestand beschränkt; automat.*/throw.* aus früheren Stücken bleiben
	// unangetastet und werden hier nicht erneut geprüft).
	const NEU_ANGELEGT = [
		'felt.label', 'felt.skip', 'felt.group.numbers', 'felt.group.lines', 'felt.group.hardways', 'felt.group.single',
		'felt.point.none', 'felt.point.set', 'felt.fieldname', 'felt.fieldname.empty',
		'felt.mirror.label', 'felt.mirror.hint',
		'felt.name.pass', 'felt.name.dontpass', 'felt.name.come', 'felt.name.dontcome', 'felt.name.passodds', 'felt.name.dontpassodds',
		'felt.name.comepoint', 'felt.name.dontcomepoint', 'felt.name.comeodds', 'felt.name.dontcomeodds', 'felt.name.place', 'felt.name.place.word',
		'felt.name.field', 'felt.name.hard', 'felt.name.seven', 'felt.name.craps', 'felt.name.two', 'felt.name.three', 'felt.name.eleven',
		'felt.name.twelve', 'felt.name.crapseleven',
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

	// SEIT DEM UMBAU NACH DER BILDVORLAGE (2026-09-08): die Aufschrift des
	// Tuchs ist englisch und steht als Klartext in BetLayout.php, nicht mehr
	// in dieser Datei. Es darf deshalb KEINE felt.print.*-Kennung mehr geben —
	// und auch keine felt.puck.*-Kennung, denn "OFF" und "ON" sind ebenfalls
	// Tuch-Beschriftung. Bliebe eine stehen, wäre sie eine Karteileiche, die
	// niemand mehr benutzt und die beim nächsten Lesen für eine gültige
	// Quelle gehalten würde.
	const uebriggeblieben = [...definierteIds].filter(
		(id) => id.startsWith('felt.print.') || id.startsWith('felt.puck.')
	);
	check(uebriggeblieben.length === 0,
		'keine felt.print.*- und keine felt.puck.*-Kennung ist übriggeblieben (die Aufschrift steht seit dem Umbau in BetLayout.php)',
		...uebriggeblieben);

	console.log('     Gegenprobe F-5-G2: eine wieder eingefügte felt.print.*-Kennung muss auffallen');
	const mitAltlast = new Set([...definierteIds, 'felt.print.pass']);
	check([...mitAltlast].some((id) => id.startsWith('felt.print.')),
		'F-5-G2: eine wieder eingefügte felt.print.pass wird von derselben Regel gefunden');

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

console.log('\nF-6  Alle 48 Felder liegen im Gitter, keine zwei überlappen (Schenkel eingerechnet), Zeile 1 ist frei, der Puck stimmt');
{
	check(phpDaten.columns === 96 && phpDaten.rows === 11, `Gitter ist 96×11 (gefunden: ${phpDaten.columns}×${phpDaten.rows})`);
	check(phpDaten.rowFractions.length === phpDaten.rows,
		`ROW_FRACTIONS hat so viele Werte wie es Zeilen gibt (${phpDaten.rowFractions.length} zu ${phpDaten.rows})`);

	/*
	 * DIE SCHENKEL GEHÖREN ZUR FLÄCHE IHRES FELDES.
	 * Ein Schenkel ist kein eigenes Feld, aber er belegt Platz im Gitter — und
	 * genau deshalb muss er in die Überlappungsprobe hinein. Ohne ihn könnte
	 * ein späteres Feld unbemerkt unter der PASS LINE liegen.
	 */
	const rechtecke = [];
	for (const f of phpFelder) {
		rechtecke.push({ id: f.id, col: f.col, colEnd: f.colEnd, row: f.row, rowEnd: f.rowEnd });
	}
	for (const [id, lane] of Object.entries(phpDaten.legLanes)) {
		rechtecke.push({ id: `${id} (Schenkel)`, ...lane });
	}

	const ausserhalb = rechtecke.filter((r) =>
		r.col < 1 || r.colEnd > phpDaten.columns + 1 || r.row < 1 || r.rowEnd > phpDaten.rows + 1
		|| r.colEnd <= r.col || r.rowEnd <= r.row
	);
	check(ausserhalb.length === 0, `alle ${rechtecke.length} Flächen liegen innerhalb von 96 Spalten und 11 Zeilen, mit positiver Ausdehnung`, ...ausserhalb.map((r) => r.id));

	function ueberlappt(a, b) {
		return a.col < b.colEnd && b.col < a.colEnd && a.row < b.rowEnd && b.row < a.rowEnd;
	}
	const paare = [];
	for (let i = 0; i < rechtecke.length; i += 1) {
		for (let j = i + 1; j < rechtecke.length; j += 1) {
			if (ueberlappt(rechtecke[i], rechtecke[j])) {
				paare.push(`${rechtecke[i].id} × ${rechtecke[j].id}`);
			}
		}
	}
	check(paare.length === 0, `keine zwei der ${rechtecke.length} Flächen überlappen`, ...paare);

	const inZeile1 = phpFelder.filter((f) => f.row < 2 && f.rowEnd > 1);
	check(inZeile1.length === 0, 'Zeile 1 (Puck-Spur) ist frei von Feldern', ...inZeile1.map((f) => f.id));

	// Die drei Sektionsgrenzen.
	const rechteZuWeitLinks = phpFelder.filter((f) => f.mirrorCol > 0 && f.col < phpDaten.rightCol);
	check(rechteZuWeitLinks.length === 0, `kein Feld der rechten Sektion beginnt links von Spur ${phpDaten.rightCol}`, ...rechteZuWeitLinks.map((f) => f.id));
	const mitteAusserhalb = phpFelder.filter((f) => f.mirrorCol === 0 && (f.col < phpDaten.centerCol || f.colEnd > phpDaten.rightCol));
	check(mitteAusserhalb.length === 0, `kein Feld der Mittensektion liegt außerhalb ${phpDaten.centerCol}…${phpDaten.rightCol}`, ...mitteAusserhalb.map((f) => f.id));

	// ZWEI LISTEN, ZWEI BEDEUTUNGEN, EINE MENGE. POINTS ist die Reihenfolge
	// der REGELN (Anhang H), POINTS_ON_CLOTH die Reihenfolge des TUCHS. Sie
	// dürfen verschieden sortiert sein — aber niemals verschiedene Zahlen
	// enthalten.
	const ausRegeln = [...phpDaten.points].sort((a, b) => a - b).join(',');
	const ausTuch = [...phpDaten.pointsOnCloth].sort((a, b) => a - b).join(',');
	check(ausRegeln === ausTuch, `POINTS und POINTS_ON_CLOTH enthalten dieselben sechs Zahlen (Regeln: ${ausRegeln}, Tuch: ${ausTuch})`);

	console.log('     Gegenprobe F-6-G: eine um eine Spalte verschobene place-6 erzeugt eine Überlappung');
	const verschoben = rechtecke.map((r) => (r.id === 'place-6' ? { ...r, col: r.col + 1, colEnd: r.colEnd + 1 } : r));
	const paareGegenprobe = [];
	for (let i = 0; i < verschoben.length; i += 1) {
		for (let j = i + 1; j < verschoben.length; j += 1) {
			if (ueberlappt(verschoben[i], verschoben[j])) paareGegenprobe.push(`${verschoben[i].id} × ${verschoben[j].id}`);
		}
	}
	check(paareGegenprobe.length > 0, 'F-6-G: die verschobene Kopie erzeugt mindestens eine Überlappung und wird erkannt');

	console.log('     Gegenprobe F-6-G2: ein Feld unter dem Pass-Schenkel muss auffallen');
	const mitEindringling = [...rechtecke, { id: 'erfunden', col: 94, colEnd: 96, row: 4, rowEnd: 6 }];
	const paareG2 = [];
	for (let i = 0; i < mitEindringling.length; i += 1) {
		for (let j = i + 1; j < mitEindringling.length; j += 1) {
			if (ueberlappt(mitEindringling[i], mitEindringling[j])) paareG2.push(`${mitEindringling[i].id} × ${mitEindringling[j].id}`);
		}
	}
	check(paareG2.some((p) => p.includes('erfunden')), 'F-6-G2: ein erfundenes Feld unter dem Pass-Schenkel wird als Überlappung erkannt');

	// Die sieben Puck-Regeln gegen BetLayout::puckLanes() — unverändert in der
	// Bauart, nur mit den neuen Spuren.
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

console.log('\nF-7  Zielgröße (SC 2.5.8): JEDES der 48 Felder misst bei der kleinsten Tischbreite mindestens 24 × 24 Bildpunkte');
{
	/*
	 * WARUM DIESE PRÜFUNG SEIT DEM UMBAU ANDERS AUSSIEHT.
	 *
	 * Vorher war die Spurbreite selbst die Zusage: eine Spur war 28
	 * Bildpunkte, das schmalste Feld eine Spur breit, fertig. Nach der
	 * Bildvorlage geht das nicht mehr — sie zeigt sehr verschiedene Breiten
	 * (Zahlenkasten, Don't-Come-Kasten, zwei Schenkel wie 4 : 5 : 4 : 3), und
	 * die lassen sich nur mit einer feineren Spur abbilden. Eine Spur ist
	 * jetzt 12 Bildpunkte, das schmalste FELD aber drei Spuren.
	 *
	 * Also wird gerechnet statt behauptet:
	 *   Breite  = (colEnd − col) × Spurbreite + (colEnd − col − 1) × Spalt
	 *   Höhe    = fr-Anteil der Zeile / Summe aller fr × Höhe der Spielfläche
	 * Die Höhe der Spielfläche folgt aus der Mindestbreite und dem festen
	 * Seitenverhältnis der Wanne: die Spielfläche ist 200 × 100 Einheiten,
	 * also genau halb so hoch wie breit.
	 *
	 * Das ist ein SCHÄRFERER Nachweis als vorher, weil er das tatsächliche
	 * Maß jedes Feldes liefert und nicht eine Absicht wiederholt.
	 */
	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));
	const clothRumpf = regelRumpf(feltCss, '.cr-cloth');
	const feltRumpf = regelRumpf(feltCss, '.cr-felt');

	function remInPx(deklaration) {
		if (deklaration === null) return null;
		const treffer = /(-?\d+(?:\.\d+)?)rem/.exec(deklaration);
		return treffer ? Number(treffer[1]) * 16 : null;
	}

	const spur = remInPx(eigenschaftsWert(clothRumpf, '--cr-track'));
	const spalt = remInPx(eigenschaftsWert(clothRumpf, '--cr-gap'));
	check(spur !== null, `--cr-track ist auf .cr-cloth gesetzt (gefunden: ${spur} px)`);
	check(spalt !== null, `--cr-gap ist auf .cr-cloth gesetzt (gefunden: ${spalt} px)`);
	check(eigenschaftsWert(feltRumpf, '--cr-track') === null,
		'.cr-felt deklariert --cr-track nicht erneut (die Deklaration steht ausschließlich auf .cr-cloth)');

	// Die elf fr-Werte in felt.css müssen Zahl für Zahl mit ROW_FRACTIONS aus
	// BetLayout übereinstimmen. Zwei Listen, eine Wahrheit — und wenn nicht,
	// fällt es hier auf statt im Bild.
	const zeilenDeklaration = eigenschaftsWert(feltRumpf, 'grid-template-rows');
	const ausCss = (zeilenDeklaration ?? '').match(/(\d+(?:\.\d+)?)fr/g)?.map((s) => Number(s.replace('fr', ''))) ?? [];
	const ausPhp = phpDaten.rowFractions;
	check(ausCss.length === ausPhp.length && ausCss.every((v, i) => Math.abs(v - ausPhp[i]) < 1e-9),
		`grid-template-rows in felt.css stimmt Zahl für Zahl mit BetLayout::ROW_FRACTIONS überein (CSS: ${ausCss.join(' ')} — PHP: ${ausPhp.join(' ')})`);

	const gesamtFr = ausPhp.reduce((a, b) => a + b, 0);
	const gitterBreite = phpDaten.columns * spur + (phpDaten.columns - 1) * spalt;
	const gitterHoehe = gitterBreite / 2;   // die Spielfläche ist 200 × 100
	const nutzHoehe = gitterHoehe - (phpDaten.rows - 1) * spalt;

	function breiteVon(r) { const n = r.colEnd - r.col; return n * spur + (n - 1) * spalt; }
	function hoeheVon(r) {
		const anteil = ausPhp.slice(r.row - 1, r.rowEnd - 1).reduce((a, b) => a + b, 0);
		const fugen = (r.rowEnd - r.row - 1) * spalt;
		return (anteil / gesamtFr) * nutzHoehe + fugen;
	}

	const ZIEL = 24;
	const zuKlein = [];
	for (const f of phpFelder) {
		const b = breiteVon(f);
		const h = hoeheVon(f);
		if (b < ZIEL || h < ZIEL) {
			zuKlein.push(`${f.id}: ${b.toFixed(1)} × ${h.toFixed(1)} px`);
		}
	}
	check(zuKlein.length === 0,
		`alle 48 Felder erreichen bei der kleinsten Tischbreite (Gitter ${gitterBreite.toFixed(0)} × ${gitterHoehe.toFixed(0)} px) mindestens 24 × 24 Bildpunkte`,
		...zuKlein);

	// Auch die zwei Schenkel sind Bedienfläche und müssen die Zielgröße halten.
	const schenkelZuKlein = [];
	for (const [id, lane] of Object.entries(phpDaten.legLanes)) {
		const b = breiteVon(lane);
		const h = hoeheVon(lane);
		if (b < ZIEL || h < ZIEL) schenkelZuKlein.push(`${id} (Schenkel): ${b.toFixed(1)} × ${h.toFixed(1)} px`);
	}
	check(schenkelZuKlein.length === 0, 'beide Schenkel erreichen ebenfalls mindestens 24 × 24 Bildpunkte', ...schenkelZuKlein);

	// Und die Mindestgröße aus dem geteilten Baustein darf hier NICHT gelten:
	// 44 Bildpunkte auf einem 36 Bildpunkte breiten Feld zwängen es über seine
	// Spuren hinaus. felt.css nimmt sie ausdrücklich zurück.
	const feldRumpf = regelRumpf(feltCss, '.cr-felt__field');
	check(/min-inline-size:\s*0/.test(feltCss) && /min-block-size:\s*0/.test(feltCss),
		'felt.css nimmt min-inline-size/min-block-size aus table.css für .cr-felt__field zurück — die Zielgröße kommt aus dem Gitter, nicht aus einer festen Zahl',
		feldRumpf?.trim());

	// DER PLACE-WETTEN-SCHALTER LIEGT AUSSERHALB DES GITTERS. Anders als die
	// 48 Tuchfelder ist .cr-felt__working-label ein Bedienteil der
	// Bedienleiste, kein Gitterfeld — seine Zielgröße kommt deshalb weiterhin
	// aus einer festen Zahl, nicht aus einer Gitterrechnung. Diese Zusage
	// gehörte schon zur alten Fassung von F-7 (vor dem Umbau nach der
	// Bildvorlage); die Vollfassung, die Ub aus dem Plan übernahm, ließ sie
	// beim Neuschreiben aus (DECISIONS.md, Umsetzungsstück Ub — die CSS-Regel
	// selbst war davon nie betroffen, nur ihr automatisierter Nachweis fehlte
	// seither). Hier für Ue wiederhergestellt.
	const workingLabelRumpf = regelRumpf(feltCss, '.cr-felt__working-label');
	check(eigenschaftsWert(workingLabelRumpf, 'min-block-size') === '2.75rem',
		'.cr-felt__working-label (der Place-Wetten-Schalter) hält seine eigene Mindesthöhe von 2,75rem',
		workingLabelRumpf?.trim());

	console.log('     Gegenprobe F-7-G0: eine gekürzte Mindesthöhe am Place-Wetten-Schalter muss auffallen');
	check(eigenschaftsWert('min-block-size: 2rem;', 'min-block-size') !== '2.75rem',
		'F-7-G0: 2rem statt 2,75rem wäre eine Abweichung und würde erkannt');

	console.log('     Gegenprobe F-7-G: eine Zeile mit 0.3fr müsste unter 24 Bildpunkte fallen');
	{
		const verfaelscht = [...ausPhp];
		verfaelscht[5] = 0.3;   // der Come-Streifen
		const gesamtG = verfaelscht.reduce((a, b) => a + b, 0);
		const hoeheG = (0.3 / gesamtG) * nutzHoehe;
		check(hoeheG < ZIEL, `F-7-G: eine Zeile mit 0.3fr ergäbe ${hoeheG.toFixed(1)} px und würde erkannt`);
	}

	console.log('     Gegenprobe F-7-G2: eine Spurbreite von 0.4rem müsste das schmalste Feld unter 24 Bildpunkte drücken');
	{
		const schmal = 0.4 * 16;
		const schmalstesFeld = Math.min(...phpFelder.map((f) => (f.colEnd - f.col) * schmal + (f.colEnd - f.col - 1) * spalt));
		check(schmalstesFeld < ZIEL, `F-7-G2: mit 0.4rem Spurbreite wäre das schmalste Feld ${schmalstesFeld.toFixed(1)} px breit und würde erkannt`);
	}
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
 *
 * SEIT UMSETZUNGSSTÜCK Td (eine Fläche statt zweier) heißen die drei Glieder
 * dieser Kette in dieser Datei anders: .cr-table__stage/.cr-felt-area/
 * .cr-felt__scroll sind entfallen, an ihre Stelle sind .cr-cloth-area und
 * .cr-cloth__scroll getreten (Table.html) — .cr-felt selbst trägt seine
 * eigene min-inline-size unverändert weiter, nur schrumpft sie jetzt den
 * Tischkasten mit, nicht mehr einen eigenen Rollbereich des Gitters allein.
 */
console.log('\nZusatz  Reflow statt Schrumpfen (WCAG 2.2 SC 1.4.10, Auditbefund H-02): die min-inline-size:0-Kette');
{
	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));

	const areaRumpf = regelRumpf(feltCss, '.cr-cloth-area');
	check(areaRumpf !== null && eigenschaftsWert(areaRumpf, 'min-inline-size') === '0',
		'.cr-cloth-area setzt min-inline-size: 0 (erstes Kettenglied dieser Datei)', areaRumpf?.trim());

	const scrollRumpf = regelRumpf(feltCss, '.cr-cloth__scroll');
	check(scrollRumpf !== null && /^auto$/.test(eigenschaftsWert(scrollRumpf, 'overflow-x') ?? ''),
		'.cr-cloth__scroll ist der tatsächliche Rollbereich (overflow-x: auto) — gerollt wird, nicht geschrumpft', scrollRumpf?.trim());
	check(scrollRumpf !== null && eigenschaftsWert(scrollRumpf, 'min-inline-size') === '0',
		'.cr-cloth__scroll setzt min-inline-size: 0 (zweites Kettenglied)', scrollRumpf?.trim());

	// .cr-cloth selbst darf NICHT schrumpfen dürfen: erst weil es eine feste
	// min-inline-size (die volle Tischbreite) trägt, greift .cr-cloth__scroll
	// überhaupt als Rollbereich statt als toter Code.
	const clothRumpfReflow = regelRumpf(feltCss, '.cr-cloth');
	const clothMinInline = eigenschaftsWert(clothRumpfReflow, 'min-inline-size');
	check(clothMinInline !== null && clothMinInline !== '0', '.cr-cloth trägt eine feste min-inline-size (die volle Tischbreite), schrumpft also nicht unter sie', clothMinInline);

	console.log('     Gegenprobe Zusatz-G: eine entfernte min-inline-size:0 an .cr-cloth-area muss auffallen');
	const ohneKettenglied = feltCss.replace(/(\.cr-cloth-area\s*\{[^}]*?)min-inline-size:\s*0;\s*/, '$1');
	const areaRumpfGegenprobe = regelRumpf(ohneKettenglied, '.cr-cloth-area');
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

console.log('\nF-9  Kontrast (SC 1.4.3): die tatsächlich benutzten Farbpaarungen, einschließlich der neuen aus der Bildvorlage');
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

	// Neu mit der Bildvorlage: das Gelb der Zahlen und Wörter, das gedämpfte
	// Elfenbein der Haarlinien zwischen den fünf Zonen eines Zahlenkastens.
	const brass100 = hexZuRgb(tokenHex(tokensCss, '--ck-brass-100'));
	const ivory300 = hexZuRgb(tokenHex(tokensCss, '--ck-ivory-300'));

	const kGelb = kontrast(brass100, feltGreen);
	check(kGelb >= 4.5, `--ck-brass-100 auf --ck-felt-green (die gelben Zahlen und Wörter): ${kGelb.toFixed(2)}:1 (Soll ≥ 4,5:1)`);

	const kHaarlinie = kontrast(ivory300, feltGreen);
	check(kHaarlinie >= 3, `--ck-ivory-300 auf --ck-felt-green (die Haarlinien im Zahlenkasten, eine Bauteilgrenze): ${kHaarlinie.toFixed(2)}:1 (Soll ≥ 3:1)`);

	// DAS ROT DER DREI HERVORGEHOBENEN WÖRTER (COME, Seven, Any Craps) kommt
	// über den Token --ck-felt-red. SEIT UMSETZUNGSSTÜCK Uc scharf: der Token
	// steht in tokens.css, deshalb prüft dieser Block ab hier ohne
	// Hinweis-Ausweg.
	const feltRed = hexZuRgb(tokenHex(tokensCss, '--ck-felt-red'));
	const kRot = kontrast(feltRed, feltGreen);
	check(kRot >= 4.5, `--ck-felt-red auf --ck-felt-green (COME, Seven, Any Craps): ${kRot.toFixed(2)}:1 (Soll ≥ 4,5:1)`);

	console.log('     Gegenprobe F-9-G: ein erfundenes, zu dunkles Grün als Untergrund muss auffallen');
	const zuDunkel = [10, 10, 10];
	const kGegenprobe = kontrast(feltLine, zuDunkel);
	check(kGegenprobe >= 4.5, 'F-9-VORBEREITUNG: helle Schrift auf sehr dunklem Grund bestünde für sich genommen (nicht der Fund selbst)');
	const kGegenprobeDunkleSchrift = kontrast([40, 40, 40], zuDunkel);
	check(kGegenprobeDunkleSchrift < 4.5, 'F-9-G: eine erfundene dunkle Schrift auf zu dunklem Grund unterschreitet 4,5:1 und wird erkannt');

	console.log('     Gegenprobe F-9-G2: ein sattes Rot wie auf der Vorlage müsste durchfallen');
	const kSattesRot = kontrast([255, 0, 0], feltGreen);
	check(kSattesRot < 4.5,
		`F-9-G2: reines Rot auf dem Tuchgrün erreicht nur ${kSattesRot.toFixed(2)}:1 und wird als zu schwach erkannt`);
}

/* ============================ F-10 Farbe ist nie die einzige Aussage (1.4.1) */

console.log('\nF-10  Farbe ist nie die einzige Aussage (SC 1.4.1): die dunkle Seite hat eine eigene Form UND einen ausgeschriebenen Namen');
{
	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));
	const regeln = [...feltCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selektor: m[1], rumpf: m[2] }));
	// SEIT DEM UMBAU: dontpoint heißt dcstrip (die Aufschriftklassen wurden mit
	// den 'kind'-Werten aus BetLayout::fields() umbenannt). Die Formregel-
	// Prüfung selbst bleibt dieselbe.
	const dontRegel = regeln.find((r) => r.selektor.includes('.cr-felt__field--dontline') && r.selektor.includes('.cr-felt__field--dontcome') && r.selektor.includes('.cr-felt__field--dcstrip'));
	check(dontRegel !== undefined, 'es gibt eine gemeinsame Formregel für dontline/dontcome/dcstrip');
	if (dontRegel) {
		check(/border-style\s*:\s*double/.test(dontRegel.rumpf), 'die dunkle Seite hat eine eigene Formregel (border-style: double), nicht nur eine Farbe', dontRegel.rumpf.trim());
	}

	const locallang = lies(LOCALLANG_PFAD);
	function quelltext(id) {
		const muster = new RegExp(`<trans-unit id="${id}">\\s*<source>([^<]*)</source>`);
		return muster.exec(locallang)?.[1] ?? null;
	}

	// Die dunkle Seite muss sich ohne Farbwahrnehmung erkennen lassen: an
	// einer eigenen FORM (border-style: double, felt.css) und an einem
	// ausgeschriebenen „Don't“ — sowohl in der Aufschrift auf dem Tuch als
	// auch im erreichbaren Namen. Die Aufschrift steht seit dem Umbau nicht
	// mehr in locallang.xlf, sondern als field.print in der Feldliste.
	const DUNKEL_IDS = ['dont-pass', 'dont-come'];
	const ohneDontImAufdruck = DUNKEL_IDS.filter((id) => {
		const f = phpFelder.find((x) => x.id === id);
		const text = (f?.print ?? []).map((t) => t.text).join(' ');
		return !text.includes("Don't") && !text.includes('Don’t');
	});
	check(ohneDontImAufdruck.length === 0, 'die Aufschrift der dunklen Seite nennt „Don\'t" ausgeschrieben', ...ohneDontImAufdruck);

	const DONT_NAMEN = ['felt.name.dontpass', 'felt.name.dontcome', 'felt.name.dontpassodds',
		'felt.name.dontcomeodds', 'felt.name.dontcomepoint'];
	const ohneDont = DONT_NAMEN.filter((id) => !(quelltext(id) ?? '').includes("Don't") && !(quelltext(id) ?? '').includes('Don’t'));
	check(ohneDont.length === 0, 'jeder Name der dunklen Seite nennt „Don\'t" ausgeschrieben', ...ohneDont);

	console.log('     Gegenprobe F-10-G: eine felt.css ohne die Formregel muss auffallen');
	const ohneForm = feltCss.replace(/border-style\s*:\s*double;\s*/, '');
	const regelnGegenprobe = [...ohneForm.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selektor: m[1], rumpf: m[2] }));
	const dontRegelGegenprobe = regelnGegenprobe.find((r) => r.selektor.includes('.cr-felt__field--dcstrip'));
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
	// Seit Umsetzungsstück Td (eine Fläche statt zweier) stehen die <h2>, die
	// Section mit aria-labelledby und der Place-Schalter in Table.html, nicht
	// mehr in Felt.html: eine absolut positionierte Überlagerung hat keinen
	// Platz mehr für etwas, das im Layout VOR oder NACH ihr stehen soll.
	// Felt.html bleibt die Quelle der vier role="group"-Bereiche.
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const tableHtmlFuerF12 = existsSync(TABLE_HTML_PFAD) ? ohneFluidKommentare(lies(TABLE_HTML_PFAD)) : '';

	const h2Treffer = [...tableHtmlFuerF12.matchAll(/<h2[^>]*id="([^"]+)"[^>]*>/g)];
	check(h2Treffer.length === 1, `genau eine <h2> mit id in Table.html (gefunden: ${h2Treffer.length})`);
	const h2Id = h2Treffer[0]?.[1];

	const labelledby = /<section[^>]*aria-labelledby="([^"]+)"/.exec(tableHtmlFuerF12)?.[1];
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

	check(/<input type="checkbox" class="cr-felt__working-input"/.test(tableHtmlFuerF12), 'der Place-Schalter ist ein natives <input type="checkbox"> (Table.html)');
	const beschreibtDurch = /aria-describedby="([^"]+)"/.exec(tableHtmlFuerF12)?.[1];
	check(beschreibtDurch !== undefined, 'der Place-Schalter trägt aria-describedby');
	if (beschreibtDurch) {
		check(tableHtmlFuerF12.includes(`id="${beschreibtDurch}"`), `das Ziel von aria-describedby (#${beschreibtDurch}) existiert im selben Markup`);
	}
	check(/<label class="cr-felt__working-label">[\s\S]*?<span>/.test(tableHtmlFuerF12), 'der Place-Schalter hat sichtbaren Text im <label> (Table.html)');
}

/* ============================================== F-13 Der Puck sagt nichts doppelt */

console.log('\nF-13  Der Puck ist aria-hidden ohne role; [data-cr-point-text] ist kein Live-Bereich');
{
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const puckSpan = /<span class="cr-puck" data-cr-puck=""[^>]*>/.exec(feltHtml)?.[0] ?? '';
	check(puckSpan.includes('aria-hidden="true"'), 'der Puck trägt aria-hidden="true"', puckSpan);
	check(!/role=/.test(puckSpan), 'der Puck trägt kein eigenes role', puckSpan);
	check(puckSpan.includes('lang="en"'),
		'der Puck trägt lang="en" — „OFF“ und „ON“ sind englische Aufschrift auf einer deutschen Seite (SC 3.1.2)', puckSpan);

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

/* ======================================== F-14 Der Spiegel ist vollständig */

console.log('\nF-14  Der Spiegel ist vollständig und richtig, EINE Aufdruck-Vorlage für beide Tischseiten');
{
	// (a) genau die Felder der rechten Sektion (col >= RIGHT_COL) tragen ein
	// mirrorCol; die Mittensektion trägt keines.
	const inkonsistent = phpFelder.filter((f) => (f.col >= phpDaten.rightCol) !== (f.mirrorCol > 0));
	check(inkonsistent.length === 0, 'jedes Feld mit col >= rightCol hat ein mirrorCol, jedes Feld der Mittensektion keines', ...inkonsistent.map((f) => f.id));

	// (b) die Spiegelrechnung: mirrorCol + colEnd == COLUMNS + 2, mirrorColEnd + col == COLUMNS + 2.
	const gespiegelt = phpFelder.filter((f) => f.mirrorCol > 0);
	const summe = phpDaten.columns + 2;
	const falscheRechnung = gespiegelt.filter((f) => f.mirrorCol + f.colEnd !== summe || f.mirrorColEnd + f.col !== summe);
	check(falscheRechnung.length === 0, `für jedes gespiegelte Feld gilt mirrorCol + colEnd == ${summe} und mirrorColEnd + col == ${summe}`, ...falscheRechnung.map((f) => f.id));

	// (c) genau 38 Felder werden gespiegelt: die 30 Zahlenfelder, die 7
	// Linien-/Field-Felder der rechten Sektion und C & E (craps-eleven, seit
	// Ub Teil der bespielbaren Sektion); die 4 Hardways und 6 Einmalwetten der
	// Mittensektion nicht.
	check(gespiegelt.length === 38, `die Feldliste enthält genau 38 gespiegelte Felder (gefunden: ${gespiegelt.length})`);

	// (d) im Quelltext gibt es genau EINE Spiegel-Vorlage (ein <span>, das zur
	// Laufzeit für jedes der 38 gespiegelten Felder einmal instanziiert wird —
	// Felt.html ist eine Fluid-VORLAGE, ein tatsächlich gerendertes Markup
	// steht diesem Skript nicht zur Verfügung, siehe Kopfkommentar).
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const mirrorVorlagen = (feltHtml.match(/<span class="cr-felt__field cr-felt__field--\{field\.kind\} cr-felt__field--mirror"/g) ?? []).length;
	check(mirrorVorlagen === 1, `genau eine Spiegel-Vorlage im Quelltext, zur Laufzeit 38-mal instanziiert (gefunden: ${mirrorVorlagen})`);

	// SEIT DEM UMBAU: der Spiegel zeichnet DASSELBE Bild wie die bespielbare
	// Seite, weil beide denselben Abschnitt rendern. Eine zweite Abschrift
	// wäre eine zweite Wahrheit — und genau daran ist in diesem Haus schon
	// einmal eine zweite, deckende Fläche entstanden.
	const abschnitte = (feltHtml.match(/<f:section name="Aufdruck">/g) ?? []).length;
	const aufrufe = (feltHtml.match(/<f:render section="Aufdruck"/g) ?? []).length;
	check(abschnitte === 1, `genau ein <f:section name="Aufdruck"> im Quelltext (gefunden: ${abschnitte})`);
	check(aufrufe === 2, `genau zwei <f:render section="Aufdruck"> — einer je Tischseite (gefunden: ${aufrufe})`);

	console.log('     Gegenprobe F-14-G: eine um eins verschobene Spiegelrechnung muss auffallen');
	const verfaelscht = gespiegelt.map((f) => (f.id === 'field' ? { ...f, mirrorCol: f.mirrorCol + 1 } : f));
	const falscheGegenprobe = verfaelscht.filter((f) => f.mirrorCol + f.colEnd !== summe || f.mirrorColEnd + f.col !== summe);
	check(falscheGegenprobe.some((f) => f.id === 'field'), 'F-14-G: die um eins verschobene Spiegelrechnung bei "field" wird erkannt');

	console.log('     Gegenprobe F-14-G2: ein dritter Aufruf des Abschnitts müsste auffallen');
	const mitDrittem = feltHtml + '<f:render section="Aufdruck" arguments="{field: field}" />';
	check((mitDrittem.match(/<f:render section="Aufdruck"/g) ?? []).length === 3,
		'F-14-G2: ein zusätzlicher Aufruf verändert die Anzahl und wird erkannt');
}

/* =================================== F-15 Der Aufdruck ist unsere Auszahlung */

console.log('\nF-15  Der englische Aufdruck ist UNSERE Auszahlung aus Anhang H, nur anders geschrieben');
{
	/*
	 * DIE FRAGE, DIE HIER BEANTWORTET WIRD.
	 * Die Vorlage schreibt „31 FOR 1“, Anhang H sagt „30 zu 1“. Das ist
	 * dieselbe Zahl in zwei Zählweisen: „N FOR 1“ heißt, das N-fache des
	 * Einsatzes kommt zurück (Einsatz eingerechnet); „a zu b“ heißt, a Gewinn
	 * auf b Einsatz, Einsatz zusätzlich zurück. Für b = 1 ist also N = a + 1.
	 *
	 * Aufgedruckt wird deshalb NICHT, was auf dem Bild steht, sondern was
	 * BetLayout::forOne() aus unserer eigenen Quote rechnet. Diese Prüfung
	 * rechnet es ein zweites Mal, aus ratioFor() in bets-craps.js — also aus
	 * der Datei, mit der im Browser tatsächlich ausgezahlt wird. Änderte
	 * jemand eine Quote, ohne den Aufdruck nachzuziehen, fiele es hier auf.
	 */
	const abweichungen = [];
	for (const f of phpFelder) {
		if (f.printPayout === '') {
			continue;
		}
		const treffer = /^(\d+) FOR 1$/.exec(f.printPayout);
		if (treffer === null) {
			abweichungen.push(`${f.id}: „${f.printPayout}“ hat nicht die Form „N FOR 1“`);
			continue;
		}
		const ratio = ratioFor(f.id, {});
		if (ratio === null || ratio.den !== 1) {
			abweichungen.push(`${f.id}: gedruckt „${f.printPayout}“, aber die Quote ist ${ratio ? `${ratio.num}:${ratio.den}` : 'unbekannt'} und lässt sich nicht als „N FOR 1“ schreiben`);
			continue;
		}
		const erwartet = ratio.num + 1;
		if (Number(treffer[1]) !== erwartet) {
			abweichungen.push(`${f.id}: gedruckt „${f.printPayout}“, aus Anhang H (${ratio.num} zu ${ratio.den}) folgt „${erwartet} FOR 1“`);
		}
	}
	check(abweichungen.length === 0,
		'jeder gedruckte „N FOR 1“-Wert folgt aus derselben Quote, die auch ausgezahlt wird', ...abweichungen);

	// GENAU ZEHN FELDER TRAGEN EINEN ZAHLENAUFDRUCK: die sechs Einmalwetten
	// und die vier Hardways. Überall sonst druckt die Vorlage keine Zahl, und
	// wir auch nicht. Ohne diese Zeile könnte der Aufdruck unbemerkt
	// verschwinden — jede einzelne Prüfung oben bliebe grün.
	const mitAufdruck = phpFelder.filter((f) => f.printPayout !== '').map((f) => f.id).sort();
	const ERWARTET_MIT_AUFDRUCK = ['any-craps', 'any-seven', 'eleven', 'hard-10', 'hard-4', 'hard-6', 'hard-8', 'three', 'twelve', 'two'];
	check(mitAufdruck.join(',') === ERWARTET_MIT_AUFDRUCK.join(','),
		`genau die zehn Felder der Mittensektion tragen einen Zahlenaufdruck (gefunden: ${mitAufdruck.join(', ')})`);

	// DIE ZWEI EINGEKREISTEN SONDERFÄLLE DES FIELD. „PAYS DOUBLE“ heißt
	// doppelte Rückgabe = 2 zu 1, „PAYS TRIPLE“ dreifache = 3 zu 1. Das Wort
	// wird gegen die Quote gehalten, nicht bloß gezählt.
	const WORT_ZU_QUOTE = { 'PAYS DOUBLE': [2, 1], 'PAYS TRIPLE': [3, 1] };
	const feld = phpFelder.find((f) => f.id === 'field');
	check(Array.isArray(feld?.circles) && feld.circles.length === 2,
		`das FIELD trägt genau zwei eingekreiste Sonderfälle (gefunden: ${feld?.circles?.length ?? 0})`);
	const kreisAbweichungen = [];
	for (const kreis of feld?.circles ?? []) {
		const soll = WORT_ZU_QUOTE[kreis.text];
		if (soll === undefined) {
			kreisAbweichungen.push(`Kreis „${kreis.label}“: unbekannter Aufdruck „${kreis.text}“`);
			continue;
		}
		if (kreis.ratio[0] !== soll[0] || kreis.ratio[1] !== soll[1]) {
			kreisAbweichungen.push(`Kreis „${kreis.label}“: „${kreis.text}“ steht für ${soll[0]} zu ${soll[1]}, hinterlegt ist ${kreis.ratio[0]} zu ${kreis.ratio[1]}`);
		}
	}
	check(kreisAbweichungen.length === 0, 'die zwei Kreisaufdrucke des FIELD stimmen mit ihren Quoten überein', ...kreisAbweichungen);

	// …und die Quoten der Kreise mit dem, was wagers-craps.js tatsächlich zahlt.
	const zwei = ratioFor('field', { sum: 2 });
	const zwoelf = ratioFor('field', { sum: 12 });
	check(zwei?.num === 2 && zwei?.den === 1, 'die 2 im FIELD zahlt tatsächlich 2 zu 1 (ratioFor)');
	check(zwoelf?.num === 3 && zwoelf?.den === 1, 'die 12 im FIELD zahlt tatsächlich 3 zu 1 (ratioFor)');

	console.log('     Gegenprobe F-15-G: ein aufgedrucktes „11 FOR 1“ bei Hard 4 (statt unserer 8 FOR 1) muss auffallen');
	{
		const ratio = ratioFor('hard-4', {});
		check(ratio.num + 1 !== 11, `F-15-G: aus 7 zu 1 folgt 8 FOR 1, nicht 11 FOR 1 — die Abweichung wird erkannt`);
	}

	console.log('     Gegenprobe F-15-G2: eine Vertauschung von PAYS DOUBLE und PAYS TRIPLE muss auffallen');
	check(WORT_ZU_QUOTE['PAYS DOUBLE'][0] !== WORT_ZU_QUOTE['PAYS TRIPLE'][0],
		'F-15-G2: die zwei Wörter stehen für verschiedene Quoten, eine Vertauschung wäre eine Abweichung');
}

/* ============================================== F-16 Der Spiegel ist keine Falle */

console.log('\nF-16  Der Spiegel ist keine Falle: kein fokussierbares Element, pointer-events: none');
{
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const mirrorMatch = /<div class="cr-felt__mirror" aria-hidden="true">[\s\S]*?<\/div>/.exec(feltHtml);
	const mirrorBlock = mirrorMatch ? mirrorMatch[0] : '';
	check(mirrorBlock !== '', 'der Spiegelblock .cr-felt__mirror existiert im Markup');
	check(mirrorBlock.includes('aria-hidden="true"'), 'der Spiegelblock trägt aria-hidden="true"', mirrorBlock.slice(0, 60));
	check(!/<button/.test(mirrorBlock), 'kein <button> im Spiegelblock');
	check(!/<a[\s>]/.test(mirrorBlock), 'kein <a> im Spiegelblock');
	check(!/tabindex/.test(mirrorBlock), 'kein tabindex im Spiegelblock');
	check(!/data-ck-field=/.test(mirrorBlock), 'kein data-ck-field im Spiegelblock');

	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));
	const mirrorFieldRumpf = regelRumpf(feltCss, '.cr-felt__field--mirror');
	check(eigenschaftsWert(mirrorFieldRumpf, 'pointer-events') === 'none', '.cr-felt__field--mirror setzt pointer-events: none');

	console.log('     Gegenprobe F-16-G: ein <button> im Spiegelblock muss auffallen');
	const mitButton = mirrorBlock.replace('<span class="cr-felt__field', '<button class="cr-felt__field');
	check(/<button/.test(mitButton), 'F-16-G: ein eingefügtes <button> im Spiegelblock wird erkannt');

	// SEIT DEM UMBAU: der Spiegel enthält auch die Schenkel, die Würfelbilder,
	// die Kreise und die Kreiskette — alles Zierrat. Keines davon darf
	// fokussierbar sein, und keines darf ein Klickziel erzeugen.
	check(!/<svg[^>]*tabindex/.test(mirrorBlock), 'kein tabindex an einem gedruckten Würfel im Spiegelblock');
	check(!/focusable="true"/.test(mirrorBlock), 'kein focusable="true" im Spiegelblock');

	// Und: der Spiegel benutzt DIESELBE Aufdruck-Vorlage. Eine zweite
	// Abschrift wäre eine zweite Wahrheit — genau daran ist in diesem Haus
	// schon einmal eine zweite, deckende Fläche entstanden.
	check(/<f:render section="Aufdruck"[^>]*\/>/.test(mirrorBlock),
		'der Spiegelblock rendert denselben Abschnitt „Aufdruck“ wie die bespielbare Seite');

	// Der gespiegelte Schenkel liegt auf der anderen Seite. DIESE eine Zeile
	// prüfte bis Umsetzungsstück Ue nur, dass die Regel im Stylesheet STEHT —
	// nicht, ob im Markup überhaupt ein .cr-felt__leg im Spiegel entsteht, den
	// sie treffen könnte. Bis Ue tat er das nicht: Felt.html rendert den
	// Schenkel AUSSERHALB des gemeinsamen Abschnitts „Aufdruck“, nur im Knopf
	// der bespielbaren Seite — die Regel traf im ausgelieferten Markup nichts,
	// und diese Prüfung wäre trotzdem grün geblieben. Eine übersprungene
	// Prüfung, die aussieht wie eine bestandene (DECISIONS.md). Seit Ue liegt
	// der Schenkel IM Abschnitt „Aufdruck“ (Felt.html); die beiden Prüfungen
	// darunter weisen das jetzt am QUELLTEXT nach, nicht nur an der Existenz
	// der CSS-Regel.
	const feltCssSpiegel = ohneBlockKommentare(lies(FELT_CSS_PFAD));
	check(/\.cr-felt__field--mirror\.cr-felt__field--line\s*>\s*\.cr-felt__leg/.test(feltCssSpiegel),
		'für den gespiegelten Schenkel gibt es eine eigene Regel — sonst ragte er in die Mittensektion');

	const aufdruckMatch = /<f:section name="Aufdruck">[\s\S]*?<\/f:section>/.exec(feltHtml);
	const aufdruckBlock = aufdruckMatch ? aufdruckMatch[0] : '';
	check(aufdruckBlock !== '', 'der Abschnitt „Aufdruck“ existiert im Quelltext');
	check(aufdruckBlock.includes('cr-felt__leg'),
		'der Schenkel liegt IM Abschnitt „Aufdruck“ — und wird damit (F-14: genau ein Abschnitt, genau zwei Wiedergaben) tatsächlich sowohl im Knopf als auch im Spiegel gerendert, nicht nur im Knopf');

	console.log('     Gegenprobe F-16-G3: ein Abschnitt „Aufdruck“ OHNE Schenkel darf nicht als „Schenkel im Spiegel“ durchgehen — genau das war der Zustand vor Ue');
	const aufdruckOhneLeg = aufdruckBlock.replace(
		/<f:if condition="\{field\.kind\} == 'line' \|\| \{field\.kind\} == 'dontline'">[\s\S]*?<\/f:if>/,
		'');
	check(aufdruckOhneLeg !== aufdruckBlock, 'F-16-G3: die Kürzung greift tatsächlich (der Text wird kürzer)', aufdruckOhneLeg.length, aufdruckBlock.length);
	check(!aufdruckOhneLeg.includes('cr-felt__leg'),
		'F-16-G3: entfernt man den Schenkel testweise aus dem Abschnitt, schlägt die eigentliche Prüfung tatsächlich an');

	console.log('     Gegenprobe F-16-G2: ein focusable="true" an einem gedruckten Würfel muss auffallen');
	check(/focusable="true"/.test('<svg focusable="true">'), 'F-16-G2: die Suche nach focusable="true" schlägt tatsächlich an');
}

/* ============================== F-17 Die zwei Schenkel der L-förmigen Wetten */

console.log('\nF-17  Die zwei Schenkel liegen genau dort, wo BetLayout::legLanes() sie hinlegt');
{
	/*
	 * Der Schenkel ist kein Gitterelement: er liegt absolut im Knopf und wird
	 * in Prozent von dessen Breite und Höhe bemessen. Das ist die einzige
	 * Stelle des Tuchs, an der eine Lage NICHT als grid-column aus dem
	 * Processor kommt — also die einzige, an der sie auseinanderlaufen könnte.
	 * Dieselbe Bauart wie bei den sieben Puck-Regeln: die Regel steht im
	 * Stylesheet, die Wahrheit in BetLayout, und diese Prüfung hält beide
	 * gegeneinander.
	 */
	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));

	const felder = new Map(phpFelder.map((f) => [f.id, f]));
	const SELEKTOR = {
		'pass': '.cr-felt__field--line > .cr-felt__leg',
		'dont-pass': '.cr-felt__field--dontline > .cr-felt__leg',
	};

	const abweichungen = [];
	for (const [id, lane] of Object.entries(phpDaten.legLanes)) {
		const feld = felder.get(id);
		if (!feld) { abweichungen.push(`${id}: kein Feld mit dieser Kennung`); continue; }

		const bandSpuren = feld.colEnd - feld.col;
		const bandZeilen = feld.rowEnd - feld.row;
		const schenkelSpuren = lane.colEnd - lane.col;
		const schenkelZeilen = lane.rowEnd - lane.row;

		// Der Schenkel MUSS unmittelbar an das Band anschließen, sonst klafft
		// eine Lücke oder er überdeckt es.
		if (lane.col !== feld.colEnd) {
			abweichungen.push(`${id}: der Schenkel beginnt bei Spur ${lane.col}, das Band endet bei ${feld.colEnd}`);
		}
		if (lane.rowEnd !== feld.rowEnd) {
			abweichungen.push(`${id}: der Schenkel endet in Zeile ${lane.rowEnd}, das Band in ${feld.rowEnd}`);
		}

		const rumpf = regelRumpf(feltCss, SELEKTOR[id]);
		if (rumpf === null) { abweichungen.push(`${id}: keine Regel „${SELEKTOR[id]}“ in felt.css`); continue; }

		const breite = eigenschaftsWert(rumpf, 'inline-size');
		const hoehe = eigenschaftsWert(rumpf, 'block-size');
		const erwarteteBreite = `calc(100% * ${schenkelSpuren} / ${bandSpuren})`;
		const erwarteteHoehe = `calc(100% * ${schenkelZeilen} / ${bandZeilen})`;
		if (breite !== erwarteteBreite) {
			abweichungen.push(`${id}: inline-size ist „${breite}“, erwartet „${erwarteteBreite}“`);
		}
		if (hoehe !== erwarteteHoehe) {
			abweichungen.push(`${id}: block-size ist „${hoehe}“, erwartet „${erwarteteHoehe}“`);
		}
	}
	check(abweichungen.length === 0, 'beide Schenkelregeln in felt.css stimmen mit BetLayout::legLanes() überein', ...abweichungen);

	// Der Schenkel liegt AUSSERHALB seines Knopfes, unmittelbar an dessen
	// äußerer Kante. Fehlte inset-inline-start: 100%, läge er IM Band und
	// verdeckte dessen Aufschrift.
	const gemeinsam = regelRumpf(feltCss, '.cr-felt__leg');
	check(eigenschaftsWert(gemeinsam, 'inset-inline-start') === '100%',
		'.cr-felt__leg beginnt bei 100 % — also genau dort, wo das Band endet');
	check(eigenschaftsWert(gemeinsam, 'position') === 'absolute', '.cr-felt__leg liegt absolut');

	// Und der Elternknopf darf ihn nicht abschneiden. overflow: hidden wäre
	// hier derselbe Fehler wie clip-path und opacity: es nähme auch den
	// Fokusrahmen mit.
	//
	// AUSLEGUNG DES UMSETZERS: regelRumpf() findet nur EINDEUTIGE Selektoren
	// (Text unmittelbar nach "}" oder Dateianfang, direkt vor "{"). Die Regel
	// für den Rahmen-Rückbau ist aber eine gemeinsame, kommagetrennte Liste
	// (".cr-felt__field--line,\n.cr-felt__field--dontline {" — exakt die
	// Fassung aus Abschnitt 4.11 des Plans). regelRumpf() fände sie unter
	// keiner Schreibweise. Dieselbe Suchtechnik wie in F-10 (alle Regeln
	// zerlegen, Selektortext mit .includes() prüfen) findet sie robust,
	// unabhängig von Kommas und Zeilenumbrüchen.
	// .cr-felt__field--dontline kommt in ZWEI Regeln vor (auch in der
	// Formregel „border-style: double" weiter oben) — gesucht wird deshalb
	// gezielt die Regel, die overflow: visible tatsächlich setzt, nicht bloß
	// irgendeine mit passendem Selektortext.
	const alleRegelnF17 = [...feltCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selektor: m[1], rumpf: m[2] }));
	for (const selektor of ['.cr-felt__field--line', '.cr-felt__field--dontline']) {
		const regel = alleRegelnF17.find((r) => r.selektor.includes(selektor) && /overflow:\s*visible/.test(r.rumpf));
		check(regel !== undefined,
			`${selektor} trägt overflow: visible — sonst schnitte der Knopf seinen eigenen Schenkel ab`, regel?.rumpf?.trim());
	}

	// DER FOKUSRAHMEN UMFASST BEIDE TEILE. Das ist der Punkt, an dem in diesem
	// Haus schon dreimal etwas schiefgegangen ist: opacity, clip-path und
	// overflow: hidden nehmen den Ring mit, und niemand merkt es, weil das
	// Feld ansonsten aussieht wie vorher.
	check(/\.cr-felt__field--line:focus-visible\s*>\s*\.cr-felt__leg/.test(feltCss)
		&& /\.cr-felt__field--dontline:focus-visible\s*>\s*\.cr-felt__leg/.test(feltCss),
		'beim Tastaturfokus bekommt auch der Schenkel einen Ring, nicht nur das Band');
	const legRegeln = [...feltCss.matchAll(/([^{}]*\.cr-felt__leg[^{}]*)\{([^{}]*)\}/g)];
	const verbotene = legRegeln.filter((m) => /(opacity|clip-path|mask|overflow:\s*hidden)/.test(m[2]));
	check(verbotene.length === 0,
		'keine Schenkelregel benutzt opacity, clip-path, mask oder overflow: hidden — jedes davon nähme den Fokusrahmen mit',
		...verbotene.map((m) => m[0].trim()));

	console.log('     Gegenprobe F-17-G: eine um eine Spur verstellte Schenkelbreite muss auffallen');
	{
		const lane = phpDaten.legLanes.pass;
		const feld = felder.get('pass');
		const falsch = `calc(100% * ${lane.colEnd - lane.col + 1} / ${feld.colEnd - feld.col})`;
		const richtig = `calc(100% * ${lane.colEnd - lane.col} / ${feld.colEnd - feld.col})`;
		check(falsch !== richtig, `F-17-G: „${falsch}“ unterscheidet sich von „${richtig}“ und würde erkannt`);
	}

	console.log('     Gegenprobe F-17-G2: ein clip-path an der Schenkelregel muss auffallen');
	check(/(opacity|clip-path)/.test('clip-path: inset(0);'),
		'F-17-G2: die Suche nach clip-path in einer Schenkelregel schlägt bei einem eingefügten clip-path tatsächlich an');
}

/* ====================== F-18 Die drei geschwungenen Linien der Vorlage */

console.log('\nF-18  Die drei geschwungenen Linien in Cloth.html treffen genau die Kanten des Gitters');
{
	/*
	 * WAS HIER BEWIESEN WIRD. Der Umriss der PASS LINE und der Don't Pass Bar
	 * ist das einzige Stück Zeichnung, das NICHT aus einem CSS-Rahmen
	 * entsteht, sondern aus drei SVG-Pfaden in der Zeichenschicht (Begründung
	 * im Kopfkommentar von BetLayout::bandPaths(): ein L-förmiges Band lässt
	 * sich mit zwei rechteckigen Rahmen nicht ohne Naht zeichnen, und ein
	 * clip-path nähme den Fokusrahmen mit).
	 *
	 * Damit liegt der Umriss in einer ANDEREN Maßordnung als die Felder — in
	 * der Wannen-Maßordnung 240 × 140 statt im Gitter 96 × 11. Genau dort
	 * können zwei Wahrheiten auseinanderlaufen, ohne dass es auffällt: das
	 * Band säße dann um ein paar Einheiten neben seinem Knopf, und das sähe
	 * nach einer Ungenauigkeit der Zeichnung aus statt nach einem Fehler.
	 *
	 * Diese Prüfung rechnet die Umrechnung ein zweites Mal, unabhängig von
	 * PHP, und vergleicht Zahl für Zahl.
	 *
	 * SEIT UMSETZUNGSSTÜCK Uc scharf: Cloth.html trägt die drei Bandpfade seit
	 * dieser Fassung, deshalb prüft dieser Block ab hier ohne Hinweis-Ausweg.
	 */
	const gesamtFr = phpDaten.rowFractions.reduce((a, b) => a + b, 0);
	const x = (linie) => 20 + 200 * (linie - 1) / phpDaten.columns;
	const y = (linie) => 20 + 100 * phpDaten.rowFractions.slice(0, linie - 1).reduce((a, b) => a + b, 0) / gesamtFr;

	// Dieselben drei Kanten wie in BetLayout::bandPaths(), hier aus den
	// Rohdaten neu bestimmt statt abgeschrieben.
	const pass = phpFelder.find((f) => f.id === 'pass');
	const dontPass = phpFelder.find((f) => f.id === 'dont-pass');
	const passLeg = phpDaten.legLanes.pass;
	const dpLeg = phpDaten.legLanes['dont-pass'];
	const kanten = [
		{ id: 'pass-outer', x: x(passLeg.colEnd), y: y(pass.rowEnd) },
		{ id: 'pass-inner', x: x(passLeg.col), y: y(pass.row) },
		{ id: 'dontpass-inner', x: x(dpLeg.col), y: y(dontPass.row) },
	];

	const cloth = existsSync(CLOTH_HTML_PFAD) ? ohneFluidKommentare(lies(CLOTH_HTML_PFAD)) : '';
	const traegtBandpfade = /<f:for each="\{felt\.bandPaths\}" as="band">/.test(cloth);

	check(phpDaten.bandPaths.length === 3, `BetLayout::bandPaths() liefert drei Pfade (gefunden: ${phpDaten.bandPaths.length})`);

	const abweichungen = [];
	for (let i = 0; i < kanten.length; i += 1) {
		const pfad = phpDaten.bandPaths[i];
		if (!pfad) { abweichungen.push(`Pfad ${i} fehlt`); continue; }
		if (pfad.id !== kanten[i].id) {
			abweichungen.push(`Pfad ${i}: Kennung „${pfad.id}“, erwartet „${kanten[i].id}“`);
			continue;
		}
		const zahlen = (pfad.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
		// M x yOben  V yBogenAnfang  A rx ry 0 0 1 xBogenEnde yKante  H xInnen
		// M x y  V y2  A rx ry 0 0 1 x2 y2  H x3 — elf Zahlen (Index 0…10), die
		// beiden Bogen-Flags "0 0 1" eingerechnet. hx ist deshalb Index 10, nicht
		// 11 — direkter Indexzugriff statt einer Auslassungs-Destrukturierung,
		// damit sich das nicht wieder verzählt (Fund beim Scharfschalten in
		// Umsetzungsstück Uc, siehe DECISIONS.md).
		const mx = zahlen[0];
		const my = zahlen[1];
		const hx = zahlen[10];
		const nah = (a, b) => Math.abs(a - b) < 0.01;
		if (!nah(mx, kanten[i].x)) abweichungen.push(`${pfad.id}: senkrechte Kante bei x=${mx}, erwartet ${kanten[i].x.toFixed(3)}`);
		if (!nah(my, y(2))) abweichungen.push(`${pfad.id}: beginnt bei y=${my}, erwartet ${y(2).toFixed(3)} (Oberkante der Zahlenreihe)`);
		if (!nah(hx, x(phpDaten.bandCol))) abweichungen.push(`${pfad.id}: endet bei x=${hx}, erwartet ${x(phpDaten.bandCol).toFixed(3)} (innere Kante der Querbänder)`);
	}
	check(abweichungen.length === 0, 'alle drei Pfade beginnen, laufen und enden genau auf den Gitterkanten', ...abweichungen);

	// Die drei Linien müssen PARALLEL laufen, also von außen nach innen
	// abnehmende Halbmesser haben — sonst schneiden sie sich in der Ecke.
	const halbmesser = phpDaten.bandPaths.map((p) => {
		const z = (p.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
		return { rx: z[3], ry: z[4] };
	});
	const streng = halbmesser.every((h, i) => i === 0 || (h.rx < halbmesser[i - 1].rx && h.ry < halbmesser[i - 1].ry));
	check(streng, 'die drei Halbmesser nehmen von außen nach innen streng ab — die Linien laufen parallel und schneiden sich nicht',
		...halbmesser.map((h, i) => `${phpDaten.bandPaths[i].id}: rx=${h.rx} ry=${h.ry}`));
	check(halbmesser.every((h) => h.rx > 0 && h.ry > 0), 'kein Halbmesser wird null oder negativ',
		...halbmesser.map((h, i) => `${phpDaten.bandPaths[i].id}: rx=${h.rx} ry=${h.ry}`));

	// Und die Pfade müssen tatsächlich im Markup ankommen, aus dem Processor
	// und nicht als abgeschriebene Zeichenkette.
	check(traegtBandpfade,
		'Cloth.html rendert die Pfade aus {felt.bandPaths} — nicht als abgeschriebene d-Angabe');
	// NUR die drei Bandpfade selbst zählen — nicht jedes <path d="M…"> im
	// Dokument: Cloth.html zeichnet mit den zwei Pyramidengummi-<pattern>-
	// Kacheln (Abschnitt 3) bereits eigene, absichtlich von Hand geschriebene
	// Pfade, die mit derselben Anfangsform „d="M0…“/„d="M5…“ beginnen. Eine
	// Suche über die ganze Datei träfe auch sie und meldete einen Fund, der
	// keiner ist (Fund beim Scharfschalten in Umsetzungsstück Uc, siehe
	// DECISIONS.md). Geprüft wird deshalb gezielt das d-Attribut der Elemente
	// mit der Klasse cr-cloth__band: im Quelltext steht dort {band.d}, ein
	// Fluid-Ausdruck, keine Ziffer — nur eine von Hand eingesetzte Zeichenkette
	// würde mit „M" und einer Ziffer beginnen.
	// Der Quelltext ist Fluid-Vorlage, keine gerenderte Seite: die <f:for>-
	// Schleife steht darin EINMAL je Tischhälfte (bespielbar und gespiegelt),
	// nicht ausgerollt auf drei Pfade — deshalb zwei Fundstellen, nicht sechs.
	const bandPfadAttribute = [...cloth.matchAll(/<path class="cr-cloth__band[^"]*"\s+d="([^"]*)"/g)];
	check(bandPfadAttribute.length === 2, `die <path>-Vorlage für die Bandpfade steht zweimal im Quelltext, einmal je Tischhälfte (gefunden: ${bandPfadAttribute.length})`);
	const festeD = bandPfadAttribute.filter((m) => /^M\s*[\d.]/.test(m[1]));
	check(festeD.length === 0, 'in Cloth.html steht keine von Hand geschriebene Pfadangabe für die drei Bänder', ...festeD.map((m) => m[1]));

	console.log('     Gegenprobe F-18-G: eine um eine Einheit verschobene senkrechte Kante muss auffallen');
	check(Math.abs((kanten[0].x + 1) - kanten[0].x) >= 0.01,
		'F-18-G: eine Verschiebung um eine Einheit liegt über der Toleranz von 0,01 und würde erkannt');
}

/* ============================ F-19 Die leere Ecke bleibt leer (Big 6 / Big 8) */

console.log('\nF-19  Die Ecke, in der ein anderes Haus BIG 6 / BIG 8 druckt, ist leer — und bleibt es');
{
	/*
	 * WARUM DAS EINE PRÜFUNG BRAUCHT. Die Ecke zwischen dem Zahlenkasten 10
	 * und dem COME-Band ist die einzige größere freie Fläche des Tuchs. Auf
	 * fremden Plänen steht dort BIG 6 / BIG 8 — dieselbe Wette wie Place 6/8,
	 * nur schlechter bezahlt. Anhang H führt beide nicht, die Bildvorlage
	 * ebenfalls nicht, und B-3 verbietet sie in der Wettliste.
	 *
	 * B-3 sieht aber nur auf die LISTE. Eine freie Fläche, die niemand
	 * bewacht, füllt sich mit der Zeit von selbst — irgendein späteres Feld
	 * landet dort, „weil da noch Platz war“. Diese Prüfung bewacht sie.
	 */
	const vonSpur = phpDaten.numberCol;
	const bisSpur = phpDaten.bandCol;
	const abZeile = phpFelder.find((f) => f.id === 'come').row;   // ROW_COME_BOX

	const eindringlinge = phpFelder.filter((f) =>
		f.col < bisSpur && vonSpur < f.colEnd && f.row < phpDaten.rows + 1 && abZeile < f.rowEnd
	);
	check(eindringlinge.length === 0,
		`die Ecke Spuren ${vonSpur}…${bisSpur}, ab Zeile ${abZeile}, trägt kein Feld`, ...eindringlinge.map((f) => f.id));

	console.log('     Gegenprobe F-19-G: ein erfundenes „big-6“ in dieser Ecke muss auffallen');
	const mitBig6 = [...phpFelder, { id: 'big-6', col: vonSpur, colEnd: bisSpur, row: abZeile, rowEnd: abZeile + 2 }];
	const gefunden = mitBig6.filter((f) =>
		f.col < bisSpur && vonSpur < f.colEnd && f.row < phpDaten.rows + 1 && abZeile < f.rowEnd
	);
	check(gefunden.some((f) => f.id === 'big-6'), 'F-19-G: ein erfundenes Feld in der leeren Ecke wird erkannt');
}

/* ============================ F-20 Die gedruckten Würfelbilder stimmen */

console.log('\nF-20  Die gedruckten Würfelbilder zeigen die Zahl, an der sie stehen');
{
	/*
	 * Die kleinen Würfelbilder der Vorlage sind kein Zierrat, sondern eine
	 * AUSSAGE: an einem Hardway steht ein Pasch, an einer Einzelzahl das Paar,
	 * das sie ergibt, und an den zwei „Bar“-Feldern die Zahl, die als Patt
	 * gilt. Ein vertauschtes Augenpaar wäre eine falsche Auskunft an den
	 * Spieler — und ohne diese Prüfung fiele sie niemandem auf, weil das Bild
	 * ja aussieht wie ein Würfel.
	 */
	const abweichungen = [];
	const erwarteteSumme = (id) => {
		const hart = /^hard-(\d+)$/.exec(id);
		if (hart) return { summe: Number(hart[1]), pasch: true };
		if (id === 'two') return { summe: 2, pasch: false };
		if (id === 'three') return { summe: 3, pasch: false };
		if (id === 'eleven') return { summe: 11, pasch: false };
		if (id === 'twelve') return { summe: 12, pasch: false };
		// Die zwei Bar-Felder: 12, weil dieses Haus die 12 barrt (Anhang H).
		if (id === 'dont-pass' || id === 'dont-come') return { summe: 12, pasch: true };
		return null;
	};

	for (const f of phpFelder) {
		if (!Array.isArray(f.pips) || f.pips.length === 0) continue;
		const soll = erwarteteSumme(f.id);
		if (soll === null) { abweichungen.push(`${f.id}: trägt Würfelbilder, aber es ist nicht festgelegt, was sie zeigen sollen`); continue; }
		for (const paar of f.pips) {
			if (paar.length !== 2) { abweichungen.push(`${f.id}: ein Paar hat ${paar.length} statt zwei Würfel`); continue; }
			if (paar.some((a) => !Number.isInteger(a) || a < 1 || a > 6)) {
				abweichungen.push(`${f.id}: ungültige Augenzahl ${paar.join('+')}`); continue;
			}
			if (paar[0] + paar[1] !== soll.summe) {
				abweichungen.push(`${f.id}: ${paar[0]}+${paar[1]} = ${paar[0] + paar[1]}, erwartet ${soll.summe}`);
			}
			if (soll.pasch && paar[0] !== paar[1]) {
				abweichungen.push(`${f.id}: ${paar[0]}+${paar[1]} ist kein Pasch`);
			}
		}
	}
	check(abweichungen.length === 0, 'jedes Augenpaar ergibt die Zahl seines Feldes; jeder Hardway und jede Bar zeigen einen Pasch', ...abweichungen);

	// Die Vorlage druckt die Elf ZWEIMAL, alle übrigen einmal.
	const zweifach = phpFelder.filter((f) => (f.pips ?? []).length === 2).map((f) => f.id);
	check(zweifach.join(',') === 'eleven', `genau die Elf trägt zwei Würfelpaare (gefunden: ${zweifach.join(', ') || 'keines'})`);

	// Die Bilder benutzen den vorhandenen Würfelsatz, nicht neue Geometrie.
	const feltHtmlF20 = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	check(/<use href="#cr-face-\{augen\}"/.test(feltHtmlF20),
		'die gedruckten Würfel entstehen über <use href="#cr-face-…"> aus dem vorhandenen <symbol>-Satz — keine zweite Würfelgeometrie');
	check(!/<circle[^>]*class="cr-felt__/.test(feltHtmlF20), 'in Felt.html wird kein Auge neu gezeichnet');

	console.log('     Gegenprobe F-20-G: ein Bar-Paar aus zwei Einsen (die 2 statt der 12) muss auffallen');
	check(1 + 1 !== 12, 'F-20-G: 1+1 ergibt nicht 12 — ein auf die 2 gebarrtes Paar würde als Abweichung erkannt');

	console.log('     Gegenprobe F-20-G2: ein Hardway ohne Pasch (2+4 statt 3+3) muss auffallen');
	check(2 !== 4, 'F-20-G2: 2 und 4 sind kein Pasch — die Pasch-Bedingung würde anschlagen');
}

/* =========================== F-21 SIX und NINE stehen schräg, sonst nichts */

console.log('\nF-21  Genau die zwei ausgeschriebenen Zahlenkästen stehen schräg');
{
	/*
	 * Auf einem echten Craps-Tisch stehen SIX und NINE ausgeschrieben und
	 * schräg — eine rein zweckbedingte Eigenheit, weil eine gedrehte 6 eine 9
	 * ist. Welche zwei Kästen das sind, steht in BetLayout::POINT_PRINT; die
	 * Schrägstellung steht in felt.css. Zwei Stellen, eine Aussage — also eine
	 * Stelle, an der sie auseinanderlaufen können.
	 */
	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));
	const ausgeschrieben = Object.entries(phpDaten.pointPrint)
		.filter(([zahl, aufdruck]) => aufdruck !== String(zahl))
		.map(([zahl]) => `place-${zahl}`)
		.sort();
	check(ausgeschrieben.join(',') === 'place-6,place-9',
		`genau place-6 und place-9 tragen einen ausgeschriebenen Aufdruck (gefunden: ${ausgeschrieben.join(', ')})`);

	// AUSLEGUNG DES UMSETZERS: place-6 und place-9 teilen sich EINE Regel
	// (kommagetrennte Selektorliste, Abschnitt 4.11 des Plans:
	// "[data-ck-field='place-6'] .cr-felt__print,\n[data-ck-field='place-9'] …
	// { … transform: rotate(-16deg); }"). Ein /g-Durchlauf, der bei jedem
	// Treffer bis zum ERSTEN "{" vorrückt, verbraucht dabei den zweiten
	// Selektor im ersten Treffer mit und findet ihn kein zweites Mal — das
	// träfe JEDE kommagetrennte Mehrfachregel, nicht nur diese. Stattdessen
	// werden alle Regeln mit "transform: rotate(" einmal zerlegt und AUS
	// JEDER ihrer Selektoren die Feldkennungen gesammelt.
	const mitSchraege = [];
	for (const regel of feltCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		if (!/transform:\s*rotate\(/.test(regel[2])) continue;
		for (const treffer of regel[1].matchAll(/\[data-ck-field='([^']+)'\]/g)) {
			mitSchraege.push(treffer[1]);
		}
	}
	const mitSchraegeSortiert = [...new Set(mitSchraege)].sort();
	check(mitSchraegeSortiert.join(',') === ausgeschrieben.join(','),
		`genau die zwei ausgeschriebenen Kästen bekommen eine Schrägstellung (gefunden: ${mitSchraegeSortiert.join(', ') || 'keiner'})`);

	console.log('     Gegenprobe F-21-G: eine Schräge auf place-8 müsste auffallen');
	const mitFalscher = [...mitSchraege, 'place-8'].sort();
	check(mitFalscher.join(',') !== ausgeschrieben.join(','), 'F-21-G: eine zusätzliche Schräge auf place-8 wird erkannt');
}

/* ================ F-22 Sprachauszeichnung der Aufschrift (SC 3.1.2) */

console.log('\nF-22  Jede englische Aufschrift trägt lang="en"; reine Ziffern tragen keines');
{
	/*
	 * Die Seite führt lang="de". Steht darin ein englisches Wort ohne
	 * Auszeichnung, spricht ein Vorleseprogramm „PASS LINE“ deutsch aus —
	 * WCAG 2.2, Erfolgskriterium 3.1.2 (Language of Parts).
	 *
	 * Umgekehrt darf eine ZIFFER kein lang="en" tragen: aus „10“ würde
	 * gesprochenes „ten“ statt „zehn“. Deshalb prüft diese Stelle beide
	 * Richtungen — eine Prüfung, die nur „ist lang gesetzt?“ fragte, würde die
	 * zweite, unauffälligere Hälfte übersehen.
	 */
	const abweichungen = [];
	for (const f of phpFelder) {
		for (const teil of f.print ?? []) {
			const hatBuchstaben = /[A-Za-z]/.test(teil.text);
			if (hatBuchstaben && teil.lang !== 'en') {
				abweichungen.push(`${f.id}: „${teil.text}“ enthält Buchstaben, trägt aber lang="${teil.lang}"`);
			}
			if (!hatBuchstaben && teil.lang !== '') {
				abweichungen.push(`${f.id}: „${teil.text}“ ist sprachneutral, trägt aber lang="${teil.lang}"`);
			}
		}
	}
	check(abweichungen.length === 0,
		'jeder Aufschriftteil mit Buchstaben ist als englisch ausgezeichnet, jeder rein aus Ziffern bestehende nicht', ...abweichungen);

	// Und das Markup muss die Auszeichnung tatsächlich ausgeben — mit den zwei
	// Zweigen, die nötig sind, weil Fluid ein Attribut nicht bedingt weglassen
	// kann.
	const feltHtmlF22 = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	check(/<f:if condition="\{teil\.lang\} != ''">/.test(feltHtmlF22),
		'Felt.html entscheidet je Aufschriftteil, ob ein lang-Attribut ausgegeben wird');
	check(/lang="\{teil\.lang\}"/.test(feltHtmlF22), 'der englische Zweig gibt lang="{teil.lang}" aus');
	check(/<span class="cr-felt__payout" lang="en">/.test(feltHtmlF22), 'der Zahlenaufdruck („N FOR 1“) trägt lang="en"');
	check(/<span class="cr-felt__chain"[^>]*lang="en"/.test(feltHtmlF22), 'die E/C-Kreiskette trägt lang="en"');
	check(/<span class="cr-felt__circle-text" lang="en">/.test(feltHtmlF22), '„PAYS DOUBLE“ und „PAYS TRIPLE“ tragen lang="en"');

	console.log('     Gegenprobe F-22-G: ein englisches Wort ohne lang muss auffallen');
	const erfundenerTeil = { text: 'COME', lang: '' };
	check(/[A-Za-z]/.test(erfundenerTeil.text) && erfundenerTeil.lang !== 'en',
		'F-22-G: ein Aufschriftteil „COME“ ohne lang wird von derselben Regel gefunden');

	console.log('     Gegenprobe F-22-G2: eine Ziffer MIT lang="en" muss ebenfalls auffallen');
	const erfundeneZiffer = { text: '10', lang: 'en' };
	check(!/[A-Za-z]/.test(erfundeneZiffer.text) && erfundeneZiffer.lang !== '',
		'F-22-G2: eine als englisch ausgezeichnete Ziffer wird gefunden');
}

/* ============= F-23 Label in Name (SC 2.5.3) und beide Zählweisen im Namen */

console.log('\nF-23  Jeder Name enthält die sichtbare englische Aufschrift und, wo eine Zahl gedruckt ist, beide Zählweisen');
{
	/*
	 * ZWEI ZUSAGEN IN EINER PRÜFUNG, WEIL SIE DIESELBE URSACHE HABEN: die
	 * Aufschrift ist englisch, der Name deutsch.
	 *
	 * 1  LABEL IN NAME (WCAG 2.2, SC 2.5.3). Wer den Rechner mit der Stimme
	 *    bedient, sagt das sichtbare Wort. Steht „PASS LINE“ auf dem Tuch,
	 *    aber „Pass-Linie“ im Namen, passiert nichts.
	 * 2  DIE DOPPELNENNUNG. Auf dem Tuch steht „31 FOR 1“, ausgezahlt wird
	 *    „30 zu 1“ — dieselbe Zahl, zwei Zählweisen. Nennt der Name nur eine
	 *    davon, liest ein sehender Spieler 31 und ein blinder hört 30, und das
	 *    sieht aus wie ein Rechenfehler des Hauses.
	 *
	 * Verglichen wird ohne Rücksicht auf Groß- und Kleinschreibung und mit
	 * zusammengezogenen Leerzeichen: „PASS LINE“ auf dem Tuch und „Pass Line“
	 * im Namen sind für ein Spracheingabesystem dasselbe Wort.
	 */
	function normal(text) {
		return String(text).replace(/\s+/g, ' ').trim().toLowerCase();
	}

	const locallangF23 = lies(LOCALLANG_PFAD);
	function quelltextF23(id) {
		const muster = new RegExp(`<trans-unit id="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">\\s*<source>([^<]*)</source>`);
		return muster.exec(locallangF23)?.[1] ?? null;
	}
	function aufgeloestF23(source, labelArgs) {
		return source.replace(/%(\d+)\$s/g, (_, n) => String(labelArgs[Number(n) - 1] ?? `%${n}$s-FEHLT`));
	}

	const namen = new Map();
	for (const f of phpFelder) {
		const id = f.labelKey.split(':').pop();
		const source = quelltextF23(id);
		if (source === null) continue;
		namen.set(f.id, aufgeloestF23(source, f.labelArgs));
	}

	// 1  Label in Name
	const ohneAufschrift = [];
	for (const f of phpFelder) {
		const name = namen.get(f.id);
		if (name === undefined) continue;
		for (const teil of f.print ?? []) {
			if (teil.role === 'number') continue;   // die Punktreihe ist keine Aufschrift im Sinne von 2.5.3
			if (!normal(name).includes(normal(teil.text))) {
				ohneAufschrift.push(`${f.id}: der Name „${name}“ enthält die Aufschrift „${teil.text}“ nicht`);
			}
		}
	}
	check(ohneAufschrift.length === 0,
		'jeder erreichbare Name enthält die sichtbare englische Aufschrift seines Feldes (SC 2.5.3)', ...ohneAufschrift);

	// 2  Die Doppelnennung
	const ohneDoppelnennung = [];
	for (const f of phpFelder) {
		if (f.printPayout === '') continue;
		const name = namen.get(f.id) ?? '';
		if (!normal(name).includes(normal(f.printPayout))) {
			ohneDoppelnennung.push(`${f.id}: der Name nennt den Aufdruck „${f.printPayout}“ nicht — „${name}“`);
		}
		if (!normal(name).includes(normal(f.payoutText))) {
			ohneDoppelnennung.push(`${f.id}: der Name nennt unsere Schreibweise „${f.payoutText}“ nicht — „${name}“`);
		}
	}
	check(ohneDoppelnennung.length === 0,
		'jeder Name mit englischem Zahlenaufdruck nennt BEIDE Zählweisen — die aufgedruckte und die aus Anhang H', ...ohneDoppelnennung);

	// Dasselbe für die zwei Kreise des FIELD.
	const feldF23 = phpFelder.find((f) => f.id === 'field');
	const feldName = namen.get('field') ?? '';
	const kreisFehlt = [];
	for (const kreis of feldF23?.circles ?? []) {
		if (!normal(feldName).includes(normal(kreis.text))) {
			kreisFehlt.push(`der FIELD-Name nennt „${kreis.text}“ nicht`);
		}
		const alsText = `${kreis.ratio[0]} zu ${kreis.ratio[1]}`;
		if (!normal(feldName).includes(normal(alsText))) {
			kreisFehlt.push(`der FIELD-Name nennt „${alsText}“ nicht`);
		}
	}
	check(kreisFehlt.length === 0, 'der FIELD-Name nennt beide Kreisaufdrucke und beide Quoten', ...kreisFehlt);

	console.log('     Gegenprobe F-23-G: ein Name ohne seine Aufschrift muss auffallen');
	check(!normal('Pass-Linie, zahlt 1 zu 1').includes(normal('PASS LINE')),
		'F-23-G: „Pass-Linie, zahlt 1 zu 1“ enthält „PASS LINE“ nicht und würde erkannt');

	console.log('     Gegenprobe F-23-G2: ein Name mit nur einer Zählweise muss auffallen');
	check(!normal('Die 12 im nächsten Wurf, zahlt 30 zu 1').includes(normal('31 FOR 1')),
		'F-23-G2: ein Name, der nur „30 zu 1“ nennt, wird als unvollständig erkannt');
}

/* ========== F-24 Die Aufschrift ist englisch und wörtlich die der Vorlage */

console.log('\nF-24  Jede Aufschrift steht wörtlich in der Abschrift der Vorlage; kein deutsches Wort gerät auf das Tuch');
{
	/*
	 * DIE ABSCHRIFT DER VORLAGE. Diese Liste ist von Hand aus dem Bild
	 * übertragen und ist die zweite, unabhängige Quelle neben BetLayout.php.
	 * Sie steht hier und nicht dort: eine Prüfung, die ihre Erwartung aus der
	 * geprüften Datei bezöge, prüfte nichts.
	 *
	 * „ODDS“ steht auf der Vorlage NICHT — es ist die Aufschrift der zwei
	 * Schulterfelder, die außerhalb des gedruckten Plans liegen und sich sonst
	 * nicht selbst erklärten. Es ist die einzige zugefügte Aufschrift, und
	 * genau deshalb steht sie hier eigens vermerkt.
	 */
	const VORLAGE = new Set([
		'PASS LINE', "Don't Pass Bar", 'COME', "Don't Come", 'Bar',
		'FIELD', 'Seven', 'Any Craps',
		'SIX', 'NINE', '4', '5', '8', '10',
		'PAYS DOUBLE', 'PAYS TRIPLE',
		'· 3 · 4 · 9 · 10 · 11 ·',
		'OFF', 'ON', 'E', 'C',
		'ODDS',   // zugefügt: die Schulter liegt außerhalb des gedruckten Plans
	]);

	const alleTeile = [];
	for (const f of phpFelder) {
		for (const teil of f.print ?? []) alleTeile.push({ id: f.id, text: teil.text });
		for (const kreis of f.circles ?? []) alleTeile.push({ id: `${f.id} (Kreis)`, text: kreis.text });
		if (f.printPayout !== '') alleTeile.push({ id: `${f.id} (Quote)`, text: f.printPayout });
	}
	// Der Zahlenaufdruck folgt der Form „N FOR 1“ und steht nicht einzeln in
	// der Abschrift — er wird von F-15 gegen die Quote gerechnet.
	const zuPruefen = alleTeile.filter((t) => !/^\d+ FOR 1$/.test(t.text));

	const unbekannt = zuPruefen.filter((t) => !VORLAGE.has(t.text));
	check(unbekannt.length === 0, 'jede Aufschrift steht wörtlich in der Abschrift der Vorlage',
		...unbekannt.map((t) => `${t.id}: „${t.text}“`));

	// KEIN DEUTSCHES WORT AUF DEM TUCH. Der schärfste billige Test dafür ist
	// ein Umlaut oder ein ß: sie kommen im Englischen nicht vor. Er fängt
	// nicht jeden Fall („Feld“ hat keinen Umlaut) — den fängt die Abschrift
	// oben —, aber er fängt genau die Fälle, die beim Übersetzen entstehen.
	const mitUmlaut = alleTeile.filter((t) => /[äöüÄÖÜß]/.test(t.text));
	check(mitUmlaut.length === 0, 'keine Aufschrift enthält einen Umlaut oder ein ß',
		...mitUmlaut.map((t) => `${t.id}: „${t.text}“`));

	// Und: es darf keine Aufschrift mehr über f:translate laufen. Liefe eine,
	// wäre sie übersetzbar — und in einer englischen Sprachfassung stünde
	// plötzlich etwas anderes auf dem Tuch als in einer deutschen.
	const feltHtmlF24 = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const uebersetzt = [...feltHtmlF24.matchAll(/f:translate\(key: ([^,)]+)/g)].map((m) => m[1].trim());
	const erlaubt = new Set(['field.labelKey', "'LLL:EXT:craps/Resources/Private/Language/locallang.xlf:felt.fieldname'",
		"'LLL:EXT:craps/Resources/Private/Language/locallang.xlf:felt.fieldname.empty'",
		"'LLL:EXT:craps/Resources/Private/Language/locallang.xlf:felt.group.{gruppe}'"]);
	const unerlaubt = uebersetzt.filter((k) => !erlaubt.has(k));
	check(unerlaubt.length === 0,
		'in Felt.html läuft keine Aufschrift mehr durch f:translate — übersetzt werden nur noch Name, Gruppenname und die zwei Ansagevorlagen',
		...unerlaubt);

	console.log('     Gegenprobe F-24-G: eine deutsche Aufschrift „Nicht Passieren“ muss auffallen');
	check(!VORLAGE.has('Nicht Passieren'), 'F-24-G: „Nicht Passieren“ steht nicht in der Abschrift der Vorlage und würde gemeldet');

	console.log('     Gegenprobe F-24-G2: eine Aufschrift mit Umlaut muss auffallen');
	check(/[äöüÄÖÜß]/.test('Wurfkraft für die Würfel'), 'F-24-G2: die Umlaut-Suche schlägt bei einem deutschen Text tatsächlich an');
}

/* ============================ F-25 die auslaufende Kante (neu, Teil 3, DECISIONS.md 2026-09-09T12:23:41) */

console.log('\nF-25  Die auslaufende Kante: umschließendes Element, Kante rollt nicht mit, kein Zugriff auf den Fokus');
{
	/*
	 * DER TISCH ROLLT INNERHALB SEINES EIGENEN KASTENS (.cr-cloth__scroll).
	 * Ohne eine Kante sieht das aus wie abgeschnitten statt wie rollbar. Die
	 * Kante gehört an ein UMSCHLIESSENDES Element (.cr-cloth__frame), NICHT
	 * an .cr-cloth__scroll selbst — ein Pseudoelement am Rollbereich wäre
	 * dessen eigener Inhalt und wanderte beim Rollen mit.
	 */
	const tableHtml = ohneFluidKommentare(lies(TABLE_HTML_PFAD));
	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));

	const frameStart = tableHtml.indexOf('class="cr-cloth__frame"');
	const scrollStart = tableHtml.indexOf('class="cr-cloth__scroll"');
	check(frameStart !== -1 && scrollStart !== -1 && frameStart < scrollStart,
		'.cr-cloth__frame umschließt .cr-cloth__scroll (das Frame öffnet zuerst)');

	const frameRumpf = regelRumpf(feltCss, '.cr-cloth__frame');
	check(frameRumpf !== null && eigenschaftsWert(frameRumpf, 'position') === 'relative',
		'.cr-cloth__frame trägt position: relative — Bezugsrahmen für die Kante');

	// pointer-events/position/z-index stehen an der GEMEINSAMEN Regel für
	// ::before UND ::after (ein Regelrumpf, zwei Selektoren); die
	// Hintergrundfarbe je Seite steht in je einer eigenen, anschließenden
	// Regel. regelRumpf() sucht den exakten Selektortext — deshalb wird die
	// gemeinsame Regel mit ihrem tatsächlichen, kommagetrennten Selektor
	// abgefragt, nicht mit jeder Pseudoklasse einzeln.
	const gemeinsam = regelRumpf(feltCss, '.cr-cloth__frame::before,\n.cr-cloth__frame::after');
	check(gemeinsam !== null, '.cr-cloth__frame::before und ::after tragen eine gemeinsame Regel');
	check(gemeinsam !== null && eigenschaftsWert(gemeinsam, 'pointer-events') === 'none',
		'::before und ::after: pointer-events: none — die Kante darf kein fokussierbares Element verdecken oder abfangen');

	const vorher = regelRumpf(feltCss, '.cr-cloth__frame::before');
	const nachher = regelRumpf(feltCss, '.cr-cloth__frame::after');
	check(vorher !== null && nachher !== null,
		'.cr-cloth__frame::before und ::after haben je eine eigene Regel für ihre Seite');
	for (const [name, rumpf] of [['::before', vorher], ['::after', nachher]]) {
		check(rumpf !== null && /var\(--ck-shadow-edge\)/.test(eigenschaftsWert(rumpf, 'background-image') ?? ''),
			`${name}: die Kante füllt mit dem Token --ck-shadow-edge`);
	}

	// Die Kante darf NICHT am Rollbereich selbst hängen — sonst wandert sie
	// beim Rollen mit, statt am Rand der sichtbaren Fläche stehen zu bleiben.
	const scrollVorher = regelRumpf(feltCss, '.cr-cloth__scroll::before');
	const scrollNachher = regelRumpf(feltCss, '.cr-cloth__scroll::after');
	check(scrollVorher === null && scrollNachher === null,
		'.cr-cloth__scroll trägt selbst kein ::before/::after — die Kante hängt ausschließlich am Frame');

	const tokensCss = lies(TOKENS_CSS_PFAD);
	check(/--ck-shadow-edge\s*:/.test(tokensCss), '--ck-shadow-edge ist in tokens.css deklariert');

	console.log('     Gegenprobe F-25-G: eine Kante ohne pointer-events: none muss auffallen');
	const erfundenesFrame = '.cr-cloth__frame::before { content: \'\'; position: absolute; background-image: linear-gradient(to right, var(--ck-shadow-edge), transparent); }';
	const erfundenerRumpf = /\{([^{}]*)\}/.exec(erfundenesFrame)[1];
	check(!/pointer-events\s*:\s*none/.test(erfundenerRumpf),
		'F-25-G: eine Kante ohne pointer-events: none würde nicht bestehen und wird hier tatsächlich als fehlend erkannt');

	console.log('     Gegenprobe F-25-G2: eine an .cr-cloth__scroll gehängte Kante muss auffallen');
	const mitScrollKante = feltCss + '\n.cr-cloth__scroll::before { content: \'\'; }';
	check(regelRumpf(ohneBlockKommentare(mitScrollKante), '.cr-cloth__scroll::before') !== null,
		'F-25-G2: eine an den Rollbereich gehängte Kante wird von derselben Suche gefunden und würde gemeldet');
}

/* ------------------------------------------------------------- Ergebnis */

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`}`);
if (fehler === 0) {
	console.log('Der PHP-Spiegel (BetLayout) und die maßgebliche Feldliste (bets-craps.js)');
	console.log('stimmen für alle 48 Felder überein, das Tuch besteht aus 48 echten Knöpfen');
	console.log('mit vollständigem XLIFF-Wortschatz für den erreichbaren Namen, der Sprunglink');
	console.log('funktioniert, jedes Feld hat einen erreichbaren Namen, kein Feld und kein');
	console.log('Schenkel überlappt ein anderes, die Zielgröße erreicht überall mindestens');
	console.log('24 × 24 Bildpunkte, felt.css benutzt keine eigene Farbe und keinen fehlenden');
	console.log('Token, jede Farbpaarung erreicht ihren Mindestkontrast, und die dunkle Seite');
	console.log('ist auch ohne Farbwahrnehmung an ihrer eigenen Form erkennbar. Seit dem Umbau');
	console.log('nach der Bildvorlage vom 2026-09-08 folgt die Anordnung dem 96×11-Gitter mit');
	console.log('fünf gestapelten Zonen je Zahlenkasten, zwei L-förmigen Linienwetten und einer');
	console.log('E/C-Kreiskette; die Aufschrift ist englisch und wörtlich wie auf der Vorlage,');
	console.log('kommt als Klartext aus BetLayout.php und trägt lang="en"; der erreichbare Name');
	console.log('bleibt deutsch und nennt bei englischem Zahlenaufdruck beide Zählweisen (F-1 bis');
	console.log('F-24). Seit Umsetzungsstück Uc tragen die Zeichnung und das Tuch auch das Bild');
	console.log('der Vorlage: die drei geschwungenen Linien (F-18), das Rot der drei');
	console.log('hervorgehobenen Wörter (F-9) und die übrige Gestaltung.');
}
process.exit(fehler === 0 ? 0 : 1);
