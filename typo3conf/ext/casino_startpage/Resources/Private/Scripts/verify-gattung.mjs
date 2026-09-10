/**
 * Casino Kunterbunt – Nachweis der Gerätegattung (Phase C1, Teilstück A)
 * =======================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Laufzeit unter einer Sekunde.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/verify-gattung.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD
 * ----------------------
 *   G-1  Die Gattung kennt genau zwei Fälle mit den Werten automat und tisch
 *   G-2  Jedes gefundene Gerät meldet sich an; nennt es eine Gattung, ist es
 *        eine, die das Enum kennt. Ohne Angabe landet es weiterhin auf
 *        Gattung::Automat — die Rückwärtskompatibilität bleibt bewiesen
 *   G-3  Gattung.php ist vom DI-Container ausgeschlossen
 *   G-4  Die Auswahlliste im Backend ist nach Gattung gruppiert
 *   G-5  Beide Platzhalter-Partials erfüllen den Gehäuse-Vertrag
 *   G-6  Keine ausgeschriebene Farbe außerhalb von tokens.css; jeder benutzte
 *        --ck-Token existiert dort wirklich
 *   G-7  Kein fremder Hersteller-, Modell-, Casino- oder Spieltitel und keins
 *        der Zeichen ©/™/® in irgendeiner Datei dieser Extension
 *   G-8  Keine Datei von außen
 *   G-9  Das Site Package nennt im CODE keine der Geräte-Extensions beim
 *        Namen (Kommentare dürfen ein Spiel benennen, siehe unten)
 *   G-10 Dieselbe Negativliste wie G-7, aber für die nicht ignorierten
 *        Dateien der Projektwurzel (Befund B-4 der Copyright-Prüfung craps
 *        vom 2026-09-08 — weder A-5 noch G-7 reichten bis dorthin)
 *
 * WARUM G-7 UND G-8 HIER STEHEN
 * -----------------------------
 * Die Negativliste lief bisher nur über die Geräte-Extensions. Die eigenen
 * Dateien des Site Packages — README eingeschlossen — waren nie geprüft,
 * obwohl sie genauso veröffentlicht würden (V.7 Nr. 5, Befund B-1 der
 * Copyright-Prüfung vom 2026-09-03: „Eine Prüfung, die ihre eigenen
 * Fundstellen ausblendet, ist schlimmer als keine").
 *
 * VIER ECHTE AUSNAHMEN, ALLE BEGRÜNDET
 * --------------------------------------
 *  a) tokens.css ist von G-6 ausgenommen: es IST die Datei der Farbwerte.
 *  b) Die Icons unter Resources/Public/Icons/ sind von G-6 ausgenommen: sie
 *     stehen außerhalb des Frontend-Dokuments, wo Custom Properties nicht
 *     vererbt werden. Wortgleich zur ICONS-Ausnahme in den Skripten der
 *     Geräte-Extensions.
 *  c) Diese Datei selbst ist von G-9 ausgenommen, weil G-2 die Pfade der
 *     installierten Geräte-Extensions nennen MUSS. Die Ausnahme gilt für
 *     genau eine Datei und wird in der Ausgabe benannt.
 *  d) "https://schema.org" (mit oder ohne Pfad dahinter, z. B.
 *     ".../Game") ist von G-8 ausgenommen, seit dem GEO-Behebungslauf vom
 *     2026-09-05 strukturierte Daten (JSON-LD) ausliefert. Der JSON-LD-
 *     Standard VERLANGT diese Zeichenkette wörtlich als "@context" — der
 *     Browser lädt darüber NICHTS, es ist ein Bezeichner, kein Verweis auf
 *     eine externe Datei. Wortgleiche Überlegung wie die bereits
 *     bestehende Ausnahme für den SVG-Namensraum
 *     "http://www.w3.org/2000/svg" weiter unten in diesem Skript.
 * Von G-7 ist NICHTS ausgenommen — auch die README nicht, auch die
 * Prüfskripte selbst nicht.
 *
 * WARUM G-9 NUR DEN CODE LIEST
 * ----------------------------
 * G-9 stellt eine Architekturfrage: koppelt sich das Site Package an ein
 * bestimmtes Gerät? Eine Kopplung lebt in einem Pfad, einem Bezeichner, einer
 * CSS-Klasse, einem data-Attribut — nie in einem Kommentar. Bis Phase C1 fiel
 * der Unterschied nicht auf, weil die vorhandenen Geräte Kunstnamen aus zwei
 * Wörtern tragen, die in erklärender Prosa ohnehin nichts zu suchen haben. Ab
 * Phase C2 heißt jedes Gerät nach seiner Gattung (CONCEPT.md C.2: „allgemeine
 * Spielnamen, keine Marken einer Firma"), und die geteilten Tisch-Bausteine
 * müssen erklären dürfen, welches Spiel welchen Baustein wofür braucht — genau
 * das steht so in C.3. Ein Wortabgleich über Kommentare könnte „nennt die
 * Extension" und „nennt das Spiel" nicht mehr unterscheiden und würde
 * erzwingen, richtige Erklärungen zu verstümmeln.
 *
 * NICHT betroffen ist G-7: die Negativliste fremder Marken läuft weiterhin
 * über JEDE Zeile, Kommentare eingeschlossen. Das ist die rechtliche Prüfung
 * (CONCEPT.md B.3 Nr. 4, V.7 Nr. 5), und sie wird nicht angetastet.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NEGATIVLISTE, MINDESTLAENGE, musterFuer } from './negativliste.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/casino_startpage/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
/** die Projektwurzel, für G-10 (Befund B-4 der Copyright-Prüfung craps vom 2026-09-08) */
const PROJEKT_WURZEL = path.resolve(EXT_ROOT, '../..');
/** diese Datei selbst, für die Ausnahme in G-9 */
const DIESE_DATEI = fileURLToPath(import.meta.url);

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

/**
 * Entfernt alle <f:comment>-Blöcke. Was darin steht, erreicht den Browser
 * nie – für jede Aussage über das AUSGELIEFERTE Markup muss es deshalb
 * draußen bleiben.
 */
function ohneKommentare(inhalt) {
	return inhalt.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '');
}

/**
 * Entfernt zusätzlich PHP/CSS/JS-Blockkommentare (/* … *\/). Nur für die
 * Farbprüfung G-6 gebraucht: dort stehen in Kopfkommentaren erklärende
 * Zahlen, die wie ein Hex-Farbwert aussehen (ein TYPO3-Feature „#102834")
 * oder ausgeschriebene Kontrastrechnungen in Prosa („rgb(44,10,16)"), ohne
 * dass an dieser Stelle je eine Farbe im Code stünde. Echte Design-Tokens
 * stehen nie in einem Blockkommentar.
 */
function ohneBlockKommentare(inhalt) {
	return ohneKommentare(inhalt).replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Die installierten Geraete-Extensions – ERMITTELT, nicht eingetragen.
 *
 * Warum nicht einfach eine Liste? Weil dieses Skript im Site Package liegt und
 * das Site Package kein Geraet beim Namen kennen darf (G-9, und dieselbe Regel
 * prueft jedes Geraet seinerseits als "Trennung"). Eine eingetragene Liste
 * waere genau die Kopplung, die das Konzept verbietet: bei einem vierten Geraet
 * muesste jemand diese Datei anfassen.
 *
 * Merkmal einer Geraete-Extension: sie liegt neben dem Site Package, hat eine
 * ext_localconf.php, und diese meldet ueber einen Automat(...)-Aufruf ein Geraet
 * an. Damit findet die Pruefung ein viertes Geraet von selbst.
 */
const GERAETE_EXTENSIONS = readdirSync(EXT_ROOT, { withFileTypes: true })
	.filter((e) => e.isDirectory() && path.join(EXT_ROOT, e.name) !== EXT)
	.map((e) => e.name)
	.filter((name) => {
		const datei = path.join(EXT_ROOT, name, 'ext_localconf.php');
		return existsSync(datei) && /new\s+Automat\s*\(/.test(lies(datei));
	})
	.sort();

/**
 * Aus jedem gefundenen Namen die Schreibweisen und das Kuerzel ableiten, unter
 * denen er im Site Package auftauchen koennte: aus "erstes_zweites" werden
 * erstes_zweites, erstes-zweites, ersteszweites, "erstes zweites", ErstesZweites
 * und das Praefix ez-. Auch das steht bewusst nirgends ausgeschrieben.
 */
function schreibweisen(name) {
	const teile = name.split('_');
	const roh = teile.join('');
	const gross = teile.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join('');
	return [
		new RegExp(teile.join('_'), 'i'),
		new RegExp(teile.join('-'), 'i'),
		new RegExp(roh, 'i'),
		new RegExp(teile.join(' '), 'i'),
		new RegExp(gross),
	];
}

/*
 * Das Kürzel-Präfix eines Geräts: aus zwei Wörtern die zwei Anfangsbuchstaben
 * (erstes_zweites → ez), aus EINEM Wort die ersten zwei Buchstaben
 * (roulette → ro). Ein einzelner Buchstabe wäre als Suchmuster wertlos und
 * träfe irgendwann etwas Harmloses.
 */
function kuerzel(name) {
	const teile = name.split('_');
	return teile.length === 1
		? teile[0].slice(0, 2)
		: teile.map((t) => t.charAt(0)).join('');
}

/**
 * Ersetzt einen Fund durch ebenso viele Zeilenumbrüche, damit die
 * Zeilennummern der Fundstellen stimmen bleiben.
 */
function alsLeerzeilen(text) {
	return text.replace(/[^\n]/g, '');
}

/**
 * Schneidet ALLE Kommentararten heraus: <f:comment>, /* … *\/ und // bis
 * Zeilenende. Für G-9 gebraucht — dort wird nach Code gesucht, nicht nach
 * Prosa. Zeilennummern bleiben erhalten.
 */
function ohneAlleKommentare(inhalt) {
	return inhalt
		.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, alsLeerzeilen)
		.replace(/\/\*[\s\S]*?\*\//g, alsLeerzeilen)
		.replace(/\/\/.*$/gm, '');
}

const ALLE = alleDateien(EXT);
const AUSGELIEFERT = ALLE.filter((d) => {
	const rel = path.relative(EXT, d);
	if (rel.startsWith('Resources/Private/Scripts')) {
		return false;
	}
	// README.md und LICENSE sind reiner Fließtext bzw. GPL-Boilerplate, werden
	// nie ins Frontend gerendert und können weder eine Farbe noch eine
	// geladene Ressource enthalten. Wortgleiche Ausnahme wie in den
	// verify-cabinet.mjs der Geräte-Extensions.
	return rel !== 'README.md' && rel !== 'LICENSE';
});
const TOKENS_CSS = path.join(EXT, 'Resources/Public/Css/tokens.css');
const OHNE_ICONS_UND_TOKENS = AUSGELIEFERT.filter((d) =>
	!path.relative(EXT, d).startsWith('Resources/Public/Icons/') && d !== TOKENS_CSS);

/** Das eigene Repository nennen ist kein Nachladen einer fremden Datei. */
function ohneEigeneRepoAdresse(zeile) {
	return zeile.replace(/https?:\/\/github\.com\/phomo17\/casino-kunterbunt[^\s"'<)]*/g, '');
}

console.log('\nCasino Kunterbunt – Nachweis der Gerätegattung (Phase C1, Teilstück A)');
console.log('=======================================================================\n');

/* ============================================================ G-1 Enum */

console.log('G-1  Die Gattung kennt genau zwei Fälle mit den Werten automat und tisch');
{
	const gattung = lies(path.join(EXT, 'Classes/Automat/Gattung.php'));

	check(/enum Gattung: string/.test(gattung), 'enum Gattung: string');

	const faelle = [...gattung.matchAll(/^\s*case\s+(\w+)\s*=\s*'([^']+)';/gm)];
	check(faelle.length === 2, `genau zwei case-Zeilen (gefunden: ${faelle.length})`);

	const werte = faelle.map((m) => m[2]).sort();
	check(werte.length === 2 && werte[0] === 'automat' && werte[1] === 'tisch',
		`die Werte sind automat und tisch (gefunden: ${werte.join(', ')})`);

	check(/function getIcon\(\)/.test(gattung) && /content-casino-automat/.test(gattung)
		&& /content-casino-tisch/.test(gattung),
		'getIcon() nennt beide Icon-Bezeichner');

	check(/function getLabel\(\)/.test(gattung) && /\$this->value/.test(gattung),
		'getLabel() bildet den XLIFF-Verweis aus $this->value');
}

/* ================================================ G-2 Rückwärtskompatibel */

console.log('\nG-2  Jedes gefundene Gerät meldet sich an und nennt höchstens eine gültige Gattung');
{
	const automat = lies(path.join(EXT, 'Classes/Automat/Automat.php'));
	const konstruktor = /public function __construct\(([\s\S]*?)\)\s*\{/.exec(automat)?.[1] ?? '';
	const parameter = konstruktor.split(',').map((z) => z.trim()).filter((z) => z !== '');
	const letzter = parameter[parameter.length - 1] ?? '';

	check(letzter.includes('public Gattung $gattung = Gattung::Automat'),
		`gattung steht als letzter Konstruktorparameter mit Vorgabewert (gefunden: "${letzter}")`);

	/*
	 * Was hier bewiesen wird, ist die RÜCKWÄRTSKOMPATIBILITÄT: ein Gerät, das
	 * "gattung:" nicht nennt, landet auf der Vorgabe. Das steht bereits in der
	 * Prüfung darüber (letzter Konstruktorparameter mit Vorgabewert).
	 *
	 * Bis Phase C1 stand hier zusätzlich, dass KEIN Gerät "gattung:" nennen
	 * darf. Das war richtig, solange es nur Automaten gab, und wird falsch,
	 * sobald das erste Tischspiel steht: ein Tisch MUSS Gattung::Tisch
	 * übergeben (CONCEPT.md C.1 Nr. 1). Geprüft wird deshalb ab jetzt: jedes
	 * gefundene Gerät meldet sich überhaupt an, und wenn es eine Gattung
	 * nennt, dann eine, die das Enum wirklich kennt. Ein Tippfehler
	 * (Gattung::Tische) fällt damit weiter auf, eine gültige Gattung nicht.
	 */
	const gattungsFaelle = [...lies(path.join(EXT, 'Classes/Automat/Gattung.php'))
		.matchAll(/^\s*case\s+(\w+)\s*=/gm)].map((m) => m[1]);

	for (const geraet of GERAETE_EXTENSIONS) {
		const datei = path.join(EXT_ROOT, geraet, 'ext_localconf.php');
		if (!existsSync(datei)) {
			console.log(`  · ${geraet}/ext_localconf.php nicht vorhanden – übersprungen`);
			continue;
		}
		const inhalt = lies(datei);
		check(/new\s+Automat\s*\(/.test(inhalt),
			`${geraet}/ext_localconf.php meldet ein Gerät an`);

		const genannt = [...inhalt.matchAll(/gattung\s*:\s*Gattung::(\w+)/g)].map((m) => m[1]);
		if (genannt.length === 0) {
			check(!/gattung\s*:/.test(inhalt),
				`${geraet}: nennt keine Gattung – landet auf der Vorgabe Automat`);
		} else {
			check(genannt.every((name) => gattungsFaelle.includes(name)),
				`${geraet}: nennt nur Gattungen, die das Enum kennt (${genannt.join(', ')})`);
		}
	}
}

/* ===================================================== G-3 DI-Container */

console.log('\nG-3  Gattung.php ist vom DI-Container ausgeschlossen');
{
	const services = lies(path.join(EXT, 'Configuration/Services.yaml'));
	const exclude = /exclude:\s*'([^']+)'/.exec(services)?.[1] ?? '';
	check(exclude.includes('Gattung.php'), `die exclude-Zeile enthält Gattung.php (gefunden: "${exclude}")`);
}

/* =========================================== G-4 Gruppierte Auswahlliste */

console.log('\nG-4  Die Auswahlliste im Backend ist nach Gattung gruppiert');
{
	const tca = lies(path.join(EXT, 'Configuration/TCA/Overrides/tt_content.php'));
	const gruppen = [...tca.matchAll(/Gattung::(\w+)->value\s*=>/g)].map((m) => m[1]);
	check(gruppen.length === 2, `itemGroups enthält beide Gattungswerte (gefunden: ${gruppen.length})`);

	const provider = lies(path.join(EXT, 'Classes/Backend/FormEngine/AutomatItemsProvider.php'));
	check(/'group'\s*=>\s*\$automat->gattung->value/.test(provider),
		"der Provider setzt 'group' aus der Gattung");
	check(/'icon'\s*=>\s*\$automat->gattung->getIcon\(\)/.test(provider),
		"der Provider setzt 'icon' über getIcon()");

	const gattung = lies(path.join(EXT, 'Classes/Automat/Gattung.php'));
	const faelle = [...gattung.matchAll(/^\s*case\s+\w+\s*=/gm)].length;
	check(gruppen.length === faelle,
		`die Zahl der Gruppen (${gruppen.length}) ist gleich der Zahl der Enum-Fälle (${faelle})`);
}

/* ============================================= G-5 Gehäuse-Vertrag */

console.log('\nG-5  Beide Platzhalter-Partials erfüllen den Gehäuse-Vertrag');
{
	function pruefeGehaeuse(rel, erwarteteViewBox) {
		const inhalt = ohneKommentare(lies(path.join(EXT, rel)));

		const spans = [...inhalt.matchAll(/<span\b[^>]*\bclass="ck-cabinet[^"]*"/g)];
		check(spans.length === 1, `${rel}: genau ein span.ck-cabinet (gefunden: ${spans.length})`);

		const svgs = [...inhalt.matchAll(/<svg\b[^>]*\bclass="ck-cabinet__drawing"[^>]*>/g)];
		check(svgs.length === 1, `${rel}: genau ein svg.ck-cabinet__drawing (gefunden: ${svgs.length})`);

		if (svgs.length === 1) {
			const tag = svgs[0][0];
			check(tag.includes(`viewBox="${erwarteteViewBox}"`), `${rel}: viewBox="${erwarteteViewBox}"`);
			check(tag.includes('aria-hidden="true"'), `${rel}: aria-hidden="true"`);
			check(tag.includes('focusable="false"'), `${rel}: focusable="false"`);
		}

		check(!inhalt.includes('<title>'), `${rel}: kein <title>`);
	}

	pruefeGehaeuse('Resources/Private/PageView/Partials/Hall/CabinetPlaceholder.html', '0 0 100 160');
	pruefeGehaeuse('Resources/Private/PageView/Partials/Hall/TablePlaceholder.html', '0 0 160 100');

	const casinoAutomat = lies(path.join(EXT, 'Resources/Private/ContentElements/CasinoAutomat.html'));
	check(casinoAutomat.includes('Hall/CabinetPlaceholder'), 'CasinoAutomat.html rendert den Automaten-Zweig');
	check(casinoAutomat.includes('Hall/TablePlaceholder'), 'CasinoAutomat.html rendert den Tisch-Zweig');
	check(/ck-slot--\{automat\.gattung\.value\}/.test(casinoAutomat),
		'CasinoAutomat.html setzt ck-slot--{automat.gattung.value}');
}

/* ==================================================== G-6 Design-Tokens */

console.log('\nG-6  Keine ausgeschriebene Farbe außerhalb von tokens.css');
{
	// Der Blick zurück auf & schließt HTML-Entitäten wie &#8211; aus.
	const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
	const FUNKTION = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g;
	const treffer = [];
	for (const datei of OHNE_ICONS_UND_TOKENS) {
		const inhalt = ohneBlockKommentare(lies(datei));
		for (const m of inhalt.matchAll(HEX)) {
			treffer.push(`${kurz(datei)}: ${m[0]}`);
		}
		for (const m of inhalt.matchAll(FUNKTION)) {
			treffer.push(`${kurz(datei)}: ${m[0]}…`);
		}
	}
	check(treffer.length === 0,
		`kein ausgeschriebener Farbwert in ${OHNE_ICONS_UND_TOKENS.length} Dateien`
		+ ' (tokens.css und die Backend-Icons sind ausgenommen; Blockkommentare mit'
		+ ' erklärenden Zahlen — z. B. ein TYPO3-Feature „#102834" oder eine'
		+ ' ausgeschriebene Kontrastrechnung — zählen nicht mit)',
		...treffer);

	const tokensCss = lies(TOKENS_CSS);
	const definiert = new Set([...tokensCss.matchAll(/^\s*(--ck-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));
	const benutzt = new Map();
	for (const datei of OHNE_ICONS_UND_TOKENS) {
		for (const m of lies(datei).matchAll(/var\(\s*(--ck-[a-z0-9-]+)/g)) {
			if (!benutzt.has(m[1])) {
				benutzt.set(m[1], kurz(datei));
			}
		}
	}
	const unbekannt = [...benutzt].filter(([name]) => !definiert.has(name));
	check(unbekannt.length === 0,
		`${benutzt.size} benutzte Tokens, alle in tokens.css definiert (dort stehen ${definiert.size})`,
		...unbekannt.map(([name, datei]) => `${name} – benutzt in ${datei}`));
}

/* ========================================= G-7 Kein fremder Name */

// Die Negativliste selbst führt seit Befund B-6 der Copyright-Prüfung craps
// vom 2026-09-09 nur noch EINE Datei für alle acht Geräte: negativliste.mjs
// im selben Verzeichnis wie dieses Skript (siehe deren Kopfkommentar). Bis
// dahin stand die Liste hier als eigenes, auf Modulebene deklariertes Array,
// damit G-10 sie ohne Zweitabschrift wiederverwenden konnte — eine
// zweite, eigene Kopie hätte genau die Auseinanderlauf-Gefahr aus Befund
// B-2 der Copyright-Prüfung craps vom 2026-09-08 wiederholt. Der Import
// unten löst dasselbe Problem jetzt für alle acht Geräte statt nur für G-7
// und G-10.
const NEGATIVLISTE_PFAD = path.join(EXT, 'Resources/Private/Scripts/negativliste.mjs');

console.log('\nG-7  Kein fremder Hersteller-, Modell-, Casino- oder Spieltitel');
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

	/*
	 * Zwei getrennte, je enge Ausnahmen für zwei verschiedene Dateien:
	 *
	 * 1) negativliste.mjs — wörtlich aus fruit_risk/…/verify-cabinet.mjs
	 *    (Stand F2) übernommen: übersprungen wird nur noch der eine Bereich
	 *    zwischen "export const NEGATIVLISTE = [" und der zugehörigen
	 *    schließenden "];" — er muss die Liste als ausführbares JS-Array
	 *    wörtlich enthalten, um überhaupt gegen sie prüfen zu können. Der
	 *    Rest von negativliste.mjs, Kommentare eingeschlossen, wird
	 *    mitgeprüft.
	 * 2) diese Datei selbst (DIESE_DATEI, oben bereits für G-9 deklariert) —
	 *    hier werden nur die drei Zeichen ©/™/® unschädlich gemacht, denn
	 *    G-7 muss sie als Prüf-Array UND im Ausgabetext wörtlich enthalten,
	 *    um überhaupt gegen sie prüfen zu können (dasselbe gilt für G-10
	 *    weiter unten in derselben Datei). Bis zum 2026-09-08 stand hier
	 *    stattdessen `ALLE.filter((d) => d !== DIESE_DATEI)` — die gesamte
	 *    Datei war ausgenommen.
	 */
	function ohneEigeneFundstellen(inhalt, pfad) {
		if (pfad === NEGATIVLISTE_PFAD) {
			const start = inhalt.indexOf('export const NEGATIVLISTE = [\n');
			const ende = inhalt.indexOf('\n];', start);
			if (start === -1 || ende === -1) {
				return inhalt;
			}
			return inhalt.slice(0, start) + alsLeerzeilen(inhalt.slice(start, ende + 3)) + inhalt.slice(ende + 3);
		}
		if (pfad === DIESE_DATEI) {
			return inhalt.replace(/[©™®]/g, '·');
		}
		return inhalt;
	}
	const treffer = [];
	for (const datei of ALLE) {
		// KEIN Kommentar-Ausschnitt hier: G-7 ist die rechtliche Prüfung
		// (CONCEPT.md B.3 Nr. 4, V.7 Nr. 5) und liest deshalb den vollen Text,
		// Kommentare eingeschlossen — anders als G-9, die eine reine
		// Architekturfrage prueft (siehe Kopfkommentar dieser Datei oben unter
		// "WARUM G-9 NUR DEN CODE LIEST"). Bis zur Behebung von Befund B-1
		// (Copyright-Prüfung roulette vom 2026-09-04) stand hier
		// ohneKommentare(lies(datei)) und schnitt damit trotz der
		// gegenteiligen Aussage im Kopfkommentar dieser Datei genau die
		// Fluid-Kommentare heraus, in denen am 2026-09-02 sechs von sieben
		// Funden der ersten Copyright-Prüfung lagen.
		const inhalt = ohneEigeneFundstellen(lies(datei), datei);
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
		`kein Treffer der Negativliste (${NEGATIVLISTE.length} Namen, geteilt mit den`
		+ ` sieben Geräte-Extensions) und keins der drei Zeichen ©/™/® in ${ALLE.length}`
		+ ' Dateien dieser Extension — README und die übrigen Prüfskripte eingeschlossen'
		+ ' (Ausnahme: der NEGATIVLISTE-Programmblock in negativliste.mjs selbst, der die'
		+ ' Liste wörtlich enthalten muss, um sie zu prüfen)',
		...treffer);

	console.log('     Gegenprobe G-7-G: dieselbe Prüfung (musterFuer) muss einen gelisteten Namen auch in Versalien und ohne Trennzeichen erkennen');
	// Befund B-3 der Copyright-Prüfung craps vom 2026-09-09: diese Datei
	// hatte zu ihrer Negativliste bislang keine Gegenprobe. Die Gegenprobe
	// benutzt dieselbe musterFuer()-Funktion wie der Hauptlauf oben. Der
	// Testname wird zur LAUFZEIT aus NEGATIVLISTE gewählt (ein mehrwortiger
	// Eintrag aus reinen Buchstaben), statt als eigenes Zeichenkettenliteral
	// in diese Datei geschrieben zu werden — sonst geriete der geschützte
	// Name selbst in den Quelltext dieser Datei und G-7 schlüge gegen die
	// eigene Gegenprobe an. Der erfundene Text testet zugleich Befund B-1:
	// zusammengeschrieben und in Versalien.
	const gegenprobeName = NEGATIVLISTE.find((name) => / /.test(name) && /^[A-Za-z ]+$/.test(name));
	const erfundeneZeile = `Dieser Testtext erwähnt versehentlich ${gegenprobeName.toUpperCase().replace(/ /g, '')} und ${NEGATIVLISTE[0]}.`.toLowerCase();
	const gegenprobeGefunden = NEGATIVLISTE.filter((name) => musterFuer(name).test(erfundeneZeile));
	check(gegenprobeGefunden.length >= 2,
		'G-7-G: sowohl der zusammengeschriebene Versalien-Name als auch der erste Listeneintrag werden erkannt',
		...gegenprobeGefunden);
}

/* ================================================== G-8 Keine Datei von außen */

console.log('\nG-8  Keine Datei von außen');
{
	const treffer = [];
	for (const datei of AUSGELIEFERT) {
		const istIcon = path.relative(EXT, datei).startsWith('Resources/Public/Icons/');
		for (const zeile of ohneKommentare(lies(datei)).split('\n')) {
			const gesaeubert = ohneEigeneRepoAdresse(zeile)
				.replace(/url\(#[^)]*\)/g, '')
				.replace(/href="#[^"]*"/g, '')
				// JSON-LD-Namensraum, siehe "VIER ECHTE AUSNAHMEN" (d) oben —
				// eine Zeichenkette, keine geladene Datei.
				.replace(/https:\/\/schema\.org[a-zA-Z0-9/]*/g, '');
			const rest = istIcon
				? gesaeubert.replace('http://www.w3.org/2000/svg', '')
				: gesaeubert;
			// Selbst gezeichnete eingebettete Datenadressen (Teppich- und
			// Wandmuster in tokens.css) sind kein fremder Server.
			if (/url\("data:/.test(rest)) {
				continue;
			}
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

/* ===================================== G-9 casino_startpage nennt kein Gerät */

console.log('\nG-9  Das Site Package nennt im Code keine der Geräte-Extensions beim Namen');
{
	// Beides abgeleitet, nicht eingetragen — siehe GERAETE_EXTENSIONS oben.
	const NAMEN = GERAETE_EXTENSIONS.flatMap(schreibweisen);
	const PRAEFIXE = GERAETE_EXTENSIONS.map(
		(name) => new RegExp(`(^|[^-a-z])${kuerzel(name)}-[a-z]`)
	);
	/*
	 * Gesucht wird im CODE, nicht in der Prosa: Kommentare werden vorher
	 * herausgeschnitten (dieselbe Schere wie in G-6). Grund steht im
	 * Kopfkommentar dieser Datei unter „Warum G-9 nur den Code liest".
	 *
	 * Zeilennummern bleiben erhalten, weil ohneAlleKommentare() jeden
	 * entfernten Block durch ebenso viele Zeilenumbrüche ersetzt.
	 *
	 * Zweite Ausnahme seit Befund B-6 der Copyright-Prüfung craps vom
	 * 2026-09-09: negativliste.mjs muss als ausführbares JS-Array wörtlich
	 * Handelsnamen enthalten, die den Wortbestandteil eines installierten
	 * Gerätenamens tragen (z. B. Blackjack- oder Craps-Seitenwetten) — das
	 * koppelt casino_startpage an kein bestimmtes Gerät, es ist derselbe
	 * Schutzzweck wie G-7 selbst. Dieselbe Art Ausnahme wie in
	 * craps/…/verify-cabinet.mjs A-4 und blackjack/…/verify-cabinet.mjs A-4.
	 */
	const G9_AUSGENOMMEN = [DIESE_DATEI, NEGATIVLISTE_PFAD];
	const treffer = [];
	for (const datei of ALLE.filter((d) => !G9_AUSGENOMMEN.includes(d))) {
		const zeilen = ohneAlleKommentare(lies(datei)).split('\n');
		zeilen.forEach((zeile, n) => {
			if (NAMEN.some((m) => m.test(zeile)) || PRAEFIXE.some((m) => m.test(zeile))) {
				treffer.push(`${kurz(datei)}:${n + 1}: ${zeile.trim().slice(0, 110)}`);
			}
		});
	}
	check(treffer.length === 0,
		`keine einzige Nennung der ${GERAETE_EXTENSIONS.length} installierten`
		+ ' Geräte-Extensions und keins ihrer Kürzel-Präfixe im CODE des Site Packages'
		+ ' — außer dieser einen ausdrücklich benannten Datei selbst (siehe "VIER ECHTE'
		+ ' AUSNAHMEN" oben). Erklärende Kommentare dürfen ein Spiel beim Namen'
		+ ' nennen (CONCEPT.md C.2: allgemeine Spielnamen); sie koppeln nichts.',
		...treffer);
}

/* ============================ G-10 Nicht ignorierte Wurzeldateien */

console.log('\nG-10 Kein fremder Name in den nicht ignorierten Wurzeldateien des Projekts');
{
	// Befund B-4 der Copyright-Prüfung craps vom 2026-09-08: weder A-5 (die
	// Geräte-Extensions) noch G-7 (diese Extension) reichen bis in die
	// Projektwurzel. Was dort liegt und nicht über die Wurzel-.gitignore
	// ausgenommen ist, würde trotzdem mit veröffentlicht — README.md allen
	// voran. Ausgewertet werden nur einfache, wortgleiche .gitignore-Zeilen
	// (kein Glob, keine Negation, kein Verzeichnispfad); das reicht für die
	// heutige, kurze Wurzel-.gitignore. Verzeichnisse fallen ohnehin durch
	// den anschließenden isFile()-Filter heraus, unabhängig davon, ob sie in
	// der .gitignore stehen.
	const GITIGNORE_PFAD = path.join(PROJEKT_WURZEL, '.gitignore');
	const IGNORIERTE_NAMEN = new Set(
		existsSync(GITIGNORE_PFAD)
			? lies(GITIGNORE_PFAD)
				.split('\n')
				.map((zeile) => zeile.trim())
				.filter((zeile) => zeile !== '' && !zeile.startsWith('#') && !zeile.startsWith('!') && !zeile.includes('*'))
				.map((zeile) => zeile.replace(/^\//, '').replace(/\/$/, ''))
			: []
	);
	const WURZELDATEIEN = readdirSync(PROJEKT_WURZEL)
		.filter((name) => name !== '.gitignore' && !IGNORIERTE_NAMEN.has(name))
		.map((name) => path.join(PROJEKT_WURZEL, name))
		.filter((voll) => statSync(voll).isFile());
	const treffer = [];
	for (const datei of WURZELDATEIEN) {
		const inhalt = lies(datei);
		// Dasselbe musterFuer() wie A-5/G-7 (Befund B-1 und B-3 der
		// Copyright-Prüfung craps vom 2026-09-09): derselbe Musterbau wie im
		// Hauptlauf, statt einer eigenen, hier nicht mehr getrennt geführten
		// Abschrift des Regex — eine reine Groß-/Kleinschreibungs-
		// Unempfindlichkeit ohne Wortgrenzen würde kurze, mehrdeutige Kürzel
		// der Liste mitten in gewöhnlichen Wörtern der Wurzeldateien
		// anschlagen.
		const inhaltKlein = inhalt.toLowerCase();
		for (const name of NEGATIVLISTE) {
			if (musterFuer(name).test(inhaltKlein)) {
				treffer.push(`${path.relative(PROJEKT_WURZEL, datei)}: „${name}"`);
			}
		}
		for (const zeichen of ['©', '™', '®']) {
			if (inhalt.includes(zeichen)) {
				treffer.push(`${path.relative(PROJEKT_WURZEL, datei)}: Zeichen „${zeichen}"`);
			}
		}
	}
	check(treffer.length === 0,
		`kein Treffer der Negativliste (${NEGATIVLISTE.length} Namen) und keins der drei`
		+ ` Zeichen ©/™/® in ${WURZELDATEIEN.length} nicht ignorierten Wurzeldateien`
		+ ' (ermittelt aus der Wurzel-.gitignore, einfache Zeilen ohne Glob/Negation)',
		...treffer);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Die Gattung ist da, die Auswahlliste'
	+ `\ngruppiert, beide Platzhalter erfüllen den Gehäuse-Vertrag, und die`
	+ ` ${GERAETE_EXTENSIONS.length}`
	+ '\nvorhandenen Geräte melden sich unverändert an.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
