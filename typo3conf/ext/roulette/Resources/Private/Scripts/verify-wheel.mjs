/**
 * Roulette – Nachweis Radgeometrie gegen Anhang F
 * =================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18. Laufzeit unter einer Sekunde.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/verify-wheel.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.28)
 * ---------------------------------------------
 *   W-0  wheel-geometry.js lädt unter Node ohne jede Vorbereitung
 *   W-1  WHEEL_ORDER ist wörtlich Anhang F, 38 verschiedene Einträge
 *   W-2  das Kennzeichen des amerikanischen Rades: gegenüberliegende Fächer
 *        bilden Paare aufeinanderfolgender Zahlen
 *   W-3  Farben: 18 rot, 18 schwarz, 2 grün, überschneidungsfrei, Vereinigung
 *        ist WHEEL_ORDER, stimmen wörtlich mit Anhang F überein
 *   W-4  PHP (Classes/WheelGeometry.php) und JavaScript stimmen überein
 *   W-5  Zeichnung (Wheel.html) und Physik (wheel-physics.js) stimmen überein
 *   W-6  der Fachwinkel ist überall derselbe: angleOf(k), WheelProcessor.php
 *        und k × 360 / 38 liefern auf sechs Nachkommastellen dieselben Werte
 *   W-7  Kontrast der aufgemalten Fachzahl auf allen drei Fachfarben ≥ 4,5 : 1
 *   W-8  Farbe ist nicht die einzige Aussage im Verlaufsstreifen
 *
 * STAND TEILSTÜCK C2-B: wheel-physics.js (W-5) und roulette.js (W-8) entstehen
 * erst in den Teilstücken C2-C und C2-D. Bis dahin werden die beiden Prüfungen
 * als "übersprungen" gemeldet, statt an einer fehlenden Datei zu scheitern —
 * dieselbe Bauart wie A-7 in verify-cabinet.mjs dieser Extension. Ein
 * übersprungener, klar benannter Nachweis ist ehrlicher als einer, der
 * stillschweigend besteht.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/roulette/ */
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

function lies(datei) {
	return readFileSync(datei, 'utf8');
}

/** Entfernt Block- und Zeilenkommentare (PHP/CSS/JS). */
function ohneKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

console.log('\nRoulette – Nachweis Radgeometrie gegen Anhang F');
console.log('=================================================\n');

/*
 * Anhang F, wörtlich ein zweites Mal — das ist der Sinn der Sache: die
 * erwartete Folge steht hier fest, unabhängig davon, was die geprüften
 * Dateien behaupten.
 */
const ERWARTET_ORDER = [
	'0', '28', '9', '26', '30', '11', '7', '20', '32', '17',
	'5', '22', '34', '15', '3', '24', '36', '13', '1', '00',
	'27', '10', '25', '29', '12', '8', '19', '31', '18', '6',
	'21', '33', '16', '4', '23', '35', '14', '2',
];
const ERWARTET_RED = [
	'1', '3', '5', '7', '9', '12', '14', '16', '18',
	'19', '21', '23', '25', '27', '30', '32', '34', '36',
];
const ERWARTET_BLACK = [
	'2', '4', '6', '8', '10', '11', '13', '15', '17',
	'20', '22', '24', '26', '28', '29', '31', '33', '35',
];
const ERWARTET_GREEN = ['0', '00'];

/* ================================================== W-0 Ohne Vorbereitung */

const GEOMETRY_JS_PFAD = path.join(EXT, 'Resources/Public/JavaScript/wheel-geometry.js');
const GEOMETRY_QUELLTEXT = lies(GEOMETRY_JS_PFAD);
const GEOMETRY_OHNE_KOMMENTARE = ohneKommentare(GEOMETRY_QUELLTEXT);

console.log('W-0  wheel-geometry.js lädt unter Node ohne jede Vorbereitung');
{
	check(!/\bimport\b/.test(GEOMETRY_OHNE_KOMMENTARE), 'kein import im Quelltext (Kommentare ausgenommen)');
	check(!/\bdocument\b/.test(GEOMETRY_OHNE_KOMMENTARE), 'kein document im Quelltext');
	check(!/\bwindow\b/.test(GEOMETRY_OHNE_KOMMENTARE), 'kein window im Quelltext');
	check(!/\blocalStorage\b/.test(GEOMETRY_OHNE_KOMMENTARE), 'kein localStorage im Quelltext');
	check(!/Math\.random/.test(GEOMETRY_OHNE_KOMMENTARE), 'kein Math.random im Quelltext');
}

let modul;
try {
	modul = await import(new URL('../../Public/JavaScript/wheel-geometry.js', import.meta.url));
	check(true, 'der import() gelingt unmittelbar');
} catch (fehlerObjekt) {
	check(false, 'der import() gelingt unmittelbar', String(fehlerObjekt));
	console.log(`\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen (Abbruch, Modul lädt nicht).`);
	process.exit(1);
}

const { WHEEL_ORDER, RED, BLACK, GREEN, colourOf, labelOf, angleOf } = modul;

/* ======================================================= W-1 WHEEL_ORDER */

console.log('\nW-1  WHEEL_ORDER ist wörtlich Anhang F');
{
	check(WHEEL_ORDER.length === 38, `38 Einträge (gefunden: ${WHEEL_ORDER.length})`);
	check(new Set(WHEEL_ORDER).size === WHEEL_ORDER.length, 'alle 38 Einträge sind verschieden');
	check(
		JSON.stringify(WHEEL_ORDER) === JSON.stringify(ERWARTET_ORDER),
		'WHEEL_ORDER stimmt Eintrag für Eintrag mit Anhang F überein',
		`gefunden:  ${JSON.stringify(WHEEL_ORDER)}`,
		`erwartet:  ${JSON.stringify(ERWARTET_ORDER)}`
	);
}

/* ========================================== W-2 Gegenüberliegende Paare */

console.log('\nW-2  Gegenüberliegende Fächer bilden Paare aufeinanderfolgender Zahlen');
{
	const abweichungen = [];
	if (WHEEL_ORDER.length === 38) {
		const nullIndex = WHEEL_ORDER.indexOf('0');
		const doppelNullIndex = WHEEL_ORDER.indexOf('00');
		if (doppelNullIndex !== (nullIndex + 19) % 38) {
			abweichungen.push(`'0' (Index ${nullIndex}) liegt nicht '00' (Index ${doppelNullIndex}) gegenüber`);
		}
		for (let i = 0; i < 19; i++) {
			const a = WHEEL_ORDER[i];
			const b = WHEEL_ORDER[i + 19];
			if (a === '0' || a === '00' || b === '0' || b === '00') {
				continue;
			}
			const na = Number(a);
			const nb = Number(b);
			const istPaar = Math.abs(na - nb) === 1 && Math.min(na, nb) % 2 === 1;
			if (!istPaar) {
				abweichungen.push(`Index ${i} (${a}) und Index ${i + 19} (${b}) bilden kein Paar {2k−1, 2k}`);
			}
		}
	}
	check(abweichungen.length === 0,
		'alle 19 Gegenüber-Paare sind {2k−1, 2k}, und 0 liegt 00 gegenüber',
		...abweichungen);
}

/* ===================================================== W-3 Farben */

console.log('\nW-3  Farben: 18 rot, 18 schwarz, 2 grün, überschneidungsfrei');
{
	check(RED.length === 18, `RED hat 18 Einträge (gefunden: ${RED.length})`);
	check(BLACK.length === 18, `BLACK hat 18 Einträge (gefunden: ${BLACK.length})`);
	check(GREEN.length === 2, `GREEN hat 2 Einträge (gefunden: ${GREEN.length})`);

	const ueberschneidung = RED.filter((n) => BLACK.includes(n) || GREEN.includes(n))
		.concat(BLACK.filter((n) => GREEN.includes(n)));
	check(ueberschneidung.length === 0, 'RED, BLACK und GREEN überschneiden sich nicht', ...ueberschneidung);

	const vereinigung = new Set([...RED, ...BLACK, ...GREEN]);
	const wheelSet = new Set(WHEEL_ORDER);
	const gleich = vereinigung.size === wheelSet.size
		&& [...vereinigung].every((n) => wheelSet.has(n));
	check(gleich, 'die Vereinigung von RED, BLACK und GREEN ist genau WHEEL_ORDER');

	check(JSON.stringify([...RED].sort()) === JSON.stringify([...ERWARTET_RED].sort()),
		'RED stimmt wörtlich mit Anhang F überein');
	check(JSON.stringify([...BLACK].sort()) === JSON.stringify([...ERWARTET_BLACK].sort()),
		'BLACK stimmt wörtlich mit Anhang F überein');
	check(JSON.stringify([...GREEN].sort()) === JSON.stringify([...ERWARTET_GREEN].sort()),
		'GREEN stimmt wörtlich mit Anhang F überein');

	for (const label of WHEEL_ORDER) {
		const erwarteteFarbe = ERWARTET_GREEN.includes(label) ? 'green' : ERWARTET_RED.includes(label) ? 'red' : 'black';
		check(colourOf(label) === erwarteteFarbe, `colourOf('${label}') === '${erwarteteFarbe}'`);
	}
}

/* =============================================== W-4 PHP ≡ JavaScript */

console.log('\nW-4  Classes/WheelGeometry.php ≡ wheel-geometry.js, Konstante für Konstante');
{
	const phpQuelltext = lies(path.join(EXT, 'Classes/WheelGeometry.php'));

	function phpArray(name) {
		const treffer = new RegExp(`public const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`).exec(phpQuelltext);
		if (treffer === null) {
			return null;
		}
		return [...treffer[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);
	}

	const phpOrder = phpArray('ORDER');
	const phpRed = phpArray('RED');
	const phpBlack = phpArray('BLACK');
	const phpGreen = phpArray('GREEN');

	check(phpOrder !== null, 'WheelGeometry::ORDER ist im Quelltext zu finden');
	check(phpOrder !== null && JSON.stringify(phpOrder) === JSON.stringify(WHEEL_ORDER),
		'WheelGeometry::ORDER === WHEEL_ORDER, Eintrag für Eintrag',
		`PHP: ${JSON.stringify(phpOrder)}`, `JS:  ${JSON.stringify(WHEEL_ORDER)}`);
	check(phpRed !== null && JSON.stringify(phpRed) === JSON.stringify(RED),
		'WheelGeometry::RED === RED');
	check(phpBlack !== null && JSON.stringify(phpBlack) === JSON.stringify(BLACK),
		'WheelGeometry::BLACK === BLACK');
	check(phpGreen !== null && JSON.stringify(phpGreen) === JSON.stringify(GREEN),
		'WheelGeometry::GREEN === GREEN');

	check(/private function __construct\(\) \{\}/.test(phpQuelltext),
		'WheelGeometry hat einen privaten Konstruktor (Namensschild, keine Instanz)');
	check(/throw new \\OutOfRangeException/.test(phpQuelltext),
		'colourOf() wirft \\OutOfRangeException bei einem unbekannten Fach (nicht \\RangeException, das es in PHP nicht gibt)');
}

/* ================================= W-5 Zeichnung ≡ Physik (Halbmesser) */

console.log('\nW-5  Zeichnung (Wheel.html) und Physik (wheel-physics.js) stimmen überein');
{
	const wheelHtmlPfad = path.join(EXT, 'Resources/Private/Partials/Table/Roulette/Wheel.html');
	const physicsJsPfad = path.join(EXT, 'Resources/Public/JavaScript/wheel-physics.js');

	if (!existsSync(wheelHtmlPfad)) {
		check(false, 'Wheel.html existiert (entsteht in Teilstück C2-B)');
	} else if (!existsSync(physicsJsPfad)) {
		console.log('  · übersprungen — wheel-physics.js existiert noch nicht (entsteht in Teilstück C2-C)');
	} else {
		const wheelHtml = lies(wheelHtmlPfad);
		const physicsJs = ohneKommentare(lies(physicsJsPfad));

		check(/viewBox="0 0 200 200"/.test(wheelHtml), 'Wheel.html: viewBox="0 0 200 200"');

		const NAMEN = [
			'TRACK_RADIUS', 'DEFLECTOR_RADIUS', 'ROTOR_RADIUS', 'POCKET_RADIUS',
			'CONE_RADIUS', 'BALL_RADIUS',
		];
		for (const name of NAMEN) {
			const treffer = new RegExp(`export const ${name}\\s*=\\s*(\\d+(?:\\.\\d+)?)`).exec(physicsJs);
			check(treffer !== null, `wheel-physics.js definiert ${name}`);
			if (treffer !== null) {
				const wert = treffer[1];
				check(wheelHtml.includes(wert), `${name} (${wert}) kommt in Wheel.html als Zahl vor`);
			}
		}

		const pocketCountTreffer = /export const POCKET_COUNT\s*=\s*(\d+)/.exec(physicsJs);
		check(pocketCountTreffer !== null && Number(pocketCountTreffer[1]) === WHEEL_ORDER.length,
			`POCKET_COUNT ist gleich WHEEL_ORDER.length (${WHEEL_ORDER.length})`);
	}
}

/* ==================================================== W-6 Der Fachwinkel */

console.log('\nW-6  Der Fachwinkel ist überall derselbe');
{
	const processorPfad = path.join(EXT, 'Classes/DataProcessing/WheelProcessor.php');
	const processorQuelltext = lies(processorPfad);

	check(/\$pocketStep\s*=\s*360\.0\s*\/\s*\$pocketCount/.test(processorQuelltext),
		'WheelProcessor.php: $pocketStep = 360.0 / $pocketCount');
	check(/round\(\s*\$index \* \$pocketStep\s*,\s*6\s*\)/.test(processorQuelltext),
		'WheelProcessor.php: angle = round($index * $pocketStep, 6)');
	check(/round\(\s*\$index \* \$pocketStep \+ \$pocketStep \/ 2\s*,\s*6\s*\)/.test(processorQuelltext),
		'WheelProcessor.php: labelAngle = round($index * $pocketStep + $pocketStep / 2, 6)');

	const abweichungen = [];
	for (let k = 0; k < WHEEL_ORDER.length; k++) {
		const ausJs = Math.round(angleOf(k) * 1e6) / 1e6;
		const ausFormel = Math.round(((k * 360) / WHEEL_ORDER.length) * 1e6) / 1e6;
		if (ausJs !== ausFormel) {
			abweichungen.push(`k=${k}: angleOf=${ausJs} Formel=${ausFormel}`);
		}
	}
	check(abweichungen.length === 0,
		'angleOf(k) und k × 360 / 38 stimmen für alle 38 Fächer auf sechs Nachkommastellen überein',
		...abweichungen);
}

/* ========================================================= W-7 Kontrast */

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

console.log('\nW-7  Kontrast der aufgemalten Fachzahl auf allen drei Fachfarben ≥ 4,5 : 1');
{
	const tokensCss = lies(path.join(EXT, '../casino_startpage/Resources/Public/Css/tokens.css'));
	function tokenWert(name) {
		const treffer = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(tokensCss);
		return treffer?.[1];
	}

	const mark = tokenWert('ck-pocket-mark');
	check(!!mark, `--ck-pocket-mark steht in tokens.css (gefunden: ${mark})`);

	for (const farbe of ['red', 'black', 'green']) {
		const grund = tokenWert(`ck-pocket-${farbe}`);
		check(!!grund, `--ck-pocket-${farbe} steht in tokens.css (gefunden: ${grund})`);
		if (mark && grund) {
			const kontrast = kontrastverhaeltnis(mark, grund);
			console.log(`      --ck-pocket-mark auf --ck-pocket-${farbe}: ${kontrast.toFixed(2)} : 1 (verlangt ≥ 4,5 : 1)`);
			check(kontrast >= 4.5,
				`Fachzahl gegen ${farbe} erreicht mindestens 4,5 : 1 (gemessen: ${kontrast.toFixed(2)})`);
		}
	}
}

/* =================================== W-8 Farbe ist nicht die einzige Aussage */

console.log('\nW-8  Farbe ist nicht die einzige Aussage im Verlaufsstreifen');
{
	const rouletteJsPfad = path.join(EXT, 'Resources/Public/JavaScript/roulette.js');
	if (!existsSync(rouletteJsPfad)) {
		console.log('  · übersprungen — roulette.js existiert noch nicht (entsteht in Teilstück C2-D)');
	} else {
		const rouletteJs = ohneKommentare(lies(rouletteJsPfad));
		check(/\btext\b/.test(rouletteJs), 'roulette.js setzt ein text-Feld für den Verlaufsstreifen');
		check(/\btitle\b/.test(rouletteJs), 'roulette.js setzt einen title mit dem Farbnamen');
	}
}

/* Zusätzlich: jedes Fach der Zeichnung trägt seine Zahl als <text> (WCAG 1.4.1) */
console.log('\n     Ergänzend: jedes Fach trägt seine Zahl als <text> in Wheel.html');
{
	const wheelHtmlPfad = path.join(EXT, 'Resources/Private/Partials/Table/Roulette/Wheel.html');
	const wheelHtml = lies(wheelHtmlPfad);
	check(/<text class="ro-wheel__label"/.test(wheelHtml),
		'Wheel.html rendert die Fachzahl als <text>, nicht nur als Farbe');
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Die Radanordnung ist Anhang F, wörtlich,'
	+ '\nan allen geprüften Orten übereinstimmend, mit ausreichendem Kontrast.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
