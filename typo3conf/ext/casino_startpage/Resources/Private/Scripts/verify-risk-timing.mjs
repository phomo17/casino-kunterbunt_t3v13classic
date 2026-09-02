/**
 * Casino Kunterbunt – Nachweis der Blinkgrenze der Risiko-Leiter
 * ==============================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend, ändert nichts):
 *
 *   ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/verify-risk-timing.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei der ersten Abweichung.
 *
 *
 * WAS HIER BEWIESEN WIRD
 * ----------------------
 * CONCEPT.md Teil A 3.4 und Teil B 6.1 setzen eine Sicherheitsgrenze: die
 * Periode je Seite darf 200 ms NIE unterschreiten, weil schnelleres Blinken bei
 * lichtempfindlichen Menschen Anfälle auslösen kann. Anhang B (B.12) schreibt
 * zusätzlich die Trefferfenster jeder Stufe fest. Die Abnahme von Teil B,
 * Phase 2 verlangt beides nachgewiesen.
 *
 * Gerechnet wird deshalb mit risk-timing.js SELBST – derselben Datei, aus der
 * der Browser seinen Takt bezieht. Eine eigens für die Prüfung geschriebene
 * Formel könnte richtig rechnen, während das Spiel falsch blinkt; dann wäre der
 * Nachweis wertlos. Genau deshalb hat risk-timing.js keinen einzigen Import:
 * Node kennt die Import-Map von TYPO3 nicht.
 *
 *
 * WARUM GANZZAHLIG GERECHNET WIRD
 * -------------------------------
 * Verglichen werden ausschließlich Millisekunden als ganze Zahlen. Im ganzen
 * Skript steht kein Vergleich zweier Kommazahlen auf Gleichheit. Der einzige
 * Kommawert, der geprüft wird, ist die Blitzrate – und der wird mit <= geprüft.
 */

import * as timing from '../../Public/JavaScript/risk-timing.js';

const {
	SIDE_MIN_MS,
	SIDE_MS,
	ON_MIN_MS,
	ON_DECAY,
	ON_STEPS_PER_LEVEL,
	ON_LEVEL_OFFSET,
	sideMs,
	onMs,
	stepTiming,
} = timing;

/** Bis hierhin wird jede einzelne Stufe durchgerechnet. */
const SWEEP = 100000;

/** Grenze aus CONCEPT.md 3.4: drei Lichtwechsel je Sekunde. */
const MAX_FLASHES_PER_SECOND = 3;

/** Bis zu dieser Stufe muss das Trefferfenster STRENG fallen (Anhang B). */
const STRICT_UNTIL = 6;

/**
 * Die Wertetabelle aus CONCEPT.md Anhang B (B.12), Wort für Wort abgeschrieben.
 * Von Hand nachgerechnet: fenster(n) = max(40, round(200 · 0,85^(n+4))).
 * Stufe 4 ist der Wert, den man am leichtesten falsch abschreibt: 200 · 0,85^8 ist
 * 54,498… und rundet damit auf 54, nicht auf 55.
 */
const EXPECTED = [
	{ level: 1, side: 200, on: 89, dark: 111 },
	{ level: 2, side: 200, on: 75, dark: 125 },
	{ level: 3, side: 200, on: 64, dark: 136 },
	{ level: 4, side: 200, on: 54, dark: 146 },
	{ level: 5, side: 200, on: 46, dark: 154 },
	{ level: 6, side: 200, on: 40, dark: 160 },
	{ level: 7, side: 200, on: 40, dark: 160 },
	{ level: 20, side: 200, on: 40, dark: 160 },
	{ level: 5000, side: 200, on: 40, dark: 160 },
];

/**
 * Konstanten der ALTEN Kurve aus Teil A. Sie müssen restlos verschwunden sein —
 * eine stehen gebliebene Konstante wäre eine Einladung, versehentlich wieder
 * nach ihr zu greifen.
 */
const REMOVED = ['SIDE_START_MS', 'SIDE_DECAY', 'CAP_LEVEL', 'DUTY_MIN', 'DUTY_DECAY', 'dutyFraction'];

/** Werte, die keine gültige Stufe sind und trotzdem gültige Zeiten liefern müssen. */
const NONSENSE = [0, -5, 1.7, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, '12', undefined, null];

let failed = false;

/**
 * @param {boolean} condition
 * @param {string} message
 * @returns {void}
 */
function check(condition, message) {
	if (condition) {
		console.log(`  OK      ${message}`);
		return;
	}
	failed = true;
	console.log(`  FEHLER  ${message}`);
}

console.log('Konstanten');
check(SIDE_MIN_MS === 200, `Sicherheitsgrenze der Periode ${SIDE_MIN_MS} ms (erwartet 200)`);
check(SIDE_MS === 200, `Periode dieser Kurve ${SIDE_MS} ms (erwartet 200)`);
check(ON_MIN_MS === 40, `Untergrenze des Trefferfensters ${ON_MIN_MS} ms (erwartet 40)`);
check(ON_DECAY === 0.85, `Schrumpffaktor je Schritt ${ON_DECAY} (erwartet 0.85)`);
check(ON_STEPS_PER_LEVEL === 1, `Schritte je Stufe ${ON_STEPS_PER_LEVEL} (erwartet 1)`);
check(ON_LEVEL_OFFSET === 4, `Vorsprung vor Stufe 1: ${ON_LEVEL_OFFSET} Schritte (erwartet 4)`);
check(SIDE_MIN_MS / 5 === ON_MIN_MS,
	`20 % von ${SIDE_MIN_MS} ms sind ${ON_MIN_MS} ms (Anhang B nennt 40 ms)`);

console.log('\nDie alte Kurve aus Teil A ist restlos verschwunden');
for (const name of REMOVED) {
	check(!(name in timing), `${name} wird nicht mehr ausgeführt`);
}

console.log('\nDie Wertetabelle aus CONCEPT.md Anhang B (B.12)');
console.log('  Stufe   Periode/Seite   Trefferfenster   Dunkel   Blitze/s je Feld');
for (const row of EXPECTED) {
	const step = stepTiming(row.level);
	console.log(
		`  ${String(row.level).padStart(5)}   ${`${step.sideMs} ms`.padStart(13)}`
		+ `   ${`${step.onMs} ms`.padStart(14)}   ${`${step.darkMs} ms`.padStart(6)}`
		+ `   ${step.flashesPerSecond.toFixed(2).replace('.', ',').padStart(16)}`
	);
}

console.log('\nAbgleich mit Anhang B, ganzzahlig in Millisekunden');
for (const row of EXPECTED) {
	const step = stepTiming(row.level);
	check(step.sideMs === row.side,
		`Stufe ${row.level}: ${step.sideMs} ms je Seite (erwartet ${row.side})`);
	check(step.onMs === row.on,
		`Stufe ${row.level}: ${step.onMs} ms Trefferfenster (erwartet ${row.on})`);
	check(step.darkMs === row.dark,
		`Stufe ${row.level}: ${step.darkMs} ms dunkel (erwartet ${row.dark})`);
}

console.log(`\nStreng monoton fallend bis Stufe ${STRICT_UNTIL}`);
for (let level = 1; level < STRICT_UNTIL; level++) {
	const here = onMs(level);
	const next = onMs(level + 1);
	check(next < here, `Stufe ${level} → ${level + 1}: ${here} ms → ${next} ms`);
}

console.log(`\nAb Stufe ${STRICT_UNTIL} ändert sich nichts mehr`);
const settled = stepTiming(STRICT_UNTIL);
for (const level of [STRICT_UNTIL, 7, 20, 99, 1000, 5000, SWEEP]) {
	const step = stepTiming(level);
	check(step.sideMs === settled.sideMs && step.onMs === settled.onMs,
		`Stufe ${level}: ${step.sideMs} ms / ${step.onMs} ms (wie Stufe ${STRICT_UNTIL})`);
}

console.log(`\nAlle Stufen 1 bis ${SWEEP}`);
let minSide = Number.POSITIVE_INFINITY;
let maxSide = 0;
let minOn = Number.POSITIVE_INFINITY;
let maxFlashes = 0;
let periodConstant = true;
let neverRising = true;
let onFitsInSide = true;
let alwaysDark = true;
let integral = true;
let previousOn = Number.POSITIVE_INFINITY;

for (let level = 1; level <= SWEEP; level++) {
	const step = stepTiming(level);
	minSide = Math.min(minSide, step.sideMs);
	maxSide = Math.max(maxSide, step.sideMs);
	minOn = Math.min(minOn, step.onMs);
	maxFlashes = Math.max(maxFlashes, step.flashesPerSecond);
	if (step.sideMs !== SIDE_MIN_MS) {
		periodConstant = false;
	}
	if (step.onMs > previousOn) {
		neverRising = false;
	}
	if (step.onMs > step.sideMs || step.darkMs < 0) {
		onFitsInSide = false;
	}
	if (step.darkMs <= 0) {
		alwaysDark = false;
	}
	if (!Number.isInteger(step.sideMs) || !Number.isInteger(step.onMs) || !Number.isInteger(step.darkMs)) {
		integral = false;
	}
	previousOn = step.onMs;
}

check(periodConstant && minSide === 200 && maxSide === 200,
	`Periode je Seite auf JEDER Stufe genau ${minSide} ms (Anhang B: konstant 200)`);
check(minSide >= SIDE_MIN_MS,
	`kürzeste Periode je Seite: ${minSide} ms (Grenze ${SIDE_MIN_MS} ms, CONCEPT.md 3.4)`);
check(minOn >= ON_MIN_MS,
	`kürzestes Trefferfenster: ${minOn} ms (Untergrenze ${ON_MIN_MS} ms)`);
check(maxFlashes <= MAX_FLASHES_PER_SECOND,
	`höchste Blitzrate je Lichtfeld: ${maxFlashes.toFixed(2).replace('.', ',')} je Sekunde `
	+ `(Grenze ${MAX_FLASHES_PER_SECOND})`);
check(neverRising, 'das Trefferfenster wächst auf keiner Stufe – keine Stufe ist leichter als die davor');
check(onFitsInSide, 'das Trefferfenster ist nie länger als die Periode, in der es liegt');
check(alwaysDark, 'auf jeder Stufe gibt es Momente, in denen beide Felder dunkel sind');
check(integral, 'alle Zeiten sind ganze Millisekunden');

console.log('\nUnsinnige Eingaben liefern trotzdem gültige Zeiten');
for (const value of NONSENSE) {
	const step = stepTiming(value);
	check(
		Number.isInteger(step.sideMs) && step.sideMs >= SIDE_MIN_MS
		&& Number.isInteger(step.onMs) && step.onMs >= ON_MIN_MS,
		`stepTiming(${String(value)}) → ${step.sideMs} ms / ${step.onMs} ms`
	);
}

console.log(failed
	? '\nERGEBNIS: die Schwierigkeitskurve weicht von CONCEPT.md Anhang B ab.'
	: '\nERGEBNIS: 200 ms je Seite auf jeder Stufe, 40 ms Trefferfenster werden nie '
	+ 'unterschritten, die Werte aus Anhang B stimmen auf die Millisekunde.');

process.exit(failed ? 1 : 0);
