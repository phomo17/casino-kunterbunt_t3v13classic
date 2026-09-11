/**
 * Coin Pusher – Nachweis der Abnahmekriterien von Phase 9, Lauf 1
 * ==================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18.
 *
 * Aufbau (Hilfsfunktion check, Zählung der Fehler, Ausgabe mit ✓/✗) wörtlich
 * wie video_slot/Resources/Private/Scripts/verify-cabinet.mjs.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/coin_pusher/Resources/Private/Scripts/verify-cabinet.mjs
 *
 * Zusätzlich mit der Adresse der Automatenseite – dann wird auch das
 * AUSGELIEFERTE HTML geprüft:
 *
 *   ddev exec node typo3conf/ext/coin_pusher/Resources/Private/Scripts/verify-cabinet.mjs \
 *     https://casino-kunterbunt.ddev.site/coin-pusher
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 *
 * WAS HIER BEWIESEN WIRD (Plan-Abschnitt 4.20)
 * ---------------------------------------------
 *   A-1   keine eigene Farbe
 *   A-2   jeder benutzte Design-Token existiert wirklich
 *   A-3   keine Datei von außen
 *   A-4   casino_startpage kennt den Coin Pusher nicht
 *   A-5   kein fremder Hersteller-, Modell-, Spiel- oder Bauartname
 *   A-6   der Vertrag der Saal-Miniatur ist erfüllt
 *   A-7   jedes Bedienteil hat einen Namen
 *   A-8   die Live-Bereiche werden leer ausgeliefert
 *   A-9   der Haken-Katalog stimmt
 *   A-10  das Sichtfeld hat das Verhältnis der Zeichnung
 *   A-11  keine Konsolenausgabe außer im Zweig „keine sichere Zufallsquelle"
 *   B-1   die Seite antwortet mit 200          (nur mit Adresse)
 *   B-2   das Gerät ist da                     (nur mit Adresse)
 *   B-3   es wird keine Datei von außen geladen (nur mit Adresse)
 */

// @pruefstand abgeschrieben-block=Auftraggeber-Entscheidung 2026-09-11 (DECISIONS.md, 12:50): der Münzschieber ist abgeschrieben, die Extension deaktiviert (extension:deactivate). Block A (Quelltext, oben) bleibt gültig und läuft normal mit. Block B (das ausgelieferte HTML, unten) bekommt deshalb BEWUSST KEIN arg= — es gäbe ohne die aktive Extension ohnehin nie ein echtes .cp-machine-Markup, ein arg= erzeugte also einen garantierten, aber bedeutungslosen roten Fund. Block B bleibt beim eingebauten Selbstüberspringen (Zeile mit @pruefstand:luecke, siehe unten); dieser eine Schlüssel erklärt seine Lücke, ohne Block A abzuschalten.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NEGATIVLISTE, MINDESTLAENGE, musterFuer } from '../../../../casino_startpage/Resources/Private/Scripts/negativliste.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/coin_pusher/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
const SITE = path.join(EXT_ROOT, 'casino_startpage');

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
 * nie - fuer jede Aussage ueber das AUSGELIEFERTE Markup (A-7, A-8) muss es
 * deshalb draussen bleiben.
 */
function ohneKommentare(inhalt) {
	return inhalt.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '');
}

/* ------------------------------------------------------- Dateien der Ext. */

/**
 * Die Dateien, die ausgeliefert werden oder TYPO3 konfigurieren. Das
 * Prüfskript selbst, verify-view.mjs und die README stehen bewusst NICHT
 * darin: alle drei nennen in ihrer Aufrufanleitung eine http-Adresse, und
 * die wäre in A-3 ein Fehlalarm. Die LICENSE ist reiner Text.
 */
const AUSGELIEFERT = alleDateien(EXT).filter((datei) => {
	const rel = path.relative(EXT, datei);
	if (rel.startsWith('Resources/Private/Scripts')) {
		return false;
	}
	return rel !== 'README.md' && rel !== 'LICENSE';
});

/** Dieselbe Liste ohne die beiden Backend-Icons (siehe A-1 und A-3). */
const ICONS = ['Resources/Public/Icons/Extension.svg', 'Resources/Public/Icons/ContentCoinPusher.svg'];
const OHNE_ICONS = AUSGELIEFERT.filter((datei) => !ICONS.includes(path.relative(EXT, datei)));

/**
 * Die Menge, die A-5 tatsächlich gegen die Negativliste prüft: alles
 * Ausgelieferte (OHNE_ICONS) PLUS die README — ohne jede weitere Ausnahme.
 *
 * Bis zur Behebung von Befund Ä-1 (Copyright-Prüfung vom 2026-09-03) filterte
 * A-5 sowohl die README als auch den Physikkern aus Phase 8 (field.js,
 * rng.js, storage.js) heraus, mit der Begründung, sie seien „nicht neu in
 * dieser Phase". Genau diese beiden Ausnahmen haben den siebenfachen
 * Fundstellen-Treffer eines fremden Herstellermodellnamens durchgelassen:
 * der Physikkern nannte ihn bereits seit Phase 8, und die README
 * zusätzlich seit Phase 8 — beide wurden nie geprüft, obwohl beide an ein
 * öffentliches Repository
 * ausgeliefert werden. Eine Prüfung, die ihre eigenen Fundstellen ausblendet,
 * ist schlimmer als keine (Befund B-1 desselben Berichts). Der Maßstab aus
 * V.7 Nr. 5 ist „alles, was tatsächlich veröffentlicht würde" — nicht „was in
 * dieser Phase neu ist". Die beiden Backend-Icons bleiben ausgenommen wie
 * schon in OHNE_ICONS (siehe A-1/A-3): sie können ohnehin keinen Fließtext
 * tragen, der hier zu prüfen wäre.
 */
const GEPRUEFT_A5 = [...OHNE_ICONS, path.join(EXT, 'README.md')];

console.log('\nCoin Pusher – Nachweis der Abnahmekriterien von Phase 9, Lauf 1');
console.log('===================================================================\n');

/* ============================================================= A-1 Farben */

console.log('A-1  Keine eigene Farbe');
{
	// Der Blick zurück auf & schließt HTML-Entitäten wie &#8211; aus.
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
		+ ` (dort stehen ${definiert.size}), insbesondere --ck-copper-200 und --ck-copper-400`,
		...unbekannt.map(([name, datei]) => `${name} – benutzt in ${datei}`));
	check(definiert.has('--ck-copper-200') && definiert.has('--ck-copper-400'),
		'--ck-copper-200 und --ck-copper-400 sind in tokens.css definiert (Plan-Abschnitt 4.1)');
}

/* =========================================== A-3 Keine Datei von außen */

console.log('\nA-3  Keine Datei von außen');
{
	const treffer = [];
	for (const datei of AUSGELIEFERT) {
		const rel = path.relative(EXT, datei);
		const istIcon = ICONS.includes(rel);
		// Kommentare zuerst raus: der Kopfkommentar von Shell.html ZITIERT
		// die verbotenen Muster wörtlich als Warnung an künftige Bearbeiter
		// (V.7, B.3) und würde sich sonst selbst melden.
		for (const zeile of ohneKommentare(lies(datei)).split('\n')) {
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

console.log('\nA-4  casino_startpage kennt den Coin Pusher nicht');
{
	const NAMEN = [/coin_pusher/i, /coin-pusher/i, /coinpusher/i, /coin pusher/i, /CoinPusher/];
	const PRAEFIX = /(^|[^-a-z])cp-[a-z]/;
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
		'keine einzige Nennung des Geräts und kein cp-Präfix im Site Package',
		...treffer);
}

/* ============================================ A-5 Kein fremder Name */

console.log('\nA-5  Kein fremder Hersteller-, Modell-, Spiel- oder Bauartname');
{
	// Struktureller Befund der Copyright-Prüfung roulette vom 2026-09-09:
	// NEGATIVLISTE.length wurde weiter unten nur AUSGEGEBEN, nie GEPRÜFT —
	// eine leere oder halb geschriebene Liste hätte diese Prüfung mit
	// "bestanden" durchlaufen lassen, ohne dass ein einziger Name wirklich
	// geprüft worden wäre. MINDESTLAENGE ist in negativliste.mjs begründet.
	check(NEGATIVLISTE.length >= MINDESTLAENGE,
		`NEGATIVLISTE trägt mindestens ${MINDESTLAENGE} Einträge (tatsächlich`
		+ ` ${NEGATIVLISTE.length}) — sonst liefe diese Prüfung mit einer`
		+ ' leeren oder halb geschriebenen Liste weiter und meldete'
		+ ' fälschlich "bestanden"');

	// Die Negativliste selbst führt seit Befund B-6 der Copyright-Prüfung
	// craps vom 2026-09-09 nur noch EINE Datei für alle acht Geräte:
	// casino_startpage/…/negativliste.mjs (siehe deren Kopfkommentar). Diese
	// Datei hier enthält die Liste nicht mehr wörtlich.
	//
	// Ausnahme für genau eine Datei, namentlich benannt (Befund B-1 der
	// Copyright-Prüfung roulette vom 2026-09-04): der Kopfkommentar von
	// Shell.html ZITIERT die verbotenen Zeichen ©/™/® wörtlich als Warnung
	// an künftige Bearbeiter (V.7, B.3) und würde sich sonst selbst melden.
	// Jede ANDERE Datei — field.js, rng.js, storage.js und alle übrigen
	// Fluid-Partials eingeschlossen — wird als VOLLER Text gelesen,
	// Kommentare eingeschlossen; nur für Shell.html schneidet ohneKommentare()
	// die <f:comment>-Blöcke heraus. Vorher galt dieselbe Ausnahme für die
	// gesamte Extension, nicht nur für diese eine Datei — genau die
	// Verwechslung, die in roulette/verify-cabinet.mjs zu Befund B-1 führte.
	const SHELL_HTML = path.join(EXT, 'Resources/Private/Partials/Automat/CoinPusher/Machine/Shell.html');
	const treffer = [];
	for (const datei of GEPRUEFT_A5) {
		const inhalt = datei === SHELL_HTML ? ohneKommentare(lies(datei)) : lies(datei);
		const inhaltKlein = inhalt.toLowerCase();
		for (const name of NEGATIVLISTE) {
			if (musterFuer(name).test(inhaltKlein)) {
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
		`kein Treffer der Negativliste (${NEGATIVLISTE.length} Namen, geteilt mit den sieben`
		+ ` übrigen Geräten und casino_startpage) und keins der drei Zeichen ©/™/® in`
		+ ` ${GEPRUEFT_A5.length} ausgelieferten Dateien — README und Physikkern eingeschlossen,`
		+ ' mit einer einzigen, namentlichen Ausnahme (Shell.html, siehe oben; Befund B-1 der'
		+ ' Copyright-Prüfung roulette vom 2026-09-04)',
		...treffer);

	console.log('     Gegenprobe A-5-G: dieselbe Prüfung (musterFuer) muss einen gelisteten Namen auch in Versalien und ohne Trennzeichen erkennen');
	// Befund B-3 der Copyright-Prüfung craps vom 2026-09-09: diese sechs
	// Skripte hatten zu ihrer Negativliste bislang GAR KEINE Gegenprobe. Die
	// Gegenprobe benutzt dieselbe musterFuer()-Funktion wie der Hauptlauf
	// oben. Der Testname wird zur LAUFZEIT aus NEGATIVLISTE gewählt (ein
	// mehrwortiger Eintrag aus reinen Buchstaben), statt als eigenes
	// Zeichenkettenliteral in diese Datei geschrieben zu werden — sonst
	// geriete der geschützte Name selbst in den Quelltext dieser Datei und
	// A-5 schlüge gegen die eigene Gegenprobe an. Der erfundene Text testet
	// zugleich Befund B-1: zusammengeschrieben und in Versalien.
	const gegenprobeName = NEGATIVLISTE.find((name) => / /.test(name) && /^[A-Za-z ]+$/.test(name));
	const erfundeneZeile = `Dieser Testtext erwähnt versehentlich ${gegenprobeName.toUpperCase().replace(/ /g, '')} und ${NEGATIVLISTE[0]}.`.toLowerCase();
	const gegenprobeGefunden = NEGATIVLISTE.filter((name) => musterFuer(name).test(erfundeneZeile));
	check(gegenprobeGefunden.length >= 2,
		'A-5-G: sowohl der zusammengeschriebene Versalien-Name als auch der erste Listeneintrag werden erkannt',
		...gegenprobeGefunden);
}

/* ==================================== A-6 Vertrag der Saal-Miniatur */

console.log('\nA-6  Der Vertrag der Saal-Miniatur ist erfüllt');
{
	const cabinet = lies(path.join(EXT, 'Resources/Private/Partials/Automat/CoinPusher/Cabinet.html'));
	const ohneKomm = ohneKommentare(cabinet);

	const spans = [...ohneKomm.matchAll(/<span\b[^>]*\bclass="ck-cabinet[^"]*"/g)];
	check(spans.length === 1, `genau ein Element mit der Klasse ck-cabinet (gefunden: ${spans.length})`);

	const svgs = [...ohneKomm.matchAll(/<svg\b[^>]*\bclass="ck-cabinet__drawing"[^>]*>/g)];
	check(svgs.length === 1, `genau ein svg.ck-cabinet__drawing (gefunden: ${svgs.length})`);

	if (svgs.length === 1) {
		const tag = svgs[0][0];
		check(tag.includes('viewBox="0 0 100 160"'), 'viewBox="0 0 100 160"');
		check(tag.includes('aria-hidden="true"'), 'aria-hidden="true"');
		check(tag.includes('focusable="false"'), 'focusable="false"');
	}

	check(!ohneKomm.includes('<title>'), 'kein <title> in der Miniatur');

	const spanStart = ohneKomm.indexOf('<span');
	const spanEnd = ohneKomm.lastIndexOf('</span>');
	const innerhalb = spanStart !== -1 && spanEnd !== -1 ? ohneKomm.slice(spanStart, spanEnd) : '';
	check(!/<div\b/.test(innerhalb), 'kein <div> innerhalb des <span class="ck-cabinet">');
}

/* ================================= A-7 Jedes Bedienteil hat einen Namen */

console.log('\nA-7  Jedes Bedienteil hat einen Namen');
{
	const dateien = [
		'Resources/Private/Partials/Automat/CoinPusher/Machine/Cabinet.html',
		'Resources/Private/Partials/Automat/CoinPusher/Machine/Button.html',
	];
	const treffer = [];
	let knoepfe = 0;
	let felder = 0;

	for (const rel of dateien) {
		const inhalt = ohneKommentare(lies(path.join(EXT, rel)));

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
			const hatText = /<f:translate|cp-offscreen|>[^<\s][^<]*</.test(inneres);
			if (!hatLabel && !hatText) {
				treffer.push(`${rel}: button ohne erreichbaren Namen – ${kopf.slice(0, 90)}`);
			}
		}

		for (const m of inhalt.matchAll(/<input\b[^>]*>/g)) {
			felder++;
			const kopf = m[0];
			const label = /aria-label="([^"]*)"/.exec(kopf);
			const hatLabel = label !== null && label[1].trim() !== '';
			const davor = inhalt.slice(Math.max(0, m.index - 600), m.index);
			const imLabel = davor.lastIndexOf('<label') > davor.lastIndexOf('</label>')
				&& davor.slice(davor.lastIndexOf('<label')).includes('cp-offscreen');
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

/* ================================ A-8 Live-Bereiche werden leer geliefert */

console.log('\nA-8  Die Live-Bereiche werden leer ausgeliefert');
{
	/*
	 * In den Partials stehen DREI Elemente mit role="status": das
	 * Meldungsschild und das Kassenfenster in Machine/Cabinet.html sowie der
	 * einer Röhrengruppe in Machine/NixieGroup.html. Weil NixieGroup dreimal
	 * gerendert wird, stehen im ausgelieferten HTML FÜNF Live-Bereiche.
	 */
	const ERWARTET_IN_DATEIEN = 3;
	const dateien = [
		'Resources/Private/Partials/Automat/CoinPusher/Machine/Cabinet.html',
		'Resources/Private/Partials/Automat/CoinPusher/Machine/NixieGroup.html',
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
		+ ' im ausgelieferten HTML sind es fünf, weil die Röhrengruppe dreimal steht');
	check(gefuellt.length === 0, 'jeder von ihnen wird leer ausgeliefert', ...gefuellt);
}

/* ========================================== A-9 Der Haken-Katalog stimmt */

console.log('\nA-9  Der Haken-Katalog stimmt');
{
	const css = lies(path.join(EXT, 'Resources/Public/Css/machine.css'));
	const kopfEnde = css.indexOf('*/');
	const kopf = css.slice(0, kopfEnde);
	const regeln = css.slice(kopfEnde + 2);

	const katalogRoh = kopf.slice(kopf.indexOf('DIE HAKEN FÜR SPÄTERE PHASEN'));
	// Eine "Zustandsklasse" wird über JavaScript ein- und ausgeschaltet; ihr
	// Modifikator beginnt deshalb immer mit einem Buchstaben (--on, --shown,
	// --selected, …). Die vier Münzwert-Varianten .cp-value__coin--1/2/5/10
	// sind KEINE Zustandsklassen in diesem Sinn: sie sind permanente,
	// wertabhängige Varianten, die Fluid beim Rendern fest einsetzt und die
	// nie durch JavaScript umgeschaltet werden — dieselbe Unterscheidung, die
	// video_slot/…/Button.html mit seinen unbedingten data-vs-button-Werten
	// trifft, dort aber ohne eigene CSS-Regel je Wert. Der Modifikator-Teil
	// des Musters verlangt deshalb einen Buchstaben als erstes Zeichen.
	const KLASSE = /\.cp-[a-z0-9_-]+--[a-z][a-z0-9-]*/g;
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

	check(kopf.includes('--cp-digit') && regeln.includes('--cp-digit'),
		'--cp-digit: steht im Katalog und hat eine Regel');
}

/* ========================================== A-10 Das Sichtfeld-Verhältnis */

console.log('\nA-10 Das Sichtfeld hat das Verhältnis der Zeichnung');
{
	const css = lies(path.join(EXT, 'Resources/Public/Css/machine.css'));
	const viewJs = lies(path.join(EXT, 'Resources/Public/JavaScript/view.js'));
	const fieldJs = lies(path.join(EXT, 'Resources/Public/JavaScript/field.js'));

	const feldRegel = /\.cp-field\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
	const width = Number(/inline-size:\s*([\d.]+)cqi/.exec(feldRegel)?.[1]);
	const height = Number(/block-size:\s*([\d.]+)cqi/.exec(feldRegel)?.[1]);

	// Die vier Bezugsgrößen werden aus den echten Dateien gelesen, nicht
	// abgeschrieben — genau dieser Abgleich soll ja eine verzerrte
	// Draufsicht verhindern, falls jemand eine der vier Zahlen später ändert.
	const fieldWidth = Number(/export const FIELD_WIDTH = ([\d.]+);/.exec(fieldJs)?.[1]);
	const fieldDepth = Number(/export const FIELD_DEPTH = ([\d.]+);/.exec(fieldJs)?.[1]);
	const marginX = Number(/export const DRAW_MARGIN_X = ([\d.]+);/.exec(viewJs)?.[1]);
	// Seit dem Umbau auf zwei Ebenen (Lauf 1) ist DRAW_TOP kein Literal mehr,
	// sondern eine ABGELEITETE Formel, die genau dieses Verhältnis herstellt
	// (view.js, Abschnitt 4.3 des Plans). Ein einfaches Zahlenliteral wird
	// weiterhin unterstützt (Rückfalllösung), damit dieser Nachweis nicht an
	// eine einzige Schreibweise gebunden ist.
	const drawTopLiteral = /export const DRAW_TOP = ([\d.]+);/.exec(viewJs)?.[1];
	let drawTop;
	if (drawTopLiteral !== undefined) {
		drawTop = Number(drawTopLiteral);
	} else {
		const viewRatioMatch = /export const VIEW_RATIO = ([\d.]+)\s*\/\s*([\d.]+);/.exec(viewJs);
		const viewRatio = viewRatioMatch
			? Number(viewRatioMatch[1]) / Number(viewRatioMatch[2])
			: NaN;
		drawTop = (fieldWidth + 2 * marginX) / viewRatio - fieldDepth;
	}
	const drawWidth = fieldWidth + 2 * marginX;
	const drawHeight = fieldDepth + drawTop;

	const cssRatio = width / height;
	const drawRatio = drawWidth / drawHeight;
	check(Number.isFinite(cssRatio) && Number.isFinite(drawRatio)
		&& Math.abs(cssRatio - drawRatio) < 0.001,
		`.cp-field (${width} × ${height}) und DRAW_WIDTH : DRAW_HEIGHT (${drawWidth} : ${drawHeight})`
		+ ` stimmen auf drei Nachkommastellen überein (${cssRatio.toFixed(3)} = ${drawRatio.toFixed(3)})`);
}

/* ============================================ A-11 Keine Konsolenausgabe */

console.log('\nA-11 Keine Konsolenausgabe');
{
	const jsDir = path.join(EXT, 'Resources/Public/JavaScript');
	const treffer = [];
	for (const datei of alleDateien(jsDir)) {
		const rel = path.relative(EXT, datei);
		if (rel === 'Resources/Public/JavaScript/field.js'
			|| rel === 'Resources/Public/JavaScript/rng.js'
			|| rel === 'Resources/Public/JavaScript/storage.js') {
			// Physikkern, in dieser Phase nicht angefasst und schon durch
			// verify-physics.mjs geprüft.
			continue;
		}
		const inhalt = lies(datei);
		const treffer_console = [...inhalt.matchAll(/console\./g)];
		if (treffer_console.length === 0) {
			continue;
		}
		if (rel === 'Resources/Public/JavaScript/coin-pusher.js') {
			// Genau die eine erlaubte Zeile im Zweig „keine sichere
			// Zufallsquelle" – wie beim Video Slot.
			if (treffer_console.length === 1 && inhalt.includes('console.error(')) {
				continue;
			}
		}
		treffer.push(`${kurz(datei)}: ${treffer_console.length} × console.`);
	}
	check(treffer.length === 0,
		'console. kommt in den JS-Modulen dieser Extension nur in coin-pusher.js vor,'
		+ ' und dort nur im Zweig „keine sichere Zufallsquelle"',
		...treffer);
}

/* ============================================ B – das ausgelieferte HTML */

const adresse = process.argv[2];

if (adresse === undefined) {
	console.log('\n@pruefstand:luecke Block B (ausgeliefertes HTML) ungeprüft — kein Argument übergeben');
	console.log('B    Ohne Adresse übersprungen. Für die Prüfung des ausgelieferten');
	console.log('     HTML die Adresse der Automatenseite anhängen, zum Beispiel:');
	console.log('     … verify-cabinet.mjs https://casino-kunterbunt.ddev.site/coin-pusher');
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
		check(html.includes('class="cp-machine ck-room-fill"'),
			'B-2  das Gerät steht auf der Seite (.cp-machine.ck-room-fill)');
		check(zaehle(/data-cp-canvas/g) === 1, `     genau ein data-cp-canvas (${zaehle(/data-cp-canvas/g)})`);
		check(zaehle(/class="cp-nixie"/g) === 11, `     elf cp-nixie (${zaehle(/class="cp-nixie"/g)})`);
		check(zaehle(/data-cp-value=/g) === 4, `     vier data-cp-value (${zaehle(/data-cp-value=/g)})`);
		check(zaehle(/role="status"/g) === 5, `     fünf Live-Bereiche (${zaehle(/role="status"/g)})`);
		check(zaehle(/aria-label=""/g) === 0, `     kein leeres aria-label (${zaehle(/aria-label=""/g)})`);

		const fremd = [];
		const LAEDT_NICHTS = /\brel="(canonical|alternate|prev|next)"/;
		for (const m of html.matchAll(/<link\b[^>]*href="([^"]+)"[^>]*>/g)) {
			if (LAEDT_NICHTS.test(m[0])) {
				continue;
			}
			const ziel = m[1];
			const eigen = /casino_startpage|coin_pusher|video_slot|reel_slot/.test(ziel);
			if (!eigen) {
				fremd.push(`<link> auf ${ziel}`);
			}
		}
		for (const m of html.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g)) {
			if (!/casino_startpage|coin_pusher|video_slot|reel_slot/.test(m[1])) {
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
	+ '\nDesign-Tokens, lädt keine Datei von außen, erfüllt den Vertrag der'
	+ '\nSaal-Miniatur, benennt jedes Bedienteil, liefert seine Live-Bereiche leer'
	+ '\naus — und casino_startpage kennt es nicht.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
