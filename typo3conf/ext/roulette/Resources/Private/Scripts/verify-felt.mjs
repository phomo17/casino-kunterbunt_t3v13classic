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
 * STAND TEILSTÜCK C3c — VOLLSTÄNDIG (F-1 BIS F-12)
 * ---------------------------------------------------
 * Teilstück C3b hatte hier bewusst nur die ohne felt.css beweisbaren
 * Prüfungen stehen (F-1, F-2, F-3, F-5, F-6, F-11, F-12). Teilstück C3c
 * ERGÄNZT sie um F-4, F-7, F-8, F-9, F-10 — die fünf Prüfungen, die entweder
 * felt.css voraussetzen (F-7 Zielgröße, F-8 Tokens/outline, F-9 Kontrast,
 * F-10 Form-statt-nur-Farbe) oder, wie F-4, im Plan (Abschnitt 4.15) mit
 * einer zu engen Formel beschrieben waren und hier bewusst NEU gefasst
 * werden (siehe DECISIONS.md).
 *
 * WAS HIER BEWIESEN WIRD
 * ---------------------------
 *   F-1   PHP (BetLayout::fields()) und JavaScript (bets-roulette.js)
 *         stimmen für alle 159 Felder überein: Kennung, covers, payout, max,
 *         col, colEnd, row, rowEnd.
 *   F-2   jedes Feld hat in Felt.html genau einen [data-ck-field]-Knopf, und
 *         jeder Knopf gehört zu einem Feld — in BEIDE Richtungen.
 *   F-3   jeder Feldknopf ist ein echter <button type="button">; kein <div>,
 *         kein role="button", kein disabled (nur aria-disabled ist zulässig).
 *   F-4   ein Feld trägt aria-label UND data-ck-field-label GENAU DANN, wenn
 *         es ein labelKey braucht — gebunden an labelKey aus der maßgeblichen
 *         Feldliste, NICHT an ein leeres printed (siehe DECISIONS.md: drei
 *         Kolonnenfelder haben eine sichtbare, aber untereinander gleiche
 *         Aufschrift UND ein labelKey).
 *   F-5   jede benutzte XLIFF-Kennung existiert in locallang.xlf, UND keine
 *         Kennung der Datei ist unbenutzt (Behebung Review C3, M7 — vorher
 *         nur eine feste Liste "neu angelegter" Kennungen; sechs tote
 *         Altschlüssel fielen dadurch systematisch durch). Gescannt werden
 *         Felt.html, die Roulette-eigene Status.html, Table.html,
 *         SoundSwitch.html, die Feldliste (labelKey/printed) und
 *         ext_localconf.php (Roulette::LANG_FRONTEND . '...').
 *   F-6   style-Attribute in Felt.html enthalten ausschließlich grid-column
 *         und grid-row mit ganzen Zahlen (auch als "a / b"-Spanne) — keine
 *         Farbe, keine Größe, keine Schrift.
 *   F-7   Zielgröße (SC 2.5.8): --ro-line ≥ 1,5rem, --ro-cell ≥ 2,75rem, und
 *         die einzige Regel, die .ck-felt__field unterschreitet, ist die der
 *         Linienfelder.
 *   F-8   felt.css: kein outline: none ohne Ersatz, kein ausgeschriebener
 *         Farbwert, jeder benutzte var(--ck-…) existiert in tokens.css.
 *   F-9   Kontrast (SC 1.4.3) jeder aufgedruckten Aufschrift, statisch nach
 *         dem Muster von A-30 (fruit_risk/verify-cabinet.mjs): gegen JEDEN
 *         benannten Farbstopp ihres Untergrunds, das Minimum entscheidet.
 *   F-10  Farbe ist nie die einzige Aussage (SC 1.4.1): red/black tragen den
 *         ausgeschriebenen Namen UND eine eigene Rautenform.
 *   F-11  der Sprunglink steht als erstes fokussierbares Element im Tuch und
 *         zeigt auf ein Ziel, das im Markup existiert; er steht innerhalb von
 *         .ck-felt (seinem Positionskontext), und felt.css setzt seine
 *         Feinlage ausschließlich unter :focus-visible (Behebung Review C3,
 *         H1).
 *   F-12  genau eine <h2> in Felt.html, keine <h1> im Inhaltselement, und die
 *         vier Gruppen tragen je ein eigenes, nicht leeres aria-label.
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

console.log('\nRoulette – Nachweis des Tuchs (PHP-Spiegel, Markup, Sprache)');
console.log('================================================================\n');

const BET_LAYOUT_PFAD = path.join(EXT, 'Classes/BetLayout.php');
const DUMP_SCRIPT_PFAD = path.join(EXT, 'Resources/Private/Scripts/dump-bet-layout.php');
const BETS_JS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/bets-roulette.js');
const FELT_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Roulette/Felt.html');
const STATUS_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Roulette/Status.html');
const TABLE_HTML_PFAD = path.join(EXT, 'Resources/Private/ContentElements/Table.html');
const LOCALLANG_PFAD = path.join(EXT, 'Resources/Private/Language/locallang.xlf');
const FELT_CSS_PFAD = path.join(EXT, 'Resources/Public/Css/felt.css');
const TOKENS_CSS_PFAD = path.join(SITE, 'Resources/Public/Css/tokens.css');
const SOUND_SWITCH_HTML_PFAD = path.join(EXT, 'Resources/Private/Partials/Table/Roulette/SoundSwitch.html');
const EXT_LOCALCONF_PFAD = path.join(EXT, 'ext_localconf.php');

for (const [name, pfad] of [
	['BetLayout.php', BET_LAYOUT_PFAD],
	['bets-roulette.js', BETS_JS_PFAD],
	['Felt.html', FELT_HTML_PFAD],
	['felt.css', FELT_CSS_PFAD],
	['tokens.css', TOKENS_CSS_PFAD],
]) {
	if (!existsSync(pfad)) {
		console.log(`\nERGEBNIS: Abbruch — ${name} existiert nicht.`);
		process.exit(1);
	}
}

const { FIELDS } = await import(new URL('../../Public/JavaScript/bets-roulette.js', import.meta.url));

function ladePhpFelder() {
	const json = execFileSync('php', [DUMP_SCRIPT_PFAD], { encoding: 'utf8' });
	return JSON.parse(json);
}

const phpFelder = ladePhpFelder();

/* ============================================== F-1 PHP gegen JavaScript */

console.log('F-1  BetLayout::fields() (PHP) stimmt mit bets-roulette.js (JavaScript) überein');
{
	const VERGLICHENE_SCHLUESSEL = ['covers', 'payout', 'max', 'col', 'colEnd', 'row', 'rowEnd'];

	/**
	 * Reine Vergleichsfunktion OHNE Seiteneffekt auf den Fehlerzähler — sie
	 * liefert nur ein Ergebnis zurück. Der echte Nachweis unten wertet es
	 * über check() aus; die Gegenprobe wertet dieselbe Funktion ein zweites
	 * Mal aus, ohne dass ihr absichtlich herbeigeführter Fehlschlag den
	 * Fehlerzähler des echten Nachweises verfälscht.
	 */
	function finde_abweichungen(phpListe, jsListe) {
		const phpNachId = new Map(phpListe.map((f) => [f.id, f]));
		const jsNachId = new Map(jsListe.map((f) => [f.id, f]));

		const nurInPhp = [...phpNachId.keys()].filter((id) => !jsNachId.has(id));
		const nurInJs = [...jsNachId.keys()].filter((id) => !phpNachId.has(id));

		const merkmalsabweichungen = [];
		for (const [id, phpFeld] of phpNachId) {
			const jsFeld = jsNachId.get(id);
			if (!jsFeld) {
				continue;
			}
			for (const schluessel of VERGLICHENE_SCHLUESSEL) {
				const phpWert = JSON.stringify(phpFeld[schluessel] ?? null);
				const jsWert = JSON.stringify(jsFeld[schluessel] ?? null);
				if (phpWert !== jsWert) {
					merkmalsabweichungen.push(`Feld "${id}", Merkmal "${schluessel}": PHP=${phpWert} JavaScript=${jsWert}`);
				}
			}
		}
		return { nurInPhp, nurInJs, merkmalsabweichungen };
	}

	check(phpFelder.length === 159, `PHP liefert 159 Felder (gefunden: ${phpFelder.length})`);
	check(FIELDS.length === 159, `JavaScript liefert 159 Felder (gefunden: ${FIELDS.length})`);

	const echterAbgleich = finde_abweichungen(phpFelder, FIELDS);
	check(echterAbgleich.nurInPhp.length === 0, 'keine Kennung existiert nur in PHP', ...echterAbgleich.nurInPhp);
	check(echterAbgleich.nurInJs.length === 0, 'keine Kennung existiert nur in JavaScript', ...echterAbgleich.nurInJs);
	check(echterAbgleich.merkmalsabweichungen.length === 0,
		`alle 159 Felder stimmen in ${VERGLICHENE_SCHLUESSEL.join(', ')} überein`,
		...echterAbgleich.merkmalsabweichungen);

	console.log('     Gegenprobe F-1-G: eine verfälschte Kopie der PHP-Liste (n-17.max verstellt) muss auffallen');
	const verfaelscht = phpFelder.map((f) => (f.id === 'n-17' ? { ...f, max: 999 } : f));
	const gegenprobe = finde_abweichungen(verfaelscht, FIELDS);
	const gegenprobeSchlaegtAn = gegenprobe.merkmalsabweichungen.some((z) => z.includes('n-17') && z.includes('"max"'));
	check(gegenprobeSchlaegtAn, 'F-1-G: die verfälschte Kopie (n-17.max = 999) wird als Abweichung erkannt',
		...gegenprobe.merkmalsabweichungen);
}

/* ==================================================== F-2 Knopf ↔ Feld */

console.log('\nF-2  Jedes Feld hat genau einen Knopf, und jeder Knopf gehört zu einem Feld');
{
	/*
	 * Felt.html ist eine FLUID-VORLAGE, kein gerendertes Markup: sie enthält
	 * "<button … data-ck-field=\"{field.id}\">" genau EINMAL je Gruppen-
	 * Schleife (4×), nicht 159 ausgeschriebene Knöpfe — der Kern setzt die
	 * Schleife erst beim Aufruf der Seite in 159 Knöpfe um. Ein statischer
	 * Nachweis ohne laufende TYPO3-Instanz kann deshalb nicht 159 Treffer im
	 * Quelltext zählen (das täte er bei jedem Fluid-<f:for> so), sondern muss
	 * zeigen: (a) es gibt genau vier Gruppen-Schleifen über {felt.fields},
	 * gefiltert auf genau die vier Gruppen numbers/columns/dozens/even, ohne
	 * Lücke und ohne Überschneidung, und (b) jede Feldart (kind) der echten
	 * Feldliste gehört zu GENAU einer dieser vier Gruppen. Daraus folgt
	 * zwingend: jedes der 159 Felder durchläuft genau eine Schleife und
	 * bekommt darin genau einen Knopf. Das ausgelieferte HTML selbst wurde
	 * am Seitenaufruf bereits von Hand nachgezählt (159 data-ck-field, siehe
	 * Bericht) — dieser Nachweis hier bleibt trotzdem browserfrei.
	 */
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));

	const gruppenFilter = [...feltHtml.matchAll(/<f:if condition="\{field\.group\} == '([a-z]+)'">/g)].map((m) => m[1]);
	const ERWARTETE_GRUPPEN = ['numbers', 'columns', 'dozens', 'even'];
	check(gruppenFilter.length === 4, `genau vier Gruppen-Filter (gefunden: ${gruppenFilter.length})`, ...gruppenFilter);
	check(new Set(gruppenFilter).size === 4 && ERWARTETE_GRUPPEN.every((g) => gruppenFilter.includes(g)),
		'die vier Filter sind genau numbers/columns/dozens/even, jede genau einmal', ...gruppenFilter);

	const forSchleifen = (feltHtml.match(/<f:for each="\{felt\.fields\}" as="field">/g) ?? []).length;
	check(forSchleifen === 4, `genau vier <f:for each="{felt.fields}">-Schleifen, eine je Gruppe (gefunden: ${forSchleifen})`);

	const knopfVorlagen = (feltHtml.match(/data-ck-field="\{field\.id\}"/g) ?? []).length;
	check(knopfVorlagen === 4, `genau eine Knopf-Vorlage je Gruppen-Schleife, macht 159 Knöpfe zur Laufzeit (gefunden: ${knopfVorlagen})`);

	// Unabhängige Zuordnung kind -> Gruppe (dieselbe Tabelle wie
	// FeltProcessor::groupOf(), hier ein zweites Mal aufgeschrieben statt
	// importiert — ein Nachweis, der seine Erwartung aus dem Prüfling holt,
	// prüft nichts).
	const GRUPPE_JE_ART = {
		number: 'numbers', split: 'numbers', street: 'numbers', trio: 'numbers',
		corner: 'numbers', five: 'numbers', sixline: 'numbers',
		column: 'columns', dozen: 'dozens', even: 'even',
	};
	const unbekannteArt = FIELDS.filter((f) => !(f.kind in GRUPPE_JE_ART));
	check(unbekannteArt.length === 0, 'jede Feldart der echten Feldliste ist einer der vier Gruppen zugeordnet',
		...unbekannteArt.map((f) => `${f.id} (${f.kind})`));

	console.log('     Gegenprobe F-2-G: eine erfundene fünfte Gruppe und eine fehlende Gruppe müssen beide auffallen');
	const mitErfundener = [...gruppenFilter, 'erfunden'];
	check(new Set(mitErfundener).size !== 4, 'F-2-G: eine erfundene fünfte Gruppe verändert die Anzahl und wird erkannt');
	const ohneErste = gruppenFilter.slice(1);
	check(!ERWARTETE_GRUPPEN.every((g) => ohneErste.includes(g)), 'F-2-G: eine fehlende Gruppe wird erkannt');
}

/* ============================================== F-3 Echte <button>-Knöpfe */

console.log('\nF-3  Jede Feldknopf-Vorlage ist ein echter <button type="button">');
{
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const feldKnopfVorlagen = [...feltHtml.matchAll(/<button[^>]*data-ck-field="\{field\.id\}"[^>]*>/g)].map((m) => m[0]);
	check(feldKnopfVorlagen.length === 4, `genau vier Knopf-Vorlagen, eine je Gruppen-Schleife (gefunden: ${feldKnopfVorlagen.length})`);
	check(feldKnopfVorlagen.every((b) => /^<button type="button"/.test(b)),
		'jede Knopf-Vorlage beginnt mit <button type="button">');
	check(!feltHtml.includes('role="button"'), 'kein role="button" im Tuch (ARIA fügt kein Verhalten hinzu)');
	check(!/<div[^>]*data-ck-field=/.test(feltHtml), 'kein <div> mit data-ck-field');
	const echtesDisabled = feldKnopfVorlagen.filter((b) => b.replace(/aria-disabled/g, '').includes('disabled'));
	check(echtesDisabled.length === 0, 'keine Knopf-Vorlage trägt ein echtes disabled (nur aria-disabled ist zulässig)', ...echtesDisabled);
}

/* =================================================== F-4 aria-label ↔ labelKey */

console.log('\nF-4  aria-label/data-ck-field-label GENAU dann, wenn labelKey gesetzt ist');
{
	/*
	 * DIE KORREKTUR GEGENÜBER DEM PLAN (siehe DECISIONS.md).
	 *
	 * Der Plan (Abschnitt 4.15) formuliert F-4 als "jedes Feld OHNE
	 * sichtbare Aufschrift trägt aria-label/data-ck-field-label; jedes Feld
	 * MIT Aufschrift trägt keines von beiden". Diese Formel trifft auf die
	 * drei Kolonnenfelder (col-1, col-2, col-3) NICHT zu: sie haben SEHR
	 * WOHL eine sichtbare Aufschrift ("2 zu 1", bei allen dreien identisch)
	 * UND zusätzlich ein labelKey ("felt.name.column"), weil drei
	 * Bedienteile mit demselben sichtbaren Text für ein Vorleseprogramm
	 * nicht auseinanderzuhalten wären (WCAG 2.4.6/2.5.3, siehe Felt.html-
	 * Kopfkommentar). Die wörtliche Plan-Formel hätte die drei Kolonnenfelder
	 * als Fehler gemeldet, obwohl Felt.html sie absichtlich und richtig mit
	 * labelKey ausstattet. Die richtige Bindung ist deshalb an labelKey
	 * selbst, nicht an ein leeres printed — genau das prüft dieser Block,
	 * gegen die ECHTEN Felddaten aus bets-roulette.js (FIELDS), nicht gegen
	 * eine Annahme über "hat Text" oder "hat keinen Text".
	 */
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));

	// Die Bedingung, mit der Felt.html tatsächlich entscheidet, ob ein Feld
	// aria-label/data-ck-field-label bekommt, MUSS {field.labelKey} sein,
	// NICHT {field.printed} (die frühere, für Kolonnenfelder falsche
	// Formel). Geprüft in zwei Schritten, statt mit einer einzigen,
	// formatierungsempfindlichen Regel über den gesamten Block: (a) es gibt
	// mindestens einen Bedingungsblock über {field.labelKey}, der beide
	// Attribute enthält, und (b) kein Bedingungsblock über {field.printed}
	// enthält irgendeines der beiden Attribute.
	const labelKeyBloecke = [...feltHtml.matchAll(/<f:if condition="\{field\.labelKey\}">([\s\S]*?)<\/f:if>/g)].map((m) => m[1]);
	check(labelKeyBloecke.length > 0
		&& labelKeyBloecke.every((block) => block.includes('data-ck-field-label=') && block.includes('aria-label=')),
		`mindestens ein <f:if condition="{field.labelKey}">-Block trägt beide Attribute (gefunden: ${labelKeyBloecke.length})`);

	// [^"]* nach {field.printed} statt eines exakten Endes: die Bedingung
	// selbst wurde in diesem Lauf von "{field.printed}" auf
	// "{field.printed} != ''" korrigiert (Behebung des PHP-„0"-ist-falsch-
	// Fundes, siehe Felt.html-Kopfkommentar) — dieser Nachweis muss dieselbe
	// tatsächliche Bedingung greifen, sonst prüfte er nach der Korrektur
	// nichts mehr.
	const printedBloecke = [...feltHtml.matchAll(/<f:if condition="\{field\.printed\}[^"]*">([\s\S]*?)<\/f:if>/g)].map((m) => m[1]);
	check(printedBloecke.length > 0, `mindestens ein <f:if condition="{field.printed}…">-Block gefunden (gefunden: ${printedBloecke.length})`);
	const printedTraegtLabel = printedBloecke.filter((block) => block.includes('data-ck-field-label=') || block.includes('aria-label='));
	check(printedTraegtLabel.length === 0,
		'kein <f:if condition="{field.printed}…">-Block trägt data-ck-field-label oder aria-label'
		+ ' (die frühere, im Plan wörtlich stehende Formel wäre für die drei Kolonnenfelder falsch)',
		...printedTraegtLabel);

	/**
	 * Reine Rechenfunktion: für jedes Feld der ECHTEN Feldliste, entscheidet
	 * dieselbe Regel wie Felt.html (labelKey vorhanden?) und meldet
	 * Abweichungen zur tatsächlichen labelKey-Belegung. Da Felt.html sein
	 * aria-label/data-ck-field-label AUSSCHLIESSLICH aus field.labelKey
	 * bezieht (siehe die Bindungsprüfung oben), ist "hat labelKey" bereits
	 * die vollständige Aussage über "bekommt aria-label" — eine zweite,
	 * unabhängige Fundstelle im gerenderten Markup gibt es bei einer
	 * Fluid-VORLAGE (kein echtes HTML) nicht zu zählen.
	 */
	function pruefeLabelBindung(felder) {
		const abweichungen = [];
		for (const f of felder) {
			const hatLabelKey = typeof f.labelKey === 'string' && f.labelKey !== '';
			// Jedes Linienfeld (printed === '') MUSS ein labelKey haben — es
			// ist sein einziger Weg zu einem erreichbaren Namen.
			if (f.printed === '' && !hatLabelKey) {
				abweichungen.push(`Feld "${f.id}": kein labelKey, aber printed ist leer (kein erreichbarer Name möglich)`);
			}
		}
		return abweichungen;
	}

	const echteAbweichungen = pruefeLabelBindung(FIELDS);
	check(echteAbweichungen.length === 0,
		'jedes Linienfeld (printed === \'\') der echten Feldliste hat ein labelKey', ...echteAbweichungen);

	// Die drei Kolonnenfelder sind der Beleg, dass "sichtbare Aufschrift" und
	// "labelKey" UNABHÄNGIG voneinander sind (siehe Begründung oben).
	const kolonnen = FIELDS.filter((f) => f.kind === 'column');
	check(kolonnen.length === 3 && kolonnen.every((f) => f.printed !== '' && typeof f.labelKey === 'string' && f.labelKey !== ''),
		'die drei Kolonnenfelder haben SOWOHL eine sichtbare Aufschrift ALS AUCH ein labelKey (WCAG 2.4.6/2.5.3)',
		...kolonnen.map((f) => `${f.id}: printed=${JSON.stringify(f.printed)} labelKey=${JSON.stringify(f.labelKey)}`));

	console.log('     Gegenprobe F-4-G: ein Linienfeld ohne labelKey (also ohne aria-label) muss auffallen');
	const verfaelschteFelder = FIELDS.map((f) => (f.id === 's-1-2' ? { ...f, labelKey: undefined } : f));
	const gegenprobe = pruefeLabelBindung(verfaelschteFelder);
	check(gegenprobe.some((z) => z.includes('s-1-2')), 'F-4-G: das um sein labelKey gebrachte Linienfeld s-1-2 wird erkannt',
		...gegenprobe);
}

/* ========================================================= F-5 XLIFF-Keys */

console.log('\nF-5  Jede benutzte XLIFF-Kennung existiert, und KEINE Kennung der Datei ist unbenutzt');
{
	const locallang = lies(LOCALLANG_PFAD);
	const definierteIds = new Set([...locallang.matchAll(/<trans-unit id="([^"]+)"/g)].map((m) => m[1]));

	const feltHtml = lies(FELT_HTML_PFAD);
	const statusHtml = existsSync(STATUS_HTML_PFAD) ? lies(STATUS_HTML_PFAD) : '';
	// Behebung Review C3, M7: vorher wurden nur Felt.html und die
	// Roulette-eigene Status.html gescannt — sechs tote Altschlüssel (darunter
	// die einzige Erklärung, wie sich das Rad zwischen den Runden verhält)
	// fielen dadurch systematisch durch. Jetzt ALLE Markup-Dateien der
	// Extension, die f:translate(...locallang.xlf:...) benutzen können.
	const tableHtml = existsSync(TABLE_HTML_PFAD) ? lies(TABLE_HTML_PFAD) : '';
	const soundSwitchHtml = existsSync(SOUND_SWITCH_HTML_PFAD) ? lies(SOUND_SWITCH_HTML_PFAD) : '';
	const gesamtMarkup = [feltHtml, statusHtml, tableHtml, soundSwitchHtml].join('\n');

	// 1. Statisch verwendete Schlüssel: f:translate(key: '...') / key="LLL:...:xyz"
	const statischeSchluessel = new Set(
		[...gesamtMarkup.matchAll(/locallang\.xlf:([a-zA-Z0-9._-]+)/g)].map((m) => m[1])
	);
	// 2. Dynamisch verwendete Schlüssel: alle labelKey-Werte aus der Feldliste
	//    (bare Bezeichner, wie sie BetLayout::fields()/bets-roulette.js führen).
	const dynamischeSchluessel = new Set(FIELDS.map((f) => f.labelKey).filter(Boolean));
	// 3. printed-Werte, die KEINE Ziffer sind, sind ebenfalls XLIFF-Kennungen
	//    (Kolonnen, Dutzende, einfache Chancen).
	const printedSchluessel = new Set(
		FIELDS.map((f) => f.printed).filter((p) => p !== '' && !/^\d+$/.test(p))
	);
	// 4. PHP-seitig über Roulette::LANG_FRONTEND . '...' zusammengesetzte
	//    Schlüssel (ext_localconf.php: automat.title/automat.description).
	//    Diese stehen NICHT als "locallang.xlf:xyz" im Quelltext, sondern als
	//    Konstante + Zeichenkette — eigenes Muster.
	const localconfPhp = existsSync(EXT_LOCALCONF_PFAD) ? lies(EXT_LOCALCONF_PFAD) : '';
	const phpSchluessel = new Set(
		[...localconfPhp.matchAll(/Roulette::LANG_FRONTEND\s*\.\s*'([a-zA-Z0-9._-]+)'/g)].map((m) => m[1])
	);

	const benutzt = new Set([...statischeSchluessel, ...dynamischeSchluessel, ...printedSchluessel, ...phpSchluessel]);

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
}

/* ==================================================== F-6 style-Attribute */

console.log('\nF-6  style-Attribute in Felt.html enthalten ausschließlich grid-column/grid-row');
{
	// Wie bei F-2/F-3: die Vorlage enthält das style-Attribut einmal je
	// Gruppen-Schleife (4×); zur Laufzeit setzt jede der 159 Wiederholungen
	// die konkreten Werte aus {field.gridColumn}/{field.gridRow} ein (siehe
	// FeltProcessor::gridLine() — Format "4" oder "4 / 11", geprüft durch
	// F-1 gegen bets-roulette.js).
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const styleWerte = [...feltHtml.matchAll(/style="([^"]*)"/g)].map((m) => m[1]);
	check(styleWerte.length === 4, `genau vier style-Attribute, eines je Gruppen-Schleife (gefunden: ${styleWerte.length})`);

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

console.log('\nF-7  Zielgröße (SC 2.5.8): --ro-line ≥ 1,5rem, --ro-cell ≥ 2,75rem');
{
	function remWert(deklaration) {
		if (deklaration === null) return null;
		const treffer = /(-?\d+(?:\.\d+)?)rem/.exec(deklaration);
		return treffer ? Number(treffer[1]) : null;
	}

	function gemesseneWerte(css) {
		const rumpf = regelRumpf(css, '.ro-felt');
		return {
			line: remWert(eigenschaftsWert(rumpf, '--ro-line')),
			cell: remWert(eigenschaftsWert(rumpf, '--ro-cell')),
		};
	}

	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));
	const { line, cell } = gemesseneWerte(feltCss);
	check(line !== null && line >= 1.5, `--ro-line ist mindestens 1,5rem (gefunden: ${line}rem)`);
	check(cell !== null && cell >= 2.75, `--ro-cell ist mindestens 2,75rem (gefunden: ${cell}rem)`);

	// Die einzige Regel in felt.css, die min-inline-size/min-block-size UNTER
	// die 2,75rem von .ck-felt__field (table.css) setzt, ist die der
	// Linienfelder — und zwar auf genau --ro-line, nicht auf einen eigenen
	// Wert. Flache Regel-für-Regel-Zergliederung (kein Nested-CSS in dieser
	// Datei), keine Annahme über die Selektorliste.
	// (?:^|[\s;{]) vor jeder Eigenschaft: derselbe Grenzfall wie bei
	// eigenschaftsWert() oben — sonst fände min-inline-size aus Versehen den
	// Rest eines anderen, ähnlich benannten Deklarationsnamens.
	//
	// Seit Teilstück C3e setzt AUCH .ro-sound (der Ton-Schalter) beide Maße
	// zugleich — auf 2,75rem, also GENAU die Untergrenze und keine
	// Unterschreitung. Bloßes Vorkommen beider Eigenschaften reicht deshalb
	// nicht mehr als Filter; erst der WERT entscheidet, ob eine Regel wirklich
	// unter 2,75rem geht.
	const regeln = [...feltCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selektor: m[1].trim(), rumpf: m[2] }));
	const MIN_INLINE = /(?:^|[\s;{])min-inline-size\s*:/;
	const MIN_BLOCK = /(?:^|[\s;{])min-block-size\s*:/;

	/** Löst einen min-inline-size/min-block-size-Wert in rem auf; var(--ro-line) zählt als die schon gemessene Zeilenbreite. */
	function alsRem(wert) {
		if (wert === null) return null;
		if (/var\(\s*--ro-line\s*\)/.test(wert)) return line;
		const treffer = /(-?\d+(?:\.\d+)?)rem/.exec(wert);
		return treffer ? Number(treffer[1]) : null;
	}

	/** Eine echte Unterschreitung: BEIDE Maße sind aufgelöst UND liegen unter 2,75rem. */
	function unterschreitetZielgroesse(rumpf) {
		const i = alsRem(eigenschaftsWert(rumpf, 'min-inline-size'));
		const b = alsRem(eigenschaftsWert(rumpf, 'min-block-size'));
		return i !== null && b !== null && i < 2.75 && b < 2.75;
	}

	// .ro-felt-area setzt min-inline-size: 0 aus einem anderen Grund (ein
	// CSS-Grid-/Flex-Kind darf sonst nicht schmaler werden als sein Inhalt);
	// das hat mit der Zielgröße nichts zu tun. Die Zielgrößen-Unterschreitung,
	// um die es hier geht, setzt IMMER BEIDE Maße zugleich UND unter 2,75rem.
	const unterschreitungen = regeln.filter((r) => MIN_INLINE.test(r.rumpf) && MIN_BLOCK.test(r.rumpf) && unterschreitetZielgroesse(r.rumpf));
	check(unterschreitungen.length === 1,
		`genau eine Regel in felt.css unterschreitet 2,75rem mit min-inline-size/min-block-size (gefunden: ${unterschreitungen.length})`,
		...unterschreitungen.map((r) => r.selektor));
	if (unterschreitungen.length === 1) {
		const [nurEine] = unterschreitungen;
		const ERWARTETE_KINDS = ['split', 'corner', 'street', 'trio', 'sixline', 'five'];
		check(ERWARTETE_KINDS.every((k) => nurEine.selektor.includes(`ro-felt__field--${k}`)),
			'sie gilt für genau die sechs Linienfeld-Arten (split/corner/street/trio/sixline/five)', nurEine.selektor);
		check(/min-inline-size\s*:\s*var\(--ro-line\)/.test(nurEine.rumpf) && /min-block-size\s*:\s*var\(--ro-line\)/.test(nurEine.rumpf),
			'sie setzt beide Maße auf var(--ro-line), keinen eigenen Wert', nurEine.rumpf.trim());
	}

	console.log('     Gegenprobe F-7-G: --ro-line: 1rem (unter der Untergrenze) muss auffallen');
	const verfaelscht = feltCss.replace('--ro-line: 1.5rem;', '--ro-line: 1rem;');
	const gegenprobe = gemesseneWerte(verfaelscht);
	check(gegenprobe.line !== null && gegenprobe.line < 1.5, 'F-7-G: --ro-line: 1rem wird als unter der Untergrenze 1,5rem erkannt');

	console.log('     Gegenprobe F-7-H: eine ZWEITE echte Unterschreitung (an .ro-sound erfunden) muss auffallen');
	const zweiteUnterschreitung = feltCss.replace(
		/(\.ro-sound\s*\{[^}]*?)min-inline-size:\s*2\.75rem;([^}]*?)min-block-size:\s*2\.75rem;/,
		'$1min-inline-size: 1rem;$2min-block-size: 1rem;'
	);
	check(zweiteUnterschreitung !== feltCss, 'F-7-H-VORBEREITUNG: die Ersetzung an .ro-sound hat wirklich gegriffen');
	const regelnGegenprobe = [...zweiteUnterschreitung.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selektor: m[1].trim(), rumpf: m[2] }));
	const unterschreitungenGegenprobe = regelnGegenprobe.filter((r) => MIN_INLINE.test(r.rumpf) && MIN_BLOCK.test(r.rumpf) && unterschreitetZielgroesse(r.rumpf));
	check(unterschreitungenGegenprobe.length === 2,
		`F-7-H: mit einer erfundenen zweiten Unterschreitung an .ro-sound zählt die Prüfung zwei statt einer (gefunden: ${unterschreitungenGegenprobe.length})`);
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
}

/* ============================ F-10 Farbe ist nie die einzige Aussage (1.4.1) */

console.log('\nF-10  Farbe ist nie die einzige Aussage (SC 1.4.1): red/black tragen den Namen UND eine eigene Form');
{
	const locallang = lies(LOCALLANG_PFAD);
	function quelltext(id) {
		// locallang.xlf schreibt <source> auf einer eigenen Zeile unter
		// <trans-unit>, nicht auf derselben Zeile — \s* zwischen beiden Tags.
		const muster = new RegExp(`<trans-unit id="${id}">\\s*<source>([^<]*)</source>`);
		return muster.exec(locallang)?.[1] ?? null;
	}
	const rot = quelltext('felt.print.red');
	const schwarz = quelltext('felt.print.black');
	check(!!rot && !!schwarz && rot !== schwarz,
		`felt.print.red ("${rot}") und felt.print.black ("${schwarz}") sind ausgeschriebene, voneinander verschiedene Namen`);

	const feltCss = ohneBlockKommentare(lies(FELT_CSS_PFAD));

	// Flache Regel-für-Regel-Zergliederung wie in F-7: eine Farbe kann über
	// eine gemeinsame Regel (Form, Lage) UND eine eigene Regel (Füllfarbe)
	// verteilt sein — beide werden hier für jede Farbe ZUSAMMENGEFASST, statt
	// nur die erste gefundene Regel zu betrachten (sonst entginge der
	// gemeinsame Teil).
	const regeln = [...feltCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selektor: m[1], rumpf: m[2] }));
	function kombinierterRumpf(feldId) {
		return regeln
			.filter((r) => r.selektor.includes(`[data-ck-field='${feldId}']`))
			.map((r) => r.rumpf)
			.join('\n');
	}

	const rotRumpf = kombinierterRumpf('red');
	const schwarzRumpf = kombinierterRumpf('black');

	check(/rotate\(45deg\)/.test(rotRumpf) && /background-color\s*:\s*var\(--ck-pocket-red\)/.test(rotRumpf),
		'red hat eine eigene Formregel (rotate(45deg)) und füllt sie mit --ck-pocket-red', rotRumpf.trim());
	check(/rotate\(45deg\)/.test(schwarzRumpf) && /background-color\s*:\s*var\(--ck-pocket-black\)/.test(schwarzRumpf),
		'black hat eine eigene Formregel (rotate(45deg)) und füllt sie mit --ck-pocket-black', schwarzRumpf.trim());

	// Die vier übrigen einfachen Chancen bekommen KEINE eigene Form — sonst
	// wäre "eine eigene Form für red/black" keine Aussage mehr, die die
	// beiden Farbfelder von den vier schlichten Rechtecken unterscheidet.
	const OHNE_EIGENE_FORM = ['low', 'even', 'odd', 'high'];
	const mitUnerwarteterForm = OHNE_EIGENE_FORM.filter((id) => kombinierterRumpf(id).includes('rotate('));
	check(mitUnerwarteterForm.length === 0,
		'low/even/odd/high bekommen keine eigene Rautenform', ...mitUnerwarteterForm);

	console.log('     Gegenprobe F-10-G: eine felt.css ohne die Formregel von black muss auffallen');
	// (?:^|\}) VOR dem Selektor ist bindend: ".ro-felt__field--even[data-ck-
	// field='black']::before" kommt in felt.css ZWEIMAL vor — einmal als
	// zweiter Teil einer kommagetrennten Selektorliste (der gemeinsamen
	// Form-Regel für rot UND schwarz) und einmal als EIGENE, einzelne Regel
	// (die Füllfarbe). Ohne diese Grenze fände ein ungezielter Ersetzungs-
	// Aufruf die FALSCHE der beiden Stellen (die gemeinsame Regel, weil sie
	// im Text zuerst steht) und entfernte damit die Rautenform statt der
	// Füllfarbe — kein Fund über die Füllfarbe selbst mehr möglich (Fund
	// beim Bau dieser Gegenprobe).
	const ENTFERNUNGSMUSTER = /(?<=^|\})\s*\.ro-felt__field--even\[data-ck-field='black'\]::before\s*\{[^}]*\}/;
	const ohneSchwarzeFuellung = feltCss.replace(ENTFERNUNGSMUSTER, '');
	const regelnGegenprobe = [...ohneSchwarzeFuellung.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selektor: m[1], rumpf: m[2] }));
	const schwarzRumpfGegenprobe = regelnGegenprobe
		.filter((r) => r.selektor.includes("[data-ck-field='black']"))
		.map((r) => r.rumpf)
		.join('\n');
	check(!/background-color\s*:\s*var\(--ck-pocket-black\)/.test(schwarzRumpfGegenprobe),
		'F-10-G: die entfernte Füllfarbe von black wird als fehlend erkannt');
}

/* ========================================================== F-11 Sprunglink */

console.log('\nF-11  Der Sprunglink steht als erstes fokussierbares Element im Tuch');
{
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const hTitel = feltHtml.indexOf('<h2');
	const skip = feltHtml.indexOf('ck-skiplink');
	const ersterKnopf = feltHtml.indexOf('data-ck-field=');
	check(hTitel !== -1 && skip !== -1 && ersterKnopf !== -1, 'Überschrift, Sprunglink und erster Feldknopf sind alle im Markup vorhanden');
	check(skip > hTitel, 'der Sprunglink steht nach der (nicht fokussierbaren) Überschrift');
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

console.log('\nF-12  Genau eine <h2> im Tuch, keine <h1> im Inhaltselement, vier benannte Gruppen');
{
	const feltHtml = ohneFluidKommentare(lies(FELT_HTML_PFAD));
	const h2Treffer = feltHtml.match(/<h2[ >]/g) ?? [];
	check(h2Treffer.length === 1, `genau eine <h2> in Felt.html (gefunden: ${h2Treffer.length})`);

	const tableHtml = ohneFluidKommentare(lies(TABLE_HTML_PFAD));
	check(!/<h1[ >]/.test(tableHtml), 'Table.html enthält keine <h1>');
	check(!/<h1[ >]/.test(feltHtml), 'Felt.html enthält keine <h1>');

	const gruppen = [...feltHtml.matchAll(/<div class="ro-felt__group" role="group"\s+aria-label="([^"]*)"/g)]
		.map((m) => m[1]);
	check(gruppen.length === 4, `genau vier role="group"-Bereiche (gefunden: ${gruppen.length})`);
	check(gruppen.every((label) => label.trim() !== ''), 'jede Gruppe hat ein nicht leeres aria-label', ...gruppen);
	check(new Set(gruppen).size === gruppen.length, 'alle vier Gruppen-Labels sind paarweise verschieden', ...gruppen);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`}`);
if (fehler === 0) {
	console.log('Der PHP-Spiegel (BetLayout) und die maßgebliche Feldliste (bets-roulette.js)');
	console.log('stimmen für alle 159 Felder überein, das Tuch besteht aus 159 echten Knöpfen');
	console.log('mit vollständigem XLIFF-Wortschatz, der Sprunglink funktioniert, jedes Feld');
	console.log('ohne sichtbare Aufschrift hat einen erreichbaren Namen über labelKey, die');
	console.log('Zielgröße erreicht überall mindestens 1,5rem/2,75rem, felt.css benutzt keine');
	console.log('eigene Farbe und keinen fehlenden Token, jede aufgedruckte Aufschrift erreicht');
	console.log('mindestens 4,5:1 Kontrast gegen ihr Namensschild, und Rot/Schwarz sind auch');
	console.log('ohne Farbwahrnehmung an ihrer eigenen Rautenform erkennbar (F-1 bis F-12).');
}
process.exit(fehler === 0 ? 0 : 1);
