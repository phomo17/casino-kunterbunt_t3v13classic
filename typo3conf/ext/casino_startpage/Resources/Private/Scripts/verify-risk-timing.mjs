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

// @pruefstand modus=egal laufzeit=kurz

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import * as timing from '../../Public/JavaScript/risk-timing.js';

const {
	SIDE_MIN_MS,
	SIDE_MS,
	ON_MIN_MS,
	ON_DECAY,
	ON_STEPS_PER_LEVEL,
	ON_LEVEL_OFFSET,
	CURVE_FLAT,
	CURVE_STEEP,
	CURVES,
	CYCLE_MIN_MS,
	sideMs,
	onMs,
	pauseMs,
	cycleMs,
	flashesPerSecond,
	stepTiming,
} = timing;

const JS_DIR = new URL('../../Public/JavaScript/', import.meta.url);
const RISK_LADDER_URL = new URL('risk-ladder.js', JS_DIR);
const RISK_LADDER_MULTI_URL = new URL('risk-ladder-multi.js', JS_DIR);
const TIMING_FILE_URL = new URL('risk-timing.js', JS_DIR).href;
/** Umsetzungsstück D3c: beide Leitern importieren jetzt account-backend.js
 * (Präfix, siehe Dateikopf-Nachtrag in risk-ladder.js). Node kennt die
 * Import-Karte nicht — derselbe Umschreibe-Mechanismus wie für
 * risk-timing.js. account-backend.js selbst hat keinen einzigen Import und
 * lässt sich deshalb ohne weitere Umschreibung über seine echte Adresse
 * laden. */
const ACCOUNT_BACKEND_URL = new URL('account-backend.js', JS_DIR).href;

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

/* ==========================================================================
   RK — Rückwärtskompatibilität der flachen Kurve
   ========================================================================== */

console.log('\nRK — Rückwärtskompatibilität der flachen Kurve');

let rk1Ok = true;
let rk2Ok = true;
for (let level = 1; level <= SWEEP; level++) {
	const plain = stepTiming(level);
	const flat = stepTiming(level, CURVE_FLAT);
	if (plain.sideMs !== flat.sideMs || plain.onMs !== flat.onMs || plain.darkMs !== flat.darkMs) {
		rk1Ok = false;
	}
	if (onMs(level) !== onMs(level, CURVE_FLAT)) {
		rk2Ok = false;
	}
}
check(rk1Ok, `RK-1  stepTiming(n) === stepTiming(n, CURVE_FLAT) für n = 1…${SWEEP}, Feld für Feld (sideMs, onMs, darkMs)`);
check(rk2Ok, `RK-2  onMs(n) === onMs(n, CURVE_FLAT) für n = 1…${SWEEP}`);
check(
	Object.is(ON_STEPS_PER_LEVEL, CURVES[CURVE_FLAT].stepsPerLevel) && ON_STEPS_PER_LEVEL === 1,
	'RK-3  ON_STEPS_PER_LEVEL stammt aus CURVES[CURVE_FLAT] und ist unverändert 1'
);
check(
	Object.is(ON_LEVEL_OFFSET, CURVES[CURVE_FLAT].levelOffset) && ON_LEVEL_OFFSET === 4,
	'RK-3  ON_LEVEL_OFFSET stammt aus CURVES[CURVE_FLAT] und ist unverändert 4'
);

const riskLadderSource = await readFile(fileURLToPath(RISK_LADDER_URL), 'utf8');
check(/stepTiming\(this\.level\)/.test(riskLadderSource),
	'RK-4  risk-ladder.js ruft stepTiming(this.level) weiterhin EINSTELLIG auf');
check(!/stepTiming\([^)]*,/.test(riskLadderSource),
	'RK-4  risk-ladder.js übergibt an keiner Stelle ein zweites Argument an stepTiming()');

/* ==========================================================================
   ST — Die steile Kurve
   ========================================================================== */

console.log('\nST — Die steile Kurve');

const STEEP_EXPECTED = [
	{ level: 1, on: 64 },
	{ level: 2, on: 46 },
	{ level: 3, on: 40 },
	{ level: 4, on: 40 },
	{ level: 6, on: 40 },
	{ level: 20, on: 40 },
	{ level: 5000, on: 40 },
];
let st1Ok = true;
for (const row of STEEP_EXPECTED) {
	const step = stepTiming(row.level, CURVE_STEEP);
	if (step.sideMs !== 200 || step.onMs !== row.on || step.darkMs !== 200 - row.on) {
		st1Ok = false;
	}
}
check(st1Ok, 'ST-1  steile Kurve: Stufe 1 → 64 ms, 2 → 46 ms, ab 3 → 40 ms, Periode auf jeder Stufe 200 ms');

let st2Ok = true;
let previousSteepOn = Number.POSITIVE_INFINITY;
for (let level = 1; level <= 3; level++) {
	const on = onMs(level, CURVE_STEEP);
	if (level > 1 && !(on < previousSteepOn)) {
		st2Ok = false;
	}
	previousSteepOn = on;
}
const steepSettled = onMs(3, CURVE_STEEP);
for (const level of [3, 6, 20, 5000]) {
	if (onMs(level, CURVE_STEEP) !== steepSettled) {
		st2Ok = false;
	}
}
check(st2Ok, 'ST-2  die steile Kurve fällt streng bis Stufe 3 und ist ab Stufe 3 konstant');

let st3Ok = true;
for (let n = 1; n <= 3; n++) {
	if (onMs(n, CURVE_STEEP) !== onMs(2 * n + 1, CURVE_FLAT)) {
		st3Ok = false;
	}
}
check(st3Ok, 'ST-3  die steile Stufe n ist so schnell wie die flache Stufe 2n+1 (n = 1…3)');

/* ==========================================================================
   PA — Die Pause
   ========================================================================== */

console.log('\nPA — Die Pause');

let pa1Ok = true;
let pa2Ok = true;
for (let level = 1; level <= SWEEP; level++) {
	for (const curve of [CURVE_FLAT, CURVE_STEEP]) {
		const pause = pauseMs(level, curve);
		const on = onMs(level, curve);
		if (pause !== on) {
			pa1Ok = false;
		}
		if (pause < ON_MIN_MS) {
			pa2Ok = false;
		}
	}
}
check(pa1Ok, `PA-1  pauseMs(n, curve) === onMs(n, curve) für beide Kurvenformen, Stufe 1…${SWEEP}`);
check(pa2Ok, `PA-2  pauseMs >= ${ON_MIN_MS} ms auf jeder Stufe und in beiden Kurvenformen`);

/* ==========================================================================
   UM — Der volle Umlauf und die Blitzrate: DIE SICHERHEITSAUSSAGE
   ========================================================================== */

console.log('\nUM — Der volle Umlauf und die Blitzrate: DIE SICHERHEITSAUSSAGE');

let um1Ok = true;
let um2Ok = true;
let um3Ok = true;
for (let sides = 2; sides <= 8; sides++) {
	for (const curve of [CURVE_FLAT, CURVE_STEEP]) {
		for (const pause of [false, true]) {
			for (let level = 1; level <= SWEEP; level++) {
				const cycle = cycleMs(level, { sides, curve, pause });
				const flashes = flashesPerSecond(level, { sides, curve, pause });
				if (cycle < CYCLE_MIN_MS) {
					um1Ok = false;
				}
				if (flashes > MAX_FLASHES_PER_SECOND) {
					um2Ok = false;
				}
				const expectedCycle = sides * 200 + (pause ? onMs(level, curve) : 0);
				if (cycle !== expectedCycle) {
					um3Ok = false;
				}
			}
		}
	}
}
check(um1Ok,
	`UM-1  cycleMs >= ${CYCLE_MIN_MS.toFixed(2).replace('.', ',')} ms (1000/3 ms) — Seiten 2…8, `
	+ `beide Kurvenformen, mit und ohne Pause, Stufe 1…${SWEEP}, ausnahmslos`);
check(um2Ok,
	`UM-2  flashesPerSecond <= ${MAX_FLASHES_PER_SECOND} — dieselbe Matrix, ausnahmslos`);
check(um3Ok,
	'UM-3  cycleMs === sides * 200 + (pause ? onMs : 0), ganzzahlig — dieselbe Matrix');

const twoSidesNoPause = cycleMs(1, { sides: 2, curve: CURVE_FLAT, pause: false });
const fourSidesPauseLevel1 = cycleMs(1, { sides: 4, curve: CURVE_STEEP, pause: true });
const fourSidesPauseLevel2 = cycleMs(2, { sides: 4, curve: CURVE_STEEP, pause: true });
const fourSidesPauseLevel3 = cycleMs(3, { sides: 4, curve: CURVE_STEEP, pause: true });
check(twoSidesNoPause === 400, `UM-4  zwei Seiten ohne Pause: ${twoSidesNoPause} ms (erwartet 400)`);
check(fourSidesPauseLevel1 === 864, `UM-4  vier Seiten mit Pause, Stufe 1: ${fourSidesPauseLevel1} ms (erwartet 864)`);
check(fourSidesPauseLevel2 === 846, `UM-4  vier Seiten mit Pause, Stufe 2: ${fourSidesPauseLevel2} ms (erwartet 846)`);
check(fourSidesPauseLevel3 === 840, `UM-4  vier Seiten mit Pause, Stufe 3: ${fourSidesPauseLevel3} ms (erwartet 840)`);

const NONSENSE_SIDES = [0, 1, -3, 2.7, Number.NaN, '4', undefined];
let um5Ok = true;
for (const value of NONSENSE_SIDES) {
	const cycle = cycleMs(1, { sides: value });
	if (!(cycle >= CYCLE_MIN_MS)) {
		um5Ok = false;
	}
}
check(um5Ok,
	`UM-5  unsinnige Seitenzahlen (${NONSENSE_SIDES.map((v) => String(v)).join(', ')}) liefern trotzdem `
	+ `einen gültigen Umlauf >= ${CYCLE_MIN_MS.toFixed(2).replace('.', ',')} ms`);

/* ==========================================================================
   ML — Die Mehrtasten-Leiter, tatsächlich gespielt
   ========================================================================== */

console.log('\nML — Die Mehrtasten-Leiter, tatsächlich gespielt');

/**
 * Lädt ein Modul mit Import als Text, ersetzt den Modulnamen der Import-Map
 * durch die vollständige Dateiadresse und liefert es als data:-Modul zurück.
 * Dasselbe Verfahren wie in verify-machine-credit.mjs und den
 * Klang-Prüfskripten des Hauses.
 *
 * @param {URL} url
 * @param {Array<[string, string]>} replacements
 * @param {string} label
 * @returns {Promise<string>}
 */
async function toModule(url, replacements, label) {
	const source = await readFile(fileURLToPath(url), 'utf8');
	let patched = source;
	let replacedCount = 0;
	for (const [name, target] of replacements) {
		const before = patched;
		patched = patched.replaceAll(`'${name}'`, JSON.stringify(target));
		if (patched !== before) {
			replacedCount++;
		}
	}
	check(replacedCount === replacements.length,
		`${label}: ${replacedCount} von ${replacements.length} Modulnamen für Node aufgelöst`);
	return `data:text/javascript;base64,${Buffer.from(patched, 'utf8').toString('base64')}`;
}

const riskLadderModuleUrl = await toModule(RISK_LADDER_URL,
	[
		['@phomo17/casino-startpage/risk-timing.js', TIMING_FILE_URL],
		['@phomo17/casino-startpage/account-backend.js', ACCOUNT_BACKEND_URL],
	], 'risk-ladder.js');
const riskLadderMultiModuleUrl = await toModule(RISK_LADDER_MULTI_URL,
	[
		['@phomo17/casino-startpage/risk-timing.js', TIMING_FILE_URL],
		['@phomo17/casino-startpage/account-backend.js', ACCOUNT_BACKEND_URL],
	], 'risk-ladder-multi.js');

const { RiskLadder } = await import(riskLadderModuleUrl);
const { MultiRiskLadder, NO_SIDE, ORDER_PER_LEVEL, ORDER_PER_PASS } = await import(riskLadderMultiModuleUrl);

/**
 * Eine virtuelle Uhr in Schritten von 4 ms — feiner als die 8 ms der übrigen
 * Prüfskripte des Hauses, weil das kürzeste Trefferfenster 40 ms ist und die
 * Ränder eines Fensters genau getroffen werden müssen. requestAnimationFrame
 * und performance.now() der laufenden Leitern hängen an dieser Uhr.
 */
const clock = { ms: 0 };
let frameSeq = 0;
/** @type {Map<number, function(number): void>} */
const frames = new Map();

globalThis.performance = { now: () => clock.ms };
globalThis.requestAnimationFrame = (fn) => {
	const id = ++frameSeq;
	frames.set(id, fn);
	return id;
};
globalThis.cancelAnimationFrame = (id) => {
	frames.delete(id);
};

/**
 * Stellt die Uhr in 4-ms-Schritten vor und lässt dabei jedes fällige Bild der
 * laufenden Leiter(n) laufen.
 *
 * @param {number} ms
 * @returns {void}
 */
function advance(ms) {
	const target = clock.ms + Math.max(0, ms);
	while (clock.ms < target) {
		clock.ms = Math.min(target, clock.ms + 4);
		const due = [...frames.values()];
		frames.clear();
		for (const fn of due) {
			fn(clock.ms);
		}
	}
}

/**
 * Eine kleine, wiederholbare Zahlenfolge – kein Zufall. Dasselbe Verfahren
 * wie in den Prüfskripten der Automaten-Extensions dieses Hauses.
 *
 * Math.imul() statt einer gewöhnlichen Multiplikation (Behebungslauf
 * REVIEW-fruitrisk-f5.md [H3]): state * 1103515245 überschreitet in
 * gewöhnlichen JavaScript-Zahlen bereits nach dem ersten oder zweiten Schritt
 * 2^53 — der Abstand zweier darstellbarer Zahlen dort ist dann schon 256, die
 * Multiplikation liefert deshalb nur noch Vielfache von 256, und draw(2)/
 * draw(4)/draw(8) landen dauerhaft auf 0. Math.imul() rechnet stattdessen in
 * echter 32-Bit-Ganzzahlarithmetik (dasselbe bereits richtige Verfahren wie im
 * Prüfskript eines anderen Geräts dieses Hauses, dort in makeRandom()) und
 * bleibt exakt, egal wie lang die Folge läuft.
 *
 * @param {number} seed
 * @returns {function(number): number} liefert 0 bis grenze−1
 */
function sequence(seed) {
	let state = seed >>> 0;
	return (limit) => {
		state = (Math.imul(state, 1103515245) + 12345) >>> 0;
		return state % limit;
	};
}

console.log('\nML-1 — Bauform-Prüfungen');

let ml1Ok = true;
try {
	// eslint-disable-next-line no-new
	new MultiRiskLadder({ paint: () => {} });
	ml1Ok = false;
} catch (error) {
	if (!(error instanceof TypeError)) {
		ml1Ok = false;
	}
}
try {
	// eslint-disable-next-line no-new
	new MultiRiskLadder({ draw: () => 0 });
	ml1Ok = false;
} catch (error) {
	if (!(error instanceof TypeError)) {
		ml1Ok = false;
	}
}
for (const factor of [1, 1.5]) {
	try {
		// eslint-disable-next-line no-new
		new MultiRiskLadder({ draw: () => 0, paint: () => {}, factor });
		ml1Ok = false;
	} catch (error) {
		if (!(error instanceof RangeError)) {
			ml1Ok = false;
		}
	}
}
const singleSideLadder = new MultiRiskLadder({ draw: () => 0, paint: () => {}, sides: 1 });
if (singleSideLadder.sides !== 2) {
	ml1Ok = false;
}
check(ml1Ok,
	'ML-1  fehlendes draw/paint wirft TypeError, Faktor 1 oder 1,5 wirft RangeError, sides 1 wird auf 2 gehoben');

console.log('\nML-2 — vier Seiten, ORDER_PER_PASS, mit Pause: 30 Sekunden virtueller Spielzeit');

const paintedM2 = [];
const ticksM2 = [];
const claimM2 = { amount: 10, collect: () => {}, discard: () => {} };
const drawM2 = sequence(20260905);
const ladderM2 = new MultiRiskLadder({
	draw: (bound) => drawM2(bound),
	paint: (view) => paintedM2.push(view),
	notify: (message) => {
		if (message.type === 'tick') {
			ticksM2.push({ ...message, at: clock.ms });
		}
	},
	sides: 4,
	factor: 8,
	curve: CURVE_STEEP,
	order: ORDER_PER_PASS,
	pause: true,
});
ladderM2.offer(claimM2);
ladderM2.start();
advance(30000);

// GRENZE, EHRLICH BENANNT (Behebungslauf, Reviewfund [M3]): diese Prüfung
// stellt nur die DATENFORM fest — lit ist an jeder gemalten Ansicht ein
// SKALAR (eine Zahl oder NO_SIDE), kein Feld und kein Set. Über „leuchten
// zwei Seiten gleichzeitig" sagt sie NICHTS aus: risk-ladder-multi.js malt
// keine Tasten und rührt kein DOM an, ein zweites gleichzeitig brennendes
// Feld ist deshalb hier gar nicht beobachtbar, nur seine (Un-)Möglichkeit in
// der Datenform. Der eigentliche Nachweis „nie zwei Tasten gleichzeitig
// leuchtend" liegt am DOM, in der jeweiligen Geräte-Extension, die diese
// Leiter tatsächlich rendert — dieses Modul kennt kein Gerät (siehe
// Dateikopf von risk-ladder-multi.js) und kann diesen Nachweis deshalb
// grundsätzlich nicht selbst führen.
const onlyScalarLit = paintedM2.every((view) => view.lit === NO_SIDE || Number.isInteger(view.lit));
check(onlyScalarLit,
	`ML-2  jede der ${paintedM2.length} gemalten Ansichten trägt lit als Skalar (Zahl oder NO_SIDE, kein Feld/Set)`
	+ ' — die Zusage „nie zwei Tasten gleichzeitig" wird am DOM in der jeweiligen Geräte-Extension nachgewiesen,'
	+ ' nicht in diesem geräteunabhängigen Block');

const firstLevelView = paintedM2.find((view) => view.reason === 'level');
const onEventsByPass = new Map();
if (firstLevelView) {
	onEventsByPass.set(0, [firstLevelView.lit]);
}
for (const tickEvent of ticksM2) {
	if (!tickEvent.on) {
		continue;
	}
	if (!onEventsByPass.has(tickEvent.pass)) {
		onEventsByPass.set(tickEvent.pass, []);
	}
	onEventsByPass.get(tickEvent.pass).push(tickEvent.lit);
}

let everySideOncePerPass = onEventsByPass.size >= 30;
for (const lits of onEventsByPass.values()) {
	const distinct = new Set(lits);
	if (distinct.size !== ladderM2.sides || lits.length !== ladderM2.sides) {
		everySideOncePerPass = false;
	}
}
check(everySideOncePerPass,
	`ML-2  jede der ${ladderM2.sides} Seiten kommt in jedem der ${onEventsByPass.size} beobachteten `
	+ 'Umläufe genau einmal an die Reihe (mindestens 30 Umläufe erwartet)');

// Die Grenze war vor der Behebung von [H3] absichtlich niedrig (>= 3), weil
// die entartete sequence() (state * 1103515245 ohne Math.imul()) bei
// draw(4)/draw(2) konstant auf 0 lag und nur draw(3) noch streute — höchstens
// drei Reihenfolgen waren unter dem alten Fehler überhaupt erreichbar. Mit
// Math.imul() liefert derselbe Lauf (35 Umläufe) inzwischen 12 von 24
// möglichen Reihenfolgen; die Grenze steigt auf 10, deutlich über der alten
// Zufallsfolge, mit Spielraum nach unten, damit die Prüfung nicht bei jeder
// harmlosen Verschiebung der Umlaufzahl kippt.
const distinctOrders = new Set([...onEventsByPass.values()].map((lits) => lits.join(',')));
check(distinctOrders.size >= 10,
	`ML-2  die Reihenfolge wechselt über die Umläufe: mindestens zehn verschiedene Reihenfolgen in `
	+ `${onEventsByPass.size} Umläufen (gefunden: ${distinctOrders.size} von 24 möglichen)`);

let pauseBoundaryOk = true;
for (const pass of onEventsByPass.keys()) {
	const passStart = ladderM2.levelStart + pass * ladderM2.cycleMs;
	const lastSlotStart = passStart + (ladderM2.sides - 1) * ladderM2.sideMs;
	const pauseStart = lastSlotStart + ladderM2.sideMs;
	const pauseEnd = passStart + ladderM2.cycleMs;
	if (pauseEnd - pauseStart !== ladderM2.pauseMs) {
		pauseBoundaryOk = false;
	}
	if (ladderM2.litAt(pauseEnd - 1) !== NO_SIDE) {
		pauseBoundaryOk = false;
	}
	const nextSide = ladderM2.litAt(pauseEnd);
	if (!(Number.isInteger(nextSide) && nextSide >= 0 && nextSide < ladderM2.sides)) {
		pauseBoundaryOk = false;
	}
}
check(pauseBoundaryOk,
	`ML-2  zwischen zwei Umläufen liegt eine dunkle Pause von genau ${ladderM2.pauseMs} ms `
	+ '(die letzte Millisekunde davor dunkel, die erste danach eine echte Seite)');

console.log('\nML-3 — zwei Seiten, ORDER_PER_LEVEL, ohne Pause');

const paintedM3 = [];
const notifiedM3 = [];
const claimM3 = { amount: 10, collect: () => {}, discard: () => {} };
const drawM3 = sequence(19700101);
const ladderM3 = new MultiRiskLadder({
	draw: (bound) => drawM3(bound),
	paint: (view) => paintedM3.push(view),
	notify: (message) => notifiedM3.push(message),
	sides: 2,
	factor: 2,
	curve: CURVE_FLAT,
	order: ORDER_PER_LEVEL,
	pause: false,
});
ladderM3.offer(claimM3);
ladderM3.start();
const orderLevel1 = ladderM3.order.slice();
advance(2000);
check(ladderM3.order.slice().join(',') === orderLevel1.join(','),
	'ML-3  die Reihenfolge bleibt innerhalb einer Stufe gleich (klassisches Hin und Her)');
ladderM3.guess(ladderM3.lit);
const orderLevel2 = ladderM3.order.slice();
check(orderLevel2.length === 2, 'ML-3  nach dem Treffer wurde für die neue Stufe eine Reihenfolge gezogen');

console.log('\nML-4 — Wertung: Treffer, Fehlgriff, kein Angebot');

for (const factor of [2, 4, 8]) {
	const claim = { amount: 10, collect: () => {}, discard: () => {} };
	const drawHit = sequence(1);
	const ladder = new MultiRiskLadder({
		draw: (bound) => drawHit(bound),
		paint: () => {},
		sides: 2,
		factor,
		curve: CURVE_FLAT,
		order: ORDER_PER_LEVEL,
		pause: false,
	});
	ladder.offer(claim);
	ladder.start();
	const before = ladder.win;
	const result = ladder.guess(ladder.lit);
	check(result === 'hit' && ladder.win === before * factor,
		`ML-4  Faktor ${factor}: Treffer vervielfacht ${before} auf ${ladder.win} (erwartet ${before * factor})`);
	ladder.destroy();
}

{
	const claim = { amount: 10, collect: () => {}, discard: () => {} };
	const drawMiss = sequence(2);
	const ladder = new MultiRiskLadder({
		draw: (bound) => drawMiss(bound),
		paint: () => {},
		sides: 2,
		factor: 2,
		curve: CURVE_FLAT,
		order: ORDER_PER_LEVEL,
		pause: false,
	});
	ladder.offer(claim);
	ladder.start();
	let discarded = false;
	claim.discard = () => { discarded = true; };
	const wrongSide = ladder.lit === 0 ? 1 : 0;
	const result = ladder.guess(wrongSide);
	check(result === 'miss' && discarded && ladder.win === 0,
		'ML-4  ein Druck auf eine dunkle Seite ist miss und verwirft den Anspruch');
}

{
	const claim = { amount: 10, collect: () => {}, discard: () => {} };
	const drawPause = sequence(3);
	const ladder = new MultiRiskLadder({
		draw: (bound) => drawPause(bound),
		paint: () => {},
		sides: 4,
		factor: 8,
		curve: CURVE_STEEP,
		order: ORDER_PER_PASS,
		pause: true,
	});
	ladder.offer(claim);
	ladder.start();
	// [M2]: die Pause muss an der LAUFENDEN Leiter gemessen werden, BEVOR
	// guess() sie im Fehlgriff-Fall über reset() abräumt (sideMs/cycleMs
	// fallen dann auf 0, und litAt() läge danach nicht mehr an einer Pause,
	// sondern an einer toten Leiter — Behebungslauf REVIEW-fruitrisk-f5.md
	// [M2]).
	const pauseInstant = ladder.levelStart + ladder.sides * ladder.sideMs + 1;
	const litAtPause = ladder.litAt(pauseInstant);
	check(litAtPause === NO_SIDE, 'ML-4  während der Pause ist keine Seite an (litAt liefert NO_SIDE)');
	const result = ladder.guess(0);
	check(result === 'hit' || result === 'miss', 'ML-4  guess() während der Leiter liefert hit oder miss, nie null');
}

{
	const claim = { amount: 10, collect: () => {}, discard: () => {} };
	const ladder = new MultiRiskLadder({ draw: () => 0, paint: () => {}, sides: 2, factor: 2 });
	check(ladder.guess(0) === null, 'ML-4  guess() außerhalb der Leiter (Grundzustand) liefert null');
	void claim;
}

console.log('\nML-5 — Die Kappung nahe 2^53−1');

for (const factor of [2, 4, 8]) {
	const nearMax = { amount: Number.MAX_SAFE_INTEGER - 1, collect: () => {}, discard: () => {} };
	const drawCap = sequence(5);
	const ladder = new MultiRiskLadder({
		draw: (bound) => drawCap(bound),
		paint: () => {},
		sides: 2,
		factor,
		curve: CURVE_FLAT,
		order: ORDER_PER_LEVEL,
		pause: false,
	});
	ladder.offer(nearMax);
	ladder.start();
	ladder.guess(ladder.lit);
	check(ladder.win === Number.MAX_SAFE_INTEGER,
		`ML-5  Faktor ${factor}: ein Anspruch nahe 2^53−1 sättigt bei MAX_WIN statt ungenau zu werden`);
	ladder.destroy();
}

console.log('\nML-6 — destroy() schreibt gut, collect() bucht nicht doppelt');

{
	let collectedTimes = 0;
	const claim = { amount: 10, collect: () => { collectedTimes++; }, discard: () => {} };
	const drawM6 = sequence(6);
	const ladder = new MultiRiskLadder({
		draw: (bound) => drawM6(bound),
		paint: () => {},
		sides: 2,
		factor: 2,
		curve: CURVE_FLAT,
		order: ORDER_PER_LEVEL,
		pause: false,
	});
	ladder.offer(claim);
	ladder.start();
	ladder.destroy();
	check(collectedTimes === 1, 'ML-6  destroy() schreibt einen offenen Gewinn genau EINMAL gut');
}
{
	let collectedTimes = 0;
	const claim = { amount: 10, collect: () => { collectedTimes++; }, discard: () => {} };
	const drawM6b = sequence(7);
	const ladder = new MultiRiskLadder({
		draw: (bound) => drawM6b(bound),
		paint: () => {},
		sides: 2,
		factor: 2,
		curve: CURVE_FLAT,
		order: ORDER_PER_LEVEL,
		pause: false,
	});
	ladder.offer(claim);
	ladder.start();
	ladder.collect();
	ladder.collect();
	check(collectedTimes === 1,
		'ML-6  ein zweites collect() desselben Anspruchs bucht nichts mehr, weil der Anspruch schon weg ist');
}

console.log('\nML-7 — der Takt driftet nicht über 30 Sekunden');

{
	const drawM7 = sequence(20260905);
	/** Frühester beobachteter Zeitpunkt je Umlauf – Minimum aller on:true-Ticks je pass. */
	const passStartAt = new Map();
	const ladder = new MultiRiskLadder({
		draw: (bound) => drawM7(bound),
		paint: () => {},
		notify: (message) => {
			if (message.type === 'tick' && message.on) {
				const at = clock.ms;
				if (!passStartAt.has(message.pass) || at < passStartAt.get(message.pass)) {
					passStartAt.set(message.pass, at);
				}
			}
		},
		sides: 4,
		factor: 8,
		curve: CURVE_STEEP,
		order: ORDER_PER_PASS,
		pause: true,
	});
	const levelStartBefore = clock.ms;
	ladder.offer({ amount: 10, collect: () => {}, discard: () => {} });
	ladder.start();
	advance(30000);

	// Der allererste Umlauf (pass 0) beginnt beim SOFORTIGEN Malen in
	// beginLevel(), nicht über einen tick() – der taucht hier deshalb nicht
	// auf. Geprüft wird deshalb der letzte über Ticks beobachtete Umlauf.
	const lastObservedPass = Math.max(...passStartAt.keys());
	const measuredStart = passStartAt.get(lastObservedPass);
	const expectedStart = levelStartBefore + lastObservedPass * ladder.cycleMs;
	const drift = Math.abs(measuredStart - expectedStart);
	check(passStartAt.size >= 10 && drift === 0,
		`ML-7  nach 30 s virtueller Uhr liegt der Beginn des zuletzt gemessenen Umlaufs (Umlauf `
		+ `${lastObservedPass}, gemessen bei ${measuredStart} ms) exakt dort, wo levelStart `
		+ `(${levelStartBefore} ms) + n · cycleMs (${ladder.cycleMs} ms) ihn erwartet `
		+ `(${expectedStart} ms) — Abweichung ${drift} ms`);
}

/* ==========================================================================
   GL — Gleichlauf mit der alten Leiter (Rückwärtskompatibilitäts-Nachweis 2)
   ========================================================================== */

console.log('\nGL — Gleichlauf mit der alten Leiter');

/**
 * Fisher-Yates mit zwei Elementen tauscht bei j = 0 und lässt bei j = 1
 * unverändert — das ist GENAU UMGEKEHRT zu drawSide() aus risk-ladder.js
 * (0 → links). Damit beide Leitern bei derselben rohen Zufallsfolge
 * dieselbe Startseite wählen, bekommt die neue Leiter hier das Komplement
 * (1 − v) übergeben.
 */
const seqRisk = sequence(20260101);
const seqMulti = sequence(20260101);
const drawRisk = () => seqRisk(2);
const drawMulti = (bound) => (bound === 2 ? 1 - seqMulti(2) : seqMulti(bound));

/** @param {'left'|'right'|'none'} side @returns {number} */
function riskLitToNumber(side) {
	if (side === 'left') { return 0; }
	if (side === 'right') { return 1; }
	return NO_SIDE;
}

let collectedRisk = 0;
let collectedMulti = 0;
const claimRisk = {
	amount: 10,
	collect() { collectedRisk = this.amount; },
	discard() {},
};
const claimMulti = {
	amount: 10,
	collect() { collectedMulti = this.amount; },
	discard() {},
};

const riskLadder = new RiskLadder({ draw: drawRisk, paint: () => {}, notify: () => {} });
const multiLadder = new MultiRiskLadder({
	draw: drawMulti,
	paint: () => {},
	notify: () => {},
	sides: 2,
	factor: 2,
	curve: CURVE_FLAT,
	order: ORDER_PER_LEVEL,
	pause: false,
});

riskLadder.offer(claimRisk);
multiLadder.offer(claimMulti);
riskLadder.start();
multiLadder.start();

const SAMPLE_SPAN_MS = 4000;
const LEVELS_TO_PLAY = 5;
let gl1Ok = true;
let gl2Ok = true;

for (let level = 1; level <= LEVELS_TO_PLAY; level++) {
	const riskLitNow = riskLitToNumber(riskLadder.lit);
	if (riskLitNow !== multiLadder.lit) {
		gl1Ok = false;
	}

	for (let k = 0; k < SAMPLE_SPAN_MS; k++) {
		const t = riskLadder.levelStart + k;
		const riskAt = riskLitToNumber(riskLadder.litAt(t));
		const multiAt = multiLadder.litAt(multiLadder.levelStart + k);
		if (riskAt !== multiAt) {
			gl1Ok = false;
		}
	}

	if (riskLadder.win !== multiLadder.win) {
		gl2Ok = false;
	}

	if (level < LEVELS_TO_PLAY) {
		// Ein Treffer: beide raten die eigene, gerade brennende Seite —
		// garantiert ein hit, weil GL-1 oben schon geprüft hat, dass beide
		// Leitern dieselbe Seite für brennend halten.
		const riskResult = riskLadder.guess(riskLadder.lit);
		const multiResult = multiLadder.guess(multiLadder.lit);
		if (riskResult !== 'hit' || multiResult !== 'hit') {
			gl1Ok = false;
		}
	}
}

check(gl1Ok,
	`GL-1  über ${LEVELS_TO_PLAY} Stufen und je ${SAMPLE_SPAN_MS} ms virtueller Spielzeit ist die Folge der `
	+ 'gemalten Zustände (links/rechts/dunkel) auf die Millisekunde identisch');

// GL-2: derselbe Fehlgriff auf der letzten Stufe führt zu demselben Verlust.
const lostBeforeRisk = riskLadder.win;
const lostBeforeMulti = multiLadder.win;
if (lostBeforeRisk !== lostBeforeMulti) {
	gl2Ok = false;
}
const wrongForRisk = riskLadder.lit === 'left' ? 'right' : 'left';
const wrongForMulti = multiLadder.lit === 0 ? 1 : 0;
const riskMissResult = riskLadder.guess(wrongForRisk);
const multiMissResult = multiLadder.guess(wrongForMulti);
if (riskMissResult !== 'miss' || multiMissResult !== 'miss') {
	gl2Ok = false;
}
if (riskLadder.win !== 0 || multiLadder.win !== 0) {
	gl2Ok = false;
}
check(gl2Ok,
	`GL-2  dieselben Treffer (bis Stufe ${LEVELS_TO_PLAY}, Verlust vor dem Fehlgriff: ${lostBeforeRisk}) und `
	+ 'derselbe Fehlgriff führen bei beiden Leitern zu denselben Beträgen');

console.log(failed
	? '\nERGEBNIS: die Schwierigkeitskurve weicht von CONCEPT.md Anhang B ab, oder eine der '
	+ 'neuen Prüfungen ist rot.'
	: '\nERGEBNIS: 200 ms je Seite werden in keiner Leiter und auf keiner Stufe unterschritten, '
	+ '40 ms werden in keinem Fenster und keiner Pause unterschritten, die x4-Kurve liefert '
	+ '64/46/40, der x8-Umlauf dauert nie weniger als 333 ms, für sehr hohe Stufen rechnet alles '
	+ 'weiterhin sauber, und die alte Leiter rechnet unverändert.');

process.exit(failed ? 1 : 0);
