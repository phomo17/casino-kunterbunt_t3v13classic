/**
 * Casino Kunterbunt – Nachweis der Chips (Phase C1, Teilstück B)
 * ================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Laufzeit unter einer Sekunde.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/verify-table-chips.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD
 * ----------------------
 *   C-0  table-chips.js lädt unter Node ohne jede Vorbereitung
 *   C-1  die fünf Chips existieren mit den richtigen Werten und Farben
 *   C-2  jeder Chip ist über sein Randkerbenmuster unterscheidbar
 *   C-3  breakDown() wechselt gierig in der vorgegebenen Reihenfolge
 *   C-4  Rack hält seine Invarianten über einen langen Ablauf
 *   C-5  exchangeDown()/exchangeUp() ändern den Wert des Racks nie
 *   C-6  CHIP_SPLIT stimmt mit der Kleinwechsel-Rechnung überein
 *   C-7  die Zeichnung in ChipSprite.html stimmt mit den Daten überein
 *   C-8  die Kontrastwerte der Chip-Tokens sind nachgerechnet ausreichend
 *   C-9  jeder benutzte --ck-Token existiert in tokens.css
 *
 * WARUM UNMITTELBAR GELADEN UND NICHT NACHGEBILDET
 * -------------------------------------------------
 * table-chips.js importiert nichts (siehe ihr eigener Kopfkommentar). Der
 * Nachweis lädt deshalb GENAU DIESE Datei über einen normalen import() –
 * keine Nachbildung, die richtig rechnen könnte, während das Spiel falsch
 * wechselt (CONCEPT.md C.5.3).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/casino_startpage/ */
const EXT = path.resolve(HIER, '../../..');

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

function lies(rel) {
	return readFileSync(path.join(EXT, rel), 'utf8');
}

/** Entfernt <f:comment>-Blöcke, JS/CSS-Blockkommentare (/* … *\/) und Zeilenkommentare (//). */
function ohneKommentare(inhalt) {
	return inhalt
		.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/.*$/gm, '');
}

/** Kleiner deterministischer Zufallsgenerator (mulberry32) – reproduzierbar über Läufe hinweg. */
function zufallsgenerator(saat) {
	let zustand = saat >>> 0;
	return function () {
		zustand |= 0;
		zustand = (zustand + 0x6d2b79f5) | 0;
		let t = Math.imul(zustand ^ (zustand >>> 15), 1 | zustand);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/* ============================================== WCAG-Kontrastverhältnis */

function srgbNachLinear(kanal) {
	const c = kanal / 255;
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLeuchtdichte(hex) {
	const wert = hex.replace('#', '');
	const r = parseInt(wert.slice(0, 2), 16);
	const g = parseInt(wert.slice(2, 4), 16);
	const b = parseInt(wert.slice(4, 6), 16);
	return 0.2126 * srgbNachLinear(r) + 0.7152 * srgbNachLinear(g) + 0.0722 * srgbNachLinear(b);
}

function kontrastverhaeltnis(hexA, hexB) {
	const lA = relativeLeuchtdichte(hexA);
	const lB = relativeLeuchtdichte(hexB);
	const heller = Math.max(lA, lB) + 0.05;
	const dunkler = Math.min(lA, lB) + 0.05;
	return heller / dunkler;
}

console.log('\nCasino Kunterbunt – Nachweis der Chips (Phase C1, Teilstück B)');
console.log('================================================================\n');

const CHIPS_JS_PFAD = 'Resources/Public/JavaScript/table-chips.js';
const QUELLTEXT = lies(CHIPS_JS_PFAD);
const OHNE_KOMMENTARE = ohneKommentare(QUELLTEXT);

/* ==================================================== C-0 Ohne Vorbereitung */

console.log('C-0  table-chips.js lädt unter Node ohne jede Vorbereitung');
{
	check(!/\bimport\b/.test(OHNE_KOMMENTARE), 'kein import im Quelltext (Kommentare ausgenommen)');
	check(!/\bdocument\b/.test(OHNE_KOMMENTARE), 'kein document im Quelltext');
	check(!/\bwindow\b/.test(OHNE_KOMMENTARE), 'kein window im Quelltext');
	check(!/\blocalStorage\b/.test(OHNE_KOMMENTARE), 'kein localStorage im Quelltext');
	check(!/Math\.random/.test(OHNE_KOMMENTARE), 'kein Math.random im Quelltext');
}

let modul;
try {
	modul = await import(new URL('../../Public/JavaScript/table-chips.js', import.meta.url));
	check(true, 'der import() gelingt unmittelbar');
} catch (fehlerObjekt) {
	check(false, 'der import() gelingt unmittelbar', String(fehlerObjekt));
	console.log(`\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen (Abbruch, Modul lädt nicht).`);
	process.exit(1);
}

const { CHIP_VALUES, CHIPS, breakDown, CHIP_SPLIT, Rack } = modul;

/* ========================================================== C-1 Die fünf Chips */

console.log('\nC-1  Die fünf Chips existieren mit den richtigen Werten und Farben');
{
	check(Array.isArray(CHIP_VALUES) && CHIP_VALUES.length === 5
		&& CHIP_VALUES[0] === 100 && CHIP_VALUES[1] === 25 && CHIP_VALUES[2] === 20
		&& CHIP_VALUES[3] === 5 && CHIP_VALUES[4] === 1,
		`CHIP_VALUES ist genau [100, 25, 20, 5, 1] (gefunden: ${JSON.stringify(CHIP_VALUES)})`);

	const schluessel = Object.keys(CHIPS).map(Number).sort((a, b) => a - b);
	check(schluessel.length === 5 && schluessel.join(',') === '1,5,20,25,100',
		`CHIPS hat genau die fünf Schlüssel 1, 5, 20, 25, 100 (gefunden: ${schluessel.join(', ')})`);

	const ERWARTETE_FARBEN = { 1: 'white', 5: 'red', 20: 'yellow', 25: 'green', 100: 'black' };
	for (const [wert, farbe] of Object.entries(ERWARTETE_FARBEN)) {
		check(CHIPS[wert]?.colour === farbe, `Chip ${wert}: Farbe ${farbe} (gefunden: ${CHIPS[wert]?.colour})`);
		check(CHIPS[wert]?.value === Number(wert), `Chip ${wert}: value === ${wert}`);
	}
}

/* ===================================================== C-2 Unterscheidbarkeit */

console.log('\nC-2  Jeder Chip ist über sein Randkerbenmuster unterscheidbar');
{
	const paare = CHIP_VALUES.map((v) => `${CHIPS[v].groups},${CHIPS[v].perGroup}`);
	const paareEindeutig = new Set(paare).size === paare.length;
	check(paareEindeutig, `die fünf Paare (groups, perGroup) sind paarweise verschieden (gefunden: ${paare.join(' | ')})`);

	const summen = CHIP_VALUES.map((v) => CHIPS[v].groups * CHIPS[v].perGroup);
	const summenEindeutig = new Set(summen).size === summen.length;
	check(summenEindeutig, `die fünf Gesamtzahlen groups × perGroup sind paarweise verschieden (gefunden: ${summen.join(', ')})`);

	check(summen.every((s) => s >= 3), `jede Gesamtzahl ist mindestens 3 (gefunden: ${summen.join(', ')})`);
}

/* =============================================================== C-3 breakDown() */

console.log('\nC-3  breakDown() wechselt gierig in der vorgegebenen Reihenfolge');
{
	/** Unabhängig geschriebene Gierrechnung — nicht dieselbe Funktion wie breakDown(). */
	function gierRechnung(betrag) {
		const ergebnis = [];
		let rest = betrag;
		for (const wert of [100, 25, 20, 5, 1]) {
			const anzahl = Math.trunc(rest / wert);
			if (anzahl > 0) {
				ergebnis.push({ value: wert, count: anzahl });
				rest -= anzahl * wert;
			}
		}
		return ergebnis;
	}

	function gleich(a, b) {
		return a.length === b.length
			&& a.every((p, i) => p.value === b[i].value && p.count === b[i].count);
	}

	let abweichungen = 0;
	function pruefeBetrag(betrag) {
		const ergebnis = breakDown(betrag);
		const erwartet = gierRechnung(betrag);
		const summe = ergebnis.reduce((s, p) => s + p.value * p.count, 0);
		const absteigend = ergebnis.every((p, i) => i === 0 || p.value < ergebnis[i - 1].value);
		const nurFuenfWerte = ergebnis.every((p) => CHIP_VALUES.includes(p.value));
		if (summe !== betrag || !absteigend || !nurFuenfWerte || !gleich(ergebnis, erwartet)) {
			abweichungen += 1;
			if (abweichungen <= 5) {
				console.log(`      Abweichung bei ${betrag}: breakDown=${JSON.stringify(ergebnis)} erwartet=${JSON.stringify(erwartet)}`);
			}
		}
	}

	for (let betrag = 0; betrag <= 5000; betrag += 1) {
		pruefeBetrag(betrag);
	}
	const zufall = zufallsgenerator(20260904);
	for (let i = 0; i < 200; i += 1) {
		pruefeBetrag(Math.floor(zufall() * 999_999_999) + 1);
	}
	check(abweichungen === 0,
		'jeder geprüfte Betrag (0–5000 sowie 200 gezogene Beträge bis 999.999.999) stimmt'
		+ ' in Summe, Reihenfolge, Wertemenge und Posten mit der unabhängigen Gierrechnung überein'
		+ ` (Abweichungen: ${abweichungen})`);

	const vierzig = breakDown(40);
	check(vierzig.length === 2 && vierzig[0].value === 25 && vierzig[0].count === 1
		&& vierzig[1].value === 5 && vierzig[1].count === 3,
		`breakDown(40) ergibt 25 + 5 + 5 + 5, nicht 20 + 20 (gefunden: ${JSON.stringify(vierzig)})`);
}

/* =================================================================== C-4 Rack */

console.log('\nC-4  Rack hält seine Invarianten über einen langen Ablauf');
{
	const rack = new Rack();
	let unabhaengigeSumme = 0;
	const zufall = zufallsgenerator(20260904);
	const AKTIONEN = ['put', 'take', 'fill', 'clear', 'exchangeDown', 'exchangeUp'];
	let verletzungen = 0;

	function pruefeInvarianten(kontext) {
		const arr = rack.toArray();
		const negativOderNull = [...rack.counts.values()].some((c) => c <= 0);
		const absteigend = arr.every((p, i) => i === 0 || p.value < arr[i - 1].value);
		if (negativOderNull || !absteigend || rack.total !== unabhaengigeSumme) {
			verletzungen += 1;
			if (verletzungen <= 5) {
				console.log(`      Verletzung nach ${kontext}: total=${rack.total} erwartet=${unabhaengigeSumme}`);
			}
		}
	}

	for (let schritt = 0; schritt < 20000; schritt += 1) {
		const aktion = AKTIONEN[Math.floor(zufall() * AKTIONEN.length)];
		if (aktion === 'put') {
			const wert = CHIP_VALUES[Math.floor(zufall() * CHIP_VALUES.length)];
			const anzahl = 1 + Math.floor(zufall() * 5);
			rack.put(wert, anzahl);
			unabhaengigeSumme += wert * anzahl;
		} else if (aktion === 'take') {
			const wert = CHIP_VALUES[Math.floor(zufall() * CHIP_VALUES.length)];
			if (rack.take(wert)) {
				unabhaengigeSumme -= wert;
			}
		} else if (aktion === 'fill') {
			const betrag = Math.floor(zufall() * 500);
			rack.fill(betrag);
			unabhaengigeSumme += betrag;
		} else if (aktion === 'clear') {
			rack.clear();
			unabhaengigeSumme = 0;
		} else if (aktion === 'exchangeDown') {
			const wert = CHIP_VALUES[Math.floor(zufall() * CHIP_VALUES.length)];
			rack.exchangeDown(wert);
			// exchangeDown ändert den Rackwert per Vertrag nicht — unabhaengigeSumme bleibt.
		} else {
			const wert = CHIP_VALUES[Math.floor(zufall() * CHIP_VALUES.length)];
			rack.exchangeUp(wert);
		}
		pruefeInvarianten(`Schritt ${schritt} (${aktion})`);
	}

	check(verletzungen === 0,
		'nach jedem einzelnen der 20.000 Schritte: keine negative/Null-Stückzahl, toArray()'
		+ ` absteigend, total gleich der unabhängig mitgeführten Summe (Verletzungen: ${verletzungen})`);
}

/* ======================================================= C-5 Wechseln erhält Wert */

console.log('\nC-5  exchangeDown()/exchangeUp() ändern den Wert des Racks nie');
{
	// Ausreichend gedeckter Ausgangsbestand für jeden Wert.
	function neuesVollesRack() {
		const r = new Rack();
		for (const wert of CHIP_VALUES) {
			r.put(wert, 6);
		}
		return r;
	}

	let fehlerhaft = 0;

	for (const wert of CHIP_VALUES) {
		const r = neuesVollesRack();
		const vorher = r.total;
		const ab = r.exchangeDown(wert);
		if (wert === 1) {
			if (!(ab.ok === false && ab.reason === 'smallest')) fehlerhaft += 1;
		} else if (ab.ok !== true || r.total !== vorher) {
			fehlerhaft += 1;
		}

		const r2 = neuesVollesRack();
		const vorher2 = r2.total;
		const auf = r2.exchangeUp(wert);
		if (wert === 1) {
			if (!(auf.ok === false && auf.reason === 'smallest')) fehlerhaft += 1;
		} else if (auf.ok !== true || r2.total !== vorher2) {
			fehlerhaft += 1;
		}
	}

	// Invers zueinander: erst herunter, dann herauf ergibt denselben Bestand.
	for (const wert of CHIP_VALUES.filter((v) => v !== 1)) {
		const r = neuesVollesRack();
		const vorArray = JSON.stringify(r.toArray());
		r.exchangeDown(wert);
		r.exchangeUp(wert);
		if (JSON.stringify(r.toArray()) !== vorArray) fehlerhaft += 1;
	}

	// Ohne Deckung: sagt ab und lässt den Bestand unangetastet.
	{
		const leer = new Rack();
		const ab = leer.exchangeDown(25);
		if (!(ab.ok === false && ab.reason === 'none') || leer.total !== 0) fehlerhaft += 1;

		const fastLeer = new Rack();
		fastLeer.put(20, 1); // fehlt: 5 für den Zusammenschluss zu 25
		const auf = fastLeer.exchangeUp(25);
		if (!(auf.ok === false && auf.reason === 'missing') || fastLeer.total !== 20) fehlerhaft += 1;
	}

	check(fehlerhaft === 0,
		'exchangeDown()/exchangeUp() ändern total nie, sind für jeden Wert außer 1 zueinander'
		+ ' invers, sagen bei 1 mit reason "smallest" ab und bei fehlender Deckung mit'
		+ ` "none"/"missing" ohne Nebenwirkung (Abweichungen: ${fehlerhaft})`);
}

/* ============================================================ C-6 CHIP_SPLIT */

console.log('\nC-6  CHIP_SPLIT stimmt mit der Kleinwechsel-Rechnung überein');
{
	let abweichungen = 0;
	for (const wert of CHIP_VALUES) {
		const zerlegung = CHIP_SPLIT[wert];
		const summe = zerlegung.reduce((s, p) => s + p.value * p.count, 0);
		if (wert !== 1 && summe !== wert) abweichungen += 1;

		const kleiner = CHIP_VALUES.filter((v) => v < wert);
		const erwartet = [];
		let rest = wert;
		for (const v of kleiner) {
			const anzahl = Math.trunc(rest / v);
			if (anzahl > 0) {
				erwartet.push({ value: v, count: anzahl });
				rest -= anzahl * v;
			}
		}
		const stimmtUeberein = zerlegung.length === erwartet.length
			&& zerlegung.every((p, i) => p.value === erwartet[i].value && p.count === erwartet[i].count);
		if (!stimmtUeberein) {
			abweichungen += 1;
			console.log(`      CHIP_SPLIT[${wert}]=${JSON.stringify(zerlegung)} erwartet=${JSON.stringify(erwartet)}`);
		}
	}
	check(abweichungen === 0,
		`für jeden Wert ist CHIP_SPLIT die Gierrechnung über die nächstkleineren Chips (Abweichungen: ${abweichungen})`);
}

/* ==================================================== C-7 Zeichnung und Daten */

console.log('\nC-7  Die Zeichnung in ChipSprite.html stimmt mit den Daten überein');
{
	const SPRITE_PFAD = 'Resources/Private/PageView/Partials/Table/ChipSprite.html';
	const sprite = lies(SPRITE_PFAD);
	const ohneKomm = ohneKommentare(sprite);

	const svgTag = /<svg\b[^>]*class="ck-chipsprite"[^>]*>/.exec(ohneKomm)?.[0] ?? '';
	check(svgTag.includes('aria-hidden="true"'), 'das äußere <svg> trägt aria-hidden="true"');
	check(svgTag.includes('focusable="false"'), 'das äußere <svg> trägt focusable="false"');
	check(!ohneKomm.includes('<title>'), 'kein <title> im gesamten Sprite');

	const symbole = [...ohneKomm.matchAll(/<symbol\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/symbol>/g)];
	check(symbole.length === 5, `genau fünf <symbol> (gefunden: ${symbole.length})`);

	const idsGefunden = symbole.map((m) => m[1]).sort();
	const idsErwartet = CHIP_VALUES.map((v) => CHIPS[v].symbolId).sort();
	check(JSON.stringify(idsGefunden) === JSON.stringify(idsErwartet),
		`die <symbol>-id sind genau die fünf symbolId aus CHIPS (gefunden: ${idsGefunden.join(', ')})`);

	const ALLE_FARBEN = CHIP_VALUES.map((v) => CHIPS[v].colour);
	for (const wert of CHIP_VALUES) {
		const eintrag = CHIPS[wert];
		const symbol = symbole.find((m) => m[1] === eintrag.symbolId);
		if (!symbol) {
			check(false, `Symbol ${eintrag.symbolId} vorhanden`);
			continue;
		}
		const inhalt = symbol[2];
		const rects = [...inhalt.matchAll(/<rect\b[^>]*\brotate\(([\d.]+)[^)]*\)[^>]*\/>/g)];
		const erwarteteAnzahl = eintrag.groups * eintrag.perGroup;
		check(rects.length === erwarteteAnzahl,
			`${eintrag.symbolId}: ${erwarteteAnzahl} Kerben-Rechtecke (gefunden: ${rects.length})`);

		const winkel = rects.map((m) => Number(m[1]));
		const winkelEindeutig = new Set(winkel).size === winkel.length;
		const winkelImBereich = winkel.every((w) => w >= 0 && w < 360);
		check(winkelEindeutig, `${eintrag.symbolId}: die Drehwinkel sind paarweise verschieden`);
		check(winkelImBereich, `${eintrag.symbolId}: alle Drehwinkel liegen in [0, 360)`);

		const nenntBasisfarbe = new RegExp(`--ck-chip-${eintrag.colour}(?!-mark)\\b`).test(inhalt);
		check(nenntBasisfarbe, `${eintrag.symbolId}: nennt --ck-chip-${eintrag.colour}`);
		check(inhalt.includes(`--ck-chip-${eintrag.colour}-mark`), `${eintrag.symbolId}: nennt --ck-chip-${eintrag.colour}-mark`);

		const andereFarben = ALLE_FARBEN.filter((f) => f !== eintrag.colour);
		const fremdeFarbe = andereFarben.find((f) => inhalt.includes(`--ck-chip-${f}`));
		check(!fremdeFarbe, `${eintrag.symbolId}: keine andere Chipfarbe genannt (gefunden: ${fremdeFarbe ?? '–'})`);
	}
}

/* ========================================================= C-8 Kontrast */

console.log('\nC-8  Die Kontrastwerte der Chip-Tokens sind nachgerechnet ausreichend');
{
	const tokensCss = lies('Resources/Public/Css/tokens.css');
	function tokenWert(name) {
		const treffer = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(tokensCss);
		return treffer?.[1];
	}

	const printInk = tokenWert('ck-print-ink');
	const inlay = tokenWert('ck-chip-inlay');
	check(!!printInk && !!inlay, `--ck-print-ink und --ck-chip-inlay stehen in tokens.css (gefunden: ${printInk}, ${inlay})`);
	const kontrastEinlage = kontrastverhaeltnis(printInk, inlay);
	console.log(`      --ck-print-ink auf --ck-chip-inlay: ${kontrastEinlage.toFixed(2)} : 1 (verlangt ≥ 4,5 : 1)`);
	check(kontrastEinlage >= 4.5, `Aufdruck gegen Einlage erreicht mindestens 4,5 : 1 (gemessen: ${kontrastEinlage.toFixed(2)})`);

	for (const farbe of ['white', 'red', 'yellow', 'green', 'black']) {
		const chip = tokenWert(`ck-chip-${farbe}`);
		const mark = tokenWert(`ck-chip-${farbe}-mark`);
		check(!!chip && !!mark, `--ck-chip-${farbe} und --ck-chip-${farbe}-mark stehen in tokens.css`);
		const kontrast = kontrastverhaeltnis(chip, mark);
		console.log(`      --ck-chip-${farbe}-mark auf --ck-chip-${farbe}: ${kontrast.toFixed(2)} : 1 (verlangt ≥ 3,0 : 1)`);
		check(kontrast >= 3.0, `Markierung gegen Chipfarbe ${farbe} erreicht mindestens 3,0 : 1 (gemessen: ${kontrast.toFixed(2)})`);
	}
}

/* ======================================================= C-9 Tokens vollständig */

console.log('\nC-9  Jeder benutzte --ck-Token existiert in tokens.css');
{
	const tokensCss = lies('Resources/Public/Css/tokens.css');
	const definiert = new Set([...tokensCss.matchAll(/^\s*(--ck-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));

	const tableCss = lies('Resources/Public/Css/table.css');
	const sprite = lies('Resources/Private/PageView/Partials/Table/ChipSprite.html');

	const benutzt = new Map();
	for (const [datei, inhalt] of [
		['table.css', ohneKommentare(tableCss)],
		['ChipSprite.html', ohneKommentare(sprite)],
	]) {
		for (const m of inhalt.matchAll(/var\(\s*(--ck-[a-z0-9-]+)/g)) {
			if (!benutzt.has(m[1])) {
				benutzt.set(m[1], datei);
			}
		}
	}
	const unbekannt = [...benutzt].filter(([name]) => !definiert.has(name));
	check(unbekannt.length === 0,
		`${benutzt.size} benutzte Tokens aus table.css und ChipSprite.html, alle in tokens.css definiert`,
		...unbekannt.map(([name, datei]) => `${name} – benutzt in ${datei}`));
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Die fünf Chips existieren, sind gezeichnet,'
	+ '\nan Farbe und Randmuster unterscheidbar, und ihr Wechselverhalten ist bewiesen.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
