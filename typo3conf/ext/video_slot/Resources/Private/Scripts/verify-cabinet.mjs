/**
 * Video Slot – Nachweis der Abnahmekriterien von Phase 5 und 6
 * ==============================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18.
 *
 * Phase 6 (Teilstück 6d) führt drei Prüfungen nach, weil sich das
 * ausgelieferte Markup ändert, ohne dass sich das Abnahmekriterium selbst
 * ändert:
 *   B-2   fünf Walzen zeigen jetzt 50 statt 3 Leuchtfelder (Zellen), weil
 *         jedes Band zwei Umläufe der 25 Rasterpositionen trägt (5 × 50 =
 *         250 statt 5 × 3 = 15) – sichtbar bleiben weiterhin nur 15.
 *   B-3   TYPO3 13.4 liefert für <f:asset.module> ein
 *         <script type="module" async="async" src="…"> (JavaScriptRenderer)
 *         plus eine inline Import-Map ohne src; die eigenen Skripte des
 *         Geräts (ab Phase 6e) sind kein Fund von außen.
 *   A-12  --vs-reel-pos, --vs-reel-duration und --vs-reel-ease haben seit
 *         Phase 6 eine Regel in machine.css, nicht mehr nur einen Namen im
 *         Katalog.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/video_slot/Resources/Private/Scripts/verify-cabinet.mjs
 *
 * Zusätzlich mit der Adresse der Automatenseite – dann wird auch das
 * AUSGELIEFERTE HTML geprüft:
 *
 *   ddev exec node typo3conf/ext/video_slot/Resources/Private/Scripts/verify-cabinet.mjs \
 *     https://casino-kunterbunt.ddev.site/video-slot
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 *
 * WAS HIER BEWIESEN WIRD (CONCEPT.md B.10, Phase 5)
 * -------------------------------------------------
 * Das Skript ersetzt keinen Blick auf das Gerät – ob es RICHTIG AUSSIEHT,
 * kann kein Skript beantworten. Es macht alles prüfbar, was prüfbar ist, und
 * es läuft nach jeder späteren Änderung wieder:
 *
 *   A-1   keine eigene Farbe (Abnahme 4)
 *   A-2   jeder benutzte Design-Token existiert wirklich
 *   A-3   keine Datei von außen (Abnahme 4)
 *   A-4   casino_startpage kennt den Video Slot nicht (Abnahme 5)
 *   A-5   genau die neun Symbole aus B.8.3, kein BAR
 *   A-6   die sechs übernommenen Symbole sind zeichengleich zum Reel Slot
 *   A-7   Saal-Miniatur und großes Gehäuse zeigen dasselbe
 *   A-8   die Grundstellung ist kein Gewinn
 *   A-9   alle neun Symbole sind gleichzeitig sichtbar
 *   A-10  jedes Bedienteil hat einen Namen
 *   A-11  die Live-Bereiche werden leer ausgeliefert
 *   A-12  der Haken-Katalog stimmt (Abnahme 3)
 *   A-13  Kein fremder Hersteller-, Modell- oder Spieltitel (Negativliste) —
 *         dieselbe Prüfung wie in coin_pusher/roulette/fruit_risk
 *         verify-cabinet.mjs (dort A-5); vorher deckte keine
 *         Negativlisten-Prüfung diese Extension ab
 *   B-1   die Seite antwortet mit 200          (nur mit Adresse)
 *   B-2   das Gerät ist da                     (nur mit Adresse)
 *   B-3   es wird keine Datei von außen geladen (nur mit Adresse)
 *
 * Für A-8, A-9 und A-12 werden PHP- und CSS-Dateien als TEXT gelesen. Das ist
 * Absicht: ein Skript, das dafür PHP starten müsste, liefe nicht mehr mit
 * einem einzigen node-Aufruf, und die geprüften Stellen sind einfache
 * Literale.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/video_slot/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
const REEL = path.join(EXT_ROOT, 'reel_slot');
const SITE = path.join(EXT_ROOT, 'casino_startpage');
/** diese Datei selbst, für die Ausnahme in A-13 */
const DIESE_DATEI = fileURLToPath(import.meta.url);

/* ------------------------------------------------------------------ Gerüst */

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

function kurz(datei) {
	return path.relative(EXT_ROOT, datei);
}

/**
 * Entfernt alle <f:comment>-Bloecke. Was darin steht, erreicht den Browser
 * nie - fuer jede Aussage ueber das AUSGELIEFERTE Markup (A-10, A-11) muss es
 * deshalb draussen bleiben. Sonst meldete ein Kommentar, der ein leeres
 * aria-label als Fehlerbild ZITIERT, genau diesen Fehler.
 */
function ohneKommentare(inhalt) {
	return inhalt.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '');
}

/**
 * Vergleichsform eines SVG-Blocks: Leerraum vereinheitlicht, damit
 * unterschiedliche Einrückung kein Unterschied ist.
 */
function normiert(text) {
	return text.replace(/\s+/g, ' ').trim();
}

/** Holt einen <symbol>-Block mit der gegebenen ID aus einer Datei. */
function symbolBlock(inhalt, id) {
	const start = inhalt.indexOf(`<symbol id="${id}"`);
	if (start === -1) {
		return null;
	}
	const ende = inhalt.indexOf('</symbol>', start);
	return ende === -1 ? null : inhalt.slice(start, ende + '</symbol>'.length);
}

/* ------------------------------------------------- Das Regelwerk als Text */

const RULES_PHP = lies(path.join(EXT, 'Classes/Rules.php'));

/** Die Liste hinter „const SYMBOLS = [ … ];" */
function leseSymbols() {
	const roh = /const SYMBOLS = \[([\s\S]*?)\];/.exec(RULES_PHP);
	return roh === null ? [] : [...roh[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
}

/** Die drei Zeilen hinter „const DEFAULT_GRID = [ … ];", je fünf Symbole. */
function leseGrid() {
	const roh = /const DEFAULT_GRID = \[([\s\S]*?)\];/.exec(RULES_PHP);
	if (roh === null) {
		return [];
	}
	return [...roh[1].matchAll(/\d+\s*=>\s*\[([^\]]*)\]/g)]
		.map((zeile) => [...zeile[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]));
}

/** Die fünf Gewinnlinien hinter „const LINES = [ … ];". */
function leseLines() {
	const roh = /const LINES = \[([\s\S]*?)\];/.exec(RULES_PHP);
	if (roh === null) {
		return [];
	}
	return [...roh[1].matchAll(/(\d+)\s*=>\s*\[([^\]]*)\]/g)]
		.map((zeile) => [...zeile[2].matchAll(/\d+/g)].map((m) => Number(m[0])));
}

const SYMBOLS = leseSymbols();
const GRID = leseGrid();
const LINES = leseLines();

/** Die sechs Motive, die B.8.3 vom Reel Slot übernehmen lässt. */
const UEBERNOMMEN = ['kirsche', 'zitrone', 'orange', 'melone', 'glocke', 'sieben'];

/* ------------------------------------------------------- Dateien der Ext. */

/**
 * Die Dateien, die ausgeliefert werden oder TYPO3 konfigurieren. Das
 * Prüfskript selbst und die README stehen bewusst NICHT darin: beide nennen
 * in ihrer Aufrufanleitung eine http-Adresse, und die wäre in A-3 ein
 * Fehlalarm. Die LICENSE ist reiner Text.
 */
const AUSGELIEFERT = alleDateien(EXT).filter((datei) => {
	const rel = path.relative(EXT, datei);
	if (rel.startsWith('Resources/Private/Scripts')) {
		return false;
	}
	return rel !== 'README.md' && rel !== 'LICENSE';
});

/** Dieselbe Liste ohne die beiden Backend-Icons (siehe A-1 und A-3). */
const ICONS = ['Resources/Public/Icons/Extension.svg', 'Resources/Public/Icons/ContentVideoSlot.svg'];
const OHNE_ICONS = AUSGELIEFERT.filter((datei) => !ICONS.includes(path.relative(EXT, datei)));

console.log('\nVideo Slot – Nachweis der Abnahmekriterien von Phase 5');
console.log('======================================================\n');

/* ============================================================= A-1 Farben */

console.log('A-1  Keine eigene Farbe (Abnahme 4)');
{
	// Der Blick zurück auf & schließt HTML-Entitäten wie &#8211; aus; ein
	// Verweis wie href="#vs-sym-kirsche" beginnt mit v und ist damit kein Hex.
	const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
	const FUNKTION = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g;
	const treffer = [];
	for (const datei of OHNE_ICONS) {
		const inhalt = lies(datei);
		for (const m of inhalt.matchAll(HEX)) {
			treffer.push(`${kurz(datei)}: ${m[0]}`);
		}
		for (const m of inhalt.matchAll(FUNKTION)) {
			treffer.push(`${kurz(datei)}: ${m[0]}…`);
		}
	}
	check(treffer.length === 0,
		`kein ausgeschriebener Farbwert in ${OHNE_ICONS.length} Dateien`
		+ ' (die beiden Backend-Icons sind ausgenommen: sie stehen außerhalb'
		+ ' des Frontend-Dokuments und können keine Custom Properties benutzen)',
		...treffer);
}

/* ============================================================= A-2 Tokens */

console.log('\nA-2  Alle benutzten Design-Tokens existieren');
{
	const tokensCss = lies(path.join(SITE, 'Resources/Public/Css/tokens.css'));
	const definiert = new Set([...tokensCss.matchAll(/^\s*(--ck-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));
	const benutzt = new Map();
	for (const datei of OHNE_ICONS) {
		for (const m of lies(datei).matchAll(/var\(\s*(--ck-[a-z0-9-]+)/g)) {
			if (!benutzt.has(m[1])) {
				benutzt.set(m[1], kurz(datei));
			}
		}
	}
	const unbekannt = [...benutzt].filter(([name]) => !definiert.has(name));
	check(unbekannt.length === 0,
		`${benutzt.size} benutzte Tokens, alle in casino_startpage/…/tokens.css definiert`
		+ ` (dort stehen ${definiert.size})`,
		...unbekannt.map(([name, datei]) => `${name} – benutzt in ${datei}`));
}

/* =========================================== A-3 Keine Datei von außen */

console.log('\nA-3  Keine Datei von außen (Abnahme 4)');
{
	const treffer = [];
	for (const datei of AUSGELIEFERT) {
		const rel = path.relative(EXT, datei);
		const istIcon = ICONS.includes(rel);
		for (const zeile of lies(datei).split('\n')) {
			// url(#…) und href="#…" verweisen INNERHALB desselben Dokuments.
			const gesaeubert = zeile
				.replace(/url\(#[^)]*\)/g, '')
				.replace(/href="#[^"]*"/g, '');
			const rest = istIcon
				? gesaeubert.replace('http://www.w3.org/2000/svg', '')
				: gesaeubert;
			for (const muster of [/@import/, /url\(/, /src=/, /https?:\/\//, /<img\b/, /@font-face/]) {
				if (muster.test(rest)) {
					treffer.push(`${kurz(datei)}: ${zeile.trim().slice(0, 110)}`);
					break;
				}
			}
		}
	}
	check(treffer.length === 0,
		'kein @import, kein url(…) auf eine Datei, kein src=, keine http-Adresse,'
		+ ' kein <img>, kein @font-face',
		...treffer);
}

/* ============================================================ A-4 Trennung */

console.log('\nA-4  casino_startpage kennt den Video Slot nicht (Abnahme 5)');
{
	const NAMEN = [/video_slot/i, /video-slot/i, /videoslot/i, /video slot/i];
	const PRAEFIX = /(^|[^-a-z])vs-[a-z]/;
	const treffer = [];
	for (const datei of alleDateien(SITE)) {
		const zeilen = lies(datei).split('\n');
		zeilen.forEach((zeile, n) => {
			if (NAMEN.some((m) => m.test(zeile)) || PRAEFIX.test(zeile)) {
				treffer.push(`${kurz(datei)}:${n + 1}: ${zeile.trim().slice(0, 110)}`);
			}
		});
	}
	check(treffer.length === 0,
		'keine einzige Nennung des Geräts und kein vs-Präfix im Site Package',
		...treffer);
}

/* ============================================================= A-5 Symbole */

console.log('\nA-5  Genau die neun Symbole aus B.8.3');
{
	const shell = lies(path.join(EXT, 'Resources/Private/Partials/Automat/VideoSlot/Machine/Shell.html'));
	const ids = [...shell.matchAll(/<symbol id="vs-sym-([a-z]+)"/g)].map((m) => m[1]);
	check(SYMBOLS.length === 9, `Rules::SYMBOLS nennt neun Symbole (${SYMBOLS.length})`);
	check(ids.length === 9, `Shell.html definiert neun Symbole (${ids.length})`);
	const fehlend = SYMBOLS.filter((s) => !ids.includes(s));
	const zuviel = ids.filter((s) => !SYMBOLS.includes(s));
	check(fehlend.length === 0 && zuviel.length === 0,
		'die Namen decken sich mit Rules::SYMBOLS',
		...fehlend.map((s) => `fehlt in Shell.html: ${s}`),
		...zuviel.map((s) => `steht zusätzlich in Shell.html: ${s}`));
	check(!shell.includes('vs-sym-bar'),
		'kein BAR-Block – der bleibt dem Reel Slot vorbehalten (B.8.3)');
}

/* ================================== A-6 Die sechs übernommenen Symbole */

console.log('\nA-6  Die sechs übernommenen Symbole sind zeichengleich zum Reel Slot');
{
	const meins = lies(path.join(EXT, 'Resources/Private/Partials/Automat/VideoSlot/Machine/Shell.html'));
	const seins = lies(path.join(REEL, 'Resources/Private/Partials/Automat/ReelSlot/Machine/Shell.html'));
	for (const name of UEBERNOMMEN) {
		const a = symbolBlock(meins, `vs-sym-${name}`);
		const b = symbolBlock(seins, `rs-sym-${name}`);
		const gleich = a !== null && b !== null
			&& normiert(a.replace('vs-sym-', 'rs-sym-')) === normiert(b);
		check(gleich, `${name}`);
	}
}

/* =============================== A-7 Miniatur und großes Gehäuse */

console.log('\nA-7  Saal-Miniatur und großes Gehäuse zeigen dasselbe');
{
	const gross = lies(path.join(EXT, 'Resources/Private/Partials/Automat/VideoSlot/Machine/Shell.html'));
	const mini = lies(path.join(EXT, 'Resources/Private/Partials/Automat/VideoSlot/Cabinet.html'));
	const abweichend = [];
	for (const name of SYMBOLS) {
		const a = symbolBlock(mini, `vs-mini-${name}`);
		const b = symbolBlock(gross, `vs-sym-${name}`);
		if (a === null || b === null || normiert(a.replace('vs-mini-', 'vs-sym-')) !== normiert(b)) {
			abweichend.push(name);
		}
	}
	check(abweichend.length === 0,
		'alle neun Definitionen der Miniatur sind zeichengleich zur großen Fassung',
		...abweichend.map((n) => `weicht ab oder fehlt: vs-mini-${n}`));

	const gezeigt = [...mini.matchAll(/href="#vs-mini-([a-z]+)"/g)].map((m) => m[1]);
	const erwartet = GRID.flat();
	check(gezeigt.length === erwartet.length && gezeigt.every((s, i) => s === erwartet[i]),
		`die Miniatur zeigt die ${erwartet.length} Symbole der Grundstellung in derselben Reihenfolge`,
		`Miniatur:      ${gezeigt.join(' ')}`,
		`DEFAULT_GRID:  ${erwartet.join(' ')}`);
}

/* ================================ A-8 Die Grundstellung ist kein Gewinn */

console.log('\nA-8  Die Grundstellung ist kein Gewinn');
{
	check(GRID.length === 3 && GRID.every((z) => z.length === 5),
		`DEFAULT_GRID ist 3 × 5 (${GRID.length} Zeilen)`);
	check(LINES.length === 5, `Rules::LINES nennt fünf Linien (${LINES.length})`);

	const zuLang = [];
	LINES.forEach((zeilen, i) => {
		const erstes = GRID[zeilen[0]][0];
		let kette = 1;
		while (kette < 5 && GRID[zeilen[kette]][kette] === erstes) {
			kette++;
		}
		if (kette > 1) {
			zuLang.push(`Linie ${i + 1}: ${kette} × ${erstes} ab Walze 1`);
		}
	});
	check(zuLang.length === 0,
		'auf keiner der fünf Linien stehen ab Walze 1 zwei gleiche Symbole – auch nicht bei der Kirsche',
		...zuLang);

	const scatter = GRID.flat().filter((s) => s === 'scatter').length;
	check(scatter <= 2, `der Scatter liegt höchstens zweimal im Feld (${scatter} ×)`);
}

/* ============================ A-9 Alle neun Symbole gleichzeitig sichtbar */

console.log('\nA-9  Alle neun Symbole sind gleichzeitig sichtbar');
{
	const imFeld = new Set(GRID.flat());
	const fehlend = SYMBOLS.filter((s) => !imFeld.has(s));
	check(fehlend.length === 0,
		`alle ${SYMBOLS.length} Symbole liegen zugleich im Sichtfeld`,
		...fehlend.map((s) => `fehlt in der Grundstellung: ${s}`));
}

/* ================================= A-10 Jedes Bedienteil hat einen Namen */

console.log('\nA-10 Jedes Bedienteil hat einen Namen');
{
	const dateien = [
		'Resources/Private/Partials/Automat/VideoSlot/Machine/Cabinet.html',
		'Resources/Private/Partials/Automat/VideoSlot/Machine/Grid.html',
		'Resources/Private/Partials/Automat/VideoSlot/Machine/Button.html',
	];
	const treffer = [];
	let knoepfe = 0;
	let felder = 0;

	for (const rel of dateien) {
		const inhalt = ohneKommentare(lies(path.join(EXT, rel)));

		// Ein leeres aria-label überschreibt den sichtbaren Namen mit nichts.
		for (const m of inhalt.matchAll(/aria-label="\s*"/g)) {
			treffer.push(`${rel}: leeres aria-label an Position ${m.index}`);
		}

		for (const m of inhalt.matchAll(/<button\b[^>]*>/g)) {
			knoepfe++;
			const kopf = m[0];
			const schluss = inhalt.indexOf('</button>', m.index);
			const inneres = schluss === -1 ? '' : inhalt.slice(m.index + kopf.length, schluss);
			const label = /aria-label="([^"]*)"/.exec(kopf);
			const hatLabel = label !== null && label[1].trim() !== '';
			const hatText = /<f:translate|vs-offscreen|>[^<\s][^<]*</.test(inneres);
			if (!hatLabel && !hatText) {
				treffer.push(`${rel}: button ohne erreichbaren Namen – ${kopf.slice(0, 90)}`);
			}
		}

		for (const m of inhalt.matchAll(/<input\b[^>]*>/g)) {
			felder++;
			const kopf = m[0];
			const label = /aria-label="([^"]*)"/.exec(kopf);
			const hatLabel = label !== null && label[1].trim() !== '';
			// Sonst muss es in einem <label> stehen, das eine unsichtbare
			// Beschriftung trägt.
			const davor = inhalt.slice(Math.max(0, m.index - 600), m.index);
			const imLabel = davor.lastIndexOf('<label') > davor.lastIndexOf('</label>')
				&& davor.slice(davor.lastIndexOf('<label')).includes('vs-offscreen');
			if (!hatLabel && !imLabel) {
				treffer.push(`${rel}: input ohne Beschriftung – ${kopf.slice(0, 90)}`);
			}
		}
	}

	check(treffer.length === 0,
		`${knoepfe} Schaltflächen und ${felder} Eingabefelder, jedes mit erreichbarem Namen,`
		+ ' und kein einziges leeres aria-label',
		...treffer);
}

/* ================================ A-11 Live-Bereiche werden leer geliefert */

console.log('\nA-11 Die Live-Bereiche werden leer ausgeliefert');
{
	/*
	 * In den Partials stehen VIER Elemente mit role="status": das
	 * Meldungsschild und das Kassenfenster in Machine/Cabinet.html, der
	 * Ansagebereich des Sichtfelds in Machine/Grid.html und der einer
	 * Röhrengruppe in Machine/NixieGroup.html. Weil NixieGroup viermal
	 * gerendert wird, stehen im ausgelieferten HTML SIEBEN Live-Bereiche.
	 */
	const ERWARTET_IN_DATEIEN = 4;
	const dateien = [
		'Resources/Private/Partials/Automat/VideoSlot/Machine/Cabinet.html',
		'Resources/Private/Partials/Automat/VideoSlot/Machine/Grid.html',
		'Resources/Private/Partials/Automat/VideoSlot/Machine/NixieGroup.html',
	];
	let gefunden = 0;
	const gefuellt = [];

	for (const rel of dateien) {
		const inhalt = ohneKommentare(lies(path.join(EXT, rel)));
		for (const m of inhalt.matchAll(/<(p|span|div)\b[^>]*role="status"[^>]*>/g)) {
			gefunden++;
			const tag = m[1];
			const start = m.index + m[0].length;
			const schluss = inhalt.indexOf(`</${tag}>`, start);
			const inneres = schluss === -1 ? '(kein Endtag)' : inhalt.slice(start, schluss);
			if (inneres.trim() !== '') {
				gefuellt.push(`${rel}: role="status" ist nicht leer – ${inneres.trim().slice(0, 80)}`);
			}
		}
	}

	check(gefunden === ERWARTET_IN_DATEIEN,
		`${ERWARTET_IN_DATEIEN} Live-Bereiche in den Partials (gefunden: ${gefunden});`
		+ ' im ausgelieferten HTML sind es sieben, weil die Röhrengruppe viermal steht');
	check(gefuellt.length === 0, 'jeder von ihnen wird leer ausgeliefert', ...gefuellt);
}

/* ========================================== A-12 Der Haken-Katalog stimmt */

console.log('\nA-12 Der Haken-Katalog stimmt (Abnahme 3)');
{
	const css = lies(path.join(EXT, 'Resources/Public/Css/machine.css'));
	const kopfEnde = css.indexOf('*/');
	const kopf = css.slice(0, kopfEnde);
	const regeln = css.slice(kopfEnde + 2);

	const katalogRoh = kopf.slice(kopf.indexOf('DIE HAKEN FÜR SPÄTERE PHASEN'));
	const KLASSE = /\.vs-[a-z0-9_-]+--[a-z0-9-]+/g;
	const katalog = new Set([...katalogRoh.matchAll(KLASSE)].map((m) => m[0]));
	const benutzt = new Set([...regeln.matchAll(KLASSE)].map((m) => m[0]));

	const ohneRegel = [...katalog].filter((k) => !benutzt.has(k)).sort();
	const ohneKatalog = [...benutzt].filter((k) => !katalog.has(k)).sort();

	check(ohneRegel.length === 0,
		`jede der ${katalog.size} Klassen aus dem Katalog kommt im Regelteil vor`,
		...ohneRegel.map((k) => `im Katalog, aber ohne Regel: ${k}`));
	check(ohneKatalog.length === 0,
		`jede Zustandsklasse im Regelteil steht auch im Katalog`,
		...ohneKatalog.map((k) => `hat eine Regel, steht aber nicht im Katalog: ${k}`));

	// Die drei Custom Properties, von denen in Phase 5 ausdrücklich nur der
	// Name dastand. Seit Phase 6 (Teilstück 6d, Abschnitt 2 „Das leuchtende
	// Fenster") MÜSSEN sie eine Regel haben – das Band braucht --vs-reel-pos,
	// um überhaupt seine Grundstellung zu zeigen.
	for (const name of ['--vs-reel-pos', '--vs-reel-duration', '--vs-reel-ease']) {
		check(kopf.includes(name) && regeln.includes(name),
			`${name}: steht im Katalog und hat seit Phase 6 eine Regel`);
	}
}

/* ========================================= A-13 Kein fremder Name */

console.log('\nA-13 Kein fremder Hersteller-, Modell- oder Spieltitel');
{
	const NEGATIVLISTE = [
		// Spielautomatenhersteller und Spieltitel (CONCEPT.md B.3 Nr. 4)
		'Novomatic', 'Novomatix', 'Greentube', 'Merkur', 'Gauselmann', 'Bally',
		'Aristocrat', 'IGT', 'Mills', 'Jennings', 'Watling', 'Light & Wonder',
		'Bell-Fruit', 'Sizzling Hot', 'Book of Ra', 'Book of Sand',
		"Lucky Lady's Charm", 'Penny Falls',
		// Rad- und Tischhersteller sowie deren Modell-/Bauteilnamen
		'TCSJohnHuxley', 'John Huxley', 'Cammegh', 'Abbiati', 'Matsui',
		'CTC Holdings', 'Alfastreet', 'Interblock', 'Mercury 360', 'Slingshot',
		'Saturn Glo', 'Garnite', 'EyeBall', 'Velstone', 'Starburst',
		// Chiphersteller
		'Gaming Partners International', 'GPI', 'Paulson', 'Bud Jones',
		'Chipco', 'Dal Negro',
		// Spielbanken und Casinomarken
		'Bellagio', 'Caesars', 'Wynn', 'Venetian', 'MGM', 'Mirage', 'Flamingo',
		'Golden Nugget', 'Tropicana', 'Stardust', 'Riviera', 'Sands', 'Luxor',
		'Harrah', 'Monte Carlo',
		// Live-Casino- und Spielesoftwaremarken
		'Evolution Gaming', 'Playtech', 'Pragmatic Play', 'Microgaming',
		'NetEnt', 'Scientific Games', 'WMS', 'Barcrest', 'Cirsa', 'Konami',
		'All rights reserved',
		// Zusätzlich zu B.3 Nr. 4: geschützte Mechanik-Bezeichnungen aus der
		// Recherche zu diesem Gerät (CONCEPT.md C.14.18). Sie erscheinen
		// nirgends — nicht in sichtbarem Text, nicht in Dateinamen, nicht in
		// CSS-Klassen, nicht in Kommentaren, nicht in Variablennamen. Erfasst
		// sind neben der Marken-Schreibweise auch Klein-, GROSS- und
		// Bindestrich-Schreibweisen, wie ein Name realistisch in einer
		// CSS-Klasse, einem Bezeichner oder einem Kommentar auftauchen würde
		// (Befund C-2 der Copyright-Prüfung vom 2026-09-06; gemessen statt
		// vermutet — keine der Varianten löst einen Fehlalarm im vorhandenen
		// Bestand aus, siehe DECISIONS.md).
		'Megaways', 'MEGAWAYS', 'megaways',
		'Cluster Pays', 'CLUSTER PAYS', 'cluster pays', 'ClusterPays', 'clusterPays', 'cluster-pays',
		'InfiniReels', 'INFINIREELS', 'infinireels', 'Infini Reels', 'infini-reels',
		'Tumbling Reels', 'TUMBLING REELS', 'tumbling reels', 'TumblingReels', 'tumblingReels', 'tumbling-reels',
	];
	// Ausnahme für genau eine Datei: diese Prüfskript-Datei selbst muss die
	// Negativliste als ausführbares JS-Array wörtlich enthalten, um überhaupt
	// gegen sie prüfen zu können — dieselbe Art Ausnahme wie in
	// coin_pusher/roulette/fruit_risk verify-cabinet.mjs (dort A-5).
	const GEPRUEFT_A13 = alleDateien(EXT).filter((d) => d !== DIESE_DATEI);
	const treffer = [];
	for (const datei of GEPRUEFT_A13) {
		// KEIN Kommentar-Ausschnitt hier: A-13 ist die rechtliche Prüfung
		// (CONCEPT.md B.3 Nr. 4, V.7 Nr. 5) und liest deshalb den vollen Text,
		// Kommentare eingeschlossen — ein öffentliches Repository liefert die
		// Quelldateien vollständig mit aus, der Unterschied zwischen Kommentar
		// und sichtbarem Text verschwindet damit.
		const inhalt = lies(datei);
		for (const name of NEGATIVLISTE) {
			if (inhalt.includes(name)) {
				treffer.push(`${kurz(datei)}: „${name}"`);
			}
		}
		for (const zeichen of ['©', '™', '®']) {
			if (inhalt.includes(zeichen)) {
				treffer.push(`${kurz(datei)}: Zeichen „${zeichen}"`);
			}
		}
	}
	check(treffer.length === 0,
		`kein Treffer der Negativliste (${NEGATIVLISTE.length} Namen) und keins`
		+ ' der drei Zeichen ©/™/® in dieser Extension — README eingeschlossen'
		+ ' (Ausnahme: diese Datei selbst, die die Liste als Programmzeile'
		+ ' enthalten muss, um sie zu prüfen)',
		...treffer);
}

/* ============================================ B – das ausgelieferte HTML */

const adresse = process.argv[2];

if (adresse === undefined) {
	console.log('\nB    Ohne Adresse übersprungen. Für die Prüfung des ausgelieferten');
	console.log('     HTML die Adresse der Automatenseite anhängen, zum Beispiel:');
	console.log('     … verify-cabinet.mjs https://casino-kunterbunt.ddev.site/video-slot');
} else {
	console.log(`\nB    Das ausgelieferte HTML von ${adresse}`);
	let html = '';
	let status = 0;
	try {
		const antwort = await fetch(adresse);
		status = antwort.status;
		html = await antwort.text();
	} catch (fehlerObjekt) {
		check(false, 'die Seite ist erreichbar', String(fehlerObjekt));
	}

	check(status === 200, `B-1  die Seite antwortet mit 200 (${status})`);

	if (status === 200) {
		const zaehle = (muster) => (html.match(muster) ?? []).length;
		check(html.includes('class="vs-machine ck-room-fill"'),
			'B-2  das Gerät steht auf der Seite (.vs-machine.ck-room-fill)');
		check(zaehle(/data-vs-reel="/g) === 5, `     fünf Walzen (${zaehle(/data-vs-reel="/g)})`);
		// Seit Phase 6 trägt jedes der fünf Bänder 50 Zellen (zwei Umläufe der
		// 25 Rasterpositionen) statt vorher 3 – sichtbar bleiben weiterhin nur
		// 15, der Rest ist per overflow: clip abgeschnitten.
		check(zaehle(/class="vs-cell"/g) === 250, `     250 Leuchtfelder (${zaehle(/class="vs-cell"/g)})`);
		check(zaehle(/class="vs-payline"/g) === 5, `     fünf Gewinnlinien (${zaehle(/class="vs-payline"/g)})`);
		check(zaehle(/class="vs-nixie"/g) === 15, `     fünfzehn Nixie-Röhren (${zaehle(/class="vs-nixie"/g)})`);
		check(zaehle(/role="status"/g) === 7, `     sieben Live-Bereiche (${zaehle(/role="status"/g)})`);
		check(zaehle(/aria-label=""/g) === 0, `     kein leeres aria-label (${zaehle(/aria-label=""/g)})`);

		const fremd = [];
		// Geprüft wird, ob eine DATEI von außen geladen wird. Nicht jeder <link>
		// lädt etwas: canonical, alternate und die Blätterverweise sind reine
		// Angaben über die Seite und holen nichts. Seit dem Audit-Nachlauf vom
		// 2026-09-02 liefert EXT:seo einen canonical mit — der ist kein Fund.
		const LAEDT_NICHTS = /\brel="(canonical|alternate|prev|next)"/;
		for (const m of html.matchAll(/<link\b[^>]*href="([^"]+)"[^>]*>/g)) {
			if (LAEDT_NICHTS.test(m[0])) {
				continue;
			}
			const ziel = m[1];
			const eigen = /casino_startpage|video_slot|reel_slot/.test(ziel);
			if (!eigen) {
				fremd.push(`<link> auf ${ziel}`);
			}
		}
		// TYPO3 13.4 liefert für <f:asset.module> ein
		// <script type="module" async="async" src="…"> (JavaScriptRenderer::render())
		// plus eine INLINE Import-Map ohne src. Das eigene Skript des Geräts
		// ist deshalb kein Fund, genau wie beim <link>-Test oben.
		for (const m of html.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g)) {
			if (!/casino_startpage|video_slot|reel_slot/.test(m[1])) {
				fremd.push(`<script src> auf ${m[1]}`);
			}
		}
		for (const m of html.matchAll(/<img\b[^>]*>/g)) {
			fremd.push(`<img>: ${m[0].slice(0, 80)}`);
		}
		if (html.includes('@font-face')) {
			fremd.push('@font-face im ausgelieferten HTML');
		}
		check(fremd.length === 0,
			'B-3  außer den eigenen Stylesheets und dem Favicon wird nichts geladen',
			...fremd);
	}
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Das Gerät zeichnet ausschließlich mit'
	+ '\nDesign-Tokens, lädt keine Datei von außen, trägt die neun Symbole aus B.8.3,'
	+ '\nsteht in einer Grundstellung ohne Gewinn, benennt jedes Bedienteil, liefert'
	+ '\nseine Live-Bereiche leer aus — und casino_startpage kennt es nicht.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
