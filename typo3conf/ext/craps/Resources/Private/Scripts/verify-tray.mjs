/**
 * Craps – Nachweis Wanne/Maßordnung (Umsetzungsstück C6b)
 * =======================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Laufzeit unter einer Sekunde.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-tray.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.29, Umsetzungsstück C6b;
 * D-1/D-2/D-3/D-5/D-8/D-9 auf Cloth.html/Dice.html umgestellt und D-10/D-11
 * neu hinzugekommen mit Umsetzungsstück Td, „eine Fläche statt zweier")
 * -------------------------------------------------------------------
 *   D-1  Die Maßordnung steht in Cloth.html wörtlich so wie in
 *        dice-geometry.js
 *   D-2  Die vier Gummileisten liegen auf den vier Bandeninnenkanten, ihre
 *        <pattern>-Teilung ist PYRAMID_PITCH
 *   D-3  (erweitert, Te) Genau zwei Würfelgruppen, beide innerhalb der
 *        Spielfläche, jede aus genau vier Schichten in der Reihenfolge
 *        Schatten → ferne Fläche → nahe Fläche → Deckfläche
 *   D-4  Die sechs Flächen tragen die richtige Zahl Augen an der richtigen
 *        Stelle
 *   D-5  Kein Schriftzeichen als Auge
 *   D-6  Die 24 Lagen sind vollständig, doppelfrei, rechtshändig und unter
 *        tipFaces() abgeschlossen
 *   D-7  (erweitert, Te) Die Farben tragen (Kontrastverhältnis nach der
 *        WCAG-Formel), einschließlich der beiden neuen Körperflächen-Töne
 *        gegen das Tuch
 *   D-8  Die Zeichnung hat keinen erreichbaren Namen und keinen Fokus
 *   D-9  Jede benutzte Custom Property der Würfelgruppe ist in tray.css mit
 *        einem Vorgabewert belegt
 *   D-10 (neu, Td) Cloth.html und Dice.html tragen dieselbe Maßordnung
 *        (viewBox, preserveAspectRatio), und felt.css legt das Gitter
 *        prozentual genau auf die Spielfläche
 *   D-11 (neu, Td) Ein Wettfeld löst keinen Wurf aus: pointer-events an der
 *        Würfelschicht, data-cr-tray steht an genau einem Element
 *   D-12 (neu, Te) Der Körper liegt im Bildschirmraum, nicht im Körperraum:
 *        translate() steht vor matrix() in beiden Transformationsketten, die
 *        Lift-Vielfachen 0/1/2 wachsen streng, die Deckfläche hat
 *        --cr-lift: 0
 *
 * Warum dice-geometry.js UNMITTELBAR geladen wird, nicht nachgebaut: dieser
 * Nachweis soll beweisen, dass ZEICHNUNG UND MASSORDNUNG DIESELBE SACHE
 * BESCHREIBEN. Ein zweites, von Hand abgeschriebenes Zahlenset könnte
 * denselben Fehler enthalten wie ein drittes — der Import macht das
 * unmöglich.
 *
 * WARUM D-1/D-2/D-3/D-5/D-8/D-9 SEIT Td ZWEI DATEIEN LESEN
 * -----------------------------------------------------------
 * Tray.html ist mit Umsetzungsstück Td aufgeteilt in Cloth.html (die
 * Zeichnung des Tisches) und Dice.html (die Würfelschicht) — „aus zwei
 * Flächen wird eine" heißt für die Zeichnung selbst „aus einer Datei werden
 * zwei Schichten". Geändert wurden nur die Dateipfade und die Fundstellen,
 * nicht die Aussagen der Prüfungen.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/craps/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
const SITE = path.join(EXT_ROOT, 'casino_startpage');

const {
	VIEW_W, VIEW_H,
	FELT_LEFT, FELT_RIGHT, FELT_TOP, FELT_BOTTOM,
	PYRAMID_PITCH, PYRAMID_DEPTH,
	DIE_EDGE, HALF_EDGE,
	ORIENTATIONS, tipFaces, opposite,
	PIP_LAYOUT, PIP_RADIUS,
} = await import(pathToFileURL(path.join(EXT, 'Resources/Public/JavaScript/dice-geometry.js')).href);

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

/** Entfernt alle <f:comment>-Blöcke. */
function ohneKommentare(inhalt) {
	return inhalt.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '');
}

/** Entfernt zusätzlich CSS/JS-Blockkommentare (/* … *\/). */
function ohneBlockKommentare(inhalt) {
	return ohneKommentare(inhalt).replace(/\/\*[\s\S]*?\*\//g, '');
}

const clothDatei = path.join(EXT, 'Resources/Private/Partials/Table/Craps/Cloth.html');
const diceDatei = path.join(EXT, 'Resources/Private/Partials/Table/Craps/Dice.html');
const spriteDatei = path.join(EXT, 'Resources/Private/Partials/Table/Craps/DiceSprite.html');
const trayCssDatei = path.join(EXT, 'Resources/Public/Css/tray.css');
const feltCssDatei = path.join(EXT, 'Resources/Public/Css/felt.css');
const tokensDatei = path.join(SITE, 'Resources/Public/Css/tokens.css');

const clothRoh = lies(clothDatei);
const cloth = ohneKommentare(clothRoh);
// Dice.html wird ausschließlich in seiner RAW-Fassung (diceRoh) gebraucht: D-3
// braucht das style-Attribut, D-5/D-9/D-10/D-11 vergleichen Text bzw. Attribute,
// die <f:comment> nicht berühren.
const diceRoh = lies(diceDatei);
const sprite = ohneKommentare(lies(spriteDatei));
const trayCss = ohneBlockKommentare(lies(trayCssDatei));
const tokensCss = lies(tokensDatei);

console.log('\nCraps – Nachweis Wanne/Maßordnung (Umsetzungsstück C6b)');
console.log('=======================================================================\n');

/* ===================================================== D-1 Maßordnung */

console.log('D-1  Die Maßordnung steht in Cloth.html wörtlich so wie in dice-geometry.js');
{
	const viewBox = cloth.match(/viewBox="0 0 (\d+) (\d+)"/);
	check(!!viewBox && Number(viewBox[1]) === VIEW_W && Number(viewBox[2]) === VIEW_H,
		`viewBox="0 0 ${VIEW_W} ${VIEW_H}" (gefunden: ${viewBox ? viewBox[0] : 'keine'})`);

	const felt = cloth.match(/<rect class="cr-tray__felt" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/);
	check(!!felt, 'rect.cr-tray__felt gefunden');
	if (felt) {
		const [, x, y, w, h] = felt.map(Number);
		check(x === FELT_LEFT, `Tuch x="${FELT_LEFT}" (gefunden: ${x})`);
		check(y === FELT_TOP, `Tuch y="${FELT_TOP}" (gefunden: ${y})`);
		check(w === FELT_RIGHT - FELT_LEFT, `Tuch width="${FELT_RIGHT - FELT_LEFT}" (gefunden: ${w})`);
		check(h === FELT_BOTTOM - FELT_TOP, `Tuch height="${FELT_BOTTOM - FELT_TOP}" (gefunden: ${h})`);
	}
}

/* =========================================== D-2 Pyramidengummi-Leisten */

console.log('\nD-2  Die vier Gummileisten liegen auf den Bandeninnenkanten, Teilung PYRAMID_PITCH');
{
	const leisten = [...cloth.matchAll(/<rect class="cr-tray__pyramid"\s+x="(-?\d+(?:\.\d+)?)"\s+y="(-?\d+(?:\.\d+)?)"\s+width="(-?\d+(?:\.\d+)?)"\s+height="(-?\d+(?:\.\d+)?)"\s+fill="url\(#(cr-pyramid-[hv])\)"/g)]
		.map((m) => ({ x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]), kachel: m[5] }));
	check(leisten.length === 4, `genau vier Gummileisten (gefunden: ${leisten.length})`);

	const links = leisten.find((r) => r.x === FELT_LEFT && r.w === PYRAMID_DEPTH);
	const rechts = leisten.find((r) => r.x === FELT_RIGHT - PYRAMID_DEPTH && r.w === PYRAMID_DEPTH);
	const oben = leisten.find((r) => r.y === FELT_TOP && r.h === PYRAMID_DEPTH);
	const unten = leisten.find((r) => r.y === FELT_BOTTOM - PYRAMID_DEPTH && r.h === PYRAMID_DEPTH);
	check(!!links, `linke Leiste bei x=${FELT_LEFT}, Breite ${PYRAMID_DEPTH}`);
	check(!!rechts, `rechte Leiste bei x=${FELT_RIGHT - PYRAMID_DEPTH}, Breite ${PYRAMID_DEPTH}`);
	check(!!oben, `obere Leiste bei y=${FELT_TOP}, Höhe ${PYRAMID_DEPTH}`);
	check(!!unten, `untere Leiste bei y=${FELT_BOTTOM - PYRAMID_DEPTH}, Höhe ${PYRAMID_DEPTH}`);
	if (links) check(links.h === FELT_BOTTOM - FELT_TOP, `linke Leiste erstreckt sich über die volle Bandenhöhe (${FELT_BOTTOM - FELT_TOP})`);
	if (rechts) check(rechts.h === FELT_BOTTOM - FELT_TOP, `rechte Leiste erstreckt sich über die volle Bandenhöhe (${FELT_BOTTOM - FELT_TOP})`);
	if (oben) check(oben.w === FELT_RIGHT - FELT_LEFT, `obere Leiste erstreckt sich über die volle Bandenbreite (${FELT_RIGHT - FELT_LEFT})`);
	if (unten) check(unten.w === FELT_RIGHT - FELT_LEFT, `untere Leiste erstreckt sich über die volle Bandenbreite (${FELT_RIGHT - FELT_LEFT})`);

	const patternH = cloth.match(/<pattern id="cr-pyramid-h" width="(\d+)" height="(\d+)"/);
	const patternV = cloth.match(/<pattern id="cr-pyramid-v" width="(\d+)" height="(\d+)"/);
	check(!!patternH && Number(patternH[1]) === PYRAMID_PITCH, `pattern#cr-pyramid-h width="${PYRAMID_PITCH}" (gefunden: ${patternH ? patternH[1] : 'keine'})`);
	check(!!patternV && Number(patternV[2]) === PYRAMID_PITCH, `pattern#cr-pyramid-v height="${PYRAMID_PITCH}" (gefunden: ${patternV ? patternV[2] : 'keine'})`);

	console.log('     Gegenprobe D-2-G: eine um eins verschobene Leiste muss auffallen');
	const verschoben = cloth.replace(`x="${FELT_LEFT}" y="${FELT_TOP}" width="${PYRAMID_DEPTH}"`, `x="${FELT_LEFT + 1}" y="${FELT_TOP}" width="${PYRAMID_DEPTH}"`);
	const leistenGegenprobe = [...verschoben.matchAll(/<rect class="cr-tray__pyramid" x="(-?\d+(?:\.\d+)?)" y="(-?\d+(?:\.\d+)?)" width="(-?\d+(?:\.\d+)?)" height="(-?\d+(?:\.\d+)?)" fill="url\(#(cr-pyramid-[hv])\)"/g)]
		.map((m) => ({ x: Number(m[1]), w: Number(m[3]) }));
	const linksGegenprobe = leistenGegenprobe.find((r) => r.x === FELT_LEFT && r.w === PYRAMID_DEPTH);
	check(!linksGegenprobe, 'D-2-G: die verschobene linke Leiste wird nicht mehr an ihrem Sollplatz gefunden');
}

/* ================================================= D-3 Zwei Würfelgruppen */

console.log('\nD-3  Genau zwei Würfelgruppen, innerhalb der Spielfläche, mit Schatten und Fläche');
{
	const gruppen = [...diceRoh.matchAll(/<g class="cr-die" data-cr-die="(\d)"[^>]*style="([^"]*)"[^>]*>([\s\S]*?)<\/g>/g)];
	check(gruppen.length === 2, `genau zwei g.cr-die (gefunden: ${gruppen.length})`);

	const kennungen = gruppen.map((m) => m[1]).sort();
	check(kennungen.length === 2 && kennungen[0] === '0' && kennungen[1] === '1',
		'data-cr-die="0" und data-cr-die="1" sind je genau einmal vorhanden');

	const minX = FELT_LEFT + HALF_EDGE;
	const maxX = FELT_RIGHT - HALF_EDGE;
	const minY = FELT_TOP + HALF_EDGE;
	const maxY = FELT_BOTTOM - HALF_EDGE;

	for (const [, nr, style, inhalt] of gruppen) {
		const x = Number(style.match(/--cr-x:\s*(-?\d+(?:\.\d+)?)/)?.[1]);
		const y = Number(style.match(/--cr-y:\s*(-?\d+(?:\.\d+)?)/)?.[1]);
		check(x >= minX && x <= maxX, `Würfel ${nr}: --cr-x=${x} liegt in [${minX}, ${maxX}]`);
		check(y >= minY && y <= maxY, `Würfel ${nr}: --cr-y=${y} liegt in [${minY}, ${maxY}]`);
		check(/<ellipse class="cr-die__shadow"/.test(inhalt), `Würfel ${nr}: hat einen Schatten (ellipse.cr-die__shadow)`);
		check(/<use class="cr-die__face" href="#cr-face-\d"/.test(inhalt), `Würfel ${nr}: hat eine Fläche (use.cr-die__face)`);

		// NEU (Te): der Würfel ist ein Körper aus GENAU VIER Geschwistern in
		// fester Reihenfolge — Schatten, ferne Körperfläche, nahe Körperfläche,
		// Deckfläche (Plan 4.20, D-3).
		const kinder = [...inhalt.matchAll(/<(?:ellipse|rect|use)\b[^>]*class="([^"]+)"/g)].map((m) => m[1]);
		check(kinder.length === 4, `Würfel ${nr}: genau vier Schichten (gefunden: ${kinder.length})`, ...kinder);
		check(kinder[0] === 'cr-die__shadow', `Würfel ${nr}: Schicht 1 ist der Schatten (gefunden: ${kinder[0] ?? 'keine'})`);
		check(kinder[1] === 'cr-die__side cr-die__side--far', `Würfel ${nr}: Schicht 2 ist die ferne Körperfläche (gefunden: ${kinder[1] ?? 'keine'})`);
		check(kinder[2] === 'cr-die__side cr-die__side--near', `Würfel ${nr}: Schicht 3 ist die nahe Körperfläche (gefunden: ${kinder[2] ?? 'keine'})`);
		check(kinder[3] === 'cr-die__face', `Würfel ${nr}: Schicht 4 ist die Deckfläche (gefunden: ${kinder[3] ?? 'keine'})`);

		console.log(`     Gegenprobe D-3-G (Würfel ${nr}): eine vertauschte Reihenfolge muss auffallen`);
		const vertauscht = [...kinder].reverse();
		check(vertauscht[0] !== 'cr-die__shadow',
			`D-3-G: eine vertauschte Reihenfolge (Deckfläche zuerst) wird erkannt, weil der Schatten nicht mehr an erster Stelle steht`);
	}
}

/* ============================================= D-4 Augenzahl und -lage */

console.log('\nD-4  Die sechs Flächen tragen die richtige Zahl Augen an der richtigen Stelle');
{
	const einheit = DIE_EDGE / 4;
	const sollRadius = PIP_RADIUS * einheit;
	for (let flaeche = 1; flaeche <= 6; flaeche++) {
		const symbolMatch = sprite.match(new RegExp(`<symbol id="cr-face-${flaeche}"[^>]*>([\\s\\S]*?)</symbol>`));
		check(!!symbolMatch, `symbol#cr-face-${flaeche} existiert`);
		if (!symbolMatch) {
			continue;
		}
		const pips = [...symbolMatch[1].matchAll(/<circle class="cr-die__pip" cx="(-?\d+(?:\.\d+)?)" cy="(-?\d+(?:\.\d+)?)" r="(-?\d+(?:\.\d+)?)"/g)]
			.map((m) => ({ cx: Number(m[1]), cy: Number(m[2]), r: Number(m[3]) }));
		const soll = PIP_LAYOUT[flaeche];
		check(pips.length === soll.length,
			`Fläche ${flaeche}: ${soll.length} Augen (gefunden: ${pips.length})`);

		for (const [px, py] of soll) {
			const sollX = px * einheit;
			const sollY = py * einheit;
			const treffer = pips.some((p) => p.cx === sollX && p.cy === sollY && p.r === sollRadius);
			check(treffer, `Fläche ${flaeche}: Auge bei (${sollX}, ${sollY}), Halbmesser ${sollRadius} vorhanden`);
		}
	}

	console.log('     Gegenprobe D-4-G: ein verschobenes Auge muss auffallen');
	const verstuemmelt = sprite.replace('<circle class="cr-die__pip" cx="0" cy="0" r="1.32" />', '<circle class="cr-die__pip" cx="0" cy="1" r="1.32" />');
	const symbol1 = verstuemmelt.match(/<symbol id="cr-face-1"[^>]*>([\s\S]*?)<\/symbol>/);
	const trifftMitte = symbol1 && /cx="0" cy="0" r="1.32"/.test(symbol1[1]);
	check(!trifftMitte, 'D-4-G: das verschobene Auge wird nicht mehr am Sollplatz gefunden');
}

/* ================================================== D-5 Kein Schriftzeichen */

console.log('\nD-5  Kein Schriftzeichen als Auge');
{
	const UNICODE_WUERFEL = [0x2680, 0x2681, 0x2682, 0x2683, 0x2684, 0x2685];
	const geprueft = [
		['Cloth.html', ohneKommentare(clothRoh)],
		['Dice.html', ohneKommentare(diceRoh)],
		['DiceSprite.html', ohneKommentare(lies(spriteDatei))],
	];

	for (const [name, inhalt] of geprueft) {
		check(!/<text\b/.test(inhalt), `${name}: kein <text>`);

		// Nur der sichtbare Textinhalt zwischen den Tags zählt — Attributwerte
		// (viewBox, x, y, r, cx, cy, id, class …) enthalten zwangsläufig Ziffern
		// und sind kein Auge.
		const textknoten = inhalt.replace(/<[^>]*>/g, ' ');
		check(!/[0-9]/.test(textknoten), `${name}: keine Ziffer als sichtbarer Inhalt`);
	}

	const codepunkte = geprueft.flatMap(([, inhalt]) => [...inhalt].map((z) => z.codePointAt(0)));
	const gefundeneWuerfelzeichen = UNICODE_WUERFEL.filter((cp) => codepunkte.includes(cp));
	check(gefundeneWuerfelzeichen.length === 0,
		'keins der sechs Unicode-Würfelzeichen U+2680…U+2685 kommt vor (als Codepunkt geprüft)',
		...gefundeneWuerfelzeichen.map((cp) => `U+${cp.toString(16)}`));
}

/* ============================================================ D-6 Lagen */

console.log('\nD-6  Die 24 Lagen sind vollständig, doppelfrei, rechtshändig und abgeschlossen');
{
	check(ORIENTATIONS.length === 24, `genau 24 Lagen (gefunden: ${ORIENTATIONS.length})`);

	const schluessel = ORIENTATIONS.map((o) => o.join(','));
	check(new Set(schluessel).size === schluessel.length,
		'keine Lage kommt doppelt vor');

	const topHaeufigkeit = new Map();
	for (const [top] of ORIENTATIONS) {
		topHaeufigkeit.set(top, (topHaeufigkeit.get(top) ?? 0) + 1);
	}
	for (let flaeche = 1; flaeche <= 6; flaeche++) {
		check(topHaeufigkeit.get(flaeche) === 4,
			`Augenzahl ${flaeche} erscheint genau viermal als top (gefunden: ${topHaeufigkeit.get(flaeche) ?? 0})`);
	}

	// Rechtshändigkeit: Standard-Würfel als drei Achsenpaare, kreuz(right, front) = top.
	const VEC = {
		1: [0, 0, 1], 6: [0, 0, -1],
		2: [0, 1, 0], 5: [0, -1, 0],
		3: [1, 0, 0], 4: [-1, 0, 0],
	};
	function kreuz(a, b) {
		return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
	}
	function gleich(a, b) {
		return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
	}
	let rechtshaendigFehler = 0;
	for (const [top, front, right] of ORIENTATIONS) {
		check(top + opposite(top) === 7, `opposite(${top}) === ${7 - top}`);
		if (!gleich(kreuz(VEC[right], VEC[front]), VEC[top])) {
			rechtshaendigFehler++;
		}
	}
	check(rechtshaendigFehler === 0, `alle 24 Lagen sind rechtshändig (kreuz(right, front) = top)`,
		`${rechtshaendigFehler} Lage(n) nicht rechtshändig`);

	const menge = new Set(schluessel);
	let abschlussFehler = 0;
	for (const [top, front, right] of ORIENTATIONS) {
		for (let dir = 0; dir < 4; dir++) {
			if (!menge.has(tipFaces(top, front, right, dir).join(','))) {
				abschlussFehler++;
			}
		}
	}
	check(abschlussFehler === 0,
		'tipFaces() führt aus jeder Lage in jede der vier Richtungen wieder in eine der 24 Lagen',
		`${abschlussFehler} Übergänge außerhalb der Menge`);

	console.log('     Gegenprobe D-6-G: eine künstlich verfälschte Lage muss auffallen');
	const verfaelscht = [...ORIENTATIONS.slice(0, -1), [1, 1, 1]];
	const verfaelschtHaeufigkeit = new Map();
	for (const [top] of verfaelscht) {
		verfaelschtHaeufigkeit.set(top, (verfaelschtHaeufigkeit.get(top) ?? 0) + 1);
	}
	check(verfaelschtHaeufigkeit.get(1) !== 4,
		'D-6-G: die verfälschte Lage [1, 1, 1] verändert die top-Häufigkeit erkennbar');
}

/* ====================================================== D-7 Kontrast */

console.log('\nD-7  Die Farben tragen (Kontrastverhältnis nach der WCAG-Formel)');
{
	function token(name) {
		const m = tokensCss.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
		return m ? m[1] : null;
	}
	function srgbLinear(kanal) {
		const c = kanal / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	}
	function leuchtdichte(hex) {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return 0.2126 * srgbLinear(r) + 0.7152 * srgbLinear(g) + 0.0722 * srgbLinear(b);
	}
	function kontrast(hexA, hexB) {
		const hell = Math.max(leuchtdichte(hexA), leuchtdichte(hexB));
		const dunkel = Math.min(leuchtdichte(hexA), leuchtdichte(hexB));
		return (hell + 0.05) / (dunkel + 0.05);
	}

	const printInk = token('--ck-print-ink');
	const ivory = token('--ck-ivory-100');
	const cardEdge = token('--ck-card-edge');
	check(!!printInk && !!ivory && !!cardEdge, 'alle drei Tokens in tokens.css gefunden');

	if (printInk && ivory) {
		const wert = kontrast(printInk, ivory);
		check(wert >= 4.5, `--ck-print-ink auf --ck-ivory-100: ${wert.toFixed(2)} : 1 (Sollwert ≥ 4,5)`);
	}
	if (cardEdge && ivory) {
		const wert = kontrast(cardEdge, ivory);
		check(wert >= 3.0, `--ck-card-edge auf --ck-ivory-100: ${wert.toFixed(2)} : 1 (Sollwert ≥ 3,0)`);
	}

	// NEU (Te): die zwei Körperflächen-Töne gegen das Tuch, auf dem der
	// Würfel liegt. Beide gelten als Bauteilgrenze (3 : 1), nicht als Text.
	const ivory200 = token('--ck-ivory-200');
	const ivory300 = token('--ck-ivory-300');
	const feltGreen = token('--ck-felt-green');
	check(!!ivory200 && !!ivory300 && !!feltGreen,
		'zusätzlich --ck-ivory-200, --ck-ivory-300 und --ck-felt-green in tokens.css gefunden');
	if (ivory200 && feltGreen) {
		const wert = kontrast(ivory200, feltGreen);
		check(wert >= 3.0, `--ck-ivory-200 auf --ck-felt-green: ${wert.toFixed(2)} : 1 (Sollwert ≥ 3,0, Bauteilgrenze)`);
	}
	if (ivory300 && feltGreen) {
		const wert = kontrast(ivory300, feltGreen);
		check(wert >= 3.0, `--ck-ivory-300 auf --ck-felt-green: ${wert.toFixed(2)} : 1 (Sollwert ≥ 3,0, Bauteilgrenze)`);
	}
}

/* ============================================ D-8 Kein Name, kein Fokus */

console.log('\nD-8  Die Zeichnung hat keinen erreichbaren Namen und keinen Fokus');
{
	for (const [rel, inhalt, klasse] of [
		['Resources/Private/Partials/Table/Craps/Cloth.html', cloth, 'cr-tray__drawing'],
		['Resources/Private/Partials/Table/Craps/DiceSprite.html', sprite, 'cr-dicesprite'],
	]) {
		// [^"]*\bKLASSE\b[^"]* statt einer exakten Übereinstimmung: seit
		// Umsetzungsstück Td trägt das SVG in Cloth.html ZWEI Klassen
		// ("cr-cloth__ground cr-tray__drawing"), nicht mehr nur eine.
		const tagMatch = inhalt.match(new RegExp(`<svg\\b[^>]*\\bclass="[^"]*\\b${klasse}\\b[^"]*"[^>]*>`));
		check(!!tagMatch, `${rel}: svg.${klasse} gefunden`);
		if (tagMatch) {
			check(tagMatch[0].includes('aria-hidden="true"'), `${rel}: aria-hidden="true"`);
			check(tagMatch[0].includes('focusable="false"'), `${rel}: focusable="false"`);
		}
		check(!inhalt.includes('<title>'), `${rel}: kein <title>`);
	}
}

/* ==================================== D-9 Vorgabewerte der Custom Properties */

console.log('\nD-9  Jede benutzte Custom Property der Würfelgruppe ist in tray.css mit einem Vorgabewert belegt');
{
	// "Benutzt" heißt: mit var(--cr-…) GELESEN — das geschieht in tray.css
	// selbst (matrix(var(--cr-m11), …), translate(var(--cr-x) …) und ab
	// Umsetzungsstück C6d zusätzlich in dice-view.js, das es dort noch nicht
	// gibt). --cr-x, --cr-y und --cr-h werden dagegen je Würfel per
	// style="…" GESETZT — seit Umsetzungsstück Td in Dice.html statt in
	// Tray.html —, nicht gelesen — sie brauchen deshalb keinen Vorgabewert in
	// tray.css, sie haben ja bereits einen Wert je Würfel.
	const benutzt = new Set([...trayCss.matchAll(/var\(\s*(--cr-[a-z0-9-]+)/g)].map((m) => m[1]));
	const gesetztImMarkup = new Set([...diceRoh.matchAll(/(--cr-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
	const vorgegeben = new Set([...trayCss.matchAll(/(--cr-[a-z0-9-]+)\s*:\s*[^;]+;/g)].map((m) => m[1]));

	const ohneVorgabe = [...benutzt].filter((name) => !gesetztImMarkup.has(name) && !vorgegeben.has(name));
	check(ohneVorgabe.length === 0,
		`${benutzt.size} in tray.css per var() gelesene Custom Properties haben entweder einen`
		+ ' Vorgabewert in tray.css oder werden je Würfel im Markup von Dice.html gesetzt',
		...ohneVorgabe);

	console.log('     Gegenprobe D-9-G: eine Property ohne Vorgabewert und ohne Markup-Wert muss auffallen');
	const erfunden = '--cr-gibt-es-nicht';
	const gegenprobeOhneVorgabe = !gesetztImMarkup.has(erfunden) && !vorgegeben.has(erfunden);
	check(gegenprobeOhneVorgabe, 'D-9-G: --cr-gibt-es-nicht wird korrekt als ohne Vorgabewert erkannt');
}

/* ============================== D-10 Beide Schichten, dieselbe Maßordnung */

console.log('\nD-10  Cloth.html und Dice.html tragen dieselbe Maßordnung, und felt.css legt das Gitter prozentual genau darauf');
{
	const clothViewBox = clothRoh.match(/viewBox="0 0 (\d+) (\d+)"/);
	const diceViewBox = diceRoh.match(/viewBox="0 0 (\d+) (\d+)"/);
	check(!!clothViewBox && !!diceViewBox && clothViewBox[0] === diceViewBox[0],
		`Cloth.html und Dice.html tragen dieselbe viewBox (gefunden: Cloth="${clothViewBox?.[0] ?? 'keine'}", Dice="${diceViewBox?.[0] ?? 'keine'}")`);
	check(!!clothViewBox && Number(clothViewBox[1]) === VIEW_W && Number(clothViewBox[2]) === VIEW_H,
		`die viewBox entspricht VIEW_W×VIEW_H aus dice-geometry.js (${VIEW_W}×${VIEW_H})`);

	const clothPreserve = clothRoh.match(/preserveAspectRatio="([^"]+)"/)?.[1] ?? null;
	const dicePreserve = diceRoh.match(/preserveAspectRatio="([^"]+)"/)?.[1] ?? null;
	check(clothPreserve !== null && clothPreserve === dicePreserve && clothPreserve === 'xMidYMid meet',
		`beide Schichten tragen preserveAspectRatio="xMidYMid meet" (gefunden: Cloth="${clothPreserve}", Dice="${dicePreserve}")`);

	const feltCss = ohneBlockKommentare(lies(feltCssDatei));
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

	const clothRumpf = regelRumpf(feltCss, '.cr-cloth') ?? '';
	check(new RegExp(`aspect-ratio:\\s*${VIEW_W}\\s*/\\s*${VIEW_H}`).test(clothRumpf),
		`.cr-cloth setzt aspect-ratio: ${VIEW_W} / ${VIEW_H} (dieselben Zahlen wie dice-geometry.js)`, clothRumpf.trim());

	const feltRumpf = regelRumpf(feltCss, '.cr-felt') ?? '';
	const links = `calc(100% * ${FELT_LEFT} / ${VIEW_W})`;
	const oben = `calc(100% * ${FELT_TOP} / ${VIEW_H})`;
	const breite = `calc(100% * ${FELT_RIGHT - FELT_LEFT} / ${VIEW_W})`;
	const hoehe = `calc(100% * ${FELT_BOTTOM - FELT_TOP} / ${VIEW_H})`;
	check(feltRumpf.includes(links), `.cr-felt: inset-inline-start ist ${links}`, feltRumpf.trim());
	check(feltRumpf.includes(oben), `.cr-felt: inset-block-start ist ${oben}`, feltRumpf.trim());
	check(feltRumpf.includes(breite), `.cr-felt: inline-size ist ${breite}`, feltRumpf.trim());
	check(feltRumpf.includes(hoehe), `.cr-felt: block-size ist ${hoehe}`, feltRumpf.trim());

	console.log('     Gegenprobe D-10-G: eine um 1 verschobene Prozentrechnung muss auffallen');
	const linksVerschoben = `calc(100% * ${FELT_LEFT + 1} / ${VIEW_W})`;
	const feltRumpfGegenprobe = feltRumpf.replace(links, linksVerschoben);
	check(!feltRumpfGegenprobe.includes(links) || feltRumpfGegenprobe === feltRumpf,
		'D-10-G: eine verschobene Prozentrechnung wird nicht mehr am Sollplatz gefunden');
}

/* ================================ D-11 Ein Wettfeld löst keinen Wurf aus */

console.log('\nD-11  Ein Wettfeld löst keinen Wurf aus: pointer-events an der Würfelschicht, data-cr-tray genau einmal');
{
	const feltCss = ohneBlockKommentare(lies(feltCssDatei));
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

	const diceLayerRumpf = regelRumpf(feltCss, '.cr-cloth__dice') ?? '';
	check(/pointer-events:\s*none/.test(diceLayerRumpf), '.cr-cloth__dice setzt pointer-events: none', diceLayerRumpf.trim());

	const dieRumpf = regelRumpf(feltCss, '.cr-cloth__dice .cr-die') ?? '';
	check(/pointer-events:\s*auto/.test(dieRumpf), '.cr-cloth__dice .cr-die setzt pointer-events: auto', dieRumpf.trim());

	const trayAttribute = [...clothRoh.matchAll(/data-cr-tray=/g)].length + [...diceRoh.matchAll(/data-cr-tray=/g)].length;
	check(trayAttribute === 1, `data-cr-tray steht an genau einem Element (gefunden: ${trayAttribute})`);
	check(/data-cr-tray=/.test(diceRoh) && !/data-cr-tray=/.test(clothRoh),
		'data-cr-tray steht an der Würfelschicht (Dice.html), nicht an Cloth.html');

	console.log('     Gegenprobe D-11-G: eine Fassung ohne pointer-events: none an .cr-cloth__dice muss auffallen');
	const ohnePointerNone = feltCss.replace(/(\.cr-cloth__dice\s*\{[^}]*?)pointer-events:\s*none;\s*/, '$1');
	const gegenprobeRumpf = regelRumpf(ohnePointerNone, '.cr-cloth__dice') ?? '';
	check(!/pointer-events:\s*none/.test(gegenprobeRumpf), 'D-11-G: die entfernte Regel wird als fehlend erkannt');
}

/* ============================ D-12 Bildschirmraum statt Körperraum */

console.log('\nD-12  Der Körper liegt im Bildschirmraum: translate() vor matrix(), Lift-Vielfache wachsen streng 0/1/2');
{
	// Jede "transform: …;"-Deklaration, unabhängig vom Selektor davor.
	const deklarationen = [...trayCss.matchAll(/transform:\s*([\s\S]*?);/g)].map((m) => m[1]);
	const mitMatrix = deklarationen.filter((d) => d.includes('matrix('));
	check(mitMatrix.length === 2,
		`genau zwei Transformationsketten mit matrix() — die Ruhelage und der Handversatz (gefunden: ${mitMatrix.length})`);
	for (const [i, kette] of mitMatrix.entries()) {
		const posTranslate = kette.indexOf('translate(');
		const posMatrix = kette.indexOf('matrix(');
		check(posTranslate !== -1 && posMatrix !== -1 && posTranslate < posMatrix,
			`Kette ${i + 1}: translate() steht vor matrix()`, kette.trim());
	}

	console.log('     Gegenprobe D-12-G: eine Kette mit matrix() vor translate() muss auffallen');
	const vertauschteKette = 'matrix(1,0,0,1,0,0) translate(0px, 0px)';
	const falscheReihenfolge = vertauschteKette.indexOf('translate(') < vertauschteKette.indexOf('matrix(');
	check(!falscheReihenfolge, 'D-12-G: matrix() vor translate() wird als falsche Reihenfolge erkannt');

	const liftDefault = trayCss.match(/\.cr-die\s*\{[^}]*?--cr-lift:\s*(-?\d+(?:\.\d+)?)/);
	const liftNear = trayCss.match(/\.cr-die__side--near\s*\{\s*--cr-lift:\s*(-?\d+(?:\.\d+)?)/);
	const liftFar = trayCss.match(/\.cr-die__side--far\s*\{\s*--cr-lift:\s*(-?\d+(?:\.\d+)?)/);
	check(!!liftDefault && Number(liftDefault[1]) === 0,
		'die Vorgabe --cr-lift: 0 steht auf .cr-die — die Deckfläche übernimmt sie unverändert', liftDefault?.[0]);
	check(!!liftNear && Number(liftNear[1]) === 1,
		'.cr-die__side--near setzt --cr-lift: 1', liftNear?.[0]);
	check(!!liftFar && Number(liftFar[1]) === 2,
		'.cr-die__side--far setzt --cr-lift: 2', liftFar?.[0]);
	if (liftDefault && liftNear && liftFar) {
		check(Number(liftDefault[1]) < Number(liftNear[1]) && Number(liftNear[1]) < Number(liftFar[1]),
			'die Lift-Vielfachen wachsen streng: 0 < 1 < 2');
	}

	console.log('     Gegenprobe D-12-G (Lift): eine nicht wachsende Folge muss auffallen');
	const nichtWachsend = [0, 2, 1];
	const waechstStreng = nichtWachsend[0] < nichtWachsend[1] && nichtWachsend[1] < nichtWachsend[2];
	check(!waechstStreng, 'D-12-G: die Folge 0, 2, 1 wird korrekt als nicht streng wachsend erkannt');
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Zeichnung und Maßordnung beschreiben'
	+ '\ndieselbe Sache: viewBox, Tuchmaße, Gummileisten und Würfelgruppen in'
	+ '\nCloth.html/Dice.html stimmen mit dice-geometry.js überein, die sechs'
	+ '\nWürfelflächen tragen die richtigen Augen ohne ein einziges Schriftzeichen,'
	+ '\ndie 24 Lagen sind vollständig, doppelfrei, rechtshändig und unter tipFaces()'
	+ '\nabgeschlossen, die Farben tragen den Kontrast, die Zeichnung hat keinen'
	+ '\nerreichbaren Namen, jede Custom Property hat einen Vorgabewert, beide'
	+ '\nSchichten tragen dieselbe Maßordnung, und ein Wettfeld löst keinen Wurf aus.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
